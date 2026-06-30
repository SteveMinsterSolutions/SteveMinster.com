// scripts/assemble-stage1.mjs
// Stage-1 local runner: resolve a packet from a captured `resolved` fixture and
// fetch every included form's bytes from the private Vercel Blob store.
// RESOLUTION + FETCH ONLY — no fill/convert/assemble.
//
// Usage:
//   node scripts/assemble-stage1.mjs [path/to/fixture.json]
//   node scripts/assemble-stage1.mjs test-fixtures/alaskan-remote-resolved.json
//   (defaults to the alaskan-remote fixture if no path is given)
//
// Blob auth — the store is PRIVATE, so a credential must be in the environment:
//   PowerShell:  $env:BLOB_READ_WRITE_TOKEN = "vercel_blob_rw_xxx"
//   bash:        export BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxx
//   Get the token from the `policy-packet-forms` store in the Vercel dashboard,
//   or run `vercel env pull` and provide VERCEL_OIDC_TOKEN + BLOB_STORE_ID.
//   (On Vercel the endpoint uses OIDC automatically; this token is local-only.)

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { fetchPacketForms } from '../src/lib/policyPacket/fetchForms.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fixtureArg = process.argv[2] || 'test-fixtures/alaskan-remote-resolved.json';

const resolved = JSON.parse(readFileSync(path.resolve(root, fixtureArg), 'utf8'));
const config = JSON.parse(readFileSync(path.resolve(root, 'src/sandbox/policy-packet/packet-config.json'), 'utf8'));

if (!process.env.BLOB_READ_WRITE_TOKEN && !process.env.VERCEL_OIDC_TOKEN) {
  console.error('⚠  No BLOB_READ_WRITE_TOKEN or VERCEL_OIDC_TOKEN in env — private Blob fetches will FAIL.\n');
}

console.log(`\nStage 1 — fixture: ${fixtureArg}`);
const report = await fetchPacketForms(config, resolved);

// ── Resolved manifest ────────────────────────────────────────────────────────
console.log(`\nResolved manifest — ${report.manifestCount} forms (${report.calcValueCount} calc values):`);
console.log(`  ${'SEQ'.padEnd(6)}${'FORM NUMBER'.padEnd(22)}KIND`);
for (const m of report.manifest) {
  console.log(`  ${String(m.seq).padEnd(6)}${m.formNumber.padEnd(22)}${m.isDynamic ? 'dynamic (.docx)' : 'static (.pdf)'}`);
}

// ── Fetch-results table ──────────────────────────────────────────────────────
console.log(`\nFetch results:`);
console.log(`  ${'FORM NUMBER'.padEnd(22)}${'BYTES'.padStart(10)}  BLOB PATHNAME`);
for (const f of report.fetches) {
  const bytes = f.ok ? f.bytes.toLocaleString().padStart(10) : '      FAIL';
  const tail = f.ok ? '' : `  ← ${f.error}`;
  console.log(`  ${f.formNumber.padEnd(22)}${bytes}  ${f.pathname ?? '(unresolved)'}${tail}`);
}

// ── Summary / gate ───────────────────────────────────────────────────────────
const s = report.summary;
console.log(`\nSummary: ${s.manifestCount} manifest forms · ${s.successful} fetched OK · ${s.failed} failed`);
if (s.mismatches.length) {
  console.log('\nMISMATCHES (the mapping/fetch bug this stage exists to catch):');
  for (const m of s.mismatches) console.log(`  ✗ ${m.formNumber} → ${m.pathname ?? '(unresolved)'} — ${m.error}`);
  process.exit(1);
}
console.log('✓ Every manifest form resolved to a blob pathname and returned bytes.');
