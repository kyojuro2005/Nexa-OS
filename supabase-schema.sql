-- ══════════════════════════════════════════════════════════════════════
-- NEXA OS — Schéma PostgreSQL Supabase & Sécurité RLS
-- À exécuter dans la console Supabase > SQL Editor
-- ══════════════════════════════════════════════════════════════════════

-- 1. Table des profils utilisateurs
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  name text,
  email text,
  role text default 'Solo Builder',
  avatar_url text,
  theme text default 'light',
  timezone text default 'Europe/Paris',
  onboarding_complete boolean default false,
  created_at timestamptz default timezone('utc'::text, now()) not null,
  updated_at timestamptz default timezone('utc'::text, now()) not null
);

-- RLS pour profiles
alter table public.profiles enable row level security;

create policy "Les utilisateurs peuvent voir leur propre profil"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Les utilisateurs peuvent insérer leur propre profil"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Les utilisateurs peuvent modifier leur propre profil"
  on public.profiles for update
  using (auth.uid() = id);

-- 2. Trigger automatique à la création d'un utilisateur auth
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

-- Trigger sur auth.users
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 3. Table des préférences de travail
create table if not exists public.work_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null unique,
  availability jsonb not null default '[]'::jsonb,
  preferred_session_duration integer default 90,
  max_session_duration integer default 120,
  break_between_sessions integer default 15,
  peak_hours_start text default '09:00',
  peak_hours_end text default '12:00',
  max_daily_work_hours numeric default 6,
  max_weekly_work_hours numeric default 24,
  strict_rest_mode boolean default true,
  created_at timestamptz default timezone('utc'::text, now()) not null,
  updated_at timestamptz default timezone('utc'::text, now()) not null
);

alter table public.work_preferences enable row level security;

create policy "Accès complet aux préférences de l'utilisateur"
  on public.work_preferences for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 4. Table des projets
create table if not exists public.projects (
  id text primary key,
  user_id uuid references auth.users on delete cascade not null,
  title text not null,
  description text default '',
  type text default 'SaaS B2B',
  status text default 'active',
  priority text default 'medium',
  progress_percent integer default 0,
  phases jsonb default '[]'::jsonb,
  target_date text,
  color text default '#3525cd',
  total_estimated_minutes integer default 0,
  total_actual_minutes integer default 0,
  ai_analysis jsonb,
  conversation_history jsonb default '[]'::jsonb,
  created_at timestamptz default timezone('utc'::text, now()) not null,
  updated_at timestamptz default timezone('utc'::text, now()) not null
);

alter table public.projects enable row level security;

create policy "Accès complet aux projets de l'utilisateur"
  on public.projects for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 5. Table des sessions de travail
create table if not exists public.work_sessions (
  id text primary key,
  user_id uuid references auth.users on delete cascade not null,
  project_id text,
  task_id text,
  title text not null,
  description text default '',
  date text not null,
  start_time text not null,
  end_time text not null,
  duration_minutes integer not null,
  status text default 'scheduled',
  actual_duration_minutes integer,
  completion_notes text,
  completed boolean default false,
  thoughts jsonb default '[]'::jsonb,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

alter table public.work_sessions enable row level security;

create policy "Accès complet aux sessions de l'utilisateur"
  on public.work_sessions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 6. Table des périodes bloquées
create table if not exists public.blocked_periods (
  id text primary key,
  user_id uuid references auth.users on delete cascade not null,
  date text not null,
  start_time text,
  end_time text,
  label text not null,
  type text default 'personal',
  created_at timestamptz default timezone('utc'::text, now()) not null
);

alter table public.blocked_periods enable row level security;

create policy "Accès complet aux périodes bloquées de l'utilisateur"
  on public.blocked_periods for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 7. Table des statistiques utilisateur
create table if not exists public.user_stats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null unique,
  total_work_minutes integer default 0,
  sessions_completed integer default 0,
  sessions_deferred integer default 0,
  projects_completed integer default 0,
  tasks_completed integer default 0,
  average_session_accuracy numeric default 1.0,
  weekly_work_minutes jsonb default '[]'::jsonb,
  estimation_factor numeric default 1.0,
  updated_at timestamptz default timezone('utc'::text, now()) not null
);

alter table public.user_stats enable row level security;

create policy "Accès complet aux statistiques de l'utilisateur"
  on public.user_stats for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ══════════════════════════════════════════════════════════════════════
-- 8. Storage — Bucket avatars
-- ══════════════════════════════════════════════════════════════════════

-- Créer le bucket (public = lecture publique des images)
insert into storage.buckets (id, name, public)
  values ('avatars', 'avatars', true)
  on conflict (id) do nothing;

-- Politique : chaque utilisateur peut lire/écrire uniquement dans son dossier
create policy "Upload avatar par l'utilisateur"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Mise à jour avatar par l'utilisateur"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Lecture publique des avatars"
  on storage.objects for select
  using (bucket_id = 'avatars');
