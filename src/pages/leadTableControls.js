export const LEAD_PAGE_SIZE_OPTIONS = [10, 25, 50];

export const getLeadPage = (leads, requestedPage, requestedPageSize) => {
  const pageSize = LEAD_PAGE_SIZE_OPTIONS.includes(Number(requestedPageSize))
    ? Number(requestedPageSize)
    : LEAD_PAGE_SIZE_OPTIONS[0];
  const totalItems = leads.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(Math.max(1, Number(requestedPage) || 1), totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const pageLeads = leads.slice(startIndex, startIndex + pageSize);

  return {
    pageLeads,
    pageSize,
    totalItems,
    totalPages,
    currentPage,
    startItem: totalItems === 0 ? 0 : startIndex + 1,
    endItem: startIndex + pageLeads.length,
  };
};

export const getSelectableLeadIds = (leads) => leads.map(lead => lead.id).filter(Boolean);

export const reconcileSelectedLeadIds = (selectedLeadIds, visibleLeads) => {
  const visibleIds = new Set(getSelectableLeadIds(visibleLeads));
  return new Set([...selectedLeadIds].filter(id => visibleIds.has(id)));
};
