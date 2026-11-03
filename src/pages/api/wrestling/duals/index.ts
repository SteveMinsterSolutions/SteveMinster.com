// src/pages/api/wrestling/duals/index.ts
// GET  (scorer) → recent duals, test ones included, newest first.
// POST (scorer) { opponent, dual_date, start_weight?, location?, is_test? } → creates the dual
//      and its bouts: 15 varsity in wrap order from the roster's default weights, plus a JV
//      exhibition bout per JV wrestler (src/lib/wrestling/scoring.ts buildBouts).
import type { APIRoute } from 'astro';
import { isWeight } from '../../../../lib/wrestling/constants';
import { buildBouts } from '../../../../lib/wrestling/scoring';
import { bad, cleanText, db, json, readObject, requireScorer, serverError } from '../../../../lib/wrestling/server';

export const prerender = false;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const GET: APIRoute = async (ctx) => {
  const denied = requireScorer(ctx);
  if (denied) return denied;
  try {
    const { data, error } = await db()
      .from('wr_duals')
      .select('id, season, dual_date, opponent, location, start_weight, status, is_test, created_at')
      .order('dual_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw error;
    return json({ duals: data ?? [] });
  } catch (e) {
    return serverError('duals_list', e);
  }
};

export const POST: APIRoute = async (ctx) => {
  const denied = requireScorer(ctx);
  if (denied) return denied;
  const body = await readObject(ctx.request);
  if (!body) return bad('Invalid request.');

  const opponent = cleanText(body.opponent, 60);
  if (!opponent) return bad('Opponent is required.');
  const location = cleanText(body.location, 80);
  if (location === undefined) return bad('Location is too long.');
  const dual_date = body.dual_date;
  if (typeof dual_date !== 'string' || !DATE_RE.test(dual_date) || Number.isNaN(Date.parse(dual_date))) {
    return bad('Date must be YYYY-MM-DD.');
  }
  const start_weight = body.start_weight ?? 75;
  if (!isWeight(start_weight)) return bad('Start weight must be a weight class.');
  if (body.is_test !== undefined && typeof body.is_test !== 'boolean') return bad('is_test must be true or false.');
  const is_test = body.is_test === true;

  try {
    const roster = await db().from('wr_wrestlers').select('id, default_weight, level, active').eq('active', true);
    if (roster.error) throw roster.error;

    const dual = await db()
      .from('wr_duals')
      .insert({ opponent, location, dual_date, start_weight, is_test })
      .select('id, season, dual_date, opponent, location, start_weight, status, is_test, created_at')
      .single();
    if (dual.error) throw dual.error;

    const { bouts, unplaced } = buildBouts(roster.data ?? [], start_weight);
    const ins = await db().from('wr_bouts').insert(bouts.map((b) => ({ ...b, dual_id: dual.data.id })));
    if (ins.error) {
      await db().from('wr_duals').delete().eq('id', dual.data.id);   // don't leave a dual with no bouts
      throw ins.error;
    }
    console.log('wr_dual_created', dual.data.id, is_test ? 'test' : 'real', bouts.length);
    return json({ dual: dual.data, bouts: bouts.length, unplaced: unplaced.length }, 201);
  } catch (e) {
    return serverError('dual_create', e);
  }
};
