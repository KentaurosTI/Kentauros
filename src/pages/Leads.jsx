import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { useApp } from '../context/AppContext';
import { useI18n } from '../context/I18nContext';
import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import { useWorkflow } from '../hooks/useWorkflow';
import Timeline from '../components/ui/Timeline';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Textarea from '../components/ui/Textarea';
import EmptyState from '../components/ui/EmptyState';
import Checkbox from '../components/ui/Checkbox';
import OpportunityScore from '../components/leads/OpportunityScore';
import { Search, Plus, Building2, User, Mail, Phone, DollarSign, Zap, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { createLeadInteraction } from '../services/leadCapture/leadConversionStrategy';
import { triggerCapLeadDownload } from '../services/capleadDownload';
import { buildOpportunityTimeline, canTransitionLeadStatus } from '../services/commercialFlow';
import { getLeadCoolingAlerts } from '../services/continuousImprovement';
import {
  LEAD_PAGE_SIZE_OPTIONS,
  getLeadPage,
  getSelectableLeadIds,
  reconcileSelectedLeadIds,
} from './leadTableControls';

const LEAD_STATUSES = ['new', 'qualified', 'discovery', 'proposal', 'won', 'lost'];

const Leads = () => {
  const { t } = useI18n();
  const { leads, addLead, updateLead, deleteLead, discoveries, proposals = [], projects = [], clients = [], prototypes = [], updateDiscovery } = useData();
  const { user, addNotification } = useApp();
  const navigate = useNavigate();
  const { promoteLeadToDiscovery } = useWorkflow();
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [selectedLead, setSelectedLead] = useState(null);
  const [leadToDelete, setLeadToDelete] = useState(null);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
  const [isEditingLead, setIsEditingLead] = useState(false);
  const [editLead, setEditLead] = useState(null);
  const [isNewLeadModalOpen, setIsNewLeadModalOpen] = useState(false);
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedLeadIds, setSelectedLeadIds] = useState(() => new Set());
  const [viewMode, setViewMode] = useState('table');

  // New lead form state
  const [newLead, setNewLead] = useState({
    company: '',
    contact: '',
    email: '',
    phone: '',
    source: 'LinkedIn',
    value: 0,
    notes: ''
  });

  const filteredLeads = useMemo(() => leads.filter(lead => {
    const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;
    const matchesSearch = (lead.company || '').toLowerCase().includes(search.toLowerCase()) || 
                         (lead.contact || '').toLowerCase().includes(search.toLowerCase());
    const matchesSource = sourceFilter === 'all' || lead.source === sourceFilter;
    const isCapturedLead = lead.source === 'Captura Automática' || lead.pricingModel === 'ai_development' || lead.captureIdentity;
    const matchesOwner = !isCapturedLead ||
      !lead.commercialOwnerUserId ||
      lead.commercialOwnerUserId === user?.id ||
      user?.role === 'admin';
    return matchesStatus && matchesSearch && matchesSource && matchesOwner;
  }), [leads, search, sourceFilter, statusFilter, user?.id, user?.role]);

  const leadPage = useMemo(
    () => getLeadPage(filteredLeads, currentPage, pageSize),
    [filteredLeads, currentPage, pageSize]
  );
  const selectedVisibleLeadIds = useMemo(
    () => reconcileSelectedLeadIds(selectedLeadIds, filteredLeads),
    [selectedLeadIds, filteredLeads]
  );
  const pageLeadIds = useMemo(() => getSelectableLeadIds(leadPage.pageLeads), [leadPage.pageLeads]);
  const coolingAlerts = useMemo(() => getLeadCoolingAlerts(filteredLeads), [filteredLeads]);
  const coolingLeadIds = useMemo(() => new Set(coolingAlerts.map(alert => String(alert.leadId))), [coolingAlerts]);
  const selectedCount = selectedVisibleLeadIds.size;
  const allPageLeadsSelected = pageLeadIds.length > 0 && pageLeadIds.every(id => selectedVisibleLeadIds.has(id));

  const resetLeadTableState = () => {
    setCurrentPage(1);
    setSelectedLeadIds(new Set());
  };

  const handleStatusFilterChange = (status) => {
    setStatusFilter(status);
    resetLeadTableState();
  };

  const handleSearchChange = (event) => {
    setSearch(event.target.value);
    resetLeadTableState();
  };

  const handleSourceFilterChange = (source) => {
    setSourceFilter(source);
    resetLeadTableState();
  };

  const handlePageSizeChange = (size) => {
    setPageSize(size);
    resetLeadTableState();
  };

  const handleCapLeadDownload = () => {
    const downloadUrl = triggerCapLeadDownload(window, import.meta.env);
    addNotification(
      'Download iniciado',
      `Baixando a última versão funcional do CapLead: ${downloadUrl}`,
      'info'
    );
  };

  const getStatusType = (status) => {
    switch (status) {
      case 'new': return 'secondary';
      case 'qualified': return 'accent';
      case 'discovery': return 'accent';
      case 'proposal': return 'warning';
      case 'won': return 'success';
      case 'lost': return 'danger';
      default: return 'secondary';
    }
  };

  const formatCurrency = (value) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value || 0));

  const getSuggestedWebsiteValue = (lead) => {
    const leadValue = Number(lead?.value || 0);
    return leadValue > 0 ? leadValue : 15000;
  };

  const handleStatusChange = (lead, status) => {
    const transition = canTransitionLeadStatus(lead.status, status);
    if (!transition.allowed) {
      addNotification('Transicao bloqueada', transition.reason || 'Status invalido para este lead.', 'error');
      return;
    }
    updateLead(lead.id, {
      status,
      lastActivity: new Date().toISOString().split('T')[0],
      interactionHistory: [
        ...(lead.interactionHistory || []),
        createLeadInteraction('status_changed', `Status alterado para ${t(`status.${status}`)}.`, {
          from: lead.status,
          to: status,
          actor: user?.id,
        }),
      ],
    });
    addNotification('Status atualizado', `${lead.company} movido para ${t(`status.${status}`)}.`, 'success');
  };

  const handleCreateLead = (e) => {
    e.preventDefault();
    if (!newLead.company || !newLead.contact) {
      addNotification(t('common.error', 'Error'), t('leads.notifications.error.required', 'Company and Contact are required.'), 'error');
      return;
    }

    const leadValue = Number(newLead.value) || 0;

    addLead({
      ...newLead,
      value: leadValue,
      status: 'new',
      score: Math.floor(Math.random() * 40) + 30, // Random initial score
      stage: 'warm',
      createdAt: new Date().toISOString().split('T')[0],
      lastActivity: new Date().toISOString().split('T')[0]
    });

    addNotification(t('common.success', 'Success'), t('leads.notifications.success.added', 'New lead added to the pipeline.'), 'success');
    setIsNewLeadModalOpen(false);
    setNewLead({
      company: '',
      contact: '',
      email: '',
      phone: '',
      source: 'LinkedIn',
      value: 0,
      notes: ''
    });
  };

  const handleDeleteLead = () => {
    if (!leadToDelete) return;
    deleteLead(leadToDelete.id);
    setSelectedLeadIds(prev => {
      const next = new Set(prev);
      next.delete(leadToDelete.id);
      return next;
    });
    if (selectedLead?.id === leadToDelete.id) {
      setSelectedLead(null);
    }
    addNotification('Lead removido', `${leadToDelete.company} foi removido da gestão de leads.`, 'success');
    setLeadToDelete(null);
  };

  const toggleLeadSelection = (leadId) => {
    setSelectedLeadIds(prev => {
      const next = new Set(prev);
      if (next.has(leadId)) {
        next.delete(leadId);
      } else {
        next.add(leadId);
      }
      return next;
    });
  };

  const togglePageSelection = () => {
    setSelectedLeadIds(prev => {
      const next = new Set(prev);
      if (allPageLeadsSelected) {
        pageLeadIds.forEach(id => next.delete(id));
      } else {
        pageLeadIds.forEach(id => next.add(id));
      }
      return next;
    });
  };

  const handleBulkDeleteLeads = () => {
    if (selectedVisibleLeadIds.size === 0) return;
    const idsToDelete = [...selectedVisibleLeadIds];
    const deletedCompanies = filteredLeads
      .filter(lead => selectedVisibleLeadIds.has(lead.id))
      .map(lead => lead.company);

    idsToDelete.forEach(id => deleteLead(id));
    if (selectedLead && selectedVisibleLeadIds.has(selectedLead.id)) {
      setSelectedLead(null);
    }

    setSelectedLeadIds(new Set());
    setIsBulkDeleteOpen(false);
    addNotification(
      'Leads removidos',
      `${idsToDelete.length} registro${idsToDelete.length > 1 ? 's' : ''} removido${idsToDelete.length > 1 ? 's' : ''}: ${deletedCompanies.slice(0, 3).join(', ')}${deletedCompanies.length > 3 ? '...' : ''}`,
      'success'
    );
  };

  const openLeadDetails = (lead) => {
    setSelectedLead(lead);
    setIsEditingLead(false);
    setEditLead(null);
  };

  const openLeadOpportunity = (lead) => {
    navigate(`/leads/${lead.id}`);
  };

  const kanbanColumns = useMemo(() => LEAD_STATUSES.map(status => ({
    status,
    leads: filteredLeads.filter(lead => (lead.status || 'new') === status),
  })), [filteredLeads]);

  const startEditLead = () => {
    setEditLead({
      company: selectedLead.company || '',
      contact: selectedLead.contact || '',
      email: selectedLead.email || '',
      phone: selectedLead.phone || '',
      source: selectedLead.source || 'Site',
      value: selectedLead.value || 0,
      status: selectedLead.status || 'new',
      industry: selectedLead.industry || '',
      notes: selectedLead.notes || '',
      tags: selectedLead.tags || [],
    });
    setIsEditingLead(true);
  };

  const saveLeadEdit = () => {
    if (!selectedLead || !editLead) return;
    const updated = {
      ...editLead,
      value: Number(editLead.value || 0),
      lastActivity: new Date().toISOString().split('T')[0],
      interactionHistory: [
        ...(selectedLead.interactionHistory || []),
        createLeadInteraction('lead_edited', 'Dados do lead atualizados manualmente.', {
          actor: user?.id,
          changedFields: Object.keys(editLead).filter(key => editLead[key] !== selectedLead[key]),
        }),
      ],
    };
    updateLead(selectedLead.id, updated);
    
    // Sync with Discovery if exists
    const associatedDiscovery = discoveries.find(d => d.leadId === selectedLead.id);
    if (associatedDiscovery) {
      updateDiscovery(associatedDiscovery.id, { 
        estimatedValue: updated.value,
        clientName: updated.company
      });
    }

    setSelectedLead({ ...selectedLead, ...updated });
    setIsEditingLead(false);
    setEditLead(null);
    addNotification('Lead atualizado', `${updated.company} foi atualizado com sucesso.`, 'success');
  };

  return (
    <div className="leads-page animate-fade-in">
      <PageHeader 
        title={t('leads.title')} 
        subtitle={t('leads.subtitle')}
        actions={
          <div className="flex gap-md">
            <Button 
              variant="success" 
              onClick={handleCapLeadDownload}
              icon={Zap}
              className="bg-success hover:bg-[#0ea271] text-white border-none shadow-[0_4px_12px_rgba(16,185,129,0.25)]"
            >
              {t('leads.capture.button', 'Captura Automática')}
            </Button>
            <Button variant="primary" onClick={() => setIsNewLeadModalOpen(true)} icon={Plus}>{t('leads.addNew')}</Button>
          </div>
        }
      />

      <Card>
        <div className="flex justify-between items-center mb-lg gap-md flex-wrap">
          <div className="tabs m-0">
            {['all', 'new', 'qualified', 'discovery', 'proposal', 'won', 'lost'].map(st => (
              <button 
                key={st}
                className={`tab ${statusFilter === st ? 'active' : ''}`} 
                onClick={() => handleStatusFilterChange(st)}
              >
                {st === 'all' ? t('leads.allLeads') : t(`status.${st}`)}
              </button>
            ))}
          </div>

          <div className="flex gap-md items-end">
            <Input 
              placeholder={t('leads.searchPlaceholder')} 
              value={search}
              onChange={handleSearchChange}
              icon={Search}
              wrapperClassName="w-80"
            />
            <Select 
              value={sourceFilter}
              onChange={handleSourceFilterChange}
              options={[
                { value: 'all', label: t('common.allSources') },
                { value: 'LinkedIn', label: t('leads.form.source.linkedin') },
                { value: 'Indicação', label: t('leads.form.source.referral') },
                { value: 'Site', label: t('leads.form.source.website') },
                { value: 'Evento', label: t('leads.form.source.event') },
                { value: 'Google Ads', label: t('leads.form.source.googleAds') },
                { value: 'Captura Automática', label: t('leads.capture.button', 'Captura Automática') },
              ]}
              wrapperClassName="w-48"
            />
          </div>
        </div>

        <div className="flex justify-between items-center mb-md gap-md flex-wrap">
          <div className="flex items-center gap-md flex-wrap">
            <Select
              value={pageSize}
              onChange={handlePageSizeChange}
              options={LEAD_PAGE_SIZE_OPTIONS.map(size => ({
                value: size,
                label: `${size} por página`,
              }))}
              wrapperClassName="w-40"
            />
            <span className="text-xs text-muted font-bold">
              {leadPage.startItem}-{leadPage.endItem} de {leadPage.totalItems} leads
            </span>
          </div>

          <div className="flex items-center gap-sm flex-wrap">
            <Button
              variant={viewMode === 'table' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setViewMode('table')}
            >
              Tabela
            </Button>
            <Button
              variant={viewMode === 'kanban' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setViewMode('kanban')}
            >
              Kanban comercial
            </Button>
            {selectedCount > 0 && (
              <>
                <span className="text-xs text-muted font-bold">
                  {selectedCount} selecionado{selectedCount > 1 ? 's' : ''}
                </span>
                <Button
                  variant="danger"
                  size="sm"
                  icon={Trash2}
                  onClick={() => setIsBulkDeleteOpen(true)}
                >
                  Excluir selecionados
                </Button>
              </>
            )}
          </div>
        </div>

        {viewMode === 'kanban' ? (
          <div className="grid grid-3 gap-md">
            {kanbanColumns.map(column => (
              <Card key={column.status} title={t(`status.${column.status}`)} headerActions={<Badge variant={getStatusType(column.status)}>{column.leads.length}</Badge>}>
                <div className="flex flex-col gap-sm">
                  {column.leads.map(lead => (
                    <div key={lead.id} className="p-md bg-secondary border-radius-sm border-subtle">
                      <div className="flex justify-between gap-sm items-start">
                        <div>
                          <strong>{lead.company}</strong>
                          <div className="text-xs text-muted">{formatCurrency(lead.value)} · {lead.source}</div>
                        </div>
                        <OpportunityScore lead={lead} compact />
                      </div>
                      <div className="text-xs text-muted mt-sm">
                        {lead.nextAction || (coolingLeadIds.has(String(lead.id)) ? 'Follow-up recomendado' : 'Validar diagnóstico')}
                      </div>
                      <div className="flex gap-xs mt-sm">
                        <Button variant="secondary" size="sm" onClick={() => openLeadOpportunity(lead)}>Oportunidade</Button>
                        <Button variant="primary" size="sm" onClick={() => openLeadDetails(lead)}>Resumo</Button>
                      </div>
                    </div>
                  ))}
                  {column.leads.length === 0 && <span className="text-xs text-muted">Sem leads nesta etapa.</span>}
                </div>
              </Card>
            ))}
          </div>
        ) : (
        <div className="table-wrapper leads-table-wrapper">
          <table className="table leads-table">
            <thead>
              <tr>
                <th style={{ width: 48 }}>
                  <Checkbox
                    id="select-visible-leads"
                    checked={allPageLeadsSelected}
                    onChange={togglePageSelection}
                    aria-label="Selecionar leads visíveis"
                  />
                </th>
                <th>{t('leads.company')}</th>
                <th>{t('leads.contact')}</th>
                <th>{t('leads.value')}</th>
                <th>Score</th>
                <th>Próxima ação</th>
                <th>{t('common.status')}</th>
                <th>{t('leads.source')}</th>
                <th className="leads-actions-column">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {leadPage.pageLeads.map(lead => (
                <tr key={lead.id}>
                  <td>
                    <Checkbox
                      id={`select-lead-${lead.id}`}
                      checked={selectedLeadIds.has(lead.id)}
                      onChange={() => toggleLeadSelection(lead.id)}
                      aria-label={`Selecionar ${lead.company}`}
                    />
                  </td>
                  <td>
                    <div className="font-bold">{lead.company}</div>
                    <div className="text-xs text-muted">{lead.industry || 'Tecnologia'}</div>
                  </td>
                  <td>
                    <div>{lead.contact}</div>
                    <div className="text-xs text-muted">{lead.email}</div>
                    {lead.whatsappSent && (
                      <div className="text-xs text-success font-bold">WhatsApp enviado</div>
                    )}
                  </td>
                  <td>
                    <div className="font-mono font-bold">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(lead.value)}
                    </div>
                    {lead.pricingModel === 'ai_development' && (
                      <div className="text-xs text-muted">
                        IA + {lead.commercialOwnerName || 'Comercial'}
                      </div>
                    )}
                  </td>
                  <td>
                    <OpportunityScore lead={lead} compact />
                  </td>
                  <td className="text-sm">
                    {lead.nextAction || (coolingLeadIds.has(String(lead.id)) ? 'Follow-up recomendado' : 'Validar diagnóstico')}
                    {coolingLeadIds.has(String(lead.id)) && <div className="text-xs text-danger font-bold">Risco de esfriar</div>}
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <Badge variant={getStatusType(lead.status)}>
                        {t(`status.${lead.status}`)}
                      </Badge>
                      <Select
                        value={lead.status || 'new'}
                        onChange={(status) => handleStatusChange(lead, status)}
                        options={LEAD_STATUSES.map(status => ({
                          value: status,
                          label: t(`status.${status}`),
                        }))}
                        wrapperClassName="lead-status-select"
                      />
                    </div>
                  </td>
                  <td className="text-sm">{lead.source}</td>
                  <td className="leads-actions-column">
                    <div className="leads-row-actions">
                      <Button variant="secondary" size="sm" onClick={() => openLeadDetails(lead)}>{t('common.details')}</Button>
                      <Button variant="secondary" size="sm" onClick={() => openLeadOpportunity(lead)}>Oportunidade</Button>
                      {lead.status === 'new' && (
                        <Button 
                          variant="primary" 
                          size="sm"
                          onClick={() => promoteLeadToDiscovery(lead)}
                        >
                          {t('common.promote')}
                        </Button>
                      )}
                      <Button variant="danger" size="sm" onClick={() => setLeadToDelete(lead)}>Excluir</Button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredLeads.length === 0 && (
                <tr>
                  <td colSpan="9">
                    <EmptyState 
                      title={t('leads.noLeads')}
                      description={t('leads.noLeadsDesc', 'Try adjusting your filters to find what you are looking for.')}
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          {filteredLeads.length > 0 && (
            <div className="capture-pagination">
              <div className="capture-pagination-range">
                Mostrando {leadPage.startItem}-{leadPage.endItem} de {leadPage.totalItems}
              </div>
              <div className="capture-pagination-controls">
                <Button
                  variant="secondary"
                  size="sm"
                  className="btn-icon"
                  onClick={() => setCurrentPage(page => Math.max(1, page - 1))}
                  disabled={leadPage.currentPage <= 1}
                  aria-label="Página anterior"
                >
                  <ChevronLeft size={16} />
                </Button>
                <span className="capture-pagination-page">
                  Página {leadPage.currentPage} de {leadPage.totalPages}
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  className="btn-icon"
                  onClick={() => setCurrentPage(page => Math.min(leadPage.totalPages, page + 1))}
                  disabled={leadPage.currentPage >= leadPage.totalPages}
                  aria-label="Próxima página"
                >
                  <ChevronRight size={16} />
                </Button>
              </div>
            </div>
          )}
        </div>
        )}
      </Card>

      {/* New Lead Modal */}
      <Modal
        isOpen={isNewLeadModalOpen}
        onClose={() => setIsNewLeadModalOpen(false)}
        title={t('leads.addNew')}
        actions={
          <>
            <Button variant="secondary" onClick={() => setIsNewLeadModalOpen(false)}>{t('common.cancel')}</Button>
            <Button variant="primary" onClick={handleCreateLead}>{t('common.add')}</Button>
          </>
        }
      >
        <div className="flex flex-col gap-6">
          <div className="grid grid-2">
            <Input 
              label={t('leads.companyName')}
              value={newLead.company}
              onChange={e => setNewLead({...newLead, company: e.target.value})}
              placeholder="Innovate Inc."
              icon={Building2}
            />
            <Input 
              label={t('leads.contactName')}
              value={newLead.contact}
              onChange={e => setNewLead({...newLead, contact: e.target.value})}
              placeholder="John Doe"
              icon={User}
            />
          </div>
          <div className="grid grid-2">
            <Input 
              label={t('leads.form.email', 'Email')}
              type="email"
              value={newLead.email}
              onChange={e => setNewLead({...newLead, email: e.target.value})}
              placeholder="john@example.com"
              icon={Mail}
            />
            <Input 
              label={t('leads.form.phone', 'Telefone')}
              value={newLead.phone}
              onChange={e => setNewLead({...newLead, phone: e.target.value})}
              placeholder="(11) 98888-7777"
              icon={Phone}
            />
          </div>
          <div className="grid grid-2">
            <Select 
              label={t('leads.source')}
              value={newLead.source}
              onChange={val => setNewLead({...newLead, source: val})}
              options={[
                { value: 'LinkedIn', label: t('leads.form.source.linkedin') },
                { value: 'Indicação', label: t('leads.form.source.referral') },
                { value: 'Site', label: t('leads.form.source.website') },
                { value: 'Evento', label: t('leads.form.source.event') },
                { value: 'Google Ads', label: t('leads.form.source.googleAds') },
              ]}
            />
            <Input 
              label={t('leads.estimatedValueBrl')}
              type="number"
              value={newLead.value}
              onChange={e => setNewLead({...newLead, value: isNaN(parseFloat(e.target.value)) ? 0 : parseFloat(e.target.value)})}
              icon={DollarSign}
            />
          </div>
          <Textarea 
            label={t('common.notes')}
            value={newLead.notes}
            onChange={e => setNewLead({...newLead, notes: e.target.value})}
            placeholder="Internal notes about the lead..."
          />
        </div>
      </Modal>
      
      {/* Details Modal */}
      <Modal
        isOpen={!!selectedLead}
        onClose={() => { setSelectedLead(null); setIsEditingLead(false); setEditLead(null); }}
        title={selectedLead?.company}
        actions={
          <>
            <Button variant="secondary" onClick={() => { setSelectedLead(null); setIsEditingLead(false); setEditLead(null); }}>{t('common.close')}</Button>
            <Button variant="danger" onClick={() => setLeadToDelete(selectedLead)}>Excluir</Button>
            {isEditingLead ? (
              <Button variant="primary" onClick={saveLeadEdit}>Salvar</Button>
            ) : (
              <Button variant="primary" onClick={startEditLead}>{t('common.edit')}</Button>
            )}
          </>
        }
      >
        {selectedLead && (
          <div className="lead-details">
            {isEditingLead && editLead ? (
              <div className="lead-edit-form">
                <div className="grid grid-2">
                  <Input label="Empresa" value={editLead.company} onChange={event => setEditLead(prev => ({ ...prev, company: event.target.value }))} />
                  <Input label="Contato" value={editLead.contact} onChange={event => setEditLead(prev => ({ ...prev, contact: event.target.value }))} />
                  <Input label="E-mail" type="email" value={editLead.email} onChange={event => setEditLead(prev => ({ ...prev, email: event.target.value }))} />
                  <Input label="Telefone" value={editLead.phone} onChange={event => setEditLead(prev => ({ ...prev, phone: event.target.value }))} />
                  <Input label="Segmento" value={editLead.industry} onChange={event => setEditLead(prev => ({ ...prev, industry: event.target.value }))} />
                  <Input label="Valor estimado" type="number" value={editLead.value} onChange={event => setEditLead(prev => ({ ...prev, value: event.target.value }))} />
                  <Select
                    label="Status"
                    value={editLead.status}
                    onChange={value => setEditLead(prev => ({ ...prev, status: value }))}
                    options={LEAD_STATUSES.map(status => ({ value: status, label: t(`status.${status}`) }))}
                  />
                  <Select
                    label="Fonte"
                    value={editLead.source}
                    onChange={value => setEditLead(prev => ({ ...prev, source: value }))}
                    options={[
                      { value: 'LinkedIn', label: 'LinkedIn' },
                      { value: 'Indicação', label: 'Indicação' },
                      { value: 'Site', label: 'Site' },
                      { value: 'Evento', label: 'Evento' },
                      { value: 'Google Ads', label: 'Google Ads' },
                      { value: 'Captura Automática', label: 'Captura Automática' },
                    ]}
                  />
                  <div className="input-group">
                    <label className="input-label">Tags (separadas por vírgula)</label>
                    <Input 
                      value={editLead.tags.join(', ')} 
                      onChange={event => setEditLead(prev => ({ ...prev, tags: event.target.value.split(',').map(t => t.trim()).filter(Boolean) }))} 
                    />
                  </div>
                </div>
                <Textarea
                  label="Notas internas"
                  value={editLead.notes}
                  onChange={event => setEditLead(prev => ({ ...prev, notes: event.target.value }))}
                  wrapperClassName="mt-md"
                />
              </div>
            ) : (
              <>
            <div className="grid grid-2 mb-lg">
              <div className="input-group">
                <label className="input-label">{t('common.status')}</label>
                <div><Badge variant={getStatusType(selectedLead.status)}>{t(`status.${selectedLead.status}`)}</Badge></div>
              </div>
              <div className="input-group">
                <label className="input-label">{t('leads.estimatedValue')}</label>
                <div className="flex items-center gap-xs">
                  <span className="font-bold">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedLead.value)}
                  </span>
                  {selectedLead.status === 'qualified' && (
                    <span className="text-success text-xs font-bold" title="High conversion potential">
                      ↑ 15% Trend
                    </span>
                  )}
                </div>
                {selectedLead.pricingModel === 'ai_development' && (
                  <div className="text-xs text-muted mt-xs">
                    Estimativa ajustada para desenvolvimento com IA. Comercial vinculado: {selectedLead.commercialOwnerName || selectedLead.commercialOwnerEmail || 'não informado'}.
                  </div>
                )}
                {selectedLead.conversionReadiness && (
                  <div className="text-xs text-muted mt-xs">
                    Prontidão comercial: {selectedLead.conversionReadiness}/100 · estágio {selectedLead.stage}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-2 gap-lg">
              <div>
                <div className="mb-lg">
                  <label className="input-label">{t('leads.contactInfo')}</label>
                  <div className="flex flex-col gap-1">
                    <span className="text-primary font-bold">{selectedLead.contact}</span>
                    <span className="text-sm text-secondary">{selectedLead.email}</span>
                    <span className="text-sm text-secondary">{selectedLead.phone}</span>
                  </div>
                </div>

                <div className="mb-lg">
                  <label className="input-label">Site do lead</label>
                  <div className="notes-box">
                    {selectedLead.website ? (
                      <a
                        className="text-info font-bold hover:underline break-all"
                        href={selectedLead.website}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {selectedLead.website.replace(/^https?:\/\//, '')}
                      </a>
                    ) : (
                      <div className="flex flex-col gap-1">
                        <strong>Oferecer criação e hospedagem</strong>
                        <span className="text-sm text-secondary">
                          Lead sem site identificado. Valor sugerido: {formatCurrency(getSuggestedWebsiteValue(selectedLead))}.
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mb-lg">
                  <label className="input-label">{t('leads.scorePotential')}</label>
                  <div className="flex items-center gap-md">
                    <div className="progress-bar-container">
                      <div className={`progress-bar-fill ${selectedLead.score > 70 ? 'bg-success' : 'bg-accent'}`} style={{ width: `${selectedLead.score || 75}%` }}></div>
                    </div>
                    <span className="text-sm font-bold">{selectedLead.score || 75}/100</span>
                  </div>
                </div>

                <div className="mb-lg">
                  <label className="input-label">{t('leads.internalNotes')}</label>
                  <div className="notes-box">
                    {selectedLead.notes || t('leads.defaultNote', 'Interessado em modernização de infraestrutura e consultoria em cloud. Próximo passo: agendar reunião de Discovery.')}
                  </div>
                </div>
                {selectedLead.prospectingPlan && (
                  <div className="mb-lg">
                    <label className="input-label">Plano de prospecção</label>
                    <div className="notes-box">
                      <strong>{selectedLead.prospectingPlan.offer?.label}</strong>
                      <ul style={{ paddingLeft: '1rem', marginTop: '.5rem' }}>
                        {(selectedLead.prospectingPlan.actions || []).slice(0, 3).map(action => (
                          <li key={action} className="text-xs text-muted mb-xs">{action}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
                {(selectedLead.conversionSignals || []).length > 0 && (
                  <div className="mb-lg">
                    <label className="input-label">Sinais de conversão</label>
                    <div className="flex gap-xs flex-wrap">
                      {selectedLead.conversionSignals.map(signal => (
                        <Badge key={signal.key} variant="secondary">{signal.label}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                {(selectedLead.tags || []).length > 0 && (
                  <div className="mb-lg">
                    <label className="input-label">Tags</label>
                    <div className="flex gap-xs flex-wrap">
                      {selectedLead.tags.map(tag => (
                        <Badge key={tag} variant="secondary">{tag}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="input-label">{t('leads.activityHistory')}</label>
                <div className="timeline-container-scrollable">
                  <Timeline
                    items={buildOpportunityTimeline({
                      lead: selectedLead,
                      discoveries,
                      proposals,
                      projects,
                      clients,
                      prototypes,
                      interactions: selectedLead.interactionHistory || [],
                    }).map(item => ({
                      title: item.title,
                      timestamp: item.date,
                      status: item.status,
                      description: item.entity,
                    }))}
                  />
                </div>
                {(selectedLead.interactionHistory || []).length > 0 && (
                  <div className="mt-lg">
                    <label className="input-label">Interações registradas</label>
                    {(selectedLead.interactionHistory || []).slice().reverse().map(item => (
                      <div key={item.id} className="text-xs text-muted mb-xs">
                        <strong>{item.type}</strong> · {new Date(item.createdAt).toLocaleString('pt-BR')}<br />
                        {item.description}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
              </>
            )}
          </div>
        )}
      </Modal>

      <Modal
        isOpen={isBulkDeleteOpen}
        onClose={() => setIsBulkDeleteOpen(false)}
        title="Excluir leads selecionados"
        actions={
          <>
            <Button variant="secondary" onClick={() => setIsBulkDeleteOpen(false)}>Cancelar</Button>
            <Button variant="danger" onClick={handleBulkDeleteLeads}>Excluir {selectedCount} registro{selectedCount > 1 ? 's' : ''}</Button>
          </>
        }
      >
        <p className="text-sm text-secondary">
          Tem certeza que deseja excluir {selectedCount} lead{selectedCount > 1 ? 's' : ''} selecionado{selectedCount > 1 ? 's' : ''}? Essa ação remove os registros da listagem e registra a remoção na auditoria.
        </p>
      </Modal>

      <Modal
        isOpen={!!leadToDelete}
        onClose={() => setLeadToDelete(null)}
        title="Excluir lead"
        actions={
          <>
            <Button variant="secondary" onClick={() => setLeadToDelete(null)}>Cancelar</Button>
            <Button variant="danger" onClick={handleDeleteLead}>Excluir definitivamente</Button>
          </>
        }
      >
        <p className="text-sm text-secondary">
          Tem certeza que deseja excluir <strong>{leadToDelete?.company}</strong>? Essa ação remove o lead da listagem e registra a remoção na auditoria.
        </p>
      </Modal>
    </div>
  );
};

export default Leads;
