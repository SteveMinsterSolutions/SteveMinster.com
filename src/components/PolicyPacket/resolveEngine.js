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
export function resolveManifest(formOrder, formRules, resolved) {
  const out = [];
  for (let i = 0; i < formOrder.length; i++) {
    const fo = formOrder[i];
    const fr = formRules[i];
    const rule = fr && fr.rule;
    const include = (rule && rule.alwaysApply === true) || evaluateRule(rule, resolved);
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
