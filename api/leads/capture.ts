// Vercel Serverless Function: /api/leads/capture
// Handles POST requests for lead capture

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

// ========================================
// CONFIGURAÇÃO DE FONTES
// ========================================
const CONFIG = {
  // API Keys (from environment)
  GOOGLE_PLACES_API_KEY: process.env.GOOGLE_PLACES_API_KEY || '',
  SERPAPI_API_KEY: process.env.SERPAPI_API_KEY || '',
  BING_SEARCH_API_KEY: process.env.BING_SEARCH_API_KEY || '',
  BING_SEARCH_ENDPOINT: process.env.BING_SEARCH_ENDPOINT || 'https://api.bing.microsoft.com/v7.0/search',

  // Is production?
  isProduction: process.env.NODE_ENV === 'production' || process.env.VERCEL === 'true',

  // Max attempts for capture loop
  maxAttempts: 5,

  // Candidates per attempt
  candidatesPerAttempt: 10,
};

const getCapturePoolSize = (requestedQuantity) =>
  Math.min(100, Math.max(requestedQuantity * 4, requestedQuantity + 40));

function isProductionCapture() {
  return process.env.NODE_ENV === 'production' || process.env.VERCEL === 'true';
}

// Check which sources are configured
function getConfiguredSources() {
  const sources = [];

  if (CONFIG.GOOGLE_PLACES_API_KEY) {
    sources.push('google_places');
  }
  if (CONFIG.SERPAPI_API_KEY) {
    sources.push('serpapi');
  }
  if (CONFIG.BING_SEARCH_API_KEY) {
    sources.push('bing_search');
  }

  return sources;
}

// Check if any real source is configured
function hasRealSource() {
  return CONFIG.GOOGLE_PLACES_API_KEY || CONFIG.SERPAPI_API_KEY || CONFIG.BING_SEARCH_API_KEY;
}

// Local database for development ONLY
const LOCAL_DATABASE = {
  'escritorios de advocacia': [
    { name: 'Escritório Almeida & Associados', domain: 'almeidaadvogados.com.br', city: 'Rio de Janeiro', state: 'RJ', desc: 'Direito Empresarial', category: 'advocacia' },
    { name: 'Lima Advocacia', domain: 'limadvocacia.com.br', city: 'Rio de Janeiro', state: 'RJ', desc: 'Direito Civil', category: 'advocacia' },
    { name: 'Martins & Santos Advogados', domain: 'martinssantos.adv.br', city: 'Rio de Janeiro', state: 'RJ', desc: 'Direito do Trabalho', category: 'advocacia' },
    { name: 'Ferreira Advocacia', domain: 'ferreiraadv.com.br', city: 'São Paulo', state: 'SP', desc: 'Direito Tributário', category: 'advocacia' },
    { name: 'Oliveira Sociedade de Advogados', domain: 'oliveiraadvogados.com.br', city: 'São Paulo', state: 'SP', desc: 'Direito Empresarial', category: 'advocacia' },
    { name: 'Carvalho & Lima Advogados', domain: 'carvalholima.adv.br', city: 'Belo Horizonte', state: 'MG', desc: 'Direito Imobiliário', category: 'advocacia' },
    { name: 'Pereira Advocacia', domain: 'pereiraadv.adv.br', city: 'Curitiba', state: 'PR', desc: 'Direito de Família', category: 'advocacia' },
    { name: 'Silva Advocacia Digital', domain: 'silvaadvdigital.com.br', city: 'Rio de Janeiro', state: 'RJ', desc: 'Advocacia Digital', category: 'advocacia' },
    { name: 'Advocacia Brasília DF', domain: 'advocaciabrasilia.adv.br', city: 'Brasília', state: 'DF', desc: 'Direito Empresarial', category: 'advocacia' },
    { name: 'Escritório Advocacia Asa Sul', domain: 'advasa.com.br', city: 'Brasília', state: 'DF', desc: 'Direito Civil e Trabalho', category: 'advocacia' },
  ],
  'personal trainers': [
    { name: 'Personal Fit Pro', domain: 'personalfitpro.com.br', city: 'Rio de Janeiro', state: 'RJ', desc: 'Treino personalizado', category: 'fitness' },
    { name: 'Coach Esportivo RJ', domain: 'coachesportivorio.com.br', city: 'Rio de Janeiro', state: 'RJ', desc: 'Preparação física', category: 'fitness' },
    { name: 'Fitness Coach SP', domain: 'fitnesscoachsp.com.br', city: 'São Paulo', state: 'SP', desc: 'Emagrecimento', category: 'fitness' },
    { name: 'Personal Musculação SP', domain: 'personalmusculacaosp.com.br', city: 'São Paulo', state: 'SP', desc: 'Musculação orientada', category: 'fitness' },
    { name: 'Coach Corrida Brasil', domain: 'coachcorridabrasil.com.br', city: 'São Paulo', state: 'SP', desc: 'Corrida e triathlon', category: 'fitness' },
    { name: 'Personal Yoga SP', domain: 'personalyogasp.com.br', city: 'São Paulo', state: 'SP', desc: 'Yoga e meditação', category: 'fitness' },
    { name: 'Nutri Fit Coach BH', domain: 'nutrifitcoachbh.com.br', city: 'Belo Horizonte', state: 'MG', desc: 'Fitness e nutrição', category: 'fitness' },
    { name: 'Personal Funcional PR', domain: 'personafuncionalpr.com.br', city: 'Curitiba', state: 'PR', desc: 'Funcional e Pilates', category: 'fitness' },
  ],
  'academias': [
    { name: 'Smart Fit', domain: 'smartfit.com.br', city: 'São Paulo', state: 'SP', desc: 'Rede de academias', category: 'fitness' },
    { name: 'Bluefit', domain: 'bluefit.com.br', city: 'Rio de Janeiro', state: 'RJ', desc: 'Academia moderna', category: 'fitness' },
    { name: 'Bodytech', domain: 'bodytech.com.br', city: 'Belo Horizonte', state: 'MG', desc: 'Musculação especializada', category: 'fitness' },
    { name: 'Power Academia', domain: 'poweracademia.com.br', city: 'São Paulo', state: 'SP', desc: 'Musculação e funcional', category: 'fitness' },
    { name: 'Fit Academy', domain: 'fitacademy.com.br', city: 'São Paulo', state: 'SP', desc: 'Crossfit e funcional', category: 'fitness' },
    { name: 'Academia Cultural', domain: 'academiacultural.com.br', city: 'Curitiba', state: 'PR', desc: 'Fitness e bem-estar', category: 'fitness' },
  ],
  'consultorias': [
    { name: 'Consultoria Empresarial Alpha', domain: 'consultoriaalpha.com.br', city: 'São Paulo', state: 'SP', desc: 'Consultoria empresarial', category: 'consultoria' },
    { name: 'BConsult Consultoria', domain: 'bconsult.com.br', city: 'São Paulo', state: 'SP', desc: 'Consultoria de negócios', category: 'consultoria' },
    { name: 'RHS Consultoria', domain: 'rhsconsultoria.com.br', city: 'Rio de Janeiro', state: 'RJ', desc: 'Consultoria RH', category: 'consultoria' },
    { name: 'Delta Consultoria Empresarial', domain: 'deltaconsultoria.adv.br', city: 'Belo Horizonte', state: 'MG', desc: 'Consultoria estratégica', category: 'consultoria' },
    { name: 'Consultoria Brasília DF', domain: 'consultoriabrasilia.com.br', city: 'Brasília', state: 'DF', desc: 'Consultoria empresarial DF', category: 'consultoria' },
    { name: 'Inova Consultoria Asa Sul', domain: 'inovaconsultoria.com.br', city: 'Brasília', state: 'DF', desc: 'Consultoria tecnologia', category: 'consultoria' },
    { name: 'W2B Consultoria Digital', domain: 'w2bconsultoria.com.br', city: 'Brasília', state: 'DF', desc: 'Consultoria marketing digital', category: 'consultoria' },
  ],
  'contabilidade': [
    { name: 'Contabilidade Machado & Associados', domain: 'machadoassessoria.com.br', city: 'Rio de Janeiro', state: 'RJ', desc: 'Escritório contábil', category: 'contabilidade' },
    { name: 'Alpha Contabilidade RJ', domain: 'alphacontabilrj.com.br', city: 'Rio de Janeiro', state: 'RJ', desc: 'Assessoria contábil', category: 'contabilidade' },
    { name: 'Borges & Lima Contadores', domain: 'borgeslima.com.br', city: 'Rio de Janeiro', state: 'RJ', desc: 'Empresa contábil', category: 'contabilidade' },
    { name: 'Silva & Castro Contabilidade', domain: 'silvacastrocontabil.com.br', city: 'Rio de Janeiro', state: 'RJ', desc: 'Contabilidade geral', category: 'contabilidade' },
    { name: 'Oliveira Contabilidade Digital', domain: 'oliveiracontabil.com.br', city: 'Rio de Janeiro', state: 'RJ', desc: 'Consultoria contábil', category: 'contabilidade' },
    { name: 'Ferreira & Campos Assessoria', domain: 'ferreiracampos.com.br', city: 'Rio de Janeiro', state: 'RJ', desc: 'Assessoria contábil', category: 'contabilidade' },
    { name: 'Santos & Pereira Contabilidade', domain: 'santoscontabil.com.br', city: 'Rio de Janeiro', state: 'RJ', desc: 'Escritório contábil', category: 'contabilidade' },
    { name: 'Costa Contabilidade Empresarial', domain: 'costacontabil.com.br', city: 'Rio de Janeiro', state: 'RJ', desc: 'Contabilidade empresarial', category: 'contabilidade' },
    { name: 'Andrade Contabilidade Ltda', domain: 'andradecontabil.com.br', city: 'Rio de Janeiro', state: 'RJ', desc: 'Escritório contábil', category: 'contabilidade' },
    { name: 'RJ Assessores Contábeis', domain: 'rjassessores.com.br', city: 'Rio de Janeiro', state: 'RJ', desc: 'Assessoria contábil', category: 'contabilidade' },
    { name: 'Contabilidade São Paulo SP', domain: 'contabilsp.com.br', city: 'São Paulo', state: 'SP', desc: 'Escritório contábil', category: 'contabilidade' },
    { name: 'MT Contabilidade', domain: 'mtcontabilidade.com.br', city: 'São Paulo', state: 'SP', desc: 'Assessoria contábil', category: 'contabilidade' },
    { name: 'Expert Contábil', domain: 'expertcontabil.com.br', city: 'São Paulo', state: 'SP', desc: 'Consultoria contábil', category: 'contabilidade' },
    { name: 'BH Contabilidade Empresarial', domain: 'bhcontabilidadeempresarial.com.br', city: 'Belo Horizonte', state: 'MG', desc: 'Escritório contábil', category: 'contabilidade' },
    { name: 'Minas Contábil Digital', domain: 'minascontabildigital.com.br', city: 'Belo Horizonte', state: 'MG', desc: 'Assessoria contábil', category: 'contabilidade' },
    { name: 'Horizonte Contadores Associados', domain: 'horizontecontadores.com.br', city: 'Belo Horizonte', state: 'MG', desc: 'Consultoria contábil', category: 'contabilidade' },
  ],
  'restaurantes': [
    { name: 'Restaurante Fasano', domain: 'fasano.com.br', city: 'São Paulo', state: 'SP', desc: 'Culinária italiana', category: 'restaurante' },
    { name: 'Outback Steakhouse', domain: 'outback.com.br', city: 'Rio de Janeiro', state: 'RJ', desc: 'Carnes e massas', category: 'restaurante' },
    { name: 'Coco Bambum', domain: 'cocobambum.com.br', city: 'Recife', state: 'PE', desc: 'Frutos do mar', category: 'restaurante' },
    { name: 'Giuseppe Grill', domain: 'giuseppegrill.com.br', city: 'Belo Horizonte', state: 'MG', desc: 'Churrascaria premium', category: 'restaurante' },
    { name: 'Restaurante Madeira', domain: 'madeirarestaurante.com.br', city: 'São Paulo', state: 'SP', desc: 'Culinária portuguesa', category: 'restaurante' },
  ],
  'nutricionistas': [
    { name: 'Nutri Mariana Silva', domain: 'nutrimarianasilva.com.br', city: 'São Paulo', state: 'SP', desc: 'Nutrição clínica', category: 'nutricao' },
    { name: 'Clínica Nutri Live', domain: 'nutrilive.com.br', city: 'São Paulo', state: 'SP', desc: 'Nutrição esportiva', category: 'nutricao' },
    { name: 'Instituto Nutri Vida', domain: 'institutonutrivida.com.br', city: 'Rio de Janeiro', state: 'RJ', desc: 'Nutrição integrativa', category: 'nutricao' },
    { name: 'Centro Nutrir', domain: 'centronutrir.com.br', city: 'Curitiba', state: 'PR', desc: 'Emagrecimento', category: 'nutricao' },
    { name: 'Vitalis Nutrição', domain: 'vitalisnutri.com.br', city: 'Belo Horizonte', state: 'MG', desc: 'Nutrição e bem-estar', category: 'nutricao' },
  ],
  'clínicas médicas': [
    { name: 'Hospital Albert Einstein', domain: 'einstein.br', city: 'São Paulo', state: 'SP', desc: 'Hospital de referência', category: 'saude' },
    { name: 'Rede DOr São Luiz', domain: 'rededorsaoluis.com.br', city: 'Rio de Janeiro', state: 'RJ', desc: 'Rede hospitalar', category: 'saude' },
    { name: 'Clínica São Vicente', domain: 'saovicenteclinica.com.br', city: 'São Paulo', state: 'SP', desc: 'Clínica geral', category: 'saude' },
    { name: 'Hospital Moinhos', domain: 'moinhos.org.br', city: 'Porto Alegre', state: 'RS', desc: 'Hospital especializado', category: 'saude' },
  ],
  'ecommerce': [
    { name: 'Magazine Luiza', domain: 'magazineluiza.com.br', city: 'São Paulo', state: 'SP', desc: 'Varejo online', category: 'ecommerce' },
    { name: 'Americanas', domain: 'americanas.com', city: 'Rio de Janeiro', state: 'RJ', desc: 'Marketplace', category: 'ecommerce' },
    { name: 'Shoptime', domain: 'shoptime.com.br', city: 'São Paulo', state: 'SP', desc: 'E-commerce', category: 'ecommerce' },
    { name: 'Submarino', domain: 'submarino.com.br', city: 'São Paulo', state: 'SP', desc: 'Loja virtual', category: 'ecommerce' },
    { name: 'Casas Bahia', domain: 'casasbahia.com.br', city: 'São Paulo', state: 'SP', desc: 'Varejo e-commerce', category: 'ecommerce' },
  ],
};

// Map niche variations to database keys
const NICHE_MAPPINGS = {
  'escritorios de advocacia': ['escritorios de advocacia', 'advocacia', 'advogado', 'jurídico', 'direito'],
  'personal trainers': ['personal trainers', 'personal trainer', 'coach esportivo', 'treinador', 'fitness'],
  'academias': ['academias', 'academia', 'crossfit', 'ginástica', 'musculação'],
  'consultorias': ['consultorias', 'consultoria', 'consultor', 'assessoria'],
  'contabilidade': ['contabilidade', 'contador', 'escritório contábil', 'assessoria contábil', 'empresa contábil', 'consultoria contábil'],
  'restaurantes': ['restaurantes', 'restaurante', 'gastronomia', 'comida'],
  'nutricionistas': ['nutricionistas', 'nutrição', 'nutricionista'],
  'clínicas médicas': ['clínicas médicas', 'clínica médica', 'hospital', 'clínica'],
  'ecommerce': ['ecommerce', 'e-commerce', 'loja virtual', 'loja online'],
};

// Map location variations
const LOCATION_MAPPINGS = {
  'DF': ['df', 'distrito federal', 'brasília', 'brasilia', 'asasul', 'asaanorte', 'taguatinga', 'aguasclaras'],
  'RJ': ['rj', 'rio de janeiro', 'rio', 'niteroi', 'saogoncalo', 'niterói'],
  'SP': ['sp', 'são paulo', 'sao paulo', 'campinas', 'santos', 'ribeirao', 'sorocaba'],
  'MG': ['mg', 'belo horizonte', 'bh', 'juiz de fora', 'uberlandia'],
  'PR': ['pr', 'curitiba', 'londrina', 'maringa', 'joinville'],
  'RS': ['rs', 'porto alegre', 'canoas', 'pelotas'],
  'PE': ['pe', 'recife', 'jaboatao', 'olinda'],
};

const DDD_MAP = { 'SP': '11', 'RJ': '21', 'MG': '31', 'PR': '41', 'RS': '51', 'PE': '81', 'DF': '61' };

// ========================================
// FUNÇÕES DE VALIDAÇÃO
// ========================================

// Check if lead matches niche
function leadMatchesNiche(lead, selectedNiche) {
  const niche = normalize(selectedNiche);
  const leadDesc = normalize(lead.desc);
  const leadName = normalize(lead.name);
  const leadCategory = normalize(lead.category);

  // Get allowed keywords for this niche
  const nicheEntry = Object.entries(NICHE_MAPPINGS).find(([key, keywords]) =>
    normalize(key) === niche
    || normalize(key).includes(niche)
    || keywords.some(keyword => niche.includes(normalize(keyword)) || normalize(keyword).includes(niche))
  );
  const nicheKeywords = (nicheEntry?.[1] || [niche]).map(normalize);

  // Check if any keyword matches
  const matchesKeyword = nicheKeywords.some(keyword =>
    leadDesc.includes(keyword) ||
    leadName.includes(keyword) ||
    leadCategory.includes(keyword)
  );

  // Check for direct niche match in database key
  const nicheKeys = Object.keys(LOCAL_DATABASE);
  const matchesNicheKey = nicheKeys.some(key =>
    niche.includes(normalize(key)) || normalize(key).includes(niche)
  );

  return matchesKeyword || matchesNicheKey;
}

// Check if lead matches location
function leadMatchesLocation(lead, selectedLocation) {
  const location = normalize(selectedLocation);
  const leadCity = normalize(lead.city);
  const leadState = (lead.state || '').toUpperCase();

  // If location is "Brasil" or empty, accept all
  if (location.includes('brasil') || location === 'br' || !location) {
    return true;
  }

  // FIRST: Check if "DF" or "Distrito Federal" is in the location
  const hasDF = location.includes('df') ||
    location.includes('distrito federal') ||
    location.includes('brasília') ||
    location.includes('brasilia');

  if (hasDF && leadState === 'DF') {
    return true;
  }

  // Extract state from location (e.g., "São Paulo, SP" -> "SP")
  const stateMatch = location.match(/\b([A-Z]{2})\b/);
  const cityMatch = location.split(',')[0].trim();

  // Check for exact state match
  if (stateMatch) {
    const requestedState = stateMatch[1].toUpperCase();
    if (leadState === requestedState) {
      return true;
    }
  }

  // Check for state in location mappings
  for (const [stateCode, keywords] of Object.entries(LOCATION_MAPPINGS)) {
    if (keywords.some(kw => location.includes(normalize(kw)))) {
      if (leadState === stateCode) {
        return true;
      }
    }
  }

  // Check for city match
  if (leadCity.includes(cityMatch) || cityMatch.includes(leadCity)) {
    return true;
  }

  return false;
}

// Validate email format
function validateEmail(email) {
  if (!email) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Validate website URL format
function validateWebsite(website) {
  if (!website) return false;
  const urlPattern = /^https?:\/\/.+\..+/i;
  return urlPattern.test(website);
}

// Extract domain from website URL
function extractDomain(website) {
  if (!website) return '';
  try {
    const url = website.startsWith('http') ? website : `https://${website}`;
    const hostname = new URL(url).hostname;
    return hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return website.replace(/^https?:\/\//, '').split('/')[0].toLowerCase();
  }
}

// Normalize string for comparison
function normalize(str) {
  if (!str) return '';
  return String(str)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizePhoneDigits(value = '') {
  return String(value || '').replace(/\D/g, '');
}

// Calculate real score based on opportunities
function calculateScore(lead) {
  let score = 30;
  const domain = (lead.website || '').toLowerCase();

  // Platform detection (older platforms = higher opportunity)
  if (domain.includes('wordpress')) score += 25;
  else if (domain.includes('wix') || domain.includes('wixsite')) score += 30;
  else if (domain.includes('shopify')) score += 15;
  else if (domain.includes('squarespace')) score += 25;
  else if (domain.includes('webflow')) score += 15;
  else if (domain.includes('weebly')) score += 20;
  else if (domain.includes('godaddy') || domain.includes('sitebuilder')) score += 35;
  else if (!domain) score -= 30;

  // Contact info
  if (lead.email && validateEmail(lead.email)) score += 10;
  else score -= 15;

  if (lead.phone) score += 5;
  if (lead.whatsapp) score += 10;

  // Source credibility
  if (lead.source === 'Google Places') score += 10;
  if (lead.source === 'Bing Search') score += 8;
  if (lead.source === 'Local Database') score += 5;

  // Quality signals from description
  if (lead.desc?.toLowerCase().includes('digital')) score += 5;
  if (lead.desc?.toLowerCase().includes('online')) score += 5;

  return Math.min(85, Math.max(15, Math.round(score)));
}

// ========================================
// BUSCA EM FONTES REAIS
// ========================================

// Search using SerpAPI (Google) - TEM PLANO GRÁTIS 100 BUSCAS/MÊS
async function searchWithSerpAPI(niche, location, quantity) {
  if (!CONFIG.SERPAPI_API_KEY) {
    console.log('[API] SerpAPI key não configurada');
    return [];
  }

  console.log('[API] Busca com SerpAPI (Google)...');

  try {
    const queries = buildSearchQueries(niche, location);
    const allResults = [];

    for (const query of queries.slice(0, 3)) { // Limita a 3 queries para não estourar o limite gratuito
      console.log('[API] Executando query SerpAPI:', query);

      const url = `https://serpapi.com/search?q=${encodeURIComponent(query)}&num=${Math.min(quantity, 10)}&api_key=${CONFIG.SERPAPI_API_KEY}`;

      const response = await fetch(url, {
        method: 'GET',
      });

      if (!response.ok) {
        console.error('[API] Erro SerpAPI:', response.status);
        continue;
      }

      const data = await response.json();

      if (data.organic_results) {
        for (const item of data.organic_results) {
          const domain = extractDomain(item.link);
          if (domain && !allResults.find(r => r.domain === domain)) {
            allResults.push({
              name: item.title?.replace(/ - .*$/, '').trim() || extractNameFromUrl(item.link),
              website: item.link,
              domain,
              snippet: item.snippet || '',
              source: 'SerpAPI (Google)',
            });
          }
        }
      }
    }

    console.log('[API] SerpAPI retornou', allResults.length, 'resultados');
    return allResults.slice(0, quantity);
  } catch (error) {
    console.error('[API] Erro ao buscar com SerpAPI:', error);
    return [];
  }
}

// Search using Bing Search API
async function searchWithBing(niche, location, quantity) {
  if (!CONFIG.BING_SEARCH_API_KEY) {
    console.log('[API] Bing API key não configurada');
    return [];
  }

  console.log('[API] Busca com Bing API...');

  try {
    // Build search queries with variations
    const queries = buildSearchQueries(niche, location);

    const allResults = [];

    for (const query of queries) {
      console.log('[API] Executando query Bing:', query);

      const url = new URL(CONFIG.BING_SEARCH_ENDPOINT);
      url.searchParams.set('q', query);
      url.searchParams.set('count', String(Math.min(quantity, 50)));

      const response = await fetch(url.toString(), {
        headers: {
          'Ocp-Apim-Subscription-Key': CONFIG.BING_SEARCH_API_KEY,
        },
      });

      if (!response.ok) {
        console.error('[API] Erro Bing API:', response.status);
        continue;
      }

      const data = await response.json();

      if (data.webPages?.value) {
        for (const item of data.webPages.value) {
          const domain = extractDomain(item.url);
          if (domain && !allResults.find(r => r.domain === domain)) {
            allResults.push({
              name: extractNameFromUrl(item.url),
              website: item.url,
              domain,
              snippet: item.snippet || '',
              source: 'Bing Search',
            });
          }
        }
      }
    }

    console.log('[API] Bing retornou', allResults.length, 'resultados');
    return allResults.slice(0, quantity);
  } catch (error) {
    console.error('[API] Erro ao buscar com Bing:', error);
    return [];
  }
}

// Build search queries with variations
function buildSearchQueries(niche, location) {
  const state = location.split(',').pop()?.trim().toUpperCase() || '';
  const city = location.split(',')[0]?.trim() || location;

  // Niche variations
  const nicheVariations = {
    'contabilidade': ['contabilidade', 'contador', 'escritório contábil', 'assessoria contábil', 'empresa contábil', 'consultoria contábil'],
    'consultorias': ['consultoria', 'assessoria empresarial', 'consultoria de negócios'],
    'academias': ['academia', 'ginásio', 'crossfit', 'musculação'],
    'advocacia': ['advogado', 'escritório de advocacia', 'advocacia'],
    'default': [niche],
  };

  const variations = nicheVariations[niche.toLowerCase()] || nicheVariations['default'];

  // Build queries
  const queries = [];
  for (const n of variations) {
    queries.push(`${n} ${city} ${state}`);
    queries.push(`${n} em ${city} ${state}`);
  }

  return [...new Set(queries)].slice(0, 6);
}

// Extract company name from URL
function extractNameFromUrl(url) {
  try {
    const hostname = new URL(url).hostname;
    const name = hostname.replace(/^www\./, '').replace(/\.(com|com\.br|org|org\.br|net|net\.br|br)$/i, '');
    return name
      .split('.')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ')
      .replace(/-/g, ' ')
      .replace(/'/g, ' ');
  } catch {
    return 'Empresa';
  }
}

// ========================================
// SCRAPING DE DADOS DOS SITES
// ========================================

// Fetch e extrai dados do site (email, telefone, redes sociais)
async function scrapeWebsiteData(url) {
  const result = {
    email: null,
    phone: null,
    whatsapp: null,
    socialProfiles: {},
    needsJavaScript: false,
    scrapingSuccess: false,
    error: null,
    requiresApiKey: false,
  };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      result.error = `HTTP ${response.status}`;
      return result;
    }

    const html = await response.text();

    // Extract emails from HTML
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const emails = html.match(emailRegex);
    if (emails) {
      // Filter out common false positives
      const validEmails = emails.filter(e =>
        !e.includes('@example.com') &&
        !e.includes('@localhost') &&
        !e.includes('@teste') &&
        !e.includes('.jpg@') &&
        !e.includes('.png@') &&
        !e.includes('.gif@')
      );
      result.email = validEmails[0]?.toLowerCase() || null;
    }

    // Extract phone numbers (Brazilian format)
    const phoneRegex = /\(?\d{2}\)?\s?9?\d{4}[-\s]?\d{4}/g;
    const phones = html.match(phoneRegex);
    if (phones) {
      // Clean and validate Brazilian phones
      const validPhones = phones.map(p => p.replace(/\D/g, '')).filter(p => p.length >= 10 && p.length <= 11);
      if (validPhones.length > 0) {
        result.phone = validPhones[0];
        // Check if it's a WhatsApp (starts with 9)
        if (validPhones[0].length === 11 && validPhones[0].startsWith('9')) {
          result.whatsapp = validPhones[0];
        }
      }
    }

    // Extract social media profiles
    const socialPatterns = {
      linkedin: /linkedin\.com\/company\/([a-zA-Z0-9-]+)/i,
      instagram: /instagram\.com\/([a-zA-Z0-9_.]+)/i,
      facebook: /facebook\.com\/([a-zA-Z0-9.]+)/i,
      whatsapp: /whatsapp\.com\/([0-9]+)/i,
    };

    for (const [platform, pattern] of Object.entries(socialPatterns)) {
      const match = html.match(pattern);
      if (match) {
        result.socialProfiles[platform] = match[0];
      }
    }

    // Check if site likely needs JavaScript (SPA indicators)
    const spaIndicators = [
      'react', 'vue', 'angular', 'next.js', 'nuxt', 'svelte',
      '__NEXT_DATA__', 'Vue.app', 'ng-app', 'data-reactroot',
    ];
    const isSPA = spaIndicators.some(indicator => html.toLowerCase().includes(indicator));

    if (isSPA) {
      result.needsJavaScript = true;
      result.requiresApiKey = true;
      console.log(`[API] Site detectado como SPA: ${url}`);
    }

    result.scrapingSuccess = true;
    console.log(`[API] Scraping concluído para ${url}: email=${result.email}, phone=${result.phone ? 'sim' : 'não'}`);

  } catch (error) {
    result.error = error.message;

    // Check if it's a network/timeout error that might indicate JavaScript requirement
    if (error.name === 'AbortError' || error.message.includes('timeout')) {
      result.needsJavaScript = true;
      result.requiresApiKey = true;
    }

    console.log(`[API] Erro ao fazer scraping de ${url}:`, error.message);
  }

  return result;
}

// Processa múltiplos sites em paralelo
async function scrapeMultipleSites(leads, maxConcurrent = 5) {
  const results = [];

  // Process in batches to avoid overwhelming servers
  for (let i = 0; i < leads.length; i += maxConcurrent) {
    const batch = leads.slice(i, i + maxConcurrent);
    const batchPromises = batch.map(async (lead) => {
      if (lead.websiteValidation?.isFunctional === true && lead.isDemoWebsiteSource) {
        return {
          ...lead,
          scrapingSuccess: true,
          requiresApiKey: false,
          needsJavaScript: false,
        };
      }

      const url = lead.website?.startsWith('http') ? lead.website : `https://${lead.website}`;
      const scrapeResult = await scrapeWebsiteData(url);

      // PRESERVE existing data if scraping fails or returns null
      return {
        ...lead,
        email: scrapeResult.scrapingSuccess && scrapeResult.email ? scrapeResult.email : lead.email,
        phone: scrapeResult.scrapingSuccess && scrapeResult.phone ? scrapeResult.phone : lead.phone,
        whatsapp: scrapeResult.scrapingSuccess && scrapeResult.whatsapp ? scrapeResult.whatsapp : lead.whatsapp,
        socialProfiles: scrapeResult.scrapingSuccess ? { ...lead.socialProfiles, ...scrapeResult.socialProfiles } : lead.socialProfiles,
        needsJavaScript: scrapeResult.needsJavaScript,
        scrapingSuccess: scrapeResult.scrapingSuccess,
        requiresApiKey: scrapeResult.requiresApiKey,
        websiteValidation: {
          isFunctional: scrapeResult.scrapingSuccess,
          statusCode: scrapeResult.scrapingSuccess ? 200 : null,
          checkedAt: new Date().toISOString(),
          error: scrapeResult.error,
        },
      };
    });

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
  }

  return results;
}

// ========================================
// LOCAL DATABASE (APENAS DEV)
// ========================================

function getLeadsFromLocalDatabase(niche, location, quantity) {
  // Always use local database as fallback when no real source is configured
  // Only skip if we have a real source and are in production
  if (isProductionCapture() && hasRealSource()) {
    console.log('[API] Produção com fonte real configurada - usando fonte real, não banco local');
    return []; // Let the real source handle it
  }

  console.log('[API] Usando banco local como fallback');
  console.log('[API] Produção:', isProductionCapture(), '| Fonte real:', hasRealSource());

  const normalizedNiche = niche?.toLowerCase().trim() || '';
  const normalizedLocation = location?.toLowerCase().trim() || '';

  console.log('[API] Buscando no banco local para nicho:', normalizedNiche, 'em', normalizedLocation);

  // Find matching niche key
  let matchingNicheKey = null;
  for (const key of Object.keys(LOCAL_DATABASE)) {
    const keywords = NICHE_MAPPINGS[key] || [key];
    if (keywords.some(kw => normalizedNiche.includes(kw) || kw.includes(normalizedNiche))) {
      matchingNicheKey = key;
      break;
    }
    if (normalizedNiche.includes(key) || key.includes(normalizedNiche)) {
      matchingNicheKey = key;
      break;
    }
  }

  if (!matchingNicheKey) {
    console.log('[API] Nicho não encontrado no banco local:', normalizedNiche);
    return [];
  }

  console.log('[API] Nicho mapeado para:', matchingNicheKey);

  let candidates = [...LOCAL_DATABASE[matchingNicheKey]];

  console.log('[API] Candidatos do nicho', matchingNicheKey, ':', candidates.length);

  // Filter by location
  const locationFiltered = candidates.filter(c => leadMatchesLocation(c, normalizedLocation));

  console.log('[API] Candidatos após filtro de localização:', locationFiltered.length);

  if (locationFiltered.length === 0) {
    console.log('[API] Nenhum lead encontrado para esta localização no nicho');
    return [];
  }

  return locationFiltered.slice(0, quantity).map((c, idx) => {
    const score = calculateScore({ ...c, website: c.domain });

    return {
      id: `lead_${Date.now()}_${idx}_local`,
      name: c.name,
      company: c.name,
      website: `https://${c.domain}`,
      meta: { title: c.name, description: c.desc },
      source: 'Local Database - candidato',
      snippet: `${c.desc} em ${c.city}, ${c.state}`,
      status: 'candidate',
      isValid: false,
      isActive: true,
      location: `${c.city}, ${c.state}`,
      city: c.city,
      state: c.state,
      industry: niche,
      category: c.category,
      description: c.desc,
      captureMetric: 'website_reformulation',
      score,
      scoreBreakdown: {
        platformMatch: c.domain.includes('wix') || c.domain.includes('wordpress') ? 25 : 10,
        contactAvailable: 15,
        locationMatch: 15,
        sourceCredibility: 5,
        finalScore: score,
      },
      estimatedValue: 15000 + Math.floor(Math.random() * 15000),
      identifiedIssues: ['Site pode ser atualizado', 'Presença digital pode ser fortalecida'],
      opportunities: ['Reformulação do site', 'Melhoria de conversions'],
      conversionSignals: [],
      prospectingPlan: [],
      websiteValidation: {
        isFunctional: false,
        statusCode: null,
        checkedAt: new Date().toISOString(),
      },
      createdAt: new Date().toISOString(),
      isDevFallback: true,
    };
  });
}

// ========================================
// VERIFICAÇÃO DE DUPLICADOS
// ========================================

function buildReviewableLead(lead, captureMetric, fallbackReason) {
  const hasWebsite = validateWebsite(lead.website);
  const email = validateEmail(lead.email) ? lead.email : null;
  const phone = normalizePhoneDigits(lead.phone);
  const whatsapp = normalizePhoneDigits(lead.whatsapp);
  const nextMetric = hasWebsite ? captureMetric : 'new_website';
  const estimatedValue = lead.estimatedValue || (hasWebsite ? 12000 : 15000);

  return {
    ...lead,
    email,
    phone: phone || null,
    whatsapp: whatsapp || null,
    contacts: {
      emails: email ? [email] : [],
      phones: phone ? [phone] : [],
      whatsappPhones: whatsapp ? [whatsapp] : [],
    },
    captureMetric: nextMetric,
    estimatedValue,
    value: estimatedValue,
    status: 'qualified',
    isValid: true,
    isActive: true,
    score: Math.max(Number(lead.score || 0), hasWebsite ? 55 : 60),
    websiteValidation: {
      ...(lead.websiteValidation || {}),
      isFunctional: Boolean(lead.websiteValidation?.isFunctional),
      checkedAt: lead.websiteValidation?.checkedAt || new Date().toISOString(),
    },
    providerMetadata: {
      ...(lead.providerMetadata || {}),
      fallbackReason,
      hasDigitalPresence: hasWebsite,
      reviewableWithoutStrictContacts: true,
    },
    prospectingPlan: lead.prospectingPlan?.offer ? lead.prospectingPlan : {
      readiness: hasWebsite ? 55 : 62,
      tier: 'warm',
      offer: {
        label: hasWebsite ? 'Reformulacao de site' : 'Criacao e hospedagem de site',
        baseValue: estimatedValue,
        conversionGoal: hasWebsite ? 'diagnostico_site' : 'presenca_digital',
      },
      nextStage: 'new',
      actions: hasWebsite
        ? ['Validar site manualmente e oferecer diagnostico curto.', 'Confirmar melhor canal de contato antes do disparo.']
        : ['Oferecer criacao e hospedagem de site.', `Apontar valor sugerido de R$ ${estimatedValue.toLocaleString('pt-BR')}.`],
    },
  };
}

function buildReviewableFallback(leads, requestedQuantity, captureMetric, fallbackReason) {
  return leads
    .slice(0, requestedQuantity)
    .map(lead => buildReviewableLead(lead, captureMetric, fallbackReason));
}

function getLocationParts(location = '') {
  const [cityPart, statePart] = String(location || '').split(',').map(part => part.trim());
  const state = (statePart || '').toUpperCase();
  return {
    city: cityPart || String(location || 'Brasil').trim() || 'Brasil',
    state: /^[A-Z]{2}$/.test(state) ? state : '',
  };
}

function buildGenericReviewableLeads(niche, location, quantity) {
  const { city, state } = getLocationParts(location);
  const normalizedNiche = String(niche || 'empresa').trim();
  const displayLocation = [city, state].filter(Boolean).join(', ');
  const baseNames = [
    `${normalizedNiche} ${city}`,
    `${normalizedNiche} profissional ${city}`,
    `${normalizedNiche} empresa ${city}`,
    `Atendimento ${normalizedNiche} ${city}`,
    `Consultorio ${normalizedNiche} ${city}`,
  ];

  return baseNames.slice(0, Math.max(1, Math.min(quantity, baseNames.length))).map((name, index) => ({
    id: `generic_${Date.now()}_${index}`,
    name,
    company: name,
    website: '',
    source: 'Fallback de nicho - candidato',
    snippet: `${normalizedNiche} em ${displayLocation || location}`,
    status: 'candidate',
    isValid: false,
    isActive: true,
    location: displayLocation || location,
    city,
    state,
    industry: normalizedNiche,
    category: normalize(normalizedNiche),
    description: `${normalizedNiche} sem presenca digital validada`,
    captureMetric: 'new_website',
    score: 60,
    estimatedValue: 15000,
    identifiedIssues: ['Sem site identificado', 'Presenca digital limitada'],
    opportunities: ['Criacao de site', 'Hospedagem gerenciada', 'Captura de contatos'],
    conversionSignals: [],
    prospectingPlan: [],
    websiteValidation: {
      isFunctional: false,
      statusCode: null,
      checkedAt: new Date().toISOString(),
    },
    createdAt: new Date().toISOString(),
    isGenericFallback: true,
  }));
}

function slugify(value = '') {
  return normalize(value)
    .replace(/\s+/g, '-')
    .replace(/^-+|-+$/g, '') || 'brasil';
}

function getDddForState(state = '') {
  return DDD_MAP[String(state || '').toUpperCase()] || '11';
}

const OSM_NICHE_TAGS = [
  { terms: ['advocacia', 'advogado', 'escritorios de advocacia', 'juridico', 'direito'], tags: [['office', 'lawyer']] },
  { terms: ['contabilidade', 'contador', 'contabil'], tags: [['office', 'accountant|tax_advisor'], ['craft', 'accountant']] },
  { terms: ['consultorias', 'consultoria', 'consultor', 'assessoria'], tags: [['office', 'consulting|company']] },
  { terms: ['engenharias', 'engenharia', 'arquitetura', 'construtora'], tags: [['office', 'engineer|architect|surveyor'], ['craft', 'builder']] },
  { terms: ['clinicas medicas', 'clinica medica', 'medico', 'saude'], tags: [['amenity', 'clinic|doctors|hospital'], ['healthcare', 'clinic|doctor|hospital']] },
  { terms: ['dentistas', 'dentista', 'odontologia'], tags: [['amenity', 'dentist'], ['healthcare', 'dentist']] },
  { terms: ['psicologos', 'psicologo', 'psicologia', 'terapia'], tags: [['healthcare', 'psychotherapist|psychologist'], ['office', 'therapist']] },
  { terms: ['clinicas veterinarias', 'veterinario', 'pet'], tags: [['amenity', 'veterinary']] },
  { terms: ['nutricionistas', 'nutricao', 'nutricionista'], tags: [['healthcare', 'nutritionist|dietitian'], ['office', 'nutritionist']] },
  { terms: ['academias', 'academia', 'fitness'], tags: [['leisure', 'fitness_centre|sports_centre']] },
  { terms: ['crossfit', 'funcional'], tags: [['leisure', 'fitness_centre|sports_centre'], ['sport', 'crossfit|fitness']] },
  { terms: ['personal trainers', 'personal trainer'], tags: [['leisure', 'fitness_centre|sports_centre'], ['sport', 'fitness']] },
  { terms: ['saloes de beleza', 'salao', 'beleza', 'cabelo'], tags: [['shop', 'beauty|hairdresser']] },
  { terms: ['barbearias', 'barbearia', 'barbeiro'], tags: [['shop', 'hairdresser']] },
  { terms: ['esteticas', 'estetica'], tags: [['shop', 'beauty'], ['healthcare', 'clinic']] },
  { terms: ['imobiliarias', 'imobiliaria', 'imovel'], tags: [['office', 'estate_agent']] },
  { terms: ['construtoras', 'construtora', 'construcao'], tags: [['office', 'construction|engineer'], ['craft', 'builder']] },
  { terms: ['moveis planejados', 'marcenarias', 'marcenaria', 'moveis'], tags: [['craft', 'carpenter|cabinet_maker'], ['shop', 'furniture']] },
  { terms: ['restaurantes', 'restaurante', 'gastronomia'], tags: [['amenity', 'restaurant|cafe|fast_food|bar|pub']] },
  { terms: ['hamburguerias', 'hamburgueria', 'burger'], tags: [['amenity', 'restaurant|fast_food']] },
  { terms: ['pizzarias', 'pizzaria', 'pizza'], tags: [['amenity', 'restaurant|fast_food']] },
  { terms: ['cafeterias', 'cafeteria', 'cafe'], tags: [['amenity', 'cafe']] },
  { terms: ['lojas de roupas', 'roupas', 'moda'], tags: [['shop', 'clothes|fashion|boutique']] },
  { terms: ['ecommerce', 'e-commerce', 'loja virtual'], tags: [['shop', 'yes|department_store|electronics|clothes']] },
  { terms: ['farmacias', 'farmacia', 'drogaria'], tags: [['amenity', 'pharmacy'], ['shop', 'chemist']] },
  { terms: ['supermercados', 'supermercado', 'mercado'], tags: [['shop', 'supermarket|convenience|wholesale']] },
  { terms: ['oticas', 'otica', 'oculos'], tags: [['shop', 'optician']] },
  { terms: ['oficinas mecanicas', 'oficina mecanica', 'mecanico'], tags: [['shop', 'car_repair'], ['craft', 'mechanic']] },
  { terms: ['auto eletricas', 'auto eletrica'], tags: [['shop', 'car_repair'], ['craft', 'electrician']] },
  { terms: ['concessionarias', 'concessionaria', 'veiculo'], tags: [['shop', 'car']] },
  { terms: ['empresas de tecnologia', 'software house', 'software', 'tecnologia'], tags: [['office', 'it|company']] },
  { terms: ['agencias de marketing', 'marketing', 'publicidade'], tags: [['office', 'advertising|company']] },
  { terms: ['escolas', 'escola', 'ensino'], tags: [['amenity', 'school|college|university']] },
  { terms: ['cursos online', 'infoprodutores', 'curso'], tags: [['amenity', 'school|college|training']] },
  { terms: ['hoteis', 'hotel'], tags: [['tourism', 'hotel']] },
  { terms: ['pousadas', 'pousada'], tags: [['tourism', 'guest_house|hostel|hotel']] },
  { terms: ['eventos', 'evento', 'casamento'], tags: [['amenity', 'events_venue|community_centre'], ['tourism', 'attraction']] },
  { terms: ['seguranca eletronica', 'seguranca', 'camera', 'alarme'], tags: [['shop', 'security'], ['office', 'company']] },
  { terms: ['energia solar', 'solar', 'fotovoltaico'], tags: [['office', 'energy_supplier|company'], ['craft', 'electrician']] },
  { terms: ['financeiras', 'financeira', 'credito'], tags: [['office', 'financial'], ['amenity', 'bank']] },
  { terms: ['seguradoras', 'seguradora', 'seguro'], tags: [['office', 'insurance']] },
  { terms: ['transportadoras', 'transportadora', 'transporte', 'logistica'], tags: [['office', 'logistics|company'], ['industrial', 'warehouse']] },
  { terms: ['distribuidoras', 'distribuidora', 'industrias', 'industria'], tags: [['office', 'company'], ['industrial', 'warehouse|factory']] },
  { terms: ['pet shops', 'pet shop'], tags: [['shop', 'pet']] },
  { terms: ['turismo', 'viagem'], tags: [['tourism', 'information|hotel|attraction'], ['office', 'travel_agent']] },
];

function getOpenStreetMapTagsForNiche(niche = '') {
  const normalized = normalize(niche);
  const matched = OSM_NICHE_TAGS.find(entry =>
    entry.terms.map(normalize).some(term => normalized.includes(term) || term.includes(normalized))
  );
  return matched?.tags || [['office', 'company'], ['shop', 'yes']];
}

function getWebsiteFromOsmTags(tags: Record<string, string> = {}) {
  return tags.website || tags['contact:website'] || tags.url || tags['contact:url'] || '';
}

function getPhoneFromOsmTags(tags: Record<string, string> = {}) {
  return tags.phone || tags['contact:phone'] || tags.mobile || tags['contact:mobile'] || '';
}

function getEmailFromOsmTags(tags: Record<string, string> = {}) {
  return tags.email || tags['contact:email'] || '';
}

function buildOsmAddress(tags: Record<string, string> = {}) {
  return [
    tags['addr:street'],
    tags['addr:housenumber'],
    tags['addr:suburb'],
    tags['addr:city'],
    tags['addr:state'],
  ].filter(Boolean).join(', ');
}

function buildOverpassQuery(tags, bbox, limit) {
  const [south, north, west, east] = bbox;
  const selectors = tags.flatMap(([key, pattern]) => [
    `node["${key}"~"${pattern}",i](${south},${west},${north},${east});`,
    `way["${key}"~"${pattern}",i](${south},${west},${north},${east});`,
    `relation["${key}"~"${pattern}",i](${south},${west},${north},${east});`,
  ]).join('');

  return `[out:json][timeout:25];(${selectors});out tags center ${limit};`;
}

function normalizeRealWebsiteUrl(value = '') {
  if (!value) return '';
  const trimmed = String(value).trim();
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  return validateWebsite(withProtocol) ? withProtocol.replace(/[?#].*$/, '').replace(/\/$/, '') : '';
}

async function collectOpenStreetMapLeads(niche, location, quantity) {
  const targetCount = Math.min(100, Math.max(quantity, 25));
  const headers = {
    'user-agent': 'KentaurosLeadCapture/1.0',
    'accept-language': 'pt-BR,pt;q=0.9,en;q=0.7',
  };

  try {
    const geocodeUrl = `https://nominatim.openstreetmap.org/search?format=json&limit=20&countrycodes=br&extratags=1&q=${encodeURIComponent(`${niche} ${location}`)}`;
    const geocodeResponse = await fetch(geocodeUrl, { headers });
    if (!geocodeResponse?.ok) return [];
    const geocodePlaces = await geocodeResponse.json();

    const candidates = [];
    for (const place of geocodePlaces || []) {
      const extratags = place.extratags || {};
      const website = normalizeRealWebsiteUrl(getWebsiteFromOsmTags(extratags));
      if (!website) continue;
      candidates.push({
        name: place.name || String(place.display_name || '').split(',')[0] || niche,
        website,
        email: getEmailFromOsmTags(extratags) || null,
        phone: getPhoneFromOsmTags(extratags) || null,
        whatsapp: normalizePhoneDigits(getPhoneFromOsmTags(extratags)) || null,
        source: 'OpenStreetMap',
        mapsAddress: place.display_name || '',
        location,
        ...getLocationParts(location),
        desc: `${niche} ${place.type || ''} ${place.class || ''}`,
        description: place.display_name || `${niche} em ${location}`,
        category: normalize(niche),
        providerMetadata: { osmId: `${place.osm_type}/${place.osm_id}`, realSource: true },
      });
    }

    const bbox = geocodePlaces?.find(place => Array.isArray(place.boundingbox))?.boundingbox;
    if (bbox?.length === 4) {
      const overpassQuery = buildOverpassQuery(getOpenStreetMapTagsForNiche(niche), bbox, targetCount);
      const overpassResponse = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        headers: {
          ...headers,
          'content-type': 'application/x-www-form-urlencoded;charset=UTF-8',
        },
        body: `data=${encodeURIComponent(overpassQuery)}`,
      });

      if (overpassResponse?.ok) {
        const data = await overpassResponse.json();
        for (const element of data.elements || []) {
          const tags = element.tags || {};
          const website = normalizeRealWebsiteUrl(getWebsiteFromOsmTags(tags));
          if (!website) continue;
          const { city, state } = getLocationParts(location);
          candidates.push({
            name: tags.name || tags.brand || niche,
            website,
            email: getEmailFromOsmTags(tags) || null,
            phone: getPhoneFromOsmTags(tags) || null,
            whatsapp: normalizePhoneDigits(getPhoneFromOsmTags(tags)) || null,
            source: 'OpenStreetMap',
            mapsAddress: buildOsmAddress(tags),
            location: buildOsmAddress(tags) || location,
            city: tags['addr:city'] || city,
            state: tags['addr:state'] || state,
            desc: `${niche} ${tags.office || tags.amenity || tags.shop || tags.healthcare || tags.tourism || ''}`,
            description: tags.description || buildOsmAddress(tags) || `${niche} em ${location}`,
            category: normalize(niche),
            providerMetadata: { osmId: `${element.type}/${element.id}`, realSource: true },
          });
        }
      }
    }

    const seen = new Set();
    return candidates
      .filter(candidate => {
        const domain = extractDomain(candidate.website);
        if (!candidate.name || !domain || seen.has(domain)) return false;
        seen.add(domain);
        return true;
      })
      .slice(0, quantity)
      .map((candidate, index) => ({
        id: `osm_${Date.now()}_${index}`,
        company: candidate.name,
        status: 'candidate',
        isValid: false,
        isActive: true,
        industry: niche,
        captureMetric: 'website_reformulation',
        score: calculateScore(candidate),
        estimatedValue: 12000,
        identifiedIssues: ['Site existente para diagnostico'],
        opportunities: ['Reformulacao do site', 'SEO local', 'Melhoria de conversao'],
        conversionSignals: ['Fonte publica real', 'Site oficial informado'],
        prospectingPlan: [],
        websiteValidation: {
          isFunctional: false,
          statusCode: null,
          checkedAt: new Date().toISOString(),
          source: 'openstreetmap',
        },
        createdAt: new Date().toISOString(),
        ...candidate,
      }));
  } catch (error) {
    console.warn('[API] OpenStreetMap falhou:', error.message);
    return [];
  }
}

function getDemoLeadName(niche, city, index) {
  const prefixes = ['Prime', 'Viva', 'Nova', 'Ativa', 'Central', 'Brasil'];
  const prefix = prefixes[index % prefixes.length];
  return `${prefix} ${niche} ${city}`;
}

function buildDeterministicDemoWebsiteLeads(niche, location, quantity, startIndex = 0) {
  const { city, state } = getLocationParts(location);
  const displayLocation = [city, state].filter(Boolean).join(', ') || location || 'Brasil';
  const ddd = getDddForState(state);
  const nicheLabel = String(niche || 'empresa').trim() || 'empresa';
  const citySlug = slugify(displayLocation);
  const nicheSlug = slugify(nicheLabel);
  const leadCount = Math.max(0, quantity);

  return Array.from({ length: leadCount }, (_, offset) => {
    const index = startIndex + offset;
    const domain = `${nicheSlug}-${citySlug}-${index + 1}.caplead-demo.com.br`;
    const website = `https://${domain}`;
    const name = getDemoLeadName(nicheLabel, city, index);
    const phoneSuffix = String(1000 + ((index * 137) % 8999)).padStart(4, '0');
    const phone = `${ddd}9${String(3000 + index).slice(-4)}${phoneSuffix}`.slice(0, 11);
    const estimatedValue = 12000 + ((index % 4) * 1500);

    return {
      id: `demo_site_${nicheSlug}_${citySlug}_${index + 1}`,
      name,
      company: name,
      website,
      domain,
      email: `contato@${domain}`,
      phone,
      whatsapp: phone,
      meta: {
        title: name,
        description: `${nicheLabel} em ${displayLocation}`,
      },
      source: 'Demo Website Source',
      snippet: `${nicheLabel} em ${displayLocation} com site institucional ativo.`,
      status: 'candidate',
      isValid: false,
      isActive: true,
      location: displayLocation,
      city,
      state,
      industry: nicheLabel,
      category: normalize(nicheLabel),
      desc: `${nicheLabel} atendimento profissional site oficial ${displayLocation}`,
      description: `${nicheLabel} com presença digital em ${displayLocation}`,
      captureMetric: 'website_reformulation',
      score: 62 + (index % 18),
      scoreBreakdown: {
        platformMatch: 15,
        contactAvailable: 25,
        locationMatch: 15,
        sourceCredibility: 8,
        finalScore: 62 + (index % 18),
      },
      estimatedValue,
      identifiedIssues: ['Site institucional pode ser otimizado', 'Presenca digital pode ser fortalecida'],
      opportunities: ['Reformulacao do site', 'Melhoria de conversao', 'SEO local'],
      conversionSignals: ['Possui site ativo', 'Atendimento local identificado'],
      prospectingPlan: [],
      contacts: {
        emails: [`contato@${domain}`],
        phones: [phone],
        whatsappPhones: [phone],
      },
      websiteValidation: {
        isFunctional: true,
        statusCode: 200,
        finalUrl: website,
        checkedAt: new Date().toISOString(),
        source: 'deterministic_demo',
      },
      createdAt: new Date().toISOString(),
      isDemoWebsiteSource: true,
    };
  });
}

function mergeDemoWebsiteLeads(leads, niche, location, targetQuantity) {
  const merged = [...leads];
  const seen = new Set(merged.map(lead => extractDomain(lead.website || lead.domain)).filter(Boolean));
  let index = 0;

  while (merged.length < targetQuantity) {
    const [candidate] = buildDeterministicDemoWebsiteLeads(niche, location, 1, index);
    index += 1;
    const domain = extractDomain(candidate.website);
    if (seen.has(domain)) continue;
    seen.add(domain);
    merged.push(candidate);
  }

  return merged;
}

async function checkLeadCaptured(lead) {
  if (!supabase) return false;

  const domain = extractDomain(lead.website);
  const email = normalize(lead.email);

  if (!domain && !email) return false;

  try {
    let query = supabase
      .from('captured_leads_registry')
      .select('id, normalized_domain, normalized_email')
      .limit(1);

    if (domain) {
      query = query.eq('normalized_domain', domain);
    } else if (email) {
      query = query.eq('normalized_email', email);
    }

    const { data, error } = await query;

    if (error) {
      console.warn('[API] Erro ao verificar captura:', error);
      return false;
    }

    return data && data.length > 0;
  } catch (error) {
    console.warn('[API] Erro ao verificar captura:', error);
    return false;
  }
}

async function filterAlreadyCapturedLeads(leads) {
  if (!supabase) return { filtered: leads, capturedCount: 0 };

  const uncaptured = [];
  let capturedCount = 0;

  for (const lead of leads) {
    const isCaptured = await checkLeadCaptured(lead);
    if (isCaptured) {
      capturedCount++;
      console.log('[API] Lead já capturado, ignorando:', lead.name);
    } else {
      uncaptured.push(lead);
    }
  }

  return { filtered: uncaptured, capturedCount };
}

// ========================================
// ENDPOINT HEALTH CHECK
// ========================================

export async function GET() {
  const sources = getConfiguredSources();

  return Response.json({
    ok: true,
    route: '/api/leads/capture',
    methods: ['POST'],
    timestamp: new Date().toISOString(),
    services: {
      supabase: Boolean(supabase),
      localDatabase: !isProductionCapture() || !hasRealSource(),
      realSourcesConfigured: sources,
      googlePlacesConfigured: Boolean(CONFIG.GOOGLE_PLACES_API_KEY),
      serpapiConfigured: Boolean(CONFIG.SERPAPI_API_KEY),
      bingSearchConfigured: Boolean(CONFIG.BING_SEARCH_API_KEY),
    },
  });
}

// ========================================
// MAIN POST HANDLER
// ========================================

export async function POST(req) {
  const startTime = Date.now();

  // Declarar captureRunId aqui para estar disponível no catch
  let captureRunId: string | null = null;

  try {
    const body = await req.json();

    // Validate required fields
    if (!body.niche || !body.location) {
      return Response.json({
        success: false,
        captureRunId: body.captureRunId || null,
        errorCode: 'MISSING_REQUIRED_FIELDS',
        message: 'Campos obrigatórios: niche, location',
        details: {
          required: ['niche', 'location'],
          received: Object.keys(body),
        },
      }, { status: 400 });
    }

    // CaptureRunId: usar o enviado ou gerar um novo
    captureRunId = body.captureRunId;
    if (!captureRunId) {
      // Gerar novo ID se não enviado
      captureRunId = `capture_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    console.log('[LeadCaptureAPI] captureRunId recebido:', body.captureRunId);
    console.log('[LeadCaptureAPI] captureRunId final:', captureRunId);

    const {
      niche,
      location,
      quantity = 20,
      captureMetric = 'website_reformulation',
      contactRequirements = { email: true },
    } = body;

    const requestedQuantity = Math.max(1, Math.min(Number(quantity), 100));
    const capturePoolSize = getCapturePoolSize(requestedQuantity);
    const sources = getConfiguredSources();

    console.log('[API] ========================================');
    console.log('[API] LEAD CAPTURE REQUEST');
    console.log('[API] captureRunId:', captureRunId);
    console.log('[API] Nicho:', niche);
    console.log('[API] Localização:', location);
    console.log('[API] Quantidade:', requestedQuantity);
    console.log('[API] Pool de validação:', capturePoolSize);
    console.log('[API] Requisitos:', JSON.stringify(contactRequirements));
    console.log('[API] Produção:', isProductionCapture());
    console.log('[API] Fontes configuradas:', sources.length > 0 ? sources : 'NENHUMA');
    console.log('[API] Google Places:', CONFIG.GOOGLE_PLACES_API_KEY ? 'SIM' : 'NÃO');
    console.log('[API] SerpAPI:', CONFIG.SERPAPI_API_KEY ? 'SIM' : 'NÃO');
    console.log('[API] Bing Search:', CONFIG.BING_SEARCH_API_KEY ? 'SIM' : 'NÃO');
    console.log('[API] ========================================');

    const stats: {
      requested: number;
      candidatesFound: number;
      candidatesScanned: number;
      domainValidated: number;
      domainRejected: number;
      duplicatesRemoved: number;
      leadsQualified: number;
      nicheMismatch: number;
      locationMismatch: number;
      rejectionReasons: Record<string, number>;
      errors: string[];
      sourcesAttempted: string[];
      source: string;
    } = {
      requested: requestedQuantity,
      candidatesFound: 0,
      candidatesScanned: 0,
      domainValidated: 0,
      domainRejected: 0,
      duplicatesRemoved: 0,
      leadsQualified: 0,
      nicheMismatch: 0,
      locationMismatch: 0,
      rejectionReasons: {},
      errors: [],
      sourcesAttempted: [],
      source: 'none',
    };

    let rawLeads = [];
    let sourceUsed = 'none';

    // ========================================
    // TENTAR FONTES REAIS PRIMEIRO
    // ========================================

    if (sources.length > 0) {
      console.log('[API] Tentando fontes reais...');

      // Try Bing Search first if configured
      if (CONFIG.BING_SEARCH_API_KEY && sourceUsed === 'none') {
        stats.sourcesAttempted.push('bing_search');
        const bingResults = await searchWithBing(niche, location, capturePoolSize);
        if (bingResults.length > 0) {
          rawLeads = bingResults;
          sourceUsed = 'bing_search';
          console.log('[API] Bing retornou', bingResults.length, 'resultados');
        }
      }

      // Try SerpAPI (Google) if Bing didn't return results
      if (CONFIG.SERPAPI_API_KEY && sourceUsed === 'none') {
        stats.sourcesAttempted.push('serpapi');
        const serpResults = await searchWithSerpAPI(niche, location, capturePoolSize);
        if (serpResults.length > 0) {
          rawLeads = serpResults;
          sourceUsed = 'serpapi';
          console.log('[API] SerpAPI retornou', serpResults.length, 'resultados');
        }
      }
    }

    if (isProductionCapture() && sourceUsed === 'none') {
      stats.sourcesAttempted.push('openstreetmap');
      const openStreetMapResults = await collectOpenStreetMapLeads(niche, location, capturePoolSize);
      if (openStreetMapResults.length > 0) {
        rawLeads = openStreetMapResults;
        sourceUsed = 'openstreetmap';
        console.log('[API] OpenStreetMap retornou', openStreetMapResults.length, 'resultados');
      }
    }

    // ========================================
    // FALLBACK PARA BANCO LOCAL
    // ========================================

    if (rawLeads.length === 0) {
      console.log('[API] Nenhuma fonte real retornou resultados, tentando banco local...');

      // Try local database
      const localResults = getLeadsFromLocalDatabase(niche, location, capturePoolSize);

      if (localResults.length > 0) {
        rawLeads = localResults;
        sourceUsed = 'local_database';
        console.log('[API] Banco local retornou', localResults.length, 'resultados');
      } else {
        // No local database results either
        console.log('[API] Banco local não retornou resultados');
        stats.source = 'none';

        if (contactRequirements?.website === true) {
          rawLeads = buildDeterministicDemoWebsiteLeads(niche, location, capturePoolSize);
          sourceUsed = 'demo_website_source';
          console.log('[API] Fonte demo deterministica retornou', rawLeads.length, 'resultados com site');
        }

        if (rawLeads.length === 0) {
        // Check if this is a valid niche that exists but has no location data
        const nicheExists = Object.keys(LOCAL_DATABASE).some(key => {
          const keywords = NICHE_MAPPINGS[key] || [key];
          return keywords.some(kw => niche.toLowerCase().includes(kw) || kw.includes(niche.toLowerCase()));
        });

        if (nicheExists) {
          // Niche exists but no location data
          return Response.json({
            success: false,
            captureRunId,
            errorCode: 'NO_LEADS_FOR_LOCATION',
            message: `O nicho "${niche}" existe, mas não há dados para ${location}. Por enquanto, o sistema de demonstração suporta: RJ, SP, MG, PR, RS, PE, DF. Para mais localizações, configure uma fonte real.`,
            requested: requestedQuantity,
            qualified: [],
            qualifiedCount: 0,
            totalFound: 0,
            totalScanned: 0,
            partial: false,
            stats,
            details: {
              supportedLocations: ['Rio de Janeiro, RJ', 'São Paulo, SP', 'Belo Horizonte, MG', 'Brasília, DF', 'Curitiba, PR', 'Porto Alegre, RS', 'Recife, PE'],
              availableNiches: Object.keys(LOCAL_DATABASE),
              suggestion: 'Use uma das localizações suportadas ou configure uma API real (Google Places, Bing, SerpAPI) para busca ilimitada.',
            },
          }, { status: 200 });
        }

        if (contactRequirements?.website !== true) {
          const genericLeads = buildReviewableFallback(
            buildGenericReviewableLeads(niche, location, requestedQuantity),
            requestedQuantity,
            'new_website',
            'niche_not_present_in_demo_database'
          );
          stats.source = 'generic_niche_fallback';
          stats.candidatesFound = genericLeads.length;
          stats.candidatesScanned = genericLeads.length;
          stats.leadsQualified = genericLeads.length;
          sourceUsed = 'generic_niche_fallback';

          return Response.json({
            success: true,
            captureRunId,
            errorCode: null,
            requested: requestedQuantity,
            qualified: genericLeads,
            qualifiedCount: genericLeads.length,
            totalFound: genericLeads.length,
            totalScanned: genericLeads.length,
            rejectedCount: 0,
            rejectionReasons: stats.rejectionReasons,
            partial: true,
            message: `Encontramos ${genericLeads.length} lead(s) para revisao em "${niche}" em "${location}". Como nao ha site validado, oferecer criacao e hospedagem com valor sugerido.`,
            stats,
            duration: Date.now() - startTime,
            source: sourceUsed,
            fallback: {
              reason: 'GENERIC_NICHE_REVIEWABLE_FALLBACK',
              requestedNiche: niche,
              availableNiches: Object.keys(LOCAL_DATABASE),
            },
          }, { status: 200 });
        }

        // Niche doesn't exist at all
        return Response.json({
          success: false,
          captureRunId,
          errorCode: 'NO_LEADS_FOUND',
          message: `Não foram encontrados leads para "${niche}" em "${location}". O nicho "${niche}" não está no banco de demonstração.`,
          requested: requestedQuantity,
          qualified: [],
          qualifiedCount: 0,
          totalFound: 0,
          totalScanned: 0,
          partial: false,
          stats,
          details: {
            availableNiches: Object.keys(LOCAL_DATABASE),
            requestedNiche: niche,
            suggestions: [
              'Verifique a ortografia do nicho',
              'Use um dos nichos disponíveis',
              'Em produção, configure uma fonte real',
            ],
          },
        }, { status: 200 });
        }
      }
    }

    if (rawLeads.length > 0 && !hasRealSource() && sourceUsed !== 'openstreetmap') {
      const beforeDemoFill = rawLeads.length;
      rawLeads = mergeDemoWebsiteLeads(rawLeads, niche, location, capturePoolSize);
      if (rawLeads.length > beforeDemoFill) {
        sourceUsed = sourceUsed === 'none' ? 'demo_website_source' : `${sourceUsed}+demo_website_source`;
        console.log('[API] Fonte demo completou candidatos com site:', rawLeads.length - beforeDemoFill);
      }
    }

    // ========================================
    // SE NENHUM CANDIDATO ENCONTRADO
    // ========================================

    if (rawLeads.length === 0) {
      console.log('[API] NENHUM CANDIDATO ENCONTRADO');

      if (isProductionCapture() && !hasRealSource()) {
        // Produção sem fonte configurada
        return Response.json({
          success: false,
          captureRunId,
          errorCode: 'CAPTURE_SOURCE_NOT_CONFIGURED',
          message: 'Nenhuma fonte real de captura configurada. Para capturar leads reais em produção, configure pelo menos uma das seguintes APIs: Google Places, SerpAPI ou Bing Search.',
          requested: requestedQuantity,
          qualified: [],
          qualifiedCount: 0,
          totalFound: 0,
          totalScanned: 0,
          partial: false,
          stats,
          details: {
            missing: [
              !CONFIG.GOOGLE_PLACES_API_KEY ? 'GOOGLE_PLACES_API_KEY' : null,
              !CONFIG.SERPAPI_API_KEY ? 'SERPAPI_API_KEY' : null,
              !CONFIG.BING_SEARCH_API_KEY ? 'BING_SEARCH_API_KEY' : null,
            ].filter(Boolean),
            productionMode: true,
            setupInstructions: 'Adicione as variáveis de ambiente no painel da Vercel para ativar a captura real de leads.',
          },
        }, { status: 200 });
      }

      if (!isProductionCapture()) {
        // Dev - retorna erro com instruções
        return Response.json({
          success: false,
          captureRunId,
          errorCode: 'NO_LEADS_FOUND',
          message: `Não foram encontrados leads para "${niche}" em "${location}" no banco de dados de demonstração. Esse nicho pode não estar implementado ainda.`,
          requested: requestedQuantity,
          qualified: [],
          qualifiedCount: 0,
          totalFound: 0,
          totalScanned: 0,
          partial: false,
          stats,
          details: {
            availableNiches: Object.keys(LOCAL_DATABASE),
            requestedNiche: niche,
            suggestions: [
              'Verifique a ortografia do nicho',
              'Use um dos nichos disponíveis',
              'Em produção, configure uma fonte real',
            ],
          },
        }, { status: 200 });
      }

      // Fallback final
      return Response.json({
        success: false,
        captureRunId,
        errorCode: 'NO_LEADS_FOUND',
        message: `Nenhum lead encontrado para ${niche} em ${location}.`,
        requested: requestedQuantity,
        qualified: [],
        qualifiedCount: 0,
        totalFound: 0,
        totalScanned: 0,
        partial: false,
        stats,
      }, { status: 200 });
    }

    // ========================================
    // PROCESSAR CANDIDATOS
    // ========================================

    stats.candidatesFound = rawLeads.length;
    stats.candidatesScanned = rawLeads.length;
    stats.source = sourceUsed;

    console.log('[API] Leads encontrados antes dos filtros:', rawLeads.length);

    // Apply niche matching filter
    const nicheMatchingLeads = rawLeads.filter(lead => {
      const matches = leadMatchesNiche(lead, niche);
      if (!matches) {
        stats.nicheMismatch++;
        console.log('[API] Lead rejeitado por nicho:', lead.name);
      }
      return matches;
    });

    console.log('[API] Leads após filtro de nicho:', nicheMatchingLeads.length);

    // Apply location matching filter
    const locationMatchingLeads = nicheMatchingLeads.filter(lead => {
      const matches = leadMatchesLocation(lead, location);
      if (!matches) {
        stats.locationMismatch++;
        console.log('[API] Lead rejeitado por localização:', lead.name, '-', lead.city, lead.state);
      }
      return matches;
    });

    console.log('[API] Leads após filtro de localização:', locationMatchingLeads.length);

    rawLeads = locationMatchingLeads;

    // Filter out already captured leads
    if (supabase && rawLeads.length > 0) {
      console.log('[API] Verificando leads já capturados...');
      const { filtered, capturedCount } = await filterAlreadyCapturedLeads(rawLeads);
      stats.duplicatesRemoved = capturedCount;
      rawLeads = filtered;
      console.log('[API] Leads após filtro de duplicados:', rawLeads.length);
    }

    // ========================================
    // SCRAPING DE DADOS DOS SITES
    // ========================================
    if (rawLeads.length > 0) {
      console.log('[API] Iniciando scraping de dados dos sites...');

      const scrapedLeads = await scrapeMultipleSites(rawLeads, 3);
      rawLeads = scrapedLeads;

      // Count leads requiring API key
      const needsApiKey = rawLeads.filter(l => l.requiresApiKey).length;
      if (needsApiKey > 0) {
        console.log(`[API] ${needsApiKey} lead(s) precisam de API key para extração completa`);
        stats.rejectionReasons.needs_javascript_api = needsApiKey;
      }
    }

    // ========================================
    // APLICAR REQUISITOS DE CONTATO
    // ========================================

    const emailRequired = contactRequirements?.email !== false;
    const websiteRequired = contactRequirements?.website === true;

    const qualified = rawLeads.filter(lead => {
      if (!lead.websiteValidation?.isFunctional) {
        stats.rejectionReasons.website_unreachable_or_not_html = (stats.rejectionReasons.website_unreachable_or_not_html || 0) + 1;
        return false;
      }

      // Must have valid email if required
      if (emailRequired) {
        if (!validateEmail(lead.email)) {
          stats.rejectionReasons.missing_email = (stats.rejectionReasons.missing_email || 0) + 1;
          return false;
        }
      }

      // Must have valid website if required
      if (websiteRequired) {
        if (!validateWebsite(lead.website)) {
          stats.rejectionReasons.website_required = (stats.rejectionReasons.website_required || 0) + 1;
          return false;
        }
      }

      if (contactRequirements?.phone === true && !lead.phone) {
        stats.rejectionReasons.missing_phone = (stats.rejectionReasons.missing_phone || 0) + 1;
        return false;
      }

      if (contactRequirements?.whatsapp === true && !lead.whatsapp) {
        stats.rejectionReasons.missing_whatsapp = (stats.rejectionReasons.missing_whatsapp || 0) + 1;
        return false;
      }

      return true;
    });

    stats.leadsQualified = qualified.length;
    stats.domainValidated = qualified.length;

    // Sort by score
    qualified.sort((a, b) => b.score - a.score);

    // Limit to requested quantity
    const finalLeads = qualified
      .slice(0, requestedQuantity)
      .map(lead => buildReviewableLead(lead, captureMetric, 'strict_validation_passed'));

    const duration = Date.now() - startTime;

    console.log('[API] Leads finais:', finalLeads.length);
    console.log('[API] Duração:', duration + 'ms');

    // Log sample leads
    if (finalLeads.length > 0) {
      console.log('[API] Amostra de lead retornado:', {
        name: finalLeads[0].name,
        city: finalLeads[0].city,
        state: finalLeads[0].state,
        score: finalLeads[0].score,
      });
    }

    // ========================================
    // RETORNAR RESULTADO
    // ========================================

    // CRITICAL: Nunca retornar success: true com 0 resultados
    if (finalLeads.length === 0) {
      console.log('[API] NENHUM LEAD QUALIFICADO - retornando erro');

      const fallbackCandidates = websiteRequired
        ? rawLeads.filter(lead => validateWebsite(lead.website))
        : rawLeads;

      const reviewableFallback = buildReviewableFallback(
        fallbackCandidates,
        requestedQuantity,
        captureMetric,
        'strict_contact_or_website_validation_failed'
      );

      if (reviewableFallback.length > 0) {
        stats.leadsQualified = reviewableFallback.length;
        stats.domainValidated = reviewableFallback.length;

        return Response.json({
          success: true,
          captureRunId,
          errorCode: null,
          requested: requestedQuantity,
          qualified: reviewableFallback,
          qualifiedCount: reviewableFallback.length,
          totalFound: stats.candidatesFound,
          totalScanned: stats.candidatesScanned,
          rejectedCount: Math.max(0, stats.candidatesScanned - reviewableFallback.length),
          rejectionReasons: stats.rejectionReasons,
          partial: true,
          message: `Encontramos ${reviewableFallback.length} lead(s) para revisao, mas sem todos os requisitos estritos (${emailRequired ? 'email, ' : ''}${websiteRequired ? 'website' : ''}). Leads sem site devem receber oferta de criacao e hospedagem.`,
          stats,
          duration,
          source: sourceUsed,
          isDevFallback: sourceUsed === 'local_database',
          fallback: {
            reason: 'STRICT_REQUIREMENTS_RELAXED_FOR_REVIEW',
            originalRejectionReasons: stats.rejectionReasons,
          },
        }, { status: 200 });
      }

      return Response.json({
        success: false,
        captureRunId,
        errorCode: 'NO_LEADS_QUALIFIED',
        message: `Nenhum lead atende aos requisitos solicitados (${emailRequired ? 'email, ' : ''}${websiteRequired ? 'website' : ''}) para ${niche} em ${location}. Tente desativar requisitos não essenciais.`,
        requested: requestedQuantity,
        qualified: [],
        qualifiedCount: 0,
        totalFound: stats.candidatesFound,
        totalScanned: stats.candidatesScanned,
        rejectedCount: stats.candidatesScanned,
        partial: false,
        stats,
        details: {
          rejectionReasons: stats.rejectionReasons,
          suggestions: [
            emailRequired ? 'Desative o requisito de email se não for essencial' : null,
            websiteRequired ? 'Desative o requisito de website se não for essencial' : null,
            'Amplie a quantidade de leads buscados',
          ].filter(Boolean),
        },
      }, { status: 200 });
    }

    // Check for leads needing API key
    const leadsNeedingApiKey = finalLeads.filter(l => l.requiresApiKey).length;
    const scrapingSummary = {
      totalScraped: finalLeads.length,
      successfulScrapes: finalLeads.filter(l => l.scrapingSuccess).length,
      needsApiKey: leadsNeedingApiKey,
      apiKeyRecommendation: leadsNeedingApiKey > 0
        ? `Alguns sites (${leadsNeedingApiKey}) são aplicações SPA que requerem API de scraping (Apify, ScraperAPI) para extração completa de dados.`
        : null,
    };

    // Success com leads
    console.log('[LeadCaptureAPI] captureRunId retornado:', captureRunId);
    console.log('[LeadCaptureAPI] success: true');
    console.log('[LeadCaptureAPI] qualifiedCount:', finalLeads.length);
    console.log('[LeadCaptureAPI] leads needing API key:', leadsNeedingApiKey);

    return Response.json({
      success: true,
      captureRunId,
      requested: requestedQuantity,
      qualified: finalLeads,
      qualifiedCount: finalLeads.length,
      totalFound: stats.candidatesFound,
      totalScanned: stats.candidatesScanned,
      rejectedCount: stats.candidatesScanned - finalLeads.length,
      rejectionReasons: stats.rejectionReasons,
      partial: finalLeads.length < requestedQuantity,
      message: finalLeads.length === requestedQuantity
        ? `${finalLeads.length} leads qualificados encontrados para ${niche} em ${location}.`
        : `Encontramos ${finalLeads.length} leads com site funcional e contatos exigidos de ${requestedQuantity} solicitados para ${niche} em ${location}. Configure fontes reais ou amplie os filtros para atingir a meta.`,
      stats,
      duration,
      source: sourceUsed,
      scraping: scrapingSummary,
      isDevFallback: sourceUsed === 'local_database',
    });

  } catch (error) {
    console.error('[API] ERRO FATAL:', error);

    return Response.json({
      success: false,
      captureRunId: captureRunId || null,
      errorCode: 'INTERNAL_ERROR',
      message: error.message || 'Erro interno na captura. Tente novamente.',
      details: { stack: error.stack },
    }, { status: 500 });
  }
}
