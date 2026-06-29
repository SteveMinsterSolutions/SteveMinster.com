// scripts/assemble-stage3.mjs
// Stage-3 local runner: MERGE the fetched static PDFs + filled/converted dynamic
// PDFs into ONE packet PDF, in correct assembly order, with page-count + order
// assertions. MERGE ONLY — no endpoint, no UI, nothing downstream.
//
// Usage:
//   node scripts/assemble-stage3.mjs [path/to/fixture.json] [--from-cache]
//   node scripts/assemble-stage3.mjs test-fixtures/alaskan-remote-resolved.json
//   (defaults to the alaskan-remote fixture if no path is given)
//
// Pipeline — reuses the Stage 1+2 building blocks:
//   • resolvePacket (resolveEngine.js)         → the resolved manifest, already in
//     formOrder ARRAY order = the authoritative assembly sequence.
//   • fetchPacketForms (fetchForms.js)         → fetches every form's bytes from the
//     private Blob store. Each fetch entry carries `buffer` (the drained bytes);
//     STATIC bytes for the merge come from here. The `.docx→.pdf` pathname rule lives
//     ONLY in fetchForms.js — no copy here. (Dynamics' .docx are fetched too but
//     ignored; their PDFs come from fill+convert below.)
//   • fillAndConvertDynamics (fillConvert.js)  → returns the converted dynamic PDFs
//     (records[].pdf), mapped back to manifest entries by formNumber.
//
// Merge order: iterate the manifest in ARRAY ORDER and pull each form's PDF from the
//   correct source (static = fetched PDF; dynamic = its converted PDF, mapped by
//   formNumber). Dynamics are scattered through the order (Alaskan Remote: positions
//   2,3,15,40,42) so each converted dynamic lands at its manifest slot — never tacked
//   on as a block at the end. DO NOT re-sort by numeric `seq` (it has duplicates and
//   decimals); array index is authoritative.
//
// --from-cache: if build/assemble-scratch/<fixture>/ is already populated from a
//   prior run, skip resolve/fetch/fill/convert and merge straight from those PDFs.
//   Lets the merge + assertion logic be iterated without Gotenberg or Blob creds.
//   (The manifest is still re-resolved — it's pure and needs no creds — to validate
//   the cache contents and drive the order/provenance assertions.)
//
// Environment (full run only): BLOB_READ_WRITE_TOKEN (or VERCEL_OIDC_TOKEN) for the
//   private Blob store, and GOTENBERG_URL/USER/PASS with Gotenberg up for the dynamic
//   convert. Without creds a full run is BLOCKED (a clearly-labelled precondition, not
//   a Stage-3 failure); use --from-cache once a cache exists, or run in the
//   credentialed shell.

// Mirror Stage 2: surface convertBatch diagnostics unless explicitly disabled.
if (process.env.ASSEMBLE_DEBUG == null) process.env.ASSEMBLE_DEBUG = '1';

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { resolvePacket } from '../src/components/PolicyPacket/resolveEngine.js';
import { fetchPacketForms } from '../src/lib/policyPacket/fetchForms.js';
import { fillAndConvertDynamics } from '../src/lib/policyPacket/fillConvert.js';
import { mergePacket, countPdfPages, buildPacketAssertions, packetFilename } from '../src/lib/policyPacket/mergePacket.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// ─── Args ─────────────────────────────────────────────────────────────────────
const rawArgs = process.argv.slice(2);
const fromCache = rawArgs.includes('--from-cache');
const fixtureArg = rawArgs.find((a) => !a.startsWith('--')) || 'test-fixtures/alaskan-remote-resolved.json';
const fixtureName = path.basename(fixtureArg).replace(/\.json$/i, '');

// ─── Inputs ────────────────────────────────────────────────────────────────────
const resolvedFixture = JSON.parse(readFileSync(path.resolve(root, fixtureArg), 'utf8'));
const config = JSON.parse(readFileSync(path.resolve(root, 'src/sandbox/policy-packet/packet-config.json'), 'utf8'));
const fieldTypes = JSON.parse(readFileSync(path.resolve(root, 'src/sandbox/policy-packet/field-types.json'), 'utf8'));

const TPL_DIR = path.resolve(root, 'build/normalized-templates');
const SCRATCH_DIR = path.resolve(root, 'build/assemble-scratch', fixtureName);
const OUT_DIR = path.resolve(root, 'build/assemble-out');

// ─── Filename helpers (scratch only; packet output name comes from packetFilename) ──
// Scratch per-form segment: collapse spaces/illegal chars to "_" (matches Stage 2).
const sanitizeSeg = (s) => String(s).replace(/[^\w.-]/g, '_');
const scratchNameFor = (i, formNumber) => `${String(i + 1).padStart(3, '0')}-${sanitizeSeg(formNumber)}.pdf`;

// ════════════════════════════════════════════════════════════════════════════
async function main() {
  console.log(`\nStage 3 — fixture: ${fixtureArg}${fromCache ? '  [--from-cache]' : ''}`);

  // Resolve the manifest — pure, no creds. Authoritative assembly order AND the
  // baseline for every order/provenance assertion (used in BOTH modes).
  const { manifest } = resolvePacket(config, resolvedFixture);
  const dynamics = manifest.filter((m) => m.isDynamic);
  console.log(`Resolved manifest: ${manifest.length} forms (${dynamics.length} dynamic, ${manifest.length - dynamics.length} static).`);

  // ── Gather one source PDF per manifest entry, IN MANIFEST ARRAY ORDER ─────────
  // sources[i] = { manifestIndex, formNumber, seq, isDynamic, source, pdf }
  let sources;

  if (fromCache) {
    if (!existsSync(SCRATCH_DIR)) {
      console.error(`✗ --from-cache: scratch dir not found: ${path.relative(root, SCRATCH_DIR)}\n  Run a full credentialed pass first to populate it.`);
      process.exitCode = 1;
      return;
    }
    const missing = [];
    sources = manifest.map((m, i) => {
      const file = path.join(SCRATCH_DIR, scratchNameFor(i, m.formNumber));
      if (!existsSync(file)) { missing.push(scratchNameFor(i, m.formNumber)); return null; }
      return { manifestIndex: i, formNumber: m.formNumber, seq: m.seq, isDynamic: m.isDynamic, source: 'cache', pdf: readFileSync(file) };
    });
    if (missing.length) {
      console.error(`✗ --from-cache: ${missing.length} expected per-form PDF(s) missing from ${path.relative(root, SCRATCH_DIR)}:`);
      for (const n of missing) console.error(`    ${n}`);
      console.error(`  The cache is incomplete — run a full credentialed pass to repopulate it.`);
      process.exitCode = 1;
      return;
    }
    const extras = readdirSync(SCRATCH_DIR).filter((n) => n.toLowerCase().endsWith('.pdf')).length - manifest.length;
    console.log(`Loaded ${sources.length} per-form PDFs from cache${extras > 0 ? ` (${extras} stale extra file(s) in scratch — ignored)` : ''}.`);
  } else {
    // ── Full run: creds precondition (NOT a Stage-3 failure if unmet) ──────────
    const hasBlob = !!(process.env.BLOB_READ_WRITE_TOKEN || process.env.VERCEL_OIDC_TOKEN);
    const gotenberg = {
      url: process.env.GOTENBERG_URL || 'https://bf-gotenberg.fly.dev',
      user: process.env.GOTENBERG_USER || 'bfpacket',
      pass: process.env.GOTENBERG_PASS || '',
    };
    const needsGotenberg = dynamics.length > 0;
    const blockers = [];
    if (!hasBlob) blockers.push('BLOB_READ_WRITE_TOKEN (or VERCEL_OIDC_TOKEN) — needed to fetch static PDFs');
    if (needsGotenberg && !gotenberg.pass) blockers.push('GOTENBERG_PASS — needed to convert dynamic forms');
    if (needsGotenberg && !existsSync(TPL_DIR)) blockers.push(`build/normalized-templates/ — run \`node scripts/normalize-templates.mjs\` first`);
    if (blockers.length) {
      console.log('\n──────────────────────────────────────────────────────────────');
      console.log('PRECONDITION: a full run needs credentials/assets not present here.');
      console.log('This is NOT a Stage-3 failure — the merge logic is intact. Run this');
      console.log('in the credentialed shell, or use --from-cache once a cache exists.');
      console.log('Missing:');
      for (const b of blockers) console.log(`  • ${b}`);
      console.log('──────────────────────────────────────────────────────────────');
      process.exitCode = 0; // gated precondition, not a failure
      return;
    }

    // Fetch statics (byte-returning) + fill/convert dynamics.
    const io = {
      loadTemplate: async (_formNumber, file) => {
        const p = path.join(TPL_DIR, file);
        if (!existsSync(p)) throw new Error(`normalized template not found: ${file}`);
        return readFileSync(p);
      },
      gotenberg,
    };

    console.log(`Fetching ${manifest.length - dynamics.length} static PDFs from Blob via Stage 1 (fetchPacketForms) …`);
    const stage1 = await fetchPacketForms(config, resolvedFixture);
    // fetches[] is in manifest order and now carries the drained `buffer`. Statics
    // feed the merge; dynamics' fetched .docx are ignored (PDFs come from convert).
    const staticByFormNumber = new Map();
    const staticFailures = [];
    for (const f of stage1.fetches) {
      if (f.isDynamic) continue;
      if (!f.ok || !f.buffer) { staticFailures.push(f); continue; }
      staticByFormNumber.set(f.formNumber, f.buffer);
    }
    if (staticFailures.length) {
      console.error(`✗ ${staticFailures.length} static form(s) failed to fetch from Blob — cannot assemble a complete packet:`);
      for (const f of staticFailures) console.error(`    ${f.formNumber} → ${f.pathname ?? '(unresolved)'} — ${f.error ?? 'no buffer returned'}`);
      process.exitCode = 1;
      return;
    }

    console.log(`Filling + converting ${dynamics.length} dynamic forms via Gotenberg …`);
    const stage2 = await fillAndConvertDynamics(config, fieldTypes, resolvedFixture, io);
    const failedDyn = stage2.records.filter((r) => !r.converted);
    if (failedDyn.length) {
      console.error(`✗ ${failedDyn.length} dynamic form(s) did not fill+convert — cannot assemble a complete packet:`);
      for (const r of failedDyn) console.error(`    ${r.formNumber} — ${r.fillError || r.convertError || 'unknown'}`);
      process.exitCode = 1;
      return;
    }
    const dynPdf = new Map(stage2.records.map((r) => [r.formNumber, r.pdf]));

    sources = manifest.map((m, i) => {
      let pdf;
      if (m.isDynamic) {
        pdf = dynPdf.get(m.formNumber);
        if (!pdf) throw new Error(`internal: no converted PDF for dynamic "${m.formNumber}"`);
      } else {
        pdf = staticByFormNumber.get(m.formNumber);
        if (!pdf) throw new Error(`internal: no fetched PDF for static "${m.formNumber}"`);
      }
      return { manifestIndex: i, formNumber: m.formNumber, seq: m.seq, isDynamic: m.isDynamic, source: m.isDynamic ? 'dynamic' : 'static', pdf };
    });

    // Write per-form intermediates to scratch (gitignored) for byte-level eyeballing.
    mkdirSync(SCRATCH_DIR, { recursive: true });
    for (const s of sources) writeFileSync(path.join(SCRATCH_DIR, scratchNameFor(s.manifestIndex, s.formNumber)), s.pdf);
    console.log(`Wrote ${sources.length} per-form PDFs to ${path.relative(root, SCRATCH_DIR)}/`);
  }

  // ── MERGE (shared module — byte-for-byte the same logic the endpoint runs) ────
  let merged;
  try {
    merged = await mergePacket(sources);
  } catch (e) {
    console.error(`✗ ${e?.message ?? e}`);
    process.exitCode = 1;
    return;
  }
  const { mergedBytes, mergedPageCount, provenance } = merged;

  // ── Write the merged packet ───────────────────────────────────────────────────
  mkdirSync(OUT_DIR, { recursive: true });
  const outPath = path.join(OUT_DIR, packetFilename(resolvedFixture));
  writeFileSync(outPath, mergedBytes);

  // ── Per-form merge map ───────────────────────────────────────────────────────
  console.log(`\nMerge map (manifest order):`);
  console.log(`  ${'###'.padEnd(4)}${'SEQ'.padEnd(8)}${'KIND'.padEnd(6)}${'FORM'.padEnd(20)}PAGES`);
  for (const r of provenance) {
    const last = r.pageStart + r.pageCount; // 1-based end (pages [start+1 .. last])
    const range = r.pageCount === 1 ? `p${r.pageStart + 1}` : `p${r.pageStart + 1}–${last}`;
    console.log(`  ${String(r.manifestIndex + 1).padStart(3, '0').padEnd(4)}${String(r.seq).padEnd(8)}${(r.isDynamic ? 'DYN' : 'stat').padEnd(6)}${r.formNumber.padEnd(20)}${range} (${r.pageCount})`);
  }

  // ── ASSERTIONS (shared module — identical to the endpoint) ────────────────────
  // "Bytes that landed": re-open the file we just WROTE TO DISK — stronger than the
  // in-memory buffer, since it proves the write itself produced a valid PDF.
  const landedPageCount = await countPdfPages(readFileSync(outPath));
  const { checks, skips } = buildPacketAssertions({ manifest, provenance, mergedPageCount, landedPageCount });

  for (const s of skips) console.log(`  ${s}`);
  console.log(`\nAssertions:`);
  for (const c of checks) console.log(`  ${c.ok ? '✓' : '✗'} ${c.label}${c.detail ? `  — ${c.detail}` : ''}`);

  const failed = checks.filter((c) => !c.ok);
  console.log(`\nPacket: ${path.relative(root, outPath)}  (${mergedPageCount} pages, ${mergedBytes.length.toLocaleString()} bytes)`);
  if (failed.length) {
    console.log(`\n✗ STAGE 3 FAILED — ${failed.length} assertion(s) did not pass.`);
    process.exitCode = 1;
  } else {
    console.log(`\n✓ STAGE 3 PASSED — ${checks.length} assertions, ${provenance.length} forms, ${mergedPageCount} pages merged in manifest order.`);
    process.exitCode = 0;
  }
}

// Top-level await is fine in .mjs; set exitCode (don't process.exit) so undici's
// keepalive socket from the Gotenberg request can close cleanly on Windows.
await main().catch((e) => {
  console.error(`\n✗ STAGE 3 errored: ${e?.stack || e?.message || e}`);
  process.exitCode = 1;
});
