import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { POST } from './capture.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));

const captureRequest = (body) => new Request('http://localhost/api/leads/capture', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body),
});

function extractOptionValues(constName) {
  const modalPath = resolve(__dirname, '../../src/components/leads/CaptureModal.jsx');
  const content = readFileSync(modalPath, 'utf8');
  const start = content.indexOf(`const ${constName} = [`);
  assert.notEqual(start, -1, `${constName} should exist in CaptureModal`);

  const end = content.indexOf('];', start);
  assert.notEqual(end, -1, `${constName} should have a closing array`);

  return [...content.slice(start, end).matchAll(/value:\s*'([^']+)'/g)].map(match => match[1]);
}

test('releases local demo accounting leads for review when websites are not reachable', async () => {
  const response = await POST(captureRequest({
    niche: 'contabilidade',
    location: 'Belo Horizonte, MG',
    quantity: 3,
    contactRequirements: { email: true, phone: false, whatsapp: false, website: true },
    captureRunId: 'test_bh_accounting',
  }));

  assert.equal(response.status, 200);
  const body = await response.json();

  assert.equal(body.success, true);
  assert.notEqual(body.errorCode, 'NO_LEADS_FOR_LOCATION');
  assert.equal(body.errorCode ?? null, null);
  assert.ok(body.qualifiedCount > 0);
  assert.ok(body.qualified.length > 0);
  assert.ok(body.rejectionReasons.website_unreachable_or_not_html >= 1);
  assert.ok(body.qualified.every(lead => lead.website));
});

test('releases reviewable leads when strict production validation rejects all candidates', async () => {
  const response = await POST(captureRequest({
    niche: 'escritórios de advocacia',
    location: 'São Paulo, SP',
    quantity: 20,
    contactRequirements: { email: true, phone: false, whatsapp: false, website: true },
    captureRunId: 'test_sp_law_reviewable',
  }));

  assert.equal(response.status, 200);
  const body = await response.json();

  assert.equal(body.success, true);
  assert.equal(body.errorCode ?? null, null);
  assert.equal(body.partial, false);
  assert.equal(body.qualifiedCount, 20);
  assert.ok(body.qualified.every(lead => lead.isValid));
  assert.ok(body.qualified.every(lead => lead.status === 'qualified'));
  assert.ok(body.qualified.every(lead => lead.website));
});

test('releases generic reviewable leads for niches not present in the demo database', async () => {
  const response = await POST(captureRequest({
    niche: 'psicólogos',
    location: 'São Paulo, SP',
    quantity: 20,
    captureMetric: 'new_website',
    contactRequirements: { email: true, phone: false, whatsapp: false, website: false },
    captureRunId: 'test_sp_psychologists_generic',
  }));

  assert.equal(response.status, 200);
  const body = await response.json();

  assert.equal(body.success, true);
  assert.equal(body.errorCode ?? null, null);
  assert.equal(body.partial, true);
  assert.ok(body.qualifiedCount > 0);
  assert.ok(body.qualified.every(lead => lead.isValid));
  assert.ok(body.qualified.every(lead => lead.captureMetric === 'new_website'));
  assert.ok(body.qualified.every(lead => !lead.website));
  assert.match(body.message, /revisao/i);
});

test('returns deterministic demo website leads when website is required for an unmapped niche', async () => {
  const response = await POST(captureRequest({
    niche: 'psicÃ³logos',
    location: 'SÃ£o Paulo, SP',
    quantity: 20,
    captureMetric: 'website_reformulation',
    contactRequirements: { email: true, phone: false, whatsapp: false, website: true },
    captureRunId: 'test_sp_psychologists_requires_website',
  }));

  assert.equal(response.status, 200);
  const body = await response.json();

  assert.equal(body.success, true);
  assert.equal(body.errorCode ?? null, null);
  assert.equal(body.qualifiedCount, 20);
  assert.ok(body.qualified.every(lead => lead.website));
  assert.ok(body.qualified.every(lead => lead.providerMetadata?.hasDigitalPresence === true));
});

test('demo website source covers every niche option for website-required captures', async () => {
  const niches = extractOptionValues('NICHE_OPTIONS');
  assert.ok(niches.length > 40);

  for (const niche of niches) {
    const response = await POST(captureRequest({
      niche,
      location: 'São Paulo, SP',
      quantity: 3,
      captureMetric: 'website_reformulation',
      contactRequirements: { email: false, phone: false, whatsapp: false, website: true },
      captureRunId: `test_demo_site_${niche}`,
    }));
    const body = await response.json();

    assert.equal(body.success, true, `${niche} should return demo leads with site`);
    assert.equal(body.errorCode ?? null, null, `${niche} should not return ${body.errorCode}`);
    assert.equal(body.qualifiedCount, 3, `${niche} should return requested quantity`);
    assert.ok(body.qualified.every(lead => /^https:\/\/.+\..+/.test(lead.website)), `${niche} should only return leads with website`);
  }
});

test('demo website source covers every location option for website-required captures', async () => {
  const locations = extractOptionValues('LOCATION_OPTIONS');
  assert.ok(locations.length > 30);

  for (const location of locations) {
    const response = await POST(captureRequest({
      niche: 'psicólogos',
      location,
      quantity: 2,
      captureMetric: 'website_reformulation',
      contactRequirements: { email: false, phone: false, whatsapp: false, website: true },
      captureRunId: `test_demo_location_${location}`,
    }));
    const body = await response.json();

    assert.equal(body.success, true, `${location} should return demo leads with site`);
    assert.equal(body.errorCode ?? null, null, `${location} should not return ${body.errorCode}`);
    assert.equal(body.qualifiedCount, 2, `${location} should return requested quantity`);
    assert.ok(body.qualified.every(lead => /^https:\/\/.+\..+/.test(lead.website)), `${location} should only return leads with website`);
  }
});

test('production capture uses real OpenStreetMap website leads instead of demo domains', async () => {
  const previousFetch = globalThis.fetch;
  const previousVercel = process.env.VERCEL;
  process.env.VERCEL = 'true';

  globalThis.fetch = async (url, options = {}) => {
    const target = String(url);
    if (target.includes('nominatim.openstreetmap.org/search')) {
      return {
        ok: true,
        json: async () => [{
          boundingbox: ['-23.7', '-23.4', '-46.8', '-46.4'],
          display_name: 'São Paulo, SP, Brasil',
          extratags: {},
        }],
      };
    }

    if (target.includes('overpass-api.de/api/interpreter')) {
      return {
        ok: true,
        json: async () => ({
          elements: [{
            type: 'node',
            id: 7788,
            tags: {
              name: 'Advocacia Real Paulista',
              office: 'lawyer',
              website: 'https://advocaciarealpaulista.com.br',
              email: 'contato@advocaciarealpaulista.com.br',
              phone: '+55 11 3333-4444',
              'addr:city': 'São Paulo',
              'addr:state': 'SP',
            },
          }],
        }),
      };
    }

    if (target === 'https://advocaciarealpaulista.com.br') {
      return {
        ok: true,
        text: async () => '<html><body>contato@advocaciarealpaulista.com.br (11) 93333-4444</body></html>',
      };
    }

    return { ok: false, json: async () => ({}), text: async () => '' };
  };

  try {
    const response = await POST(captureRequest({
      niche: 'escritórios de advocacia',
      location: 'São Paulo, SP',
      quantity: 1,
      captureMetric: 'website_reformulation',
      contactRequirements: { email: true, phone: false, whatsapp: false, website: true },
      captureRunId: 'test_real_osm_prod_capture',
    }));
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.qualifiedCount, 1);
    assert.equal(body.source, 'openstreetmap');
    assert.equal(body.qualified[0].source, 'OpenStreetMap');
    assert.equal(body.qualified[0].website, 'https://advocaciarealpaulista.com.br');
    assert.ok(!body.qualified[0].website.includes('caplead-demo.com.br'));
  } finally {
    globalThis.fetch = previousFetch;
    if (previousVercel === undefined) {
      delete process.env.VERCEL;
    } else {
      process.env.VERCEL = previousVercel;
    }
  }
});
