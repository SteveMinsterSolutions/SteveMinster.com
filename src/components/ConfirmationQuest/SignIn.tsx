// Title page and sign-in: Google, or email with a magic link and a one-time code.
// Inside the installed app (display-mode: standalone) the code leads, because on
// iPhone a link opened from Mail signs in to Safari, not to the app.
import { useId, useState, type FormEvent } from 'react';
import { getSupabase, pageUrl } from './supabase';
import { authMessage } from './authErrors';
import IlluminatedTitle from './IlluminatedTitle';
import Fleuron from './Fleuron';
import book from './book.module.css';
import styles from './SignIn.module.css';

interface Props {
  /** A failed auth redirect, already worded for the player. */
  initialError?: string | null;
  /** Dev-only screenshots: start in a given state without touching Supabase. */
  preview?: { sent?: boolean; email?: string; standalone?: boolean };
}

type Busy = null | 'google' | 'send' | 'verify';

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SignIn({ initialError = null, preview }: Props) {
  const [standalone] = useState(() => preview?.standalone ?? isStandalone());
  const [email, setEmail] = useState(preview?.email ?? '');
  const [code, setCode] = useState('');
  const [sentTo, setSentTo] = useState<string | null>(preview?.sent ? (preview.email ?? '') : null);
  const [wantsCode, setWantsCode] = useState(false);
  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState<{ text: string; field?: 'email' | 'code' } | null>(
    initialError ? { text: initialError } : null,
  );
  const ids = { email: useId(), code: useId(), error: useId() };

  const showCode = standalone || sentTo !== null || wantsCode;
  // Only the next step is filled: sending, until an email is out or a code is in hand.
  const codeIsNext = sentTo !== null || wantsCode;

  async function signInWithGoogle() {
    setError(null);
    setBusy('google');
    const { error: err } = await getSupabase().auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: pageUrl() },
    });
    // On success the browser is already leaving for Google.
    if (err) {
      setError({ text: authMessage(err) });
      setBusy(null);
    }
  }

  async function sendEmail(e: FormEvent) {
    e.preventDefault();
    const address = email.trim();
    if (!EMAIL_SHAPE.test(address)) {
      setError({ text: 'Enter the email address the game admin invited.', field: 'email' });
      return;
    }
    setError(null);
    setBusy('send');
    const { error: err } = await getSupabase().auth.signInWithOtp({
      email: address,
      options: { shouldCreateUser: false, emailRedirectTo: pageUrl() },
    });
    setBusy(null);
    if (err) {
      setError({ text: authMessage(err), field: 'email' });
      return;
    }
    setSentTo(address);
  }

  async function verifyCode(e: FormEvent) {
    e.preventDefault();
    const address = email.trim();
    const token = code.replace(/\s/g, '');
    if (!EMAIL_SHAPE.test(address)) {
      setError({ text: 'Enter your email address first, then the code.', field: 'email' });
      return;
    }
    if (!/^\d{6,10}$/.test(token)) {
      setError({ text: 'Enter the 6 to 10 digit code from the email.', field: 'code' });
      return;
    }
    setError(null);
    setBusy('verify');
    const { error: err } = await getSupabase().auth.verifyOtp({ email: address, token, type: 'email' });
    // On success, App hears the auth change and moves on.
    if (err) {
      setError({ text: authMessage(err), field: 'code' });
      setBusy(null);
    }
  }

  const describe = (field: 'email' | 'code') => (error?.field === field ? ids.error : undefined);

  return (
    <main className={book.folio}>
      <div className={`${book.leaf} ${styles.titlePage}`}>
        <IlluminatedTitle text="Confirmation Quest" align="center" />
        <p className={styles.tagline}>
          A book of days for three candidates and the people walking with them.
        </p>

        <Fleuron />

        <div className={styles.form}>
          {error && (
            <p id={ids.error} className={book.error} role="alert">
              {error.text}
            </p>
          )}

          <button
            type="button"
            className={book.buttonQuiet}
            onClick={signInWithGoogle}
            disabled={busy !== null}
          >
            <GoogleMark />
            {busy === 'google' ? 'Opening Google…' : 'Sign in with Google'}
          </button>

          <p className={styles.or}>or with your email</p>

          <form onSubmit={sendEmail} noValidate>
            <div className={book.field}>
              <label className={book.label} htmlFor={ids.email}>
                Email
              </label>
              <input
                id={ids.email}
                className={book.input}
                type="email"
                inputMode="email"
                autoComplete="email"
                autoCapitalize="none"
                spellCheck={false}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={error?.field === 'email' || undefined}
                aria-describedby={describe('email')}
              />
            </div>
            {standalone && sentTo === null && (
              <p className={book.fine}>
                In this app, use the code from the email. Its link may open your browser instead.
              </p>
            )}
            <button
              type="submit"
              className={`${codeIsNext ? book.buttonQuiet : book.button} ${styles.gap}`}
              disabled={busy !== null}
            >
              {busy === 'send'
                ? 'Sending…'
                : sentTo !== null
                  ? 'Send another email'
                  : standalone
                    ? 'Email me a code'
                    : 'Email me a sign-in link'}
            </button>
          </form>

          {sentTo !== null && (
            <p className={`${book.notice} ${styles.sent}`} role="status">
              {standalone
                ? `Email sent to ${sentTo}. Enter its code below.`
                : `Email sent to ${sentTo}. Open its link on this device, or enter its code below.`}
            </p>
          )}

          {showCode ? (
            <form onSubmit={verifyCode} noValidate className={styles.codeForm}>
              <div className={book.field}>
                <label className={book.label} htmlFor={ids.code}>
                  Code from the email
                </label>
                <input
                  id={ids.code}
                  className={`${book.input} ${book.code}`}
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]*"
                  maxLength={12}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/[^\d\s]/g, ''))}
                  aria-invalid={error?.field === 'code' || undefined}
                  aria-describedby={describe('code')}
                />
              </div>
              <button
                type="submit"
                className={codeIsNext ? book.button : book.buttonQuiet}
                disabled={busy !== null}
              >
                {busy === 'verify' ? 'Checking…' : 'Sign in with code'}
              </button>
            </form>
          ) : (
            <button type="button" className={book.link} onClick={() => setWantsCode(true)}>
              I already have a code
            </button>
          )}
        </div>

        <p className={`${book.fine} ${styles.footnote}`}>
          Only invited players can sign in. If your email isn’t working, ask the game admin
          which address they used.
        </p>
      </div>
    </main>
  );
}

// Google's standard "G" mark, which Google's sign-in branding rules ask for.
function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}
