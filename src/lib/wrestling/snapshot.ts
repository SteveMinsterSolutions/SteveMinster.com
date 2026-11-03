// Warriors wrestling: the public follow-page snapshot. Pure function so the
// "no last names on public endpoints" rule is unit-tested, not just hoped for.
// Every output field is picked explicitly; nothing is spread from DB rows.

import { WEIGHTS, type Level, type Period, type ResultType, type Side } from './constants.ts';
import { boutScore, dualScore, type BoutScore, type TeamAdjustment, type WrEvent } from './scoring.ts';

export interface SnapDualRow {
  id: string;
  dual_date: string;
  opponent: string;
  location: string | null;
  status: 'setup' | 'live' | 'final';
  tiebreak_side: Side | null;
  tiebreak_criterion: string | null;
  updated_at: string;
}
export interface SnapBoutRow {
  id: string;
  level: Level;
  weight: number;
  bout_order: number;
  our_wrestler_id: string | null;
  opp_name: string | null;
  status: 'pending' | 'live' | 'final' | 'skipped';
  current_period: Period;
  result_type: ResultType | null;
  winner: Side | null;
  result_time: string | null;
  team_pts_us: number;
  team_pts_them: number;
  updated_at: string;
}
/** Only first names are needed; anything else passed in is ignored. */
export interface SnapWrestler { id: string; first_name: string }

export interface PublicBout {
  id: string;
  level: Level;
  weight: number;
  order: number;
  status: SnapBoutRow['status'];
  period: Period;
  our_name: string | null;
  opp_name: string | null;
  score: BoutScore;
  result_type: ResultType | null;
  winner: Side | null;
  result_time: string | null;
  team_pts_us: number;
  team_pts_them: number;
}
export interface PublicDual {
  dual: {
    id: string; dual_date: string; opponent: string; location: string | null;
    status: SnapDualRow['status']; tiebreak_side: Side | null; tiebreak_criterion: string | null;
  };
  score: { us: number; them: number; varsityDone: boolean; needsTiebreak: boolean };
  live_bout_id: string | null;
  bouts: PublicBout[];
  updated_at: string;
}

/** First word only, trimmed and length-capped. Opponent names are first names by policy. */
export function firstNameOnly(name: string | null | undefined): string | null {
  const w = (name ?? '').trim().split(/\s+/)[0] ?? '';
  return w ? w.slice(0, 24) : null;
}

const maxIso = (xs: string[]) => xs.reduce((m, x) => (x > m ? x : m), '');

export function buildPublicDual(
  dual: SnapDualRow,
  bouts: readonly SnapBoutRow[],
  events: readonly (WrEvent & { bout_id: string })[],
  wrestlers: readonly SnapWrestler[],
  adjustments: readonly TeamAdjustment[],
): PublicDual {
  const first = new Map(wrestlers.map((w) => [w.id, firstNameOnly(w.first_name)]));
  const evByBout = new Map<string, WrEvent[]>();
  for (const e of events) {
    const list = evByBout.get(e.bout_id) ?? [];
    list.push(e);
    evByBout.set(e.bout_id, list);
  }

  // Wrestle order: varsity by bout_order, then JV by bout_order.
  const ordered = [...bouts].sort((a, b) =>
    (a.level === b.level ? 0 : a.level === 'V' ? -1 : 1) || a.bout_order - b.bout_order);

  const out: PublicBout[] = ordered.map((b) => ({
    id: b.id,
    level: b.level,
    weight: WEIGHTS.includes(b.weight as never) ? b.weight : 0,
    order: b.bout_order,
    status: b.status,
    period: b.current_period,
    our_name: b.our_wrestler_id ? first.get(b.our_wrestler_id) ?? null : null,
    opp_name: firstNameOnly(b.opp_name),
    score: boutScore(evByBout.get(b.id) ?? []),
    result_type: b.result_type,
    winner: b.winner,
    result_time: b.result_type === 'FALL' || b.result_type === 'TF' ? b.result_time : null,
    team_pts_us: b.team_pts_us,
    team_pts_them: b.team_pts_them,
  }));

  const s = dualScore(bouts, adjustments, dual.tiebreak_side);
  return {
    dual: {
      id: dual.id, dual_date: dual.dual_date, opponent: dual.opponent, location: dual.location,
      status: dual.status, tiebreak_side: dual.tiebreak_side, tiebreak_criterion: dual.tiebreak_criterion,
    },
    score: { us: s.us, them: s.them, varsityDone: s.varsityDone, needsTiebreak: s.needsTiebreak },
    live_bout_id: out.find((b) => b.status === 'live')?.id ?? null,
    bouts: out,
    updated_at: maxIso([dual.updated_at, ...bouts.map((b) => b.updated_at), ...events.map((e) => e.created_at)]),
  };
}
