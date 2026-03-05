-- Coast Digital Client Management Portal - Initial Schema
-- Run this migration against your Supabase project

-- ============================================
-- USERS table (extends Supabase auth.users)
-- ============================================
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  role text not null check (role in ('agency_admin', 'agency_member', 'client')),
  client_id uuid,
  created_at timestamptz default now()
);

-- ============================================
-- CLIENTS table
-- ============================================
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

-- Add the foreign key from users.client_id -> clients.id now that clients exists
alter table public.users
  add constraint users_client_id_fkey foreign key (client_id) references public.clients(id);

-- ============================================
-- ONBOARDING RESPONSES
-- ============================================
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

-- ============================================
-- PLATFORM ACCESS
-- ============================================
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

-- ============================================
-- ASSET FOLDERS
-- ============================================
create table public.asset_folders (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete cascade not null,
  name text not null check (name in ('brand_guidelines', 'logos', 'raw_video', 'ugc', 'other')),
  created_at timestamptz default now()
);

-- ============================================
-- ASSETS
-- ============================================
create table public.assets (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete cascade not null,
  folder_id uuid references public.asset_folders(id),
  file_name text not null,
  file_url text not null,
  file_type text,
  file_size bigint,
  uploaded_by uuid references public.users(id),
  created_at timestamptz default now()
);

-- ============================================
-- REPORTS
-- ============================================
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

-- ============================================
-- CREATIVE DELIVERIES
-- ============================================
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

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
alter table public.users enable row level security;
alter table public.clients enable row level security;
alter table public.onboarding_responses enable row level security;
alter table public.platform_access enable row level security;
alter table public.asset_folders enable row level security;
alter table public.assets enable row level security;
alter table public.reports enable row level security;
alter table public.creative_deliveries enable row level security;

-- Agency users can see all data
create policy "Agency users can view all clients"
  on public.clients for select
  using (
    exists (
      select 1 from public.users
      where users.id = auth.uid()
      and users.role in ('agency_admin', 'agency_member')
    )
  );

create policy "Agency admins can insert clients"
  on public.clients for insert
  with check (
    exists (
      select 1 from public.users
      where users.id = auth.uid()
      and users.role = 'agency_admin'
    )
  );

create policy "Agency admins can update clients"
  on public.clients for update
  using (
    exists (
      select 1 from public.users
      where users.id = auth.uid()
      and users.role = 'agency_admin'
    )
  );

-- Client users can only see their own client
create policy "Client users can view own client"
  on public.clients for select
  using (
    exists (
      select 1 from public.users
      where users.id = auth.uid()
      and users.role = 'client'
      and users.client_id = clients.id
    )
  );

-- Users table policies
create policy "Users can view own profile"
  on public.users for select
  using (id = auth.uid());

create policy "Agency users can view all users"
  on public.users for select
  using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid()
      and u.role in ('agency_admin', 'agency_member')
    )
  );

-- Helper function for client-scoped RLS
create or replace function public.user_has_client_access(target_client_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.users
    where users.id = auth.uid()
    and (
      users.role in ('agency_admin', 'agency_member')
      or (users.role = 'client' and users.client_id = target_client_id)
    )
  );
$$;

-- Apply client-scoped policies to remaining tables
create policy "Users with client access can view onboarding_responses"
  on public.onboarding_responses for select
  using (public.user_has_client_access(client_id));

create policy "Users with client access can manage onboarding_responses"
  on public.onboarding_responses for all
  using (public.user_has_client_access(client_id));

create policy "Users with client access can view platform_access"
  on public.platform_access for select
  using (public.user_has_client_access(client_id));

create policy "Users with client access can manage platform_access"
  on public.platform_access for all
  using (public.user_has_client_access(client_id));

create policy "Users with client access can view asset_folders"
  on public.asset_folders for select
  using (public.user_has_client_access(client_id));

create policy "Users with client access can manage asset_folders"
  on public.asset_folders for all
  using (public.user_has_client_access(client_id));

create policy "Users with client access can view assets"
  on public.assets for select
  using (public.user_has_client_access(client_id));

create policy "Users with client access can manage assets"
  on public.assets for all
  using (public.user_has_client_access(client_id));

create policy "Users with client access can view reports"
  on public.reports for select
  using (public.user_has_client_access(client_id));

create policy "Users with client access can manage reports"
  on public.reports for all
  using (public.user_has_client_access(client_id));

create policy "Users with client access can view creative_deliveries"
  on public.creative_deliveries for select
  using (public.user_has_client_access(client_id));

create policy "Users with client access can manage creative_deliveries"
  on public.creative_deliveries for all
  using (public.user_has_client_access(client_id));

-- ============================================
-- INDEXES
-- ============================================
create index idx_users_client_id on public.users(client_id);
create index idx_users_role on public.users(role);
create index idx_onboarding_responses_client_id on public.onboarding_responses(client_id);
create index idx_platform_access_client_id on public.platform_access(client_id);
create index idx_asset_folders_client_id on public.asset_folders(client_id);
create index idx_assets_client_id on public.assets(client_id);
create index idx_assets_folder_id on public.assets(folder_id);
create index idx_reports_client_id on public.reports(client_id);
create index idx_creative_deliveries_client_id on public.creative_deliveries(client_id);
