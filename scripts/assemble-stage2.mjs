// scripts/assemble-stage2.mjs
// Stage-2 local runner: FILL the dynamic forms for a captured `resolved` fixture
// and CONVERT them to PDF via Gotenberg. Fill + convert ONLY — no assemble.
//
// Usage:
//   node scripts/assemble-stage2.mjs [path/to/fixture.json]
//   node scripts/assemble-stage2.mjs test-fixtures/alaskan-remote-resolved.json
//
// Templates: filled from build/normalized-templates/ — the docxtemplater-ready
//   copies produced by `node scripts/normalize-templates.mjs`. (The raw authoring
//   .docx have tokens fragmented across Word runs, which docxtemplater cannot
//   fill; normalization rejoins them. Run the normalize script first if the
//   build/ folder is missing or stale.)
//
// Gotenberg (convert): set env before running —
//   PowerShell:  $env:GOTENBERG_PASS = "xxxx"
//   bash:        export GOTENBERG_PASS=xxxx
//   GOTENBERG_URL defaults to https://bf-gotenberg.fly.dev, GOTENBERG_USER to bfpacket.
//
// Output: filled .docx + converted .pdf saved to build/stage2-output/ for eyeballing.

// Enable convertBatch diagnostic logging unless explicitly disabled.
if (process.env.ASSEMBLE_DEBUG == null) process.env.ASSEMBLE_DEBUG = '1';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { fillAndConvertDynamics } from '../src/lib/policyPacket/fillConvert.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fixtureArg = process.argv[2] || 'test-fixtures/alaskan-remote-resolved.json';

const resolved = JSON.parse(readFileSync(path.resolve(root, fixtureArg), 'utf8'));
const config = JSON.parse(readFileSync(path.resolve(root, 'src/sandbox/policy-packet/packet-config.json'), 'utf8'));
const fieldTypes = JSON.parse(readFileSync(path.resolve(root, 'src/sandbox/policy-packet/field-types.json'), 'utf8'));

const TPL_DIR = path.resolve(root, 'build/normalized-templates');
const OUT_DIR = path.resolve(root, 'build/stage2-output');
mkdirSync(OUT_DIR, { recursive: true });

if (!existsSync(TPL_DIR)) {
  console.error(`✗ ${TPL_DIR} missing — run \`node scripts/normalize-templates.mjs\` first.`);
  process.exit(1);
}

const gotenberg = {
  url: process.env.GOTENBERG_URL || 'https://bf-gotenberg.fly.dev',
  user: process.env.GOTENBERG_USER || 'bfpacket',
  pass: process.env.GOTENBERG_PASS || '',
};
if (!gotenberg.pass) console.error('⚠  GOTENBERG_PASS not set — fill will run but convert will fail (401).\n');

const io = {
  loadTemplate: async (formNumber, file) => {
    const p = path.join(TPL_DIR, file);
    if (!existsSync(p)) throw new Error(`normalized template not found: ${file}`);
    return readFileSync(p);
  },
  gotenberg,
};

console.log(`\nStage 2 — fixture: ${fixtureArg}`);
const report = await fillAndConvertDynamics(config, fieldTypes, resolved, io);

// ── Save artifacts + per-form report ─────────────────────────────────────────
const SAMPLE_TOKENS = ['Named_Insured', 'Minimum_Earned', 'TTL_Cost', 'Policy_Effective_Date', 'L_1_Zip'];

console.log(`\n${report.dynamicCount} dynamic forms:\n`);
for (const r of report.records) {
  const base = `${r.seq}`.padEnd(6) + r.formNumber.padEnd(20);
  if (!r.filled) { console.log(`  ${base} FILL FAIL — ${r.fillError}`); continue; }

  const stem = `${String(r.seq).replace(/[^\w.-]/g, '_')}_${r.formNumber.replace(/[^\w.-]/g, '_')}`;
  writeFileSync(path.join(OUT_DIR, `${stem}.docx`), r.docx);
  if (r.pdf) writeFileSync(path.join(OUT_DIR, `${stem}.pdf`), r.pdf);

  const conv = r.converted ? `PDF ${r.pdfBytes.toLocaleString()} bytes` : `CONVERT FAIL — ${r.convertError}`;
  console.log(`  ${base} filled ${String(r.filledBytes).padStart(7)} bytes · ${conv}`);

  // Show what the formatter produced for a few key tokens present in this form.
  const samples = SAMPLE_TOKENS.filter((t) => t in r.data).map((t) => `${t}=${JSON.stringify(r.data[t])}`);
  if (samples.length) console.log(`         ↳ ${samples.join('  ')}`);
}

// ── Summary / gate ───────────────────────────────────────────────────────────
const s = report.summary;
console.log(`\nSummary: ${s.dynamics} dynamics · ${s.filled} filled · ${s.converted} converted → PDF`);
if (s.fillFailures.length) {
  console.log('FILL FAILURES:');
  for (const f of s.fillFailures) console.log(`  ✗ ${f.formNumber} — ${f.error}`);
}
if (s.convertFailures.length) {
  console.log('CONVERT FAILURES:');
  for (const f of s.convertFailures) console.log(`  ✗ ${f.formNumber} — ${f.error}`);
}
console.log(`\nArtifacts saved to: ${path.relative(root, OUT_DIR)}/  (filled .docx + .pdf)`);

const allOk = s.filled === s.dynamics && s.converted === s.dynamics;
console.log(allOk ? '✓ All dynamics filled and converted.' : '… some forms incomplete (see failures above).');
// Set exitCode (don't process.exit) so undici's keepalive socket from the
// Gotenberg request can close cleanly — process.exit mid-teardown trips a libuv
// assertion on Windows. fill is the deterministic gate; convert needs Gotenberg.
process.exitCode = s.fillFailures.length ? 1 : 0;
