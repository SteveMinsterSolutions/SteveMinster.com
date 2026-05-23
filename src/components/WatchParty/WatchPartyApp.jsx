import React, { useState, useEffect, useCallback, useMemo } from 'react';

/**
 * WatchPartyApp — SteveMinster.com / Minster Solutions
 *
 * A constraint-satisfaction voting widget for coordinating group movie outings.
 * Each voter submits acceptable formats, an acceptable time window, and acceptable
 * theaters. The component then ranks showings by how many voters they satisfy.
 *
 * Data flow:
 *   POST vote -> WRITE_WEBHOOK_URL (make.com -> Google Sheet "Add a Row")
 *   GET votes -> READ_WEBHOOK_URL  (make.com -> Search Rows -> Webhook Response)
 *
 * If webhook URLs are not configured, the component runs in DEMO MODE backed by
 * localStorage so the UI can be tested before standing up the make.com pipeline.
 */

// ---------- CONFIG: drop in real make.com URLs to leave demo mode ------------
const WRITE_WEBHOOK_URL = ''; // e.g. 'https://hook.us2.make.com/abc123...'
const READ_WEBHOOK_URL  = ''; // e.g. 'https://hook.us2.make.com/xyz789...'
const POLL_INTERVAL_MS  = 8000;

// ---------- EVENT CONFIG (edit per movie night) ------------------------------
const EVENT = {
  title: 'Star Wars: The Mandalorian & Grogu',
  subtitle: 'Saturday, May 23, 2026 — Mt. Juliet / Nashville area',
  posterTagline: 'Pick your formats, times, and theaters. The widget finds the overlap.',
};

const THEATERS = {
  providence: {
    name: 'Regal Providence',
    subtitle: 'Mt. Juliet — closer, less traffic',
    url: 'https://www.regmovies.com/theatres/regal-providence-1890',
  },
  oprymills: {
    name: 'Regal Opry Mills',
    subtitle: 'Better dining options — likely crowded in today\'s rain',
    url: 'https://www.regmovies.com/theatres/regal-opry-mills-0615',
  },
};

const FORMATS = {
  standard:   { label: 'Standard',         tier: 1 },
  real3d:     { label: 'RealD 3D',         tier: 2 },
  imax:       { label: 'IMAX',             tier: 3 },
  imax3d:     { label: 'IMAX 3D',          tier: 3 },
  screenx:    { label: 'ScreenX',          tier: 3 },
  screenx3d:  { label: 'ScreenX RealD 3D', tier: 3 },
  '4dx':      { label: '4DX',              tier: 4 },
  '4dx3d':    { label: '4DX RealD 3D',     tier: 4 },
};

// Times in 24-hour HH:MM. Add/remove as showtimes change.
const SHOWTIMES = [
  // Providence Mt. Juliet
  { id: 'p-std-09-00',  theater: 'providence', format: 'standard',  time: '09:00' },
  { id: 'p-std-10-00',  theater: 'providence', format: 'standard',  time: '10:00' },
  { id: 'p-std-11-00',  theater: 'providence', format: 'standard',  time: '11:00' },
  { id: 'p-r3d-11-30',  theater: 'providence', format: 'real3d',    time: '11:30' },
  { id: 'p-std-12-30',  theater: 'providence', format: 'standard',  time: '12:30' },
  { id: 'p-std-13-30',  theater: 'providence', format: 'standard',  time: '13:30' },
  { id: 'p-std-14-30',  theater: 'providence', format: 'standard',  time: '14:30' },
  { id: 'p-r3d-15-00',  theater: 'providence', format: 'real3d',    time: '15:00' },
  { id: 'p-std-16-00',  theater: 'providence', format: 'standard',  time: '16:00' },
  { id: 'p-std-17-00',  theater: 'providence', format: 'standard',  time: '17:00' },
  { id: 'p-std-18-00',  theater: 'providence', format: 'standard',  time: '18:00' },
  { id: 'p-r3d-18-30',  theater: 'providence', format: 'real3d',    time: '18:30' },
  { id: 'p-std-19-30',  theater: 'providence', format: 'standard',  time: '19:30' },
  { id: 'p-std-20-30',  theater: 'providence', format: 'standard',  time: '20:30' },
  { id: 'p-std-21-30',  theater: 'providence', format: 'standard',  time: '21:30' },
  { id: 'p-r3d-22-00',  theater: 'providence', format: 'real3d',    time: '22:00' },
  { id: 'p-std-22-30',  theater: 'providence', format: 'standard',  time: '22:30' },

  // Opry Mills
  { id: 'o-4dx-09-00',  theater: 'oprymills',  format: '4dx',       time: '09:00' },
  { id: 'o-imx-09-20',  theater: 'oprymills',  format: 'imax',      time: '09:20' },
  { id: 'o-sx3-09-45',  theater: 'oprymills',  format: 'screenx3d', time: '09:45' },
  { id: 'o-std-10-15',  theater: 'oprymills',  format: 'standard',  time: '10:15' },
  { id: 'o-r3d-10-35',  theater: 'oprymills',  format: 'real3d',    time: '10:35' },
  { id: 'o-std-10-55',  theater: 'oprymills',  format: 'standard',  time: '10:55' },
  { id: 'o-r3d-11-30',  theater: 'oprymills',  format: 'real3d',    time: '11:30' },
  { id: 'o-4dx-12-05',  theater: 'oprymills',  format: '4dx',       time: '12:05' },
  { id: 'o-imx-12-30',  theater: 'oprymills',  format: 'imax',      time: '12:30' },
  { id: 'o-sx -13-00',  theater: 'oprymills',  format: 'screenx',   time: '13:00' },
  { id: 'o-std-13-30',  theater: 'oprymills',  format: 'standard',  time: '13:30' },
  { id: 'o-r3d-13-50',  theater: 'oprymills',  format: 'real3d',    time: '13:50' },
  { id: 'o-std-14-10',  theater: 'oprymills',  format: 'standard',  time: '14:10' },
  { id: 'o-r3d-14-45',  theater: 'oprymills',  format: 'real3d',    time: '14:45' },
  { id: 'o-43d-15-15',  theater: 'oprymills',  format: '4dx3d',     time: '15:15' },
  { id: 'o-im3-15-45',  theater: 'oprymills',  format: 'imax3d',    time: '15:45' },
  { id: 'o-sx3-16-15',  theater: 'oprymills',  format: 'screenx3d', time: '16:15' },
  { id: 'o-std-16-45',  theater: 'oprymills',  format: 'standard',  time: '16:45' },
  { id: 'o-r3d-17-05',  theater: 'oprymills',  format: 'real3d',    time: '17:05' },
  { id: 'o-std-17-25',  theater: 'oprymills',  format: 'standard',  time: '17:25' },
  { id: 'o-r3d-18-00',  theater: 'oprymills',  format: 'real3d',    time: '18:00' },
  { id: 'o-43d-18-30',  theater: 'oprymills',  format: '4dx3d',     time: '18:30' },
  { id: 'o-imx-19-00',  theater: 'oprymills',  format: 'imax',      time: '19:00' },
  { id: 'o-sx -19-30',  theater: 'oprymills',  format: 'screenx',   time: '19:30' },
  { id: 'o-std-20-00',  theater: 'oprymills',  format: 'standard',  time: '20:00' },
  { id: 'o-r3d-20-20',  theater: 'oprymills',  format: 'real3d',    time: '20:20' },
  { id: 'o-std-20-40',  theater: 'oprymills',  format: 'standard',  time: '20:40' },
  { id: 'o-r3d-21-15',  theater: 'oprymills',  format: 'real3d',    time: '21:15' },
  { id: 'o-43d-21-45',  theater: 'oprymills',  format: '4dx3d',     time: '21:45' },
  { id: 'o-imx-22-15',  theater: 'oprymills',  format: 'imax',      time: '22:15' },
  { id: 'o-sx3-22-45',  theater: 'oprymills',  format: 'screenx3d', time: '22:45' },
  { id: 'o-std-23-10',  theater: 'oprymills',  format: 'standard',  time: '23:10' },
];

// ---------- HELPERS ----------------------------------------------------------
const toMin = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

const fmtTime = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  const period = h >= 12 ? 'pm' : 'am';
  const hh = h % 12 || 12;
  return `${hh}:${String(m).padStart(2, '0')}${period}`;
};

const DEMO_KEY = 'sm-watch-party-demo-v1';
const NAME_KEY = 'sm-watch-party-name';

// ---------- DATA LAYER -------------------------------------------------------
const isLive = () => Boolean(WRITE_WEBHOOK_URL && READ_WEBHOOK_URL);

// Keep only the most recent vote per name (case-insensitive).
// Makes the client resilient to duplicate rows in the Google Sheet —
// make.com can stay dumb (append-only) and we handle dedup here.
function dedupeByName(votes) {
  const byName = new Map();
  for (const v of votes) {
    const key = (v.name || '').trim().toLowerCase();
    if (!key) continue;
    const existing = byName.get(key);
    if (!existing || new Date(v.submittedAt) > new Date(existing.submittedAt)) {
      byName.set(key, v);
    }
  }
  return Array.from(byName.values());
}

async function fetchVotes() {
  if (!isLive()) {
    try {
      const raw = localStorage.getItem(DEMO_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return dedupeByName(parsed);
    } catch {
      return [];
    }
  }
  const res = await fetch(READ_WEBHOOK_URL, { method: 'GET' });
  if (!res.ok) throw new Error(`Read failed: ${res.status}`);
  const data = await res.json();
  return dedupeByName(Array.isArray(data) ? data : []);
}

async function submitVote(vote) {
  if (!isLive()) {
    const existing = await fetchVotes();
    const next = [...existing.filter((v) => v.name !== vote.name), vote];
    localStorage.setItem(DEMO_KEY, JSON.stringify(next));
    return;
  }
  const res = await fetch(WRITE_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(vote),
  });
  if (!res.ok) throw new Error(`Write failed: ${res.status}`);
}

async function removeVote(name) {
  if (!isLive()) {
    const existing = await fetchVotes();
    localStorage.setItem(DEMO_KEY, JSON.stringify(existing.filter((v) => v.name !== name)));
    return;
  }
  const res = await fetch(WRITE_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, _delete: true }),
  });
  if (!res.ok) throw new Error(`Delete failed: ${res.status}`);
}

// ---------- MATCHING ENGINE --------------------------------------------------
function rankShowings(votes) {
  const voterCount = votes.length;
  if (voterCount === 0) return [];

  return SHOWTIMES.map((show) => {
    const showMin = toMin(show.time);
    const matchedBy = [];
    const missedBy = [];

    for (const v of votes) {
      const formatOK  = v.formats.includes(show.format);
      const timeOK    = showMin >= toMin(v.earliest) && showMin <= toMin(v.latest);
      const theaterOK = v.theaters.includes(show.theater);
      if (formatOK && timeOK && theaterOK) matchedBy.push(v.name);
      else missedBy.push(v.name);
    }

    return {
      ...show,
      matchCount: matchedBy.length,
      matchRatio: matchedBy.length / voterCount,
      matchedBy,
      missedBy,
    };
  })
    .filter((s) => s.matchCount > 0)
    .sort((a, b) => b.matchCount - a.matchCount || toMin(a.time) - toMin(b.time));
}

// ---------- COMPONENT --------------------------------------------------------
export default function WatchPartyApp() {
  const [votes, setVotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // form state
  const [name, setName]         = useState('');
  const [formats, setFormats]   = useState(['standard', 'real3d', 'imax']);
  const [earliest, setEarliest] = useState('12:00');
  const [latest, setLatest]     = useState('22:00');
  const [theaters, setTheaters] = useState(['providence', 'oprymills']);
  const [wantsFood, setWantsFood] = useState(false);

  const loadVotes = useCallback(async () => {
    try {
      const data = await fetchVotes();
      setVotes(data);
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // initial load + prefill from sessionStorage + polling
  useEffect(() => {
    const cachedName = sessionStorage.getItem(NAME_KEY);
    if (cachedName) setName(cachedName);
    loadVotes();
    const id = setInterval(loadVotes, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [loadVotes]);

  // prefill form when current name already has a vote on file
  useEffect(() => {
    if (!name) return;
    const mine = votes.find((v) => v.name.toLowerCase() === name.toLowerCase());
    if (mine) {
      setFormats(mine.formats);
      setEarliest(mine.earliest);
      setLatest(mine.latest);
      setTheaters(mine.theaters);
      setWantsFood(Boolean(mine.wantsFood));
    }
  }, [name, votes]);

  const ranked = useMemo(() => rankShowings(votes), [votes]);
  const topMatchCount = ranked[0]?.matchCount || 0;

  const toggle = (arr, setter) => (key) => {
    setter(arr.includes(key) ? arr.filter((k) => k !== key) : [...arr, key]);
  };

  const handleSubmit = async () => {
    const cleanName = name.trim();
    if (!cleanName) { setError('Add your name first.'); return; }
    if (formats.length === 0)  { setError('Pick at least one format.'); return; }
    if (theaters.length === 0) { setError('Pick at least one theater.'); return; }
    if (toMin(earliest) >= toMin(latest)) { setError('Latest must be after earliest.'); return; }

    setSubmitting(true);
    setError(null);
    try {
      const vote = {
        name: cleanName,
        formats,
        earliest,
        latest,
        theaters,
        wantsFood,
        submittedAt: new Date().toISOString(),
      };
      await submitVote(vote);
      sessionStorage.setItem(NAME_KEY, cleanName);
      await loadVotes();
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = async (voterName) => {
    if (!confirm(`Remove ${voterName}'s vote?`)) return;
    try {
      await removeVote(voterName);
      await loadVotes();
    } catch (e) {
      setError(e.message);
    }
  };

  // -------- STYLES (SM brand inline; safe if Tailwind isn't loaded) ----------
  const C = {
    navy:     '#1B2A4A',
    electric: '#2D7DD2',
    lime:     '#97D700',
    nearBlk:  '#0F172A',
    slate:    '#475569',
    lightG:   '#E2E8F0',
    lightT:   '#F1F5F9',
    white:    '#FFFFFF',
  };

  const styles = {
    page: {
      fontFamily: '"Inter", Calibri, Arial, sans-serif',
      color: C.nearBlk,
      maxWidth: 760,
      margin: '0 auto',
      padding: '24px 16px 80px',
      background: C.white,
    },
    h1: {
      fontFamily: '"Space Grotesk", Arial, sans-serif',
      fontWeight: 700,
      fontSize: 'clamp(24px, 5vw, 34px)',
      color: C.navy,
      margin: '0 0 6px',
      letterSpacing: '-0.01em',
    },
    sub: { color: C.slate, fontSize: 14, margin: '0 0 4px' },
    tagline: { color: C.slate, fontSize: 13, margin: '0 0 22px', fontStyle: 'italic' },
    section: {
      background: C.white,
      border: `1px solid ${C.lightG}`,
      borderRadius: 12,
      padding: 18,
      marginBottom: 16,
    },
    sectionTitle: {
      fontFamily: '"Space Grotesk", Arial, sans-serif',
      fontWeight: 600,
      fontSize: 17,
      color: C.navy,
      margin: '0 0 14px',
    },
    label: {
      display: 'block',
      fontSize: 12,
      fontWeight: 600,
      color: C.slate,
      textTransform: 'uppercase',
      letterSpacing: '0.06em',
      margin: '0 0 8px',
    },
    input: {
      width: '100%',
      padding: '10px 12px',
      border: `1px solid ${C.lightG}`,
      borderRadius: 8,
      fontSize: 15,
      fontFamily: 'inherit',
      color: C.nearBlk,
      background: C.white,
      boxSizing: 'border-box',
    },
    chipRow: { display: 'flex', flexWrap: 'wrap', gap: 8 },
    chip: (active) => ({
      padding: '8px 14px',
      borderRadius: 999,
      border: `1.5px solid ${active ? C.navy : C.lightG}`,
      background: active ? C.navy : C.white,
      color: active ? C.white : C.nearBlk,
      fontSize: 14,
      fontWeight: 500,
      cursor: 'pointer',
      fontFamily: 'inherit',
      transition: 'all 0.15s',
    }),
    theaterCard: (active) => ({
      width: '100%',
      textAlign: 'left',
      padding: '12px 14px',
      borderRadius: 10,
      border: `1.5px solid ${active ? C.navy : C.lightG}`,
      background: active ? C.lightT : C.white,
      cursor: 'pointer',
      marginBottom: 8,
      fontFamily: 'inherit',
    }),
    theaterName: { fontSize: 15, fontWeight: 600, color: C.navy, margin: 0 },
    theaterSub:  { fontSize: 12, color: C.slate, margin: '2px 0 0' },
    timeRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 },
    submitBtn: {
      width: '100%',
      padding: '14px 18px',
      background: C.navy,
      color: C.white,
      border: 'none',
      borderRadius: 10,
      fontSize: 16,
      fontWeight: 600,
      fontFamily: '"Space Grotesk", Arial, sans-serif',
      cursor: 'pointer',
      marginTop: 6,
      borderBottom: `3px solid ${C.lime}`,
    },
    showCard: (matchAll, matchSome) => ({
      padding: '12px 14px',
      borderRadius: 10,
      border: `1px solid ${matchAll ? C.lime : C.lightG}`,
      background: matchAll ? '#F4FBDB' : matchSome ? C.lightT : C.white,
      marginBottom: 8,
    }),
    showHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 },
    showTime: { fontFamily: '"Space Grotesk", Arial, sans-serif', fontSize: 16, fontWeight: 700, color: C.navy },
    showFormat: { fontSize: 12, fontWeight: 600, color: C.electric, letterSpacing: '0.04em' },
    showMeta: { fontSize: 12, color: C.slate, margin: '4px 0 0' },
    matchBadge: (matchAll) => ({
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: 999,
      background: matchAll ? C.lime : C.lightG,
      color: matchAll ? C.navy : C.slate,
      fontSize: 11,
      fontWeight: 700,
    }),
    voterRow: {
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '8px 0', borderBottom: `1px solid ${C.lightT}`,
    },
    voterName: { fontSize: 14, fontWeight: 500, color: C.nearBlk },
    voterMeta: { fontSize: 12, color: C.slate },
    removeBtn: {
      padding: '4px 10px', background: 'transparent', color: C.slate,
      border: `1px solid ${C.lightG}`, borderRadius: 6, fontSize: 12, cursor: 'pointer',
      fontFamily: 'inherit',
    },
    errorBox: {
      background: '#FEF2F2', border: '1px solid #FECACA', color: '#991B1B',
      padding: '10px 14px', borderRadius: 8, fontSize: 14, marginBottom: 12,
    },
    demoBadge: {
      display: 'inline-block', padding: '3px 8px', background: C.lime, color: C.navy,
      fontSize: 11, fontWeight: 700, borderRadius: 4, letterSpacing: '0.04em',
      marginBottom: 16, textTransform: 'uppercase',
    },
  };

  return (
    <div style={styles.page}>
      <h1 style={styles.h1}>{EVENT.title}</h1>
      <p style={styles.sub}>{EVENT.subtitle}</p>
      <p style={styles.tagline}>{EVENT.posterTagline}</p>

      {!isLive() && <div style={styles.demoBadge}>Demo Mode — votes stored locally</div>}
      {error && <div style={styles.errorBox}>{error}</div>}

      {/* ---------- VOTE FORM ---------- */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Cast your vote</h2>

        <div style={{ marginBottom: 16 }}>
          <label style={styles.label}>Your name</label>
          <input
            style={styles.input}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Steve"
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={styles.label}>Acceptable formats</label>
          <div style={styles.chipRow}>
            {Object.entries(FORMATS).map(([key, f]) => (
              <button
                key={key}
                type="button"
                style={styles.chip(formats.includes(key))}
                onClick={() => toggle(formats, setFormats)(key)}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={styles.label}>Acceptable time window</label>
          <div style={styles.timeRow}>
            <div>
              <div style={{ fontSize: 12, color: C.slate, marginBottom: 4 }}>Earliest</div>
              <input style={styles.input} type="time" value={earliest} onChange={(e) => setEarliest(e.target.value)} />
            </div>
            <div>
              <div style={{ fontSize: 12, color: C.slate, marginBottom: 4 }}>Latest</div>
              <input style={styles.input} type="time" value={latest} onChange={(e) => setLatest(e.target.value)} />
            </div>
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={styles.label}>Acceptable theaters</label>
          {Object.entries(THEATERS).map(([key, t]) => (
            <button
              key={key}
              type="button"
              style={styles.theaterCard(theaters.includes(key))}
              onClick={() => toggle(theaters, setTheaters)(key)}
            >
              <p style={styles.theaterName}>{t.name}</p>
              <p style={styles.theaterSub}>{t.subtitle}</p>
            </button>
          ))}
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={wantsFood}
            onChange={(e) => setWantsFood(e.target.checked)}
            style={{ width: 18, height: 18, accentColor: C.navy }}
          />
          <span style={{ fontSize: 14, color: C.nearBlk }}>I want to grab food before or after</span>
        </label>

        <button style={styles.submitBtn} onClick={handleSubmit} disabled={submitting}>
          {submitting ? 'Submitting…' : 'Cast Vote'}
        </button>
      </section>

      {/* ---------- RESULTS ---------- */}
      <section style={styles.section}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
          <h2 style={{ ...styles.sectionTitle, margin: 0 }}>
            Top showings
            {votes.length > 0 && (
              <span style={{ color: C.slate, fontWeight: 400, fontSize: 14, marginLeft: 8 }}>
                ({votes.length} {votes.length === 1 ? 'voter' : 'voters'})
              </span>
            )}
          </h2>
          <button onClick={loadVotes} style={styles.removeBtn}>Refresh</button>
        </div>

        {loading && <p style={{ color: C.slate, fontSize: 14 }}>Loading…</p>}

        {!loading && votes.length === 0 && (
          <p style={{ color: C.slate, fontSize: 14, margin: 0 }}>
            No votes yet. Cast yours above to seed the list.
          </p>
        )}

        {!loading && ranked.length === 0 && votes.length > 0 && (
          <p style={{ color: C.slate, fontSize: 14, margin: 0 }}>
            No showings match everyone's constraints. Loosen a filter to find overlap.
          </p>
        )}

        {ranked.slice(0, 8).map((show) => {
          const t = THEATERS[show.theater];
          const f = FORMATS[show.format];
          const matchAll = show.matchCount === votes.length;
          const matchSome = show.matchRatio >= 0.6;
          return (
            <div key={show.id} style={styles.showCard(matchAll, matchSome)}>
              <div style={styles.showHeader}>
                <div>
                  <span style={styles.showTime}>{fmtTime(show.time)}</span>
                  <span style={{ ...styles.showFormat, marginLeft: 10 }}>{f.label}</span>
                </div>
                <span style={styles.matchBadge(matchAll)}>
                  {show.matchCount}/{votes.length}
                </span>
              </div>
              <p style={styles.showMeta}>
                {t.name}
                {show.missedBy.length > 0 && (
                  <span style={{ color: '#B45309' }}> · misses: {show.missedBy.join(', ')}</span>
                )}
              </p>
            </div>
          );
        })}

        {ranked.length > 8 && (
          <p style={{ color: C.slate, fontSize: 12, margin: '8px 0 0', textAlign: 'center' }}>
            +{ranked.length - 8} more matching showings hidden
          </p>
        )}
      </section>

      {/* ---------- PARTICIPANTS ---------- */}
      {votes.length > 0 && (
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>Who's voted</h2>
          {votes.map((v) => (
            <div key={v.name} style={styles.voterRow}>
              <div>
                <div style={styles.voterName}>{v.name}</div>
                <div style={styles.voterMeta}>
                  {v.formats.length} format{v.formats.length !== 1 ? 's' : ''} · {fmtTime(v.earliest)}–{fmtTime(v.latest)} · {v.theaters.length} theater{v.theaters.length !== 1 ? 's' : ''}
                  {v.wantsFood ? ' · wants food' : ''}
                </div>
              </div>
              <button style={styles.removeBtn} onClick={() => handleRemove(v.name)}>Remove</button>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
