// src/pages/api/wrestling/duals/[id].ts
// GET   (scorer) → full scorer state: dual, bouts, events (incl. voided), adjustments, dual score.
// PATCH (scorer) { status?, start_weight?, tiebreak_side?, tiebreak_criterion?, is_test?,
//                  opponent?, location?, dual_date? }
//       Changing start_weight re-numbers the varsity bout order (wraparound).
import type { APIRoute } from 'astro';
import { isTiebreakCriterion, isWeight } from '../../../../lib/wrestling/constants';
import { dualScore, varsityOrder } from '../../../../lib/wrestling/scoring';
import { bad, cleanText, db, isUuid, json, notFound, readObject, requireScorer, serverError, touch } from '../../../../lib/wrestling/server';

export const prerender = false;

const DUAL_COLS = 'id, season, dual_date, opponent, location, start_weight, status, tiebreak_side, tiebreak_criterion, is_test, created_at, updated_at';
const BOUT_COLS = 'id, dual_id, level, weight, bout_order, mat, our_wrestler_id, opp_name, status, current_period, result_type, winner, result_time, team_pts_us, team_pts_them, finalized_at, updated_at';

export const GET: APIRoute = async (ctx) => {
  const denied = requireScorer(ctx);
  if (denied) return denied;
  const id = ctx.params.id;
  if (!isUuid(id)) return notFound('Dual not found.');
  try {
    const [dual, bouts, adjustments] = await Promise.all([
      db().from('wr_duals').select(DUAL_COLS).eq('id', id).maybeSingle(),
      db().from('wr_bouts').select(BOUT_COLS).eq('dual_id', id).order('level', { ascending: false }).order('bout_order'),
      db().from('wr_team_adjustments').select('id, side, points, reason, created_at').eq('dual_id', id).order('created_at'),
    ]);
    const err = dual.error ?? bouts.error ?? adjustments.error;
    if (err) throw err;
    if (!dual.data) return notFound('Dual not found.');
    const boutIds = (bouts.data ?? []).map((b) => b.id);
    const events = boutIds.length
      ? await db().from('wr_events').select('id, bout_id, period, side, code, points, voided, created_at').in('bout_id', boutIds).order('created_at')
      : { data: [], error: null };
    if (events.error) throw events.error;
    return json({
      dual: dual.data,
      bouts: bouts.data ?? [],
      events: events.data ?? [],
      adjustments: adjustments.data ?? [],
      score: dualScore(bouts.data ?? [], adjustments.data ?? [], dual.data.tiebreak_side),
    });
  } catch (e) {
    return serverError('dual_get', e);
  }
};

export const PATCH: APIRoute = async (ctx) => {
  const denied = requireScorer(ctx);
  if (denied) return denied;
  const id = ctx.params.id;
  if (!isUuid(id)) return notFound('Dual not found.');
  const body = await readObject(ctx.request);
  if (!body) return bad('Invalid request.');

  const patch: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body)) {
    if (k === 'status') {
      if (!['setup', 'live', 'final'].includes(v as string)) return bad('Unknown status.');
      patch.status = v;
    } else if (k === 'start_weight') {
      if (!isWeight(v)) return bad('Start weight must be a weight class.');
      patch.start_weight = v;
    } else if (k === 'tiebreak_side') {
      if (v !== null && v !== 'us' && v !== 'them') return bad('Tiebreak side is us or them.');
      patch.tiebreak_side = v;
    } else if (k === 'tiebreak_criterion') {
      if (v !== null && !isTiebreakCriterion(v)) return bad('Criterion is a letter a–q.');
      patch.tiebreak_criterion = v;
    } else if (k === 'is_test') {
      if (typeof v !== 'boolean') return bad('is_test must be true or false.');
      patch.is_test = v;
    } else if (k === 'opponent') {
      const s = cleanText(v, 60);
      if (!s) return bad('Opponent is required.');
      patch.opponent = s;
    } else if (k === 'location') {
      const s = cleanText(v, 80);
      if (s === undefined) return bad('Location is too long.');
      patch.location = s;
    } else if (k === 'dual_date') {
      if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v) || Number.isNaN(Date.parse(v))) return bad('Date must be YYYY-MM-DD.');
      patch.dual_date = v;
    } else {
      return bad(`${k} can't be changed here.`);
    }
  }
  if (patch.tiebreak_side === null) patch.tiebreak_criterion = null;
  if (!Object.keys(patch).length) return bad('Nothing to update.');
  patch.updated_at = new Date().toISOString();

  try {
    const { data, error } = await db().from('wr_duals').update(patch).eq('id', id).select(DUAL_COLS).maybeSingle();
    if (error) throw error;
    if (!data) return notFound('Dual not found.');

    if (patch.start_weight !== undefined) {
      const order = varsityOrder(data.start_weight);
      const res = await Promise.all(order.map((w, i) =>
        db().from('wr_bouts').update({ bout_order: i + 1 }).eq('dual_id', id).eq('level', 'V').eq('weight', w)));
      const err = res.find((r) => r.error)?.error;
      if (err) throw err;
      await touch(id);
    }
    return json({ dual: data });
  } catch (e) {
    return serverError('dual_patch', e);
  }
};
