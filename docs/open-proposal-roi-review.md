# Revisao de propostas abertas com reforco de ROI

## Objetivo

Transformar propostas abertas em rotina executiva de conversao, reforcando valor, ROI, proxima acao e prazo de decisao antes que oportunidades esfriem.

## Criterios de proposta em risco

Uma proposta aberta entra na revisao quando possui status `draft`, `sent`, `pending` ou `pending_approval` e falta pelo menos um destes campos:

- `nextAction`: proxima acao objetiva.
- ROI explicito: `roi`, `expectedRoi`, `roiNarrative`, `valueNarrative` ou metadados equivalentes.
- Prazo de decisao: `validUntil`, `decisionDueAt`, `deadline` ou `dueDate`.

## Saida operacional

`createOpenProposalRoiReview` retorna:

- propostas abertas em risco;
- campos ausentes por proposta;
- follow-up consultivo com valor esperado, responsavel e mensagem de reforco de ROI;
- taxa proposta para cliente;
- evento de aprendizado `open_proposal_roi_review_applied`.

## Aprendizado MasterMind

Toda revisao semanal deve registrar quantas propostas abertas faltam ROI, proxima acao ou prazo, e acompanhar a taxa de conversao de proposta para cliente.
