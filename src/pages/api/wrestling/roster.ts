// src/pages/api/wrestling/roster.ts
// GET (scorer) → active wrestlers, with last names. Scorer view only.
import type { APIRoute } from 'astro';
import { db, json, requireScorer, serverError } from '../../../lib/wrestling/server';

export const prerender = false;

export const GET: APIRoute = async (ctx) => {
  const denied = requireScorer(ctx);
  if (denied) return denied;
  try {
    const { data, error } = await db()
      .from('wr_wrestlers')
      .select('id, first_name, last_name, default_weight, level')
      .eq('active', true)
      .order('default_weight', { ascending: true, nullsFirst: false })
      .order('first_name');
    if (error) throw error;
    return json({ wrestlers: data ?? [] });
  } catch (e) {
    return serverError('roster', e);
  }
};
