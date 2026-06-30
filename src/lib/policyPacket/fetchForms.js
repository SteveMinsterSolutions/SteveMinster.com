// ─── Policy Packet assembly — STAGE 1 of 3: resolve + Blob fetch ──────────────
// Given a `resolved` answers object (the exact engine input — see resolveEngine.js),
// resolve the packet to its form manifest, then fetch every included form's bytes
// from the private Vercel Blob store `policy-packet-forms`.
//
// THIS STAGE ONLY RETRIEVES AND MEASURES. No docx fill, no PDF convert, no
// assemble — those are Stages 2 and 3. The point of Stage 1 is to catch the
// manifest → blob-pathname mapping bug before any processing is built on top.

import { get } from '@vercel/blob';
import { resolvePacket } from '../../components/PolicyPacket/resolveEngine.js';

// Manifest entries carry { seq, formNumber, name, library, isDynamic } but NOT the
// `file` field — rejoin to formOrder (formNumber is unique & aligned) to recover it.
function blobPathnameFor(entry) {
  // `file` is always the .docx source filename. Dynamics live in Blob as .docx
  // (templates — filled in Stage 2). Statics/surplus are pre-rendered to PDF and
  // stored under the same basename with a .pdf extension.
  if (entry.isDynamic) return entry.file;
  return entry.file.replace(/\.docx$/i, '.pdf');
}

async function fetchOne(pathname, blobOpts) {
  const res = await get(pathname, { access: 'private', ...blobOpts });
  if (!res || res.statusCode !== 200 || !res.stream) {
    return { ok: false, bytes: 0, error: res ? `unexpected status ${res.statusCode}` : 'not found (get returned null)' };
  }
  // Drain the stream so we measure real downloaded bytes, not just metadata.
  const buf = await new Response(res.stream).arrayBuffer();
  return {
    ok: true,
    bytes: buf.byteLength,
    buffer: Buffer.from(buf), // the drained bytes themselves — additive; count-only consumers ignore it
    contentType: res.blob?.contentType ?? null,
    metaSize: res.blob?.size ?? null,
  };
}

// Tiny concurrency-bounded map — no deps. Keeps Blob fetches from stampeding.
async function mapPool(items, limit, fn) {
  const out = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const idx = next++;
      out[idx] = await fn(items[idx], idx);
    }
  });
  await Promise.all(workers);
  return out;
}

/**
 * Resolve a packet and fetch every included form's bytes from Blob.
 * @param {object} config   packet-config.json (config + source of truth)
 * @param {object} resolved the captured `resolved` answers object (engine input)
 * @param {{ token?: string, storeId?: string, concurrency?: number }} [opts]
 *        Auth defaults to env (BLOB_READ_WRITE_TOKEN locally, OIDC on Vercel);
 *        pass token/storeId only to override.
 * @returns {Promise<object>} Stage-1 report: manifest + per-form fetch results + summary.
 */
export async function fetchPacketForms(config, resolved, opts = {}) {
  const { manifest, calcValues } = resolvePacket(config, resolved);
  const byFormNumber = new Map(config.formOrder.map((f) => [f.formNumber, f]));

  const blobOpts = {};
  if (opts.token) blobOpts.token = opts.token;
  if (opts.storeId) blobOpts.storeId = opts.storeId;
  const concurrency = opts.concurrency ?? 8;

  const fetches = await mapPool(manifest, concurrency, async (m) => {
    const entry = byFormNumber.get(m.formNumber);
    const base = { seq: m.seq, formNumber: m.formNumber, isDynamic: m.isDynamic };
    if (!entry || !entry.file) {
      return { ...base, pathname: null, ok: false, bytes: 0, error: 'no matching formOrder entry / missing `file` field' };
    }
    const pathname = blobPathnameFor(entry);
    try {
      const { buffer, ...counts } = await fetchOne(pathname, blobOpts);
      const result = { ...base, pathname, ...counts };
      // Pass the drained bytes THROUGH for assembly (Stage 3), but keep them
      // NON-ENUMERABLE so the enumerable report shape is byte-for-byte unchanged:
      // callers that JSON-serialize the report (e.g. /api/assemble returns the
      // whole stage1 object) or spread a fetch entry are unaffected. Assembly
      // reads `fetch.buffer` directly.
      if (buffer) Object.defineProperty(result, 'buffer', { value: buffer, enumerable: false, configurable: true, writable: true });
      return result;
    } catch (e) {
      return { ...base, pathname, ok: false, bytes: 0, error: e?.name ? `${e.name}: ${e.message}` : String(e) };
    }
  });

  const failed = fetches.filter((f) => !f.ok);
  return {
    stage: 1,
    manifest: manifest.map((m) => ({ seq: m.seq, formNumber: m.formNumber, isDynamic: m.isDynamic })),
    manifestCount: manifest.length,
    calcValueCount: Object.keys(calcValues ?? {}).length,
    fetches,
    summary: {
      manifestCount: manifest.length,
      successful: fetches.length - failed.length,
      failed: failed.length,
      mismatches: failed.map((f) => ({ formNumber: f.formNumber, pathname: f.pathname, error: f.error })),
    },
  };
}

export default fetchPacketForms;
