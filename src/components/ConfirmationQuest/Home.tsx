// Home: the player's illuminated name, their gift (level), their points, what's
// coming up, and for adults how many activities wait for their approval.
import { useEffect, useState } from 'react';
import { getSupabase, type Player } from './supabase';
import { todayCentral, addDays, dueWords } from './dates';
import { GIFTS, ORDINALS, levelFor, type Level } from './levels';
import { useSignOut } from './useSignOut';
import IlluminatedTitle from './IlluminatedTitle';
import Fleuron from './Fleuron';
import book from './book.module.css';
import styles from './Home.module.css';

interface Due {
  title: string;
  dueOn: string;
}

export interface HomeData {
  lifetime: number;
  season: { name: string; points: number } | null;
  /** A candidate's own next milestone, or null when nothing is due. */
  ownNext: Due | null;
  /** Adults: each linked candidate's next milestone, by name. Empty when none are linked. */
  candidates: { id: string; name: string; next: Due | null }[];
}

type Load = { kind: 'loading' } | { kind: 'ready'; data: HomeData } | { kind: 'error'; message: string };

interface MilestoneRow {
  code: string;
  title: string;
  due_on: string;
  parish: string | null;
}

/** The first milestone, in due order, for this parish that this player hasn't completed. */
function nextFor(milestones: MilestoneRow[], parish: string | null, completed: Set<string>): Due | null {
  const m = milestones.find(
    (row) => (row.parish === null || row.parish === parish) && !completed.has(row.code),
  );
  return m ? { title: m.title, dueOn: m.due_on } : null;
}

async function loadHome(player: Player, today: string): Promise<HomeData> {
  const supabase = getSupabase();
  // An adult's "coming up" is about their linked candidates, so find them first.
  let candidateIds = [player.id];
  if (!player.is_candidate) {
    const links = await supabase.from('player_links').select('candidate_id').eq('adult_id', player.id);
    if (links.error) throw new Error(links.error.message);
    candidateIds = [...new Set(links.data.map((l) => l.candidate_id as string))];
  }

  const [seasons, board, milestones, done, people] = await Promise.all([
    supabase
      .from('seasons')
      .select('code, name')
      .lte('starts_on', today)
      .gte('ends_on', today)
      .order('starts_on', { ascending: false })
      .limit(1),
    supabase.from('leaderboard_individual').select('season, points').eq('player_id', player.id),
    supabase
      .from('milestones')
      .select('code, title, due_on, parish')
      .gte('due_on', today)
      .lte('due_on', addDays(today, 14))
      .order('due_on'),
    supabase.from('player_milestones').select('player_id, milestone_code').in('player_id', candidateIds),
    player.is_candidate
      ? Promise.resolve({ data: [] as { id: string; display_name: string; parish: string | null }[], error: null })
      : supabase.from('players').select('id, display_name, parish').in('id', candidateIds),
  ]);
  const failed = seasons.error ?? board.error ?? milestones.error ?? done.error ?? people.error;
  if (failed) throw new Error(failed.message);

  const pointsFor = (code: string) => board.data!.find((r) => r.season === code)?.points;
  const lifetime = pointsFor('lifetime');
  if (lifetime === undefined) throw new Error('No lifetime row for this player in leaderboard_individual.');

  const completedBy = (id: string) =>
    new Set(done.data!.filter((r) => r.player_id === id).map((r) => r.milestone_code as string));
  const rows = milestones.data as MilestoneRow[];
  const current = seasons.data![0];

  return {
    lifetime,
    season: current ? { name: current.name, points: pointsFor(current.code) ?? 0 } : null,
    ownNext: player.is_candidate ? nextFor(rows, player.parish, completedBy(player.id)) : null,
    candidates: people
      .data!.slice()
      .sort((a, b) => a.display_name.localeCompare(b.display_name))
      .map((c) => ({ id: c.id, name: c.display_name, next: nextFor(rows, c.parish, completedBy(c.id)) })),
  };
}

interface Props {
  player: Player;
  email?: string;
  pendingCount: number | null;
  onOpenApprove: () => void;
  onOpenMilestones: () => void;
}

export default function Home({ player, email, pendingCount, onOpenApprove, onOpenMilestones }: Props) {
  const [today] = useState(todayCentral);
  const [load, setLoad] = useState<Load>({ kind: 'loading' });

  useEffect(() => {
    let cancelled = false;
    loadHome(player, today).then(
      (data) => !cancelled && setLoad({ kind: 'ready', data }),
      (err: Error) => !cancelled && setLoad({ kind: 'error', message: err.message }),
    );
    return () => {
      cancelled = true;
    };
  }, [player, today]);

  if (load.kind === 'loading') return <p className={book.fine}>Opening your page…</p>;
  if (load.kind === 'error') {
    return (
      <>
        <IlluminatedTitle text={player.display_name} />
        <p className={`${book.error} ${styles.gap}`} role="alert">
          Your points didn’t load. The server said: {load.message}
        </p>
        <p className={book.prose}>Reload the page. If this keeps happening, tell the game admin.</p>
      </>
    );
  }
  return (
    <HomeLeaf
      player={player}
      email={email}
      data={load.data}
      today={today}
      pendingCount={pendingCount}
      onOpenApprove={onOpenApprove}
      onOpenMilestones={onOpenMilestones}
    />
  );
}

interface LeafProps {
  player: Pick<Player, 'display_name' | 'is_candidate' | 'level_scale'>;
  email?: string;
  data: HomeData;
  today: string;
  pendingCount: number | null;
  onOpenApprove: () => void;
  onOpenMilestones: () => void;
}

const fmt = (n: number) => n.toLocaleString('en-US');
const dueSentence = (due: Due | null, today: string) =>
  due ? `${due.title}, due ${dueWords(due.dueOn, today)}.` : 'Nothing is due in the next two weeks.';
/** Keep a name's last word with the one before it ("Fall 2026" never splits). */
const keepTail = (s: string) => s.replace(/ (\S+)$/, ' $1');

export function HomeLeaf({ player, email, data, today, pendingCount, onOpenApprove, onOpenMilestones }: LeafProps) {
  const level = levelFor(data.lifetime, Number(player.level_scale));
  const { signOut, busy, error } = useSignOut();

  return (
    <>
      <IlluminatedTitle text={player.display_name} />

      <section className={styles.gift} aria-labelledby="cq-gift">
        <p id="cq-gift" className={styles.giftName}>
          {level.name}
        </p>
        <GiftRoundels level={level} />
        <p className={styles.giftLine}>
          {level.next
            ? `The ${ORDINALS[level.index]} of the seven gifts. ${fmt(level.next.toGo)} ${
                level.next.toGo === 1 ? 'point' : 'points'
              } to ${level.next.name}.`
            : 'The seventh and last of the seven gifts.'}
        </p>
      </section>

      <p className={styles.points}>
        {fmt(data.lifetime)} {data.lifetime === 1 ? 'point' : 'points'} in all
        {data.season ? `, ${fmt(data.season.points)} of them in ${keepTail(data.season.name)}.` : '.'}
      </p>

      <Fleuron />

      <section aria-labelledby="cq-next">
        <h2 id="cq-next" className={styles.subhead}>
          Coming up
        </h2>
        {player.is_candidate ? (
          <p className={book.prose}>{dueSentence(data.ownNext, today)}</p>
        ) : data.candidates.length === 0 ? (
          <p className={book.prose}>No candidates are linked to you yet. Ask the game admin to link them.</p>
        ) : (
          <dl className={styles.dueList}>
            {data.candidates.map((c) => (
              <div key={c.id} className={styles.dueItem}>
                <dt className={styles.dueName}>{c.name}</dt>
                <dd className={styles.dueWhat}>{dueSentence(c.next, today)}</dd>
              </div>
            ))}
          </dl>
        )}
        {(player.is_candidate || data.candidates.length > 0) && (
          <p className={book.prose}>
            <button type="button" className={styles.inlineLink} onClick={onOpenMilestones}>
              See all milestones
            </button>
          </p>
        )}
      </section>

      {!player.is_candidate && (
        <section aria-labelledby="cq-approve">
          <h2 id="cq-approve" className={styles.subhead}>
            Waiting for you
          </h2>
          {pendingCount === null ? (
            <p className={book.fine}>Checking for activities to approve…</p>
          ) : pendingCount === 0 ? (
            <p className={book.prose}>Nothing is waiting for your approval.</p>
          ) : (
            <p className={book.prose}>
              {pendingCount === 1
                ? '1 activity is waiting for your approval. '
                : `${pendingCount} activities are waiting for your approval. `}
              <button type="button" className={styles.inlineLink} onClick={onOpenApprove}>
                Review {pendingCount === 1 ? 'it' : 'them'}
              </button>
            </p>
          )}
        </section>
      )}

      <div className={styles.footer}>
        {error && (
          <p className={book.error} role="alert">
            {error}
          </p>
        )}
        <p className={book.fine}>
          {email ? `Signed in as ${email}. ` : ''}
          <button type="button" className={book.link} onClick={signOut} disabled={busy}>
            {busy ? 'Signing out…' : 'Sign out'}
          </button>
        </p>
      </div>
    </>
  );
}

// Seven roundels, one per gift: gold when reached, a gold ring with a season-green arc
// for the gift in progress, a faint ring for gifts ahead. The text beside it carries
// the same information, so the drawing is hidden from screen readers.
function GiftRoundels({ level }: { level: Level }) {
  const r = 9;
  const c = 2 * Math.PI * r;
  return (
    <svg
      className={styles.roundels}
      viewBox={`0 0 ${GIFTS.length * 30} 26`}
      aria-hidden="true"
      focusable="false"
    >
      {GIFTS.map((g, i) => {
        const cx = 15 + i * 30;
        if (i < level.index || (i === level.index && !level.next)) {
          return (
            <g key={g.name}>
              <circle cx={cx} cy={13} r={r + 1} className={styles.reached} />
              <circle cx={cx} cy={13} r={r - 3.5} className={styles.reachedInner} />
            </g>
          );
        }
        if (i === level.index) {
          return (
            <g key={g.name}>
              <circle cx={cx} cy={13} r={r} className={styles.currentRing} />
              <circle
                cx={cx}
                cy={13}
                r={r}
                className={styles.currentArc}
                strokeDasharray={`${(level.progress * c).toFixed(2)} ${c.toFixed(2)}`}
                transform={`rotate(-90 ${cx} 13)`}
              />
              <circle cx={cx} cy={13} r={2.2} className={styles.reached} />
            </g>
          );
        }
        return <circle key={g.name} cx={cx} cy={13} r={r} className={styles.ahead} />;
      })}
    </svg>
  );
}
