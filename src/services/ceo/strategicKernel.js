import { createDecisionRecommendations, getLeadCoolingAlerts, scoreInitiative } from '../continuousImprovement.js';

export const CEO_APPROVAL_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
};

export const CEO_APPLICATION_STATUS = {
  NOT_APPLIED: 'not_applied',
  AWAITING_CODEX: 'awaiting_codex',
  APPLIED: 'applied',
};

export const CEO_ACTION_TYPES = {
  HIRE_AGENT: 'hire_agent',
  INSTALL_SKILL: 'install_skill',
  CREATE_AUTOMATION: 'create_automation',
  SECURITY_REVIEW: 'security_review',
  MASTERMIND_UPDATE: 'mastermind_update',
};

export const CEO_STUDY_LIBRARY = [
  {
    id: 'openai_agents_hitl',
    name: 'OpenAI Agents SDK - Human-in-the-loop',
    url: 'https://openai.github.io/openai-agents-python/human_in_the_loop/',
    focus: 'interromper a execucao para aprovar ferramentas e acoes sensiveis',
    risk: 'baixo',
  },
  {
    id: 'langgraph_hitl',
    name: 'LangGraph - Human-in-the-loop',
    url: 'https://docs.langchain.com/oss/python/langchain/frontend/human-in-the-loop',
    focus: 'pausar, revisar e retomar fluxos de agentes com estado preservado',
    risk: 'medio',
  },
  {
    id: 'open_agent_skill',
    name: 'Open Agent Skill',
    url: 'https://www.openagentskill.com/',
    focus: 'descobrir skills e MCPs reutilizaveis para agentes',
    risk: 'medio',
  },
  {
    id: 'findskills',
    name: 'FindSkills',
    url: 'https://findskills.org/',
    focus: 'avaliar skills por categoria, popularidade e seguranca antes de instalar',
    risk: 'medio',
  },
];

const SKILL_GOVERNANCE_CATALOG = [
  { name: 'hm-security', intendedUse: 'seguranca', risk: 'alto', source: 'Skill local Kentauros', permissions: ['arquivos', 'dependencias', 'auditoria de seguranca'] },
  { name: 'hm-qa', intendedUse: 'seguranca', risk: 'medio', source: 'Skill local Kentauros', permissions: ['arquivos', 'testes', 'logs'] },
  { name: 'supabase-postgres-best-practices', intendedUse: 'seguranca', risk: 'medio', source: 'Skill local Kentauros', permissions: ['schema', 'queries', 'banco de dados'] },
  { name: 'hm-designer', intendedUse: 'design', risk: 'baixo', source: 'Skill local Kentauros', permissions: ['arquivos', 'componentes visuais'] },
  { name: 'vercel:react-best-practices', intendedUse: 'design', risk: 'baixo', source: 'Plugin Vercel', permissions: ['arquivos React', 'analise de componentes'] },
  { name: 'vercel:shadcn', intendedUse: 'design', risk: 'medio', source: 'Plugin Vercel', permissions: ['componentes UI', 'dependencias frontend'] },
  { name: 'hm-deploy', intendedUse: 'deploy', risk: 'alto', source: 'Skill local Kentauros', permissions: ['build', 'deploy', 'variaveis de ambiente'] },
  { name: 'vercel:deployments-cicd', intendedUse: 'deploy', risk: 'alto', source: 'Plugin Vercel', permissions: ['deploy', 'logs de producao', 'ambiente Vercel'] },
  { name: 'vercel:env-vars', intendedUse: 'deploy', risk: 'alto', source: 'Plugin Vercel', permissions: ['variaveis de ambiente', 'segredos'] },
  { name: 'superpowers:test-driven-development', intendedUse: 'automacao', risk: 'baixo', source: 'Plugin Superpowers', permissions: ['testes', 'arquivos'] },
  { name: 'superpowers:systematic-debugging', intendedUse: 'automacao', risk: 'baixo', source: 'Plugin Superpowers', permissions: ['logs', 'testes', 'arquivos'] },
  { name: 'vercel:workflow', intendedUse: 'automacao', risk: 'medio', source: 'Plugin Vercel', permissions: ['workflows', 'funcoes', 'execucao assíncrona'] },
];

const IMPLEMENTED_CEO_SUGGESTIONS = new Set([
  'ceo_continuous_learning_review_cycle_1_caplead_quality',
  'ceo_continuous_learning_review_cycle_2_caplead_quality',
  'ceo_continuous_learning_review_cycle_3_kentauros_conversion',
  'ceo_continuous_learning_review_cycle_3_caplead_quality',
  'ceo_continuous_learning_review_cycle_3_security_operations',
  'ceo_continuous_learning_review_cycle_4_kentauros_conversion',
  'ceo_continuous_learning_review_cycle_4_caplead_quality',
  'ceo_continuous_learning_review_cycle_4_security_operations',
  'ceo_continuous_learning_review_cycle_5_caplead_quality',
  'ceo_continuous_learning_review_cycle_5_kentauros_conversion',
  'ceo_continuous_learning_review_cycle_5_security_operations',
  'ceo_continuous_learning_review_cycle_6_caplead_quality',
  'ceo_continuous_learning_review_cycle_6_kentauros_conversion',
  'ceo_continuous_learning_review_cycle_6_security_operations',
  'ceo_continuous_learning_review_cycle_7_caplead_quality',
  'ceo_continuous_learning_review_cycle_7_kentauros_conversion',
  'ceo_continuous_learning_review_cycle_7_security_operations',
  'ceo_mastermind_caplead_hardening_plan',
  'ceo_mastermind_caplead_quality_contract',
  'ceo_mastermind_conversion_playbook',
  'ceo_mastermind_automation_observability',
  'ceo_mastermind_automation_response_dashboard',
  'ceo_mastermind_operational_ux_review',
  'ceo_mastermind_supabase_rls_governance',
  'ceo_mastermind_caplead_export_enrichment_audit',
  'ceo_mastermind_open_proposal_roi_review',
  'ceo_security_audit',
  'ceo_mastermind_active_risk_resolution_board',
  'ceo_mastermind_supabase_rls_execution_plan',
  'ceo_mastermind_secret_inventory_execution',
  'ceo_mastermind_token_efficient_context_pipeline',
  'ceo_mastermind_next_verification_21',
  'ceo_mastermind_cross_project_reuse_21',
  'ceo_mastermind_conversion_residuals_21',
  'ceo_mastermind_commercial_impact_audit_21',
  'ceo_mastermind_commercial_gap_board_21',
  'ceo_mastermind_autonomous_approval_governance',
  'ceo_mastermind_ai_integration_reuse_map',
  'ceo_mastermind_ai_reuse_validation_kpi',
  'ceo_mastermind_revenue_retention_kpi_board',
  'ceo_mastermind_raw_context_consolidation_alert',
  'ceo_mastermind_revenue_kpi_validation_cycle',
]);

export const isImplementedCeoSuggestion = suggestionId =>
  IMPLEMENTED_CEO_SUGGESTIONS.has(suggestionId);

export const isActiveCeoApproval = item =>
  item?.metadata?.source === 'ceo_strategic_kernel' &&
  item.status !== CEO_APPROVAL_STATUS.REJECTED &&
  item.appliedStatus !== CEO_APPLICATION_STATUS.APPLIED &&
  !isImplementedCeoSuggestion(item.metadata?.suggestionId);

const hasOpenCeoApproval = (approvalRequests = [], suggestionId) =>
  approvalRequests.some(item =>
    item.metadata?.source === 'ceo_strategic_kernel' &&
    item.metadata?.suggestionId === suggestionId &&
    item.status !== CEO_APPROVAL_STATUS.REJECTED &&
    item.appliedStatus !== CEO_APPLICATION_STATUS.APPLIED
  );

const hasApprovedCeoLearning = (learningEvents = [], suggestionId) =>
  learningEvents.some(item =>
    ['ceo_suggestion_approved', 'ceo_suggestion_applied'].includes(item.event_type) &&
    item.metadata?.source === 'ceo_strategic_kernel' &&
    item.metadata?.suggestionId === suggestionId
  );

const alreadyHandled = (approvalRequests, learningEvents, suggestionId) =>
  IMPLEMENTED_CEO_SUGGESTIONS.has(suggestionId) ||
  hasOpenCeoApproval(approvalRequests, suggestionId) ||
  hasApprovedCeoLearning(learningEvents, suggestionId);

const hasApprovedFollowUpAutomation = (automations = []) =>
  automations.some(item =>
    item.action === 'schedule_commercial_followup' &&
    ['active', 'paused'].includes(String(item.status || 'active').toLowerCase())
  );

const appliedCeoLearnings = (learningEvents = []) =>
  learningEvents.filter(item =>
    item.event_type === 'ceo_suggestion_applied' &&
    (item.tags || []).includes('CEO') &&
    item.metadata?.source === 'ceo_strategic_kernel'
  );

const cycleSuggestionIds = cycle => [
  `ceo_continuous_learning_review_cycle_${cycle}_kentauros_conversion`,
  `ceo_continuous_learning_review_cycle_${cycle}_caplead_quality`,
  `ceo_continuous_learning_review_cycle_${cycle}_security_operations`,
];

const isContinuousCycleImplemented = cycle =>
  cycleSuggestionIds(cycle).every(id => IMPLEMENTED_CEO_SUGGESTIONS.has(id));

const getContinuousLearningCycle = (learningEvents = []) => {
  const appliedCycles = learningEvents
    .filter(item =>
      item.event_type === 'ceo_suggestion_applied' &&
      item.metadata?.source === 'ceo_strategic_kernel' &&
      String(item.metadata?.suggestionId || '').includes('continuous_learning_review_cycle_')
    )
    .map(item => Number(String(item.metadata?.suggestionId || '').split('continuous_learning_review_cycle_')[1]?.split('_')[0]))
    .filter(Number.isFinite);

  let cycle = appliedCycles.length ? Math.max(...appliedCycles) + 1 : 1;

  while (isContinuousCycleImplemented(cycle)) {
    cycle += 1;
  }

  return cycle;
};

const createContinuousLearningSuggestions = ({ cycle, appliedLearnings = [], leads = [], automations = [], clients = [], projects = [] }) => {
  const evidence = [
    'MasterMind deve analisar continuamente Kentauros e CapLead antes de novas decisoes.',
    ...appliedLearnings.map(event => event.title || event.metadata?.suggestionId).slice(0, 3),
  ];
  const capLeadCount = leads.filter(lead => String(lead.source || '').toLowerCase().includes('caplead')).length;
  const activeAutomationCount = automations.filter(item => item.status === 'active').length;
  const clientCount = clients.length;
  const projectCount = projects.length;

  return [
    createSuggestion({
      id: `ceo_continuous_learning_review_cycle_${cycle}_kentauros_conversion`,
      title: `Ciclo ${cycle}: revisar conversao operacional da Kentauros`,
      category: 'aprendizado',
      target: 'Kentauros',
      summary: 'O CEO deve transformar aprendizados aplicados em novas hipoteses para melhorar lead, discovery, proposta, cliente e retencao.',
      actionType: CEO_ACTION_TYPES.MASTERMIND_UPDATE,
      score: scoreInitiative({ commercial: 5, financial: 4, technical: 3, client: 5, urgency: 4, complexity: 3, risk: 4, reuse: 5, automation: 4 }),
      risk: 'baixo',
      impact: { conversion: 'alto', profit: 'medio', retention: 'medio' },
      evidence: [...evidence, `${clientCount} cliente(s) e ${projectCount} projeto(s) para correlacionar com o funil.`],
      actionPlan: [
        'Comparar leads sem proxima acao, discoveries incompletos e propostas abertas.',
        'Gerar backlog priorizado para o maior gargalo de conversao.',
        'Registrar resultado no MasterMind como aprendizado do ciclo.',
      ],
    }),
    createSuggestion({
      id: `ceo_continuous_learning_review_cycle_${cycle}_caplead_quality`,
      title: `Ciclo ${cycle}: melhorar qualidade dos leads CapLead`,
      category: 'aprendizado',
      target: 'CapLead',
      summary: 'O CEO deve analisar a captura do CapLead e sugerir melhorias de qualidade, exportacao, deduplicacao ou scoring antes de impactar a Kentauros.',
      actionType: CEO_ACTION_TYPES.MASTERMIND_UPDATE,
      score: scoreInitiative({ commercial: 5, financial: 4, technical: 4, client: 4, urgency: 4, complexity: 3, risk: 4, reuse: 5, automation: 5 }),
      risk: 'medio',
      impact: { conversion: 'alto', operation: 'alto', dataQuality: 'alto' },
      evidence: [...evidence, `${capLeadCount} lead(s) com origem CapLead no contexto atual.`],
      actionPlan: [
        'Revisar campos obrigatorios exportados pelo CapLead.',
        'Identificar oportunidades de deduplicacao, enriquecimento e score.',
        'Registrar recomendacao com aprovacao humana antes de automacoes externas.',
      ],
    }),
    createSuggestion({
      id: `ceo_continuous_learning_review_cycle_${cycle}_security_operations`,
      title: `Ciclo ${cycle}: revisar seguranca e operacao entre Kentauros e CapLead`,
      category: 'seguranca',
      target: 'Kentauros e CapLead',
      summary: 'O CEO deve manter uma revisao recorrente de API keys, CORS, permissoes, logs, automacoes e dados sensiveis entre as aplicacoes.',
      actionType: CEO_ACTION_TYPES.SECURITY_REVIEW,
      score: scoreInitiative({ commercial: 3, financial: 4, technical: 5, client: 5, urgency: 4, complexity: 3, risk: 5, reuse: 4, automation: 4 }),
      risk: 'medio',
      impact: { security: 'alto', retention: 'alto', operation: 'alto' },
      evidence: [...evidence, `${activeAutomationCount} automacao(oes) ativa(s) para revisar governanca.`],
      actionPlan: [
        'Auditar permissoes, variaveis de ambiente e endpoints usados pelo fluxo.',
        'Verificar se acoes externas continuam exigindo aprovacao humana.',
        'Registrar riscos e mitigacoes no MasterMind.',
      ],
      skillCandidates: createSkillGovernanceRecommendation('seguranca').candidates,
    }),
  ];
};

const createPostCompletionMasterMindSuggestions = ({
  appliedLearnings = [],
  leads = [],
  automations = [],
  clients = [],
  projects = [],
} = {}) => {
  const latestLearning = appliedLearnings[appliedLearnings.length - 1] || {};
  const appliedCount = appliedLearnings.length || 1;
  const phase = Math.max(1, appliedCount);
  const sourceTitle = latestLearning.title || latestLearning.metadata?.suggestionId || 'atividade aplicada';
  const sourceText = compactText(latestLearning).toLowerCase();
  const isVerificationLearning = textIncludesAny(sourceText, ['verificar mastermind apos']);
  const isCommercialRecommendationVerification = textIncludesAny(sourceText, [
    'priorizar recomendacoes comerciais',
    'growth_recommendations',
    'recomendacoes comerciais',
    'backlog comercial',
  ]);
  const capLeadCount = leads.filter(lead => String(lead.source || '').toLowerCase().includes('caplead')).length;
  const activeAutomationCount = automations.filter(item => String(item.status || 'active').toLowerCase() === 'active').length;

  const suggestions = [];

  if (!isVerificationLearning) {
    suggestions.push(createSuggestion({
      id: `ceo_mastermind_next_verification_${phase}`,
      title: `Verificar MasterMind apos ${sourceTitle}`,
      category: 'governanca',
      target: 'MasterMind CEO',
      summary: 'Apos concluir uma atividade, o CEO deve reler os sinais do MasterMind, confirmar impacto real e transformar apenas lacunas novas em proximas sugestoes.',
      actionType: CEO_ACTION_TYPES.MASTERMIND_UPDATE,
      score: scoreInitiative({ commercial: 4, financial: 4, technical: 4, client: 5, urgency: 4, complexity: 2, risk: 4, reuse: 5, automation: 4 }),
      risk: 'medio',
      impact: { governance: 'alto', operation: 'alto', reuse: 'alto' },
      evidence: [
        `Ultima atividade aplicada: ${sourceTitle}`,
        `${appliedCount} aprendizado(s) CEO aplicado(s) disponiveis para correlacao.`,
      ],
      actionPlan: [
        'Consultar Memoria_Ativa_CEO, Riscos_e_Governanca, Backlog_de_Melhorias e Base_de_Aprendizados.',
        'Comparar o que foi aplicado com riscos ainda ativos ou em monitoramento.',
        'Gerar somente sugestoes com problema, evidencia, beneficio e criterio de conclusao novos.',
      ],
    }));
  }

  suggestions.push(
    createSuggestion({
      id: `ceo_mastermind_cross_project_reuse_${phase}`,
      title: `Reaproveitar aprendizado aplicado em projetos similares`,
      category: 'aprendizado',
      target: 'Kentauros, CapLead, AutoSocial e ArteNewEra',
      summary: 'Toda correcao aplicada deve virar padrao reutilizavel quando reduzir retrabalho, risco ou custo em mais de um projeto.',
      actionType: CEO_ACTION_TYPES.MASTERMIND_UPDATE,
      score: scoreInitiative({ commercial: 4, financial: 5, technical: 4, client: 4, urgency: 4, complexity: 3, risk: 3, reuse: 5, automation: 4 }),
      risk: 'baixo',
      impact: { profit: 'alto', operation: 'alto', retention: 'medio' },
      evidence: [
        `${projects.length} projeto(s) no contexto atual.`,
        `Aprendizado base: ${sourceTitle}`,
      ],
      actionPlan: [
        'Identificar se a solucao aplicada vira checklist, template, migration, matriz ou playbook.',
        'Conectar o padrao aos projetos que compartilham a mesma tecnologia ou risco.',
        'Registrar melhoria reutilizavel no MasterMind antes de criar nova automacao.',
      ],
    })
  );

  if (isCommercialRecommendationVerification) {
    suggestions.push(
      createSuggestion({
        id: `ceo_mastermind_commercial_impact_audit_${phase}`,
        title: 'Auditar impacto real das recomendacoes comerciais aplicadas',
        category: 'comercial',
        target: 'Kentauros',
        summary: 'A recomendacao comercial so deve ser considerada madura quando o CEO medir impacto em lead, discovery, proposta, conversao, lucro e retencao.',
        actionType: CEO_ACTION_TYPES.MASTERMIND_UPDATE,
        score: scoreInitiative({ commercial: 5, financial: 5, technical: 3, client: 5, urgency: 5, complexity: 3, risk: 3, reuse: 4, automation: 3 }),
        risk: 'medio',
        impact: { conversion: 'alto', profit: 'alto', retention: 'medio' },
        evidence: [
          `Ultima verificacao aplicada: ${sourceTitle}`,
          'MasterMind exige confirmar impacto real antes de transformar aprendizado em nova automacao.',
        ],
        actionPlan: [
          'Listar recomendacoes comerciais aplicadas e vincular cada uma a KPI de conversao, lucro ou retencao.',
          'Comparar status de leads, discoveries, propostas e clientes antes/depois da recomendacao.',
          'Registrar somente lacunas novas com criterio de conclusao mensuravel.',
        ],
      }),
      createSuggestion({
        id: `ceo_mastermind_commercial_gap_board_${phase}`,
        title: 'Converter lacunas comerciais restantes em quadro CEO mensuravel',
        category: 'operacao',
        target: 'Kentauros',
        summary: 'As lacunas comerciais restantes devem virar tarefas aprovaveis com dono, metrica, prazo e criterio de encerramento, evitando recomendacoes soltas.',
        actionType: CEO_ACTION_TYPES.MASTERMIND_UPDATE,
        score: scoreInitiative({ commercial: 5, financial: 4, technical: 3, client: 5, urgency: 4, complexity: 3, risk: 3, reuse: 5, automation: 4 }),
        risk: 'baixo',
        impact: { governance: 'alto', operation: 'alto', conversion: 'alto' },
        evidence: [
          `${appliedCount} aprendizado(s) CEO aplicado(s) disponiveis para correlacao.`,
          'Backlog e aprendizados indicam que recomendacao comercial precisa virar execucao rastreavel.',
        ],
        actionPlan: [
          'Separar lacunas por lead, discovery, proposta, onboarding, retencao e upsell.',
          'Definir responsavel, metrica, prazo e criterio de conclusao para cada lacuna.',
          'Gerar ApprovalRequest antes de automacao externa ou mudanca operacional sensivel.',
        ],
      })
    );
  }

  if (textIncludesAny(sourceText, ['segredo', 'secret', 'variaveis', 'env', 'deploy', 'supabase', 'rls', 'seguranca', 'security'])) {
    suggestions.push(createSuggestion({
      id: `ceo_mastermind_security_residuals_${phase}`,
      title: 'Validar riscos residuais de seguranca antes do proximo deploy',
      category: 'seguranca',
      target: 'Kentauros e projetos conectados',
      summary: 'Depois de um hardening, o CEO deve verificar se ainda existem segredos expostos, ambiente sem dono, RLS pendente, dependencias vulneraveis ou checklist sem evidencia.',
      actionType: CEO_ACTION_TYPES.SECURITY_REVIEW,
      score: scoreInitiative({ commercial: 3, financial: 4, technical: 5, client: 5, urgency: 5, complexity: 3, risk: 5, reuse: 5, automation: 3 }),
      risk: 'alto',
      impact: { security: 'alto', deploy: 'alto', retention: 'alto' },
      evidence: [
        `Ultima atividade aplicada: ${sourceTitle}`,
        `${activeAutomationCount} automacao(oes) ativa(s) podem depender de ambiente seguro.`,
      ],
      actionPlan: [
        'Checar se riscos mudaram de ativo para monitoramento somente com evidencia validada.',
        'Bloquear deploy quando houver chave exposta, placeholder critico ou ambiente sem owner.',
        'Registrar rotacao, teste ou rollback no MasterMind.',
      ],
      skillCandidates: createSkillGovernanceRecommendation('deploy').candidates,
    }));
  } else {
    suggestions.push(createSuggestion({
      id: `ceo_mastermind_conversion_residuals_${phase}`,
      title: 'Transformar aprendizado aplicado em nova alavanca de conversao',
      category: 'crescimento',
      target: 'Kentauros',
      summary: 'Depois de uma melhoria operacional, o CEO deve procurar o proximo gargalo comercial que ficou visivel: lead, discovery, proposta, onboarding, retencao ou upsell.',
      actionType: CEO_ACTION_TYPES.MASTERMIND_UPDATE,
      score: scoreInitiative({ commercial: 5, financial: 5, technical: 3, client: 5, urgency: 4, complexity: 3, risk: 3, reuse: 4, automation: 4 }),
      risk: 'medio',
      impact: { conversion: 'alto', profit: 'alto', retention: 'medio' },
      evidence: [
        `${capLeadCount} lead(s) CapLead no contexto atual.`,
        `Ultima atividade aplicada: ${sourceTitle}`,
      ],
      actionPlan: [
        'Identificar gargalo comercial novo gerado pela melhoria aplicada.',
        'Propor uma acao mensuravel com impacto em conversao, lucro ou retencao.',
        'Registrar criterio de sucesso antes de automatizar.',
      ],
    }));
  }

  return suggestions;
};

const textIncludesAny = (text = '', keywords = []) =>
  keywords.some(keyword => text.includes(keyword));

const compactText = (value) => {
  if (Array.isArray(value)) return value.map(compactText).join(' ');
  if (!value || typeof value !== 'object') return String(value || '');
  return Object.values(value).map(compactText).join(' ');
};

const createMasterMindSignals = ({ learningEvents = [], approvalRequests = [], mastermindKnowledge = [] }) => [
  ...learningEvents,
  ...approvalRequests,
  ...mastermindKnowledge,
]
  .map(item => {
    const title = item.title || item.metadata?.mastermindUpdate?.title || item.metadata?.suggestionId || item.id || 'Registro MasterMind';
    const content = [
      title,
      item.content,
      item.summary,
      item.detail,
      item.event_type,
      item.actionType,
      item.category,
      compactText(item.tags),
      compactText(item.evidence),
      compactText(item.actionPlan),
      compactText(item.metadata?.mastermindUpdate),
      compactText(item.metadata?.impact),
      item.metadata?.suggestionId,
    ].filter(Boolean).join(' ');

    return {
      title,
      raw: item,
      text: content.toLowerCase(),
    };
  })
  .filter(signal => signal.text.trim());

const evidenceFromSignals = (signals = [], keywords = [], fallback = []) => {
  const evidence = signals
    .filter(signal => textIncludesAny(signal.text, keywords))
    .map(signal => `MasterMind: ${signal.title}`)
    .filter((item, index, list) => list.indexOf(item) === index)
    .slice(0, 3);

  return evidence.length ? evidence : fallback;
};

const createMasterMindDrivenSuggestions = ({
  leads = [],
  clients = [],
  projects = [],
  automations = [],
  learningEvents = [],
  approvalRequests = [],
  mastermindKnowledge = [],
} = {}) => {
  const signals = createMasterMindSignals({ learningEvents, approvalRequests, mastermindKnowledge });
  if (!signals.length) return [];

  const allText = signals.map(signal => signal.text).join(' ');
  const suggestions = [];
  const capLeadCount = leads.filter(lead => String(lead.source || '').toLowerCase().includes('caplead')).length;
  const staleLeadCount = getLeadCoolingAlerts(leads).length;
  const activeAutomationCount = automations.filter(item => String(item.status || 'active').toLowerCase() === 'active').length;

  if (textIncludesAny(allText, ['vulnerabilidade', 'vulnerabilidades', 'high', 'security', 'seguranca', 'secret', 'api key', 'cors', 'scratch', 'release'])) {
    suggestions.push(createSuggestion({
      id: 'ceo_mastermind_caplead_hardening_plan',
      title: 'Criar plano de hardening CapLead antes da escala',
      category: 'seguranca',
      target: 'CapLead e Kentauros',
      summary: 'O MasterMind registrou risco residual em dependencias, artefatos locais, segredos, CORS ou automacoes; o CEO deve priorizar mitigacao antes de ampliar distribuicao e envios externos.',
      actionType: CEO_ACTION_TYPES.SECURITY_REVIEW,
      score: scoreInitiative({ commercial: 3, financial: 4, technical: 5, client: 5, urgency: 5, complexity: 4, risk: 5, reuse: 4, automation: 3 }),
      risk: 'alto',
      impact: { security: 'alto', retention: 'alto', operation: 'alto' },
      evidence: [
        ...evidenceFromSignals(signals, ['vulnerabilidade', 'high', 'security', 'seguranca', 'secret', 'api key', 'cors', 'scratch', 'release']),
        `${activeAutomationCount} automacao(oes) ativa(s) entram na revisao de governanca.`,
      ],
      actionPlan: [
        'Inventariar dependencias, artefatos locais, secrets e variaveis de ambiente do CapLead e da Kentauros.',
        'Separar bloqueadores de release, riscos mitigaveis e riscos aceitos com prazo.',
        'Registrar no MasterMind a decisao de escala somente apos evidencia de mitigacao.',
      ],
      skillCandidates: createSkillGovernanceRecommendation('seguranca').candidates,
    }));

    suggestions.push(createSuggestion({
      id: 'ceo_mastermind_supabase_rls_governance',
      title: 'Revisar RLS e permissoes Supabase antes da escala',
      category: 'seguranca',
      target: 'Kentauros',
      summary: 'O MasterMind registrou que API key e CORS ja sao baseline; o proximo risco tecnico deve revisar Supabase/RLS, permissoes anonimas e indices usados por politicas.',
      actionType: CEO_ACTION_TYPES.SECURITY_REVIEW,
      score: scoreInitiative({ commercial: 3, financial: 4, technical: 5, client: 5, urgency: 4, complexity: 4, risk: 5, reuse: 4, automation: 3 }),
      risk: 'alto',
      impact: { security: 'alto', retention: 'alto', operation: 'medio' },
      evidence: evidenceFromSignals(signals, ['rls', 'supabase', 'permissoes', 'api key', 'cors', 'seguranca']),
      actionPlan: [
        'Inventariar tabelas e politicas RLS usadas por leads, clientes, propostas e automacoes.',
        'Validar se politicas anonimas estao restritas e se colunas usadas em RLS possuem indices.',
        'Registrar riscos, mitigacoes e evidencias no MasterMind antes de ampliar uso multiusuario.',
      ],
      skillCandidates: createSkillGovernanceRecommendation('seguranca').candidates,
    }));
  }

  if (textIncludesAny(allText, ['#risco-ativo', 'risco ativo', 'diagnostico ceo', 'tasks aprovaveis', 'memoria ativa'])) {
    suggestions.push(createSuggestion({
      id: 'ceo_mastermind_active_risk_resolution_board',
      title: 'Transformar riscos ativos do MasterMind em quadro de execucao CEO',
      category: 'governanca',
      target: 'Kentauros',
      summary: 'O MasterMind possui riscos ativos e diagnosticos executivos; o CEO deve converter esses sinais em tarefas aprovaveis por area antes de novas automacoes.',
      actionType: CEO_ACTION_TYPES.MASTERMIND_UPDATE,
      score: scoreInitiative({ commercial: 4, financial: 4, technical: 5, client: 5, urgency: 5, complexity: 3, risk: 5, reuse: 5, automation: 4 }),
      risk: 'alto',
      impact: { governance: 'alto', operation: 'alto', security: 'alto', reuse: 'alto' },
      evidence: evidenceFromSignals(signals, ['#risco-ativo', 'risco ativo', 'diagnostico ceo', 'tasks aprovaveis', 'memoria ativa']),
      actionPlan: [
        'Listar cada risco ativo com responsavel, projeto, severidade, proxima acao e criterio de conclusao.',
        'Separar riscos em seguranca, comercial, retencao, operacao e tecnologia.',
        'Gerar ApprovalRequest antes de qualquer correcao automatizada ou acao externa.',
        'Registrar o resultado no MasterMind e alterar status para monitoramento ou mitigado quando validado.',
      ],
      skillCandidates: createSkillGovernanceRecommendation('seguranca').candidates,
    }));
  }

  if (textIncludesAny(allText, ['#risco-ativo', 'risco ativo']) && textIncludesAny(allText, ['supabase', 'rls', 'mel-0007', 'politicas anonimas', 'migracoes destrutivas'])) {
    suggestions.push(createSuggestion({
      id: 'ceo_mastermind_supabase_rls_execution_plan',
      title: 'Executar plano de correcao Supabase/RLS do MasterMind',
      category: 'seguranca',
      target: 'Kentauros',
      summary: 'Supabase/RLS permanece como risco ativo; o CEO deve transformar a revisao em plano executavel com evidencias de politica tenant-aware, migrations seguras e indices.',
      actionType: CEO_ACTION_TYPES.SECURITY_REVIEW,
      score: scoreInitiative({ commercial: 3, financial: 4, technical: 5, client: 5, urgency: 5, complexity: 4, risk: 5, reuse: 4, automation: 3 }),
      risk: 'alto',
      impact: { security: 'alto', retention: 'alto', operation: 'alto' },
      evidence: evidenceFromSignals(signals, ['supabase', 'rls', 'mel-0007', 'politicas anonimas', 'migracoes destrutivas']),
      actionPlan: [
        'Inventariar tabelas criticas, politicas anonimas, DROP TABLE e colunas usadas em RLS.',
        'Separar bootstrap local de migration de producao.',
        'Criar plano de rollback, indices e politicas tenant-aware/auth-aware.',
        'Atualizar Riscos_e_Governanca e mudar a tag apenas apos validacao.',
      ],
      skillCandidates: createSkillGovernanceRecommendation('seguranca').candidates,
    }));
  }

  if (textIncludesAny(allText, ['#risco-ativo', 'risco ativo']) && textIncludesAny(allText, ['segredos', 'secret', 'api key', 'variaveis de ambiente', 'mel-0010'])) {
    suggestions.push(createSuggestion({
      id: 'ceo_mastermind_secret_inventory_execution',
      title: 'Criar matriz de segredos e variaveis por ambiente',
      category: 'governanca',
      target: 'Kentauros',
      summary: 'Segredos e variaveis de ambiente seguem como risco ativo; o CEO deve exigir uma matriz por projeto, ambiente, dono, rotacao e impacto de falha.',
      actionType: CEO_ACTION_TYPES.SECURITY_REVIEW,
      score: scoreInitiative({ commercial: 3, financial: 4, technical: 5, client: 5, urgency: 5, complexity: 3, risk: 5, reuse: 5, automation: 3 }),
      risk: 'alto',
      impact: { security: 'alto', operation: 'alto', deploy: 'alto' },
      evidence: evidenceFromSignals(signals, ['segredos', 'secret', 'api key', 'variaveis de ambiente', 'mel-0010']),
      actionPlan: [
        'Mapear variaveis por projeto, ambiente e provedor.',
        'Classificar criticidade, dono, rotacao e dependencia operacional.',
        'Criar checklist de deploy seguro para Kentauros, CapLead, AutoSocial e ArteNewEra.',
        'Registrar aprendizado e atualizar status do risco no MasterMind.',
      ],
      skillCandidates: createSkillGovernanceRecommendation('deploy').candidates,
    }));
  }

  if (textIncludesAny(allText, ['deduplicacao', 'enriquecimento', 'score', 'qualidade', 'campos obrigatorios', 'exportacao', 'captura'])) {
    suggestions.push(createSuggestion({
      id: 'ceo_mastermind_caplead_quality_contract',
      title: 'Definir contrato de qualidade dos leads CapLead',
      category: 'aprendizado',
      target: 'CapLead',
      summary: 'O MasterMind aponta que a qualidade do lote precisa virar contrato operacional antes de impactar funil, discovery e proposta na Kentauros.',
      actionType: CEO_ACTION_TYPES.MASTERMIND_UPDATE,
      score: scoreInitiative({ commercial: 5, financial: 4, technical: 4, client: 4, urgency: 4, complexity: 3, risk: 4, reuse: 5, automation: 5 }),
      risk: 'medio',
      impact: { conversion: 'alto', operation: 'alto', dataQuality: 'alto' },
      evidence: [
        ...evidenceFromSignals(signals, ['deduplicacao', 'enriquecimento', 'score', 'qualidade', 'campos obrigatorios', 'exportacao', 'captura']),
        `${capLeadCount} lead(s) CapLead no contexto atual para medir qualidade.`,
      ],
      actionPlan: [
        'Definir campos minimos, regra de duplicidade, score minimo e motivo de descarte.',
        'Registrar indicadores de lote: leads validos, duplicados, sem contato, sem site e alta oportunidade.',
        'Gerar nova sugestao CEO quando a qualidade cair abaixo do limite aprovado.',
      ],
    }));

    suggestions.push(createSuggestion({
      id: 'ceo_mastermind_caplead_export_enrichment_audit',
      title: 'Auditar exportacao e enriquecimento CapLead por lote',
      category: 'qualidade',
      target: 'CapLead',
      summary: 'Depois do contrato de qualidade, o CEO deve medir cada lote exportado por completude de site, email, WhatsApp, duplicidade e score antes de gerar novas acoes comerciais.',
      actionType: CEO_ACTION_TYPES.MASTERMIND_UPDATE,
      score: scoreInitiative({ commercial: 5, financial: 4, technical: 4, client: 4, urgency: 4, complexity: 3, risk: 4, reuse: 5, automation: 4 }),
      risk: 'medio',
      impact: { conversion: 'alto', operation: 'alto', dataQuality: 'alto' },
      evidence: [
        ...evidenceFromSignals(signals, ['deduplicacao', 'enriquecimento', 'score', 'qualidade', 'exportacao']),
        `${capLeadCount} lead(s) CapLead no contexto atual para auditoria de lote.`,
      ],
      actionPlan: [
        'Criar resumo de lote com taxa de contato valido, duplicados, sem site e score medio.',
        'Sugerir enriquecimento apenas quando o lote ficar abaixo do contrato aprovado.',
        'Registrar aprendizado no MasterMind com a causa da queda de qualidade.',
      ],
    }));
  }

  if (textIncludesAny(allText, ['funil', 'conversao', 'discovery', 'proposta', 'roadmap', 'retencao', 'cliente', 'roi'])) {
    suggestions.push(createSuggestion({
      id: 'ceo_mastermind_conversion_playbook',
      title: 'Transformar gargalos do funil em playbook comercial',
      category: 'crescimento',
      target: 'Kentauros',
      summary: 'O MasterMind conectou leads, discovery, proposta, cliente e retencao; a proxima melhoria deve converter esses aprendizados em rotina executiva de conversao.',
      actionType: CEO_ACTION_TYPES.MASTERMIND_UPDATE,
      score: scoreInitiative({ commercial: 5, financial: 5, technical: 3, client: 5, urgency: 4, complexity: 3, risk: 3, reuse: 5, automation: 4 }),
      risk: 'baixo',
      impact: { conversion: 'alto', profit: 'alto', retention: 'medio' },
      evidence: [
        ...evidenceFromSignals(signals, ['funil', 'conversao', 'discovery', 'proposta', 'roadmap', 'retencao', 'cliente', 'roi']),
        `${staleLeadCount} lead(s) com risco de esfriar, ${clients.length} cliente(s) e ${projects.length} projeto(s) para correlacionar.`,
      ],
      actionPlan: [
        'Mapear o maior gargalo entre lead parado, discovery incompleto, proposta aberta e cliente sem roadmap.',
        'Criar playbook com responsavel, prazo, proxima acao e metrica de conversao.',
        'Registrar resultado semanal como aprendizado do MasterMind para alimentar novas sugestoes.',
      ],
    }));

    suggestions.push(createSuggestion({
      id: 'ceo_mastermind_open_proposal_roi_review',
      title: 'Revisar propostas abertas com reforco de ROI',
      category: 'crescimento',
      target: 'Kentauros',
      summary: 'O MasterMind ja transformou gargalos em playbook; a proxima alavanca e revisar propostas abertas com valor, ROI e proxima acao objetiva.',
      actionType: CEO_ACTION_TYPES.MASTERMIND_UPDATE,
      score: scoreInitiative({ commercial: 5, financial: 5, technical: 3, client: 5, urgency: 4, complexity: 3, risk: 3, reuse: 5, automation: 4 }),
      risk: 'baixo',
      impact: { conversion: 'alto', profit: 'alto', retention: 'medio' },
      evidence: [
        ...evidenceFromSignals(signals, ['proposta', 'roi', 'conversao', 'funil']),
        `${clients.length} cliente(s) e ${projects.length} projeto(s) para correlacionar com proposta e roadmap.`,
      ],
      actionPlan: [
        'Listar propostas abertas sem proxima acao, ROI explicito ou prazo definido.',
        'Criar recomendacao de follow-up consultivo com valor esperado e decisor responsavel.',
        'Registrar semanalmente conversao de proposta para cliente no MasterMind.',
      ],
    }));
  }

  if (textIncludesAny(allText, ['automacao', 'aprovacao humana', 'whatsapp', 'email', 'logs', 'auditoria', 'externa'])) {
    suggestions.push(createSuggestion({
      id: 'ceo_mastermind_automation_observability',
      title: 'Criar observabilidade para automacoes aprovadas pelo CEO',
      category: 'automacao',
      target: 'Kentauros',
      summary: 'O MasterMind reforca que automacoes externas precisam manter aprovacao humana, historico de execucao e aprendizado de resposta antes de novas escalas.',
      actionType: CEO_ACTION_TYPES.CREATE_AUTOMATION,
      score: scoreInitiative({ commercial: 4, financial: 4, technical: 4, client: 5, urgency: 4, complexity: 4, risk: 4, reuse: 5, automation: 5 }),
      risk: 'medio',
      impact: { operation: 'alto', conversion: 'medio', retention: 'alto' },
      evidence: [
        ...evidenceFromSignals(signals, ['automacao', 'aprovacao humana', 'whatsapp', 'email', 'logs', 'auditoria', 'externa']),
        `${activeAutomationCount} automacao(oes) ativa(s) para medir aprovacao, execucao e resposta.`,
      ],
      actionPlan: [
        'Padronizar log para aprovado, recusado, enviado, falhou, respondeu e virou oportunidade.',
        'Bloquear qualquer envio externo sem approvalRequest vinculado.',
        'Gerar aprendizado automatico do MasterMind com taxa de resposta e risco operacional.',
      ],
      skillCandidates: createSkillGovernanceRecommendation('automacao').candidates,
    }));

    suggestions.push(createSuggestion({
      id: 'ceo_mastermind_automation_response_dashboard',
      title: 'Criar painel de resposta das automacoes aprovadas',
      category: 'automacao',
      target: 'Kentauros',
      summary: 'Depois da observabilidade, o CEO deve acompanhar taxa de aprovado, enviado, falhou, respondeu e virou oportunidade para decidir se uma automacao merece escala.',
      actionType: CEO_ACTION_TYPES.CREATE_AUTOMATION,
      score: scoreInitiative({ commercial: 4, financial: 4, technical: 4, client: 5, urgency: 4, complexity: 4, risk: 4, reuse: 5, automation: 5 }),
      risk: 'medio',
      impact: { operation: 'alto', conversion: 'alto', retention: 'medio' },
      evidence: [
        ...evidenceFromSignals(signals, ['automacao', 'logs', 'aprovacao', 'resposta', 'oportunidade']),
        `${activeAutomationCount} automacao(oes) ativa(s) para medir resposta e escala.`,
      ],
      actionPlan: [
        'Agrupar logs por automacao e status executivo.',
        'Calcular taxa de resposta, falha e oportunidade por periodo.',
        'Gerar aprendizado automatico quando taxa de resposta cair ou falha subir.',
      ],
      skillCandidates: createSkillGovernanceRecommendation('automacao').candidates,
    }));
  }

  if (textIncludesAny(allText, ['design', 'ux', 'interface', 'tela', 'grid', 'layout', 'usabilidade'])) {
    suggestions.push(createSuggestion({
      id: 'ceo_mastermind_operational_ux_review',
      title: 'Revisar UX operacional das telas criticas',
      category: 'design',
      target: 'Kentauros',
      summary: 'O MasterMind sinaliza que clareza visual, grid, filtros e acoes afetam velocidade operacional e confianca do usuario nas telas comerciais.',
      actionType: CEO_ACTION_TYPES.MASTERMIND_UPDATE,
      score: scoreInitiative({ commercial: 4, financial: 3, technical: 4, client: 5, urgency: 4, complexity: 3, risk: 3, reuse: 4, automation: 3 }),
      risk: 'baixo',
      impact: { operation: 'alto', conversion: 'medio', retention: 'medio' },
      evidence: evidenceFromSignals(signals, ['design', 'ux', 'interface', 'tela', 'grid', 'layout', 'usabilidade']),
      actionPlan: [
        'Priorizar telas que bloqueiam trabalho: Leads, MasterMind CEO, Discovery e Clientes.',
        'Validar responsividade, truncamento de acoes e densidade visual.',
        'Registrar antes/depois no MasterMind com impacto em tempo operacional.',
      ],
      skillCandidates: createSkillGovernanceRecommendation('design').candidates,
    }));
  }

  if (textIncludesAny(allText, ['consulta economica', 'economizar tokens', 'tokens', 'hub diario', 'notas brutas', 'indices tematicos'])) {
    suggestions.push(createSuggestion({
      id: 'ceo_mastermind_token_efficient_context_pipeline',
      title: 'Automatizar consulta economica do MasterMind na tela CEO',
      category: 'governanca',
      target: 'MasterMind CEO',
      summary: 'O MasterMind agora possui protocolo de consulta por camadas; o CEO deve transformar essa regra em rotina operacional para evitar leitura excessiva da vault e manter sugestoes baseadas em sinais consolidados.',
      actionType: CEO_ACTION_TYPES.MASTERMIND_UPDATE,
      score: scoreInitiative({ commercial: 3, financial: 4, technical: 4, client: 4, urgency: 5, complexity: 3, risk: 3, reuse: 5, automation: 5 }),
      risk: 'baixo',
      impact: { governance: 'alto', operation: 'alto', cost: 'alto', reuse: 'alto' },
      evidence: evidenceFromSignals(signals, ['consulta economica', 'economizar tokens', 'tokens', 'hub diario', 'notas brutas', 'indices tematicos']),
      actionPlan: [
        'Usar Memoria_Ativa_CEO e hubs diarios como entrada primaria das sugestoes.',
        'Criar alerta quando a tela CEO depender de nota bruta repetida ou sem hub.',
        'Registrar no MasterMind quando uma sugestao nasce de hub consolidado ou de evidencia bruta.',
      ],
    }));

    suggestions.push(createSuggestion({
      id: 'ceo_mastermind_raw_context_consolidation_alert',
      title: 'Consolidar evidencias brutas que alimentam a tela CEO',
      category: 'governanca',
      target: 'MasterMind CEO',
      summary: 'Depois de automatizar a consulta economica, o CEO deve monitorar alertas de notas brutas repetidas ou sem hub e consolidar apenas o que realmente muda decisao, KPI, risco ou padrao.',
      actionType: CEO_ACTION_TYPES.MASTERMIND_UPDATE,
      score: scoreInitiative({ commercial: 3, financial: 4, technical: 4, client: 4, urgency: 4, complexity: 2, risk: 3, reuse: 5, automation: 4 }),
      risk: 'baixo',
      impact: { governance: 'alto', operation: 'alto', cost: 'alto', reuse: 'alto' },
      evidence: evidenceFromSignals(signals, ['consulta economica', 'economizar tokens', 'tokens', 'hub diario', 'notas brutas', 'indices tematicos']),
      actionPlan: [
        'Revisar alertas de contexto bruto na tela CEO.',
        'Criar ou atualizar hub quando houver nota bruta repetida, reuniao solta ou ApprovalRequest sem consolidacao.',
        'Manter sugestoes futuras baseadas em memoria ativa e hub antes de abrir evidencia original.',
      ],
    }));
  }

  if (textIncludesAny(allText, ['aprovacoes autonomas', 'aprovacao autonoma', 'approvalrequest', 'execucao sensivel', 'validacao ceo'])) {
    suggestions.push(createSuggestion({
      id: 'ceo_mastermind_autonomous_approval_governance',
      title: 'Revisar governanca de aprovacoes autonomas do MasterMind',
      category: 'governanca',
      target: 'MasterMind CEO',
      summary: 'O conhecimento novo mostra aprovacoes autonomas geradas como contexto; o CEO deve separar proposta, aprovacao humana e execucao sensivel para evitar automacao sem validacao.',
      actionType: CEO_ACTION_TYPES.MASTERMIND_UPDATE,
      score: scoreInitiative({ commercial: 4, financial: 4, technical: 4, client: 5, urgency: 5, complexity: 3, risk: 5, reuse: 5, automation: 4 }),
      risk: 'alto',
      impact: { governance: 'alto', operation: 'alto', security: 'medio', retention: 'medio' },
      evidence: evidenceFromSignals(signals, ['aprovacoes autonomas', 'aprovacao autonoma', 'approvalrequest', 'execucao sensivel', 'validacao ceo']),
      actionPlan: [
        'Classificar aprovacoes autonomas como contexto, proposta, aprovada para Codex ou aplicada.',
        'Bloquear execucao sensivel sem ApprovalRequest e criterio de encerramento.',
        'Atualizar o MasterMind quando uma aprovacao autonoma virar tarefa executavel.',
      ],
    }));
  }

  if (textIncludesAny(allText, ['integracao de ia', 'ia em projetos', 'arte new era', 'artenewera', 'autosocial', 'supersaas', 'caplead'])) {
    suggestions.push(createSuggestion({
      id: 'ceo_mastermind_ai_integration_reuse_map',
      title: 'Mapear reutilizacao de IA entre projetos Kentauros',
      category: 'ia',
      target: 'ArteNewEra, CapLead, AutoSocial e SuperSaas',
      summary: 'O conhecimento novo reforca integracao de IA como alavanca transversal; o CEO deve mapear quais padroes podem ser reutilizados antes de criar novos agents ou automacoes.',
      actionType: CEO_ACTION_TYPES.MASTERMIND_UPDATE,
      score: scoreInitiative({ commercial: 4, financial: 5, technical: 5, client: 4, urgency: 4, complexity: 4, risk: 3, reuse: 5, automation: 5 }),
      risk: 'medio',
      impact: { technical: 'alto', profit: 'alto', operation: 'alto', reuse: 'alto' },
      evidence: evidenceFromSignals(signals, ['integracao de ia', 'ia em projetos', 'artenewera', 'autosocial', 'supersaas', 'caplead']),
      actionPlan: [
        'Inventariar capacidades de IA ja usadas por projeto.',
        'Separar padroes reutilizaveis de automacoes especificas.',
        'Registrar matriz de reutilizacao antes de criar novo agent.',
      ],
      skillCandidates: createSkillGovernanceRecommendation('automacao').candidates,
    }));

    suggestions.push(createSuggestion({
      id: 'ceo_mastermind_ai_reuse_validation_kpi',
      title: 'Validar impacto da matriz de reutilizacao de IA',
      category: 'ia',
      target: 'ArteNewEra, CapLead, AutoSocial, Kentauros e SuperSaas',
      summary: 'Depois de mapear a reutilizacao de IA, o CEO deve medir quais padroes realmente reduzem retrabalho, aceleram entrega ou melhoram conversao antes de criar novos agents. ',
      actionType: CEO_ACTION_TYPES.MASTERMIND_UPDATE,
      score: scoreInitiative({ commercial: 4, financial: 5, technical: 4, client: 4, urgency: 4, complexity: 3, risk: 3, reuse: 5, automation: 4 }),
      risk: 'baixo',
      impact: { technical: 'alto', profit: 'alto', operation: 'alto', conversion: 'medio' },
      evidence: evidenceFromSignals(signals, ['integracao de ia', 'ia em projetos', 'artenewera', 'autosocial', 'supersaas', 'caplead']),
      actionPlan: [
        'Definir KPI de reutilizacao por padrao: tempo economizado, projetos impactados e reducao de retrabalho.',
        'Comparar agents ou automacoes propostas contra a matriz registrada.',
        'Promover para padrao interno apenas o que tiver evidencia de ganho operacional ou comercial.',
      ],
      skillCandidates: createSkillGovernanceRecommendation('automacao').candidates,
    }));

    suggestions.push(createSuggestion({
      id: 'ceo_mastermind_ai_reuse_standardization_playbook',
      title: 'Padronizar somente padroes de IA com impacto validado',
      category: 'ia',
      target: 'ArteNewEra, CapLead, AutoSocial, Kentauros e SuperSaas',
      summary: 'Depois de validar impacto da reutilizacao de IA, o CEO deve promover apenas padroes com ganho comprovado para playbook, template, service ou agent interno.',
      actionType: CEO_ACTION_TYPES.MASTERMIND_UPDATE,
      score: scoreInitiative({ commercial: 4, financial: 5, technical: 5, client: 4, urgency: 4, complexity: 3, risk: 3, reuse: 5, automation: 4 }),
      risk: 'baixo',
      impact: { technical: 'alto', profit: 'alto', operation: 'alto', conversion: 'medio' },
      evidence: evidenceFromSignals(signals, ['integracao de ia', 'ia em projetos', 'artenewera', 'autosocial', 'supersaas', 'caplead']),
      actionPlan: [
        'Converter padroes promovidos em playbook, template, service ou agent interno.',
        'Manter padroes sem evidencia como experimento com novo ciclo de medicao.',
        'Registrar no MasterMind quais projetos podem reaplicar o padrao e quais automacoes continuam bloqueadas.',
      ],
      skillCandidates: createSkillGovernanceRecommendation('automacao').candidates,
    }));
  }

  if (textIncludesAny(allText, ['marketing', 'receita', 'visibilidade', 'upsell', 'retencao', 'onboarding', 'contrato via ia', 'theme-primary'])) {
    suggestions.push(createSuggestion({
      id: 'ceo_mastermind_revenue_retention_kpi_board',
      title: 'Criar quadro KPI para receita, retencao e upsell do conhecimento novo',
      category: 'comercial',
      target: 'Kentauros',
      summary: 'O conhecimento novo cita marketing, receita, visibilidade, retencao, onboarding, upsell e contrato via IA; o CEO deve transformar esses sinais em KPIs acompanhaveis antes de novas automacoes.',
      actionType: CEO_ACTION_TYPES.MASTERMIND_UPDATE,
      score: scoreInitiative({ commercial: 5, financial: 5, technical: 3, client: 5, urgency: 5, complexity: 3, risk: 3, reuse: 5, automation: 4 }),
      risk: 'medio',
      impact: { conversion: 'alto', profit: 'alto', retention: 'alto', operation: 'medio' },
      evidence: evidenceFromSignals(signals, ['marketing', 'receita', 'visibilidade', 'upsell', 'retencao', 'onboarding', 'contrato via ia', 'theme-primary']),
      actionPlan: [
        'Separar metas em receita, visibilidade, upsell, retencao e onboarding.',
        'Definir dono, metrica, prazo e criterio de encerramento para cada KPI.',
        'Conectar o quadro ao Motor_de_Lucro e ao Backlog_de_Melhorias.',
      ],
    }));

    suggestions.push(createSuggestion({
      id: 'ceo_mastermind_revenue_kpi_validation_cycle',
      title: 'Validar KPIs de receita, retencao e upsell antes de automatizar',
      category: 'comercial',
      target: 'Kentauros',
      summary: 'Depois de criar o quadro KPI, o CEO deve medir baseline, responsavel, prazo e resultado real antes de liberar automacoes de marketing, onboarding, upsell ou contrato via IA.',
      actionType: CEO_ACTION_TYPES.MASTERMIND_UPDATE,
      score: scoreInitiative({ commercial: 5, financial: 5, technical: 3, client: 5, urgency: 4, complexity: 3, risk: 3, reuse: 5, automation: 3 }),
      risk: 'baixo',
      impact: { conversion: 'alto', profit: 'alto', retention: 'alto', operation: 'medio' },
      evidence: evidenceFromSignals(signals, ['marketing', 'receita', 'visibilidade', 'upsell', 'retencao', 'onboarding', 'contrato via ia', 'theme-primary']),
      actionPlan: [
        'Comparar baseline e resultado semanal dos KPIs de receita, visibilidade, upsell, retencao e onboarding.',
        'Identificar o KPI com maior impacto em lucro ou retencao antes de automatizar.',
        'Registrar somente automacoes aprovaveis com KPI, dono e criterio de encerramento.',
      ],
    }));
  }

  return suggestions;
};

const createSuggestion = ({
  id,
  title,
  category,
  summary,
  actionType,
  target = 'Kentauros',
  score,
  risk = 'medio',
  impact = {},
  evidence = [],
  actionPlan = [],
  skillCandidates = [],
}) => ({
  id,
  title,
  category,
  summary,
  actionType,
  target,
  risk,
  impact,
  evidence,
  actionPlan,
  skillCandidates,
  approvalRequired: true,
  status: 'suggested',
  score,
  generatedAt: new Date().toISOString(),
  mastermindUpdate: {
    title: `Aprendizado CEO - ${title}`,
    content: summary,
    tags: ['MasterMind', 'CEO', category, actionType],
    linkedProjects: ['Kentauros', 'CapLead'],
  },
});

export const createCodexSuggestionPrompt = (item = {}) => {
  const title = item.title || 'Sugestao CEO sem titulo';
  const summary = item.summary || item.metadata?.mastermindUpdate?.content || 'Sem resumo informado.';
  const actionType = item.actionType || 'mastermind_update';
  const risk = item.risk || 'medio';
  const impact = item.impact || item.metadata?.impact || {};
  const evidence = item.evidence || [];
  const actionPlan = item.actionPlan || [];
  const skillCandidates = item.skillCandidates || item.metadata?.skillCandidates || [];

  return [
    'Antes de executar esta melhoria, consulte o MasterMind CEO da Kentauros no Obsidian.',
    '',
    `Implemente a melhoria aprovada pelo CEO: ${title}`,
    '',
    `Resumo: ${summary}`,
    `Tipo de acao: ${actionType}`,
    `Risco percebido: ${risk}`,
    `Impacto esperado: ${Object.entries(impact).map(([key, value]) => `${key}: ${value}`).join(', ') || 'a validar'}`,
    '',
    'Evidencias:',
    ...(evidence.length ? evidence.map(item => `- ${item}`) : ['- Sem evidencias adicionais registradas.']),
    '',
    'Plano de acao sugerido:',
    ...(actionPlan.length ? actionPlan.map((item, index) => `${index + 1}. ${item}`) : ['1. Revisar contexto, implementar com segurança e validar.']),
    '',
    'Skills candidatas para avaliar antes de executar:',
    ...(skillCandidates.length ? skillCandidates.map(skill => `- ${skill.name}: ${skill.reason || skill.installPolicy || 'avaliar necessidade antes de instalar'}`) : ['- Nenhuma skill candidata obrigatoria.']),
    '',
    'Critérios obrigatórios:',
    '- Faça análise de impacto técnico, operacional, conversão, lucro e retenção antes de alterar.',
    '- Implemente somente o escopo aprovado, com testes quando houver comportamento novo.',
    '- Valide lint/build/testes aplicáveis.',
    '- Registre o aprendizado no MasterMind/Obsidian ao finalizar.',
    '- Marque a sugestão como aplicada na tela MasterMind CEO após concluir.',
  ].join('\n');
};

export const analyzeCapLeadKentaurosSecurity = ({
  leads = [],
  automations = [],
  approvalRequests = [],
} = {}) => {
  const risks = [];

  if (leads.some(lead => lead.source === 'CapLead' || lead.metadata?.capLeadSource)) {
    risks.push({
      id: 'caplead_import_audit',
      severity: 'high',
      title: 'Auditar importacao CapLead -> Kentauros',
      detail: 'O fluxo recebe dados externos e deve manter API key, CORS, deduplicacao, LGPD e logs de origem revisados.',
    });
  }

  if (automations.some(automation => automation.status === 'active' && !(automation.logs || []).length)) {
    risks.push({
      id: 'automation_without_logs',
      severity: 'medium',
      title: 'Automacoes ativas sem historico de execucao',
      detail: 'Automacao sem log reduz rastreabilidade e dificulta rollback em falha operacional.',
    });
  }

  if (!approvalRequests.some(item => item.metadata?.source === 'ceo_strategic_kernel')) {
    risks.push({
      id: 'missing_ceo_approval_loop',
      severity: 'medium',
      title: 'CEO sem fila historica de aprovacoes',
      detail: 'Decisoes autonomas precisam manter trilha de aprovacao humana antes de executar qualquer acao sensivel.',
    });
  }

  return risks;
};

const isProduction = (nodeEnv) => String(nodeEnv || '').toLowerCase() === 'production';

const hasWildcardCors = (allowedOrigins = '') =>
  String(allowedOrigins || '')
    .split(',')
    .map(origin => origin.trim())
    .some(origin => origin === '*' || origin === 'null' || !origin);

const hasAutomationHumanApproval = (automation = {}) =>
  automation.metadata?.requiresHumanApproval === true ||
  automation.requiresHumanApproval === true ||
  automation.params?.requiresHumanApproval === true;

const isExternalAutomation = (automation = {}) =>
  /followup|follow_up|whatsapp|email|send|api|external/i.test(`${automation.action || ''} ${automation.name || ''}`);

const createFinding = ({ id, severity, title, detail, fix, evidence = [] }) => ({
  id,
  severity,
  title,
  detail,
  fix,
  evidence,
});

export const createCapLeadKentaurosSecurityAudit = ({
  environment = {},
  leads = [],
  automations = [],
  approvalRequests = [],
} = {}) => {
  const findings = [];
  const controls = [];
  const nodeEnv = environment.nodeEnv || process.env.NODE_ENV || 'development';
  const allowedOrigins = environment.allowedOrigins ?? process.env.CAPLEAD_IMPORT_ALLOWED_ORIGINS ?? '';
  const capLeadImportApiKeyConfigured = Boolean(
    environment.capLeadImportApiKeyConfigured ?? process.env.CAPLEAD_IMPORT_API_KEY
  );

  if (isProduction(nodeEnv) && !capLeadImportApiKeyConfigured) {
    findings.push(createFinding({
      id: 'caplead_import_api_key_missing',
      severity: 'critical',
      title: 'API key de importacao CapLead ausente em producao',
      detail: 'Sem API key obrigatoria, o endpoint pode receber dados externos nao autorizados.',
      fix: 'Configurar CAPLEAD_IMPORT_API_KEY em producao e enviar x-caplead-api-key pelo CapLead.',
      evidence: ['CAPLEAD_IMPORT_API_KEY nao configurada para ambiente production.'],
    }));
  } else {
    controls.push({ id: 'caplead_import_api_key', status: 'passed', detail: 'API key obrigatoria em producao configurada ou ambiente local.' });
  }

  if (isProduction(nodeEnv) && hasWildcardCors(allowedOrigins)) {
    findings.push(createFinding({
      id: 'caplead_cors_wildcard_production',
      severity: 'high',
      title: 'CORS permissivo no endpoint CapLead -> Kentauros',
      detail: 'CORS wildcard em producao amplia superficie de abuso do endpoint de importacao.',
      fix: 'Definir CAPLEAD_IMPORT_ALLOWED_ORIGINS com dominios oficiais, separados por virgula.',
      evidence: [`CAPLEAD_IMPORT_ALLOWED_ORIGINS=${allowedOrigins || '(vazio)'}`],
    }));
  } else {
    controls.push({ id: 'caplead_import_cors', status: 'passed', detail: 'CORS de producao restrito aos dominios configurados.' });
  }

  if (leads.some(lead => lead.source === 'CapLead' || lead.metadata?.capLeadSource)) {
    controls.push({ id: 'caplead_origin_detected', status: 'reviewed', detail: 'Fluxo CapLead identificado e auditado.' });
  }

  automations
    .filter(automation => String(automation.status || 'active').toLowerCase() === 'active')
    .forEach((automation) => {
      if (!(automation.logs || []).length) {
        findings.push(createFinding({
          id: 'automation_without_logs',
          severity: 'medium',
          title: 'Automacao ativa sem historico de execucao',
          detail: 'Sem logs, nao ha trilha para rollback, auditoria ou aprendizado do MasterMind.',
          fix: 'Registrar createAutomationLog a cada execucao, skip, erro ou pending_approval.',
          evidence: [`automation:${automation.id || automation.name || 'sem_id'}`],
        }));
      }

      if (isExternalAutomation(automation) && !hasAutomationHumanApproval(automation)) {
        findings.push(createFinding({
          id: 'external_automation_without_human_approval',
          severity: 'high',
          title: 'Automacao externa sem aprovacao humana explicita',
          detail: 'WhatsApp, email ou API externa nao devem executar sem aprovacao humana registrada.',
          fix: 'Adicionar metadata.requiresHumanApproval=true e criar ApprovalRequest antes de qualquer envio externo.',
          evidence: [`automation:${automation.id || automation.name || 'sem_id'}`],
        }));
      }
    });

  if (!approvalRequests.some(item => item.metadata?.source === 'ceo_strategic_kernel')) {
    findings.push(createFinding({
      id: 'missing_ceo_approval_loop',
      severity: 'medium',
      title: 'Fila historica de aprovacoes CEO ausente',
      detail: 'Decisoes sensiveis precisam de trilha de aprovacao humana antes da execucao.',
      fix: 'Gerar ApprovalRequest para auditorias, skills, automacoes e mudancas sensiveis aprovadas pelo CEO.',
      evidence: ['Nenhum approvalRequest com source ceo_strategic_kernel.'],
    }));
  } else {
    controls.push({ id: 'ceo_approval_loop', status: 'passed', detail: 'Fila CEO possui trilha de aprovacao.' });
  }

  const blocked = findings.some(item => ['critical', 'high'].includes(item.severity));
  const generatedAt = new Date().toISOString();

  return {
    level: 'L2',
    scope: ['CapLead import', 'Kentauros API', 'CORS', 'API keys', 'Automacoes', 'Aprovacoes CEO'],
    verdict: blocked ? 'BLOQUEADO' : 'APROVADO',
    generatedAt,
    findings,
    controls,
    mitigations: findings.map(item => ({
      findingId: item.id,
      severity: item.severity,
      fix: item.fix,
    })),
    mastermindEntry: {
      title: 'Auditoria CEO de seguranca - CapLead e Kentauros',
      status: 'Auditoria executada',
      summary: blocked
        ? 'Auditoria encontrou riscos que bloqueiam escala ate mitigacao.'
        : 'Auditoria aprovou controles principais para o fluxo CapLead -> Kentauros.',
      tags: ['MasterMind', 'CEO', 'Seguranca', 'CapLead', 'Kentauros'],
      linkedProjects: ['Kentauros', 'CapLead'],
      generatedAt,
    },
  };
};

export const createCapLeadHardeningPlan = ({
  dependencyAudit = [],
  artifacts = [],
  secrets = [],
  env = {},
  automations = [],
} = {}) => {
  const releaseBlockers = [];
  const mitigations = [];
  const acceptedRisks = [];
  const highDependencies = dependencyAudit.filter(item =>
    ['high', 'critical', 'alto', 'critico'].includes(String(item.severity || '').toLowerCase())
  );

  if (highDependencies.length) {
    releaseBlockers.push({
      category: 'dependencies',
      title: 'Dependencias high/critical no CapLead',
      detail: highDependencies.map(item => item.package || item.name).filter(Boolean).join(', '),
      fix: 'Atualizar, substituir ou isolar dependencias antes de ampliar distribuicao.',
    });
  }

  if (secrets.length) {
    releaseBlockers.push({
      category: 'secrets',
      title: 'Possivel segredo em artefato local ou codigo',
      detail: `${secrets.length} ocorrencia(s) precisam de rotacao e remocao.`,
      fix: 'Remover do workspace, rotacionar credenciais e registrar evidencia no MasterMind.',
    });
  }

  if (!env.CAPLEAD_IMPORT_API_KEY) {
    releaseBlockers.push({
      category: 'environment',
      title: 'CAPLEAD_IMPORT_API_KEY ausente',
      detail: 'Importacao CapLead -> Kentauros sem chave bloqueia escala segura.',
      fix: 'Configurar chave em producao e validar header x-caplead-api-key.',
    });
  }

  if (String(env.CAPLEAD_IMPORT_ALLOWED_ORIGINS || '').includes('*')) {
    releaseBlockers.push({
      category: 'cors',
      title: 'CORS permissivo',
      detail: 'Origem wildcard nao deve ser usada em producao.',
      fix: 'Restringir origins para dominios Kentauros e CapLead aprovados.',
    });
  }

  if (artifacts.length) {
    mitigations.push({
      category: 'artifacts',
      title: 'Artefatos locais fora do release',
      detail: `${artifacts.length} artefato(s) devem ser ignorados ou removidos antes do pacote final.`,
      fix: 'Atualizar .gitignore/.npmignore e revisar dist, scratch e logs.',
    });
  }

  if (automations.some(item => String(item.status || 'active').toLowerCase() === 'active' && !(item.logs || []).length)) {
    mitigations.push({
      category: 'automation_logs',
      title: 'Automacoes ativas sem historico',
      detail: 'A escala deve exigir observabilidade e approvalRequest para envios externos.',
      fix: 'Registrar logs e bloquear envio externo sem aprovacao humana vinculada.',
    });
  }

  dependencyAudit
    .filter(item => String(item.severity || '').toLowerCase() === 'moderate')
    .forEach(item => acceptedRisks.push({
      category: 'dependencies',
      title: `Dependencia moderada: ${item.package || item.name}`,
      deadline: 'proximo ciclo de manutencao',
      rationale: item.fixAvailable ? 'Mitigavel com atualizacao planejada.' : 'Sem fix automatico no momento.',
    }));

  const blocked = releaseBlockers.length > 0;

  return {
    verdict: blocked ? 'BLOQUEADO' : 'APROVADO_COM_MONITORAMENTO',
    releaseBlockers,
    mitigations,
    acceptedRisks,
    learningEvent: {
      source: 'mastermind_ceo',
      event_type: 'caplead_hardening_plan_applied',
      title: 'Plano de hardening CapLead antes da escala',
      content: blocked
        ? `${releaseBlockers.length} bloqueador(es) impedem escala ampla do CapLead.`
        : 'CapLead sem bloqueadores criticos, manter monitoramento de riscos aceitos.',
      signal_strength: blocked ? 5 : 4,
      tags: ['MasterMind', 'CEO', 'Seguranca', 'CapLead'],
      metadata: {
        releaseGate: {
          blocked,
          blockers: releaseBlockers.map(item => item.category),
        },
        mitigations,
        acceptedRisks,
      },
    },
  };
};

const extractTableNames = (sql = '') => {
  const names = new Set();
  const createRegex = /create\s+table(?:\s+if\s+not\s+exists)?\s+(?:public\.)?([a-zA-Z_][\w]*)/gi;
  let match = createRegex.exec(sql);
  while (match) {
    names.add(match[1]);
    match = createRegex.exec(sql);
  }
  return Array.from(names);
};

const hasRlsEnabled = (sql = '', table) => (
  new RegExp(`alter\\s+table\\s+(?:public\\.)?${table}\\s+enable\\s+row\\s+level\\s+security`, 'i').test(sql)
);

const tablePolicies = (sql = '', table) => {
  const regex = new RegExp(`create\\s+policy[\\s\\S]*?on\\s+(?:public\\.)?${table}\\s+[\\s\\S]*?(?=;|$)`, 'gi');
  return sql.match(regex) || [];
};

const hasTenantIndex = (sql = '', table) => (
  new RegExp(`create\\s+(?:unique\\s+)?index[\\s\\S]*?on\\s+(?:public\\.)?${table}\\s*\\([^)]*tenant_id`, 'i').test(sql)
);

export const analyzeSupabaseRlsGovernance = ({
  sql = '',
  criticalTables = ['leads', 'lead_contacts', 'approval_requests', 'learning_events', 'workflow_runs', 'operational_records'],
} = {}) => {
  const tables = Array.from(new Set([...criticalTables, ...extractTableNames(sql)]))
    .filter(Boolean)
    .map((name) => {
      const policies = tablePolicies(sql, name);
      const anonWildcardPolicies = policies.filter(policy =>
        /anon/i.test(policy) && /(using\s*\(\s*true\s*\)|with\s+check\s*\(\s*true\s*\))/i.test(policy)
      );
      return {
        name,
        rlsEnabled: hasRlsEnabled(sql, name),
        policyCount: policies.length,
        anonWildcardPolicies: anonWildcardPolicies.length,
        hasTenantIndex: hasTenantIndex(sql, name),
      };
    });

  const findings = [];
  if (/drop\s+table\s+if\s+exists/i.test(sql)) {
    findings.push({
      id: 'destructive_migration',
      severity: 'alto',
      title: 'Migration destrutiva detectada',
      detail: 'O SQL contem DROP TABLE IF EXISTS, exigindo backup, rollback e segregacao de ambiente antes de producao.',
      fix: 'Separar bootstrap local de migrations de producao e exigir plano de rollback.',
    });
  }

  const missingRls = tables.filter(table => !table.rlsEnabled);
  if (missingRls.length) {
    findings.push({
      id: 'rls_disabled',
      severity: 'alto',
      title: 'Tabela critica sem RLS habilitada',
      detail: `${missingRls.map(item => item.name).join(', ')} sem ENABLE ROW LEVEL SECURITY detectado.`,
      fix: 'Habilitar RLS e adicionar politicas restritivas por tenant/usuario antes de uso multiusuario.',
    });
  }

  const anonWildcard = tables.filter(table => table.anonWildcardPolicies > 0);
  if (anonWildcard.length) {
    findings.push({
      id: 'anon_policy_wildcard',
      severity: 'alto',
      title: 'Politicas anonimas amplas detectadas',
      detail: `${anonWildcard.map(item => item.name).join(', ')} possuem USING(true) ou WITH CHECK(true) em politica anonima.`,
      fix: 'Trocar politicas anonimas amplas por regras tenant-aware/auth-aware e mover escrita sensivel para funcoes server-side.',
    });
  }

  const missingIndex = tables.filter(table => table.rlsEnabled && !table.hasTenantIndex);
  if (missingIndex.length) {
    findings.push({
      id: 'missing_rls_index',
      severity: 'medio',
      title: 'Indice ausente para coluna usada em RLS',
      detail: `${missingIndex.map(item => item.name).join(', ')} precisam de indice em tenant_id ou colunas usadas em politicas.`,
      fix: 'Criar indices nas colunas usadas por politicas RLS, especialmente tenant_id e user_id.',
    });
  }

  const verdict = findings.some(item => item.severity === 'alto')
    ? 'BLOQUEADO'
    : findings.length ? 'REVISAR' : 'APROVADO';

  return {
    source: 'supabase_rls_governance',
    verdict,
    tables,
    findings,
    recommendations: [
      'Remover DROP TABLE de migrations destinadas a producao.',
      'Substituir politicas anonimas amplas por checks tenant-aware/auth-aware.',
      'Indexar colunas usadas em RLS para evitar regressao de performance.',
      'Manter API key/CORS como baseline e restringir escrita sensivel a serverless functions.',
    ],
    learningEvent: {
      source: 'security_review',
      event_type: 'supabase_rls_governance_review',
      title: 'Revisao CEO de RLS e permissoes Supabase',
      content: `Revisao Supabase/RLS concluida com veredicto ${verdict}: ${findings.map(item => item.title).join('; ') || 'sem achados bloqueantes'}.`,
      signal_strength: verdict === 'BLOQUEADO' ? 5 : 4,
      tags: ['CEO', 'Security', 'Supabase', 'RLS', verdict],
      metadata: {
        source: 'ceo_mastermind_supabase_rls_governance',
        verdict,
        findings,
        tables,
      },
    },
  };
};

const countMatches = (text = '', regex) => (text.match(regex) || []).length;

const SUPABASE_RLS_PRODUCTION_MIGRATION_SQL = `-- Kentauros Supabase RLS hardening plan
-- Requires authenticated Supabase sessions with tenant_id and user_id in JWT app_metadata or user_metadata.
-- Serverless imports must use SUPABASE_SERVICE_ROLE_KEY after this migration.

create or replace function public.current_app_tenant_id()
returns text
language sql
stable
as $$
  select nullif(coalesce(
    auth.jwt() -> 'app_metadata' ->> 'tenant_id',
    auth.jwt() -> 'user_metadata' ->> 'tenant_id'
  ), '')
$$;

create or replace function public.current_app_user_id()
returns integer
language sql
stable
as $$
  select nullif(coalesce(
    auth.jwt() -> 'app_metadata' ->> 'user_id',
    auth.jwt() -> 'user_metadata' ->> 'user_id'
  ), '')::integer
$$;

create or replace function public.current_app_role()
returns text
language sql
stable
as $$
  select nullif(coalesce(
    auth.jwt() -> 'app_metadata' ->> 'role',
    auth.jwt() -> 'user_metadata' ->> 'role'
  ), '')
$$;

create or replace function public.is_app_admin()
returns boolean
language sql
stable
as $$
  select public.current_app_role() in ('admin', 'super_admin')
$$;

create index if not exists lead_contacts_lead_tenant_lookup_idx
  on public.leads (id, tenant_id, user_id);

create index if not exists captured_leads_registry_tenant_user_idx
  on public.captured_leads_registry (tenant_id, captured_by_user_id)
  where tenant_id is not null;

drop policy if exists "Allow app anon lead reads" on public.leads;
drop policy if exists "Allow app anon lead writes" on public.leads;
drop policy if exists "Allow app anon lead updates" on public.leads;

create policy "Tenant lead reads" on public.leads
  for select to authenticated
  using (tenant_id = public.current_app_tenant_id() and (public.is_app_admin() or user_id = public.current_app_user_id()));
create policy "Tenant lead writes" on public.leads
  for insert to authenticated
  with check (tenant_id = public.current_app_tenant_id() and (public.is_app_admin() or user_id = public.current_app_user_id()));
create policy "Tenant lead updates" on public.leads
  for update to authenticated
  using (tenant_id = public.current_app_tenant_id() and (public.is_app_admin() or user_id = public.current_app_user_id()))
  with check (tenant_id = public.current_app_tenant_id() and (public.is_app_admin() or user_id = public.current_app_user_id()));

drop policy if exists "Allow app anon lead contact reads" on public.lead_contacts;
drop policy if exists "Allow app anon lead contact writes" on public.lead_contacts;
drop policy if exists "Allow app anon lead contact deletes" on public.lead_contacts;

create policy "Tenant lead contact reads" on public.lead_contacts
  for select to authenticated
  using (exists (
    select 1 from public.leads
    where leads.id = lead_contacts.lead_id
      and leads.tenant_id = public.current_app_tenant_id()
      and (public.is_app_admin() or leads.user_id = public.current_app_user_id())
  ));
create policy "Tenant lead contact writes" on public.lead_contacts
  for insert to authenticated
  with check (exists (
    select 1 from public.leads
    where leads.id = lead_contacts.lead_id
      and leads.tenant_id = public.current_app_tenant_id()
      and (public.is_app_admin() or leads.user_id = public.current_app_user_id())
  ));
create policy "Tenant lead contact deletes" on public.lead_contacts
  for delete to authenticated
  using (exists (
    select 1 from public.leads
    where leads.id = lead_contacts.lead_id
      and leads.tenant_id = public.current_app_tenant_id()
      and (public.is_app_admin() or leads.user_id = public.current_app_user_id())
  ));

drop policy if exists "Allow app anon operational reads" on public.operational_records;
drop policy if exists "Allow app anon operational writes" on public.operational_records;
drop policy if exists "Allow app anon operational updates" on public.operational_records;

create policy "Tenant operational reads" on public.operational_records
  for select to authenticated
  using (tenant_id = public.current_app_tenant_id());
create policy "Tenant operational writes" on public.operational_records
  for insert to authenticated
  with check (tenant_id = public.current_app_tenant_id());
create policy "Tenant operational updates" on public.operational_records
  for update to authenticated
  using (tenant_id = public.current_app_tenant_id())
  with check (tenant_id = public.current_app_tenant_id());

drop policy if exists "Allow app anon tenant reads" on public.tenants;
drop policy if exists "Allow app anon tenant writes" on public.tenants;
drop policy if exists "Allow app anon tenant updates" on public.tenants;
create policy "Tenant self reads" on public.tenants for select to authenticated using (id = public.current_app_tenant_id() or public.is_app_admin());
create policy "Admin tenant writes" on public.tenants for insert to authenticated with check (public.is_app_admin());
create policy "Admin tenant updates" on public.tenants for update to authenticated using (public.is_app_admin()) with check (public.is_app_admin());

drop policy if exists "Allow app anon profile reads" on public.user_profiles;
drop policy if exists "Allow app anon profile writes" on public.user_profiles;
drop policy if exists "Allow app anon profile updates" on public.user_profiles;
create policy "Tenant profile reads" on public.user_profiles for select to authenticated using (tenant_id = public.current_app_tenant_id() and (public.is_app_admin() or id = public.current_app_user_id()));
create policy "Admin profile writes" on public.user_profiles for insert to authenticated with check (tenant_id = public.current_app_tenant_id() and public.is_app_admin());
create policy "Admin profile updates" on public.user_profiles for update to authenticated using (tenant_id = public.current_app_tenant_id() and public.is_app_admin()) with check (tenant_id = public.current_app_tenant_id() and public.is_app_admin());

drop policy if exists "Allow app anon permission reads" on public.role_permissions;
drop policy if exists "Allow app anon permission writes" on public.role_permissions;
drop policy if exists "Allow app anon permission updates" on public.role_permissions;
create policy "Authenticated permission reads" on public.role_permissions for select to authenticated using (true);
create policy "Admin permission writes" on public.role_permissions for insert to authenticated with check (public.is_app_admin());
create policy "Admin permission updates" on public.role_permissions for update to authenticated using (public.is_app_admin()) with check (public.is_app_admin());

drop policy if exists "Allow app anon meeting reads" on public.meetings;
drop policy if exists "Allow app anon meeting writes" on public.meetings;
drop policy if exists "Allow app anon meeting updates" on public.meetings;
create policy "Tenant meeting reads" on public.meetings for select to authenticated using (tenant_id = public.current_app_tenant_id());
create policy "Tenant meeting writes" on public.meetings for insert to authenticated with check (tenant_id = public.current_app_tenant_id());
create policy "Tenant meeting updates" on public.meetings for update to authenticated using (tenant_id = public.current_app_tenant_id()) with check (tenant_id = public.current_app_tenant_id());

drop policy if exists "Allow app anon approval reads" on public.approval_requests;
drop policy if exists "Allow app anon approval writes" on public.approval_requests;
drop policy if exists "Allow app anon approval updates" on public.approval_requests;
create policy "Tenant approval reads" on public.approval_requests for select to authenticated using (tenant_id = public.current_app_tenant_id());
create policy "Tenant approval writes" on public.approval_requests for insert to authenticated with check (tenant_id = public.current_app_tenant_id());
create policy "Tenant approval updates" on public.approval_requests for update to authenticated using (tenant_id = public.current_app_tenant_id()) with check (tenant_id = public.current_app_tenant_id());

drop policy if exists "Allow app anon learning reads" on public.learning_events;
drop policy if exists "Allow app anon learning writes" on public.learning_events;
drop policy if exists "Allow app anon learning updates" on public.learning_events;
create policy "Tenant learning reads" on public.learning_events for select to authenticated using (tenant_id = public.current_app_tenant_id());
create policy "Tenant learning writes" on public.learning_events for insert to authenticated with check (tenant_id = public.current_app_tenant_id());
create policy "Tenant learning updates" on public.learning_events for update to authenticated using (tenant_id = public.current_app_tenant_id()) with check (tenant_id = public.current_app_tenant_id());

drop policy if exists "Allow app anon workflow reads" on public.workflow_runs;
drop policy if exists "Allow app anon workflow writes" on public.workflow_runs;
drop policy if exists "Allow app anon workflow updates" on public.workflow_runs;
create policy "Tenant workflow reads" on public.workflow_runs for select to authenticated using (tenant_id = public.current_app_tenant_id());
create policy "Tenant workflow writes" on public.workflow_runs for insert to authenticated with check (tenant_id = public.current_app_tenant_id());
create policy "Tenant workflow updates" on public.workflow_runs for update to authenticated using (tenant_id = public.current_app_tenant_id()) with check (tenant_id = public.current_app_tenant_id());

drop policy if exists "Users see own captured leads" on public.captured_leads_registry;
drop policy if exists "Users insert own captured leads" on public.captured_leads_registry;
drop policy if exists "Users update own captured leads" on public.captured_leads_registry;
drop policy if exists "Allow anon reads captured_leads" on public.captured_leads_registry;
drop policy if exists "Allow anon insert captured_leads" on public.captured_leads_registry;
drop policy if exists "Allow anon update captured_leads" on public.captured_leads_registry;

create policy "Tenant captured lead reads" on public.captured_leads_registry
  for select to authenticated
  using (tenant_id = public.current_app_tenant_id() and (public.is_app_admin() or captured_by_user_id = public.current_app_user_id()::text));
create policy "Tenant captured lead writes" on public.captured_leads_registry
  for insert to authenticated
  with check (tenant_id = public.current_app_tenant_id() and (public.is_app_admin() or captured_by_user_id = public.current_app_user_id()::text or captured_by_user_id is null));
create policy "Tenant captured lead updates" on public.captured_leads_registry
  for update to authenticated
  using (tenant_id = public.current_app_tenant_id() and (public.is_app_admin() or captured_by_user_id = public.current_app_user_id()::text))
  with check (tenant_id = public.current_app_tenant_id() and (public.is_app_admin() or captured_by_user_id = public.current_app_user_id()::text));
`;

const SUPABASE_RLS_ROLLBACK_SQL = `-- ROLLBACK PLAN: restore previous permissive development policies only if production is blocked.
-- Use after database backup and CEO approval.
-- 1. Drop policies created by 20260520120000_harden_rls_policies.sql.
-- 2. Recreate the former anon policies for local/dev only.
-- 3. Re-open MEL-0007 as #risco-ativo in MasterMind if rollback is used.
`;

export const createSupabaseRlsCorrectionPlan = ({ sql = '' } = {}) => {
  const inventory = analyzeSupabaseRlsGovernance({ sql });
  const destructiveDropCount = countMatches(sql, /drop\s+table\s+if\s+exists/gi);
  const anonWildcardPolicyCount = countMatches(sql, /create\s+policy[\s\S]*?(anon|using\s*\(\s*true\s*\)|with\s+check\s*\(\s*true\s*\))/gi);
  const tenantIndexCount = countMatches(sql, /create\s+(?:unique\s+)?index[\s\S]*?\([^)]*tenant_id/gi);
  const blocked = inventory.verdict === 'BLOQUEADO' || destructiveDropCount > 0 || anonWildcardPolicyCount > 0;

  return {
    verdict: blocked ? 'BLOQUEADO_ATE_MIGRATION_SEGURA' : 'APROVADO_COM_MONITORAMENTO',
    inventory,
    evidence: {
      destructiveDropCount,
      anonWildcardPolicyCount,
      tenantIndexCount,
      findingCount: inventory.findings.length,
    },
    executionChecklist: [
      'Gerar backup do banco antes da migration de hardening.',
      'Confirmar que frontend usa sessao autenticada com tenant_id, user_id e role em JWT metadata.',
      'Confirmar que endpoints serverless usam SUPABASE_SERVICE_ROLE_KEY para imports autorizados.',
      'Aplicar migration tenant-aware em homologacao antes de producao.',
      'Executar smoke test de login, leads, approval_requests, learning_events e operational_records.',
      'Atualizar Riscos_e_Governanca para #risco-monitoramento apenas apos evidencia validada.',
    ],
    migrationPhases: [
      'Fase 1: remover DROP TABLE do fluxo de producao e manter apenas como bootstrap local.',
      'Fase 2: criar helpers current_app_tenant_id, current_app_user_id e is_app_admin.',
      'Fase 3: trocar policies anonimas por policies authenticated tenant-aware.',
      'Fase 4: adicionar indices tenant-aware para colunas usadas em RLS e joins.',
      'Fase 5: validar endpoints serverless via service role e frontend via auth.',
    ],
    productionMigrationSql: SUPABASE_RLS_PRODUCTION_MIGRATION_SQL,
    rollbackSql: SUPABASE_RLS_ROLLBACK_SQL,
    learningEvent: {
      source: 'security_review',
      event_type: 'supabase_rls_correction_plan',
      title: 'Plano executavel de correcao Supabase/RLS',
      content: blocked
        ? 'Plano criou migration tenant-aware e rollback, mas producao permanece bloqueada ate validar auth/JWT e service role.'
        : 'Plano RLS sem bloqueadores criticos, manter monitoramento.',
      signal_strength: blocked ? 5 : 4,
      tags: ['CEO', 'Security', 'Supabase', 'RLS', blocked ? 'BLOQUEADO' : 'MONITORAMENTO'],
      metadata: {
        source: 'ceo_mastermind_supabase_rls_execution_plan',
        evidence: {
          destructiveDropCount,
          anonWildcardPolicyCount,
          tenantIndexCount,
        },
      },
    },
  };
};

const ENVIRONMENT_PROVIDER_RULES = [
  { pattern: /SUPABASE/i, provider: 'Supabase', area: 'Dados/Auth' },
  { pattern: /DATABASE_URL/i, provider: 'Banco de dados', area: 'Dados' },
  { pattern: /REDIS/i, provider: 'Redis', area: 'Fila/Cache' },
  { pattern: /CAPLEAD/i, provider: 'Kentauros/CapLead', area: 'Integracao comercial' },
  { pattern: /SMTP|EMAIL|GMAIL/i, provider: 'Email/SMTP', area: 'Comunicacao' },
  { pattern: /BING|GOOGLE|SERP|PLACES|CSE/i, provider: 'Busca externa', area: 'Captura de leads' },
  { pattern: /GEMINI|GROQ|OPENAI|ANTHROPIC/i, provider: 'IA', area: 'IA/Agents' },
  { pattern: /JWT|AUTH/i, provider: 'Autenticacao', area: 'Seguranca' },
  { pattern: /WHATSAPP|EVOLUTION/i, provider: 'WhatsApp/Evolution API', area: 'Comercial' },
  { pattern: /VERCEL/i, provider: 'Vercel', area: 'Deploy/CI' },
];

const classifyEnvironmentVariable = (name = '') => {
  const normalized = String(name || '').toUpperCase();
  const matchedRule = ENVIRONMENT_PROVIDER_RULES.find(rule => rule.pattern.test(normalized));
  const isSecret = /KEY|SECRET|TOKEN|PASS|PASSWORD|DATABASE_URL|JWT|SERVICE_ROLE|API_KEY/i.test(normalized);
  const isPublic = /^(VITE_|NEXT_PUBLIC_)/.test(normalized);
  const isProductionCritical = /DATABASE_URL|SUPABASE|SERVICE_ROLE|JWT|CAPLEAD_IMPORT_API_KEY|SMTP_PASS|OPENAI|ANTHROPIC|GEMINI|GROQ|EVOLUTION_API_KEY/i.test(normalized);

  return {
    provider: matchedRule?.provider || 'Aplicacao',
    area: matchedRule?.area || 'Configuracao',
    exposure: isPublic ? 'publica/browser' : 'servidor/local',
    criticality: isProductionCritical ? 'alta' : isSecret ? 'media' : 'baixa',
    rotationCadence: isSecret ? '90 dias ou imediatamente apos exposicao' : 'quando houver mudanca de ambiente',
    owner: matchedRule?.area === 'Comercial' ? 'Comercial/Operacao' : matchedRule?.area === 'IA/Agents' ? 'CTO/IA' : 'CTO/Deploy',
    failureImpact: isProductionCritical
      ? 'Pode bloquear deploy, autenticacao, dados, captura ou comunicacao critica.'
      : isSecret
        ? 'Pode degradar integracoes ou gerar risco de acesso indevido.'
        : 'Pode afetar configuracao, URL publica ou comportamento operacional.',
  };
};

const normalizeEnvironmentNames = (environments = []) => {
  const normalized = environments.length ? environments : ['local', 'preview/homologacao', 'producao'];
  return normalized.map(item => String(item).trim()).filter(Boolean).join(', ');
};

export const createSecretEnvironmentMatrix = ({ projects = [], generatedAt = '2026-05-20' } = {}) => {
  const rows = projects.flatMap(project => {
    const variables = project.variables || [];
    return variables.map(variable => {
      const name = typeof variable === 'string' ? variable : variable.name;
      const classification = classifyEnvironmentVariable(name);

      return {
        project: project.name,
        variable: name,
        environments: normalizeEnvironmentNames(variable.environments || project.environments),
        provider: variable.provider || classification.provider,
        area: variable.area || classification.area,
        exposure: variable.exposure || classification.exposure,
        criticality: variable.criticality || classification.criticality,
        owner: variable.owner || classification.owner,
        rotationCadence: variable.rotationCadence || classification.rotationCadence,
        failureImpact: variable.failureImpact || classification.failureImpact,
        status: variable.status || 'mapear valor real e dono antes de producao',
        evidence: variable.evidence || project.evidence || [],
      };
    });
  });

  const highCriticalityCount = rows.filter(row => row.criticality === 'alta').length;
  const secretLikeCount = rows.filter(row => /KEY|SECRET|TOKEN|PASS|PASSWORD|DATABASE_URL|JWT|SERVICE_ROLE|API_KEY/i.test(row.variable)).length;
  const requiresRotationCount = rows.filter(row => /exposto|hardcoded|rotacionar|rotate/i.test(row.status)).length;

  return {
    generatedAt,
    summary: {
      projects: projects.length,
      variables: rows.length,
      highCriticality: highCriticalityCount,
      secretLike: secretLikeCount,
      requiresRotation: requiresRotationCount,
      verdict: requiresRotationCount > 0 ? 'BLOQUEADO_ATE_ROTACAO_DE_SEGREDOS' : 'APROVADO_COM_MONITORAMENTO',
    },
    rows,
    deployChecklist: [
      'Confirmar .env.example completo e sem valores reais.',
      'Validar que .env, .env.local e arquivos equivalentes estao fora do git.',
      'Separar variaveis de local, preview/homologacao e producao.',
      'Registrar dono, provedor e data de rotacao para cada segredo.',
      'Executar health check antes de promover preview para producao.',
      'Rotacionar imediatamente qualquer chave encontrada em arquivo versionavel, build empacotado ou codigo-fonte.',
      'Promover producao somente apos teste de login, captura, importacao CapLead, envio de email e integracoes externas.',
    ],
    learningEvent: {
      source: 'security_review',
      event_type: 'secret_environment_matrix',
      title: 'Matriz de segredos e variaveis por ambiente',
      content: 'Segredos devem ser governados por projeto, ambiente, dono, rotacao e impacto de falha antes de novos deploys ou automacoes externas.',
      signal_strength: 5,
      tags: ['CEO', 'Security', 'Deploy', 'EnvVars', requiresRotationCount > 0 ? 'BLOQUEADO' : 'MONITORAMENTO'],
      metadata: {
        source: 'ceo_mastermind_secret_inventory_execution',
        summary: {
          variables: rows.length,
          highCriticality: highCriticalityCount,
          requiresRotation: requiresRotationCount,
        },
      },
    },
  };
};

const DEFAULT_AI_REUSE_PROJECTS = [
  {
    name: 'ArteNewEra',
    technologies: ['Gemini', 'Groq', 'Next.js'],
    capabilities: ['geracao criativa', 'layout com IA', 'comunicacao automatizada'],
    automations: ['esteira criativa'],
  },
  {
    name: 'CapLead',
    technologies: ['Gemini', 'Playwright', 'Puppeteer'],
    capabilities: ['enriquecimento de lead', 'layout com IA', 'exportacao por lote'],
    automations: ['captura local', 'exportacao enriquecida'],
  },
  {
    name: 'AutoSocial',
    technologies: ['OpenAI', 'Anthropic', 'BullMQ'],
    capabilities: ['geracao de conteudo', 'agendamento social', 'fila de automacao'],
    automations: ['publicacao social'],
  },
  {
    name: 'Kentauros',
    technologies: ['OpenCode', 'Google Places', 'Supabase'],
    capabilities: ['orquestracao de agents', 'importacao de leads', 'follow-up aprovado'],
    automations: ['follow-up aprovado', 'sugestoes CEO'],
  },
  {
    name: 'SuperSaas',
    technologies: ['OpenCode', 'IA', 'React'],
    capabilities: ['orquestracao de agents', 'workflow SaaS', 'backlog agentico'],
    automations: ['kanban agentico'],
  },
];

const normalizeAiCapability = value =>
  String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const inferAiReuseCategory = capability => {
  const normalized = normalizeAiCapability(capability);
  if (/lead|prospecc|captur|export|comercial/.test(normalized)) return 'lead_intelligence';
  if (/layout|design|criativ|conteudo|copy|social/.test(normalized)) return 'content_design';
  if (/agent|orquestr|workflow|backlog|fila|automacao/.test(normalized)) return 'agent_workflow';
  if (/follow|comunic|email|whatsapp/.test(normalized)) return 'customer_communication';
  return 'ai_capability';
};

const normalizeAiProject = project => ({
  name: project.name || project.project || 'Projeto sem nome',
  technologies: (project.technologies || project.tecnologias || [])
    .map(item => String(item).trim())
    .filter(Boolean),
  capabilities: (project.capabilities || project.capacidades || [])
    .map(item => String(item).trim())
    .filter(Boolean),
  automations: (project.automations || project.automacoes || [])
    .map(item => String(item).trim())
    .filter(Boolean),
});

export const createAiReuseMatrix = ({ projects = [], generatedAt = '2026-05-20' } = {}) => {
  const normalizedProjects = (projects.length ? projects : DEFAULT_AI_REUSE_PROJECTS).map(normalizeAiProject);
  const rows = normalizedProjects.flatMap(project =>
    project.capabilities.map(capability => ({
      project: project.name,
      capability,
      category: inferAiReuseCategory(capability),
      technologies: project.technologies,
      automations: project.automations,
    }))
  );

  const capabilityGroups = rows.reduce((acc, row) => {
    const key = normalizeAiCapability(row.capability);
    acc[key] = acc[key] || { capability: row.capability, category: row.category, projects: [], technologies: new Set() };
    acc[key].projects.push(row.project);
    row.technologies.forEach(technology => acc[key].technologies.add(technology));
    return acc;
  }, {});

  const categoryGroups = rows.reduce((acc, row) => {
    acc[row.category] = acc[row.category] || { capability: row.category, category: row.category, projects: [], technologies: new Set() };
    if (!acc[row.category].projects.includes(row.project)) {
      acc[row.category].projects.push(row.project);
    }
    row.technologies.forEach(technology => acc[row.category].technologies.add(technology));
    return acc;
  }, {});

  const exactPatterns = Object.values(capabilityGroups)
    .filter(group => new Set(group.projects).size > 1)
    .map(group => ({
      capability: group.capability,
      category: group.category,
      projects: Array.from(new Set(group.projects)),
      technologies: Array.from(group.technologies),
      reuseRule: 'Transformar em checklist, template, service ou playbook antes de criar novo agent.',
    }));

  const categoryPatterns = Object.values(categoryGroups)
    .filter(group => group.projects.length > 1)
    .map(group => ({
      capability: group.capability,
      category: group.category,
      projects: group.projects,
      technologies: Array.from(group.technologies),
      reuseRule: 'Validar se existe padrao transversal reaproveitavel antes de especializar por projeto.',
    }));

  const patternKeys = new Set();
  const reusablePatterns = [...exactPatterns, ...categoryPatterns].filter(pattern => {
    const key = `${pattern.category}:${normalizeAiCapability(pattern.capability)}`;
    if (patternKeys.has(key)) return false;
    patternKeys.add(key);
    return true;
  });

  const reusableCapabilityKeys = new Set(exactPatterns.map(pattern => normalizeAiCapability(pattern.capability)));
  const projectSpecificAutomations = normalizedProjects.flatMap(project => {
    const specificCapabilities = project.capabilities.filter(capability => !reusableCapabilityKeys.has(normalizeAiCapability(capability)));
    return project.automations.map(automation => ({
      project: project.name,
      automation,
      specificCapabilities,
      governance: 'Exige ApprovalRequest antes de acao externa, execucao sensivel ou novo agent.',
    }));
  });

  return {
    generatedAt,
    summary: {
      projects: normalizedProjects.length,
      capabilities: rows.length,
      reusablePatterns: reusablePatterns.length,
      projectSpecificAutomations: projectSpecificAutomations.length,
      verdict: 'MATRIZ_REGISTRADA_COM_GATE_DE_REUTILIZACAO',
    },
    rows,
    reusablePatterns,
    projectSpecificAutomations,
    agentCreationGate: 'BLOQUEADO_ATE_MATRIZ_REUTILIZACAO_APROVADA',
    decisionRule: 'Novo agent ou automacao so deve nascer quando a matriz mostrar que nao existe padrao reutilizavel suficiente ou quando houver justificativa CEO aprovada.',
    impactAnalysis: {
      technical: 'Reduz duplicacao de stacks, prompts, integrações e agentes entre projetos.',
      operation: 'Cria trilha de decisao antes de automatizar fluxos sensiveis.',
      conversion: 'Reaproveita IA em leads, follow-up e personalizacao comercial com menos retrabalho.',
      profit: 'Transforma capacidade de IA em ativo reutilizavel, reduz custo marginal e acelera entrega.',
      retention: 'Melhora consistencia de atendimento, onboarding e evolucao de clientes.',
    },
    learningEvent: {
      source: 'mastermind_update',
      event_type: 'ai_reuse_matrix',
      title: 'Matriz de reutilizacao de IA entre projetos Kentauros',
      content: `${reusablePatterns.length} padrao(oes) de IA reutilizaveis mapeados antes de criar novos agents ou automacoes.`,
      signal_strength: 5,
      tags: ['MasterMind', 'CEO', 'IA', 'Reutilizacao', 'Governanca'],
      metadata: {
        source: 'ceo_mastermind_ai_integration_reuse_map',
        projectNames: normalizedProjects.map(project => project.name),
        reusablePatterns: reusablePatterns.map(pattern => pattern.capability),
        agentCreationGate: 'BLOQUEADO_ATE_MATRIZ_REUTILIZACAO_APROVADA',
      },
    },
  };
};

export const createAiReuseImpactValidation = ({
  patterns = [],
  generatedAt = '2026-05-20',
} = {}) => {
  const sourcePatterns = patterns.length ? patterns : [
    {
      name: 'layout com IA',
      projects: ['ArteNewEra', 'CapLead'],
      timeSavedHours: 8,
      reworkReductionPercent: 25,
      conversionLiftPercent: 5,
      proposedAgents: ['agent-layout-reuse'],
    },
    {
      name: 'inteligencia de leads',
      projects: ['CapLead', 'Kentauros'],
      timeSavedHours: 10,
      reworkReductionPercent: 30,
      conversionLiftPercent: 8,
      proposedAgents: ['agent-lead-enrichment'],
    },
    {
      name: 'workflow agentico',
      projects: ['Kentauros', 'SuperSaas'],
      timeSavedHours: 6,
      reworkReductionPercent: 20,
      conversionLiftPercent: 0,
      proposedAgents: ['agent-workflow-governance'],
    },
  ];

  const kpis = sourcePatterns.map(pattern => {
    const impactedProjects = new Set(pattern.projects || []).size;
    const timeSavedHours = Number(pattern.timeSavedHours || 0);
    const reworkReductionPercent = Number(pattern.reworkReductionPercent || 0);
    const conversionLiftPercent = Number(pattern.conversionLiftPercent || 0);
    const operationalGainScore = timeSavedHours + reworkReductionPercent + (impactedProjects * 5) + conversionLiftPercent;
    const shouldPromote =
      impactedProjects >= 2 &&
      timeSavedHours >= 6 &&
      reworkReductionPercent >= 20 &&
      operationalGainScore >= 40;

    return {
      pattern: pattern.name || pattern.pattern || 'Padrao IA sem nome',
      impactedProjects,
      projects: pattern.projects || [],
      timeSavedHours,
      reworkReductionPercent,
      conversionLiftPercent,
      operationalGainScore,
      proposedAgents: pattern.proposedAgents || [],
      status: shouldPromote ? 'promote_to_internal_standard' : 'needs_more_evidence',
      decision: shouldPromote
        ? 'Promover para padrao interno antes de criar novo agent especializado.'
        : 'Manter como experimento; bloquear novo agent ate haver evidencia de ganho operacional ou comercial.',
      successCriteria: 'Medir tempo economizado, projetos impactados, retrabalho reduzido e conversao por ciclo antes de automatizar.',
    };
  });

  const promoted = kpis.filter(kpi => kpi.status === 'promote_to_internal_standard');
  const blocked = kpis.filter(kpi => kpi.status === 'needs_more_evidence');

  return {
    generatedAt,
    summary: {
      patterns: kpis.length,
      promoted: promoted.length,
      blocked: blocked.length,
      totalTimeSavedHours: kpis.reduce((sum, kpi) => sum + kpi.timeSavedHours, 0),
      averageReworkReductionPercent: kpis.length
        ? Math.round(kpis.reduce((sum, kpi) => sum + kpi.reworkReductionPercent, 0) / kpis.length)
        : 0,
    },
    kpis,
    promotedPatterns: promoted,
    blockedPatterns: blocked,
    agentAutomationGate: 'BLOQUEADO_ATE_EVIDENCIA_DE_GANHO',
    promotionRule: 'Padrao de IA so vira agent, automacao ou playbook interno quando impactar 2+ projetos e demonstrar economia de tempo, reducao de retrabalho ou ganho comercial mensuravel.',
    impactAnalysis: {
      technical: 'Alto: evita criar agents duplicados e promove somente padroes comprovados.',
      operation: 'Alto: mede tempo economizado e reducao de retrabalho por padrao.',
      conversion: 'Medio: exige lift comercial quando o padrao tocar funil, lead ou cliente.',
      profit: 'Alto: direciona investimento de IA para capacidades com ganho mensuravel.',
      retention: 'Medio: padroes comprovados reduzem variabilidade de entrega ao cliente.',
    },
    learningEvent: {
      source: 'mastermind_update',
      event_type: 'ai_reuse_impact_validation',
      title: 'Validacao de impacto da matriz de reutilizacao de IA',
      content: `${promoted.length} padrao(oes) de IA com evidencia suficiente para promocao interna e ${blocked.length} bloqueado(s) ate novo ciclo de medicao.`,
      signal_strength: 5,
      tags: ['MasterMind', 'CEO', 'IA', 'Reutilizacao', 'KPI', 'Governanca'],
      metadata: {
        source: 'ceo_mastermind_ai_reuse_validation_kpi',
        promotedPatterns: promoted.map(kpi => kpi.pattern),
        blockedPatterns: blocked.map(kpi => kpi.pattern),
        agentAutomationGate: 'BLOQUEADO_ATE_EVIDENCIA_DE_GANHO',
      },
    },
  };
};

const REVENUE_RETENTION_KPI_DEFAULTS = {
  receita: {
    owner: 'CEO/Comercial',
    metric: 'receita nova assinada e margem por contrato',
    target: 'Aumentar receita vencida e manter margem alinhada ao perfil de oferta.',
    dueInDays: 7,
    successCriteria: 'Receita, margem, proposta relacionada e proxima acao registradas semanalmente.',
    relatedSignals: ['receita', 'lucro', 'margem', 'contrato'],
  },
  visibilidade: {
    owner: 'CMO/Marketing',
    metric: 'leads qualificados originados por canais de visibilidade',
    target: 'Transformar visibilidade em oportunidades qualificadas para discovery.',
    dueInDays: 14,
    successCriteria: 'Canal, volume, qualidade do lead e taxa para discovery acompanhados por ciclo.',
    relatedSignals: ['marketing', 'visibilidade', 'conteudo'],
  },
  upsell: {
    owner: 'CEO/Comercial',
    metric: 'percentual de clientes com oportunidade de upsell mapeada',
    target: 'Mapear upsells com valor, timing e proposta de valor antes de automatizar oferta.',
    dueInDays: 14,
    successCriteria: '40% do faturamento potencial em upsells identificado com proxima acao.',
    relatedSignals: ['upsell', 'one-click', 'cross-sell'],
  },
  retencao: {
    owner: 'CS/Operacao',
    metric: 'retencao, churn e clientes com roadmap ativo',
    target: 'Manter retencao alta e reduzir risco de churn com evolucao clara.',
    dueInDays: 14,
    successCriteria: 'Clientes ativos com roadmap, risco de churn e proxima entrega registrados.',
    relatedSignals: ['retencao', 'churn', 'cliente'],
  },
  onboarding: {
    owner: 'COO/Entrega',
    metric: 'tempo ate kickoff e churn de onboarding',
    target: 'Reduzir friccao inicial e acelerar primeiro valor percebido.',
    dueInDays: 7,
    successCriteria: 'Kickoff, responsavel, bloqueios e primeiro valor entregavel definidos para novos clientes.',
    relatedSignals: ['onboarding', 'ativacao', 'entrega'],
  },
};

const normalizeKpiArea = area =>
  String(area || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

export const createRevenueRetentionKpiBoard = ({
  signals = [],
  kpis = [],
  generatedAt = '2026-05-20',
} = {}) => {
  const signalText = compactText(signals).toLowerCase();
  const selectedAreas = kpis.length
    ? kpis.map(item => normalizeKpiArea(item.area || item.category || item.name))
    : Object.keys(REVENUE_RETENTION_KPI_DEFAULTS).filter(area =>
      REVENUE_RETENTION_KPI_DEFAULTS[area].relatedSignals.some(signal => signalText.includes(signal)) ||
      ['receita', 'visibilidade', 'upsell', 'retencao', 'onboarding'].includes(area)
    );

  const uniqueAreas = Array.from(new Set(selectedAreas.length ? selectedAreas : Object.keys(REVENUE_RETENTION_KPI_DEFAULTS)))
    .filter(area => REVENUE_RETENTION_KPI_DEFAULTS[area]);

  const rows = uniqueAreas.map(area => {
    const custom = kpis.find(item => normalizeKpiArea(item.area || item.category || item.name) === area) || {};
    const defaults = REVENUE_RETENTION_KPI_DEFAULTS[area];
    return {
      id: `kpi_${area}`,
      area,
      title: custom.title || `KPI CEO - ${area}`,
      owner: custom.owner || defaults.owner,
      metric: custom.metric || defaults.metric,
      target: custom.target || defaults.target,
      dueInDays: Number(custom.dueInDays || defaults.dueInDays),
      successCriteria: custom.successCriteria || defaults.successCriteria,
      status: custom.status || 'baseline_required',
      approvalRequiredBeforeAutomation: true,
      relatedLinks: custom.relatedLinks || ['Motor_de_Lucro', 'Backlog_de_Melhorias', 'Estrategia_de_Conversao_de_Clientes'],
    };
  });

  return {
    generatedAt,
    summary: {
      total: rows.length,
      areas: rows.map(row => row.area),
      owners: Array.from(new Set(rows.map(row => row.owner))),
      baselineRequired: rows.filter(row => row.status === 'baseline_required').length,
    },
    kpis: rows,
    automationGate: 'BLOQUEADO_ATE_KPI_BASELINE_E_APPROVALREQUEST',
    connections: ['Motor_de_Lucro', 'Backlog_de_Melhorias', 'Estrategia_de_Conversao_de_Clientes', 'Estrategia_de_Retencao_de_Clientes', 'Memoria_Ativa_CEO'],
    impactAnalysis: {
      technical: 'Baixo/medio: organiza dados e criterios antes de novas automacoes comerciais.',
      operation: 'Medio: cria rotina executiva com dono, prazo e criterio de encerramento.',
      conversion: 'Alto: transforma marketing, visibilidade e proposta em funil mensuravel.',
      profit: 'Alto: conecta receita, margem e upsell ao Motor_de_Lucro.',
      retention: 'Alto: liga onboarding, churn e roadmap de cliente a acompanhamento recorrente.',
    },
    learningEvent: {
      source: 'mastermind_update',
      event_type: 'revenue_retention_kpi_board',
      title: 'Quadro KPI para receita, retencao e upsell',
      content: `${rows.length} KPI(s) CEO definidos com dono, metrica, prazo e criterio de encerramento antes de novas automacoes.`,
      signal_strength: 5,
      tags: ['MasterMind', 'CEO', 'Comercial', 'Lucro', 'Retencao', 'Upsell'],
      metadata: {
        source: 'ceo_mastermind_revenue_retention_kpi_board',
        areas: rows.map(row => row.area),
        automationGate: 'BLOQUEADO_ATE_KPI_BASELINE_E_APPROVALREQUEST',
        connections: ['Motor_de_Lucro', 'Backlog_de_Melhorias'],
      },
    },
  };
};

const normalizeKpiNumber = value => {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const kpiBlockers = (kpi = {}) => {
  const blockers = [];
  if (normalizeKpiNumber(kpi.baseline ?? kpi.currentBaseline) === null) blockers.push('baseline_missing');
  if (!String(kpi.owner || '').trim()) blockers.push('owner_missing');
  if (!Number(kpi.dueInDays || kpi.reviewDueInDays || 0)) blockers.push('deadline_missing');
  if (!String(kpi.successCriteria || '').trim()) blockers.push('success_criteria_missing');
  if (normalizeKpiNumber(kpi.weeklyResult ?? kpi.currentResult) === null) blockers.push('weekly_result_missing');
  return blockers;
};

const calculateKpiDelta = (baseline, weeklyResult) => {
  if (baseline === null || weeklyResult === null) return null;
  return weeklyResult - baseline;
};

const normalizeValidationKpi = (input = {}) => {
  const area = normalizeKpiArea(input.area || input.category || input.name);
  const defaults = REVENUE_RETENTION_KPI_DEFAULTS[area] || {};
  const baseline = normalizeKpiNumber(input.baseline ?? input.currentBaseline);
  const weeklyResult = normalizeKpiNumber(input.weeklyResult ?? input.currentResult);
  const target = normalizeKpiNumber(input.targetValue ?? input.target);
  const blockers = kpiBlockers({ ...defaults, ...input });
  const delta = calculateKpiDelta(baseline, weeklyResult);
  const targetMet = target === null || weeklyResult === null ? false : weeklyResult >= target;
  const impactScore = Number(input.profitImpact || 0) + Number(input.retentionImpact || 0) + Number(input.conversionImpact || 0);

  return {
    id: `kpi_validation_${area || 'unknown'}`,
    area,
    owner: input.owner || defaults.owner || 'CEO',
    metric: input.metric || defaults.metric || 'KPI CEO',
    baseline,
    weeklyResult,
    target,
    delta,
    targetMet,
    dueInDays: Number(input.dueInDays || defaults.dueInDays || 7),
    successCriteria: input.successCriteria || defaults.successCriteria || '',
    status: blockers.length ? 'blocked' : targetMet ? 'validated' : 'monitoring',
    blockers,
    impactScore,
    automationApprovalStatus: blockers.length ? 'blocked' : 'ready_for_approval_request',
  };
};

export const createRevenueRetentionKpiValidation = ({
  kpis = [],
  generatedAt = '2026-05-20',
} = {}) => {
  const rows = (kpis.length ? kpis : createRevenueRetentionKpiBoard().kpis).map(normalizeValidationKpi);
  const approvableAutomations = rows
    .filter(row => row.automationApprovalStatus === 'ready_for_approval_request')
    .map(row => ({
      id: `automation_candidate_${row.area}`,
      area: row.area,
      owner: row.owner,
      metric: row.metric,
      baseline: row.baseline,
      weeklyResult: row.weeklyResult,
      delta: row.delta,
      successCriteria: row.successCriteria,
      approvalRequired: true,
      closureCriteria: `Automacao so pode iniciar se ${row.metric} mantiver medicao semanal e criterio: ${row.successCriteria}`,
    }));
  const priorityKpi = rows
    .filter(row => row.automationApprovalStatus === 'ready_for_approval_request')
    .sort((a, b) => b.impactScore - a.impactScore || Math.abs(b.delta || 0) - Math.abs(a.delta || 0))[0] || null;

  return {
    generatedAt,
    rows,
    priorityKpi,
    approvableAutomations,
    automationGate: 'BLOQUEADO_PARA_KPIS_SEM_BASELINE_DONO_PRAZO_OU_CRITERIO',
    summary: {
      total: rows.length,
      readyForApproval: approvableAutomations.length,
      blocked: rows.filter(row => row.status === 'blocked').length,
      monitoring: rows.filter(row => row.status === 'monitoring').length,
      validated: rows.filter(row => row.status === 'validated').length,
      priorityArea: priorityKpi?.area || null,
    },
    decisionRule: 'Automacoes de marketing, onboarding, upsell ou contrato via IA so podem seguir quando KPI tiver baseline, dono, prazo, resultado semanal e criterio de encerramento.',
    impactAnalysis: {
      technical: 'Baixo: valida regra executiva sem criar automacao externa.',
      operation: 'Medio: exige dono, prazo e resultado semanal antes de acao.',
      conversion: 'Alto: prioriza KPIs com impacto comercial mensuravel.',
      profit: 'Alto: identifica maior impacto em lucro antes de automatizar.',
      retention: 'Alto: protege retencao e onboarding contra automacao prematura.',
    },
    learningEvent: {
      source: 'mastermind_update',
      event_type: 'revenue_retention_kpi_validation',
      title: 'Validacao de KPIs de receita, retencao e upsell antes de automatizar',
      content: `${rows.length} KPI(s) revisados; ${approvableAutomations.length} automacao(oes) podem virar ApprovalRequest e ${rows.filter(row => row.status === 'blocked').length} permanecem bloqueadas por falta de baseline, dono, prazo, resultado ou criterio.`,
      signal_strength: 5,
      tags: ['MasterMind', 'CEO', 'Comercial', 'KPI', 'Lucro', 'Retencao'],
      metadata: {
        source: 'ceo_mastermind_revenue_kpi_validation_cycle',
        suggestionId: 'ceo_mastermind_revenue_kpi_validation_cycle',
        automationGate: 'BLOQUEADO_PARA_KPIS_SEM_BASELINE_DONO_PRAZO_OU_CRITERIO',
        readyForApproval: approvableAutomations.length,
        blocked: rows.filter(row => row.status === 'blocked').length,
        priorityArea: priorityKpi?.area || null,
      },
    },
  };
};

const countByStatus = (items = []) =>
  items.reduce((acc, item) => {
    const status = String(item.status || 'unknown').toLowerCase();
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

const commercialSnapshot = ({ leads = [], discoveries = [], proposals = [], clients = [] } = {}) => {
  const qualifiedLeads = leads.filter(lead => ['qualified', 'discovery', 'proposal', 'won'].includes(String(lead.status || '').toLowerCase())).length;
  const discoveryStarted = discoveries.length + leads.filter(lead => String(lead.status || '').toLowerCase() === 'discovery').length;
  const proposalCount = proposals.length + leads.filter(lead => String(lead.status || '').toLowerCase() === 'proposal').length;
  const convertedClients = clients.length + leads.filter(lead => ['won', 'client'].includes(String(lead.status || '').toLowerCase())).length;
  const proposalValue = proposals.reduce((sum, proposal) => sum + Number(proposal.value || proposal.expectedValue || 0), 0);
  const wonValue = proposals
    .filter(proposal => ['approved', 'signed', 'won'].includes(String(proposal.status || '').toLowerCase()))
    .reduce((sum, proposal) => sum + Number(proposal.value || proposal.expectedValue || 0), 0);

  return {
    leads: leads.length,
    qualifiedLeads,
    discoveries: discoveryStarted,
    proposals: proposalCount,
    clients: convertedClients,
    proposalValue,
    wonValue,
    leadToDiscoveryRate: leads.length ? Math.round((discoveryStarted / leads.length) * 100) : 0,
    discoveryToProposalRate: discoveryStarted ? Math.round((proposalCount / discoveryStarted) * 100) : 0,
    proposalToClientRate: proposalCount ? Math.round((convertedClients / proposalCount) * 100) : 0,
    statusBreakdown: {
      leads: countByStatus(leads),
      discoveries: countByStatus(discoveries),
      proposals: countByStatus(proposals),
      clients: countByStatus(clients),
    },
  };
};

export const createCommercialImpactAudit = ({
  before = {},
  after = {},
  recommendations = [],
  source = 'Sugestao CEO aplicada - Priorizar recomendacoes comerciais do MasterMind',
  generatedAt = '2026-05-20',
} = {}) => {
  const beforeSnapshot = commercialSnapshot(before);
  const afterSnapshot = commercialSnapshot(after);
  const deltas = {
    leadToDiscoveryRate: afterSnapshot.leadToDiscoveryRate - beforeSnapshot.leadToDiscoveryRate,
    discoveryToProposalRate: afterSnapshot.discoveryToProposalRate - beforeSnapshot.discoveryToProposalRate,
    proposalToClientRate: afterSnapshot.proposalToClientRate - beforeSnapshot.proposalToClientRate,
    wonValue: afterSnapshot.wonValue - beforeSnapshot.wonValue,
  };

  const kpis = [
    {
      name: 'Lead -> Discovery',
      before: beforeSnapshot.leadToDiscoveryRate,
      after: afterSnapshot.leadToDiscoveryRate,
      delta: deltas.leadToDiscoveryRate,
      target: 25,
      relatedRecommendation: 'Priorizar leads prontos para discovery.',
    },
    {
      name: 'Discovery -> Proposta',
      before: beforeSnapshot.discoveryToProposalRate,
      after: afterSnapshot.discoveryToProposalRate,
      delta: deltas.discoveryToProposalRate,
      target: 40,
      relatedRecommendation: 'Concluir discovery antes de proposta.',
    },
    {
      name: 'Proposta -> Cliente',
      before: beforeSnapshot.proposalToClientRate,
      after: afterSnapshot.proposalToClientRate,
      delta: deltas.proposalToClientRate,
      target: 30,
      relatedRecommendation: 'Reforcar ROI, prazo e proxima acao das propostas.',
    },
    {
      name: 'Receita vencida/assinada',
      before: beforeSnapshot.wonValue,
      after: afterSnapshot.wonValue,
      delta: deltas.wonValue,
      target: beforeSnapshot.wonValue,
      relatedRecommendation: 'Medir lucro antes de escalar automacoes comerciais.',
    },
  ];

  const gaps = kpis
    .filter(kpi => kpi.name === 'Receita vencida/assinada' ? kpi.delta <= 0 : kpi.after < kpi.target)
    .map(kpi => ({
      kpi: kpi.name,
      problem: kpi.name === 'Receita vencida/assinada'
        ? 'Receita convertida ainda nao aumentou apos recomendacao aplicada.'
        : `KPI abaixo da meta minima de ${kpi.target}%.`,
      evidence: `Antes: ${kpi.before}; Depois: ${kpi.after}; Delta: ${kpi.delta}.`,
      successCriteria: kpi.name === 'Receita vencida/assinada'
        ? 'Registrar aumento de receita vencida ou justificativa comercial validada.'
        : `Atingir pelo menos ${kpi.target}% por 1 ciclo semanal antes de automatizar.`,
      relatedRecommendation: kpi.relatedRecommendation,
    }));

  return {
    generatedAt,
    source,
    maturity: gaps.length ? 'needs_more_evidence' : 'mature',
    recommendations: recommendations.length ? recommendations : [
      'Priorizar recomendacoes comerciais do MasterMind',
      'Revisar funil CapLead -> Kentauros',
    ],
    before: beforeSnapshot,
    after: afterSnapshot,
    kpis,
    gaps,
    automationGate: gaps.length
      ? 'BLOQUEADO_ATE_KPI_E_CRITERIO_DE_CONCLUSAO'
      : 'APROVADO_PARA_AVALIAR_AUTOMACAO_COM_APPROVALREQUEST',
    learningEvent: {
      source: 'mastermind_update',
      event_type: 'commercial_impact_audit',
      title: 'Auditoria de impacto real das recomendacoes comerciais aplicadas',
      content: gaps.length
        ? `${gaps.length} lacuna(s) comerciais ainda precisam de KPI e criterio de conclusao antes de automacao.`
        : 'Recomendacoes comerciais possuem evidencia suficiente para avaliar proxima automacao com aprovacao.',
      signal_strength: gaps.length ? 5 : 4,
      tags: ['MasterMind', 'CEO', 'Comercial', 'Conversao', 'Lucro', 'Retencao'],
      metadata: {
        source: 'ceo_mastermind_commercial_impact_audit_21',
        kpis,
        gaps,
        automationGate: gaps.length
          ? 'BLOQUEADO_ATE_KPI_E_CRITERIO_DE_CONCLUSAO'
          : 'APROVADO_PARA_AVALIAR_AUTOMACAO_COM_APPROVALREQUEST',
      },
    },
  };
};

const COMMERCIAL_GAP_DEFAULTS = {
  lead: {
    owner: 'CMO/Comercial',
    metric: 'percentual de leads com proxima acao definida',
    dueInDays: 7,
    successCriteria: '80% dos leads elegiveis com proxima acao, responsavel e prazo.',
  },
  discovery: {
    owner: 'COO/Operacao',
    metric: 'taxa lead qualificado -> discovery iniciado',
    dueInDays: 10,
    successCriteria: '25% dos leads qualificados iniciando discovery no ciclo.',
  },
  proposta: {
    owner: 'CEO/Comercial',
    metric: 'taxa proposta -> cliente e propostas com ROI/prazo',
    dueInDays: 7,
    successCriteria: '90% das propostas abertas com ROI, proxima acao e prazo de decisao.',
  },
  onboarding: {
    owner: 'COO/Entrega',
    metric: 'tempo ate kickoff e churn de onboarding',
    dueInDays: 14,
    successCriteria: 'Kickoff agendado e risco de churn de onboarding abaixo de 3%.',
  },
  retencao: {
    owner: 'CS/Operacao',
    metric: 'clientes com roadmap de retencao',
    dueInDays: 14,
    successCriteria: '80% dos clientes ativos com proxima evolucao registrada.',
  },
  upsell: {
    owner: 'CEO/Comercial',
    metric: 'receita potencial de upsell identificada',
    dueInDays: 14,
    successCriteria: 'Lista de oportunidades de upsell com valor, proxima acao e aprovacao.',
  },
};

export const createCommercialGapExecutionBoard = ({
  gaps = [],
  generatedAt = '2026-05-20',
  source = 'Auditoria de impacto comercial das recomendacoes aplicadas',
} = {}) => {
  const normalizedGaps = gaps.length ? gaps : Object.keys(COMMERCIAL_GAP_DEFAULTS).map(area => ({
    area,
    problem: `Lacuna de ${area} precisa de execucao rastreavel antes de automacao.`,
  }));

  const tasks = normalizedGaps.map((gap, index) => {
    const area = String(gap.area || gap.category || gap.kpi || 'lead').toLowerCase();
    const normalizedArea = Object.keys(COMMERCIAL_GAP_DEFAULTS).find(key => area.includes(key)) || 'lead';
    const defaults = COMMERCIAL_GAP_DEFAULTS[normalizedArea];
    const dueInDays = Number(gap.dueInDays || defaults.dueInDays);

    return {
      id: `commercial_gap_${normalizedArea}_${index + 1}`,
      area: normalizedArea,
      title: gap.title || `Resolver lacuna comercial de ${normalizedArea}`,
      problem: gap.problem || gap.evidence || `Lacuna comercial em ${normalizedArea}.`,
      owner: gap.owner || defaults.owner,
      metric: gap.metric || defaults.metric,
      dueInDays,
      priority: gap.priority || (['lead', 'proposta'].includes(normalizedArea) ? 'alta' : 'media'),
      status: gap.status || 'aprovavel',
      approvalRequired: true,
      automationBlockedUntilApproval: true,
      successCriteria: gap.successCriteria || defaults.successCriteria,
      nextAction: gap.nextAction || 'Criar tarefa CEO com evidencia, responsavel e prazo antes de automatizar.',
      relatedKpi: gap.kpi || defaults.metric,
    };
  });

  return {
    generatedAt,
    source,
    summary: {
      total: tasks.length,
      byArea: tasks.reduce((acc, task) => {
        acc[task.area] = (acc[task.area] || 0) + 1;
        return acc;
      }, {}),
      approvalRequired: tasks.filter(task => task.approvalRequired).length,
      automationBlocked: tasks.filter(task => task.automationBlockedUntilApproval).length,
    },
    tasks,
    learningEvent: {
      source: 'mastermind_update',
      event_type: 'commercial_gap_execution_board',
      title: 'Quadro CEO mensuravel de lacunas comerciais',
      content: `${tasks.length} lacuna(s) comerciais convertidas em tarefas aprovaveis com dono, metrica, prazo e criterio de conclusao.`,
      signal_strength: 5,
      tags: ['MasterMind', 'CEO', 'Comercial', 'Governanca', 'Conversao'],
      metadata: {
        source: 'ceo_mastermind_commercial_gap_board_21',
        taskIds: tasks.map(task => task.id),
        automationBlocked: true,
      },
    },
  };
};

export const CEO_DIAGNOSTIC_STATUS = {
  ACTIVE: 'active',
  MONITORING: 'monitoring',
  MITIGATED: 'mitigated',
};

const CEO_DIAGNOSTIC_SEVERITY_WEIGHT = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

const createCeoDiagnostic = ({
  id,
  title,
  area,
  severity = 'medium',
  status = CEO_DIAGNOSTIC_STATUS.ACTIVE,
  summary,
  recommendedAction,
  source = 'MasterMind CEO',
  evidence = [],
  related = [],
}) => ({
  id,
  title,
  area,
  severity,
  status,
  summary,
  recommendedAction,
  source,
  evidence,
  related,
  generatedAt: new Date().toISOString(),
});

const pushUniqueDiagnostic = (diagnostics, diagnostic) => {
  if (!diagnostic?.id || diagnostics.some(item => item.id === diagnostic.id)) return;
  diagnostics.push(diagnostic);
};

const hasSignal = (signals = [], keywords = []) =>
  signals.some(signal => textIncludesAny(signal.text, keywords));

const signalEvidence = (signals = [], keywords = [], limit = 3) =>
  signals
    .filter(signal => textIncludesAny(signal.text, keywords))
    .map(signal => signal.title)
    .filter((item, index, list) => item && list.indexOf(item) === index)
    .slice(0, limit);

const normalizeDiagnosticSeverity = (value = '') => {
  const severity = String(value || '').toLowerCase();
  if (['critical', 'critico', 'critica'].includes(severity)) return 'critical';
  if (['high', 'alto', 'alta'].includes(severity)) return 'high';
  if (['low', 'baixo', 'baixa'].includes(severity)) return 'low';
  return 'medium';
};

export const createCeoDiagnostics = ({
  leads = [],
  proposals = [],
  clients = [],
  automations = [],
  approvalRequests = [],
  learningEvents = [],
  mastermindKnowledge = [],
} = {}) => {
  const diagnostics = [];
  const signals = createMasterMindSignals({ learningEvents, approvalRequests, mastermindKnowledge });
  const allText = signals.map(signal => signal.text).join(' ');
  const activeRiskSignals = signals.filter(signal => signal.text.includes('#risco-ativo') || signal.text.includes('risco ativo'));
  const monitoringRiskSignals = signals.filter(signal => signal.text.includes('#risco-monitoramento') || signal.text.includes('risco monitoramento'));
  const mitigatedRiskSignals = signals.filter(signal => signal.text.includes('#risco-mitigado') || signal.text.includes('risco mitigado'));

  if (hasSignal(activeRiskSignals, ['supabase', 'rls', 'politicas anonimas', 'migracoes destrutivas', 'mel-0007'])) {
    pushUniqueDiagnostic(diagnostics, createCeoDiagnostic({
      id: 'mastermind_supabase_rls_active_risk',
      title: 'Risco ativo: governanca Supabase/RLS',
      area: 'seguranca',
      severity: 'high',
      status: CEO_DIAGNOSTIC_STATUS.ACTIVE,
      summary: 'O MasterMind mantem Supabase/RLS, politicas anonimas ou migracoes destrutivas como risco ativo de escala.',
      recommendedAction: 'Executar revisao RLS, separar migrations de producao e registrar evidencias antes de ampliar multiusuario.',
      evidence: signalEvidence(activeRiskSignals, ['supabase', 'rls', 'mel-0007', 'politicas anonimas', 'migracoes destrutivas']),
      related: ['Supabase', 'RLS', 'Riscos_e_Governanca', 'MEL-0007'],
    }));
  }

  if (hasSignal(activeRiskSignals, ['segredos', 'secret', 'api key', 'variaveis de ambiente', 'mel-0010'])) {
    pushUniqueDiagnostic(diagnostics, createCeoDiagnostic({
      id: 'mastermind_secret_inventory_active_risk',
      title: 'Risco ativo: inventario de segredos e variaveis',
      area: 'governanca',
      severity: 'high',
      status: CEO_DIAGNOSTIC_STATUS.ACTIVE,
      summary: 'O MasterMind sinaliza que segredos, API keys ou variaveis de ambiente ainda exigem inventario e controle executivo.',
      recommendedAction: 'Criar matriz de variaveis por ambiente, dono, rotacao, local de configuracao e impacto de falha.',
      evidence: signalEvidence(activeRiskSignals, ['segredos', 'secret', 'api key', 'variaveis de ambiente', 'mel-0010']),
      related: ['MEL-0010', 'Riscos_e_Governanca', 'Mastermind_CEO_Kentauros'],
    }));
  }

  if (hasSignal(monitoringRiskSignals, ['supersaas', 'next.js', 'vite', 'divergencia documental', 'mel-0009'])) {
    pushUniqueDiagnostic(diagnostics, createCeoDiagnostic({
      id: 'mastermind_supersaas_stack_monitoring',
      title: 'Monitoramento: divergencia documental do SuperSaas',
      area: 'arquitetura',
      severity: 'medium',
      status: CEO_DIAGNOSTIC_STATUS.MONITORING,
      summary: 'A stack do SuperSaas deve continuar tratada como React/Vite ate que documentacao divergente seja corrigida.',
      recommendedAction: 'Validar CLAUDE.md/documentacao agentica e manter agentes orientados pelo codigo real.',
      evidence: signalEvidence(monitoringRiskSignals, ['supersaas', 'next.js', 'vite', 'divergencia documental', 'mel-0009']),
      related: ['SuperSaas', 'MEL-0009', 'Next.js', 'Vite', 'React'],
    }));
  }

  if (mitigatedRiskSignals.length) {
    pushUniqueDiagnostic(diagnostics, createCeoDiagnostic({
      id: 'mastermind_mitigated_risks_watchlist',
      title: 'Watchlist: riscos mitigados ainda rastreados',
      area: 'governanca',
      severity: 'low',
      status: CEO_DIAGNOSTIC_STATUS.MITIGATED,
      summary: 'Riscos mitigados permanecem como memoria executiva para evitar regressao em novos ciclos.',
      recommendedAction: 'Manter tags mitigadas, evidencias e revisao mensal antes de remover do grafo executivo.',
      evidence: mitigatedRiskSignals.map(signal => signal.title).slice(0, 3),
      related: ['Riscos_e_Governanca', 'Mapa_de_Conexoes'],
    }));
  }

  const codexQueue = approvalRequests.filter(item =>
    item.metadata?.source === 'ceo_strategic_kernel' &&
    item.status === CEO_APPROVAL_STATUS.APPROVED &&
    item.appliedStatus === CEO_APPLICATION_STATUS.AWAITING_CODEX &&
    !isImplementedCeoSuggestion(item.metadata?.suggestionId)
  );
  if (codexQueue.length) {
    pushUniqueDiagnostic(diagnostics, createCeoDiagnostic({
      id: 'ceo_approved_suggestions_waiting_codex',
      title: 'Sugestoes aprovadas aguardando Codex',
      area: 'execucao',
      severity: 'high',
      status: CEO_DIAGNOSTIC_STATUS.ACTIVE,
      summary: `${codexQueue.length} decisao(oes) CEO ja aprovadas ainda precisam ser executadas ou marcadas como aplicadas.`,
      recommendedAction: 'Executar prompts aprovados no Codex, validar e registrar aprendizado final no MasterMind.',
      evidence: codexQueue.map(item => item.title).slice(0, 3),
      related: ['Registro_de_Decisoes_CEO', 'Ciclo_de_Melhoria_Continua'],
    }));
  }

  const staleLeadCount = getLeadCoolingAlerts(leads).length;
  if (staleLeadCount) {
    pushUniqueDiagnostic(diagnostics, createCeoDiagnostic({
      id: 'ceo_stale_leads_conversion_risk',
      title: 'Leads esfriando no funil comercial',
      area: 'comercial',
      severity: 'medium',
      status: CEO_DIAGNOSTIC_STATUS.ACTIVE,
      summary: `${staleLeadCount} lead(s) precisam de proxima acao para preservar conversao.`,
      recommendedAction: 'Priorizar follow-up consultivo, origem CapLead e propostas com ROI explicito.',
      evidence: [`${staleLeadCount} alerta(s) de lead parado.`],
      related: ['CapLead', 'Estrategia_de_Conversao_de_Clientes'],
    }));
  }

  const openProposalsWithoutNextAction = proposals.filter(item =>
    ['open', 'aberta', 'pending', 'pendente', 'sent', 'enviada'].includes(String(item.status || '').toLowerCase()) &&
    !(item.nextAction || item.next_action || item.followUpAt || item.follow_up_at || item.roi || item.roiSummary)
  );
  if (openProposalsWithoutNextAction.length || textIncludesAny(allText, ['proposta aberta', 'propostas abertas', 'roi'])) {
    pushUniqueDiagnostic(diagnostics, createCeoDiagnostic({
      id: 'ceo_open_proposals_roi_review',
      title: 'Propostas abertas precisam de ROI e proxima acao',
      area: 'comercial',
      severity: openProposalsWithoutNextAction.length ? 'medium' : 'low',
      status: openProposalsWithoutNextAction.length ? CEO_DIAGNOSTIC_STATUS.ACTIVE : CEO_DIAGNOSTIC_STATUS.MONITORING,
      summary: openProposalsWithoutNextAction.length
        ? `${openProposalsWithoutNextAction.length} proposta(s) abertas sem ROI/proxima acao clara.`
        : 'O MasterMind mantem ROI de propostas como criterio de acompanhamento comercial.',
      recommendedAction: 'Adicionar decisor, prazo, ROI esperado e proximo contato em cada proposta aberta.',
      evidence: [
        ...openProposalsWithoutNextAction.map(item => item.title || item.company || item.id).slice(0, 3),
        ...signalEvidence(signals, ['proposta aberta', 'propostas abertas', 'roi']).slice(0, 2),
      ].filter(Boolean),
      related: ['Estrategia_de_Conversao_de_Clientes', 'Roadmap_Geral'],
    }));
  }

  const activeAutomationsWithoutLogs = automations.filter(item =>
    String(item.status || 'active').toLowerCase() === 'active' && !(item.logs || []).length
  );
  if (activeAutomationsWithoutLogs.length) {
    pushUniqueDiagnostic(diagnostics, createCeoDiagnostic({
      id: 'ceo_automation_logs_missing',
      title: 'Automacoes ativas sem logs de execucao',
      area: 'operacional',
      severity: 'medium',
      status: CEO_DIAGNOSTIC_STATUS.ACTIVE,
      summary: `${activeAutomationsWithoutLogs.length} automacao(oes) ativas nao possuem historico para auditoria e aprendizado.`,
      recommendedAction: 'Registrar execucoes, falhas, skips, aprovacoes e respostas em eventos rastreaveis.',
      evidence: activeAutomationsWithoutLogs.map(item => item.name || item.action || item.id).slice(0, 3),
      related: ['Ciclo_de_Melhoria_Continua', 'Prompts_e_Agentes'],
    }));
  }

  if (clients.length && hasSignal(signals, ['retencao', 'churn', 'onboarding', 'sla'])) {
    pushUniqueDiagnostic(diagnostics, createCeoDiagnostic({
      id: 'ceo_retention_kpi_watch',
      title: 'Monitorar KPIs de retencao e onboarding',
      area: 'retencao',
      severity: 'medium',
      status: CEO_DIAGNOSTIC_STATUS.MONITORING,
      summary: 'A memoria ativa define retencao >95%, churn de onboarding <3% e desbloqueio operacional <12h.',
      recommendedAction: 'Conectar clientes, projetos e suporte aos KPIs de retencao antes de escalar novas ofertas.',
      evidence: signalEvidence(signals, ['retencao', 'churn', 'onboarding', 'sla']),
      related: ['Estrategia_de_Retencao_de_Clientes', 'Painel_Executivo_CEO'],
    }));
  }

  return diagnostics.sort((a, b) => {
    const statusWeight = status => status === CEO_DIAGNOSTIC_STATUS.ACTIVE ? 3 : status === CEO_DIAGNOSTIC_STATUS.MONITORING ? 2 : 1;
    return (statusWeight(b.status) - statusWeight(a.status)) ||
      ((CEO_DIAGNOSTIC_SEVERITY_WEIGHT[b.severity] || 0) - (CEO_DIAGNOSTIC_SEVERITY_WEIGHT[a.severity] || 0));
  });
};

export const summarizeCeoDiagnostics = (diagnostics = []) => {
  const summary = {
    total: diagnostics.length,
    active: 0,
    monitoring: 0,
    mitigated: 0,
    bySeverity: {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    },
    top: diagnostics.slice(0, 5),
  };

  diagnostics.forEach((diagnostic) => {
    const status = diagnostic.status === CEO_DIAGNOSTIC_STATUS.MITIGATED
      ? 'mitigated'
      : diagnostic.status === CEO_DIAGNOSTIC_STATUS.MONITORING
        ? 'monitoring'
        : 'active';
    const severity = normalizeDiagnosticSeverity(diagnostic.severity);

    summary[status] += 1;
    summary.bySeverity[severity] += 1;
  });

  return summary;
};

const RISK_AREA_OWNERS = {
  seguranca: 'CTO / Security',
  governanca: 'COO / Governance',
  arquitetura: 'CTO / Architecture',
  comercial: 'CMO / Growth',
  retencao: 'COO / Customer Success',
  operacional: 'COO / Operations',
  execucao: 'CEO / Codex',
};

const RISK_AREA_PROJECTS = {
  seguranca: 'Kentauros',
  governanca: 'Kentauros',
  arquitetura: 'Kentauros',
  comercial: 'Kentauros',
  retencao: 'Kentauros',
  operacional: 'Kentauros',
  execucao: 'MasterMind CEO',
};

const normalizeTaskId = value =>
  String(value || 'risk')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

const approvalForTask = (approvalRequests = [], taskId) =>
  approvalRequests.find(item =>
    item.metadata?.source === 'ceo_risk_execution_board' &&
    item.metadata?.taskId === taskId &&
    item.status !== CEO_APPROVAL_STATUS.REJECTED &&
    item.appliedStatus !== CEO_APPLICATION_STATUS.APPLIED
  );

const createRiskTaskFromDiagnostic = (diagnostic = {}, approvalRequests = []) => {
  const taskId = `risk_task_${normalizeTaskId(diagnostic.id || diagnostic.title)}`;
  const approval = approvalForTask(approvalRequests, taskId);
  const approvalStatus = approval?.status || 'not_requested';

  return {
    id: taskId,
    diagnosticId: diagnostic.id,
    title: diagnostic.title,
    area: diagnostic.area || 'governanca',
    project: RISK_AREA_PROJECTS[diagnostic.area] || 'Kentauros',
    owner: RISK_AREA_OWNERS[diagnostic.area] || 'CEO / MasterMind',
    severity: normalizeDiagnosticSeverity(diagnostic.severity),
    status: approval?.status === CEO_APPROVAL_STATUS.APPROVED
      ? 'approved_for_execution'
      : approval?.status === CEO_APPROVAL_STATUS.PENDING
        ? 'approval_pending'
        : diagnostic.status === CEO_DIAGNOSTIC_STATUS.MITIGATED
          ? 'mitigated'
          : diagnostic.status === CEO_DIAGNOSTIC_STATUS.MONITORING
            ? 'monitoring'
            : 'ready_for_approval',
    approvalRequired: true,
    approvalStatus,
    approvalId: approval?.id,
    summary: diagnostic.summary,
    nextAction: diagnostic.recommendedAction || 'Definir proxima acao executiva e registrar no MasterMind.',
    doneCriteria: [
      'ApprovalRequest aprovado antes de qualquer correcao automatizada ou acao externa.',
      'Evidencia tecnica ou operacional registrada no MasterMind.',
      'Status do risco atualizado para monitoramento ou mitigado somente apos validacao.',
    ],
    evidence: diagnostic.evidence || [],
    related: diagnostic.related || [],
    impact: {
      technical: ['seguranca', 'arquitetura', 'governanca', 'operacional'].includes(diagnostic.area) ? 'alto' : 'medio',
      operation: 'alto',
      conversion: diagnostic.area === 'comercial' ? 'alto' : 'medio',
      retention: ['seguranca', 'retencao', 'operacional'].includes(diagnostic.area) ? 'alto' : 'medio',
      profit: diagnostic.area === 'comercial' ? 'alto' : 'medio',
    },
  };
};

export const createCeoRiskExecutionBoard = ({
  diagnostics = [],
  approvalRequests = [],
} = {}) => {
  const tasks = diagnostics
    .filter(diagnostic => diagnostic.status !== CEO_DIAGNOSTIC_STATUS.MITIGATED)
    .map(diagnostic => createRiskTaskFromDiagnostic(diagnostic, approvalRequests))
    .sort((a, b) => {
      const statusWeight = status => status === 'ready_for_approval' ? 4 : status === 'approval_pending' ? 3 : status === 'approved_for_execution' ? 2 : 1;
      return (statusWeight(b.status) - statusWeight(a.status)) ||
        ((CEO_DIAGNOSTIC_SEVERITY_WEIGHT[b.severity] || 0) - (CEO_DIAGNOSTIC_SEVERITY_WEIGHT[a.severity] || 0));
    });

  return {
    tasks,
    summary: {
      total: tasks.length,
      active: tasks.filter(task => ['ready_for_approval', 'approval_pending', 'approved_for_execution'].includes(task.status)).length,
      pendingApproval: tasks.filter(task => task.status === 'approval_pending').length,
      approvedForExecution: tasks.filter(task => task.status === 'approved_for_execution').length,
      byArea: tasks.reduce((acc, task) => {
        acc[task.area] = (acc[task.area] || 0) + 1;
        return acc;
      }, {}),
    },
  };
};

export const createCeoRiskTaskApprovalRequest = (task, { userId, tenantId } = {}) => ({
  id: `ceo_risk_task_${task.id}_${Date.now()}`,
  tenant_id: tenantId,
  user_id: userId,
  title: `Aprovar execucao de risco - ${task.title}`,
  status: CEO_APPROVAL_STATUS.PENDING,
  appliedStatus: CEO_APPLICATION_STATUS.NOT_APPLIED,
  priority: ['critical', 'high'].includes(task.severity) ? 'alta' : 'media',
  requestedBy: 'MasterMind CEO',
  requestedAt: new Date().toISOString(),
  actionType: CEO_ACTION_TYPES.MASTERMIND_UPDATE,
  risk: ['critical', 'high'].includes(task.severity) ? 'alto' : 'medio',
  summary: task.summary,
  evidence: task.evidence,
  actionPlan: [
    task.nextAction,
    ...task.doneCriteria,
  ],
  metadata: {
    source: 'ceo_risk_execution_board',
    taskId: task.id,
    diagnosticId: task.diagnosticId,
    area: task.area,
    project: task.project,
    owner: task.owner,
    impact: task.impact,
    related: task.related,
    mastermindUpdate: {
      title: `Execucao de risco CEO - ${task.title}`,
      content: `${task.summary} Proxima acao: ${task.nextAction}`,
      tags: ['MasterMind', 'CEO', 'Risco', task.area],
      linkedProjects: [task.project, 'Kentauros'].filter((item, index, list) => item && list.indexOf(item) === index),
    },
    codexPrompt: [
      'Antes de executar esta correcao, consulte o MasterMind CEO da Kentauros no Obsidian.',
      '',
      `Tarefa aprovada para execucao de risco: ${task.title}`,
      `Area: ${task.area}`,
      `Projeto: ${task.project}`,
      `Responsavel sugerido: ${task.owner}`,
      `Severidade: ${task.severity}`,
      '',
      `Resumo: ${task.summary}`,
      `Proxima acao: ${task.nextAction}`,
      '',
      'Criterios de conclusao:',
      ...task.doneCriteria.map((item, index) => `${index + 1}. ${item}`),
      '',
      'Regras:',
      '- Nao execute acao externa sem aprovacao humana adicional quando houver impacto em cliente, dados ou ambiente externo.',
      '- Valide testes, lint e build aplicaveis.',
      '- Atualize o MasterMind com evidencias e novo status do risco.',
    ].join('\n'),
  },
});

export const createSkillGovernanceRecommendation = (workType = 'seguranca') => {
  const skillMap = {
    seguranca: ['hm-security', 'hm-qa', 'supabase-postgres-best-practices'],
    design: ['hm-designer', 'vercel:react-best-practices', 'vercel:shadcn'],
    deploy: ['hm-deploy', 'vercel:deployments-cicd', 'vercel:env-vars'],
    automacao: ['superpowers:test-driven-development', 'superpowers:systematic-debugging', 'vercel:workflow'],
  };

  return {
    workType,
    candidates: (skillMap[workType] || skillMap.seguranca).map(name => ({
      name,
      status: 'candidate',
      approvalRequired: true,
      reason: `Skill candidata para apoiar decisoes CEO em ${workType}.`,
      installPolicy: 'Somente instalar apos aprovacao explicita do usuario.',
    })),
  };
};

export const createSkillGovernanceRegistry = ({
  approvalRequests = [],
  learningEvents = [],
  workTypes,
} = {}) => {
  const allowedWorkTypes = workTypes?.length ? new Set(workTypes) : null;
  const pendingOrApproved = new Map(
    approvalRequests
      .filter(item => item.metadata?.source === 'ceo_skill_governance')
      .map(item => [item.metadata.skillName, item])
  );
  const installed = new Set(
    learningEvents
      .filter(item => item.event_type === 'ceo_skill_installed' && item.metadata?.source === 'ceo_skill_governance')
      .map(item => item.metadata.skillName)
  );

  return SKILL_GOVERNANCE_CATALOG
    .filter(skill => !allowedWorkTypes || allowedWorkTypes.has(skill.intendedUse))
    .map(skill => {
      const approval = pendingOrApproved.get(skill.name);
      const status = installed.has(skill.name)
        ? 'installed'
        : approval?.status === CEO_APPROVAL_STATUS.APPROVED
          ? 'approved'
          : approval?.status === CEO_APPROVAL_STATUS.REJECTED
            ? 'rejected'
            : approval?.status === CEO_APPROVAL_STATUS.PENDING
              ? 'awaiting_approval'
              : 'suggested';

      return {
        ...skill,
        status,
        approvalRequired: true,
        approvalId: approval?.id,
        reason: `Skill candidata para apoiar decisoes CEO em ${skill.intendedUse}.`,
        installPolicy: 'Somente instalar apos aprovacao explicita do usuario e registro no MasterMind.',
      };
    });
};

export const createSkillApprovalRequest = (skill, { userId, tenantId } = {}) => ({
  id: `ceo_skill_${String(skill.name || 'skill').replace(/[^a-z0-9:_-]/gi, '_')}_${Date.now()}`,
  tenant_id: tenantId,
  user_id: userId,
  title: `Aprovar skill - ${skill.name}`,
  status: CEO_APPROVAL_STATUS.PENDING,
  appliedStatus: 'not_installed',
  priority: skill.risk === 'alto' ? 'alta' : 'media',
  requestedBy: 'MasterMind CEO',
  requestedAt: new Date().toISOString(),
  actionType: CEO_ACTION_TYPES.INSTALL_SKILL,
  risk: skill.risk || 'medio',
  summary: `Solicitar aprovacao humana para instalar ou habilitar ${skill.name} em decisoes CEO de ${skill.intendedUse}.`,
  evidence: [
    `Fonte: ${skill.source || 'Nao informada'}`,
    `Permissoes: ${(skill.permissions || []).join(', ') || 'a validar'}`,
  ],
  actionPlan: [
    'Validar fonte e necessidade real.',
    'Classificar risco de supply chain e permissoes.',
    'Aprovar antes de instalar ou habilitar.',
    'Registrar decisao e aprendizado no MasterMind.',
  ],
  metadata: {
    source: 'ceo_skill_governance',
    skillName: skill.name,
    intendedUse: skill.intendedUse,
    permissions: skill.permissions || [],
    skillSource: skill.source,
    installPolicy: skill.installPolicy || 'Somente instalar apos aprovacao explicita.',
    mastermindUpdate: {
      title: `Skill CEO aprovada - ${skill.name}`,
      content: `Skill ${skill.name} avaliada para uso em ${skill.intendedUse}, com risco ${skill.risk || 'medio'}.`,
      tags: ['MasterMind', 'CEO', 'Skill', skill.intendedUse],
      linkedProjects: ['Kentauros'],
    },
  },
});

export const approveSkillInstallation = (approval, { reviewer = 'user' } = {}) => ({
  approval: {
    ...approval,
    status: CEO_APPROVAL_STATUS.APPROVED,
    appliedStatus: 'awaiting_install',
    reviewedAt: new Date().toISOString(),
    reviewer,
  },
  learningEvent: {
    source: 'ceo_skill_governance',
    event_type: 'ceo_skill_install_approved',
    title: `Skill aprovada - ${approval.metadata?.skillName || approval.title}`,
    content: approval.summary || '',
    signal_strength: 5,
    tags: ['MasterMind', 'CEO', 'Skill', 'Aprovacao'],
    metadata: {
      approvalId: approval.id,
      source: 'ceo_skill_governance',
      skillName: approval.metadata?.skillName,
      intendedUse: approval.metadata?.intendedUse,
      permissions: approval.metadata?.permissions || [],
      skillSource: approval.metadata?.skillSource,
    },
  },
});

export const markSkillInstalled = (approval, { reviewer = 'user' } = {}) => {
  const installedAt = new Date().toISOString();
  return {
    approval: {
      ...approval,
      appliedStatus: 'installed',
      installedAt,
      installedBy: reviewer,
    },
    learningEvent: {
      source: 'ceo_skill_governance',
      event_type: 'ceo_skill_installed',
      title: `Skill instalada - ${approval.metadata?.skillName || approval.title}`,
      content: approval.summary || '',
      signal_strength: 5,
      tags: ['MasterMind', 'CEO', 'Skill', 'Instalada'],
      metadata: {
        approvalId: approval.id,
        source: 'ceo_skill_governance',
        skillName: approval.metadata?.skillName,
        intendedUse: approval.metadata?.intendedUse,
        permissions: approval.metadata?.permissions || [],
        installedAt,
        installedBy: reviewer,
      },
    },
  };
};

export const createContinuousCeoSuggestions = ({
  leads = [],
  proposals = [],
  clients = [],
  projects = [],
  automations = [],
  approvalRequests = [],
  learningEvents = [],
  mastermindKnowledge = [],
} = {}) => {
  const suggestions = [];
  const recommendationSeeds = createDecisionRecommendations({ leads, proposals, clients });
  const staleLeadAlerts = getLeadCoolingAlerts(leads);
  const securityRisks = analyzeCapLeadKentaurosSecurity({ leads, automations, approvalRequests });
  const recentCeoLearnings = learningEvents.filter(event => (event.tags || []).includes('CEO')).length;
  const appliedLearnings = appliedCeoLearnings(learningEvents);
  const followUpAutomationReady = hasApprovedFollowUpAutomation(automations);

  if (recommendationSeeds.length && !alreadyHandled(approvalRequests, learningEvents, 'ceo_growth_recommendations')) {
    suggestions.push(createSuggestion({
      id: 'ceo_growth_recommendations',
      title: 'Priorizar recomendacoes comerciais do MasterMind',
      category: 'crescimento',
      summary: 'O CEO identificou gargalos no funil que podem aumentar conversao, lucro e retencao se forem tratados com rotina executiva.',
      actionType: CEO_ACTION_TYPES.MASTERMIND_UPDATE,
      score: scoreInitiative({ commercial: 5, financial: 5, technical: 3, client: 5, urgency: 4, complexity: 3, risk: 4, reuse: 5, automation: 4 }),
      risk: 'baixo',
      impact: { conversion: 'alto', profit: 'alto', retention: 'medio' },
      evidence: recommendationSeeds.map(item => item.title).slice(0, 3),
      actionPlan: [
        'Registrar decisao executiva no MasterMind.',
        'Transformar recomendacoes em backlog priorizado.',
        'Revisar resultado em ciclo semanal CEO.',
      ],
    }));
  }

  if (staleLeadAlerts.length && !followUpAutomationReady && !alreadyHandled(approvalRequests, learningEvents, 'ceo_followup_automation')) {
    suggestions.push(createSuggestion({
      id: 'ceo_followup_automation',
      title: 'Criar automacao aprovada de follow-up para leads parados',
      category: 'automacao',
      summary: 'Leads sem proxima acao esfriam o funil. O CEO recomenda uma automacao com aprovacao humana antes de qualquer envio externo.',
      actionType: CEO_ACTION_TYPES.CREATE_AUTOMATION,
      score: scoreInitiative({ commercial: 5, financial: 4, technical: 3, client: 4, urgency: 5, complexity: 4, risk: 3, reuse: 5, automation: 5 }),
      risk: 'medio',
      impact: { conversion: 'alto', profit: 'medio', operation: 'alto' },
      evidence: [`${staleLeadAlerts.length} lead(s) em risco de esfriar`],
      actionPlan: [
        'Criar fila de follow-up com mensagem consultiva.',
        'Exigir aprovacao antes de disparar WhatsApp, email ou API externa.',
        'Registrar taxa de resposta como aprendizado MasterMind.',
      ],
      skillCandidates: createSkillGovernanceRecommendation('automacao').candidates,
    }));
  }

  if (securityRisks.length && !alreadyHandled(approvalRequests, learningEvents, 'ceo_security_audit')) {
    suggestions.push(createSuggestion({
      id: 'ceo_security_audit',
      title: 'Executar auditoria CEO de seguranca em CapLead e Kentauros',
      category: 'seguranca',
      summary: 'O CEO detectou pontos que exigem revisao de API keys, origem de dados, CORS, logs, permissoes e automacoes antes de escala.',
      actionType: CEO_ACTION_TYPES.SECURITY_REVIEW,
      score: scoreInitiative({ commercial: 3, financial: 4, technical: 5, client: 5, urgency: 5, complexity: 3, risk: 5, reuse: 4, automation: 3 }),
      risk: 'alto',
      impact: { security: 'alto', retention: 'alto', operation: 'alto' },
      evidence: securityRisks.map(risk => risk.title),
      actionPlan: [
        'Revisar endpoint CapLead -> Kentauros.',
        'Validar variaveis de ambiente e CORS de producao.',
        'Registrar riscos e mitigacoes no MasterMind.',
      ],
      skillCandidates: createSkillGovernanceRecommendation('seguranca').candidates,
    }));
  }

  if (!alreadyHandled(approvalRequests, learningEvents, 'ceo_skill_governance')) {
    suggestions.push(createSuggestion({
      id: 'ceo_skill_governance',
      title: 'Ativar governanca de skills para decisoes CEO',
      category: 'governanca',
      summary: 'O CEO deve poder estudar bibliotecas e sugerir skills, mas contratar ou instalar qualquer capacidade exige aprovacao humana e registro no MasterMind.',
      actionType: CEO_ACTION_TYPES.INSTALL_SKILL,
      score: scoreInitiative({ commercial: 3, financial: 3, technical: 5, client: 4, urgency: 4, complexity: 3, risk: 5, reuse: 5, automation: 5 }),
      risk: 'medio',
      impact: { technical: 'alto', operation: 'alto', governance: 'alto' },
      evidence: CEO_STUDY_LIBRARY.map(source => source.name),
      actionPlan: [
        'Estudar fonte antes de recomendar skill.',
        'Classificar risco de supply chain e permissao.',
        'Solicitar aprovacao do usuario antes de instalar.',
        'Registrar skill aprovada no MasterMind.',
      ],
      skillCandidates: [
        ...createSkillGovernanceRecommendation('seguranca').candidates,
        ...createSkillGovernanceRecommendation('design').candidates,
      ],
    }));
  }

  if (recentCeoLearnings === 0 && !alreadyHandled(approvalRequests, learningEvents, 'ceo_learning_cadence')) {
    suggestions.push(createSuggestion({
      id: 'ceo_learning_cadence',
      title: 'Criar cadencia de aprendizado continuo do CEO',
      category: 'aprendizado',
      summary: 'Toda solicitacao ou alteracao em projeto deve gerar leitura do MasterMind e, quando houver impacto, novo aprendizado executivo.',
      actionType: CEO_ACTION_TYPES.MASTERMIND_UPDATE,
      score: scoreInitiative({ commercial: 4, financial: 4, technical: 4, client: 4, urgency: 4, complexity: 4, risk: 4, reuse: 5, automation: 4 }),
      risk: 'baixo',
      impact: { operation: 'alto', strategy: 'alto', retention: 'medio' },
      evidence: ['Sem aprendizado CEO recente registrado na memoria operacional da aplicacao'],
      actionPlan: [
        'Registrar aprendizado a cada aprovacao CEO.',
        'Conectar aprendizado a CapLead, Kentauros, seguranca ou crescimento.',
        'Usar aprendizado como contexto em novas sugestoes.',
      ],
    }));
  }

  const mastermindSuggestions = createMasterMindDrivenSuggestions({
    leads,
    clients,
    projects,
    automations,
    approvalRequests,
    learningEvents,
    mastermindKnowledge,
  }).filter(suggestion => !alreadyHandled(approvalRequests, learningEvents, suggestion.id));

  suggestions.push(...mastermindSuggestions);

  if (appliedLearnings.length > 0 && mastermindSuggestions.length === 0) {
    const cycle = getContinuousLearningCycle(learningEvents);
    const latestAppliedText = compactText(appliedLearnings[appliedLearnings.length - 1]).toLowerCase();
    const shouldUsePostCompletion = cycle >= 8 || textIncludesAny(latestAppliedText, [
      'verificar mastermind apos',
      'ceo_mastermind_next_verification',
    ]);
    const fallbackSuggestions = shouldUsePostCompletion
      ? createPostCompletionMasterMindSuggestions({ appliedLearnings, leads, automations, clients, projects })
      : createContinuousLearningSuggestions({ cycle, appliedLearnings, leads, automations, clients, projects });

    suggestions.push(
      ...fallbackSuggestions.filter(suggestion => !alreadyHandled(approvalRequests, learningEvents, suggestion.id))
    );
  }

  if (appliedLearnings.length > 0 && !suggestions.some(item => item.id?.startsWith('ceo_mastermind_'))) {
    const fallback = createPostCompletionMasterMindSuggestions({
      appliedLearnings,
      leads,
      automations,
      clients,
      projects,
    }).find(suggestion => !alreadyHandled(approvalRequests, learningEvents, suggestion.id));

    if (fallback) {
      suggestions.push(fallback);
    }
  }

  return suggestions.sort((a, b) => b.score.total - a.score.total);
};

const SENSITIVE_CEO_ACTION_TYPES = new Set([
  CEO_ACTION_TYPES.HIRE_AGENT,
  CEO_ACTION_TYPES.INSTALL_SKILL,
  CEO_ACTION_TYPES.CREATE_AUTOMATION,
  CEO_ACTION_TYPES.SECURITY_REVIEW,
]);

const hasClosureCriteria = item =>
  Boolean(
    item?.doneCriteria ||
    item?.successCriteria ||
    item?.closureCriteria ||
    item?.metadata?.doneCriteria ||
    item?.metadata?.successCriteria ||
    item?.metadata?.closureCriteria
  );

const isSensitiveCeoExecution = item => {
  const text = compactText(item).toLowerCase();
  return SENSITIVE_CEO_ACTION_TYPES.has(item?.actionType) ||
    ['alto', 'high', 'critical', 'critico', 'crítico'].includes(String(item?.risk || '').toLowerCase()) ||
    textIncludesAny(text, ['whatsapp', 'email', 'api externa', 'envio externo', 'deploy', 'segredo', 'secret', 'rls', 'cors']);
};

const isValidHumanApprovalRequest = item =>
  item?.status === CEO_APPROVAL_STATUS.APPROVED &&
  item?.appliedStatus === CEO_APPLICATION_STATUS.AWAITING_CODEX &&
  ['ceo_strategic_kernel', 'ceo_risk_execution_board'].includes(item?.metadata?.source);

export const canExecuteSensitiveCeoAction = (approval = {}) => {
  const reasons = [];

  if (!isValidHumanApprovalRequest(approval)) {
    reasons.push('approval_request_invalido');
  }

  if (!hasClosureCriteria(approval)) {
    reasons.push('criterio_de_encerramento_ausente');
  }

  return {
    allowed: reasons.length === 0,
    reasons,
    sensitive: isSensitiveCeoExecution(approval),
  };
};

const classifyAutonomousApproval = item => {
  if (item.appliedStatus === CEO_APPLICATION_STATUS.APPLIED || item.appliedStatus === 'installed') {
    return 'aplicada';
  }

  if (item.status === CEO_APPROVAL_STATUS.APPROVED && item.appliedStatus === CEO_APPLICATION_STATUS.AWAITING_CODEX) {
    return 'aprovada_para_codex';
  }

  if (item.status === CEO_APPROVAL_STATUS.APPROVED) {
    return 'aprovada_humana';
  }

  if (item.status === CEO_APPROVAL_STATUS.REJECTED) {
    return 'rejeitada';
  }

  const text = compactText(item).toLowerCase();
  if (item.metadata?.source === 'autonomous_mastermind' || textIncludesAny(text, ['aprovada autonomicamente', 'aprovacao autonoma', 'aprovação autônoma'])) {
    return 'contexto';
  }

  return 'proposta';
};

export const createAutonomousApprovalGovernanceReview = ({
  approvalRequests = [],
  generatedAt = '2026-05-20',
} = {}) => {
  const items = approvalRequests.map(item => {
    const classification = classifyAutonomousApproval(item);
    const sensitive = isSensitiveCeoExecution(item);
    const executionGate = sensitive ? canExecuteSensitiveCeoAction(item) : { allowed: true, reasons: [], sensitive: false };
    const missingRequirements = [];

    if (sensitive && executionGate.reasons.includes('approval_request_invalido')) {
      missingRequirements.push('approval_request_humano');
    }

    if (sensitive && executionGate.reasons.includes('criterio_de_encerramento_ausente')) {
      missingRequirements.push('criterio_de_encerramento');
    }

    return {
      id: item.id,
      title: item.title || 'Aprovacao sem titulo',
      classification,
      source: item.metadata?.source || 'unknown',
      actionType: item.actionType || 'mastermind_update',
      risk: item.risk || 'medio',
      status: item.status || CEO_APPROVAL_STATUS.PENDING,
      appliedStatus: item.appliedStatus || CEO_APPLICATION_STATUS.NOT_APPLIED,
      sensitive,
      sensitiveExecutionBlocked: sensitive && !executionGate.allowed,
      missingRequirements,
      nextAction: sensitive && !executionGate.allowed
        ? 'Converter em ApprovalRequest humano com criterio de encerramento antes de executar.'
        : 'Manter como contexto governado e atualizar MasterMind quando mudar de status.',
    };
  });

  return {
    generatedAt,
    summary: {
      total: items.length,
      contexto: items.filter(item => item.classification === 'contexto').length,
      proposta: items.filter(item => item.classification === 'proposta').length,
      aprovadaParaCodex: items.filter(item => item.classification === 'aprovada_para_codex').length,
      aplicada: items.filter(item => item.classification === 'aplicada').length,
      blockedSensitiveExecution: items.filter(item => item.sensitiveExecutionBlocked).length,
    },
    items,
    learningEvent: {
      source: 'mastermind_update',
      event_type: 'autonomous_approval_governance_review',
      title: 'Governanca de aprovacoes autonomas do MasterMind',
      content: `${items.length} aprovacao(oes) classificadas; ${items.filter(item => item.sensitiveExecutionBlocked).length} execucao(oes) sensivel(is) bloqueada(s) sem ApprovalRequest valido ou criterio de encerramento.`,
      signal_strength: 5,
      tags: ['MasterMind', 'CEO', 'Governanca', 'Aprovacao'],
      metadata: {
        source: 'ceo_mastermind_autonomous_approval_governance',
        blockedSensitiveExecution: items.filter(item => item.sensitiveExecutionBlocked).map(item => item.id),
      },
    },
  };
};

export const createCeoApprovalRequest = (suggestion, { userId, tenantId } = {}) => ({
  id: `ceo_approval_${suggestion.id}_${Date.now()}`,
  tenant_id: tenantId,
  user_id: userId,
  title: suggestion.title,
  status: CEO_APPROVAL_STATUS.PENDING,
  appliedStatus: CEO_APPLICATION_STATUS.NOT_APPLIED,
  priority: suggestion.score?.priority || 'alta',
  requestedBy: 'MasterMind CEO',
  requestedAt: new Date().toISOString(),
  actionType: suggestion.actionType,
  risk: suggestion.risk,
  summary: suggestion.summary,
  evidence: suggestion.evidence,
  actionPlan: suggestion.actionPlan,
  metadata: {
    source: 'ceo_strategic_kernel',
    suggestionId: suggestion.id,
    category: suggestion.category,
    impact: suggestion.impact,
    skillCandidates: suggestion.skillCandidates,
    mastermindUpdate: suggestion.mastermindUpdate,
    codexPrompt: createCodexSuggestionPrompt(suggestion),
  },
});

export const createManualCeoSuggestion = (prompt, { userName = 'Usuario Kentauros' } = {}) => {
  const cleanPrompt = String(prompt || '').trim();
  return createSuggestion({
    id: `ceo_manual_${Date.now()}`,
    title: 'Sugestao manual de melhoria',
    category: 'manual',
    summary: cleanPrompt || 'Sugestao manual enviada para avaliacao do MasterMind CEO.',
    actionType: CEO_ACTION_TYPES.MASTERMIND_UPDATE,
    target: 'Kentauros',
    risk: 'medio',
    score: scoreInitiative({ commercial: 4, financial: 4, technical: 4, client: 4, urgency: 4, complexity: 3, risk: 4, reuse: 4, automation: 3 }),
    impact: { strategy: 'medio', operation: 'medio', conversion: 'a validar' },
    evidence: [`Sugestao criada manualmente por ${userName}`],
    actionPlan: [
      'Revisar a sugestao sob criterios CEO.',
      'Aprovar apenas se houver impacto real em crescimento, seguranca, operacao ou cliente.',
      'Registrar aprendizado no MasterMind se aprovada.',
    ],
  });
};

export const applyApprovedCeoSuggestion = (approval, { reviewer = 'user' } = {}) => {
  const mastermindUpdate = approval.metadata?.mastermindUpdate || {};
  return {
    approval: {
      ...approval,
      status: CEO_APPROVAL_STATUS.APPROVED,
      appliedStatus: CEO_APPLICATION_STATUS.AWAITING_CODEX,
      reviewedAt: new Date().toISOString(),
      reviewer,
      metadata: {
        ...(approval.metadata || {}),
        codexPrompt: approval.metadata?.codexPrompt || createCodexSuggestionPrompt(approval),
      },
    },
    learningEvent: {
      source: 'ceo_approval',
      event_type: 'ceo_suggestion_approved',
      title: mastermindUpdate.title || `Sugestao CEO aprovada - ${approval.title}`,
      content: mastermindUpdate.content || approval.summary || '',
      signal_strength: 5,
      tags: mastermindUpdate.tags || ['MasterMind', 'CEO', 'Aprovacao'],
      metadata: {
        approvalId: approval.id,
        source: 'ceo_strategic_kernel',
        suggestionId: approval.metadata?.suggestionId,
        actionType: approval.actionType,
        risk: approval.risk,
        evidence: approval.evidence || [],
        actionPlan: approval.actionPlan || [],
        skillCandidates: approval.metadata?.skillCandidates || [],
        linkedProjects: mastermindUpdate.linkedProjects || [],
        codexPrompt: approval.metadata?.codexPrompt || createCodexSuggestionPrompt(approval),
      },
    },
    mastermindEntry: {
      title: mastermindUpdate.title || approval.title,
      status: 'Aprovada',
      approvedBy: reviewer,
      approvedAt: new Date().toISOString(),
      summary: approval.summary,
      actionPlan: approval.actionPlan || [],
      tags: mastermindUpdate.tags || ['MasterMind', 'CEO'],
    },
  };
};

export const markCeoSuggestionApplied = (approval, { reviewer = 'user' } = {}) => {
  const appliedAt = new Date().toISOString();
  const codexPrompt = approval.metadata?.codexPrompt || createCodexSuggestionPrompt(approval);

  return {
    approval: {
      ...approval,
      appliedStatus: CEO_APPLICATION_STATUS.APPLIED,
      appliedAt,
      appliedBy: reviewer,
      metadata: {
        ...(approval.metadata || {}),
        codexPrompt,
      },
    },
    learningEvent: {
      source: 'ceo_approval',
      event_type: 'ceo_suggestion_applied',
      title: `Sugestao CEO aplicada - ${approval.title}`,
      content: approval.summary || '',
      signal_strength: 5,
      tags: ['MasterMind', 'CEO', 'Aplicada'],
      metadata: {
        approvalId: approval.id,
        source: 'ceo_strategic_kernel',
        suggestionId: approval.metadata?.suggestionId,
        actionType: approval.actionType,
        appliedAt,
        appliedBy: reviewer,
        codexPrompt,
      },
    },
  };
};

export const rejectCeoSuggestion = (approval, { reviewer = 'user', reason = 'Rejeitado para revisao' } = {}) => ({
  ...approval,
  status: CEO_APPROVAL_STATUS.REJECTED,
  reviewedAt: new Date().toISOString(),
  reviewer,
  rejectionReason: reason,
});
