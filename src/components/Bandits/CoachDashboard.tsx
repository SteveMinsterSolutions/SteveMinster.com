import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabaseBrowser } from '../../lib/bandits/supabase-browser';
import CoachRoster, { type Api } from './CoachRoster';
import './coach.css';

/**
 * CoachDashboard — auth shell for /sandbox/bandits/coach (README §9).
 * Google sign-in or magic link via Supabase Auth (PKCE; the code is exchanged
 * automatically on load because detectSessionInUrl is on). Only invited users
 * can get a link (shouldCreateUser: false); Google can sign in anyone, so the
 * API's bandits_staff allowlist check is what gates the roster either way.
 */

const COACH_PATH = '/sandbox/bandits/coach';
// Remembers which sign-in started the redirect, so a failed return gets the right help text.
const METHOD_KEY = 'bandits-coach-signin';
type Method = 'google' | 'email';

function takeMethod(): Method {
  try {
    const m = sessionStorage.getItem(METHOD_KEY);
    sessionStorage.removeItem(METHOD_KEY);
    return m === 'google' ? 'google' : 'email';
  } catch { return 'email'; }
}

export default function CoachDashboard() {
  const sb = supabaseBrowser();
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [linkProblem, setLinkProblem] = useState<Method | null>(null);

  useEffect(() => {
    if (!sb) { setReady(true); return; }
    const url = new URL(window.location.href);
    const hash = new URLSearchParams(url.hash.slice(1));
    const urlError = url.searchParams.get('error_description') ?? hash.get('error_description');
    const hadCode = url.searchParams.has('code');
    const method = hadCode || urlError ? takeMethod() : null;

    // getSession waits for the client's init, which includes the PKCE code exchange.
    sb.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (!data.session && (urlError || hadCode)) {
        setLinkProblem(method ?? 'email');
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

function Login({ sb, linkProblem }: { sb: SB; linkProblem: Method | null }) {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'rate' | 'error'>('idle');
  const [google, setGoogle] = useState<'idle' | 'redirecting' | 'error'>('idle');

  async function onGoogle() {
    if (google === 'redirecting') return;
    setGoogle('redirecting');
    try { sessionStorage.setItem(METHOD_KEY, 'google'); } catch { /* private mode: generic help text */ }
    const { error } = await sb.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}${COACH_PATH}` },
    });
    // On success the browser is already navigating to Google.
    if (error) setGoogle('error');
  }

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
      <p className="cd-muted">Staff only. Sign in with Google, or enter your email and we'll send a one-time sign-in link.</p>
      {linkProblem === 'google' && (
        <div className="cd-alert" role="alert">
          <p><strong>Google sign-in didn't finish.</strong> Try again, and finish in the same browser you started in — or use the email link below.</p>
        </div>
      )}
      {linkProblem === 'email' && (
        <div className="cd-alert" role="alert">
          <p><strong>That sign-in link didn't work.</strong> Links expire after one use or about an hour, and they must be opened in the <strong>same browser</strong> that requested them. On iPhone, if the link opens inside the Gmail app, choose “Open in Safari” — or request a new link from Safari.</p>
        </div>
      )}
      <button type="button" className="cd-btn cd-btn-outline cd-google" onClick={onGoogle} disabled={google === 'redirecting'}>
        <GoogleG />
        <span>{google === 'redirecting' ? 'Opening Google…' : 'Sign in with Google'}</span>
      </button>
      {google === 'error' && <p className="cd-alert" role="alert">Couldn't start Google sign-in. Try again, or use the email link below.</p>}
      <div className="cd-or" role="separator" aria-label="or"><span aria-hidden="true">or</span></div>
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

// Standard four-colour Google "G" mark.
function GoogleG() {
  return (
    <svg className="cd-google-g" width="18" height="18" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}
