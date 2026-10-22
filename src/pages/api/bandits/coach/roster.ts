// src/pages/api/bandits/coach/roster.ts
// GET (staff) — every sign-up, rostered → waitlist → withdrawn, then sign-up order.
// Also returns the live cap so the dashboard's "Move to roster" guard matches the DB.
import type { APIRoute } from 'astro';
import { requireStaff } from '../../../../lib/bandits/staff-auth';
import { supabaseServer } from '../../../../lib/bandits/supabase-server';

export const prerender = false;

const STATUS_ORDER: Record<string, number> = { rostered: 0, waitlist: 1, withdrawn: 2 };

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

export const GET: APIRoute = async ({ request }) => {
  const staff = await requireStaff(request);
  if (staff instanceof Response) return staff;

  const db = supabaseServer();
  const [rows, settings] = await Promise.all([
    db.from('bandits_signups').select('*').order('signup_seq'),
    db.from('bandits_settings').select('roster_cap').single(),
  ]);
  const err = rows.error ?? settings.error;
  if (err) {
    console.error('roster_failed', err.code);
    return json({ error: 'server' }, 500);
  }
  const players = [...(rows.data ?? [])].sort(
    (a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || a.signup_seq - b.signup_seq,
  );
  return json({ cap: settings.data?.roster_cap ?? 22, players });
};
