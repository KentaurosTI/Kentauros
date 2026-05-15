create table if not exists public.lead_contacts (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  contact_type text not null check (contact_type in ('email', 'phone', 'whatsapp')),
  contact_value text not null,
  created_at timestamptz not null default now(),
  constraint lead_contacts_unique_value unique (lead_id, contact_type, contact_value)
);

create index if not exists lead_contacts_lead_id_idx on public.lead_contacts (lead_id);
create index if not exists lead_contacts_type_value_idx on public.lead_contacts (contact_type, contact_value);

alter table public.lead_contacts enable row level security;

create policy "Allow app anon lead contact reads"
  on public.lead_contacts
  for select
  using (true);

create policy "Allow app anon lead contact writes"
  on public.lead_contacts
  for insert
  with check (true);

create policy "Allow app anon lead contact deletes"
  on public.lead_contacts
  for delete
  using (true);

create unique index if not exists leads_unique_capture_website_per_tenant
  on public.leads (tenant_id, (metadata->>'website'))
  where metadata ? 'website'
    and coalesce(metadata->>'website', '') <> '';

create unique index if not exists leads_unique_company_location_per_tenant
  on public.leads (tenant_id, lower(company), coalesce(metadata->>'location', metadata->>'mapsAddress', ''))
  where coalesce(metadata->>'location', metadata->>'mapsAddress', '') <> '';
