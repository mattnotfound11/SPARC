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
-- Members: registered students/personnel with a real login who see only their own pass, history
-- and can send one-way suggestions. An administrator links a Supabase account to a registered user
-- (Users page, or:  select public.link_member('someone@usa.edu.ph', '<users.id>');).
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

-- Admin-only: give a Supabase account (by email) the member view of one registered user.
create or replace function public.link_member(p_email text, p_user_id text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_auth uuid;
  v_role text;
begin
  if public.staff_role() is distinct from 'admin' then return 'Only administrators can link a member.'; end if;
  select id into v_auth from auth.users where lower(email) = lower(trim(p_email));
  if v_auth is null then return 'No account with that email. Create it in Supabase (Authentication -> Users) first.'; end if;
  select role into v_role from public.users where id = p_user_id;
  if v_role is null then return 'That registered user does not exist.'; end if;
  if v_role = 'visitor' then return 'Visitors cannot have a member login.'; end if;
  -- An administrator's choice wins: it replaces any earlier link of this login or of this record
  -- (for example a wrong self sign-up claim).
  delete from public.members where user_id = v_auth or registered_user_id = p_user_id;
  insert into public.members (user_id, registered_user_id) values (v_auth, p_user_id);
  return 'ok';
end;
$$;
revoke execute on function public.link_member(text, text) from public;
grant execute on function public.link_member(text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Member self sign-up. The site's sign-up form calls auth.signUp with the person's name and
-- student/employee ID in the account metadata. Once they CONFIRM their email, this links the new
-- account to the registered record whose ID and name match. It links only when: the email ends in
-- @usa.edu.ph, the record is a student or personnel with an active card, and it isn't linked already.
-- No match = the account stays unlinked (sign-in explains it; an admin can link it from Users).
-- Requires Authentication -> Providers -> Email -> "Confirm email" ON and sign-ups allowed.
-- ---------------------------------------------------------------------------
create or replace function public.claim_member_pass()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sid  text := upper(trim(coalesce(new.raw_user_meta_data ->> 'student_id', '')));
  v_name text := lower(regexp_replace(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), '\s+', ' ', 'g'));
  v_user text;
begin
  if new.email_confirmed_at is null or v_sid = '' or v_name = '' then return new; end if;
  if lower(coalesce(new.email, '')) not like '%@usa.edu.ph' then return new; end if;
  if exists (select 1 from public.members where user_id = new.id) then return new; end if;

  select id into v_user
  from public.users
  where upper(trim(student_id)) = v_sid
    and lower(regexp_replace(trim(name), '\s+', ' ', 'g')) = v_name
    and role in ('student', 'personnel')
    and active
    and not exists (select 1 from public.members m where m.registered_user_id = public.users.id);

  if v_user is not null then
    insert into public.members (user_id, registered_user_id) values (new.id, v_user) on conflict do nothing;
  end if;
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
