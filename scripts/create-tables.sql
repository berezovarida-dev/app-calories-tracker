-- Создание всех таблиц для трекера калорий
-- Выполни: npm run sql -- "$(cat scripts/create-tables.sql)"

-- 1. Таблица еды daily_entries
create table if not exists public.daily_entries (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  kcal        integer not null,
  protein     integer default 0,
  fat         integer default 0,
  carbs       integer default 0,
  amount      numeric(10,2),
  unit        text default 'g',
  eaten_at    timestamptz not null default now(),
  note        text,
  created_at  timestamptz not null default now()
);

create index if not exists daily_entries_user_date_idx
  on public.daily_entries (user_id, eaten_at desc);

alter table public.daily_entries enable row level security;

drop policy if exists "Users can manage own entries" on public.daily_entries;
create policy "Users can manage own entries"
  on public.daily_entries
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 2. Таблица активности activities
create table if not exists public.activities (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  type             text not null,
  duration_minutes integer not null,
  calories         integer not null,
  occurred_at      timestamptz not null default now(),
  intensity        text,
  created_at       timestamptz not null default now()
);

create index if not exists activities_user_date_idx
  on public.activities (user_id, occurred_at desc);

alter table public.activities enable row level security;

drop policy if exists "Users can manage own activities" on public.activities;
create policy "Users can manage own activities"
  on public.activities
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 3. Таблица состояния дня (вода / цикл / самочувствие) daily_states
create table if not exists public.daily_states (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  date            date not null,
  water_intake_ml integer default 0,
  water_goal_ml   integer default 2000,
  cycle_phase     text default 'none',
  mood            text,
  symptoms        jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create unique index if not exists daily_states_user_date_uniq
  on public.daily_states (user_id, date);

alter table public.daily_states enable row level security;

drop policy if exists "Users can manage own daily state" on public.daily_states;
create policy "Users can manage own daily state"
  on public.daily_states
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 4. Таблица профиля пользователя profiles
create table if not exists public.profiles (
  id                 uuid primary key references auth.users(id) on delete cascade,
  height_cm          integer,
  start_weight_kg     numeric(5,2),
  current_weight_kg   numeric(5,2),
  goal_weight_kg     numeric(5,2),
  calorie_goal       integer,
  protein_goal_g      integer,
  fat_goal_g          integer,
  carbs_goal_g       integer,
  water_goal_ml       integer default 2000,
  show_cycle_tracking boolean default false,
  locale             text default 'ru',
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Users can manage own profile" on public.profiles;
create policy "Users can manage own profile"
  on public.profiles
  for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

