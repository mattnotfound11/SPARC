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
  -- The card the member entered at sign-up (null on older records). The pass stays Pending until the parking office activates it.
  nfc_id      text,
  -- The same card however it was typed ("1234-5678-9012" = "123456789012"): one card, one driver.
  card_key    text generated always as (regexp_replace(upper(nfc_id), '[-:]', '', 'g')) stored unique,
  -- The university email the member signed up with (one account per email).
  email       text,
  student_id  text,
  name        text not null,
  role        text not null check (role in ('student', 'personnel', 'visitor')),
  vehicle     text not null check (vehicle in ('heavy', 'light')),
  active      boolean not null default true,
  created_at  bigint not null,
  expires_at  bigint not null
);
create unique index if not exists users_student_id_key on public.users (student_id) where student_id is not null and student_id <> '';
-- For projects created before members signed themselves up:
alter table public.users add column if not exists email text;
alter table public.users alter column nfc_id drop not null;
create unique index if not exists users_email_key on public.users (lower(email)) where email is not null;

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

-- The semester calendar. A member's pass runs to the end of a semester (a college year has two), so the
-- admin keeps these dates up to date on the Semesters page. It starts EMPTY on purpose: no dates are
-- guessed, and passes can't be activated or renewed until the admin has entered them.
create table if not exists public.semesters (
  id         text primary key,
  name       text not null,
  starts_at  bigint not null, -- start of the first day, ms since 1970
  ends_at    bigint not null, -- end of the last day, ms since 1970
  check (ends_at > starts_at)
);

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
alter table public.semesters enable row level security;

do $$
declare t text;
begin
  foreach t in array array['users', 'slots', 'logs', 'scans', 'semesters'] loop
    execute format('drop policy if exists admin_all on public.%I', t);
    execute format('drop policy if exists public_all on public.%I', t);
    execute format('create policy public_all on public.%I for all to anon, authenticated using (true) with check (true)', t);
  end loop;
end $$;
grant select, insert, update, delete on public.users, public.slots, public.logs, public.scans, public.semesters to anon, authenticated;

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

-- ---------------------------------------------------------------------------
-- Facilitators: staff who run the gate (live status, scanning, audit log) but not Users or Reports.
-- Add one in the SQL editor:  insert into public.facilitators (user_id)
--   select id from auth.users where email = 'someone@usa.edu.ph';
-- ---------------------------------------------------------------------------
create table if not exists public.facilitators (
  user_id uuid primary key references auth.users (id) on delete cascade
);
alter table public.facilitators enable row level security; -- no policies: nobody reads it directly

create or replace function public.staff_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
    when exists (select 1 from public.admins where user_id = auth.uid()) then 'admin'
    when exists (select 1 from public.facilitators where user_id = auth.uid()) then 'facilitator'
  end;
$$;
revoke execute on function public.staff_role() from public;
grant execute on function public.staff_role() to anon, authenticated;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.staff_role() is not null;
$$;
revoke execute on function public.is_staff() from public;
grant execute on function public.is_staff() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Members: students and personnel register themselves on the site, confirm their email, and then see only
-- their own pass and history and can send one-way suggestions. Their record starts as PENDING (the card they
-- entered is saved, but expires_at = 0) until the parking office activates the pass from the Users page.
-- Members' own-row reads on users/logs are added by supabase/lock-down.sql; until then the open
-- "public mode" policies apply and member privacy is NOT enforced.
-- ---------------------------------------------------------------------------
create table if not exists public.members (
  user_id            uuid primary key references auth.users (id) on delete cascade,
  registered_user_id text not null unique references public.users (id) on delete cascade
);
alter table public.members enable row level security; -- no policies: read through the functions below

create or replace function public.member_user_id()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select registered_user_id from public.members where user_id = auth.uid();
$$;
revoke execute on function public.member_user_id() from public;
grant execute on function public.member_user_id() to authenticated;

-- The lot's map for the member dashboard: which bays are free or taken. No names, cards or times,
-- so members can see the building without seeing who is parked in it.
create or replace function public.member_slot_map()
returns table (code text, floor int, idx int, status text)
language sql
stable
security definer
set search_path = public
as $$
  select s.code, s.floor, s.idx, s.status from public.slots s where public.member_user_id() is not null order by s.floor, s.idx;
$$;
revoke execute on function public.member_slot_map() from public;
grant execute on function public.member_slot_map() to authenticated;

-- What kind of account is signed in: 'admin', 'facilitator', 'member', or null.
create or replace function public.account_type()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.staff_role(), case when exists (select 1 from public.members where user_id = auth.uid()) then 'member' end);
$$;
revoke execute on function public.account_type() from public;
grant execute on function public.account_type() to authenticated;

create table if not exists public.suggestions (
  id                 uuid primary key default gen_random_uuid(),
  registered_user_id text not null references public.users (id) on delete cascade,
  category           text not null check (category in ('Parking', 'Safety', 'Pass or billing', 'Other')),
  message            text not null check (char_length(message) between 1 and 1000),
  created_at         bigint not null,
  status             text not null default 'new' check (status in ('new', 'read', 'resolved'))
);
create index if not exists suggestions_user_idx on public.suggestions (registered_user_id, created_at desc);
alter table public.suggestions enable row level security;

drop policy if exists member_insert on public.suggestions;
create policy member_insert on public.suggestions for insert to authenticated
  with check (
    registered_user_id = public.member_user_id()
    and status = 'new'
    and (select count(*) from public.suggestions s
         where s.registered_user_id = public.member_user_id()
           and s.created_at > (extract(epoch from now()) * 1000)::bigint - 86400000) < 5
  );
drop policy if exists member_select on public.suggestions;
create policy member_select on public.suggestions for select to authenticated
  using (registered_user_id = public.member_user_id() or public.staff_role() = 'admin');
drop policy if exists admin_update on public.suggestions;
create policy admin_update on public.suggestions for update to authenticated
  using (public.staff_role() = 'admin') with check (public.staff_role() = 'admin');
revoke all on public.suggestions from anon;

-- Members register themselves now (see claim_member_pass below), so nobody links a login by hand.
drop function if exists public.link_member(text, text);

-- ---------------------------------------------------------------------------
-- Member self sign-up. The site's sign-up form calls auth.signUp with the person's name, role and
-- student/employee ID in the account metadata. When they CONFIRM their email (which proves the address is
-- theirs), this creates their record in `users` and links the login to it, in one step.
-- The record is Pending: the card they entered is saved, but expires_at = 0 so the gate denies it until the
-- parking office activates the pass. Rules:
--   * the email must end in @usa.edu.ph and have no "+" alias in front of the @;
--   * the role must be student or personnel, and a name and ID must be given;
--   * one record per email, per student ID and per NFC card: if any already exists, no record is created
--     and the login stays unlinked (the sign-in page explains it).
-- Requires Authentication -> Providers -> Email -> "Confirm email" ON and sign-ups allowed.
-- ---------------------------------------------------------------------------
create or replace function public.claim_member_pass()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(coalesce(new.email, ''));
  v_sid   text := upper(trim(coalesce(new.raw_user_meta_data ->> 'student_id', '')));
  v_name  text := regexp_replace(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), '\s+', ' ', 'g');
  v_role  text := coalesce(new.raw_user_meta_data ->> 'campus_role', '');
  -- The NFC card the member entered at sign-up. It is kept on the record, but the pass stays Pending.
  v_nfc   text := nullif(upper(trim(coalesce(new.raw_user_meta_data ->> 'nfc_id', ''))), '');
  v_id    text;
begin
  if new.email_confirmed_at is null or v_sid = '' or v_name = '' then return new; end if;
  if v_role not in ('student', 'personnel') then return new; end if;
  if v_email not like '%@usa.edu.ph' or split_part(v_email, '@', 1) like '%+%' then return new; end if;
  if exists (select 1 from public.members where user_id = new.id) then return new; end if;

  v_id := 'M' || replace(gen_random_uuid()::text, '-', '');
  begin
    -- "vehicle" is a leftover column that is no longer used; it only needs a value.
    insert into public.users (id, nfc_id, student_id, name, role, vehicle, active, created_at, expires_at, email)
    values (v_id, v_nfc, v_sid, v_name, v_role, 'light', true, (extract(epoch from now()) * 1000)::bigint, 0, v_email);
    insert into public.members (user_id, registered_user_id) values (new.id, v_id);
  exception when unique_violation then
    return new; -- this student ID, email or card already has a record
  end;
  return new;
end;
$$;
revoke execute on function public.claim_member_pass() from public, anon, authenticated;
-- Supabase's auth service (supabase_auth_admin) is the role that fires this trigger when it saves a new
-- user, so it must keep EXECUTE. Without this every sign-up fails with "Database error saving new user" (500).
grant execute on function public.claim_member_pass() to supabase_auth_admin;

drop trigger if exists claim_member_pass_on_confirm on auth.users;
create trigger claim_member_pass_on_confirm
  after insert or update of email_confirmed_at on auth.users
  for each row execute function public.claim_member_pass();

-- Superseded: records are created at sign-up now, so nothing links a login to a hand-made record.
drop trigger if exists claim_pass_on_user_change on public.users;
drop function if exists public.claim_pass_for_user();
