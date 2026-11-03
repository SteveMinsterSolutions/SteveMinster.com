// src/pages/api/wrestling/events.ts
// POST  (scorer) one event, or { events: [...] } (up to 50): upsert by client-generated id,
//       so offline replay is idempotent. A replayed POST never overwrites a later void.
//       Points come from the code (server-side), never from the client.
//       Event: { id, bout_id, period, side, code, created_at? }  (created_at = client tap time)
// PATCH (scorer) { id, voided } → Undo (or redo).
import type { APIRoute } from 'astro';
import { isEventCode, isPeriod } from '../../../lib/wrestling/constants';
import { pointsFor } from '../../../lib/wrestling/scoring';
import { bad, db, isUuid, json, notFound, readObject, requireScorer, serverError, touch } from '../../../lib/wrestling/server';

export const prerender = false;

const MAX_SKEW_MS = 5 * 60 * 1000;
const MAX_AGE_MS = 3 * 24 * 60 * 60 * 1000;

/** Client tap time if sane (offline replay keeps order), else server time. */
function tapTime(v: unknown): string {
  const now = Date.now();
  const t = typeof v === 'string' ? Date.parse(v) : NaN;
  return Number.isFinite(t) && t <= now + MAX_SKEW_MS && t >= now - MAX_AGE_MS
    ? new Date(t).toISOString()
    : new Date(now).toISOString();
}

export const POST: APIRoute = async (ctx) => {
  const denied = requireScorer(ctx);
  if (denied) return denied;
  const body = await readObject(ctx.request);
  if (!body) return bad('Invalid request.');
  const list = Array.isArray(body.events) ? body.events : [body];
  if (!list.length || list.length > 50) return bad('Send 1–50 events.');

  const rows = [];
  for (const raw of list) {
    const e = (raw ?? {}) as Record<string, unknown>;
    if (!isUuid(e.id)) return bad('Event id must be a UUID.');
    if (!isUuid(e.bout_id)) return bad('Unknown bout.');
    if (!isPeriod(e.period)) return bad('Unknown period.');
    if (e.side !== 'us' && e.side !== 'them') return bad('Side is us or them.');
    if (!isEventCode(e.code)) return bad('Unknown event code.');
    rows.push({
      id: e.id, bout_id: e.bout_id, period: e.period, side: e.side, code: e.code,
      points: pointsFor(e.code)!, voided: false, created_at: tapTime(e.created_at),
    });
  }

  try {
    const boutIds = [...new Set(rows.map((r) => r.bout_id))];
    const bouts = await db().from('wr_bouts').select('id, dual_id').in('id', boutIds);
    if (bouts.error) throw bouts.error;
    if ((bouts.data ?? []).length !== boutIds.length) {
      return json({ error: 'bout_missing', message: 'That bout no longer exists.' }, 409);
    }
    const { error } = await db().from('wr_events').upsert(rows, { onConflict: 'id', ignoreDuplicates: true });
    if (error) throw error;
    for (const b of bouts.data ?? []) await touch(b.dual_id, b.id);
    return json({ ok: true, ids: rows.map((r) => r.id) });
  } catch (e) {
    return serverError('events_post', e);
  }
};

export const PATCH: APIRoute = async (ctx) => {
  const denied = requireScorer(ctx);
  if (denied) return denied;
  const body = await readObject(ctx.request);
  if (!body) return bad('Invalid request.');
  if (!isUuid(body.id)) return bad('Event id must be a UUID.');
  if (typeof body.voided !== 'boolean') return bad('voided must be true or false.');
  for (const k of Object.keys(body)) if (k !== 'id' && k !== 'voided') return bad(`${k} can't be changed here.`);

  try {
    const { data, error } = await db().from('wr_events').update({ voided: body.voided }).eq('id', body.id)
      .select('id, bout_id, voided').maybeSingle();
    if (error) throw error;
    if (!data) return notFound('Event not found.');
    const bout = await db().from('wr_bouts').select('dual_id').eq('id', data.bout_id).maybeSingle();
    if (bout.error) throw bout.error;
    if (bout.data) await touch(bout.data.dual_id, data.bout_id);
    return json({ event: data });
  } catch (e) {
    return serverError('events_patch', e);
  }
};
