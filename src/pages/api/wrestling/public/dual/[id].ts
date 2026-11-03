// src/pages/api/wrestling/public/dual/[id].ts
// Public, no auth, CDN-cached. Computed follow-page snapshot for one dual (test duals
// work by id). Built by buildPublicDual from first names only: the wrestler query
// never selects last_name, and the snapshot picks every field explicitly.
import type { APIRoute } from 'astro';
import { buildPublicDual } from '../../../../../lib/wrestling/snapshot';
import { PUBLIC_CACHE, db, isUuid, json, serverError } from '../../../../../lib/wrestling/server';

export const prerender = false;

export const GET: APIRoute = async (ctx) => {
  const id = ctx.params.id;
  if (!isUuid(id)) return json({ error: 'not_found' }, 404, PUBLIC_CACHE);
  try {
    const [dual, bouts, adj] = await Promise.all([
      db().from('wr_duals')
        .select('id, dual_date, opponent, location, status, tiebreak_side, tiebreak_criterion, updated_at')
        .eq('id', id).maybeSingle(),
      db().from('wr_bouts')
        .select('id, level, weight, bout_order, our_wrestler_id, opp_name, status, current_period, result_type, winner, result_time, team_pts_us, team_pts_them, updated_at')
        .eq('dual_id', id),
      db().from('wr_team_adjustments').select('side, points').eq('dual_id', id),
    ]);
    const err = dual.error ?? bouts.error ?? adj.error;
    if (err) throw err;
    if (!dual.data) return json({ error: 'not_found' }, 404, PUBLIC_CACHE);

    const b = bouts.data ?? [];
    const wrestlerIds = [...new Set(b.map((x) => x.our_wrestler_id).filter((x): x is string => !!x))];
    const [events, wrestlers] = await Promise.all([
      b.length
        ? db().from('wr_events').select('id, bout_id, period, side, code, points, voided, created_at')
            .in('bout_id', b.map((x) => x.id)).eq('voided', false)
        : Promise.resolve({ data: [], error: null }),
      wrestlerIds.length
        ? db().from('wr_wrestlers').select('id, first_name').in('id', wrestlerIds)
        : Promise.resolve({ data: [], error: null }),
    ]);
    const err2 = events.error ?? wrestlers.error;
    if (err2) throw err2;

    return json(buildPublicDual(dual.data, b, events.data ?? [], wrestlers.data ?? [], adj.data ?? []), 200, PUBLIC_CACHE);
  } catch (e) {
    serverError('public_dual', e);
    return json({ error: 'unavailable' }, 503);
  }
};
