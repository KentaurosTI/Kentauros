-- ============================================
-- CONSOLIDATED MIGRATION - Execute in Supabase SQL Editor
-- Project: Kentauros OS
-- Date: 2026-05-12
-- ============================================

-- Drop existing tables to avoid schema conflicts
DROP TABLE IF EXISTS public.captured_leads_registry CASCADE;
DROP TABLE IF EXISTS public.workflow_runs CASCADE;
DROP TABLE IF EXISTS public.learning_events CASCADE;
DROP TABLE IF EXISTS public.approval_requests CASCADE;
DROP TABLE IF EXISTS public.meetings CASCADE;
DROP TABLE IF EXISTS public.role_permissions CASCADE;
DROP TABLE IF EXISTS public.user_profiles CASCADE;
DROP TABLE IF EXISTS public.tenants CASCADE;
DROP TABLE IF EXISTS public.operational_records CASCADE;
DROP TABLE IF EXISTS public.lead_contacts CASCADE;
DROP TABLE IF EXISTS public.leads CASCADE;

-- 1. Create leads table
CREATE TABLE IF NOT EXISTS public.leads (
  id uuid primary key DEFAULT gen_random_uuid(),
  tenant_id text not null,
  user_id integer not null DEFAULT 1,
  company text not null,
  contact text,
  email text,
  phone text,
  source text,
  status text not null default 'new',
  score integer not null default 0,
  stage text,
  value numeric not null default 0,
  industry text,
  notes text,
  assigned_to integer,
  created_at timestamptz not null default now(),
  last_activity timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS leads_tenant_user_idx ON public.leads (tenant_id, user_id);
CREATE INDEX IF NOT EXISTS leads_status_idx ON public.leads (status);
CREATE INDEX IF NOT EXISTS leads_source_idx ON public.leads (source);

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow app anon lead reads" ON public.leads FOR SELECT USING (true);
CREATE POLICY "Allow app anon lead writes" ON public.leads FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow app anon lead updates" ON public.leads FOR UPDATE USING (true) WITH CHECK (true);

-- 2. Create lead contact table
CREATE TABLE IF NOT EXISTS public.lead_contacts (
  id uuid primary key DEFAULT gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  contact_type text not null check (contact_type in ('email', 'phone', 'whatsapp')),
  contact_value text not null,
  created_at timestamptz not null default now(),
  CONSTRAINT lead_contacts_unique_value UNIQUE (lead_id, contact_type, contact_value)
);

CREATE INDEX IF NOT EXISTS lead_contacts_lead_id_idx ON public.lead_contacts (lead_id);
CREATE INDEX IF NOT EXISTS lead_contacts_type_value_idx ON public.lead_contacts (contact_type, contact_value);

ALTER TABLE public.lead_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow app anon lead contact reads" ON public.lead_contacts FOR SELECT USING (true);
CREATE POLICY "Allow app anon lead contact writes" ON public.lead_contacts FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow app anon lead contact deletes" ON public.lead_contacts FOR DELETE USING (true);

-- 3. Create unique index for leads capture identity
CREATE UNIQUE INDEX IF NOT EXISTS leads_unique_capture_identity_per_tenant
  ON public.leads (tenant_id, (metadata->>'captureIdentity'))
  WHERE metadata ? 'captureIdentity'
    AND coalesce(metadata->>'captureIdentity', '') <> '';

CREATE UNIQUE INDEX IF NOT EXISTS leads_unique_capture_website_per_tenant
  ON public.leads (tenant_id, (metadata->>'website'))
  WHERE metadata ? 'website'
    AND coalesce(metadata->>'website', '') <> '';

CREATE UNIQUE INDEX IF NOT EXISTS leads_unique_company_location_per_tenant
  ON public.leads (tenant_id, lower(company), coalesce(metadata->>'location', metadata->>'mapsAddress', ''))
  WHERE coalesce(metadata->>'location', metadata->>'mapsAddress', '') <> '';

-- 4. Create operational_records table
CREATE TABLE IF NOT EXISTS public.operational_records (
  row_key text primary key,
  tenant_id text not null,
  entity_type text not null,
  entity_id text not null,
  user_id integer,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

CREATE INDEX IF NOT EXISTS operational_records_tenant_type_idx ON public.operational_records (tenant_id, entity_type);
CREATE INDEX IF NOT EXISTS operational_records_entity_idx ON public.operational_records (entity_type, entity_id);

ALTER TABLE public.operational_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow app anon operational reads" ON public.operational_records FOR SELECT USING (true);
CREATE POLICY "Allow app anon operational writes" ON public.operational_records FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow app anon operational updates" ON public.operational_records FOR UPDATE USING (true) WITH CHECK (true);

-- 4. Create ecosystem core tables
CREATE TABLE IF NOT EXISTS public.tenants (
  id text primary key,
  name text not null,
  status text not null default 'active',
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Also fix leads table - id should be uuid with default
ALTER TABLE public.leads ALTER COLUMN id SET DEFAULT gen_random_uuid();

CREATE TABLE IF NOT EXISTS public.user_profiles (
  id integer primary key,
  tenant_id text not null,
  email text not null unique,
  name text not null,
  role text not null,
  tags text[] not null default '{}',
  status text not null default 'active',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

CREATE TABLE IF NOT EXISTS public.role_permissions (
  role text not null,
  module text not null,
  can_access boolean not null default false,
  policy jsonb not null default '{}'::jsonb,
  primary key (role, module)
);

CREATE TABLE IF NOT EXISTS public.meetings (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null,
  client_id text,
  lead_id text,
  project_id text,
  owner_user_id integer,
  title text not null,
  status text not null default 'scheduled',
  meeting_at timestamptz,
  recording_urls text[] not null default '{}',
  transcript text,
  summary text,
  decisions jsonb not null default '[]'::jsonb,
  requirements jsonb not null default '[]'::jsonb,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

CREATE TABLE IF NOT EXISTS public.approval_requests (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null,
  entity_type text not null,
  entity_id text not null,
  requested_by integer,
  approver_user_id integer,
  approver_role text,
  status text not null default 'pending',
  decision_notes text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  decided_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.learning_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null,
  user_id integer,
  client_id text,
  lead_id text,
  project_id text,
  source text not null,
  event_type text not null,
  title text not null,
  content text,
  signal_strength integer not null default 1,
  tags text[] not null default '{}',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

CREATE TABLE IF NOT EXISTS public.workflow_runs (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null,
  project_id text,
  task_id text,
  requested_by integer,
  agent text not null,
  mode text not null default 'manual',
  status text not null default 'pending',
  input_context jsonb not null default '{}'::jsonb,
  output_artifacts jsonb not null default '{}'::jsonb,
  approval_status text not null default 'pending',
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS user_profiles_tenant_idx ON public.user_profiles (tenant_id);
CREATE INDEX IF NOT EXISTS meetings_tenant_status_idx ON public.meetings (tenant_id, status);
CREATE INDEX IF NOT EXISTS approvals_tenant_entity_idx ON public.approval_requests (tenant_id, entity_type, entity_id);
CREATE INDEX IF NOT EXISTS learning_events_tenant_project_idx ON public.learning_events (tenant_id, project_id);
CREATE INDEX IF NOT EXISTS workflow_runs_tenant_status_idx ON public.workflow_runs (tenant_id, status);

-- RLS for all tables
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_runs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Allow app anon tenant reads" ON public.tenants FOR SELECT USING (true);
CREATE POLICY "Allow app anon tenant writes" ON public.tenants FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow app anon tenant updates" ON public.tenants FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Allow app anon profile reads" ON public.user_profiles FOR SELECT USING (true);
CREATE POLICY "Allow app anon profile writes" ON public.user_profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow app anon profile updates" ON public.user_profiles FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Allow app anon permission reads" ON public.role_permissions FOR SELECT USING (true);
CREATE POLICY "Allow app anon permission writes" ON public.role_permissions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow app anon permission updates" ON public.role_permissions FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Allow app anon meeting reads" ON public.meetings FOR SELECT USING (true);
CREATE POLICY "Allow app anon meeting writes" ON public.meetings FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow app anon meeting updates" ON public.meetings FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Allow app anon approval reads" ON public.approval_requests FOR SELECT USING (true);
CREATE POLICY "Allow app anon approval writes" ON public.approval_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow app anon approval updates" ON public.approval_requests FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Allow app anon learning reads" ON public.learning_events FOR SELECT USING (true);
CREATE POLICY "Allow app anon learning writes" ON public.learning_events FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow app anon learning updates" ON public.learning_events FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Allow app anon workflow reads" ON public.workflow_runs FOR SELECT USING (true);
CREATE POLICY "Allow app anon workflow writes" ON public.workflow_runs FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow app anon workflow updates" ON public.workflow_runs FOR UPDATE USING (true) WITH CHECK (true);

-- 5. Seed data
INSERT INTO public.tenants (id, name, status)
VALUES ('tenant-a', 'Kentauros Principal', 'active'), ('tenant-b', 'Kentauros Operacao B', 'active')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.role_permissions (role, module, can_access) VALUES
  ('admin', 'dashboard', true), ('admin', 'leads', true), ('admin', 'discovery', true), ('admin', 'proposals', true), ('admin', 'projects', true), ('admin', 'kanban', true), ('admin', 'backlog', true), ('admin', 'ux', true), ('admin', 'prototypes', true), ('admin', 'dev', true), ('admin', 'opencode', true), ('admin', 'qa', true), ('admin', 'deploy', true), ('admin', 'support', true), ('admin', 'clients', true), ('admin', 'users', true), ('admin', 'automations', true), ('admin', 'settings', true), ('admin', 'productivity', true), ('admin', 'logs', true), ('admin', 'audit', true),
  ('comercial', 'dashboard', true), ('comercial', 'leads', true), ('comercial', 'proposals', true), ('comercial', 'clients', true), ('comercial', 'settings', false),
  ('prevendas', 'dashboard', true), ('prevendas', 'leads', true), ('prevendas', 'proposals', true), ('prevendas', 'clients', true),
  ('dev', 'dashboard', true), ('dev', 'projects', true), ('dev', 'kanban', true), ('dev', 'backlog', true), ('dev', 'ux', true), ('dev', 'prototypes', true), ('dev', 'dev', true), ('dev', 'opencode', true), ('dev', 'qa', true), ('dev', 'deploy', true),
  ('ux', 'dashboard', true), ('ux', 'projects', true), ('ux', 'ux', true), ('ux', 'prototypes', true),
  ('qa', 'dashboard', true), ('qa', 'projects', true), ('qa', 'qa', true), ('qa', 'opencode', true),
  ('devops', 'dashboard', true), ('devops', 'projects', true), ('devops', 'deploy', true), ('devops', 'automations', true),
  ('suporte', 'dashboard', true), ('suporte', 'support', true), ('suporte', 'clients', true),
  ('cliente', 'dashboard', true), ('cliente', 'projects', true), ('cliente', 'support', true)
ON CONFLICT (role, module) DO UPDATE SET can_access = excluded.can_access;

INSERT INTO public.user_profiles (id, tenant_id, email, name, role, tags, status, metadata)
VALUES
  (1, 'tenant-a', 'admin@kentauros.com', 'Admin Master', 'admin', array['ADMIN','DEV','QA','UX'], 'active', '{"department":"TI","avatar":"AM"}'::jsonb),
  (13, 'tenant-a', 'admin@kentauros.consulting', 'Admin Kentauros', 'admin', array['ADMIN','DEV','QA','UX','DEVOPS'], 'active', '{"department":"Administração","avatar":"AK"}'::jsonb),
  (14, 'tenant-a', 'operacional@kentauros.consulting', 'Admin Operacional', 'admin', array['ADMIN','COMERCIAL','DEV','QA','UX'], 'active', '{"department":"Operações","avatar":"AO"}'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  tenant_id = excluded.tenant_id,
  email = excluded.email,
  name = excluded.name,
  role = excluded.role,
  tags = excluded.tags,
  status = excluded.status,
  metadata = excluded.metadata,
  updated_at = now();

-- 6. Create captured_leads_registry table
CREATE TABLE IF NOT EXISTS captured_leads_registry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_identity TEXT NOT NULL,
    normalized_domain TEXT,
    normalized_email TEXT,
    normalized_phone TEXT,
    normalized_name TEXT,
    lead_id TEXT,
    company_name TEXT,
    website TEXT,
    email TEXT,
    phone TEXT,
    whatsapp TEXT,
    location TEXT,
    niche TEXT,
    score INTEGER,
    source TEXT,
    snippet TEXT,
    capture_metric TEXT DEFAULT 'website_reformulation',
    captured_by_user_id TEXT,
    captured_by_user_name TEXT,
    tenant_id TEXT,
    status TEXT DEFAULT 'saved_for_future_contact',
    future_contact_status TEXT DEFAULT 'saved',
    first_captured_at TIMESTAMPTZ DEFAULT NOW(),
    last_captured_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}',
    CONSTRAINT unique_lead_identity UNIQUE (lead_identity)
);

CREATE INDEX IF NOT EXISTS idx_registry_normalized_domain ON captured_leads_registry(normalized_domain) WHERE normalized_domain IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_registry_normalized_email ON captured_leads_registry(normalized_email) WHERE normalized_email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_registry_normalized_phone ON captured_leads_registry(normalized_phone) WHERE normalized_phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_registry_status ON captured_leads_registry(status);
CREATE INDEX IF NOT EXISTS idx_registry_tenant ON captured_leads_registry(tenant_id) WHERE tenant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_registry_user ON captured_leads_registry(captured_by_user_id) WHERE captured_by_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_registry_captured_at ON captured_leads_registry(first_captured_at DESC);

ALTER TABLE captured_leads_registry ENABLE ROW LEVEL SECURITY;

-- Simplified policies for captured_leads_registry
CREATE POLICY "Allow anon reads captured_leads" ON captured_leads_registry FOR SELECT USING (true);
CREATE POLICY "Allow anon insert captured_leads" ON captured_leads_registry FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon update captured_leads" ON captured_leads_registry FOR UPDATE USING (true) WITH CHECK (true);

COMMENT ON TABLE captured_leads_registry IS 'Registry of all captured leads to prevent duplicates across users and capture sessions';
