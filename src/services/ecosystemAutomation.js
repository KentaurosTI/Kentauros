export const AUTOMATION_TEMPLATES = [
  {
    name: 'Lead qualificado -> Follow-up comercial',
    trigger: 'lead.status = qualified AND emailStatus != sent',
    action: 'schedule_commercial_followup',
    module: 'commercial',
  },
  {
    name: 'Discovery aprovado -> Proposta',
    trigger: 'discovery.status = approved',
    action: 'create_proposal_from_discovery',
    module: 'commercial',
  },
  {
    name: 'Proposta assinada -> Projeto',
    trigger: 'proposal.status = signed',
    action: 'create_project_backlog_sdd',
    module: 'delivery',
  },
  {
    name: 'Backlog em revisão -> QA',
    trigger: 'backlog.status = review',
    action: 'create_qa_test',
    module: 'qa',
  },
  {
    name: 'QA aprovado -> Deploy liberado',
    trigger: 'qa.status = passed',
    action: 'enable_deploy',
    module: 'deploy',
  },
];

export const AUTOMATION_OBSERVABILITY_STATUSES = [
  'approved',
  'rejected',
  'sent',
  'failed',
  'responded',
  'opportunity',
  'pending_approval',
  'blocked',
  'skipped',
  'success',
];

const normalizeAutomationStatus = (status) => {
  const normalized = String(status || 'success').toLowerCase();
  return AUTOMATION_OBSERVABILITY_STATUSES.includes(normalized) ? normalized : 'success';
};

export const createAutomationLog = (status, message, metadata = {}) => ({
  id: crypto.randomUUID?.() || `auto_log_${Date.now()}`,
  status: normalizeAutomationStatus(status),
  message,
  metadata: {
    observabilityVersion: 'ceo-v1',
    observabilityStatus: normalizeAutomationStatus(status),
    ...metadata,
  },
  createdAt: new Date().toISOString(),
});

const FOLLOW_UP_APPROVAL_SOURCE = 'commercial_followup_automation';

const normalizeId = (value) => String(value ?? '');

const isExternalSendAutomation = (automation = {}) => {
  const action = String(automation.action || '').toLowerCase();
  if (action === 'schedule_commercial_followup') return false;
  const searchable = `${automation.name || ''} ${automation.action || ''} ${automation.trigger || ''}`;
  return /whatsapp|email|e-mail|send|enviar|api|external|disparo/i.test(searchable);
};

const findLinkedApprovedApprovalRequest = (approvalRequests = [], automation = {}, approvalRequestId = null) => (
  approvalRequests.find(item => (
    item.status === 'approved'
    && (
      normalizeId(item.id) === normalizeId(approvalRequestId)
      || normalizeId(item.metadata?.approvalRequestId) === normalizeId(approvalRequestId)
      || normalizeId(item.metadata?.automationId) === normalizeId(automation.id)
      || normalizeId(item.payload?.automationId) === normalizeId(automation.id)
    )
  ))
);

export const guardExternalAutomationExecution = ({ automation = {}, approvalRequests = [], approvalRequestId = null } = {}) => {
  if (!isExternalSendAutomation(automation)) {
    return { allowed: true, externalSend: false };
  }

  const linkedApproval = findLinkedApprovedApprovalRequest(approvalRequests, automation, approvalRequestId);
  if (!linkedApproval) {
    return {
      allowed: false,
      externalSend: true,
      approvalRequired: true,
      status: 'blocked',
      observabilityStatus: 'blocked',
      message: 'Envio externo bloqueado: vincule um approvalRequest aprovado antes de executar WhatsApp, e-mail ou API externa.',
    };
  }

  return {
    allowed: true,
    externalSend: true,
    approvalRequestId: linkedApproval.id,
    approvalRequest: linkedApproval,
  };
};

const isFollowUpCandidate = (lead) => {
  const status = String(lead.status || '').toLowerCase();
  const emailStatus = String(lead.emailStatus || '').toLowerCase();
  return ['qualified', 'novo', 'new'].includes(status) && emailStatus !== 'sent';
};

const hasPendingFollowUpApproval = (approvalRequests = [], leadId) => (
  approvalRequests.some(item => (
    item.status === 'pending'
    && item.metadata?.source === FOLLOW_UP_APPROVAL_SOURCE
    && normalizeId(item.metadata?.leadId) === normalizeId(leadId)
  ))
);

export const buildConsultativeFollowUpMessage = (lead = {}) => {
  const company = lead.company || lead.name || 'sua empresa';
  return `Ola, tudo bem? Aqui e o Matheus, da Kentauros.

Faco parte de uma consultoria de solucoes tecnologicas focada em analisar sites e sistemas para identificar melhorias de usabilidade, conversao e eficiencia digital.

Analisei rapidamente o site da ${company} e encontrei algumas oportunidades que podem melhorar a experiencia do usuario e facilitar a geracao de novos contatos.

Posso te enviar um diagnostico rapido com os principais pontos que observei?`;
};

export const createCommercialFollowUpApproval = ({ lead, automation, requestedAt = new Date().toISOString() }) => ({
  entity_type: 'Lead',
  entity_id: String(lead.id),
  requested_by: automation?.createdBy || 'automation',
  approver_role: 'ADMIN',
  status: 'pending',
  title: `Aprovar follow-up - ${lead.company || lead.name || 'Lead'}`,
  summary: 'Follow-up comercial preparado para aprovaÃ§Ã£o humana antes de qualquer envio externo.',
  payload: {
    leadId: lead.id,
    company: lead.company || lead.name,
    email: lead.email,
    whatsapp: lead.whatsapp || lead.phone,
    channelCandidates: ['whatsapp', 'email'],
    message: buildConsultativeFollowUpMessage(lead),
    nextAction: 'Aprovar envio consultivo de follow-up',
  },
  metadata: {
    source: FOLLOW_UP_APPROVAL_SOURCE,
    automationId: automation?.id,
    automationName: automation?.name,
    leadId: lead.id,
    risk: 'medio',
    requiresHumanApproval: true,
    externalSendBlocked: true,
    requestedAt,
  },
});

export const createAutomationObservabilityLearning = ({ automation = {}, logs = [], approvalRequests = [] } = {}) => {
  const counts = AUTOMATION_OBSERVABILITY_STATUSES.reduce((acc, status) => ({ ...acc, [status]: 0 }), {});
  logs.forEach((log) => {
    const status = normalizeAutomationStatus(log.status || log.metadata?.observabilityStatus);
    counts[status] = Number(counts[status] || 0) + 1;
  });
  const linkedApprovalRequests = approvalRequests.filter(item => (
    !automation.id
    || normalizeId(item.metadata?.automationId) === normalizeId(automation.id)
    || normalizeId(item.payload?.automationId) === normalizeId(automation.id)
  ));

  const sent = Number(counts.sent || 0);
  const responded = Number(counts.responded || 0);
  const opportunity = Number(counts.opportunity || 0);
  const failed = Number(counts.failed || 0);
  const approved = Number(counts.approved || 0) + linkedApprovalRequests.filter(item => item.status === 'approved').length;
  const rejected = Number(counts.rejected || 0) + linkedApprovalRequests.filter(item => item.status === 'rejected').length;
  const responseRate = sent ? Math.round((responded / sent) * 100) : 0;
  const opportunityRate = sent ? Math.round((opportunity / sent) * 100) : 0;
  const operationalRisk = failed > 0 && failed >= sent ? 'alto' : failed > 0 || counts.blocked > 0 ? 'medio' : 'baixo';
  const automationName = automation.name || automation.action || 'Automacao';

  return {
    source: 'automation_observability',
    event_type: 'automation_observability_review',
    title: `Observabilidade CEO - ${automationName}`,
    content: `Automacao revisada pelo CEO com ${sent} envio(s), ${responded} resposta(s), ${opportunity} oportunidade(s), ${failed} falha(s) e risco operacional ${operationalRisk}. Taxa de resposta: ${responseRate}%.`,
    signal_strength: operationalRisk === 'alto' ? 5 : 4,
    tags: ['Automation', 'CEO', 'Observability', automation.module || 'general', operationalRisk],
    metadata: {
      automationId: automation.id,
      action: automation.action,
      requiresHumanApproval: true,
      operationalRisk,
      metrics: {
        approved,
        rejected,
        sent,
        failed,
        responded,
        opportunity,
        responseRate,
        opportunityRate,
      },
    },
  };
};

const emptyAutomationStatusCounts = () =>
  AUTOMATION_OBSERVABILITY_STATUSES.reduce((acc, status) => ({ ...acc, [status]: 0 }), {});

const countAutomationLogs = (logs = []) => logs.reduce((acc, log) => {
  const status = normalizeAutomationStatus(log.status || log.metadata?.observabilityStatus);
  return { ...acc, [status]: Number(acc[status] || 0) + 1 };
}, emptyAutomationStatusCounts());

const rateFromSent = (value, sent) => (sent ? Math.round((Number(value || 0) / sent) * 100) : 0);

export const createAutomationResponseDashboard = ({ automations = [], periodLabel = 'ultimos logs' } = {}) => {
  const rows = automations.map((automation) => {
    const counts = countAutomationLogs(automation.logs || []);
    const sent = Number(counts.sent || 0);
    const failed = Number(counts.failed || 0);
    const responded = Number(counts.responded || 0);
    const opportunity = Number(counts.opportunity || 0);

    return {
      automationId: automation.id,
      name: automation.name || automation.action || 'Automacao',
      status: automation.status || 'active',
      module: automation.module || 'general',
      counts,
      approved: Number(counts.approved || 0),
      sent,
      failed,
      responded,
      opportunity,
      responseRate: rateFromSent(responded, sent),
      failureRate: rateFromSent(failed, sent),
      opportunityRate: rateFromSent(opportunity, sent),
      lastRun: automation.lastRun || null,
      risk: failed > 0 && failed >= responded ? 'alto' : failed > 0 ? 'medio' : 'baixo',
    };
  });

  const totals = rows.reduce((acc, row) => ({
    approved: acc.approved + row.approved,
    sent: acc.sent + row.sent,
    failed: acc.failed + row.failed,
    responded: acc.responded + row.responded,
    opportunity: acc.opportunity + row.opportunity,
  }), { approved: 0, sent: 0, failed: 0, responded: 0, opportunity: 0 });

  return {
    source: 'automation_response_dashboard',
    periodLabel,
    rows: rows.sort((a, b) => (
      b.failureRate - a.failureRate ||
      b.responseRate - a.responseRate ||
      String(a.name).localeCompare(String(b.name))
    )),
    totals: {
      ...totals,
      responseRate: rateFromSent(totals.responded, totals.sent),
      failureRate: rateFromSent(totals.failed, totals.sent),
      opportunityRate: rateFromSent(totals.opportunity, totals.sent),
    },
  };
};

export const createAutomationResponseLearning = ({
  dashboard,
  responseRateFloor = 20,
  failureRateCeiling = 25,
} = {}) => {
  const summary = dashboard || createAutomationResponseDashboard();
  const lowResponse = summary.totals.sent > 0 && summary.totals.responseRate < responseRateFloor;
  const highFailure = summary.totals.sent > 0 && summary.totals.failureRate > failureRateCeiling;
  const risk = highFailure ? 'alto' : lowResponse ? 'medio' : 'baixo';
  const topRisk = summary.rows.find(row => row.risk !== 'baixo') || summary.rows[0];

  return {
    source: 'automation_response_dashboard',
    event_type: 'automation_response_dashboard_review',
    title: 'Painel CEO de resposta das automacoes aprovadas',
    content: `Painel consolidou ${summary.totals.sent} envio(s), ${summary.totals.responded} resposta(s), ${summary.totals.failed} falha(s) e ${summary.totals.opportunity} oportunidade(s). Taxa de resposta ${summary.totals.responseRate}% e taxa de falha ${summary.totals.failureRate}%. Risco ${risk}${topRisk?.name ? ` em destaque: ${topRisk.name}.` : '.'}`,
    signal_strength: risk === 'alto' ? 5 : risk === 'medio' ? 4 : 3,
    tags: ['Automation', 'CEO', 'ResponseDashboard', risk],
    metadata: {
      requiresHumanApproval: true,
      operationalRisk: risk,
      periodLabel: summary.periodLabel,
      topRiskAutomationId: topRisk?.automationId,
      metrics: summary.totals,
      thresholds: {
        responseRateFloor,
        failureRateCeiling,
      },
      shouldEscalate: lowResponse || highFailure,
    },
  };
};

export const runAutomationAction = ({ automation, data, actions }) => {
  const action = automation.action;
  const now = new Date().toISOString();
  const approvalGuard = guardExternalAutomationExecution({
    automation,
    approvalRequests: data.approvalRequests || [],
    approvalRequestId: automation.approvalRequestId || automation.params?.approvalRequestId,
  });

  if (!approvalGuard.allowed) {
    return {
      status: approvalGuard.status,
      observabilityStatus: approvalGuard.observabilityStatus,
      message: approvalGuard.message,
      approvalRequired: approvalGuard.approvalRequired,
    };
  }

  if (action === 'schedule_commercial_followup') {
    const maxQueue = Number(automation.maxQueue || automation.params?.maxQueue || 25);
    const leadsToQueue = (data.leads || [])
      .filter(isFollowUpCandidate)
      .filter(lead => !hasPendingFollowUpApproval(data.approvalRequests, lead.id))
      .slice(0, maxQueue);

    if (leadsToQueue.length === 0) {
      return { status: 'skipped', message: 'Nenhum lead elegÃ­vel sem aprovaÃ§Ã£o pendente para follow-up.' };
    }

    const approvals = leadsToQueue.map(lead => (
      actions.addApprovalRequest(createCommercialFollowUpApproval({ lead, automation, requestedAt: now }))
    ));

    return {
      status: 'pending_approval',
      message: `${approvals.length} follow-up(s) preparados para aprovaÃ§Ã£o humana antes de qualquer envio externo.`,
      entityId: approvals[0]?.id,
      queuedCount: approvals.length,
    };
  }

  if (action === 'create_qa_test') {
    const task = data.backlog.find(item => item.status === 'review' && !data.qaTests.some(test => test.taskId === item.id));
    if (!task) return { status: 'skipped', message: 'Nenhuma tarefa em revisão sem QA.' };
    const qa = actions.addQaTest({
      projectId: task.projectId,
      taskId: task.id,
      title: `QA automatizado - ${task.title}`,
      type: 'automated_sdd',
      status: 'pending',
      environment: 'staging',
      documentation: 'Gerado automaticamente a partir de tarefa em validação.',
    });
    return { status: 'success', message: `QA criado para ${task.title}.`, entityId: qa.id };
  }

  if (action === 'enable_deploy') {
    const qa = data.qaTests.find(item => item.status === 'passed');
    if (!qa) return { status: 'skipped', message: 'Nenhum QA aprovado encontrado.' };
    const deploy = actions.addDeployment({
      projectId: qa.projectId,
      env: 'staging',
      version: 'ready',
      status: 'ready',
      notes: 'Deploy liberado automaticamente após QA aprovado.',
    });
    return { status: 'success', message: `Deploy liberado para projeto ${qa.projectId}.`, entityId: deploy.id };
  }

  if (approvalGuard.externalSend) {
    return {
      status: 'success',
      observabilityStatus: 'sent',
      message: `${automation.name} autorizada por approvalRequest e registrada para observabilidade CEO.`,
      approvalRequestId: approvalGuard.approvalRequestId,
      executedAt: now,
    };
  }

  if (action === 'create_project_backlog_sdd') {
    return { status: 'skipped', message: 'A criação de projeto por proposta é executada no workflow comercial.' };
  }

  if (action === 'create_proposal_from_discovery') {
    return { status: 'skipped', message: 'A criação de proposta por Discovery é executada no workflow comercial.' };
  }

  return { status: 'success', message: `${automation.name} executada sem ação operacional vinculada em modo pré-pronto.`, executedAt: now };
};
