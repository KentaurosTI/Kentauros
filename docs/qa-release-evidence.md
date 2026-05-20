# Evidencia de Release Kentauros

## Fluxo coberto
- Login e permissoes por perfil.
- Importacao CapLead com API key em producao.
- Exclusao de leads preservada contra refresh remoto.
- Lead -> Discovery com contexto comercial.
- Discovery -> Proposta sem duplicidade.
- Proposta -> Projeto -> Backlog -> QA -> Deploy.
- Proposta aprovada -> Cliente com plano de retencao.
- Prototipo vinculado e persistido em camada operacional.
- Health check de integracoes.

## Comandos de validacao
```bash
node --test src/services/accessPolicy.test.js src/data/mock-users.test.js src/services/leadDeletionRegistry.test.js
node --test api/leads/import.test.js api/health.test.js src/services/commercialFlow.test.js
npm run lint
npm run build
```

## Criterio de promocao
O release so deve ser promovido quando os comandos acima passarem e a URL de producao responder com login, leads e discovery para o perfil Leadhunter.
