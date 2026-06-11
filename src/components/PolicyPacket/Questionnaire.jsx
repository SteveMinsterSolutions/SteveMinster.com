import { useMemo, useState } from 'react';
import packetConfig from '../../sandbox/policy-packet/packet-config.json';
import { evaluateRule } from './evaluateRule.js';

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
function QuestionField({ q, value, onChange, invalid, required }) {
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
  if (q.type === 'dropdown' && Array.isArray(q.options) && q.options.length > 0) {
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

// ─── Questionnaire ────────────────────────────────────────────────────────────
export default function Questionnaire() {
  const sections = useMemo(() => buildSections(packetConfig.questions ?? []), []);
  const [answers, setAnswers] = useState({});
  const [activeIdx, setActiveIdx] = useState(0);

  const setAnswer = (id, val) => setAnswers((prev) => ({ ...prev, [id]: val }));

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

  const visibleTotal = Object.keys(resolved).length;
  const active = sections[activeIdx];
  const visibleQuestions = active.questions.filter(isVisible);

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
            Policy Packet Questionnaire
          </h1>
          <p className="text-sm" style={{ color: bf.textMuted }}>
            {sections.length} sections · {visibleTotal} questions currently visible
          </p>
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
                  active={idx === activeIdx}
                  incomplete={stats[idx].incomplete}
                  visibleCount={stats[idx].visibleCount}
                  onClick={() => setActiveIdx(idx)}
                />
              ))}
            </div>
          </nav>

          {/* Active section */}
          <section className="flex-1 min-w-0">
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
                    onChange={setAnswer}
                    invalid={isInvalid(q)}
                    required={isRequired(q) && q.type !== 'derived'}
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
                  onClick={() => setActiveIdx((i) => Math.min(sections.length - 1, i + 1))}
                  disabled={activeIdx === sections.length - 1}
                  className="font-semibold py-2 px-4 rounded-full text-sm border-none cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ fontFamily: bf.fontBody, backgroundColor: bf.accentPrimary, color: bf.textInverse }}
                >
                  Next →
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Dev-only resolved-answer preview */}
      {import.meta.env.DEV && <DevPreview resolved={resolved} visibleCount={visibleTotal} />}
    </div>
  );
}
