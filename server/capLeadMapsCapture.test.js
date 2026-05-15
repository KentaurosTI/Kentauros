import test from 'node:test';
import assert from 'node:assert/strict';

import {
  cleanOfficialUrl,
  extractContactsFromText,
  getLocationSearchTerms,
  getNichoInfo,
  getRegionCoords,
  categorizeLead,
  isBlacklisted,
  isBrazilWhatsappPhone,
  isRelevantPlace,
  meetsContactRequirements,
  normalizePhoneDigits,
} from './capLeadMapsCapture.js';

test('maps broad and plural niches to specific Google Maps searches', () => {
  const dentistry = getNichoInfo('dentistas');
  assert.ok(dentistry.searches.includes('clinica odontologica'));
  assert.ok(dentistry.filters.includes('odont'));

  const realEstate = getNichoInfo('imobiliarias');
  assert.ok(realEstate.searches.includes('agencia imobiliaria'));
  assert.ok(realEstate.filters.includes('imobil'));

  const aesthetics = getNichoInfo('estéticas');
  assert.ok(aesthetics.searches.includes('harmonizacao facial'));
  assert.ok(aesthetics.searches.includes('depilacao a laser'));
});

test('uses original term with professional and company fallbacks for unknown niches', () => {
  const custom = getNichoInfo('terapia ocupacional');

  assert.deepEqual(custom.searches, [
    'terapia ocupacional',
    'terapia ocupacional profissional',
    'terapia ocupacional empresa',
  ]);
  assert.ok(custom.filters.includes('terapia'));
  assert.ok(custom.filters.includes('ocupacional'));
});

test('categorizes leads from title and description keywords', () => {
  assert.equal(categorizeLead({
    titulo: 'Lopes Imobiliaria Santos',
    description: 'corretor de imoveis e aluguel',
  }), 'Imobiliaria');

  assert.equal(categorizeLead({
    title: 'Moura Advocacia Empresarial',
    category: 'Escritorio juridico',
  }), 'Advocacia');

  assert.equal(categorizeLead({
    name: 'Bella Derma',
    description: 'clinica de estetica avancada',
  }), 'Estetica');
});

test('resolves Brazilian state coordinates from a location string', () => {
  assert.deepEqual(getRegionCoords('Brasilia, DF'), { latitude: -15.779, longitude: -47.929 });
  assert.deepEqual(getRegionCoords('Sao Paulo, SP'), { latitude: -23.550, longitude: -46.633 });
});

test('expands local searches to nearby business regions', () => {
  const locations = getLocationSearchTerms('Santos, SP');
  assert.ok(locations.includes('São Vicente, SP'));
  assert.ok(locations.includes('Baixada Santista, SP'));
});

test('normalizes phones and detects Brazilian WhatsApp mobile numbers', () => {
  assert.equal(normalizePhoneDigits('+55 (11) 98888-7777'), '11988887777');
  assert.equal(isBrazilWhatsappPhone('(11) 98888-7777'), true);
  assert.equal(isBrazilWhatsappPhone('(11) 3333-4444'), false);
});

test('extracts emails, phones, and WhatsApp links from website text', () => {
  const contacts = extractContactsFromText(`
    Atendimento: contato@empresa.com.br
    Telefone (11) 3333-4444
    WhatsApp https://wa.me/5511988887777
  `);

  assert.equal(contacts.emails[0], 'contato@empresa.com.br');
  assert.ok(contacts.phones.includes('1133334444'));
  assert.ok(contacts.whatsappPhones.includes('11988887777'));
});

test('checks selected contact requirements before accepting Maps candidates', () => {
  const contacts = {
    emails: ['contato@empresa.com.br'],
    phones: ['1133334444'],
    whatsappPhones: [],
  };

  assert.equal(meetsContactRequirements({ telefone: '(11) 98888-7777' }, contacts, {
    email: true,
    whatsapp: true,
    website: true,
  }), true);
  assert.equal(meetsContactRequirements({ telefone: '(11) 3333-4444' }, contacts, {
    email: true,
    whatsapp: true,
    website: true,
  }), false);
  assert.equal(meetsContactRequirements({ telefone: '(11) 3333-4444' }, contacts, {
    email: true,
    phone: true,
    website: true,
  }), true);
});

test('cleans official urls and blocks directories or content portals', () => {
  assert.equal(cleanOfficialUrl('https://www.empresa.com.br/contato?utm_source=x'), 'https://empresa.com.br');
  assert.equal(cleanOfficialUrl('https://instagram.com/empresa'), null);
  assert.equal(isBlacklisted('https://guiamais.com.br/empresa'), true);
});

test('validates Google Maps place relevance by niche filters', () => {
  const nichoInfo = getNichoInfo('engenharias');
  assert.equal(isRelevantPlace({
    titulo: 'ABC Engenharia Ambiental',
    categoria: 'Empresa de engenharia',
    localizacao: 'Belo Horizonte, MG',
  }, nichoInfo), true);

  assert.equal(isRelevantPlace({
    titulo: 'Spotify Playlist',
    categoria: 'Portal de noticias',
    localizacao: 'Belo Horizonte, MG',
  }, nichoInfo), false);
});
