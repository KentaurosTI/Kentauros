import test from 'node:test';
import assert from 'node:assert/strict';

import { validateAndQualifyLeads } from './leadQualification.js';

const htmlResponse = (body, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  headers: { get: () => 'text/html' },
  text: async () => body,
});

const validSiteHtml = `
  <html>
    <head>
      <title>Contabilidade Validada</title>
      <meta name="description" content="Escritorio contabil com atendimento empresarial">
    </head>
    <body>
      Contabilidade em Sao Paulo com atendimento empresarial, fiscal, tributario e abertura de empresas.
      Fale com nosso time comercial pelo e-mail contato@contabilidadevalidada.com.br.
      WhatsApp (11) 99999-0000 e telefone (11) 3333-4444 para orcamentos e suporte.
      Nossa equipe atende empresas de tecnologia, comercio e servicos com processos digitais,
      consultoria contabil, emissao de notas, folha de pagamento, planejamento tributario,
      regularizacao cadastral, integracao com sistemas financeiros e canais de atendimento.
      <a href="/contato">Contato</a>
    </body>
  </html>
`;

test('rejects leads whose websites are not reachable', async () => {
  const { qualified, rejectionReasons } = await validateAndQualifyLeads([
    { name: 'Dominio Quebrado', website: 'https://dominio-quebrado.test', email: 'fake@dominio-quebrado.test' },
  ], {
    quantity: 1,
    contactRequirements: { email: true, website: true },
    fetchImpl: async () => htmlResponse('', 404),
  });

  assert.equal(qualified.length, 0);
  assert.equal(rejectionReasons.website_unreachable_or_not_html, 1);
});

test('returns only leads with functional websites and required contacts', async () => {
  const { qualified, rejectionReasons } = await validateAndQualifyLeads([
    { name: 'Quebrado', website: 'https://quebrado.test' },
    { name: 'Validado', website: 'https://validado.test' },
  ], {
    quantity: 2,
    contactRequirements: { email: true, whatsapp: true, website: true },
    fetchImpl: async (url) => {
      if (String(url).includes('validado.test')) return htmlResponse(validSiteHtml);
      return htmlResponse('', 404);
    },
  });

  assert.equal(qualified.length, 1);
  assert.equal(qualified[0].websiteValidation.isFunctional, true);
  assert.equal(qualified[0].email, 'contato@contabilidadevalidada.com.br');
  assert.equal(qualified[0].whatsapp, '11999990000');
  assert.equal(rejectionReasons.website_unreachable_or_not_html, 1);
});

test('rejects functional article pages instead of qualifying them as leads', async () => {
  const articleHtml = `
    <html>
      <head><title>Spotify tem playlist com as musicas mais ouvidas da sua conta</title></head>
      <body>
        Artigo aleatorio sobre tecnologia, aplicativos e retrospectiva musical.
        Email da redacao redacao@portalconteudo.com.br e telefone (11) 3333-4444.
        Conteudo suficiente para parecer uma pagina funcional, mas nao representa
        uma imobiliaria oficial em Brasilia e nao deve entrar no grid de leads.
      </body>
    </html>
  `;

  const { qualified, rejectionReasons } = await validateAndQualifyLeads([
    {
      name: 'Spotify tem playlist com as musicas mais ouvidas da sua conta',
      website: 'https://portalconteudo.test/apps/spotify-playlist',
    },
  ], {
    quantity: 1,
    contactRequirements: { email: true, website: true },
    captureConfig: { niche: 'imobiliarias', location: 'Brasilia, DF' },
    fetchImpl: async () => htmlResponse(articleHtml),
  });

  assert.equal(qualified.length, 0);
  assert.equal(rejectionReasons.not_official_business_site, 1);
});

test('keeps leads that already carry trusted website validation', async () => {
  const { qualified } = await validateAndQualifyLeads([
    {
      name: 'Engine Validado',
      website: 'https://engine-validado.test',
      email: 'contato@engine-validado.test',
      whatsapp: '11999990000',
      websiteValidation: { isFunctional: true },
    },
  ], {
    quantity: 1,
    contactRequirements: { email: true, whatsapp: true, website: true },
    fetchImpl: async () => {
      throw new Error('trusted leads should not be fetched again');
    },
  });

  assert.equal(qualified.length, 1);
  assert.equal(qualified[0].isValid, true);
});

test('can qualify trusted official sites with website-only requirements', async () => {
  const { qualified, rejectionReasons } = await validateAndQualifyLeads([
    {
      name: 'Clínica Oficial Sem Email',
      website: 'https://clinicaoficial.com.br',
      description: 'clinica estetica em Santos',
      websiteValidation: { isFunctional: true },
    },
  ], {
    quantity: 1,
    contactRequirements: { website: true },
    captureConfig: { niche: 'estéticas', location: 'Santos, SP' },
    fetchImpl: async () => {
      throw new Error('trusted website-only leads should not be fetched again');
    },
  });

  assert.equal(qualified.length, 1);
  assert.equal(rejectionReasons.missing_email, undefined);
});
