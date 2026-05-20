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

test('preserves WhatsApp contact in CapLead metadata for quality audit', () => {
  const row = __testing.normalizeLeadData(
    {
      nome: 'Studio Conversao',
      url: 'https://studioconversao.com.br',
      whatsapp: '(11) 97777-1234',
      dataQualityScore: 82,
    },
    {
      tenantId: 'tenant-a',
      userId: 1,
    }
  );

  assert.equal(row.metadata.whatsapp, '(11) 97777-1234');
});

test('normalizes CapLead quality profile for scoring and governance', () => {
  const row = __testing.normalizeLeadData(
    {
      nome: 'Centro da Pele',
      url: 'https://www.centrodapele.com.br/contato',
      email: 'Contato@CentroDaPele.com.br ',
      telefone: '+55 (11) 93018-6652',
      dataQualityScore: 88,
      dataQualityStatus: 'qualified',
      capLeadDedupeKey: 'centrodapele.com.br',
      qualityFlags: ['site_pain_detected'],
    },
    {
      tenantId: 'tenant-a',
      userId: 1,
      userEmail: 'kentauros@example.com',
      userName: 'Matheus',
      capturedBySource: 'Matheus',
    }
  );

  assert.equal(row.email, 'contato@centrodapele.com.br');
  assert.equal(row.score, 88);
  assert.equal(row.metadata.capLeadDedupeKey, 'centrodapele.com.br');
  assert.equal(row.metadata.dataQualityStatus, 'qualified');
  assert.deepEqual(row.metadata.qualityFlags, ['site_pain_detected']);
});

test('preserves CapLead v2 required field review in lead metadata', () => {
  const row = __testing.normalizeLeadData(
    {
      nome: 'Lead incompleto',
      url: 'https://leadincompleto.com.br',
      missingRequiredFields: ['email', 'phone_or_whatsapp', 'ai_score'],
      enrichmentSuggestions: ['capture_email', 'capture_whatsapp', 'run_ai_quality_analysis'],
      requiredFieldsStatus: 'incomplete',
      qualityRecommendation: 'review_before_export',
      externalAutomationApprovalRequired: true,
      dataQualityVersion: 2,
    },
    {
      tenantId: 'tenant-a',
      userId: 1,
      userEmail: 'kentauros@example.com',
      userName: 'Matheus',
      capturedBySource: 'Matheus',
    }
  );

  assert.equal(row.metadata.dataQualityVersion, 2);
  assert.equal(row.metadata.requiredFieldsStatus, 'incomplete');
  assert.deepEqual(row.metadata.missingRequiredFields, ['email', 'phone_or_whatsapp', 'ai_score']);
  assert.deepEqual(row.metadata.enrichmentSuggestions, ['capture_email', 'capture_whatsapp', 'run_ai_quality_analysis']);
  assert.equal(row.metadata.qualityRecommendation, 'review_before_export');
  assert.equal(row.metadata.externalAutomationApprovalRequired, true);
});

test('builds CapLead import quality summary for CEO learning cycle', () => {
  const rows = [
    __testing.normalizeLeadData(
      {
        nome: 'Lead completo',
        url: 'https://leadcompleto.com.br',
        email: 'contato@leadcompleto.com.br',
        telefone: '(11) 93018-6652',
        dataQualityScore: 90,
        requiredFieldsStatus: 'complete',
        missingRequiredFields: [],
        enrichmentSuggestions: [],
      },
      { tenantId: 'tenant-a', userId: 1 }
    ),
    __testing.normalizeLeadData(
      {
        nome: 'Lead incompleto',
        url: 'https://leadincompleto.com.br',
        dataQualityScore: 54,
        missingRequiredFields: ['email', 'phone_or_whatsapp'],
        enrichmentSuggestions: ['capture_email', 'capture_whatsapp'],
      },
      { tenantId: 'tenant-a', userId: 1 }
    ),
  ];

  const summary = __testing.buildCapLeadImportQualitySummary(rows, [{ reason: 'VALIDATION_FAILED' }]);

  assert.equal(summary.qualityVersion, 2);
  assert.equal(summary.qualified, 1);
  assert.equal(summary.reviewRequired, 1);
  assert.equal(summary.failedValidation, 1);
  assert.equal(summary.missingRequiredFields.email, 1);
  assert.equal(summary.enrichmentSuggestions.capture_whatsapp, 1);
  assert.equal(summary.recommendation, 'review_before_external_automation');
});

test('applies CapLead quality contract with minimum score, discard reasons and batch indicators', () => {
  const rows = [
    __testing.normalizeLeadData(
      {
        nome: 'Lead pronto',
        url: 'https://leadpronto.com.br',
        email: 'contato@leadpronto.com.br',
        telefone: '(11) 93018-6652',
        dataQualityScore: 92,
        requiredFieldsStatus: 'complete',
      },
      { tenantId: 'tenant-a', userId: 1 }
    ),
    __testing.normalizeLeadData(
      {
        nome: 'Lead sem contato',
        url: 'https://leadsemcontato.com.br',
        dataQualityScore: 48,
        missingRequiredFields: ['email', 'phone_or_whatsapp'],
      },
      { tenantId: 'tenant-a', userId: 1 }
    ),
    __testing.normalizeLeadData(
      {
        nome: 'Lead sem site',
        dataQualityScore: 30,
      },
      { tenantId: 'tenant-a', userId: 1 }
    ),
  ];

  const summary = __testing.buildCapLeadImportQualitySummary(rows, [{ reason: 'DUPLICATE_BATCH' }]);

  assert.equal(summary.contract.minScore, 70);
  assert.equal(summary.contract.requiredFields.includes('company'), true);
  assert.equal(summary.validLeads, 1);
  assert.equal(summary.withoutContact, 2);
  assert.equal(summary.withoutWebsite, 1);
  assert.equal(summary.duplicates, 1);
  assert.equal(summary.highOpportunity, 1);
  assert.equal(summary.discardReasons.below_min_score, 2);
  assert.equal(summary.discardReasons.missing_contact, 2);
});

test('audits CapLead export batch and recommends enrichment only below contract', () => {
  const rows = [
    __testing.normalizeLeadData(
      {
        nome: 'Lead com contato e site',
        url: 'https://leadcomcontato.com.br',
        email: 'contato@leadcomcontato.com.br',
        telefone: '(11) 93018-6652',
        dataQualityScore: 86,
        requiredFieldsStatus: 'complete',
      },
      { tenantId: 'tenant-a', userId: 1 }
    ),
    __testing.normalizeLeadData(
      {
        nome: 'Lead sem site',
        email: 'sem.site@example.com',
        telefone: '(11) 99999-1111',
        dataQualityScore: 62,
      },
      { tenantId: 'tenant-a', userId: 1 }
    ),
    __testing.normalizeLeadData(
      {
        nome: 'Lead sem contato',
        url: 'https://leadsemcontato.com.br',
        dataQualityScore: 54,
      },
      { tenantId: 'tenant-a', userId: 1 }
    ),
  ];

  const summary = __testing.buildCapLeadImportQualitySummary(rows, [{ reason: 'DUPLICATE_BATCH' }]);
  const learning = __testing.buildCapLeadExportAuditLearning(summary);

  assert.equal(summary.exportAudit.validContactRate, 67);
  assert.equal(summary.exportAudit.websiteCompletenessRate, 67);
  assert.equal(summary.exportAudit.duplicateRate, 25);
  assert.equal(summary.exportAudit.enrichmentRequired, true);
  assert.deepEqual(summary.exportAudit.enrichmentReasons, [
    'contact_rate_below_contract',
    'website_rate_below_contract',
    'average_score_below_contract',
    'duplicate_rate_above_contract',
  ]);
  assert.equal(summary.exportAudit.recommendation, 'enrich_batch_before_commercial_actions');
  assert.equal(learning.event_type, 'caplead_export_batch_audited');
  assert.equal(learning.metadata.source, 'ceo_mastermind_caplead_export_enrichment_audit');
  assert.equal(learning.metadata.enrichmentRequired, true);

  const readySummary = __testing.buildCapLeadImportQualitySummary(rows.slice(0, 1));

  assert.equal(readySummary.exportAudit.enrichmentRequired, false);
  assert.equal(readySummary.exportAudit.recommendation, 'batch_ready_for_commercial_actions');
});

test('deduplicates CapLead import rows inside the same batch by quality key', () => {
  const rows = [
    __testing.normalizeLeadData({ nome: 'Centro A', url: 'https://centroa.com.br', email: 'a@centro.com', dataQualityScore: 40 }, { tenantId: 'tenant-a', userId: 1 }),
    __testing.normalizeLeadData({ nome: 'Centro A Melhor', url: 'https://www.centroa.com.br/contato', email: 'b@centro.com', dataQualityScore: 90 }, { tenantId: 'tenant-a', userId: 1 }),
  ];

  const deduped = __testing.dedupeCapLeadImportRows(rows);

  assert.equal(deduped.length, 1);
  assert.equal(deduped[0].company, 'Centro A Melhor');
  assert.equal(deduped[0].score, 90);
});

test('requires CapLead import API key in production', () => {
  assert.equal(
    __testing.isImportAuthorized({
      configuredApiKey: '',
      nodeEnv: 'production',
      requestApiKey: 'anything',
      bodyApiKey: '',
    }),
    false
  );
});

test('accepts CapLead import when configured key matches header', () => {
  assert.equal(
    __testing.isImportAuthorized({
      configuredApiKey: 'secret',
      nodeEnv: 'production',
      requestApiKey: 'secret',
      bodyApiKey: '',
    }),
    true
  );
});

test('restricts production CORS to configured origins', () => {
  assert.equal(
    __testing.resolveAllowedOrigin({
      requestOrigin: 'https://app.kentauros.consulting',
      allowedOrigins: 'https://app.kentauros.consulting,https://kentauros-os-app.vercel.app',
      nodeEnv: 'production',
    }),
    'https://app.kentauros.consulting'
  );
  assert.equal(
    __testing.resolveAllowedOrigin({
      requestOrigin: 'https://malicious.example',
      allowedOrigins: 'https://app.kentauros.consulting',
      nodeEnv: 'production',
    }),
    'null'
  );
});
