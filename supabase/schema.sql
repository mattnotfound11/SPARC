-- Run once in the Supabase SQL editor of ANY existing project (no new project needed): it adds one
-- tiny table and touches nothing else. Holds ONLY the public free/total slot count (no driver data).
create table if not exists public.sparc_availability (
  id text primary key check (id = 'main'),
  free integer not null check (free >= 0),
  total integer not null check (total >= 0),
  updated_at timestamptz not null default now()
);

alter table public.sparc_availability enable row level security;

create policy "anyone can read the count" on public.sparc_availability
  for select using (true);
create policy "console can insert the count" on public.sparc_availability
  for insert with check (id = 'main');
create policy "console can update the count" on public.sparc_availability
  for update using (id = 'main') with check (id = 'main');

alter publication supabase_realtime add table public.sparc_availability;
