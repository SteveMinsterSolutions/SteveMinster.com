// ─── Excess tower fan-out — one submission → a LIST of bound policies ─────────
// The builder's unit is now a POLICY, not a packet. fanOutPolicies() turns one
// resolved submission into an ordered list: the CGL always, then 0–2 excess
// instances (A = Layer 1, B = Layer 2) derived from the excess election. Each
// descriptor carries the config + resolved-with-overlay + filename that
// buildOnePolicy() needs. assemble.ts loops them and zips when there is >1.
//
// Design + confirmed decisions: claude/SO-excess-fanout-design.md.
//   • Output = policy-list (separate named PDFs, zipped when >1).
//   • A is always $1M xs $1M; B attaches at $2M, per-occ = tower_top − $2M.
//   • Policy_Number (lead underlying on the dec) = the CGL BFSR6 number on BOTH
//     A and B — NEVER overridden. The instance's OWN number is Excess_Policy_Number.
//   • Excess_1_Policy_Number ("all other underlying") = A's BFEI6 on B; empty on A.
//   • Per-occ ≠ aggregate. Per-occ is fixed by tower geometry (below); the aggregate
//     figures are a SEPARATE input — until confirmed they are `null` and
//     buildExcessOverlay() HARD-FAILS rather than emit a wrong bound aggregate.

import PizZip from 'pizzip';
import { packetFilename } from './mergePacket.js';

const M = 1_000_000;

// Windows-reserved-char sanitizer, identical rule to packetFilename().
const sanitize = (s) => String(s).replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').replace(/[ .]+$/, '');

// ── Policy-number derivation (bound-doc critical) ─────────────────────────────
// CGL is "BFSR6…" (space optional — production emits BFSR6####### with no space).
// Swap ONLY the leading BFSR6 prefix; preserve everything after it byte-for-byte.
// Return null when the number doesn't start with BFSR6 (or has nothing after) so the
// caller hard-fails instead of shipping a defective policy number.
export function deriveExcessNumber(cglNumber, prefix) {
  if (cglNumber == null) return null;
  const m = String(cglNumber).trim().match(/^BFSR6(.+)$/i);
  return m ? `${prefix}${m[1]}` : null;
}

// ── Per-layer limits (confirmed Steve 2026-08-31; see design doc §CONFIRMED #3) ─
// A layer's OWN limit always has per-occ == aggregate. The UNDERLYING/attachment
// figures can differ (per-occ ≠ agg). Attachment points are INVARIANT of tower size
// (BFEI6 attaches on the CGL $1M/$2M; BFEX6 on CGL+BFEI6 $2M/$3M); only BFEX6's own
// limit varies by tower size. The CGL BFSR6 base must be $1M/$2M for Excess 2 to attach.
const ATTACH = {
  A: { perOcc: 1 * M, agg: 2 * M }, // the CGL ($1M/$2M) beneath BFEI6
  B: { perOcc: 2 * M, agg: 3 * M }, // CGL + BFEI6 ($2M/$3M) beneath BFEX6
};
const OWN_A = 1 * M;                 // BFEI6 own limit — always $1M (per-occ = agg)
const OWN_B = {                      // BFEX6 own limit by tower size (per-occ = agg)
  '2x1 ($2M xs $1M)': 1 * M,
  '3x1 ($3M xs $1M)': 2 * M,
  '4x1 ($4M xs $1M)': 2 * M,
};

// Resolve { own, attach } for a layer. Throws on an unrecognized tower size for B —
// Excess 2 cannot be built without a valid tower selection.
function excessLimits(layer, towerSize) {
  if (layer === 'A') return { own: OWN_A, attach: ATTACH.A };
  const own = OWN_B[towerSize];
  if (own == null) throw new Error(`Excess B: unrecognized Excess_Tower_Size "${towerSize}".`);
  return { own, attach: ATTACH.B };
}

// Build the per-instance resolved overlay (derived numbers + this layer's limits).
export function buildExcessOverlay(layer, resolved) {
  const cgl = resolved?.Policy_Number;
  const prefix = layer === 'A' ? 'BFEI6' : 'BFEX6';
  const num = deriveExcessNumber(cgl, prefix);
  if (!num) throw new Error(`Excess ${layer}: cannot derive policy number from CGL "${cgl}" (expected "BFSR6 …").`);

  const { own, attach } = excessLimits(layer, resolved?.Excess_Tower_Size);

  // PWR 00 04 Schedule of Lloyd's Security — syndicate split differs by layer
  // (Steve 2026-08-31). Row-1 syndicate 3456 / FEIN AA-1123456 are baked in the
  // template; only the percentages + row-2 (syndicate 2121) are tokens.
  //   BFEI6 (A): 100% to 3456, row 2 blank.
  //   BFEX6 (B): 50% to 3456 + 50% to 2121 (FEIN AA-1122121).
  const syndicate = layer === 'A'
    ? { '3456_Pct': '100%', '2121_Pct': '', '2121': '', 'AA-112121': '' }
    : { '3456_Pct': '50%', '2121_Pct': '50%', '2121': '2121', 'AA-112121': 'AA-1122121' };

  // Per-instance financial questionnaire fields (Excess_A_* / Excess_B_*) → the
  // shared SLC-3 + BFEX 00 01 token names, overriding the CGL's values for this build.
  const fp = layer === 'A' ? 'Excess_A_' : 'Excess_B_';
  const fin = (suffix) => resolved?.[fp + suffix] ?? '';

  return {
    // Policy numbers. Policy_Number now means THIS policy's own number (so the SLC-3
    // certificate is correct); the CGL moves to Lead_Underlying_Policy_Number, which
    // BFEX 00 01's "Lead Underlying Policy No." line uses after its template edit.
    Excess_Policy_Number: num,
    Policy_Number: num,
    Lead_Underlying_Policy_Number: cgl,
    Excess_1_Policy_Number: layer === 'B' ? deriveExcessNumber(cgl, 'BFEI6') : '',
    // The excess SLC-3 references the excess dec (BFEX 00 01), not the CGL's BGL dec.
    Dec_Page_Form_Number: 'BFEX 00 01 07 26',
    // Attachment (underlying total below this layer) — per-occ ≠ agg.
    Attach_Per_Occ: attach.perOcc,
    Attach_Agg: attach.agg,
    // This layer's OWN limit — per-occ == agg.
    Excess_Per_Occ: own,
    Excess_Agg: own,
    // Per-instance financials → SLC-3 (TTL_*, CA_*, Minimum_Earned) + BFEX 00 01 (Excess_Premium).
    TTL_Premium: fin('Premium'),
    Excess_Premium: fin('Premium'),
    TTL_Ins_Taxes_Fees: fin('Taxes_Fees'),
    Minimum_Earned: fin('Min_Earned'),
    CA_SL_Tax: fin('SL_Tax'),
    CA_Stamp: fin('Stamp'),
    TTL_Cost: fin('Total'),
    // PWR 00 04 syndicate split (per layer).
    ...syndicate,
  };
}

/**
 * Fan one submission into an ordered policy list.
 * @param {object} packetConfig  the CGL packet-config.json
 * @param {object|null} excessConfig  the excess form-set config, or null to emit CGL only
 * @param {object} resolved  the shared resolved answer set
 * @returns {Array<{ id:string, config:object, resolved:object, filename:string }>}
 */
// Business Auto overlay — BFBA6 policy. Number swaps CGL BFSR6→BFBA6; the BA
// financials map onto the shared SLC-3 tokens; syndicate + Dec-page reference come
// from the BA config/overlay. Minimum earned is the shared program value (rides in
// resolved). Cross-policy BFPI installments are filled later (post-fan-out).
export function buildBAOverlay(resolved) {
  const cgl = resolved?.Policy_Number;
  const num = deriveExcessNumber(cgl, 'BFBA6'); // deriveExcessNumber is a generic BFSR6→prefix swap
  if (!num) throw new Error(`Business Auto: cannot derive policy number from CGL "${cgl}" (expected "BFSR6 …").`);
  return {
    Policy_Number: num,
    BFBA_PolNum: num,
    Dec_Page_Form_Number: 'BRP 00 02 10 23', // the BA SLC-3 references the BA dec
    // BA financials → SLC-3 tokens (BRP keeps its own BA_Prem/BA_TF/BA_TTL).
    TTL_Premium: resolved?.BA_Prem ?? '',
    TTL_Ins_Taxes_Fees: resolved?.BA_TF ?? '',
    TTL_Cost: resolved?.BA_TTL ?? '',
    CA_SL_Tax: resolved?.BA_SL_Tax ?? '',
    CA_Stamp: resolved?.BA_Stamp ?? '',
  };
}

/**
 * Fan one submission into an ordered policy list: CGL + 0–2 excess + optional BA.
 * @param {object} packetConfig CGL config · @param {object|null} excessConfig
 * @param {object} resolved · @param {object|null} [baConfig]
 */
export function fanOutPolicies(packetConfig, excessConfig, resolved, baConfig) {
  const policies = [{ id: 'CGL', config: packetConfig, resolved, filename: packetFilename(resolved) }];

  // ── Excess tower (0–2 policies) ──
  const election = resolved?.Excess_Liability;
  if (excessConfig && election && election !== 'No') {
    const layers = [];
    if (election === 'Yes - Layer 1 Only' || election === 'Yes - Layers 1 and 2') layers.push('A');
    if (election === 'Yes - Layers 1 and 2') layers.push('B');
    for (const layer of layers) {
      const overlay = buildExcessOverlay(layer, resolved);
      const merged = { ...resolved, ...overlay };
      const filename = `${sanitize(`${resolved.Named_Insured} ${overlay.Excess_Policy_Number}`)}.pdf`;
      policies.push({ id: `EXCESS_${layer}`, config: excessConfig, resolved: merged, filename });
    }
  }

  // ── Business Auto (0–1 policy) ──
  if (baConfig && resolved?.Business_Auto === 'Yes') {
    const overlay = buildBAOverlay(resolved);
    const merged = { ...resolved, ...overlay };
    const filename = `${sanitize(`${resolved.Named_Insured} ${overlay.Policy_Number}`)}.pdf`;
    policies.push({ id: 'BA', config: baConfig, resolved: merged, filename });
  }

  return policies;
}

/**
 * Zip several built policy PDFs into one archive (multi-policy download).
 * @param {Array<{ filename:string, pdf:Uint8Array|Buffer }>} entries
 * @returns {Buffer} zip bytes
 */
export function zipPolicies(entries) {
  const zip = new PizZip();
  const used = new Set();
  for (const e of entries) {
    let name = e.filename;
    let i = 1;
    while (used.has(name)) { i += 1; name = e.filename.replace(/\.pdf$/i, ` (${i}).pdf`); }
    used.add(name);
    zip.file(name, e.pdf);
  }
  return zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });
}

// Name the multi-policy archive by the insured + CGL number.
export function policiesZipName(resolved) {
  return `${sanitize(`${resolved.Named_Insured} ${resolved.Policy_Number}`)} policies.zip`;
}

export default fanOutPolicies;
