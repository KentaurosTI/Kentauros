# Matriz de reutilizacao de IA entre projetos Kentauros

## Objetivo
Registrar as capacidades de IA ja usadas pela Kentauros antes de criar novos agents ou automacoes. A regra CEO e simples: se uma capacidade puder virar padrao reutilizavel, ela deve nascer como checklist, template, service, playbook ou matriz antes de virar uma automacao especifica.

## Analise de impacto
| Dimensao | Impacto |
| --- | --- |
| Tecnico | Reduz duplicacao de prompts, providers, integracoes e agentes entre projetos. |
| Operacional | Cria um gate antes de automacoes sensiveis e melhora rastreabilidade das decisoes. |
| Conversao | Reaproveita IA em enriquecimento de leads, follow-up e personalizacao comercial. |
| Lucro | Diminui custo marginal de novas entregas e transforma IA em ativo reutilizavel. |
| Retencao | Aumenta consistencia de atendimento, onboarding e melhoria continua dos clientes. |

## Capacidades por projeto
| Projeto | Tecnologias de IA/automacao | Capacidades | Automacoes especificas |
| --- | --- | --- | --- |
| ArteNewEra | Gemini, Groq, Next.js | Geracao criativa, layout com IA, comunicacao automatizada | Esteira criativa |
| CapLead | Gemini, Playwright, Puppeteer | Enriquecimento de lead, layout com IA, exportacao por lote | Captura local, exportacao enriquecida |
| AutoSocial | OpenAI, Anthropic, BullMQ | Geracao de conteudo, agendamento social, fila de automacao | Publicacao social |
| Kentauros | OpenCode, Google Places, Supabase | Orquestracao de agents, importacao de leads, follow-up aprovado | Sugestoes CEO, follow-up aprovado |
| SuperSaas | OpenCode, IA, React | Orquestracao de agents, workflow SaaS, backlog agentico | Kanban agentico |

## Padroes reutilizaveis
- Layout com IA: aparece em ArteNewEra e CapLead; deve virar checklist/template antes de novas telas ou agents visuais.
- Conteudo e design: conecta ArteNewEra, AutoSocial e CapLead; deve virar biblioteca de prompts e criterios de QA.
- Inteligencia de leads: conecta CapLead e Kentauros; deve virar contrato de dados, score e criterio de exportacao.
- Workflow agentico: conecta Kentauros, EscritorioVirtual e SuperSaas; deve seguir ApprovalRequest, logs e criterio de encerramento.
- Comunicacao automatizada: conecta ArteNewEra, AutoSocial e Kentauros; deve medir resposta, conversao e risco operacional antes de escala.

## Automacoes especificas
- CapLead pode manter captura local e exportacao enriquecida, mas novos envios externos exigem ApprovalRequest.
- AutoSocial pode manter publicacao social, mas cada canal precisa de logs, rate limit e criterio de sucesso.
- Kentauros pode operar sugestoes CEO, mas deve bloquear execucao sensivel sem aprovacao humana valida.
- SuperSaas deve validar stack real e governanca agentica antes de criar novos workers.

## Gate para novos agents
Status: BLOQUEADO_ATE_MATRIZ_REUTILIZACAO_APROVADA

Antes de criar novo agent ou automacao:
1. Verificar se a capacidade ja existe em outro projeto.
2. Validar se pode virar padrao reutilizavel.
3. Registrar problema, evidencia, beneficio e criterio de conclusao.
4. Criar ApprovalRequest quando houver execucao externa, dado sensivel ou impacto operacional.
5. Atualizar o MasterMind apos validacao.

## Proxima sugestao esperada
Depois desta matriz, a proxima sugestao nao deve repetir "mapear reutilizacao". O CEO deve sugerir validar impacto da matriz com KPI de tempo economizado, projetos reaproveitando o padrao, reducao de retrabalho e impacto em conversao.

#kentauros #ceo #ia #agent #workflow #governanca #melhoria-continua
