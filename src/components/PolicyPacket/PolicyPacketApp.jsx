import { useState } from 'react';
import packetConfig from '../../sandbox/policy-packet/packet-config.json';

// ─── Constants ────────────────────────────────────────────────────────────────
const PASSCODE = 'OGPol!cyP@ck3t';
const AUTH_KEY = 'policy_packet_auth';

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
  fontDisplay:     '"Public Sans", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  fontBody:        '"Public Sans", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
};

// ─── Shared Input Styles ──────────────────────────────────────────────────────
const inputCls = 'w-full bg-white border border-[#BDCDD2] text-[#31484D] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#00869B] focus:ring-1 focus:ring-[#00869B] placeholder-[#516266]/50';
const labelCls = 'block text-xs font-semibold uppercase tracking-widest text-[#00869B] mb-1';

// ─── Sub-components ───────────────────────────────────────────────────────────
function FormField({ label, children }) {
  return (
    <div>
      <label className={labelCls} style={{ fontFamily: bf.fontBody }}>{label}</label>
      {children}
    </div>
  );
}

// ─── BF Warning Banner ────────────────────────────────────────────────────────
function BFWarningBanner() {
  return (
    <div
      className="bf-warning-banner"
      role="alert"
      aria-live="polite"
      style={{
        backgroundColor: '#0B0E0E',
        color: '#ffffff',
        fontFamily: '"Public Sans", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        fontSize: '0.875rem',
        letterSpacing: '0.04em',
        padding: '0.75rem 1.5rem',
        textAlign: 'center',
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      <span style={{ fontWeight: 800, textTransform: 'uppercase', marginRight: '0.5rem' }}>
        WARNING:
      </span>
      <span style={{ fontWeight: 500, textTransform: 'none', letterSpacing: '0.01em' }}>
        The items on this page are demonstration-only wireframes and are{' '}
        <strong>not</strong> connected to any Bluefields Specialty Insurance systems
        or data. This page operates entirely outside of any proprietary systems.
        No information used in these examples is stored in any database belonging
        to Bluefields Specialty Insurance or Minster Solutions.
      </span>
    </div>
  );
}

// ─── Auth Gate ────────────────────────────────────────────────────────────────
function AuthGate({ onSuccess }) {
  const [code, setCode]   = useState('');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    if (code === PASSCODE) {
      sessionStorage.setItem(AUTH_KEY, 'true');
      onSuccess();
    } else {
      setError('Access denied. Check your passcode and try again.');
      setCode('');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4"
      style={{ background: `linear-gradient(135deg, ${bf.backgroundSoft}, ${bf.backgroundAlt})` }}>
      <div className="relative z-10 w-full max-w-md">
        {/* Logo / Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: `linear-gradient(135deg, ${bf.accentPrimary}, ${bf.accentDark})`, border: `1px solid ${bf.accentPrimary}66` }}>
              <span className="font-bold text-lg" style={{ fontFamily: bf.fontDisplay, color: bf.textInverse }}>B</span>
            </div>
            <span className="text-sm tracking-widest uppercase font-medium" style={{ fontFamily: bf.fontDisplay, color: bf.accentDark }}>Bluefields</span>
          </div>
          <h1 className="text-2xl font-bold mb-1" style={{ fontFamily: bf.fontDisplay, color: bf.textStrong }}>
            Policy Packet
          </h1>
          <p className="text-sm" style={{ color: bf.textMuted }}>Authorized access only</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl p-8 backdrop-blur-sm"
          style={{ backgroundColor: '#ffffff', border: `1px solid ${bf.borderSubtle}`, boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
          <FormField label="Access Code">
            <input
              type="password"
              value={code}
              onChange={e => { setCode(e.target.value); setError(''); }}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              maxLength={64}
              autoFocus
              placeholder="Enter passcode"
              className={inputCls}
              style={{ fontFamily: bf.fontBody }}
            />
          </FormField>

          {error && (
            <p className="mt-3 text-xs rounded-lg px-3 py-2"
              style={{ color: '#b91c1c', backgroundColor: '#fef2f2', border: '1px solid #fecaca' }}>
              {error}
            </p>
          )}

          <button
            onClick={handleSubmit}
            className="mt-5 w-full font-semibold py-2.5 px-4 rounded-full transition-all text-sm tracking-wide border-none cursor-pointer"
            style={{
              fontFamily: bf.fontBody,
              backgroundColor: bf.accentPrimary,
              color: bf.textInverse,
            }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = bf.accentDark}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = bf.accentPrimary}
          >
            Access Policy Packet Tool
          </button>
        </div>

        <p className="text-center text-xs mt-6" style={{ fontFamily: bf.fontBody, color: bf.textMuted }}>
          This tool is for authorized Bluefields use only.
        </p>
      </div>
    </div>
  );
}

// ─── Placeholder Body (Phase 1 — proves the config loaded) ────────────────────
function PolicyPacketScaffold() {
  const questions    = packetConfig.questions    ?? [];
  const formOrder    = packetConfig.formOrder     ?? [];
  const calculations = packetConfig.calculations  ?? [];

  return (
    <div className="min-h-screen px-4 py-12"
      style={{ background: `linear-gradient(135deg, ${bf.backgroundSoft}, ${bf.backgroundAlt})` }}>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: `linear-gradient(135deg, ${bf.accentPrimary}, ${bf.accentDark})`, border: `1px solid ${bf.accentPrimary}66` }}>
              <span className="font-bold text-lg" style={{ fontFamily: bf.fontDisplay, color: bf.textInverse }}>B</span>
            </div>
            <span className="text-sm tracking-widest uppercase font-medium" style={{ fontFamily: bf.fontDisplay, color: bf.accentDark }}>Bluefields</span>
          </div>
          <h1 className="text-2xl font-bold mb-1" style={{ fontFamily: bf.fontDisplay, color: bf.textStrong }}>
            Policy Packet Generator
          </h1>
          <p className="text-sm" style={{ color: bf.textMuted }}>Phase 1 — scaffold</p>
        </div>

        {/* Config-loaded proof panel */}
        <div className="rounded-2xl p-8"
          style={{ backgroundColor: '#ffffff', border: `1px solid ${bf.borderSubtle}`, boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
          <p className="text-base" style={{ fontFamily: bf.fontBody, color: bf.textBody }}>
            Loaded <strong style={{ color: bf.accentPrimary }}>{questions.length}</strong> questions,{' '}
            <strong style={{ color: bf.accentPrimary }}>{formOrder.length}</strong> forms,{' '}
            <strong style={{ color: bf.accentPrimary }}>{calculations.length}</strong> calculations.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function PolicyPacketApp() {
  const [authed, setAuthed] = useState(
    typeof sessionStorage !== 'undefined' && sessionStorage.getItem(AUTH_KEY) === 'true'
  );

  if (!authed) {
    return (
      <div>
        <BFWarningBanner />
        <AuthGate onSuccess={() => setAuthed(true)} />
        <BFWarningBanner />
      </div>
    );
  }

  return (
    <div>
      <BFWarningBanner />
      <PolicyPacketScaffold />
      <BFWarningBanner />
    </div>
  );
}
