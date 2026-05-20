-- ROLLBACK PLAN: restore previous permissive development policies only if production is blocked.
-- Use after database backup and CEO approval.
-- 1. Drop policies created by 20260520120000_harden_rls_policies.sql.
-- 2. Recreate the former anon policies for local/dev only.
-- 3. Re-open MEL-0007 as #risco-ativo in MasterMind if rollback is used.

drop policy if exists "Tenant lead reads" on public.leads;
drop policy if exists "Tenant lead writes" on public.leads;
drop policy if exists "Tenant lead updates" on public.leads;

create policy "Allow app anon lead reads" on public.leads for select using (true);
create policy "Allow app anon lead writes" on public.leads for insert with check (true);
create policy "Allow app anon lead updates" on public.leads for update using (true) with check (true);

drop policy if exists "Tenant operational reads" on public.operational_records;
drop policy if exists "Tenant operational writes" on public.operational_records;
drop policy if exists "Tenant operational updates" on public.operational_records;

create policy "Allow app anon operational reads" on public.operational_records for select using (true);
create policy "Allow app anon operational writes" on public.operational_records for insert with check (true);
create policy "Allow app anon operational updates" on public.operational_records for update using (true) with check (true);
