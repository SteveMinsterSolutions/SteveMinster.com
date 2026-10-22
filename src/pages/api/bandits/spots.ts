// src/pages/api/bandits/spots.ts
// Public roster counter: { rostered, cap, waitlist } and nothing else.
// GATE 1 STUB: no database yet, so this always reports an empty roster.
// Gate 3 replaces the body with a count from the bandits Supabase project.
import type { APIRoute } from 'astro';
import bandits from '../../../data/bandits.json';

export const prerender = false;

export const GET: APIRoute = () =>
  new Response(JSON.stringify({ rostered: 0, cap: bandits.rosterCap, waitlist: 0 }), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
    },
  });
