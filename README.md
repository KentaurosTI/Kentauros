# Kentauros

Sistema operacional de consultoria e gestao da Kentauros.

## Visao Geral
Kentauros centraliza pipeline comercial, leads, clientes, projetos, discovery, propostas, backlog, desenvolvimento, QA, deploy, suporte, analytics, logs, automacoes e agentes operacionais.

O projeto conecta a captacao do CapLead ao fluxo comercial da Kentauros por meio do endpoint `/api/leads/import`, com normalizacao, validacao, deduplicacao, scoring de qualidade e governanca para automacoes externas.

## Objetivo Estrategico
- Reduzir retrabalho entre prospeccao, discovery, proposta e entrega.
- Aumentar conversao comercial com dados melhores de leads.
- Criar memoria operacional para decisoes, riscos, aprovacoes e aprendizados.
- Apoiar agents de IA com contexto rastreavel.
- Transformar operacao recorrente em ativos reutilizaveis para SaaS, consultoria e automacao.

## Stack Principal
- Frontend: React, Vite, React Router, Recharts, lucide-react.
- Backend/API: Express e Vercel Serverless Functions.
- Dados: Supabase/PostgreSQL.
- Automacao: Puppeteer, Nodemailer e servicos internos.
- IA/Agents: OpenCode, prompts operacionais e Mastermind CEO.

## Estrutura
- `src/pages/`: telas operacionais como Dashboard, CEO, Leads, Clients, Discovery, Projects, Proposals, Prototypes, QA, Deploy, Support e Analytics.
- `src/components/`: componentes de UI, layout, leads, CEO e operacao.
- `src/services/`: regras de negocio, automacoes, workflow, melhoria continua, politicas de acesso e integracoes.
- `src/context/`: estado global, auditoria, logs, metricas e i18n.
- `api/leads/import.ts`: importacao CapLead -> Kentauros.
- `supabase/migrations/`: schema operacional e politicas de banco.
- `docs/`: playbooks, auditorias, contratos de qualidade e evidencias operacionais.

## Fluxo CapLead -> Kentauros
O endpoint `/api/leads/import` recebe lotes de leads do CapLead e aplica:
- validacao de empresa e website;
- rejeicao de leads de teste;
- normalizacao de email, telefone, website, valor estimado e metadados comerciais;
- score de qualidade do lead;
- deduplicacao por dominio, email, telefone, empresa ou chave CapLead;
- auditoria de lote;
- resumo executivo de qualidade;
- bloqueio de automacao externa sem aprovacao humana.

## Seguranca do Endpoint de Importacao
Em producao, a importacao exige `CAPLEAD_IMPORT_API_KEY`.

Configuracoes relevantes:
- `CAPLEAD_IMPORT_API_KEY`: chave obrigatoria para producao.
- `CAPLEAD_IMPORT_ALLOWED_ORIGINS`: lista de origens permitidas para CORS em producao.
- `CAPLEAD_IMPORT_TENANT_ID`: tenant padrao de importacao.
- `CAPLEAD_IMPORT_USER_ID`: usuario padrao associado a importacao.

Em desenvolvimento, o endpoint permite operacao local sem chave para facilitar testes.

## Comandos
```bash
npm run dev
npm run build
npm run lint
node --test api/leads/import.test.js
```

## Governanca
Antes de promover para producao:
- revisar RLS e politicas anonimas no Supabase;
- separar migrations destrutivas de ambientes produtivos;
- configurar API key e origens CORS permitidas;
- rodar testes do endpoint CapLead;
- rodar build e lint;
- registrar decisoes, riscos e aprendizados no Mastermind CEO.

## Relacao com o Mastermind CEO
Este projeto deve permanecer sincronizado com a base Obsidian:
- `Kentaruso_CEO_Knowledge_Base/02_Projetos/Kentauros.md`
- `Riscos_e_Governanca.md`
- `Backlog_de_Melhorias.md`
- `Base_de_Aprendizados.md`
- `Mapa_de_Tecnologias.md`

## Status
MVP avancado em melhoria continua.
