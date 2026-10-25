// Milestones: a candidate's program milestones (their parish's and the shared ones) in
// due-date order, those without a date last. Completed ones carry a gold seal and the
// date. Candidates only read; an adult picks a linked candidate and marks one complete:
// a date first, then a one-line confirm, then complete_milestone.
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { getSupabase, type Player } from './supabase';
import { shortDate, todayCentral } from './dates';
import Seal from './Seal';
import book from './book.module.css';
import styles from './Milestones.module.css';

export interface Milestone {
  code: string;
  title: string;
  due_on: string | null;
  parish: string | null;
  points: number;
  /** The badge's name, when the milestone awards one. */
  badge: string | null;
}

export interface Candidate {
  id: string;
  name: string;
  parish: string | null;
}

/** completed_on by milestone code. */
export type Completed = Record<string, string>;

async function loadMilestones(): Promise<Milestone[]> {
  const supabase = getSupabase();
  const [milestones, badges] = await Promise.all([
    supabase.from('milestones').select('code, title, due_on, parish, points, badge_code'),
    supabase.from('badges').select('code, name'),
  ]);
  const failed = milestones.error ?? badges.error;
  if (failed) throw new Error(failed.message);
  const badgeName = new Map(badges.data!.map((b) => [b.code as string, b.name as string]));
  return milestones
    .data!.map((m) => ({
      code: m.code,
      title: m.title,
      due_on: m.due_on,
      parish: m.parish,
      points: m.points,
      badge: m.badge_code ? (badgeName.get(m.badge_code) ?? null) : null,
    }))
    .sort(
      (a, b) =>
        (a.due_on === null ? 1 : 0) - (b.due_on === null ? 1 : 0) ||
        (a.due_on ?? '').localeCompare(b.due_on ?? '') ||
        a.title.localeCompare(b.title),
    );
}

async function loadCompleted(playerId: string): Promise<Completed> {
  const { data, error } = await getSupabase()
    .from('player_milestones')
    .select('milestone_code, completed_on')
    .eq('player_id', playerId);
  if (error) throw new Error(error.message);
  return Object.fromEntries(data.map((r) => [r.milestone_code as string, r.completed_on as string]));
}

/** Every linked candidate, sponsor or parent link, by name. */
async function loadLinked(me: Player): Promise<Candidate[]> {
  const supabase = getSupabase();
  const links = await supabase.from('player_links').select('candidate_id').eq('adult_id', me.id);
  if (links.error) throw new Error(links.error.message);
  const ids = [...new Set(links.data.map((l) => l.candidate_id as string))];
  if (!ids.length) return [];
  const people = await supabase.from('players').select('id, display_name, parish').in('id', ids);
  if (people.error) throw new Error(people.error.message);
  return people.data
    .map((p) => ({ id: p.id as string, name: p.display_name as string, parish: p.parish as string | null }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** The milestones that apply to a candidate: their parish's plus the shared ones. */
const forParish = (all: Milestone[], parish: string | null) =>
  all.filter((m) => m.parish === null || m.parish === parish);

type Load<T> = { kind: 'loading' } | { kind: 'ready'; data: T } | { kind: 'error'; message: string };

function failed(what: string, message: string) {
  return (
    <>
      <h1 className={book.heading}>Milestones</h1>
      <p className={book.error} role="alert">
        {what} didn’t load. The server said: {message}
      </p>
      <p className={book.prose}>Reload the page. If this keeps happening, tell the game admin.</p>
    </>
  );
}

export default function Milestones({ player }: { player: Player }) {
  const [load, setLoad] = useState<Load<{ milestones: Milestone[]; linked: Candidate[] }>>({ kind: 'loading' });

  useEffect(() => {
    let cancelled = false;
    Promise.all([loadMilestones(), player.is_candidate ? Promise.resolve([]) : loadLinked(player)]).then(
      ([milestones, linked]) => !cancelled && setLoad({ kind: 'ready', data: { milestones, linked } }),
      (err: Error) => !cancelled && setLoad({ kind: 'error', message: err.message }),
    );
    return () => {
      cancelled = true;
    };
  }, [player]);

  if (load.kind === 'loading') return <p className={book.fine}>Opening the milestones…</p>;
  if (load.kind === 'error') return failed('The milestones', load.message);
  const { milestones, linked } = load.data;
  if (player.is_candidate) {
    return <OwnMilestones player={player} milestones={forParish(milestones, player.parish)} />;
  }
  return <LinkedMilestones milestones={milestones} linked={linked} />;
}

/** One player's completions, loaded when the player changes; reload() after marking. */
function useCompleted(playerId: string | null) {
  const [state, setState] = useState<Load<Completed>>({ kind: 'loading' });
  const reload = useCallback(async () => {
    if (!playerId) return;
    try {
      setState({ kind: 'ready', data: await loadCompleted(playerId) });
    } catch (err) {
      setState({ kind: 'error', message: (err as Error).message });
    }
  }, [playerId]);
  useEffect(() => {
    setState({ kind: 'loading' });
    void reload();
  }, [reload]);
  return [state, reload] as const;
}

function OwnMilestones({ player, milestones }: { player: Player; milestones: Milestone[] }) {
  const [completed] = useCompleted(player.id);
  if (completed.kind === 'loading') return <p className={book.fine}>Opening the milestones…</p>;
  if (completed.kind === 'error') return failed('Your milestones', completed.message);
  return <MilestonesLeaf milestones={milestones} completed={completed.data} today={todayCentral()} />;
}

export type MarkResult = { points: number } | { error: string };

function LinkedMilestones({ milestones, linked }: { milestones: Milestone[]; linked: Candidate[] }) {
  const [chosenId, setChosenId] = useState<string | null>(linked[0]?.id ?? null);
  const [completed, reload] = useCompleted(chosenId);
  const chosen = linked.find((c) => c.id === chosenId) ?? null;

  async function mark(code: string, on: string): Promise<MarkResult> {
    const name = chosen!.name;
    const { data, error } = await getSupabase().rpc('complete_milestone', {
      p_player: chosen!.id,
      p_code: code,
      p_completed_on: on,
    });
    let result: MarkResult;
    if (error) {
      const m = error.message;
      result = m.includes('already complete')
        ? { error: `${name} already has this one.` }
        : m.includes('in the future')
          ? { error: 'The date can’t be in the future. Choose today or an earlier day.' }
          : m.includes('another parish')
            ? { error: `This milestone belongs to another parish, so it doesn’t apply to ${name}.` }
            : m === 'not allowed' || m.includes('not allowed')
              ? { error: `This wasn’t marked: you aren’t linked to ${name}. Ask the game admin to link you.` }
              : m.includes('only adults')
                ? { error: 'This wasn’t marked: only adults mark milestones.' }
                : m.includes('for candidates')
                  ? { error: `This wasn’t marked: ${name} isn’t a candidate. Tell the game admin.` }
                  : m.includes('unknown milestone')
                    ? { error: 'This wasn’t marked: the game doesn’t know this milestone. Tell the game admin.' }
                    : { error: `This wasn’t marked. The server said: ${m}. Try again; if it keeps happening, tell the game admin.` };
    } else if (typeof data !== 'number') {
      result = { error: 'complete_milestone didn’t return the points awarded. This doesn’t match the backend contract; tell the game admin.' };
    } else {
      result = { points: data };
    }
    // Refresh either way: "already complete" means someone else marked it meanwhile.
    await reload();
    return result;
  }

  if (!linked.length) {
    return (
      <>
        <h1 className={book.heading}>Milestones</h1>
        <p className={book.prose}>
          You aren’t linked to a candidate yet, so there are no milestones to show. Ask the game admin to link you.
        </p>
      </>
    );
  }
  return (
    <MilestonesLeaf
      milestones={forParish(milestones, chosen!.parish)}
      completed={completed.kind === 'ready' ? completed.data : null}
      completedError={completed.kind === 'error' ? completed.message : null}
      today={todayCentral()}
      adult={{ linked, chosen: chosen!, onChoose: setChosenId, onMark: mark }}
    />
  );
}

interface AdultProps {
  linked: Candidate[];
  chosen: Candidate;
  onChoose: (id: string) => void;
  onMark: (code: string, on: string) => Promise<MarkResult>;
}

type Step = { code: string; stage: 'date' | 'confirm'; date: string };

interface LeafProps {
  milestones: Milestone[];
  /** null while loading (adults switching candidates). */
  completed: Completed | null;
  completedError?: string | null;
  today: string;
  adult?: AdultProps;
  /** Dev-only screenshots. */
  preview?: { step?: Step; results?: Record<string, string>; errors?: Record<string, string> };
}

const pts = (n: number) => `${n} ${n === 1 ? 'point' : 'points'}`;

export function MilestonesLeaf({ milestones, completed, completedError, today, adult, preview }: LeafProps) {
  const [step, setStep] = useState<Step | null>(preview?.step ?? null);
  const [dateError, setDateError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Keyed by candidate and milestone, so switching candidates doesn't carry them over.
  const [results, setResults] = useState<Record<string, string>>(preview?.results ?? {});
  const [errors, setErrors] = useState<Record<string, string>>(preview?.errors ?? {});
  const [stamped, setStamped] = useState<string | null>(null);
  const resultRefs = useRef(new Map<string, HTMLElement>());
  const askRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (stamped) resultRefs.current.get(stamped)?.focus();
  }, [stamped, completed]);
  // Move focus to the question when the date step gives way to it (not on first render).
  const firstRender = useRef(true);
  useEffect(() => {
    if (!firstRender.current && step?.stage === 'confirm') askRef.current?.focus();
    firstRender.current = false;
  }, [step?.stage, step?.code]);

  const who = adult?.chosen;
  const keyOf = (code: string) => `${who?.id ?? 'me'}:${code}`;
  const done = completed ? milestones.filter((m) => completed[m.code]).length : 0;

  function toConfirm(e: FormEvent) {
    e.preventDefault();
    if (!step) return;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(step.date)) {
      setDateError('Enter the date it was completed.');
      return;
    }
    if (step.date > today) {
      setDateError('The date can’t be in the future.');
      return;
    }
    setDateError(null);
    setStep({ ...step, stage: 'confirm' });
  }

  async function mark(m: Milestone) {
    if (!adult || !step) return;
    const key = keyOf(m.code);
    setBusy(true);
    setErrors(({ [key]: _, ...rest }) => rest);
    const outcome = await adult.onMark(m.code, step.date);
    setBusy(false);
    setStep(null);
    if ('error' in outcome) {
      setErrors((e) => ({ ...e, [key]: outcome.error }));
      return;
    }
    const badge = m.badge ? `, and the ${m.badge} badge` : '';
    setResults((r) => ({ ...r, [key]: `+${outcome.points} for ${adult.chosen.name}${badge}` }));
    setStamped(key);
  }

  return (
    <>
      <h1 className={book.heading}>Milestones</h1>

      {adult && adult.linked.length > 1 && (
        <div role="group" aria-label="Whose milestones" className={styles.people}>
          {adult.linked.map((c) => (
            <button
              key={c.id}
              type="button"
              aria-pressed={c.id === adult.chosen.id}
              className={styles.person}
              onClick={() => {
                setStep(null);
                adult.onChoose(c.id);
              }}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}

      {completedError && (
        <p className={book.error} role="alert">
          {who ? `${who.name}’s milestones` : 'Your milestones'} didn’t load. The server said: {completedError}. Reload
          the page; if this keeps happening, tell the game admin.
        </p>
      )}
      {!completed && !completedError && <p className={book.fine}>Opening {who ? `${who.name}’s` : 'the'} milestones…</p>}

      {completed && milestones.length === 0 && (
        <p className={book.prose}>There are no milestones set up yet. The game admin adds them.</p>
      )}

      {completed && milestones.length > 0 && (
        <>
          <p className={styles.tally}>
            {who
              ? `${who.name} has completed ${done} of ${milestones.length}.`
              : `${done} of ${milestones.length} completed.`}
          </p>
          {who && <p className={book.fine}>Mark a milestone when {who.name} has completed it.</p>}

          <ol className={styles.ledger} aria-label={who ? `${who.name}’s milestones` : 'Your milestones'}>
            {milestones.map((m) => {
              const on = completed[m.code];
              const key = keyOf(m.code);
              const open = step?.code === m.code ? step : null;
              const worth = `${pts(m.points)}${m.badge ? `, and the ${m.badge} badge` : ''}`;
              return (
                <li key={m.code} className={styles.entry}>
                  <div className={styles.what}>
                    <span className={styles.name}>{m.title}</span>
                    <span className={styles.detail}>
                      {on ? `Completed ${shortDate(on)}` : m.due_on ? `Due ${shortDate(m.due_on)}` : 'No date set'}
                    </span>
                    <span className={styles.detail}>{worth}</span>
                    {results[key] && (
                      <span
                        className={styles.result}
                        tabIndex={-1}
                        ref={(el) => {
                          if (el) resultRefs.current.set(key, el);
                          else resultRefs.current.delete(key);
                        }}
                      >
                        {results[key]}
                      </span>
                    )}
                    {errors[key] && (
                      <p className={`${book.error} ${styles.entryError}`} role="alert">
                        {errors[key]}
                      </p>
                    )}
                  </div>
                  {on ? (
                    <Seal status="approved" points={m.points} stamp={stamped === key || !!preview?.results?.[key]} />
                  ) : (
                    <Seal status="pending" />
                  )}

                  {adult && !on && !open && (
                    <div className={styles.actions}>
                      <button
                        type="button"
                        className={`${styles.btn} ${styles.quiet}`}
                        disabled={busy}
                        onClick={() => {
                          setDateError(null);
                          setStep({ code: m.code, stage: 'date', date: today });
                        }}
                      >
                        Mark complete
                      </button>
                    </div>
                  )}

                  {adult && !on && open?.stage === 'date' && (
                    <form className={styles.actions} onSubmit={toConfirm} noValidate>
                      <label className={styles.dateField}>
                        <span className={book.label}>Completed on</span>
                        <input
                          type="date"
                          className={`${book.input} ${styles.dateInput}`}
                          value={open.date}
                          max={today}
                          onChange={(e) => setStep({ ...open, date: e.target.value })}
                          aria-invalid={dateError ? true : undefined}
                          aria-describedby={dateError ? `cq-ms-err-${m.code}` : undefined}
                        />
                      </label>
                      {dateError && (
                        <p id={`cq-ms-err-${m.code}`} className={`${book.error} ${styles.entryError}`} role="alert">
                          {dateError}
                        </p>
                      )}
                      <div className={styles.buttons}>
                        <button type="submit" className={`${styles.btn} ${styles.primary}`}>
                          Continue
                        </button>
                        <button type="button" className={`${styles.btn} ${styles.quiet}`} onClick={() => setStep(null)}>
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}

                  {adult && !on && open?.stage === 'confirm' && (
                    <div className={styles.actions}>
                      <p className={styles.ask} ref={askRef} tabIndex={-1}>
                        Mark {m.title} complete for {adult.chosen.name} on {shortDate(open.date)}?
                      </p>
                      <div className={styles.buttons}>
                        <button
                          type="button"
                          className={`${styles.btn} ${styles.primary}`}
                          onClick={() => mark(m)}
                          disabled={busy}
                        >
                          {busy ? 'Marking…' : 'Mark complete'}
                        </button>
                        <button
                          type="button"
                          className={`${styles.btn} ${styles.quiet}`}
                          onClick={() => setStep(null)}
                          disabled={busy}
                        >
                          Not yet
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        </>
      )}
    </>
  );
}
