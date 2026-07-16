-- Runly — schéma initial (Lot 0)
-- Source : specs-mvp-app-running.md §9 (modèle de données simplifié).
-- Minimisation santé (règle transverse n°7 + spec §9) : on ne persiste que
-- des AGRÉGATS de séance (durée, distance, FC moyenne, cadence moyenne,
-- charge) — jamais les séries FC brutes ni le GPS brut.
-- SessionBlock est porté en jsonb (structure pivot, sérialisable — spec §9).
-- Chaque table porte un user_id dénormalisé pour des politiques RLS directes.

create extension if not exists "pgcrypto";

-- Horodatage de modification automatique.
create function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- User : profil, antécédents[], préférences, permissions (spec §9).
-- id = auth.users.id (compte créé en fin d'onboarding, D2 ; âge minimum 16 ans, D12).
-- ---------------------------------------------------------------------------
create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  first_name text,
  birth_date date,
  injury_history jsonb not null default '[]'::jsonb, -- antécédents (flag prudence)
  preferences jsonb not null default '{}'::jsonb,
  permissions jsonb not null default '{}'::jsonb, -- consentements santé/notifs accordés
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint users_minimum_age check (
    birth_date is null or birth_date <= (current_date - interval '16 years')
  )
);

create trigger users_updated_at
  before update on public.users
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- PhysioProfile : vma, fcmax, sv1, sv2, zones[], confiance par champ,
-- historique des révisions (spec §9, §7.5).
-- ---------------------------------------------------------------------------
create table public.physio_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  vma_kmh numeric(4, 1),
  fcmax_bpm smallint check (fcmax_bpm between 100 and 250),
  sv1_pct_vma numeric(4, 1),
  sv2_pct_vma numeric(4, 1),
  zones jsonb not null default '[]'::jsonb, -- 5 zones FC en % FCmax
  confidence jsonb not null default '{}'::jsonb, -- par champ : mesure|estime|defaut
  revisions jsonb not null default '[]'::jsonb, -- historique des révisions
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint physio_profiles_one_per_user unique (user_id)
);

create trigger physio_profiles_updated_at
  before update on public.physio_profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Goal : optionnel (D5) — distance, date, ambition, épreuve, statut.
-- Absent = mode semaine type.
-- ---------------------------------------------------------------------------
create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  race_distance text not null check (race_distance in ('5k', '10k', 'semi', 'marathon')),
  race_date date not null,
  ambition text not null check (ambition in ('finir', 'chrono')),
  target_time_s integer check (target_time_s > 0),
  event_name text,
  status text not null default 'active' check (status in ('active', 'completed', 'abandoned')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index goals_user_id_idx on public.goals (user_id);

create trigger goals_updated_at
  before update on public.goals
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- TrainingPlan : phases[], statut, version (spec §9) — généré par le moteur
-- côté client (fonction pure, Lot 3), persisté ici pour sync multi-device (D14).
-- ---------------------------------------------------------------------------
create table public.training_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  goal_id uuid not null references public.goals (id) on delete cascade,
  phases jsonb not null default '[]'::jsonb, -- générale | spécifique | affûtage
  status text not null default 'active' check (status in ('active', 'superseded', 'completed', 'abandoned')),
  version integer not null default 1 check (version >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index training_plans_user_id_idx on public.training_plans (user_id);
create index training_plans_goal_id_idx on public.training_plans (goal_id);

create trigger training_plans_updated_at
  before update on public.training_plans
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- PlannedWeek : index, volumeCible, chargeCible (spec §9).
-- ---------------------------------------------------------------------------
create table public.planned_weeks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  plan_id uuid not null references public.training_plans (id) on delete cascade,
  week_index integer not null check (week_index >= 0),
  target_volume_km numeric(5, 1),
  target_load numeric(7, 1), -- unités arbitraires sRPE
  is_recovery boolean not null default false, -- semaine allégée
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint planned_weeks_unique_index unique (plan_id, week_index)
);

create index planned_weeks_user_id_idx on public.planned_weeks (user_id);

create trigger planned_weeks_updated_at
  before update on public.planned_weeks
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- PlannedSession : date, type, blocs[] (SessionBlock en jsonb), cibles, statut.
-- week_id nullable : une séance planifiée peut vivre hors plan (semaine type,
-- séance spontanée — spec §7.9).
-- ---------------------------------------------------------------------------
create table public.planned_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  week_id uuid references public.planned_weeks (id) on delete cascade,
  scheduled_date date not null,
  session_type text not null check (
    session_type in ('ef', 'sortie_longue', 'vma_court', 'seuil', 'tempo', 'fartlek', 'recuperation')
  ),
  -- SessionBlock[] : répétitions × durée|distance @ allure|zoneFC|RPE, récup,
  -- blocs imbriqués/séries (spec §9) — structure pivot sérialisable.
  blocks jsonb not null default '[]'::jsonb,
  targets jsonb not null default '{}'::jsonb, -- allures/zones cibles calculées
  status text not null default 'planned' check (
    status in ('planned', 'done', 'missed', 'moved', 'cancelled')
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index planned_sessions_user_id_date_idx on public.planned_sessions (user_id, scheduled_date);
create index planned_sessions_week_id_idx on public.planned_sessions (week_id);

create trigger planned_sessions_updated_at
  before update on public.planned_sessions
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Workout : séance réalisée, multi-sources (spec §9). AGRÉGATS UNIQUEMENT :
-- pas de séries FC brutes, pas de GPS brut (minimisation, règle n°7).
-- ---------------------------------------------------------------------------
create table public.workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  source text not null check (source in ('healthkit', 'healthconnect', 'strava', 'player', 'manuel')),
  external_id text, -- id source pour la déduplication (E6-1)
  started_at timestamptz not null,
  duration_s integer not null check (duration_s > 0),
  distance_m numeric(8, 1) check (distance_m >= 0),
  avg_hr_bpm smallint check (avg_hr_bpm between 30 and 250),
  avg_cadence_spm smallint check (avg_cadence_spm between 0 and 300),
  load numeric(7, 1), -- charge sRPE (RPE × durée) ou fallback amorçage (D4)
  matched_planned_session_id uuid references public.planned_sessions (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index workouts_user_id_started_at_idx on public.workouts (user_id, started_at);
create unique index workouts_dedup_idx on public.workouts (user_id, source, external_id)
  where external_id is not null;

create trigger workouts_updated_at
  before update on public.workouts
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- SessionFeedback : rpe, douleurs[], note (spec §9). RPE 0–10 (Foster, G6).
-- ---------------------------------------------------------------------------
create table public.session_feedbacks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  workout_id uuid not null references public.workouts (id) on delete cascade,
  rpe smallint not null check (rpe between 0 and 10),
  pains jsonb not null default '[]'::jsonb, -- douleurs déclarées (jamais de pathologie nommée en UI)
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint session_feedbacks_one_per_workout unique (workout_id)
);

create index session_feedbacks_user_id_idx on public.session_feedbacks (user_id);

create trigger session_feedbacks_updated_at
  before update on public.session_feedbacks
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- LoadMetrics : journalier — chargeAiguë7j, chargeChronique28j, acwr,
-- statutJauge (spec §9 ; ACWR rolling 7/28 j, D16).
-- ---------------------------------------------------------------------------
create table public.load_metrics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  metric_date date not null,
  acute_load_7d numeric(7, 1),
  chronic_load_28d numeric(7, 1),
  acwr numeric(4, 2),
  gauge_status text not null default 'calibration' check (
    gauge_status in ('calibration', 'sous_charge', 'favorable', 'pic')
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint load_metrics_one_per_day unique (user_id, metric_date)
);

create trigger load_metrics_updated_at
  before update on public.load_metrics
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Alert : type, déclencheur, action proposée, décision utilisateur, timestamp
-- (spec §9). L'utilisateur décide toujours ; sa décision est tracée.
-- ---------------------------------------------------------------------------
create table public.alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  alert_type text not null check (alert_type in ('pic_charge', 'sous_charge', 'rpe_eleve')),
  trigger_context jsonb not null default '{}'::jsonb, -- déclencheur (valeurs ACWR/RPE)
  proposed_action jsonb not null default '{}'::jsonb, -- substitution 1 tap proposée
  user_decision text check (user_decision in ('accepted', 'kept_plan', 'dismissed')),
  decided_at timestamptz,
  created_at timestamptz not null default now()
);

create index alerts_user_id_created_at_idx on public.alerts (user_id, created_at);
