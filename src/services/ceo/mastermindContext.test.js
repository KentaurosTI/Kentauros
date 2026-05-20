import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ACTIVE_MASTERMIND_MEMORY,
  buildEconomicMastermindContext,
  buildMastermindKnowledge,
} from './mastermindContext.js';

test('builds active CEO memory as MasterMind knowledge', () => {
  const knowledge = buildMastermindKnowledge();

  assert.ok(knowledge.length >= ACTIVE_MASTERMIND_MEMORY.length);
  assert.ok(knowledge.some(item => item.content.includes('#risco-ativo')));
  assert.ok(knowledge.some(item => item.content.includes('Retencao maior que 95%')));
  assert.ok(knowledge.some(item => item.title === 'Hub Novo Conhecimento 2026-05-20'));
  assert.ok(knowledge.some(item => item.title === 'Protocolo Consulta Economica MasterMind'));
});

test('merges learning, approvals, projects and automations into CEO context', () => {
  const knowledge = buildMastermindKnowledge({
    learningEvents: [{ title: 'Aprendizado comercial', content: 'ROI de proposta aberta', tags: ['#aprendizado'] }],
    approvalRequests: [{ title: 'Aprovacao Codex', status: 'approved', appliedStatus: 'awaiting_codex' }],
    projects: [{ id: 'p1', name: 'Kentauros', status: 'MVP', risk: 'Supabase RLS' }],
    automations: [{ id: 'a1', name: 'Follow-up', status: 'active', logs: [] }],
  });

  assert.ok(knowledge.some(item => item.metadata.source === 'learning_event'));
  assert.ok(knowledge.some(item => item.metadata.source === 'approval_request'));
  assert.ok(knowledge.some(item => item.metadata.source === 'project_context'));
  assert.ok(knowledge.some(item => item.metadata.source === 'automation_context' && item.content.includes('sem logs')));
});

test('builds economic MasterMind context from active memory and hubs first', () => {
  const context = buildEconomicMastermindContext({
    learningEvents: [
      {
        title: 'Reuniao_Onboarding_1779213999636',
        content: 'nota bruta repetida sem hub de consulta',
        tags: ['#reuniao'],
        metadata: { source: 'raw_note' },
      },
    ],
    approvalRequests: [
      {
        title: 'ApprovalRequest criado',
        status: 'approved',
        appliedStatus: 'awaiting_codex',
        metadata: { source: 'raw_approval' },
      },
    ],
  });

  assert.ok(context.primaryKnowledge.length > 0);
  assert.ok(context.primaryKnowledge.every(item => ['active_memory_ceo', 'hub_context'].includes(item.metadata.consultationLayer)));
  assert.ok(context.alerts.some(alert => alert.type === 'raw_context_without_hub'));
  assert.equal(context.tokenPolicy.strategy, 'camadas_memoria_hub_indices_bruto');
  assert.equal(context.learningEvent.metadata.source, 'ceo_mastermind_token_efficient_context_pipeline');
});

test('keeps raw evidence out of primary suggestions until a hub is available', () => {
  const context = buildEconomicMastermindContext({
    learningEvents: Array.from({ length: 4 }, (_, index) => ({
      title: `Aprovacao_${index}`,
      content: 'nota bruta repetida de aprovacao autonoma',
      metadata: { source: 'raw_note' },
    })),
  });

  assert.equal(context.summary.rawEvidence, 4);
  assert.ok(context.summary.alerts >= 1);
  assert.equal(context.primaryKnowledge.some(item => item.metadata.source === 'learning_event'), false);
});
