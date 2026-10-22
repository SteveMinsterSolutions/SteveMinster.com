// Browser Supabase client for the coach page — AUTH ONLY (magic link + session).
// Uses the public anon/publishable key, which can't read any table (RLS on, no
// policies, no grants). All roster data comes from /api/bandits/coach/* with the
// session's access token. PKCE flow, session persisted in localStorage (defaults).
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const clean = (v: string | undefined) => (v ?? '').replace(/^﻿/, '').trim();

let client: SupabaseClient | null | undefined;

/** null when the PUBLIC_BANDITS_* env vars weren't set at build time. */
export function supabaseBrowser(): SupabaseClient | null {
  if (client !== undefined) return client;
  const url = clean(import.meta.env.PUBLIC_BANDITS_SUPABASE_URL);
  const key = clean(import.meta.env.PUBLIC_BANDITS_SUPABASE_ANON_KEY);
  client = url && key
    ? createClient(url, key, { auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } })
    : null;
  return client;
}
