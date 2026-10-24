// A plain signed-in leaf with one action: sign out. Used for "not set up yet" and,
// until Home is built, for players who are set up.
import { useState, type ReactNode } from 'react';
import { supabase } from './supabase';
import book from './book.module.css';
import styles from './SignedInNotice.module.css';

interface Props {
  heading: string;
  children: ReactNode;
}

export default function SignedInNotice({ heading, children }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signOut() {
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.auth.signOut();
    // On success, App hears the auth change and shows sign-in.
    if (err) {
      setError(`Sign-out didn’t finish. The server said: ${err.message}. Reload the page and try again.`);
      setBusy(false);
    }
  }

  return (
    <main className={book.folio}>
      <div className={`${book.leaf} ${styles.leaf}`}>
        <h1 className={book.heading}>{heading}</h1>
        {children}
        {error && (
          <p className={book.error} role="alert">
            {error}
          </p>
        )}
        <button type="button" className={`${book.buttonQuiet} ${styles.signOut}`} onClick={signOut} disabled={busy}>
          {busy ? 'Signing out…' : 'Sign out'}
        </button>
      </div>
    </main>
  );
}
