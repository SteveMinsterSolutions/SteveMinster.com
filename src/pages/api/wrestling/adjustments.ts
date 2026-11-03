// src/pages/api/wrestling/adjustments.ts
// POST   (scorer) { dual_id, side, points, reason } → team-point deduction against `side`.
// DELETE (scorer) { id } → remove one entered by mistake.
import type { APIRoute } from 'astro';
import { bad, cleanText, db, isUuid, json, notFound, readObject, requireScorer, serverError, touch } from '../../../lib/wrestling/server';

export const prerender = false;

export const POST: APIRoute = async (ctx) => {
  const denied = requireScorer(ctx);
  if (denied) return denied;
  const body = await readObject(ctx.request);
  if (!body) return bad('Invalid request.');
  if (!isUuid(body.dual_id)) return bad('Unknown dual.');
  if (body.side !== 'us' && body.side !== 'them') return bad('Side is us or them.');
  if (!Number.isInteger(body.points) || (body.points as number) < 1 || (body.points as number) > 6) return bad('Points are 1–6.');
  const reason = cleanText(body.reason, 40);
  if (!reason) return bad('Reason is required.');
  try {
    const { data, error } = await db().from('wr_team_adjustments')
      .insert({ dual_id: body.dual_id, side: body.side, points: body.points, reason })
      .select('id, dual_id, side, points, reason, created_at').single();
    if (error) {
      if (error.code === '23503') return notFound('Dual not found.');
      throw error;
    }
    await touch(data.dual_id);
    return json({ adjustment: data }, 201);
  } catch (e) {
    return serverError('adjustment_post', e);
  }
};

export const DELETE: APIRoute = async (ctx) => {
  const denied = requireScorer(ctx);
  if (denied) return denied;
  const body = await readObject(ctx.request);
  if (!body || !isUuid(body.id)) return bad('Unknown adjustment.');
  try {
    const { data, error } = await db().from('wr_team_adjustments').delete().eq('id', body.id).select('dual_id').maybeSingle();
    if (error) throw error;
    if (!data) return notFound('Adjustment not found.');
    await touch(data.dual_id);
    return json({ ok: true });
  } catch (e) {
    return serverError('adjustment_delete', e);
  }
};
