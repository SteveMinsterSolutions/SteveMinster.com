// Staff gate for /api/bandits/coach/* (README §7). SERVER ONLY.
// Authorization: Bearer <Supabase access token> → verified with auth.getUser →
// email (lower-cased) must be in bandits_staff. Logs carry codes only, never emails.
import { supabaseServer } from './supabase-server';

const deny = (status: number, error: string) =>
  new Response(JSON.stringify({ error }), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

/** Returns the staff email, or a 401/403/500 Response to return as-is. */
export async function requireStaff(request: Request): Promise<{ email: string } | Response> {
  const m = /^Bearer\s+(\S+)$/i.exec(request.headers.get('authorization') ?? '');
  if (!m) return deny(401, 'unauthenticated');

  let db;
  try {
    db = supabaseServer();
  } catch {
    console.error('staff_auth_failed env');
    return deny(500, 'server');
  }

  const { data, error } = await db.auth.getUser(m[1]);
  if (error || !data.user?.email) return deny(401, 'unauthenticated');

  const email = data.user.email.toLowerCase();
  const staff = await db.from('bandits_staff').select('email').eq('email', email).maybeSingle();
  if (staff.error) {
    console.error('staff_auth_failed lookup', staff.error.code);
    return deny(500, 'server');
  }
  if (!staff.data) {
    console.warn('staff_denied', data.user.id);
    return deny(403, 'forbidden');
  }
  return { email };
}
