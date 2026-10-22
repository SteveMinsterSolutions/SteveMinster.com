// Service-role Supabase client for the Bandits API routes.
// SERVER ONLY — never import this from a component or client script. The key
// bypasses RLS; the browser only ever talks to /api/bandits/*.
// Env is read from process.env (Vercel at runtime; locally, shell-inject before
// `npm run dev` — astro dev doesn't load .env for server endpoints).
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

// Strip a pasted BOM / stray whitespace (README §11).
const env = (name: string) => (process.env[name] ?? '').replace(/^﻿/, '').trim();

export function supabaseServer(): SupabaseClient {
  if (client) return client;
  const url = env('BANDITS_SUPABASE_URL');
  const key = env('BANDITS_SUPABASE_SERVICE_KEY');
  if (!url || !key) throw new Error('bandits_env_missing');
  client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return client;
}

export { env as banditsEnv };
