const STATUS_ORDER = ['new', 'qualified', 'discovery', 'proposal', 'won'];

const today = () => new Date().toISOString().split('T')[0];

export const canTransitionLeadStatus = (fromStatus = 'new', toStatus = 'new', reason = '') => {
  if (fromStatus === toStatus) return { allowed: true };
  if (toStatus === 'lost') {
    return reason || fromStatus !== 'proposal'
      ? { allowed: true }
      : { allowed: false, reason: 'Perda de proposta exige motivo.' };
  }

  const fromIndex = STATUS_ORDER.indexOf(fromStatus);
  const toIndex = STATUS_ORDER.indexOf(toStatus);
  if (fromIndex === -1 || toIndex === -1) return { allowed: false, reason: 'Status desconhecido.' };
  if (toIndex < fromIndex) return { allowed: false, reason: 'Regressao de status exige acao explicita.' };
  return { allowed: true };
};

export const buildDiscoveryFromLead = (lead = {}) => ({
  leadId: lead.id,
  clientName: lead.company,
  title: `Discovery: ${lead.company}`,
  status: 'in_progress',
  meetingStatus: 'reuniao_confirmada',
  tags: ['reuniao_confirmada', 'lead_qualificado'],
  recordings: [],
  decisions: [],
  rules: ['Toda decisao registrada deve alimentar proposta, backlog, QA e deploy.'],
  createdAt: today(),
  summary: lead.notes || `Iniciado discovery para ${lead.company}`,
  opportunity: lead.opportunity || lead.prospectingPlan?.offer?.label || '',
  scope: lead.scope || '',
  nextAction: lead.nextAction || 'Validar diagnostico e preparar proposta',
  hours: 0,
  estimatedValue: Number(lead.value || lead.estimatedValue || lead.metadata?.estimatedValue || 0),
  website: lead.website || lead.metadata?.website || '',
  email: lead.email || '',
  phone: lead.phone || lead.whatsapp || '',
  source: lead.source || lead.metadata?.capLeadSource || '',
  commercialOwnerUserId: lead.commercialOwnerUserId || lead.user_id || null,
  commercialOwnerEmail: lead.commercialOwnerEmail || lead.metadata?.commercialOwnerEmail || '',
  metadata: {
    ...(lead.metadata || {}),
    captureIdentity: lead.captureIdentity || null,
    pricingModel: lead.pricingModel || lead.metadata?.pricingModel || '',
    leadSnapshot: {
      id: lead.id,
      company: lead.company,
      email: lead.email,
      phone: lead.phone,
      website: lead.website || lead.metadata?.website || '',
      value: lead.value,
    },
  },
});

export const isDiscoveryReadyForProposal = (discovery = {}) => {
  const missing = [];
  if (!String(discovery.summary || '').trim()) missing.push('summary');
  if (!String(discovery.opportunity || '').trim()) missing.push('opportunity');
  if (!String(discovery.scope || '').trim()) missing.push('scope');
  if (!Number(discovery.estimatedValue || discovery.value || 0)) missing.push('estimatedValue');
  if (!String(discovery.nextAction || '').trim()) missing.push('nextAction');
  return { ready: missing.length === 0, missing };
};

export const findExistingProposal = (proposals = [], discovery = {}) =>
  proposals.find(proposal =>
    (discovery.id && String(proposal.discoveryId) === String(discovery.id)) ||
    (discovery.leadId && String(proposal.leadId) === String(discovery.leadId)) ||
    (discovery.clientName && proposal.clientName === discovery.clientName)
  ) || null;

export const buildProposalFromDiscovery = (discovery = {}, user = {}) => ({
  discoveryId: discovery.id,
  leadId: discovery.leadId || null,
  clientName: discovery.clientName,
  title: `Proposta Comercial - ${discovery.clientName}`,
  status: 'draft',
  value: Number(discovery.estimatedValue || discovery.value || 0),
  validUntil: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  createdAt: today(),
  documents: ['Escopo comercial', 'Cronograma', 'Termos de aceite'],
  summary: discovery.summary,
  opportunity: discovery.opportunity || '',
  scope: discovery.scope || '',
  approvalFlow: [
    { step: 'Comercial', status: 'approved', at: new Date().toISOString(), userId: user?.id },
    { step: 'Admin', status: 'pending' },
    { step: 'Cliente', status: 'pending' },
  ],
});

export const buildRetentionClientFromProposal = (proposal = {}) => ({
  id: proposal.clientId || `client-${proposal.id || Date.now()}`,
  company: proposal.clientName,
  name: proposal.clientName,
  contact: proposal.contact || 'Representante',
  email: proposal.email || '',
  phone: proposal.phone || '',
  status: 'active',
  originProposalId: proposal.id,
  originLeadId: proposal.leadId || null,
  contractValue: Number(proposal.value || 0),
  successMetrics: [
    'Aumentar contatos qualificados gerados pelo canal digital',
    'Reduzir friccao de usabilidade no fluxo principal',
    'Medir impacto das melhorias em conversao',
  ],
  retentionRoadmap: [
    'Revisao executiva pos-entrega',
    'Plano mensal de melhorias',
    'Automacoes e evolucoes com IA',
  ],
  nextReviewAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  recurringOpportunity: true,
  tags: ['Cliente', 'Retencao', 'IA'],
});

const timelineDate = (item = {}, fallback = today()) =>
  item.createdAt || item.created_at || item.updatedAt || item.updated_at || item.lastActivity || fallback;

export const buildOpportunityTimeline = ({
  lead,
  discoveries = [],
  proposals = [],
  prototypes = [],
  projects = [],
  clients = [],
  interactions = [],
} = {}) => {
  if (!lead) return [];
  const leadId = String(lead.id);
  const company = lead.company;
  const matchesLead = item =>
    String(item.leadId || item.lead_id || '') === leadId ||
    item.clientName === company ||
    item.client_name === company ||
    item.company === company ||
    item.client === company;

  const rows = [
    { type: 'lead', title: 'Lead capturado', entity: company, date: timelineDate(lead, '1970-01-01'), status: lead.status },
    ...discoveries.filter(matchesLead).map(item => ({ type: 'discovery', title: item.title || 'Discovery', entity: item.clientName, date: timelineDate(item), status: item.status })),
    ...proposals.filter(matchesLead).map(item => ({ type: 'proposal', title: item.title || 'Proposta', entity: item.clientName, date: timelineDate(item), status: item.status })),
    ...prototypes.filter(matchesLead).map(item => ({ type: 'prototype', title: `Prototipo ${item.client_name || item.clientName || company}`, entity: item.client_name || company, date: timelineDate(item), status: item.status })),
    ...projects.filter(matchesLead).map(item => ({ type: 'project', title: item.name || 'Projeto', entity: item.client, date: timelineDate(item), status: item.status })),
    ...clients.filter(matchesLead).map(item => ({ type: 'client', title: item.company || item.name || 'Cliente', entity: item.company || item.name, date: timelineDate(item), status: item.status })),
    ...interactions.map(item => ({ type: item.type || 'interaction', title: item.message || item.title || 'Interacao', entity: company, date: item.timestamp || today(), status: item.status || 'done' })),
  ];

  return rows.sort((a, b) => new Date(a.date) - new Date(b.date));
};

export const getConversionMetrics = ({ leads = [], discoveries = [], proposals = [], clients = [] } = {}) => {
  const captured = leads.length;
  const qualified = leads.filter(lead => ['qualified', 'discovery', 'proposal', 'won'].includes(lead.status)).length;
  const won = leads.filter(lead => lead.status === 'won').length + clients.length;
  const totalValue = proposals.reduce((sum, proposal) => sum + Number(proposal.value || 0), 0);
  return {
    captured,
    qualified,
    discoveries: discoveries.length,
    proposals: proposals.length,
    won,
    averageTicket: proposals.length ? Math.round(totalValue / proposals.length) : 0,
    leadToProposalRate: captured ? Math.round((proposals.length / captured) * 100) : 0,
    proposalToClientRate: proposals.length ? Math.round((won / proposals.length) * 100) : 0,
  };
};
