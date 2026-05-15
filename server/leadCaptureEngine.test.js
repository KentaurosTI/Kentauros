import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildSearchQueries,
  captureLeads,
  extractCandidatesFromBingRss,
  extractCandidatesFromSearchHtml,
  extractContactLinks,
  extractContactsFromHtml,
  isDirectoryOrArticleCandidate,
  isLikelyOfficialLeadCandidate,
  matchesCaptureIntent,
  normalizeWebsiteUrl,
  qualifiesLead,
} from './leadCaptureEngine.js';

const htmlResponse = (body, headers = { 'content-type': 'text/html' }) => ({
  ok: true,
  status: 200,
  headers: { get: (name) => headers[name.toLowerCase()] || headers[name] || '' },
  text: async () => body,
});

test('builds search queries from user niche and location', () => {
  const queries = buildSearchQueries({ niche: 'clinica medica', location: 'Sao Paulo SP' });
  assert.ok(queries.every(query => query.includes('clinica medica')));
  assert.ok(queries.some(query => query.includes('Sao Paulo SP')));
});

test('normalizes and blocks invalid search result urls', () => {
  assert.equal(normalizeWebsiteUrl('https://www.exemplo.com.br/?utm_source=x#top'), 'https://exemplo.com.br');
  assert.equal(normalizeWebsiteUrl('https://instagram.com/empresa'), null);
  assert.equal(
    normalizeWebsiteUrl('https://duckduckgo.com/l/?uddg=https%3A%2F%2Fwww.empresa.com.br%2Fcontato'),
    'https://empresa.com.br/contato'
  );
});

test('extracts candidate websites from search html', () => {
  const candidates = extractCandidatesFromSearchHtml(`
    <a href="https://empresa-a.com.br">Empresa A</a>
    <a href="https://www.google.com/maps/place/foo">Maps</a>
    <a href="https://empresa-b.com.br/contato">Empresa B</a>
    <a href="https://boaempresa.com.br/sp/s/academia">Lista de Academia em Sao Paulo - Telefones e Enderecos</a>
  `);

  assert.deepEqual(candidates.map(candidate => candidate.website), [
    'https://empresa-a.com.br',
    'https://empresa-b.com.br/contato',
  ]);
});

test('rejects directory and article-like candidates', () => {
  assert.equal(isDirectoryOrArticleCandidate({
    name: 'Lista de Academia em Sao Paulo - Telefones e Enderecos',
    website: 'https://boaempresa.com.br/sp/s/academia',
  }), true);
  assert.equal(isDirectoryOrArticleCandidate({
    name: 'Academia Pinheiros',
    website: 'https://academiapinheiros.com.br',
  }), false);
  assert.equal(isLikelyOfficialLeadCandidate({
    name: 'Basketball, USA: Detroit Pistons live scores, results, fixtures',
    website: 'https://flashscore.com/team/detroit-pistons',
  }), false);
  assert.equal(isLikelyOfficialLeadCandidate({
    name: 'Spotify tem playlist com as musicas mais ouvidas da sua conta',
    website: 'https://canaltech.com.br/apps/spotify-tem-playlist',
  }), false);
  assert.equal(isLikelyOfficialLeadCandidate({
    name: 'Imobiliaria Alfa',
    website: 'https://imobiliariaalfa.com.br/contato',
  }), true);
});

test('extracts candidate websites from Bing RSS', () => {
  const candidates = extractCandidatesFromBingRss(`
    <rss><channel>
      <item><title>Empresa C</title><link>https://www.empresa-c.com.br/</link></item>
      <item><title>Rede social</title><link>https://instagram.com/empresa</link></item>
    </channel></rss>
  `);

  assert.deepEqual(candidates.map(candidate => candidate.website), ['https://empresa-c.com.br']);
});

test('extracts internal contact links from website html', () => {
  const links = extractContactLinks(`
    <a href="/contato">Contato</a>
    <a href="https://externo.com.br/contato">Contato externo</a>
    <a href="/sobre">Sobre</a>
  `, 'https://empresa.com.br');

  assert.deepEqual(links, ['https://empresa.com.br/contato', 'https://empresa.com.br/sobre']);
});

test('extracts contact data from reachable website html', () => {
  const contacts = extractContactsFromHtml(`
    <a href="mailto:contato@empresa.com.br">Email</a>
    <a href="https://wa.me/5511999990000">WhatsApp</a>
    Telefone (11) 98888-7777
  `);

  assert.equal(contacts.emails[0], 'contato@empresa.com.br');
  assert.ok(contacts.phones.includes('11988887777'));
  assert.ok(contacts.whatsappPhones.includes('11999990000'));
});

test('qualifies only leads matching selected requirements', () => {
  const lead = { website: 'https://empresa.com.br', contacts: { emails: ['a@b.com'], phones: [], whatsappPhones: [] } };
  assert.equal(qualifiesLead(lead, { email: true }), true);
  assert.equal(qualifiesLead(lead, { phone: true }), false);
});

test('matches leads against the user capture intent', () => {
  assert.equal(matchesCaptureIntent({
    name: 'Clinica Odontologica Alfa',
    website: 'https://alfa.com.br',
    bodyText: 'Atendimento odontologico em Sao Paulo',
  }, { niche: 'clinica odontologica', location: 'Sao Paulo SP' }), true);

  assert.equal(matchesCaptureIntent({
    name: 'Artigo tecnico aleatorio',
    website: 'https://conteudo.example',
    bodyText: 'Conteudo sem relacao com odontologia',
  }, { niche: 'clinica odontologica', location: 'Sao Paulo SP' }), false);
});

test('captures exact requested quantity by skipping invalid candidates', async () => {
  const searchHtml = `
    <a href="https://invalid.example">Invalid</a>
    <a href="https://lead1.com.br">Lead 1</a>
    <a href="https://lead2.com.br">Lead 2</a>
    <a href="https://lead3.com.br">Lead 3</a>
  `;
  const siteHtml = (name, email) => `<html><head><title>${name} Tecnologia</title><meta name="description" content="Empresa ativa de tecnologia com site oficial"></head><body>Empresa ativa de tecnologia em Sao Paulo contato ${email} (11) 99999-0000 Conteudo comercial suficiente para validar este site oficial com mais informacoes sobre servicos, atendimento, endereco e orcamento. Temos paginas institucionais, apresentacao de servicos, prova social, canais de contato, formulario comercial, endereco, telefone, whatsapp e informacoes sobre atendimento na regiao pesquisada pelo usuario. Este texto simula uma pagina real acessivel e qualificada para captura de lead.</body></html>`;
  const fetchImpl = async (url) => {
    if (String(url).includes('bing.com') || String(url).includes('google.com')) return htmlResponse(searchHtml);
    if (String(url).includes('invalid.example')) return { ok: false, status: 404, headers: { get: () => 'text/html' }, text: async () => '' };
    if (String(url).includes('lead1.com.br')) return htmlResponse(siteHtml('Lead 1', 'contato@lead1.com.br'));
    if (String(url).includes('lead2.com.br')) return htmlResponse(siteHtml('Lead 2', 'contato@lead2.com.br'));
    if (String(url).includes('lead3.com.br')) return htmlResponse(siteHtml('Lead 3', 'contato@lead3.com.br'));
    return { ok: false, status: 500, headers: { get: () => '' }, text: async () => '' };
  };

  const leads = await captureLeads({
    niche: 'tecnologia',
    location: 'Sao Paulo',
    quantity: 2,
    contactRequirements: { email: true, phone: false, whatsapp: false, website: true },
  }, { fetchImpl });

  assert.equal(leads.length, 2);
  assert.ok(leads.every(lead => lead.website && lead.email && lead.isValid && lead.status === 'qualified'));
  assert.ok(leads.every(lead => lead.websiteValidation?.isFunctional === true));
});

test('uses contact subpages before qualifying a lead', async () => {
  const searchHtml = '<a href="https://lead-contato.com.br">Lead Contato</a>';
  const homeHtml = `<html><head><title>Lead Contato</title></head><body>
    Clinica ativa em Sao Paulo com pagina inicial acessivel e conteudo suficiente para validacao comercial.
    Temos servicos, segmentos, apresentacao institucional, portfolio, clientes, formulario e uma pagina de contato.
    <a href="/contato">Fale conosco</a>
    Texto adicional para passar o minimo de tamanho esperado na validacao do site oficial, mantendo sinais reais de negocio, atendimento local, endereco, telefone, equipe e oferta comercial para empresas interessadas em melhorar presenca digital.
  </body></html>`;
  const contactHtml = `<html><body>Contato: comercial@lead-contato.com.br WhatsApp (11) 99999-0000</body></html>`;
  const fetchImpl = async (url) => {
    if (String(url).includes('bing.com') || String(url).includes('google.com') || String(url).includes('duckduckgo.com')) {
      return htmlResponse(searchHtml);
    }
    if (String(url).endsWith('/contato')) return htmlResponse(contactHtml);
    if (String(url).includes('lead-contato.com.br')) return htmlResponse(homeHtml);
    return { ok: false, status: 404, headers: { get: () => 'text/html' }, text: async () => '' };
  };

  const leads = await captureLeads({
    niche: 'clinica',
    location: 'Sao Paulo',
    quantity: 1,
    contactRequirements: { email: true, phone: false, whatsapp: false, website: true },
  }, { fetchImpl });

  assert.equal(leads.length, 1);
  assert.equal(leads[0].email, 'comercial@lead-contato.com.br');
});
