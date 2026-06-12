# Policy Packet Generator — Integration README

**Persistent context for Claude Code.** Reference this file at the start of every session so context isn't re-explained. Keep it in the project root alongside `package.json`.

**Project:** Hidden, passcode-gated Bluefields sandbox tool on SteveMinster.com that assembles a *correct* policy packet by hand while the production admin system is being repaired.
**Route:** `/sandbox/policy-packet` (neutral name — keeps the client out of public commit messages)
**Status:** Phases 1–3 built, verified, and deployed live. Phase 4 (upload + prefill) is next. `packet-config.json` in the repo is the single source of truth.

> ## Where we are right now (cold-start orientation for a new chat)
> - **Live:** `/sandbox/policy-packet` — hidden (no `/sandbox` card), passcode-gated (`OGPol!cyP@ck3t`), Bluefields-themed, warning banners top+bottom.
> - **Done & deployed:** Phase 1 scaffold · Phase 2 config-driven questionnaire (216 Qs, conditional reveal, currency comboboxes) · Phase 3 resolve engine (calculations → rules → form manifest).
> - **Source of truth:** the **repo copy** of `packet-config.json` (in `src/sandbox/policy-packet/`) — it carries all amendments below and is ahead of the original chat attachment. `calculations.normalized.json` (23 typed entries) has replaced the prose calc array.
> - **Workflow:** planning chat (architecture, config edits, downstream-join checks) → narrow Claude Code prompts run in Windows PowerShell → verify locally → push → Vercel auto-deploys.
> - **Next up:** Phase 4 — upload the 2 PDFs, extract text, Claude API maps to answers, Verify screen, apply the `-00` policy-number rule. Then Phase 5 (form libraries + Gotenberg + assembly), which is blocked on Steve-supplied assets (see "Still needs Steve").
> - **To resume:** start the new chat *in this Project*, attach this README (and optionally the repo `packet-config.json`), and say "continue the policy-packet build at Phase 4."

---

## Stack (authoritative — overrides the Architecture doc)

- **Astro + React + Tailwind**, deployed via GitHub → Vercel (auto-deploy on push).
- The Architecture & Build Plan says "Next.js." That was a wrong assumption. **This project is Astro.** Mirror the existing `/sandbox/startup-customer-ledger` page structure for the route + gate.
- Phase-5 server work (fill → convert → assemble) uses an **Astro server endpoint** (`src/pages/api/*.ts` with `export const prerender = false`) on the Vercel adapter — *not* a Next.js Route Handler.

---

## Non-negotiable page rules

1. **Passcode gate.** sessionStorage gate, same pattern as `/sandbox/startup-customer-ledger`. Password: `OGPol!cyP@ck3t`. This is a demo-grade client gate, not real auth.
2. **No card on `/sandbox`.** The route is reachable by direct URL only. Do **not** add an entry to the `/sandbox` index card list.
3. **Bluefields warning banner**, top *and* bottom of the page, exact text from the `steveminster-bluefields-web` skill (do not paraphrase). The tool is stateless/no-persistence, so the "nothing is stored" wording is accurate.
4. **BF web theme** — `.bf-` namespaced tokens, Monument/Public Sans, teal monotone palette (per the BF web skill).

---

## Single source of truth: `packet-config.json`

The app reads **only** this JSON at runtime — it never parses Excel. Lives in the repo (e.g. `src/sandbox/policy-packet/packet-config.json`). Shape:

| Key | Count | Drives |
|---|---|---|
| `meta` | — | suffix rule, output filename, no-BFSD states + behavior, applied deltas |
| `questions` | 216 | questionnaire UI: `section`, `seq`, `id`, `label`, `type`, `required`, `options`, `showIf` |
| `calculations` | 103 | derived/calculated fields; run **before** rules and **override** uploaded values |
| `formOrder` | 136 | fixed assembly sequence; `library` ∈ {surplus 47, static 67, dynamic 22}; `isDynamic` true on 21 |
| `formRules` | 136 | inclusion logic (`{all:[{field,op,values}]}`); `Always Apply` = unconditional |
| `fieldMapping` | 21 | which `{{tokens}}` get written into each dynamic form |

**Startup assertion (Phase 5):** every template token must exist in `fieldMapping` and vice-versa. Catch drift early.

---

## Rule evaluator contract (shared by `showIf` AND `formRules`)

Both questionnaire `showIf` and `formRules` use the same shape: `{ "all": [ {field, op, values}, ... ] }`.

- `all` = every condition must pass (AND). There are **no `any`/OR branches** — OR is expressed inside a single condition's `values` list.
- `op: "eq"` → **membership test**: passes when `answers[field]` is *one of* `values`. (e.g. `Policy_Interest_Count eq ["2".."10"]` means "count ≥ 2".)
- `op: "neq"` → passes when `answers[field]` is *not* in `values`.
- **String-coerce both sides** before comparing. `values` are always strings (`"2"`, `"Yes"`, `"CA"`); number inputs return numbers — compare as strings or they silently never match.
- Build one `evaluateRule(rule, answers)` function in Phase 2 and reuse it for form inclusion in Phase 3.

## Question model (from the 216-question set)

- **Sections (9, render in this order):** 1 Account Information (17), 2 Coverage Limits (15), 3 Premium and Taxes (5), 4 Earned Premium Calculation (4), 5 Warranties (3), 6 Terrorism (2), 7 Coverage Forms (10), 8 Optional Forms (60), 9 Policy Interests (100). Within a section, order by `seq`.
- **Types:** `dropdown` (render `<select>` from `options`), `text`, `number`, `Currency` (money-formatted numeric — note capital C), `date`. `derived` (10) are **computed outputs, not inputs** — Phase 3 calculations populate them; do not render an input for them.
- **`required`:** `always` (always required) · `optional` (never) · `conditional` (required only when currently visible per `showIf`). 159 questions have a non-null `showIf`.
- Hidden questions (showIf fails) are excluded from the resolved answer set.

## Key data rules

- **Policy-number suffix:** the source system omits the suffix. Whenever a policy number is read from an upload, **append `-00`** before using it anywhere.
- **No-BFSD states** (`DC, IN, PR, USVI, WV`; CA intentional → uses SLC-3 COR): `meta.noBfsdBehavior = "silently_skip"`. *(The reconciliation report recommended a visible warning instead — Steve chose silent skip; flag if you want to revisit.)*
- **Output filename:** `{{Named_Insured}} {{Policy_Number}}.pdf`.
- **Stateless:** never write user data to disk or any store. Whole request is stateless.

---

## End-to-end flow (target)

```
1 UPLOAD    2 PDFs: current (incorrect) packet + binding packet
2 PREFILL   extract text → LLM maps to answers
3 VERIFY    user reviews/overrides every prefilled answer; fills the rest
4 RESOLVE   run calculations (override uploads) → evaluate formRules → resolved form set
5 FILL      active dynamic templates get {{tokens}} filled (docxtemplater)
6 CONVERT   filled .docx → PDF (Gotenberg/LibreOffice on Fly.io)
7 ASSEMBLE  dynamic PDFs + pre-rendered static/surplus PDFs merged in All Form Order (pdf-lib)
8 DOWNLOAD  single assembled PDF
```

---

## Build phases (in order)

1. **Scaffold** — hidden gated route, BF theme, warning banners, import config. ✅ **Done & deployed.**
2. **Questionnaire UI** from config — sections, sequence, types, dropdowns, conditional `showIf`, required logic, currency comboboxes, derived-field display. ✅ **Done & deployed.**
3. **Rules + assembly engine (logic only)** — calculations → `formRules` → resolved manifest in All Form Order. Pure client logic, no PDFs. ✅ **Done & deployed.**
4. **Upload + prefill** — PDF text extract → Claude API → Verify screen; apply `-00` rule. ⬅ **Next** (needs Claude API key in Vercel env).
5. **Fill + convert + assemble** — docxtemplater + Gotenberg + pdf-lib; Astro server endpoint. **Blocked on assets below.**
6. **Test** against the 3 example accounts end-to-end (form set, token values, order, filename).

---

## Still needs Steve (Phase 5 blockers only — nothing blocks 1–4)

- **Form libraries** committed to the repo (dynamic 22 + static 67 + surplus 47). Pre-render the ~114 static/surplus forms to PDF once at build time and commit the PDFs.
- **4 missing form files:** `IL 02 28`, `IL 01 25`, `PN049909`, `LMA5389` — referenced in `formOrder` but the source files don't exist yet. Needed for CO / IL / TRIA-elected packets.
- **Gotenberg on Fly.io** — `bf-gotenberg` app, Basic Auth secrets, then `GOTENBERG_URL` / `GOTENBERG_USER` / `GOTENBERG_PASS` in Vercel env.
- **Token normalization pass** — re-join runs inside `{{…}}` on each dynamic template at build time before docxtemplater (Word splits tokens across runs).

---

## Secrets hygiene

- Claude API key, Gotenberg creds → **Vercel environment variables only**, never committed. (We've been bitten by committed webhook URLs before — don't repeat it here.)
- Vercel data-training opt-in stays **off** (proprietary client logic).

---

## Resolve engine (Phase 3) — pure client logic, no PDFs

Calculations now carry a `compiled` object (raw `formula` kept for traceability), mirroring how `formRules` keep both `rule` and `ruleRaw`. 103/103 compiled; two kinds:

- `compiled.kind === "conditional"` → `{ when:{field,op,values}, to:"literal" }`. If the `when` condition passes, set `resolved[calc.target] = to`; otherwise leave it blank. Several rows may target the same id (e.g. `Policy_Interest_n_Interest`); they're mutually exclusive, so the matching row wins.
- `compiled.kind === "math"` → `{ expr, round, decimals, inputs }`. Substitute each `{{token}}` with the numeric value of `resolved[token]` (**strip `$` and `,`; blank/missing → 0**), evaluate the arithmetic, then if `round === "up"` apply `Math.ceil(x * 10**decimals) / 10**decimals`. Only 3 math calcs: `CA_SL_Tax`, `CA_Stamp`, `TTL_Cost`.

**Order:** run all `conditional` calcs first (order-independent), then `math` calcs in `seq` order so `TTL_Cost` sees `CA_SL_Tax`/`CA_Stamp`. Calc outputs **override** any answered/uploaded value of the same id.

**Form inclusion:** `formOrder` and `formRules` are positionally aligned 1:1 — **join by array index**, not by `seq` (duplicate `1.35`: PA/RI) or `formNumber` (historical collisions). For each `formOrder[i]`, include it iff `formRules[i].rule.alwaysApply === true` **or** `evaluateRule(formRules[i].rule, resolved)` is true. Emit included forms in `formOrder` array order → the **resolved manifest**. No-BFSD states need no special handling — no surplus rule matches them, so they drop out naturally.

**Evaluator:** implement `evaluateCondition(cond, answers)` for a bare `{field,op,values}` (the membership contract), and have `evaluateRule(rule, answers)` return `true` for `{alwaysApply:true}`, else AND `evaluateCondition` over `rule.all`. Calc `when` and questionnaire `showIf` both reuse `evaluateCondition`.

## Spec amendments (Phase 2 review)

Applied to `packet-config.json` after the first Phase 2 build:

1. `Location_1_Address_2` → `required: "optional"` (was `always`).
2. `Prem_Dam_Limit` options expanded to `["Excluded","$5,000","$10,000","$25,000","$50,000","$100,000","$250,000","$500,000","$1,000,000"]`. *(Note: `Med_Limit` shares the old 4-option array — edit by `id`, not by array match.)*
3. **Currency dropdowns** (e.g. all of Section 2): options are stored pre-formatted (`"$5,000"`) so they display and insert into documents as currency with no transform. UI renders them as a typeable combobox so number keys filter/select. Detect via `isCurrencyDropdown(q)` = `type==='dropdown'` and every option is `"Excluded"`, `"None"`, or matches `/^\$[\d,]+/`. The committed value stays the formatted string. This is distinct from the free-entry `Currency` type (capital C) used elsewhere.
4. `Policy_Interest_Count` ("How many named Policy Interest Names are there?") options now include `"None"` (added via Claude Code). Verified safe: all 71 references use `eq` (membership), so `"None"` matches no reveal/inclusion rule and correctly hides all Policy Interest rows and forms. *(Known ceiling, unrelated: this dropdown caps at `5` while the reveal/calc/lookup logic supports interests 1–10; add `"6"`–`"10"` if accounts can exceed 5 interests.)*
5. `Policy_Interest_Count` options extended to `["None","1"…"10"]`, resolving the ceiling noted in #4. Verified safe: all 10 interests already have full input fields (Name, Interest_Type, Address, City, ST, Zip, Interest) and reveal logic wired to 10 — this only switches on existing functionality.

## Phase 3 — Resolve engine (calculations → rules → manifest)

**Order of operations** on the resolved (visible-only) answer set:
1. Run **calculations** first; their outputs **override** any user/uploaded value for those targets.
2. Then evaluate **formRules** against the post-calculation answers to decide form inclusion.
3. Emit the **resolved form manifest**: every included form in `formOrder` sequence (the All Form Order).

**Normalized calculations** (replaces the prose `formula` array — see `calculations.normalized.json`, 23 entries, evaluate in array order). Three `kind`s:
- `arith` (3): evaluate `expr` with a tiny safe evaluator supporting `+ * ( )`, numeric literals, field identifiers (blank/missing → 0), and `roundup(value, digits)` = round **up** to N decimals (`Math.ceil(v*10^d)/10^d`). Do **not** use `eval`/`Function`. Strip `$` and commas when reading Currency/number fields. If `when` is present, evaluate it (shared rule evaluator); when false, set target to `default`. `CA_SL_Tax`/`CA_Stamp` are guarded to `L_1_ST=CA` (else `0`); `TTL_Cost` runs after them and sums them.
- `indexFromCount` (10): `target = (parseCount(answers[countField]) >= index) ? String(index) : ""`, where `parseCount("None")=0`, else `parseInt`. Drives the CG 25 04 designated-location indices.
- `lookup` (10): `target = cases[answers[sourceField]] ?? default`. Maps each `Policy_Interest_n_Interest_Type` dropdown choice to its `"See Form …"` value. The 9 case keys exactly match the dropdown options (verified).

**Form inclusion (`formRules`, 136):** include a form when `rule.alwaysApply === true` (25 forms), OR when `evaluateRule(rule, resolvedAnswers)` is true. Same evaluator as `showIf`: `all` = AND; `eq` = membership in `values`; `neq` = not in `values`; string-coerce. 11 rules have multiple AND conditions; ops are eq/neq only. No-BFSD states still resolve per `meta.noBfsdBehavior` (silent skip).

**Output (Phase 3):** a viewable manifest — included forms in order, with form number, name, library, and isDynamic — plus the computed calculation values. No PDFs yet.

## Phase 4 — kickoff notes (next chat starts here)

**Goal:** user uploads the 2 PDFs → app pre-populates questionnaire answers → user verifies/overrides everything → feed into the Phase 3 resolve engine (already built).

- **Inputs:** current (incorrect) policy packet + binding packet. **Test fixtures on hand:** Culture Cart, Indigo Alpine, and the current outputs Policy-ASGL20000054 / BFOG20000019 / BFOG20000020.
- **Approach (per Architecture §7):** extract the PDF text layer (pdfjs-dist) → send extracted text **plus the questionnaire schema** to the **Claude API** → get back structured JSON keyed to question `id`s → render every value into a **Verify screen** where the user can override anything. Imperfect extraction is acceptable *by design* — the human check is the safety net.
- **Server-side only:** call the Claude API from an **Astro server endpoint** (`prerender = false`), key in Vercel env — never expose the key client-side. Stateless; nothing persisted.
- **`-00` rule:** whenever a policy number is read from an upload, append `-00` before using it anywhere.
- **Hand-off into Phase 3:** verified answers run through the existing calculation + rules engine → resolved manifest. Phase 4 is purely "get good answers in"; the resolve path already works.
- **Open from reconciliation (still Steve's):** Phase 5 blockers only (form libraries, 4 missing files, Gotenberg) — none block Phase 4.

## Reconciliation status (already absorbed into the config)

Resolved in `packet-config.json` (`meta.appliedDeltas`): `BFG 00 09 → BFOG 00 09`, `SAM_aggregate` casing, `South Dakota` spelling, PWR number remap, BFOG 00 13 rule → `BFOG_00_02`. Verified: §8 off-by-one aligned (questions + rules both span `BFOG_00_01..07`), `Days_Notice` question added, DLA address questions added. Only the physical-asset items above remain.

## Phase 4 — build notes (in progress)

- **Endpoint:** `src/pages/api/prefill.ts` (Astro server route, `prerender = false`). Reads
  `ANTHROPIC_API_KEY` from Vercel env. Builds the extraction schema from the repo `packet-config.json`
  (`type !== 'derived'`, 206 fields), sends schema + both PDF texts to the Claude Messages API, returns
  `{ answers, prefilledIds }`. `temperature: 0`.
  - **Model:** use the alias **`claude-sonnet-4-6`** — the spec's pinned snapshot `claude-sonnet-4-6-20260218`
    returns a 404 (`not_found_error`) from the API (date suffixes aren't valid on this alias).
  - **No assistant prefill.** The original `{role:'assistant', content:'{'}` prefill returns a 400 on
    Sonnet 4.6 ("does not support assistant message prefill"). Instead we rely on the system prompt's
    "return ONLY a single JSON object" instruction and extract the object from the response (first `{` …
    last `}`, after stripping code fences). Both are forced by the 4.6/4.7/4.8 family — keep them on any
    model bump.
- **Extraction is client-side** (`pdfjs-dist`, worker via `pdf.worker.min.mjs?url`). Only extracted TEXT
  crosses the wire — keeps payload under the Vercel ~4.5 MB body limit and keeps the tool stateless.
  - Lives in `src/components/PolicyPacket/lib/extractPdfText.ts` (next to the page's other client libs).
  - **Lazy-import only:** pdfjs references `DOMMatrix` and crashes SSR if imported at module load, so
    `PrefillUpload.jsx` does `await import('./lib/extractPdfText.ts')` inside the click handler. Added
    `src/env.d.ts` (`astro/client`) for the `?url` import typing.
- **Binding packet is authoritative**; current packet treated as the possibly-incorrect existing output.
  Disagreements resolve to binding (instructed in the system prompt).
- **`-00` rule** applied server-side on `Policy_Number`, guarded by `/-\d{2}$/` (no double-suffix). If
  other policy-number-bearing ids exist, extend the guard list.
- **Verify = the existing questionnaire** (`Questionnaire.jsx`), hydrated with prefilled answers via a
  `step: 'upload' | 'verify'` gate; fields in `prefilledIds` get an "AI-prefilled" badge. A
  "Skip — fill manually" path keeps the tool usable with no PDFs. Resolve path (Phase 3) unchanged —
  calcs still override uploaded values, then `formRules` run.
- **Dropdown safety:** Claude must return an exact `options` member or omit; unknowns omitted (no guessing).
  The human Verify screen is the intended safety net for imperfect extraction.
- **Known accuracy lever (deferred, Phase 4.5):** text-layer extraction mangles tabular sections
  (§2 Coverage Limits, §3 Premium/Taxes). If needed, send those pages to Claude vision as a PDF document
  block instead of text. Not done now — Verify covers it.

### Steve TODO for Phase 4
- ~~Add `ANTHROPIC_API_KEY` to Vercel env (server-only, no `PUBLIC_` prefix). Keep data-training opt-in OFF.~~ **Done** (confirmed set in Vercel before the Prompt A deploy).
