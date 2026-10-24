// A plain signed-in leaf with one action: sign out. Used for "not set up yet" and
// for a player record that wouldn't load.
import type { ReactNode } from 'react';
import { useSignOut } from './useSignOut';
import book from './book.module.css';
import styles from './SignedInNotice.module.css';

interface Props {
  heading: string;
  children: ReactNode;
}

export default function SignedInNotice({ heading, children }: Props) {
  const { signOut, busy, error } = useSignOut();

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
