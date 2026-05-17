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

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-caplead-api-key',
};

function jsonResponse(body: unknown, status = 200) {
  return Response.json(body, { status, headers: corsHeaders });
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

  return {
    tenant_id: tenantId,
    user_id: userId,
    company,
    contact: lead.responsavel || lead.contact || lead.contato || 'Representante',
    email: lead.email || lead.contato_email || '',
    phone: lead.telefone || lead.phone || '',
    source: sourceLabel,
    status: 'new',
    score: 0,
    stage: 'new',
    value: estimatedValue,
    industry: lead.categoria || lead.nicho || lead.category || '',
    notes: lead.descricao || lead.desc || lead.description || '',
    metadata: {
      website,
      city: lead.cidade || lead.city || '',
      state: lead.estado || lead.state || '',
      location: lead.localizacao || '',
      maps_url: lead.maps_url || '',
      capLeadSource: sourceLabel,
      pricingModel: lead.pricingModel || (estimatedValue > 0 ? 'ai_development' : ''),
      pricingBasis: lead.pricingBasis || '',
      estimatedValue,
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

function authorizeImport(req: Request, body: { apiKey?: string }) {
  if (!IMPORT_API_KEY) return true;
  const headerKey = req.headers.get('x-caplead-api-key');
  return headerKey === IMPORT_API_KEY || body.apiKey === IMPORT_API_KEY;
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export async function GET() {
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
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { leads, userId, userEmail, userName, capturedBySource, tenantId: bodyTenantId } = body;

    if (!authorizeImport(req, body)) {
      return jsonResponse(
        { success: false, errorCode: 'UNAUTHORIZED', message: 'API key inválida' },
        401
      );
    }

    if (!leads || !Array.isArray(leads) || leads.length === 0) {
      return jsonResponse(
        {
          success: false,
          errorCode: 'NO_LEADS',
          message: 'Nenhum lead fornecido para importação',
        },
        400
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

    if (supabase && rowsToInsert.length > 0) {
      const { data, error } = await supabase
        .from('leads')
        .insert(rowsToInsert)
        .select();

      if (error) {
        console.error('[Import API] Erro no insert em lote:', error);
        for (const row of rowsToInsert) {
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
      rowsToInsert.forEach((row) => {
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

    console.log('[Import API] Resumo:', summary);

    return jsonResponse({
      success: true,
      message: `Importação concluída: ${results.imported.length} leads importados`,
      summary,
      importedLeads: results.imported,
      updatedLeads: results.updated.length > 0 ? results.updated : undefined,
      failedLeads: results.failed.length > 0 ? results.failed : undefined,
    });
  } catch (error) {
    console.error('[Import API] ERRO FATAL:', error);
    return jsonResponse(
      {
        success: false,
        errorCode: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Erro interno na importação',
      },
      500
    );
  }
}

export const __testing = {
  normalizeLeadData,
  parseLeadValue,
};
