// Prayers: the prayer-* activity types in sort order, each recited (a gold seal with the
// date) or not yet (an empty ring). Recited means an approved activity of that type.
// Candidates see their own; an adult picks a linked candidate and records the prayers
// they heard through record_prayer. No prayer texts in Phase 1.
import { useCallback, useEffect, useRef, useState } from 'react';
import { getSupabase, type Player } from './supabase';
import { shortDate } from './dates';
import { TYPE_COLUMNS, type ActivityType } from './activities';
import Seal from './Seal';
import book from './book.module.css';
import styles from './Prayers.module.css';

export interface Recital {
  date: string;
  points: number | null;
}
/** Recitals by prayer code. */
export type Recited = Record<string, Recital>;

export interface Linked {
  id: string;
  name: string;
  sponsor: boolean;
}

async function loadPrayers(): Promise<ActivityType[]> {
  const { data, error } = await getSupabase()
    .from('activity_types')
    .select(TYPE_COLUMNS)
    .eq('category', 'prayer')
    .eq('active', true)
    .order('sort')
    .order('name');
  if (error) throw new Error(error.message);
  return data as ActivityType[];
}

async function loadRecited(playerId: string, codes: string[]): Promise<Recited> {
  const { data, error } = await getSupabase()
    .from('activities')
    .select('type_code, occurred_on, points_awarded')
    .eq('player_id', playerId)
    .eq('status', 'approved')
    .in('type_code', codes);
  if (error) throw new Error(error.message);
  const out: Recited = {};
  for (const r of data) out[r.type_code] = { date: r.occurred_on, points: r.points_awarded };
  return out;
}

/** The adult's linked candidates, sponsor or parent, by name. */
async function loadLinked(me: Player): Promise<Linked[]> {
  const supabase = getSupabase();
  const links = await supabase.from('player_links').select('candidate_id, kind').eq('adult_id', me.id);
  if (links.error) throw new Error(links.error.message);
  const ids = [...new Set(links.data.map((l) => l.candidate_id as string))];
  if (!ids.length) return [];
  const people = await supabase.from('players').select('id, display_name').in('id', ids);
  if (people.error) throw new Error(people.error.message);
  return people.data
    .map((p) => ({
      id: p.id as string,
      name: p.display_name as string,
      sponsor: links.data.some((l) => l.candidate_id === p.id && l.kind === 'sponsor'),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

type Load<T> = { kind: 'loading' } | { kind: 'ready'; data: T } | { kind: 'error'; message: string };

const theName = (prayer: string) => (/^the /i.test(prayer) ? prayer : `the ${prayer}`);

function failed(what: string, message: string) {
  return (
    <>
      <h1 className={book.heading}>Prayers</h1>
      <p className={book.error} role="alert">
        {what} didn’t load. The server said: {message}
      </p>
      <p className={book.prose}>Reload the page. If this keeps happening, tell the game admin.</p>
    </>
  );
}

export default function Prayers({ player }: { player: Player }) {
  const [load, setLoad] = useState<Load<{ prayers: ActivityType[]; linked: Linked[] }>>({ kind: 'loading' });

  useEffect(() => {
    let cancelled = false;
    Promise.all([loadPrayers(), player.is_candidate ? Promise.resolve([]) : loadLinked(player)]).then(
      ([prayers, linked]) => !cancelled && setLoad({ kind: 'ready', data: { prayers, linked } }),
      (err: Error) => !cancelled && setLoad({ kind: 'error', message: err.message }),
    );
    return () => {
      cancelled = true;
    };
  }, [player]);

  if (load.kind === 'loading') return <p className={book.fine}>Opening the prayers…</p>;
  if (load.kind === 'error') return failed('The prayers', load.message);
  const { prayers, linked } = load.data;
  return player.is_candidate ? (
    <OwnPrayers player={player} prayers={prayers} />
  ) : (
    <HeardPrayers prayers={prayers} linked={linked} />
  );
}

/** The recitals for one player, loaded when the player changes; reload() after recording. */
function useRecited(playerId: string | null, prayers: ActivityType[]) {
  const [state, setState] = useState<Load<Recited>>({ kind: 'loading' });
  const codes = prayers.map((p) => p.code);
  const key = codes.join(',');

  const reload = useCallback(async () => {
    if (!playerId) return;
    try {
      const data = await loadRecited(playerId, key.split(','));
      setState({ kind: 'ready', data });
    } catch (err) {
      setState({ kind: 'error', message: (err as Error).message });
    }
  }, [playerId, key]);

  useEffect(() => {
    setState({ kind: 'loading' });
    void reload();
  }, [reload]);

  return [state, reload] as const;
}

function OwnPrayers({ player, prayers }: { player: Player; prayers: ActivityType[] }) {
  const [recited] = useRecited(player.id, prayers);
  if (recited.kind === 'loading') return <p className={book.fine}>Opening the prayers…</p>;
  if (recited.kind === 'error') return failed('Your prayers', recited.message);
  return <PrayersLeaf prayers={prayers} recited={recited.data} />;
}

function HeardPrayers({ prayers, linked }: { prayers: ActivityType[]; linked: Linked[] }) {
  const [chosenId, setChosenId] = useState<string | null>(linked[0]?.id ?? null);
  const [recited, reload] = useRecited(chosenId, prayers);
  const chosen = linked.find((c) => c.id === chosenId) ?? null;

  async function record(code: string): Promise<{ points: number } | { error: string; refresh?: boolean }> {
    const name = chosen!.name;
    const { data, error } = await getSupabase().rpc('record_prayer', { p_candidate: chosen!.id, p_prayer: code });
    let result: { points: number } | { error: string };
    if (error) {
      const m = error.message;
      result = m.includes('already recited')
        ? { error: `${name} has already recited this one.` }
        : m.includes('not linked')
          ? { error: `This wasn’t recorded: you aren’t linked to ${name}. Ask the game admin to link you.` }
          : m.includes('only adults')
            ? { error: 'This wasn’t recorded: only adults record prayers.' }
            : m.includes('unknown prayer')
              ? { error: 'This wasn’t recorded: the game doesn’t know this prayer. Tell the game admin.' }
              : { error: `This wasn’t recorded. The server said: ${m}. Try again; if it keeps happening, tell the game admin.` };
    } else if (typeof data !== 'number') {
      result = { error: 'record_prayer didn’t return the points awarded. This doesn’t match the backend contract; tell the game admin.' };
    } else {
      result = { points: data };
    }
    // Refresh either way: "already recited" means someone else recorded it meanwhile.
    await reload();
    return result;
  }

  if (!linked.length) {
    return (
      <>
        <h1 className={book.heading}>Prayers</h1>
        <p className={book.prose}>
          You aren’t linked to a candidate yet, so there are no prayers to record. Ask the game admin to link you.
        </p>
      </>
    );
  }

  return (
    <PrayersLeaf
      prayers={prayers}
      recited={recited.kind === 'ready' ? recited.data : null}
      recitedError={recited.kind === 'error' ? recited.message : null}
      adult={{ linked, chosen: chosen!, onChoose: setChosenId, onRecord: record }}
    />
  );
}

interface AdultProps {
  linked: Linked[];
  chosen: Linked;
  onChoose: (id: string) => void;
  onRecord: (code: string) => Promise<{ points: number } | { error: string }>;
}

interface LeafProps {
  prayers: ActivityType[];
  /** null while loading (adults switching candidates). */
  recited: Recited | null;
  recitedError?: string | null;
  adult?: AdultProps;
  /** Dev-only screenshots. */
  preview?: { confirming?: string; results?: Record<string, string>; errors?: Record<string, string> };
}

export function PrayersLeaf({ prayers, recited, recitedError, adult, preview }: LeafProps) {
  const [confirming, setConfirming] = useState<string | null>(preview?.confirming ?? null);
  const [busy, setBusy] = useState<string | null>(null);
  // Keyed by candidate and prayer, so switching candidates doesn't carry them over.
  const [results, setResults] = useState<Record<string, string>>(preview?.results ?? {});
  const [errors, setErrors] = useState<Record<string, string>>(preview?.errors ?? {});
  const [stamped, setStamped] = useState<string | null>(null);
  const resultRefs = useRef(new Map<string, HTMLElement>());

  useEffect(() => {
    if (stamped) resultRefs.current.get(stamped)?.focus();
  }, [stamped, recited]);

  const who = adult?.chosen;
  const keyOf = (code: string) => `${who?.id ?? 'me'}:${code}`;
  const count = recited ? prayers.filter((p) => recited[p.code]).length : null;

  async function record(code: string) {
    if (!adult) return;
    const key = keyOf(code);
    setBusy(code);
    setErrors(({ [key]: _, ...rest }) => rest);
    const outcome = await adult.onRecord(code);
    setBusy(null);
    setConfirming(null);
    if ('error' in outcome) {
      setErrors((e) => ({ ...e, [key]: outcome.error }));
      return;
    }
    const bonus = adult.chosen.sponsor && outcome.points > 0 ? ' and +5 to you as their sponsor' : '';
    setResults((r) => ({ ...r, [key]: `+${outcome.points} for ${adult.chosen.name}${bonus}` }));
    setStamped(key);
  }

  return (
    <>
      <h1 className={book.heading}>Prayers</h1>

      {adult && adult.linked.length > 1 && (
        <div role="group" aria-label="Whose prayers" className={styles.people}>
          {adult.linked.map((c) => (
            <button
              key={c.id}
              type="button"
              aria-pressed={c.id === adult.chosen.id}
              className={styles.person}
              onClick={() => {
                setConfirming(null);
                adult.onChoose(c.id);
              }}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}

      {recitedError && (
        <p className={book.error} role="alert">
          {who ? `${who.name}’s prayers` : 'Your prayers'} didn’t load. The server said: {recitedError}. Reload the
          page; if this keeps happening, tell the game admin.
        </p>
      )}
      {!recited && !recitedError && <p className={book.fine}>Opening {who ? `${who.name}’s` : 'the'} prayers…</p>}

      {recited && (
        <>
          <p className={styles.tally}>
            {who ? `${who.name} has recited ${count} of ${prayers.length}.` : `${count} of ${prayers.length} recited.`}
          </p>
          <p className={book.fine}>
            {who
              ? `When ${who.name} recites a prayer to you, record it here.`
              : 'Recite a prayer to your sponsor or parent. They record it here.'}
          </p>

          <ol className={styles.ledger} aria-label={who ? `${who.name}’s prayers` : 'Your prayers'}>
            {prayers.map((p) => {
              const done = recited[p.code];
              const key = keyOf(p.code);
              return (
                <li key={p.code} className={styles.entry}>
                  <div className={styles.what}>
                    <span className={styles.name}>{p.name}</span>
                    <span className={styles.status}>{done ? `Recited ${shortDate(done.date)}` : 'Not yet'}</span>
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
                  {done ? (
                    <Seal status="approved" points={done.points} stamp={stamped === key || !!preview?.results?.[key]} />
                  ) : (
                    <Seal status="pending" />
                  )}

                  {adult && !done && (
                    confirming === p.code ? (
                      <div className={styles.actions}>
                        <span className={styles.ask}>
                          Record that {adult.chosen.name} recited {theName(p.name)}?
                        </span>
                        <button
                          type="button"
                          className={`${styles.btn} ${styles.primary}`}
                          onClick={() => record(p.code)}
                          disabled={busy === p.code}
                        >
                          {busy === p.code ? 'Recording…' : 'Record'}
                        </button>
                        <button
                          type="button"
                          className={`${styles.btn} ${styles.quiet}`}
                          onClick={() => setConfirming(null)}
                          disabled={busy === p.code}
                        >
                          Not yet
                        </button>
                      </div>
                    ) : (
                      <div className={styles.actions}>
                        <button
                          type="button"
                          className={`${styles.btn} ${styles.quiet}`}
                          onClick={() => setConfirming(p.code)}
                          disabled={busy !== null}
                        >
                          I heard it
                        </button>
                      </div>
                    )
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
