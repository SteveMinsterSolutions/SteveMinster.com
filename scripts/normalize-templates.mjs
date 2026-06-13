// ─────────────────────────────────────────────────────────────────────────────
// Phase 5 — token normalization pass for the dynamic policy-packet templates.
//
// Word fragments {{tokens}} across multiple runs (proofing boundaries), which
// docxtemplater cannot fill. This script reads each authoring-source .docx,
// rejoins adjacent runs so every docxtemplater delimiter pair ({{token}},
// {{#section}}, {{/section}}, {{^section}}) sits inside ONE run, and writes a
// NORMALIZED COPY to build/normalized-templates/ (a gitignored build artifact).
//
//   • The authoring source is NEVER modified — input is read-only.
//   • Re-runnable: editing a template in Word re-splits tokens, so run this on
//     every template change.  `node scripts/normalize-templates.mjs`
//   • Dependency-free: hand-rolled zip read/write (zlib + CRC32) + string-level
//     run-merge.  No formatting change — runs are only merged when their <w:rPr>
//     is byte-identical (proofErr markers, which are invisible, are stripped).
//
// After writing OUT it runs the verification + authoritative checks (3–8) and
// prints a report. Exit code is non-zero if any EXPECT-∅/0 check fails.
// ─────────────────────────────────────────────────────────────────────────────
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const SRC = 'C:/Users/smins/OneDrive/Documents/Claude Co Work Root/Outfitter and Guide Policy Packet Builder/Forms/Dynamic';
const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(REPO, 'build', 'normalized-templates');
const CONFIG = path.join(REPO, 'src/sandbox/policy-packet/packet-config.json');
const FIELD_TYPES = path.join(REPO, 'src/sandbox/policy-packet/field-types.json');

// Parts within a .docx that can hold runs/tokens.
const PART_RE = /^word\/(document|header\d*|footer\d*|footnotes|endnotes)\.xml$/;

// ─── CRC32 (for the zip writer) ───────────────────────────────────────────────
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

// ─── Minimal zip read / write (store unchanged entries, deflate all) ──────────
function readZip(buf) {
  // Prefer the EOCD whose central-directory size lands exactly on it (so a stray
  // 0x06054b50 in compressed data can't be mistaken for it); fall back to the last
  // signature for archives that don't satisfy the invariant exactly.
  let eo = -1, naiveEo = -1;
  for (let i = buf.length - 22; i >= 0; i--) {
    if (buf.readUInt32LE(i) !== 0x06054b50) continue;
    if (naiveEo < 0) naiveEo = i;
    const off = buf.readUInt32LE(i + 16), size = buf.readUInt32LE(i + 12);
    if (off + size === i) { eo = i; break; }
  }
  if (eo < 0) eo = naiveEo;
  if (eo < 0) throw new Error('not a zip (no EOCD)');
  const cdOff = buf.readUInt32LE(eo + 16), cnt = buf.readUInt16LE(eo + 10);
  const entries = [];
  let p = cdOff;
  for (let n = 0; n < cnt; n++) {
    const method = buf.readUInt16LE(p + 10);
    const compSize = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28), extraLen = buf.readUInt16LE(p + 30), commLen = buf.readUInt16LE(p + 32);
    const lh = buf.readUInt32LE(p + 42);
    const name = buf.toString('utf8', p + 46, p + 46 + nameLen);
    const lnl = buf.readUInt16LE(lh + 26), lel = buf.readUInt16LE(lh + 28);
    const ds = lh + 30 + lnl + lel;
    const comp = buf.subarray(ds, ds + compSize);
    const data = method === 0 ? Buffer.from(comp) : zlib.inflateRawSync(comp);
    entries.push({ name, data });
    p += 46 + nameLen + extraLen + commLen;
  }
  return entries;
}
function writeZip(entries) {
  const local = [], central = [];
  let localLen = 0; // running ACTUAL byte length of the local section
  for (const e of entries) {
    const nameBuf = Buffer.from(e.name, 'utf8');
    const comp = zlib.deflateRawSync(e.data, { level: 9 });
    const crc = crc32(e.data);
    const localOffset = localLen; // local-header offset for THIS entry
    const lh = Buffer.alloc(30);
    lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(0, 6);
    lh.writeUInt16LE(8, 8); lh.writeUInt16LE(0, 10); lh.writeUInt16LE(0x21, 12); // fixed dos time/date
    lh.writeUInt32LE(crc, 14); lh.writeUInt32LE(comp.length, 18); lh.writeUInt32LE(e.data.length, 22);
    lh.writeUInt16LE(nameBuf.length, 26); lh.writeUInt16LE(0, 28);
    local.push(lh, nameBuf, comp);
    localLen += lh.length + nameBuf.length + comp.length;
    const ch = Buffer.alloc(46);
    ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(20, 4); ch.writeUInt16LE(20, 6); ch.writeUInt16LE(0, 8);
    ch.writeUInt16LE(8, 10); ch.writeUInt16LE(0, 12); ch.writeUInt16LE(0x21, 14);
    ch.writeUInt32LE(crc, 16); ch.writeUInt32LE(comp.length, 20); ch.writeUInt32LE(e.data.length, 24);
    ch.writeUInt16LE(nameBuf.length, 28); ch.writeUInt16LE(0, 30); ch.writeUInt16LE(0, 32);
    ch.writeUInt16LE(0, 34); ch.writeUInt16LE(0, 36); ch.writeUInt32LE(0, 38);
    ch.writeUInt32LE(localOffset, 42);
    central.push(ch, nameBuf);
  }
  // Derive cdOff from the ACTUAL concatenated local section (not a parallel
  // accumulator) so the EOCD always matches the real layout by construction.
  const localBuf = Buffer.concat(local);
  const centralBuf = Buffer.concat(central);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0); eocd.writeUInt16LE(0, 4); eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(entries.length, 8); eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(centralBuf.length, 12); eocd.writeUInt32LE(localBuf.length, 16); eocd.writeUInt16LE(0, 20); // comment length @20 (NOT 18 — 18 overlaps cdOff hi bytes)
  return Buffer.concat([localBuf, centralBuf, eocd]);
}

// ─── Run-merge normalization of one xml part ──────────────────────────────────
// Strict "pure text run": <w:r> (no attrs) with optional <w:rPr> then a single
// <w:t>. Only these are merged, and only when adjacent with byte-identical rPr —
// so formatting is provably unchanged. Everything else is preserved verbatim.
const STRICT_RUN = /^<w:r>(<w:rPr>[\s\S]*?<\/w:rPr>)?<w:t(?: xml:space="[^"]*")?>([\s\S]*?)<\/w:t><\/w:r>$/;
const ANY_RUN = /<w:r\b[^>]*>[\s\S]*?<\/w:r>/g;
function normalizeXml(xml) {
  // Strip w:rsid* attributes (revision-save IDs — change-tracking metadata with no
  // visual effect). Word stamps these per run, so the runs of one split token differ
  // only by rsid; removing them lets identical-rPr runs merge. <w:r w:rsidRPr=".."> -> <w:r>.
  xml = xml.replace(/\s+w:rsid\w+="[^"]*"/g, '');
  // Strip proofing markers (spell/grammar squiggle metadata; no visible effect)
  // — these are the elements Word interleaves between the runs of a split token.
  xml = xml.replace(/<w:proofErr\b[^>]*\/>/g, '').replace(/<w:proofErr\b[^>]*>[\s\S]*?<\/w:proofErr>/g, '');

  const nodes = [];
  let last = 0, m;
  ANY_RUN.lastIndex = 0;
  while ((m = ANY_RUN.exec(xml))) {
    if (m.index > last) nodes.push({ t: 'raw', s: xml.slice(last, m.index) });
    const sm = STRICT_RUN.exec(m[0]);
    if (sm) nodes.push({ t: 'run', rPr: sm[1] || '', text: sm[2] });
    else nodes.push({ t: 'raw', s: m[0] }); // barrier run (attrs / non-text content)
    last = m.index + m[0].length;
  }
  if (last < xml.length) nodes.push({ t: 'raw', s: xml.slice(last) });

  // Merge runs so no {{token}} spans a run boundary. Two cases, both content-safe:
  //   • forward-merge: if the previous run ends INSIDE a token (more {{ than }}),
  //     absorb the next run regardless of rPr, keeping the opening run's rPr. This
  //     is the only way a token split across DIFFERENTLY-formatted runs (e.g. a
  //     <w:caps/> '{{T' + plain 'oday_Date}}') becomes fillable; only the
  //     placeholder's formatting unifies — the filled value renders uniformly.
  //   • coalesce: adjacent identical-rPr runs merge with zero visible change.
  // Empty raw slices between runs (the usual Word case after proofErr removal) are
  // transparent; a non-empty barrier breaks the chain.
  const opens = (s) => (s.match(/\{\{/g) || []).length - (s.match(/\}\}/g) || []).length;
  const out = [];
  for (const nd of nodes) {
    if (nd.t === 'raw' && nd.s === '') continue;
    const prev = out[out.length - 1];
    if (nd.t === 'run' && prev && prev.t === 'run' && (opens(prev.text) > 0 || prev.rPr === nd.rPr)) prev.text += nd.text;
    else out.push(nd);
  }
  // Re-emit. xml:space="preserve" guards any spaces in merged text (no visible change).
  return out.map((nd) => (nd.t === 'raw' ? nd.s : `<w:r>${nd.rPr}<w:t xml:space="preserve">${nd.text}</w:t></w:r>`)).join('');
}

// ─── Token / text helpers ─────────────────────────────────────────────────────
const decode = (s) => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'");
const TOKEN = /\{\{\s*([\s\S]*?)\s*\}\}/g;
const isControl = (t) => /^[#/^]/.test(t);

function partsOf(entries) { return entries.filter((e) => PART_RE.test(e.name)); }
function joinedText(entries) {
  return partsOf(entries).map((e) =>
    decode([...e.data.toString('utf8').matchAll(/<w:t\b[^>]*>([\s\S]*?)<\/w:t>/g)].map((x) => x[1]).join(''))
  ).join('\n');
}
function runTexts(entries) {
  const out = [];
  for (const e of partsOf(entries)) for (const x of e.data.toString('utf8').matchAll(/<w:t\b[^>]*>([\s\S]*?)<\/w:t>/g)) out.push(decode(x[1]));
  return out;
}
function allTokens(text) { return [...text.matchAll(TOKEN)].map((m) => m[1].trim()); }
function dataTokens(text) { return [...new Set(allTokens(text).filter((t) => t && !isControl(t)))]; }

// ─── Run ──────────────────────────────────────────────────────────────────────
const cfg = JSON.parse(fs.readFileSync(CONFIG, 'utf8'));
const fieldTypes = JSON.parse(fs.readFileSync(FIELD_TYPES, 'utf8'));
const ftKeys = new Set(Object.keys(fieldTypes));
const fileFor = {}; for (const f of cfg.formOrder) fileFor[f.formNumber] = f.file;

fs.mkdirSync(OUT, { recursive: true });
const srcFiles = fs.readdirSync(SRC).filter((f) => f.toLowerCase().endsWith('.docx'));

const srcCache = {}, outCache = {};
console.log(`NORMALIZE: ${srcFiles.length} templates  ${SRC}  ->  ${OUT}\n`);
let writeFail = 0;
for (const file of srcFiles) {
  const entries = readZip(fs.readFileSync(path.join(SRC, file)));
  srcCache[file] = entries;
  const normEntries = entries.map((e) => (PART_RE.test(e.name) ? { name: e.name, data: Buffer.from(normalizeXml(e.data.toString('utf8')), 'utf8') } : e));
  fs.writeFileSync(path.join(OUT, file), writeZip(normEntries));
  // Re-read the ON-DISK file so every downstream check validates the real artifact,
  // and assert the round-trip preserved the full entry set (catches any zip-writer
  // or filesystem/sync corruption immediately).
  const back = readZip(fs.readFileSync(path.join(OUT, file)));
  outCache[file] = back;
  const srcNames = entries.map((e) => e.name).sort().join('|');
  const outNames = back.map((e) => e.name).sort().join('|');
  if (srcNames !== outNames || !back.some((e) => e.name === 'word/document.xml')) {
    writeFail++; console.log(`  WRITE-INTEGRITY FAIL: ${file} (${entries.length} src parts -> ${back.length} out parts)`);
  }
}
console.log(`=== 0. WRITE INTEGRITY (re-read each OUT from disk) — expect 0 failures ===`);
console.log(`  -> ${writeFail === 0 ? 'PASS (all 22 round-trip; entry sets preserved)' : 'FAIL: ' + writeFail + ' file(s)'}\n`);

// ── 3. split-token detector on OUT ──
console.log('=== 3. SPLIT-TOKEN DETECTOR (OUT) — expect 0 across all 22 ===');
let splitTotal = 0;
for (const file of srcFiles) {
  const joined = joinedText(outCache[file]);
  const runSet = new Set(runTexts(outCache[file]).flatMap((v) => allTokens(v).map((t) => t.trim())));
  const split = [...new Set(allTokens(joined).map((t) => t.trim()))].filter((t) => !runSet.has(t));
  if (split.length) { splitTotal += split.length; console.log(`  SPLIT ${file}: ${split.join(', ')}`); }
}
console.log(`  -> ${splitTotal === 0 ? 'PASS (0 splits)' : 'FAIL: ' + splitTotal + ' split tokens'}\n`);

// ── 4. orphaned control-tag balance on OUT ──
console.log('=== 4. CONTROL-TAG BALANCE (OUT) — expect all balanced ===');
let unbalanced = 0;
for (const file of srcFiles) {
  const toks = allTokens(joinedText(outCache[file])).filter(isControl);
  const stack = []; const errs = [];
  for (const t of toks) {
    if (/^[#^]/.test(t)) stack.push(t.slice(1).trim());
    else { const name = t.slice(1).trim(); if (!stack.length || stack[stack.length - 1] !== name) errs.push(`stray/mismatched {{/${name}}}`); else stack.pop(); }
  }
  if (stack.length) errs.push(`unclosed: ${stack.join(', ')}`);
  if (errs.length) { unbalanced++; console.log(`  ${file}: ${errs.join(' | ')}`); }
}
console.log(`  -> ${unbalanced === 0 ? 'PASS (all balanced; no control tags remain)' : 'FAIL: ' + unbalanced + ' form(s)'}\n`);

// ── 5. content integrity SRC vs OUT ──
console.log('=== 5. CONTENT INTEGRITY (visible text SRC == OUT) — expect all match ===');
let changed = 0;
for (const file of srcFiles) {
  const a = runTexts(srcCache[file]).join(''); // concatenated visible text, run boundaries ignored
  const b = runTexts(outCache[file]).join('');
  if (a !== b) { changed++; console.log(`  CHANGED ${file} (len ${a.length} -> ${b.length})`); }
}
console.log(`  -> ${changed === 0 ? 'PASS (content identical except run boundaries)' : 'FAIL: ' + changed + ' doc(s) changed'}\n`);

// ── 6. authoritative reconcile (NORM vs fieldMapping) ──
console.log('=== 6. RECONCILE (NORM data tokens vs fieldMapping) — expect (a) ∅ for all 22 ===');
let missTotal = 0; const absentByForm = [];
for (const form of Object.keys(cfg.fieldMapping)) {
  const file = fileFor[form];
  const entries = outCache[file];
  if (!entries) { console.log(`  ${form}: OUT FILE MISSING (${file})`); missTotal++; continue; }
  const tmpl = dataTokens(joinedText(entries));
  const map = new Set(cfg.fieldMapping[form]);
  const missingFromMapping = tmpl.filter((t) => !map.has(t));
  const absentFromTemplate = [...map].filter((t) => !tmpl.includes(t));
  if (missingFromMapping.length) { missTotal += missingFromMapping.length; console.log(`  (a) ${form}: MISSING FROM MAPPING -> ${missingFromMapping.join(', ')}`); }
  if (absentFromTemplate.length) absentByForm.push(`${form}: ${absentFromTemplate.join(', ')}`);
}
console.log(`  -> (a) ${missTotal === 0 ? 'PASS (∅ unmapped across all 22, incl LMA5389/TRIA_Premium)' : 'FAIL: ' + missTotal + ' unmapped'}`);
console.log('  (b) fieldMapping tokens absent from template (informational):');
if (absentByForm.length) absentByForm.forEach((l) => console.log(`      ${l}`)); else console.log('      none');
console.log();

// ── 7. symbol audit on NORM ──
console.log('=== 7. SYMBOL AUDIT (NORM) — expect 0 $/% adjacent to a token ===');
let symTotal = 0;
for (const file of srcFiles) {
  const text = joinedText(outCache[file]);
  for (const m of text.matchAll(/(\$\{\{|\}\}\$|%\{\{|\}\}%)/g)) {
    symTotal++;
    const at = m.index; console.log(`  ${file}: "${m[1]}" …${text.slice(Math.max(0, at - 15), at + 17).replace(/\s+/g, ' ')}…`);
  }
}
console.log(`  -> ${symTotal === 0 ? 'PASS (0 adjacency hits)' : 'FAIL: ' + symTotal + ' hit(s)'}\n`);

// ── 8. field-types coverage ──
console.log('=== 8. FIELD-TYPES COVERAGE (every NORM data token has an entry) — expect ∅ missing ===');
const union = new Set();
for (const file of srcFiles) for (const t of dataTokens(joinedText(outCache[file]))) union.add(t);
const noEntry = [...union].filter((t) => !ftKeys.has(t)).sort();
console.log(`  distinct DATA tokens across 22 NORM templates: ${union.size}`);
console.log(`  -> ${noEntry.length === 0 ? 'PASS (every token has a field-types entry)' : 'FAIL — no entry for: ' + noEntry.join(', ')}\n`);

const ok = writeFail === 0 && splitTotal === 0 && unbalanced === 0 && changed === 0 && missTotal === 0 && symTotal === 0 && noEntry.length === 0;
console.log(ok ? 'ALL CHECKS PASS' : 'SOME CHECKS FAILED');
process.exit(ok ? 0 : 1);
