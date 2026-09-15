-- ============================================================
-- LEVIA - BANCO INICIAL
-- Rode este arquivo no Supabase > SQL Editor.
-- ============================================================

create extension if not exists "pgcrypto";

-- PERFIS
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- PESO
create table if not exists public.weight_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  weight numeric(6,2) not null check (weight > 0),
  recorded_at date not null default current_date,
  created_at timestamptz not null default now()
);

create index if not exists weight_entries_user_date_idx
  on public.weight_entries(user_id, recorded_at desc);

-- REFEIÇÕES
create table if not exists public.meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  meal_type text not null,
  description text not null,
  meal_date date not null default current_date,
  created_at timestamptz not null default now()
);

create index if not exists meals_user_date_idx
  on public.meals(user_id, meal_date desc);

-- ATIVIDADES
create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  duration_minutes integer check (duration_minutes is null or duration_minutes >= 0),
  steps integer check (steps is null or steps >= 0),
  activity_date date not null default current_date,
  created_at timestamptz not null default now()
);

create index if not exists activities_user_date_idx
  on public.activities(user_id, activity_date desc);

-- HÁBITOS DIÁRIOS
create table if not exists public.daily_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  log_date date not null default current_date,
  water_ml integer check (water_ml is null or water_ml >= 0),
  sleep_hours numeric(4,1) check (sleep_hours is null or (sleep_hours >= 0 and sleep_hours <= 24)),
  hunger_level integer check (hunger_level is null or hunger_level between 1 and 5),
  mood_level integer check (mood_level is null or mood_level between 1 and 5),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, log_date)
);

create index if not exists daily_logs_user_date_idx
  on public.daily_logs(user_id, log_date desc);

-- ============================================================
-- CRIAR PERFIL AUTOMATICAMENTE APÓS CADASTRO
-- ============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- Cada usuário só pode acessar os próprios dados.
-- ============================================================

alter table public.profiles enable row level security;
alter table public.weight_entries enable row level security;
alter table public.meals enable row level security;
alter table public.activities enable row level security;
alter table public.daily_logs enable row level security;

-- PROFILES
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles for select
to authenticated
using ((select auth.uid()) = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

-- WEIGHT
drop policy if exists "weight_select_own" on public.weight_entries;
create policy "weight_select_own"
on public.weight_entries for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "weight_insert_own" on public.weight_entries;
create policy "weight_insert_own"
on public.weight_entries for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "weight_update_own" on public.weight_entries;
create policy "weight_update_own"
on public.weight_entries for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "weight_delete_own" on public.weight_entries;
create policy "weight_delete_own"
on public.weight_entries for delete
to authenticated
using ((select auth.uid()) = user_id);

-- MEALS
drop policy if exists "meals_select_own" on public.meals;
create policy "meals_select_own"
on public.meals for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "meals_insert_own" on public.meals;
create policy "meals_insert_own"
on public.meals for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "meals_update_own" on public.meals;
create policy "meals_update_own"
on public.meals for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "meals_delete_own" on public.meals;
create policy "meals_delete_own"
on public.meals for delete
to authenticated
using ((select auth.uid()) = user_id);

-- ACTIVITIES
drop policy if exists "activities_select_own" on public.activities;
create policy "activities_select_own"
on public.activities for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "activities_insert_own" on public.activities;
create policy "activities_insert_own"
on public.activities for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "activities_update_own" on public.activities;
create policy "activities_update_own"
on public.activities for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "activities_delete_own" on public.activities;
create policy "activities_delete_own"
on public.activities for delete
to authenticated
using ((select auth.uid()) = user_id);

-- DAILY LOGS
drop policy if exists "daily_select_own" on public.daily_logs;
create policy "daily_select_own"
on public.daily_logs for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "daily_insert_own" on public.daily_logs;
create policy "daily_insert_own"
on public.daily_logs for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "daily_update_own" on public.daily_logs;
create policy "daily_update_own"
on public.daily_logs for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "daily_delete_own" on public.daily_logs;
create policy "daily_delete_own"
on public.daily_logs for delete
to authenticated
using ((select auth.uid()) = user_id);
