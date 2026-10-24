// The one Supabase client for Confirmation Quest. Uses the CQ-prefixed vars only;
// the unprefixed PUBLIC_SUPABASE_* vars belong to another page and another database.
import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.PUBLIC_CQ_SUPABASE_URL;
const key = import.meta.env.PUBLIC_CQ_SUPABASE_PUBLISHABLE_KEY;

/** The page's one canonical address. The service worker's scope ends in this slash. */
export const PAGE_PATH = '/sandbox/confirmation-quest/';

// Visits to the no-slash address get the slash added in place, with the query and the
// hash (which may hold #access_token=…) kept intact. This runs before the client below
// is created, so Supabase still reads the hash. No page load happens; the slash form is
// what the service worker controls and what the installed app opens.
if (typeof window !== 'undefined' && window.location.pathname === PAGE_PATH.slice(0, -1)) {
  const { search, hash } = window.location;
  window.history.replaceState(window.history.state, '', PAGE_PATH + search + hash);
}

export interface RedirectError {
  code: string | null;
  description: string;
}

// An auth redirect that failed (an uninvited Google account, an expired link) comes
// back with error params in the hash or query. Read and strip them before the client
// initializes, so the screen can say what happened and the URL is clean.
function takeRedirectError(): RedirectError | null {
  if (typeof window === 'undefined') return null;
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const query = new URLSearchParams(window.location.search);
  const source = hash.has('error') ? hash : query.has('error') ? query : null;
  if (!source) return null;
  const err: RedirectError = {
    code: source.get('error_code'),
    description: source.get('error_description') ?? source.get('error') ?? 'Unknown error',
  };
  for (const k of ['error', 'error_code', 'error_description']) query.delete(k);
  const search = query.toString();
  window.history.replaceState(null, '', window.location.pathname + (search ? `?${search}` : ''));
  return err;
}

export const redirectError = takeRedirectError();

// Implicit flow: a magic link opened in a different browser from the one that
// asked for it still signs in (PKCE would need the original browser's verifier).
export const supabase = createClient(url, key, {
  auth: { flowType: 'implicit', detectSessionInUrl: true, persistSession: true },
});

/** Where auth redirects land: this page, always in its slash form. */
export function pageUrl(): string {
  return window.location.origin + PAGE_PATH;
}

export interface Player {
  id: string;
  display_name: string;
  is_candidate: boolean;
  is_admin: boolean;
  parish: string | null;
  level_scale: number;
}
