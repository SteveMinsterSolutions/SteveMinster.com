// Seals: the badges a player has earned, as gold wax seals with the date, and (for a
// candidate) the ones their parish could still earn, as faint outlines with the goal.
// Read only: the database awards seals. An adult picks a linked candidate, or "Yours"
// for the seals they've earned themselves (adults can't earn milestone seals, so no
// locked ones are listed for them).
import { useEffect, useState } from 'react';
import { type Player } from './supabase';
import { loadLinked } from './Milestones';
import { loadBadges, loadEarned, sealsFor, isNew, earnedDate, useStampOnce, type Badge, type Earned } from './badges';
import WaxSeal from './WaxSeal';
import book from './book.module.css';
import styles from './Seals.module.css';

/** Whose seals are on the page. name is null for the viewer's own. */
export interface Subject {
  id: string;
  name: string | null;
  parish: string | null;
  /** Adults' own seals: earned ones only. */
  earnedOnly: boolean;
}

type Load =
  | { kind: 'loading' }
  | { kind: 'ready'; badges: Badge[]; subjects: Subject[]; earned: Record<string, Earned> }
  | { kind: 'error'; message: string };

async function loadSeals(player: Player) {
  const linked = player.is_candidate ? [] : await loadLinked(player);
  const subjects: Subject[] = player.is_candidate
    ? [{ id: player.id, name: null, parish: player.parish, earnedOnly: false }]
    : [
        ...linked.map((c) => ({ id: c.id, name: c.name, parish: c.parish, earnedOnly: false })),
        { id: player.id, name: null, parish: player.parish, earnedOnly: true },
      ];
  const [badges, earned] = await Promise.all([loadBadges(), loadEarned(subjects.map((s) => s.id))]);
  return { badges, subjects, earned };
}

export default function Seals({ player }: { player: Player }) {
  const [load, setLoad] = useState<Load>({ kind: 'loading' });

  useEffect(() => {
    let cancelled = false;
    loadSeals(player).then(
      (data) => !cancelled && setLoad({ kind: 'ready', ...data }),
      (err: Error) => !cancelled && setLoad({ kind: 'error', message: err.message }),
    );
    return () => {
      cancelled = true;
    };
  }, [player]);

  if (load.kind === 'loading') return <p className={book.fine}>Opening the seals…</p>;
  if (load.kind === 'error') {
    return (
      <>
        <h1 className={book.heading}>Seals</h1>
        <p className={book.error} role="alert">
          The seals didn’t load. The server said: {load.message}
        </p>
        <p className={book.prose}>Reload the page. If this keeps happening, tell the game admin.</p>
      </>
    );
  }
  return <SealsLeaf viewerId={player.id} badges={load.badges} subjects={load.subjects} earned={load.earned} />;
}

interface LeafProps {
  viewerId: string;
  badges: Badge[];
  subjects: Subject[];
  earned: Record<string, Earned>;
  /** Dev previews pin the clock so "New" is stable. */
  now?: number;
}

export function SealsLeaf({ viewerId, badges, subjects, earned, now }: LeafProps) {
  const [chosenId, setChosenId] = useState(subjects[0].id);
  const chosen = subjects.find((s) => s.id === chosenId) ?? subjects[0];

  return (
    <>
      <h1 className={book.heading}>Seals</h1>

      {subjects.length > 1 && (
        <div role="group" aria-label="Whose seals" className={styles.people}>
          {subjects.map((s) => (
            <button
              key={s.id}
              type="button"
              aria-pressed={s.id === chosen.id}
              className={styles.person}
              onClick={() => setChosenId(s.id)}
            >
              {s.name ?? 'Yours'}
            </button>
          ))}
        </div>
      )}

      {/* Keyed so each player's new seals are worked out (and stamped) on first view. */}
      <SealList
        key={chosen.id}
        viewerId={viewerId}
        subject={chosen}
        entries={sealsFor(badges, chosen.parish, earned[chosen.id] ?? {}, chosen.earnedOnly)}
        now={now ?? Date.now()}
      />
    </>
  );
}

interface ListProps {
  viewerId: string;
  subject: Subject;
  entries: ReturnType<typeof sealsFor>;
  now: number;
}

const seals = (n: number) => `${n} ${n === 1 ? 'seal' : 'seals'}`;

function SealList({ viewerId, subject, entries, now }: ListProps) {
  const won = entries.filter((e) => e.awardedAt);
  const open = entries.filter((e) => !e.awardedAt);
  const stamp = useStampOnce(
    viewerId,
    subject.id,
    won.filter((e) => isNew(e.awardedAt, now)).map((e) => e.code),
  );
  const own = subject.name === null;

  if (subject.earnedOnly) {
    return (
      <>
        <p className={styles.tally}>
          {won.length ? `You have earned ${seals(won.length)}.` : 'You haven’t earned any seals yet.'}
        </p>
        {won.length > 0 && <Entries list={won} stamp={stamp} now={now} label="Your seals" />}
      </>
    );
  }

  if (!entries.length) {
    return <p className={book.prose}>There are no seals set up yet. The game admin adds them.</p>;
  }

  return (
    <>
      <p className={styles.tally}>
        {own
          ? `${won.length} of ${seals(entries.length)}.`
          : `${subject.name} has ${won.length} of ${seals(entries.length)}.`}
      </p>
      {own && won.length === 0 && <p className={book.fine}>No seals yet. Your first one is closer than you think.</p>}
      {won.length > 0 && (
        <Entries list={won} stamp={stamp} now={now} label={own ? 'Seals you’ve earned' : `Seals ${subject.name} has earned`} />
      )}
      {open.length > 0 && (
        <>
          {won.length > 0 && <h2 className={styles.subhead}>Still to earn</h2>}
          <Entries list={open} stamp={stamp} now={now} label="Seals still to earn" />
        </>
      )}
    </>
  );
}

function Entries({ list, stamp, now, label }: { list: ListProps['entries']; stamp: Set<string>; now: number; label: string }) {
  return (
    <ul className={styles.ledger} aria-label={label}>
      {list.map((e) => {
        const fresh = isNew(e.awardedAt, now);
        return (
          <li key={e.code} className={styles.entry}>
            <WaxSeal icon={e.icon} earned={!!e.awardedAt} size={48} stamp={stamp.has(e.code)} />
            <div className={styles.what}>
              <span className={`${styles.name} ${e.awardedAt ? '' : styles.openName}`}>
                {e.name}
                {fresh && <span className={styles.new}>New</span>}
              </span>
              {e.awardedAt ? (
                <span className={styles.detail}>Earned {earnedDate(e.awardedAt)}</span>
              ) : (
                <span className={styles.detail}>
                  <span className={styles.srOnly}>Not yet earned. </span>
                  {e.description}
                </span>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
