// src/pages/api/wrestling/public/season.ts
// Public, no auth, CDN-cached. Non-test duals only: date, opponent, status, dual score,
// W/L/T for finals, season record, and the live dual's id (if any).
// No wrestler names at all on this endpoint.
import type { APIRoute } from 'astro';
import { dualScore } from '../../../../lib/wrestling/scoring';
import { PUBLIC_CACHE, db, json, serverError } from '../../../../lib/wrestling/server';

export const prerender = false;

export const GET: APIRoute = async () => {
  try {
    const duals = await db().from('wr_duals')
      .select('id, season, dual_date, opponent, location, status, tiebreak_side, tiebreak_criterion, created_at')
      .eq('is_test', false)
      .order('dual_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(60);
    if (duals.error) throw duals.error;
    const ids = (duals.data ?? []).map((d) => d.id);

    const [bouts, adj] = ids.length
      ? await Promise.all([
          db().from('wr_bouts').select('dual_id, level, status, team_pts_us, team_pts_them').in('dual_id', ids),
          db().from('wr_team_adjustments').select('dual_id, side, points').in('dual_id', ids),
        ])
      : [{ data: [], error: null }, { data: [], error: null }];
    const err = bouts.error ?? adj.error;
    if (err) throw err;

    const record = { w: 0, l: 0, t: 0 };
    const out = (duals.data ?? []).map((d) => {
      const s = dualScore(
        (bouts.data ?? []).filter((b) => b.dual_id === d.id),
        (adj.data ?? []).filter((a) => a.dual_id === d.id),
        d.tiebreak_side,
      );
      let result: 'W' | 'L' | 'T' | null = null;
      if (d.status === 'final') {
        result = s.us > s.them ? 'W' : s.us < s.them ? 'L' : 'T';
        record[result.toLowerCase() as 'w' | 'l' | 't'] += 1;
      }
      return {
        id: d.id, dual_date: d.dual_date, opponent: d.opponent, location: d.location, status: d.status,
        us: s.us, them: s.them, result,
        tiebreak_criterion: d.tiebreak_side ? d.tiebreak_criterion : null,
      };
    });
    return json({ duals: out, record, live_dual_id: out.find((d) => d.status === 'live')?.id ?? null }, 200, PUBLIC_CACHE);
  } catch (e) {
    serverError('public_season', e);
    return json({ error: 'unavailable' }, 503);
  }
};
