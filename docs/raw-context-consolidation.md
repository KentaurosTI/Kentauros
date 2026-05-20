# Consolidacao de evidencias brutas do MasterMind

## Objetivo

Reduzir custo, repeticao e ruido na tela CEO consolidando apenas evidencias brutas que mudam decisao, KPI, risco ou padrao.

## Regra operacional

1. Usar memoria ativa e hubs como entrada primaria.
2. Revisar notas brutas, reunioes e ApprovalRequests soltos como evidencia de suporte.
3. Consolidar em hub somente quando houver impacto em decisao, KPI, risco, padrao, governanca, seguranca, conversao, lucro ou retencao.
4. Manter evidencia sem impacto executivo fora das sugestoes primarias.
5. Bloquear automacao externa ate existir ApprovalRequest com criterio de encerramento.

## Implementacao

- `buildEconomicMastermindContext` separa memoria ativa, hubs, suporte e evidencia bruta.
- `createRawEvidenceConsolidationHub` cria um hub executivo com apenas os sinais que alteram decisao.
- A sugestao `ceo_mastermind_raw_context_consolidation_alert` fica marcada como aplicada para nao voltar como pendencia.

## Resultado esperado

A tela CEO deve sugerir proximas melhorias a partir de conhecimento consolidado, nao de notas repetidas ou aprovacoes soltas.

#kentauros #ceo #mastermind #governanca #workflow #melhoria-continua
