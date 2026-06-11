// ─── Shared rule evaluator ────────────────────────────────────────────────────
// Implements the "Rule evaluator contract" from policy-packet-integration.md.
// Used by the questionnaire `showIf` (Phase 2) AND `formRules` form inclusion
// (Phase 3) — same `{ all: [ {field, op, values}, ... ] }` shape.
//
//   all          every condition must pass (AND). No any/OR branches — OR is
//                expressed inside a single condition's `values` list.
//   op "eq"      membership test: passes when answers[field] is one of values.
//   op "neq"     passes when answers[field] is NOT one of values.
//   coercion     both sides are string-coerced before comparing. `values` are
//                always strings; number inputs return numbers — comparing as
//                strings is what makes them match.

function coerce(v) {
  return v == null ? '' : String(v);
}

/**
 * Evaluate a rule against the current answer map.
 * @param {{all: Array<{field: string, op: 'eq'|'neq', values: string[]}>}|null|undefined} rule
 * @param {Record<string, unknown>} answers
 * @returns {boolean} true when the rule passes (or when there is no rule).
 */
export function evaluateRule(rule, answers) {
  // No rule (null showIf / "Always Apply") → unconditional pass.
  if (!rule || !Array.isArray(rule.all)) return true;

  return rule.all.every((cond) => {
    const actual = coerce(answers?.[cond.field]);
    const set = (cond.values || []).map(coerce);
    switch (cond.op) {
      case 'eq':
        return set.includes(actual);
      case 'neq':
        return !set.includes(actual);
      default:
        return false; // unknown operator never passes
    }
  });
}

export default evaluateRule;
