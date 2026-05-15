import { buildSearchQueries, collectSearchCandidates } from './leadCaptureEngine.js';

const NICHE_EXPANSIONS = {
  contabilidade: ['contador', 'escritorio contabil', 'assessoria contabil', 'consultoria contabil'],
  restaurantes: ['restaurante', 'churrascaria', 'pizzaria', 'bar restaurante', 'delivery restaurante'],
  academias: ['academia', 'crossfit', 'pilates', 'treinamento funcional'],
  nutricionistas: ['nutricionista', 'clinica nutricional', 'nutricao esportiva'],
  dentistas: ['dentista', 'odontologia', 'clinica odontologica', 'consultorio odontologico', 'ortodontista', 'implantes dentarios'],
  odontologia: ['dentista', 'odontologia', 'clinica odontologica', 'consultorio odontologico', 'ortodontista', 'implantes dentarios'],
  consultorias: ['consultoria empresarial', 'consultoria de negocios', 'assessoria empresarial'],
  engenharias: ['engenharia', 'engenheiro', 'construtora', 'arquitetura', 'projetos engenharia', 'consultoria engenharia'],
};

const OSM_TAGS = {
  restaurantes: [
    ['amenity', 'restaurant|cafe|bar|fast_food|pub'],
  ],
  academias: [
    ['leisure', 'fitness_centre|sports_centre'],
    ['sport', 'fitness|crossfit|pilates'],
  ],
  contabilidade: [
    ['office', 'accountant|tax_advisor|company'],
    ['craft', 'accountant'],
  ],
  consultorias: [
    ['office', 'consulting|company|it'],
  ],
  engenharias: [
    ['office', 'engineer|architect|surveyor|company'],
    ['craft', 'builder|electrician|plumber|carpenter'],
  ],
  nutricionistas: [
    ['healthcare', 'nutritionist|dietitian'],
    ['office', 'nutritionist'],
  ],
  dentistas: [
    ['amenity', 'dentist'],
    ['healthcare', 'dentist|clinic'],
    ['office', 'dentist'],
  ],
  odontologia: [
    ['amenity', 'dentist'],
    ['healthcare', 'dentist|clinic'],
    ['office', 'dentist'],
  ],
};

const normalize = (value = '') => String(value)
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .trim();

const getNicheTerms = (niche = '') => {
  const normalized = normalize(niche);
  const configured = Object.entries(NICHE_EXPANSIONS)
    .find(([key, terms]) => [key, ...terms].map(normalize)
      .some(term => normalized.includes(term) || term.includes(normalized)))?.[1];
  return [...new Set([niche, ...(configured || [])].filter(Boolean))];
};

const getNicheKey = (niche = '') => {
  const normalized = normalize(niche);
  return Object.keys(OSM_TAGS).find((key) => {
    const keyTerms = [key, ...(NICHE_EXPANSIONS[key] || [])].map(normalize);
    return keyTerms.some(term => normalized.includes(term) || term.includes(normalized));
  });
};

const getLocationTerms = (location = '') => {
  const city = String(location).split(',')[0]?.trim();
  const state = String(location).split(',').pop()?.trim();
  return [...new Set([location, city, state].filter(term => term && term.length > 1))];
};

export const buildExpandedSearchQueries = ({ niche, location }, targetCount = 300) => {
  const queries = new Set(buildSearchQueries({ niche, location }));
  const nicheTerms = getNicheTerms(niche);
  const locationTerms = getLocationTerms(location);
  const suffixes = [
    'site oficial',
    'contato email telefone',
    'whatsapp contato',
    'fale conosco',
    'empresa',
    'site:.com.br',
    'portfolio contato',
    'projetos contato',
    'servicos contato',
  ];

  for (const nicheTerm of nicheTerms) {
    for (const locationTerm of locationTerms) {
      for (const suffix of suffixes) {
        queries.add(`${nicheTerm} ${locationTerm} ${suffix}`);
      }
    }
  }

  return [...queries].slice(0, Math.max(12, Math.min(targetCount, 240)));
};

export const collectExpandedCandidates = async (config, options = {}) => {
  const {
    fetchImpl = fetch,
    targetCount = 500,
  } = options;
  const queries = buildExpandedSearchQueries(config, targetCount);
  const [searchCandidates, osmCandidates] = await Promise.all([
    collectSearchCandidates(queries, fetchImpl, targetCount),
    collectOpenStreetMapCandidates(config, { fetchImpl, targetCount }),
  ]);

  const seen = new Set();
  return [...osmCandidates, ...searchCandidates].filter(candidate => {
    const key = String(candidate.website || '').toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '');
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, targetCount);
};

const getWebsiteFromTags = (tags = {}) =>
  tags.website || tags['contact:website'] || tags.url || tags['contact:url'] || '';

const getPhoneFromTags = (tags = {}) =>
  tags.phone || tags['contact:phone'] || tags.mobile || tags['contact:mobile'] || '';

const getEmailFromTags = (tags = {}) =>
  tags.email || tags['contact:email'] || '';

const buildAddress = (tags = {}) => [
  tags['addr:street'],
  tags['addr:housenumber'],
  tags['addr:suburb'],
  tags['addr:city'],
  tags['addr:state'],
].filter(Boolean).join(', ');

const buildOverpassQuery = (tags, bbox, limit) => {
  const [south, north, west, east] = bbox;
  const selectors = tags.flatMap(([key, pattern]) => [
    `node["${key}"~"${pattern}",i](${south},${west},${north},${east});`,
    `way["${key}"~"${pattern}",i](${south},${west},${north},${east});`,
    `relation["${key}"~"${pattern}",i](${south},${west},${north},${east});`,
  ]).join('');

  return `[out:json][timeout:25];(${selectors});out tags center ${limit};`;
};

export const collectOpenStreetMapCandidates = async (config, options = {}) => {
  const { fetchImpl = fetch, targetCount = 500 } = options;
  const nicheKey = getNicheKey(config.niche);
  if (!nicheKey) return [];

  const city = String(config.location || '').split(',')[0]?.trim() || config.location;
  if (!city) return [];

  try {
    const geocodeUrl = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br&q=${encodeURIComponent(config.location || city)}`;
    const geocodeResponse = await fetchImpl(geocodeUrl, {
      headers: {
        'user-agent': 'KentaurosLeadCapture/1.0',
        'accept-language': 'pt-BR,pt;q=0.9,en;q=0.7',
      },
    });
    if (!geocodeResponse?.ok) return [];
    const places = await geocodeResponse.json();
    const bbox = places?.[0]?.boundingbox;
    if (!bbox || bbox.length !== 4) return [];

    const overpassQuery = buildOverpassQuery(OSM_TAGS[nicheKey], bbox, Math.min(targetCount, 500));
    const overpassResponse = await fetchImpl('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded;charset=UTF-8',
        'user-agent': 'KentaurosLeadCapture/1.0',
      },
      body: `data=${encodeURIComponent(overpassQuery)}`,
    });
    if (!overpassResponse?.ok) return [];
    const data = await overpassResponse.json();

    return (data.elements || [])
      .map(element => {
        const tags = element.tags || {};
        const website = getWebsiteFromTags(tags);
        return {
          name: tags.name || tags.brand || '',
          website,
          email: getEmailFromTags(tags) || null,
          phone: getPhoneFromTags(tags) || null,
          mapsAddress: buildAddress(tags),
          description: tags.description || tags.cuisine || tags.office || tags.amenity || '',
          source: 'OpenStreetMap',
          providerMetadata: { osmId: `${element.type}/${element.id}` },
        };
      })
      .filter(candidate => candidate.name && candidate.website)
      .slice(0, targetCount);
  } catch (error) {
    console.warn('[CaptureExpansion] OpenStreetMap falhou:', error.message);
    return [];
  }
};
