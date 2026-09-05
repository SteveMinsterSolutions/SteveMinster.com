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
//
// The three-stage pipeline itself now lives in the shared buildOnePolicy() primitive
// (src/lib/policyPacket/buildPolicy.js); this endpoint owns the HTTP concerns and, next,
// the fan-out loop that turns one submission into a LIST of policies (CGL + excess).
import type { APIRoute } from 'astro';
import { get } from '@vercel/blob';
import packetConfig from '../../sandbox/policy-packet/packet-config.json';
import fieldTypes from '../../sandbox/policy-packet/field-types.json';
import excessConfig from '../../sandbox/policy-packet/excess-config.json';
import baConfig from '../../sandbox/policy-packet/ba-config.json';
import { buildOnePolicy } from '../../lib/policyPacket/buildPolicy.js';
import { fanOutPolicies, zipPolicies, policiesZipName, buildBFPISchedule } from '../../lib/policyPacket/fanOut.js';

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
    // ── Fan out: one submission → an ordered policy list (CGL + 0–2 excess) ──
    // With the excess form-set config imported, an excess election now fans out to
    // BFEI6 (A) and/or BFEX6 (B) alongside the CGL; no election ⇒ CGL only (unchanged).
    const policies = fanOutPolicies(packetConfig as any, excessConfig as any, resolved, baConfig as any);

    // ── BFPI 00 01: cross-policy Premium Installment Schedule (ALL policies) ──
    // Computed ONCE from the ORIGINAL submission `resolved` (which still carries each
    // policy's premium, the CGL BFSR6 number and the effective date) and merged into
    // EVERY policy's resolved. Must run AFTER fan-out because policy overlays overwrite
    // Policy_Number/TTL_Premium; reading those post-overlay would schedule the wrong
    // figures. Each policy config gates BFPI inclusion via its own formOrder/formRule,
    // so merging these values everywhere is harmless where BFPI is not on the manifest.
    const bfpiValues = buildBFPISchedule(resolved);
    for (const p of policies) {
      p.resolved = { ...p.resolved, ...bfpiValues };
    }

    // Build every policy through the shared primitive. Any single policy failing its
    // assertions fails the WHOLE build — never ship a partial tower.
    const built: Array<{ pdf: Uint8Array; filename: string }> = [];
    for (const p of policies) {
      const result = await buildOnePolicy(p.config as any, fieldTypes as any, p.resolved, {
        loadTemplate: loadTemplateFromBlob,
        gotenberg,
        filename: p.filename,
      });
      if (!result.ok) {
        return json({ ...(result as any).body, policy: p.id, policyFilename: p.filename }, (result as any).status);
      }
      built.push({ pdf: (result as any).pdf, filename: (result as any).filename });
    }

    // ── Single policy (the common case): stream the named PDF, exactly as before ──
    // The runtime (undici/Vercel) streams a Uint8Array body as-is. The cast bridges a
    // strict-TS lib gap only (Uint8Array<ArrayBufferLike> vs the DOM BodyInit's
    // Uint8Array<ArrayBuffer>); not a runtime concern.
    if (built.length === 1) {
      const { pdf, filename } = built[0];
      return new Response(pdf as unknown as BodyInit, {
        status: 200,
        headers: {
          'content-type': 'application/pdf',
          'content-disposition': contentDisposition(filename),
          'content-length': String(pdf.length),
          'cache-control': 'no-store',
        },
      });
    }

    // ── Multiple policies (fanned-out tower): return one zip of named PDFs ──
    const zipBytes = zipPolicies(built);
    const zipName = policiesZipName(resolved);
    return new Response(zipBytes as unknown as BodyInit, {
      status: 200,
      headers: {
        'content-type': 'application/zip',
        'content-disposition': contentDisposition(zipName),
        'content-length': String(zipBytes.length),
        'cache-control': 'no-store',
      },
    });
  } catch (e: any) {
    return json({ error: 'Assemble pipeline failed.', detail: e?.message ?? String(e) }, 500);
  }
};
