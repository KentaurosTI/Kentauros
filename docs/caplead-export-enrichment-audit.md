# Auditoria de exportacao e enriquecimento CapLead por lote

## Objetivo

Medir cada lote exportado/importado do CapLead antes de gerar novas acoes comerciais na Kentauros. A auditoria usa o contrato de qualidade aprovado pelo MasterMind para decidir se o lote pode seguir ou se precisa de enriquecimento.

## Metricas do lote

- Taxa de contato valido: percentual de leads com e-mail, telefone ou WhatsApp.
- Completude de site: percentual de leads com site/URL normalizado.
- Taxa de duplicidade: duplicados do lote sobre total avaliado.
- Score medio: media do `dataQualityScore`/`score` do lote.

## Contrato aprovado

- Score minimo medio esperado: 70.
- Taxa minima de contato valido: 80%.
- Taxa minima de site completo: 70%.
- Taxa maxima de duplicidade: 5%.
- Qualquer envio externo continua exigindo aprovacao humana.

## Decisao operacional

Quando qualquer metrica ficar abaixo do contrato, o resumo recebe `exportAudit.enrichmentRequired = true` e a recomendacao `enrich_batch_before_commercial_actions`.

Quando o lote cumprir o contrato, a recomendacao passa a ser `batch_ready_for_commercial_actions`.

## Aprendizado MasterMind

A funcao `buildCapLeadExportAuditLearning` gera evento `caplead_export_batch_audited` com as causas da queda de qualidade para alimentar novas sugestoes do CEO.
