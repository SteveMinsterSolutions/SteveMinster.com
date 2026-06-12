import { useState } from 'react';
// extractPdfText is imported lazily inside run() — pdfjs-dist references DOM
// globals (DOMMatrix) and must not load during SSR of this island.

// ─── BF CSS tokens (inline style objects) — match the rest of the page ────────
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
  danger:          '#b91c1c',
  fontDisplay:     '"Public Sans", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  fontBody:        '"Public Sans", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
};

function FileSlot({ label, hint, file, onPick, disabled }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: bf.accentPrimary, fontFamily: bf.fontBody }}>
        {label}
      </p>
      <label
        className="block rounded-xl px-4 py-5 text-center cursor-pointer transition-all"
        style={{
          border: `1.5px dashed ${file ? bf.accentPrimary : bf.borderSubtle}`,
          backgroundColor: file ? '#F2F9FA' : bf.backgroundSoft,
          opacity: disabled ? 0.6 : 1,
          fontFamily: bf.fontBody,
        }}
      >
        <input
          type="file"
          accept="application/pdf"
          disabled={disabled}
          onChange={(e) => onPick(e.target.files?.[0] ?? null)}
          style={{ display: 'none' }}
        />
        {file ? (
          <span className="text-sm font-medium" style={{ color: bf.textStrong }}>📄 {file.name}</span>
        ) : (
          <span className="text-sm" style={{ color: bf.textMuted }}>Click to choose a PDF</span>
        )}
      </label>
      <p className="text-xs mt-1" style={{ color: bf.textMuted, fontFamily: bf.fontBody }}>{hint}</p>
    </div>
  );
}

export default function PrefillUpload({ onPrefilled, onSkip }) {
  const [binding, setBinding] = useState(null);
  const [current, setCurrent] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  async function run() {
    setErr(null);
    if (!binding && !current) { setErr('Add at least one PDF.'); return; }
    setBusy(true);
    try {
      const { extractPdfText } = await import('./lib/extractPdfText.ts');
      const [bindingText, currentText] = await Promise.all([
        binding ? extractPdfText(binding) : Promise.resolve(''),
        current ? extractPdfText(current) : Promise.resolve(''),
      ]);
      const res = await fetch('/api/prefill', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ bindingText, currentText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Prefill failed.');
      onPrefilled(data.answers || {}, data.prefilledIds || []);
    } catch (e) {
      setErr(e?.message || 'Something went wrong during prefill.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12"
      style={{ background: `linear-gradient(135deg, ${bf.backgroundSoft}, ${bf.backgroundAlt})` }}>
      <div className="w-full max-w-xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: `linear-gradient(135deg, ${bf.accentPrimary}, ${bf.accentDark})`, border: `1px solid ${bf.accentPrimary}66` }}>
              <span className="font-bold text-lg" style={{ fontFamily: bf.fontDisplay, color: bf.textInverse }}>B</span>
            </div>
            <span className="text-sm tracking-widest uppercase font-medium" style={{ fontFamily: bf.fontDisplay, color: bf.accentDark }}>Bluefields</span>
          </div>
          <h1 className="text-2xl font-bold mb-1" style={{ fontFamily: bf.fontDisplay, color: bf.textStrong }}>
            Prefill from PDFs
          </h1>
          <p className="text-sm" style={{ color: bf.textMuted, fontFamily: bf.fontBody }}>
            Upload the packet PDFs to pre-fill the questionnaire, or skip to fill it manually.
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl p-6 md:p-8"
          style={{ backgroundColor: '#ffffff', border: `1px solid ${bf.borderSubtle}`, boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <FileSlot
              label="Binding packet (authoritative)"
              hint="What the policy SHOULD say — preferred on conflict."
              file={binding}
              onPick={setBinding}
              disabled={busy}
            />
            <FileSlot
              label="Current packet (existing output)"
              hint="The existing, possibly incorrect packet."
              file={current}
              onPick={setCurrent}
              disabled={busy}
            />
          </div>

          {err && (
            <p className="mt-4 text-xs rounded-lg px-3 py-2" role="alert"
              style={{ color: bf.danger, backgroundColor: '#fef2f2', border: '1px solid #fecaca', fontFamily: bf.fontBody }}>
              {err}
            </p>
          )}

          <div className="flex flex-col sm:flex-row gap-3 mt-6">
            <button
              onClick={run}
              disabled={busy}
              className="flex-1 font-semibold py-2.5 px-4 rounded-full text-sm tracking-wide border-none cursor-pointer transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ fontFamily: bf.fontBody, backgroundColor: bf.accentPrimary, color: bf.textInverse }}
            >
              {busy ? 'Extracting & prefilling…' : 'Prefill from PDFs'}
            </button>
            <button
              onClick={onSkip}
              disabled={busy}
              className="font-semibold py-2.5 px-4 rounded-full text-sm tracking-wide cursor-pointer transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ fontFamily: bf.fontBody, backgroundColor: bf.backgroundSoft, color: bf.textBody, border: `1px solid ${bf.borderSubtle}` }}
            >
              Skip — fill manually
            </button>
          </div>

          <p className="text-center text-xs mt-5" style={{ color: bf.textMuted, fontFamily: bf.fontBody }}>
            Files are read in your browser; only extracted text is sent for prefill. Nothing is stored.
          </p>
        </div>
      </div>
    </div>
  );
}
