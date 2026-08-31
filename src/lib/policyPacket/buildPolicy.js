// ─── Policy Packet assembly — the "build ONE policy" primitive ────────────────
// Extracted verbatim from the body of src/pages/api/assemble.ts so a SINGLE bound
// policy (CGL today; each excess instance BFEI6/BFEX6 and Business-Auto BFBA6
// tomorrow) is produced by one reusable call. The endpoint keeps ownership of the
// HTTP concerns (request parse, input guard, response stream/zip); this module owns
// the pipeline: resolve → fetch statics → fill+convert dynamics → merge → assert.
//
// Behavior is IDENTICAL to the previous inline flow for the CGL: same config, same
// resolved set, same three stage-failure shapes (returned as { ok:false, status,
// body } so the endpoint can `return json(body, status)` unchanged), same success
// bytes. The only new seam is `io.filename` — an OPTIONAL override so an excess
// instance can be named by its derived policy number; omit it and the CGL falls back
// to packetFilename(resolved) exactly as before.

import { resolvePacket } from '../../components/PolicyPacket/resolveEngine.js';
import { fetchPacketForms } from './fetchForms.js';
import { fillAndConvertDynamics } from './fillConvert.js';
import { mergePacket, countPdfPages, buildPacketAssertions, packetFilename } from './mergePacket.js';

/**
 * Build one self-contained bound policy PDF from a config + resolved answer set.
 * @param {object} config      packet-config.json (CGL) OR an excess/BA sub-config.
 * @param {object} fieldTypes  field-types.json (formatter contract).
 * @param {object} resolved    the resolved answers for THIS policy (shared fields +
 *                             any per-policy overlay already merged in by the caller).
 * @param {{ loadTemplate:(formNumber:string,file:string)=>Promise<Buffer>,
 *           gotenberg:{url:string,user:string,pass:string},
 *           blobOpts?:object, filename?:string }} io
 * @returns {Promise<
 *   | { ok:true, pdf:Uint8Array, filename:string, pageCount:number, provenance:any[] }
 *   | { ok:false, status:number, body:object } >}
 *   On failure `body` is the exact JSON the endpoint returned inline before; `status`
 *   is 500 for every pipeline-stage failure.
 */
export async function buildOnePolicy(config, fieldTypes, resolved, io) {
  // ── Resolve the manifest (authoritative assembly order) ──
  const { manifest } = resolvePacket(config, resolved);

  // ── Stage 1: fetch statics from Blob (bytes via the non-enumerable `buffer`) ──
  const s1 = await fetchPacketForms(config, resolved, io.blobOpts ?? {});
  const staticByFormNumber = new Map();
  const staticFailures = [];
  for (const f of s1.fetches) {
    if (f.isDynamic) continue; // dynamics' .docx are fetched too but ignored here
    if (!f.ok || !f.buffer) { staticFailures.push(f); continue; }
    staticByFormNumber.set(f.formNumber, f.buffer);
  }
  if (staticFailures.length) {
    return { ok: false, status: 500, body: {
      error: 'Stage 1 — one or more static forms failed to fetch from Blob; not assembling.',
      forms: staticFailures.map((f) => ({ formNumber: f.formNumber, pathname: f.pathname ?? null, detail: f.error ?? 'no buffer returned' })),
    } };
  }

  // ── Stage 2: fill dynamics + batch-convert to PDF ──
  const s2 = await fillAndConvertDynamics(config, fieldTypes, resolved, {
    loadTemplate: io.loadTemplate,
    gotenberg: io.gotenberg,
  });
  const failedDyn = s2.records.filter((r) => !r.converted);
  if (failedDyn.length) {
    return { ok: false, status: 500, body: {
      error: 'Stage 2 — one or more dynamic forms failed to fill/convert; not assembling.',
      forms: failedDyn.map((r) => ({ formNumber: r.formNumber, detail: r.fillError || r.convertError || 'unknown' })),
    } };
  }
  const dynPdf = new Map(s2.records.map((r) => [r.formNumber, r.pdf]));

  // ── Build per-form sources IN MANIFEST ARRAY ORDER ──
  const sources = manifest.map((m, i) => {
    const pdf = m.isDynamic ? dynPdf.get(m.formNumber) : staticByFormNumber.get(m.formNumber);
    if (!pdf) throw new Error(`internal: no PDF for ${m.isDynamic ? 'dynamic' : 'static'} "${m.formNumber}"`);
    return { manifestIndex: i, formNumber: m.formNumber, seq: m.seq, isDynamic: m.isDynamic, source: m.isDynamic ? 'dynamic' : 'static', pdf };
  });

  // ── Stage 3: MERGE (shared module) ──
  const { mergedBytes, mergedPageCount, provenance } = await mergePacket(sources);

  // ── Verify the bytes that landed, then run the assertions ──
  const landedPageCount = await countPdfPages(mergedBytes);
  const { checks } = buildPacketAssertions({ manifest, provenance, mergedPageCount, landedPageCount });
  const failedChecks = checks.filter((c) => !c.ok);
  if (failedChecks.length) {
    return { ok: false, status: 500, body: {
      error: 'Stage 3 — assembled packet failed its assertions; not streaming a packet that failed verification.',
      failedGates: failedChecks.map((c) => ({ gate: c.label, detail: c.detail })),
      pageCount: mergedPageCount,
      forms: provenance.map((r) => ({ manifestIndex: r.manifestIndex, formNumber: r.formNumber, seq: r.seq, pageStart: r.pageStart, pageCount: r.pageCount })),
    } };
  }

  // ── Success ──
  const filename = io.filename ?? packetFilename(resolved);
  return { ok: true, pdf: mergedBytes, filename, pageCount: mergedPageCount, provenance };
}

export default buildOnePolicy;
