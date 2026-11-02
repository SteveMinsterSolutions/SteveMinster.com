// Home: the player's illuminated name, their gift (level), their points, what's
// coming up, and for adults how many activities wait for their approval.
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { getSupabase, type Player } from './supabase';
import { todayCentral, addDays, dueWords } from './dates';
import { GIFTS, ORDINALS, levelFor, type Level } from './levels';
import { useSignOut } from './useSignOut';
import IlluminatedTitle from './IlluminatedTitle';
import Fleuron from './Fleuron';
import WaxSeal from './WaxSeal';
import { loadBadges, loadEarned, sealsFor, isNew, useStampOnce, type SealEntry } from './badges';
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
  /** The player's own earned seals, newest first. */
  seals: SealEntry[];
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

  const [seasons, board, milestones, done, people, badges, earned] = await Promise.all([
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
    loadBadges(),
    loadEarned([player.id]),
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
    seals: sealsFor(badges, player.parish, earned[player.id] ?? {}, true),
  };
}

interface Props {
  player: Player;
  email?: string;
  pendingCount: number | null;
  onOpenApprove: () => void;
  onOpenMilestones: () => void;
  onOpenSeals: () => void;
}

export default function Home({ player, email, pendingCount, onOpenApprove, onOpenMilestones, onOpenSeals }: Props) {
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
      onOpenSeals={onOpenSeals}
    />
  );
}

interface LeafProps {
  player: Pick<Player, 'id' | 'display_name' | 'is_candidate' | 'level_scale'>;
  email?: string;
  data: HomeData;
  today: string;
  pendingCount: number | null;
  onOpenApprove: () => void;
  onOpenMilestones: () => void;
  onOpenSeals: () => void;
  /** Dev previews pin the clock so "new" is stable. */
  now?: number;
}

const fmt = (n: number) => n.toLocaleString('en-US');
const dueSentence = (due: Due | null, today: string) =>
  due ? `${due.title}, due ${dueWords(due.dueOn, today)}.` : 'Nothing is due in the next two weeks.';
/** Keep a name's last word with the one before it ("Fall 2026" never splits). */
const keepTail = (s: string) => s.replace(/ (\S+)$/, ' $1');

export function HomeLeaf({
  player,
  email,
  data,
  today,
  pendingCount,
  onOpenApprove,
  onOpenMilestones,
  onOpenSeals,
  now,
}: LeafProps) {
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

      {(player.is_candidate || data.seals.length > 0) && (
        <section className={styles.sealsSection} aria-labelledby="cq-seals">
          <h2 id="cq-seals" className={styles.subhead}>
            Seals
          </h2>
          {data.seals.length === 0 ? (
            <p className={book.prose}>No seals yet. Your first one is closer than you think.</p>
          ) : (
            <SealRow playerId={player.id} seals={data.seals} now={now ?? Date.now()} onMore={onOpenSeals} />
          )}
          <p className={book.prose}>
            <button type="button" className={styles.inlineLink} onClick={onOpenSeals}>
              See all seals
            </button>
          </p>
        </section>
      )}

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

// Earned seals on one line: as many as fit, then "+N more" (which opens the Seals page)
// in the last place. The width is measured before paint, so the row never reflows.
const SEAL_ITEM = 64;
const SEAL_GAP = 6;

function SealRow({ playerId, seals, now, onMore }: { playerId: string; seals: SealEntry[]; now: number; onMore: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState<number | null>(null);
  useLayoutEffect(() => {
    const el = ref.current!;
    setWidth(el.getBoundingClientRect().width);
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const fit = width === null ? 0 : Math.max(1, Math.floor((width + SEAL_GAP) / (SEAL_ITEM + SEAL_GAP)));
  const shown = seals.length <= fit ? seals : seals.slice(0, fit - 1);
  return (
    <div ref={ref} className={styles.sealRowBox}>
      {width !== null && <SealRowItems playerId={playerId} shown={shown} more={seals.length - shown.length} now={now} onMore={onMore} />}
    </div>
  );
}

function SealRowItems({
  playerId,
  shown,
  more,
  now,
  onMore,
}: {
  playerId: string;
  shown: SealEntry[];
  more: number;
  now: number;
  onMore: () => void;
}) {
  // Mounted once the width is known, so only seals actually shown are counted as seen.
  const stamp = useStampOnce(
    playerId,
    playerId,
    shown.filter((s) => isNew(s.awardedAt, now)).map((s) => s.code),
  );
  return (
    <ul className={styles.sealRow} aria-label="Your seals">
      {shown.map((s) => (
        <li key={s.code} className={styles.sealItem}>
          <WaxSeal icon={s.icon} earned size={40} stamp={stamp.has(s.code)} />
          <span className={styles.sealName}>{s.name}</span>
        </li>
      ))}
      {more > 0 && (
        <li className={styles.sealItem}>
          <button type="button" className={styles.more} onClick={onMore}>
            +{more} more
          </button>
        </li>
      )}
    </ul>
  );
}
