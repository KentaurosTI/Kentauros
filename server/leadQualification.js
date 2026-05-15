import {
  isLikelyOfficialLeadCandidate,
  matchesCaptureIntent,
  normalizeWebsiteUrl,
  validateWebsite,
} from './leadCaptureEngine.js';

export const validateEmail = (email) => {
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim());
};

const hasContact = (lead, key) => {
  if (key === 'email') return validateEmail(lead.email);
  if (key === 'phone') return Boolean(lead.phone);
  if (key === 'whatsapp') return Boolean(lead.whatsapp);
  if (key === 'website') return Boolean(lead.websiteValidation?.isFunctional && lead.website);
  return true;
};

const getMissingRequirement = (lead, requirements = {}) => {
  for (const key of ['website', 'email', 'phone', 'whatsapp']) {
    if (requirements[key] && !hasContact(lead, key)) return key;
  }
  return null;
};

const buildQualifiedLead = (lead, validated) => {
  const email = validated.contacts?.emails?.[0] || lead.email || null;
  const phone = validated.contacts?.phones?.[0] || lead.phone || null;
  const whatsapp = validated.contacts?.whatsappPhones?.[0] || lead.whatsapp || null;
  const website = normalizeWebsiteUrl(validated.website || lead.website);

  return {
    ...lead,
    id: lead.id || `lead_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name: lead.name || validated.name,
    company: lead.company || lead.name || validated.name,
    website,
    email,
    phone,
    whatsapp,
    source: lead.source || validated.source || 'Web validation',
    status: 'qualified',
    isValid: true,
    isActive: true,
    score: Math.max(Number(lead.score || 0), email ? 70 : 55),
    meta: {
      ...(lead.meta || {}),
      title: validated.name,
      description: validated.description,
    },
    websiteValidation: {
      isFunctional: true,
      statusCode: 200,
      checkedAt: new Date().toISOString(),
      finalUrl: website,
      contentLength: validated.html?.length || 0,
      source: validated.source || lead.source || 'web_validation',
    },
  };
};

const hasTrustedWebsiteValidation = (lead) =>
  lead.websiteValidation?.isFunctional === true
  && normalizeWebsiteUrl(lead.website);

export const validateAndQualifyLeads = async (rawLeads = [], options = {}) => {
  const {
    quantity = rawLeads.length,
    contactRequirements = { email: true, website: true },
    fetchImpl = fetch,
    concurrency = 8,
    maxCandidatesToScan = rawLeads.length,
    captureConfig = {},
    onProgress = null,
    onLead = null,
  } = options;
  const qualified = [];
  const rejectionReasons = {};
  const seen = new Set();
  let scanned = 0;

  const reject = (reason) => {
    rejectionReasons[reason] = (rejectionReasons[reason] || 0) + 1;
  };

  const validateLead = async (lead) => {
    const website = normalizeWebsiteUrl(lead.website || lead.domain);
    if (!website) {
      reject('invalid_website_url');
      return null;
    }
    if (seen.has(website)) {
      reject('duplicate_website');
      return null;
    }
    seen.add(website);

    if (!isLikelyOfficialLeadCandidate({ ...lead, website })) {
      reject('not_official_business_site');
      return null;
    }

    if (hasTrustedWebsiteValidation(lead)) {
      if (!matchesCaptureIntent(lead, captureConfig)) {
        reject('intent_mismatch');
        return null;
      }
      const missing = getMissingRequirement(lead, contactRequirements);
      if (missing) {
        reject(`missing_${missing}`);
        return null;
      }
      return { ...lead, website, isValid: true, status: 'qualified' };
    }

    const validated = await validateWebsite({ ...lead, website }, fetchImpl);
    if (!validated) {
      reject('website_unreachable_or_not_html');
      return null;
    }

    if (!isLikelyOfficialLeadCandidate(validated) || !matchesCaptureIntent(validated, captureConfig)) {
      reject('intent_mismatch');
      return null;
    }

    const candidate = buildQualifiedLead({ ...lead, website }, validated);
    const missing = getMissingRequirement(candidate, contactRequirements);
    if (missing) {
      reject(`missing_${missing}`);
      return null;
    }

    return candidate;
  };

  const candidates = rawLeads.slice(0, maxCandidatesToScan);
  for (let index = 0; index < candidates.length && qualified.length < quantity; index += concurrency) {
    const batch = candidates.slice(index, index + concurrency);
    scanned += batch.length;
    const results = await Promise.all(batch.map(validateLead));
    for (const lead of results) {
      if (!lead || qualified.length >= quantity) continue;
      qualified.push(lead);
      onLead?.(lead, qualified.length);
    }
    onProgress?.({
      scanned,
      qualified: qualified.length,
      totalCandidates: candidates.length,
      rejectionReasons,
    });
  }

  return {
    qualified,
    rejectionReasons,
    rejectedCount: scanned - qualified.length,
    domainValidated: qualified.length,
    scannedCount: scanned,
  };
};
