// Seals (the badges table): read only. The database awards them (milestones and
// check_badges); the client only shows them. A badge with active = false is hidden
// everywhere; parish null applies to everyone, otherwise only to that parish's players.
import { useEffect, useState } from 'react';
import { getSupabase } from './supabase';

export interface Badge {
  code: string;
  name: string;
  description: string;
  icon: string | null;
  points: number;
  parish: string | null;
}

/** awarded_at (an ISO timestamp) by badge code, for one player. */
export type Earned = Record<string, string>;

/** Every active badge. */
export async function loadBadges(): Promise<Badge[]> {
  const { data, error } = await getSupabase()
    .from('badges')
    .select('code, name, description, icon, points, active, parish');
  if (error) throw new Error(error.message);
  return data
    .filter((b) => b.active !== false)
    .map((b) => ({
      code: b.code as string,
      name: b.name as string,
      description: b.description as string,
      icon: b.icon as string | null,
      points: b.points as number,
      parish: b.parish as string | null,
    }));
}

/** Earned seals for each of these players, by player id. */
export async function loadEarned(playerIds: string[]): Promise<Record<string, Earned>> {
  const out: Record<string, Earned> = Object.fromEntries(playerIds.map((id) => [id, {}]));
  if (!playerIds.length) return out;
  const { data, error } = await getSupabase()
    .from('player_badges')
    .select('player_id, badge_code, awarded_at')
    .in('player_id', playerIds);
  if (error) throw new Error(error.message);
  for (const r of data) (out[r.player_id as string] ??= {})[r.badge_code as string] = r.awarded_at as string;
  return out;
}

export interface SealEntry extends Badge {
  /** null when not yet earned. */
  awardedAt: string | null;
}

const byNewest = (a: SealEntry, b: SealEntry) => Date.parse(b.awardedAt!) - Date.parse(a.awardedAt!);
const byEase = (a: SealEntry, b: SealEntry) => a.points - b.points || a.name.localeCompare(b.name);

/**
 * A player's seals: earned ones first, newest first, then (unless earnedOnly) the
 * ones their parish could still earn, smallest first. An earned seal always shows,
 * even if its parish has since changed.
 */
export function sealsFor(badges: Badge[], parish: string | null, earned: Earned, earnedOnly = false): SealEntry[] {
  const entries = badges.map((b) => ({ ...b, awardedAt: earned[b.code] ?? null }));
  const won = entries.filter((e) => e.awardedAt).sort(byNewest);
  if (earnedOnly) return won;
  const open = entries.filter((e) => !e.awardedAt && (e.parish === null || e.parish === parish)).sort(byEase);
  return [...won, ...open];
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** Earned in the last 7 days. */
export function isNew(awardedAt: string | null, now = Date.now()): boolean {
  if (!awardedAt) return false;
  const t = Date.parse(awardedAt);
  return now - t < WEEK_MS && t <= now + 60_000;
}

/** "Oct 26", on the game's clock (Central time). */
export function earnedDate(awardedAt: string): string {
  return new Date(awardedAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'America/Chicago',
  });
}

/**
 * Which of these new seals to stamp: those this viewer hasn't seen yet for this
 * player. Worked out once, on first render; the codes are then remembered as seen.
 * If storage can't be read or written, nothing stamps (and nothing breaks).
 */
export function useStampOnce(viewerId: string, playerId: string, newCodes: string[]): Set<string> {
  const key = `cq-seals-seen:${viewerId}:${playerId}`;
  const [stamp] = useState<Set<string>>(() => {
    try {
      // Only stamp if we'll be able to remember it; otherwise it would stamp every visit.
      window.localStorage.setItem('cq-seals-probe', '1');
      window.localStorage.removeItem('cq-seals-probe');
      const seen = new Set<string>(JSON.parse(window.localStorage.getItem(key) ?? '[]'));
      return new Set(newCodes.filter((c) => !seen.has(c)));
    } catch {
      return new Set();
    }
  });
  useEffect(() => {
    if (!stamp.size) return;
    try {
      const seen = new Set<string>(JSON.parse(window.localStorage.getItem(key) ?? '[]'));
      for (const c of stamp) seen.add(c);
      window.localStorage.setItem(key, JSON.stringify([...seen]));
    } catch {
      // Storage failed after the probe passed; at worst the seal stamps once more.
    }
  }, [key, stamp]);
  return stamp;
}
