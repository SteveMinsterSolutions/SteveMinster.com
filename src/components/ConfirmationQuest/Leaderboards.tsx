// Leaderboards: Individual, Pairs and Candidates, read from the three leaderboard views.
// The season containing today is shown first, with Lifetime and any past seasons beside
// it; "This week only" swaps to week_points / week_rank. Ranks are rubric Roman numerals
// down the margin of a scroll. Each board is fetched whenever it is opened; no polling.
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { getSupabase, type Player } from './supabase';
import { todayCentral } from './dates';
import book from './book.module.css';
import styles from './Leaderboards.module.css';

export type Board = 'individual' | 'pairs' | 'candidates';

const BOARDS: { id: Board; label: string }[] = [
  { id: 'individual', label: 'Individual' },
  { id: 'pairs', label: 'Pairs' },
  { id: 'candidates', label: 'Candidates' },
];

export interface Season {
  code: string;
  name: string;
}

/** One line on a board, whichever view it came from. */
export interface BoardRow {
  key: string;
  /** A player's name, or "Sponsor and Candidate" for a pair. */
  name: string;
  points: number;
  weekPoints: number;
  rank: number;
  weekRank: number;
  mine: boolean;
}

export type LoadBoard = (board: Board, season: string) => Promise<BoardRow[]>;

const roman = (n: number) => {
  const marks: [number, string][] = [
    [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'],
    [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
  ];
  let out = '';
  for (const [v, m] of marks) for (; n >= v; n -= v) out += m;
  return out;
};
const fmt = (n: number) => n.toLocaleString('en-US');

/** Seasons that have begun, newest first, then Lifetime; the one containing today is the default. */
async function loadSeasons(): Promise<{ seasons: Season[]; current: string }> {
  const today = todayCentral();
  const { data, error } = await getSupabase()
    .from('seasons')
    .select('code, name, starts_on, ends_on')
    .lte('starts_on', today)
    .order('starts_on', { ascending: false });
  if (error) throw new Error(error.message);
  const now = data.find((s) => s.ends_on >= today);
  return {
    seasons: [...data.map((s) => ({ code: s.code as string, name: s.name as string })), { code: 'lifetime', name: 'Lifetime' }],
    current: (now?.code as string | undefined) ?? 'lifetime',
  };
}

function boardLoader(me: Player): LoadBoard {
  return async (board, season) => {
    const supabase = getSupabase();
    if (board === 'pairs') {
      const { data, error } = await supabase
        .from('leaderboard_pairs')
        .select('sponsor_id, sponsor_name, candidate_id, candidate_name, points, week_points, rank, week_rank')
        .eq('season', season);
      if (error) throw new Error(error.message);
      return data.map((r) => ({
        key: `${r.sponsor_id}:${r.candidate_id}`,
        name: `${r.sponsor_name} and ${r.candidate_name}`,
        points: r.points,
        weekPoints: r.week_points,
        rank: Number(r.rank),
        weekRank: Number(r.week_rank),
        mine: r.sponsor_id === me.id || r.candidate_id === me.id,
      }));
    }
    const { data, error } = await supabase
      .from(board === 'candidates' ? 'leaderboard_candidates' : 'leaderboard_individual')
      .select('player_id, display_name, points, week_points, rank, week_rank')
      .eq('season', season);
    if (error) throw new Error(error.message);
    return data.map((r) => ({
      key: r.player_id,
      name: r.display_name,
      points: r.points,
      weekPoints: r.week_points,
      rank: Number(r.rank),
      weekRank: Number(r.week_rank),
      mine: r.player_id === me.id,
    }));
  };
}

type SeasonLoad = { kind: 'loading' } | { kind: 'ready'; seasons: Season[]; current: string } | { kind: 'error'; message: string };

export default function Leaderboards({ player }: { player: Player }) {
  const [load, setLoad] = useState<SeasonLoad>({ kind: 'loading' });
  const [loader] = useState(() => boardLoader(player));

  useEffect(() => {
    let cancelled = false;
    loadSeasons().then(
      (s) => !cancelled && setLoad({ kind: 'ready', ...s }),
      (err: Error) => !cancelled && setLoad({ kind: 'error', message: err.message }),
    );
    return () => {
      cancelled = true;
    };
  }, []);

  if (load.kind === 'loading') return <p className={book.fine}>Unrolling the boards…</p>;
  if (load.kind === 'error') {
    return (
      <>
        <h1 className={book.heading}>Leaderboards</h1>
        <p className={book.error} role="alert">
          The seasons didn’t load. The server said: {load.message}
        </p>
        <p className={book.prose}>Reload the page. If this keeps happening, tell the game admin.</p>
      </>
    );
  }
  return <BoardsLeaf seasons={load.seasons} initialSeason={load.current} loadBoard={loader} />;
}

interface LeafProps {
  seasons: Season[];
  initialSeason: string;
  loadBoard: LoadBoard;
  /** Dev-only screenshots. */
  preview?: { board?: Board; week?: boolean };
}

type Rows = { kind: 'loading' } | { kind: 'ready'; rows: BoardRow[] } | { kind: 'error'; message: string };

export function BoardsLeaf({ seasons, initialSeason, loadBoard, preview }: LeafProps) {
  const [board, setBoard] = useState<Board>(preview?.board ?? 'individual');
  const [season, setSeason] = useState(initialSeason);
  const [week, setWeek] = useState(preview?.week ?? false);
  const [rows, setRows] = useState<Rows>({ kind: 'loading' });
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  // Read through a ref so a new loader function on re-render doesn't refetch.
  const loadRef = useRef(loadBoard);
  loadRef.current = loadBoard;

  useEffect(() => {
    let cancelled = false;
    setRows({ kind: 'loading' });
    loadRef.current(board, season).then(
      (r) => !cancelled && setRows({ kind: 'ready', rows: r }),
      (err: Error) => !cancelled && setRows({ kind: 'error', message: err.message }),
    );
    return () => {
      cancelled = true;
    };
  }, [board, season]);

  // Arrow keys move between the three tabs, as tablists do.
  function onTabKey(e: KeyboardEvent, i: number) {
    const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = (i + step + BOARDS.length) % BOARDS.length;
    setBoard(BOARDS[next].id);
    tabRefs.current[next]?.focus();
  }

  const seasonName = seasons.find((s) => s.code === season)?.name ?? '';
  const label = `${BOARDS.find((b) => b.id === board)!.label}, ${seasonName}${week ? ', this week' : ''}`;

  const sorted =
    rows.kind === 'ready'
      ? rows.rows
          .map((r) => ({ ...r, shownRank: week ? r.weekRank : r.rank, shownPoints: week ? r.weekPoints : r.points }))
          .sort((a, b) => a.shownRank - b.shownRank || a.name.localeCompare(b.name))
      : [];

  // An empty board and one where everyone still has 0 read the same.
  const anyPoints = sorted.some((r) => r.shownPoints > 0);

  return (
    <>
      <h1 className={book.heading}>Leaderboards</h1>

      <div role="tablist" aria-label="Board" className={styles.tabs}>
        {BOARDS.map((b, i) => (
          <button
            key={b.id}
            ref={(el) => {
              tabRefs.current[i] = el;
            }}
            type="button"
            role="tab"
            id={`cq-tab-${b.id}`}
            aria-selected={board === b.id}
            aria-controls="cq-board"
            tabIndex={board === b.id ? 0 : -1}
            className={styles.tab}
            onClick={() => setBoard(b.id)}
            onKeyDown={(e) => onTabKey(e, i)}
          >
            {b.label}
          </button>
        ))}
      </div>

      <div className={styles.controls}>
        <div role="group" aria-label="Season" className={styles.seasons}>
          {seasons.map((s) => (
            <button
              key={s.code}
              type="button"
              aria-pressed={season === s.code}
              className={styles.season}
              onClick={() => setSeason(s.code)}
            >
              {s.name}
            </button>
          ))}
        </div>
        <label className={styles.week}>
          <input type="checkbox" checked={week} onChange={(e) => setWeek(e.target.checked)} />
          <span>This week only</span>
        </label>
      </div>

      <div id="cq-board" role="tabpanel" aria-labelledby={`cq-tab-${board}`} className={styles.scroll}>
        <Roller />
        <div className={styles.sheet}>
          {rows.kind === 'loading' && <p className={`${book.fine} ${styles.quiet}`}>Unrolling…</p>}
          {rows.kind === 'error' && (
            <p className={`${book.error} ${styles.quiet}`} role="alert">
              This board didn’t load. The server said: {rows.message}. Choose it again, or reload the page.
            </p>
          )}
          {rows.kind === 'ready' && !anyPoints && (
            <p className={`${book.prose} ${styles.quiet}`}>
              {week ? 'No points yet this week.' : 'No points yet this season.'} The first Mass counts.
            </p>
          )}
          {anyPoints && (
            <ol className={styles.ranks} aria-label={label}>
              {sorted.map((r) => (
                <li key={r.key} className={`${styles.row} ${r.mine ? styles.mine : ''}`}>
                  <span className={styles.rank}>
                    {r.shownPoints > 0 ? (
                      <>
                        <span aria-hidden="true">{roman(r.shownRank)}</span>
                        <span className={book.srOnly}>Rank {r.shownRank}: </span>
                      </>
                    ) : (
                      <span className={book.srOnly}>Not yet ranked: </span>
                    )}
                  </span>
                  <span className={styles.who}>
                    <span className={styles.name}>
                      {r.mine && <span className={styles.mark} aria-hidden="true" />}
                      {r.name}
                      {r.mine && <span className={book.srOnly}> (you)</span>}
                    </span>
                  </span>
                  <span className={styles.points}>
                    {fmt(r.shownPoints)}
                    <span className={book.srOnly}> points</span>
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>
        <Roller />
      </div>
      {week && <p className={`${book.fine} ${styles.after}`}>This week runs Monday to Sunday, Central time.</p>}
    </>
  );
}

/** A scroll's rod with a turned knob at each end, drawn in CSS. */
function Roller() {
  return <div className={styles.roller} aria-hidden="true" />;
}
