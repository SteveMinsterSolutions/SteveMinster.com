// src/pages/api/bandits/register.ts
// POST — public player sign-up (README §7).
// Order: deadline → honeypot → validate → rate limit → eligibility → insert (RPC) → notify → respond.
// Logs carry ids and error codes only — never names, emails, DOBs or the body.
import type { APIRoute } from 'astro';
import bandits from '../../../data/bandits.json';
import { supabaseServer, banditsEnv } from '../../../lib/bandits/supabase-server';
import { validateSignup, labelOf, jerseyLabel, formatPhone, GRADES, AVAILABILITY, TDC_ID_TYPES, type SignupPayload } from '../../../lib/bandits/validate';
import { eligibilityFlag, type EligibilityFlag } from '../../../lib/bandits/eligibility';
import { signupsClosed } from '../../../lib/bandits/dates';

export const prerender = false;

const DASHBOARD_URL = 'https://www.steveminster.com/sandbox/bandits/coach';
const RATE_LIMIT = 5;            // sign-ups per guardian_email…
const RATE_WINDOW_MS = 10 * 60e3; // …per 10 minutes
const NOTIFY_TIMEOUT_MS = 4000;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

export const POST: APIRoute = async ({ request }) => {
  // 1. Reject early
  if (signupsClosed(bandits.signupDeadline)) {
    return json({ ok: false, error: 'closed' }, 403);
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error();
  } catch {
    return json({ ok: false, error: 'bad_request' }, 400);
  }

  if (typeof body.website === 'string' && body.website.trim() !== '') {
    console.warn('honeypot');
    return json({ ok: true, status: 'rostered', position: null });
  }

  // 2. Validate (same rules as the form)
  const v = validateSignup(body);
  if (!v.ok) return json({ ok: false, error: 'invalid', errors: v.errors }, 400);
  const data = v.data;

  let db;
  try {
    db = supabaseServer();
  } catch {
    console.error('register_failed env');
    return json({ ok: false, error: 'server' }, 500);
  }

  const since = new Date(Date.now() - RATE_WINDOW_MS).toISOString();
  const recent = await db
    .from('bandits_signups')
    .select('id', { count: 'exact', head: true })
    .eq('guardian_email', data.guardian_email)
    .gte('created_at', since);
  if (recent.error) {
    console.error('register_failed ratelimit', recent.error.code);
    return json({ ok: false, error: 'server' }, 500);
  }
  if ((recent.count ?? 0) >= RATE_LIMIT) {
    console.warn('rate_limited');
    return json({ ok: false, error: 'rate_limited' }, 429);
  }

  // 3. Eligibility — flagged, never blocking
  const flag = eligibilityFlag(data.dob, data.grade);

  // 4. Insert via the RPC (lock + cap + insert in one transaction)
  const { data: r, error } = await db.rpc('bandits_register', { p: { ...data, eligibility_flag: flag } });
  if (error) {
    if (error.code === '23505') return json({ ok: false, error: 'duplicate' }, 409);
    console.error('register_failed rpc', error.code);
    return json({ ok: false, error: 'server' }, 500);
  }
  const result = r as { id: string; status: 'rostered' | 'waitlist'; signup_seq: number; rostered_count: number; waitlist_position: number | null };
  console.log('registered', result.id, result.status, flag);

  // 5. Notify — awaited (Vercel can drop post-response work), but never fails the sign-up
  await notify(data, flag, result);

  // 6. Respond
  return json({
    ok: true,
    status: result.status,
    position: result.status === 'waitlist' ? result.waitlist_position : null,
    eligibilityFollowUp: flag !== 'ok',
  });
};

async function notify(
  d: SignupPayload,
  flag: EligibilityFlag,
  r: { id: string; status: string; signup_seq: number; rostered_count: number; waitlist_position: number | null },
) {
  const url = banditsEnv('MAKE_BANDITS_WEBHOOK_URL');
  if (!url) {
    console.warn(`notify_skipped ${r.id}`);
    return;
  }
  // DOB, weight, health notes and the emergency contact are deliberately left out.
  const payload = {
    event: 'signup',
    status: r.status,
    signup_seq: r.signup_seq,
    rostered_count: r.rostered_count,
    waitlist_position: r.waitlist_position ?? null,
    player: `${d.player_first} ${d.player_last}`,
    grade: labelOf(GRADES, d.grade),
    eligibility_flag: flag,
    jersey: jerseyLabel(d.jersey_scale, d.jersey_size),
    numbers: [d.number_choice_1, d.number_choice_2, d.number_choice_3],
    helmet: d.helmet,
    avail_bbtl: labelOf(AVAILABILITY, d.avail_bbtl),
    avail_tdc: labelOf(AVAILABILITY, d.avail_tdc),
    tdc_id_type: labelOf(TDC_ID_TYPES, d.tdc_id_type),
    guardian_name: d.guardian_name,
    guardian_phone: formatPhone(d.guardian_phone),
    guardian_email: d.guardian_email,
    dashboard_url: DASHBOARD_URL,
  };
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), NOTIFY_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: ctrl.signal,
    });
    if (!res.ok) console.error(`notify_failed ${r.id} http_${res.status}`);
  } catch (e) {
    console.error(`notify_failed ${r.id} ${(e as Error).name}`);
  } finally {
    clearTimeout(timer);
  }
}
