# Confirmation Quest — Phase 1 handoff (front end)

> Redacted copy for the public repo. It holds **no player names, emails or ages**, and nothing you write may add any. Players exist only in Supabase; the UI reads display names at runtime.

## What this is

A private, invite-only web game at `/sandbox/confirmation-quest` where three Confirmation candidates and the adults linked to them (sponsors and parents) earn points for faith practice, quizzes and program milestones. Illuminated-manuscript look (not SM branding). Installs to phones as a PWA.

The Supabase backend is **built and verified**. Phase 1 is the front end only. All scoring happens in the database; the browser never writes points and never sees quiz answers.

## Roles

| Role | Can do |
| --- | --- |
| Candidate | Log activities, take the daily quiz, see all leaderboards |
| Sponsor / parent (adult) | Everything above, plus approve their linked candidates' activities, record prayers they heard, approve other adults' activities |
| Admin | One adult; no admin screens in Phase 1 |

A candidate can never approve anything. An adult never approves their own activity.

## Backend contract

**Client:** `@supabase/supabase-js`, created once, with `PUBLIC_CQ_SUPABASE_URL` and `PUBLIC_CQ_SUPABASE_PUBLISHABLE_KEY` (an `sb_publishable_…` key; it carries the old anon key's privileges). Both are already in Vercel and in the root `.env`. **Never use the unprefixed `PUBLIC_SUPABASE_*` variables** — they belong to another page on the site and point at a different database.

**Auth** (sign-ups are disabled server-side; every player was invited):

- Google: `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: <page URL> } })`.
- Email: `supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false, emailRedirectTo: <page URL> } })`. The email contains both a link and a one-time code. Offer a code-entry field too: `supabase.auth.verifyOtp({ email, token, type: 'email' })`. Accept 6–10 digits.
- Why the code matters: on iPhone, a home-screen PWA does not share storage with Safari, so a magic link opened from Mail signs the player in to Safari, not the installed app. Inside the installed app (`display-mode: standalone`), lead with Google and code entry.
- Use the implicit flow (`flowType: 'implicit'`) so a link opened in a different browser than the one that requested it still works. Report if you see a reason not to.
- After sign-in, load `players` where `id = user.id`. No row → a "not set up yet — ask the game admin" screen with a sign-out button and nothing else.

**Tables the client may read** (RLS decides rows):

| Read | Notes |
| --- | --- |
| `players` | `id, display_name, is_candidate, is_admin, parish, level_scale` — everyone |
| `player_links` | `adult_id, candidate_id, kind ('sponsor'\|'parent')` — everyone |
| `seasons` | `code, name, starts_on, ends_on` — current season = the one containing today |
| `activity_types` | `code, name, category, points, per_hour, weekly_cap, monthly_cap, lifetime_cap, candidate_only, allows_note, requires_supervisor, active, sort` |
| `activities` | Your own rows + your linked candidates' rows. Includes `status`, `points_awarded`, `note` |
| `milestones`, `player_milestones` | For the "what's next" banner |
| `points_ledger` | Everyone's rows (no notes) |
| `quiz_attempts` | Your own only |
| `questions_live` | `id, key, category, difficulty, prompt, options` — no answer, explanation or source |

**The one direct write:** log an activity by inserting your own pending row.

```ts
await supabase.from('activities').insert({
  player_id: user.id, type_code, occurred_on,          // 'YYYY-MM-DD', not in the future
  hours,               // per_hour types only (0 < hours ≤ 12)
  note,                // ≤ 500 chars; dropped server-side when allows_note = false
  supervised_by,       // required when requires_supervisor = true
  with_candidate,      // adults only, optional: "did this with my candidate" (sponsor link)
}).select().single();
```

A player may delete their own row while it is `pending`. Never send `status`, `points_awarded` or `reviewed_*`.

Hide from the Log screen: `category = 'prayer'` (recorded by adults on the Prayers screen) and `candidate_only` types when the player is an adult.

**RPCs** (`supabase.rpc(name, args)`):

| RPC | Args | Returns | Who |
| --- | --- | --- | --- |
| `pending_approvals` | — | rows: `id, player_id, display_name, is_candidate, type_code, type_name, occurred_on, hours, note, supervised_by, with_candidate, created_at` | adults (candidates get none) |
| `approve_activity` | `p_id, p_ok` | int: points awarded (0 = capped or rejected) | adults |
| `record_prayer` | `p_candidate, p_prayer` (a `prayer-*` code) | int: 25 | the linked adult who heard it |
| `daily_quiz` | `p_count` (default 3) | rows: `id, category, difficulty, prompt, options, answered_today` — stable for the day | everyone |
| `answer_question` | `p_question, p_chosen` (0-based) | one row: `correct, explanation, source_ref, points` | everyone, once per question per day |
| `complete_milestone` | `p_player, p_code, p_completed_on?` | int | adults — **Phase 2 UI, don't build** |

Errors come back as Postgres exceptions with plain messages (`'not pending'`, `'already recited'`, `'already answered today'`, `'only adults approve'`). Show the message; don't retry.

**Leaderboard views** — one row per player (or pair) per season, plus `season = 'lifetime'`:

| View | Columns |
| --- | --- |
| `leaderboard_individual` | `season, season_name, player_id, display_name, is_candidate, points, week_points, rank, week_rank` |
| `leaderboard_candidates` | same, candidates only |
| `leaderboard_pairs` | `season, season_name, sponsor_id, sponsor_name, candidate_id, candidate_name, points, week_points, rank, week_rank` |

`week_points` = the current Monday–Sunday week (Central time). Default to the current season; a Lifetime tab sits beside it; a This-week toggle swaps to `week_points` / `week_rank`.

## Screens (Phase 1)

1. **Sign-in** — Google button, email field → "send link", code-entry field.
2. **Home** — gold drop cap, display name, level (below), lifetime points, current-season points, and a "what's next" banner: the next incomplete milestone for the player's parish due in the next 14 days. Adults see a count of pending approvals.
3. **Log activity** — pick type, date (default today), conditional fields (hours, supervised by, note, "with my candidate" for adults). Shows the player's own recent activities with status and points.
4. **Approvals** (adults) — `pending_approvals()`, approve / reject, show points awarded (say "capped this week" on 0).
5. **Leaderboards** — tabs Individual / Pairs / Candidates; season switcher; this-week toggle; ranks as Roman numerals on a scroll.
6. **Prayers** — candidates: the 15 prayers with recited / not yet. Adults: pick a linked candidate, pick an unrecited prayer, "I heard it" → `record_prayer`. No prayer texts in Phase 1.
7. **Daily quiz** — `daily_quiz(3)`, one at a time; after each answer show right/wrong, the explanation and `source_ref`, and points earned.

**Levels** (Seven Gifts), thresholds × the player's `level_scale`, from lifetime points: Fear of the Lord 0 · Piety 250 · Knowledge 600 · Fortitude 1,000 · Counsel 1,600 · Understanding 2,400 · Wisdom 3,300. Show the gift name and progress to the next one. (Level-up cards are Phase 2.)

## Look and feel

Run the `frontend-design` skill before building screens. A living illuminated book: vellum pages, ink text, red rubrics, lapis and gold.

| Token | Light (vellum) | Dark (candlelit) | Use |
| --- | --- | --- | --- |
| `--vellum` | `#F4ECD8` | `#1E1A14` | Page background |
| `--ink` | `#2A2118` | `#EFE6D2` | Body text |
| `--rubric` | `#A8321E` | `#D9623F` | Headings, rubrics, correct-answer flourish |
| `--lapis` | `#1F4E8C` | `#6E9BD6` | Links, buttons, borders |
| `--gold` | `#B8902F` | `#D8B45A` | Badges, level-ups, drop caps |
| `--season` | Ordinary Time `#2F6B3A` for now | same | Ribbon, progress bars (calendar-driven accent is Phase 3) |

Type (Google Fonts): Cinzel Decorative for drop caps and level titles only; EB Garamond for headings and body; system sans for small UI labels and scores. All ornament is original SVG — no scans or photos of real manuscripts. Scoped styles (CSS module or component-scoped) so nothing leaks into the rest of the site. Works at phone width with a 16px gutter.

## PWA

- Manifest and service worker live under `public/sandbox/confirmation-quest/`.
- The service worker's scope must not reach any other route on steveminster.com.
- Cache only this page's static assets. **Never cache** requests to `*.supabase.co`, and never cache an HTML response that follows an auth redirect.
- iPhone and Android icons (including `apple-touch-icon`), `display: standalone`, theme color `--vellum`.
- When a deploy changes the page markup, bump VERSION in public/sandbox/confirmation-quest/sw.js.

## MVP acceptance criteria (live by Fri Nov 13)

- [ ] All six players sign in on iPhone and Android with Google or email; an uninvited account is refused.
- [ ] Signing in inside the installed iPhone app works via Google or the email code.
- [ ] A candidate logs Mass → pending → only a linked adult can approve → points appear.
- [ ] A candidate never sees an approve control, and the RPC refuses them anyway.
- [ ] A second Sunday Mass in one week shows "approved, 0 points (weekly cap)".
- [ ] Quiz: the network tab never shows `answer_index`, an explanation, or a source before the answer is sent.
- [ ] Pair board reflects sponsor bonuses only for the right pair.
- [ ] No player names in any committed file.
- [ ] Installs to the home screen and opens full-screen; the rest of the site is unaffected by the service worker.

## Out of scope (Phase 1)

Badges UI, milestone completion UI, Codex pages and learning games, level-up cards, AI draft review, exports, season accent by liturgical calendar, the `/sandbox` index card, any SQL or backend change.
