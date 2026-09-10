// ─── Blob uploader for Phase-3 form batches ───────────────────────────────────
// Uploads a fixed list of forms to the private Vercel Blob store `policy-packet-forms`.
//   • static  → the .pdf from the Forms/Static folder
//   • dynamic → the normalized .docx from build/normalized-templates
//     (run `node scripts/normalize-templates.mjs` FIRST for dynamics)
// Blob object name = the exact filename (matches how assemble.ts fetches).
// Requires $env:BLOB_READ_WRITE_TOKEN set in the same shell.  Run: node scripts/upload-forms.mjs
import { put } from '@vercel/blob';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const token = process.env.BLOB_READ_WRITE_TOKEN;
if (!token) { console.error('\n  ERROR: set $env:BLOB_READ_WRITE_TOKEN in this PowerShell first.\n'); process.exit(1); }

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const STATIC_DIR = 'C:/Users/smins/OneDrive/Documents/Claude Co Work Root/Outfitter and Guide Policy Packet Builder/Forms/Static';
const NORMALIZED_DIR = path.join(REPO, 'build', 'normalized-templates');

// ── This batch (edit this list for future batches) ──
const FILES = [
  // ── PWR 00 05 batch (2026-09) — static; blob stores the .pdf from Forms/Static ──
  { kind: 'static',  name: 'PWR 00 05 10 23 Powersports Mobile Equipment Endorsement.pdf' },
];

/* Previous batch (kept for reference):
const FILES = [
  // ── Business Auto (BFBA6) form set — BA-specific forms not already in Blob ──
  // ── CGL dec 08 26 (must be uploaded for the BGL 00 02 08 26 rebuild) ──
  { kind: 'dynamic', name: 'BGL 00 02 08 26 COMMERCIAL GENERAL LIABILITY DECLARATIONS.docx' },
  // Dynamics (run scripts/normalize-templates.mjs FIRST):
  { kind: 'dynamic', name: 'BRP 00 02 10 23 Business Auto Declarations.docx' },
  { kind: 'dynamic', name: 'CA 99 27 01 87 Split Liabiliity Limits.docx' },
  { kind: 'dynamic', name: 'BFFE 00 00 08 26 SCHEDULE OF FORMS AND ENDORSEMENTS.docx' },
  { kind: 'dynamic', name: 'BFPI 00 01 06 26 Premium Installment Schedule.docx' },
  { kind: 'dynamic', name: 'PWR 00 20 06 26 THIRD PARTY ACCIDENT EXPENSE REIMBURSEMENT COVERAGE – POWERSPORTS.docx' },
  { kind: 'dynamic', name: 'PWR 00 21 03 26 Optional At Rest Coverage Endorsement.docx' },
  // Statics (.pdf from Forms/Static):
  { kind: 'static',  name: 'CA 00 01 11 20 Business Auto Coverage Form.pdf' },
  { kind: 'static',  name: 'PWR 01 07 08 26 Powersports Rental Endorsement.pdf' },
  { kind: 'static',  name: 'PWR 01 08 04 26 Continuous Reporting and Premium Payment Endorsement.pdf' },
  { kind: 'static',  name: 'PWR 00 14 03 26 Employee Use Coverage Endorsement.pdf' },
  { kind: 'static',  name: 'PWR 00 19 03 26 Combined Deductible Single Incident Endorsement.pdf' },
];
*/
const CT = { static: 'application/pdf', dynamic: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' };

let ok = 0, fail = 0;
for (const f of FILES) {
  const src = f.kind === 'static' ? path.join(STATIC_DIR, f.name) : path.join(NORMALIZED_DIR, f.name);
  if (!fs.existsSync(src)) { console.log('MISSING  ' + f.name + '   (looked in ' + src + ')'); fail++; continue; }
  try {
    const body = fs.readFileSync(src);
    await put(f.name, body, { access: 'private', addRandomSuffix: false, allowOverwrite: true, token, contentType: CT[f.kind] });
    console.log('OK       ' + f.name + '   (' + body.length + ' bytes)');
    ok++;
  } catch (e) {
    console.log('FAIL     ' + f.name + '   - ' + e.message);
    fail++;
  }
}
console.log('\n' + ok + ' uploaded, ' + fail + ' failed.');
process.exit(fail ? 1 : 0);
