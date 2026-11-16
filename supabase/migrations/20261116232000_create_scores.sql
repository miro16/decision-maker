create table public.scores (
  id uuid primary key default gen_random_uuid(),
  option_id uuid not null references public.options (id) on delete cascade,
  criterion_id uuid not null references public.criteria (id) on delete cascade,
  value integer not null,
  created_at timestamptz not null default now(),
  constraint scores_value_range check (value between 1 and 5),
  constraint scores_option_criterion_unique unique (option_id, criterion_id)
);

alter table public.scores enable row level security;

create policy scores_select_own
  on public.scores
  for select
  using (
    exists (
      select 1
      from public.options
      join public.criteria on criteria.decision_id = options.decision_id
      join public.decisions on decisions.id = options.decision_id
      where options.id = scores.option_id
        and criteria.id = scores.criterion_id
        and decisions.user_id = auth.uid()
    )
  );

create policy scores_insert_own
  on public.scores
  for insert
  with check (
    exists (
      select 1
      from public.options
      join public.criteria on criteria.decision_id = options.decision_id
      join public.decisions on decisions.id = options.decision_id
      where options.id = scores.option_id
        and criteria.id = scores.criterion_id
        and decisions.user_id = auth.uid()
    )
  );

create policy scores_update_own
  on public.scores
  for update
  using (
    exists (
      select 1
      from public.options
      join public.criteria on criteria.decision_id = options.decision_id
      join public.decisions on decisions.id = options.decision_id
      where options.id = scores.option_id
        and criteria.id = scores.criterion_id
        and decisions.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.options
      join public.criteria on criteria.decision_id = options.decision_id
      join public.decisions on decisions.id = options.decision_id
      where options.id = scores.option_id
        and criteria.id = scores.criterion_id
        and decisions.user_id = auth.uid()
    )
  );

create policy scores_delete_own
  on public.scores
  for delete
  using (
    exists (
      select 1
      from public.options
      join public.criteria on criteria.decision_id = options.decision_id
      join public.decisions on decisions.id = options.decision_id
      where options.id = scores.option_id
        and criteria.id = scores.criterion_id
        and decisions.user_id = auth.uid()
    )
  );
