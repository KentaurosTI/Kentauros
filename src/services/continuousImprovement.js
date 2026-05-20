const MS_PER_DAY = 24 * 60 * 60 * 1000;

const asDate = (value, fallback = new Date()) => new Date(value || fallback);
const daysBetween = (from, to) => Math.floor((asDate(to) - asDate(from)) / MS_PER_DAY);
const currency = value => Number(value || 0);

export const scoreInitiative = ({
  commercial = 3,
  financial = 3,
  technical = 3,
  client = 3,
  urgency = 3,
  complexity = 3,
  risk = 3,
  reuse = 3,
  automation = 3,
} = {}) => {
  const total = [commercial, financial, technical, client, urgency, complexity, risk, reuse, automation]
    .reduce((sum, item) => sum + Number(item || 0), 0);
  const priority = total >= 40 ? 'critica' : total >= 32 ? 'alta' : total >= 24 ? 'media' : 'revisar';
  return { total, priority };
};

export const classifyFunnelIssue = (item = {}) => {
  const text = `${item.lossReason || ''} ${item.notes || ''} ${item.objection || ''}`.toLowerCase();
  if (/pre[cç]o|caro|budget|or[cç]amento/.test(text)) return { category: 'preco', label: 'Objeção de preço' };
  if (/tempo|agenda|depois|prioridade/.test(text)) return { category: 'timing', label: 'Momento inadequado' };
  if (/confian[cç]a|case|prova|seguran[cç]a/.test(text)) return { category: 'trust', label: 'Falta de confiança/prova' };
  if (/escopo|entendi|duvida|clareza/.test(text)) return { category: 'clarity', label: 'Falta de clareza' };
  return { category: 'unknown', label: 'Motivo não classificado' };
};

export const getOpportunityScore = (lead = {}) => {
  const valueScore = Math.min(30, Math.round(currency(lead.value) / 1000));
  const readinessScore = Math.min(30, Math.round(Number(lead.conversionReadiness || lead.score || 0) * 0.3));
  const contactScore = (lead.email ? 10 : 0) + (lead.phone || lead.whatsapp ? 10 : 0);
  const urgencyScore = lead.nextAction ? 12 : 4;
  const riskPenalty = lead.status === 'lost' ? 20 : lead.nextAction ? 0 : 8;
  const total = Math.max(0, Math.min(100, valueScore + readinessScore + contactScore + urgencyScore - riskPenalty));
  const recommendation = total >= 70
    ? 'Priorizar contato consultivo e proposta.'
    : total >= 45
      ? 'Completar diagnostico e validar oportunidade.'
      : 'Nutrir e buscar mais sinais comerciais.';
  return { total, valueScore, readinessScore, contactScore, urgencyScore, riskPenalty, recommendation };
};

const getDiscoveryMissingFields = (discovery = {}) => {
  const missing = [];
  if (!String(discovery.summary || '').trim()) missing.push('summary');
  if (!String(discovery.opportunity || '').trim()) missing.push('opportunity');
  if (!String(discovery.scope || '').trim()) missing.push('scope');
  if (!Number(discovery.estimatedValue || discovery.value || 0)) missing.push('estimatedValue');
  if (!String(discovery.nextAction || '').trim()) missing.push('nextAction');
  return missing;
};

const getIncompleteDiscoveries = (discoveries = []) =>
  discoveries
    .filter(discovery => !['approved', 'proposal_ready', 'completed'].includes(String(discovery.status || '').toLowerCase()))
    .map(discovery => ({ ...discovery, missingFields: getDiscoveryMissingFields(discovery) }))
    .filter(discovery => discovery.missingFields.length > 0);

export const createDecisionRecommendations = ({ leads = [], discoveries = [], proposals = [], clients = [] } = {}) => {
  const recommendations = [];
  const staleLeads = getLeadCoolingAlerts(leads);
  if (staleLeads.length) {
    recommendations.push({
      id: 'rec_followup_stale_leads',
      title: 'Ativar follow-up nos leads parados',
      origin: 'Leads sem próxima ação ou contato recente',
      impact: { expected: 'aumentar conversao e reduzir perda de oportunidades' },
      risk: 'baixo',
      status: 'pending_review',
      score: scoreInitiative({ commercial: 5, financial: 4, technical: 3, client: 4, urgency: 5, complexity: 4, risk: 4, reuse: 4, automation: 5 }),
    });
  }
  const incompleteDiscoveries = getIncompleteDiscoveries(discoveries);
  if (incompleteDiscoveries.length) {
    recommendations.push({
      id: 'rec_complete_discovery_before_proposal',
      title: 'Completar discoveries incompletos antes da proposta',
      origin: `${incompleteDiscoveries.length} discovery(ies) sem campos comerciais obrigatorios`,
      impact: { expected: 'aumentar conversao de discovery para proposta consultiva' },
      risk: 'baixo',
      status: 'pending_review',
      score: scoreInitiative({ commercial: 5, financial: 4, technical: 3, client: 5, urgency: 5, complexity: 3, risk: 4, reuse: 5, automation: 4 }),
      metadata: {
        discoveryIds: incompleteDiscoveries.map(item => item.id),
        missingFields: incompleteDiscoveries.flatMap(item => item.missingFields),
      },
    });
  }
  const sentProposals = proposals.filter(proposal => ['sent', 'draft'].includes(proposal.status));
  if (sentProposals.length) {
    recommendations.push({
      id: 'rec_proposal_push',
      title: 'Revisar propostas abertas e reforçar valor/ROI',
      origin: 'Propostas sem aceite',
      impact: { expected: 'elevar taxa proposta para cliente' },
      risk: 'medio',
      status: 'pending_review',
      score: scoreInitiative({ commercial: 5, financial: 5, technical: 3, client: 5, urgency: 4, complexity: 3, risk: 3, reuse: 4, automation: 4 }),
    });
  }
  const retentionAlerts = getUpsellAlerts(clients, []);
  if (retentionAlerts.length) {
    recommendations.push({
      id: 'rec_retention_roadmap',
      title: 'Criar revisão mensal para clientes sem roadmap',
      origin: 'Clientes ativos sem plano de evolução',
      impact: { expected: 'aumentar retencao e receita recorrente' },
      risk: 'baixo',
      status: 'pending_review',
      score: scoreInitiative({ commercial: 4, financial: 5, technical: 3, client: 5, urgency: 4, complexity: 4, risk: 4, reuse: 5, automation: 4 }),
    });
  }
  return recommendations.sort((a, b) => b.score.total - a.score.total);
};

const recommendationToBacklogPrompt = (recommendation = {}) => [
  'Antes de executar esta tarefa, consulte o MasterMind CEO da Kentauros no Obsidian.',
  '',
  `Tarefa aprovada pelo CEO: ${recommendation.title}`,
  '',
  `Origem: ${recommendation.origin || 'Recomendacao comercial do MasterMind'}`,
  `Impacto esperado: ${recommendation.impact?.expected || 'aumentar conversao, lucro ou retencao'}`,
  `Risco: ${recommendation.risk || 'medio'}`,
  `Score CEO: ${recommendation.score?.total || 'a validar'} (${recommendation.score?.priority || 'prioridade a validar'})`,
  '',
  'Criterios obrigatorios:',
  '- Transforme a recomendacao em acao operacional mensuravel.',
  '- Preserve rastreabilidade no funil comercial.',
  '- Registre aprendizados no MasterMind quando houver resultado.',
  '- Valide impacto em conversao, lucro, retencao e operacao.',
].join('\n');

export const createCommercialRecommendationBacklog = ({
  recommendations = [],
  existingBacklog = [],
  ownerId,
  projectId = 'kentauros-commercial-growth',
} = {}) => {
  const existingIds = new Set(existingBacklog
    .map(task => task.sourceRecommendationId || task.metadata?.sourceRecommendationId)
    .filter(Boolean));

  return recommendations
    .filter(recommendation => !existingIds.has(recommendation.id))
    .map((recommendation, index) => ({
      id: `commercial-${recommendation.id}`,
      projectId,
      project: 'Kentauros - Crescimento Comercial',
      title: recommendation.title,
      description: `${recommendation.origin || 'Recomendacao comercial do MasterMind'} | Impacto: ${recommendation.impact?.expected || 'a validar'}`,
      status: 'todo',
      priority: recommendation.score?.priority || 'alta',
      order: index + 1,
      assignee: ownerId,
      type: 'commercial_recommendation',
      source: 'mastermind_ceo',
      sourceRecommendationId: recommendation.id,
      risk: recommendation.risk || 'medio',
      impact: recommendation.impact || {},
      score: recommendation.score,
      executionPrompt: recommendationToBacklogPrompt(recommendation),
      automationMode: 'external_prompt_ready',
      tags: ['MasterMind', 'CEO', 'Comercial', 'Conversao'],
      metadata: {
        sourceRecommendationId: recommendation.id,
        source: 'mastermind_ceo',
        generatedBy: 'createCommercialRecommendationBacklog',
      },
    }));
};

export const createOperationalConversionCycle = ({
  leads = [],
  discoveries = [],
  proposals = [],
  clients = [],
  existingBacklog = [],
  ownerId,
} = {}) => {
  const activeLeads = leads.filter(lead => !['won', 'lost'].includes(lead.status));
  const leadsWithoutNextAction = activeLeads.filter(lead => !String(lead.nextAction || '').trim()).length;
  const incompleteDiscoveries = getIncompleteDiscoveries(discoveries);
  const openProposals = proposals.filter(proposal => ['sent', 'draft'].includes(proposal.status));
  const clientsWithoutRoadmap = clients.filter(client => !(client.retentionRoadmap || []).length).length;
  const recommendations = createDecisionRecommendations({ leads, discoveries, proposals, clients });
  const backlog = createCommercialRecommendationBacklog({
    recommendations,
    existingBacklog,
    ownerId,
  });
  const bottlenecks = [
    { id: 'leads_without_next_action', label: 'Leads sem proxima acao', count: leadsWithoutNextAction },
    { id: 'incomplete_discoveries', label: 'Discoveries incompletos', count: incompleteDiscoveries.length },
    { id: 'open_proposals', label: 'Propostas abertas', count: openProposals.length },
    { id: 'clients_without_roadmap', label: 'Clientes sem roadmap', count: clientsWithoutRoadmap },
  ].sort((a, b) => b.count - a.count);

  return {
    analysis: {
      leadsWithoutNextAction,
      incompleteDiscoveries: incompleteDiscoveries.length,
      openProposals: openProposals.length,
      clientsWithoutRoadmap,
      dominantBottleneck: bottlenecks[0],
    },
    recommendations,
    backlog,
    learningEvent: {
      source: 'mastermind_ceo',
      event_type: 'operational_conversion_cycle_applied',
      title: 'Ciclo CEO aplicado - Conversao operacional Kentauros',
      content: [
        `Leads sem proxima acao: ${leadsWithoutNextAction}.`,
        `Discovery incompleto: ${incompleteDiscoveries.length}.`,
        `Propostas abertas: ${openProposals.length}.`,
        `Clientes sem roadmap: ${clientsWithoutRoadmap}.`,
        `${backlog.length} tarefa(s) priorizada(s) para o backlog comercial.`,
      ].join(' '),
      signal_strength: backlog.length ? 5 : 3,
      tags: ['MasterMind', 'CEO', 'Conversao', 'Backlog'],
      metadata: {
        recommendationIds: recommendations.map(item => item.id),
        createdTaskIds: backlog.map(item => item.id),
        analysis: {
          leadsWithoutNextAction,
          incompleteDiscoveries: incompleteDiscoveries.length,
          openProposals: openProposals.length,
          clientsWithoutRoadmap,
        },
      },
    },
  };
};

export const createCommercialFunnelPlaybook = ({
  leads = [],
  discoveries = [],
  proposals = [],
  clients = [],
  ownerId = 'commercial',
  reviewCadence = 'weekly',
} = {}) => {
  const cycle = createOperationalConversionCycle({ leads, discoveries, proposals, clients, ownerId });
  const bottleneck = cycle.analysis.dominantBottleneck || { id: 'unknown', label: 'Gargalo nao identificado', count: 0 };
  const actionByBottleneck = {
    leads_without_next_action: 'Atribuir responsavel e proxima acao consultiva para cada lead parado em ate 24h.',
    incomplete_discoveries: 'Completar resumo, oportunidade, escopo, valor estimado e proxima acao antes de proposta.',
    open_proposals: 'Revisar ROI, objeções e prazo de decisao das propostas abertas.',
    clients_without_roadmap: 'Agendar revisao mensal e propor roadmap de evolucao para clientes ativos.',
  };
  const metricByBottleneck = {
    leads_without_next_action: 'taxa de conversao de lead parado para discovery',
    incomplete_discoveries: 'taxa de conversao de discovery completo para proposta',
    open_proposals: 'taxa de conversao de proposta aberta para cliente',
    clients_without_roadmap: 'taxa de retencao e upsell mensal',
  };
  const primaryAction = actionByBottleneck[bottleneck.id] || 'Revisar funil e definir proxima acao operacional.';
  const metric = metricByBottleneck[bottleneck.id] || 'taxa de conversao do funil';

  return {
    id: `commercial_playbook_${bottleneck.id}`,
    ownerId,
    reviewCadence,
    bottleneck,
    metric,
    dueInDays: bottleneck.count > 10 ? 3 : 7,
    steps: [
      primaryAction,
      'Registrar resultado no lead, discovery, proposta ou cliente relacionado.',
      'Revisar semanalmente a metrica e transformar aprendizado em nova sugestao CEO.',
    ],
    learningEvent: {
      source: 'mastermind_ceo',
      event_type: 'commercial_playbook_applied',
      title: `Playbook comercial aplicado - ${bottleneck.label}`,
      content: `${bottleneck.count} item(ns) no gargalo dominante. Metrica de acompanhamento: ${metric}.`,
      signal_strength: bottleneck.count ? 5 : 3,
      tags: ['MasterMind', 'CEO', 'Comercial', 'Playbook'],
      metadata: {
        ownerId,
        reviewCadence,
        bottleneck,
        metric,
      },
    },
  };
};

const OPEN_PROPOSAL_STATUSES = new Set(['draft', 'sent', 'pending', 'pending_approval']);

const hasProposalRoi = proposal =>
  Boolean(
    String(proposal.roi || proposal.expectedRoi || proposal.roiNarrative || proposal.valueNarrative || '').trim() ||
    String(proposal.metadata?.roi || proposal.metadata?.expectedRoi || proposal.metadata?.roiNarrative || '').trim()
  );

const hasProposalDeadline = proposal =>
  Boolean(String(proposal.validUntil || proposal.decisionDueAt || proposal.deadline || proposal.dueDate || '').trim());

const getProposalMissingFields = proposal => {
  const missing = [];
  if (!String(proposal.nextAction || '').trim()) missing.push('nextAction');
  if (!hasProposalRoi(proposal)) missing.push('roi');
  if (!hasProposalDeadline(proposal)) missing.push('decisionDeadline');
  return missing;
};

export const createOpenProposalRoiReview = ({
  proposals = [],
  clients = [],
  projects = [],
  ownerId = 'commercial',
  reviewCadence = 'weekly',
} = {}) => {
  const openProposals = proposals.filter(proposal => OPEN_PROPOSAL_STATUSES.has(String(proposal.status || '').toLowerCase()));
  const convertedProposals = proposals.filter(proposal => ['approved', 'signed', 'won'].includes(String(proposal.status || '').toLowerCase()));
  const atRiskProposals = openProposals
    .map(proposal => ({
      ...proposal,
      missingFields: getProposalMissingFields(proposal),
    }))
    .filter(proposal => proposal.missingFields.length > 0);
  const proposalToClientRate = proposals.length
    ? Math.round(((convertedProposals.length || clients.length) / proposals.length) * 100)
    : 0;
  const followUps = atRiskProposals.map(proposal => ({
    proposalId: proposal.id,
    clientName: proposal.clientName,
    value: Number(proposal.value || 0),
    responsible: proposal.ownerId || proposal.assignee || proposal.commercialOwner || ownerId,
    expectedValue: Number(proposal.value || 0),
    nextAction: 'Enviar follow-up consultivo reforcando ROI, valor esperado e prazo de decisao.',
    message: `Reforcar ROI da proposta de ${proposal.clientName || 'cliente'} com valor esperado, proxima acao objetiva e decisor responsavel.`,
    missingFields: proposal.missingFields,
  }));

  return {
    id: 'open_proposal_roi_review',
    reviewCadence,
    openProposalCount: openProposals.length,
    atRiskProposals,
    followUps,
    proposalToClientRate,
    correlatedContext: {
      clients: clients.length,
      projects: projects.length,
    },
    learningEvent: {
      source: 'mastermind_ceo',
      event_type: 'open_proposal_roi_review_applied',
      title: 'Revisao de propostas abertas com reforco de ROI',
      content: `${atRiskProposals.length} proposta(s) aberta(s) sem proxima acao, ROI explicito ou prazo definido. Taxa proposta para cliente: ${proposalToClientRate}%.`,
      signal_strength: atRiskProposals.length ? 5 : 3,
      tags: ['MasterMind', 'CEO', 'Proposta', 'ROI', 'Conversao'],
      metadata: {
        openProposalCount: openProposals.length,
        atRiskProposalIds: atRiskProposals.map(proposal => proposal.id),
        followUps,
        proposalToClientRate,
        clients: clients.length,
        projects: projects.length,
      },
    },
  };
};

export const createOperationalUxReview = ({
  screens = ['Leads', 'MasterMind CEO', 'Discovery', 'Clientes'],
  findings = [],
} = {}) => {
  const criticalScreens = ['Leads', 'MasterMind CEO', 'Discovery', 'Clientes'];
  const normalizedScreens = screens.length ? screens : criticalScreens;
  const hasHighSeverity = findings.some(item => ['high', 'critica', 'alta'].includes(String(item.severity || '').toLowerCase()));
  const actions = normalizedScreens.map(screen => {
    const screenFindings = findings.filter(item => item.screen === screen);
    return {
      screen,
      priority: screenFindings.some(item => ['high', 'critica', 'alta'].includes(String(item.severity || '').toLowerCase())) ? 'alta' : 'media',
      focus: screenFindings.length
        ? screenFindings.map(item => item.issue).join('; ')
        : 'Validar responsividade, truncamento, densidade visual e clareza de acoes.',
    };
  });

  return {
    status: findings.length || hasHighSeverity ? 'needs_attention' : 'approved',
    screens: normalizedScreens,
    findings,
    actions,
    learningEvent: {
      source: 'mastermind_ceo',
      event_type: 'operational_ux_review_applied',
      title: 'Revisao UX operacional aplicada',
      content: `${normalizedScreens.length} tela(s) critica(s) avaliadas para responsividade, truncamento de acoes e densidade visual.`,
      signal_strength: findings.length ? 4 : 3,
      tags: ['MasterMind', 'CEO', 'UX', 'Operacao'],
      metadata: {
        screens: normalizedScreens,
        findings,
        actions,
      },
    },
  };
};

export const createWeeklyCeoReview = ({ leads = [], discoveries = [], proposals = [], clients = [], projects = [] } = {}) => {
  const recommendations = createDecisionRecommendations({ leads, discoveries, proposals, clients, projects });
  const lost = leads.filter(lead => lead.status === 'lost').map(classifyFunnelIssue);
  return {
    title: 'Revisão semanal CEO Kentauros',
    indicators: {
      leads: leads.length,
      qualified: leads.filter(lead => ['qualified', 'discovery', 'proposal', 'won'].includes(lead.status)).length,
      discoveries: discoveries.length,
      proposals: proposals.length,
      clients: clients.length,
      openProjects: projects.filter(project => !['done', 'cancelled'].includes(project.status)).length,
    },
    bottlenecks: lost,
    nextDecisions: recommendations.slice(0, 5),
    generatedAt: new Date().toISOString(),
  };
};

export const getMastermindLearningEvents = ({ leads = [], proposals = [], clients = [] } = {}) => {
  const lostEvents = leads
    .filter(lead => lead.status === 'lost' || lead.lossReason)
    .map(lead => ({
      source: 'continuous_improvement',
      event_type: 'funnel_learning',
      title: `Aprendizado de funil - ${lead.company}`,
      content: classifyFunnelIssue(lead).label,
      tags: ['MasterMind', 'Conversao', classifyFunnelIssue(lead).category],
      metadata: { leadId: lead.id, lossReason: lead.lossReason || '' },
    }));

  const wonEvents = proposals
    .filter(proposal => ['approved', 'signed', 'won'].includes(proposal.status))
    .map(proposal => ({
      source: 'continuous_improvement',
      event_type: 'proposal_learning',
      title: `Proposta convertida - ${proposal.clientName}`,
      content: 'Proposta convertida deve alimentar biblioteca de propostas e objeções superadas.',
      tags: ['MasterMind', 'Proposta', 'Conversao'],
      metadata: { proposalId: proposal.id },
    }));

  const retentionEvents = clients
    .filter(client => classifyClientHealth(client).status !== 'green')
    .map(client => ({
      source: 'continuous_improvement',
      event_type: 'retention_learning',
      title: `Risco de retenção - ${client.company || client.name}`,
      content: classifyClientHealth(client).reason,
      tags: ['MasterMind', 'Retencao'],
      metadata: { clientId: client.id },
    }));

  return [...lostEvents, ...wonEvents, ...retentionEvents];
};

export const getFollowUpQueue = (leads = [], today = new Date().toISOString()) =>
  leads
    .filter(lead => !['won', 'lost'].includes(lead.status))
    .map(lead => {
      const daysSinceActivity = daysBetween(lead.lastActivity || lead.createdAt, today);
      return {
        leadId: lead.id,
        company: lead.company,
        status: lead.status,
        daysSinceActivity,
        message: lead.status === 'proposal'
          ? 'Reforçar ROI e validar dúvidas da proposta.'
          : 'Enviar diagnóstico rápido e perguntar se pode compartilhar os pontos observados.',
      };
    })
    .filter(item => item.daysSinceActivity >= 5 || !leads.find(lead => lead.id === item.leadId)?.nextAction)
    .sort((a, b) => b.daysSinceActivity - a.daysSinceActivity);

export const getLeadCoolingAlerts = (leads = [], today = new Date().toISOString()) =>
  getFollowUpQueue(leads, today).map(item => ({
    ...item,
    risk: item.daysSinceActivity >= 10 ? 'high' : 'medium',
    recommendedAction: item.status === 'proposal' ? 'Follow-up de proposta' : 'Contato consultivo',
  }));

export const createDiagnosticByNiche = (niche = 'geral') => {
  const library = {
    clinicas: ['Agendamento pouco evidente', 'CTA de WhatsApp fraco', 'Prova social insuficiente'],
    veterinarias: ['Baixa urgência no contato', 'Serviços sem hierarquia', 'Mobile pode perder conversões'],
    psicologia: ['Confiança e acolhimento pouco claros', 'Agendamento com fricção', 'Conteúdo sem diferenciação'],
    contabilidade: ['Oferta pouco objetiva', 'Pouca prova de autoridade', 'Falta de automação de triagem'],
    advocacia: ['Risco de comunicação genérica', 'CTA consultivo fraco', 'Autoridade não destacada'],
  };
  const key = String(niche).toLowerCase();
  return {
    niche: key,
    problems: library[key] || ['Oferta pouco clara', 'Fricção no contato', 'Baixa mensuração de conversão'],
    opportunity: 'Criar diagnóstico, melhoria de experiência e automação de contato com IA.',
  };
};

export const createProposalTemplate = (projectType = 'site') => {
  const templates = {
    site: ['Diagnóstico UX/conversão', 'Protótipo', 'Implementação assistida por IA', 'Medição'],
    sistema: ['Discovery operacional', 'Arquitetura', 'MVP com IA', 'QA e evolução'],
    automacao: ['Mapeamento do processo', 'Agent/robô', 'Logs e fallback', 'Treinamento'],
    dashboard: ['Indicadores', 'Modelagem', 'Painel executivo', 'Rotina de decisão'],
    chatbot: ['Base de conhecimento', 'Fluxos de atendimento', 'Integrações', 'Monitoramento'],
  };
  const key = String(projectType).toLowerCase();
  return {
    projectType: key,
    sections: templates[key] || templates.site,
    valueNarrative: 'Projeto focado em resultado, velocidade de execução com IA e melhoria contínua.',
  };
};

export const createCopyExperiment = (name = 'whatsapp_diagnostico') => ({
  id: `exp_${name}`,
  name,
  metric: 'reply_rate',
  status: 'draft',
  variants: [
    {
      id: 'A',
      copy: 'Posso te enviar um diagnóstico rápido com pontos de melhoria que encontrei?',
    },
    {
      id: 'B',
      copy: 'Analisei rapidamente seu site e encontrei oportunidades para melhorar contatos. Posso compartilhar?',
    },
  ],
  learningTarget: 'Identificar qual abordagem gera mais respostas sem reduzir qualidade.',
});

export const classifyClientHealth = (client = {}, { today = new Date().toISOString() } = {}) => {
  const reviewDelay = client.nextReviewAt ? daysBetween(client.nextReviewAt, today) : 999;
  if (client.status === 'inactive' || reviewDelay > 30) {
    return { status: 'red', reason: 'Cliente sem revisão recente ou inativo.', action: 'Agendar revisão executiva.' };
  }
  if (reviewDelay > 0 || !(client.retentionRoadmap || []).length) {
    return { status: 'yellow', reason: 'Cliente precisa de próxima ação de retenção.', action: 'Definir roadmap e indicadores.' };
  }
  return { status: 'green', reason: 'Cliente com acompanhamento em dia.', action: 'Manter rotina.' };
};

export const createMonthlyClientReview = (client = {}, { projects = [], today = new Date().toISOString() } = {}) => {
  const health = classifyClientHealth(client, { today });
  const clientName = client.company || client.name;
  const relatedProjects = projects.filter(project => project.client === clientName || project.clientId === client.id);
  return {
    client: clientName,
    health,
    delivered: relatedProjects.filter(project => ['done', 'success', 'completed'].includes(project.status)).map(project => project.name),
    risks: health.status === 'green' ? [] : [health.reason],
    opportunities: [
      'Revisar indicadores de resultado',
      'Propor melhoria evolutiva com IA',
      'Atualizar roadmap de continuidade',
    ],
    nextAction: health.action,
  };
};

export const getUpsellAlerts = (clients = [], projects = []) =>
  clients
    .filter(client => {
      const name = client.company || client.name;
      const delivered = projects.some(project => project.client === name && ['done', 'success', 'completed'].includes(project.status));
      return delivered || !(client.retentionRoadmap || []).length;
    })
    .map(client => ({
      client: client.company || client.name,
      reason: 'Cliente com oportunidade de roadmap, automação ou acompanhamento recorrente.',
      recommendedOffer: 'Plano mensal de melhoria contínua e automações com IA.',
    }));

export const createAutomationRegistry = (automations = []) =>
  automations.map(automation => ({
    id: automation.id,
    name: automation.name,
    status: automation.status || 'active',
    owner: automation.owner || 'Operações Kentauros',
    lastRun: automation.lastRun || 'Never',
    lastResult: automation.logs?.[0]?.status || 'unknown',
    logs: automation.logs || [],
    canRollback: true,
    rollbackAction: `pause:${automation.id}`,
  }));

export const createHumanReviewQueue = (recommendations = []) =>
  recommendations
    .filter(item => currency(item.financialImpact || item.value || item.score?.total * 1000) >= 3000 || item.requiresHumanApproval)
    .map(item => ({
      ...item,
      requiresHumanApproval: true,
      reviewReason: 'Impacto financeiro ou decisao comercial sensivel.',
      status: item.status || 'pending_review',
    }));

export const createPostMortem = ({ type = 'incident', summary = '', impact = '' } = {}) => ({
  title: `Post-mortem ${type}`,
  summary,
  impact,
  sections: ['Resumo', 'Impacto', 'Linha do tempo', 'Causa raiz', 'Ações corretivas', 'Aprendizados MasterMind'],
  tags: ['Incident', type, 'MasterMind'],
});

export const createProductOpportunityRadar = (issues = []) =>
  issues
    .filter(issue => Number(issue.count || 0) >= 2)
    .map(issue => ({
      title: issue.description || issue.category,
      source: issue.category,
      recurrence: Number(issue.count || 0),
      candidateType: Number(issue.count || 0) >= 4 ? 'agent_or_template' : 'playbook',
      expectedImpact: 'reduzir retrabalho e criar ativo reutilizavel',
    }));
