import test from 'node:test';
import assert from 'node:assert/strict';

import {
  classifyClientHealth,
  classifyFunnelIssue,
  createAutomationRegistry,
  createCopyExperiment,
  createDecisionRecommendations,
  createDiagnosticByNiche,
  createHumanReviewQueue,
  createCommercialFunnelPlaybook,
  createCommercialRecommendationBacklog,
  createOperationalConversionCycle,
  createOperationalUxReview,
  createOpenProposalRoiReview,
  createMonthlyClientReview,
  createPostMortem,
  createProductOpportunityRadar,
  createProposalTemplate,
  createWeeklyCeoReview,
  getFollowUpQueue,
  getLeadCoolingAlerts,
  getMastermindLearningEvents,
  getOpportunityScore,
  getUpsellAlerts,
  scoreInitiative,
} from './continuousImprovement.js';

const leads = [
  { id: 'l1', company: 'Clinica Alfa', status: 'new', value: 12000, score: 80, lastActivity: '2026-05-01', nextAction: '' },
  { id: 'l2', company: 'Beta Contabil', status: 'proposal', value: 22000, score: 70, lastActivity: '2026-05-16', nextAction: 'Enviar proposta' },
  { id: 'l3', company: 'Gama Vet', status: 'lost', lossReason: 'preco', value: 9000, score: 45 },
];
const proposals = [{ id: 'p1', clientName: 'Beta Contabil', status: 'sent', value: 22000 }];
const clients = [{ id: 'c1', company: 'Cliente Ativo', status: 'active', nextReviewAt: '2026-04-01', retentionRoadmap: [] }];

test('scores initiatives using CEO prioritization criteria', () => {
  const result = scoreInitiative({
    commercial: 5,
    financial: 4,
    technical: 4,
    client: 5,
    urgency: 5,
    complexity: 3,
    risk: 4,
    reuse: 4,
    automation: 5,
  });

  assert.equal(result.total, 39);
  assert.equal(result.priority, 'alta');
});

test('creates decision recommendations from funnel data', () => {
  const recommendations = createDecisionRecommendations({
    leads,
    proposals,
    clients,
    discoveries: [{ id: 'd1', clientName: 'Clinica Alfa', summary: '', opportunity: 'IA', scope: '', estimatedValue: 0, nextAction: '' }],
  });

  assert.equal(recommendations.length > 0, true);
  assert.equal(recommendations[0].status, 'pending_review');
  assert.ok(recommendations[0].impact.expected.includes('conversao') || recommendations[0].impact.expected.includes('retencao'));
  assert.ok(recommendations.some(item => item.id === 'rec_complete_discovery_before_proposal'));
});

test('converts commercial recommendations into prioritized idempotent backlog tasks', () => {
  const recommendations = createDecisionRecommendations({ leads, proposals, clients });
  const tasks = createCommercialRecommendationBacklog({
    recommendations,
    existingBacklog: [{ id: 'existing', sourceRecommendationId: recommendations[0].id }],
    ownerId: 7,
  });

  assert.equal(tasks.some(task => task.sourceRecommendationId === recommendations[0].id), false);
  assert.equal(tasks.every(task => task.type === 'commercial_recommendation'), true);
  assert.equal(tasks.every(task => task.assignee === 7), true);
  assert.equal(tasks[0].status, 'todo');
  assert.ok(tasks[0].executionPrompt.includes('MasterMind CEO'));
  assert.ok(tasks[0].description.includes(tasks[0].impact.expected));
});

test('creates weekly CEO review with indicators and next decisions', () => {
  const review = createWeeklyCeoReview({ leads, proposals, clients });

  assert.equal(review.indicators.leads, 3);
  assert.equal(review.nextDecisions.length > 0, true);
});

test('creates operational conversion cycle backlog from funnel bottlenecks', () => {
  const cycle = createOperationalConversionCycle({
    leads,
    discoveries: [{ id: 'd1', clientName: 'Clinica Alfa', summary: '', opportunity: 'IA', scope: '', estimatedValue: 0, nextAction: '' }],
    proposals,
    clients,
    existingBacklog: [],
    ownerId: 7,
  });

  assert.equal(cycle.analysis.leadsWithoutNextAction, 1);
  assert.equal(cycle.analysis.incompleteDiscoveries, 1);
  assert.equal(cycle.analysis.openProposals, 1);
  assert.equal(cycle.backlog.length >= 3, true);
  assert.ok(cycle.backlog.some(task => task.sourceRecommendationId === 'rec_complete_discovery_before_proposal'));
  assert.ok(cycle.learningEvent.content.includes('Discovery'));
  assert.equal(cycle.learningEvent.event_type, 'operational_conversion_cycle_applied');
});

test('creates commercial funnel playbook from the dominant bottleneck', () => {
  const playbook = createCommercialFunnelPlaybook({
    leads,
    discoveries: [{ id: 'd1', clientName: 'Clinica Alfa', summary: '', opportunity: 'IA', scope: '', estimatedValue: 0, nextAction: '' }],
    proposals,
    clients,
    ownerId: 'matheus',
  });

  assert.equal(playbook.ownerId, 'matheus');
  assert.ok(playbook.steps.length >= 3);
  assert.ok(playbook.metric.includes('conversao'));
  assert.equal(playbook.learningEvent.event_type, 'commercial_playbook_applied');
});

test('reviews open proposals missing ROI, next action or decision deadline', () => {
  const review = createOpenProposalRoiReview({
    proposals: [
      { id: 'p1', clientName: 'Beta Contabil', status: 'sent', value: 22000, ownerId: 7 },
      {
        id: 'p2',
        clientName: 'Cliente Pronto',
        status: 'sent',
        value: 18000,
        nextAction: 'Validar decisao',
        roiNarrative: 'Reduzir 10 horas semanais',
        validUntil: '2026-05-30',
      },
      { id: 'p3', clientName: 'Cliente Fechado', status: 'approved', value: 12000 },
    ],
    clients: [{ id: 'c1', company: 'Cliente Fechado' }],
    projects: [{ id: 'pr1', client: 'Cliente Fechado', status: 'active' }],
  });

  assert.equal(review.openProposalCount, 2);
  assert.equal(review.atRiskProposals.length, 1);
  assert.equal(review.atRiskProposals[0].missingFields.includes('nextAction'), true);
  assert.equal(review.atRiskProposals[0].missingFields.includes('roi'), true);
  assert.equal(review.atRiskProposals[0].missingFields.includes('decisionDeadline'), true);
  assert.equal(review.followUps[0].proposalId, 'p1');
  assert.equal(review.followUps[0].responsible, 7);
  assert.ok(review.followUps[0].message.includes('ROI'));
  assert.equal(review.learningEvent.event_type, 'open_proposal_roi_review_applied');
  assert.equal(review.learningEvent.metadata.proposalToClientRate, 33);
});

test('creates operational UX review for critical screens', () => {
  const review = createOperationalUxReview({
    screens: ['Leads', 'MasterMind CEO', 'Discovery', 'Clientes'],
    findings: [
      { screen: 'Leads', issue: 'Acoes truncadas no grid', severity: 'high' },
      { screen: 'Discovery', issue: 'Checklist disperso', severity: 'medium' },
    ],
  });

  assert.equal(review.status, 'needs_attention');
  assert.equal(review.screens.length, 4);
  assert.ok(review.actions.some(item => item.screen === 'Leads'));
  assert.equal(review.learningEvent.event_type, 'operational_ux_review_applied');
});

test('classifies funnel issues and converts them into learning events', () => {
  assert.equal(classifyFunnelIssue({ lossReason: 'Muito caro para agora' }).category, 'preco');
  const events = getMastermindLearningEvents({ leads, proposals, clients });
  assert.equal(events.some(event => event.event_type === 'funnel_learning'), true);
});

test('builds follow-up queue and cooling alerts for stale leads', () => {
  const queue = getFollowUpQueue(leads, '2026-05-18');
  const alerts = getLeadCoolingAlerts(leads, '2026-05-18');

  assert.equal(queue[0].leadId, 'l1');
  assert.equal(alerts[0].risk, 'high');
});

test('creates diagnostic and proposal templates by niche and project type', () => {
  assert.equal(createDiagnosticByNiche('clinicas').niche, 'clinicas');
  assert.equal(createProposalTemplate('dashboard').projectType, 'dashboard');
});

test('creates copy experiment with variants and measurable metric', () => {
  const experiment = createCopyExperiment('whatsapp_diagnostico');

  assert.equal(experiment.variants.length, 2);
  assert.equal(experiment.metric, 'reply_rate');
});

test('classifies client health and monthly review', () => {
  const health = classifyClientHealth(clients[0], { today: '2026-05-18' });
  const review = createMonthlyClientReview(clients[0], { projects: [], today: '2026-05-18' });

  assert.equal(health.status, 'red');
  assert.equal(review.opportunities.length > 0, true);
});

test('finds upsell alerts from delivered clients with empty roadmap', () => {
  const alerts = getUpsellAlerts(clients, [{ id: 'pr1', client: 'Cliente Ativo', status: 'done' }]);

  assert.equal(alerts[0].client, 'Cliente Ativo');
});

test('creates automation registry, review queue, postmortem and product radar', () => {
  const registry = createAutomationRegistry([{ id: 'a1', name: 'Follow-up', status: 'active', logs: [] }]);
  const reviewQueue = createHumanReviewQueue([{ id: 'r1', title: 'Aprovar desconto', financialImpact: 5000 }]);
  const postMortem = createPostMortem({ type: 'deploy', summary: 'Falha em prod' });
  const radar = createProductOpportunityRadar([
    { category: 'retrabalho', count: 4, description: 'Relatorios manuais recorrentes' },
  ]);

  assert.equal(registry[0].canRollback, true);
  assert.equal(reviewQueue[0].requiresHumanApproval, true);
  assert.equal(postMortem.sections.includes('Causa raiz'), true);
  assert.equal(radar[0].candidateType, 'agent_or_template');
});

test('calculates opportunity score for visual components', () => {
  const score = getOpportunityScore(leads[0]);

  assert.equal(score.total > 0, true);
  assert.equal(score.recommendation.length > 0, true);
});
