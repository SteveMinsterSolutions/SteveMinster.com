// Warriors wrestling: server-only helpers for /api/wrestling/*.
// SERVER ONLY — never import from a component or client script. The service key
// bypasses RLS; the browser only ever talks to /api/wrestling/*.
// Env comes from process.env (Vercel at runtime). Never log env values.
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { APIContext } from 'astro';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const env = (name: string) => (process.env[name] ?? '').replace(/^﻿/, '').trim();

let client: SupabaseClient | null = null;
export function db(): SupabaseClient {
  if (client) return client;
  const url = env('WR_SUPABASE_URL');
  const key = env('WR_SUPABASE_SERVICE_KEY');
  if (!url || !key) throw new Error('wr_env_missing');
  client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return client;
}

// ─── HTTP ────────────────────────────────────────────────────────────────────

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (v: unknown): v is string => typeof v === 'string' && UUID_RE.test(v);

export const PUBLIC_CACHE = 'public, s-maxage=2, stale-while-revalidate=5';

export const json = (body: unknown, status = 200, cache = 'no-store') =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': cache } });
export const bad = (message: string) => json({ error: 'invalid', message }, 400);
export const notFound = (what = 'Not found.') => json({ error: 'not_found', message: what }, 404);

/** Logs only a code, never row data or env. */
export function serverError(tag: string, e: unknown) {
  const err = e as { code?: string; message?: string };
  console.error(`wr_${tag}`, err?.code ?? err?.message ?? 'unknown');
  return json({ error: 'server', message: 'Server error. Try again.' }, 500);
}

export async function readObject(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const b = await request.json();
    return b && typeof b === 'object' && !Array.isArray(b) ? (b as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/** Trimmed text or null; undefined when too long. */
export function cleanText(v: unknown, max: number): string | null | undefined {
  if (v === null || v === undefined) return null;
  if (typeof v !== 'string') return undefined;
  const s = v.trim().replace(/\s+/g, ' ');
  if (s.length > max) return undefined;
  return s || null;
}

/** Bump updated_at on the dual (and bout) so follow pages see a fresh snapshot time. */
export async function touch(dualId: string, boutId?: string) {
  const now = new Date().toISOString();
  const ops = [db().from('wr_duals').update({ updated_at: now }).eq('id', dualId)];
  if (boutId) ops.push(db().from('wr_bouts').update({ updated_at: now }).eq('id', boutId));
  const res = await Promise.all(ops);
  const err = res.find((r) => r.error)?.error;
  if (err) throw err;
}

// ─── Scorer session (PIN → signed httpOnly cookie, 12 h) ─────────────────────

export const COOKIE = 'wr_scorer';
const TTL_MS = 12 * 60 * 60 * 1000;

const hmac = (data: string) => {
  const secret = env('WR_SESSION_SECRET');
  if (secret.length < 32) throw new Error('wr_secret_missing');
  return createHmac('sha256', secret).update(data).digest('base64url');
};

const safeEqual = (a: string, b: string) => {
  // Hash both so lengths match and the compare is constant-time.
  const ha = createHmac('sha256', 'wr-cmp').update(a).digest();
  const hb = createHmac('sha256', 'wr-cmp').update(b).digest();
  return timingSafeEqual(ha, hb);
};

/** Constant-time PIN check. Throws if the PIN env is missing or malformed. */
export function pinMatches(pin: unknown): boolean {
  const expected = env('WR_SCORER_PIN');
  if (!/^\d{4,8}$/.test(expected)) throw new Error('wr_pin_missing');
  return safeEqual(typeof pin === 'string' ? pin : String(pin ?? ''), expected);
}

export function issueSession(ctx: APIContext) {
  const exp = Date.now() + TTL_MS;
  const payload = `v1.${exp}`;
  ctx.cookies.set(COOKIE, `${payload}.${hmac(payload)}`, {
    httpOnly: true,
    secure: import.meta.env.PROD,
    sameSite: 'strict',
    path: '/',
    maxAge: TTL_MS / 1000,
  });
}

export const clearSession = (ctx: APIContext) => ctx.cookies.delete(COOKIE, { path: '/' });

export function hasSession(ctx: APIContext): boolean {
  const v = ctx.cookies.get(COOKIE)?.value ?? '';
  const m = /^(v1\.(\d{10,16}))\.([A-Za-z0-9_-]+)$/.exec(v);
  if (!m) return false;
  if (Number(m[2]) < Date.now()) return false;
  try {
    return safeEqual(m[3], hmac(m[1]));
  } catch {
    return false;
  }
}

/** null when the scorer cookie is valid; otherwise a 401 Response to return as-is. */
export function requireScorer(ctx: APIContext): Response | null {
  return hasSession(ctx) ? null : json({ error: 'unauthenticated', message: 'Enter the scorer PIN.' }, 401);
}
