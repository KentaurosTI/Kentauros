import assert from 'node:assert/strict';
import test from 'node:test';
import { buildCaptureCompletion, LeadCaptureService } from './LeadCaptureService.js';

test('opens the grid when a partial capture returns validated leads', () => {
  const completion = buildCaptureCompletion({
    success: false,
    errorCode: 'INSUFFICIENT_VALIDATED_LEADS',
    message: 'Quantidade insuficiente.',
    requested: 20,
    qualifiedCount: 3,
    qualified: [
      { id: 'lead-1', name: 'Clinica Oficial', website: 'https://clinica.example' },
      { id: 'lead-2', name: 'Dentista Oficial', website: 'https://dentista.example' },
      { id: 'lead-3', name: 'Odonto Oficial', website: 'https://odonto.example' },
    ],
  }, 20);

  assert.equal(completion.jobStatus, 'completed');
  assert.equal(completion.isSuccess, true);
  assert.equal(completion.isPartialSuccess, true);
  assert.equal(completion.errorCode, null);
  assert.equal(completion.returnedLeads.length, 3);
});

test('keeps the capture failed when no lead can be shown in the grid', () => {
  const completion = buildCaptureCompletion({
    success: false,
    errorCode: 'INSUFFICIENT_VALIDATED_LEADS',
    message: 'Nenhum lead validado.',
    requested: 20,
    qualifiedCount: 0,
    qualified: [],
  }, 20);

  assert.equal(completion.jobStatus, 'failed');
  assert.equal(completion.isSuccess, false);
  assert.equal(completion.errorCode, 'INSUFFICIENT_VALIDATED_LEADS');
});

test('streaming capture stores partial validated leads as a completed job', async () => {
  const updates = [];
  const storedLeads = [];
  const previousFetch = globalThis.fetch;

  globalThis.fetch = async () => new Response(`${JSON.stringify({
    type: 'final',
    captureRunId: 'run-1',
    result: {
      success: false,
      errorCode: 'INSUFFICIENT_VALIDATED_LEADS',
      message: 'Quantidade insuficiente.',
      requested: 20,
      qualifiedCount: 3,
      qualified: [
        { id: 'lead-1', name: 'Clinica Oficial', website: 'https://clinica.example' },
        { id: 'lead-2', name: 'Dentista Oficial', website: 'https://dentista.example' },
        { id: 'lead-3', name: 'Odonto Oficial', website: 'https://odonto.example' },
      ],
      totalFound: 3,
      totalScanned: 40,
      rejectedCount: 37,
      partial: true,
    },
  })}\n`, { status: 200, headers: { 'Content-Type': 'application/x-ndjson' } });

  try {
    const service = new LeadCaptureService({
      updateCaptureJob: (_jobId, data) => updates.push(data),
      clearCaptureResults: () => {},
      addCaptureResults: (_jobId, leads) => storedLeads.push(...leads),
    }, 'http://localhost:3001');

    const result = await service.runStreamingCapture({
      jobId: 'job-1',
      streamUrl: 'http://localhost:3001/api/leads/capture-stream',
      captureRunId: 'run-1',
      niche: 'dentistas',
      location: 'Belo Horizonte, MG',
      quantity: 20,
      captureMetric: 'website_reformulation',
      contactRequirements: { website: true },
    });

    assert.equal(result.success, true);
    assert.equal(result.partial, true);
    assert.equal(storedLeads.length, 3);
    assert.equal(updates.at(-1).status, 'completed');
    assert.equal(updates.at(-1).errorCode, null);
  } finally {
    globalThis.fetch = previousFetch;
  }
});
