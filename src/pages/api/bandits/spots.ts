// src/pages/api/bandits/spots.ts
// Public roster counter: { rostered, cap, waitlist } and nothing else.
// cap comes from bandits_settings (the same value the DB enforces).
import type { APIRoute } from 'astro';
import { supabaseServer } from '../../../lib/bandits/supabase-server';

export const prerender = false;

const json = (body: unknown, status: number, cache: string) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': cache } });

export const GET: APIRoute = async () => {
  try {
    const db = supabaseServer();
    const count = (status: string) =>
      db.from('bandits_signups').select('id', { count: 'exact', head: true }).eq('status', status);
    const [rostered, waitlist, settings] = await Promise.all([
      count('rostered'),
      count('waitlist'),
      db.from('bandits_settings').select('roster_cap').single(),
    ]);
    const err = rostered.error ?? waitlist.error ?? settings.error;
    if (err) throw err;
    return json(
      { rostered: rostered.count ?? 0, cap: settings.data?.roster_cap ?? 22, waitlist: waitlist.count ?? 0 },
      200,
      'public, s-maxage=30, stale-while-revalidate=60',
    );
  } catch (e) {
    console.error('spots_failed', (e as { code?: string; message?: string }).code ?? (e as Error).message);
    return json({ error: 'unavailable' }, 500, 'no-store');
  }
};
