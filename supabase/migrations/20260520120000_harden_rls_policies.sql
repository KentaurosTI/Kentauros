-- Kentauros Supabase RLS hardening plan
-- Requires authenticated Supabase sessions with tenant_id and user_id in JWT app_metadata or user_metadata.
-- Serverless imports must use SUPABASE_SERVICE_ROLE_KEY after this migration.

create or replace function public.current_app_tenant_id()
returns text
language sql
stable
as $$
  select nullif(coalesce(
    auth.jwt() -> 'app_metadata' ->> 'tenant_id',
    auth.jwt() -> 'user_metadata' ->> 'tenant_id'
  ), '')
$$;

create or replace function public.current_app_user_id()
returns integer
language sql
stable
as $$
  select nullif(coalesce(
    auth.jwt() -> 'app_metadata' ->> 'user_id',
    auth.jwt() -> 'user_metadata' ->> 'user_id'
  ), '')::integer
$$;

create or replace function public.current_app_role()
returns text
language sql
stable
as $$
  select nullif(coalesce(
    auth.jwt() -> 'app_metadata' ->> 'role',
    auth.jwt() -> 'user_metadata' ->> 'role'
  ), '')
$$;

create or replace function public.is_app_admin()
returns boolean
language sql
stable
as $$
  select public.current_app_role() in ('admin', 'super_admin')
$$;

create index if not exists lead_contacts_lead_tenant_lookup_idx
  on public.leads (id, tenant_id, user_id);

create index if not exists captured_leads_registry_tenant_user_idx
  on public.captured_leads_registry (tenant_id, captured_by_user_id)
  where tenant_id is not null;

drop policy if exists "Allow app anon lead reads" on public.leads;
drop policy if exists "Allow app anon lead writes" on public.leads;
drop policy if exists "Allow app anon lead updates" on public.leads;

create policy "Tenant lead reads" on public.leads
  for select to authenticated
  using (tenant_id = public.current_app_tenant_id() and (public.is_app_admin() or user_id = public.current_app_user_id()));
create policy "Tenant lead writes" on public.leads
  for insert to authenticated
  with check (tenant_id = public.current_app_tenant_id() and (public.is_app_admin() or user_id = public.current_app_user_id()));
create policy "Tenant lead updates" on public.leads
  for update to authenticated
  using (tenant_id = public.current_app_tenant_id() and (public.is_app_admin() or user_id = public.current_app_user_id()))
  with check (tenant_id = public.current_app_tenant_id() and (public.is_app_admin() or user_id = public.current_app_user_id()));

drop policy if exists "Allow app anon lead contact reads" on public.lead_contacts;
drop policy if exists "Allow app anon lead contact writes" on public.lead_contacts;
drop policy if exists "Allow app anon lead contact deletes" on public.lead_contacts;

create policy "Tenant lead contact reads" on public.lead_contacts
  for select to authenticated
  using (exists (
    select 1 from public.leads
    where leads.id = lead_contacts.lead_id
      and leads.tenant_id = public.current_app_tenant_id()
      and (public.is_app_admin() or leads.user_id = public.current_app_user_id())
  ));
create policy "Tenant lead contact writes" on public.lead_contacts
  for insert to authenticated
  with check (exists (
    select 1 from public.leads
    where leads.id = lead_contacts.lead_id
      and leads.tenant_id = public.current_app_tenant_id()
      and (public.is_app_admin() or leads.user_id = public.current_app_user_id())
  ));
create policy "Tenant lead contact deletes" on public.lead_contacts
  for delete to authenticated
  using (exists (
    select 1 from public.leads
    where leads.id = lead_contacts.lead_id
      and leads.tenant_id = public.current_app_tenant_id()
      and (public.is_app_admin() or leads.user_id = public.current_app_user_id())
  ));

drop policy if exists "Allow app anon operational reads" on public.operational_records;
drop policy if exists "Allow app anon operational writes" on public.operational_records;
drop policy if exists "Allow app anon operational updates" on public.operational_records;

create policy "Tenant operational reads" on public.operational_records
  for select to authenticated
  using (tenant_id = public.current_app_tenant_id());
create policy "Tenant operational writes" on public.operational_records
  for insert to authenticated
  with check (tenant_id = public.current_app_tenant_id());
create policy "Tenant operational updates" on public.operational_records
  for update to authenticated
  using (tenant_id = public.current_app_tenant_id())
  with check (tenant_id = public.current_app_tenant_id());

drop policy if exists "Allow app anon tenant reads" on public.tenants;
drop policy if exists "Allow app anon tenant writes" on public.tenants;
drop policy if exists "Allow app anon tenant updates" on public.tenants;
create policy "Tenant self reads" on public.tenants for select to authenticated using (id = public.current_app_tenant_id() or public.is_app_admin());
create policy "Admin tenant writes" on public.tenants for insert to authenticated with check (public.is_app_admin());
create policy "Admin tenant updates" on public.tenants for update to authenticated using (public.is_app_admin()) with check (public.is_app_admin());

drop policy if exists "Allow app anon profile reads" on public.user_profiles;
drop policy if exists "Allow app anon profile writes" on public.user_profiles;
drop policy if exists "Allow app anon profile updates" on public.user_profiles;
create policy "Tenant profile reads" on public.user_profiles for select to authenticated using (tenant_id = public.current_app_tenant_id() and (public.is_app_admin() or id = public.current_app_user_id()));
create policy "Admin profile writes" on public.user_profiles for insert to authenticated with check (tenant_id = public.current_app_tenant_id() and public.is_app_admin());
create policy "Admin profile updates" on public.user_profiles for update to authenticated using (tenant_id = public.current_app_tenant_id() and public.is_app_admin()) with check (tenant_id = public.current_app_tenant_id() and public.is_app_admin());

drop policy if exists "Allow app anon permission reads" on public.role_permissions;
drop policy if exists "Allow app anon permission writes" on public.role_permissions;
drop policy if exists "Allow app anon permission updates" on public.role_permissions;
create policy "Authenticated permission reads" on public.role_permissions for select to authenticated using (true);
create policy "Admin permission writes" on public.role_permissions for insert to authenticated with check (public.is_app_admin());
create policy "Admin permission updates" on public.role_permissions for update to authenticated using (public.is_app_admin()) with check (public.is_app_admin());

drop policy if exists "Allow app anon meeting reads" on public.meetings;
drop policy if exists "Allow app anon meeting writes" on public.meetings;
drop policy if exists "Allow app anon meeting updates" on public.meetings;
create policy "Tenant meeting reads" on public.meetings for select to authenticated using (tenant_id = public.current_app_tenant_id());
create policy "Tenant meeting writes" on public.meetings for insert to authenticated with check (tenant_id = public.current_app_tenant_id());
create policy "Tenant meeting updates" on public.meetings for update to authenticated using (tenant_id = public.current_app_tenant_id()) with check (tenant_id = public.current_app_tenant_id());

drop policy if exists "Allow app anon approval reads" on public.approval_requests;
drop policy if exists "Allow app anon approval writes" on public.approval_requests;
drop policy if exists "Allow app anon approval updates" on public.approval_requests;
create policy "Tenant approval reads" on public.approval_requests for select to authenticated using (tenant_id = public.current_app_tenant_id());
create policy "Tenant approval writes" on public.approval_requests for insert to authenticated with check (tenant_id = public.current_app_tenant_id());
create policy "Tenant approval updates" on public.approval_requests for update to authenticated using (tenant_id = public.current_app_tenant_id()) with check (tenant_id = public.current_app_tenant_id());

drop policy if exists "Allow app anon learning reads" on public.learning_events;
drop policy if exists "Allow app anon learning writes" on public.learning_events;
drop policy if exists "Allow app anon learning updates" on public.learning_events;
create policy "Tenant learning reads" on public.learning_events for select to authenticated using (tenant_id = public.current_app_tenant_id());
create policy "Tenant learning writes" on public.learning_events for insert to authenticated with check (tenant_id = public.current_app_tenant_id());
create policy "Tenant learning updates" on public.learning_events for update to authenticated using (tenant_id = public.current_app_tenant_id()) with check (tenant_id = public.current_app_tenant_id());

drop policy if exists "Allow app anon workflow reads" on public.workflow_runs;
drop policy if exists "Allow app anon workflow writes" on public.workflow_runs;
drop policy if exists "Allow app anon workflow updates" on public.workflow_runs;
create policy "Tenant workflow reads" on public.workflow_runs for select to authenticated using (tenant_id = public.current_app_tenant_id());
create policy "Tenant workflow writes" on public.workflow_runs for insert to authenticated with check (tenant_id = public.current_app_tenant_id());
create policy "Tenant workflow updates" on public.workflow_runs for update to authenticated using (tenant_id = public.current_app_tenant_id()) with check (tenant_id = public.current_app_tenant_id());

drop policy if exists "Users see own captured leads" on public.captured_leads_registry;
drop policy if exists "Users insert own captured leads" on public.captured_leads_registry;
drop policy if exists "Users update own captured leads" on public.captured_leads_registry;
drop policy if exists "Allow anon reads captured_leads" on public.captured_leads_registry;
drop policy if exists "Allow anon insert captured_leads" on public.captured_leads_registry;
drop policy if exists "Allow anon update captured_leads" on public.captured_leads_registry;

create policy "Tenant captured lead reads" on public.captured_leads_registry
  for select to authenticated
  using (tenant_id = public.current_app_tenant_id() and (public.is_app_admin() or captured_by_user_id = public.current_app_user_id()::text));
create policy "Tenant captured lead writes" on public.captured_leads_registry
  for insert to authenticated
  with check (tenant_id = public.current_app_tenant_id() and (public.is_app_admin() or captured_by_user_id = public.current_app_user_id()::text or captured_by_user_id is null));
create policy "Tenant captured lead updates" on public.captured_leads_registry
  for update to authenticated
  using (tenant_id = public.current_app_tenant_id() and (public.is_app_admin() or captured_by_user_id = public.current_app_user_id()::text))
  with check (tenant_id = public.current_app_tenant_id() and (public.is_app_admin() or captured_by_user_id = public.current_app_user_id()::text));
