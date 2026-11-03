-- supabase/wrestling.sql
-- Warriors wrestling. Lives in the Bandits project. NOT covered by the Bandits purge.
-- (The Jan 15, 2027 Bandits retention deletes in supabase/bandits.sql touch only
-- bandits_* tables. Never add wr_* tables to that block.)
--
-- Dual-meet scorer: wr_wrestlers (roster), wr_duals, wr_bouts, wr_events (point log),
-- wr_team_adjustments (team-point deductions).
--
-- Run the whole file in the Supabase SQL Editor. It is idempotent: safe to re-run.
-- Lockdown model (same as Bandits): RLS on with NO policies, and no grants for
-- anon/authenticated, so the public Data API exposes nothing. Only the server
-- (service_role key, via Astro API routes) can read or write.
-- Never run PostgREST's suggested "GRANT ... TO anon".
--
-- Roster: NOT loaded here. Real names never go in the repo. Load them with a separate
-- wr-roster-DASHBOARD-ONLY.sql (gitignored) in a NEW SQL Editor query. Template at the
-- bottom of this file, with fake names.

create extension if not exists pgcrypto;

-- ─────────────────────────────────────────────────────────────────────────────
-- Tables
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.wr_wrestlers (
  id              uuid primary key default gen_random_uuid(),
  first_name      text not null,
  last_name       text not null,            -- scorer view only; never in a public API
  default_weight  int check (default_weight in
                    (75,82,90,98,106,114,122,130,138,145,155,170,185,215,260)),
  level           text not null check (level in ('V','JV')),
  active          boolean not null default true,
  created_at      timestamptz not null default now()
);

create table if not exists public.wr_duals (
  id                  uuid primary key default gen_random_uuid(),
  season              text not null default '2026-27',
  dual_date           date not null,
  opponent            text not null,        -- e.g. 'Blackman'
  location            text,
  start_weight        int not null default 75 check (start_weight in
                        (75,82,90,98,106,114,122,130,138,145,155,170,185,215,260)),
  status              text not null default 'setup' check (status in ('setup','live','final')),
  tiebreak_side       text check (tiebreak_side in ('us','them')),
  tiebreak_criterion  text check (tiebreak_criterion ~ '^[a-q]$'),   -- NFHS 9-2-2 letter
  is_test             boolean not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()             -- bumped by the API on any change in the dual
);

create table if not exists public.wr_bouts (
  id               uuid primary key default gen_random_uuid(),
  dual_id          uuid not null references public.wr_duals(id) on delete cascade,
  level            text not null check (level in ('V','JV')),
  weight           int not null check (weight in
                     (75,82,90,98,106,114,122,130,138,145,155,170,185,215,260)),
  bout_order       int not null,
  mat              int not null default 1,
  our_wrestler_id  uuid references public.wr_wrestlers(id) on delete set null,
  opp_name         text,                    -- first name only
  status           text not null default 'pending'
                     check (status in ('pending','live','final','skipped')),
  current_period   text not null default 'P1'
                     check (current_period in ('P1','P2','P3','SV','TB1','TB2','UTB')),
  result_type      text check (result_type in ('FALL','TF','MD','DEC','FOR','DEF','DQ','DFF')),
  winner           text check (winner in ('us','them')),   -- null for DFF
  result_time      text check (result_time ~ '^[0-9]{1,2}:[0-5][0-9]$'),  -- cumulative 'm:ss' for FALL/TF (optional)
  team_pts_us      int not null default 0,
  team_pts_them    int not null default 0,
  finalized_at     timestamptz,
  updated_at       timestamptz not null default now(),
  unique (dual_id, level, weight, bout_order)
);

create table if not exists public.wr_events (
  id          uuid primary key,             -- client-generated (idempotent offline replay)
  bout_id     uuid not null references public.wr_bouts(id) on delete cascade,
  period      text not null check (period in ('P1','P2','P3','SV','TB1','TB2','UTB')),
  side        text not null check (side in ('us','them')),   -- who RECEIVES the points
  code        text not null check (code in
                ('T3','E1','R2','N2','N3','N4','N5','PEN1','PEN2','RO1','SW','C')),
  points      int not null check (points between 0 and 5),
  voided      boolean not null default false,
  created_at  timestamptz not null default now()
);

create table if not exists public.wr_team_adjustments (
  id          uuid primary key default gen_random_uuid(),
  dual_id     uuid not null references public.wr_duals(id) on delete cascade,
  side        text not null check (side in ('us','them')),   -- team that LOSES the points
  points      int not null check (points > 0),
  reason      text not null,                -- e.g. 'UCT', 'CM', 'FMC'
  created_at  timestamptz not null default now()
);

create index if not exists wr_bouts_dual_idx        on public.wr_bouts (dual_id, level, bout_order);
create index if not exists wr_events_bout_idx       on public.wr_events (bout_id, created_at);
create index if not exists wr_adjustments_dual_idx  on public.wr_team_adjustments (dual_id);
create index if not exists wr_duals_date_idx        on public.wr_duals (dual_date desc);

-- ─────────────────────────────────────────────────────────────────────────────
-- Lockdown: RLS on, NO policies, no anon/authenticated grants → PostgREST exposes nothing.
-- Supabase grants new public tables to anon/authenticated by default, so revoke explicitly.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.wr_wrestlers         enable row level security;
alter table public.wr_duals             enable row level security;
alter table public.wr_bouts             enable row level security;
alter table public.wr_events            enable row level security;
alter table public.wr_team_adjustments  enable row level security;

revoke all on public.wr_wrestlers, public.wr_duals, public.wr_bouts,
              public.wr_events, public.wr_team_adjustments
  from anon, authenticated;
grant select, insert, update, delete on public.wr_wrestlers, public.wr_duals, public.wr_bouts,
              public.wr_events, public.wr_team_adjustments
  to service_role;
-- No policies, no grants to anon/authenticated: service key only.

-- ─────────────────────────────────────────────────────────────────────────────
-- Verify (run after the file; all read-only)
-- ─────────────────────────────────────────────────────────────────────────────
select 'wr_wrestlers' as tbl, count(*) as rows from public.wr_wrestlers
union all select 'wr_duals',            count(*) from public.wr_duals
union all select 'wr_bouts',            count(*) from public.wr_bouts
union all select 'wr_events',           count(*) from public.wr_events
union all select 'wr_team_adjustments', count(*) from public.wr_team_adjustments;

-- RLS on for all five (expect 5 rows, all true):
-- select relname, relrowsecurity from pg_class
--  where relnamespace = 'public'::regnamespace and relname like 'wr\_%' and relkind = 'r';
-- No anon/authenticated grants (expect no rows):
-- select table_name, grantee, privilege_type from information_schema.role_table_grants
--  where table_name like 'wr\_%' and grantee in ('anon','authenticated');
-- No policies (expect no rows):
-- select tablename, policyname from pg_policies where tablename like 'wr\_%';
-- Roster sanity, no names printed (after loading the roster):
-- select level, count(*), count(default_weight) as with_weight
--   from public.wr_wrestlers where active group by level;

-- ─────────────────────────────────────────────────────────────────────────────
-- Test-data cleanup. Duals created while testing (incl. on previews, which share
-- this database) have is_test = true. Bouts, events and adjustments cascade.
-- ─────────────────────────────────────────────────────────────────────────────
-- delete from public.wr_duals where is_test;

-- ─────────────────────────────────────────────────────────────────────────────
-- Roster template — DO NOT fill in here. Copy into wr-roster-DASHBOARD-ONLY.sql
-- (gitignored), type the real roster there, run it in a NEW SQL Editor query.
-- One varsity wrestler per weight at most; leave default_weight null if unsure.
-- ─────────────────────────────────────────────────────────────────────────────
-- insert into public.wr_wrestlers (first_name, last_name, default_weight, level) values
--   ('Test', 'Wrestler', 75, 'V'),
--   ('Test', 'Wrestler', 82, 'V'),
--   ('Test', 'Wrestler', null, 'JV');
