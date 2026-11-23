-- ============================================================================
-- AccVault — Skema Database PostgreSQL + Row Level Security (RLS) untuk Supabase
-- Jalankan seluruh skrip ini 1x di Supabase Dashboard -> SQL Editor -> New Query
-- ============================================================================

create extension if not exists "pgcrypto";

-- Helper trigger untuk updated_at otomatis
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$ language plpgsql;

-- 1. Nomor HP & Kartu SIM / eSIM
create table if not exists public.phone_numbers (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  phone_number text not null,
  label text not null default '',
  provider text not null default 'Telkomsel',
  sim_type text not null default 'SIM Fisik',
  device_slot text not null default '',
  usage_purpose text not null default '',
  no_expiry boolean not null default false,
  active_until date,
  grace_until date,
  renewal_tip text not null default '',
  linked_services jsonb not null default '[]'::jsonb,
  manual_status text not null default 'Active',
  tags jsonb not null default '[]'::jsonb,
  custom_fields jsonb not null default '[]'::jsonb,
  notes text not null default '',
  updated_at timestamptz not null default timezone('utc', now())
);

-- 2. Akun Google
create table if not exists public.google_accounts (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  email text not null,
  alias_label text not null default '',
  primary_purpose text not null default 'Personal',
  color_badge text not null default '#2563EB',
  chrome_profile text not null default '',
  status text not null default 'Active',
  password_hint text not null default '',
  holder_name text not null default '',
  holder_until text not null default '',
  quick_sub_name text not null default '',
  quick_sub_period text not null default '',
  quick_sub_needs_cancel boolean not null default false,
  recovery_account_id text references public.google_accounts(id) on delete set null,
  linked_phone_id text references public.phone_numbers(id) on delete set null,
  recovery_phone_hint text not null default '',
  has_2fa boolean not null default true,
  password_manager_ref text not null default '',
  drive_used_gb numeric(8, 2),
  drive_limit_gb numeric(8, 2),
  tags jsonb not null default '[]'::jsonb,
  custom_fields jsonb not null default '[]'::jsonb,
  notes text not null default '',
  updated_at timestamptz not null default timezone('utc', now())
);

-- Migrasi aman untuk database Supabase yang sudah dibuat sebelumnya
alter table public.google_accounts add column if not exists password_hint text not null default '';
alter table public.google_accounts add column if not exists holder_name text not null default '';
alter table public.google_accounts add column if not exists holder_until text not null default '';
alter table public.google_accounts add column if not exists quick_sub_name text not null default '';
alter table public.google_accounts add column if not exists quick_sub_period text not null default '';
alter table public.google_accounts add column if not exists quick_sub_needs_cancel boolean not null default false;

-- 3. Cloud Projects per Akun Google
create table if not exists public.cloud_projects (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  account_id text not null references public.google_accounts(id) on delete cascade,
  provider text not null default 'GCP',
  project_name text not null,
  project_id_ref text not null default '',
  environment text not null default 'Production',
  status text not null default 'Active',
  billing_tier text not null default 'Free Tier',
  console_url text not null default '',
  related_domains text not null default '',
  tags jsonb not null default '[]'::jsonb,
  custom_fields jsonb not null default '[]'::jsonb,
  notes text not null default '',
  updated_at timestamptz not null default timezone('utc', now())
);

-- 4. Website & Layanan Terhubung / OAuth
create table if not exists public.connected_websites (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  account_id text not null references public.google_accounts(id) on delete cascade,
  service_name text not null,
  url text not null default '',
  category text not null default 'Developer',
  login_method text not null default 'Google OAuth / SSO',
  username_handle text not null default '',
  importance text not null default 'Normal',
  tags jsonb not null default '[]'::jsonb,
  custom_fields jsonb not null default '[]'::jsonb,
  notes text not null default '',
  updated_at timestamptz not null default timezone('utc', now())
);

-- 5. Subscriptions (Langganan Berbayar / Trial)
create table if not exists public.subscriptions (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  account_id text not null references public.google_accounts(id) on delete cascade,
  service_name text not null,
  plan_name text not null default '',
  status text not null default 'Active',
  cost_amount numeric(14, 2) not null default 0,
  currency text not null default 'IDR',
  billing_cycle text not null default 'Monthly',
  next_renewal_date date,
  auto_renew boolean not null default true,
  payment_method_hint text not null default '',
  manage_url text not null default '',
  tags jsonb not null default '[]'::jsonb,
  notes text not null default '',
  updated_at timestamptz not null default timezone('utc', now())
);

-- 6. Aset Lainnya (Fleksibel)
create table if not exists public.other_assets (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  account_id text not null references public.google_accounts(id) on delete cascade,
  asset_type text not null default 'Lainnya',
  title text not null,
  identifier text not null default '',
  url text not null default '',
  tags jsonb not null default '[]'::jsonb,
  custom_fields jsonb not null default '[]'::jsonb,
  notes text not null default '',
  updated_at timestamptz not null default timezone('utc', now())
);

-- Indeks performa untuk query per user & relasi
create index if not exists idx_phone_numbers_user on public.phone_numbers(user_id);
create index if not exists idx_google_accounts_user on public.google_accounts(user_id);
create index if not exists idx_cloud_projects_account on public.cloud_projects(user_id, account_id);
create index if not exists idx_connected_websites_account on public.connected_websites(user_id, account_id);
create index if not exists idx_subscriptions_account on public.subscriptions(user_id, account_id);
create index if not exists idx_other_assets_account on public.other_assets(user_id, account_id);

-- Triggers updated_at
drop trigger if exists trg_phone_numbers_updated_at on public.phone_numbers;
create trigger trg_phone_numbers_updated_at before update on public.phone_numbers
for each row execute function public.handle_updated_at();

drop trigger if exists trg_google_accounts_updated_at on public.google_accounts;
create trigger trg_google_accounts_updated_at before update on public.google_accounts
for each row execute function public.handle_updated_at();

drop trigger if exists trg_cloud_projects_updated_at on public.cloud_projects;
create trigger trg_cloud_projects_updated_at before update on public.cloud_projects
for each row execute function public.handle_updated_at();

drop trigger if exists trg_connected_websites_updated_at on public.connected_websites;
create trigger trg_connected_websites_updated_at before update on public.connected_websites
for each row execute function public.handle_updated_at();

drop trigger if exists trg_subscriptions_updated_at on public.subscriptions;
create trigger trg_subscriptions_updated_at before update on public.subscriptions
for each row execute function public.handle_updated_at();

drop trigger if exists trg_other_assets_updated_at on public.other_assets;
create trigger trg_other_assets_updated_at before update on public.other_assets
for each row execute function public.handle_updated_at();

-- Aktifkan Row Level Security (RLS) pada semua tabel
alter table public.phone_numbers enable row level security;
alter table public.google_accounts enable row level security;
alter table public.cloud_projects enable row level security;
alter table public.connected_websites enable row level security;
alter table public.subscriptions enable row level security;
alter table public.other_assets enable row level security;

-- Kebijakan akses ketat: hanya pemilik akun yang login dapat membaca & mengubah datanya sendiri
drop policy if exists "owner_all_phone_numbers" on public.phone_numbers;
create policy "owner_all_phone_numbers" on public.phone_numbers
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "owner_all_google_accounts" on public.google_accounts;
create policy "owner_all_google_accounts" on public.google_accounts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "owner_all_cloud_projects" on public.cloud_projects;
create policy "owner_all_cloud_projects" on public.cloud_projects
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "owner_all_connected_websites" on public.connected_websites;
create policy "owner_all_connected_websites" on public.connected_websites
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "owner_all_subscriptions" on public.subscriptions;
create policy "owner_all_subscriptions" on public.subscriptions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "owner_all_other_assets" on public.other_assets;
create policy "owner_all_other_assets" on public.other_assets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
