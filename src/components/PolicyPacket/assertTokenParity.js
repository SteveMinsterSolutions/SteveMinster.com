// ─── Startup token-parity assertion (Phase 5) ─────────────────────────────────
// Compares the {{tokens}} present in a dynamic .docx template against that form's
// packet-config `fieldMapping` entry, to catch drift early (README "Startup
// assertion": every template token must exist in fieldMapping and vice-versa).
//
// docxtemplater CONTROL tags are NOT data fields and must be excluded from the
// comparison, or a section tag would be falsely reported as "missing from
// fieldMapping" (e.g. SLC-3 USA NMA2868's {{#policyPremiumInfo}} … {{/…}}):
//   {{#x}}  section open      {{/x}}  section close      {{^x}}  inverted section
//
// Caller supplies the template text AFTER the run-normalization pass (so split
// tokens are already re-joined); this module does no extraction from .docx itself
// and has no normalization dependency at import.

const TOKEN_RE = /\{\{\s*([\s\S]*?)\s*\}\}/g;
const CONTROL_PREFIX = /^[#/^]/; // {{#…}} open · {{/…}} close · {{^…}} inverted

// Distinct DATA tokens in normalized template text (control tags excluded).
export function extractDataTokens(templateText) {
  const out = new Set();
  for (const m of String(templateText).matchAll(TOKEN_RE)) {
    const inner = m[1].trim();
    if (!inner || CONTROL_PREFIX.test(inner)) continue; // skip control tags
    out.add(inner);
  }
  return [...out];
}

// Parity for one form: its normalized template data tokens vs its fieldMapping.
// Returns { formNumber, ok, missingFromMapping, absentFromTemplate }.
export function checkFormTokenParity(formNumber, templateText, mappedTokens) {
  const tmpl = extractDataTokens(templateText);
  const map = new Set(mappedTokens || []);
  const missingFromMapping = tmpl.filter((t) => !map.has(t)); // in template, not mapped
  const absentFromTemplate = [...map].filter((t) => !tmpl.includes(t)); // mapped, not in template
  return {
    formNumber,
    ok: missingFromMapping.length === 0 && absentFromTemplate.length === 0,
    missingFromMapping,
    absentFromTemplate,
  };
}

// Assert across all dynamic forms. `templatesByForm` maps formNumber → normalized
// template text; `fieldMapping` is packet-config's fieldMapping object. Throws with
// a drift report if any form fails parity; returns the per-form results otherwise.
export function assertTokenParity(templatesByForm, fieldMapping) {
  const results = Object.keys(templatesByForm).map((form) =>
    checkFormTokenParity(form, templatesByForm[form], fieldMapping[form])
  );
  const failed = results.filter((r) => !r.ok);
  if (failed.length) {
    const detail = failed
      .map((r) =>
        `  ${r.formNumber}: ` +
        `missingFromMapping=[${r.missingFromMapping.join(', ')}] ` +
        `absentFromTemplate=[${r.absentFromTemplate.join(', ')}]`
      )
      .join('\n');
    throw new Error(`Token-parity drift in ${failed.length} form(s):\n${detail}`);
  }
  return results;
}

export default assertTokenParity;
