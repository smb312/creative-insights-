-- Coast Digital Client Management Portal — Initial Schema
-- Run this in your Supabase SQL Editor

-- ============================================================
-- TABLES
-- ============================================================

-- Users (extends Supabase auth.users)
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  role text not null check (role in ('agency_admin', 'agency_member', 'client')),
  client_id uuid,
  created_at timestamptz default now()
);

-- Clients
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  logo_url text,
  primary_contact_name text,
  primary_contact_email text,
  agency_contact_id uuid references public.users(id),
  status text default 'onboarding' check (status in ('onboarding', 'active', 'churned')),
  created_at timestamptz default now()
);

-- Add FK from users.client_id -> clients.id (deferred because clients didn't exist yet)
alter table public.users
  add constraint users_client_id_fkey foreign key (client_id) references public.clients(id);

-- Onboarding responses
create table public.onboarding_responses (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete cascade not null,
  section text not null check (section in ('access', 'performance', 'creative')),
  question_key text not null,
  question_text text not null,
  response_text text,
  updated_at timestamptz default now(),
  updated_by uuid references public.users(id)
);

-- Platform access
create table public.platform_access (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete cascade not null,
  platform text not null check (platform in ('meta', 'google', 'shopify', 'klaviyo', 'ga4', 'tiktok')),
  status text default 'not_started' check (status in ('not_started', 'pending', 'received', 'verified')),
  instructions_url text,
  notes text,
  updated_at timestamptz default now(),
  updated_by uuid references public.users(id)
);

-- Asset folders
create table public.asset_folders (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete cascade not null,
  name text not null,
  created_at timestamptz default now()
);

-- Assets
create table public.assets (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete cascade not null,
  folder_id uuid references public.asset_folders(id) on delete set null,
  file_name text not null,
  file_url text not null,
  file_type text,
  file_size bigint,
  uploaded_by uuid references public.users(id),
  created_at timestamptz default now()
);

-- Reports
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete cascade not null,
  type text not null check (type in ('weekly', 'qbr', 'ad_hoc')),
  title text not null,
  loom_url text,
  notes text,
  report_date date,
  created_by uuid references public.users(id),
  created_at timestamptz default now()
);

-- Creative deliveries
create table public.creative_deliveries (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete cascade not null,
  title text not null,
  frame_io_url text,
  campaign_name text,
  status text default 'in_review' check (status in ('in_review', 'approved', 'revision_requested')),
  delivery_date date,
  created_by uuid references public.users(id),
  created_at timestamptz default now()
);

-- ============================================================
-- INDEXES
-- ============================================================

create index idx_users_role on public.users(role);
create index idx_users_client_id on public.users(client_id);
create index idx_clients_status on public.clients(status);
create index idx_onboarding_responses_client on public.onboarding_responses(client_id);
create index idx_platform_access_client on public.platform_access(client_id);
create index idx_assets_client on public.assets(client_id);
create index idx_assets_folder on public.assets(folder_id);
create index idx_reports_client on public.reports(client_id);
create index idx_creative_deliveries_client on public.creative_deliveries(client_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.users enable row level security;
alter table public.clients enable row level security;
alter table public.onboarding_responses enable row level security;
alter table public.platform_access enable row level security;
alter table public.asset_folders enable row level security;
alter table public.assets enable row level security;
alter table public.reports enable row level security;
alter table public.creative_deliveries enable row level security;

-- Helper: check if the current user has access to a given client
create or replace function public.user_has_client_access(check_client_id uuid)
returns boolean as $$
  select exists (
    select 1 from public.users
    where id = auth.uid()
    and (
      role in ('agency_admin', 'agency_member')
      or (role = 'client' and client_id = check_client_id)
    )
  );
$$ language sql security definer stable;

-- Users policies
create policy "Users can read own profile"
  on public.users for select
  using (id = auth.uid());

create policy "Agency staff can read all users"
  on public.users for select
  using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.role in ('agency_admin', 'agency_member')
    )
  );

create policy "Agency admins can manage users"
  on public.users for all
  using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.role = 'agency_admin'
    )
  );

-- Clients policies
create policy "Agency staff can manage clients"
  on public.clients for all
  using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.role in ('agency_admin', 'agency_member')
    )
  );

create policy "Client users can read own client"
  on public.clients for select
  using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.role = 'client' and u.client_id = clients.id
    )
  );

-- Generic client-scoped policies for remaining tables
-- Onboarding responses
create policy "Access onboarding responses"
  on public.onboarding_responses for all
  using (public.user_has_client_access(client_id));

-- Platform access
create policy "Access platform access"
  on public.platform_access for all
  using (public.user_has_client_access(client_id));

-- Asset folders
create policy "Access asset folders"
  on public.asset_folders for all
  using (public.user_has_client_access(client_id));

-- Assets
create policy "Access assets"
  on public.assets for all
  using (public.user_has_client_access(client_id));

-- Reports
create policy "Access reports"
  on public.reports for all
  using (public.user_has_client_access(client_id));

-- Creative deliveries
create policy "Access creative deliveries"
  on public.creative_deliveries for all
  using (public.user_has_client_access(client_id));
