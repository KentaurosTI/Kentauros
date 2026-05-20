# Revisao RLS e Migracoes Kentauros

## Objetivo
Reduzir risco de exposicao ou perda de dados antes de novas evolucoes sensiveis do fluxo CapLead -> Kentauros.

## Checklist obrigatorio
- Nenhuma migration de producao deve executar `DROP TABLE` sem plano de rollback e backup.
- Tabelas `leads`, `lead_contacts`, `operational_records` e `learning_events` devem ter RLS habilitada.
- Usuarios anonimos nao devem ter politicas amplas de escrita.
- Importacoes server-side devem usar service role apenas em serverless functions.
- `CAPLEAD_IMPORT_API_KEY` deve existir em producao.
- `CAPLEAD_IMPORT_ALLOWED_ORIGINS` deve restringir as origens autorizadas.
- Testes de importacao devem rodar antes de deploy.

## Evidencia tecnica desta rodada
- API `/api/leads/import` passou a bloquear producao sem chave.
- CORS da importacao passou a usar origem configurada.
- `/api/health` reporta variaveis ausentes.

## Proxima revisao recomendada
Auditar as migrations Supabase e aplicar politicas por tenant antes de liberar novos fluxos multiusuario sensiveis.
