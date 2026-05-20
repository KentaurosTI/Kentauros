import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildDiscoveryFromLead,
  buildOpportunityTimeline,
  buildRetentionClientFromProposal,
  canTransitionLeadStatus,
  findExistingProposal,
  isDiscoveryReadyForProposal,
} from './commercialFlow.js';

const lead = {
  id: 'lead-1',
  company: 'Centro da Pele',
  contact: 'Representante',
  email: 'contato@centrodapele.com.br',
  phone: '(11) 99999-0000',
  website: 'https://centrodapele.com.br',
  source: 'CapLead',
  value: 9000,
  commercialOwnerUserId: 15,
  metadata: { capLeadSource: 'CapLead' },
};

test('allows lead status to move forward and rejects invalid regressions without reason', () => {
  assert.equal(canTransitionLeadStatus('new', 'qualified').allowed, true);
  assert.equal(canTransitionLeadStatus('proposal', 'new').allowed, false);
  assert.equal(canTransitionLeadStatus('proposal', 'lost', 'Cliente sem budget').allowed, true);
});

test('builds discovery from lead with commercial and CapLead context', () => {
  const discovery = buildDiscoveryFromLead(lead);

  assert.equal(discovery.leadId, 'lead-1');
  assert.equal(discovery.clientName, 'Centro da Pele');
  assert.equal(discovery.estimatedValue, 9000);
  assert.equal(discovery.website, 'https://centrodapele.com.br');
  assert.equal(discovery.phone, '(11) 99999-0000');
  assert.equal(discovery.commercialOwnerUserId, 15);
  assert.equal(discovery.metadata.capLeadSource, 'CapLead');
});

test('requires discovery business fields before proposal generation', () => {
  assert.equal(isDiscoveryReadyForProposal({ summary: 'ok', estimatedValue: 9000 }).ready, false);
  assert.equal(
    isDiscoveryReadyForProposal({
      summary: 'Site com baixa conversao',
      opportunity: 'Novo funil com IA',
      scope: 'Diagnostico, prototipo e implementacao',
      estimatedValue: 9000,
      nextAction: 'Enviar proposta',
    }).ready,
    true
  );
});

test('finds existing proposal by discovery or lead to avoid duplicates', () => {
  const proposals = [
    { id: 'proposal-1', discoveryId: 'discovery-1', leadId: 'lead-1', clientName: 'Centro da Pele' },
  ];

  assert.equal(findExistingProposal(proposals, { id: 'discovery-1', leadId: 'lead-1', clientName: 'Centro da Pele' })?.id, 'proposal-1');
});

test('builds retention client with roadmap fields from a signed proposal', () => {
  const client = buildRetentionClientFromProposal({
    id: 'proposal-1',
    clientName: 'Centro da Pele',
    value: 9000,
    leadId: 'lead-1',
  });

  assert.equal(client.company, 'Centro da Pele');
  assert.equal(client.originProposalId, 'proposal-1');
  assert.equal(client.successMetrics.length > 0, true);
  assert.equal(client.retentionRoadmap.length > 0, true);
  assert.equal(client.recurringOpportunity, true);
});

test('builds a single opportunity timeline across entities', () => {
  const timeline = buildOpportunityTimeline({
    lead,
    discoveries: [{ id: 'discovery-1', leadId: 'lead-1', title: 'Discovery', updatedAt: '2026-05-18T10:00:00Z' }],
    proposals: [{ id: 'proposal-1', leadId: 'lead-1', title: 'Proposta', createdAt: '2026-05-18T11:00:00Z' }],
    prototypes: [{ id: 'proto-1', lead_id: 'lead-1', client_name: 'Centro da Pele', created_at: '2026-05-18T12:00:00Z' }],
  });

  assert.deepEqual(timeline.map(item => item.type), ['lead', 'discovery', 'proposal', 'prototype']);
});
