import { useEffect, useMemo, useRef, useState } from 'react';
import packetConfig from '../../sandbox/policy-packet/packet-config.json';
import { evaluateRule } from './evaluateRule.js';
import { runCalculations, resolveManifest } from './resolveEngine.js';
import { addOneYear } from './lib/dateHelpers';
import PrefillUpload from './PrefillUpload.jsx';

// ─── BF CSS tokens (inline style objects) ─────────────────────────────────────
const bf = {
  backgroundSoft:  '#EDF3F5',
  backgroundAlt:   '#D6E3E8',
  borderSubtle:    '#BDCDD2',
  accentSoft:      '#8FC9D2',
  accentPrimary:   '#00869B',
  accentDark:      '#005367',
  textMuted:       '#516266',
  textBody:        '#31484D',
  textStrong:      '#172D32',
  textInverse:     '#FFFFFF',
  nearBlack:       '#0B0E0E',
  danger:          '#b91c1c',
  fontDisplay:     '"Public Sans", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  fontBody:        '"Public Sans", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
};

const inputCls = 'w-full bg-white border border-[#BDCDD2] text-[#31484D] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#00869B] focus:ring-1 focus:ring-[#00869B] placeholder-[#516266]/50';
const labelCls = 'block text-xs font-semibold uppercase tracking-widest text-[#00869B] mb-1';

// ─── Currency helpers ─────────────────────────────────────────────────────────
// State always holds a plain numeric string (e.g. "12000.5"); the input displays
// a money-formatted view (e.g. "$12,000.50"-in-progress).
function cleanMoney(s) {
  let c = String(s).replace(/[^0-9.]/g, '');
  const dot = c.indexOf('.');
  if (dot !== -1) c = c.slice(0, dot + 1) + c.slice(dot + 1).replace(/\./g, '');
  return c;
}
function formatMoney(raw) {
  if (raw == null || raw === '') return '';
  const [intPart, decPart] = String(raw).split('.');
  const intFmt = (intPart || '0').replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const dec = decPart !== undefined ? '.' + decPart.slice(0, 2) : '';
  return '$' + intFmt + dec;
}

const isEmpty = (v) => v == null || String(v).trim() === '';

// ─── Build Packet download helpers ────────────────────────────────────────────
// The /api/assemble success response is a binary PDF stream (NOT JSON). These
// reuse the in-repo conventions: createObjectURL + <a download> (RoadTripTracker)
// and the server's packetFilename naming (src/lib/policyPacket/mergePacket.js).
function sanitizeFilename(s) {
  // Mirror packetFilename: strip path/control chars, then trailing spaces/dots.
  return String(s).replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').replace(/[ .]+$/, '');
}
// Prefer Content-Disposition filename*=UTF-8'' , else quoted filename="", else
// reconstruct `${Named_Insured} ${Policy_Number}.pdf` the way the server does
// (note the SPACE between the two values).
function filenameFromResponse(res, resolved) {
  const cd = res.headers.get('content-disposition') || '';
  const star = cd.match(/filename\*=UTF-8''([^;]+)/i);
  if (star) {
    try { return decodeURIComponent(star[1].trim()); } catch { /* fall through */ }
  }
  const quoted = cd.match(/filename="([^"]+)"/i);
  if (quoted && quoted[1]) return quoted[1];
  return `${sanitizeFilename(`${resolved.Named_Insured} ${resolved.Policy_Number}`)}.pdf`;
}
// createObjectURL → a.download → click → remove → revoke (RoadTripTracker.jsx).
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
// Turn a non-OK /api/assemble JSON body into a readable message. The only key
// guaranteed across all error shapes is `error`; missing[]/failedGates/forms are
// surfaced when present (do NOT assume a fixed 500 shape).
function formatBuildError(data, status) {
  if (Array.isArray(data?.missing) && data.missing.length) {
    return `Missing required fields: ${data.missing.join(', ')}`;
  }
  let msg = data?.error || `Packet build failed (HTTP ${status}).`;
  if (Array.isArray(data?.failedGates) && data.failedGates.length) {
    msg += '\n' + data.failedGates.map((g) => `• ${g.gate}: ${g.detail}`).join('\n');
  }
  if (Array.isArray(data?.forms) && data.forms.length) {
    msg += '\n' + data.forms.map((f) => `• ${f.formNumber}${f.detail ? `: ${f.detail}` : ''}`).join('\n');
  }
  return msg;
}

// ─── Currency-dropdown combobox ───────────────────────────────────────────────
// A "currency dropdown" is a dropdown whose every option is "Excluded", "None",
// or a "$1,234"-style amount. These render as a typeable combobox (so number
// keys filter) instead of a native <select>. The committed value is always
// exactly one of q.options (the formatted string) — never free text — so
// nothing downstream changes.
const CURRENCY_SPECIAL = new Set(['Excluded', 'None']);
const digitsOnly = (s) => String(s).replace(/\D/g, '');

export function isCurrencyDropdown(q) {
  return (
    q.type === 'dropdown' &&
    Array.isArray(q.options) &&
    q.options.length > 0 &&
    q.options.every((o) => o === 'Excluded' || o === 'None' || /^\$[\d,]+/.test(o))
  );
}

function CurrencyCombobox({ q, value, onChange, invalid }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [hi, setHi] = useState(0);
  const boxRef = useRef(null);

  // Excluded/None always visible at the top; amounts filtered by digit-substring.
  const special = q.options.filter((o) => CURRENCY_SPECIAL.has(o));
  const money = q.options.filter((o) => !CURRENCY_SPECIAL.has(o));
  const typed = digitsOnly(query);
  const filteredMoney = typed === '' ? money : money.filter((o) => digitsOnly(o).includes(typed));
  const list = [...special, ...filteredMoney];

  // Keep the highlight within the current (possibly narrowed) list.
  useEffect(() => { setHi((h) => Math.min(h, Math.max(0, list.length - 1))); }, [list.length]);

  const commit = (opt) => {
    onChange(q.id, opt); // opt is guaranteed to be one of q.options
    setOpen(false);
    setQuery('');
  };

  const openList = () => {
    setOpen(true);
    setQuery('');
    const idx = q.options.indexOf(value);
    setHi(idx >= 0 ? Math.min(idx, q.options.length - 1) : 0);
  };

  const onKeyDown = (e) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter')) { e.preventDefault(); openList(); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); setHi((h) => Math.min(list.length - 1, h + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHi((h) => Math.max(0, h - 1)); }
    else if (e.key === 'Enter') { e.preventDefault(); if (list[hi] != null) commit(list[hi]); }
    else if (e.key === 'Escape') { setOpen(false); setQuery(''); }
  };

  return (
    <div
      ref={boxRef}
      className="relative"
      onBlur={(e) => { if (!boxRef.current?.contains(e.relatedTarget)) { setOpen(false); setQuery(''); } }}
    >
      <input
        type="text"
        role="combobox"
        aria-expanded={open}
        inputMode="numeric"
        placeholder="— Select —"
        value={open ? query : (value ?? '')}
        onFocus={openList}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); setHi(0); }}
        onKeyDown={onKeyDown}
        className={`${inputCls} cursor-text`}
        style={{ fontFamily: bf.fontBody, borderColor: invalid ? bf.danger : undefined }}
      />
      {open && list.length > 0 && (
        <ul
          role="listbox"
          className="absolute z-20 mt-1 w-full rounded-lg overflow-auto m-0 p-0 list-none"
          style={{ maxHeight: 220, backgroundColor: '#ffffff', border: `1px solid ${bf.borderSubtle}`, boxShadow: '0 6px 20px rgba(0,0,0,0.12)' }}
        >
          {list.map((opt, i) => (
            <li
              key={opt}
              role="option"
              aria-selected={i === hi}
              onMouseDown={(e) => { e.preventDefault(); commit(opt); }}
              onMouseEnter={() => setHi(i)}
              className="px-3 py-1.5 text-sm cursor-pointer"
              style={{
                fontFamily: bf.fontBody,
                backgroundColor: i === hi ? bf.backgroundSoft : '#ffffff',
                color: CURRENCY_SPECIAL.has(opt) ? bf.textMuted : bf.textBody,
                fontWeight: opt === value ? 700 : 400,
              }}
            >
              {opt}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── Build the section model from config (no hardcoded questions) ─────────────
function buildSections(questions) {
  const order = [];
  const map = new Map();
  for (const q of questions) {
    if (!map.has(q.section)) {
      map.set(q.section, { section: q.section, name: q.sectionName, questions: [] });
      order.push(q.section);
    }
    map.get(q.section).questions.push(q);
  }
  return order.map((s) => {
    const sec = map.get(s);
    sec.questions.sort((a, b) => a.seq - b.seq);
    return sec;
  });
}

// ─── Single field renderer ────────────────────────────────────────────────────
function QuestionField({ q, value, onChange, invalid, required, prefilled }) {
  // derived: reserve the id, render no input (computed in Phase 3).
  if (q.type === 'derived') {
    return (
      <div className="rounded-lg px-3 py-2 border border-dashed"
        style={{ borderColor: bf.borderSubtle, backgroundColor: '#f7fafb' }}>
        <label className={labelCls} style={{ fontFamily: bf.fontBody }}>{q.label}</label>
        <p className="text-xs italic" style={{ color: bf.textMuted }}>
          Derived — computed in Phase 3 (id: <code>{q.id}</code>)
        </p>
      </div>
    );
  }

  const common = {
    value: value ?? '',
    onChange: (e) => onChange(q.id, e.target.value),
    className: inputCls,
    style: { fontFamily: bf.fontBody, borderColor: invalid ? bf.danger : undefined },
  };

  let control;
  if (isCurrencyDropdown(q)) {
    control = <CurrencyCombobox q={q} value={value} onChange={onChange} invalid={invalid} />;
  } else if (q.type === 'dropdown' && Array.isArray(q.options) && q.options.length > 0) {
    control = (
      <select {...common} className={`${inputCls} cursor-pointer`}>
        <option value="">— Select —</option>
        {q.options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
      </select>
    );
  } else if (q.type === 'number') {
    control = <input {...common} type="number" inputMode="decimal" placeholder="0" />;
  } else if (q.type === 'Currency') {
    control = (
      <input
        type="text"
        inputMode="decimal"
        placeholder="$0.00"
        value={formatMoney(value)}
        onChange={(e) => onChange(q.id, cleanMoney(e.target.value))}
        className={inputCls}
        style={{ fontFamily: bf.fontBody, borderColor: invalid ? bf.danger : undefined }}
      />
    );
  } else if (q.type === 'date') {
    control = <input {...common} type="date" />;
  } else {
    // text, plus dropdown-with-no-options fallback (e.g. Season_Start_Mo)
    control = <input {...common} type="text" placeholder="" />;
  }

  return (
    <div>
      <label className={labelCls} style={{ fontFamily: bf.fontBody }}>
        {q.label}
        {required && <span style={{ color: bf.danger, marginLeft: 4 }}>*</span>}
        {prefilled && (
          <span className="ml-2 inline-flex items-center text-[9px] font-bold uppercase tracking-wider rounded-full px-1.5 py-0.5 align-middle"
            style={{ backgroundColor: `${bf.accentPrimary}20`, color: bf.accentDark, border: `1px solid ${bf.accentPrimary}55` }}>
            ✦ AI-prefilled
          </span>
        )}
      </label>
      {control}
      {invalid && (
        <p className="mt-1 text-xs" style={{ color: bf.danger, fontFamily: bf.fontBody }}>
          This field is required.
        </p>
      )}
    </div>
  );
}

// ─── Section nav item ─────────────────────────────────────────────────────────
function NavItem({ sec, active, incomplete, visibleCount, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-lg px-3 py-2 mb-1 transition-all border-none cursor-pointer flex items-center justify-between gap-2"
      style={{
        fontFamily: bf.fontBody,
        backgroundColor: active ? bf.accentPrimary : 'transparent',
        color: active ? bf.textInverse : bf.textBody,
      }}
    >
      <span className="text-sm">
        <span className="font-bold mr-1.5">{sec.section}</span>{sec.name}
      </span>
      <span className="flex items-center gap-1.5 flex-shrink-0">
        <span className="text-[10px] opacity-70">{visibleCount}</span>
        {incomplete > 0 && (
          <span className="text-[10px] font-bold rounded-full px-1.5 py-0.5"
            style={{ backgroundColor: active ? bf.textInverse : bf.danger, color: active ? bf.danger : bf.textInverse }}>
            {incomplete}
          </span>
        )}
      </span>
    </button>
  );
}

// ─── Dev preview panel (dev build only) ───────────────────────────────────────
function DevPreview({ resolved, visibleCount }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="fixed bottom-4 right-4 z-50" style={{ fontFamily: bf.fontBody }}>
      {open && (
        <div className="mb-2 rounded-xl shadow-xl overflow-hidden"
          style={{ width: 'min(420px, 90vw)', border: `1px solid ${bf.accentDark}` }}>
          <div className="px-3 py-2 text-xs font-semibold flex items-center justify-between"
            style={{ backgroundColor: bf.accentDark, color: bf.textInverse }}>
            <span>Resolved answers — {visibleCount} visible questions</span>
            <span className="opacity-70">dev only</span>
          </div>
          <pre className="text-[11px] leading-snug p-3 overflow-auto m-0"
            style={{ maxHeight: '50vh', backgroundColor: bf.nearBlack, color: '#cde7ec' }}>
            {JSON.stringify(resolved, null, 2)}
          </pre>
        </div>
      )}
      <button
        onClick={() => setOpen((o) => !o)}
        className="rounded-full px-4 py-2 text-xs font-semibold shadow-lg border-none cursor-pointer"
        style={{ backgroundColor: bf.accentDark, color: bf.textInverse }}
      >
        {open ? 'Hide' : 'Show'} answer JSON
      </button>
    </div>
  );
}

// ─── Library badge ────────────────────────────────────────────────────────────
const LIBRARY_COLORS = {
  surplus: { bg: '#FDECEC', fg: '#9B2C2C' },
  static:  { bg: '#EDF3F5', fg: '#005367' },
  dynamic: { bg: '#E5F4E8', fg: '#1F6E3A' },
};
function LibraryBadge({ library }) {
  const c = LIBRARY_COLORS[library] || { bg: bf.backgroundSoft, fg: bf.textMuted };
  return (
    <span className="text-[10px] font-bold uppercase tracking-wider rounded px-1.5 py-0.5"
      style={{ backgroundColor: c.bg, color: c.fg }}>{library}</span>
  );
}

// ─── Computed calculation values (collapsible) ────────────────────────────────
function CalcValuesPanel({ calcValues }) {
  const [open, setOpen] = useState(true);
  const money = (v) => (isEmpty(v) ? '—' : formatMoney(v));
  const row = (label, val) => (
    <div className="flex items-center justify-between py-1 text-sm" style={{ fontFamily: bf.fontBody }}>
      <span style={{ color: bf.textMuted }}>{label}</span>
      <span className="font-semibold" style={{ color: bf.textStrong }}>{val}</span>
    </div>
  );
  const dla = Object.keys(calcValues).filter((k) => /^DLA_\d+$/.test(k) && !isEmpty(calcValues[k]));
  const interests = Object.keys(calcValues).filter((k) => /^Policy_Interest_\d+_Interest$/.test(k) && !isEmpty(calcValues[k]));

  return (
    <div className="rounded-xl mb-6 overflow-hidden" style={{ border: `1px solid ${bf.borderSubtle}` }}>
      <button onClick={() => setOpen((o) => !o)}
        className="w-full text-left px-4 py-2.5 flex items-center justify-between border-none cursor-pointer"
        style={{ backgroundColor: bf.backgroundSoft, fontFamily: bf.fontBody }}>
        <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: bf.accentDark }}>
          Computed calculation values
        </span>
        <span style={{ color: bf.accentDark }}>{open ? '▾' : '▸'}</span>
      </button>
      {open && (
        <div className="px-4 py-3" style={{ backgroundColor: '#ffffff' }}>
          {row('CA Surplus Lines Tax (CA_SL_Tax)', money(calcValues.CA_SL_Tax))}
          {row('CA Stamping Fee (CA_Stamp)', money(calcValues.CA_Stamp))}
          {row('Total Cost (TTL_Cost)', money(calcValues.TTL_Cost))}
          <div className="text-[10px] font-bold uppercase tracking-wider mt-3 mb-1" style={{ color: bf.accentPrimary }}>
            Designated locations (CG 25 04)
          </div>
          {dla.length ? dla.map((k) => row(k, calcValues[k])) : <p className="text-xs italic" style={{ color: bf.textMuted }}>none active</p>}
          <div className="text-[10px] font-bold uppercase tracking-wider mt-3 mb-1" style={{ color: bf.accentPrimary }}>
            Policy interest derived values
          </div>
          {interests.length ? interests.map((k) => row(k, calcValues[k])) : <p className="text-xs italic" style={{ color: bf.textMuted }}>none set</p>}
        </div>
      )}
    </div>
  );
}

// ─── Resolved form manifest ───────────────────────────────────────────────────
function ManifestView({ manifest, total, calcValues }) {
  return (
    <div className="rounded-2xl p-6 md:p-8"
      style={{ backgroundColor: '#ffffff', border: `1px solid ${bf.borderSubtle}`, boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: bf.accentPrimary }}>
          Resolve output
        </p>
        <h2 className="text-xl font-bold" style={{ fontFamily: bf.fontDisplay, color: bf.textStrong }}>
          Resolved Form Manifest
        </h2>
        <p className="text-xs mt-1" style={{ color: bf.textMuted }}>
          {manifest.length} of {total} forms included · All Form Order sequence
        </p>
      </div>

      <CalcValuesPanel calcValues={calcValues} />

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse" style={{ fontFamily: bf.fontBody }}>
          <thead>
            <tr style={{ borderBottom: `2px solid ${bf.borderSubtle}` }}>
              {['Seq', 'Form #', 'Name', 'Library', 'Dynamic'].map((h) => (
                <th key={h} className="text-left py-2 px-2 text-[11px] font-semibold uppercase tracking-wider"
                  style={{ color: bf.accentDark }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {manifest.map((f, i) => (
              <tr key={`${f.formNumber}-${f.seq}-${i}`} style={{ borderBottom: `1px solid ${bf.backgroundAlt}` }}>
                <td className="py-1.5 px-2 tabular-nums" style={{ color: bf.textMuted }}>{f.seq}</td>
                <td className="py-1.5 px-2 font-semibold" style={{ color: bf.textStrong }}>{f.formNumber}</td>
                <td className="py-1.5 px-2" style={{ color: bf.textBody }}>{f.name}</td>
                <td className="py-1.5 px-2"><LibraryBadge library={f.library} /></td>
                <td className="py-1.5 px-2">{f.isDynamic
                  ? <span style={{ color: bf.accentPrimary, fontWeight: 700 }}>● dynamic</span>
                  : <span style={{ color: bf.textMuted }}>—</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {manifest.length === 0 && (
          <p className="text-sm italic py-6 text-center" style={{ color: bf.textMuted }}>
            No forms included yet — answer the questionnaire to resolve the manifest.
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Build Packet action bar (production — NOT dev-gated) ─────────────────────
function BuildPacketBar({ building, buildErr, buildDone, formCount, onBuild }) {
  return (
    <div className="rounded-2xl p-6 md:p-8 mt-6"
      style={{ backgroundColor: '#ffffff', border: `1px solid ${bf.borderSubtle}`, boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: bf.accentPrimary }}>
            Assemble
          </p>
          <h3 className="text-lg font-bold" style={{ fontFamily: bf.fontDisplay, color: bf.textStrong }}>
            Build Packet
          </h3>
          <p className="text-xs mt-1" style={{ color: bf.textMuted, fontFamily: bf.fontBody }}>
            Streams a single merged PDF of all {formCount} resolved form{formCount === 1 ? '' : 's'}.
            Filling, converting, and merging can take a number of seconds.
          </p>
        </div>
        <button
          onClick={onBuild}
          disabled={building}
          className="font-semibold py-2.5 px-6 rounded-full text-sm border-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
          style={{ fontFamily: bf.fontBody, backgroundColor: bf.accentPrimary, color: bf.textInverse }}
        >
          {building ? 'Building packet…' : 'Build Packet'}
        </button>
      </div>

      {building && (
        <p className="mt-4 text-xs" style={{ color: bf.accentDark, fontFamily: bf.fontBody }}>
          Building packet… filling dynamics, converting to PDF, and merging. Please don’t close this tab.
        </p>
      )}
      {buildErr && (
        <div className="mt-4 text-sm rounded-lg px-3 py-2"
          style={{ color: bf.danger, backgroundColor: '#fef2f2', border: '1px solid #fecaca', fontFamily: bf.fontBody, whiteSpace: 'pre-wrap' }}>
          {buildErr}
        </div>
      )}
      {buildDone && !buildErr && (
        <p className="mt-4 text-sm rounded-lg px-3 py-2"
          style={{ color: '#1F6E3A', backgroundColor: '#E5F4E8', border: '1px solid #bfe3c9', fontFamily: bf.fontBody }}>
          ✓ Packet downloaded.
        </p>
      )}
    </div>
  );
}

// ─── Questionnaire ────────────────────────────────────────────────────────────
export default function Questionnaire() {
  const sections = useMemo(() => buildSections(packetConfig.questions ?? []), []);
  const [answers, setAnswers] = useState({});
  const [activeIdx, setActiveIdx] = useState(0);
  const [view, setView] = useState('form'); // 'form' | 'manifest'
  const [step, setStep] = useState('upload'); // 'upload' | 'verify'
  const [prefilledIds, setPrefilledIds] = useState([]);
  // Once the user edits expiration by hand (or it arrives prefilled from the PDF),
  // stop auto-syncing it to effective + 1 year. Flipped true ONLY by real user
  // input via handleUserChange / a prefilled expiration — never by a programmatic set.
  const [expirationTouched, setExpirationTouched] = useState(false);

  const setAnswer = (id, val) => setAnswers((prev) => ({ ...prev, [id]: val }));

  // User-initiated field edits. Distinct from programmatic sets (the effective→
  // expiration auto-sync below) so the auto-sync never marks itself as touched.
  const handleUserChange = (id, val) => {
    if (id === 'Policy_Expiration_Date') setExpirationTouched(true);
    setAnswer(id, val);
  };

  // Overridable default: expiration = effective + 1 year. Keyed on the effective
  // value so it fires on BOTH paths that change it — a manual edit and the prefill
  // merge. Skips once expiration is user-owned, and leaves expiration untouched if
  // the effective value is blank/unparseable (addOneYear returns '').
  useEffect(() => {
    if (expirationTouched) return;
    const next = addOneYear(answers.Policy_Effective_Date ?? '');
    if (next === '') return;
    setAnswers((prev) =>
      prev.Policy_Expiration_Date === next ? prev : { ...prev, Policy_Expiration_Date: next }
    );
  }, [answers.Policy_Effective_Date, expirationTouched]);

  const isVisible = (q) => q.showIf == null || evaluateRule(q.showIf, answers);

  const isRequired = (q) => {
    if (q.required === 'always') return true;
    if (q.required === 'conditional') return isVisible(q);
    return false; // optional
  };

  // A visible, required, empty input field is invalid (soft — never hard-blocks).
  const isInvalid = (q) =>
    q.type !== 'derived' && isVisible(q) && isRequired(q) && isEmpty(answers[q.id]);

  // Per-section live stats (visible inputs + incomplete-required count).
  const stats = useMemo(() => sections.map((sec) => {
    let visibleCount = 0;
    let incomplete = 0;
    for (const q of sec.questions) {
      if (!isVisible(q) || q.type === 'derived') continue;
      visibleCount++;
      if (isRequired(q) && isEmpty(answers[q.id])) incomplete++;
    }
    return { visibleCount, incomplete };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [sections, answers]);

  // Resolved answer set: every currently-visible, non-derived question (default '').
  const resolved = useMemo(() => {
    const out = {};
    for (const sec of sections) {
      for (const q of sec.questions) {
        if (q.type === 'derived' || !isVisible(q)) continue;
        out[q.id] = answers[q.id] ?? '';
      }
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sections, answers]);

  // Phase 3 resolve engine: calculations override visible answers, then formRules
  // decide inclusion → resolved manifest. Recomputes whenever answers change.
  const engine = useMemo(() => {
    const { resolved: postCalc, calcValues } = runCalculations(packetConfig.calculations, resolved);
    const manifest = resolveManifest(packetConfig.formOrder, packetConfig.formRules, postCalc);
    return { calcValues, manifest };
  }, [resolved]);

  // ── Build Packet: POST the resolved memo (pre-calc; the endpoint re-derives
  //    calcs itself) to /api/assemble and download the streamed PDF. Mirrors the
  //    busy/err/finally convention from PrefillUpload.jsx.
  const [building, setBuilding] = useState(false);
  const [buildErr, setBuildErr] = useState(null);
  const [buildDone, setBuildDone] = useState(false);

  const buildPacket = async () => {
    setBuildErr(null);
    setBuildDone(false);
    setBuilding(true);
    try {
      const res = await fetch('/api/assemble', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ resolved }), // resolved memo — NEVER engine/manifest
      });
      // Success is a binary PDF stream — branch on res.ok BEFORE parsing.
      if (res.ok) {
        const blob = await res.blob();
        downloadBlob(blob, filenameFromResponse(res, resolved));
        setBuildDone(true);
      } else {
        let data = null;
        try { data = await res.json(); } catch { /* non-JSON error body */ }
        throw new Error(formatBuildError(data, res.status));
      }
    } catch (e) {
      setBuildErr(e?.message || 'Something went wrong building the packet.');
    } finally {
      setBuilding(false);
    }
  };

  const visibleTotal = Object.keys(resolved).length;
  const active = sections[activeIdx];
  const isLastPage = activeIdx === sections.length - 1;
  const visibleQuestions = active.questions.filter(isVisible);

  // Phase 4: upload + prefill step precedes the questionnaire (= the Verify screen).
  if (step === 'upload') {
    return (
      <PrefillUpload
        onPrefilled={(prefill, ids) => {
          setAnswers((prev) => ({ ...prev, ...prefill }));
          setPrefilledIds(ids);
          // A date the PDF gave us is authoritative — mark expiration touched so the
          // effective→expiration auto-sync never overwrites an extracted value.
          if (!isEmpty(prefill?.Policy_Expiration_Date)) setExpirationTouched(true);
          setStep('verify');
        }}
        onSkip={() => { setPrefilledIds([]); setStep('verify'); }}
      />
    );
  }

  return (
    <div className="min-h-screen px-4 py-8"
      style={{ background: `linear-gradient(135deg, ${bf.backgroundSoft}, ${bf.backgroundAlt})` }}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: `linear-gradient(135deg, ${bf.accentPrimary}, ${bf.accentDark})`, border: `1px solid ${bf.accentPrimary}66` }}>
              <span className="font-bold text-lg" style={{ fontFamily: bf.fontDisplay, color: bf.textInverse }}>B</span>
            </div>
            <span className="text-sm tracking-widest uppercase font-medium" style={{ fontFamily: bf.fontDisplay, color: bf.accentDark }}>Bluefields</span>
          </div>
          <h1 className="text-2xl font-bold mb-1" style={{ fontFamily: bf.fontDisplay, color: bf.textStrong }}>
            Verify — Policy Packet
          </h1>
          <p className="text-sm" style={{ color: bf.textMuted }}>
            {sections.length} sections · {visibleTotal} questions visible · {engine.manifest.length} forms resolved
          </p>
          {prefilledIds.length > 0 && (
            <p className="text-xs mt-1" style={{ color: bf.accentDark, fontFamily: bf.fontBody }}>
              ✦ {prefilledIds.length} field{prefilledIds.length === 1 ? '' : 's'} AI-prefilled — review the highlighted values.
            </p>
          )}
        </div>

        <div className="flex flex-col md:flex-row gap-6">
          {/* Section nav */}
          <nav className="md:w-72 flex-shrink-0">
            <div className="rounded-2xl p-3 md:sticky md:top-4"
              style={{ backgroundColor: '#ffffff', border: `1px solid ${bf.borderSubtle}`, boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
              {sections.map((sec, idx) => (
                <NavItem
                  key={sec.section}
                  sec={sec}
                  active={view === 'form' && idx === activeIdx}
                  incomplete={stats[idx].incomplete}
                  visibleCount={stats[idx].visibleCount}
                  onClick={() => { setView('form'); setActiveIdx(idx); }}
                />
              ))}
              <div className="my-2" style={{ borderTop: `1px solid ${bf.borderSubtle}` }} />
              <button
                onClick={() => setView('manifest')}
                className="w-full text-left rounded-lg px-3 py-2 transition-all border-none cursor-pointer flex items-center justify-between gap-2"
                style={{
                  fontFamily: bf.fontBody,
                  backgroundColor: view === 'manifest' ? bf.accentPrimary : 'transparent',
                  color: view === 'manifest' ? bf.textInverse : bf.textBody,
                }}
              >
                <span className="text-sm font-semibold">▦ Resolved Manifest</span>
                <span className="text-[10px] font-bold rounded-full px-1.5 py-0.5"
                  style={{ backgroundColor: view === 'manifest' ? bf.textInverse : bf.accentSoft, color: view === 'manifest' ? bf.accentPrimary : bf.accentDark }}>
                  {engine.manifest.length}
                </span>
              </button>
            </div>
          </nav>

          {/* Active section */}
          <section className="flex-1 min-w-0">
            {view === 'manifest' && (
              <div>
                <ManifestView manifest={engine.manifest} total={packetConfig.formOrder.length} calcValues={engine.calcValues} />
                <BuildPacketBar
                  building={building}
                  buildErr={buildErr}
                  buildDone={buildDone}
                  formCount={engine.manifest.length}
                  onBuild={buildPacket}
                />
              </div>
            )}
            {view === 'form' && (
            <div className="rounded-2xl p-6 md:p-8"
              style={{ backgroundColor: '#ffffff', border: `1px solid ${bf.borderSubtle}`, boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
              <div className="mb-6">
                <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: bf.accentPrimary }}>
                  Section {active.section} of {sections.length}
                </p>
                <h2 className="text-xl font-bold" style={{ fontFamily: bf.fontDisplay, color: bf.textStrong }}>
                  {active.name}
                </h2>
                <p className="text-xs mt-1" style={{ color: bf.textMuted }}>
                  {visibleQuestions.length} visible · {stats[activeIdx].incomplete} required incomplete
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {visibleQuestions.map((q) => (
                  <QuestionField
                    key={q.id}
                    q={q}
                    value={answers[q.id]}
                    onChange={handleUserChange}
                    invalid={isInvalid(q)}
                    required={isRequired(q) && q.type !== 'derived'}
                    prefilled={prefilledIds.includes(q.id)}
                  />
                ))}
              </div>

              {/* Prev / Next */}
              <div className="flex items-center justify-between mt-8 pt-5" style={{ borderTop: `1px solid ${bf.borderSubtle}` }}>
                <button
                  onClick={() => setActiveIdx((i) => Math.max(0, i - 1))}
                  disabled={activeIdx === 0}
                  className="font-semibold py-2 px-4 rounded-full text-sm border-none cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ fontFamily: bf.fontBody, backgroundColor: bf.backgroundSoft, color: bf.textBody }}
                >
                  ← Previous
                </button>
                <span className="text-xs" style={{ color: bf.textMuted }}>{active.name}</span>
                <button
                  onClick={() => isLastPage
                    ? setView('manifest')                              // last page → Resolved Manifest (same as left-menu item)
                    : setActiveIdx((i) => Math.min(sections.length - 1, i + 1))}
                  className="font-semibold py-2 px-4 rounded-full text-sm border-none cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ fontFamily: bf.fontBody, backgroundColor: bf.accentPrimary, color: bf.textInverse }}
                >
                  {isLastPage ? 'Review →' : 'Next →'}
                </button>
              </div>
            </div>
            )}
          </section>
        </div>
      </div>

      {/* Dev-only resolved-answer preview */}
      {import.meta.env.DEV && <DevPreview resolved={resolved} visibleCount={visibleTotal} />}
    </div>
  );
}
