// ─── Resolve engine (Phase 3) ─────────────────────────────────────────────────
// Pure client logic: run calculations → override answers → evaluate formRules →
// emit the resolved form manifest. Reuses the Phase 2 evaluateRule util for both
// calc `when` guards and form inclusion. No uploads, no PDFs.

import { evaluateRule } from './evaluateRule.js';

// Read a field as a number: strip $ and commas, blank/missing → 0, NaN → 0.
export function numericValue(v) {
  if (v == null) return 0;
  const cleaned = String(v).replace(/[$,]/g, '').trim();
  if (cleaned === '') return 0;
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

// parseCount("None") = 0, blank/missing = 0, else parseInt.
export function parseCount(v) {
  if (v == null) return 0;
  const s = String(v).trim();
  if (s === '' || s === 'None') return 0;
  const n = parseInt(s, 10);
  return Number.isNaN(n) ? 0 : n;
}

// Tidy a JS number back to a plain string (no float noise, no trailing zeros).
function numToString(n) {
  return String(Math.round(n * 1e6) / 1e6);
}

// Coerce a date answer to canonical YYYY-MM-DD so two dates compare as strings
// (ISO dates sort lexicographically). Accepts ISO or US MM/DD/YYYY; else ''.
function isoDateKey(v) {
  const s = String(v == null ? '' : v).trim();
  let m;
  if ((m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ].*)?$/.exec(s))) return `${m[1]}-${m[2]}-${m[3]}`;
  if ((m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s))) return `${m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`;
  return '';
}

// ─── Safe arithmetic evaluator (no eval / no Function) ────────────────────────
// Grammar: expr := term ('+' term)* ; term := factor ('*' factor)* ;
// factor := number | identifier | roundup(expr, expr) | '(' expr ')'.
// Identifiers resolve to numericValue(answers[id]); roundup(v,d) rounds UP to d
// decimals (Math.ceil(v * 10^d) / 10^d).
function tokenize(src) {
  const out = [];
  let i = 0;
  while (i < src.length) {
    const ch = src[i];
    if (ch === ' ' || ch === '\t' || ch === '\n') { i++; continue; }
    if (ch === '+' || ch === '*') { out.push({ t: 'op', v: ch }); i++; continue; }
    if (ch === '(') { out.push({ t: 'lp' }); i++; continue; }
    if (ch === ')') { out.push({ t: 'rp' }); i++; continue; }
    if (ch === ',') { out.push({ t: 'comma' }); i++; continue; }
    if (/[0-9.]/.test(ch)) {
      let j = i;
      while (j < src.length && /[0-9.]/.test(src[j])) j++;
      out.push({ t: 'num', v: parseFloat(src.slice(i, j)) });
      i = j; continue;
    }
    if (/[A-Za-z_]/.test(ch)) {
      let j = i;
      while (j < src.length && /[A-Za-z0-9_]/.test(src[j])) j++;
      out.push({ t: 'id', v: src.slice(i, j) });
      i = j; continue;
    }
    throw new Error(`arith: bad character '${ch}' in "${src}"`);
  }
  return out;
}

export function evalArith(expr, answers) {
  const toks = tokenize(expr);
  let pos = 0;
  const peek = () => toks[pos];
  const eat = () => toks[pos++];
  const expect = (t) => { const tok = eat(); if (!tok || tok.t !== t) throw new Error(`arith: expected ${t} in "${expr}"`); };

  function parseExpr() {
    let v = parseTerm();
    while (peek() && peek().t === 'op' && peek().v === '+') { eat(); v += parseTerm(); }
    return v;
  }
  function parseTerm() {
    let v = parseFactor();
    while (peek() && peek().t === 'op' && peek().v === '*') { eat(); v *= parseFactor(); }
    return v;
  }
  function parseFactor() {
    const tok = peek();
    if (!tok) throw new Error(`arith: unexpected end of "${expr}"`);
    if (tok.t === 'num') { eat(); return tok.v; }
    if (tok.t === 'lp') { eat(); const v = parseExpr(); expect('rp'); return v; }
    if (tok.t === 'id') {
      eat();
      if (peek() && peek().t === 'lp') {
        if (tok.v !== 'roundup') throw new Error(`arith: unknown function '${tok.v}'`);
        eat(); // (
        const value = parseExpr();
        expect('comma');
        const digits = parseExpr();
        expect('rp');
        const f = 10 ** digits;
        return Math.ceil(value * f) / f;
      }
      return numericValue(answers[tok.v]);
    }
    throw new Error(`arith: unexpected token in "${expr}"`);
  }

  const result = parseExpr();
  if (pos !== toks.length) throw new Error(`arith: trailing tokens in "${expr}"`);
  return result;
}

// ─── Calculation runner ───────────────────────────────────────────────────────
// Runs calculations in array order on a copy of `answers`. Each output OVERRIDES
// any existing value for its target and is visible to later calcs (so TTL_Cost
// sees CA_SL_Tax / CA_Stamp). Returns the post-calc answer map plus the isolated
// calc-value map for the panel.
export function runCalculations(calculations, answers) {
  const resolved = { ...answers };
  const calcValues = {};

  for (const calc of calculations || []) {
    let value;
    switch (calc.kind) {
      case 'arith': {
        if (calc.when && !evaluateRule(calc.when, resolved)) {
          value = calc.default ?? '';
        } else {
          value = numToString(evalArith(calc.expr, resolved));
        }
        break;
      }
      case 'indexFromCount': {
        value = parseCount(resolved[calc.countField]) >= calc.index ? String(calc.index) : '';
        break;
      }
      case 'lookup': {
        const hit = calc.cases[resolved[calc.sourceField]];
        value = hit ?? (calc.default ?? '');
        break;
      }
      case 'copy': {
        // Passthrough copy of another field's (string) value — for derived tokens
        // that mirror a captured answer (e.g. SIR_Prod = SIR_Per).
        value = resolved[calc.source] ?? '';
        break;
      }
      case 'split': {
        // Split a delimited field and take one part — e.g. BA_Liab
        // "$100,000/$300,000/$100,000" → BI_PP/BI_PA/PD_Limit by index. Blank source
        // (or a missing index) yields '' so nothing renders stray.
        const parts = String(resolved[calc.source] ?? '').split(calc.sep ?? '/');
        value = (parts[calc.index] ?? '').trim();
        break;
      }
      case 'template': {
        // Fill a `{field}` placeholder string from resolved values. A spec may carry a
        // formatter: `{field|currency}` renders a whole-dollar amount ("$50,000"). If
        // EVERY referenced field is empty, emit '' (so an unused slot stays blank).
        const specName = (f) => f.split('|')[0];
        const fmtCur = (v) => { const n = Number(String(v).replace(/[^0-9.\-]/g, '')); return Number.isFinite(n) ? '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 }) : ''; };
        const fields = [...String(calc.template).matchAll(/\{([^}]+)\}/g)].map((m) => specName(m[1]));
        const anyFilled = fields.some((f) => String(resolved[f] ?? '').trim() !== '');
        value = anyFilled
          ? String(calc.template).replace(/\{([^}]+)\}/g, (_, spec) => {
              const [name, fmt] = spec.split('|');
              const raw = String(resolved[name] ?? '').trim();
              return fmt === 'currency' ? fmtCur(raw) : raw;
            })
          : '';
        // Tidy: collapse runs of spaces and drop any space before a comma left by an
        // empty placeholder (e.g. a location with no address line 2).
        if (value) value = value.replace(/ +/g, ' ').replace(/ +,/g, ',').trim();
        break;
      }
      case 'dateBranch': {
        // Pick `before` or `onOrAfter` by comparing a date field to a threshold.
        // Real ISO-normalized compare; strict < so the threshold date itself takes
        // onOrAfter. Blank/unparseable date → default.
        const d = isoDateKey(resolved[calc.dateField]);
        const t = isoDateKey(calc.threshold);
        value = (d && t) ? (d < t ? calc.before : calc.onOrAfter) : (calc.default ?? '');
        break;
      }
      default:
        continue;
    }
    resolved[calc.target] = value; // override
    calcValues[calc.target] = value;
  }

  return { resolved, calcValues };
}

// ─── Form inclusion / manifest ────────────────────────────────────────────────
// formOrder[i] and formRules[i] are positionally 1:1 (verified: same length,
// formNumbers aligned & unique) — join by index. Include when the rule is
// alwaysApply, or evaluateRule passes against the post-calc answers. Emit in
// formOrder sequence = the All Form Order manifest.
// Normalize a form number: uppercase, collapse whitespace, trim. Edition-agnostic
// matching is handled by isFormListed (a bare library number matches a binder
// entry that carries a trailing edition), so we deliberately do NOT strip digits
// here — a form number like "BFOG 01 22" already ends in a two-group pattern.
export function formNumberKey(s) {
  return String(s == null ? '' : s).toUpperCase().replace(/\s+/g, ' ').trim();
}

// Parse the binder's forms-and-endorsements list (Binder_Forms) into an array of
// normalized entries. Accepts newline / comma / semicolon separators.
export function parseBinderForms(raw) {
  if (raw == null) return [];
  return String(raw).split(/[\n,;]+/).map(formNumberKey).filter(Boolean);
}

// A library form number is "on the binder" when a binder entry equals it, or
// starts with it followed by a space (same number plus an edition and/or
// description). The trailing space stops "BFOG 01 2" matching "BFOG 01 22".
export function isFormListed(formNumber, binderEntries) {
  const key = formNumberKey(formNumber);
  if (!key) return false;
  return binderEntries.some((e) => e === key || e.startsWith(key + ' '));
}

// QA gate: binder-listed entries that match NO library form (unmatched). These
// were requested on the binder but the library cannot produce them, so they must
// be surfaced. Same edition-agnostic matching as isFormListed.
export function unmatchedBinderForms(binderRaw, formOrder) {
  const entries = parseBinderForms(binderRaw);
  const libKeys = (formOrder || []).flatMap((f) => [f.formNumber, ...(f.aliases || [])].map(formNumberKey));
  return entries.filter((e) => !libKeys.some((k) => e === k || e.startsWith(k + ' ')));
}

export function resolveManifest(formOrder, formRules, resolved) {
  const out = [];
  const binderEntries = parseBinderForms(resolved && resolved.Binder_Forms);
  for (let i = 0; i < formOrder.length; i++) {
    const fo = formOrder[i];
    const fr = formRules[i];
    const rule = fr && fr.rule;
    // Detection-driven inclusion (render-from-list): a form whose rule is
    // { onBinderList: true } includes iff its own form number is on the binder's
    // schedule. Additive - any other rule shape keeps its prior behavior.
    let include;
    if (rule && rule.onBinderList === true) {
      // A form is included if its own number OR any of its declared aliases (older
      // editions the binder may request, e.g. PWR 00 07 -> PWR 01 07) is on the binder.
      include = isFormListed(fo.formNumber, binderEntries)
        || (fo.aliases || []).some((a) => isFormListed(a, binderEntries));
    } else {
      include = (rule && rule.alwaysApply === true) || evaluateRule(rule, resolved);
    }
    if (include) {
      out.push({
        seq: fo.seq,
        formNumber: fo.formNumber,
        name: fo.name,
        library: fo.library,
        isDynamic: !!fo.isDynamic,
      });
    }
  }
  return out;
}

// Convenience: calculations → manifest in one call.
export function resolvePacket(config, answers) {
  const { resolved, calcValues } = runCalculations(config.calculations, answers);
  const manifest = resolveManifest(config.formOrder, config.formRules, resolved);
  return { resolved, calcValues, manifest };
}

export default resolvePacket;
