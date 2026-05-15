const NICHE_MAP = {
  saude: {
    theme: 'saude',
    searches: ['clinica medica particular', 'consultorio medico privado', 'centro medico'],
    filters: ['clinic', 'consultor', 'medic', 'saude', 'especialist', 'hospital'],
  },
  clinica: {
    theme: 'saude',
    searches: ['clinica medica', 'clinica particular', 'clinica especializada'],
    filters: ['clinic', 'consultor', 'medic', 'especialist', 'tratamento'],
  },
  odontologia: {
    theme: 'saude',
    searches: ['clinica odontologica', 'dentista particular', 'consultorio odontologico'],
    filters: ['dent', 'odont', 'bucal', 'sorriso', 'clinic'],
  },
  dentista: {
    theme: 'saude',
    searches: ['dentista', 'clinica odontologica', 'consultorio dentario'],
    filters: ['dent', 'odont', 'bucal', 'clinic'],
  },
  dentistas: {
    theme: 'saude',
    searches: ['dentista', 'clinica odontologica', 'consultorio dentario'],
    filters: ['dent', 'odont', 'bucal', 'clinic'],
  },
  advocacia: {
    theme: 'juridico',
    searches: ['escritorio de advocacia', 'advogado especialista', 'consultoria juridica'],
    filters: ['advog', 'juridic', 'direito', 'advocaci', 'associ'],
  },
  juridico: {
    theme: 'juridico',
    searches: ['escritorio de advocacia', 'consultoria juridica', 'advogado especialista'],
    filters: ['advog', 'juridic', 'direito', 'advocaci', 'associ'],
  },
  consultorias: {
    theme: 'consultoria',
    searches: ['consultoria empresarial', 'consultoria de negocios', 'assessoria empresarial'],
    filters: ['consult', 'assessori', 'empresa', 'negocio'],
  },
  contabilidade: {
    theme: 'contabil',
    searches: ['escritorio de contabilidade', 'contador', 'contabilidade empresarial'],
    filters: ['contab', 'contador', 'fiscal', 'tribut', 'mei'],
  },
  contador: {
    theme: 'contabil',
    searches: ['contador', 'escritorio contabil', 'servicos contabeis'],
    filters: ['contab', 'contador', 'fiscal'],
  },
  engenharia: {
    theme: 'tecnico',
    searches: ['escritorio de engenharia', 'engenheiro especialista', 'projetos de engenharia'],
    filters: ['engenh', 'projeto', 'tecnic', 'constru'],
  },
  engenharias: {
    theme: 'tecnico',
    searches: ['escritorio de engenharia', 'engenheiro especialista', 'projetos de engenharia'],
    filters: ['engenh', 'projeto', 'tecnic', 'constru'],
  },
  arquitetura: {
    theme: 'tecnico',
    searches: ['escritorio de arquitetura', 'arquiteto', 'design de interiores'],
    filters: ['arquitet', 'projeto', 'design', 'interior'],
  },
  construtoras: {
    theme: 'construcao',
    searches: ['construtora', 'empresa de construcao civil', 'empreiteira'],
    filters: ['constru', 'engenh', 'obra', 'empreend'],
  },
  imoveis: {
    theme: 'imoveis',
    searches: ['imobiliaria', 'corretor de imoveis', 'agencia imobiliaria'],
    filters: ['imobil', 'imoveis', 'corretor', 'aluguel'],
  },
  imobiliaria: {
    theme: 'imoveis',
    searches: ['imobiliaria', 'agencia imobiliaria', 'corretor de imoveis'],
    filters: ['imobil', 'imoveis', 'corretor'],
  },
  imobiliarias: {
    theme: 'imoveis',
    searches: ['imobiliaria', 'agencia imobiliaria', 'corretor de imoveis'],
    filters: ['imobil', 'imoveis', 'corretor'],
  },
  marcenarias: {
    theme: 'moveis',
    searches: ['marcenaria', 'moveis planejados', 'moveis sob medida'],
    filters: ['marcen', 'moveis', 'planejad', 'madeira'],
  },
  moveis: {
    theme: 'moveis',
    searches: ['moveis planejados', 'marcenaria', 'moveis sob medida'],
    filters: ['marcen', 'moveis', 'planejad', 'madeira'],
  },
  restaurante: {
    theme: 'gastronomia',
    searches: ['restaurante', 'bistro', 'culinaria'],
    filters: ['restaur', 'gastron', 'comida', 'culin', 'cardapio'],
  },
  restaurantes: {
    theme: 'gastronomia',
    searches: ['restaurante', 'bistro', 'culinaria'],
    filters: ['restaur', 'gastron', 'comida', 'culin', 'cardapio'],
  },
  hamburguerias: {
    theme: 'gastronomia',
    searches: ['hamburgueria', 'hamburger artesanal', 'burger restaurant'],
    filters: ['hambur', 'burger', 'lanch', 'restaur'],
  },
  pizzarias: {
    theme: 'gastronomia',
    searches: ['pizzaria', 'pizza delivery', 'pizzaria artesanal'],
    filters: ['pizz', 'restaur', 'delivery'],
  },
  cafeterias: {
    theme: 'gastronomia',
    searches: ['cafeteria', 'cafe especial', 'padaria artesanal'],
    filters: ['cafe', 'cafeter', 'padari', 'confeit'],
  },
  academia: {
    theme: 'fitness',
    searches: ['academia de ginastica', 'crossfit', 'centro fitness'],
    filters: ['academi', 'crossfit', 'fitness', 'treino', 'sport'],
  },
  academias: {
    theme: 'fitness',
    searches: ['academia de ginastica', 'crossfit', 'centro fitness'],
    filters: ['academi', 'crossfit', 'fitness', 'treino', 'sport'],
  },
  crossfit: {
    theme: 'fitness',
    searches: ['crossfit', 'box crossfit', 'treinamento funcional'],
    filters: ['crossfit', 'box', 'funcional', 'treino'],
  },
  personal: {
    theme: 'fitness',
    searches: ['personal trainer', 'treinamento personalizado', 'studio personal'],
    filters: ['personal', 'trainer', 'treino', 'fitness'],
  },
  psicologos: {
    theme: 'saude',
    searches: ['psicologo', 'clinica de psicologia', 'consultorio psicologico'],
    filters: ['psic', 'terapi', 'clinic', 'mental'],
  },
  veterinarias: {
    theme: 'saude',
    searches: ['clinica veterinaria', 'veterinario', 'hospital veterinario'],
    filters: ['veterin', 'pet', 'animal', 'clinic'],
  },
  nutricionistas: {
    theme: 'saude',
    searches: ['nutricionista', 'consultorio nutricional', 'clinica de nutricao'],
    filters: ['nutri', 'dieta', 'aliment', 'consulta'],
  },
  saloes: {
    theme: 'beleza',
    searches: ['salao de beleza', 'hair studio', 'cabeleireiro'],
    filters: ['salao', 'beleza', 'cabelo', 'hair'],
  },
  barbearias: {
    theme: 'beleza',
    searches: ['barbearia', 'barber shop', 'barbearia masculina'],
    filters: ['barber', 'barbear', 'cabelo'],
  },
  esteticas: {
    theme: 'beleza',
    searches: [
      'clinica de estetica',
      'estetica avancada',
      'spa estetico',
      'harmonizacao facial',
      'depilacao a laser',
      'clinica de beleza',
      'procedimentos esteticos',
      'esteticista',
    ],
    filters: ['estetic', 'beleza', 'spa', 'skin', 'harmoniz', 'depil', 'derma'],
  },
  farmacias: {
    theme: 'varejo',
    searches: ['farmacia', 'drogaria', 'farmacia de manipulacao'],
    filters: ['farmac', 'drogaria', 'medicamento'],
  },
  supermercados: {
    theme: 'varejo',
    searches: ['supermercado', 'mercado', 'atacado'],
    filters: ['supermerc', 'mercado', 'atacad'],
  },
  oticas: {
    theme: 'varejo',
    searches: ['otica', 'oculos e lentes', 'otica especializada'],
    filters: ['otica', 'oculos', 'lente', 'visao'],
  },
  oficina: {
    theme: 'auto',
    searches: ['oficina mecanica', 'auto center', 'mecanica automotiva'],
    filters: ['oficin', 'mecan', 'auto', 'carro', 'veicul'],
  },
  concessionarias: {
    theme: 'auto',
    searches: ['concessionaria de carros', 'venda de veiculos', 'auto shopping'],
    filters: ['concession', 'veicul', 'carro', 'auto'],
  },
  tecnologia: {
    theme: 'tech',
    searches: ['empresa de tecnologia', 'software house', 'desenvolvimento de sistemas'],
    filters: ['tecnolog', 'software', 'sistema', 'develop', 'digital', 'solucoes'],
  },
  marketing: {
    theme: 'tech',
    searches: ['agencia de marketing digital', 'marketing digital', 'agencia criativa'],
    filters: ['marketing', 'agenci', 'digital', 'propaganda', 'media'],
  },
  escolas: {
    theme: 'educacao',
    searches: ['escola particular', 'colegio', 'centro educacional'],
    filters: ['escol', 'colegi', 'educ', 'ensino'],
  },
  cursos: {
    theme: 'educacao',
    searches: ['escola de cursos', 'curso profissionalizante', 'treinamento profissional'],
    filters: ['curso', 'escol', 'treinamento', 'capacit'],
  },
  hoteis: {
    theme: 'turismo',
    searches: ['hotel', 'hospedagem', 'hotel executivo'],
    filters: ['hotel', 'hosped', 'pousad'],
  },
  pousadas: {
    theme: 'turismo',
    searches: ['pousada', 'hospedagem', 'pousada familiar'],
    filters: ['pousad', 'hosped', 'hotel'],
  },
  eventos: {
    theme: 'eventos',
    searches: ['empresa de eventos', 'buffet para eventos', 'cerimonial'],
    filters: ['evento', 'buffet', 'cerimonial', 'festa'],
  },
  seguradoras: {
    theme: 'servicos',
    searches: ['seguradora', 'corretora de seguros', 'seguro empresarial'],
    filters: ['segur', 'corretor', 'apolice'],
  },
  transportadoras: {
    theme: 'logistica',
    searches: ['transportadora', 'empresa de transporte', 'transporte de cargas'],
    filters: ['transport', 'frete', 'carga', 'logist'],
  },
  logistica: {
    theme: 'logistica',
    searches: ['empresa de logistica', 'transportadora', 'distribuicao logistica'],
    filters: ['logist', 'transport', 'frete', 'distribu'],
  },
  solar: {
    theme: 'servicos',
    searches: ['energia solar', 'instalacao de energia solar', 'painel fotovoltaico'],
    filters: ['solar', 'fotovolta', 'energia', 'painel'],
  },
};

const BLACKLIST = [
  'google.com', 'bing.com', 'facebook.com', 'instagram.com', 'linkedin.com',
  'youtube.com', 'twitter.com', 'x.com', 'tiktok.com', 'pinterest.com',
  'encontrabrasil.com', 'guiamais.com', 'telelistas.net', 'apontador.com.br',
  'doctoralia.com.br', 'boaconsulta.com', 'viva-real', 'zapimoveis', 'webmotors',
  'mercadolivre.com', 'olx.com', 'reclameaqui.com', 'g1.globo.com', 'wikipedia.org',
  'jusbrasil.com.br', 'yellowpages', 'paginas-amarelas', 'infobel.com',
  'habitissimo.com.br', 'getninjas.com.br', 'tripadvisor.com', 'guiadasemana.com.br',
  'veja.abril.com.br', 'exame.com', 'estadao.com.br', 'folha.uol.com.br',
  'infomoney.com.br', 'valor.globo.com', 'catracalivre.com.br', 'uol.com.br',
  'terra.com.br', 'ig.com.br', 'r7.com', 'gazetadopovo.com.br', 'metropoles.com',
  'cnnbrasil.com.br', 'bbc.com', 'elpais.com', 'noticias', 'portal', 'blog',
  'agenda', 'evento', 'guia', 'directory', 'listagem', 'ranking', 'melhores',
];

const STATE_COORDS = {
  AC: { latitude: -9.974, longitude: -67.807 },
  AL: { latitude: -9.665, longitude: -35.735 },
  AP: { latitude: 0.034, longitude: -51.066 },
  AM: { latitude: -3.118, longitude: -60.021 },
  BA: { latitude: -12.971, longitude: -38.510 },
  CE: { latitude: -3.717, longitude: -38.543 },
  DF: { latitude: -15.779, longitude: -47.929 },
  ES: { latitude: -20.315, longitude: -40.312 },
  GO: { latitude: -16.686, longitude: -49.264 },
  MA: { latitude: -2.530, longitude: -44.302 },
  MT: { latitude: -15.601, longitude: -56.097 },
  MS: { latitude: -20.442, longitude: -54.646 },
  MG: { latitude: -19.921, longitude: -43.937 },
  PA: { latitude: -1.455, longitude: -48.490 },
  PB: { latitude: -7.115, longitude: -34.863 },
  PR: { latitude: -25.429, longitude: -49.267 },
  PE: { latitude: -8.054, longitude: -34.881 },
  PI: { latitude: -5.091, longitude: -42.803 },
  RJ: { latitude: -22.906, longitude: -43.172 },
  RN: { latitude: -5.795, longitude: -35.209 },
  RS: { latitude: -30.034, longitude: -51.217 },
  RO: { latitude: -8.761, longitude: -63.903 },
  RR: { latitude: 2.823, longitude: -60.675 },
  SC: { latitude: -27.594, longitude: -48.542 },
  SP: { latitude: -23.550, longitude: -46.633 },
  SE: { latitude: -10.911, longitude: -37.071 },
  TO: { latitude: -10.167, longitude: -48.327 },
};

const CATEGORY_RULES = [
  { category: 'Imobiliaria', keywords: ['imobil', 'imoveis', 'corretor', 'aluguel', 'empreendimento'] },
  { category: 'Advocacia', keywords: ['advog', 'juridic', 'direito', 'advocaci', 'escritorio juridico'] },
  { category: 'Estetica', keywords: ['estetic', 'beleza', 'spa', 'derma', 'harmoniz', 'depil', 'skin'] },
  { category: 'Saude', keywords: ['clinic', 'medic', 'hospital', 'saude', 'odont', 'dent', 'psic', 'nutri'] },
  { category: 'Contabilidade', keywords: ['contab', 'contador', 'fiscal', 'tribut'] },
  { category: 'Tecnologia', keywords: ['tecnolog', 'software', 'sistema', 'digital', 'desenvolvimento'] },
  { category: 'Marketing', keywords: ['marketing', 'agenci', 'publicidade', 'propaganda'] },
  { category: 'Gastronomia', keywords: ['restaur', 'pizz', 'burger', 'hambur', 'cafe', 'gastron'] },
  { category: 'Fitness', keywords: ['academi', 'crossfit', 'fitness', 'treino', 'personal'] },
  { category: 'Educacao', keywords: ['escol', 'colegi', 'curso', 'ensino', 'educ'] },
  { category: 'Automotivo', keywords: ['oficin', 'mecan', 'concession', 'auto', 'veicul'] },
  { category: 'Construcao', keywords: ['constru', 'engenh', 'arquitet', 'obra', 'marcen'] },
];

const LOCATION_EXPANSIONS = {
  santos: ['Santos, SP', 'São Vicente, SP', 'Praia Grande, SP', 'Guarujá, SP', 'Cubatão, SP', 'Baixada Santista, SP'],
  'sao paulo': ['São Paulo, SP', 'Guarulhos, SP', 'Osasco, SP', 'Santo André, SP', 'São Bernardo do Campo, SP'],
  'rio de janeiro': ['Rio de Janeiro, RJ', 'Niterói, RJ', 'Duque de Caxias, RJ', 'Nova Iguaçu, RJ'],
  brasilia: ['Brasília, DF', 'Águas Claras, DF', 'Taguatinga, DF', 'Guará, DF', 'Ceilândia, DF'],
  goiania: ['Goiânia, GO', 'Aparecida de Goiânia, GO', 'Senador Canedo, GO', 'Trindade, GO'],
  'belo horizonte': ['Belo Horizonte, MG', 'Contagem, MG', 'Betim, MG', 'Nova Lima, MG'],
};

export const normalizeText = (value = '') => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/\s+/g, ' ')
  .trim()
  .toLowerCase();

export const getNichoInfo = (niche = '') => {
  const normalized = normalizeText(niche);
  const entry = Object.entries(NICHE_MAP).find(([key, value]) => {
    const terms = [key, ...(value.searches || [])].map(normalizeText);
    return terms.some(term => normalized.includes(term) || term.includes(normalized));
  });

  if (entry) return entry[1];
  const original = String(niche || '').trim();
  const fallbackSearches = original
    ? [original, `${original} profissional`, `${original} empresa`]
    : [];
  return {
    theme: normalized || 'geral',
    searches: fallbackSearches,
    filters: normalizeText(niche).split(/[^a-z0-9]+/).filter(token => token.length > 3),
  };
};

export const categorizeLead = (lead = {}) => {
  const haystack = normalizeText([
    lead.titulo,
    lead.title,
    lead.name,
    lead.company,
    lead.categoria,
    lead.category,
    lead.description,
    lead.bodyText,
  ].filter(Boolean).join(' '));

  return CATEGORY_RULES.find(rule =>
    rule.keywords.some(keyword => haystack.includes(normalizeText(keyword)))
  )?.category || 'Geral';
};

export const getRegionCoords = (location = '') => {
  const normalized = normalizeText(location).toUpperCase();
  const state = String(location || '').split(',').pop()?.trim().toUpperCase();
  return STATE_COORDS[state] || STATE_COORDS[normalized] || null;
};

export const getLocationSearchTerms = (location = '') => {
  const city = normalizeText(String(location || '').split(',')[0] || location);
  const configured = LOCATION_EXPANSIONS[city];
  return [...new Set([location, ...(configured || [])].filter(Boolean))];
};

export const cleanOfficialUrl = (rawUrl = '') => {
  try {
    const parsed = new URL(String(rawUrl).startsWith('http') ? rawUrl : `https://${rawUrl}`);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
    if (!host.includes('.') || BLACKLIST.some(item => host.includes(item))) return null;
    return `${parsed.protocol}//${host}`.toLowerCase();
  } catch {
    return null;
  }
};

export const isBlacklisted = (url = '') => {
  const normalized = String(url || '').toLowerCase();
  return BLACKLIST.some(item => normalized.includes(item));
};

export const normalizePhoneDigits = (value = '') => {
  let digits = String(value || '').replace(/\D/g, '');
  if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) digits = digits.slice(2);
  return digits;
};

export const isBrazilWhatsappPhone = (value = '') =>
  /^\d{2}9\d{8}$/.test(normalizePhoneDigits(value));

export const meetsContactRequirements = (place = {}, contacts = {}, requirements = {}) => {
  const phone = place.telefone || contacts.phones?.[0];
  const whatsapp = contacts.whatsappPhones?.[0] || (isBrazilWhatsappPhone(place.telefone) ? normalizePhoneDigits(place.telefone) : null);
  if (requirements.email && !contacts.emails?.length) return false;
  if (requirements.phone && !phone) return false;
  if (requirements.whatsapp && !whatsapp) return false;
  return true;
};

export const extractContactsFromText = (text = '') => {
  const searchable = String(text || '');
  const emails = [...new Set(searchable.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi) || [])]
    .map(email => email.trim().replace(/^mailto:/i, '').split('?')[0].toLowerCase())
    .filter(email => !/\.(png|jpe?g|webp|gif|svg)$/i.test(email));
  const phones = [...new Set([
    ...(searchable.match(/(?:\+?55\s?)?(?:\(?\d{2}\)?\s?)?(?:9\d{4}[-\s]?\d{4}|\d{4}[-\s]?\d{4})/g) || []),
    ...(searchable.match(/(?:\+?55)?\d{10,11}/g) || []),
  ].map(normalizePhoneDigits).filter(phone => phone.length >= 10 && phone.length <= 11))];

  const whatsappPhones = [];
  [
    /(?:https?:\/\/)?(?:www\.)?wa\.me\/(?:55)?(\d{10,11})/gi,
    /(?:https?:\/\/)?(?:api\.|web\.)?whatsapp\.com\/send\?[^"'<>]*?phone=(?:55)?(\d{10,11})/gi,
    /whatsapp:\/\/send\?[^"'<>]*?phone=(?:55)?(\d{10,11})/gi,
  ].forEach((regex) => {
    let match;
    while ((match = regex.exec(searchable)) !== null) {
      whatsappPhones.push(normalizePhoneDigits(match[1]));
    }
  });

  return {
    emails,
    phones,
    whatsappPhones: [...new Set([...whatsappPhones, ...phones.filter(isBrazilWhatsappPhone)])],
  };
};

export const isRelevantPlace = (place = {}, nichoInfo = {}) => {
  const filters = nichoInfo.filters || [];
  if (!filters.length) return true;
  const haystack = normalizeText([
    place.titulo,
    place.categoria,
    place.localizacao,
    place.site_oficial,
  ].filter(Boolean).join(' '));
  return filters.some(filter => haystack.includes(normalizeText(filter)));
};

const loadPuppeteer = async () => {
  try {
    const module = await import('puppeteer');
    return module.default || module;
  } catch {
    const module = await import('file:///C:/Users/mathe/Documents/CapLead/node_modules/puppeteer/lib/esm/puppeteer/puppeteer.js');
    return module.default || module;
  }
};

const collectSignalsFromPage = async (page) => {
  const signal = await page.evaluate(() => {
    const visibleText = document.body ? document.body.innerText : '';
    const html = document.body ? document.body.innerHTML : '';
    const linkSignals = Array.from(document.querySelectorAll('a[href], button, [onclick], [aria-label], [title], [data-href], [data-url]'))
      .map(el => [
        el.innerText,
        el.getAttribute('href'),
        el.getAttribute('onclick'),
        el.getAttribute('aria-label'),
        el.getAttribute('title'),
        el.getAttribute('data-href'),
        el.getAttribute('data-url'),
      ].filter(Boolean).join(' '))
      .join('\n');
    return `${visibleText}\n${html}\n${linkSignals}`;
  });
  return extractContactsFromText(signal);
};

const extractCandidateContacts = async (browser, place, officialUrl) => {
  const baseContacts = extractContactsFromText([
    place.telefone,
    place.site_oficial,
    place.maps_url,
  ].filter(Boolean).join('\n'));
  if (!officialUrl) return { ...baseContacts, siteReachable: false };

  const page = await browser.newPage();
  try {
    await page.setViewport({ width: 1280, height: 720 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36');
    await page.goto(officialUrl, { waitUntil: 'domcontentloaded', timeout: 9000 });
    await new Promise(resolve => setTimeout(resolve, 300));
    const homeContacts = await collectSignalsFromPage(page);

    let merged = {
      emails: [...new Set([...baseContacts.emails, ...homeContacts.emails])],
      phones: [...new Set([...baseContacts.phones, ...homeContacts.phones])],
      whatsappPhones: [...new Set([...baseContacts.whatsappPhones, ...homeContacts.whatsappPhones])],
    };

    if (!merged.emails.length || !merged.whatsappPhones.length) {
      const contactUrl = await page.evaluate(() => {
        const keywords = ['contato', 'contact', 'fale conosco', 'sobre', 'quem somos', 'atendimento', 'whatsapp', 'email'];
        const links = Array.from(document.querySelectorAll('a[href]'));
        const found = links.find((el) => {
          const text = `${el.innerText || ''} ${el.getAttribute('aria-label') || ''} ${el.getAttribute('title') || ''}`.toLowerCase();
          const href = String(el.href || el.getAttribute('href') || '').toLowerCase();
          return keywords.some(keyword => text.includes(keyword) || href.includes(keyword))
            && !href.includes('mailto:')
            && !href.includes('tel:')
            && !href.includes('wa.me')
            && !href.includes('whatsapp');
        });
        return found ? found.href : null;
      });

      if (contactUrl && cleanOfficialUrl(contactUrl) === officialUrl) {
        await page.goto(contactUrl, { waitUntil: 'domcontentloaded', timeout: 7000 });
        await new Promise(resolve => setTimeout(resolve, 250));
        const contactContacts = await collectSignalsFromPage(page);
        merged = {
          emails: [...new Set([...merged.emails, ...contactContacts.emails])],
          phones: [...new Set([...merged.phones, ...contactContacts.phones])],
          whatsappPhones: [...new Set([...merged.whatsappPhones, ...contactContacts.whatsappPhones])],
        };
      }
    }

    return { ...merged, siteReachable: true };
  } catch {
    return { ...baseContacts, siteReachable: false };
  } finally {
    await page.close().catch(() => {});
  }
};

const scrapeGoogleMaps = async (page, query, coords, options = {}) => {
  const {
    maxPlaces = 60,
    maxScrolls = 10,
    targetCount = 30,
    onProgress = () => {},
  } = options;
  let url = `https://www.google.com/maps/search/${encodeURIComponent(query)}`;
  if (coords) url += `/@${coords.latitude},${coords.longitude},12z`;

  if (coords) {
    await page.setGeolocation(coords).catch(() => {});
  }
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await new Promise(resolve => setTimeout(resolve, 2500));

  const collectedLinks = new Set();
  let stableScrolls = 0;
  for (let i = 0; i < maxScrolls && collectedLinks.size < maxPlaces && stableScrolls < 2; i += 1) {
    const before = collectedLinks.size;
    const links = await page.evaluate(() => Array
      .from(document.querySelectorAll('a[href^="https://www.google.com/maps/place/"]'))
      .map(anchor => anchor.href));
    links.forEach(link => collectedLinks.add(link));
    stableScrolls = collectedLinks.size === before ? stableScrolls + 1 : 0;
    onProgress({
      phase: 'collecting',
      message: `Coletando resultados do Maps: ${collectedLinks.size} encontrados`,
      percent: Math.round(((i + 1) / maxScrolls) * 100),
      found: collectedLinks.size,
      target: targetCount,
    });
    await page.evaluate(() => {
      const feed = document.querySelector('div[role="feed"]');
      if (feed) feed.scrollBy(0, Math.max(feed.clientHeight * 1.8, 1800));
      else window.scrollBy(0, 1800);
    });
    await new Promise(resolve => setTimeout(resolve, 650));
  }

  const placeLinks = [...collectedLinks].slice(0, maxPlaces);
  const places = [];
  for (let index = 0; index < placeLinks.length; index += 1) {
    const link = placeLinks[index];
    try {
      await page.goto(link, { waitUntil: 'domcontentloaded', timeout: 9000 });
      await new Promise(resolve => setTimeout(resolve, 650));
      const placeData = await page.evaluate((mapsUrl) => {
        const getText = selector => document.querySelector(selector)?.innerText?.trim() || '';
        const titulo = getText('h1');
        const categoria = getText('button[jsaction="pane.rating.category"]');
        const localizacao = document.querySelector('button[data-item-id="address"]')?.innerText?.trim() || '';
        const telefone = document.querySelector('button[data-item-id^="phone:tel:"]')?.innerText?.trim() || '';
        const site_oficial = document.querySelector('a[data-item-id="authority"]')?.href || '';
        return {
          titulo,
          categoria,
          localizacao,
          telefone,
          site_oficial,
          maps_url: mapsUrl,
          has_digital_presence: site_oficial ? 1 : 0,
        };
      }, link);

      if (placeData.titulo) {
        places.push(placeData);
        onProgress({
          phase: 'collecting',
          message: `Verificando candidato ${index + 1}/${placeLinks.length}`,
          currentLead: placeData.titulo,
          percent: Math.round(((index + 1) / placeLinks.length) * 100),
          found: places.length,
          target: targetCount,
        });
      }
    } catch {
      // A single Maps place can fail; the next place may still be valid.
    }
  }

  return places;
};

export const collectCapLeadMapsCandidates = async (config = {}, options = {}) => {
  const {
    targetCount = 30,
    maxPlacesPerQuery = Math.max(targetCount * 3, 50),
    maxScrollsPerQuery = 10,
    onProgress = () => {},
    puppeteerImpl = null,
  } = options;
  const nichoInfo = getNichoInfo(config.niche);
  const coords = getRegionCoords(config.location);
  const locationTerms = getLocationSearchTerms(config.location);
  const queries = nichoInfo.searches
    .flatMap(search => locationTerms.map(location => `${search} ${location}`.trim()))
    .filter(Boolean);
  const puppeteer = puppeteerImpl || await loadPuppeteer();
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-blink-features=AutomationControlled'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36');
    if (coords) {
      await browser.defaultBrowserContext()
        .overridePermissions('https://www.google.com', ['geolocation'])
        .catch(() => {});
      await browser.defaultBrowserContext()
        .overridePermissions('https://www.google.com.br', ['geolocation'])
        .catch(() => {});
      await page.setGeolocation(coords).catch(() => {});
    }

    const candidates = [];
    const seen = new Set();
    for (let queryIndex = 0; queryIndex < queries.length && candidates.length < targetCount; queryIndex += 1) {
      const query = queries[queryIndex];
      onProgress({
        phase: 'searching',
        message: `Pesquisando no Google Maps: ${query}`,
        percent: Math.min(15 + queryIndex * 10, 55),
        found: candidates.length,
        target: targetCount,
      });

      const places = await scrapeGoogleMaps(page, query, coords, {
        maxPlaces: maxPlacesPerQuery,
        maxScrolls: maxScrollsPerQuery,
        targetCount,
        onProgress,
      });

      for (const place of places) {
        if (candidates.length >= targetCount) break;
        const officialUrl = cleanOfficialUrl(place.site_oficial);
        if (!officialUrl || isBlacklisted(officialUrl) || !isRelevantPlace(place, nichoInfo)) continue;
        const key = officialUrl || place.maps_url || `${place.titulo}|${place.localizacao}`;
        if (seen.has(key)) continue;
        seen.add(key);

        onProgress({
          phase: 'extracting',
          message: `Validando site oficial e contatos: ${place.titulo}`,
          currentLead: place.titulo,
          found: candidates.length,
          target: targetCount,
        });

        const contacts = await extractCandidateContacts(browser, place, officialUrl);
        if (!contacts.siteReachable) continue;
        if (!meetsContactRequirements(place, contacts, config.contactRequirements || {})) continue;
        const allPhones = [...new Set([
          normalizePhoneDigits(place.telefone),
          ...contacts.phones,
        ].filter(Boolean))];
        const allWhatsappPhones = [...new Set([
          ...contacts.whatsappPhones,
          ...(isBrazilWhatsappPhone(place.telefone) ? [normalizePhoneDigits(place.telefone)] : []),
        ])];
        const category = categorizeLead({
          titulo: place.titulo,
          categoria: place.categoria,
          description: `${nichoInfo.theme} ${place.categoria || ''}`,
        });
        candidates.push({
          id: `maps_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          name: place.titulo,
          company: place.titulo,
          website: officialUrl,
          email: contacts.emails[0] || null,
          phone: allPhones[0] || null,
          whatsapp: allWhatsappPhones[0] || null,
          source: 'Google Maps',
          location: config.location,
          niche: config.niche,
          mapsUrl: place.maps_url,
          mapsAddress: place.localizacao,
          category: place.categoria,
          industry: category,
          contacts: {
            emails: contacts.emails,
            phones: allPhones,
            whatsappPhones: allWhatsappPhones,
          },
          description: `${nichoInfo.theme} ${place.categoria || ''}${place.localizacao ? ` - ${place.localizacao}` : ''}`,
          providerMetadata: {
            strategy: 'caplead_maps_first',
            hasDigitalPresence: place.has_digital_presence === 1,
            mapsCategory: place.categoria,
            autoCategory: category,
          },
          websiteValidation: {
            isFunctional: true,
            checkedAt: new Date().toISOString(),
            finalUrl: officialUrl,
            contentLength: 0,
            source: 'Google Maps + Puppeteer',
          },
        });
      }
    }

    return candidates;
  } finally {
    await browser.close().catch(() => {});
  }
};
