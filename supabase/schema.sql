-- SPARC database.
-- Run in your Supabase project: SQL Editor -> New query -> paste all of this -> Run.
-- Safe to run again: everything skips what already exists. Times are milliseconds since 1970 (bigint),
-- the same numbers the app uses.
--
-- ACCESS MODE: PUBLIC (the team's current choice). Anyone holding the site's public key can read
-- and change ALL the data below, including drivers' names and student IDs. That is fine for a demo
-- with fake data and NOT fine for real students. When you're ready, run supabase/lock-down.sql to
-- switch to admin-only access (and turn on NEXT_PUBLIC_REQUIRE_ADMIN_LOGIN=true).

-- ---------------------------------------------------------------------------
-- Admins (used once you lock the database down: only accounts listed here get in).
-- ---------------------------------------------------------------------------
create table if not exists public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade
);
alter table public.admins enable row level security; -- no policies: nobody reads it directly

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;
revoke execute on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Console data
-- ---------------------------------------------------------------------------
create table if not exists public.users (
  id          text primary key,
  nfc_id      text not null,
  -- The same card however it was typed ("1234-5678-9012" = "123456789012"): one card, one driver.
  card_key    text generated always as (regexp_replace(upper(nfc_id), '[-:]', '', 'g')) stored unique,
  student_id  text,
  name        text not null,
  role        text not null check (role in ('student', 'personnel', 'visitor')),
  vehicle     text not null check (vehicle in ('heavy', 'light')),
  active      boolean not null default true,
  created_at  bigint not null,
  expires_at  bigint not null
);
create unique index if not exists users_student_id_key on public.users (student_id) where student_id is not null and student_id <> '';

create table if not exists public.slots (
  code              text primary key,
  floor             int  not null,
  idx               int  not null,
  vehicle           text not null check (vehicle in ('heavy', 'light')),
  status            text not null default 'free' check (status in ('free', 'occupied')),
  occupant_user_id  text,
  occupant_name     text,
  occupant_nfc      text,
  occupant_since    bigint
);

create table if not exists public.logs (
  id         text primary key,
  visit_id   text,
  at         bigint not null,
  event      text not null check (event in ('entry', 'exit')),
  nfc_id     text not null,
  user_id    text,
  user_name  text,
  slot       text,
  floor      int,
  vehicle    text
);
create index if not exists logs_at_idx on public.logs (at desc);

create table if not exists public.scans (
  id       text primary key,
  at       bigint not null,
  nfc_id   text not null,
  outcome  jsonb not null
);
create index if not exists scans_at_idx on public.scans (at desc);

-- The building: 5 floors x 22 slots = 110. Floors 1-2 take SUVs and vans, 3-5 lighter vehicles
-- (same as caps-landing/src/lib/sparc/seed.ts).
insert into public.slots (code, floor, idx, vehicle)
select chr(64 + f) || i, f, i, case when f <= 2 then 'heavy' else 'light' end
from generate_series(1, 5) as f, generate_series(1, 22) as i
on conflict (code) do nothing;

-- Public mode: anyone can read and change the console data.
alter table public.users enable row level security;
alter table public.slots enable row level security;
alter table public.logs  enable row level security;
alter table public.scans enable row level security;

do $$
declare t text;
begin
  foreach t in array array['users', 'slots', 'logs', 'scans'] loop
    execute format('drop policy if exists admin_all on public.%I', t);
    execute format('drop policy if exists public_all on public.%I', t);
    execute format('create policy public_all on public.%I for all to anon, authenticated using (true) with check (true)', t);
  end loop;
end $$;
grant select, insert, update, delete on public.users, public.slots, public.logs, public.scans to anon, authenticated;

-- ---------------------------------------------------------------------------
-- A gate tap, saved all at once: the slot change, the log row and the scan row either all
-- save or none do. The slot only changes if it is still how this device last saw it, so two
-- gates can never hand out the same slot (the second gets SPARC_SLOT_CHANGED and reloads).
-- Runs as the caller, so the table policies above still apply.
-- ---------------------------------------------------------------------------
create or replace function public.record_tap(
  p_scan jsonb,
  p_log jsonb default null,
  p_slot jsonb default null,
  p_slot_before jsonb default null
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if p_slot is not null then
    update public.slots set
      status           = p_slot ->> 'status',
      occupant_user_id = p_slot ->> 'occupant_user_id',
      occupant_name    = p_slot ->> 'occupant_name',
      occupant_nfc     = p_slot ->> 'occupant_nfc',
      occupant_since   = (p_slot ->> 'occupant_since')::bigint
    where code = p_slot ->> 'code'
      and status = p_slot_before ->> 'status'
      and occupant_user_id is not distinct from (p_slot_before ->> 'occupant_user_id');
    if not found then
      raise exception 'SPARC_SLOT_CHANGED' using hint = p_slot ->> 'code';
    end if;
  end if;
  if p_log is not null then
    insert into public.logs select * from jsonb_populate_record(null::public.logs, p_log);
  end if;
  insert into public.scans select * from jsonb_populate_record(null::public.scans, p_scan);
end;
$$;
revoke execute on function public.record_tap(jsonb, jsonb, jsonb, jsonb) from public;
grant execute on function public.record_tap(jsonb, jsonb, jsonb, jsonb) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Public live count for the homepage (Matthew's table). Holds no driver data.
-- ---------------------------------------------------------------------------
create table if not exists public.sparc_availability (
  id text primary key check (id = 'main'),
  free integer not null check (free >= 0),
  total integer not null check (total >= 0),
  updated_at timestamptz not null default now()
);
alter table public.sparc_availability enable row level security;
drop policy if exists "anyone can read the count" on public.sparc_availability;
drop policy if exists "console can insert the count" on public.sparc_availability;
drop policy if exists "console can update the count" on public.sparc_availability;
create policy "anyone can read the count" on public.sparc_availability
  for select to anon, authenticated using (true);
create policy "console can insert the count" on public.sparc_availability
  for insert to anon, authenticated with check (id = 'main');
create policy "console can update the count" on public.sparc_availability
  for update to anon, authenticated using (id = 'main') with check (id = 'main');
grant select, insert, update on public.sparc_availability to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Live updates: the console and the homepage subscribe to changes on these tables.
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['users', 'slots', 'logs', 'scans', 'sparc_availability'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- Nothing else to do in public mode: no accounts are needed. To protect the data later, see
-- supabase/lock-down.sql.
