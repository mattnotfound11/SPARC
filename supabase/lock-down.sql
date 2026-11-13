-- LOCK DOWN SPARC: switch from public to admin-only access.
-- Run in the Supabase SQL Editor AFTER you have created admin accounts (docs/supabase-setup.md,
-- "Locking it down"), and then set NEXT_PUBLIC_REQUIRE_ADMIN_LOGIN=true and redeploy the site.
-- Do not run it before the site is redeployed with login turned on, or the console stops working.
-- Safe to run again.

do $$
declare t text;
begin
  foreach t in array array['users', 'slots', 'logs', 'scans'] loop
    execute format('drop policy if exists public_all on public.%I', t);
    execute format('drop policy if exists admin_all on public.%I', t);
    execute format(
      'create policy admin_all on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())', t);
  end loop;
end $$;
revoke all on public.users, public.slots, public.logs, public.scans from anon;

revoke execute on function public.record_tap(jsonb, jsonb, jsonb, jsonb) from anon;
revoke execute on function public.is_admin() from anon;

-- The homepage still reads the count (anyone), but only admins' consoles may change it.
drop policy if exists "console can insert the count" on public.sparc_availability;
drop policy if exists "console can update the count" on public.sparc_availability;
create policy "console can insert the count" on public.sparc_availability
  for insert to authenticated with check (id = 'main' and public.is_admin());
create policy "console can update the count" on public.sparc_availability
  for update to authenticated using (id = 'main' and public.is_admin()) with check (id = 'main' and public.is_admin());
revoke insert, update on public.sparc_availability from anon;
