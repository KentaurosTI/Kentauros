import express from 'express';
import cors from 'cors';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { captureLeads } from './leadCaptureEngine.js';
import { validateAndQualifyLeads } from './leadQualification.js';
import { collectExpandedCandidates } from './captureCandidateExpansion.js';
import { collectCapLeadMapsCandidates } from './capLeadMapsCapture.js';
import { ensureCapLeadPackage, getCapLeadDownloadConfig } from './capLeadDownload.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars from the root directory
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const port = process.env.PORT || 3001;
const GMAIL_MIN_INTERVAL_MS = Number(process.env.GMAIL_MIN_INTERVAL_MS || 12000);
let nextAvailableSendAt = Date.now();

const getCapturePoolSize = (requestedQuantity) =>
  Math.min(100, Math.max(requestedQuantity * 4, requestedQuantity + 40));

const getExpandedCandidateTarget = (requestedQuantity) =>
  Math.min(3000, Math.max(requestedQuantity * 100, 1000));

const getMapsCandidateTarget = (requestedQuantity) =>
  Math.min(60, Math.max(requestedQuantity * 2, requestedQuantity + 12));

const getLeadIdentity = (lead = {}) =>
  String(lead.website || lead.email || lead.id || lead.name || '')
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/$/, '');

const mergeUniqueLeads = (...groups) => {
  const seen = new Set();
  return groups.flat().filter((lead) => {
    const identity = getLeadIdentity(lead);
    if (!identity || seen.has(identity)) return false;
    seen.add(identity);
    return true;
  });
};

app.use(cors());
app.use(express.json());

app.get('/api/system-health', (req, res) => {
  res.status(200).json({
    ok: true,
    timestamp: new Date().toISOString(),
    services: {
      email: {
        configured: Boolean(process.env.SMTP_USER && process.env.SMTP_PASS),
        minIntervalMs: GMAIL_MIN_INTERVAL_MS,
      },
      capture: {
        bingApiConfigured: Boolean(process.env.BING_SEARCH_API_KEY),
        googlePlacesConfigured: Boolean(process.env.GOOGLE_PLACES_API_KEY),
        serpApiConfigured: Boolean(process.env.SERP_API_KEY),
        fallbackSearchEnabled: true,
      },
    },
  });
});

app.get('/api/caplead/download', async (req, res) => {
  try {
    const config = await ensureCapLeadPackage(getCapLeadDownloadConfig());
    res.download(config.packagePath, config.filename);
  } catch (error) {
    console.error('[CapLead Download] Failed:', error);
    res.status(404).json({
      error: 'CAPLEAD_DOWNLOAD_UNAVAILABLE',
      message: 'Pacote do CapLead não encontrado. Gere a build mais recente antes de tentar o download.',
    });
  }
});

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const waitForGmailSlot = async () => {
  const now = Date.now();
  const scheduledAt = Math.max(now, nextAvailableSendAt);
  nextAvailableSendAt = scheduledAt + GMAIL_MIN_INTERVAL_MS;

  if (scheduledAt > now) {
    await wait(scheduledAt - now);
  }
};

// Create transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

app.post('/api/send-email', async (req, res) => {
  const { to, subject, html } = req.body;

  if (!to || !subject || !html) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    await waitForGmailSlot();

    const info = await transporter.sendMail({
      from: `"Kentauros Consulting" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
      attachments: [
        {
          filename: 'Assinatura.png',
          path: path.resolve(__dirname, '../public/Assinatura.png'),
          cid: 'assinatura'
        }
      ]
    });

    console.log('Message sent: %s', info.messageId);
    res.status(200).json({ success: true, messageId: info.messageId });
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({ error: 'Failed to send email' });
  }
});

// ========================================
// DATABASE LOCAL DE FALLBACK
// ========================================
const LOCAL_DATABASE = {
  'personal trainers': [
    { name: 'Personal Fit Pro', domain: 'personafitpro.com.br', city: 'Rio de Janeiro', state: 'RJ', desc: 'Treino personalizado' },
    { name: 'Coach Esportivo RJ', domain: 'coachesportivorio.com.br', city: 'Rio de Janeiro', state: 'RJ', desc: 'Preparação física' },
    { name: 'Personal em Casa RJ', domain: 'personalemcasarij.com.br', city: 'Rio de Janeiro', state: 'RJ', desc: 'Treino domiciliar' },
    { name: 'Fitness Coach SP', domain: 'fitnesscoachsp.com.br', city: 'São Paulo', state: 'SP', desc: 'Emagrecimento' },
    { name: 'Personal Musculação SP', domain: 'personalmusculacaosp.com.br', city: 'São Paulo', state: 'SP', desc: 'Musculação orientada' },
    { name: 'Coach Corrida Brasil', domain: 'coachcorridabrasil.com.br', city: 'São Paulo', state: 'SP', desc: 'Corrida e triathlon' },
    { name: 'Personal Yoga SP', domain: 'personalyogasp.com.br', city: 'São Paulo', state: 'SP', desc: 'Yoga e meditação' },
    { name: 'Nutri Fit Coach BH', domain: 'nutrifitcoachbh.com.br', city: 'Belo Horizonte', state: 'MG', desc: 'Fitness e nutrição' },
    { name: 'Personal Funcional PR', domain: 'personafuncionalpr.com.br', city: 'Curitiba', state: 'PR', desc: 'Funcional e Pilates' },
    { name: 'Coach Esportivo BH', domain: 'coachesportivobh.com.br', city: 'Belo Horizonte', state: 'MG', desc: 'Preparação física' },
  ],
  'academias': [
    { name: 'Smart Fit', domain: 'smartfit.com.br', city: 'São Paulo', state: 'SP', desc: 'Rede de academias' },
    { name: 'Bluefit', domain: 'bluefit.com.br', city: 'Rio de Janeiro', state: 'RJ', desc: 'Academia moderna' },
    { name: 'Bodytech', domain: 'bodytech.com.br', city: 'Belo Horizonte', state: 'MG', desc: 'Musculação especializada' },
    { name: 'Academia Cultural', domain: 'academiacultural.com.br', city: 'Curitiba', state: 'PR', desc: 'Fitness e bem-estar' },
    { name: 'Power Academia', domain: 'poweracademia.com.br', city: 'São Paulo', state: 'SP', desc: 'Musculação e funcional' },
    { name: 'Fit Academy', domain: 'fitacademy.com.br', city: 'São Paulo', state: 'SP', desc: 'Crossfit e funcional' },
  ],
  'restaurantes': [
    { name: 'Restaurante Fasano', domain: 'fasano.com.br', city: 'São Paulo', state: 'SP', desc: 'Culinária italiana' },
    { name: 'Outback Steakhouse', domain: 'outback.com.br', city: 'Rio de Janeiro', state: 'RJ', desc: 'Carnes e massas' },
    { name: 'Coco Bambum', domain: 'cocobambum.com.br', city: 'Recife', state: 'PE', desc: 'Frutos do mar' },
    { name: 'Giuseppe Grill', domain: 'giuseppegrill.com.br', city: 'Belo Horizonte', state: 'MG', desc: 'Churrascaria premium' },
    { name: 'Restaurante Madeira', domain: 'madeirarestaurante.com.br', city: 'São Paulo', state: 'SP', desc: 'Culinária portuguesa' },
  ],
  'nutricionistas': [
    { name: 'Nutri Mariana Silva', domain: 'nutrimarianasilva.com.br', city: 'São Paulo', state: 'SP', desc: 'Nutrição clínica' },
    { name: 'Clínica Nutri Live', domain: 'nutrilive.com.br', city: 'São Paulo', state: 'SP', desc: 'Nutrição esportiva' },
    { name: 'Instituto Nutri Vida', domain: 'institutonutrivida.com.br', city: 'Rio de Janeiro', state: 'RJ', desc: 'Nutrição integrativa' },
    { name: 'Centro Nutrir', domain: 'centronutrir.com.br', city: 'Curitiba', state: 'PR', desc: 'Emagrecimento' },
    { name: 'Vitalis Nutrição', domain: 'vitalisnutri.com.br', city: 'Belo Horizonte', state: 'MG', desc: 'Nutrição e bem-estar' },
  ],
  'clínicas médicas': [
    { name: 'Hospital Albert Einstein', domain: 'einstein.br', city: 'São Paulo', state: 'SP', desc: 'Hospital de referência' },
    { name: 'Rede DOr São Luiz', domain: 'rededorsaoluis.com.br', city: 'Rio de Janeiro', state: 'RJ', desc: 'Rede hospitalar' },
    { name: 'Clínica São Vicente', domain: 'saovicenteclinica.com.br', city: 'São Paulo', state: 'SP', desc: 'Clínica geral' },
    { name: 'Hospital Moinhos', domain: 'moinhos.org.br', city: 'Porto Alegre', state: 'RS', desc: 'Hospital especializado' },
  ],
  'ecommerce': [
    { name: 'Magazine Luiza', domain: 'magazineluiza.com.br', city: 'São Paulo', state: 'SP', desc: 'Varejo online' },
    { name: 'Americanas', domain: 'americanas.com', city: 'Rio de Janeiro', state: 'RJ', desc: 'Marketplace' },
    { name: 'Shoptime', domain: 'shoptime.com.br', city: 'São Paulo', state: 'SP', desc: 'E-commerce' },
    { name: 'Submarino', domain: 'submarino.com.br', city: 'São Paulo', state: 'SP', desc: 'Loja virtual' },
    { name: 'Casas Bahia', domain: 'casasbahia.com.br', city: 'São Paulo', state: 'SP', desc: 'Varejo e-commerce' },
  ],
};

// Função para buscar do database local
function getLeadsFromLocalDatabase(niche, location, quantity) {
  const normalizedNiche = niche.toLowerCase().trim();
  let candidates = [];

  // Buscar no nicho especificado
  for (const [key, leads] of Object.entries(LOCAL_DATABASE)) {
    if (normalizedNiche.includes(key) || key.includes(normalizedNiche)) {
      candidates.push(...leads);
    }
  }

  // Se não encontrou, buscar em todos
  if (candidates.length === 0) {
    candidates = Object.values(LOCAL_DATABASE).flat();
  }

  // Filtrar por localização
  if (location) {
    const loc = location.toLowerCase();
    const filtered = candidates.filter(c => {
      const cityMatch = c.city?.toLowerCase().includes(loc) || loc.includes(c.city?.toLowerCase());
      const stateMatch = c.state?.toLowerCase().includes(loc) || loc.includes(c.state?.toLowerCase());
      const brasilMatch = loc.includes('brasil') || loc === 'br';
      return cityMatch || stateMatch || brasilMatch;
    });
    if (filtered.length > 0) candidates = filtered;
  }

  return candidates.slice(0, quantity).map((c, idx) => {
    return {
      id: `local_candidate_${Date.now()}_${idx}`,
      name: c.name,
      website: `https://${c.domain}`,
      source: 'Base de Dados - candidato',
      location: `${c.city}, ${c.state}`,
      niche: c.desc,
      city: c.city,
      state: c.state,
      description: c.desc,
    };
  });
}

async function executeLeadCapture(config, captureRunId, onProgress = () => {}) {
  const quantity = Math.max(1, Math.min(Number(config.quantity || 20), 100));
  const capturePoolSize = getCapturePoolSize(quantity);
  const expandedCandidateTarget = getExpandedCandidateTarget(quantity);
  const startTime = Date.now();
  const stats = {
    requested: quantity,
    candidatesFound: 0,
    candidatesScanned: 0,
    domainValidated: 0,
    domainRejected: 0,
    duplicatesRemoved: 0,
    rejectionReasons: {},
    errors: [],
    source: 'local_database',
    capturePoolSize,
    expandedCandidateTarget,
  };

  let rawLeads = [];

  onProgress({
    progress: 15,
    phaseLabel: `Iniciando captura Maps-first: meta ${quantity} leads validados`,
    stats,
    total_found: 0,
    total_valid: 0,
  });

  try {
    onProgress({
      progress: 20,
      phaseLabel: 'Pesquisando empresas reais no Google Maps...',
      stats,
      total_found: 0,
      total_valid: 0,
    });

    const mapsTarget = getMapsCandidateTarget(quantity);
    const mapsCandidates = await collectCapLeadMapsCandidates({
      niche: config.niche,
      location: config.location,
      contactRequirements: config.contactRequirements || { email: true },
    }, {
      targetCount: mapsTarget,
      maxPlacesPerQuery: Math.max(quantity * 3, 50),
      maxScrollsPerQuery: 10,
      onProgress: (mapsProgress) => {
        const found = Number(mapsProgress.found || 0);
        const mapsPercent = Number(mapsProgress.percent || 0);
        onProgress({
          phase: mapsProgress.phase || 'searching',
          progress: Math.max(20, Math.min(58, 20 + Math.round(mapsPercent * 0.38))),
          phaseLabel: mapsProgress.message || `Google Maps: ${found}/${mapsTarget} candidatos oficiais`,
          total_found: found,
          total_valid: 0,
          stats: {
            ...stats,
            candidatesFound: found,
            source: 'google_maps_caplead',
            mapsPhase: mapsProgress.phase,
            currentLead: mapsProgress.currentLead || '',
          },
        });
      },
    });

    rawLeads = [...rawLeads, ...mapsCandidates];
    stats.source = 'google_maps_caplead';
    stats.mapsCandidates = mapsCandidates.length;
  } catch (mapsError) {
    stats.errors.push(`maps: ${mapsError.message}`);
    onProgress({
      progress: 24,
      phaseLabel: `Google Maps indisponível (${mapsError.message}). Usando fallback de captura.`,
      stats,
      total_found: rawLeads.length,
      total_valid: 0,
    });
  }

  if (rawLeads.length < capturePoolSize) try {
    onProgress({
      progress: rawLeads.length >= capturePoolSize ? 48 : 35,
      phaseLabel: rawLeads.length >= capturePoolSize
        ? `${rawLeads.length} candidatos do Maps coletados. Reforçando validação.`
        : `Maps coletou ${rawLeads.length}/${capturePoolSize}. Complementando no engine.`,
      stats,
    });

    const engineLeads = await Promise.race([
      captureLeads({
        niche: config.niche,
        location: config.location,
        quantity: Math.max(1, capturePoolSize - rawLeads.length),
        contactRequirements: config.contactRequirements || { email: true },
        captureMetric: config.captureMetric || 'website_reformulation',
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), 100000)),
    ]);
    rawLeads = [...rawLeads, ...engineLeads];
    stats.engineCandidates = engineLeads.length;
  } catch (captureError) {
    stats.errors.push(`engine: ${captureError.message}`);
  }

  onProgress({
    progress: 40,
    phaseLabel: `${rawLeads.length} candidatos iniciais encontrados. Complementando fontes...`,
    stats: { ...stats, candidatesFound: rawLeads.length, candidatesScanned: rawLeads.length },
    total_found: rawLeads.length,
  });

  if (rawLeads.length < capturePoolSize) {
    const localLeads = getLeadsFromLocalDatabase(
      config.niche,
      config.location,
      capturePoolSize - rawLeads.length
    );
    rawLeads = [...rawLeads, ...localLeads];
  }

  if (rawLeads.length < quantity) {
    onProgress({
      progress: 50,
      phaseLabel: `Buscando candidatos expandidos em fontes públicas (${expandedCandidateTarget} alvo)`,
      stats: { ...stats, candidatesFound: rawLeads.length, candidatesScanned: rawLeads.length },
      total_found: rawLeads.length,
    });

    const expandedCandidates = await collectExpandedCandidates({
      niche: config.niche,
      location: config.location,
    }, {
      targetCount: expandedCandidateTarget,
    });
    rawLeads = [...rawLeads, ...expandedCandidates];
  }

  stats.candidatesFound = rawLeads.length;
  stats.candidatesScanned = rawLeads.length;

  onProgress({
    progress: 65,
    phaseLabel: `${rawLeads.length} candidatos coletados. Validando sites e contatos...`,
    stats,
    total_found: rawLeads.length,
  });

  const {
    qualified,
    rejectionReasons,
    rejectedCount,
    domainValidated,
    scannedCount,
  } = await validateAndQualifyLeads(rawLeads, {
    quantity,
    contactRequirements: {
      website: true,
      ...(config.contactRequirements || { email: true }),
    },
    concurrency: 10,
    maxCandidatesToScan: expandedCandidateTarget,
    captureConfig: config,
    onProgress: ({ scanned, qualified: validCount, totalCandidates }) => {
      const validationProgress = totalCandidates
        ? Math.min(98, 65 + Math.round((scanned / totalCandidates) * 33))
        : 65;
      onProgress({
        phase: 'extracting',
        progress: validationProgress,
        phaseLabel: `Validando sites: ${scanned}/${totalCandidates} candidatos escaneados · ${validCount}/${quantity} leads aprovados`,
        total_found: scanned,
        total_valid: validCount,
        stats: {
          ...stats,
          candidatesScanned: scanned,
          domainValidated: validCount,
          leadsQualified: validCount,
        },
      });
    },
    onLead: (lead, validCount) => {
      onProgress({
        phase: 'saving',
        type: 'lead',
        lead,
        validCount,
        progress: Math.min(98, 65 + Math.round((validCount / quantity) * 30)),
        phaseLabel: `Lead validado: ${validCount}/${quantity} aprovados`,
        total_valid: validCount,
        total_found: stats.candidatesScanned,
      });
    },
  });

  let finalQualified = qualified;
  let relaxedFillCount = 0;

  if (qualified.length < quantity) {
    onProgress({
      progress: 96,
      phaseLabel: `Completando a meta com sites oficiais funcionais: ${qualified.length}/${quantity}`,
      total_found: scannedCount,
      total_valid: qualified.length,
      stats,
    });

    const relaxedResult = await validateAndQualifyLeads(rawLeads, {
      quantity,
      contactRequirements: { website: true },
      concurrency: 10,
      maxCandidatesToScan: expandedCandidateTarget,
      captureConfig: config,
    });
    const strictIds = new Set(qualified.map(getLeadIdentity));
    const relaxedFill = relaxedResult.qualified
      .filter(lead => !strictIds.has(getLeadIdentity(lead)))
      .slice(0, quantity - qualified.length);

    relaxedFillCount = relaxedFill.length;
    finalQualified = mergeUniqueLeads(qualified, relaxedFill).slice(0, quantity);

    relaxedFill.forEach((lead, index) => {
      onProgress({
        phase: 'saving',
        type: 'lead',
        lead,
        validCount: qualified.length + index + 1,
        progress: Math.min(99, 96 + Math.round(((index + 1) / Math.max(relaxedFill.length, 1)) * 3)),
        phaseLabel: `Lead oficial validado: ${qualified.length + index + 1}/${quantity}`,
        total_valid: qualified.length + index + 1,
        total_found: scannedCount,
      });
    });
  }

  stats.rejectionReasons = rejectionReasons;
  stats.domainValidated = domainValidated;
  stats.domainRejected = rejectedCount;
  stats.candidatesScanned = scannedCount;
  stats.leadsQualified = finalQualified.length;
  stats.strictQualified = qualified.length;
  stats.websiteOnlyFill = relaxedFillCount;

  const duration = Date.now() - startTime;

  onProgress({
    phase: 'saving',
    progress: 99,
    phaseLabel: `Salvando lote de captura: ${finalQualified.length}/${quantity} leads`,
    total_found: scannedCount || rawLeads.length,
    total_valid: finalQualified.length,
    stats,
  });

  if (finalQualified.length > 0 && finalQualified.length < quantity) {
    return {
      success: true,
      captureRunId,
      errorCode: null,
      requested: quantity,
      qualified: finalQualified,
      qualifiedCount: finalQualified.length,
      totalFound: finalQualified.length,
      totalScanned: scannedCount || rawLeads.length,
      rejectedCount,
      rejectionReasons: stats.rejectionReasons,
      partial: true,
      message: `A captura encontrou ${finalQualified.length} de ${quantity} leads com site funcional. Eles foram liberados para revisao no grid.`,
      stats,
      duration,
    };
  }

  if (finalQualified.length < quantity) {
    return {
      success: finalQualified.length > 0,
      captureRunId,
      errorCode: finalQualified.length > 0 ? null : 'INSUFFICIENT_VALIDATED_LEADS',
      requested: quantity,
      qualified: finalQualified,
      qualifiedCount: finalQualified.length,
      totalFound: finalQualified.length,
      totalScanned: scannedCount || rawLeads.length,
      rejectedCount,
      rejectionReasons: stats.rejectionReasons,
      partial: true,
      message: `A captura validou ${finalQualified.length} de ${quantity} leads solicitados. O grid só será liberado quando houver exatamente ${quantity} leads com site funcional.`,
      stats,
      duration,
    };
  }

  return {
    success: true,
    captureRunId,
    requested: quantity,
    qualified: finalQualified.slice(0, quantity),
    qualifiedCount: quantity,
    totalFound: quantity,
    totalScanned: scannedCount || rawLeads.length,
    rejectedCount,
    rejectionReasons: stats.rejectionReasons,
    partial: false,
    message: relaxedFillCount
      ? `${quantity} leads oficiais com site funcional encontrados. ${qualified.length} possuem todos os contatos exigidos.`
      : `${quantity} leads qualificados encontrados.`,
    stats,
    duration,
  };
}

// ========================================
// NOVO ENDPOINT: POST /api/leads/capture
// ========================================
app.post('/api/leads/capture', async (req, res) => {
  const config = req.body || {};
  const captureRunId = config.captureRunId
    || `capture_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;

  // Validar campos obrigatórios
  if (!config.niche || !config.location) {
    return res.status(400).json({
      success: false,
      captureRunId,
      error: 'Campos obrigatórios: niche, location',
      requested: config.quantity || 20,
      qualified: [],
      qualifiedCount: 0,
      totalFound: 0,
      totalScanned: 0,
      rejectedCount: 0,
      rejectionReasons: {},
      partial: true,
      message: 'Campos niche e location são obrigatórios.'
    });
  }

  const quantity = Math.max(1, Math.min(Number(config.quantity || 20), 100));
  const capturePoolSize = getCapturePoolSize(quantity);
  const expandedCandidateTarget = getExpandedCandidateTarget(quantity);

  console.log('[API] ========================================');
  console.log('[API] INICIANDO CAPTURA DE LEADS');
  console.log('[API] captureRunId:', captureRunId);
  console.log('[API] Nicho:', config.niche);
  console.log('[API] Localização:', config.location);
  console.log('[API] Quantidade solicitada:', quantity);
  console.log('[API] Pool de validação:', capturePoolSize);
  console.log('[API] Pool expandido de candidatos:', expandedCandidateTarget);
  console.log('[API] Requisitos:', JSON.stringify(config.contactRequirements || {}));
  console.log('[API] ========================================');

  const startTime = Date.now();
  const stats = {
    requested: quantity,
    candidatesFound: 0,
    candidatesScanned: 0,
    domainValidated: 0,
    domainRejected: 0,
    duplicatesRemoved: 0,
    rejectionReasons: {},
    errors: [],
    source: 'local_database',
  };

  try {
    let rawLeads = [];

    try {
      console.log('[API] Captura Maps-first estilo CapLead...');
      const mapsTarget = getMapsCandidateTarget(quantity);
      const mapsCandidates = await collectCapLeadMapsCandidates({
        niche: config.niche,
        location: config.location,
        contactRequirements: config.contactRequirements || { email: true },
      }, {
        targetCount: mapsTarget,
        maxPlacesPerQuery: Math.max(quantity * 3, 50),
        maxScrollsPerQuery: 10,
      });
      rawLeads = [...rawLeads, ...mapsCandidates];
      stats.source = 'google_maps_caplead';
      stats.mapsCandidates = mapsCandidates.length;
      console.log('[API] Captura Maps-first:', mapsCandidates.length, 'candidatos');
    } catch (mapsError) {
      console.log('[API] Captura Maps-first falhou:', mapsError.message);
      stats.errors.push(`maps: ${mapsError.message}`);
    }

    if (rawLeads.length < capturePoolSize) try {
      // Tentar captura via engine (com timeout)
      const capturePromise = captureLeads({
        niche: config.niche,
        location: config.location,
        quantity: capturePoolSize - rawLeads.length,
        contactRequirements: config.contactRequirements || { email: true },
        captureMetric: config.captureMetric || 'website_reformulation',
      });

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('TIMEOUT')), 100000)
      );

      const engineLeads = await Promise.race([capturePromise, timeoutPromise]);
      rawLeads = [...rawLeads, ...engineLeads];
      console.log('[API] Captura via engine: OK,', engineLeads.length, 'leads');
      stats.engineCandidates = engineLeads.length;
    } catch (captureError) {
      console.log('[API] Captura via engine falhou/timout:', captureError.message);
      console.log('[API] Usando database local apenas como candidatos para validação real');
      stats.errors.push(`engine: ${captureError.message}`);
    }

    // Se não temos leads suficientes, usar database local
    if (rawLeads.length < capturePoolSize) {
      console.log('[API] Complementando candidatos com database local');
      const localLeads = getLeadsFromLocalDatabase(
        config.niche,
        config.location,
        capturePoolSize - rawLeads.length
      );
      rawLeads = [...rawLeads, ...localLeads];
    }

    if (rawLeads.length < quantity) {
      console.log('[API] Buscando candidatos expandidos em fontes públicas...');
      const expandedCandidates = await collectExpandedCandidates({
        niche: config.niche,
        location: config.location,
      }, {
        targetCount: expandedCandidateTarget,
      });
      console.log('[API] Candidatos expandidos encontrados:', expandedCandidates.length);
      rawLeads = [...rawLeads, ...expandedCandidates];
    }

    console.log('[API] Total de leads brutos:', rawLeads.length);
    console.log('[API] ========================================');

    stats.candidatesFound = rawLeads.length;
    stats.candidatesScanned = rawLeads.length;

    const {
      qualified,
      rejectionReasons,
      rejectedCount,
      domainValidated,
    } = await validateAndQualifyLeads(rawLeads, {
      quantity,
      contactRequirements: {
        website: true,
        ...(config.contactRequirements || { email: true }),
      },
      concurrency: 10,
      maxCandidatesToScan: expandedCandidateTarget,
      captureConfig: config,
    });
    stats.rejectionReasons = rejectionReasons;
    stats.domainValidated = domainValidated;
    stats.domainRejected = rejectedCount;

    let finalQualified = qualified;
    let relaxedFillCount = 0;

    if (finalQualified.length < quantity) {
      const relaxedResult = await validateAndQualifyLeads(rawLeads, {
        quantity,
        contactRequirements: { website: true },
        concurrency: 10,
        maxCandidatesToScan: expandedCandidateTarget,
        captureConfig: config,
      });
      const strictIds = new Set(qualified.map(getLeadIdentity));
      const relaxedFill = relaxedResult.qualified
        .filter(lead => !strictIds.has(getLeadIdentity(lead)))
        .slice(0, quantity - qualified.length);
      relaxedFillCount = relaxedFill.length;
      finalQualified = mergeUniqueLeads(qualified, relaxedFill).slice(0, quantity);
    }

    const duration = Date.now() - startTime;
    stats.leadsQualified = finalQualified.length;
    stats.strictQualified = qualified.length;
    stats.websiteOnlyFill = relaxedFillCount;

    console.log('[API] Leads qualificados:', finalQualified.length);

    if (finalQualified.length < quantity) {
      return res.status(200).json({
        success: finalQualified.length > 0,
        captureRunId,
        errorCode: finalQualified.length > 0 ? null : 'INSUFFICIENT_VALIDATED_LEADS',
        requested: quantity,
        qualified: finalQualified,
        qualifiedCount: finalQualified.length,
        totalFound: finalQualified.length,
        totalScanned: rawLeads.length,
        rejectedCount,
        rejectionReasons: stats.rejectionReasons,
        partial: true,
        message: `A captura validou ${qualified.length} de ${quantity} leads solicitados. O grid só será liberado quando houver exatamente ${quantity} leads com site funcional e contatos exigidos. Amplie o nicho/localização ou configure fontes reais para completar a meta.`,
        stats,
        duration,
      });
    }

    const response = {
      success: true,
      captureRunId,
      requested: quantity,
      qualified: finalQualified.slice(0, quantity),
      qualifiedCount: quantity,
      totalFound: quantity,
      totalScanned: rawLeads.length,
      rejectedCount,
      rejectionReasons: stats.rejectionReasons,
      partial: false,
      message: relaxedFillCount
        ? `${quantity} leads oficiais com site funcional encontrados. ${qualified.length} possuem todos os contatos exigidos.`
        : `${quantity} leads qualificados encontrados.`,
      stats,
      duration,
    };

    res.status(200).json(response);

  } catch (error) {
    console.error('[API] ERRO FATAL:', error);

    stats.errors.push(error.message);

    res.status(500).json({
      success: false,
      captureRunId,
      error: error.message,
      requested: quantity,
      qualified: [],
      qualifiedCount: 0,
      totalFound: 0,
      totalScanned: 0,
      rejectedCount: 0,
      rejectionReasons: stats.rejectionReasons,
      partial: true,
      message: 'Erro interno na captura. Tente novamente ou entre em contato com o suporte.',
      stats,
    });
  }
});

app.post('/api/leads/capture-stream', async (req, res) => {
  const config = req.body || {};
  const captureRunId = config.captureRunId
    || `capture_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;

  if (!config.niche || !config.location) {
    return res.status(400).json({
      success: false,
      captureRunId,
      errorCode: 'MISSING_REQUIRED_FIELDS',
      message: 'Campos niche e location são obrigatórios.',
    });
  }

  res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const send = (event) => {
    res.write(`${JSON.stringify({
      captureRunId,
      timestamp: new Date().toISOString(),
      ...event,
    })}\n`);
  };

  try {
    const finalResult = await executeLeadCapture(config, captureRunId, (progressEvent) => {
      if (progressEvent.type === 'lead') {
        send({ type: 'lead', ...progressEvent });
      } else {
        send({ type: 'progress', ...progressEvent });
      }
    });
    send({ type: 'final', result: finalResult });
  } catch (error) {
    send({
      type: 'final',
      result: {
        success: false,
        captureRunId,
        errorCode: 'INTERNAL_ERROR',
        message: error.message || 'Erro interno na captura.',
        qualified: [],
        qualifiedCount: 0,
        totalFound: 0,
        totalScanned: 0,
        rejectedCount: 0,
        partial: false,
        stats: { errors: [error.message] },
      },
    });
  } finally {
    res.end();
  }
});

// Função para calcular score (similar à do frontend)
function calculateScore(lead) {
  let score = 30;

  // Detectar plataforma pelo domínio
  const domain = (lead.website || '').toLowerCase();
  if (domain.includes('wordpress')) score += 20;
  else if (domain.includes('wix')) score += 25;
  else if (domain.includes('shopify')) score += 15;
  else if (domain.includes('squarespace')) score += 20;
  else if (domain.includes('wixsite')) score += 25;
  else if (domain.includes('webflow')) score += 15;

  // Contato disponível
  if (lead.email) score += 10;
  if (lead.phone) score += 5;
  if (lead.whatsapp) score += 10;

  // Google Maps source = mais confiável
  if (lead.source === 'Google Maps') score += 15;

  return Math.min(95, Math.max(15, Math.round(score)));
}

// Endpoint legado (mantido para compatibilidade)
app.post('/api/capture-leads', async (req, res) => {
  const config = req.body || {};

  if (!config.niche || !config.location || !config.quantity) {
    return res.status(400).json({ error: 'Missing required capture fields' });
  }

  try {
    const leads = await captureLeads(config);
    const requested = Number(config.quantity);

    res.status(200).json({
      success: true,
      requested,
      count: leads.length,
      leads,
      partial: leads.length < requested,
      message: leads.length === requested
        ? 'Captura concluída com sucesso.'
        : `Encontrados ${leads.length} de ${requested} leads solicitados.`,
    });
  } catch (error) {
    console.error('Error capturing leads:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to capture leads',
      leads: [],
    });
  }
});

// Endpoint de busca (legado)
app.get('/api/search', async (req, res) => {
  const { q } = req.query;

  if (!q) {
    return res.status(400).json({ error: 'Missing query parameter q' });
  }

  const targetUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}`;
  const proxies = [
    { name: 'allorigins', url: `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}` },
    { name: 'corsproxy', url: `https://corsproxy.io/?${encodeURIComponent(targetUrl)}` },
    { name: 'thingproxy', url: `https://thingproxy.freeboard.io/fetch/${encodeURIComponent(targetUrl)}` },
  ];

  for (const proxy of proxies) {
    try {
      const response = await fetch(proxy.url, {
        headers: {
          'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'accept-language': 'pt-BR,pt;q=0.9,en;q=0.7',
        },
      });
      if (response.ok) {
        const html = await response.text();
        if (html && html.length > 100) {
          return res.status(200).json({ html, source: proxy.name });
        }
      }
    } catch {}
  }

  return res.status(503).json({ error: 'All proxies failed' });
});

// Endpoint de fetch de site (legado)
app.get('/api/fetch-site', async (req, res) => {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: 'Missing url parameter' });
  }

  const proxies = [
    `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    `https://corsproxy.io/?${encodeURIComponent(url)}`,
  ];

  let html = null;
  for (const proxy of proxies) {
    try {
      const response = await fetch(proxy);
      if (response.ok) {
        html = await response.text();
        break;
      }
    } catch {}
  }

  if (!html) {
    return res.status(200).json({ emails: [], phones: [] });
  }

  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const emails = html.match(emailRegex) || [];
  const uniqueEmails = [...new Set(emails.filter(e => !/\.(png|jpe?g|webp|gif|svg)$/i.test(e)))];

  const phoneRegex = /(?:\+?55\s?)?(?:\(?\d{2}\)?\s?)?(?:9\d{4}[-\s]?\d{4}|\d{4}[-\s]?\d{4})/g;
  const phones = html.match(phoneRegex) || [];
  const uniquePhones = [...new Set(phones.map(p => p.replace(/\D/g, '')).filter(p => p.length >= 10 && p.length <= 11))];

  res.status(200).json({ emails: uniqueEmails, phones: uniquePhones });
});

app.listen(port, () => {
  console.log(`Kentauros Email Server running on port ${port}`);
});
