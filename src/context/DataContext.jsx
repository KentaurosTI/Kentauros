import { createContext, useContext, useState, useEffect } from 'react';
import { useApp } from './AppContext';
import { useAudit } from './AuditContext';
import { mockLeads, mockClients, mockDiscoveries, mockProposals } from '../data/mock-leads';
import { mockProjects } from '../data/mock-projects';
import { mockBacklog, mockQATests, mockDeployments, mockTickets, mockAutomations } from '../data/mock-operations';
import { supabase } from '../services/supabaseClient';
import { clearDeletedLead, markLeadDeleted, mergeLeadSources, readDeletedLeadIds } from '../services/leadDeletionRegistry';

const DataContext = createContext();
const LEADS_TABLE = 'leads';
const LEAD_CONTACTS_TABLE = 'lead_contacts';
const OPERATIONAL_TABLE = 'operational_records';
const LEARNING_TABLE = 'learning_events';
let leadDatabaseUnavailable = false;
let leadContactsDatabaseUnavailable = false;
let operationalDatabaseUnavailable = false;

const getLeadStorageKey = (tenantId, userId) => `kentauros_leads_${tenantId || 'no-tenant'}_${userId || 'no-user'}`;
const getEntityStorageKey = (entityName, tenantId) => `kentauros_${entityName.toLowerCase()}_${tenantId || 'no-tenant'}_shared`;

const readLocalLeads = (tenantId, userId) => {
  try {
    return JSON.parse(localStorage.getItem(getLeadStorageKey(tenantId, userId)) || '[]');
  } catch {
    return [];
  }
};

const writeLocalLeads = (tenantId, userId, leads) => {
  localStorage.setItem(getLeadStorageKey(tenantId, userId), JSON.stringify(leads));
};

const readLocalEntity = (entityName, tenantId) => {
  try {
    return JSON.parse(localStorage.getItem(getEntityStorageKey(entityName, tenantId)) || '[]');
  } catch {
    return [];
  }
};

const writeLocalEntity = (entityName, tenantId, items) => {
  localStorage.setItem(getEntityStorageKey(entityName, tenantId), JSON.stringify(items));
};

const normalizeDate = (value) => {
  if (!value) return new Date().toISOString().split('T')[0];
  return String(value).includes('T') ? String(value).split('T')[0] : value;
};

const toLeadRow = (lead) => {
  const {
    id,
    tenant_id,
    user_id,
    company,
    contact,
    email,
    phone,
    source,
    status,
    score,
    stage,
    value,
    industry,
    notes,
    assignedTo,
    assigned_to,
    createdAt,
    created_at,
    lastActivity,
    last_activity,
    ...metadata
  } = lead;

  return {
    id,
    tenant_id,
    user_id,
    company,
    contact,
    email,
    phone,
    source,
    status,
    score,
    stage,
    value,
    industry,
    notes,
    assigned_to: assigned_to ?? assignedTo ?? null,
    created_at: created_at || createdAt || new Date().toISOString(),
    last_activity: last_activity || lastActivity || new Date().toISOString(),
    metadata,
  };
};

const fromLeadRow = (row) => ({
  ...(row.metadata || {}),
  id: row.id,
  tenant_id: row.tenant_id,
  user_id: row.user_id,
  company: row.company,
  contact: row.contact,
  email: row.email,
  phone: row.phone,
  source: row.source,
  status: row.status,
  score: row.score,
  stage: row.stage,
  value: row.value,
  industry: row.industry,
  notes: row.notes,
  assignedTo: row.assigned_to,
  createdAt: normalizeDate(row.created_at),
  lastActivity: normalizeDate(row.last_activity),
});

const normalizeContactValue = (value = '') => String(value || '').trim();

const getLeadContacts = (lead = {}) => {
  const contacts = lead.contacts || {};
  const rows = [
    ...(contacts.emails || []).map(value => ({ type: 'email', value })),
    ...(contacts.phones || []).map(value => ({ type: 'phone', value })),
    ...(contacts.whatsappPhones || []).map(value => ({ type: 'whatsapp', value })),
    lead.email ? { type: 'email', value: lead.email } : null,
    lead.phone ? { type: 'phone', value: lead.phone } : null,
    lead.whatsapp ? { type: 'whatsapp', value: lead.whatsapp } : null,
  ].filter(Boolean);

  const seen = new Set();
  return rows
    .map(contact => ({
      type: contact.type,
      value: normalizeContactValue(contact.value),
    }))
    .filter(contact => {
      if (!contact.value) return false;
      const key = `${contact.type}:${contact.value.toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
};

const persistLeadContacts = async (lead) => {
  if (leadContactsDatabaseUnavailable || !lead?.id) return;

  const contacts = getLeadContacts(lead);
  try {
    const { error: deleteError } = await supabase
      .from(LEAD_CONTACTS_TABLE)
      .delete()
      .eq('lead_id', lead.id);

    if (deleteError) throw deleteError;

    if (!contacts.length) return;

    const { error } = await supabase
      .from(LEAD_CONTACTS_TABLE)
      .insert(contacts.map(contact => ({
        lead_id: lead.id,
        contact_type: contact.type,
        contact_value: contact.value,
      })));

    if (error) throw error;
  } catch (error) {
    if (error.code === 'PGRST205' || error.code === '42P01') {
      leadContactsDatabaseUnavailable = true;
      return;
    }
    throw error;
  }
};

const persistLead = async (lead) => {
  if (leadDatabaseUnavailable) {
    return lead;
  }

  const { data, error } = await supabase
    .from(LEADS_TABLE)
    .upsert(toLeadRow(lead), { onConflict: 'id' })
    .select('*')
    .single();

  if (error) {
    if (error.code === 'PGRST205') {
      leadDatabaseUnavailable = true;
    }
    throw error;
  }

  const savedLead = fromLeadRow(data);
  await persistLeadContacts({ ...lead, id: savedLead.id });
  return savedLead;
};

const deleteRemoteLead = async (id) => {
  if (leadDatabaseUnavailable) return;

  const { error } = await supabase
    .from(LEADS_TABLE)
    .delete()
    .eq('id', id);

  if (error) {
    if (error.code === 'PGRST205') {
      leadDatabaseUnavailable = true;
    }
    throw error;
  }
};

const deleteRemoteOperationalEntity = async (entityName, item, tenantId) => {
  if (operationalDatabaseUnavailable || !item?.id) return;

  const rowKey = `${item.tenant_id || tenantId || 'tenant'}:${entityName}:${item.id}`;
  const { error } = await supabase
    .from(OPERATIONAL_TABLE)
    .delete()
    .eq('row_key', rowKey);

  if (error) {
    if (error.code === 'PGRST205') {
      operationalDatabaseUnavailable = true;
    }
    throw error;
  }
};

const loadRemoteLeads = async (tenantId, userId, userRole) => {
  if (leadDatabaseUnavailable) {
    throw new Error('Leads database unavailable');
  }

  let query = supabase
    .from(LEADS_TABLE)
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });

  if (userRole !== 'admin') {
    query = query.eq('user_id', userId);
  }

  const { data, error } = await query;

  if (error) {
    if (error.code === 'PGRST205') {
      leadDatabaseUnavailable = true;
    }
    throw error;
  }

  return (data || []).map(fromLeadRow);
};

const toOperationalRow = (entityName, item, actorUserId) => ({
  row_key: `${item.tenant_id || 'tenant'}:${entityName}:${item.id}`,
  tenant_id: item.tenant_id,
  entity_type: entityName,
  entity_id: String(item.id),
  user_id: actorUserId || item.user_id || null,
  data: item,
  updated_at: new Date().toISOString(),
});

const persistOperationalEntity = async (entityName, item, actorUserId) => {
  if (operationalDatabaseUnavailable) return item;

  const { data, error } = await supabase
    .from(OPERATIONAL_TABLE)
    .upsert(toOperationalRow(entityName, item, actorUserId), { onConflict: 'row_key' })
    .select('data')
    .single();

  if (error) {
    if (error.code === 'PGRST205') {
      operationalDatabaseUnavailable = true;
    }
    throw error;
  }

  return data?.data || item;
};

const loadRemoteEntity = async (entityName, tenantId) => {
  if (operationalDatabaseUnavailable) {
    throw new Error('Operational database unavailable');
  }

  const { data, error } = await supabase
    .from(OPERATIONAL_TABLE)
    .select('data')
    .eq('tenant_id', tenantId)
    .eq('entity_type', entityName)
    .order('updated_at', { ascending: false });

  if (error) {
    if (error.code === 'PGRST205') {
      operationalDatabaseUnavailable = true;
    }
    throw error;
  }

  return (data || []).map(row => row.data);
};

const persistLearningEvent = async (event) => {
  const { error } = await supabase.from(LEARNING_TABLE).insert(event);
  if (error && error.code !== 'PGRST205') {
    throw error;
  }
  return event;
};

const loadLearningEvents = async (tenantId) => {
  const { data, error } = await supabase
    .from(LEARNING_TABLE)
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(250);

  if (error) throw error;
  return data || [];
};

export const DataProvider = ({ children }) => {
  const { user } = useApp();
  const { logAudit } = useAudit();
  const tenantId = user?.tenant_id;

  const filterByTenant = (data) => data.filter(item => item.tenant_id === tenantId);

  const [leads, setLeads] = useState([]);
  const [clients, setClients] = useState([]);
  const [discoveries, setDiscoveries] = useState([]);
  const [proposals, setProposals] = useState([]);
  const [projects, setProjects] = useState([]);
  const [backlog, setBacklog] = useState([]);
  const [qaTests, setQaTests] = useState([]);
  const [deployments, setDeployments] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [automations, setAutomations] = useState([]);
  const [learningEvents, setLearningEvents] = useState([]);
  const [approvalRequests, setApprovalRequests] = useState([]);
  const [workflowRuns, setWorkflowRuns] = useState([]);
  const [captureJobs, setCaptureJobs] = useState([]);
  const [captureResults, setCaptureResults] = useState([]);

  useEffect(() => {
    let cancelled = false;

    if (tenantId) {
      const loadLeads = async () => {
        const localLeads = readLocalLeads(tenantId, user?.id);
        const deletedLeadIds = readDeletedLeadIds(localStorage, tenantId, user?.id);
        try {
          const remoteLeads = await loadRemoteLeads(tenantId, user?.id, user?.role);
          const nextLeads = mergeLeadSources(remoteLeads, localLeads, deletedLeadIds);
          const remoteIds = new Set(remoteLeads.map(lead => lead.id));
          const pendingLocalLeads = mergeLeadSources([], localLeads, deletedLeadIds)
            .filter(lead => !remoteIds.has(lead.id));

          if (!cancelled) {
            setLeads(nextLeads.length ? nextLeads : deletedLeadIds.size ? [] : filterByTenant(mockLeads));
            writeLocalLeads(tenantId, user?.id, nextLeads);
          }

          pendingLocalLeads.forEach(lead => {
            persistLead(lead).catch(err => {
              console.warn('Lead persistence sync failed:', err.message);
            });
          });
        } catch (err) {
          if (!cancelled) {
            const activeLocalLeads = mergeLeadSources([], localLeads, deletedLeadIds);
            setLeads(activeLocalLeads.length ? activeLocalLeads : deletedLeadIds.size ? [] : filterByTenant(mockLeads));
          }
          console.warn('Lead database load failed. Using local cache:', err.message);
        }
      };

      loadLeads();
      const loadOperational = async (entityName, setter, mockData) => {
        const localItems = readLocalEntity(entityName, tenantId);
        try {
          const remoteItems = await loadRemoteEntity(entityName, tenantId);
          const remoteIds = new Set(remoteItems.map(item => String(item.id)));
          const pendingLocalItems = localItems.filter(item => !remoteIds.has(String(item.id)));
          const nextItems = [...remoteItems, ...pendingLocalItems];

          if (!cancelled) {
            const initialItems = nextItems.length ? nextItems : filterByTenant(mockData);
            setter(initialItems);
            writeLocalEntity(entityName, tenantId, initialItems);
          }

          pendingLocalItems.forEach(item => {
            persistOperationalEntity(entityName, item, user?.id).catch(err => {
              console.warn(`${entityName} persistence sync failed:`, err.message);
            });
          });
        } catch (err) {
          if (!cancelled) {
            setter(localItems.length ? localItems : filterByTenant(mockData));
          }
          console.warn(`${entityName} database load failed. Using local cache:`, err.message);
        }
      };

      loadOperational('Client', setClients, mockClients);
      loadOperational('Discovery', setDiscoveries, mockDiscoveries);
      loadOperational('Proposal', setProposals, mockProposals);
      loadOperational('Project', setProjects, mockProjects);
      loadOperational('BacklogTask', setBacklog, mockBacklog);
      loadOperational('QATest', setQaTests, mockQATests);
      loadOperational('Deployment', setDeployments, mockDeployments);
      loadOperational('Ticket', setTickets, mockTickets);
      loadOperational('Automation', setAutomations, mockAutomations);
      loadOperational('ApprovalRequest', setApprovalRequests, []);
      loadOperational('WorkflowRun', setWorkflowRuns, []);
      const localLearningEvents = readLocalEntity('LearningEvent', tenantId);
      loadLearningEvents(tenantId)
        .then(events => {
          if (!cancelled) {
            const nextEvents = events.length ? events : localLearningEvents;
            setLearningEvents(nextEvents);
            writeLocalEntity('LearningEvent', tenantId, nextEvents);
          }
        })
        .catch(err => {
          if (!cancelled) setLearningEvents(localLearningEvents);
          console.warn('Learning events database load failed. Using local cache:', err.message);
        });
    } else {
      setLeads([]);
      setClients([]);
      setDiscoveries([]);
      setProposals([]);
      setProjects([]);
      setBacklog([]);
      setQaTests([]);
      setDeployments([]);
      setTickets([]);
      setAutomations([]);
      setCaptureJobs([]);
      setCaptureResults([]);
      setLearningEvents([]);
      setApprovalRequests([]);
      setWorkflowRuns([]);
    }
    return () => {
      cancelled = true;
    };
  }, [tenantId, user?.id]);

  useEffect(() => {
    if (!tenantId || leadDatabaseUnavailable) return undefined;

    const refreshLeadsFromRemote = async () => {
      try {
        const remoteLeads = await loadRemoteLeads(tenantId, user?.id, user?.role);
        const localLeads = readLocalLeads(tenantId, user?.id);
        const deletedLeadIds = readDeletedLeadIds(localStorage, tenantId, user?.id);
        const nextLeads = mergeLeadSources(remoteLeads, localLeads, deletedLeadIds);
        setLeads(nextLeads.length ? nextLeads : deletedLeadIds.size ? [] : filterByTenant(mockLeads));
        writeLocalLeads(tenantId, user?.id, nextLeads);
      } catch (err) {
        console.warn('Lead realtime refresh failed:', err.message);
      }
    };

    const channel = supabase
      .channel(`leads-live-${tenantId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: LEADS_TABLE, filter: `tenant_id=eq.${tenantId}` },
        () => {
          refreshLeadsFromRemote();
        }
      )
      .subscribe();

    const pollInterval = setInterval(refreshLeadsFromRemote, 30000);

    return () => {
      clearInterval(pollInterval);
      supabase.removeChannel(channel);
    };
  }, [tenantId, user?.id, user?.role]);

  // Helper para atualizar estados genericamente
  const updateEntity = (setter, entityName) => (id, data) => {
    setter(prev => {
      const itemToUpdate = prev.find(item => item.id === id);
      let updatedItem = null;
      if (itemToUpdate) {
        updatedItem = { ...itemToUpdate, ...data };
        logAudit('UPDATE', 'Data', entityName, id, itemToUpdate, updatedItem);
      }
      const next = prev.map(item => item.id === id ? { ...item, ...data } : item);

      if (entityName === 'Lead' && updatedItem) {
        writeLocalLeads(tenantId, user?.id, next);
        persistLead(updatedItem).catch(err => {
          console.warn('Lead database update failed:', err.message);
        });
      } else if (updatedItem) {
        writeLocalEntity(entityName, tenantId, next);
        persistOperationalEntity(entityName, updatedItem, user?.id).catch(err => {
          console.warn(`${entityName} database update failed:`, err.message);
        });
      }

      if (updatedItem) {
        const learningEvent = {
          id: crypto.randomUUID?.() || `learn_${Date.now()}`,
          tenant_id: tenantId,
          user_id: user?.id,
          source: 'user_action',
          event_type: `${entityName.toLowerCase()}_updated`,
          title: `${entityName} atualizado`,
          content: updatedItem.title || updatedItem.name || updatedItem.company || String(id),
          signal_strength: 2,
          tags: [entityName, 'update'],
          metadata: { entityName, entityId: id, changes: data },
          created_at: new Date().toISOString(),
        };
        setLearningEvents(prevEvents => {
          const nextEvents = [learningEvent, ...prevEvents].slice(0, 250);
          writeLocalEntity('LearningEvent', tenantId, nextEvents);
          return nextEvents;
        });
        persistLearningEvent(learningEvent).catch(err => {
          console.warn('Learning event persistence failed:', err.message);
        });
      }

      return next;
    });
  };

  const addEntity = (setter, entityName) => (data) => {
      const newId = data.id || crypto.randomUUID?.() || `lead_${Date.now()}`;
    const newItem = {
      id: newId,
      tenant_id: tenantId,
      user_id: user?.id,
      createdAt: new Date().toISOString().split('T')[0],
      lastActivity: new Date().toISOString().split('T')[0],
      ...data,
    };

    logAudit('CREATE', 'Data', entityName, newId, null, data);
    if (entityName === 'Lead') {
      clearDeletedLead(localStorage, tenantId, user?.id, newId);
    }
    const learningEvent = {
      id: crypto.randomUUID?.() || `learn_${Date.now()}`,
      tenant_id: tenantId,
      user_id: user?.id,
      source: 'user_action',
      event_type: `${entityName.toLowerCase()}_created`,
      title: `${entityName} criado`,
      content: data.title || data.name || data.company || String(newId),
      signal_strength: 2,
      tags: [entityName],
      metadata: { entityName, entityId: newId },
      created_at: new Date().toISOString(),
    };
    setLearningEvents(prevEvents => {
      const nextEvents = [learningEvent, ...prevEvents].slice(0, 250);
      writeLocalEntity('LearningEvent', tenantId, nextEvents);
      return nextEvents;
    });
    persistLearningEvent(learningEvent).catch(err => {
      console.warn('Learning event persistence failed:', err.message);
    });
    setter(prev => {
      const next = [...prev, newItem];
      if (entityName === 'Lead') {
        writeLocalLeads(tenantId, user?.id, next);
      } else {
        writeLocalEntity(entityName, tenantId, next);
      }
      return next;
    });

    if (entityName === 'Lead') {
      persistLead(newItem)
        .then(savedLead => {
          setLeads(prev => {
            const next = prev.map(item => item.id === newId ? { ...item, ...savedLead } : item);
            writeLocalLeads(tenantId, user?.id, next);
            return next;
          });
        })
        .catch(err => {
          console.warn('Lead database insert failed:', err.message);
          if (err.code === '23505') {
            setLeads(prev => {
              const next = prev.filter(item => item.id !== newId);
              writeLocalLeads(tenantId, user?.id, next);
              return next;
            });
          }
        });
    } else {
      persistOperationalEntity(entityName, newItem, user?.id)
        .then(savedItem => {
          setter(prev => {
            const next = prev.map(item => item.id === newId ? { ...item, ...savedItem } : item);
            writeLocalEntity(entityName, tenantId, next);
            return next;
          });
        })
        .catch(err => {
          console.warn(`${entityName} database insert failed:`, err.message);
        });
    }

    return newItem;
  };

  const deleteEntity = (setter, entityName) => (id) => {
    setter(prev => {
      const itemToDelete = prev.find(item => item.id === id);
      const next = prev.filter(item => item.id !== id);

      if (itemToDelete) {
        logAudit('DELETE', 'Data', entityName, id, itemToDelete, null);
      }

      if (entityName === 'Lead') {
        markLeadDeleted(localStorage, tenantId, user?.id, id);
        writeLocalLeads(tenantId, user?.id, next);
        deleteRemoteLead(id).catch(err => {
          console.warn('Lead database delete failed:', err.message);
        });
      } else {
        writeLocalEntity(entityName, tenantId, next);
        if (itemToDelete) {
          deleteRemoteOperationalEntity(entityName, itemToDelete, tenantId).catch(err => {
            console.warn(`${entityName} database delete failed:`, err.message);
          });
        }
      }

      if (itemToDelete) {
        const learningEvent = {
          id: crypto.randomUUID?.() || `learn_${Date.now()}`,
          tenant_id: tenantId,
          user_id: user?.id,
          source: 'user_action',
          event_type: `${entityName.toLowerCase()}_deleted`,
          title: `${entityName} removido`,
          content: itemToDelete.title || itemToDelete.name || itemToDelete.company || String(id),
          signal_strength: 1,
          tags: [entityName, 'delete'],
          metadata: { entityName, entityId: id },
          created_at: new Date().toISOString(),
        };
        setLearningEvents(prevEvents => {
          const nextEvents = [learningEvent, ...prevEvents].slice(0, 250);
          writeLocalEntity('LearningEvent', tenantId, nextEvents);
          return nextEvents;
        });
        persistLearningEvent(learningEvent).catch(err => {
          console.warn('Learning event persistence failed:', err.message);
        });
      }

      return next;
    });
  };

  const addLearningEvent = (data) => {
    const newEvent = {
      id: crypto.randomUUID?.() || `learn_${Date.now()}`,
      tenant_id: tenantId,
      user_id: user?.id,
      source: 'manual',
      event_type: 'note',
      title: 'Evento de aprendizado',
      content: '',
      signal_strength: 1,
      tags: [],
      metadata: {},
      created_at: new Date().toISOString(),
      ...data,
    };

    setLearningEvents(prev => {
      const next = [newEvent, ...prev].slice(0, 250);
      writeLocalEntity('LearningEvent', tenantId, next);
      return next;
    });

    persistLearningEvent(newEvent).catch(err => {
      console.warn('Learning event persistence failed:', err.message);
    });

    return newEvent;
  };

  return (
    <DataContext.Provider value={{
      leads, setLeads, updateLead: updateEntity(setLeads, 'Lead'), addLead: addEntity(setLeads, 'Lead'), deleteLead: deleteEntity(setLeads, 'Lead'),
      clients, setClients, updateClient: updateEntity(setClients, 'Client'), addClient: addEntity(setClients, 'Client'),
      discoveries, setDiscoveries, updateDiscovery: updateEntity(setDiscoveries, 'Discovery'), addDiscovery: addEntity(setDiscoveries, 'Discovery'), deleteDiscovery: deleteEntity(setDiscoveries, 'Discovery'),
      proposals, setProposals, updateProposal: updateEntity(setProposals, 'Proposal'), addProposal: addEntity(setProposals, 'Proposal'), deleteProposal: deleteEntity(setProposals, 'Proposal'),
      projects, setProjects, updateProject: updateEntity(setProjects, 'Project'), addProject: addEntity(setProjects, 'Project'),
      backlog, setBacklog, updateBacklog: updateEntity(setBacklog, 'BacklogTask'), addBacklog: addEntity(setBacklog, 'BacklogTask'),
      qaTests, setQaTests, updateQaTest: updateEntity(setQaTests, 'QATest'), addQaTest: addEntity(setQaTests, 'QATest'),
      deployments, setDeployments, updateDeployment: updateEntity(setDeployments, 'Deployment'), addDeployment: addEntity(setDeployments, 'Deployment'),
      tickets, setTickets, updateTicket: updateEntity(setTickets, 'Ticket'), addTicket: addEntity(setTickets, 'Ticket'),
      automations, setAutomations, updateAutomation: updateEntity(setAutomations, 'Automation'), addAutomation: addEntity(setAutomations, 'Automation'),
      learningEvents, setLearningEvents, addLearningEvent,
      approvalRequests, setApprovalRequests, updateApprovalRequest: updateEntity(setApprovalRequests, 'ApprovalRequest'), addApprovalRequest: addEntity(setApprovalRequests, 'ApprovalRequest'),
      workflowRuns, setWorkflowRuns, updateWorkflowRun: updateEntity(setWorkflowRuns, 'WorkflowRun'), addWorkflowRun: addEntity(setWorkflowRuns, 'WorkflowRun'),
      captureJobs, setCaptureJobs, 
      captureResults, setCaptureResults,
      startCaptureJob: (config) => {
        const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        const newJob = {
          id: jobId,
          tenant_id: tenantId,
          user_id: user?.id,
          ...config,
          status: 'running',
          progress: 0,
          total_found: 0,
          total_valid: 0,
          created_at: new Date().toISOString()
        };
        setCaptureJobs(prev => {
          // Keep only the most recent jobs (limit to 10)
          const recentJobs = prev.slice(-9);
          return [...recentJobs, newJob];
        });
        return jobId;
      },
      updateCaptureJob: (jobId, data) => {
        setCaptureJobs(prev => prev.map(job => job.id === jobId ? { ...job, ...data } : job));
      },
      addCaptureResults: (jobId, results) => {
        if (!results || !Array.isArray(results)) {
          console.warn('[DataContext] addCaptureResults: results inválido', results);
          return;
        }
        // Clear previous results for this job before adding new ones
        setCaptureResults(prev => {
          // Remove any existing results for this job
          const filtered = prev.filter(r => r.job_id !== jobId);
          const formattedResults = results
            .filter(res => res != null)
            .map(res => ({
              id: `res_${Math.random().toString(36).substring(2, 11)}`,
              job_id: jobId,
              tenant_id: tenantId,
              ...res,
              status: 'pending'
            }));
          return [...filtered, ...formattedResults];
        });
      },
      appendCaptureResults: (jobId, results) => {
        if (!results || !Array.isArray(results)) {
          console.warn('[DataContext] appendCaptureResults: results inválido', results);
          return;
        }
        setCaptureResults(prev => {
          const existingKeys = new Set(prev
            .filter(r => r.job_id === jobId)
            .map(r => r.captureIdentity || r.website || r.email || r.id));
          const formattedResults = results
            .filter(res => res != null)
            .filter(res => {
              const key = res.captureIdentity || res.website || res.email || res.id;
              if (!key || existingKeys.has(key)) return false;
              existingKeys.add(key);
              return true;
            })
            .map(res => ({
              id: `res_${Math.random().toString(36).substring(2, 11)}`,
              job_id: jobId,
              tenant_id: tenantId,
              ...res,
              status: 'pending'
            }));
          return [...prev, ...formattedResults];
        });
      },
      clearCaptureResults: (jobId) => {
        setCaptureResults(prev => {
          if (jobId) {
            return prev.filter(r => r.job_id !== jobId);
          }
          return [];
        });
      },
      clearAllCaptureJobs: () => {
        setCaptureJobs([]);
        setCaptureResults([]);
      }
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => useContext(DataContext);
