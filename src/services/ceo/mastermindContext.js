export const ACTIVE_MASTERMIND_MEMORY = [
  {
    id: 'active_north_star',
    title: 'Memoria Ativa CEO - Norte Estrategico',
    content: 'Kentauros prioriza crescimento, lucro, conversao, retencao, qualidade, automacao, produtos reutilizaveis, SaaS e agents.',
    tags: ['#ceo', '#mastermind', '#estrategia', '#lucro', '#conversao', '#retencao'],
  },
  {
    id: 'active_risk_supabase_rls',
    title: 'Risco Ativo - Supabase RLS e governanca multiusuario',
    content: '#risco-ativo Supabase RLS politicas anonimas migrations destrutivas MEL-0007 seguranca governanca multiusuario.',
    tags: ['#risco-ativo', '#seguranca', '#governanca', '#arquitetura'],
  },
  {
    id: 'active_risk_secrets',
    title: 'Risco Ativo - Segredos e variaveis de ambiente',
    content: '#risco-ativo segredos secret api key variaveis de ambiente MEL-0010 rotacao ambiente producao homologacao local.',
    tags: ['#risco-ativo', '#seguranca', '#governanca', '#operacional'],
  },
  {
    id: 'monitoring_supersaas_stack',
    title: 'Monitoramento - Stack real do SuperSaas',
    content: '#risco-monitoramento SuperSaas Next.js Vite React divergencia documental MEL-0009 agents devem seguir codigo real.',
    tags: ['#risco-monitoramento', '#arquitetura', '#tecnologia'],
  },
  {
    id: 'kpis_ceo',
    title: 'KPIs CEO - Retencao, onboarding e velocidade comercial',
    content: 'Retencao maior que 95%, churn de onboarding menor que 3%, contrato via IA em menos de 5 minutos, desbloqueio operacional em menos de 12 horas uteis.',
    tags: ['#ceo', '#retencao', '#comercial', '#operacional'],
  },
  {
    id: 'knowledge_hub_2026_05_20',
    title: 'Hub Novo Conhecimento 2026-05-20',
    content: 'Conhecimento novo consolidado: ArteNewEra theme-primary layout, automacao de processos, integracao de IA em projetos, marketing para receita e visibilidade, retencao, upsell, aprovacoes autonomas, entregas de workers e necessidade de consulta economica do MasterMind.',
    tags: ['#ceo', '#mastermind', '#aprendizado', '#workflow', '#ia', '#comercial'],
  },
  {
    id: 'token_efficient_mastermind_protocol',
    title: 'Protocolo Consulta Economica MasterMind',
    content: 'Agents e Codex devem consultar Memoria_Ativa_CEO primeiro, depois hubs diarios, indices tematicos e somente entao notas brutas. O objetivo e economizar tokens, reduzir ruido e evitar decisoes baseadas em conhecimento duplicado.',
    tags: ['#ceo', '#mastermind', '#workflow', '#governanca'],
  },
  {
    id: 'autonomous_approval_governance_signal',
    title: 'Governanca de aprovacoes autonomas',
    content: 'Aprovacoes autonomas recentes devem ser tratadas como contexto e proposta. Execucao sensivel ainda exige validacao CEO/Codex, ApprovalRequest, criterio de encerramento e registro no MasterMind.',
    tags: ['#ceo', '#governanca', '#aprovacao', '#workflow'],
  },
];

const compactText = value => {
  if (Array.isArray(value)) return value.map(compactText).join(' ');
  if (!value || typeof value !== 'object') return String(value || '');
  return Object.values(value).map(compactText).join(' ');
};

const normalizeKnowledgeItem = (item, source) => ({
  id: item.id,
  title: item.title || item.name || item.metadata?.suggestionId || 'Registro MasterMind',
  content: [
    item.content,
    item.summary,
    item.detail,
    item.event_type,
    item.actionType,
    compactText(item.tags),
    compactText(item.evidence),
    compactText(item.actionPlan),
    compactText(item.metadata),
  ].filter(Boolean).join(' '),
  tags: item.tags || [],
  metadata: {
    ...(item.metadata || {}),
    source,
  },
});

export const buildMastermindKnowledge = ({
  learningEvents = [],
  approvalRequests = [],
  projects = [],
  automations = [],
} = {}) => {
  const projectSignals = projects.slice(0, 20).map(project => normalizeKnowledgeItem({
    id: project.id,
    title: project.name || project.title || `Projeto ${project.id}`,
    content: [
      project.status,
      project.description,
      project.objective,
      project.priority,
      project.risk,
    ].filter(Boolean).join(' '),
    tags: ['#projeto'],
  }, 'project_context'));

  const automationSignals = automations.slice(0, 20).map(automation => normalizeKnowledgeItem({
    id: automation.id,
    title: automation.name || automation.action || `Automacao ${automation.id}`,
    content: [
      automation.status,
      automation.action,
      automation.description,
      automation.logs?.length ? 'logs presentes' : 'sem logs',
      automation.metadata?.requiresHumanApproval ? 'aprovacao humana' : '',
    ].filter(Boolean).join(' '),
    tags: ['#workflow', '#automacao'],
  }, 'automation_context'));

  return [
    ...ACTIVE_MASTERMIND_MEMORY.map(item => normalizeKnowledgeItem(item, 'active_memory_ceo')),
    ...learningEvents.slice(-50).map(item => normalizeKnowledgeItem(item, 'learning_event')),
    ...approvalRequests.slice(-50).map(item => normalizeKnowledgeItem(item, 'approval_request')),
    ...projectSignals,
    ...automationSignals,
  ];
};

const isHubKnowledge = item =>
  /hub|conhecimento novo|painel executivo/i.test(`${item.title || ''} ${item.id || ''}`);

const isRawKnowledge = item => {
  const text = `${item.title || ''} ${item.content || ''} ${item.metadata?.source || ''}`;
  return /raw|nota bruta|reuniao_|aprovação_|aprovacao_|inbox|onboarding_\d|approvalrequest criado/i.test(text);
};

const withConsultationLayer = item => {
  const consultationLayer = item.metadata?.source === 'active_memory_ceo'
    ? 'active_memory_ceo'
    : isHubKnowledge(item)
      ? 'hub_context'
      : isRawKnowledge(item)
        ? 'raw_evidence'
        : 'supporting_context';

  return {
    ...item,
    metadata: {
      ...item.metadata,
      consultationLayer,
    },
  };
};

export const buildEconomicMastermindContext = (input = {}) => {
  const allKnowledge = buildMastermindKnowledge(input).map(withConsultationLayer);
  const primaryKnowledge = allKnowledge.filter(item =>
    ['active_memory_ceo', 'hub_context'].includes(item.metadata.consultationLayer)
  );
  const rawEvidence = allKnowledge.filter(item => item.metadata.consultationLayer === 'raw_evidence');
  const rawWithoutHub = rawEvidence.filter(item => !isHubKnowledge(item));
  const rawSignatureCount = rawEvidence.reduce((acc, item) => {
    const signature = String(item.title || item.content || '').toLowerCase().slice(0, 40);
    acc[signature] = (acc[signature] || 0) + 1;
    return acc;
  }, {});
  const repeatedRawCount = Object.values(rawSignatureCount).filter(count => count > 1).length;

  const alerts = [
    rawWithoutHub.length ? {
      type: 'raw_context_without_hub',
      severity: 'medium',
      message: `${rawWithoutHub.length} evidencia(s) bruta(s) devem ser consolidadas em hub antes de alimentar sugestoes CEO.`,
      action: 'Criar ou atualizar hub diario/tematico e manter notas brutas apenas como evidencia.',
    } : null,
    repeatedRawCount ? {
      type: 'repeated_raw_context',
      severity: 'low',
      message: `${repeatedRawCount} grupo(s) de evidencia bruta parecem repetidos.`,
      action: 'Normalizar no MasterMind para reduzir tokens e ruido.',
    } : null,
  ].filter(Boolean);

  return {
    primaryKnowledge,
    supportingKnowledge: allKnowledge.filter(item => item.metadata.consultationLayer === 'supporting_context'),
    rawEvidence,
    alerts,
    tokenPolicy: {
      strategy: 'camadas_memoria_hub_indices_bruto',
      primaryLayers: ['Memoria_Ativa_CEO', 'Hub_Novo_Conhecimento_2026-05-20'],
      rule: 'Usar memoria ativa e hubs como entrada primaria; abrir notas brutas apenas para evidencia pontual.',
    },
    summary: {
      total: allKnowledge.length,
      primary: primaryKnowledge.length,
      supporting: allKnowledge.filter(item => item.metadata.consultationLayer === 'supporting_context').length,
      rawEvidence: rawEvidence.length,
      alerts: alerts.length,
    },
    learningEvent: {
      source: 'mastermind_update',
      event_type: 'economic_mastermind_context',
      title: 'Consulta economica do MasterMind na tela CEO',
      content: 'A tela CEO deve usar Memoria_Ativa_CEO e hubs diarios como entrada primaria, alertando quando depender de notas brutas ou repetidas.',
      signal_strength: 5,
      tags: ['MasterMind', 'CEO', 'Governanca', 'Tokens', 'Workflow'],
      metadata: {
        source: 'ceo_mastermind_token_efficient_context_pipeline',
        primaryCount: primaryKnowledge.length,
        rawEvidenceCount: rawEvidence.length,
        alertTypes: alerts.map(alert => alert.type),
      },
    },
  };
};
