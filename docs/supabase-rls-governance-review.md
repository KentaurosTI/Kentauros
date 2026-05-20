# Revisao CEO Supabase RLS e Permissoes

Data: 2026-05-19

## Veredicto

BLOQUEADO para escala multiusuario ate a revisao de RLS e migrations de producao.

## Escopo analisado

- `supabase/migrations/CONSOLIDATED_MIGRATION.sql`
- Tabelas criticas: `leads`, `lead_contacts`, `approval_requests`, `learning_events`, `workflow_runs`, `operational_records`
- Tabelas de suporte detectadas: `tenants`, `user_profiles`, `role_permissions`, `meetings`, `captured_leads_registry`

## Achados

1. Migration destrutiva
   - Evidencia: `DROP TABLE IF EXISTS ... CASCADE`
   - Risco: perda de dados se executada fora de ambiente controlado
   - Mitigacao: separar bootstrap local de migrations de producao e exigir backup/rollback

2. Politicas anonimas amplas
   - Evidencia: politicas com `USING (true)` ou `WITH CHECK (true)`
   - Tabelas afetadas: `leads`, `lead_contacts`, `approval_requests`, `learning_events`, `workflow_runs`, `operational_records`, `tenants`, `user_profiles`, `role_permissions`, `meetings`, `captured_leads_registry`
   - Mitigacao: trocar por politicas tenant-aware/auth-aware e restringir escrita sensivel a funcoes server-side

3. Indices para RLS incompletos
   - Evidencia: `lead_contacts`, `tenants` e `role_permissions` nao possuem indice com `tenant_id`
   - Mitigacao: indexar colunas usadas nas politicas RLS, especialmente `tenant_id`, `user_id` e chaves de relacionamento

## Regras aprovadas

- API key e CORS continuam como baseline, nao substituem RLS.
- Politicas anonimas amplas nao devem ser usadas em producao multiusuario.
- Funcoes server-side podem usar service role, mas o cliente nao deve depender de permissao anonima ampla.
- Colunas usadas em politicas RLS devem ter indices, conforme recomendacao Supabase/Postgres.

## Proxima acao recomendada

Criar migration segura de producao substituindo `USING (true)`/`WITH CHECK (true)` por politicas por tenant/usuario, com rollback documentado e indices antes de liberar escala multiusuario.
