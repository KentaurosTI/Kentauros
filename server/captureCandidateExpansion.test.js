import test from 'node:test';
import assert from 'node:assert/strict';

import { buildExpandedSearchQueries, collectOpenStreetMapCandidates } from './captureCandidateExpansion.js';

test('builds a broad search pool for the requested niche and location', () => {
  const queries = buildExpandedSearchQueries({
    niche: 'restaurantes',
    location: 'Belo Horizonte, MG',
  });

  assert.ok(queries.length > 20);
  assert.ok(queries.some(query => query.includes('churrascaria') && query.includes('Belo Horizonte')));
  assert.ok(queries.some(query => query.includes('whatsapp contato')));
  assert.ok(queries.some(query => query.includes('site:.com.br')));
});

test('builds engineering-specific expansion queries', () => {
  const queries = buildExpandedSearchQueries({
    niche: 'engenharias',
    location: 'Belo Horizonte, MG',
  }, 200);

  assert.ok(queries.some(query => query.includes('construtora') && query.includes('Belo Horizonte')));
  assert.ok(queries.some(query => query.includes('consultoria engenharia')));
  assert.ok(queries.some(query => query.includes('portfolio contato')));
});

test('builds dentistry-specific expansion queries', () => {
  const queries = buildExpandedSearchQueries({
    niche: 'dentistas',
    location: 'Goiânia, GO',
  }, 200);

  assert.ok(queries.some(query => query.includes('clinica odontologica') && query.includes('Goiânia')));
  assert.ok(queries.some(query => query.includes('ortodontista')));
  assert.ok(queries.some(query => query.includes('implantes dentarios')));
});

test('collects website candidates from OpenStreetMap tags', async () => {
  const candidates = await collectOpenStreetMapCandidates({
    niche: 'restaurantes',
    location: 'Belo Horizonte, MG',
  }, {
    targetCount: 10,
    fetchImpl: async (url) => {
      if (String(url).includes('nominatim.openstreetmap.org')) {
        return {
          ok: true,
          json: async () => [{ boundingbox: ['-20.1', '-19.7', '-44.1', '-43.8'] }],
        };
      }
      return {
        ok: true,
        json: async () => ({
          elements: [
            {
              type: 'node',
              id: 1,
              tags: {
                name: 'Restaurante Real',
                amenity: 'restaurant',
                website: 'https://restaurante-real.com.br',
                'contact:email': 'contato@restaurante-real.com.br',
                phone: '(31) 99999-0000',
              },
            },
            {
              type: 'node',
              id: 2,
              tags: { name: 'Sem Site', amenity: 'restaurant' },
            },
          ],
        }),
      };
    },
  });

  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].source, 'OpenStreetMap');
  assert.equal(candidates[0].website, 'https://restaurante-real.com.br');
});

test('collects dentistry candidates from OpenStreetMap healthcare tags', async () => {
  let overpassBody = '';
  const candidates = await collectOpenStreetMapCandidates({
    niche: 'odontologia',
    location: 'Goiânia, GO',
  }, {
    targetCount: 10,
    fetchImpl: async (url, options = {}) => {
      if (String(url).includes('nominatim.openstreetmap.org')) {
        return {
          ok: true,
          json: async () => [{ boundingbox: ['-16.9', '-16.4', '-49.5', '-49.0'] }],
        };
      }
      overpassBody = options.body || '';
      return {
        ok: true,
        json: async () => ({
          elements: [
            {
              type: 'node',
              id: 21,
              tags: {
                name: 'Clínica Odonto Real',
                healthcare: 'dentist',
                website: 'https://odontoreal.com.br',
                email: 'contato@odontoreal.com.br',
                phone: '(62) 3333-0000',
              },
            },
          ],
        }),
      };
    },
  });

  assert.match(decodeURIComponent(overpassBody), /healthcare/);
  assert.match(decodeURIComponent(overpassBody), /dentist/);
  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].website, 'https://odontoreal.com.br');
});
