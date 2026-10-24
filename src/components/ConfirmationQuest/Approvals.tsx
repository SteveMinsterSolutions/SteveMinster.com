// Approvals: the activities waiting for this adult, from pending_approvals(), grouped
// by player with the oldest first. Approve is one tap; Reject asks once. Each decision
// goes through approve_activity and the list is fetched again afterwards. Decided
// entries stay on the page with their seal and result until the adult leaves it.
import { useEffect, useRef, useState } from 'react';
import { getSupabase, type Player } from './supabase';
import { TYPE_COLUMNS, capWords, type ActivityType } from './activities';
import Seal from './Seal';
import book from './book.module.css';
import styles from './Approvals.module.css';

/** One row of pending_approvals(). note is null unless the caller is linked to a candidate. */
export interface PendingRow {
  id: number;
  player_id: string;
  display_name: string;
  is_candidate: boolean;
  type_code: string;
  type_name: string;
  occurred_on: string;
  hours: number | null;
  note: string | null;
  supervised_by: string | null;
  with_candidate: string | null;
  created_at: string;
}

const PENDING_KEYS: (keyof PendingRow)[] = [
  'id', 'player_id', 'display_name', 'is_candidate', 'type_code', 'type_name',
  'occurred_on', 'hours', 'note', 'supervised_by', 'with_candidate', 'created_at',
];

export interface ApprovalsData {
  rows: PendingRow[];
  types: ActivityType[];
  /** display_name by player id, for "with {name}". */
  names: Record<string, string>;
  /** Candidates the approver sponsors: approving them earns the approver a +5 bonus. */
  sponsoring: string[];
}

export type Outcome = { kind: 'approved'; points: number } | { kind: 'rejected' } | { kind: 'gone' };
export type Decision = { outcome: Outcome } | { error: string };

type Load = { kind: 'loading' } | { kind: 'ready'; data: ApprovalsData } | { kind: 'error'; message: string };

async function loadPending(known: Record<string, string>): Promise<{ rows: PendingRow[]; names: Record<string, string> }> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('pending_approvals');
  if (error) throw new Error(error.message);
  if (!Array.isArray(data)) throw new Error('pending_approvals did not return a list.');
  const missing = data.length ? PENDING_KEYS.filter((k) => !(k in data[0])) : [];
  if (missing.length) {
    throw new Error(`pending_approvals returned rows without ${missing.join(', ')}. This doesn’t match the backend contract.`);
  }
  const rows = data as PendingRow[];

  const names = { ...known };
  const unknown = [...new Set(rows.map((r) => r.with_candidate).filter((id): id is string => !!id && !(id in names)))];
  if (unknown.length) {
    const people = await supabase.from('players').select('id, display_name').in('id', unknown);
    if (people.error) throw new Error(people.error.message);
    for (const p of people.data) names[p.id as string] = p.display_name as string;
  }
  return { rows, names };
}

async function loadApprovals(me: Player): Promise<ApprovalsData> {
  const supabase = getSupabase();
  const [types, links, pending] = await Promise.all([
    supabase.from('activity_types').select(TYPE_COLUMNS),
    supabase.from('player_links').select('candidate_id').eq('adult_id', me.id).eq('kind', 'sponsor'),
    loadPending({}),
  ]);
  const failed = types.error ?? links.error;
  if (failed) throw new Error(failed.message);
  return {
    types: types.data as ActivityType[],
    sponsoring: links.data!.map((l) => l.candidate_id as string),
    ...pending,
  };
}

/** What approve_activity's exceptions mean to the adult, and what to do next. */
function decisionError(message: string, ok: boolean): Decision {
  const verb = ok ? 'approved' : 'rejected';
  if (message.includes('not pending')) return { outcome: { kind: 'gone' } };
  if (message.includes('not linked')) {
    return { error: `This wasn’t ${verb}: you aren’t linked to this candidate. Ask the game admin to link you.` };
  }
  if (message.includes('your own activity')) {
    return { error: `This wasn’t ${verb}: it’s your own activity. Another adult will review it.` };
  }
  if (message.includes('only adults')) return { error: `This wasn’t ${verb}: only adults review activities.` };
  return { error: `This wasn’t ${verb}. The server said: ${message}. Try again; if it keeps happening, tell the game admin.` };
}

interface Props {
  player: Player;
  /** Called with the number still waiting after every load, for the nav and Home. */
  onCount: (count: number) => void;
}

export default function Approvals({ player, onCount }: Props) {
  const [load, setLoad] = useState<Load>({ kind: 'loading' });
  const [refreshError, setRefreshError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadApprovals(player).then(
      (data) => {
        if (cancelled) return;
        setLoad({ kind: 'ready', data });
        onCount(data.rows.length);
      },
      (err: Error) => !cancelled && setLoad({ kind: 'error', message: err.message }),
    );
    return () => {
      cancelled = true;
    };
  }, [player, onCount]);

  async function refresh() {
    if (load.kind !== 'ready') return;
    try {
      const fresh = await loadPending(load.data.names);
      setLoad((prev) => (prev.kind === 'ready' ? { kind: 'ready', data: { ...prev.data, ...fresh } } : prev));
      setRefreshError(null);
      onCount(fresh.rows.length);
    } catch (err) {
      setRefreshError(`The list didn’t refresh. The server said: ${(err as Error).message}. Reload the page to see what’s still waiting.`);
    }
  }

  async function decide(row: PendingRow, ok: boolean): Promise<Decision> {
    const { data, error } = await getSupabase().rpc('approve_activity', { p_id: row.id, p_ok: ok });
    const decision: Decision = error
      ? decisionError(error.message, ok)
      : typeof data === 'number'
        ? { outcome: ok ? { kind: 'approved', points: data } : { kind: 'rejected' } }
        : { error: 'approve_activity didn’t return the points awarded. This doesn’t match the backend contract; tell the game admin.' };
    // Refresh even after an error: the row may have been reviewed by someone else.
    await refresh();
    return decision;
  }

  if (load.kind === 'loading') return <p className={book.fine}>Opening the approvals…</p>;
  if (load.kind === 'error') {
    return (
      <>
        <h1 className={book.heading}>Approvals</h1>
        <p className={book.error} role="alert">
          The approvals didn’t load. The server said: {load.message}
        </p>
        <p className={book.prose}>Reload the page. If this keeps happening, tell the game admin.</p>
      </>
    );
  }
  return <ApprovalsLeaf data={load.data} refreshError={refreshError} onDecide={decide} />;
}

const shortDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });

interface Settled {
  row: PendingRow;
  outcome: Outcome;
}

interface LeafProps {
  data: ApprovalsData;
  refreshError?: string | null;
  onDecide: (row: PendingRow, ok: boolean) => Promise<Decision>;
  /** Dev-only screenshots: entries already decided, and one entry asking to reject. */
  preview?: { settled?: Record<number, Outcome>; confirming?: number; errors?: Record<number, string> };
}

export function ApprovalsLeaf({ data, refreshError, onDecide, preview }: LeafProps) {
  const [settled, setSettled] = useState<Map<number, Settled>>(() => {
    const m = new Map<number, Settled>();
    for (const [id, outcome] of Object.entries(preview?.settled ?? {})) {
      const row = data.rows.find((r) => r.id === Number(id));
      if (row) m.set(row.id, { row, outcome });
    }
    return m;
  });
  const [confirming, setConfirming] = useState<number | null>(preview?.confirming ?? null);
  const [busy, setBusy] = useState<number | null>(null);
  const [errors, setErrors] = useState<Record<number, string>>(preview?.errors ?? {});
  const [stamped, setStamped] = useState<number | null>(null);
  const resultRefs = useRef(new Map<number, HTMLElement>());

  // After a decision the buttons are gone; put focus on the result that replaced them.
  useEffect(() => {
    if (stamped !== null) resultRefs.current.get(stamped)?.focus();
  }, [stamped]);

  const typeByCode = new Map(data.types.map((t) => [t.code, t]));

  async function decide(row: PendingRow, ok: boolean) {
    setBusy(row.id);
    setErrors(({ [row.id]: _, ...rest }) => rest);
    const decision = await onDecide(row, ok);
    setBusy(null);
    setConfirming(null);
    if ('error' in decision) {
      setErrors((e) => ({ ...e, [row.id]: decision.error }));
      return;
    }
    setSettled((m) => new Map(m).set(row.id, { row, outcome: decision.outcome }));
    setStamped(row.id);
  }

  // Still waiting (fresh from the server) plus what was decided here, oldest first.
  const waiting = data.rows.filter((r) => !settled.has(r.id));
  const shown = [...waiting, ...[...settled.values()].map((s) => s.row)].sort(
    (a, b) => a.occurred_on.localeCompare(b.occurred_on) || a.id - b.id,
  );
  const groups: { id: string; name: string; rows: PendingRow[] }[] = [];
  for (const row of shown) {
    let g = groups.find((x) => x.id === row.player_id);
    if (!g) groups.push((g = { id: row.player_id, name: row.display_name, rows: [] }));
    g.rows.push(row);
  }

  function result(row: PendingRow, outcome: Outcome): string {
    if (outcome.kind === 'rejected') return 'Rejected';
    if (outcome.kind === 'gone') return 'Already reviewed or withdrawn, so there’s nothing to do.';
    if (outcome.points > 0) {
      const bonus = row.is_candidate && data.sponsoring.includes(row.player_id) ? ' and +5 to you as their sponsor' : '';
      return `+${outcome.points} for ${row.display_name}${bonus}`;
    }
    const why = capWords(typeByCode.get(row.type_code));
    return why ? `Approved, 0 points (${why})` : 'Approved, 0 points';
  }

  return (
    <>
      <h1 className={book.heading}>Approvals</h1>
      {refreshError && (
        <p className={book.error} role="alert">
          {refreshError}
        </p>
      )}
      {waiting.length === 0 && <p className={book.prose}>Nothing is waiting for you.</p>}

      {groups.map((g) => {
        const left = g.rows.filter((r) => !settled.has(r.id)).length;
        const headId = `cq-approve-${g.id}`;
        return (
          <section key={g.id} aria-labelledby={headId} className={styles.group}>
            <h2 id={headId} className={styles.player}>
              {g.name}
              {left > 0 && <span className={styles.count}>{left} waiting</span>}
            </h2>
            <ol className={styles.ledger}>
              {g.rows.map((row) => {
                const done = settled.get(row.id);
                const withName = row.with_candidate ? data.names[row.with_candidate] : undefined;
                const detail = [
                  row.hours !== null ? `${row.hours} ${Number(row.hours) === 1 ? 'hour' : 'hours'}` : null,
                  row.supervised_by ? `supervised by ${row.supervised_by}` : null,
                  withName ? `with ${withName}` : null,
                ]
                  .filter(Boolean)
                  .join(', ');
                const seal =
                  done?.outcome.kind === 'approved' ? (
                    <Seal status="approved" points={done.outcome.points} stamp={stamped === row.id || !!preview} />
                  ) : done?.outcome.kind === 'rejected' ? (
                    <Seal status="rejected" />
                  ) : (
                    <Seal status="pending" />
                  );
                return (
                  <li key={row.id} className={styles.entry}>
                    <span className={styles.date}>{shortDate(row.occurred_on)}</span>
                    <div className={styles.what}>
                      <span className={styles.name}>{row.type_name}</span>
                      {detail && <span className={styles.detail}>{detail.charAt(0).toUpperCase() + detail.slice(1)}</span>}
                      {row.note && <span className={styles.note}>“{row.note}”</span>}

                      {errors[row.id] && (
                        <p className={`${book.error} ${styles.entryError}`} role="alert">
                          {errors[row.id]}
                        </p>
                      )}

                      {done ? (
                        <span
                          className={`${styles.result} ${done.outcome.kind === 'approved' && done.outcome.points > 0 ? styles.earned : ''}`}
                          tabIndex={-1}
                          ref={(el) => {
                            if (el) resultRefs.current.set(row.id, el);
                            else resultRefs.current.delete(row.id);
                          }}
                        >
                          {result(row, done.outcome)}
                        </span>
                      ) : null}
                    </div>
                    {seal}
                    {!done && (confirming === row.id ? (
                        <div className={styles.actions}>
                          <span className={styles.ask}>Reject this activity?</span>
                          <button
                            type="button"
                            className={`${styles.btn} ${styles.reject}`}
                            onClick={() => decide(row, false)}
                            disabled={busy === row.id}
                          >
                            {busy === row.id ? 'Rejecting…' : 'Reject'}
                          </button>
                          <button
                            type="button"
                            className={`${styles.btn} ${styles.quiet}`}
                            onClick={() => setConfirming(null)}
                            disabled={busy === row.id}
                          >
                            Keep it
                          </button>
                        </div>
                      ) : (
                        <div className={styles.actions}>
                          <button
                            type="button"
                            className={`${styles.btn} ${styles.approve}`}
                            onClick={() => decide(row, true)}
                            disabled={busy !== null}
                          >
                            {busy === row.id ? 'Approving…' : 'Approve'}
                          </button>
                          <button
                            type="button"
                            className={`${styles.btn} ${styles.quiet}`}
                            onClick={() => setConfirming(row.id)}
                            disabled={busy !== null}
                          >
                            Reject
                          </button>
                        </div>
                      ))}
                  </li>
                );
              })}
            </ol>
          </section>
        );
      })}
    </>
  );
}
