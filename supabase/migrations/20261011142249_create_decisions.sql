create table public.decisions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  title text not null,
  created_at timestamptz not null default now(),
  constraint decisions_title_length check (char_length(btrim(title)) between 1 and 200)
);

alter table public.decisions enable row level security;

create policy decisions_select_own
  on public.decisions
  for select
  using (auth.uid() = user_id);

create policy decisions_insert_own
  on public.decisions
  for insert
  with check (auth.uid() = user_id);
