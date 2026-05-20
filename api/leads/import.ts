// Vercel Serverless Function: /api/leads/import
// Recebe leads capturados pelo CapLead e persiste na Kentauros (Supabase)

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY;

const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

const DEFAULT_TENANT_ID = process.env.CAPLEAD_IMPORT_TENANT_ID || 'tenant-a';
const DEFAULT_USER_ID = Number(process.env.CAPLEAD_IMPORT_USER_ID || '1');
const IMPORT_API_KEY = process.env.CAPLEAD_IMPORT_API_KEY || '';
const ALLOWED_ORIGINS = process.env.CAPLEAD_IMPORT_ALLOWED_ORIGINS || 'https://kentauros-os-app.vercel.app';
const CAPLEAD_QUALITY_CONTRACT = {
  version: 3,
  minScore: 70,
  requiredFields: ['company', 'website', 'email_or_phone_or_whatsapp'],
  highOpportunityScore: 85,
  batchAudit: {
    minValidContactRate: 80,
    minWebsiteCompletenessRate: 70,
    maxDuplicateRate: 5,
  },
  externalAutomationRequiresApproval: true,
};

function resolveAllowedOrigin({
  requestOrigin,
  allowedOrigins,
  nodeEnv,
}: {
  requestOrigin?: string | null;
  allowedOrigins?: string;
  nodeEnv?: string;
}) {
  if (nodeEnv !== 'production') return requestOrigin || '*';
  const allowed = String(allowedOrigins || '')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);
  if (!requestOrigin) return allowed[0] || 'null';
  return allowed.includes(requestOrigin) ? requestOrigin : 'null';
}

function getCorsHeaders(req?: Request) {
  return {
    'Access-Control-Allow-Origin': resolveAllowedOrigin({
      requestOrigin: req?.headers.get('origin'),
      allowedOrigins: ALLOWED_ORIGINS,
      nodeEnv: process.env.NODE_ENV,
    }),
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-caplead-api-key',
  };
}

function jsonResponse(body: unknown, status = 200, req?: Request) {
  return Response.json(body, { status, headers: getCorsHeaders(req) });
}

function normalizeWebsite(lead: Record<string, string | undefined>) {
  return (
    lead.site_oficial ||
    lead.website ||
    lead.url ||
    lead.maps_url ||
    ''
  ).trim();
}

function cleanText(value: unknown) {
  return String(value || '').trim();
}

function normalizeEmail(value: unknown) {
  return cleanText(value).toLowerCase();
}

function normalizePhoneDigits(value: unknown) {
  return cleanText(value).replace(/\D/g, '');
}

function normalizeQualityFlags(value: unknown) {
  if (Array.isArray(value)) return value.map(item => cleanText(item)).filter(Boolean);
  if (!value) return [];
  return cleanText(value)
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
}

function getMissingRequiredFields({
  domain,
  email,
  phoneDigits,
  aiScore,
}: {
  domain: string;
  email: string;
  phoneDigits: string;
  aiScore: number;
}) {
  const missing: string[] = [];
  if (!domain) missing.push('website');
  if (!email) missing.push('email');
  if (phoneDigits.length < 10) missing.push('phone_or_whatsapp');
  if (aiScore <= 0) missing.push('ai_score');
  return missing;
}

function getEnrichmentSuggestions(missingRequiredFields: string[]) {
  const suggestions = new Set<string>();
  missingRequiredFields.forEach((field) => {
    if (field === 'website') suggestions.add('validate_website');
    if (field === 'email') suggestions.add('capture_email');
    if (field === 'phone_or_whatsapp') suggestions.add('capture_whatsapp');
    if (field === 'ai_score') suggestions.add('run_ai_quality_analysis');
  });
  return Array.from(suggestions);
}

function buildCapLeadQualityProfile(lead: Record<string, any>) {
  const website = normalizeWebsite(lead);
  const domain = extractDomain(website);
  const email = normalizeEmail(lead.email || lead.contato_email || lead.developer_email);
  const phoneDigits = normalizePhoneDigits(lead.whatsapp || lead.numero_whatsapp || lead.whatsapp_number || lead.telefone || lead.phone);
  const aiScore = Number(lead.score_design || lead.score_ux || 0);
  const suppliedScore = Number(lead.dataQualityScore || lead.qualityScore || lead.score || 0);
  const suppliedFlags = normalizeQualityFlags(lead.qualityFlags);
  const suppliedMissingRequiredFields = normalizeQualityFlags(lead.missingRequiredFields);
  const suppliedEnrichmentSuggestions = normalizeQualityFlags(lead.enrichmentSuggestions);
  const flags = new Set<string>(suppliedFlags);
  let score = suppliedScore > 0 ? suppliedScore : 30;

  if (domain) score += suppliedScore > 0 ? 0 : 24;
  else flags.add('missing_website');

  if (email) score += suppliedScore > 0 ? 0 : 20;
  else flags.add('missing_email');

  if (phoneDigits.length >= 10) score += suppliedScore > 0 ? 0 : 16;
  else flags.add('missing_phone_or_whatsapp');

  if (lead.problemas || lead.issues || lead.oportunidades) {
    score += suppliedScore > 0 ? 0 : 8;
    flags.add('site_pain_detected');
  }

  const boundedScore = Math.max(0, Math.min(100, Math.round(score)));
  const missingRequiredFields = suppliedMissingRequiredFields.length
    ? suppliedMissingRequiredFields
    : getMissingRequiredFields({ domain, email, phoneDigits, aiScore });
  const enrichmentSuggestions = suppliedEnrichmentSuggestions.length
    ? suppliedEnrichmentSuggestions
    : getEnrichmentSuggestions(missingRequiredFields);
  const requiredFieldsStatus = cleanText(lead.requiredFieldsStatus) || (missingRequiredFields.length ? 'incomplete' : 'complete');
  const status = cleanText(lead.dataQualityStatus || lead.qualityStatus) || (boundedScore >= 75 ? 'qualified' : 'review_required');

  return {
    version: Number(lead.dataQualityVersion || lead.qualityVersion || 2),
    score: boundedScore,
    status,
    flags: Array.from(flags),
    dedupeKey: cleanText(lead.capLeadDedupeKey) || domain || email || phoneDigits || cleanText(lead.nome || lead.name || lead.empresa || lead.titulo).toLowerCase(),
    missingRequiredFields,
    enrichmentSuggestions,
    requiredFieldsStatus,
    recommendedAction: cleanText(lead.qualityRecommendation || lead.recommendedAction) ||
      (status === 'qualified' && requiredFieldsStatus === 'complete' ? 'export_to_kentauros' : 'review_before_export'),
    externalAutomationApprovalRequired: lead.externalAutomationApprovalRequired !== false,
  };
}

function isTestLead(lead: Record<string, string | undefined>) {
  const company = (lead.nome || lead.name || lead.empresa || lead.titulo || '').trim();
  const email = (lead.email || lead.contato_email || '').trim().toLowerCase();
  const website = normalizeWebsite(lead).toLowerCase();

  if (/^lead\s+\d+$/i.test(company)) return true;
  if (/^t\d+@test\.com$/i.test(email)) return true;
  if (website.includes('deploy-caplead-test')) return true;
  if (/example-\d+\.com\.br/.test(website)) return true;

  return false;
}

function parseLeadValue(lead: Record<string, unknown>) {
  const raw =
    lead.value ??
    lead.estimatedValue ??
    lead.valor_estimado ??
    lead.budget ??
    0;
  if (raw === null || raw === undefined || raw === '') return 0;

  const normalized = String(raw)
    .replace(/[^\d,.-]/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : 0;
}

function parseBooleanFlag(value: unknown) {
  if (value === true || value === 1) return true;
  const text = String(value || '').trim().toLowerCase();
  return ['1', 'true', 'sim', 'yes', 'sent', 'enviado'].includes(text);
}

function getWhatsappStatus(lead: Record<string, any>) {
  const sent =
    parseBooleanFlag(lead.wpp_enviado) ||
    parseBooleanFlag(lead.whatsappSent) ||
    String(lead.whatsappMessageStatus || '').toLowerCase() === 'sent';
  const sentAt = lead.whatsappSentAt || lead.wpp_enviado_at || (sent ? new Date().toISOString() : null);

  return {
    sent,
    sentAt,
    messageStatus: sent ? 'sent' : 'pending',
  };
}

function validateCapLeadData(lead: Record<string, string | undefined>) {
  const errors: string[] = [];

  if (isTestLead(lead)) {
    errors.push('Lead de teste ignorado');
    return errors;
  }

  if (!lead.nome && !lead.name && !lead.empresa && !lead.titulo) {
    errors.push('Nome/empresa é obrigatório');
  }

  if (!normalizeWebsite(lead)) {
    errors.push('Website, URL ou maps_url é obrigatório');
  }

  return errors;
}

function normalizeLeadData(
  lead: Record<string, any>,
  {
    tenantId,
    userId,
    userEmail,
    userName,
    capturedBySource,
  }: { tenantId: string; userId: number; userEmail?: string; userName?: string; capturedBySource?: string }
) {
  const website = normalizeWebsite(lead);
  const company = lead.nome || lead.name || lead.empresa || lead.titulo || 'Empresa';
  const sourceLabel =
    String(capturedBySource || lead.captureSource || userName || '').trim() || 'CapLead';
  const estimatedValue = parseLeadValue(lead);
  const whatsappStatus = getWhatsappStatus(lead);
  const whatsapp = lead.whatsapp || lead.wpp || lead.whatsapp_number || lead.whatsappNumber || lead.contato_whatsapp || '';
  const quality = buildCapLeadQualityProfile(lead);

  return {
    tenant_id: tenantId,
    user_id: userId,
    company,
    contact: lead.responsavel || lead.contact || lead.contato || 'Representante',
    email: normalizeEmail(lead.email || lead.contato_email || ''),
    phone: lead.telefone || lead.phone || '',
    source: sourceLabel,
    status: 'new',
    score: quality.score,
    stage: 'new',
    value: estimatedValue,
    industry: lead.categoria || lead.nicho || lead.category || '',
    notes: lead.descricao || lead.desc || lead.description || '',
    metadata: {
      website,
      whatsapp,
      city: lead.cidade || lead.city || '',
      state: lead.estado || lead.state || '',
      location: lead.localizacao || '',
      maps_url: lead.maps_url || '',
      capLeadSource: sourceLabel,
      pricingModel: lead.pricingModel || (estimatedValue > 0 ? 'ai_development' : ''),
      pricingBasis: lead.pricingBasis || '',
      estimatedValue,
      capLeadDedupeKey: quality.dedupeKey,
      capLeadExternalId: lead.capLeadExternalId || lead.externalId || null,
      dataQualityScore: quality.score,
      dataQualityStatus: quality.status,
      dataQualityVersion: quality.version,
      qualityFlags: quality.flags,
      missingRequiredFields: quality.missingRequiredFields,
      enrichmentSuggestions: quality.enrichmentSuggestions,
      requiredFieldsStatus: quality.requiredFieldsStatus,
      qualityRecommendation: quality.recommendedAction,
      externalAutomationApprovalRequired: quality.externalAutomationApprovalRequired,
      whatsappSent: whatsappStatus.sent,
      whatsappSentAt: whatsappStatus.sentAt,
      whatsappMessageStatus: whatsappStatus.messageStatus,
      capLeadLastSyncAt: new Date().toISOString(),
      importedAt: new Date().toISOString(),
      commercialOwnerEmail: userEmail || null,
      commercialOwnerName: sourceLabel,
      originalData: lead,
    },
  };
}

function getImportRowDedupeKey(row: ReturnType<typeof normalizeLeadData>) {
  return String(
    row.metadata.capLeadDedupeKey ||
    extractDomain(String(row.metadata.website || '')) ||
    row.email ||
    row.phone ||
    row.company
  ).toLowerCase();
}

function dedupeCapLeadImportRows(rows: ReturnType<typeof normalizeLeadData>[]) {
  const byKey = new Map<string, ReturnType<typeof normalizeLeadData>>();

  rows.forEach((row) => {
    const key = getImportRowDedupeKey(row);
    const current = byKey.get(key);
    if (!current || Number(row.score || 0) >= Number(current.score || 0)) {
      byKey.set(key, row);
    }
  });

  return Array.from(byKey.values());
}

function countListValues(items: unknown[]) {
  return items.reduce<Record<string, number>>((acc, item) => {
    const key = cleanText(item);
    if (!key) return acc;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

function getPercentage(part: number, total: number) {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

function getCapLeadExportAuditRecommendation(enrichmentRequired: boolean) {
  return enrichmentRequired
    ? 'enrich_batch_before_commercial_actions'
    : 'batch_ready_for_commercial_actions';
}

function buildCapLeadImportQualitySummary(
  rows: ReturnType<typeof normalizeLeadData>[],
  failedLeads: unknown[] = []
) {
  const scores = rows.map(row => Number(row.metadata.dataQualityScore || row.score || 0));
  const averageScore = scores.length
    ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
    : 0;
  const missingRequiredFields = rows.flatMap(row => normalizeQualityFlags(row.metadata.missingRequiredFields));
  const enrichmentSuggestions = rows.flatMap(row => normalizeQualityFlags(row.metadata.enrichmentSuggestions));
  const withoutContact = rows.filter(row => !row.email && !normalizePhoneDigits(row.phone) && !normalizePhoneDigits(row.metadata.whatsapp)).length;
  const withoutWebsite = rows.filter(row => !normalizeWebsite({ website: row.metadata.website })).length;
  const belowMinScore = rows.filter(row => Number(row.metadata.dataQualityScore || row.score || 0) < CAPLEAD_QUALITY_CONTRACT.minScore).length;
  const validLeads = rows.filter(row => (
    Number(row.metadata.dataQualityScore || row.score || 0) >= CAPLEAD_QUALITY_CONTRACT.minScore &&
    row.company &&
    row.metadata.website &&
    (row.email || normalizePhoneDigits(row.phone) || normalizePhoneDigits(row.metadata.whatsapp))
  )).length;
  const highOpportunity = rows.filter(row => Number(row.metadata.dataQualityScore || row.score || 0) >= CAPLEAD_QUALITY_CONTRACT.highOpportunityScore).length;
  const reviewRequired = rows.filter(row =>
    row.metadata.dataQualityStatus === 'review_required' ||
    row.metadata.requiredFieldsStatus === 'incomplete'
  ).length;
  const failedReasons = failedLeads
    .map((item: any) => cleanText(item?.reason || item?.error || item))
    .filter(Boolean);
  const duplicates = failedReasons.filter(reason => reason === 'DUPLICATE_BATCH').length;
  const batchAuditTotal = rows.length + duplicates;
  const validContactRate = getPercentage(rows.length - withoutContact, rows.length);
  const websiteCompletenessRate = getPercentage(rows.length - withoutWebsite, rows.length);
  const duplicateRate = getPercentage(duplicates, batchAuditTotal);
  const enrichmentReasons = [
    ...(validContactRate < CAPLEAD_QUALITY_CONTRACT.batchAudit.minValidContactRate ? ['contact_rate_below_contract'] : []),
    ...(websiteCompletenessRate < CAPLEAD_QUALITY_CONTRACT.batchAudit.minWebsiteCompletenessRate ? ['website_rate_below_contract'] : []),
    ...(averageScore < CAPLEAD_QUALITY_CONTRACT.minScore ? ['average_score_below_contract'] : []),
    ...(duplicateRate > CAPLEAD_QUALITY_CONTRACT.batchAudit.maxDuplicateRate ? ['duplicate_rate_above_contract'] : []),
  ];
  const enrichmentRequired = enrichmentReasons.length > 0;
  const discardReasons = countListValues([
    ...Array.from({ length: belowMinScore }, () => 'below_min_score'),
    ...Array.from({ length: withoutContact }, () => 'missing_contact'),
    ...Array.from({ length: withoutWebsite }, () => 'missing_website'),
    ...failedReasons,
  ]);

  return {
    qualityVersion: 2,
    contract: CAPLEAD_QUALITY_CONTRACT,
    totalEvaluated: rows.length,
    validLeads,
    qualified: rows.filter(row =>
      row.metadata.dataQualityStatus === 'qualified' &&
      row.metadata.requiredFieldsStatus === 'complete'
    ).length,
    reviewRequired,
    averageScore,
    failedValidation: failedLeads.length,
    duplicates,
    withoutContact,
    withoutWebsite,
    highOpportunity,
    exportAudit: {
      totalEvaluated: batchAuditTotal,
      validContactRate,
      websiteCompletenessRate,
      duplicateRate,
      averageScore,
      enrichmentRequired,
      enrichmentReasons,
      recommendation: getCapLeadExportAuditRecommendation(enrichmentRequired),
    },
    discardReasons,
    missingRequiredFields: countListValues(missingRequiredFields),
    enrichmentSuggestions: countListValues(enrichmentSuggestions),
    recommendation: reviewRequired > 0 || failedLeads.length > 0
      ? 'review_before_external_automation'
      : 'ready_for_kentauros_followup',
    externalAutomationApprovalRequired: true,
  };
}

function buildCapLeadExportAuditLearning(summary: ReturnType<typeof buildCapLeadImportQualitySummary>) {
  const causes = summary.exportAudit.enrichmentReasons.length
    ? summary.exportAudit.enrichmentReasons
    : ['batch_above_quality_contract'];

  return {
    event_type: 'caplead_export_batch_audited',
    title: 'Auditoria de exportacao e enriquecimento CapLead por lote',
    description: summary.exportAudit.enrichmentRequired
      ? 'Lote CapLead abaixo do contrato aprovado; enriquecimento deve ocorrer antes de novas acoes comerciais.'
      : 'Lote CapLead dentro do contrato aprovado; pode seguir para acoes comerciais com aprovacao humana quando houver envio externo.',
    metadata: {
      source: 'ceo_mastermind_caplead_export_enrichment_audit',
      contractVersion: summary.contract.version,
      totalEvaluated: summary.exportAudit.totalEvaluated,
      validContactRate: summary.exportAudit.validContactRate,
      websiteCompletenessRate: summary.exportAudit.websiteCompletenessRate,
      duplicateRate: summary.exportAudit.duplicateRate,
      averageScore: summary.exportAudit.averageScore,
      enrichmentRequired: summary.exportAudit.enrichmentRequired,
      causes,
      externalAutomationApprovalRequired: summary.externalAutomationApprovalRequired,
    },
  };
}

function extractDomain(website: string) {
  return website
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .split('/')[0]
    .toLowerCase();
}

async function findDuplicateLead(tenantId: string, website: string, company: string) {
  if (!supabase) return null;

  const domain = extractDomain(website);
  if (domain) {
    const { data: byWebsite } = await supabase
      .from('leads')
      .select('id, metadata, value, status, stage')
      .eq('tenant_id', tenantId)
      .filter('metadata->>website', 'ilike', `%${domain}%`)
      .limit(1);

    if (byWebsite?.length) return byWebsite[0];
  }

  const { data: byCompany } = await supabase
    .from('leads')
    .select('id, metadata, value, status, stage')
    .eq('tenant_id', tenantId)
    .ilike('company', company)
    .limit(1);

  return byCompany?.length ? byCompany[0] : null;
}

function isImportAuthorized({
  configuredApiKey,
  nodeEnv,
  requestApiKey,
  bodyApiKey,
}: {
  configuredApiKey?: string;
  nodeEnv?: string;
  requestApiKey?: string | null;
  bodyApiKey?: string | null;
}) {
  if (!configuredApiKey) return nodeEnv !== 'production';
  return requestApiKey === configuredApiKey || bodyApiKey === configuredApiKey;
}

function authorizeImport(req: Request, body: { apiKey?: string }) {
  return isImportAuthorized({
    configuredApiKey: IMPORT_API_KEY,
    nodeEnv: process.env.NODE_ENV,
    requestApiKey: req.headers.get('x-caplead-api-key'),
    bodyApiKey: body.apiKey,
  });
}

export async function OPTIONS(req: Request) {
  return new Response(null, { status: 204, headers: getCorsHeaders(req) });
}

export async function GET(req: Request) {
  return jsonResponse({
    ok: true,
    route: '/api/leads/import',
    methods: ['POST'],
    description: 'Endpoint para importar leads do CapLead em tempo real',
    configured: Boolean(supabase),
    defaultTenantId: DEFAULT_TENANT_ID,
    expectedBody: {
      leads: 'array of lead objects',
      userId: 'optional user id (integer)',
      tenantId: 'optional tenant id (defaults to env)',
    },
  }, 200, req);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { leads, userId, userEmail, userName, capturedBySource, tenantId: bodyTenantId } = body;

    if (!authorizeImport(req, body)) {
      return jsonResponse(
        { success: false, errorCode: 'UNAUTHORIZED', message: 'API key inválida' },
        401,
        req
      );
    }

    if (!leads || !Array.isArray(leads) || leads.length === 0) {
      return jsonResponse(
        {
          success: false,
          errorCode: 'NO_LEADS',
          message: 'Nenhum lead fornecido para importação',
        },
        400,
        req
      );
    }

    const tenantId = bodyTenantId || DEFAULT_TENANT_ID;
    const resolvedUserId = Number(userId) || DEFAULT_USER_ID;
    const sourceLabel = String(capturedBySource || userName || '').trim() || 'CapLead';

    console.log('[Import API] Recebendo', leads.length, 'leads do CapLead para tenant', tenantId, 'fonte:', sourceLabel);

    const results = {
      imported: [] as unknown[],
      updated: [] as unknown[],
      failed: [] as unknown[],
      duplicates: 0,
    };

    const rowsToInsert: ReturnType<typeof normalizeLeadData>[] = [];

    for (const lead of leads) {
      const errors = validateCapLeadData(lead);
      if (errors.length > 0) {
        results.failed.push({ lead, errors, reason: 'VALIDATION_FAILED' });
        continue;
      }

      const normalizedLead = normalizeLeadData(lead, {
        tenantId,
        userId: resolvedUserId,
        userEmail,
        userName,
        capturedBySource: sourceLabel,
      });

      const website = normalizedLead.metadata.website as string;

      const duplicate = await findDuplicateLead(tenantId, website, normalizedLead.company);
      if (duplicate) {
        const shouldUpdateWhatsapp = normalizedLead.metadata.whatsappSent === true;
        const shouldUpdateValue = Number(normalizedLead.value || 0) > Number(duplicate.value || 0);

        if (supabase && (shouldUpdateWhatsapp || shouldUpdateValue)) {
          const mergedMetadata = {
            ...((duplicate.metadata as Record<string, unknown>) || {}),
            ...normalizedLead.metadata,
            importedAt: (duplicate.metadata as Record<string, unknown>)?.importedAt || normalizedLead.metadata.importedAt,
            capLeadLastSyncAt: new Date().toISOString(),
          };
          const patch = {
            metadata: mergedMetadata,
            value: shouldUpdateValue ? normalizedLead.value : duplicate.value,
            last_activity: new Date().toISOString(),
          };
          const { data: updatedLead, error: updateError } = await supabase
            .from('leads')
            .update(patch)
            .eq('id', duplicate.id)
            .select()
            .single();

          if (updateError) {
            results.failed.push({
              lead,
              errors: [updateError.message],
              reason: 'UPDATE_DUPLICATE_FAILED',
            });
          } else if (updatedLead) {
            results.updated.push(updatedLead);
          }
        } else {
          results.duplicates++;
        }
        continue;
      }
      rowsToInsert.push(normalizedLead);
    }

    const dedupedRowsToInsert = dedupeCapLeadImportRows(rowsToInsert);

    if (supabase && dedupedRowsToInsert.length > 0) {
      const { data, error } = await supabase
        .from('leads')
        .insert(dedupedRowsToInsert)
        .select();

      if (error) {
        console.error('[Import API] Erro no insert em lote:', error);
        for (const row of dedupedRowsToInsert) {
          const { data: single, error: singleError } = await supabase
            .from('leads')
            .insert(row)
            .select()
            .single();

          if (singleError) {
            results.failed.push({
              lead: row,
              errors: [singleError.message],
              reason: 'INSERT_FAILED',
            });
          } else if (single) {
            results.imported.push(single);
          }
        }
      } else {
        results.imported.push(...(data || []));
      }
    } else if (!supabase) {
      dedupedRowsToInsert.forEach((row) => {
        results.imported.push({
          ...row,
          id: `caplead_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        });
      });
    }

    const summary = {
      total: leads.length,
      imported: results.imported.length,
      updated: results.updated.length,
      failed: results.failed.length,
      duplicates: results.duplicates,
    };

    const qualitySummary = buildCapLeadImportQualitySummary(dedupedRowsToInsert, results.failed);

    console.log('[Import API] Resumo:', summary);

    return jsonResponse({
      success: true,
      message: `Importação concluída: ${results.imported.length} leads importados`,
      summary,
      qualitySummary,
      importedLeads: results.imported,
      updatedLeads: results.updated.length > 0 ? results.updated : undefined,
      failedLeads: results.failed.length > 0 ? results.failed : undefined,
    }, 200, req);
  } catch (error) {
    console.error('[Import API] ERRO FATAL:', error);
    return jsonResponse(
      {
        success: false,
        errorCode: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Erro interno na importação',
      },
      500,
      req
    );
  }
}

export const __testing = {
  normalizeLeadData,
  buildCapLeadQualityProfile,
  buildCapLeadImportQualitySummary,
  buildCapLeadExportAuditLearning,
  CAPLEAD_QUALITY_CONTRACT,
  dedupeCapLeadImportRows,
  parseLeadValue,
  isImportAuthorized,
  resolveAllowedOrigin,
};
