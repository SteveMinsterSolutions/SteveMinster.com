// Warriors wrestling follow page (README §9). Read-only, no sign-in, unlisted.
// Polls the CDN-cached public API every 3 s while the tab is visible; stops when the dual is final.
// Shows first names only (the API never sends last names) and no rule text.
import { useCallback, useEffect, useRef, useState } from 'react';
import { PERIODS, PERIOD_LABEL, type Period } from '../../lib/wrestling/constants';
import type { PublicBout, PublicDual } from '../../lib/wrestling/snapshot';
import { TEAM, agoClock, leadLine, resultLine } from '../../lib/wrestling/format';

interface SeasonDual {
  id: string; dual_date: string; opponent: string; location: string | null;
  status: 'setup' | 'live' | 'final'; us: number; them: number; result: 'W' | 'L' | 'T' | null;
  tiebreak_criterion: string | null;
}
interface Season { duals: SeasonDual[]; record: { w: number; l: number; t: number }; live_dual_id: string | null }

const POLL_MS = 3000;
const longDate = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
};

function useNow(ms = 1000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), ms); return () => clearInterval(t); }, [ms]);
  return now;
}

export default function FollowApp() {
  const [dualId, setDualId] = useState<string | null>(() => new URLSearchParams(location.search).get('dual'));
  const [season, setSeason] = useState<Season | null>(null);
  const [snap, setSnap] = useState<PublicDual | null>(null);
  const [fetchedAt, setFetchedAt] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [autoLive, setAutoLive] = useState(false);
  const choseSeason = useRef(false);   // parent tapped Season: don't bounce them back to the live dual

  // Back/forward between the season list and a dual.
  useEffect(() => {
    const onPop = () => { setDualId(new URLSearchParams(location.search).get('dual')); setSnap(null); };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const open = (id: string | null) => {
    history.pushState(null, '', id ? `?dual=${id}` : location.pathname);
    if (!id) choseSeason.current = true;
    setSnap(null); setErr(null); setAutoLive(false); setDualId(id);
  };

  // Season list (also tells us whether a dual is live right now).
  useEffect(() => {
    if (dualId) return;
    let stop = false;
    const load = async () => {
      try {
        const r = await fetch('/api/wrestling/public/season');
        if (!r.ok) throw new Error();
        const s: Season = await r.json();
        if (stop) return;
        setSeason(s); setErr(null); setFetchedAt(Date.now());
        if (s.live_dual_id && !choseSeason.current) { setAutoLive(true); setDualId(s.live_dual_id); }
      } catch {
        if (!stop) setErr('Scores aren’t loading. Check your connection; this page retries on its own.');
      }
    };
    void load();
    const t = setInterval(() => { if (!document.hidden) void load(); }, 15000);
    return () => { stop = true; clearInterval(t); };
  }, [dualId]);

  // One dual: poll every 3 s while visible, stop when final.
  const finalRef = useRef(false);
  const loadDual = useCallback(async (id: string) => {
    try {
      const r = await fetch(`/api/wrestling/public/dual/${id}`);
      if (r.status === 404) { setErr('That dual wasn’t found. Check the link or see the season list.'); return; }
      if (!r.ok) throw new Error();
      const s: PublicDual = await r.json();
      setSnap(s); setErr(null); setFetchedAt(Date.now());
      finalRef.current = s.dual.status === 'final';
    } catch {
      setErr('Lost connection. Retrying…');
    }
  }, []);
  useEffect(() => {
    if (!dualId) return;
    finalRef.current = false;
    void loadDual(dualId);
    const t = setInterval(() => { if (!document.hidden && !finalRef.current) void loadDual(dualId); }, POLL_MS);
    const onVis = () => { if (!document.hidden && !finalRef.current) void loadDual(dualId); };
    document.addEventListener('visibilitychange', onVis);
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', onVis); };
  }, [dualId, loadDual]);

  // Followed the live dual automatically and it ended: move on when the next dual goes live
  // (tonight is two duals back to back).
  const snapFinal = snap?.dual.status === 'final';
  useEffect(() => {
    if (!autoLive || !snapFinal || !dualId) return;
    const t = setInterval(async () => {
      if (document.hidden) return;
      try {
        const r = await fetch('/api/wrestling/public/season');
        const s: Season = await r.json();
        if (s.live_dual_id && s.live_dual_id !== dualId) { setSnap(null); setDualId(s.live_dual_id); }
      } catch { /* keep showing the final */ }
    }, 15000);
    return () => clearInterval(t);
  }, [autoLive, snapFinal, dualId]);

  return (
    <div className="wf">
      {dualId
        ? snap
          ? <DualView snap={snap} fetchedAt={fetchedAt} err={err} onSeason={() => open(null)} />
          : <p className="wf-quiet wf-pad">{err ?? 'Loading the dual…'}</p>
        : <SeasonView season={season} err={err} onOpen={open} />}
      <footer className="wf-foot">#takeEVERYTHING</footer>
    </div>
  );
}

// ─── One dual ────────────────────────────────────────────────────────────────

function DualView({ snap, fetchedAt, err, onSeason }: {
  snap: PublicDual; fetchedAt: number | null; err: string | null; onSeason: () => void;
}) {
  const now = useNow();
  const { dual, score, bouts } = snap;
  const opp = dual.opponent;
  const varsity = bouts.filter((b) => b.level === 'V');
  const jv = bouts.filter((b) => b.level === 'JV');
  const live = bouts.find((b) => b.id === snap.live_bout_id) ?? null;
  const done = varsity.filter((b) => b.status === 'final' || b.status === 'skipped');
  const upNext = varsity.filter((b) => b.status === 'pending');
  const isFinal = dual.status === 'final';
  const tiebreak = dual.tiebreak_side && dual.tiebreak_criterion ? ` (tiebreak, criterion ${dual.tiebreak_criterion})` : '';

  return (
    <main>
      <header className="wf-head">
        <div className="wf-head-meta">
          <button className="wf-link" onClick={onSeason}>Season</button>
          <span>{longDate(dual.dual_date)}{dual.location ? `, ${dual.location}` : ''}</span>
        </div>
        <h1 className="wf-score" aria-label={`${TEAM} ${score.us}, ${opp} ${score.them}`}>
          <span className="wf-score-team is-us"><span className="wf-score-name">{TEAM}</span><b>{score.us}</b></span>
          <span className="wf-score-team is-them"><b>{score.them}</b><span className="wf-score-name">{opp}</span></span>
        </h1>
        <p className="wf-lead">
          {isFinal ? 'Final: ' : ''}{leadLine(score.us, score.them, opp)}{tiebreak}
        </p>
        <Ladder bouts={varsity} />
        <p className={`wf-updated${err ? ' is-stale' : ''}`} role="status" aria-live="off">
          {err ? err : isFinal ? 'Final score' : fetchedAt ? `Updated ${agoClock(now - fetchedAt)} ago` : ''}
        </p>
      </header>

      {live && <OnTheMat bout={live} opp={opp} />}
      {!live && !isFinal && upNext.length > 0 && done.length === 0 && (
        <p className="wf-quiet wf-pad">The dual hasn’t started. First up: {upNext[0].weight}.</p>
      )}

      {done.length > 0 && (
        <section className="wf-sec">
          <h2 className="wf-h2">Completed</h2>
          <ul className="wf-results">
            {[...done].reverse().map((b) => <ResultRow key={b.id} b={b} opp={opp} />)}
          </ul>
        </section>
      )}

      {upNext.length > 0 && (
        <section className="wf-sec">
          <h2 className="wf-h2">Up next</h2>
          <ul className="wf-next">
            {upNext.map((b) => (
              <li key={b.id}><b>{b.weight}</b><span>{b.our_name ?? `${TEAM}: open`}</span><span className="wf-quiet">vs {b.opp_name ?? opp}</span></li>
            ))}
          </ul>
        </section>
      )}

      {jv.length > 0 && (
        <section className="wf-sec">
          <h2 className="wf-h2">JV exhibition</h2>
          <p className="wf-quiet">Wrestled after varsity if time allows. These don’t count toward the dual score.</p>
          <ul className="wf-results">
            {jv.map((b) => b.status === 'final' || b.status === 'skipped'
              ? <ResultRow key={b.id} b={b} opp={opp} />
              : <li key={b.id} className="wf-result is-pending"><b>{b.weight}</b> {b.our_name ?? TEAM}{b.status === 'live' ? ', on the mat' : ''}</li>)}
          </ul>
        </section>
      )}
    </main>
  );
}

/** The weight ladder: one cell per varsity bout in wrestle order. */
function Ladder({ bouts }: { bouts: PublicBout[] }) {
  return (
    <ol className="wf-ladder" aria-label="Bouts in order">
      {bouts.map((b) => {
        const cls = b.status === 'live' ? 'is-live'
          : b.status === 'final' ? (b.winner === 'us' ? 'is-us' : b.winner === 'them' ? 'is-them' : 'is-none')
          : b.status === 'skipped' ? 'is-none' : 'is-pending';
        const label = b.status === 'live' ? 'on the mat' : b.status === 'final' ? (b.winner === 'us' ? 'Warriors won' : b.winner === 'them' ? 'opponent won' : 'no winner') : b.status === 'skipped' ? 'not wrestled' : 'to come';
        return <li key={b.id} className={cls} title={`${b.weight}: ${label}`}><span>{b.weight}</span><span className="wf-sr">{label}</span></li>;
      })}
    </ol>
  );
}

function ResultRow({ b, opp }: { b: PublicBout; opp: string }) {
  const tone = b.winner === 'us' ? 'is-won' : b.winner === 'them' ? 'is-lost' : '';
  return <li className={`wf-result ${tone}`}>{resultLine(b, opp)}</li>;
}

function OnTheMat({ bout, opp }: { bout: PublicBout; opp: string }) {
  const upto = PERIODS.indexOf(bout.period);
  const cols = PERIODS.filter((p, i) => i <= Math.max(2, upto) || bout.score.byPeriod.some((x) => x.period === p));
  const get = (p: Period) => bout.score.byPeriod.find((x) => x.period === p);
  const cell = (p: Period, side: 'us' | 'them') => get(p)?.[side] ?? (PERIODS.indexOf(p) <= upto ? 0 : '');
  return (
    <section className="wf-mat" aria-label="On the mat now">
      <div className="wf-mat-head">
        <span className="wf-mat-wt">{bout.weight}</span>
        <span className="wf-mat-tag">On the mat{bout.level === 'JV' ? ', exhibition' : ''}</span>
        <span className="wf-mat-period">{PERIOD_LABEL[bout.period]}{bout.period.startsWith('P') ? ' period' : ''}</span>
      </div>
      <div className="wf-mat-score">
        <div className="is-us"><span>{bout.our_name ?? TEAM}</span><b>{bout.score.us}</b></div>
        <div className="is-them"><span>{bout.opp_name ?? opp}</span><b>{bout.score.them}</b></div>
      </div>
      <table className="wf-grid" aria-label="Points by period">
        <thead><tr><th scope="col"><span className="wf-sr">Wrestler</span></th>{cols.map((p) => <th key={p} scope="col" className={p === bout.period ? 'is-now' : ''}>{PERIOD_LABEL[p]}</th>)}</tr></thead>
        <tbody>
          <tr className="is-us"><th scope="row">{bout.our_name ?? TEAM}</th>{cols.map((p) => <td key={p} className={p === bout.period ? 'is-now' : ''}>{cell(p, 'us')}</td>)}</tr>
          <tr className="is-them"><th scope="row">{bout.opp_name ?? opp}</th>{cols.map((p) => <td key={p} className={p === bout.period ? 'is-now' : ''}>{cell(p, 'them')}</td>)}</tr>
        </tbody>
      </table>
    </section>
  );
}

// ─── Season ──────────────────────────────────────────────────────────────────

function SeasonView({ season, err, onOpen }: { season: Season | null; err: string | null; onOpen: (id: string) => void }) {
  if (!season) return <p className="wf-quiet wf-pad">{err ?? 'Loading the season…'}</p>;
  const { w, l, t } = season.record;
  return (
    <main>
      <header className="wf-head">
        <h1 className="wf-season-title">{TEAM} wrestling</h1>
        <p className="wf-record"><b>{w}–{l}{t ? `–${t}` : ''}</b> in duals this season</p>
      </header>
      {err && <p className="wf-quiet wf-pad">{err}</p>}
      {season.duals.length === 0
        ? <p className="wf-quiet wf-pad">No duals yet. Scores show up here once the first one starts.</p>
        : (
          <ul className="wf-season">
            {season.duals.map((d) => (
              <li key={d.id}>
                <button className="wf-season-row" onClick={() => onOpen(d.id)}>
                  <span className="wf-season-date">{longDate(d.dual_date)}</span>
                  <span className="wf-season-opp">vs {d.opponent}</span>
                  <span className={`wf-season-res is-${(d.result ?? d.status).toLowerCase()}`}>
                    {d.status === 'final' ? `${d.result} ${d.us}–${d.them}` : d.status === 'live' ? `Live ${d.us}–${d.them}` : 'Upcoming'}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
    </main>
  );
}
