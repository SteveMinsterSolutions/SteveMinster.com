import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabaseBrowser } from '../../lib/bandits/supabase-browser';
import CoachRoster, { type Api } from './CoachRoster';
import './coach.css';

/**
 * CoachDashboard — auth shell for /sandbox/bandits/coach (README §9).
 * Magic link via Supabase Auth (PKCE; the code is exchanged automatically on
 * load because detectSessionInUrl is on). Only invited users can get a link
 * (shouldCreateUser: false); the API then checks the bandits_staff allowlist.
 */

const COACH_PATH = '/sandbox/bandits/coach';

export default function CoachDashboard() {
  const sb = supabaseBrowser();
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [linkProblem, setLinkProblem] = useState<string | null>(null);

  useEffect(() => {
    if (!sb) { setReady(true); return; }
    const url = new URL(window.location.href);
    const hash = new URLSearchParams(url.hash.slice(1));
    const urlError = url.searchParams.get('error_description') ?? hash.get('error_description');
    const hadCode = url.searchParams.has('code');

    // getSession waits for the client's init, which includes the PKCE code exchange.
    sb.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (!data.session && (urlError || hadCode)) {
        setLinkProblem(urlError ?? 'That sign-in link could not be used.');
      }
      if (hadCode || urlError) window.history.replaceState(null, '', COACH_PATH);
      setReady(true);
    });
    const { data: sub } = sb.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, [sb]);

  const signOut = useCallback(async () => {
    await sb?.auth.signOut({ scope: 'local' });
    setSession(null);
  }, [sb]);

  // Every staff API call carries the current (auto-refreshed) access token.
  const api: Api = useCallback(async (path, init = {}) => {
    const { data } = await sb!.auth.getSession();
    const token = data.session?.access_token;
    if (!token) { setSession(null); throw new Error('signed_out'); }
    const res = await fetch(path, { ...init, headers: { ...(init.headers ?? {}), Authorization: `Bearer ${token}` } });
    if (res.status === 401) {
      await sb!.auth.signOut({ scope: 'local' });
      setSession(null);
      throw new Error('signed_out');
    }
    return res;
  }, [sb]);

  if (!sb) {
    return <Panel title="Dashboard not configured"><p>The Supabase settings for this deployment are missing. Ask Steve to check the <code>PUBLIC_BANDITS_*</code> environment variables.</p></Panel>;
  }
  if (!ready) return <Panel title="Coach dashboard"><p role="status">Loading…</p></Panel>;
  if (!session) return <Login sb={sb} linkProblem={linkProblem} />;
  return <CoachRoster api={api} email={session.user.email ?? ''} onSignOut={signOut} />;
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="cd-auth">
      <h1 className="cd-h1">{title}</h1>
      {children}
    </section>
  );
}

type SB = NonNullable<ReturnType<typeof supabaseBrowser>>;

function Login({ sb, linkProblem }: { sb: SB; linkProblem: string | null }) {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'rate' | 'error'>('idle');

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (state === 'sending') return;
    setState('sending');
    const { error } = await sb.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { shouldCreateUser: false, emailRedirectTo: `${window.location.origin}${COACH_PATH}` },
    });
    if (!error) return setState('sent');
    if (error.status === 429 || /rate limit/i.test(error.message)) return setState('rate');
    // Unknown/uninvited addresses also land here; don't reveal who is on the list.
    if (error.status && error.status < 500) return setState('sent');
    setState('error');
  }

  return (
    <Panel title="Coach dashboard">
      <p className="cd-muted">Staff only. Enter your email and we'll send a one-time sign-in link.</p>
      {linkProblem && (
        <div className="cd-alert" role="alert">
          <p><strong>That sign-in link didn't work.</strong> Links expire after one use or about an hour, and they must be opened in the <strong>same browser</strong> that requested them. On iPhone, if the link opens inside the Gmail app, choose “Open in Safari” — or request a new link from Safari.</p>
        </div>
      )}
      <form className="cd-login" onSubmit={onSubmit}>
        <label htmlFor="cd-email">Email</label>
        <input id="cd-email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <button type="submit" className="cd-btn cd-btn-dark" disabled={state === 'sending'}>
          {state === 'sending' ? 'Sending…' : 'Email me a sign-in link'}
        </button>
      </form>
      <div aria-live="polite">
        {state === 'sent' && (
          <p className="cd-note">If that address is on the staff list, a sign-in link is on its way. <strong>Request one link and wait</strong> a minute or two, then open it on this same device and browser.</p>
        )}
        {state === 'rate' && <p className="cd-alert">Too many link requests. Wait a few minutes and check your inbox for the earlier link before asking again.</p>}
        {state === 'error' && <p className="cd-alert">Something went wrong sending the link. Try again in a minute.</p>}
      </div>
    </Panel>
  );
}
