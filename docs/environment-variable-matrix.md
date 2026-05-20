# Matriz de Segredos e Variaveis por Ambiente

Data: 2026-05-20

## Diretriz CEO

> [!important]
> Nenhum deploy, automacao externa ou integracao entre produtos Kentauros deve seguir para producao sem matriz de variaveis por projeto, ambiente, dono, rotacao e impacto de falha.

Esta matriz registra nomes de variaveis e riscos operacionais. Valores reais de segredos nao devem ser documentados, enviados para agentes, commitados ou exibidos em logs.

## Analise de Impacto

| Dimensao | Impacto |
| --- | --- |
| Tecnico | Reduz falhas de deploy, divergencia entre local/preview/producao e risco de credenciais hardcoded. |
| Operacional | Cria dono claro para cada segredo e acelera diagnostico de incidentes. |
| Conversao | Protege captura, importacao, email, WhatsApp e follow-up comercial. |
| Lucro | Evita indisponibilidade, retrabalho, perda de leads e custo de incidentes. |
| Retencao | Aumenta confianca ao proteger dados e garantir continuidade operacional. |

## Politica de Segredos

- Nunca registrar valores reais nesta matriz.
- Variaveis publicas de frontend devem usar apenas configuracoes nao sensiveis.
- Secrets devem ficar em `.env.local`, cofre do provedor, Vercel Environment Variables, secrets de CI/CD ou storage seguro equivalente.
- Qualquer chave encontrada em codigo-fonte, arquivo versionavel, build empacotado ou log deve ser rotacionada imediatamente.
- Production e preview nao devem compartilhar banco, tokens ou credenciais criticas sem aprovacao CEO.

## Matriz por Projeto

| Projeto | Variavel | Ambientes | Provedor | Dono | Criticidade | Rotacao | Impacto de falha | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Kentauros | `VITE_SUPABASE_URL` | local, preview, producao | Supabase | CTO/Deploy | Alta | Quando mudar projeto/ambiente | Frontend perde acesso ao backend Supabase. | Mapeada em `.env.example`. |
| Kentauros | `VITE_SUPABASE_ANON_KEY` | local, preview, producao | Supabase | CTO/Deploy | Alta | 90 dias ou apos alteracao RLS/Auth | Cliente nao autentica/consulta corretamente. | Mapeada em `.env.example`. |
| Kentauros | `SUPABASE_URL` | serverless, preview, producao | Supabase | CTO/Deploy | Alta | Quando mudar projeto/ambiente | APIs serverless perdem persistencia. | Adicionada ao `.env.example`. |
| Kentauros | `SUPABASE_ANON_KEY` | serverless, preview, producao | Supabase | CTO/Deploy | Alta | 90 dias ou apos alteracao RLS/Auth | APIs com anon key podem falhar. | Adicionada ao `.env.example`. |
| Kentauros | `SUPABASE_SERVICE_ROLE_KEY` | serverless producao | Supabase | CTO/Seguranca | Critica | 60-90 dias ou imediatamente apos exposicao | Acesso privilegiado ao banco; vazamento compromete dados. | Mapeada; usar somente server-side. |
| Kentauros | `CAPLEAD_IMPORT_API_KEY` | preview, producao | Kentauros/CapLead | CTO/Operacao | Alta | 90 dias ou apos troca de cliente/endpoint | Importacao CapLead pode ser abusada ou bloqueada. | Mapeada; obrigatoria em producao. |
| Kentauros | `CAPLEAD_IMPORT_ALLOWED_ORIGINS` | preview, producao | Kentauros/CapLead | CTO/Deploy | Alta | A cada mudanca de dominio | CORS aberto gera risco de abuso. | Mapeada; nao usar `*` em producao. |
| Kentauros | `CAPLEAD_IMPORT_TENANT_ID` | preview, producao | Kentauros | COO/Operacao | Media | Quando mudar tenant | Leads podem entrar no tenant errado. | Mapeada. |
| Kentauros | `CAPLEAD_IMPORT_USER_ID` | preview, producao | Kentauros | COO/Operacao | Media | Quando mudar usuario tecnico | Auditoria de importacao fica incorreta. | Mapeada. |
| Kentauros | `GOOGLE_SEARCH_API_KEY` | serverless | Google Search | CTO/IA | Alta | 90 dias ou apos exposicao | Busca externa falha ou gera custo indevido. | Adicionada ao `.env.example`. |
| Kentauros | `GOOGLE_SEARCH_CSE_ID` | serverless | Google Search | CTO/IA | Media | Quando mudar motor de busca | Captura perde fonte de pesquisa. | Adicionada ao `.env.example`. |
| Kentauros | `GOOGLE_PLACES_API_KEY` | serverless | Google Places | CTO/IA | Alta | 90 dias ou apos exposicao | Enriquecimento de leads falha ou gera custo indevido. | Adicionada ao `.env.example`. |
| Kentauros | `SERPAPI_API_KEY` | serverless | SerpAPI | CTO/IA | Alta | 90 dias ou apos exposicao | Captura alternativa falha. | Adicionada ao `.env.example`. |
| Kentauros | `BING_SEARCH_API_KEY` | serverless | Bing Search | CTO/IA | Alta | 90 dias ou apos exposicao | Busca oficial falha ou gera custo indevido. | Adicionada ao `.env.example`. |
| Kentauros | `BING_SEARCH_ENDPOINT` | serverless | Bing Search | CTO/Deploy | Baixa | Quando mudar endpoint | Busca pode apontar para endpoint errado. | Adicionada ao `.env.example`. |
| Kentauros | `SMTP_USER` | local, preview, producao | Email/SMTP | COO/Operacao | Media | Quando mudar conta | Emails deixam de sair. | Mapeada. |
| Kentauros | `SMTP_PASS` | local, preview, producao | Email/SMTP | COO/Operacao | Alta | 90 dias ou apos exposicao | Envio de email falha ou conta pode ser comprometida. | Mapeada. |
| Kentauros | `VITE_CAPLEAD_DOWNLOAD_URL` | frontend | Release CapLead | CTO/Deploy | Baixa | Quando mudar canal de release | Botao pode baixar pacote incorreto. | Mapeada. |
| Kentauros | `CAPLEAD_DOWNLOAD_URL` | server | Release CapLead | CTO/Deploy | Baixa | Quando mudar release | Download server-side falha. | Mapeada. |
| Kentauros | `CAPLEAD_DOWNLOAD_FILE` | local/build | Arquivo local | CTO/Deploy | Media | Quando mudar build | Download local falha. | Mapeada. |
| Kentauros | `CAPLEAD_SOURCE_DIR` | local/build | Arquivo local | CTO/Deploy | Media | Quando mudar build | Empacotamento pode usar fonte errada. | Mapeada. |
| CapLead | `CAPLEAD_KENTAUROS_API_KEY` | local, pacote, producao | Kentauros API | CTO/Operacao | Alta | 90 dias ou apos exposicao | Exportacao para Kentauros falha ou pode ser abusada. | Mapear em `.env.example` do CapLead. |
| CapLead | `CAPLEAD_KENTAUROS_TENANT_ID` | local, pacote, producao | Kentauros API | COO/Operacao | Media | Quando mudar tenant | Leads podem entrar no tenant errado. | Mapear em `.env.example` do CapLead. |
| CapLead | `GEMINI_API_KEY` | local, pacote | Gemini | CTO/IA | Alta | Imediata se hardcoded/exposta | IA de layout falha ou gera custo indevido. | Rotacionar se valor real foi exposto. |
| CapLead | `CAPLEAD_GEMINI_API_KEY` | local, pacote | Gemini | CTO/IA | Alta | Imediata se hardcoded/exposta | IA de layout falha ou gera custo indevido. | Rotacionar se valor real foi exposto. |
| CapLead | `CAPLEAD_GEMINI_MODEL` | local, pacote | Gemini | CTO/IA | Baixa | Quando mudar modelo | Resultado de IA muda. | Mapear em `.env.example`. |
| CapLead | `CAPLEAD_SMTP_CONFIG` | local, pacote | Email/SMTP | COO/Operacao | Alta | 90 dias ou apos exposicao | SMTP pode falhar ou vazar credenciais. | Revisar arquivo de configuracao padrao. |
| CapLead | `CAPLEAD_SMTP_APP_PASSWORD` | local, pacote | Email/SMTP | COO/Operacao | Alta | 90 dias ou apos exposicao | Conta SMTP pode ser comprometida. | Mapear fora do codigo. |
| CapLead | `PROTOTYPE_API_BASE` | local, pacote | API Prototipos | CTO/Deploy | Media | Quando mudar backend | Geracao de prototipos aponta para backend errado. | Mapear em `.env.example`. |
| AutoSocial | `DATABASE_URL` | local, preview, producao | PostgreSQL | CTO/Deploy | Critica | 60-90 dias ou apos exposicao | Backend perde persistencia ou conecta no banco errado. | Arquivo local contem exemplo; producao deve usar secret real. |
| AutoSocial | `JWT_SECRET` | local, preview, producao | Auth | CTO/Seguranca | Critica | Imediata se placeholder/exposto | Tokens podem ser forjados ou invalidos. | Trocar placeholder antes de qualquer deploy. |
| AutoSocial | `NEXT_PUBLIC_API_URL` | frontend | API AutoSocial | CTO/Deploy | Media | Quando mudar dominio | Frontend aponta para API errada. | Mapeada em frontend. |
| AutoSocial | `OPENAI_API_KEY` | backend | OpenAI | CTO/IA | Alta | 90 dias ou apos exposicao | IA falha ou gera custo indevido. | Mapear no backend. |
| AutoSocial | `ANTHROPIC_API_KEY` | backend | Anthropic | CTO/IA | Alta | 90 dias ou apos exposicao | IA falha ou gera custo indevido. | Mapear no backend. |
| AutoSocial | `REDIS_HOST` | backend | Redis | CTO/Deploy | Media | Quando mudar infra | Filas podem parar. | Mapear no backend. |
| AutoSocial | `REDIS_PORT` | backend | Redis | CTO/Deploy | Baixa | Quando mudar infra | Filas podem parar. | Mapear no backend. |
| AutoSocial | `PORT` | backend | Runtime | CTO/Deploy | Baixa | Quando mudar hosting | API pode subir em porta errada. | Mapear no backend. |
| ArteNewEra | `DATABASE_URL` | local, preview, producao | SQLite/Postgres futuro | CTO/Deploy | Alta | Quando mudar storage | Prisma perde persistencia. | Valor local encontrado; nao compartilhar. |
| ArteNewEra | `GROQ_API_KEY` | server | Groq | CTO/IA | Alta | Imediata se exposta | IA falha ou gera custo indevido. | Rotacionar se valor real foi exposto em `.env`. |
| ArteNewEra | `GEMINI_API_KEY` | server | Gemini | CTO/IA | Alta | 90 dias ou apos exposicao | IA alternativa falha. | Mapear sem valor real. |
| ArteNewEra | `EVOLUTION_API_URL` | server | Evolution API | CTO/Deploy | Media | Quando mudar instancia | WhatsApp falha. | Mapear sem valor real. |
| ArteNewEra | `EVOLUTION_API_KEY` | server | Evolution API | CTO/Seguranca | Alta | 90 dias ou apos exposicao | WhatsApp pode ser abusado. | Mapear sem valor real. |
| ArteNewEra | `EVOLUTION_INSTANCE` | server | Evolution API | CTO/Operacao | Media | Quando mudar instancia | Envio WhatsApp usa instancia errada. | Mapear sem valor real. |
| ArteNewEra | `SMTP_HOST` | server | Email/SMTP | COO/Operacao | Media | Quando mudar provedor | Emails falham. | Mapear sem valor real. |
| ArteNewEra | `SMTP_PORT` | server | Email/SMTP | COO/Operacao | Baixa | Quando mudar provedor | Emails falham. | Mapear sem valor real. |
| ArteNewEra | `SMTP_SECURE` | server | Email/SMTP | CTO/Deploy | Baixa | Quando mudar provedor | Emails falham por TLS errado. | Mapear sem valor real. |
| ArteNewEra | `SMTP_USER` | server | Email/SMTP | COO/Operacao | Media | Quando mudar conta | Emails falham. | Mapear sem valor real. |
| ArteNewEra | `SMTP_PASS` | server | Email/SMTP | COO/Operacao | Alta | 90 dias ou apos exposicao | Conta SMTP pode ser comprometida. | Mapear sem valor real. |
| ArteNewEra | `TEST_WHATSAPP_NUMBER` | local/teste | WhatsApp | COO/QA | Baixa | Quando mudar QA | Teste pode enviar para numero errado. | Manter fora de producao. |

## Checklist de Deploy Seguro

### Kentauros
- `.env.example` deve conter todas as chaves referenciadas pelo app.
- `CAPLEAD_IMPORT_API_KEY` obrigatoria em producao.
- `CAPLEAD_IMPORT_ALLOWED_ORIGINS` sem wildcard.
- `SUPABASE_SERVICE_ROLE_KEY` apenas em serverless/backend.
- Health check deve validar Supabase, CapLead import key e origens permitidas.
- Preview deve usar banco/tenant separado de producao.

### CapLead
- Criar `.env.example` sem valores reais.
- Remover/rotacionar qualquer chave real hardcoded ou empacotada.
- Configuracao SMTP deve ser input seguro do usuario ou secret externo, nao padrao versionado.
- API key para Kentauros deve ser diferente por ambiente.
- Build desktop nao deve embutir segredos permanentes.

### AutoSocial
- Trocar `JWT_SECRET` placeholder antes de preview/producao.
- Separar `DATABASE_URL` local, preview e producao.
- Validar Redis antes de liberar agendamentos.
- Chaves de IA devem ficar somente no backend.
- `NEXT_PUBLIC_API_URL` deve apontar para API do ambiente correto.

### ArteNewEra
- Rotacionar qualquer chave real encontrada em `.env` antes de publicar ou compartilhar.
- Criar `.env.example` sem valores.
- Separar credenciais de IA, WhatsApp/Evolution e SMTP por ambiente.
- Validar que env local nao entra em commit, backup publico ou build.
- Testes de WhatsApp devem usar numero de QA e nunca numero real de cliente sem aprovacao.

## Acoes Imediatas

1. Rotacionar chaves reais encontradas em arquivos locais ou codigo-fonte antes de qualquer deploy.
2. Criar `.env.example` nos projetos CapLead, AutoSocial e ArteNewEra.
3. Adicionar checagem automatica de secrets hardcoded no pipeline.
4. Definir dono e data de rotacao para cada segredo de producao.
5. Registrar cada rotacao no MasterMind CEO.

## Conexoes

- [[Mastermind_CEO_Kentauros]]
- [[Riscos_e_Governanca]]
- [[Backlog_de_Melhorias]]
- [[Mapa_de_Tecnologias]]
- [[CapLead]]
- [[AutoSocial]]
- [[ArteNewEra]]
- [[Kentauros]]

#kentauros #ceo #seguranca #deploy #governanca #risco #tecnologia #operacional
