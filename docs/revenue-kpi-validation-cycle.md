# Validacao de KPIs de receita, retencao e upsell

## Objetivo

Medir baseline, responsavel, prazo e resultado real antes de liberar automacoes de marketing, onboarding, upsell ou contrato via IA.

## Regra de decisao

Automacao comercial so pode virar ApprovalRequest quando o KPI possuir:

1. Baseline.
2. Dono.
3. Prazo de revisao.
4. Resultado semanal.
5. Criterio de encerramento.

## Gate

Status: BLOQUEADO_PARA_KPIS_SEM_BASELINE_DONO_PRAZO_OU_CRITERIO

## Priorizacao

O CEO deve priorizar o KPI com maior impacto combinado em lucro, retencao e conversao. KPIs sem baseline ou criterio permanecem bloqueados e nao podem gerar automacao externa.

## Implementacao

- `createRevenueRetentionKpiValidation` valida KPIs de receita, visibilidade, upsell, retencao e onboarding.
- `ceo_mastermind_revenue_kpi_validation_cycle` foi marcado como aplicado para nao reaparecer como sugestao pendente.
- Automacoes aprovaveis saem com dono, metrica, baseline, resultado semanal, delta e criterio de encerramento.

#kentauros #ceo #comercial #kpi #lucro #retencao #conversao #governanca
