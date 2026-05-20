import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CEO_ACTION_TYPES,
  applyApprovedCeoSuggestion,
  analyzeCapLeadKentaurosSecurity,
  analyzeSupabaseRlsGovernance,
  createSupabaseRlsCorrectionPlan,
  createSecretEnvironmentMatrix,
  createAiReuseMatrix,
  createAiReuseImpactValidation,
  createCommercialImpactAudit,
  createCommercialGapExecutionBoard,
  createRevenueRetentionKpiBoard,
  createRevenueRetentionKpiValidation,
  createAutonomousApprovalGovernanceReview,
  canExecuteSensitiveCeoAction,
  createCapLeadKentaurosSecurityAudit,
  createCapLeadHardeningPlan,
  createCeoApprovalRequest,
  createCeoDiagnostics,
  createCeoRiskExecutionBoard,
  createCeoRiskTaskApprovalRequest,
  createContinuousCeoSuggestions,
  createManualCeoSuggestion,
  createCodexSuggestionPrompt,
  createSkillApprovalRequest,
  createSkillGovernanceRegistry,
  summarizeCeoDiagnostics,
  markCeoSuggestionApplied,
  markSkillInstalled,
  approveSkillInstallation,
  createSkillGovernanceRecommendation,
  isActiveCeoApproval,
  rejectCeoSuggestion,
} from './strategicKernel.js';

test('creates continuous CEO suggestions that require human approval', () => {
  const suggestions = createContinuousCeoSuggestions({
    leads: [
      {
        id: 'lead-1',
        company: 'CapLead Clinic',
        source: 'CapLead',
        status: 'new',
        createdAt: '2026-05-01',
        lastActivity: '2026-05-01',
        value: 12000,
        email: 'contato@example.com',
      },
    ],
    automations: [{ id: 'auto-1', name: 'Follow-up', status: 'active', logs: [] }],
    approvalRequests: [],
    learningEvents: [],
  });

  assert.ok(suggestions.length >= 3);
  assert.ok(suggestions.every(item => item.approvalRequired));
  assert.equal(suggestions.some(item => item.id === 'ceo_security_audit'), false);
  assert.ok(suggestions.some(item => item.skillCandidates.length > 0));
});

test('does not duplicate pending CEO suggestions already awaiting approval', () => {
  const suggestions = createContinuousCeoSuggestions({
    leads: [{ id: 'lead-1', status: 'new', lastActivity: '2026-05-01' }],
    approvalRequests: [
      {
        status: 'pending',
        metadata: {
          source: 'ceo_strategic_kernel',
          suggestionId: 'ceo_followup_automation',
        },
      },
    ],
  });

  assert.equal(suggestions.some(item => item.id === 'ceo_followup_automation'), false);
});

test('does not suggest follow-up automation when approved automation already exists', () => {
  const suggestions = createContinuousCeoSuggestions({
    leads: [{ id: 'lead-1', status: 'new', lastActivity: '2026-05-01' }],
    automations: [{
      id: 'auto-follow-up',
      action: 'schedule_commercial_followup',
      status: 'active',
      metadata: { requiresHumanApproval: true },
    }],
    approvalRequests: [],
    learningEvents: [],
  });

  assert.equal(suggestions.some(item => item.id === 'ceo_followup_automation'), false);
});

test('creates a new continuous learning suggestion after previous CEO learnings were applied', () => {
  const suggestions = createContinuousCeoSuggestions({
    learningEvents: [
      {
        event_type: 'ceo_suggestion_applied',
        tags: ['MasterMind', 'CEO', 'Aplicada'],
        metadata: {
          source: 'ceo_strategic_kernel',
          suggestionId: 'ceo_skill_governance',
        },
      },
      {
        event_type: 'ceo_suggestion_applied',
        tags: ['MasterMind', 'CEO', 'Aplicada'],
        metadata: {
          source: 'ceo_strategic_kernel',
          suggestionId: 'ceo_growth_recommendations',
        },
      },
    ],
  });

  assert.equal(suggestions.some(item => item.id.startsWith('ceo_continuous_learning_review_cycle_1')), true);
  assert.equal(suggestions.some(item => item.id === 'ceo_skill_governance'), false);
});

test('keeps generating cross-app CEO suggestions after applied cycles', () => {
  const suggestions = createContinuousCeoSuggestions({
    leads: [{ id: 'lead-1', source: 'CapLead', status: 'new', lastActivity: '2026-05-01' }],
    automations: [{ id: 'auto-follow-up', action: 'schedule_commercial_followup', status: 'active' }],
    approvalRequests: [],
    learningEvents: [
      {
        event_type: 'ceo_suggestion_applied',
        tags: ['MasterMind', 'CEO', 'Aplicada'],
        metadata: {
          source: 'ceo_strategic_kernel',
          suggestionId: 'ceo_growth_recommendations',
        },
      },
      {
        event_type: 'ceo_suggestion_applied',
        tags: ['MasterMind', 'CEO', 'Aplicada'],
        metadata: {
          source: 'ceo_strategic_kernel',
          suggestionId: 'ceo_continuous_learning_review_cycle_1',
        },
      },
    ],
  });

  const continuous = suggestions.filter(item => item.id.includes('continuous_learning_review_cycle_2'));

  assert.ok(continuous.length >= 2);
  assert.ok(continuous.some(item => item.target === 'Kentauros'));
  assert.equal(continuous.some(item => item.target === 'CapLead'), false);
  assert.ok(continuous.every(item => item.evidence.some(evidence => evidence.includes('MasterMind'))));
});

test('does not show implemented CapLead quality cycle as active suggestion', () => {
  const suggestions = createContinuousCeoSuggestions({
    leads: [{ id: 'lead-1', source: 'CapLead', status: 'new', lastActivity: '2026-05-01' }],
    learningEvents: [{
      event_type: 'ceo_suggestion_applied',
      tags: ['MasterMind', 'CEO', 'Aplicada'],
      metadata: {
        source: 'ceo_strategic_kernel',
        suggestionId: 'ceo_growth_recommendations',
      },
    }],
  });

  assert.equal(
    suggestions.some(item => item.id === 'ceo_continuous_learning_review_cycle_1_caplead_quality'),
    false
  );
});

test('does not show implemented CapLead quality cycle 2 as active suggestion', () => {
  const suggestions = createContinuousCeoSuggestions({
    leads: [{ id: 'lead-1', source: 'CapLead', status: 'new', lastActivity: '2026-05-01' }],
    learningEvents: [{
      event_type: 'ceo_suggestion_applied',
      tags: ['MasterMind', 'CEO', 'Aplicada'],
      metadata: {
        source: 'ceo_strategic_kernel',
        suggestionId: 'ceo_continuous_learning_review_cycle_1_caplead_quality',
      },
    }],
  });

  assert.equal(
    suggestions.some(item => item.id === 'ceo_continuous_learning_review_cycle_2_caplead_quality'),
    false
  );
  assert.ok(suggestions.length > 0);
  assert.ok(suggestions.some(item => item.id.startsWith('ceo_mastermind_')));
});

test('does not show implemented Kentauros conversion cycle 3 as active suggestion', () => {
  const suggestions = createContinuousCeoSuggestions({
    leads: [{ id: 'lead-1', source: 'CapLead', status: 'new', lastActivity: '2026-05-01' }],
    learningEvents: [{
      event_type: 'ceo_suggestion_applied',
      tags: ['MasterMind', 'CEO', 'Aplicada'],
      metadata: {
        source: 'ceo_strategic_kernel',
        suggestionId: 'ceo_continuous_learning_review_cycle_2_caplead_quality',
      },
    }],
  });

  assert.equal(
    suggestions.some(item => item.id === 'ceo_continuous_learning_review_cycle_3_kentauros_conversion'),
    false
  );
});

test('does not show implemented CapLead quality cycle 3 as active suggestion', () => {
  const suggestions = createContinuousCeoSuggestions({
    leads: [{ id: 'lead-1', source: 'CapLead', status: 'new', lastActivity: '2026-05-01' }],
    learningEvents: [{
      event_type: 'ceo_suggestion_applied',
      tags: ['MasterMind', 'CEO', 'Aplicada'],
      metadata: {
        source: 'ceo_strategic_kernel',
        suggestionId: 'ceo_continuous_learning_review_cycle_2_caplead_quality',
      },
    }],
  });

  assert.equal(
    suggestions.some(item => item.id === 'ceo_continuous_learning_review_cycle_3_caplead_quality'),
    false
  );
});

test('does not show implemented security operations cycle 3 as active suggestion', () => {
  const suggestions = createContinuousCeoSuggestions({
    leads: [{ id: 'lead-1', source: 'CapLead', status: 'new', lastActivity: '2026-05-01' }],
    automations: [
      { id: 'auto-1', status: 'active', logs: [] },
      { id: 'auto-2', status: 'active', logs: [] },
      { id: 'auto-3', status: 'active', logs: [] },
      { id: 'auto-4', status: 'active', logs: [] },
      { id: 'auto-5', status: 'active', logs: [] },
    ],
    learningEvents: [{
      event_type: 'ceo_suggestion_applied',
      tags: ['MasterMind', 'CEO', 'Aplicada'],
      metadata: {
        source: 'ceo_strategic_kernel',
        suggestionId: 'ceo_continuous_learning_review_cycle_2_caplead_quality',
      },
    }],
  });

  assert.equal(
    suggestions.some(item => item.id === 'ceo_continuous_learning_review_cycle_3_security_operations'),
    false
  );
});

test('does not show implemented cycle 4 suggestions after security operations cycle 3 is applied', () => {
  const suggestions = createContinuousCeoSuggestions({
    leads: [{ id: 'lead-1', source: 'CapLead', status: 'new', lastActivity: '2026-05-01' }],
    automations: [{ id: 'auto-1', status: 'active', logs: [] }],
    learningEvents: [{
      event_type: 'ceo_suggestion_applied',
      tags: ['MasterMind', 'CEO', 'Aplicada'],
      metadata: {
        source: 'ceo_strategic_kernel',
        suggestionId: 'ceo_continuous_learning_review_cycle_3_security_operations',
      },
    }],
  });

  assert.equal(
    suggestions.some(item => item.id === 'ceo_continuous_learning_review_cycle_3_security_operations'),
    false
  );
  assert.equal(suggestions.some(item => item.id.includes('continuous_learning_review_cycle_4')), false);
});

test('does not show implemented CapLead quality cycle 4 as active suggestion', () => {
  const suggestions = createContinuousCeoSuggestions({
    leads: [{ id: 'lead-1', source: 'CapLead', status: 'new', lastActivity: '2026-05-01' }],
    learningEvents: [{
      event_type: 'ceo_suggestion_applied',
      tags: ['MasterMind', 'CEO', 'Aplicada'],
      metadata: {
        source: 'ceo_strategic_kernel',
        suggestionId: 'ceo_continuous_learning_review_cycle_3_security_operations',
      },
    }],
  });

  assert.equal(
    suggestions.some(item => item.id === 'ceo_continuous_learning_review_cycle_4_caplead_quality'),
    false
  );
  assert.equal(suggestions.some(item => item.id.includes('continuous_learning_review_cycle_4')), false);
});

test('does not show implemented Kentauros conversion cycle 4 as active suggestion', () => {
  const suggestions = createContinuousCeoSuggestions({
    clients: [{ id: 'client-1' }, { id: 'client-2' }, { id: 'client-3' }],
    projects: [{ id: 'project-1' }, { id: 'project-2' }],
    learningEvents: [{
      event_type: 'ceo_suggestion_applied',
      tags: ['MasterMind', 'CEO', 'Aplicada'],
      metadata: {
        source: 'ceo_strategic_kernel',
        suggestionId: 'ceo_continuous_learning_review_cycle_3_security_operations',
      },
    }],
  });

  assert.equal(
    suggestions.some(item => item.id === 'ceo_continuous_learning_review_cycle_4_kentauros_conversion'),
    false
  );
  assert.equal(suggestions.some(item => item.id.includes('continuous_learning_review_cycle_4')), false);
});

test('does not show implemented security operations cycle 4 as active suggestion', () => {
  const suggestions = createContinuousCeoSuggestions({
    automations: [
      { id: 'auto-1', status: 'active', logs: [] },
      { id: 'auto-2', status: 'active', logs: [] },
      { id: 'auto-3', status: 'active', logs: [] },
      { id: 'auto-4', status: 'active', logs: [] },
      { id: 'auto-5', status: 'active', logs: [] },
    ],
    learningEvents: [{
      event_type: 'ceo_suggestion_applied',
      tags: ['MasterMind', 'CEO', 'Aplicada'],
      metadata: {
        source: 'ceo_strategic_kernel',
        suggestionId: 'ceo_continuous_learning_review_cycle_3_security_operations',
      },
    }],
  });

  assert.equal(
    suggestions.some(item => item.id === 'ceo_continuous_learning_review_cycle_4_security_operations'),
    false
  );
  assert.equal(suggestions.some(item => item.id.includes('continuous_learning_review_cycle_4')), false);
});

test('advances continuous CEO learning after an implemented cycle is fully hidden', () => {
  const suggestions = createContinuousCeoSuggestions({
    leads: [{ id: 'lead-1', source: 'CapLead', status: 'new', lastActivity: '2026-05-01' }],
    automations: [{ id: 'auto-1', status: 'active', logs: [] }],
    learningEvents: [{
      event_type: 'ceo_suggestion_applied',
      tags: ['MasterMind', 'CEO', 'Aplicada'],
      metadata: {
        source: 'ceo_strategic_kernel',
        suggestionId: 'ceo_continuous_learning_review_cycle_3_security_operations',
      },
    }],
  });

  assert.equal(suggestions.some(item => item.id.includes('continuous_learning_review_cycle_4')), false);
  assert.equal(suggestions.some(item => item.id.includes('continuous_learning_review_cycle_5')), false);
  assert.equal(suggestions.some(item => item.id === 'ceo_mastermind_caplead_hardening_plan'), false);
});

test('does not show implemented CapLead quality cycle 5 as active suggestion', () => {
  const suggestions = createContinuousCeoSuggestions({
    leads: [{ id: 'lead-1', source: 'CapLead', status: 'new', lastActivity: '2026-05-01' }],
    learningEvents: [{
      event_type: 'ceo_suggestion_applied',
      tags: ['MasterMind', 'CEO', 'Aplicada'],
      metadata: {
        source: 'ceo_strategic_kernel',
        suggestionId: 'ceo_continuous_learning_review_cycle_4_security_operations',
      },
    }],
  });

  assert.equal(
    suggestions.some(item => item.id === 'ceo_continuous_learning_review_cycle_5_caplead_quality'),
    false
  );
});

test('does not show implemented Kentauros conversion cycle 5 as active suggestion', () => {
  const suggestions = createContinuousCeoSuggestions({
    clients: [{ id: 'client-1' }, { id: 'client-2' }, { id: 'client-3' }],
    projects: [{ id: 'project-1' }, { id: 'project-2' }],
    learningEvents: [{
      event_type: 'ceo_suggestion_applied',
      tags: ['MasterMind', 'CEO', 'Aplicada'],
      metadata: {
        source: 'ceo_strategic_kernel',
        suggestionId: 'ceo_continuous_learning_review_cycle_4_security_operations',
      },
    }],
  });

  assert.equal(
    suggestions.some(item => item.id === 'ceo_continuous_learning_review_cycle_5_kentauros_conversion'),
    false
  );
});

test('does not show implemented security operations cycle 5 as active suggestion', () => {
  const suggestions = createContinuousCeoSuggestions({
    automations: [
      { id: 'auto-1', status: 'active', logs: [] },
      { id: 'auto-2', status: 'active', logs: [] },
      { id: 'auto-3', status: 'active', logs: [] },
      { id: 'auto-4', status: 'active', logs: [] },
      { id: 'auto-5', status: 'active', logs: [] },
    ],
    learningEvents: [{
      event_type: 'ceo_suggestion_applied',
      tags: ['MasterMind', 'CEO', 'Aplicada'],
      metadata: {
        source: 'ceo_strategic_kernel',
        suggestionId: 'ceo_continuous_learning_review_cycle_4_security_operations',
      },
    }],
  });

  assert.equal(
    suggestions.some(item => item.id === 'ceo_continuous_learning_review_cycle_5_security_operations'),
    false
  );
});

test('does not repeat implemented MasterMind-derived suggestions instead of generic cycles', () => {
  const suggestions = createContinuousCeoSuggestions({
    leads: [
      { id: 'lead-1', source: 'CapLead', status: 'new', lastActivity: '2026-05-01' },
      { id: 'lead-2', source: 'CapLead', status: 'new', lastActivity: '2026-05-01' },
    ],
    automations: [{ id: 'auto-1', action: 'schedule_commercial_followup', status: 'active', logs: [] }],
    learningEvents: [
      {
        event_type: 'ceo_suggestion_applied',
        title: 'MEL-0038 - Ciclo 5 de seguranca e operacao recorrente',
        content: 'CapLead permanece com vulnerabilidades high, dependencia xlsx sem fix e artefato local suspeito em scratch para revisao antes de release.',
        tags: ['MasterMind', 'CEO', 'Aplicada', 'Seguranca'],
        metadata: {
          source: 'ceo_strategic_kernel',
          suggestionId: 'ceo_continuous_learning_review_cycle_5_security_operations',
        },
      },
      {
        event_type: 'ceo_suggestion_applied',
        title: 'MEL-0036 - Ciclo 5 de qualidade dos leads CapLead',
        content: 'Qualidade dos leads exige deduplicacao, enriquecimento e score antes de impactar a Kentauros.',
        tags: ['MasterMind', 'CEO', 'Aplicada', 'CapLead'],
        metadata: {
          source: 'ceo_strategic_kernel',
          suggestionId: 'ceo_continuous_learning_review_cycle_5_caplead_quality',
        },
      },
    ],
  });

  assert.equal(suggestions.some(item => item.id === 'ceo_mastermind_caplead_hardening_plan'), false);
  assert.equal(suggestions.some(item => item.id === 'ceo_mastermind_caplead_quality_contract'), false);
  assert.equal(suggestions.some(item => item.title.startsWith('Ciclo 6:')), false);
});

test('does not regenerate MasterMind suggestion already approved and awaiting Codex', () => {
  const suggestions = createContinuousCeoSuggestions({
    learningEvents: [
      {
        event_type: 'ceo_suggestion_applied',
        title: 'MEL-0038 - Ciclo 5 de seguranca e operacao recorrente',
        content: 'CapLead permanece com vulnerabilidades high e artefato local suspeito em scratch para revisao antes de release.',
        tags: ['MasterMind', 'CEO', 'Aplicada', 'Seguranca'],
        metadata: {
          source: 'ceo_strategic_kernel',
          suggestionId: 'ceo_continuous_learning_review_cycle_5_security_operations',
        },
      },
    ],
    approvalRequests: [{
      status: 'approved',
      appliedStatus: 'awaiting_codex',
      metadata: {
        source: 'ceo_strategic_kernel',
        suggestionId: 'ceo_mastermind_caplead_hardening_plan',
      },
    }],
  });

  assert.equal(suggestions.some(item => item.id === 'ceo_mastermind_caplead_hardening_plan'), false);
});

test('does not show implemented CapLead quality cycle 6 as active fallback suggestion', () => {
  const suggestions = createContinuousCeoSuggestions({
    leads: [{ id: 'lead-1', source: 'CapLead', status: 'new', lastActivity: '2026-05-01' }],
    learningEvents: [{
      event_type: 'ceo_suggestion_applied',
      title: 'Aprendizado CEO aplicado',
      content: 'Registro executivo aplicado sem novo tema especifico.',
      tags: ['MasterMind', 'CEO', 'Aplicada'],
      metadata: {
        source: 'ceo_strategic_kernel',
        suggestionId: 'ceo_continuous_learning_review_cycle_5_misc',
      },
    }],
  });

  assert.equal(
    suggestions.some(item => item.id === 'ceo_continuous_learning_review_cycle_6_caplead_quality'),
    false
  );
});

test('does not show implemented Kentauros conversion cycle 6 as active fallback suggestion', () => {
  const suggestions = createContinuousCeoSuggestions({
    clients: [{ id: 'client-1' }, { id: 'client-2' }, { id: 'client-3' }],
    projects: [{ id: 'project-1' }, { id: 'project-2' }],
    learningEvents: [{
      event_type: 'ceo_suggestion_applied',
      title: 'Aprendizado CEO aplicado',
      content: 'Registro executivo aplicado sem novo tema especifico.',
      tags: ['MasterMind', 'CEO', 'Aplicada'],
      metadata: {
        source: 'ceo_strategic_kernel',
        suggestionId: 'ceo_continuous_learning_review_cycle_5_misc',
      },
    }],
  });

  assert.equal(
    suggestions.some(item => item.id === 'ceo_continuous_learning_review_cycle_6_kentauros_conversion'),
    false
  );
});

test('does not show implemented security operations cycle 6 as active fallback suggestion', () => {
  const suggestions = createContinuousCeoSuggestions({
    automations: [
      { id: 'auto-1', status: 'active', logs: [] },
      { id: 'auto-2', status: 'active', logs: [] },
      { id: 'auto-3', status: 'active', logs: [] },
      { id: 'auto-4', status: 'active', logs: [] },
      { id: 'auto-5', status: 'active', logs: [] },
    ],
    learningEvents: [{
      event_type: 'ceo_suggestion_applied',
      title: 'Aprendizado CEO aplicado',
      content: 'Registro executivo aplicado sem novo tema especifico.',
      tags: ['MasterMind', 'CEO', 'Aplicada'],
      metadata: {
        source: 'ceo_strategic_kernel',
        suggestionId: 'ceo_continuous_learning_review_cycle_5_misc',
      },
    }],
  });

  assert.equal(
    suggestions.some(item => item.id === 'ceo_continuous_learning_review_cycle_6_security_operations'),
    false
  );
});

test('does not show implemented CapLead quality cycle 7 as active fallback suggestion', () => {
  const suggestions = createContinuousCeoSuggestions({
    leads: [{ id: 'lead-1', source: 'CapLead', status: 'new', lastActivity: '2026-05-01' }],
    learningEvents: [{
      event_type: 'ceo_suggestion_applied',
      title: 'Aprendizado CEO aplicado',
      content: 'Registro executivo aplicado sem novo tema especifico.',
      tags: ['MasterMind', 'CEO', 'Aplicada'],
      metadata: {
        source: 'ceo_strategic_kernel',
        suggestionId: 'ceo_continuous_learning_review_cycle_6_misc',
      },
    }],
  });

  assert.equal(
    suggestions.some(item => item.id === 'ceo_continuous_learning_review_cycle_7_caplead_quality'),
    false
  );
});

test('does not show implemented Kentauros conversion cycle 7 as active fallback suggestion', () => {
  const suggestions = createContinuousCeoSuggestions({
    clients: [{ id: 'client-1' }, { id: 'client-2' }, { id: 'client-3' }],
    projects: [{ id: 'project-1' }, { id: 'project-2' }],
    learningEvents: [{
      event_type: 'ceo_suggestion_applied',
      title: 'Aprendizado CEO aplicado',
      content: 'Registro executivo aplicado sem novo tema especifico.',
      tags: ['MasterMind', 'CEO', 'Aplicada'],
      metadata: {
        source: 'ceo_strategic_kernel',
        suggestionId: 'ceo_continuous_learning_review_cycle_6_misc',
      },
    }],
  });

  assert.equal(
    suggestions.some(item => item.id === 'ceo_continuous_learning_review_cycle_7_kentauros_conversion'),
    false
  );
});

test('does not show implemented security operations cycle 7 as active fallback suggestion', () => {
  const suggestions = createContinuousCeoSuggestions({
    automations: [
      { id: 'auto-1', status: 'active', logs: [] },
      { id: 'auto-2', status: 'active', logs: [] },
      { id: 'auto-3', status: 'active', logs: [] },
      { id: 'auto-4', status: 'active', logs: [] },
      { id: 'auto-5', status: 'active', logs: [] },
    ],
    learningEvents: [{
      event_type: 'ceo_suggestion_applied',
      title: 'Aprendizado CEO aplicado',
      content: 'Registro executivo aplicado sem novo tema especifico.',
      tags: ['MasterMind', 'CEO', 'Aplicada'],
      metadata: {
        source: 'ceo_strategic_kernel',
        suggestionId: 'ceo_continuous_learning_review_cycle_6_misc',
      },
    }],
  });

  assert.equal(
    suggestions.some(item => item.id === 'ceo_continuous_learning_review_cycle_7_security_operations'),
    false
  );
});

test('creates approval requests with MasterMind metadata', () => {
  const [suggestion] = createContinuousCeoSuggestions({});
  const approval = createCeoApprovalRequest(suggestion, { userId: 13, tenantId: 'tenant-a' });

  assert.equal(approval.status, 'pending');
  assert.equal(approval.appliedStatus, 'not_applied');
  assert.equal(approval.metadata.source, 'ceo_strategic_kernel');
  assert.equal(approval.metadata.suggestionId, suggestion.id);
  assert.ok(approval.metadata.mastermindUpdate.title.includes('Aprendizado CEO'));
  assert.ok(approval.metadata.codexPrompt.includes(suggestion.title));
  assert.ok(approval.metadata.codexPrompt.includes('Registre o aprendizado no MasterMind'));
});

test('approved CEO suggestion becomes a learning event for MasterMind', () => {
  const [suggestion] = createContinuousCeoSuggestions({});
  const approval = createCeoApprovalRequest(suggestion, { userId: 13, tenantId: 'tenant-a' });
  const result = applyApprovedCeoSuggestion(approval, { reviewer: 'Matheus' });

  assert.equal(result.approval.status, 'approved');
  assert.equal(result.approval.appliedStatus, 'awaiting_codex');
  assert.ok(result.approval.metadata.codexPrompt.includes('Implemente a melhoria'));
  assert.equal(result.learningEvent.event_type, 'ceo_suggestion_approved');
  assert.ok(result.learningEvent.tags.includes('CEO'));
  assert.equal(result.mastermindEntry.status, 'Aprovada');
});

test('classifies autonomous approvals and blocks sensitive execution without closure criteria', () => {
  const review = createAutonomousApprovalGovernanceReview({
    approvalRequests: [
      {
        id: 'ctx-1',
        title: 'Aprovacao autonoma gerada por reuniao',
        summary: 'Contexto aprovado automaticamente pelo MasterMind.',
        status: 'pending',
        appliedStatus: 'not_applied',
        actionType: 'mastermind_update',
        metadata: { source: 'autonomous_mastermind' },
      },
      {
        id: 'codex-1',
        title: 'Aprovar execucao de risco - Leads esfriando no funil comercial',
        summary: 'Enviar follow-up externo para leads frios.',
        status: 'approved',
        appliedStatus: 'awaiting_codex',
        actionType: 'create_automation',
        risk: 'alto',
        actionPlan: ['Criar fila de follow-up'],
        metadata: { source: 'ceo_strategic_kernel', suggestionId: 'ceo_followup_automation' },
      },
      {
        id: 'applied-1',
        title: 'Sugestao aplicada',
        status: 'approved',
        appliedStatus: 'applied',
        actionType: 'mastermind_update',
        metadata: { source: 'ceo_strategic_kernel' },
      },
    ],
  });

  assert.equal(review.summary.total, 3);
  assert.equal(review.summary.blockedSensitiveExecution, 1);
  assert.equal(review.items.find(item => item.id === 'ctx-1').classification, 'contexto');
  assert.equal(review.items.find(item => item.id === 'codex-1').classification, 'aprovada_para_codex');
  assert.equal(review.items.find(item => item.id === 'codex-1').sensitiveExecutionBlocked, true);
  assert.ok(review.items.find(item => item.id === 'codex-1').missingRequirements.includes('criterio_de_encerramento'));
  assert.equal(review.items.find(item => item.id === 'applied-1').classification, 'aplicada');
  assert.equal(review.learningEvent.metadata.source, 'ceo_mastermind_autonomous_approval_governance');
});

test('allows sensitive CEO execution only with approved request and closure criteria', () => {
  assert.equal(canExecuteSensitiveCeoAction({
    status: 'approved',
    appliedStatus: 'awaiting_codex',
    actionType: 'create_automation',
    risk: 'alto',
    doneCriteria: 'Follow-up aprovado, logado e medido por taxa de resposta.',
    metadata: { source: 'ceo_strategic_kernel' },
  }).allowed, true);

  const blocked = canExecuteSensitiveCeoAction({
    status: 'approved',
    appliedStatus: 'awaiting_codex',
    actionType: 'create_automation',
    risk: 'alto',
    metadata: { source: 'autonomous_mastermind' },
  });

  assert.equal(blocked.allowed, false);
  assert.ok(blocked.reasons.includes('approval_request_invalido'));
  assert.ok(blocked.reasons.includes('criterio_de_encerramento_ausente'));
});

test('builds a Codex execution prompt for a CEO suggestion', () => {
  const suggestion = createManualCeoSuggestion('Adicionar alerta de leads sem WhatsApp', { userName: 'Matheus' });
  const prompt = createCodexSuggestionPrompt(suggestion);

  assert.ok(prompt.includes('Adicionar alerta de leads sem WhatsApp'));
  assert.ok(prompt.includes('Critérios obrigatórios'));
  assert.ok(prompt.includes('MasterMind'));
});

test('marks an approved CEO suggestion as applied', () => {
  const [suggestion] = createContinuousCeoSuggestions({});
  const approval = createCeoApprovalRequest(suggestion, { userId: 13, tenantId: 'tenant-a' });
  const approved = applyApprovedCeoSuggestion(approval, { reviewer: 'Matheus' }).approval;
  const result = markCeoSuggestionApplied(approved, { reviewer: 'Matheus' });

  assert.equal(result.approval.appliedStatus, 'applied');
  assert.equal(result.approval.appliedBy, 'Matheus');
  assert.equal(result.learningEvent.event_type, 'ceo_suggestion_applied');
  assert.ok(result.learningEvent.metadata.codexPrompt.includes(approved.title));
});

test('rejected CEO suggestion keeps rejection reason and reviewer', () => {
  const [suggestion] = createContinuousCeoSuggestions({});
  const approval = createCeoApprovalRequest(suggestion, { userId: 13, tenantId: 'tenant-a' });
  const rejected = rejectCeoSuggestion(approval, { reviewer: 'Matheus', reason: 'Aguardar' });

  assert.equal(rejected.status, 'rejected');
  assert.equal(rejected.reviewer, 'Matheus');
  assert.equal(rejected.rejectionReason, 'Aguardar');
});

test('security analysis detects CapLead import and automation governance risks', () => {
  const risks = analyzeCapLeadKentaurosSecurity({
    leads: [{ id: 'lead-1', source: 'CapLead' }],
    automations: [{ id: 'auto-1', status: 'active', logs: [] }],
    approvalRequests: [],
  });

  assert.ok(risks.some(risk => risk.id === 'caplead_import_audit'));
  assert.ok(risks.some(risk => risk.id === 'automation_without_logs'));
  assert.ok(risks.some(risk => risk.id === 'missing_ceo_approval_loop'));
});

test('creates CEO security audit report for CapLead and Kentauros controls', () => {
  const audit = createCapLeadKentaurosSecurityAudit({
    environment: {
      nodeEnv: 'production',
      capLeadImportApiKeyConfigured: false,
      allowedOrigins: '*',
    },
    leads: [{ id: 'lead-1', source: 'CapLead' }],
    automations: [
      { id: 'auto-1', action: 'schedule_commercial_followup', status: 'active', logs: [] },
    ],
    approvalRequests: [],
  });

  assert.equal(audit.level, 'L2');
  assert.equal(audit.verdict, 'BLOQUEADO');
  assert.ok(audit.findings.some(item => item.id === 'caplead_import_api_key_missing'));
  assert.ok(audit.findings.some(item => item.id === 'caplead_cors_wildcard_production'));
  assert.ok(audit.findings.some(item => item.id === 'automation_without_logs'));
  assert.ok(audit.mitigations.every(item => item.fix));
  assert.equal(audit.mastermindEntry.status, 'Auditoria executada');
});

test('approves CEO security audit when production controls are present', () => {
  const audit = createCapLeadKentaurosSecurityAudit({
    environment: {
      nodeEnv: 'production',
      capLeadImportApiKeyConfigured: true,
      allowedOrigins: 'https://kentauros-os-app.vercel.app',
    },
    automations: [
      {
        id: 'auto-1',
        action: 'schedule_commercial_followup',
        status: 'active',
        logs: [{ status: 'pending_approval' }],
        metadata: { requiresHumanApproval: true },
      },
    ],
    approvalRequests: [{ status: 'pending', metadata: { source: 'ceo_strategic_kernel' } }],
  });

  assert.equal(audit.verdict, 'APROVADO');
  assert.equal(audit.findings.length, 0);
  assert.ok(audit.controls.some(item => item.id === 'caplead_import_api_key'));
});

test('does not show implemented CEO security audit as active suggestion', () => {
  const suggestions = createContinuousCeoSuggestions({
    leads: [{ id: 'lead-1', source: 'CapLead' }],
    automations: [{ id: 'auto-1', status: 'active', logs: [] }],
    approvalRequests: [],
  });

  assert.equal(suggestions.some(item => item.id === 'ceo_security_audit'), false);
});

test('creates CapLead hardening plan with release blockers and mitigations', () => {
  const plan = createCapLeadHardeningPlan({
    dependencyAudit: [
      { package: 'xlsx', severity: 'high', fixAvailable: false },
      { package: 'ws', severity: 'moderate', fixAvailable: true },
    ],
    artifacts: ['scratch/token-dump.txt'],
    secrets: ['sk-test'],
    env: { CAPLEAD_IMPORT_API_KEY: '', CAPLEAD_IMPORT_ALLOWED_ORIGINS: '*' },
    automations: [{ id: 'auto-1', status: 'active', logs: [] }],
  });

  assert.equal(plan.verdict, 'BLOQUEADO');
  assert.ok(plan.releaseBlockers.some(item => item.category === 'dependencies'));
  assert.ok(plan.releaseBlockers.some(item => item.category === 'secrets'));
  assert.ok(plan.learningEvent.metadata.releaseGate.blocked);
});

test('analyzes Supabase RLS governance for destructive migrations, anon policies and tenant indexes', () => {
  const report = analyzeSupabaseRlsGovernance({
    sql: `
      DROP TABLE IF EXISTS public.leads CASCADE;
      CREATE TABLE public.leads (tenant_id text, user_id integer, company text);
      CREATE INDEX leads_tenant_user_idx ON public.leads (tenant_id, user_id);
      ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
      CREATE POLICY "Allow app anon lead reads" ON public.leads FOR SELECT USING (true);
      CREATE POLICY "Allow app anon lead writes" ON public.leads FOR INSERT WITH CHECK (true);
      CREATE TABLE public.approval_requests (tenant_id text, status text);
      ALTER TABLE public.approval_requests ENABLE ROW LEVEL SECURITY;
      CREATE POLICY "tenant approval reads" ON public.approval_requests FOR SELECT USING (tenant_id = current_setting('app.tenant_id'));
    `,
    criticalTables: ['leads', 'approval_requests'],
  });

  assert.equal(report.verdict, 'BLOQUEADO');
  assert.ok(report.findings.some(item => item.id === 'destructive_migration'));
  assert.ok(report.findings.some(item => item.id === 'anon_policy_wildcard'));
  assert.ok(report.findings.some(item => item.id === 'missing_rls_index'));
  assert.equal(report.tables.find(item => item.name === 'leads').hasTenantIndex, true);
  assert.equal(report.tables.find(item => item.name === 'approval_requests').hasTenantIndex, false);
  assert.equal(report.learningEvent.metadata.source, 'ceo_mastermind_supabase_rls_governance');
});

test('creates executable Supabase RLS correction plan with migration, rollback and evidence', () => {
  const plan = createSupabaseRlsCorrectionPlan({
    sql: `
      DROP TABLE IF EXISTS public.leads CASCADE;
      CREATE TABLE public.leads (tenant_id text, user_id integer, company text);
      CREATE INDEX leads_tenant_user_idx ON public.leads (tenant_id, user_id);
      ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
      CREATE POLICY "Allow app anon lead reads" ON public.leads FOR SELECT USING (true);
      CREATE TABLE public.approval_requests (tenant_id text, status text);
      ALTER TABLE public.approval_requests ENABLE ROW LEVEL SECURITY;
      CREATE POLICY "Allow app anon approval reads" ON public.approval_requests FOR SELECT USING (true);
    `,
  });

  assert.equal(plan.verdict, 'BLOQUEADO_ATE_MIGRATION_SEGURA');
  assert.ok(plan.inventory.findings.some(item => item.id === 'destructive_migration'));
  assert.ok(plan.evidence.anonWildcardPolicyCount >= 2);
  assert.ok(plan.productionMigrationSql.includes('create or replace function public.current_app_tenant_id'));
  assert.ok(plan.productionMigrationSql.includes('drop policy if exists'));
  assert.ok(plan.rollbackSql.includes('ROLLBACK PLAN'));
  assert.ok(plan.executionChecklist.some(item => item.includes('backup')));
});

test('does not show implemented MasterMind thematic suggestions as active suggestions', () => {
  const suggestions = createContinuousCeoSuggestions({
    leads: [{ id: 'lead-1', source: 'CapLead', status: 'new', lastActivity: '2026-05-01' }],
    automations: [{ id: 'auto-1', status: 'active', logs: [] }],
    mastermindKnowledge: [{
      title: 'MasterMind sinais tematicos',
      content: 'vulnerabilidade high secret release qualidade deduplicacao score funil conversao discovery proposta roadmap ux grid tela interface',
    }],
  });

  [
    'ceo_mastermind_caplead_hardening_plan',
    'ceo_mastermind_caplead_quality_contract',
    'ceo_mastermind_conversion_playbook',
    'ceo_mastermind_operational_ux_review',
    'ceo_continuous_learning_review_cycle_6_security_operations',
  ].forEach(id => {
    assert.equal(suggestions.some(item => item.id === id), false);
  });
});

test('does not show implemented automation observability suggestion as active suggestion', () => {
  const suggestions = createContinuousCeoSuggestions({
    automations: [{ id: 'auto-1', status: 'active', logs: [] }],
    mastermindKnowledge: [{
      title: 'MasterMind observabilidade automacoes aprovadas',
      content: 'automacao aprovacao humana whatsapp email logs auditoria externa',
    }],
  });

  assert.equal(
    suggestions.some(item => item.id === 'ceo_mastermind_automation_observability'),
    false
  );
});

test('hides approved Codex prompts when their suggestion was already implemented', () => {
  const approval = {
    status: 'approved',
    appliedStatus: 'awaiting_codex',
    metadata: {
      source: 'ceo_strategic_kernel',
      suggestionId: 'ceo_continuous_learning_review_cycle_6_caplead_quality',
    },
  };

  assert.equal(isActiveCeoApproval(approval), false);
});

test('creates new MasterMind-derived thematic suggestions after numeric cycles are applied', () => {
  const suggestions = createContinuousCeoSuggestions({
    leads: [{ id: 'lead-1', source: 'CapLead', status: 'new', lastActivity: '2026-05-01' }],
    clients: [{ id: 'client-1' }, { id: 'client-2' }, { id: 'client-3' }],
    projects: [{ id: 'project-1' }, { id: 'project-2' }],
    automations: [{ id: 'auto-1', status: 'active', logs: [] }],
    learningEvents: [{
      event_type: 'ceo_suggestion_applied',
      title: 'Aprendizado CEO aplicado',
      content: 'Qualidade CapLead, funil, proposta, ROI, automacao, logs, API key, CORS, Supabase RLS, permissao e seguranca devem virar novas sugestoes tematicas.',
      tags: ['MasterMind', 'CEO', 'Aplicada'],
      metadata: {
        source: 'ceo_strategic_kernel',
        suggestionId: 'ceo_continuous_learning_review_cycle_7_security_operations',
      },
    }],
  });

  assert.equal(suggestions.length > 0, true);
  assert.equal(suggestions.some(item => item.id === 'ceo_mastermind_caplead_export_enrichment_audit'), false);
  assert.equal(suggestions.some(item => item.id === 'ceo_mastermind_open_proposal_roi_review'), false);
  assert.equal(suggestions.some(item => item.id === 'ceo_mastermind_supabase_rls_governance'), false);
  assert.equal(suggestions.some(item => item.id === 'ceo_mastermind_automation_response_dashboard'), false);
});

test('skill governance requires explicit approval before install', () => {
  const recommendation = createSkillGovernanceRecommendation('seguranca');

  assert.equal(recommendation.workType, 'seguranca');
  assert.ok(recommendation.candidates.length >= 2);
  assert.ok(recommendation.candidates.every(candidate => candidate.approvalRequired));
});

test('creates a governed skill registry with risk, permissions and approval status', () => {
  const registry = createSkillGovernanceRegistry({
    approvalRequests: [{
      status: 'pending',
      metadata: { source: 'ceo_skill_governance', skillName: 'hm-security' },
    }],
    learningEvents: [{
      event_type: 'ceo_skill_installed',
      metadata: { source: 'ceo_skill_governance', skillName: 'hm-qa' },
    }],
  });

  const security = registry.find(skill => skill.name === 'hm-security');
  const qa = registry.find(skill => skill.name === 'hm-qa');

  assert.equal(security.status, 'awaiting_approval');
  assert.equal(security.approvalRequired, true);
  assert.ok(security.permissions.includes('arquivos'));
  assert.equal(qa.status, 'installed');
  assert.ok(registry.every(skill => skill.source));
});

test('creates approval request and learning events for governed skill installation', () => {
  const [skill] = createSkillGovernanceRegistry().filter(item => item.name === 'hm-security');
  const approval = createSkillApprovalRequest(skill, { userId: 13, tenantId: 'tenant-a' });
  const approved = approveSkillInstallation(approval, { reviewer: 'Matheus' });
  const installed = markSkillInstalled(approved.approval, { reviewer: 'Matheus' });

  assert.equal(approval.metadata.source, 'ceo_skill_governance');
  assert.equal(approval.status, 'pending');
  assert.equal(approved.approval.status, 'approved');
  assert.equal(approved.learningEvent.event_type, 'ceo_skill_install_approved');
  assert.equal(installed.approval.appliedStatus, 'installed');
  assert.equal(installed.learningEvent.event_type, 'ceo_skill_installed');
  assert.ok(approval.summary.includes('hm-security'));
});

test('creates manual CEO suggestion from user prompt', () => {
  const suggestion = createManualCeoSuggestion('Melhorar automacao de follow-up', { userName: 'Matheus' });

  assert.equal(suggestion.category, 'manual');
  assert.equal(suggestion.approvalRequired, true);
  assert.ok(suggestion.summary.includes('follow-up'));
  assert.ok(suggestion.evidence[0].includes('Matheus'));
});

test('creates CEO diagnostics from active MasterMind risks', () => {
  const diagnostics = createCeoDiagnostics({
    mastermindKnowledge: [{
      title: 'Memoria Ativa CEO',
      content: '#risco-ativo Supabase RLS MEL-0007 MEL-0010 segredos variaveis de ambiente #risco-monitoramento SuperSaas Next.js Vite',
    }],
  });

  assert.ok(diagnostics.some(item => item.id === 'mastermind_supabase_rls_active_risk'));
  assert.ok(diagnostics.some(item => item.id === 'mastermind_secret_inventory_active_risk'));
  assert.ok(diagnostics.every(item => item.source === 'MasterMind CEO'));
  assert.equal(diagnostics.find(item => item.id === 'mastermind_supabase_rls_active_risk').status, 'active');
});

test('summarizes CEO diagnostics by status and severity', () => {
  const diagnostics = createCeoDiagnostics({
    approvalRequests: [{
      id: 'approval-1',
      title: 'Corrigir RLS Supabase',
      status: 'approved',
      appliedStatus: 'awaiting_codex',
      risk: 'alto',
      metadata: { source: 'ceo_strategic_kernel', suggestionId: 'risk-1' },
    }],
    mastermindKnowledge: [{
      title: 'Risco mitigado e risco ativo',
      content: '#risco-mitigado API key CORS #risco-ativo segredos ambiente',
    }],
  });
  const summary = summarizeCeoDiagnostics(diagnostics);

  assert.equal(summary.total, diagnostics.length);
  assert.ok(summary.active >= 2);
  assert.ok(summary.mitigated >= 1);
  assert.ok(summary.bySeverity.high >= 1);
  assert.equal(summary.top.length <= 5, true);
});

test('creates fresh MasterMind suggestions from active risks without repeating implemented risk board', () => {
  const suggestions = createContinuousCeoSuggestions({
    learningEvents: [{
      event_type: 'ceo_suggestion_applied',
      tags: ['MasterMind', 'CEO', 'Aplicada'],
      metadata: {
        source: 'ceo_strategic_kernel',
        suggestionId: 'ceo_continuous_learning_review_cycle_7_security_operations',
      },
    }],
    mastermindKnowledge: [{
      title: 'Memoria Ativa CEO',
      content: '#risco-ativo Supabase RLS MEL-0007 #risco-ativo segredos variaveis de ambiente MEL-0010 diagnostico CEO tasks aprovaveis',
    }],
  });

  assert.equal(suggestions.some(item => item.id === 'ceo_mastermind_active_risk_resolution_board'), false);
  assert.equal(suggestions.some(item => item.id === 'ceo_mastermind_supabase_rls_execution_plan'), false);
  assert.equal(suggestions.some(item => item.id === 'ceo_mastermind_secret_inventory_execution'), false);
  assert.equal(suggestions.some(item => item.id.includes('continuous_learning_review_cycle_8')), false);
  assert.ok(suggestions.some(item => item.id.startsWith('ceo_mastermind_next_verification_')));
  assert.ok(suggestions.some(item => item.id.startsWith('ceo_mastermind_security_residuals_')));
});

test('turns applied commercial MasterMind verification into new measurable suggestions', () => {
  const appliedEvents = Array.from({ length: 20 }, (_, index) => ({
    event_type: 'ceo_suggestion_applied',
    title: `Aprendizado CEO aplicado ${index + 1}`,
    tags: ['MasterMind', 'CEO', 'Aplicada'],
    metadata: {
      source: 'ceo_strategic_kernel',
      suggestionId: `applied_${index + 1}`,
    },
  }));

  const suggestions = createContinuousCeoSuggestions({
    learningEvents: [
      ...appliedEvents,
      {
        event_type: 'ceo_suggestion_applied',
        title: 'Sugestao CEO aplicada - Priorizar recomendacoes comerciais do MasterMind',
        content: 'Verificar MasterMind apos Sugestao CEO aplicada - Priorizar recomendacoes comerciais do MasterMind',
        tags: ['MasterMind', 'CEO', 'Aplicada'],
        metadata: {
          source: 'ceo_strategic_kernel',
          suggestionId: 'ceo_mastermind_next_verification_21',
        },
      },
    ],
  });

  assert.equal(isActiveCeoApproval({
    status: 'approved',
    appliedStatus: 'awaiting_codex',
    metadata: {
      source: 'ceo_strategic_kernel',
      suggestionId: 'ceo_mastermind_next_verification_21',
    },
  }), false);
  assert.equal(suggestions.some(item => item.id.includes('continuous_learning_review_cycle_')), false);
  assert.equal(suggestions.some(item => item.id.startsWith('ceo_mastermind_next_verification_')), false);
  assert.equal(suggestions.some(item => item.id === 'ceo_mastermind_cross_project_reuse_21'), false);
  assert.equal(suggestions.some(item => item.id === 'ceo_mastermind_commercial_impact_audit_21'), false);
  assert.equal(suggestions.some(item => item.id === 'ceo_mastermind_commercial_gap_board_21'), false);
  assert.ok(suggestions.every(item => item.actionPlan?.length));
});

test('keeps suggesting improvements from new MasterMind knowledge after legacy suggestions were applied', () => {
  const appliedSuggestionIds = [
    'ceo_growth_recommendations',
    'ceo_followup_automation',
    'ceo_security_audit',
    'ceo_skill_governance',
    'ceo_learning_cadence',
    'ceo_mastermind_caplead_hardening_plan',
    'ceo_mastermind_caplead_quality_contract',
    'ceo_mastermind_conversion_playbook',
    'ceo_mastermind_automation_observability',
    'ceo_mastermind_automation_response_dashboard',
    'ceo_mastermind_operational_ux_review',
    'ceo_mastermind_supabase_rls_governance',
    'ceo_mastermind_caplead_export_enrichment_audit',
    'ceo_mastermind_open_proposal_roi_review',
    'ceo_mastermind_active_risk_resolution_board',
    'ceo_mastermind_supabase_rls_execution_plan',
    'ceo_mastermind_secret_inventory_execution',
    'ceo_mastermind_next_verification_21',
    'ceo_mastermind_cross_project_reuse_21',
    'ceo_mastermind_conversion_residuals_21',
    'ceo_mastermind_commercial_impact_audit_21',
    'ceo_mastermind_commercial_gap_board_21',
  ];

  const suggestions = createContinuousCeoSuggestions({
    learningEvents: appliedSuggestionIds.map(suggestionId => ({
      event_type: 'ceo_suggestion_applied',
      title: `Sugestao aplicada - ${suggestionId}`,
      tags: ['MasterMind', 'CEO', 'Aplicada'],
      metadata: {
        source: 'ceo_strategic_kernel',
        suggestionId,
      },
    })),
    approvalRequests: appliedSuggestionIds.map(suggestionId => ({
      status: 'approved',
      appliedStatus: 'applied',
      metadata: {
        source: 'ceo_strategic_kernel',
        suggestionId,
      },
    })),
    mastermindKnowledge: [{
      title: 'Hub Novo Conhecimento 2026-05-20',
      content: [
        'consulta economica economizar tokens hub diario notas brutas indices tematicos',
        'aprovacoes autonomas execucao sensivel ApprovalRequest validacao CEO',
        'integracao de IA em projetos ArteNewEra CapLead AutoSocial SuperSaas',
        'marketing receita visibilidade upsell retencao onboarding contrato via IA theme-primary',
      ].join(' '),
    }],
  });

  assert.ok(suggestions.length >= 1);
  assert.equal(suggestions.some(item => item.id === 'ceo_mastermind_token_efficient_context_pipeline'), false);
  assert.equal(suggestions.some(item => item.id === 'ceo_mastermind_raw_context_consolidation_alert'), false);
  assert.equal(suggestions.some(item => item.id === 'ceo_mastermind_autonomous_approval_governance'), false);
  assert.equal(suggestions.some(item => item.id === 'ceo_mastermind_ai_integration_reuse_map'), false);
  assert.equal(suggestions.some(item => item.id === 'ceo_mastermind_ai_reuse_validation_kpi'), false);
  assert.ok(suggestions.some(item => item.id === 'ceo_mastermind_ai_reuse_standardization_playbook'));
  assert.equal(suggestions.some(item => item.id === 'ceo_mastermind_revenue_retention_kpi_board'), false);
  assert.equal(suggestions.some(item => item.id === 'ceo_mastermind_revenue_kpi_validation_cycle'), false);
  assert.ok(suggestions.every(item => item.actionPlan?.length));
});

test('marks raw context consolidation suggestion as implemented', () => {
  assert.equal(isActiveCeoApproval({
    status: 'approved',
    appliedStatus: 'awaiting_codex',
    metadata: {
      source: 'ceo_strategic_kernel',
      suggestionId: 'ceo_mastermind_raw_context_consolidation_alert',
    },
  }), false);
});

test('marks cross-project reuse suggestion as implemented after reusable pattern registration', () => {
  assert.equal(isActiveCeoApproval({
    status: 'approved',
    appliedStatus: 'awaiting_codex',
    metadata: {
      source: 'ceo_strategic_kernel',
      suggestionId: 'ceo_mastermind_cross_project_reuse_21',
    },
  }), false);
});

test('marks conversion residual suggestion as implemented after conversion leverage playbook', () => {
  assert.equal(isActiveCeoApproval({
    status: 'approved',
    appliedStatus: 'awaiting_codex',
    metadata: {
      source: 'ceo_strategic_kernel',
      suggestionId: 'ceo_mastermind_conversion_residuals_21',
    },
  }), false);

  const suggestions = createContinuousCeoSuggestions({
    leads: Array.from({ length: 129 }, (_, index) => ({
      id: `lead-${index + 1}`,
      source: 'CapLead',
      status: 'new',
      lastActivity: '2026-05-01',
    })),
    learningEvents: [{
      event_type: 'ceo_suggestion_applied',
      title: 'Sugestao CEO aplicada - Priorizar recomendacoes comerciais do MasterMind',
      content: 'Verificar MasterMind apos Sugestao CEO aplicada - Priorizar recomendacoes comerciais do MasterMind',
      tags: ['MasterMind', 'CEO', 'Aplicada'],
      metadata: {
        source: 'ceo_strategic_kernel',
        suggestionId: 'ceo_mastermind_next_verification_21',
      },
    }],
  });

  assert.equal(suggestions.some(item => item.id === 'ceo_mastermind_conversion_residuals_21'), false);
});

test('creates commercial impact audit with KPI deltas and automation gate', () => {
  const audit = createCommercialImpactAudit({
    before: {
      leads: Array.from({ length: 10 }, (_, index) => ({ id: `lead-b-${index}`, status: index < 2 ? 'discovery' : 'new' })),
      discoveries: [{ id: 'disc-b-1', status: 'open' }],
      proposals: [{ id: 'prop-b-1', status: 'sent', value: 5000 }],
      clients: [],
    },
    after: {
      leads: Array.from({ length: 10 }, (_, index) => ({ id: `lead-a-${index}`, status: index < 4 ? 'discovery' : 'new' })),
      discoveries: [{ id: 'disc-a-1', status: 'completed' }, { id: 'disc-a-2', status: 'open' }],
      proposals: [{ id: 'prop-a-1', status: 'sent', value: 5000 }, { id: 'prop-a-2', status: 'draft', value: 3000 }],
      clients: [],
    },
  });

  assert.equal(audit.source, 'Sugestao CEO aplicada - Priorizar recomendacoes comerciais do MasterMind');
  assert.ok(audit.kpis.some(item => item.name === 'Lead -> Discovery' && item.delta > 0));
  assert.equal(audit.automationGate, 'BLOQUEADO_ATE_KPI_E_CRITERIO_DE_CONCLUSAO');
  assert.ok(audit.gaps.every(item => item.successCriteria));
  assert.equal(audit.learningEvent.metadata.source, 'ceo_mastermind_commercial_impact_audit_21');
});

test('marks commercial impact audit suggestion as implemented', () => {
  assert.equal(isActiveCeoApproval({
    status: 'approved',
    appliedStatus: 'awaiting_codex',
    metadata: {
      source: 'ceo_strategic_kernel',
      suggestionId: 'ceo_mastermind_commercial_impact_audit_21',
    },
  }), false);
});

test('creates measurable CEO board for commercial gaps', () => {
  const board = createCommercialGapExecutionBoard({
    gaps: [
      {
        area: 'lead',
        problem: 'Leads CapLead sem proxima acao registrada.',
      },
      {
        area: 'proposta',
        metric: 'propostas abertas com ROI e prazo de decisao',
        successCriteria: '100% das propostas abertas revisadas pelo CEO antes de automacao.',
      },
    ],
  });

  assert.equal(board.summary.total, 2);
  assert.equal(board.summary.approvalRequired, 2);
  assert.equal(board.summary.automationBlocked, 2);
  assert.deepEqual(Object.keys(board.summary.byArea).sort(), ['lead', 'proposta']);
  assert.ok(board.tasks.every(task => task.owner && task.metric && task.dueInDays && task.successCriteria));
  assert.ok(board.tasks.every(task => task.status === 'aprovavel'));
  assert.ok(board.tasks.every(task => task.approvalRequired));
  assert.ok(board.tasks.every(task => task.automationBlockedUntilApproval));
  assert.equal(board.learningEvent.metadata.source, 'ceo_mastermind_commercial_gap_board_21');
});

test('creates default commercial gap board for all CEO funnel areas', () => {
  const board = createCommercialGapExecutionBoard();

  assert.equal(board.summary.total, 6);
  assert.deepEqual(Object.keys(board.summary.byArea).sort(), [
    'discovery',
    'lead',
    'onboarding',
    'proposta',
    'retencao',
    'upsell',
  ]);
});

test('marks commercial gap board suggestion as implemented', () => {
  assert.equal(isActiveCeoApproval({
    status: 'approved',
    appliedStatus: 'awaiting_codex',
    metadata: {
      source: 'ceo_strategic_kernel',
      suggestionId: 'ceo_mastermind_commercial_gap_board_21',
    },
  }), false);
});

test('creates AI reuse matrix before new agents or automations', () => {
  const matrix = createAiReuseMatrix({
    projects: [
      {
        name: 'ArteNewEra',
        technologies: ['Gemini', 'Groq'],
        capabilities: ['geracao criativa', 'layout com IA'],
        automations: ['esteira criativa'],
      },
      {
        name: 'CapLead',
        technologies: ['Gemini', 'Playwright'],
        capabilities: ['enriquecimento de lead', 'layout com IA'],
        automations: ['captura local'],
      },
      {
        name: 'AutoSocial',
        technologies: ['OpenAI', 'Anthropic'],
        capabilities: ['geracao de conteudo', 'agendamento social'],
        automations: ['publicacao social'],
      },
      {
        name: 'Kentauros',
        technologies: ['OpenCode', 'Google Places'],
        capabilities: ['orquestracao de agents', 'importacao de leads'],
        automations: ['follow-up aprovado'],
      },
    ],
  });

  assert.equal(matrix.summary.projects, 4);
  assert.ok(matrix.rows.some(row => row.project === 'CapLead' && row.capability === 'layout com IA'));
  assert.ok(matrix.reusablePatterns.some(pattern => pattern.capability === 'layout com IA'));
  assert.ok(matrix.projectSpecificAutomations.some(item => item.project === 'AutoSocial'));
  assert.equal(matrix.agentCreationGate, 'BLOQUEADO_ATE_MATRIZ_REUTILIZACAO_APROVADA');
  assert.equal(matrix.learningEvent.metadata.source, 'ceo_mastermind_ai_integration_reuse_map');
});

test('marks AI integration reuse suggestion as implemented', () => {
  assert.equal(isActiveCeoApproval({
    status: 'approved',
    appliedStatus: 'awaiting_codex',
    metadata: {
      source: 'ceo_strategic_kernel',
      suggestionId: 'ceo_mastermind_ai_integration_reuse_map',
    },
  }), false);
});

test('validates AI reuse matrix impact before promoting internal patterns', () => {
  const validation = createAiReuseImpactValidation({
    patterns: [
      {
        name: 'layout com IA',
        projects: ['ArteNewEra', 'CapLead'],
        timeSavedHours: 12,
        reworkReductionPercent: 35,
        conversionLiftPercent: 8,
        proposedAgents: ['agent-layout-reuse'],
      },
      {
        name: 'workflow agentico',
        projects: ['Kentauros'],
        timeSavedHours: 2,
        reworkReductionPercent: 5,
        conversionLiftPercent: 0,
        proposedAgents: ['agent-workflow-lab'],
      },
    ],
  });

  assert.equal(validation.summary.patterns, 2);
  assert.equal(validation.summary.promoted, 1);
  assert.equal(validation.summary.blocked, 1);
  assert.ok(validation.kpis.every(kpi => kpi.timeSavedHours >= 0));
  assert.ok(validation.kpis.every(kpi => kpi.impactedProjects >= 1));
  assert.equal(validation.kpis.find(kpi => kpi.pattern === 'layout com IA').status, 'promote_to_internal_standard');
  assert.equal(validation.kpis.find(kpi => kpi.pattern === 'workflow agentico').status, 'needs_more_evidence');
  assert.equal(validation.agentAutomationGate, 'BLOQUEADO_ATE_EVIDENCIA_DE_GANHO');
  assert.equal(validation.learningEvent.metadata.source, 'ceo_mastermind_ai_reuse_validation_kpi');
});

test('marks AI reuse validation KPI suggestion as implemented', () => {
  assert.equal(isActiveCeoApproval({
    status: 'approved',
    appliedStatus: 'awaiting_codex',
    metadata: {
      source: 'ceo_strategic_kernel',
      suggestionId: 'ceo_mastermind_ai_reuse_validation_kpi',
    },
  }), false);
});

test('creates revenue retention and upsell KPI board before new automations', () => {
  const board = createRevenueRetentionKpiBoard({
    signals: ['marketing', 'receita', 'visibilidade', 'retencao', 'onboarding', 'upsell', 'contrato via IA'],
  });

  assert.equal(board.summary.total, 5);
  assert.deepEqual(board.summary.areas.sort(), ['onboarding', 'receita', 'retencao', 'upsell', 'visibilidade']);
  assert.ok(board.kpis.every(kpi => kpi.owner));
  assert.ok(board.kpis.every(kpi => kpi.metric));
  assert.ok(board.kpis.every(kpi => kpi.dueInDays > 0));
  assert.ok(board.kpis.every(kpi => kpi.successCriteria));
  assert.equal(board.automationGate, 'BLOQUEADO_ATE_KPI_BASELINE_E_APPROVALREQUEST');
  assert.ok(board.connections.includes('Motor_de_Lucro'));
  assert.equal(board.learningEvent.metadata.source, 'ceo_mastermind_revenue_retention_kpi_board');
});

test('marks revenue retention KPI board suggestion as implemented', () => {
  assert.equal(isActiveCeoApproval({
    status: 'approved',
    appliedStatus: 'awaiting_codex',
    metadata: {
      source: 'ceo_strategic_kernel',
      suggestionId: 'ceo_mastermind_revenue_retention_kpi_board',
    },
  }), false);
});

test('validates revenue retention and upsell KPIs before automation', () => {
  const validation = createRevenueRetentionKpiValidation({
    kpis: [
      {
        area: 'receita',
        owner: 'CEO/Comercial',
        baseline: 10000,
        weeklyResult: 18000,
        target: 15000,
        dueInDays: 7,
        successCriteria: 'Receita semanal acima da meta com proposta relacionada.',
        profitImpact: 5,
        retentionImpact: 2,
      },
      {
        area: 'retencao',
        owner: 'CS/Operacao',
        baseline: 92,
        weeklyResult: 96,
        target: 95,
        dueInDays: 14,
        successCriteria: 'Clientes ativos com roadmap e risco de churn revisado.',
        profitImpact: 3,
        retentionImpact: 5,
      },
      {
        area: 'upsell',
        weeklyResult: 12,
        target: 40,
      },
    ],
  });

  assert.equal(validation.summary.total, 3);
  assert.equal(validation.summary.readyForApproval, 2);
  assert.equal(validation.summary.blocked, 1);
  assert.equal(validation.automationGate, 'BLOQUEADO_PARA_KPIS_SEM_BASELINE_DONO_PRAZO_OU_CRITERIO');
  assert.equal(validation.priorityKpi.area, 'retencao');
  assert.ok(validation.rows.find(row => row.area === 'upsell').blockers.includes('baseline_missing'));
  assert.ok(validation.approvableAutomations.every(item => item.owner && item.successCriteria));
  assert.equal(validation.learningEvent.metadata.source, 'ceo_mastermind_revenue_kpi_validation_cycle');
});

test('marks revenue KPI validation cycle suggestion as implemented', () => {
  assert.equal(isActiveCeoApproval({
    status: 'approved',
    appliedStatus: 'awaiting_codex',
    metadata: {
      source: 'ceo_strategic_kernel',
      suggestionId: 'ceo_mastermind_revenue_kpi_validation_cycle',
    },
  }), false);
});

test('marks token efficient context pipeline suggestion as implemented', () => {
  assert.equal(isActiveCeoApproval({
    status: 'approved',
    appliedStatus: 'awaiting_codex',
    metadata: {
      source: 'ceo_strategic_kernel',
      suggestionId: 'ceo_mastermind_token_efficient_context_pipeline',
    },
  }), false);
});

test('creates secret and environment matrix with owner rotation and deploy checklist', () => {
  const matrix = createSecretEnvironmentMatrix({
    projects: [
      {
        name: 'Kentauros',
        variables: [
          'VITE_SUPABASE_URL',
          'SUPABASE_SERVICE_ROLE_KEY',
          { name: 'CAPLEAD_IMPORT_API_KEY', status: 'rotacionar antes de producao' },
        ],
      },
      {
        name: 'AutoSocial',
        variables: ['DATABASE_URL', 'JWT_SECRET', 'NEXT_PUBLIC_API_URL'],
      },
    ],
  });

  assert.equal(matrix.summary.projects, 2);
  assert.equal(matrix.summary.variables, 6);
  assert.equal(matrix.summary.verdict, 'BLOQUEADO_ATE_ROTACAO_DE_SEGREDOS');
  assert.ok(matrix.rows.some(row => row.variable === 'SUPABASE_SERVICE_ROLE_KEY' && row.criticality === 'alta'));
  assert.ok(matrix.rows.some(row => row.variable === 'NEXT_PUBLIC_API_URL' && row.exposure === 'publica/browser'));
  assert.ok(matrix.deployChecklist.some(item => item.includes('.env.example')));
  assert.equal(matrix.learningEvent.metadata.source, 'ceo_mastermind_secret_inventory_execution');
});

test('creates risk execution board from active CEO diagnostics', () => {
  const diagnostics = createCeoDiagnostics({
    mastermindKnowledge: [{
      title: 'Memoria Ativa CEO',
      content: '#risco-ativo Supabase RLS MEL-0007 #risco-ativo segredos variaveis de ambiente MEL-0010',
    }],
  });
  const board = createCeoRiskExecutionBoard({ diagnostics, approvalRequests: [] });

  assert.equal(board.summary.total, board.tasks.length);
  assert.ok(board.summary.active >= 2);
  assert.ok(board.tasks.some(task => task.id === 'risk_task_mastermind_supabase_rls_active_risk'));
  assert.ok(board.tasks.every(task => task.approvalRequired));
  assert.ok(board.tasks.every(task => task.nextAction));
  assert.ok(board.tasks.every(task => task.doneCriteria));
});

test('marks risk task as approval pending and creates ApprovalRequest', () => {
  const [task] = createCeoRiskExecutionBoard({
    diagnostics: createCeoDiagnostics({
      mastermindKnowledge: [{
        title: 'Memoria Ativa CEO',
        content: '#risco-ativo Supabase RLS MEL-0007',
      }],
    }),
    approvalRequests: [],
  }).tasks;
  const approval = createCeoRiskTaskApprovalRequest(task, { userId: 13, tenantId: 'tenant-a' });
  const board = createCeoRiskExecutionBoard({
    diagnostics: [{ id: task.diagnosticId, title: task.title, area: task.area, severity: task.severity, status: 'active', summary: task.summary, recommendedAction: task.nextAction, evidence: task.evidence, related: task.related }],
    approvalRequests: [approval],
  });

  assert.equal(approval.metadata.source, 'ceo_risk_execution_board');
  assert.equal(approval.metadata.taskId, task.id);
  assert.equal(board.tasks[0].approvalStatus, 'pending');
  assert.equal(board.tasks[0].status, 'approval_pending');
});
