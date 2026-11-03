// src/pages/api/wrestling/bouts/[id].ts
// PATCH (scorer) { our_wrestler_id?, opp_name?, status?, current_period?,
//                  result_type?, winner?, result_time? }
// - result_type finalizes the bout; team points are computed here from the result type
//   (never trusted from the client). DFF needs no winner; everything else does.
// - status pending/live/skipped clears any result (re-opening a bout to fix a mistake).
// - Starting a bout (status live) flips the dual from setup to live.
// - opp_name is stored as a first name only.
import type { APIRoute } from 'astro';
import { isPeriod, isResultType } from '../../../../lib/wrestling/constants';
import { resultFor } from '../../../../lib/wrestling/scoring';
import { firstNameOnly } from '../../../../lib/wrestling/snapshot';
import { bad, db, isUuid, json, notFound, readObject, requireScorer, serverError, touch } from '../../../../lib/wrestling/server';

export const prerender = false;

const BOUT_COLS = 'id, dual_id, level, weight, bout_order, mat, our_wrestler_id, opp_name, status, current_period, result_type, winner, result_time, team_pts_us, team_pts_them, finalized_at, updated_at';
const TIME_RE = /^\d{1,2}:[0-5]\d$/;

export const PATCH: APIRoute = async (ctx) => {
  const denied = requireScorer(ctx);
  if (denied) return denied;
  const id = ctx.params.id;
  if (!isUuid(id)) return notFound('Bout not found.');
  const body = await readObject(ctx.request);
  if (!body) return bad('Invalid request.');

  const allowed = ['our_wrestler_id', 'opp_name', 'status', 'current_period', 'result_type', 'winner', 'result_time'];
  for (const k of Object.keys(body)) if (!allowed.includes(k)) return bad(`${k} can't be changed here.`);

  const patch: Record<string, unknown> = {};

  if ('our_wrestler_id' in body) {
    const v = body.our_wrestler_id;
    if (v !== null && !isUuid(v)) return bad('Unknown wrestler.');
    patch.our_wrestler_id = v;
  }
  if ('opp_name' in body) {
    if (body.opp_name !== null && typeof body.opp_name !== 'string') return bad('Opponent name must be text.');
    patch.opp_name = firstNameOnly(body.opp_name as string | null);
  }
  if ('current_period' in body) {
    if (!isPeriod(body.current_period)) return bad('Unknown period.');
    patch.current_period = body.current_period;
  }

  if ('result_type' in body && body.result_type !== null) {
    if (!isResultType(body.result_type)) return bad('Unknown result.');
    const winner = body.winner ?? null;
    if (winner !== null && winner !== 'us' && winner !== 'them') return bad('Winner is us or them.');
    if (body.result_type !== 'DFF' && !winner) return bad('Pick the winner.');
    let result_time: string | null = null;
    if (body.result_time !== undefined && body.result_time !== null && body.result_time !== '') {
      if (typeof body.result_time !== 'string' || !TIME_RE.test(body.result_time)) return bad('Time is m:ss.');
      result_time = body.result_time;
    }
    if ('status' in body && body.status !== 'final') return bad('A result makes the bout final.');
    Object.assign(patch, resultFor(body.result_type, winner as 'us' | 'them' | null), {
      result_time: body.result_type === 'FALL' || body.result_type === 'TF' ? result_time : null,
      status: 'final',
      finalized_at: new Date().toISOString(),
    });
  } else if ('status' in body) {
    const s = body.status;
    if (s === 'final') return bad('Ending a bout needs a result.');
    if (!['pending', 'live', 'skipped'].includes(s as string)) return bad('Unknown status.');
    Object.assign(patch, {
      status: s, result_type: null, winner: null, result_time: null,
      team_pts_us: 0, team_pts_them: 0, finalized_at: null,
    });
  } else if ('winner' in body || 'result_time' in body) {
    return bad('Send winner and time with the result.');
  }

  if (!Object.keys(patch).length) return bad('Nothing to update.');
  patch.updated_at = new Date().toISOString();

  try {
    if (typeof patch.our_wrestler_id === 'string') {
      const w = await db().from('wr_wrestlers').select('id').eq('id', patch.our_wrestler_id).maybeSingle();
      if (w.error) throw w.error;
      if (!w.data) return bad('Unknown wrestler.');
    }
    const { data, error } = await db().from('wr_bouts').update(patch).eq('id', id).select(BOUT_COLS).maybeSingle();
    if (error) throw error;
    if (!data) return notFound('Bout not found.');

    if (patch.status === 'live') {
      const d = await db().from('wr_duals').update({ status: 'live', updated_at: patch.updated_at })
        .eq('id', data.dual_id).eq('status', 'setup');
      if (d.error) throw d.error;
    }
    await touch(data.dual_id);
    return json({ bout: data });
  } catch (e) {
    return serverError('bout_patch', e);
  }
};
