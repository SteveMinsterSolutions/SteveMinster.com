import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import bandits from '../../data/bandits.json';
import {
  labelOf, jerseyLabel, formatPhone, GRADES, YEARS_PLAYED, JERSEY_SIZES, HELMET, AVAILABILITY,
  TDC_ID_TYPES, RELATIONSHIPS, CONTACT_PREFS,
} from '../../lib/bandits/validate';
import { suggestNumbers, type Suggestion } from '../../lib/bandits/numbers';
import { fullDate } from '../../lib/bandits/dates';

/**
 * CoachRoster — the signed-in coach dashboard views (README §9): summary,
 * roster with inline checklist saves, details, number helper, jersey totals,
 * waitlist actions, exports. All data goes through `api` (adds the bearer token).
 */

export type Api = (path: string, init?: RequestInit) => Promise<Response>;

export type Player = {
  id: string; created_at: string; signup_seq: number; status: 'rostered' | 'waitlist' | 'withdrawn';
  player_first: string; player_last: string; dob: string; grade: string; school: string | null; weight_lbs: number;
  years_played: string | null; positions: string | null; eligibility_flag: 'ok' | 'needs_8th_grade_proof' | 'review';
  jersey_scale: 'youth' | 'adult'; jersey_size: string; number_choice_1: number; number_choice_2: number; number_choice_3: number;
  helmet: 'own' | 'loaner'; avail_bbtl: string; avail_tdc: string; tdc_id_type: string;
  guardian_name: string; guardian_relationship: string; guardian_phone: string; guardian_email: string;
  guardian2_name: string | null; guardian2_phone: string | null; contact_pref: string | null;
  emergency_name: string; emergency_phone: string; emergency_relationship: string | null;
  health_notes: string | null; photo_consent: boolean;
  paid: boolean; waiver_received: boolean; birth_cert_received: boolean; tdc_id_received: boolean;
  grade_proof_received: boolean; loaner_assigned: boolean; assigned_number: number | null; staff_notes: string | null;
  updated_at: string;
};
type Patch = Partial<Pick<Player, 'paid' | 'waiver_received' | 'birth_cert_received' | 'tdc_id_received' | 'grade_proof_received' | 'loaner_assigned' | 'assigned_number' | 'staff_notes' | 'status'>>;
type Filter = 'rostered' | 'waitlist' | 'withdrawn' | 'all';
type Notice = { kind: 'ok' | 'error'; text: string } | null;

const STATUS_ORDER = { rostered: 0, waitlist: 1, withdrawn: 2 } as const;
const sortPlayers = (ps: Player[]) => [...ps].sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || a.signup_seq - b.signup_seq);
const name = (p: Player) => `${p.player_first} ${p.player_last}`;
const needsProof = (p: Player) => p.eligibility_flag === 'needs_8th_grade_proof';

/** Checklist chips shown on each player row. Proof/loaner only where they apply. */
const CHECKS: { key: keyof Patch; label: string; applies?: (p: Player) => boolean }[] = [
  { key: 'paid', label: 'Paid' },
  { key: 'waiver_received', label: 'Waiver' },
  { key: 'birth_cert_received', label: 'Birth cert' },
  { key: 'tdc_id_received', label: 'TDC ID' },
  { key: 'grade_proof_received', label: '8th proof', applies: (p) => needsProof(p) || p.grade_proof_received },
  { key: 'loaner_assigned', label: 'Loaner given', applies: (p) => p.helmet === 'loaner' || p.loaner_assigned },
];

/** Age on the eligibility cutoff date (whole years). */
const ageOnCutoff = (dob: string) => {
  const cutoff = bandits.eligibility.cutoff;
  const years = Number(cutoff.slice(0, 4)) - Number(dob.slice(0, 4));
  return dob.slice(5) > cutoff.slice(5) ? years - 1 : years;
};

export default function CoachRoster({ api, email, onSignOut }: { api: Api; email: string; onSignOut: () => void }) {
  const [players, setPlayers] = useState<Player[] | null>(null);
  const [cap, setCap] = useState(bandits.rosterCap);
  const [loadError, setLoadError] = useState<'forbidden' | 'failed' | null>(null);
  const [filter, setFilter] = useState<Filter>('rostered');
  const [openId, setOpenId] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const playersRef = useRef<Player[]>([]);
  playersRef.current = players ?? [];

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const res = await api('/api/bandits/coach/roster');
      if (res.status === 403) return setLoadError('forbidden');
      if (!res.ok) return setLoadError('failed');
      const body = await res.json();
      setCap(body.cap);
      setPlayers(sortPlayers(body.players));
    } catch (e) {
      if ((e as Error).message !== 'signed_out') setLoadError('failed');
    }
  }, [api]);

  useEffect(() => { load(); }, [load]);

  /** Optimistic save; on failure only the patched keys revert. */
  const save = useCallback(async (id: string, patch: Patch): Promise<boolean> => {
    const before = playersRef.current.find((p) => p.id === id);
    if (!before) return false;
    setPlayers((ps) => ps && sortPlayers(ps.map((p) => (p.id === id ? { ...p, ...patch } : p))));
    try {
      const res = await api('/api/bandits/coach/player', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...patch }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.message || "Couldn't save. Try again.");
      setPlayers((ps) => ps && sortPlayers(ps.map((p) => (p.id === id ? body.player : p))));
      return true;
    } catch (e) {
      const revert = Object.fromEntries(Object.keys(patch).map((k) => [k, before[k as keyof Player]]));
      setPlayers((ps) => ps && sortPlayers(ps.map((p) => (p.id === id ? { ...p, ...revert } : p))));
      if ((e as Error).message !== 'signed_out') setNotice({ kind: 'error', text: `${name(before)}: ${(e as Error).message}` });
      return false;
    }
  }, [api]);

  const stats = useMemo(() => {
    const ps = players ?? [];
    const rostered = ps.filter((p) => p.status === 'rostered');
    const active = ps.filter((p) => p.status !== 'withdrawn');
    const loaners = rostered.filter((p) => p.helmet === 'loaner');
    return {
      rostered: rostered.length,
      waitlist: ps.filter((p) => p.status === 'waitlist').length,
      withdrawn: ps.filter((p) => p.status === 'withdrawn').length,
      unpaid: rostered.filter((p) => !p.paid).length,
      waiver: rostered.filter((p) => !p.waiver_received).length,
      birthCert: rostered.filter((p) => !p.birth_cert_received).length,
      tdcId: rostered.filter((p) => !p.tdc_id_received).length,
      proof: rostered.filter((p) => needsProof(p) && !p.grade_proof_received).length,
      loanerRequests: loaners.length,
      loanersGiven: loaners.filter((p) => p.loaner_assigned).length,
      review: active.filter((p) => p.eligibility_flag === 'review').length,
    };
  }, [players]);

  if (loadError === 'forbidden') {
    return (
      <section className="cd-auth">
        <h1 className="cd-h1">Not on the staff list</h1>
        <p>You're signed in as <strong>{email}</strong>, but that address isn't on the Bandits staff list. Ask Steve to add it.</p>
        <button type="button" className="cd-btn cd-btn-outline" onClick={onSignOut}>Sign out</button>
      </section>
    );
  }

  const visible = (players ?? []).filter((p) => filter === 'all' || p.status === filter);

  return (
    <div className="cd-wrap">
      <div className="cd-topbar">
        <h1 className="cd-h1">Coach dashboard</h1>
        <div className="cd-who">
          <span className="cd-muted">{email}</span>
          <button type="button" className="cd-btn cd-btn-outline cd-btn-sm" onClick={load}>Refresh</button>
          <button type="button" className="cd-btn cd-btn-outline cd-btn-sm" onClick={onSignOut}>Sign out</button>
        </div>
      </div>

      <div className="cd-live" aria-live="polite" role="status">
        {notice && (
          <p className={`cd-notice cd-notice-${notice.kind}`}>
            {notice.text}{' '}
            <button type="button" className="cd-linkbtn" onClick={() => setNotice(null)}>Dismiss</button>
          </p>
        )}
      </div>

      {loadError === 'failed' && (
        <p className="cd-alert" role="alert">Couldn't load the roster. <button type="button" className="cd-linkbtn" onClick={load}>Try again</button></p>
      )}
      {!players && !loadError && <p role="status">Loading roster…</p>}

      {players && (
        <>
          <Summary stats={stats} cap={cap} />

          <section className="cd-section" aria-labelledby="cd-roster-h">
            <h2 id="cd-roster-h" className="cd-h2">Roster</h2>
            <div className="cd-filter" role="group" aria-label="Show players">
              {([['rostered', 'Rostered', stats.rostered], ['waitlist', 'Waitlist', stats.waitlist], ['withdrawn', 'Withdrawn', stats.withdrawn], ['all', 'All', players.length]] as const).map(([f, label, n]) => (
                <button key={f} type="button" aria-pressed={filter === f} onClick={() => setFilter(f)}>{label} ({n})</button>
              ))}
            </div>
            {visible.length === 0 ? (
              <p className="cd-muted">No players here yet.</p>
            ) : (
              <ul className="cd-players">
                {visible.map((p) => (
                  <PlayerRow
                    key={p.id}
                    p={p}
                    showStatus={filter === 'all'}
                    open={openId === p.id}
                    onToggle={() => setOpenId(openId === p.id ? null : p.id)}
                    onSave={save}
                    rosterFull={stats.rostered >= cap}
                    cap={cap}
                  />
                ))}
              </ul>
            )}
          </section>

          <NumbersPanel players={players} onSave={save} setNotice={setNotice} />
          <SizesPanel players={players} />
          <ExportsPanel api={api} players={players} setNotice={setNotice} />

          <p className="cd-retention">Delete roster data after the season (by {fullDate(bandits.dataPurgeBy)}).</p>
        </>
      )}
    </div>
  );
}

function Summary({ stats, cap }: { stats: Record<string, number>; cap: number }) {
  const tiles: [string, string, boolean][] = [
    ['Rostered', `${stats.rostered}/${cap}`, false],
    ['Waitlist', String(stats.waitlist), false],
    ['Unpaid', String(stats.unpaid), stats.unpaid > 0],
    ['Waiver missing', String(stats.waiver), stats.waiver > 0],
    ['Birth cert missing', String(stats.birthCert), stats.birthCert > 0],
    ['TDC ID missing', String(stats.tdcId), stats.tdcId > 0],
    ['8th-grade proof missing', String(stats.proof), stats.proof > 0],
    ['Loaner helmets given', `${stats.loanersGiven}/${stats.loanerRequests}`, stats.loanersGiven < stats.loanerRequests],
    ['Eligibility to review', String(stats.review), stats.review > 0],
  ];
  return (
    <section className="cd-section" aria-labelledby="cd-summary-h">
      <h2 id="cd-summary-h" className="cd-h2">Summary</h2>
      <p className="cd-muted cd-small">Missing counts are for rostered players.</p>
      <dl className="cd-tiles">
        {tiles.map(([label, value, warn]) => (
          <div key={label} className={`cd-tile${warn ? ' cd-tile-warn' : ''}`}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function PlayerRow({ p, showStatus, open, onToggle, onSave, rosterFull, cap }: {
  p: Player; showStatus: boolean; open: boolean; onToggle: () => void;
  onSave: (id: string, patch: Patch) => Promise<boolean>; rosterFull: boolean; cap: number;
}) {
  const flag = p.eligibility_flag !== 'ok';
  const detailsId = `cd-details-${p.id}`;
  return (
    <li className={`cd-player${flag ? ' cd-player-flag' : ''}${p.status === 'withdrawn' ? ' cd-player-out' : ''}`}>
      <button type="button" className="cd-player-head" aria-expanded={open} aria-controls={detailsId} onClick={onToggle}>
        <span className="cd-seq">#{p.signup_seq}</span>
        <span className="cd-name">{name(p)}</span>
        <span className="cd-badges">
          {p.assigned_number != null && <span className="cd-badge cd-badge-num">No. {p.assigned_number}</span>}
          {showStatus && <span className="cd-badge">{p.status}</span>}
          {p.eligibility_flag === 'review' && <span className="cd-badge cd-badge-flag">Review eligibility</span>}
          {needsProof(p) && <span className="cd-badge cd-badge-flag">Needs 8th-grade proof</span>}
          {p.helmet === 'loaner' && <span className="cd-badge">Loaner</span>}
        </span>
        <span className="cd-chevron" aria-hidden="true">{open ? '▴' : '▾'}</span>
      </button>

      {p.status !== 'withdrawn' && (
        <div className="cd-checks" role="group" aria-label={`Checklist for ${name(p)}`}>
          {CHECKS.filter((c) => !c.applies || c.applies(p)).map((c) => (
            <label key={c.key} className={`cd-chip${p[c.key as keyof Player] ? ' cd-chip-on' : ''}`}>
              <input type="checkbox" checked={!!p[c.key as keyof Player]} onChange={(e) => onSave(p.id, { [c.key]: e.target.checked } as Patch)} />
              <span>{c.label}</span>
            </label>
          ))}
        </div>
      )}

      {open && <Details id={detailsId} p={p} onSave={onSave} rosterFull={rosterFull} cap={cap} />}
    </li>
  );
}

function Details({ id, p, onSave, rosterFull, cap }: {
  id: string; p: Player; onSave: (id: string, patch: Patch) => Promise<boolean>; rosterFull: boolean; cap: number;
}) {
  const [num, setNum] = useState(p.assigned_number == null ? '' : String(p.assigned_number));
  const [numError, setNumError] = useState<string | null>(null);
  const [notes, setNotes] = useState(p.staff_notes ?? '');
  const [confirmWithdraw, setConfirmWithdraw] = useState(false);
  useEffect(() => setNum(p.assigned_number == null ? '' : String(p.assigned_number)), [p.assigned_number]);
  useEffect(() => setNotes(p.staff_notes ?? ''), [p.staff_notes]);

  const saveNumber = () => {
    const v = num.trim();
    if (v === '00') return setNumError("Choose 0–99; 00 isn't available.");
    if (v !== '' && !/^\d{1,2}$/.test(v)) return setNumError('Enter a number from 0 to 99.');
    setNumError(null);
    onSave(p.id, { assigned_number: v === '' ? null : Number(v) });
  };

  const rows: [string, ReactNode][] = [
    ['Status', `${p.status} · signed up ${new Date(p.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`],
    ['Birthdate', `${fullDate(p.dob)} · age ${ageOnCutoff(p.dob)} on ${fullDate(bandits.eligibility.cutoff)}`],
    ['Eligibility', p.eligibility_flag === 'ok' ? 'OK' : p.eligibility_flag === 'review' ? 'Review needed' : 'Needs 8th-grade proof'],
    ['Grade / school', [labelOf(GRADES, p.grade), p.school].filter(Boolean).join(' · ')],
    ['Weight', `${p.weight_lbs} lbs`],
    ['Experience', [labelOf(YEARS_PLAYED, p.years_played) || '—', p.positions].filter(Boolean).join(' · ')],
    ['Jersey', `${jerseyLabel(p.jersey_scale, p.jersey_size)} · choices ${p.number_choice_1}, ${p.number_choice_2}, ${p.number_choice_3}`],
    ['Helmet', labelOf(HELMET, p.helmet)],
    ['BBTL', labelOf(AVAILABILITY, p.avail_bbtl)],
    ['Turkey Day', `${labelOf(AVAILABILITY, p.avail_tdc)} · ID: ${labelOf(TDC_ID_TYPES, p.tdc_id_type)}`],
    ['Guardian', <>{p.guardian_name} ({labelOf(RELATIONSHIPS, p.guardian_relationship)}) · <a href={`tel:${p.guardian_phone}`}>{formatPhone(p.guardian_phone)}</a> · <a href={`mailto:${p.guardian_email}`}>{p.guardian_email}</a>{p.contact_pref && <> · prefers {labelOf(CONTACT_PREFS, p.contact_pref).toLowerCase()}</>}</>],
    ...(p.guardian2_name || p.guardian2_phone
      ? [['Second guardian', <>{p.guardian2_name}{p.guardian2_phone && <> · <a href={`tel:${p.guardian2_phone}`}>{formatPhone(p.guardian2_phone)}</a></>}</>] as [string, ReactNode]]
      : []),
    ['Emergency', <>{p.emergency_name}{p.emergency_relationship && ` (${p.emergency_relationship})`} · <a href={`tel:${p.emergency_phone}`}>{formatPhone(p.emergency_phone)}</a></>],
    ['Health notes', p.health_notes ? <strong>{p.health_notes}</strong> : '—'],
    ['Photo consent', p.photo_consent ? 'Yes' : 'No'],
  ];

  return (
    <div className="cd-details" id={id}>
      <dl className="cd-dl">
        {rows.map(([k, v]) => (
          <div key={k}><dt>{k}</dt><dd>{v}</dd></div>
        ))}
      </dl>

      <div className="cd-edit">
        <div className="cd-field">
          <label htmlFor={`${id}-num`}>Assigned number</label>
          <div className="cd-inline">
            <input id={`${id}-num`} type="text" inputMode="numeric" maxLength={2} value={num}
              onChange={(e) => setNum(e.target.value)} aria-invalid={numError ? true : undefined}
              aria-describedby={numError ? `${id}-num-err` : undefined} />
            <button type="button" className="cd-btn cd-btn-dark cd-btn-sm" onClick={saveNumber}>Save number</button>
          </div>
          {numError && <p className="cd-err" id={`${id}-num-err`}>{numError}</p>}
        </div>

        <div className="cd-field">
          <label htmlFor={`${id}-notes`}>Staff notes</label>
          <textarea id={`${id}-notes`} rows={2} maxLength={2000} value={notes} onChange={(e) => setNotes(e.target.value)} />
          <div>
            <button type="button" className="cd-btn cd-btn-dark cd-btn-sm" disabled={notes === (p.staff_notes ?? '')}
              onClick={() => onSave(p.id, { staff_notes: notes })}>Save notes</button>
          </div>
        </div>

        <div className="cd-actions">
          {p.status === 'waitlist' && (
            <>
              <button type="button" className="cd-btn cd-btn-gold cd-btn-sm" disabled={rosterFull}
                onClick={() => onSave(p.id, { status: 'rostered' })}>Move to roster</button>
              {rosterFull && <span className="cd-muted cd-small">Roster is full ({cap}/{cap}).</span>}
            </>
          )}
          {p.status !== 'withdrawn' && (
            confirmWithdraw ? (
              <>
                <button type="button" className="cd-btn cd-btn-danger cd-btn-sm" onClick={() => { setConfirmWithdraw(false); onSave(p.id, { status: 'withdrawn' }); }}>
                  Confirm withdraw
                </button>
                <button type="button" className="cd-btn cd-btn-outline cd-btn-sm" onClick={() => setConfirmWithdraw(false)}>Cancel</button>
              </>
            ) : (
              <button type="button" className="cd-btn cd-btn-outline cd-btn-sm" onClick={() => setConfirmWithdraw(true)}>Withdraw…</button>
            )
          )}
          {p.status === 'withdrawn' && (
            <button type="button" className="cd-btn cd-btn-outline cd-btn-sm" onClick={() => onSave(p.id, { status: 'waitlist' })}>
              Return to waitlist
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function NumbersPanel({ players, onSave, setNotice }: {
  players: Player[]; onSave: (id: string, patch: Patch) => Promise<boolean>; setNotice: (n: Notice) => void;
}) {
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null);
  const [applying, setApplying] = useState(false);
  const byId = useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);
  const unassigned = players.filter((p) => p.status === 'rostered' && p.assigned_number == null).length;
  const assignable = suggestions?.filter((s) => s.number != null) ?? [];

  async function apply() {
    if (!suggestions) return;
    setApplying(true);
    let ok = 0, failed = 0;
    for (const s of assignable) (await onSave(s.id, { assigned_number: s.number })) ? ok++ : failed++;
    setApplying(false);
    setSuggestions(null);
    setNotice({ kind: failed ? 'error' : 'ok', text: `Applied ${ok} number${ok === 1 ? '' : 's'}${failed ? `; ${failed} failed (see above) — run Suggest again` : ''}.` });
  }

  return (
    <section className="cd-section" aria-labelledby="cd-numbers-h">
      <h2 id="cd-numbers-h" className="cd-h2">Jersey numbers</h2>
      <p className="cd-muted">{unassigned} rostered player{unassigned === 1 ? '' : 's'} without a number. Suggest walks sign-up order and gives each player their first free choice. Nothing is saved until you click Apply.</p>
      <div className="cd-actions">
        <button type="button" className="cd-btn cd-btn-dark" disabled={applying || unassigned === 0} onClick={() => setSuggestions(suggestNumbers(players))}>Suggest</button>
        {suggestions && (
          <>
            <button type="button" className="cd-btn cd-btn-gold" disabled={applying || assignable.length === 0} onClick={apply}>
              {applying ? 'Applying…' : `Apply ${assignable.length}`}
            </button>
            <button type="button" className="cd-btn cd-btn-outline" disabled={applying} onClick={() => setSuggestions(null)}>Cancel</button>
          </>
        )}
      </div>
      {suggestions && (
        <table className="cd-table">
          <caption className="cd-sr">Suggested numbers</caption>
          <thead><tr><th scope="col">#</th><th scope="col">Player</th><th scope="col">Suggestion</th></tr></thead>
          <tbody>
            {suggestions.map((s) => {
              const p = byId.get(s.id)!;
              return (
                <tr key={s.id}>
                  <td>{p.signup_seq}</td>
                  <td>{name(p)}</td>
                  <td>{s.number != null ? <>No. <strong>{s.number}</strong> <span className="cd-muted">({['1st', '2nd', '3rd'][s.choice! - 1]} choice)</span></> : <strong className="cd-warn">Needs a number</strong>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </section>
  );
}

function SizesPanel({ players }: { players: Player[] }) {
  const rostered = players.filter((p) => p.status === 'rostered');
  const count = (scale: string, size: string) => rostered.filter((p) => p.jersey_scale === scale && p.jersey_size === size).length;
  return (
    <section className="cd-section" aria-labelledby="cd-sizes-h">
      <h2 id="cd-sizes-h" className="cd-h2">Jersey sizes</h2>
      <p className="cd-muted cd-small">Rostered players, for the uniform order.</p>
      <div className="cd-sizes">
        {(['youth', 'adult'] as const).map((scale) => (
          <table className="cd-table" key={scale}>
            <caption>{scale === 'youth' ? 'Youth' : 'Adult'} ({JERSEY_SIZES[scale].reduce((n, o) => n + count(scale, o.value), 0)})</caption>
            <tbody>
              {JERSEY_SIZES[scale].map((o) => (
                <tr key={o.value}><th scope="row">{o.label}</th><td>{count(scale, o.value)}</td></tr>
              ))}
            </tbody>
          </table>
        ))}
      </div>
    </section>
  );
}

function ExportsPanel({ api, players, setNotice }: { api: Api; players: Player[]; setNotice: (n: Notice) => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [manual, setManual] = useState<string | null>(null);
  const active = players.filter((p) => p.status !== 'withdrawn');

  // The export routes need the Authorization header, so a plain <a href> can't
  // download them: fetch with the token → Blob → object URL → temporary <a download>.
  async function download(type: 'bbtl' | 'full' | 'contacts') {
    setBusy(type);
    try {
      const res = await api(`/api/bandits/coach/export?type=${type}`);
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const filename = /filename="([^"]+)"/.exec(res.headers.get('Content-Disposition') ?? '')?.[1] ?? `bandits-${type}.csv`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
    } catch (e) {
      if ((e as Error).message !== 'signed_out') setNotice({ kind: 'error', text: "Couldn't download the export. Try again." });
    } finally {
      setBusy(null);
    }
  }

  async function copy(what: 'emails' | 'phones') {
    const text = what === 'emails'
      ? [...new Set(active.map((p) => p.guardian_email))].join(', ')
      : [...new Set(active.map((p) => formatPhone(p.guardian_phone)))].join('\n');
    // The async Clipboard API can hang on a permission decision; don't wait on it forever.
    const viaApi = navigator.clipboard?.writeText
      ? navigator.clipboard.writeText(text).then(() => true, () => false)
      : Promise.resolve(false);
    let copied = await Promise.race([viaApi, new Promise<boolean>((r) => setTimeout(() => r(false), 1500))]);
    if (!copied) {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;top:0;left:-9999px';
      document.body.appendChild(ta);
      ta.select();
      try { copied = document.execCommand('copy'); } catch { copied = false; }
      ta.remove();
    }
    const n = text ? text.split(what === 'emails' ? ', ' : '\n').length : 0;
    const noun = `${what === 'emails' ? 'email' : 'phone number'}${n === 1 ? '' : 's'}`;
    if (copied) {
      setManual(null);
      setNotice({ kind: 'ok', text: `Copied ${n} ${noun} (rostered + waitlist).` });
    } else {
      setManual(text);
      setNotice({ kind: 'error', text: `Couldn't copy automatically. The ${n} ${noun} are in the box below: select all and copy.` });
    }
  }

  return (
    <section className="cd-section" aria-labelledby="cd-exports-h">
      <h2 id="cd-exports-h" className="cd-h2">Exports</h2>
      <div className="cd-actions">
        <button type="button" className="cd-btn cd-btn-dark" disabled={!!busy} onClick={() => download('bbtl')}>{busy === 'bbtl' ? 'Preparing…' : 'BBTL roster (CSV)'}</button>
        <button type="button" className="cd-btn cd-btn-outline" disabled={!!busy} onClick={() => download('full')}>{busy === 'full' ? 'Preparing…' : 'Full export (CSV)'}</button>
        <button type="button" className="cd-btn cd-btn-outline" disabled={!!busy} onClick={() => download('contacts')}>{busy === 'contacts' ? 'Preparing…' : 'Contacts (CSV)'}</button>
      </div>
      <div className="cd-actions">
        <button type="button" className="cd-btn cd-btn-outline" disabled={active.length === 0} onClick={() => copy('emails')}>Copy emails</button>
        <button type="button" className="cd-btn cd-btn-outline" disabled={active.length === 0} onClick={() => copy('phones')}>Copy phones</button>
      </div>
      {manual !== null && (
        <div className="cd-field">
          <label htmlFor="cd-manual-copy">Copy from here</label>
          <textarea id="cd-manual-copy" readOnly rows={4} value={manual} onFocus={(e) => e.currentTarget.select()} />
        </div>
      )}
    </section>
  );
}
