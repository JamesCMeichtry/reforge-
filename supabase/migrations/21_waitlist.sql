-- 21 · Waiting list for the landing page
-- Anyone (signed in or not) can add an email. Nobody can read, change or delete rows from the app.
-- Read the list in Supabase under Table Editor → waitlist.

create table if not exists public.waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null
    check (char_length(email) <= 254 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  role text not null check (role in ('solo', 'pt', 'physio')),
  source text not null default 'landing' check (char_length(source) <= 60),
  created_at timestamptz not null default now()
);

-- One entry per email, whatever the capitals
create unique index if not exists waitlist_email_lower_key on public.waitlist (lower(email));

alter table public.waitlist enable row level security;

-- Insert only. No select, update or delete policy, so nobody can read the list through the API.
drop policy if exists "Anyone can join the waiting list" on public.waitlist;
create policy "Anyone can join the waiting list"
  on public.waitlist
  for insert
  to anon, authenticated
  with check (true);

revoke all on public.waitlist from anon, authenticated;
grant insert (email, role, source) on public.waitlist to anon, authenticated;
