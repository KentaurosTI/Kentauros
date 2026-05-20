const today = () => new Date().toISOString().split('T')[0];

export const hasUserTag = (user, tag) => {
  const normalized = tag.toUpperCase();
  const tags = (user?.tags || [user?.role]).filter(Boolean).map(item => String(item).toUpperCase());
  return tags.includes(normalized);
};

export const canAccessAdmin = (user) => hasUserTag(user, 'ADMIN') || user?.role === 'admin';
export const canAccessDev = (user) => canAccessAdmin(user) || hasUserTag(user, 'DEV');
export const canAccessCommercial = (user) => canAccessAdmin(user) || hasUserTag(user, 'COMERCIAL') || ['comercial', 'prevendas'].includes(user?.role);
export const canAccessUx = (user) => canAccessAdmin(user) || hasUserTag(user, 'UX') || hasUserTag(user, 'DEV') || user?.role === 'ux';
export const canAccessQa = (user) => canAccessAdmin(user) || hasUserTag(user, 'QA') || hasUserTag(user, 'DEV') || user?.role === 'qa';
export const canAccessDeploy = (user) => canAccessAdmin(user) || hasUserTag(user, 'DEVOPS') || hasUserTag(user, 'DEV') || user?.role === 'devops';

export const deriveDiscoveryKnowledge = (discoveries = []) => discoveries.map(discovery => ({
  ...discovery,
  meetingStatus: discovery.meetingStatus || (discovery.status === 'approved' ? 'reuniao_realizada' : 'em_andamento'),
  tags: discovery.tags || ['reuniao', 'requisitos', 'decisoes'],
  audioStatus: discovery.audioStatus || 'transcrito',
  recordings: discovery.recordings || [
    { id: `${discovery.id}-audio`, title: `Reuniao ${discovery.clientName}`, type: 'audio', status: 'salvo' },
  ],
  decisions: discovery.decisions || [
    'Priorizar entrega incremental com validação do cliente.',
    'Gerar backlog com dependências antes do desenvolvimento.',
    'Registrar critérios de aceite para QA e deploy.',
  ],
  rules: discovery.rules || [
    'Toda decisao aprovada precisa refletir em proposta, projeto e backlog.',
    'Alterações de escopo exigem nova validação comercial.',
  ],
}));

export const getMeetingReadyClients = (discoveries = [], leads = [], clients = []) => {
  const knowledge = deriveDiscoveryKnowledge(discoveries);
  return knowledge
    .filter(item => ['approved', 'awaiting_approval'].includes(item.status) || item.meetingStatus === 'reuniao_realizada')
    .map(item => {
      const lead = leads.find(entry => entry.id === item.leadId || entry.company === item.clientName);
      const client = clients.find(entry => entry.id === item.clientId || entry.name === item.clientName);
      return {
        id: item.id,
        clientName: item.clientName,
        contact: lead?.contact || client?.contact || 'Responsavel',
        email: lead?.email || client?.email || '',
        discoveryId: item.id,
        status: 'reuniao_realizada',
        summary: item.summary,
        suggestedValue: item.estimatedValue || item.value || 120000,
      };
    });
};

const signedProjectStatuses = new Set(['ready', 'kickoff', 'signed', 'accepted']);
const signedProposalStatuses = new Set(['approved', 'signed', 'won']);

export const getSignedReadyProjects = (projects = [], proposals = [], discoveries = [], backlog = [], leads = []) => {
  const knowledge = deriveDiscoveryKnowledge(discoveries);
  
  const resolveValue = (item, related = {}) => {
    return Number(item.budget || item.value || related.proposal?.value || related.discovery?.estimatedValue || related.lead?.value || 0);
  };

  const leadsToPromote = leads
    .filter(lead => lead.status === 'won' || hasUserTag(lead, 'ganho') || hasUserTag(lead, 'assinado'))
    .filter(lead => !proposals.some(p => p.clientName === lead.company) && !projects.some(p => p.client === lead.company))
    .map(lead => ({
      id: `lead-project-${lead.id}`,
      name: `Projeto ${lead.company}`,
      client: lead.company,
      status: 'ready',
      readinessTag: 'Aguardando formalização',
      budget: lead.value || 0,
      progress: 0,
      team: [8],
      tags: lead.tags || ['Lead', 'Pendente'],
      phases: [
        { name: 'Formalização', status: 'pending' },
        { name: 'Spec SDD', status: 'pending' },
        { name: 'Backlog', status: 'pending' },
      ],
      discovery: knowledge.find(item => item.clientName === lead.company),
      orderedTasks: [],
    }));

  const signedFromProposals = proposals
    .filter(proposal => signedProposalStatuses.has(proposal.status))
    .map(proposal => {
      const existing = projects.find(project => project.client === proposal.clientName || project.name.includes(proposal.clientName));
      const discovery = knowledge.find(item => item.id === proposal.discoveryId || item.clientName === proposal.clientName);
      const lead = leads.find(l => l.company === proposal.clientName);
      
      return {
        ...(existing || {}),
        id: existing?.id || `proposal-${proposal.id}`,
        name: existing?.name || proposal.title.replace('Proposta', 'Projeto'),
        client: proposal.clientName,
        clientId: existing?.clientId || null,
        status: existing?.status || 'ready',
        readinessTag: existing?.readinessTag || 'Assinado, apto para início',
        budget: resolveValue(proposal, { existing, discovery, lead }),
        progress: existing?.progress || 0,
        team: existing?.team || [8],
        tags: existing?.tags || ['SDD', 'Discovery', 'Automação'],
        phases: existing?.phases || [
          { name: 'Spec SDD', status: 'completed' },
          { name: 'Backlog tecnico', status: 'in_progress' },
          { name: 'Desenvolvimento', status: 'pending' },
          { name: 'QA', status: 'pending' },
          { name: 'Deploy', status: 'pending' },
        ],
        discovery,
        orderedTasks: backlog.filter(task => task.projectId === existing?.id),
      };
    });

  const readyProjectRecords = projects
    .filter(project => signedProjectStatuses.has(project.status) || project.contractStatus === 'signed' || project.readinessTag)
    .map(project => ({
      ...project,
      readinessTag: project.readinessTag || 'Assinado, apto para início',
      discovery: knowledge.find(item => item.clientName === project.client),
      orderedTasks: backlog.filter(task => task.projectId === project.id),
      phases: project.phases || [
        { name: 'Discovery', status: 'completed' },
        { name: 'Backlog', status: 'completed' },
        { name: 'Desenvolvimento', status: project.progress > 50 ? 'completed' : 'in_progress' },
        { name: 'QA', status: project.progress > 80 ? 'in_progress' : 'pending' },
        { name: 'Deploy', status: project.progress === 100 ? 'completed' : 'pending' },
      ],
    }));

  const all = [...leadsToPromote, ...signedFromProposals, ...readyProjectRecords];
  return all.filter((project, index) => all.findIndex(item => item.id === project.id) === index);
};

const defaultAcceptanceTasks = (project, user) => {
  const decisions = project.discovery?.decisions || [];
  const decisionTask = decisions.find(Boolean) || 'Validar decisões aprovadas no Discovery antes de iniciar o desenvolvimento.';
  return [
    {
      title: 'Preparar especificação SDD do projeto',
      description: `Consolidar documentação, decisões do Discovery e critérios de aceite para ${project.name}.`,
      type: 'spec',
      priority: 'high',
      tags: ['SDD', 'Discovery'],
    },
    {
      title: 'Configurar base técnica e dependências',
      description: 'Preparar estrutura, ambiente e integrações necessárias para iniciar o desenvolvimento com segurança.',
      type: 'setup',
      priority: 'high',
      tags: ['setup', 'arquitetura'],
    },
    {
      title: decisionTask,
      description: 'Implementar a primeira entrega funcional seguindo as decisões mapeadas no levantamento.',
      type: 'feature',
      priority: 'high',
      tags: ['feature', 'ia'],
    },
    {
      title: 'Preparar evidências para QA e documentação',
      description: 'Registrar decisões técnicas, evidências de teste e documentação necessária para validação.',
      type: 'task',
      priority: 'medium',
      tags: ['qa', 'documentacao'],
    },
  ].map((task, index) => ({
    ...task,
    projectId: project.id,
    project: project.name,
    client: project.client,
    status: 'todo',
    order: index + 1,
    assignee: user?.id,
    assigneeEmail: user?.email,
    acceptedByDeveloperId: user?.id,
    acceptedAt: new Date().toISOString(),
    automationMode: 'waiting_developer_start',
  }));
};

export const buildProjectAcceptancePlan = ({ project, user, backlog = [] }) => {
  const projectTasks = backlog
    .filter(task => String(task.projectId) === String(project?.id))
    .sort((a, b) => Number(a.order || 999) - Number(b.order || 999));

  if (projectTasks.length) {
    return {
      updates: projectTasks.map((task, index) => ({
        id: task.id,
        data: {
          assignee: user?.id,
          assigneeEmail: user?.email,
          acceptedByDeveloperId: user?.id,
          acceptedAt: new Date().toISOString(),
          status: task.status === 'blocked' ? 'todo' : task.status,
          order: task.order || index + 1,
          automationMode: task.automationMode || 'waiting_developer_start',
        },
      })),
      creates: [],
    };
  }

  return {
    updates: [],
    creates: defaultAcceptanceTasks(project, user),
  };
};

export const getDeveloperBacklog = (backlog = [], projects = [], user) => {
  const isAdmin = canAccessAdmin(user);
  const devId = user?.id;
  const acceptedProjects = new Set(getSignedReadyProjects(projects, [], [], backlog).map(project => project.id));
  return backlog
    .filter(task => acceptedProjects.has(task.projectId) || projects.some(project => project.id === task.projectId))
    .filter(task => isAdmin || task.assignee === devId || task.assigneeEmail === user?.email)
    .map((task, index) => ({
      ...task,
      order: task.order || index + 1,
      project: projects.find(project => project.id === task.projectId)?.name || task.project || 'Projeto interno',
      assigneeEmail: task.assigneeEmail || user?.email,
    }))
    .sort((a, b) => a.order - b.order);
};

export const buildTaskPrompt = (task, project, discovery) => `Contexto do projeto: ${project?.name || task.project}
Cliente: ${project?.client || 'Cliente interno'}
Atividade: ${task.title}
Descricao: ${task.description || 'Implementar conforme backlog aprovado.'}
Prioridade: ${task.priority}
Decisoes do Discovery:
${(discovery?.decisions || ['Seguir critérios aprovados em reunião.']).map(item => `- ${item}`).join('\n')}
Critérios de aceite:
- Entregar a atividade sem quebrar fluxos existentes.
- Documentar decisoes tecnicas relevantes.
- Preparar evidencias para QA.
- Sinalizar riscos antes de alterar escopo.`;

const hasUxSignal = (value = '') => ['ui', 'ux', 'layout', 'dashboard', 'mobile', 'visual', 'interface', 'cor', 'cores', 'imagem', 'tela', 'responsivo'].some(term => String(value).toLowerCase().includes(term));

export const getUxRequests = (projects = [], backlog = [], discoveries = [], learningEvents = []) => {
  const knowledge = deriveDiscoveryKnowledge(discoveries);
  const backlogRequests = backlog
    .filter(task => {
      const text = `${task.title} ${task.description || ''} ${(task.tags || []).join(' ')}`.toLowerCase();
      return hasUxSignal(text);
    })
    .map(task => {
      const project = projects.find(item => item.id === task.projectId);
      const discovery = knowledge.find(item => item.clientName === project?.client);
      return {
        id: task.id,
        project: project?.name || task.project,
        client: project?.client || 'Cliente',
        request: task.title,
        origin: discovery?.title || 'Backlog aprovado',
        status: task.uxStatus || 'Aguardando validação',
        suggestions: [
          'Validar hierarquia visual com base nos objetivos da reuniao.',
          'Aplicar componentes consistentes com o design system Kentauros.',
          'Garantir contraste, responsividade e clareza do fluxo principal.',
        ],
      };
    });

  const discoveryRequests = knowledge
    .filter(discovery => hasUxSignal(`${discovery.summary || ''} ${(discovery.decisions || []).join(' ')} ${(discovery.rules || []).join(' ')}`))
    .map(discovery => {
      const project = projects.find(item => item.client === discovery.clientName);
      return {
        id: `discovery-${discovery.id}`,
        project: project?.name || `Projeto ${discovery.clientName}`,
        client: discovery.clientName,
        request: 'Ajustes visuais identificados no Discovery',
        origin: discovery.title || 'Discovery',
        status: 'Aguardando validação',
        suggestions: [
          ...(discovery.decisions || []).filter(hasUxSignal).slice(0, 2),
          'Transformar requisitos visuais em checklist aprovavel pelo DEV.',
        ].slice(0, 3),
      };
    });

  const learningRequests = learningEvents
    .filter(event => hasUxSignal(`${event.title || ''} ${event.content || ''} ${(event.tags || []).join(' ')}`))
    .map(event => {
      const project = projects.find(item => String(item.id) === String(event.project_id || event.metadata?.projectId));
      return {
        id: `learning-${event.id}`,
        project: project?.name || event.metadata?.projectName || 'Projeto em validação',
        client: project?.client || event.metadata?.clientName || 'Cliente',
        request: event.title || 'Solicitacao visual aprendida',
        origin: 'Aprendizado continuo',
        status: event.metadata?.approvalStatus || 'Aguardando validação',
        suggestions: [
          event.content || 'Usar conhecimento de reunioes e acoes do usuario para refinar UX/UI.',
          'Registrar aprovacao antes de enviar para desenvolvimento automatico.',
        ],
      };
    });

  const all = [...backlogRequests, ...discoveryRequests, ...learningRequests];
  return all.filter((item, index) => all.findIndex(entry => entry.id === item.id) === index);
};

export const getSddItems = (projects = [], backlog = [], discoveries = []) => {
  const knowledge = deriveDiscoveryKnowledge(discoveries);
  return backlog.map(task => {
    const project = projects.find(item => item.id === task.projectId);
    const discovery = knowledge.find(item => item.clientName === project?.client);
    return {
      id: task.id,
      project: project?.name || task.project,
      task: task.title,
      specStatus: task.status === 'done' ? 'aprovada' : 'em_validacao',
      automationMode: task.automationMode || 'pre_pronto',
      decision: `Implementar ${task.title} seguindo SDD e critérios do Discovery.`,
      discovery,
    };
  });
};

export const getQaValidationItems = (qaTests = [], backlog = [], projects = []) => {
  const generatedFromBacklog = backlog
    .filter(task => ['review', 'done'].includes(task.status))
    .map(task => ({
      id: `task-${task.id}`,
      title: `Validação: ${task.title}`,
      projectId: task.projectId,
      status: task.status === 'done' ? 'passed' : 'pending',
      type: 'ia_delivery',
      environment: 'staging',
      duration: task.status === 'done' ? '1m 40s' : null,
      executedAt: task.status === 'done' ? today() : null,
      documentation: 'Documentacao tecnica gerada para entrega.',
      developerApproval: task.status === 'done' ? 'aprovado' : 'pendente',
    }));

  return [...qaTests, ...generatedFromBacklog].map(item => ({
    ...item,
    projectName: projects.find(project => project.id === item.projectId)?.name || `Projeto ${item.projectId}`,
  }));
};

export const getDeployReadiness = (deployments = [], projects = [], backlog = [], qaTests = []) => projects.map(project => {
  const projectTasks = backlog.filter(task => task.projectId === project.id);
  const projectQa = qaTests.filter(test => test.projectId === project.id);
  const latestDeploy = deployments.find(deploy => deploy.projectId === project.id);
  return {
    id: project.id,
    project: project.name,
    client: project.client,
    activities: projectTasks.length,
    qaApproved: projectQa.filter(test => test.status === 'passed').length,
    qaTotal: projectQa.length,
    gitRepository: project.gitRepository || '',
    packageStatus: latestDeploy?.status || 'aguardando',
    lastDeploy: latestDeploy,
    canDeploy: projectQa.length > 0 && projectQa.every(test => test.status === 'passed'),
  };
});

export const getDashboardMetrics = ({ leads = [], discoveries = [], clients = [], projects = [], backlog = [], proposals = [], qaTests = [], deployments = [], automations = [] }) => {
  const signedRevenue = [
    ...proposals.filter(proposal => ['approved', 'signed', 'won'].includes(proposal.status)),
    ...leads.filter(lead => lead.status === 'won' || hasUserTag(lead, 'ganho') || hasUserTag(lead, 'assinado'))
      .filter(lead => !proposals.some(p => p.clientName === lead.company))
  ].reduce((sum, item) => sum + Number(item.value || item.budget || 0), 0);
  const activeLeads = leads.filter(lead => lead.status !== 'lost').length;
  const qualifiedLeads = leads.filter(lead => ['qualified', 'discovery', 'proposal', 'won'].includes(lead.status)).length;
  const contactedLeads = leads.filter(lead => lead.emailStatus === 'sent' || (lead.interactionHistory || []).some(item => item.type === 'email_sent')).length;
  const wonLeads = leads.filter(lead => lead.status === 'won').length;
  const avgReadiness = leads.length
    ? Math.round(leads.reduce((sum, lead) => sum + Number(lead.conversionReadiness || lead.score || 0), 0) / leads.length)
    : 0;
  const activeProjects = projects.filter(project => ['active', 'kickoff', 'ready'].includes(project.status)).length;
  const openBacklog = backlog.filter(task => !['done', 'cancelled'].includes(task.status)).length;
  const passedQa = qaTests.filter(test => test.status === 'passed').length;
  const health = qaTests.length ? Math.round((passedQa / qaTests.length) * 100) : 100;

  return {
    activeLeads,
    qualifiedLeads,
    contactedLeads,
    wonLeads,
    avgReadiness,
    conversionRate: leads.length ? Math.round((wonLeads / leads.length) * 100) : 0,
    capturedLeads: leads.length,
    discoveryCount: discoveries.length,
    proposalCount: proposals.length,
    clientCount: clients.length,
    averageTicket: proposals.length ? Math.round(proposals.reduce((sum, proposal) => sum + Number(proposal.value || 0), 0) / proposals.length) : 0,
    leadToProposalRate: leads.length ? Math.round((proposals.length / leads.length) * 100) : 0,
    proposalToClientRate: proposals.length ? Math.round((clients.length / proposals.length) * 100) : 0,
    activeProjects,
    openBacklog,
    signedRevenue,
    health,
    pipeline: [
      { name: 'LEADS', value: activeLeads },
      { name: 'DISCOVERY', value: leads.filter(lead => lead.status === 'discovery').length },
      { name: 'PROPOSTA', value: proposals.length },
      { name: 'PROJETOS', value: activeProjects },
      { name: 'QA', value: qaTests.length },
      { name: 'DEPLOY', value: deployments.length },
    ],
    recentActivity: [
      ...leads.slice(-2).map(lead => ({ event: 'Lead atualizado', entity: lead.company, status: lead.status, badgeType: 'secondary', time: lead.lastActivity || today() })),
      ...proposals.slice(-2).map(proposal => ({ event: 'Proposta no pipeline', entity: proposal.clientName, status: proposal.status, badgeType: 'warning', time: proposal.createdAt || today() })),
      ...deployments.slice(-2).map(deploy => ({ event: 'Deploy registrado', entity: projects.find(project => project.id === deploy.projectId)?.name || deploy.env, status: deploy.status, badgeType: deploy.status === 'success' ? 'success' : 'danger', time: deploy.deployedAt || today() })),
    ].slice(-6).reverse(),
    automations,
  };
};

export const getScopedDashboardData = ({ user, leads = [], discoveries = [], clients = [], projects = [], backlog = [], proposals = [], qaTests = [], deployments = [], automations = [] }) => {
  if (canAccessAdmin(user)) {
    return { leads, discoveries, clients, projects, backlog, proposals, qaTests, deployments, automations };
  }

  if (canAccessCommercial(user)) {
    const scopedLeads = leads.filter(lead => lead.user_id === user?.id || lead.assignedTo === user?.id || lead.commercialOwnerUserId === user?.id);
    const clientNames = new Set(scopedLeads.map(lead => lead.company));
    const scopedProposals = proposals.filter(proposal => clientNames.has(proposal.clientName) || proposal.user_id === user?.id);
    const scopedDiscoveries = discoveries.filter(discovery => clientNames.has(discovery.clientName) || discovery.user_id === user?.id);
    const scopedClients = clients.filter(client => clientNames.has(client.company || client.name) || client.user_id === user?.id);
    return {
      leads: scopedLeads,
      discoveries: scopedDiscoveries,
      clients: scopedClients,
      proposals: scopedProposals,
      projects: [],
      backlog: [],
      qaTests: [],
      deployments: [],
      automations: automations.filter(auto => String(auto.trigger || '').toLowerCase().includes('lead')),
    };
  }

  if (canAccessDev(user)) {
    const scopedBacklog = backlog.filter(task => task.assignee === user?.id || task.assigneeEmail === user?.email);
    const projectIds = new Set(scopedBacklog.map(task => task.projectId));
    const scopedProjects = projects.filter(project => projectIds.has(project.id) || (project.team || []).includes(user?.id));
    return {
      leads: [],
      proposals: [],
      projects: scopedProjects,
      backlog: scopedBacklog,
      qaTests: qaTests.filter(test => projectIds.has(test.projectId)),
      deployments: deployments.filter(deploy => projectIds.has(deploy.projectId)),
      automations: automations.filter(auto => ['create_qa_test', 'enable_deploy', 'update_project_progress'].includes(auto.action)),
    };
  }

  return { leads: [], discoveries: [], clients: [], projects: [], backlog: [], proposals: [], qaTests: [], deployments: [], automations: [] };
};
