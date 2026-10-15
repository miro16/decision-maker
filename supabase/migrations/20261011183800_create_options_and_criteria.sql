create table public.options (
  id uuid primary key default gen_random_uuid(),
  decision_id uuid not null references public.decisions (id) on delete cascade,
  name text not null,
  position integer not null,
  created_at timestamptz not null default now(),
  constraint options_name_length check (char_length(btrim(name)) between 1 and 200),
  constraint options_decision_position_unique unique (decision_id, position)
);

create unique index options_decision_name_unique
  on public.options (decision_id, lower(btrim(name)));

create function public.options_set_position()
returns trigger
language plpgsql
security invoker
as $$
declare
  current_count integer;
  max_position integer;
begin
  select count(*), coalesce(max(position), 0)
    into current_count, max_position
    from public.options
    where decision_id = new.decision_id;

  if current_count >= 20 then
    raise exception 'a decision may have at most 20 options';
  end if;

  new.position := max_position + 1;
  return new;
end;
$$;

create trigger options_set_position
  before insert on public.options
  for each row
  execute function public.options_set_position();

alter table public.options enable row level security;

create policy options_select_own
  on public.options
  for select
  using (
    exists (
      select 1
      from public.decisions
      where decisions.id = options.decision_id
        and decisions.user_id = auth.uid()
    )
  );

create policy options_insert_own
  on public.options
  for insert
  with check (
    exists (
      select 1
      from public.decisions
      where decisions.id = options.decision_id
        and decisions.user_id = auth.uid()
    )
  );

create policy options_update_own
  on public.options
  for update
  using (
    exists (
      select 1
      from public.decisions
      where decisions.id = options.decision_id
        and decisions.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.decisions
      where decisions.id = options.decision_id
        and decisions.user_id = auth.uid()
    )
  );

create policy options_delete_own
  on public.options
  for delete
  using (
    exists (
      select 1
      from public.decisions
      where decisions.id = options.decision_id
        and decisions.user_id = auth.uid()
    )
  );

create table public.criteria (
  id uuid primary key default gen_random_uuid(),
  decision_id uuid not null references public.decisions (id) on delete cascade,
  name text not null,
  weight integer not null,
  position integer not null,
  created_at timestamptz not null default now(),
  constraint criteria_name_length check (char_length(btrim(name)) between 1 and 200),
  constraint criteria_weight_range check (weight between 1 and 5),
  constraint criteria_decision_position_unique unique (decision_id, position)
);

create unique index criteria_decision_name_unique
  on public.criteria (decision_id, lower(btrim(name)));

create function public.criteria_set_position()
returns trigger
language plpgsql
security invoker
as $$
declare
  current_count integer;
  max_position integer;
begin
  select count(*), coalesce(max(position), 0)
    into current_count, max_position
    from public.criteria
    where decision_id = new.decision_id;

  if current_count >= 20 then
    raise exception 'a decision may have at most 20 criteria';
  end if;

  new.position := max_position + 1;
  return new;
end;
$$;

create trigger criteria_set_position
  before insert on public.criteria
  for each row
  execute function public.criteria_set_position();

alter table public.criteria enable row level security;

create policy criteria_select_own
  on public.criteria
  for select
  using (
    exists (
      select 1
      from public.decisions
      where decisions.id = criteria.decision_id
        and decisions.user_id = auth.uid()
    )
  );

create policy criteria_insert_own
  on public.criteria
  for insert
  with check (
    exists (
      select 1
      from public.decisions
      where decisions.id = criteria.decision_id
        and decisions.user_id = auth.uid()
    )
  );

create policy criteria_update_own
  on public.criteria
  for update
  using (
    exists (
      select 1
      from public.decisions
      where decisions.id = criteria.decision_id
        and decisions.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.decisions
      where decisions.id = criteria.decision_id
        and decisions.user_id = auth.uid()
    )
  );

create policy criteria_delete_own
  on public.criteria
  for delete
  using (
    exists (
      select 1
      from public.decisions
      where decisions.id = criteria.decision_id
        and decisions.user_id = auth.uid()
    )
  );
