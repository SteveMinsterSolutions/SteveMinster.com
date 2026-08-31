// ─── Policy Packet assembly — STAGE 2 of 3: FILL + CONVERT ────────────────────
// Fill the dynamic .docx templates with the policy's resolved answers (named,
// not positional), then convert the filled docx → PDF via Gotenberg/LibreOffice
// in ONE batched request. THIS STAGE STOPS AT 5 SEPARATE PDFs — no merge, no
// interleave with statics, no stream (that is Stage 3).
//
// Builds on Stage 1: the caller supplies a `loadTemplate(formNumber, file)`
// that returns the template .docx bytes (from Blob in the endpoint, or from the
// local normalized-templates folder in the runner). The fill engine is agnostic
// to where the bytes come from.

import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { resolvePacket } from '../../components/PolicyPacket/resolveEngine.js';

// ─── Formatter (the field-types gate) ─────────────────────────────────────────
// field-types.json pre-computes `behavior` per token = the resolved gate:
//   Answer Type "Drop Down" → "passthrough" (value is display-final, verbatim).
//   Free-entry (Currency/Number/Date/Calc) → a format behavior below.
// A token with NO field-types entry, or an unrecognized behavior, is a HARD FAIL
// — we never silently passthrough. Blank values always render as "".

function formatCurrency(raw, decimals) {
  const n = Number(String(raw).replace(/[^0-9.\-]/g, ''));
  if (!Number.isFinite(n)) return '';
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function toIsoDate(s) {
  // Already ISO → keep. US MM/DD/YYYY → reorder. Anything else → leave verbatim
  // (a stage gate shouldn't crash on an unexpected date shape).
  let m;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  if ((m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/))) {
    return `${m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`;
  }
  return s;
}

export function formatValue(token, fieldTypes, values) {
  const ft = fieldTypes[token];
  if (!ft) throw new Error(`UNMAPPED token "${token}" — no field-types entry (refusing to default to passthrough)`);

  const raw = values[token];
  if (raw == null || String(raw).trim() === '') return ''; // blanks → ""
  const s = String(raw).trim();

  switch (ft.behavior) {
    case 'passthrough': return s;
    case 'integer': {
      const n = parseInt(s.replace(/[^0-9\-]/g, ''), 10);
      return Number.isFinite(n) ? String(n) : '';
    }
    case 'zip5': {
      const d = s.replace(/[^0-9]/g, '');
      return d === '' ? '' : (d.length < 5 ? d.padStart(5, '0') : d); // zip5 as string, keep leading zeros
    }
    case 'currency_whole': return formatCurrency(s, 0);
    case 'number_whole': {
      // Thousands-separated whole number, NO currency symbol — for forms that print
      // their own currency word (e.g. Lloyd's excess decs: "USD {{Excess_Per_Occ}}").
      const n = Number(String(s).replace(/[^0-9.\-]/g, ''));
      return Number.isFinite(n) ? n.toLocaleString('en-US', { maximumFractionDigits: 0 }) : '';
    }
    case 'currency_cents': return formatCurrency(s, 2);
    case 'date_iso': return toIsoDate(s);
    default:
      throw new Error(`UNKNOWN behavior "${ft.behavior}" for token "${token}"`);
  }
}

// Build the named data object docxtemplater renders against: one formatted value
// per fieldMapping token. Throws (hard fail) on the first unmapped token.
export function buildFillData(tokens, fieldTypes, values) {
  const data = {};
  for (const t of tokens) data[t] = formatValue(t, fieldTypes, values);
  return data;
}

// ─── Fill one template ────────────────────────────────────────────────────────
export function fillTemplate(templateBuf, data) {
  const zip = new PizZip(templateBuf);
  const doc = new Docxtemplater(zip, {
    delimiters: { start: '{{', end: '}}' }, // templates use mustache-style tokens
    paragraphLoop: true,
    linebreaks: true,
    nullGetter: () => '', // any token without data renders empty, never "undefined"
  });
  doc.render(data);
  return doc.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' });
}

// Flatten docxtemplater's multi-error object into a readable message.
function docxError(e) {
  const errs = e?.properties?.errors;
  if (Array.isArray(errs) && errs.length) {
    return errs.map((x) => x?.properties?.explanation || x?.message || String(x)).join(' | ');
  }
  return e?.message ?? String(e);
}

// ─── Batch convert via Gotenberg (LibreOffice serializes — one request) ───────
// Sends every filled .docx in ONE /forms/libreoffice/convert request. With >1
// file and no `merge`, Gotenberg returns a ZIP of one PDF per input; with 1 file
// it returns the PDF directly. Inputs are named `${i}.docx` so outputs map back
// to `${i}.pdf` by index regardless of Gotenberg's ordering.
export async function convertBatch(docxBuffers, gotenberg) {
  const DIAG = process.env.ASSEMBLE_DEBUG === '1'; // diagnostic logging, off in prod
  const dlog = (...a) => { if (DIAG) console.error('[convertBatch]', ...a); };

  const { url, user, pass } = gotenberg;
  const fd = new FormData();
  docxBuffers.forEach((buf, i) => {
    fd.append('files', new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }), `${i}.docx`);
  });

  const headers = {};
  if (user || pass) headers.Authorization = 'Basic ' + Buffer.from(`${user ?? ''}:${pass ?? ''}`).toString('base64');

  const endpoint = `${url.replace(/\/$/, '')}/forms/libreoffice/convert`;
  // DIAG #4: how the multipart is built — field name + filenames.
  dlog(`POST ${endpoint}`);
  dlog(`files=${docxBuffers.length}, field name "files" for all, filenames: ${docxBuffers.map((_, i) => `${i}.docx`).join(', ')}`);
  dlog(`auth: ${headers.Authorization ? 'Basic (set)' : 'NONE'}`);

  const res = await fetch(endpoint, { method: 'POST', headers, body: fd });

  // DIAG #1: actual status + content-type.
  dlog(`status: ${res.status} ${res.statusText} (ok=${res.ok}) · content-type: ${res.headers.get('content-type') || '(none)'}`);

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    dlog(`NON-2XX full body:\n${detail}`); // DIAG #2: Gotenberg's plain-text rejection
    throw new Error(`Gotenberg HTTP ${res.status}: ${detail.slice(0, 400)}`);
  }

  const ct = res.headers.get('content-type') || '';
  const body = Buffer.from(await res.arrayBuffer());
  // DIAG #3: 2xx response shape.
  dlog(`2xx body: ${body.length} bytes, magic="${body.subarray(0, 4).toString('latin1')}"`);

  // Single-file response is a bare PDF; multi-file is a zip archive.
  if (ct.includes('application/pdf') || (docxBuffers.length === 1 && body.subarray(0, 4).toString('latin1') === '%PDF')) {
    dlog('treating response as a single bare PDF');
    return [body];
  }
  const out = new Array(docxBuffers.length).fill(null);
  const zip = new PizZip(body);
  const entryNames = Object.keys(zip.files);
  dlog(`unzipped entries: ${entryNames.join(', ') || '(none)'}`); // DIAG #3: what the unzip finds
  for (let i = 0; i < docxBuffers.length; i++) {
    // Inputs are "${i}.docx"; Gotenberg appends ".pdf" to the full input name →
    // "${i}.docx.pdf". Primary lookup is that exact name; fall back to any entry
    // "${i}.<…>.pdf" so version drift in Gotenberg's naming doesn't re-break this.
    // Index mapping is preserved regardless of ZIP entry order.
    let name = `${i}.docx.pdf`;
    if (!zip.file(name)) {
      name = entryNames.find((n) => n.startsWith(`${i}.`) && n.toLowerCase().endsWith('.pdf'));
    }
    const f = name ? zip.file(name) : null;
    dlog(`  index ${i} -> ${f ? `"${name}" found (${f.asUint8Array().length} bytes)` : 'NOT FOUND'}`);
    if (f) out[i] = Buffer.from(f.asUint8Array());
  }
  return out;
}

// ─── Orchestrator ─────────────────────────────────────────────────────────────
/**
 * Resolve the packet, fill every included dynamic form, batch-convert to PDF.
 * @param {object} config      packet-config.json
 * @param {object} fieldTypes  field-types.json
 * @param {object} resolved    the captured `resolved` answers object
 * @param {{ loadTemplate:(formNumber:string,file:string)=>Promise<Buffer>, gotenberg:{url,user,pass} }} io
 * @returns {Promise<object>} Stage-2 report (per-dynamic fill/convert status + filled buffers).
 */
export async function fillAndConvertDynamics(config, fieldTypes, resolved, io) {
  const { manifest, calcValues } = resolvePacket(config, resolved);
  // Calc/derived tokens (TTL_*, DLA_*, …) live in calcValues, not in resolved.
  const values = { ...resolved, ...calcValues };
  const byFormNumber = new Map(config.formOrder.map((f) => [f.formNumber, f]));

  const dynamics = manifest.filter((m) => m.isDynamic);

  // ── Fill phase ──
  const records = [];
  for (const m of dynamics) {
    const entry = byFormNumber.get(m.formNumber);
    const tokens = config.fieldMapping[m.formNumber] ?? [];
    const rec = { seq: m.seq, formNumber: m.formNumber, file: entry?.file ?? null, tokenCount: tokens.length };
    if (!entry?.file) { records.push({ ...rec, filled: false, fillError: 'no formOrder entry / file' }); continue; }
    try {
      const data = buildFillData(tokens, fieldTypes, values);
      const buf = await io.loadTemplate(m.formNumber, entry.file);
      const docx = fillTemplate(buf, data);
      records.push({ ...rec, filled: true, filledBytes: docx.length, data, docx });
    } catch (e) {
      records.push({ ...rec, filled: false, fillError: docxError(e) });
    }
  }

  // ── Convert phase (one batched request over the successfully filled docx) ──
  const filledRecs = records.filter((r) => r.filled);
  if (filledRecs.length) {
    try {
      const pdfs = await convertBatch(filledRecs.map((r) => r.docx), io.gotenberg);
      filledRecs.forEach((r, i) => {
        const pdf = pdfs[i];
        if (pdf && pdf.length > 0) { r.converted = true; r.pdf = pdf; r.pdfBytes = pdf.length; }
        else { r.converted = false; r.convertError = 'no PDF returned for this input'; }
      });
    } catch (e) {
      for (const r of filledRecs) { r.converted = false; r.convertError = e?.message ?? String(e); }
    }
  }

  const filledOk = records.filter((r) => r.filled).length;
  const convertedOk = records.filter((r) => r.converted).length;
  return {
    stage: 2,
    dynamicCount: dynamics.length,
    records,
    summary: {
      dynamics: dynamics.length,
      filled: filledOk,
      converted: convertedOk,
      fillFailures: records.filter((r) => !r.filled).map((r) => ({ formNumber: r.formNumber, error: r.fillError })),
      convertFailures: records.filter((r) => r.filled && !r.converted).map((r) => ({ formNumber: r.formNumber, error: r.convertError })),
    },
  };
}

export default fillAndConvertDynamics;
