import test from 'node:test';
import assert from 'node:assert/strict';
import { __testing } from './import.ts';

test('normalizes CapLead AI-assisted project value into Kentauros lead value', () => {
  const row = __testing.normalizeLeadData(
    {
      nome: 'Clínica Recanto PSI',
      url: 'https://recantopsi.com.br',
      email: 'contato@recantopsi.com.br',
      estimatedValue: 9000,
      pricingModel: 'ai_development',
      pricingBasis: 'Projeto estimado para entrega assistida por IA',
    },
    {
      tenantId: 'tenant-a',
      userId: 1,
      userEmail: 'kentauros@example.com',
      userName: 'Matheus',
      capturedBySource: 'Matheus',
    }
  );

  assert.equal(row.value, 9000);
  assert.equal(row.metadata.pricingModel, 'ai_development');
  assert.equal(row.metadata.estimatedValue, 9000);
});

test('parses Brazilian currency strings from CapLead payloads', () => {
  assert.equal(__testing.parseLeadValue({ valor_estimado: 'R$ 7.490,00' }), 7490);
});

test('normalizes confirmed WhatsApp sends from CapLead payloads', () => {
  const row = __testing.normalizeLeadData(
    {
      nome: 'ClÃ­nica Recanto PSI',
      url: 'https://recantopsi.com.br',
      telefone: '(21) 99888-7777',
      wpp_enviado: 1,
      whatsappSentAt: '2026-05-17T12:00:00.000Z',
    },
    {
      tenantId: 'tenant-a',
      userId: 1,
      userEmail: 'kentauros@example.com',
      userName: 'Matheus',
      capturedBySource: 'Matheus',
    }
  );

  assert.equal(row.metadata.whatsappSent, true);
  assert.equal(row.metadata.whatsappSentAt, '2026-05-17T12:00:00.000Z');
  assert.equal(row.metadata.whatsappMessageStatus, 'sent');
});
