// Log activity: pick a type, give the date and whatever that type asks for, and the
// activity is inserted as the player's own pending row. Below the form, the player's
// recent activities as a ruled ledger with their seals; pending ones can be withdrawn.
import { useCallback, useEffect, useId, useState, type FormEvent } from 'react';
import { getSupabase, type Player } from './supabase';
import { todayCentral } from './dates';
import {
  CATEGORY_LABELS,
  ROW_COLUMNS,
  TYPE_COLUMNS,
  statusWords,
  typeHint,
  type ActivityRow,
  type ActivityType,
} from './activities';
import Seal from './Seal';
import book from './book.module.css';
import styles from './LogActivity.module.css';

const RECENT_LIMIT = 20;

export interface NewActivity {
  type_code: string;
  occurred_on: string;
  hours?: number;
  note?: string;
  supervised_by?: string;
  with_candidate?: string;
}

interface Person {
  id: string;
  name: string;
}

interface LogData {
  types: ActivityType[];
  sponsored: Person[];
  recent: ActivityRow[];
  gameStart: string | null;
}

type Load = { kind: 'loading' } | { kind: 'ready'; data: LogData } | { kind: 'error'; message: string };

async function loadRecent(playerId: string): Promise<ActivityRow[]> {
  const { data, error } = await getSupabase()
    .from('activities')
    .select(ROW_COLUMNS)
    .eq('player_id', playerId)
    .order('occurred_on', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(RECENT_LIMIT);
  if (error) throw new Error(error.message);
  return data as ActivityRow[];
}

async function loadLog(player: Player): Promise<LogData> {
  const supabase = getSupabase();
  const [types, firstSeason, links, recent] = await Promise.all([
    supabase.from('activity_types').select(TYPE_COLUMNS).order('sort').order('name'),
    supabase.from('seasons').select('starts_on').order('starts_on').limit(1),
    player.is_candidate
      ? Promise.resolve({ data: [] as { candidate_id: string }[], error: null })
      : supabase.from('player_links').select('candidate_id').eq('adult_id', player.id).eq('kind', 'sponsor'),
    loadRecent(player.id),
  ]);
  const failed = types.error ?? firstSeason.error ?? links.error;
  if (failed) throw new Error(failed.message);

  let sponsored: Person[] = [];
  const ids = links.data!.map((l) => l.candidate_id);
  if (ids.length) {
    const people = await supabase.from('players').select('id, display_name').in('id', ids);
    if (people.error) throw new Error(people.error.message);
    sponsored = people.data
      .map((p) => ({ id: p.id as string, name: p.display_name as string }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  return {
    types: types.data as ActivityType[],
    sponsored,
    recent,
    gameStart: firstSeason.data![0]?.starts_on ?? null,
  };
}

export default function LogActivity({ player }: { player: Player }) {
  const [load, setLoad] = useState<Load>({ kind: 'loading' });

  useEffect(() => {
    let cancelled = false;
    loadLog(player).then(
      (data) => !cancelled && setLoad({ kind: 'ready', data }),
      (err: Error) => !cancelled && setLoad({ kind: 'error', message: err.message }),
    );
    return () => {
      cancelled = true;
    };
  }, [player]);

  const setRecent = useCallback((update: (rows: ActivityRow[]) => ActivityRow[]) => {
    setLoad((prev) => (prev.kind === 'ready' ? { kind: 'ready', data: { ...prev.data, recent: update(prev.data.recent) } } : prev));
  }, []);

  async function submit(activity: NewActivity): Promise<string | null> {
    // The one direct write: the player's own row, pending. status, points_awarded and
    // reviewed_* are never sent; the database sets them.
    const { data, error } = await getSupabase()
      .from('activities')
      .insert({ player_id: player.id, ...activity })
      .select(ROW_COLUMNS)
      .single();
    if (error) return `The activity wasn’t logged. The server said: ${error.message}`;
    setRecent((rows) => [data as ActivityRow, ...rows].slice(0, RECENT_LIMIT));
    return null;
  }

  async function withdraw(id: number): Promise<string | null> {
    const { data, error } = await getSupabase().from('activities').delete().eq('id', id).select('id');
    if (error) return `The activity wasn’t withdrawn. The server said: ${error.message}`;
    if (!data.length) {
      // Reviewed in the meantime: show its new status instead.
      try {
        const rows = await loadRecent(player.id);
        setRecent(() => rows);
      } catch {
        /* keep the old list; the message below still applies */
      }
      return 'That activity was reviewed before you withdrew it, so it stays.';
    }
    setRecent((rows) => rows.filter((r) => r.id !== id));
    return null;
  }

  if (load.kind === 'loading') return <p className={book.fine}>Opening your ledger…</p>;
  if (load.kind === 'error') {
    return (
      <>
        <h1 className={book.heading}>Log activity</h1>
        <p className={book.error} role="alert">
          Your activities didn’t load. The server said: {load.message}
        </p>
        <p className={book.prose}>Reload the page. If this keeps happening, tell the game admin.</p>
      </>
    );
  }
  return (
    <LogLeaf
      isCandidate={player.is_candidate}
      data={load.data}
      today={todayCentral()}
      onSubmit={submit}
      onWithdraw={withdraw}
    />
  );
}

interface LeafProps {
  isCandidate: boolean;
  data: LogData;
  today: string;
  onSubmit: (activity: NewActivity) => Promise<string | null>;
  onWithdraw: (id: number) => Promise<string | null>;
  /** Dev-only screenshots: start with a type chosen and fields filled. */
  preview?: { typeCode?: string; hours?: string; supervisedBy?: string; note?: string; withCandidate?: string };
}

type Field = 'type' | 'date' | 'hours' | 'supervisedBy';

export function LogLeaf({ isCandidate, data, today, onSubmit, onWithdraw, preview }: LeafProps) {
  const ids = { type: useId(), date: useId(), hours: useId(), sup: useId(), note: useId(), withC: useId(), err: useId() };
  const [typeCode, setTypeCode] = useState(preview?.typeCode ?? '');
  const [date, setDate] = useState(today);
  const [hours, setHours] = useState(preview?.hours ?? '');
  const [supervisedBy, setSupervisedBy] = useState(preview?.supervisedBy ?? '');
  const [note, setNote] = useState(preview?.note ?? '');
  const [withCandidate, setWithCandidate] = useState(preview?.withCandidate ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ text: string; field?: Field } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const typeByCode = new Map(data.types.map((t) => [t.code, t]));
  // Prayers are recorded by the adult who heard them; candidate-only types are hidden from adults.
  const choosable = data.types.filter(
    (t) => t.active && t.category !== 'prayer' && (isCandidate || !t.candidate_only),
  );
  const groups = Object.keys(CATEGORY_LABELS)
    .map((cat) => ({ cat, types: choosable.filter((t) => t.category === cat) }))
    .filter((g) => g.types.length);
  const chosen = typeByCode.get(typeCode);
  const sponsored = isCandidate ? [] : data.sponsored;

  function check(): { text: string; field: Field } | null {
    if (!chosen) return { text: 'Choose an activity.', field: 'type' };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { text: 'Enter the date it happened.', field: 'date' };
    if (date > today) return { text: 'The date can’t be in the future.', field: 'date' };
    if (data.gameStart && date < data.gameStart) {
      return { text: 'The date can’t be before the game started.', field: 'date' };
    }
    if (chosen.per_hour) {
      // hours is numeric(4,1) with 0 < hours <= 12: at most one decimal place.
      const text = hours.trim();
      const h = Number(text);
      if (!/^\d{1,2}(\.\d)?$/.test(text) || h <= 0 || h > 12) {
        return { text: 'Enter the hours as a number up to 12, like 2 or 1.5.', field: 'hours' };
      }
    }
    if (chosen.requires_supervisor && !supervisedBy.trim()) {
      return { text: 'Enter the name of the adult who supervised.', field: 'supervisedBy' };
    }
    return null;
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setNotice(null);
    const problem = check();
    if (problem) {
      setError(problem);
      return;
    }
    const t = chosen!;
    // Send only the fields this type uses.
    const activity: NewActivity = { type_code: t.code, occurred_on: date };
    if (t.per_hour) activity.hours = Number(hours);
    if (t.requires_supervisor) activity.supervised_by = supervisedBy.trim();
    if (t.allows_note && note.trim()) activity.note = note.trim();
    if (withCandidate && sponsored.some((p) => p.id === withCandidate)) activity.with_candidate = withCandidate;

    setError(null);
    setBusy(true);
    const failure = await onSubmit(activity);
    setBusy(false);
    if (failure) {
      setError({ text: failure });
      return;
    }
    setNotice(
      isCandidate
        ? `Logged ${t.name}. Your sponsor or parent will review it.`
        : `Logged ${t.name}. Another adult will review it.`,
    );
    setTypeCode('');
    setDate(today);
    setHours('');
    setSupervisedBy('');
    setNote('');
    setWithCandidate('');
  }

  const invalid = (f: Field) => error?.field === f || undefined;
  const describe = (f: Field) => (error?.field === f ? ids.err : undefined);

  return (
    <>
      <h1 className={book.heading}>Log activity</h1>

      <form onSubmit={submit} noValidate className={styles.form}>
        {error && (
          <p id={ids.err} className={book.error} role="alert">
            {error.text}
          </p>
        )}
        {notice && (
          <p className={book.notice} role="status">
            {notice}
          </p>
        )}

        <div className={book.field}>
          <label className={book.label} htmlFor={ids.type}>
            Activity
          </label>
          <select
            id={ids.type}
            className={`${book.input} ${styles.select}`}
            value={typeCode}
            onChange={(e) => {
              setTypeCode(e.target.value);
              setError(null);
              setNotice(null);
            }}
            aria-invalid={invalid('type')}
            aria-describedby={describe('type')}
          >
            <option value="" disabled>
              Choose an activity
            </option>
            {groups.map((g) => (
              <optgroup key={g.cat} label={CATEGORY_LABELS[g.cat]}>
                {g.types.map((t) => (
                  <option key={t.code} value={t.code}>
                    {t.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          {chosen && <p className={book.fine}>{typeHint(chosen)}</p>}
        </div>

        <div className={book.field}>
          <label className={book.label} htmlFor={ids.date}>
            Date
          </label>
          <input
            id={ids.date}
            className={book.input}
            type="date"
            value={date}
            max={today}
            min={data.gameStart ?? undefined}
            onChange={(e) => setDate(e.target.value)}
            aria-invalid={invalid('date')}
            aria-describedby={describe('date')}
          />
        </div>

        {chosen?.per_hour && (
          <div className={book.field}>
            <label className={book.label} htmlFor={ids.hours}>
              Hours
            </label>
            <input
              id={ids.hours}
              className={`${book.input} ${styles.short}`}
              type="number"
              inputMode="decimal"
              min="0.5"
              max="12"
              step="0.5"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              aria-invalid={invalid('hours')}
              aria-describedby={describe('hours')}
            />
          </div>
        )}

        {chosen?.requires_supervisor && (
          <div className={book.field}>
            <label className={book.label} htmlFor={ids.sup}>
              Supervised by
            </label>
            <input
              id={ids.sup}
              className={book.input}
              type="text"
              maxLength={80}
              autoComplete="off"
              value={supervisedBy}
              onChange={(e) => setSupervisedBy(e.target.value)}
              aria-invalid={invalid('supervisedBy')}
              aria-describedby={describe('supervisedBy')}
            />
            <p className={book.fine}>The adult in charge, such as the service coordinator.</p>
          </div>
        )}

        {chosen && chosen.allows_note && (
          <div className={book.field}>
            <label className={book.label} htmlFor={ids.note}>
              Note <span className={styles.optional}>(optional)</span>
            </label>
            <textarea
              id={ids.note}
              className={`${book.input} ${styles.note}`}
              maxLength={500}
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <p className={book.fine}>
              {note.length} of 500 characters. Only you and the adults linked to you see it.
            </p>
          </div>
        )}
        {chosen && !chosen.allows_note && (
          <p className={`${book.fine} ${styles.gap}`}>This one is logged by date only, with no note.</p>
        )}

        {sponsored.length === 1 && (
          <label className={styles.check}>
            <input
              type="checkbox"
              checked={withCandidate === sponsored[0].id}
              onChange={(e) => setWithCandidate(e.target.checked ? sponsored[0].id : '')}
            />
            <span>I did this with {sponsored[0].name}</span>
          </label>
        )}
        {sponsored.length > 1 && (
          <div className={book.field}>
            <label className={book.label} htmlFor={ids.withC}>
              Did this with
            </label>
            <select
              id={ids.withC}
              className={`${book.input} ${styles.select}`}
              value={withCandidate}
              onChange={(e) => setWithCandidate(e.target.value)}
            >
              <option value="">No one</option>
              {sponsored.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <button type="submit" className={`${book.button} ${styles.submit}`} disabled={busy}>
          {busy ? 'Logging…' : 'Log activity'}
        </button>
      </form>

      <section aria-labelledby="cq-recent" className={styles.recent}>
        <h2 id="cq-recent" className={styles.subhead}>
          Your recent activities
        </h2>
        <Ledger rows={data.recent} typeByCode={typeByCode} people={data.sponsored} onWithdraw={onWithdraw} />
      </section>
    </>
  );
}

const shortDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });

interface LedgerProps {
  rows: ActivityRow[];
  typeByCode: Map<string, ActivityType>;
  people: Person[];
  onWithdraw: (id: number) => Promise<string | null>;
}

function Ledger({ rows, typeByCode, people, onWithdraw }: LedgerProps) {
  const [confirming, setConfirming] = useState<number | null>(null);
  const [busy, setBusy] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  if (!rows.length) {
    return <p className={book.prose}>Nothing logged yet. Activities you log appear here with their status.</p>;
  }

  async function withdraw(id: number) {
    setBusy(id);
    setMessage(null);
    const failure = await onWithdraw(id);
    setBusy(null);
    setConfirming(null);
    if (failure) setMessage(failure);
  }

  return (
    <>
      {message && (
        <p className={book.error} role="alert">
          {message}
        </p>
      )}
      <ol className={styles.ledger}>
        {rows.map((row) => {
          const t = typeByCode.get(row.type_code);
          const withName = people.find((p) => p.id === row.with_candidate)?.name;
          const detail = [
            row.hours !== null ? `${row.hours} ${Number(row.hours) === 1 ? 'hour' : 'hours'}` : null,
            withName ? `with ${withName}` : null,
          ]
            .filter(Boolean)
            .join(', ');
          return (
            <li key={row.id} className={styles.entry}>
              <span className={styles.date}>{shortDate(row.occurred_on)}</span>
              <div className={styles.what}>
                <span className={styles.name}>{t?.name ?? row.type_code}</span>
                {detail && <span className={styles.detail}>{detail}</span>}
                <span className={styles.status}>{statusWords(row, t)}</span>
                {row.status === 'pending' &&
                  (confirming === row.id ? (
                    <span className={styles.confirm}>
                      Withdraw this activity?{' '}
                      <button
                        type="button"
                        className={styles.action}
                        onClick={() => withdraw(row.id)}
                        disabled={busy === row.id}
                      >
                        {busy === row.id ? 'Withdrawing…' : 'Withdraw'}
                      </button>{' '}
                      <button
                        type="button"
                        className={styles.action}
                        onClick={() => setConfirming(null)}
                        disabled={busy === row.id}
                      >
                        Keep it
                      </button>
                    </span>
                  ) : (
                    <button type="button" className={styles.action} onClick={() => setConfirming(row.id)}>
                      Withdraw
                    </button>
                  ))}
              </div>
              <Seal status={row.status} points={row.points_awarded} />
            </li>
          );
        })}
      </ol>
    </>
  );
}
