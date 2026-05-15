import { collectOfficialLeadCandidates } from './officialLeadProviders.js';

const SEARCH_SOURCES = [
  {
    name: 'Bing RSS',
    type: 'rss',
    url: (query) => `https://www.bing.com/search?format=rss&q=${encodeURIComponent(query)}`,
  },
  {
    name: 'Bing',
    type: 'html',
    url: (query) => `https://www.bing.com/search?q=${encodeURIComponent(query)}&count=50`,
  },
  {
    name: 'Google',
    type: 'html',
    url: (query) => `https://www.google.com/search?q=${encodeURIComponent(query)}&num=50`,
  },
  {
    name: 'Google Maps',
    type: 'html',
    url: (query) => `https://www.google.com/maps/search/${encodeURIComponent(query)}`,
  },
  {
    name: 'DuckDuckGo',
    type: 'html',
    url: (query) => `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`,
  },
];

const BLOCKED_DOMAINS = [
  'google.', 'bing.', 'facebook.', 'instagram.', 'linkedin.', 'youtube.', 'tiktok.',
  'twitter.', 'x.com', 'reclameaqui.', 'jusbrasil.', 'doctoralia.', 'boaconsulta.',
  'guiamais.', 'telelistas.', 'apontador.', 'tripadvisor.', 'wikipedia.',
  'mercadolivre.', 'olx.', 'zapimoveis.', 'vivareal.', 'webmotors.',
  'noticias', 'blogspot.', 'medium.com', 'wordpress.com', 'gov.br',
  'baidu.', 'yahoo.', 'pinterest.', 'reddit.', 'quora.', 'archive.',
  'boaempresa.', 'gympass.', 'wellhub.', 'helpcenter.', 'encontra', 'guiado',
  'flashscore.', 'worldbank.', 'canaltech.', 'tecmundo.', 'spotify.',
  'globo.', 'g1.', 'uol.', 'terra.', 'r7.', 'cnn.', 'folha.', 'estadao.',
  'exame.', 'valor.', 'infomoney.', 'metropoles.', 'veja.', 'abril.',
];

const GENERIC_SEARCH_TOKENS = new Set([
  'site', 'oficial', 'contato', 'empresa', 'orcamento', 'orçamento', 'google',
  'maps', 'email', 'telefone', 'whatsapp', 'inurl', 'com', 'br', 'sao', 'sp',
  'rio', 'de', 'da', 'do', 'das', 'dos', 'em', 'no', 'na', 'para', 'com',
]);

const DEFAULT_HEADERS = {
  'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'accept-language': 'pt-BR,pt;q=0.9,en;q=0.7',
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36',
};

const DIRECTORY_OR_ARTICLE_PATTERNS = [
  /lista de/i,
  /telefones? e endere/i,
  /endere[cç]os/i,
  /melhores/i,
  /ranking/i,
  /guia de/i,
  /artigo/i,
  /blog/i,
  /not[ií]cia/i,
  /revista/i,
  /portal/i,
  /live scores?/i,
  /fixtures?/i,
  /resultados?/i,
  /playlist/i,
  /indicador/i,
  /indicator/i,
  /como acessar/i,
  /veja/i,
  /tutorial/i,
  /retrospectiva/i,
  /software/i,
  /aplicativo/i,
  /cat[aá]logo/i,
];

const ARTICLE_PATH_PATTERN = /\/(noticia|noticias|news|blog|blogs|artigo|artigos|materia|materias|apps?|software|team|teams|indicator|indicators|playlist|playlists|wiki|esporte|sports|politica|economia|tecnologia|tutorial|reviews?)(\/|$|-)/i;

const OFFICIAL_PATH_PATTERN = /^(\/)?$|\/(contato|contact|fale-conosco|sobre|quem-somos|empresa|home|inicio|servicos|solucoes|produtos|imoveis|empreendimentos)(\/|$|-)/i;

const TRUSTED_LOCAL_BUSINESS_SOURCES = new Set([
  'Google Maps',
  'Google Places API',
  'OpenStreetMap',
]);

export const normalizeText = (value = '') => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/\s+/g, ' ')
  .trim()
  .toLowerCase();

const tokenizeIntent = (value = '') => normalizeText(value)
  .split(/[^a-z0-9]+/i)
  .flatMap(token => (token.endsWith('s') && token.length > 4 ? [token, token.slice(0, -1)] : [token]))
  .filter(token => token.length > 3 && !GENERIC_SEARCH_TOKENS.has(token));

export const matchesCaptureIntent = (lead, config = {}) => {
  const nicheTokens = tokenizeIntent(config.niche);
  const locationTokens = tokenizeIntent(config.location);
  const haystack = normalizeText([
    lead?.name,
    lead?.originalName,
    lead?.website,
    lead?.description,
    lead?.bodyText,
    lead?.mapsAddress,
  ].filter(Boolean).join(' '));

  const nicheMatches = nicheTokens.length === 0 || nicheTokens.some(token => haystack.includes(token));
  const locationIsBroad = locationTokens.length === 0 || normalizeText(config.location).includes('brasil');
  const locationMatches = locationIsBroad
    || locationTokens.some(token => haystack.includes(token))
    || String(lead?.website || '').includes('.br');

  return nicheMatches && locationMatches;
};

export const isDirectoryOrArticleCandidate = (candidate = {}) => {
  const text = `${candidate.name || ''} ${candidate.website || ''} ${candidate.description || ''}`;
  return DIRECTORY_OR_ARTICLE_PATTERNS.some(pattern => pattern.test(text));
};

export const isLikelyOfficialLeadCandidate = (candidate = {}) => {
  const website = normalizeWebsiteUrl(candidate.website);
  if (!website || isDirectoryOrArticleCandidate(candidate)) return false;
  if (TRUSTED_LOCAL_BUSINESS_SOURCES.has(candidate.source)) return true;

  try {
    const url = new URL(website);
    const path = url.pathname || '/';
    const segments = path.split('/').filter(Boolean);
    if (ARTICLE_PATH_PATTERN.test(path)) return false;
    if (segments.length > 2) return false;
    return OFFICIAL_PATH_PATTERN.test(path);
  } catch {
    return false;
  }
};

export const buildSearchQueries = ({ niche, location }) => {
  const base = String(niche || '').trim();
  const place = String(location || '').trim();
  const suffix = place ? ` ${place}` : '';
  const terms = [
    `${base}${suffix} empresa site`,
    `${base}${suffix} site oficial contato`,
    `${base}${suffix} orçamento contato`,
    `${base}${suffix} Google Maps site oficial`,
    `${base}${suffix} email telefone whatsapp`,
    `${base}${suffix} inurl:contato`,
    `${base}${suffix} site:.com.br contato`,
  ];

  return [...new Set(terms.filter(term => term.trim().length > 8))];
};

export const normalizeWebsiteUrl = (rawUrl = '') => {
  if (!rawUrl) return null;
  try {
    let value = String(rawUrl).trim();
    value = decodeHtml(value);
    if (value.startsWith('//')) value = `https:${value}`;
    if (value.includes('/url?')) {
      const parsed = new URL(value);
      value = parsed.searchParams.get('q') || parsed.searchParams.get('url') || value;
    }
    if (value.includes('duckduckgo.com/l/')) {
      const parsed = new URL(value);
      value = parsed.searchParams.get('uddg') || value;
    }
    if (value.includes('bing.com/ck/')) {
      const parsed = new URL(value);
      const encoded = parsed.searchParams.get('u');
      if (encoded) {
        const payload = encoded.startsWith('a1') ? encoded.slice(2) : encoded;
        value = Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
      }
    }

    const url = new URL(value.startsWith('http') ? value : `https://${value}`);
    url.hash = '';
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'fbclid', 'gclid'].forEach(key => url.searchParams.delete(key));
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    const hostname = url.hostname.toLowerCase().replace(/^www\./, '');
    if (hostname.length < 4 || !hostname.includes('.') || BLOCKED_DOMAINS.some(domain => hostname.includes(domain))) return null;
    return `${url.protocol}//${hostname}${url.pathname === '/' ? '' : url.pathname}`.replace(/\/$/, '');
  } catch {
    return null;
  }
};

export const extractCandidatesFromSearchHtml = (html = '', source = 'Search') => {
  const candidates = [];
  const seen = new Set();
  const anchorRegex = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;

  while ((match = anchorRegex.exec(html)) !== null) {
    const website = normalizeWebsiteUrl(match[1]);
    if (!website || seen.has(website)) continue;
    const title = match[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (!title || title.length < 3) continue;
    if (!isLikelyOfficialLeadCandidate({ name: title, website, source })) continue;
    seen.add(website);
    candidates.push({ name: title, website, source });
  }

  return candidates;
};

const decodeHtml = (value = '') => String(value || '')
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
  .replace(/&aacute;/g, 'á')
  .replace(/&eacute;/g, 'é')
  .replace(/&iacute;/g, 'í')
  .replace(/&oacute;/g, 'ó')
  .replace(/&uacute;/g, 'ú')
  .replace(/&atilde;/g, 'ã')
  .replace(/&otilde;/g, 'õ')
  .replace(/&ccedil;/g, 'ç')
  .replace(/&Aacute;/g, 'Á')
  .replace(/&Eacute;/g, 'É')
  .replace(/&Iacute;/g, 'Í')
  .replace(/&Oacute;/g, 'Ó')
  .replace(/&Uacute;/g, 'Ú')
  .replace(/&Atilde;/g, 'Ã')
  .replace(/&Otilde;/g, 'Õ')
  .replace(/&Ccedil;/g, 'Ç')
  .replace(/&#8211;/g, '-')
  .replace(/&amp;/g, '&')
  .replace(/&quot;/g, '"')
  .replace(/&#39;/g, "'")
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>');

export const extractCandidatesFromBingRss = (xml = '', source = 'Bing RSS') => {
  const candidates = [];
  const seen = new Set();
  const itemRegex = /<item\b[\s\S]*?<\/item>/gi;
  let itemMatch;

  while ((itemMatch = itemRegex.exec(xml)) !== null) {
    const item = itemMatch[0];
    const link = decodeHtml(item.match(/<link>([\s\S]*?)<\/link>/i)?.[1] || '');
    const title = decodeHtml(item.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    const website = normalizeWebsiteUrl(link);
    if (!website || seen.has(website) || !title) continue;
    if (!isLikelyOfficialLeadCandidate({ name: title, website, source })) continue;
    seen.add(website);
    candidates.push({ name: title, website, source });
  }

  return candidates;
};

export const extractContactsFromHtml = (html = '') => {
  const decoded = decodeHtml(html).replace(/&#64;/g, '@');
  const emails = [...new Set(decoded.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [])]
    .map(email => email.replace(/^mailto:/i, '').split('?')[0].toLowerCase())
    .filter(email => !/\.(png|jpe?g|webp|gif|svg)$/i.test(email))
    .filter(email => !/(sentry|wixpress|example\.|mysite\.com|domain\.com)/i.test(email));
  const phoneMatches = decoded.match(/(?:\+?55\s?)?(?:\(?\d{2}\)?\s?)?(?:9\d{4}[-\s]?\d{4}|\d{4}[-\s]?\d{4})/g) || [];
  const phones = [...new Set(phoneMatches.map(phone => {
    let digits = phone.replace(/\D/g, '');
    if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) digits = digits.slice(2);
    return digits;
  }).filter(phone => phone.length >= 10 && phone.length <= 11))];
  const whatsappPhones = [
    ...decoded.matchAll(/(?:wa\.me\/|phone=(?:55)?)(\d{10,11})/gi),
  ].map(match => match[1]);

  return {
    emails,
    phones,
    whatsappPhones: [...new Set([...whatsappPhones, ...phones.filter(phone => /^\d{2}9\d{8}$/.test(phone))])],
  };
};

const mergeContacts = (...contactSets) => ({
  emails: [...new Set(contactSets.flatMap(contacts => contacts?.emails || []))],
  phones: [...new Set(contactSets.flatMap(contacts => contacts?.phones || []))],
  whatsappPhones: [...new Set(contactSets.flatMap(contacts => contacts?.whatsappPhones || []))],
});

export const extractContactLinks = (html = '', baseUrl = '') => {
  const links = [];
  const seen = new Set();
  const anchorRegex = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  const contactWords = /(contato|contact|fale|whatsapp|telefone|email|sobre|quem-somos|atendimento|orcamento|orçamento)/i;
  let match;

  while ((match = anchorRegex.exec(html)) !== null) {
    const href = decodeHtml(match[1]);
    const label = decodeHtml(match[2]).replace(/<[^>]+>/g, ' ');
    if (!contactWords.test(`${href} ${label}`)) continue;
    try {
      const url = new URL(href, baseUrl);
      const normalized = normalizeWebsiteUrl(url.href);
      if (!normalized || seen.has(normalized)) continue;
      const baseHost = new URL(baseUrl).hostname.replace(/^www\./, '');
      const linkHost = new URL(normalized).hostname.replace(/^www\./, '');
      if (baseHost !== linkHost) continue;
      seen.add(normalized);
      links.push(normalized);
    } catch {
      // Ignore invalid relative links and keep testing the next candidate.
    }
  }

  return links.slice(0, 5);
};

export const extractSiteMetadata = (html = '', fallbackName = '') => {
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]
    || html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)?.[1]
    || fallbackName;
  const description = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)?.[1] || '';
  const bodyText = html.replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return {
    title: decodeHtml(title).replace(/\s+/g, ' ').trim(),
    description: decodeHtml(description).replace(/\s+/g, ' ').trim(),
    bodyText,
  };
};

const fetchWithTimeout = async (url, options = {}, timeoutMs = 12000, fetchImpl = fetch) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetchImpl(url, {
      redirect: 'follow',
      ...options,
      headers: { ...DEFAULT_HEADERS, ...(options.headers || {}) },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
};

export const validateWebsite = async (candidate, fetchImpl = fetch) => {
  const website = normalizeWebsiteUrl(candidate.website);
  if (!website) return null;

  try {
    const response = await fetchWithTimeout(website, { method: 'GET' }, 14000, fetchImpl);
    if (!response || response.status < 200 || response.status >= 400) return null;
    const contentType = response.headers?.get?.('content-type') || '';
    if (contentType && !contentType.includes('text/html') && !contentType.includes('application/xhtml')) return null;
    const html = await response.text();
    if (!html || html.length < 400) return null;
    const metadata = extractSiteMetadata(html, candidate.name);
    if (!metadata.title && metadata.bodyText.length < 300) return null;
    const contactSets = [extractContactsFromHtml(html), extractContactsFromHtml(candidate.mapsPhone || '')];
    const contactLinks = extractContactLinks(html, website);

    for (const contactLink of contactLinks) {
      try {
        const contactResponse = await fetchWithTimeout(contactLink, { method: 'GET' }, 9000, fetchImpl);
        if (!contactResponse || contactResponse.status < 200 || contactResponse.status >= 400) continue;
        const contactType = contactResponse.headers?.get?.('content-type') || '';
        if (contactType && !contactType.includes('text/html') && !contactType.includes('application/xhtml')) continue;
        const contactHtml = await contactResponse.text();
        contactSets.push(extractContactsFromHtml(contactHtml));
      } catch {
        // Contact subpages are optional; the root site already proved accessibility.
      }
    }
    const contacts = mergeContacts(...contactSets);

    return {
      ...candidate,
      originalName: candidate.name,
      name: metadata.title || candidate.name,
      website,
      html,
      description: metadata.description,
      bodyText: metadata.bodyText,
      contacts,
    };
  } catch {
    return null;
  }
};

export const qualifiesLead = (lead, requirements = {}) => {
  if (!lead?.website) return false;
  if (requirements.email && !lead.contacts?.emails?.length) return false;
  if (requirements.phone && !lead.contacts?.phones?.length) return false;
  if (requirements.whatsapp && !lead.contacts?.whatsappPhones?.length) return false;
  if (requirements.website && !lead.website) return false;
  return true;
};

const hasRequestedContactFallback = (lead, requirements = {}) => {
  if (requirements.website && lead.website) return true;
  const requestedAnyContact = Boolean(requirements.email || requirements.phone || requirements.whatsapp);
  if (!requestedAnyContact) return true;
  const hasAnyContact = Boolean(
    lead.contacts?.emails?.length
    || lead.contacts?.phones?.length
    || lead.contacts?.whatsappPhones?.length
  );
  return hasAnyContact && (!requirements.website || lead.website);
};

export const collectSearchCandidates = async (queries, fetchImpl = fetch, targetCount = 200) => {
  const candidates = [];
  const seen = new Set();
  const orderedSources = [...SEARCH_SOURCES].sort((a, b) => {
    if (a.name === 'DuckDuckGo') return -1;
    if (b.name === 'DuckDuckGo') return 1;
    return 0;
  });

  for (const query of queries) {
    if (candidates.length >= targetCount) break;
    for (const source of orderedSources) {
      if (candidates.length >= targetCount) break;
      try {
        const response = await fetchWithTimeout(source.url(query), { method: 'GET' }, 12000, fetchImpl);
        if (!response?.ok || response.status === 202) continue;
        const body = await response.text();
        const extracted = source.type === 'rss'
          ? extractCandidatesFromBingRss(body, source.name)
          : extractCandidatesFromSearchHtml(body, source.name);
        for (const candidate of extracted) {
          const key = normalizeWebsiteUrl(candidate.website);
          if (!key || seen.has(key)) continue;
          seen.add(key);
          candidates.push(candidate);
        }
      } catch {
        // Search engines can throttle; the next source/query still runs.
      }
    }
  }

  return candidates;
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

export const collectGoogleMapsCandidates = async (config, targetCount = 40) => {
  let browser;
  try {
    const puppeteer = await loadPuppeteer();
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });
    const page = await browser.newPage();
    await page.setUserAgent(DEFAULT_HEADERS['user-agent']);
    const candidates = [];
    const seenSites = new Set();
    const locationText = normalizeText(config.location || '');
    const neighborhoods = locationText.includes('sao paulo')
      ? [
        'Pinheiros', 'Vila Mariana', 'Moema', 'Tatuape', 'Santana', 'Santo Amaro',
        'Paulista', 'Jardins', 'Itaim Bibi', 'Perdizes', 'Bela Vista', 'Centro',
        'Consolacao', 'Liberdade', 'Republica', 'Brooklin', 'Lapa', 'Saude',
        'Butanta', 'Morumbi', 'Mooca', 'Vila Madalena', 'Aclimacao', 'Ipiranga',
        'Vila Olimpia',
      ]
      : [];
    const isFitnessNiche = /academia|fitness|muscula|pilates|crossfit/i.test(normalizeText(config.niche || ''));
    const queryTerms = [
      `${config.niche || ''} ${config.location || ''}`,
      `${config.niche || ''} perto de ${config.location || ''}`,
      ...neighborhoods.map(place => `${config.niche || ''} ${place} Sao Paulo SP`),
      ...(isFitnessNiche ? neighborhoods.map(place => `academia fitness ${place} Sao Paulo SP`) : []),
    ].map(term => term.trim()).filter(Boolean);

    for (const query of queryTerms) {
      if (candidates.length >= targetCount) break;
      const url = `https://www.google.com/maps/search/${encodeURIComponent(query)}`;
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await new Promise(resolve => setTimeout(resolve, 3000));

      const collectedLinks = new Set();
      const maxPlaces = Math.max(targetCount * 2, 30);
      for (let i = 0; i < 7 && collectedLinks.size < maxPlaces; i++) {
        const links = await page.evaluate(() => Array
          .from(document.querySelectorAll('a[href^="https://www.google.com/maps/place/"]'))
          .map(anchor => anchor.href));
        links.forEach(link => collectedLinks.add(link));
        await page.evaluate(() => {
          const feed = document.querySelector('div[role="feed"]');
          if (feed) feed.scrollBy(0, Math.max(feed.clientHeight * 1.8, 1800));
          else window.scrollBy(0, 1800);
        });
        await new Promise(resolve => setTimeout(resolve, 900));
      }

      for (const link of [...collectedLinks].slice(0, maxPlaces)) {
        if (candidates.length >= targetCount) break;
        try {
          await page.goto(link, { waitUntil: 'domcontentloaded', timeout: 20000 });
          await new Promise(resolve => setTimeout(resolve, 1200));
          const placeData = await page.evaluate((mapsUrl) => {
            const getText = (selector) => document.querySelector(selector)?.innerText?.trim() || '';
            const title = getText('h1');
            const address = document.querySelector('button[data-item-id="address"]')?.innerText?.trim() || '';
            const phone = document.querySelector('button[data-item-id^="phone:tel:"]')?.innerText?.trim() || '';
            const website = document.querySelector('a[data-item-id="authority"]')?.href || '';
            return { title, address, phone, website, mapsUrl };
          }, link);
          const website = normalizeWebsiteUrl(placeData.website);
          if (!placeData.title || !website || seenSites.has(website)) continue;
          seenSites.add(website);
          candidates.push({
            name: placeData.title,
            website,
            source: 'Google Maps',
            mapsUrl: placeData.mapsUrl,
            mapsAddress: placeData.address,
            mapsPhone: placeData.phone,
          });
        } catch {
          // Keep moving; Maps result pages can fail individually.
        }
      }
    }
    return candidates;
  } catch {
    return [];
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
};

export const captureLeads = async (config, options = {}) => {
  const fetchImpl = options.fetchImpl || fetch;
  const quantity = Math.max(1, Math.min(Number(config.quantity || 10), 100));
  const queries = buildSearchQueries({ niche: config.niche, location: config.location });
  const desiredCandidateCount = Math.max(quantity * 12, 80);
  const officialCandidates = fetchImpl === fetch
    ? await collectOfficialLeadCandidates(config, queries, fetchImpl, desiredCandidateCount)
    : [];
  const searchCandidates = await collectSearchCandidates(queries, fetchImpl, desiredCandidateCount);
  const mapsCandidates = fetchImpl === fetch
    ? (options.mapsCandidatesProvider
      ? await options.mapsCandidatesProvider(config, Math.max(quantity * 5, 80))
      : await collectGoogleMapsCandidates(config, Math.max(quantity * 5, 80)))
    : [];
  const rawCandidates = [...officialCandidates, ...mapsCandidates, ...searchCandidates];
  const candidates = rawCandidates.slice(0, Math.max(quantity * 40, 240));
  const results = [];
  const fallbackResults = [];
  const seen = new Set();

  for (const candidate of candidates) {
    if (results.length >= quantity) break;
    let validated = await validateWebsite(candidate, fetchImpl);
    if (!validated && candidate.source === 'Google Maps' && normalizeWebsiteUrl(candidate.website)) {
      validated = {
        ...candidate,
        originalName: candidate.name,
        website: normalizeWebsiteUrl(candidate.website),
        contacts: extractContactsFromHtml(candidate.mapsPhone || ''),
        description: '',
        bodyText: `${candidate.name || ''} ${candidate.mapsAddress || ''}`,
      };
    }
    if (!validated || !isLikelyOfficialLeadCandidate(validated)) continue;
    const key = normalizeWebsiteUrl(validated.website);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    if (candidate.source !== 'Google Maps' && !matchesCaptureIntent(validated, config)) continue;
    if (qualifiesLead(validated, config.contactRequirements || {})) {
      results.push(validated);
      continue;
    }
    if (hasRequestedContactFallback(validated, config.contactRequirements || {})) {
      fallbackResults.push(validated);
    }
  }

  const finalResults = [...results, ...fallbackResults].slice(0, quantity);

  return finalResults.map(lead => ({
    name: lead.source === 'Google Maps' && lead.originalName ? lead.originalName : lead.name,
    website: lead.website,
    source: lead.source,
    location: config.location,
    niche: config.niche,
    email: lead.contacts.emails[0] || null,
    phone: lead.contacts.phones[0] || null,
    whatsapp: lead.contacts.whatsappPhones[0] || lead.contacts.phones[0] || null,
    isValid: true,
    isActive: true,
    status: 'qualified',
    websiteValidation: {
      isFunctional: true,
      checkedAt: new Date().toISOString(),
      finalUrl: lead.website,
      contentLength: lead.html?.length || 0,
      source: lead.source,
    },
  }));
};
