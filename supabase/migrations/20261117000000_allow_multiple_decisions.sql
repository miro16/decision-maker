alter table public.decisions
  drop constraint decisions_user_id_key;

create index decisions_user_id_created_at_idx
  on public.decisions (user_id, created_at desc);

create policy decisions_update_own
  on public.decisions
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy decisions_delete_own
  on public.decisions
  for delete
  using (auth.uid() = user_id);
