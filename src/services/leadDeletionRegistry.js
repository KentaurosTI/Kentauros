export const getDeletedLeadStorageKey = (tenantId, userId) =>
  `kentauros_deleted_leads_${tenantId || 'no-tenant'}_${userId || 'no-user'}`;

export const readDeletedLeadIds = (storage, tenantId, userId) => {
  try {
    const values = JSON.parse(storage.getItem(getDeletedLeadStorageKey(tenantId, userId)) || '[]');
    return new Set(Array.isArray(values) ? values.map(String) : []);
  } catch {
    return new Set();
  }
};

export const writeDeletedLeadIds = (storage, tenantId, userId, deletedIds) => {
  storage.setItem(
    getDeletedLeadStorageKey(tenantId, userId),
    JSON.stringify([...deletedIds].filter(Boolean).map(String))
  );
};

export const markLeadDeleted = (storage, tenantId, userId, leadId) => {
  if (!leadId) return new Set();
  const deletedIds = readDeletedLeadIds(storage, tenantId, userId);
  deletedIds.add(String(leadId));
  writeDeletedLeadIds(storage, tenantId, userId, deletedIds);
  return deletedIds;
};

export const clearDeletedLead = (storage, tenantId, userId, leadId) => {
  if (!leadId) return readDeletedLeadIds(storage, tenantId, userId);
  const deletedIds = readDeletedLeadIds(storage, tenantId, userId);
  deletedIds.delete(String(leadId));
  writeDeletedLeadIds(storage, tenantId, userId, deletedIds);
  return deletedIds;
};

export const filterDeletedLeads = (leads, deletedIds) =>
  leads.filter(lead => !deletedIds.has(String(lead.id)));

export const mergeLeadSources = (remoteLeads, localLeads, deletedIds) => {
  const activeRemoteLeads = filterDeletedLeads(remoteLeads, deletedIds);
  const activeLocalLeads = filterDeletedLeads(localLeads, deletedIds);
  const remoteIds = new Set(activeRemoteLeads.map(lead => lead.id));
  const pendingLocalLeads = activeLocalLeads.filter(lead => !remoteIds.has(lead.id));

  return [...activeRemoteLeads, ...pendingLocalLeads];
};
