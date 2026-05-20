import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildConsultativeFollowUpMessage,
  createAutomationLog,
  createAutomationObservabilityLearning,
  createAutomationResponseDashboard,
  createAutomationResponseLearning,
  runAutomationAction,
} from './ecosystemAutomation.js';

test('automation queues qualified lead follow-up for human approval', () => {
  let updated = null;
  let approval = null;
  const result = runAutomationAction({
    automation: { action: 'schedule_commercial_followup' },
    data: { leads: [{ id: 1, company: 'Lead A', status: 'qualified' }], backlog: [], qaTests: [], approvalRequests: [] },
    actions: {
      updateLead: (id, data) => { updated = { id, data }; },
      addApprovalRequest: (data) => { approval = data; return { id: 'approval-1', ...data }; },
      addQaTest: () => {},
      addDeployment: () => {},
    },
  });

  assert.equal(result.status, 'pending_approval');
  assert.equal(updated, null);
  assert.equal(approval.status, 'pending');
  assert.equal(approval.metadata.leadId, 1);
  assert.equal(approval.metadata.requiresHumanApproval, true);
  assert.match(approval.payload.message, /Lead A/);
});

test('automation does not duplicate pending follow-up approvals for the same lead', () => {
  let approvalsCreated = 0;
  const result = runAutomationAction({
    automation: { action: 'schedule_commercial_followup' },
    data: {
      leads: [{ id: 1, company: 'Lead A', status: 'qualified' }],
      backlog: [],
      qaTests: [],
      approvalRequests: [{
        status: 'pending',
        metadata: { source: 'commercial_followup_automation', leadId: 1 },
      }],
    },
    actions: {
      updateLead: () => {},
      addApprovalRequest: () => { approvalsCreated += 1; },
      addQaTest: () => {},
      addDeployment: () => {},
    },
  });

  assert.equal(result.status, 'skipped');
  assert.equal(approvalsCreated, 0);
});

test('consultative follow-up message uses captured lead company', () => {
  const message = buildConsultativeFollowUpMessage({ company: 'Centro da Pele' });

  assert.match(message, /Centro da Pele/);
  assert.match(message, /diagnostico rapido/);
});

test('automation creates QA test from review backlog', () => {
  const result = runAutomationAction({
    automation: { action: 'create_qa_test' },
    data: { leads: [], backlog: [{ id: 7, projectId: 3, title: 'Tela de login', status: 'review' }], qaTests: [] },
    actions: {
      updateLead: () => {},
      addQaTest: (data) => ({ id: 'qa-1', ...data }),
      addDeployment: () => {},
    },
  });

  assert.equal(result.status, 'success');
  assert.equal(result.entityId, 'qa-1');
});

test('automation log contains timestamp and status', () => {
  const log = createAutomationLog('success', 'ok');

  assert.equal(log.status, 'success');
  assert.ok(log.createdAt);
});

test('automation blocks external send without linked approval request', () => {
  const result = runAutomationAction({
    automation: { id: 'auto-whatsapp', name: 'Enviar WhatsApp', action: 'send_whatsapp' },
    data: { leads: [], backlog: [], qaTests: [], approvalRequests: [] },
    actions: {},
  });

  assert.equal(result.status, 'blocked');
  assert.equal(result.approvalRequired, true);
  assert.match(result.message, /approvalRequest/);
});

test('automation allows external send with approved linked approval request', () => {
  const result = runAutomationAction({
    automation: { id: 'auto-whatsapp', name: 'Enviar WhatsApp', action: 'send_whatsapp' },
    data: {
      leads: [],
      backlog: [],
      qaTests: [],
      approvalRequests: [{
        id: 'approval-1',
        status: 'approved',
        metadata: { automationId: 'auto-whatsapp' },
      }],
    },
    actions: {},
  });

  assert.equal(result.status, 'success');
  assert.equal(result.observabilityStatus, 'sent');
  assert.equal(result.approvalRequestId, 'approval-1');
});

test('automation observability learning calculates response and opportunity rates', () => {
  const learning = createAutomationObservabilityLearning({
    automation: { id: 'auto-1', name: 'Follow-up CEO', action: 'send_whatsapp', module: 'commercial' },
    approvalRequests: [
      { id: 'approval-1', status: 'approved', metadata: { automationId: 'auto-1' } },
      { id: 'approval-2', status: 'approved', metadata: { automationId: 'other-auto' } },
    ],
    logs: [
      createAutomationLog('sent', 'sent 1'),
      createAutomationLog('sent', 'sent 2'),
      createAutomationLog('responded', 'responded'),
      createAutomationLog('opportunity', 'opportunity'),
      createAutomationLog('failed', 'failed'),
    ],
  });

  assert.equal(learning.source, 'automation_observability');
  assert.equal(learning.metadata.metrics.sent, 2);
  assert.equal(learning.metadata.metrics.approved, 1);
  assert.equal(learning.metadata.metrics.responseRate, 50);
  assert.equal(learning.metadata.metrics.opportunityRate, 50);
  assert.equal(learning.metadata.requiresHumanApproval, true);
});

test('automation response dashboard groups executive statuses and rates by automation', () => {
  const dashboard = createAutomationResponseDashboard({
    automations: [
      {
        id: 'auto-1',
        name: 'Follow-up aprovado',
        status: 'active',
        logs: [
          createAutomationLog('approved', 'approved'),
          createAutomationLog('sent', 'sent 1'),
          createAutomationLog('sent', 'sent 2'),
          createAutomationLog('responded', 'responded'),
          createAutomationLog('opportunity', 'opportunity'),
          createAutomationLog('failed', 'failed'),
        ],
      },
      {
        id: 'auto-2',
        name: 'Sem envio',
        status: 'active',
        logs: [createAutomationLog('approved', 'approved')],
      },
    ],
  });

  assert.equal(dashboard.totals.approved, 2);
  assert.equal(dashboard.totals.sent, 2);
  assert.equal(dashboard.totals.failed, 1);
  assert.equal(dashboard.totals.responded, 1);
  assert.equal(dashboard.totals.opportunity, 1);
  assert.equal(dashboard.totals.responseRate, 50);
  assert.equal(dashboard.totals.failureRate, 50);
  assert.equal(dashboard.rows[0].automationId, 'auto-1');
  assert.equal(dashboard.rows[0].responseRate, 50);
  assert.equal(dashboard.rows[0].opportunityRate, 50);
});

test('automation response learning is created when response drops or failure rises', () => {
  const dashboard = createAutomationResponseDashboard({
    automations: [{
      id: 'auto-1',
      name: 'Follow-up aprovado',
      status: 'active',
      logs: [
        createAutomationLog('sent', 'sent 1'),
        createAutomationLog('sent', 'sent 2'),
        createAutomationLog('sent', 'sent 3'),
        createAutomationLog('failed', 'failed 1'),
        createAutomationLog('failed', 'failed 2'),
      ],
    }],
  });

  const learning = createAutomationResponseLearning({ dashboard });

  assert.equal(learning.event_type, 'automation_response_dashboard_review');
  assert.equal(learning.metadata.requiresHumanApproval, true);
  assert.equal(learning.metadata.metrics.failureRate, 67);
  assert.ok(learning.content.includes('falha'));
});
