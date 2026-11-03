// Warriors wrestling scorer (README §8). One scorer, one phone, one hand.
// Every write is optimistic and goes through the localStorage outbox (lib/wrestling/outbox).
// Scoring math comes from lib/wrestling/scoring so the phone and the server agree.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  EVENT_POINTS, PERIODS, PERIOD_LABEL, RESULT_LABEL, TIEBREAK_CRITERIA, WEIGHTS, nextPeriod,
  type EventCode, type Period, type ResultType, type Side, type Weight,
} from '../../lib/wrestling/constants';
import {
  boutScore, crossesTechFall, dualScore, endOnPoints, lastActiveEvent, resultFor, type WrEvent,
} from '../../lib/wrestling/scoring';
import { Outbox, type OutboxState } from '../../lib/wrestling/outbox';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Dual {
  id: string; dual_date: string; opponent: string; location: string | null; start_weight: number;
  status: 'setup' | 'live' | 'final'; tiebreak_side: Side | null; tiebreak_criterion: string | null; is_test: boolean;
}
interface Bout {
  id: string; dual_id: string; level: 'V' | 'JV'; weight: number; bout_order: number;
  our_wrestler_id: string | null; opp_name: string | null;
  status: 'pending' | 'live' | 'final' | 'skipped'; current_period: Period;
  result_type: ResultType | null; winner: Side | null; result_time: string | null;
  team_pts_us: number; team_pts_them: number;
}
type Ev = WrEvent & { bout_id: string };
interface Adj { id: string; side: Side; points: number; reason: string }
interface DualState { dual: Dual; bouts: Bout[]; events: Ev[]; adjustments: Adj[] }
/** Roster kept on the phone with a last initial only; full last names stay in memory. */
interface Wrestler { id: string; first: string; initial: string; default_weight: number | null; level: 'V' | 'JV' }
interface DualListItem { id: string; dual_date: string; opponent: string; status: Dual['status']; is_test: boolean; start_weight: number }

const API = '/api/wrestling';
const LS_DUAL = (id: string) => `wr_dual_${id}`;
const LS_ROSTER = 'wr_roster_v1';
const LS_CURRENT = 'wr_current_dual';

const todayLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const shortDate = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
};

async function api<T>(method: string, path: string, body?: unknown): Promise<{ status: number; data: T }> {
  const res = await fetch(API + path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    credentials: 'same-origin',
    body: body ? JSON.stringify(body) : undefined,
  });
  let data: T;
  try { data = await res.json(); } catch { data = {} as T; }
  return { status: res.status, data };
}

// ─── App ─────────────────────────────────────────────────────────────────────

export default function ScorerApp() {
  const outbox = useMemo(() => new Outbox(), []);
  const [sync, setSync] = useState<OutboxState>(outbox.state);
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [roster, setRoster] = useState<Wrestler[]>(() => {
    try { return JSON.parse(localStorage.getItem(LS_ROSTER) ?? '[]'); } catch { return []; }
  });
  const [dualId, setDualId] = useState<string | null>(() => localStorage.getItem(LS_CURRENT));
  const [state, setState] = useState<DualState | null>(null);
  const [liveBoutId, setLiveBoutId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => outbox.subscribe(setSync), [outbox]);
  useEffect(() => { if (sync.needsAuth) setAuthed(false); }, [sync.needsAuth]);
  useEffect(() => {
    if (sync.lastError) { setToast(sync.lastError); outbox.clearError(); }
  }, [sync.lastError, outbox]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  // Session check (works offline: assume signed in if we have a cached dual).
  useEffect(() => {
    api<{ authed: boolean }>('GET', '/auth')
      .then((r) => setAuthed(!!r.data.authed))
      .catch(() => setAuthed(!!localStorage.getItem(LS_CURRENT)));
  }, []);

  const loadRoster = useCallback(async () => {
    try {
      const r = await api<{ wrestlers: { id: string; first_name: string; last_name: string; default_weight: number | null; level: 'V' | 'JV' }[] }>('GET', '/roster');
      if (r.status !== 200) return;
      const list = r.data.wrestlers.map((w) => ({
        id: w.id, first: w.first_name, initial: (w.last_name ?? '').trim().charAt(0).toUpperCase(),
        default_weight: w.default_weight, level: w.level,
      }));
      setRoster(list);
      localStorage.setItem(LS_ROSTER, JSON.stringify(list));
    } catch { /* offline: keep cached */ }
  }, []);
  useEffect(() => { if (authed) void loadRoster(); }, [authed, loadRoster]);

  // Local state persistence so a reload in a dead zone still shows the dual.
  const commit = useCallback((fn: (s: DualState) => DualState) => {
    setState((prev) => {
      if (!prev) return prev;
      const next = fn(prev);
      localStorage.setItem(LS_DUAL(next.dual.id), JSON.stringify(next));
      return next;
    });
  }, []);

  const refresh = useCallback(async (id: string, force = false) => {
    if (!force && outbox.state.pending > 0) return;   // never clobber unsynced taps
    try {
      const r = await api<DualState & { score: unknown }>('GET', `/duals/${id}`);
      if (r.status === 401) { setAuthed(false); return; }
      if (r.status !== 200) return;
      if (!force && outbox.state.pending > 0) return;
      const s: DualState = { dual: r.data.dual, bouts: r.data.bouts, events: r.data.events, adjustments: r.data.adjustments };
      setState(s);
      localStorage.setItem(LS_DUAL(id), JSON.stringify(s));
    } catch { /* offline */ }
  }, [outbox]);

  useEffect(() => {
    if (!dualId) { setState(null); return; }
    localStorage.setItem(LS_CURRENT, dualId);
    try {
      const cached = localStorage.getItem(LS_DUAL(dualId));
      setState(cached ? JSON.parse(cached) : null);
    } catch { setState(null); }
    if (authed) void refresh(dualId);
  }, [dualId, authed, refresh]);

  // Pull server state when idle (another scorer, or a fix made elsewhere).
  useEffect(() => {
    if (!dualId || !authed) return;
    const t = setInterval(() => { if (!document.hidden) void refresh(dualId); }, 15000);
    return () => clearInterval(t);
  }, [dualId, authed, refresh]);
  const prevPending = useRef(sync.pending);
  useEffect(() => {
    if (prevPending.current > 0 && sync.pending === 0 && dualId) void refresh(dualId);
    prevPending.current = sync.pending;
  }, [sync.pending, dualId, refresh]);

  // ── Write helpers (optimistic + outbox) ──
  const patchBout = useCallback((bout: Bout, patch: Record<string, unknown>, label: string) => {
    commit((s) => {
      let local: Partial<Bout> = { ...(patch as Partial<Bout>) };
      if (patch.result_type) {
        const r = resultFor(patch.result_type as ResultType, (patch.winner as Side) ?? null);
        local = { ...local, ...r, status: 'final', result_time: (patch.result_time as string) || null };
      } else if (patch.status && patch.status !== 'final') {
        local = { ...local, result_type: null, winner: null, result_time: null, team_pts_us: 0, team_pts_them: 0 };
      }
      const dual = patch.status === 'live' && s.dual.status === 'setup' ? { ...s.dual, status: 'live' as const } : s.dual;
      return { ...s, dual, bouts: s.bouts.map((b) => (b.id === bout.id ? { ...b, ...local } : b)) };
    });
    outbox.push({ method: 'PATCH', path: `${API}/bouts/${bout.id}`, body: patch, label });
  }, [commit, outbox]);

  const addEvent = useCallback((bout: Bout, side: Side, code: EventCode) => {
    const ev: Ev = {
      id: crypto.randomUUID(), bout_id: bout.id, period: bout.current_period, side, code,
      points: EVENT_POINTS[code], voided: false, created_at: new Date().toISOString(),
    };
    commit((s) => ({ ...s, events: [...s.events, ev] }));
    outbox.push({ method: 'POST', path: `${API}/events`, body: ev, label: code });
    return ev;
  }, [commit, outbox]);

  const voidEv = useCallback((ev: Ev) => {
    commit((s) => ({ ...s, events: s.events.map((e) => (e.id === ev.id ? { ...e, voided: true } : e)) }));
    outbox.push({ method: 'PATCH', path: `${API}/events`, body: { id: ev.id, voided: true }, label: 'Undo' });
  }, [commit, outbox]);

  const patchDual = useCallback((patch: Partial<Dual>, label: string) => {
    commit((s) => ({ ...s, dual: { ...s.dual, ...patch } }));
    outbox.push({ method: 'PATCH', path: `${API}/duals/${state?.dual.id}`, body: patch, label });
  }, [commit, outbox, state?.dual.id]);

  const addAdjustment = useCallback((side: Side, points: number, reason: string) => {
    if (!state) return;
    commit((s) => ({ ...s, adjustments: [...s.adjustments, { id: `local-${crypto.randomUUID()}`, side, points, reason }] }));
    outbox.push({ method: 'POST', path: `${API}/adjustments`, body: { dual_id: state.dual.id, side, points, reason }, label: 'Team deduction' });
  }, [commit, outbox, state]);

  const removeAdjustment = useCallback((a: Adj) => {
    if (a.id.startsWith('local-')) { setToast('Wait for sync, then remove it.'); return; }
    commit((s) => ({ ...s, adjustments: s.adjustments.filter((x) => x.id !== a.id) }));
    outbox.push({ method: 'DELETE', path: `${API}/adjustments`, body: { id: a.id }, label: 'Remove deduction' });
  }, [commit, outbox]);

  // ── Screens ──
  const header = <SyncPill sync={sync} />;

  if (authed === null) return <Shell header={header}><p className="wr-quiet">Loading…</p></Shell>;
  if (!authed) {
    return (
      <Shell header={header}>
        <PinScreen onOk={() => { setAuthed(true); outbox.resume(); if (dualId) void refresh(dualId); }} />
      </Shell>
    );
  }
  if (!dualId || !state) {
    return (
      <Shell header={header}>
        {dualId && !state ? <p className="wr-quiet">Loading dual…</p> : null}
        <DualPicker onOpen={(id) => { setDualId(id); setLiveBoutId(null); }} onAuthLost={() => setAuthed(false)} />
        <Toast text={toast} />
      </Shell>
    );
  }

  const liveBout = liveBoutId ? state.bouts.find((b) => b.id === liveBoutId) ?? null : null;
  if (liveBout) {
    return (
      <>
        <LiveBout
          key={liveBout.id}
          dual={state.dual}
          bout={liveBout}
          events={state.events.filter((e) => e.bout_id === liveBout.id)}
          roster={roster}
          sync={sync}
          onBack={() => setLiveBoutId(null)}
          addEvent={addEvent}
          voidEv={voidEv}
          patchBout={patchBout}
          onToast={setToast}
        />
        <Toast text={toast} />
      </>
    );
  }

  return (
    <Shell header={header}>
      <DualBoard
        state={state}
        roster={roster}
        onSwitchDual={() => { localStorage.removeItem(LS_CURRENT); setDualId(null); }}
        onOpenBout={(b) => setLiveBoutId(b.id)}
        patchBout={patchBout}
        patchDual={patchDual}
        addAdjustment={addAdjustment}
        removeAdjustment={removeAdjustment}
      />
      <Toast text={toast} />
    </Shell>
  );
}

// ─── Chrome ──────────────────────────────────────────────────────────────────

function Shell({ header, children }: { header: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="wr-shell">
      <div className="wr-topbar">
        <span className="wr-wordmark">Warriors scorer</span>
        {header}
      </div>
      {children}
    </div>
  );
}

function SyncPill({ sync }: { sync: OutboxState }) {
  const ok = sync.pending === 0;
  const text = ok ? 'Synced' : sync.needsAuth ? `${sync.pending} waiting: sign in` : sync.online ? `${sync.pending} pending` : `Offline, ${sync.pending} pending`;
  return <span className={`wr-sync ${ok ? 'is-ok' : 'is-pending'}`} role="status" aria-live="polite"><i aria-hidden="true" />{text}</span>;
}

function Toast({ text }: { text: string | null }) {
  return text ? <div className="wr-toast" role="alert">{text}</div> : null;
}

function Sheet({ title, onClose, children }: { title: string; onClose?: () => void; children: React.ReactNode }) {
  return (
    <div className="wr-sheet-backdrop" onClick={onClose}>
      <div className="wr-sheet" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <h2 className="wr-sheet-title">{title}</h2>
        {children}
        {onClose && <button className="wr-btn wr-btn-ghost wr-btn-block" onClick={onClose}>Cancel</button>}
      </div>
    </div>
  );
}

const nameOf = (roster: Wrestler[], id: string | null) => {
  if (!id) return null;
  const w = roster.find((r) => r.id === id);
  return w ? `${w.first}${w.initial ? ` ${w.initial}.` : ''}` : 'Wrestler';
};

// ─── PIN ─────────────────────────────────────────────────────────────────────

function PinScreen({ onOk }: { onOk: () => void }) {
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr(null);
    try {
      const r = await api<{ message?: string }>('POST', '/auth', { pin });
      if (r.status === 200) onOk();
      else setErr(r.data.message ?? 'Sign-in failed.');
    } catch {
      setErr('No connection. Check Wi-Fi and try again.');
    }
    setBusy(false); setPin('');
  };
  return (
    <form className="wr-pin" onSubmit={submit}>
      <h1 className="wr-h1">Scorer PIN</h1>
      <input
        className="wr-pin-input" type="password" inputMode="numeric" autoComplete="one-time-code"
        pattern="[0-9]*" maxLength={8} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
        aria-label="Scorer PIN" autoFocus
      />
      {err && <p className="wr-error" role="alert">{err}</p>}
      <button className="wr-btn wr-btn-gold wr-btn-block" disabled={busy || pin.length < 4}>{busy ? 'Checking…' : 'Sign in'}</button>
    </form>
  );
}

// ─── Dual picker / setup ─────────────────────────────────────────────────────

function DualPicker({ onOpen, onAuthLost }: { onOpen: (id: string) => void; onAuthLost: () => void }) {
  const [duals, setDuals] = useState<DualListItem[] | null>(null);
  const [opponent, setOpponent] = useState('');
  const [date, setDate] = useState(todayLocal());
  const [start, setStart] = useState<Weight>(75);
  const [isTest, setIsTest] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await api<{ duals: DualListItem[] }>('GET', '/duals');
      if (r.status === 401) return onAuthLost();
      setDuals(r.data.duals ?? []);
    } catch { setErr('No connection. Duals can’t load offline.'); }
  }, [onAuthLost]);
  useEffect(() => { void load(); }, [load]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr(null);
    try {
      const r = await api<{ dual?: { id: string }; message?: string; unplaced?: number }>('POST', '/duals', {
        opponent, dual_date: date, start_weight: start, is_test: isTest,
      });
      if (r.status === 201 && r.data.dual) onOpen(r.data.dual.id);
      else if (r.status === 401) onAuthLost();
      else setErr(r.data.message ?? 'Couldn’t create the dual.');
    } catch {
      setErr('No connection. Creating a dual needs Wi-Fi.');
    }
    setBusy(false);
  };

  const today = todayLocal();
  const todays = (duals ?? []).filter((d) => d.dual_date === today);
  const recent = (duals ?? []).filter((d) => d.dual_date !== today).slice(0, 8);
  const row = (d: DualListItem) => (
    <li key={d.id}>
      <button className="wr-dual-row" onClick={() => onOpen(d.id)}>
        <span className="wr-dual-row-opp">vs {d.opponent}</span>
        <span className="wr-dual-row-meta">
          {shortDate(d.dual_date)}, starts {d.start_weight}
          {d.is_test && <em className="wr-tag-test">Test</em>}
          <em className={`wr-tag wr-tag-${d.status}`}>{d.status === 'setup' ? 'Not started' : d.status === 'live' ? 'Live' : 'Final'}</em>
        </span>
      </button>
    </li>
  );

  return (
    <div className="wr-picker">
      <h1 className="wr-h1">Today’s duals</h1>
      {duals === null ? <p className="wr-quiet">Loading…</p>
        : todays.length ? <ul className="wr-dual-list">{todays.map(row)}</ul>
        : <p className="wr-quiet">No duals today yet. Set one up below.</p>}

      <form className="wr-form" onSubmit={create}>
        <h2 className="wr-h2">New dual</h2>
        <label className="wr-field">
          <span>Opponent</span>
          <input value={opponent} onChange={(e) => setOpponent(e.target.value)} maxLength={60} required autoCapitalize="words" />
        </label>
        <div className="wr-field-row">
          <label className="wr-field">
            <span>Date</span>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </label>
          <label className="wr-field">
            <span>First weight</span>
            <select value={start} onChange={(e) => setStart(Number(e.target.value) as Weight)}>
              {WEIGHTS.map((w) => <option key={w} value={w}>{w}</option>)}
            </select>
          </label>
        </div>
        <label className="wr-check">
          <input type="checkbox" checked={isTest} onChange={(e) => setIsTest(e.target.checked)} />
          <span>Test dual (hidden from the season list)</span>
        </label>
        {err && <p className="wr-error" role="alert">{err}</p>}
        <button className="wr-btn wr-btn-gold wr-btn-block" disabled={busy || !opponent.trim()}>{busy ? 'Setting up…' : 'Set up dual'}</button>
      </form>

      {recent.length > 0 && (
        <>
          <h2 className="wr-h2">Earlier</h2>
          <ul className="wr-dual-list">{recent.map(row)}</ul>
        </>
      )}
    </div>
  );
}

// ─── Dual board ──────────────────────────────────────────────────────────────

function DualBoard(props: {
  state: DualState; roster: Wrestler[];
  onSwitchDual: () => void; onOpenBout: (b: Bout) => void;
  patchBout: (b: Bout, p: Record<string, unknown>, label: string) => void;
  patchDual: (p: Partial<Dual>, label: string) => void;
  addAdjustment: (side: Side, points: number, reason: string) => void;
  removeAdjustment: (a: Adj) => void;
}) {
  const { state, roster, patchBout, patchDual } = props;
  const { dual, bouts, adjustments } = state;
  const [openRow, setOpenRow] = useState<string | null>(null);
  const [swapFor, setSwapFor] = useState<Bout | null>(null);
  const [deduct, setDeduct] = useState(false);
  const [confirm, setConfirm] = useState<{ text: string; go: () => void } | null>(null);

  const score = dualScore(bouts, adjustments, dual.tiebreak_side);
  const varsity = bouts.filter((b) => b.level === 'V').sort((a, b) => a.bout_order - b.bout_order);
  const jv = bouts.filter((b) => b.level === 'JV').sort((a, b) => a.bout_order - b.bout_order);
  const nextUp = varsity.find((b) => b.status === 'pending' || b.status === 'live')?.id;
  const margin = score.us - score.them;

  const row = (b: Bout) => {
    const our = nameOf(roster, b.our_wrestler_id);
    const open = openRow === b.id;
    const s = boutScore(state.events.filter((e) => e.bout_id === b.id));
    return (
      <li key={b.id} className={`wr-bout is-${b.status}${b.id === nextUp ? ' is-next' : ''}${open ? ' is-open' : ''}`}>
        <button className="wr-bout-head" onClick={() => setOpenRow(open ? null : b.id)} aria-expanded={open}>
          <span className="wr-bout-wt">{b.weight}</span>
          <span className="wr-bout-names">
            <span className={our ? '' : 'wr-empty'}>{our ?? 'No wrestler'}</span>
            <span className="wr-bout-vs">vs {b.opp_name || 'opponent'}</span>
          </span>
          <BoutStatus b={b} s={s} isNext={b.id === nextUp} />
        </button>
        {open && (
          <div className="wr-bout-body">
            <div className="wr-field-row">
              <button className="wr-btn wr-btn-ghost" onClick={() => setSwapFor(b)}>Change wrestler</button>
              <label className="wr-field wr-field-inline">
                <span>Opponent first name</span>
                <input
                  defaultValue={b.opp_name ?? ''} maxLength={24} autoCapitalize="words"
                  onBlur={(e) => {
                    const v = e.target.value.trim().split(/\s+/)[0] ?? '';
                    if (v !== (b.opp_name ?? '')) patchBout(b, { opp_name: v || null }, 'Opponent name');
                  }}
                />
              </label>
            </div>
            {b.status === 'live' && <button className="wr-btn wr-btn-gold wr-btn-block" onClick={() => props.onOpenBout(b)}>Back to the mat</button>}
            {b.status === 'pending' && (
              <>
                <button className="wr-btn wr-btn-gold wr-btn-block" onClick={() => { patchBout(b, { status: 'live' }, 'Start bout'); props.onOpenBout(b); }}>Start bout</button>
                <div className="wr-grid-2">
                  <button className="wr-btn wr-btn-us" onClick={() => patchBout(b, { result_type: 'FOR', winner: 'us' }, 'Forfeit')}>Forfeit to Warriors</button>
                  <button className="wr-btn wr-btn-them" onClick={() => patchBout(b, { result_type: 'FOR', winner: 'them' }, 'Forfeit')}>Forfeit to {dual.opponent}</button>
                  <button className="wr-btn wr-btn-ghost" onClick={() => patchBout(b, { result_type: 'DFF' }, 'Double forfeit')}>Double forfeit</button>
                  <button className="wr-btn wr-btn-ghost" onClick={() => patchBout(b, { status: 'skipped' }, 'Skip')}>Skip</button>
                </div>
              </>
            )}
            {(b.status === 'final' || b.status === 'skipped') && (
              <button className="wr-btn wr-btn-ghost wr-btn-block" onClick={() => setConfirm({
                text: `Reopen ${b.weight}? The result is cleared; points already scored stay.`,
                go: () => { patchBout(b, { status: 'live' }, 'Reopen bout'); props.onOpenBout(b); },
              })}>Reopen bout</button>
            )}
          </div>
        )}
      </li>
    );
  };

  return (
    <div className="wr-board">
      <div className="wr-dualscore">
        <button className="wr-link" onClick={props.onSwitchDual}>All duals</button>
        <div className="wr-dualscore-row">
          <div className="wr-team is-us"><span>Warriors</span><b>{score.us}</b></div>
          <div className="wr-team is-them"><span>{dual.opponent}</span><b>{score.them}</b></div>
        </div>
        <p className="wr-dualscore-note">
          {margin === 0 ? 'Tied' : margin > 0 ? `Warriors lead by ${margin}` : `${dual.opponent} leads by ${-margin}`}
          {dual.tiebreak_side && dual.tiebreak_criterion ? `, tiebreak criterion ${dual.tiebreak_criterion}` : ''}
          {dual.is_test && <em className="wr-tag-test">Test</em>}
        </p>
      </div>

      {score.needsTiebreak && <Tiebreak dual={dual} patchDual={patchDual} />}

      <ol className="wr-bouts">{varsity.map(row)}</ol>
      {jv.length > 0 && (
        <>
          <h2 className="wr-h2">Exhibition</h2>
          <p className="wr-quiet">JV bouts don’t count toward the dual score.</p>
          <ol className="wr-bouts">{jv.map(row)}</ol>
        </>
      )}

      <div className="wr-board-actions">
        <button className="wr-btn wr-btn-ghost" onClick={() => setDeduct(true)}>Team deduction</button>
        {score.varsityDone && dual.status !== 'final' && !score.needsTiebreak && (
          <button className="wr-btn wr-btn-gold" onClick={() => patchDual({ status: 'final' }, 'Dual final')}>Mark dual final</button>
        )}
        {dual.status === 'final' && <button className="wr-btn wr-btn-ghost" onClick={() => patchDual({ status: 'live' }, 'Reopen dual')}>Reopen dual</button>}
      </div>
      {adjustments.length > 0 && (
        <ul className="wr-adj-list">
          {adjustments.map((a) => (
            <li key={a.id}>
              <span>−{a.points} {a.side === 'us' ? 'Warriors' : dual.opponent}, {a.reason}</span>
              <button className="wr-link" onClick={() => setConfirm({ text: `Remove the ${a.reason} deduction?`, go: () => props.removeAdjustment(a) })}>Remove</button>
            </li>
          ))}
        </ul>
      )}

      {swapFor && (
        <Sheet title={`Wrestler at ${swapFor.weight}`} onClose={() => setSwapFor(null)}>
          <ul className="wr-pick-list">
            <li><button className="wr-pick" onClick={() => { patchBout(swapFor, { our_wrestler_id: null }, 'Wrestler'); setSwapFor(null); }}>No wrestler</button></li>
            {[...roster].sort((a, b) => Math.abs((a.default_weight ?? 999) - swapFor.weight) - Math.abs((b.default_weight ?? 999) - swapFor.weight))
              .map((w) => (
                <li key={w.id}>
                  <button className={`wr-pick${w.id === swapFor.our_wrestler_id ? ' is-current' : ''}`}
                    onClick={() => { patchBout(swapFor, { our_wrestler_id: w.id }, 'Wrestler'); setSwapFor(null); }}>
                    <span>{w.first} {w.initial}.</span><span className="wr-quiet">{w.default_weight ?? 'No weight'}{w.level === 'JV' ? ', JV' : ''}</span>
                  </button>
                </li>
              ))}
          </ul>
        </Sheet>
      )}
      {deduct && <DeductionSheet opponent={dual.opponent} onClose={() => setDeduct(false)} onSave={(s, p, r) => { props.addAdjustment(s, p, r); setDeduct(false); }} />}
      {confirm && (
        <Sheet title={confirm.text} onClose={() => setConfirm(null)}>
          <button className="wr-btn wr-btn-gold wr-btn-block" onClick={() => { confirm.go(); setConfirm(null); }}>Yes</button>
        </Sheet>
      )}
    </div>
  );
}

function BoutStatus({ b, s, isNext }: { b: Bout; s: { us: number; them: number }; isNext: boolean }) {
  if (b.status === 'live') return <span className="wr-bout-st is-live">{s.us}–{s.them} <small>{PERIOD_LABEL[b.current_period]}</small></span>;
  if (b.status === 'skipped') return <span className="wr-bout-st">Skipped</span>;
  if (b.status === 'final' && b.result_type) {
    const pts = b.team_pts_us || b.team_pts_them;
    const won = b.winner === 'us';
    return (
      <span className={`wr-bout-st ${b.winner ? (won ? 'is-won' : 'is-lost') : ''}`}>
        {b.result_type === 'DFF' ? 'Dbl forfeit' : `${won ? 'W' : 'L'} ${RESULT_LABEL[b.result_type]}`}
        {b.level === 'V' && pts > 0 && <small>{won ? '+' : '−'}{pts}</small>}
      </span>
    );
  }
  return <span className="wr-bout-st is-pending">{isNext ? 'Up next' : ''}</span>;
}

function Tiebreak({ dual, patchDual }: { dual: Dual; patchDual: (p: Partial<Dual>, l: string) => void }) {
  const [side, setSide] = useState<Side | null>(null);
  const [crit, setCrit] = useState('');
  return (
    <div className="wr-tiebreak">
      <h2 className="wr-h2">Dual tied: tiebreaker</h2>
      <div className="wr-grid-2">
        <button className={`wr-btn wr-btn-us${side === 'us' ? ' is-picked' : ''}`} onClick={() => setSide('us')}>Warriors win it</button>
        <button className={`wr-btn wr-btn-them${side === 'them' ? ' is-picked' : ''}`} onClick={() => setSide('them')}>{dual.opponent} win it</button>
      </div>
      <label className="wr-field">
        <span>Deciding criterion</span>
        <select value={crit} onChange={(e) => setCrit(e.target.value)}>
          <option value="">Pick one</option>
          {TIEBREAK_CRITERIA.map((c) => <option key={c.letter} value={c.letter}>{c.letter}: {c.label}</option>)}
        </select>
      </label>
      <button className="wr-btn wr-btn-gold wr-btn-block" disabled={!side || !crit}
        onClick={() => patchDual({ tiebreak_side: side, tiebreak_criterion: crit }, 'Tiebreak')}>Record tiebreak (+1)</button>
    </div>
  );
}

function DeductionSheet({ opponent, onClose, onSave }: { opponent: string; onClose: () => void; onSave: (s: Side, p: number, r: string) => void }) {
  const [side, setSide] = useState<Side>('them');
  const [pts, setPts] = useState(1);
  const [reason, setReason] = useState('UCT');
  return (
    <Sheet title="Team deduction" onClose={onClose}>
      <p className="wr-quiet">Points come off the team that was penalized.</p>
      <div className="wr-grid-2">
        <button className={`wr-btn wr-btn-us${side === 'us' ? ' is-picked' : ''}`} onClick={() => setSide('us')}>Warriors</button>
        <button className={`wr-btn wr-btn-them${side === 'them' ? ' is-picked' : ''}`} onClick={() => setSide('them')}>{opponent}</button>
      </div>
      <div className="wr-grid-3">
        {[1, 2, 3].map((p) => <button key={p} className={`wr-btn wr-btn-ghost${pts === p ? ' is-picked' : ''}`} onClick={() => setPts(p)}>−{p}</button>)}
      </div>
      <div className="wr-grid-3">
        {[['UCT', 'Unsportsmanlike'], ['CM', 'Coach misconduct'], ['FMC', 'Flagrant']].map(([v, l]) => (
          <button key={v} className={`wr-btn wr-btn-ghost wr-btn-sm${reason === v ? ' is-picked' : ''}`} onClick={() => setReason(v)}>{l}</button>
        ))}
      </div>
      <button className="wr-btn wr-btn-gold wr-btn-block" onClick={() => onSave(side, pts, reason)}>Take {pts} off {side === 'us' ? 'Warriors' : opponent}</button>
    </Sheet>
  );
}

// ─── Live bout ───────────────────────────────────────────────────────────────

type EndSheet =
  | { kind: 'points' }
  | { kind: 'direct'; result: 'FALL' | 'DEF' | 'DQ' }
  | { kind: 'tf-check'; leader: Side }
  | null;

function LiveBout(props: {
  dual: Dual; bout: Bout; events: Ev[]; roster: Wrestler[]; sync: OutboxState;
  onBack: () => void;
  addEvent: (b: Bout, side: Side, code: EventCode) => Ev;
  voidEv: (e: Ev) => void;
  patchBout: (b: Bout, p: Record<string, unknown>, label: string) => void;
  onToast: (t: string) => void;
}) {
  const { dual, bout, events, roster, addEvent, voidEv, patchBout } = props;
  const [sheet, setSheet] = useState<EndSheet>(null);
  const [more, setMore] = useState<Side | null>(null);
  const [tfHold, setTfHold] = useState(false);
  const s = boutScore(events);
  const margin = Math.abs(s.us - s.them);
  const leader: Side | null = s.us === s.them ? null : s.us > s.them ? 'us' : 'them';
  const final = bout.status === 'final';
  const our = nameOf(roster, bout.our_wrestler_id) ?? 'Warriors';

  const tap = (side: Side, code: EventCode) => {
    if (final) return;
    const before = { us: s.us, them: s.them };
    addEvent(bout, side, code);
    const pts = EVENT_POINTS[code];
    const after = { us: before.us + (side === 'us' ? pts : 0), them: before.them + (side === 'them' ? pts : 0) };
    if (navigator.vibrate) navigator.vibrate(15);
    if (crossesTechFall(before, after)) setSheet({ kind: 'tf-check', leader: after.us > after.them ? 'us' : 'them' });
    setMore(null);
  };
  const undo = () => {
    const last = lastActiveEvent(events);
    if (!last) return props.onToast('Nothing to undo.');
    voidEv(last);
    props.onToast(`Undid ${last.code} for ${last.side === 'us' ? 'Warriors' : dual.opponent}`);
  };
  const setPeriod = (p: Period) => patchBout(bout, { current_period: p }, 'Period');
  const finish = (result_type: ResultType, winner: Side | null, result_time?: string) => {
    patchBout(bout, { result_type, winner, ...(result_time ? { result_time } : {}) }, 'End bout');
    setSheet(null); setTfHold(false);
    props.onBack();
  };

  const col = (side: Side) => {
    const label = side === 'us' ? our : bout.opp_name || dual.opponent;
    return (
      <div className={`wr-col is-${side}`}>
        <button className="wr-act wr-act-big" onClick={() => tap(side, 'T3')}>Takedown<b>3</b></button>
        <div className="wr-act-pair">
          <button className="wr-act" onClick={() => tap(side, 'E1')}>Escape<b>1</b></button>
          <button className="wr-act" onClick={() => tap(side, 'R2')}>Reversal<b>2</b></button>
        </div>
        <div className="wr-act-trio">
          <button className="wr-act wr-act-nf" onClick={() => tap(side, 'N2')} aria-label={`Near fall 2 for ${label}`}>NF<b>2</b></button>
          <button className="wr-act wr-act-nf" onClick={() => tap(side, 'N3')} aria-label={`Near fall 3 for ${label}`}>NF<b>3</b></button>
          <button className="wr-act wr-act-nf" onClick={() => tap(side, 'N4')} aria-label={`Near fall 4 for ${label}`}>NF<b>4</b></button>
        </div>
        <div className="wr-act-pair">
          <button className="wr-act wr-act-pen" onClick={() => tap(side, 'PEN1')}>Pen<b>+1</b></button>
          <button className="wr-act wr-act-pen" onClick={() => tap(side, 'PEN2')}>Pen<b>+2</b></button>
        </div>
        <button className="wr-act wr-act-more" onClick={() => setMore(side)}>More</button>
      </div>
    );
  };

  return (
    <div className={`wr-live${final ? ' is-final' : ''}`}>
      <div className="wr-live-top">
        <button className="wr-link" onClick={props.onBack}>Dual board</button>
        <span className="wr-live-wt">{bout.weight}{bout.level === 'JV' && <small> Exhibition</small>}</span>
        <SyncPill sync={props.sync} />
      </div>

      <div className="wr-scoreband">
        <div className="wr-side is-us">
          <span className="wr-side-name">{our}</span>
          <b className="wr-side-score">{s.us}</b>
        </div>
        <div className="wr-side is-them">
          <span className="wr-side-name">{bout.opp_name || dual.opponent}</span>
          <b className="wr-side-score">{s.them}</b>
        </div>
      </div>

      <BoutSheet byPeriod={s.byPeriod} current={bout.current_period} />

      <div className="wr-period">
        <button className="wr-btn wr-btn-ghost wr-btn-sq" aria-label="Previous period"
          disabled={bout.current_period === 'P1' || final}
          onClick={() => setPeriod(PERIODS[PERIODS.indexOf(bout.current_period) - 1])}>‹</button>
        <span className="wr-period-now">{PERIOD_LABEL[bout.current_period]}{bout.current_period.startsWith('P') ? ' period' : ''}</span>
        <button className="wr-btn wr-btn-ghost wr-btn-sq" aria-label="Next period"
          disabled={!nextPeriod(bout.current_period) || final}
          onClick={() => { const n = nextPeriod(bout.current_period); if (n) setPeriod(n); }}>›</button>
      </div>

      {final ? (
        <div className="wr-final-note">
          <p>Final: {bout.winner === 'us' ? our : bout.winner === 'them' ? (bout.opp_name || dual.opponent) : 'No winner'}, {bout.result_type ? RESULT_LABEL[bout.result_type] : ''}</p>
          <button className="wr-btn wr-btn-ghost wr-btn-block" onClick={() => patchBout(bout, { status: 'live' }, 'Reopen bout')}>Reopen to fix a call</button>
        </div>
      ) : (
        <div className="wr-cols">{col('us')}{col('them')}</div>
      )}

      {!final && (
        <div className="wr-bottombar">
          <button className="wr-btn wr-btn-ghost" onClick={undo}>Undo</button>
          {tfHold && margin >= 15 && leader
            ? <button className="wr-btn wr-btn-gold" onClick={() => finish('TF', leader)}>End as tech fall</button>
            : <button className="wr-btn wr-btn-gold" onClick={() => setSheet({ kind: 'points' })}>End bout</button>}
        </div>
      )}

      {more && (
        <Sheet title={`More for ${more === 'us' ? our : bout.opp_name || dual.opponent}`} onClose={() => setMore(null)}>
          <div className="wr-grid-2">
            <button className="wr-btn wr-btn-ghost" onClick={() => tap(more, 'N5')}>Near fall 5</button>
            <button className="wr-btn wr-btn-ghost" onClick={() => tap(more, 'RO1')}>Ride-out +1 (UTB)</button>
            <button className="wr-btn wr-btn-ghost" onClick={() => tap(more, 'SW')}>Stall warning on the other</button>
            <button className="wr-btn wr-btn-ghost" onClick={() => tap(more, 'C')}>Caution on the other</button>
          </div>
        </Sheet>
      )}

      {sheet?.kind === 'tf-check' && (
        <Sheet title="15-point lead. Near-fall criteria still active?">
          <div className="wr-grid-2">
            <button className="wr-btn wr-btn-gold" onClick={() => finish('TF', sheet.leader)}>No: tech fall now</button>
            <button className="wr-btn wr-btn-ghost" onClick={() => { setTfHold(true); setSheet(null); }}>Yes: keep scoring</button>
          </div>
          <button className="wr-btn wr-btn-ghost wr-btn-block" onClick={() => { setSheet(null); undo(); }}>That was a mistake: undo</button>
        </Sheet>
      )}

      {sheet?.kind === 'points' && (
        <EndBoutSheet
          events={events} bout={bout} our={our} opp={bout.opp_name || dual.opponent}
          onClose={() => setSheet(null)}
          onFinish={finish}
          onRideOut={(side) => { addEvent(bout, side, 'RO1'); finish('DEC', side); }}
          onDirect={(r) => setSheet({ kind: 'direct', result: r })}
          onNextPeriod={() => { const n = nextPeriod(bout.current_period); if (n) setPeriod(n); setSheet(null); }}
        />
      )}

      {sheet?.kind === 'direct' && (
        <DirectResultSheet result={sheet.result} our={our} opp={bout.opp_name || dual.opponent}
          onClose={() => setSheet(null)} onFinish={finish} />
      )}
    </div>
  );
}

/** The paper bout sheet: one column per period wrestled, tallies per side. */
function BoutSheet({ byPeriod, current }: { byPeriod: { period: Period; us: number; them: number }[]; current: Period }) {
  const upto = PERIODS.indexOf(current);
  const cols = PERIODS.filter((p, i) => i <= Math.max(2, upto) || byPeriod.some((x) => x.period === p));
  const get = (p: Period) => byPeriod.find((x) => x.period === p);
  return (
    <table className="wr-sheetgrid" aria-label="Points by period">
      <thead><tr><th scope="col"><span className="wr-sr">Team</span></th>{cols.map((p) => <th key={p} scope="col" className={p === current ? 'is-now' : ''}>{PERIOD_LABEL[p]}</th>)}</tr></thead>
      <tbody>
        <tr className="is-us"><th scope="row">W</th>{cols.map((p) => <td key={p} className={p === current ? 'is-now' : ''}>{get(p)?.us ?? (PERIODS.indexOf(p) <= upto ? 0 : '')}</td>)}</tr>
        <tr className="is-them"><th scope="row">O</th>{cols.map((p) => <td key={p} className={p === current ? 'is-now' : ''}>{get(p)?.them ?? (PERIODS.indexOf(p) <= upto ? 0 : '')}</td>)}</tr>
      </tbody>
    </table>
  );
}

function EndBoutSheet(props: {
  events: Ev[]; bout: Bout; our: string; opp: string;
  onClose: () => void;
  onFinish: (r: ResultType, w: Side | null) => void;
  onRideOut: (side: Side) => void;
  onDirect: (r: 'FALL' | 'DEF' | 'DQ') => void;
  onNextPeriod: () => void;
}) {
  const end = endOnPoints(props.events, props.bout.current_period);
  const name = (s: Side) => (s === 'us' ? props.our : props.opp);
  return (
    <Sheet title="End bout" onClose={props.onClose}>
      {end.ok ? (
        <button className="wr-btn wr-btn-gold wr-btn-block wr-btn-tall" onClick={() => props.onFinish(end.result.result_type, end.result.winner)}>
          {name(end.result.winner!)} wins, {RESULT_LABEL[end.result.result_type]} {Math.max(end.score.us, end.score.them)}–{Math.min(end.score.us, end.score.them)}
          <small>{end.result.winner === 'us' ? '+' : '−'}{end.result.team_pts_us || end.result.team_pts_them} team {props.bout.level === 'JV' ? '(exhibition, not counted)' : ''}</small>
        </button>
      ) : end.needsRideOut ? (
        <>
          <p className="wr-quiet">Tied in the ultimate tiebreaker with no score. Who was on top (rode it out)?</p>
          <div className="wr-grid-2">
            <button className="wr-btn wr-btn-us" onClick={() => props.onRideOut('us')}>{props.our}</button>
            <button className="wr-btn wr-btn-them" onClick={() => props.onRideOut('them')}>{props.opp}</button>
          </div>
        </>
      ) : (
        <>
          <p className="wr-quiet">Tied {end.score.us}–{end.score.them}. A tied bout goes to the next period.</p>
          <button className="wr-btn wr-btn-gold wr-btn-block" onClick={props.onNextPeriod}>Go to {PERIOD_LABEL[nextPeriod(props.bout.current_period) ?? 'UTB']}</button>
        </>
      )}
      <div className="wr-grid-3">
        <button className="wr-btn wr-btn-ghost" onClick={() => props.onDirect('FALL')}>Fall</button>
        <button className="wr-btn wr-btn-ghost" onClick={() => props.onDirect('DEF')}>Default</button>
        <button className="wr-btn wr-btn-ghost" onClick={() => props.onDirect('DQ')}>DQ</button>
      </div>
    </Sheet>
  );
}

function DirectResultSheet(props: {
  result: 'FALL' | 'DEF' | 'DQ'; our: string; opp: string;
  onClose: () => void; onFinish: (r: ResultType, w: Side | null, t?: string) => void;
}) {
  const [time, setTime] = useState('');
  const valid = !time || /^\d{1,2}:[0-5]\d$/.test(time);
  const t = props.result === 'FALL' && time && valid ? time : undefined;
  return (
    <Sheet title={`${RESULT_LABEL[props.result]}: who won?`} onClose={props.onClose}>
      {props.result === 'FALL' && (
        <label className="wr-field">
          <span>Match time (optional, like 1:38)</span>
          <input inputMode="numeric" value={time} placeholder="m:ss" maxLength={5}
            onChange={(e) => setTime(e.target.value.replace(/[^\d:]/g, ''))} />
        </label>
      )}
      {!valid && <p className="wr-error">Time is minutes:seconds, like 1:38.</p>}
      <div className="wr-grid-2">
        <button className="wr-btn wr-btn-us wr-btn-tall" disabled={!valid} onClick={() => props.onFinish(props.result, 'us', t)}>{props.our}</button>
        <button className="wr-btn wr-btn-them wr-btn-tall" disabled={!valid} onClick={() => props.onFinish(props.result, 'them', t)}>{props.opp}</button>
      </div>
    </Sheet>
  );
}
