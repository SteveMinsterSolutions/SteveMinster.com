// src/pages/api/assemble.ts
// Policy Packet assembly endpoint — the FULL pipeline, server-side:
//   STAGE 1 — resolve the manifest + fetch every included form from Blob.
//   STAGE 2 — FILL the dynamic forms and CONVERT them to PDF via Gotenberg.
//   STAGE 3 — MERGE (interleave) statics + converted dynamics in manifest array
//             order, run the 7 assertions, then STREAM one named PDF.
// The merge + assertions come from the shared src/lib/policyPacket/mergePacket.js —
// the SAME module scripts/assemble-stage3.mjs uses, so the deployed endpoint and the
// CLI runner gate on identical checks.
//
// On ANY assertion failure we return HTTP 500 and DO NOT stream — a corrupt bound
// packet is worse than a clear error. On success we stream application/pdf.
import type { APIRoute } from 'astro';
import { get } from '@vercel/blob';
import packetConfig from '../../sandbox/policy-packet/packet-config.json';
import fieldTypes from '../../sandbox/policy-packet/field-types.json';
import { resolvePacket } from '../../components/PolicyPacket/resolveEngine.js';
import { fetchPacketForms } from '../../lib/policyPacket/fetchForms.js';
import { fillAndConvertDynamics } from '../../lib/policyPacket/fillConvert.js';
import { mergePacket, countPdfPages, buildPacketAssertions, packetFilename } from '../../lib/policyPacket/mergePacket.js';

export const prerender = false;
// Batch-convert (~21 dynamics through Gotenberg) + merge of ~42 forms is the slow
// path — give the function plenty of head-room. Vercel caps this per plan.
export const maxDuration = 300;

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json' } });
}

// ── INPUT GUARD (request-time, BEFORE any fetch/fill/convert/merge) ───────────
// Distinct from the OUTPUT-side merge assertions (which 500 a built-but-broken
// packet). This 400s a degenerate request so we never build a packet from garbage.
//
// Required minimal answer set (all `required: "always"`, Section 1 in packet-config):
//   • Named_Insured, Policy_Number — identity; they ARE the output filename. Without
//     them the endpoint streamed "undefined undefined.pdf" — the bug this closes.
//   • O_G_Program — the program selector; every real submission carries it.
// Why a field check and NOT a "bare manifest" check: an empty {} body does NOT
// resolve to only always-apply forms — it still triggers 8 conditional rules (rules
// that fire on field ABSENCE/negation) and yields 33 forms. So manifest-bareness
// cannot distinguish garbage from valid; the input fields can. The merge assertions
// remain the separate output-side gate.
const REQUIRED_INPUT_FIELDS = ['Named_Insured', 'Policy_Number', 'O_G_Program'] as const;
const isBlank = (v: any) => v == null || (typeof v === 'string' && v.trim() === '');

function validateInput(resolved: any): string[] {
  if (!resolved || typeof resolved !== 'object' || Array.isArray(resolved)) return [...REQUIRED_INPUT_FIELDS];
  return REQUIRED_INPUT_FIELDS.filter((f) => isBlank(resolved[f]));
}

// RFC 6266 / 5987 Content-Disposition. Real packet names carry spaces AND commas
// (e.g. "Alaskan Remote Adventures, LLC BFOG20000025-00.pdf"); an unquoted filename
// truncates at the comma. We send a quoted ASCII fallback PLUS a UTF-8 filename*.
function contentDisposition(filename: string): string {
  const ascii = filename.replace(/[^\x20-\x7E]/g, '_').replace(/["\\]/g, '_'); // quoted fallback
  const encoded = encodeURIComponent(filename).replace(/['()*!]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase());
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encoded}`;
}

// Dynamic templates are stored in Blob under their .docx filename (Stage-1 mapping).
// NOTE: the stored .docx MUST be the token-normalized variant (scripts/normalize-
// templates.mjs) — raw authoring docx have tokens fragmented across Word runs and
// will fill blank.
async function loadTemplateFromBlob(_formNumber: string, file: string): Promise<Buffer> {
  const res = await get(file, { access: 'private' });
  if (!res || res.statusCode !== 200 || !res.stream) throw new Error(`template blob not found: ${file}`);
  return Buffer.from(await new Response(res.stream).arrayBuffer());
}

export const POST: APIRoute = async ({ request }) => {
  let body: any;
  try { body = await request.json(); } catch { return json({ error: 'Invalid JSON body.' }, 400); }

  // Accept either { resolved: {...} } or a bare resolved-answer object. Engine input
  // is the RESOLVED set (calcs already applied), not raw sparse answers.
  const resolved = body?.resolved ?? body;
  if (!resolved || typeof resolved !== 'object' || Array.isArray(resolved)) {
    return json({ error: 'Expected a `resolved` answers object.' }, 400);
  }

  // Input guard — reject degenerate input up front; never build a packet from it.
  const missing = validateInput(resolved);
  if (missing.length) {
    return json({
      error: 'Invalid input — required answer fields are missing or blank; no packet built.',
      missing,
    }, 400);
  }

  const gotenberg = {
    url: process.env.GOTENBERG_URL ?? 'https://bf-gotenberg.fly.dev',
    user: process.env.GOTENBERG_USER ?? 'bfpacket',
    pass: process.env.GOTENBERG_PASS ?? '',
  };

  try {
    // ── Resolve the manifest (authoritative assembly order) ──
    const { manifest } = resolvePacket(packetConfig as any, resolved) as any;
    const dynamics = manifest.filter((m: any) => m.isDynamic);

    // ── Stage 1: fetch statics from Blob (bytes via the non-enumerable `buffer`) ──
    const s1 = await fetchPacketForms(packetConfig as any, resolved);
    const staticByFormNumber = new Map<string, Buffer>();
    const staticFailures: any[] = [];
    for (const f of (s1 as any).fetches) {
      if (f.isDynamic) continue; // dynamics' .docx are fetched too but ignored here
      if (!f.ok || !f.buffer) { staticFailures.push(f); continue; }
      staticByFormNumber.set(f.formNumber, f.buffer);
    }
    if (staticFailures.length) {
      return json({
        error: 'Stage 1 — one or more static forms failed to fetch from Blob; not assembling.',
        forms: staticFailures.map((f) => ({ formNumber: f.formNumber, pathname: f.pathname ?? null, detail: f.error ?? 'no buffer returned' })),
      }, 500);
    }

    // ── Stage 2: fill dynamics + batch-convert to PDF ──
    const s2 = await fillAndConvertDynamics(packetConfig as any, fieldTypes as any, resolved, {
      loadTemplate: loadTemplateFromBlob,
      gotenberg,
    });
    const failedDyn = (s2 as any).records.filter((r: any) => !r.converted);
    if (failedDyn.length) {
      return json({
        error: 'Stage 2 — one or more dynamic forms failed to fill/convert; not assembling.',
        forms: failedDyn.map((r: any) => ({ formNumber: r.formNumber, detail: r.fillError || r.convertError || 'unknown' })),
      }, 500);
    }
    const dynPdf = new Map<string, Buffer>((s2 as any).records.map((r: any) => [r.formNumber, r.pdf]));

    // ── Build per-form sources IN MANIFEST ARRAY ORDER ──
    const sources = manifest.map((m: any, i: number) => {
      const pdf = m.isDynamic ? dynPdf.get(m.formNumber) : staticByFormNumber.get(m.formNumber);
      if (!pdf) throw new Error(`internal: no PDF for ${m.isDynamic ? 'dynamic' : 'static'} "${m.formNumber}"`);
      return { manifestIndex: i, formNumber: m.formNumber, seq: m.seq, isDynamic: m.isDynamic, source: m.isDynamic ? 'dynamic' : 'static', pdf };
    });

    // ── Stage 3: MERGE (shared module) ──
    const { mergedBytes, mergedPageCount, provenance } = await mergePacket(sources);

    // ── Verify the bytes that landed, then run the 7 assertions ──
    const landedPageCount = await countPdfPages(mergedBytes); // re-parse what we're about to stream
    const { checks } = buildPacketAssertions({ manifest, provenance, mergedPageCount, landedPageCount });
    const failedChecks = checks.filter((c: any) => !c.ok);
    if (failedChecks.length) {
      return json({
        error: 'Stage 3 — assembled packet failed its assertions; not streaming a packet that failed verification.',
        failedGates: failedChecks.map((c: any) => ({ gate: c.label, detail: c.detail })),
        pageCount: mergedPageCount,
        forms: provenance.map((r: any) => ({ manifestIndex: r.manifestIndex, formNumber: r.formNumber, seq: r.seq, pageStart: r.pageStart, pageCount: r.pageCount })),
      }, 500);
    }

    // ── Success: stream the named PDF ──
    const filename = packetFilename(resolved);
    // The runtime (undici/Vercel) streams a Uint8Array body as-is. The cast bridges a
    // strict-TS lib gap only: TS 5.7 types Uint8Array as Uint8Array<ArrayBufferLike>,
    // while the DOM BodyInit wants Uint8Array<ArrayBuffer> (and @types/node isn't in
    // this project's tsconfig types). Not a runtime concern.
    return new Response(mergedBytes as unknown as BodyInit, {
      status: 200,
      headers: {
        'content-type': 'application/pdf',
        'content-disposition': contentDisposition(filename),
        'content-length': String(mergedBytes.length),
        'cache-control': 'no-store',
      },
    });
  } catch (e: any) {
    return json({ error: 'Assemble pipeline failed.', detail: e?.message ?? String(e) }, 500);
  }
};
