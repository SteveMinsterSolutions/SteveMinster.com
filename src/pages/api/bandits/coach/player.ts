// src/pages/api/bandits/coach/player.ts
// PATCH (staff) — { id, ...fields }; only the staff-managed checklist fields may change.
// updated_at is set by the bandits_signups_touch trigger on every update.
// 409s: duplicate assigned_number (unique index) and roster_full (cap trigger).
import type { APIRoute } from 'astro';
import { requireStaff } from '../../../../lib/bandits/staff-auth';
import { supabaseServer } from '../../../../lib/bandits/supabase-server';

export const prerender = false;

const BOOLEAN_FIELDS = ['paid', 'waiver_received', 'birth_cert_received', 'tdc_id_received', 'grade_proof_received', 'loaner_assigned'];
const STATUSES = ['rostered', 'waitlist', 'withdrawn'];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
const bad = (message: string) => json({ error: 'invalid', message }, 400);

export const PATCH: APIRoute = async ({ request }) => {
  const staff = await requireStaff(request);
  if (staff instanceof Response) return staff;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error();
  } catch {
    return bad('Invalid request.');
  }

  const { id, ...fields } = body;
  if (typeof id !== 'string' || !UUID_RE.test(id)) return bad('Invalid player id.');

  const patch: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(fields)) {
    if (BOOLEAN_FIELDS.includes(k)) {
      if (typeof v !== 'boolean') return bad(`${k} must be true or false.`);
      patch[k] = v;
    } else if (k === 'assigned_number') {
      if (v !== null && !(Number.isInteger(v) && (v as number) >= 0 && (v as number) <= 99)) return bad('Numbers are 0–99.');
      patch[k] = v;
    } else if (k === 'staff_notes') {
      if (v !== null && typeof v !== 'string') return bad('Notes must be text.');
      const s = typeof v === 'string' ? v.trim() : '';
      if (s.length > 2000) return bad('Notes are limited to 2,000 characters.');
      patch[k] = s || null;
    } else if (k === 'status') {
      if (!STATUSES.includes(v as string)) return bad('Unknown status.');
      patch[k] = v;
    } else {
      return bad(`${k} can't be changed here.`);
    }
  }
  if (!Object.keys(patch).length) return bad('Nothing to update.');

  const { data, error } = await supabaseServer().from('bandits_signups').update(patch).eq('id', id).select('*').maybeSingle();
  if (error) {
    if (error.code === '23505') return json({ error: 'number_taken', message: 'Number already assigned.' }, 409);
    if (error.code === 'P0001' && error.message === 'roster_full') return json({ error: 'roster_full', message: 'Roster is full.' }, 409);
    console.error('patch_failed', id, error.code);
    return json({ error: 'server', message: "Couldn't save. Try again." }, 500);
  }
  if (!data) return json({ error: 'not_found', message: 'Player not found.' }, 404);
  console.log('patched', id, Object.keys(patch).join(','));
  return json({ player: data });
};
