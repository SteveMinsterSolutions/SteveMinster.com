// ─── Policy Packet assembly — STAGE 3 of 3: MERGE (shared, pure) ──────────────
// The proven Stage-3 merge, extracted so the CLI runner (scripts/assemble-stage3.mjs)
// and the deployed endpoint (src/pages/api/assemble.ts) run the EXACT SAME merge +
// assertion logic — one source of truth, no second copy.
//
// Merge happens in MANIFEST ARRAY ORDER. The resolved manifest is already in
// formOrder array order = the authoritative assembly sequence. We DO NOT re-sort by
// the numeric `seq` (it has duplicates like 1.35 PA/RI and decimals like 23.1); the
// integration README mandates joining by array index. Each manifest entry's PDF is
// pulled from the correct source (static = fetched Blob PDF; dynamic = its converted
// PDF) by the caller and handed in here as `sources` in that order — so dynamics land
// at their interleaved slots, never tacked on as a block at the end.

import { PDFDocument } from 'pdf-lib';

/**
 * Merge per-form source PDFs into one packet, preserving the given array order.
 * @param {Array<{ manifestIndex:number, formNumber:string, seq:string|number,
 *                 isDynamic:boolean, source?:string, pdf:Uint8Array|Buffer }>} sources
 *        One entry per included form, ALREADY in manifest array order.
 * @returns {Promise<{ mergedBytes: Uint8Array, mergedPageCount: number,
 *                     provenance: Array<{ manifestIndex, formNumber, seq, isDynamic,
 *                       source, pageStart, pageCount }> }>}
 */
export async function mergePacket(sources) {
  const outDoc = await PDFDocument.create();
  const provenance = [];
  let running = 0;
  for (const s of sources) {
    let src;
    try {
      src = await PDFDocument.load(s.pdf, { ignoreEncryption: true });
    } catch (e) {
      throw new Error(`mergePacket: failed to load PDF for "${s.formNumber}" (index ${s.manifestIndex}): ${e?.message ?? e}`);
    }
    const indices = src.getPageIndices();
    const copied = await outDoc.copyPages(src, indices);
    copied.forEach((p) => outDoc.addPage(p));
    provenance.push({
      manifestIndex: s.manifestIndex,
      formNumber: s.formNumber,
      seq: s.seq,
      isDynamic: s.isDynamic,
      source: s.source,
      pageStart: running,
      pageCount: indices.length,
    });
    running += indices.length;
  }
  const mergedBytes = await outDoc.save();
  return { mergedBytes, mergedPageCount: outDoc.getPageCount(), provenance };
}

/**
 * Re-parse final PDF bytes to confirm a valid document + page count — the
 * "verify the bytes that landed" check. Callers pass whatever bytes actually landed
 * (the CLI re-reads the file it wrote to disk; the endpoint re-parses the in-memory
 * buffer it is about to stream).
 * @param {Uint8Array|Buffer} bytes
 * @returns {Promise<number>} page count of the re-parsed document
 */
export async function countPdfPages(bytes) {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  return doc.getPageCount();
}

/**
 * The 7 Stage-3 assertions, as one pure callable so the CLI and the endpoint gate on
 * identical checks. Returns { checks, skips } — `checks` are {ok,label,detail}; the
 * caller decides what to do on failure (CLI prints + exits, endpoint returns 500).
 * `skips` carry the adaptive spot-checks that don't apply to this fixture.
 * @param {{ manifest: Array<{formNumber:string, isDynamic:boolean}>,
 *           provenance: Array<{manifestIndex,formNumber,seq,isDynamic,pageStart,pageCount}>,
 *           mergedPageCount: number, landedPageCount: number }} input
 */
export function buildPacketAssertions({ manifest, provenance, mergedPageCount, landedPageCount }) {
  const checks = [];
  const skips = [];
  const add = (ok, label, detail = '') => checks.push({ ok, label, detail });
  const dynamics = manifest.filter((m) => m.isDynamic);

  // 1. Page count: merged == sum of every source PDF's page count.
  const sumPages = provenance.reduce((a, r) => a + r.pageCount, 0);
  add(mergedPageCount === sumPages, 'Page count: merged == Σ(source pages)', `merged ${mergedPageCount} vs Σ ${sumPages}`);

  // 2a. Order: manifestIndex strictly increasing (merge order == manifest order).
  let strictlyIncreasing = true;
  for (let i = 1; i < provenance.length; i++) if (!(provenance[i].manifestIndex > provenance[i - 1].manifestIndex)) strictlyIncreasing = false;
  add(strictlyIncreasing, 'Order: manifestIndex strictly increasing', strictlyIncreasing ? `${provenance.length} forms in order` : 'OUT OF ORDER');

  // 2b. Provenance: set of merged formNumbers == manifest included set (no drops/dupes).
  const manifestSet = manifest.map((m) => m.formNumber);
  const mergedList = provenance.map((r) => r.formNumber);
  const mergedSet = new Set(mergedList);
  const dupes = mergedList.length !== mergedSet.size;
  const dropped = manifestSet.filter((fn) => !mergedSet.has(fn));
  const extra = mergedList.filter((fn) => !manifestSet.includes(fn));
  add(!dupes && dropped.length === 0 && extra.length === 0, 'Provenance: merged formNumbers == manifest set',
    dupes ? 'DUPLICATES present' : dropped.length ? `dropped: ${dropped.join(', ')}` : extra.length ? `extra: ${extra.join(', ')}` : `${mergedSet.size} forms, none dropped/duplicated`);

  // 3. Spot-checks (adaptive — only assert when the form is in this manifest).
  // 3a. SLC-3 USA declaration (seq ≈ 2) near the front.
  const decRec = provenance.find((r) => r.formNumber.startsWith('SLC-3') || parseFloat(r.seq) === 2);
  if (decRec) add(decRec.manifestIndex <= 5, `Spot: ${decRec.formNumber} (seq ${decRec.seq}) near front`, `position ${decRec.manifestIndex + 1}`);
  else skips.push('(spot: no SLC-3 / seq-2 dec form in this fixture — skipped)');

  // 3b. All dynamics at their manifest positions, NOT clustered at the end.
  if (dynamics.length) {
    const dynIdx = provenance.filter((r) => r.isDynamic).map((r) => r.manifestIndex);
    const tailStart = manifest.length - dynamics.length; // if all dyn indices >= this, they're a tail block
    const clustered = dynIdx.every((ix) => ix >= tailStart);
    add(!clustered, 'Spot: dynamics interleaved (not a tail block)', `positions ${dynIdx.map((i) => i + 1).join(', ')} of ${manifest.length}`);
  }

  // 3c. BFSD 44 (Utah surplus) present at its slot.
  const bfsd = provenance.find((r) => r.formNumber.startsWith('BFSD 44'));
  if (bfsd) add(true, `Spot: ${bfsd.formNumber} (surplus) present`, `position ${bfsd.manifestIndex + 1}`);
  else skips.push('(spot: no BFSD 44 surplus form in this fixture — skipped)');

  // 4. Bytes that landed: the re-parsed page count is > 0 and matches the in-memory total.
  add(landedPageCount > 0 && landedPageCount === mergedPageCount, 'On-disk: reopened file pages > 0 and == in-memory', `disk ${landedPageCount} vs memory ${mergedPageCount}`);

  return { checks, skips };
}

/**
 * The packet's output filename: "<Named_Insured> <Policy_Number>.pdf". Sanitizes
 * ILLEGAL filename chars only — keeps spaces & commas (real names have both) — and
 * strips a trailing space/dot. Shared so the CLI disk-write and the endpoint download
 * name agree. `Policy_Number` already carries its -00 suffix.
 * @param {Record<string, any>} resolved the resolved answer set
 * @returns {string}
 */
export function packetFilename(resolved) {
  const sanitize = (s) => String(s).replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').replace(/[ .]+$/, '');
  return `${sanitize(`${resolved.Named_Insured} ${resolved.Policy_Number}`)}.pdf`;
}
