// Warriors wrestling: scoring logic. Pure functions, no I/O, shared by the API
// routes and the scorer UI (optimistic updates). Tests: scoring.test.ts.
//
// The app records the referee's calls; it never decides them. These functions only
// add up what the scorer entered and classify the result the scorer ends the bout with.

import {
  EVENT_POINTS, MAJOR_MARGIN, PERIODS, TEAM_POINTS, TECH_FALL_MARGIN, WEIGHTS,
  other, type EventCode, type Level, type Period, type ResultType, type Side, type Weight,
} from './constants.ts';

// ─── Bout score ──────────────────────────────────────────────────────────────

export interface WrEvent {
  id: string;
  period: Period;
  side: Side;               // who RECEIVES the points
  code: EventCode;
  points: number;
  voided: boolean;
  created_at: string;       // ISO; set by the client so offline replay keeps order
}

export interface Score { us: number; them: number }
export interface BoutScore extends Score {
  /** Periods that have at least one scoring event, in wrestle order. */
  byPeriod: { period: Period; us: number; them: number }[];
}

/** Points the given code is worth, or null for an unknown code. */
export const pointsFor = (code: string): number | null =>
  Object.prototype.hasOwnProperty.call(EVENT_POINTS, code) ? EVENT_POINTS[code as EventCode] : null;

/** Events in recorded order (created_at, then array order as a stable tiebreak). */
export function orderEvents<T extends Pick<WrEvent, 'created_at'>>(events: readonly T[]): T[] {
  return events
    .map((e, i) => ({ e, i }))
    .sort((a, b) => (a.e.created_at < b.e.created_at ? -1 : a.e.created_at > b.e.created_at ? 1 : a.i - b.i))
    .map((x) => x.e);
}

/** Sum of non-voided event points per side, plus a per-period breakdown. */
export function boutScore(events: readonly WrEvent[]): BoutScore {
  const per = new Map<Period, Score>();
  let us = 0, them = 0;
  for (const e of events) {
    if (e.voided || e.points === 0) continue;
    const p = per.get(e.period) ?? { us: 0, them: 0 };
    p[e.side] += e.points;
    per.set(e.period, p);
    if (e.side === 'us') us += e.points; else them += e.points;
  }
  const byPeriod = PERIODS.filter((p) => per.has(p)).map((p) => ({ period: p, ...per.get(p)! }));
  return { us, them, byPeriod };
}

/** The event Undo should void: the most recent non-voided one, or null. */
export function lastActiveEvent<T extends WrEvent>(events: readonly T[]): T | null {
  const live = orderEvents(events).filter((e) => !e.voided);
  return live.length ? live[live.length - 1] : null;
}

/** Returns a copy of `events` with `id` voided (Undo). */
export const voidEvent = <T extends WrEvent>(events: readonly T[], id: string): T[] =>
  events.map((e) => (e.id === id ? { ...e, voided: true } : e));

// ─── Tech fall prompt ────────────────────────────────────────────────────────

/**
 * True when this event is the one that takes the lead to 15+: show
 * "15-point lead. Near-fall criteria still active?" (No = end as TF now).
 */
export function crossesTechFall(before: Score, after: Score): boolean {
  return Math.abs(before.us - before.them) < TECH_FALL_MARGIN
      && Math.abs(after.us - after.them) >= TECH_FALL_MARGIN;
}

// ─── Ending a bout ───────────────────────────────────────────────────────────

/** Result type for a win on points by `margin` (> 0). */
export function classifyMargin(margin: number): 'DEC' | 'MD' | 'TF' {
  if (!(margin > 0)) throw new Error('classifyMargin: margin must be positive');
  if (margin >= TECH_FALL_MARGIN) return 'TF';
  if (margin >= MAJOR_MARGIN) return 'MD';
  return 'DEC';
}

export interface BoutResult {
  result_type: ResultType;
  winner: Side | null;      // null only for DFF
  team_pts_us: number;
  team_pts_them: number;
}

/** Team points for a final result. */
export function resultFor(result_type: ResultType, winner: Side | null): BoutResult {
  if (result_type === 'DFF') return { result_type, winner: null, team_pts_us: 0, team_pts_them: 0 };
  if (!winner) throw new Error(`resultFor: ${result_type} needs a winner`);
  const pts = TEAM_POINTS[result_type];
  return {
    result_type, winner,
    team_pts_us: winner === 'us' ? pts : 0,
    team_pts_them: winner === 'them' ? pts : 0,
  };
}

export type EndOnPoints =
  | { ok: true; result: BoutResult; score: Score }
  | { ok: false; reason: 'tied'; needsRideOut: boolean; score: Score };

/**
 * "End bout" on points: the winner is whoever has more points; the margin picks
 * DEC/MD/TF. A tie can't end on points: in UTB the scorer records RO1 for the
 * offensive wrestler (needsRideOut), otherwise they advance the period.
 */
export function endOnPoints(events: readonly WrEvent[], period: Period): EndOnPoints {
  const s = boutScore(events);
  const score = { us: s.us, them: s.them };
  if (s.us === s.them) return { ok: false, reason: 'tied', needsRideOut: period === 'UTB', score };
  const winner: Side = s.us > s.them ? 'us' : 'them';
  return { ok: true, result: resultFor(classifyMargin(Math.abs(s.us - s.them)), winner), score };
}

// ─── Dual score ──────────────────────────────────────────────────────────────

export interface DualBout {
  level: Level;
  status: 'pending' | 'live' | 'final' | 'skipped';
  team_pts_us: number;
  team_pts_them: number;
}
export interface TeamAdjustment { side: Side; points: number }   // side LOSES the points

export interface DualScore extends Score {
  /** All varsity bouts final or skipped. */
  varsityDone: boolean;
  /** Varsity done, scores level, no tiebreak recorded yet. */
  needsTiebreak: boolean;
}

/**
 * Varsity final bouts' team points, minus deductions against each side, plus 1 for
 * the tiebreak winner. JV exhibitions never count. Negatives are allowed.
 */
export function dualScore(
  bouts: readonly DualBout[],
  adjustments: readonly TeamAdjustment[] = [],
  tiebreak_side: Side | null = null,
): DualScore {
  let us = 0, them = 0;
  const varsity = bouts.filter((b) => b.level === 'V');
  for (const b of varsity) {
    if (b.status !== 'final') continue;
    us += b.team_pts_us;
    them += b.team_pts_them;
  }
  for (const a of adjustments) {
    if (a.side === 'us') us -= a.points; else them -= a.points;
  }
  const varsityDone = varsity.length > 0 && varsity.every((b) => b.status === 'final' || b.status === 'skipped');
  const levelBefore = us === them;
  if (tiebreak_side === 'us') us += 1;
  if (tiebreak_side === 'them') them += 1;
  return { us, them, varsityDone, needsTiebreak: varsityDone && levelBefore && !tiebreak_side };
}

// ─── Bout order and dual setup ───────────────────────────────────────────────

/** Varsity weights in wrestle order: start at `start`, wrap around the 15 classes. */
export function varsityOrder(start: Weight): Weight[] {
  const i = WEIGHTS.indexOf(start);
  if (i < 0) throw new Error(`varsityOrder: ${start} is not a weight class`);
  return [...WEIGHTS.slice(i), ...WEIGHTS.slice(0, i)];
}

export interface RosterWrestler {
  id: string;
  default_weight: number | null;
  level: Level;
  active: boolean;
}

export interface NewBout {
  level: Level;
  weight: Weight;
  bout_order: number;
  our_wrestler_id: string | null;
}

/**
 * Bouts for a new dual. 15 varsity bouts in wrap order, each filled with the first
 * active varsity wrestler listed at that weight (empty = no wrestler; the scorer can
 * mark a forfeit). Then a JV exhibition bout for each active JV wrestler, in weight
 * order. Extra varsity wrestlers at an already-filled weight wrestle exhibition too.
 * Wrestlers with no default weight are returned in `unplaced`.
 */
export function buildBouts(roster: readonly RosterWrestler[], start: Weight): { bouts: NewBout[]; unplaced: string[] } {
  const active = roster.filter((w) => w.active);
  const unplaced = active.filter((w) => !WEIGHTS.includes(w.default_weight as Weight)).map((w) => w.id);
  const placed = active.filter((w) => WEIGHTS.includes(w.default_weight as Weight));

  const varsityAt = new Map<number, string>();
  const exhibition: RosterWrestler[] = [];
  for (const w of placed) {
    if (w.level === 'V' && !varsityAt.has(w.default_weight!)) varsityAt.set(w.default_weight!, w.id);
    else exhibition.push(w);
  }

  const bouts: NewBout[] = varsityOrder(start).map((weight, i) => ({
    level: 'V', weight, bout_order: i + 1, our_wrestler_id: varsityAt.get(weight) ?? null,
  }));
  exhibition
    .map((w, i) => ({ w, i }))
    .sort((a, b) => a.w.default_weight! - b.w.default_weight! || a.i - b.i)
    .forEach(({ w }, i) => bouts.push({
      level: 'JV', weight: w.default_weight as Weight, bout_order: WEIGHTS.length + i + 1, our_wrestler_id: w.id,
    }));
  return { bouts, unplaced };
}

export { other };
