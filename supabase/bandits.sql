-- supabase/bandits.sql
-- Wilson County Bandits 13U — sign-up schema for the dedicated `bandits` Supabase project.
-- Spec: BANDITS_INTEGRATION_README.md §6.
--
-- Run the whole file in the Supabase SQL Editor. It is idempotent: safe to re-run.
-- Lockdown model: RLS on with NO policies, and no grants for anon/authenticated,
-- so the public Data API exposes nothing. Only the server (service_role key,
-- via Astro API routes) can read or write.

create extension if not exists pgcrypto;

-- ─────────────────────────────────────────────────────────────────────────────
-- Tables
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.bandits_signups (
  id                     uuid primary key default gen_random_uuid(),
  created_at             timestamptz not null default now(),
  signup_seq             bigint generated always as identity,
  status                 text not null default 'rostered'
                           check (status in ('rostered','waitlist','withdrawn')),

  -- player
  player_first           text not null,
  player_last            text not null,
  dob                    date not null,
  grade                  text not null check (grade in ('6th','7th','8th','Other')),
  school                 text,
  weight_lbs             int  not null check (weight_lbs between 50 and 350),
  years_played           text,
  positions              text,
  eligibility_flag       text not null default 'ok'
                           check (eligibility_flag in ('ok','needs_8th_grade_proof','review')),

  -- uniform (size codes per §7: youth YS/YM/YL/YXL, adult S/M/L/XL/2XL/3XL)
  jersey_scale           text not null check (jersey_scale in ('youth','adult')),
  jersey_size            text not null,
  number_choice_1        int  not null check (number_choice_1 between 0 and 99),
  number_choice_2        int  not null check (number_choice_2 between 0 and 99),
  number_choice_3        int  not null check (number_choice_3 between 0 and 99),
  constraint bandits_number_choices_distinct check (
    number_choice_1 <> number_choice_2 and number_choice_1 <> number_choice_3 and number_choice_2 <> number_choice_3),
  constraint bandits_jersey_size_matches_scale check (
    (jersey_scale = 'youth' and jersey_size in ('YS','YM','YL','YXL')) or
    (jersey_scale = 'adult' and jersey_size in ('S','M','L','XL','2XL','3XL'))),

  -- gear & availability
  helmet                 text not null check (helmet in ('own','loaner')),
  avail_bbtl             text not null,
  avail_tdc              text not null,
  tdc_id_type            text not null check (tdc_id_type in ('nsid','state_id','passport','none_yet')),

  -- guardian & emergency
  guardian_name          text not null,
  guardian_relationship  text not null,
  guardian_phone         text not null,
  guardian_email         text not null,
  guardian2_name         text,
  guardian2_phone        text,
  contact_pref           text,
  emergency_name         text not null,
  emergency_phone        text not null,
  emergency_relationship text,
  health_notes           text,          -- optional, staff-only, never emailed
  photo_consent          boolean not null default false,

  -- staff-managed checklist
  paid                   boolean not null default false,
  waiver_received        boolean not null default false,
  birth_cert_received    boolean not null default false,
  tdc_id_received        boolean not null default false,
  grade_proof_received   boolean not null default false,
  loaner_assigned        boolean not null default false,
  assigned_number        int check (assigned_number between 0 and 99),
  staff_notes            text,
  updated_at             timestamptz not null default now()
);

-- one sign-up per player (names are trimmed by bandits_register, so " Everett" = "Everett")
create unique index if not exists bandits_signups_player_uniq
  on public.bandits_signups (lower(player_first), lower(player_last), dob);

-- no two active players share an assigned number
create unique index if not exists bandits_signups_number_uniq
  on public.bandits_signups (assigned_number)
  where assigned_number is not null and status <> 'withdrawn';

-- supports the register route's rate-limit query (sign-ups per guardian_email in the last 10 min)
create index if not exists bandits_signups_guardian_recent
  on public.bandits_signups (guardian_email, created_at);

-- staff allowlist for the coach dashboard (emails stored lower-cased; the auth check compares lower-cased)
create table if not exists public.bandits_staff (
  email text primary key check (email = lower(email)),
  name  text not null
);

-- single-row settings: the ONE roster cap, read by both bandits_register and the cap trigger.
-- Gate 3 waitlist test: update public.bandits_settings set roster_cap = 2;  … then back to 22.
create table if not exists public.bandits_settings (
  id          boolean primary key default true check (id),
  roster_cap  int not null default 22 check (roster_cap >= 0)
);
insert into public.bandits_settings (id, roster_cap) values (true, 22)
on conflict (id) do nothing;

-- ─────────────────────────────────────────────────────────────────────────────
-- Lockdown: RLS on, NO policies for anon/authenticated → PostgREST exposes nothing
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.bandits_signups  enable row level security;
alter table public.bandits_staff    enable row level security;
alter table public.bandits_settings enable row level security;

revoke all on public.bandits_signups, public.bandits_staff, public.bandits_settings from anon, authenticated;
grant select, insert, update, delete on public.bandits_signups, public.bandits_staff, public.bandits_settings to service_role;

-- the identity sequence behind signup_seq picks up Supabase's default grants too
do $$
declare seq text := pg_get_serial_sequence('public.bandits_signups', 'signup_seq');
begin
  execute format('revoke all on sequence %s from anon, authenticated', seq);
  execute format('grant usage, select on sequence %s to service_role', seq);
end $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Roster cap: one lock, one count, one cap value
-- ─────────────────────────────────────────────────────────────────────────────

-- Takes the roster advisory lock (held until the calling transaction ends) and returns
-- the status a NEW rostered-or-waitlisted player would get right now.
-- Callers: bandits_register (insert path) and bandits_guard_roster_cap (trigger).
create or replace function public.bandits_next_status()
returns text language plpgsql security definer set search_path = '' as $$
declare
  n   int;
  cap int;
begin
  perform pg_advisory_xact_lock(hashtext('bandits_roster'));
  select coalesce((select s.roster_cap from public.bandits_settings s where s.id), 22) into cap;
  select count(*) into n from public.bandits_signups where status = 'rostered';
  return case when n < cap then 'rostered' else 'waitlist' end;
end $$;

-- Guard on every path to a rostered row: inserts, and staff PATCHes that move a
-- player to 'rostered' (Move to roster). Raises roster_full at the cap; the PATCH
-- route maps it to 409 "Roster is full."
create or replace function public.bandits_guard_roster_cap()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if public.bandits_next_status() <> 'rostered' then
    raise exception using errcode = 'P0001', message = 'roster_full';
  end if;
  return new;
end $$;

create or replace trigger bandits_roster_cap_on_insert
  before insert on public.bandits_signups
  for each row when (new.status = 'rostered')
  execute function public.bandits_guard_roster_cap();

create or replace trigger bandits_roster_cap_on_status
  before update of status on public.bandits_signups
  for each row when (new.status = 'rostered' and old.status <> 'rostered')
  execute function public.bandits_guard_roster_cap();

-- updated_at on every staff change, whether or not the route remembers to set it
create or replace function public.bandits_touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

create or replace trigger bandits_signups_touch
  before update on public.bandits_signups
  for each row execute function public.bandits_touch_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- bandits_register(p) — the ONLY insert path for public sign-ups
-- ─────────────────────────────────────────────────────────────────────────────
-- Called by POST /api/bandits/register as supabase.rpc('bandits_register', { p }).
-- Lock + count + insert happen in this one transaction, so #22/#23 can't race.
-- Inserts only whitelisted player/guardian fields; status and every staff field
-- are never taken from the payload. The API has already validated p (validate.ts)
-- and computed eligibility_flag (eligibility.ts).
-- Errors the route maps: 23505 on bandits_signups_player_uniq → 409 duplicate.
-- Returns { id, status, signup_seq, rostered_count, waitlist_position }.
create or replace function public.bandits_register(p jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_status   text := public.bandits_next_status();   -- takes the roster lock
  v_id       uuid;
  v_seq      bigint;
  v_rostered int;
  v_position int;
begin
  insert into public.bandits_signups (
    status,
    player_first, player_last, dob, grade, school, weight_lbs, years_played, positions,
    eligibility_flag,
    jersey_scale, jersey_size, number_choice_1, number_choice_2, number_choice_3,
    helmet, avail_bbtl, avail_tdc, tdc_id_type,
    guardian_name, guardian_relationship, guardian_phone, guardian_email,
    guardian2_name, guardian2_phone, contact_pref,
    emergency_name, emergency_phone, emergency_relationship,
    health_notes, photo_consent
  ) values (
    v_status,
    btrim(p->>'player_first'),
    btrim(p->>'player_last'),
    (p->>'dob')::date,
    p->>'grade',
    nullif(btrim(p->>'school'), ''),
    (p->>'weight_lbs')::int,
    nullif(p->>'years_played', ''),
    nullif(btrim(p->>'positions'), ''),
    coalesce(p->>'eligibility_flag', 'review'),   -- missing flag → coach reviews, never silently 'ok'
    p->>'jersey_scale',
    p->>'jersey_size',
    (p->>'number_choice_1')::int,
    (p->>'number_choice_2')::int,
    (p->>'number_choice_3')::int,
    p->>'helmet',
    p->>'avail_bbtl',
    p->>'avail_tdc',
    p->>'tdc_id_type',
    btrim(p->>'guardian_name'),
    p->>'guardian_relationship',
    p->>'guardian_phone',
    lower(btrim(p->>'guardian_email')),
    nullif(btrim(p->>'guardian2_name'), ''),
    nullif(p->>'guardian2_phone', ''),
    nullif(p->>'contact_pref', ''),
    btrim(p->>'emergency_name'),
    p->>'emergency_phone',
    nullif(btrim(p->>'emergency_relationship'), ''),
    nullif(btrim(p->>'health_notes'), ''),
    coalesce((p->>'photo_consent')::boolean, false)
  )
  returning id, signup_seq into v_id, v_seq;

  select count(*) into v_rostered from public.bandits_signups where status = 'rostered';

  if v_status = 'waitlist' then
    select count(*) into v_position from public.bandits_signups
     where status = 'waitlist' and signup_seq <= v_seq;
  end if;

  return jsonb_build_object(
    'id', v_id,
    'status', v_status,
    'signup_seq', v_seq,
    'rostered_count', v_rostered,
    'waitlist_position', v_position
  );
end $$;

-- Function grants: service_role only. (Supabase grants EXECUTE on new public functions
-- to anon/authenticated by default, so revoke from them explicitly, not just PUBLIC.)
revoke all on function public.bandits_next_status()          from public, anon, authenticated;
revoke all on function public.bandits_guard_roster_cap()     from public, anon, authenticated;
revoke all on function public.bandits_touch_updated_at()     from public, anon, authenticated;
revoke all on function public.bandits_register(jsonb)        from public, anon, authenticated;
grant execute on function public.bandits_register(jsonb)     to service_role;
-- bandits_next_status is internal (called only by the definer functions above); no grants.

-- ─────────────────────────────────────────────────────────────────────────────
-- Staff seed — DO NOT edit here. Run separately in a NEW SQL Editor query with the
-- real addresses typed in, lower-case. Real emails never go in the repo.
-- Each person also needs Auth → Users → Invite user at the same address.
-- ─────────────────────────────────────────────────────────────────────────────
-- insert into public.bandits_staff (email, name) values
--   ('<steve email>', 'Steve'),
--   ('<dana email>',  'Dana')
--   -- ('<coach email>', 'Chris Oguin')   -- add when his email is known
-- on conflict (email) do nothing;

-- ─────────────────────────────────────────────────────────────────────────────
-- Retention — delete roster data after the season (target: Jan 15, 2027).
-- ─────────────────────────────────────────────────────────────────────────────
-- delete from public.bandits_signups;
-- delete from public.bandits_staff;

-- ─────────────────────────────────────────────────────────────────────────────
-- Sanity checks (optional, run after the file; all read-only)
-- ─────────────────────────────────────────────────────────────────────────────
-- select roster_cap from public.bandits_settings;                                   -- 22
-- select relname, relrowsecurity from pg_class
--  where relname in ('bandits_signups','bandits_staff','bandits_settings');         -- all true
-- select grantee, privilege_type from information_schema.role_table_grants
--  where table_name like 'bandits_%' and grantee in ('anon','authenticated');       -- no rows
-- select has_function_privilege('anon', 'public.bandits_register(jsonb)', 'execute'); -- false
