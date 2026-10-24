// The signed-in game: one leaf at a time, chosen by ?v= so the back button works
// (the hash stays free for Supabase's auth redirects). Adults also carry the count
// of activities waiting for their approval, shown in the nav and on Home.
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { supabase, type Player } from './supabase';
import Nav, { type View } from './Nav';
import Home from './Home';
import book from './book.module.css';

const VIEWS: View[] = ['home', 'log', 'quiz', 'boards', 'prayers', 'approve'];

function viewFromUrl(isAdult: boolean): View {
  const v = new URLSearchParams(window.location.search).get('v') as View | null;
  if (!v || !VIEWS.includes(v) || (v === 'approve' && !isAdult)) return 'home';
  return v;
}

const UNBUILT: Record<Exclude<View, 'home'>, string> = {
  log: 'Log activity',
  quiz: 'Daily quiz',
  boards: 'Leaderboards',
  prayers: 'Prayers',
  approve: 'Approvals',
};

interface Props {
  player: Player;
  email?: string;
}

export default function Game({ player, email }: Props) {
  const isAdult = !player.is_candidate;
  const [view, setView] = useState<View>(() => viewFromUrl(isAdult));
  const [pendingCount, setPendingCount] = useState<number | null>(null);

  useEffect(() => {
    const onPop = () => setView(viewFromUrl(isAdult));
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [isAdult]);

  const navigate = useCallback((next: View) => {
    setView(next);
    const url = new URL(window.location.href);
    if (next === 'home') url.searchParams.delete('v');
    else url.searchParams.set('v', next);
    window.history.pushState(null, '', url);
    window.scrollTo(0, 0);
  }, []);

  // Refresh the approval count whenever the adult arrives on a page.
  useEffect(() => {
    if (!isAdult) return;
    let cancelled = false;
    supabase.rpc('pending_approvals').then(({ data, error }) => {
      if (cancelled) return;
      // A failed count stays unknown here; the Approve page shows the error itself.
      if (!error && Array.isArray(data)) setPendingCount(data.length);
    });
    return () => {
      cancelled = true;
    };
  }, [isAdult, view]);

  return (
    <GameFrame view={view} isAdult={isAdult} pendingCount={pendingCount} onNavigate={navigate}>
      {view === 'home' ? (
        <Home
          player={player}
          email={email}
          pendingCount={isAdult ? pendingCount : null}
          onOpenApprove={() => navigate('approve')}
        />
      ) : (
        <>
          <h1 className={book.heading}>{UNBUILT[view]}</h1>
          <p className={book.prose}>This page is still being built.</p>
        </>
      )}
    </GameFrame>
  );
}

interface FrameProps {
  view: View;
  isAdult: boolean;
  pendingCount: number | null;
  onNavigate: (view: View) => void;
  children: ReactNode;
}

/** The framed page plus the bottom nav. Exported for dev previews. */
export function GameFrame({ view, isAdult, pendingCount, onNavigate, children }: FrameProps) {
  return (
    <>
      <main className={`${book.folio} ${book.withNav}`}>
        <div className={book.leaf}>{children}</div>
      </main>
      <Nav view={view} isAdult={isAdult} pendingCount={pendingCount} onNavigate={onNavigate} />
    </>
  );
}
