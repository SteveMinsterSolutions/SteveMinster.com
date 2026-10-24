// Sign out, reporting a failure in the house style. On success App hears the auth
// change and shows sign-in, so there is nothing else to do here.
import { useState } from 'react';
import { supabase } from './supabase';

export function useSignOut() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signOut() {
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.auth.signOut();
    if (err) {
      setError(`Sign-out didn’t finish. The server said: ${err.message}. Reload the page and try again.`);
      setBusy(false);
    }
  }

  return { signOut, busy, error };
}
