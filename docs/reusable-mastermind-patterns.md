# Padroes Reutilizaveis do MasterMind CEO

Data: 2026-05-20

## Objetivo

Transformar correcoes aplicadas pelo CEO em padroes reutilizaveis quando elas reduzirem retrabalho, risco ou custo em mais de um projeto da Kentauros.

## Analise de Impacto

| Dimensao | Impacto esperado |
| --- | --- |
| Tecnico | Reduz divergencia entre projetos ao transformar correcoes em checklist, template, matriz, migration ou playbook. |
| Operacional | Acelera execucao porque cada melhoria aplicada ganha criterio de reutilizacao. |
| Conversao | Permite reaplicar aprendizados comerciais em fluxos de lead, discovery, proposta e onboarding. |
| Lucro | Diminui retrabalho e custo de decisao repetida. |
| Retencao | Melhora consistencia de entrega e reduz falhas recorrentes percebidas pelo cliente. |

## Regra de Reutilizacao

Uma correcao aplicada deve virar padrao quando responder sim a pelo menos duas perguntas:

- Reduz retrabalho em mais de um projeto?
- Reduz risco operacional, comercial, tecnico ou de seguranca?
- Pode ser aplicada como checklist antes de deploy, release ou automacao?
- Ajuda a converter, reter ou aumentar margem?
- Cria criterio objetivo de conclusao para novas sugestoes do CEO?

## Tipos de Padrao

| Tipo | Quando usar | Exemplos conectados |
| --- | --- | --- |
| Checklist | Validacao recorrente antes de acao sensivel | Deploy seguro, release desktop, automacao externa |
| Template | Estrutura repetivel de documento ou tarefa | README real, registro de decisao, matriz comercial |
| Migration | Correcao tecnica reaplicavel com rollback | Supabase/RLS tenant-aware |
| Matriz | Classificacao por projeto, dono, risco ou ambiente | Segredos e variaveis por ambiente |
| Playbook | Processo operacional/comercial com responsavel e KPI | Recomendacoes comerciais do MasterMind |

## Padroes Reutilizaveis Atuais

### Padrao 1 - Recomendacao Comercial Aplicada Vira Auditoria de Impacto

Origem: [[MEL-0022 - Backlog comercial a partir das recomendacoes do MasterMind]] e [[MEL-0062 - Verificacao comercial pos-aplicacao do MasterMind]].

Projetos conectados:
- [[Kentauros]]
- [[CapLead]]

Aplicacao:
- Medir impacto real em leads, discovery, propostas, clientes, conversao, lucro e retencao.
- Separar recomendacao aplicada de lacuna ainda aberta.
- Abrir nova sugestao somente quando houver evidencia e criterio de conclusao.

Checklist:
- Qual recomendacao foi aplicada?
- Qual KPI mudou?
- Qual gargalo permanece?
- Existe responsavel?
- Existe prazo?
- Existe criterio de conclusao?

### Padrao 2 - Seguranca/Deploy Vira Matriz de Controle

Origem: [[MEL-0060 - Matriz de segredos e variaveis por ambiente]].

Projetos conectados:
- [[Kentauros]]
- [[CapLead]]
- [[AutoSocial]]
- [[ArteNewEra]]

Aplicacao:
- Mapear variaveis por projeto, ambiente, provedor, dono, rotacao e impacto de falha.
- Nao registrar valores reais.
- Bloquear deploy se houver segredo exposto, placeholder critico ou owner pendente.

### Padrao 3 - Risco Ativo Vira Quadro de Execucao CEO

Origem: [[MEL-0058 - Quadro de execucao CEO para riscos ativos]].

Projetos conectados:
- [[Kentauros]]
- [[CapLead]]
- [[SuperSaas]]
- [[EscritorioVirtual]]

Aplicacao:
- Converter risco em tarefa com area, responsavel, severidade, proxima acao e criterio de conclusao.
- Gerar ApprovalRequest antes de correcao automatizada ou acao externa.
- Mudar status apenas com evidencia validada.

## Como Aplicar em Novas Sugestoes

1. Consultar [[Memoria_Ativa_CEO]].
2. Identificar se a melhoria aplicada vira checklist, template, migration, matriz ou playbook.
3. Conectar projetos com tecnologia, risco ou funil semelhante.
4. Registrar o padrao no MasterMind antes de criar automacao.
5. Criar a proxima sugestao apenas se houver lacuna nova com criterio de conclusao.

## Criterio de Conclusao

O padrao e considerado aplicado quando:

- Existe documento ou codigo reutilizavel.
- O aprendizado foi registrado no Obsidian.
- A sugestao aplicada nao volta ao grid ativo.
- As proximas sugestoes sao lacunas novas, nao repeticoes de ciclo.

## Conexoes

- [[Mastermind_CEO_Kentauros]]
- [[Base_de_Aprendizados]]
- [[Backlog_de_Melhorias]]
- [[MEL-0061 - Substituir ciclos repetidos por sugestoes tematicas do MasterMind]]
- [[MEL-0062 - Verificacao comercial pos-aplicacao do MasterMind]]

#kentauros #ceo #mastermind #workflow #melhoria-continua #operacional #lucro #retencao
