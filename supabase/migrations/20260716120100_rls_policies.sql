-- Runly — politiques RLS (Lot 0)
-- RLS activée sur TOUTES les tables : chaque utilisateur ne voit et ne
-- modifie que ses propres lignes (spec §9 : RGPD by design ; plan Lot 0).
-- Les données de santé sont sensibles : aucune table publique.

-- users : la ligne appartient à l'utilisateur authentifié (id = auth.uid()).
alter table public.users enable row level security;

create policy "users_select_own" on public.users
  for select using ((select auth.uid()) = id);
create policy "users_insert_own" on public.users
  for insert with check ((select auth.uid()) = id);
create policy "users_update_own" on public.users
  for update using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy "users_delete_own" on public.users
  for delete using ((select auth.uid()) = id);

-- Tables filles : même règle via user_id dénormalisé.
do $$
declare
  t text;
begin
  foreach t in array array[
    'physio_profiles',
    'goals',
    'training_plans',
    'planned_weeks',
    'planned_sessions',
    'workouts',
    'session_feedbacks',
    'load_metrics',
    'alerts'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy %I on public.%I for select using ((select auth.uid()) = user_id)',
      t || '_select_own', t
    );
    execute format(
      'create policy %I on public.%I for insert with check ((select auth.uid()) = user_id)',
      t || '_insert_own', t
    );
    execute format(
      'create policy %I on public.%I for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)',
      t || '_update_own', t
    );
    execute format(
      'create policy %I on public.%I for delete using ((select auth.uid()) = user_id)',
      t || '_delete_own', t
    );
  end loop;
end;
$$;
