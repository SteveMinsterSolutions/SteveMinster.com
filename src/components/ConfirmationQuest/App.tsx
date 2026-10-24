// Confirmation Quest: decides which leaf to show from the auth session and the
// player's row. No players row means "not set up yet", and nothing else.
import { useEffect, useState, type ReactElement } from 'react';
import type { Session } from '@supabase/supabase-js';
import { getSupabase, isConfigured, redirectError, type Player } from './supabase';
import { authMessage } from './authErrors';
import { registerServiceWorker } from './registerServiceWorker';
import SignIn from './SignIn';
import SignedInNotice from './SignedInNotice';
import Game, { GameFrame } from './Game';
import { HomeLeaf } from './Home';
import { LogLeaf } from './LogActivity';
import type { ActivityType, ActivityRow } from './activities';
import { todayCentral, addDays } from './dates';
import book from './book.module.css';

type PlayerState =
  | { kind: 'loading' }
  | { kind: 'missing' }
  | { kind: 'found'; player: Player }
  | { kind: 'error'; message: string };

const initialAuthError = redirectError
  ? authMessage({ code: redirectError.code, message: redirectError.description })
  : null;

export default function App() {
  // Read after mount: the page is server-rendered, where there is no URL to read.
  const [preview, setPreview] = useState<ReactElement | null>(null);
  useEffect(() => {
    if (import.meta.env.DEV) setPreview(devPreview());
    registerServiceWorker();
  }, []);
  if (preview) return preview;
  // Same answer at build time and in the browser (the vars are inlined), so the
  // server-rendered page and the hydrated one agree.
  if (!isConfigured) return <NotConfigured />;
  return <LiveApp />;
}

function NotConfigured() {
  return (
    <main className={book.folio}>
      <p className={`${book.leaf} ${book.prose}`}>The game isn’t configured on this deployment.</p>
    </main>
  );
}

function LiveApp() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [player, setPlayer] = useState<PlayerState>({ kind: 'loading' });
  const userId = session?.user.id;

  useEffect(() => {
    // Fires INITIAL_SESSION on subscribe, so no separate getSession() is needed.
    // Keep this callback synchronous: Supabase calls made inside it can deadlock.
    const { data } = getSupabase().auth.onAuthStateChange((_event, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    setPlayer({ kind: 'loading' });
    getSupabase()
      .from('players')
      .select('id, display_name, is_candidate, is_admin, parish, level_scale')
      .eq('id', userId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) setPlayer({ kind: 'error', message: error.message });
        else if (!data) setPlayer({ kind: 'missing' });
        else setPlayer({ kind: 'found', player: data as Player });
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (session === undefined) return <Opening />;
  if (session === null) return <SignIn initialError={initialAuthError} />;

  switch (player.kind) {
    case 'loading':
      return <Opening />;
    case 'missing':
      return <NotSetUp email={session.user.email} />;
    case 'error':
      return (
        <SignedInNotice heading="Your page didn’t load">
          <p className={book.error} role="alert">
            The game couldn’t read your player record. The server said: {player.message}
          </p>
          <p className={book.prose}>Reload the page. If this keeps happening, tell the game admin.</p>
        </SignedInNotice>
      );
    case 'found':
      return <Game player={player.player} email={session.user.email} />;
  }
}

function NotSetUp({ email }: { email?: string }) {
  return (
    <SignedInNotice heading="Not set up yet">
      <p className={book.prose}>
        {email ? <>You’re signed in as {email}, but this account</> : <>This account</>} isn’t set up
        in the game yet. Ask the game admin to add you, then sign in again.
      </p>
    </SignedInNotice>
  );
}

function Opening() {
  return (
    <main className={book.folio} aria-busy="true">
      <p className={`${book.leaf} ${book.fine}`}>Opening the book…</p>
    </main>
  );
}

// Dev-only: ?preview=<screen>&theme=light|dark renders a leaf without Supabase, for
// screenshots. import.meta.env.DEV is false in builds, so this never ships.
function devPreview() {
  const params = new URLSearchParams(window.location.search);
  const theme = params.get('theme');
  if (theme === 'light' || theme === 'dark') document.documentElement.dataset.theme = theme;
  const sample = 'reader@example.com';
  switch (params.get('preview')) {
    case 'signin':
      return <SignIn />;
    case 'signin-sent':
      return <SignIn preview={{ sent: true, email: sample }} />;
    case 'signin-app':
      return <SignIn preview={{ standalone: true }} />;
    case 'signin-error':
      return (
        <SignIn
          initialError={authMessage({ code: 'otp_disabled', message: 'Signups not allowed for otp' })}
          preview={{ email: sample }}
        />
      );
    case 'not-set-up':
      return <NotSetUp email={sample} />;
    case 'home-candidate':
      return homePreview('candidate', 140, { name: 'Fall 2026', points: 90 }, 3, null);
    case 'home-adult':
      return homePreview('adult', 1240, { name: 'Fall 2026', points: 310 }, null, 3, [0, null]);
    case 'home-adult-none':
      return homePreview('adult', 0, null, null, 0, []);
    case 'log-candidate':
      return logPreview(true);
    case 'log-adult':
      return logPreview(false);
    case 'log-service':
      return logPreview(false, { typeCode: 'service-hours', hours: '2.5', supervisedBy: 'Parish coordinator', note: 'Food pantry sorting.', withCandidate: 'c1' });
    case 'log-empty':
      return logPreview(true, undefined, []);
    case 'home-wisdom':
      return homePreview('candidate', 3400, { name: 'Fall 2026', points: 1020 }, 9, null);
    default:
      return null;
  }
}

// Sample data only: these names belong to no player.
function homePreview(
  role: 'candidate' | 'adult',
  lifetime: number,
  season: { name: string; points: number } | null,
  dueInDays: number | null,
  pendingCount: number | null,
  linked: (number | null)[] = [],
) {
  const today = todayCentral();
  const isAdult = role === 'adult';
  const due = (days: number | null, title = 'Retreat day') =>
    days === null ? null : { title, dueOn: addDays(today, days) };
  const sampleNames = ['Sample Candidate', 'Second Sample'];
  return (
    <GameFrame view="home" isAdult={isAdult} pendingCount={pendingCount} onNavigate={() => {}}>
      <HomeLeaf
        player={{
          display_name: isAdult ? 'Sample Sponsor' : 'Sample Candidate',
          is_candidate: !isAdult,
          level_scale: 1,
        }}
        email="reader@example.com"
        today={today}
        data={{
          lifetime,
          season,
          ownNext: isAdult ? null : due(dueInDays),
          candidates: linked.map((days, i) => ({
            id: String(i),
            name: sampleNames[i],
            next: due(days, i ? 'Service project' : 'Retreat day'),
          })),
        }}
        pendingCount={pendingCount}
        onOpenApprove={() => {}}
      />
    </GameFrame>
  );
}

// Sample activity types and rows for Log previews. Codes and names are illustrative.
function sampleType(code: string, name: string, category: string, points: number, extra: Partial<ActivityType> = {}): ActivityType {
  return {
    code, name, category, points, per_hour: false, weekly_cap: null, monthly_cap: null, lifetime_cap: null,
    candidate_only: false, allows_note: true, requires_supervisor: false, active: true, sort: 0, ...extra,
  };
}
const SAMPLE_TYPES: ActivityType[] = [
  sampleType('mass-sunday', 'Sunday Mass', 'mass', 25, { weekly_cap: 1 }),
  sampleType('mass-weekday', 'Weekday Mass', 'mass', 15, { weekly_cap: 2 }),
  sampleType('youth-night', 'Youth night', 'youth', 20, { weekly_cap: 1 }),
  sampleType('service-hours', 'Service hours', 'service', 10, { per_hour: true, requires_supervisor: true }),
  sampleType('reconciliation', 'Reconciliation', 'sacrament', 30, { monthly_cap: 1, allows_note: false }),
  sampleType('candidate-class', 'Candidate class', 'learning', 20, { candidate_only: true }),
  sampleType('retreat', 'Retreat', 'event', 100),
  sampleType('prayer-our-father', 'Our Father', 'prayer', 25, { lifetime_cap: 1 }),
];

function logPreview(
  isCandidate: boolean,
  preview?: Parameters<typeof LogLeaf>[0]['preview'],
  rows?: ActivityRow[],
) {
  const today = todayCentral();
  const row = (id: number, type_code: string, days: number, status: ActivityRow['status'], points: number | null, extra: Partial<ActivityRow> = {}): ActivityRow => ({
    id, type_code, occurred_on: addDays(today, -days), hours: null, note: null, supervised_by: null,
    with_candidate: null, status, points_awarded: points, created_at: '', ...extra,
  });
  const recent = rows ?? [
    row(1, 'mass-sunday', 0, 'pending', null),
    row(2, 'service-hours', 2, 'approved', 25, { hours: 2.5, with_candidate: 'c1' }),
    row(3, 'mass-sunday', 4, 'approved', 0),
    row(4, 'mass-sunday', 6, 'approved', 25),
    row(5, 'youth-night', 9, 'rejected', 0),
    row(6, 'reconciliation', 12, 'approved', 30),
    row(7, 'retreat', 20, 'approved', 100),
  ];
  return (
    <GameFrame view="log" isAdult={!isCandidate} pendingCount={isCandidate ? null : 2} onNavigate={() => {}}>
      <LogLeaf
        isCandidate={isCandidate}
        today={today}
        data={{
          types: SAMPLE_TYPES,
          sponsored: isCandidate ? [] : [{ id: 'c1', name: 'Sample Candidate' }],
          recent,
          gameStart: addDays(today, -60),
        }}
        onSubmit={async () => null}
        onWithdraw={async () => null}
        preview={preview}
      />
    </GameFrame>
  );
}

