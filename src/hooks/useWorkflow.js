import { useData } from '../context/DataContext';
import { useApp } from '../context/AppContext';
import {
  buildDiscoveryFromLead,
  buildProposalFromDiscovery,
  buildRetentionClientFromProposal,
  findExistingProposal,
} from '../services/commercialFlow';

export const useWorkflow = () => {
  const { 
    updateLead, addDiscovery, updateDiscovery, addProposal, 
    updateProposal, addProject, addBacklog, addQaTest, addDeployment, addAutomation,
    addClient, clients = [], proposals = [],
    addLearningEvent,
  } = useData();
  const { user } = useApp();
  const { addNotification: notify } = useApp();

  const promoteLeadToDiscovery = (lead) => {
    updateLead(lead.id, {
      status: 'discovery',
      lastActivity: new Date().toISOString().split('T')[0],
    });
    addDiscovery(buildDiscoveryFromLead(lead));
    addLearningEvent({
      source: 'workflow',
      event_type: 'lead_promoted_to_discovery',
      title: lead.company,
      content: `Lead promovido para Discovery com score ${lead.score || 0}.`,
      tags: ['Lead', 'Discovery', 'Commercial'],
      metadata: { leadId: lead.id, value: lead.value, owner: lead.commercialOwnerUserId },
    });
    notify('Workflow', `Lead ${lead.company} promovido para Discovery`, 'success');
  };

  const approveDiscovery = (discovery) => {
    updateDiscovery(discovery.id, { status: 'approved', completedAt: new Date().toISOString().split('T')[0] });
    const existingProposal = findExistingProposal(proposals, discovery);
    if (existingProposal) {
      updateProposal(existingProposal.id, {
        value: Number(discovery.estimatedValue || existingProposal.value || 0),
        summary: discovery.summary || existingProposal.summary,
        leadId: discovery.leadId || existingProposal.leadId,
      });
    } else {
      addProposal(buildProposalFromDiscovery(discovery, user));
    }
    addAutomation({
      name: `Gerar proposta - ${discovery.clientName}`,
      trigger: 'discovery.status = approved',
      action: 'create_proposal_from_discovery',
      status: 'completed',
      runs: 1,
      success: 1,
      lastRun: new Date().toISOString().split('T')[0],
      discoveryId: discovery.id,
    });
    addLearningEvent({
      source: 'workflow',
      event_type: 'discovery_approved_proposal_created',
      title: discovery.clientName,
      content: discovery.summary || 'Discovery aprovado e proposta criada.',
      tags: ['Discovery', 'Proposal'],
      metadata: { discoveryId: discovery.id },
    });
    notify('Workflow', `Discovery de ${discovery.clientName} aprovado. Proposta ${existingProposal ? 'atualizada' : 'gerada'}.`, 'success');
  };

  const approveProposal = (proposal) => {
    updateProposal(proposal.id, { status: 'approved', approvedAt: new Date().toISOString().split('T')[0] });
    const newProject = {
      name: proposal.title.replace('Proposta:', 'Projeto:'),
      client: proposal.clientName,
      status: 'ready',
      readinessTag: 'Assinado, apto para início',
      progress: 0,
      priority: 'medium',
      startDate: new Date().toISOString().split('T')[0],
      budget: proposal.value,
      spent: 0,
      tags: ['New Project'],
      health: 'green'
    };
    const createdProject = addProject(newProject);
    const projectId = createdProject.id;

    [
      ['Spec SDD e critérios de aceite', 'Preparar especificação orientada pelo Discovery.', 'high'],
      ['Estrutura UX/UI validavel', 'Mapear telas, fluxos e componentes citados na reuniao.', 'medium'],
      ['Implementacao automatizada inicial', 'Executar desenvolvimento assistido por IA com aprovacao do DEV.', 'high'],
      ['QA e documentação de entrega', 'Gerar testes, evidências e documento de validação.', 'high'],
    ].forEach(([title, description, priority], index) => {
      addBacklog({
        projectId,
        title,
        description,
        priority,
        type: 'task',
        status: 'todo',
        assignee: 8,
        assigneeEmail: 'marcos@kentauros.com',
        order: index + 1,
        tags: ['SDD', 'IA', 'Discovery'],
      });
    });

    addQaTest({
      projectId,
      title: `Suite inicial - ${proposal.clientName}`,
      type: 'ia_delivery',
      status: 'pending',
      priority: 'high',
      environment: 'staging',
      documentation: 'Documento de validação será gerado após desenvolvimento SDD.',
    });

    addDeployment({
      projectId,
      env: 'staging',
      version: 'pendente',
      status: 'aguardando_qa',
      notes: 'Deploy bloqueado ate QA aprovado.',
    });
    addLearningEvent({
      source: 'workflow',
      event_type: 'proposal_approved_project_created',
      title: newProject.name,
      content: 'Projeto, backlog, QA e deploy inicial criados a partir da proposta aprovada.',
      tags: ['Proposal', 'Project', 'SDD'],
      metadata: { proposalId: proposal.id, projectId },
    });
    if (!clients.some(client => client.company === proposal.clientName || client.name === proposal.clientName)) {
      addClient(buildRetentionClientFromProposal(proposal));
    }
    notify('Workflow', `Proposta aprovada! Projeto ${newProject.name} criado.`, 'success');
  };

  const triggerAutomation = (automation) => {
    notify('Automation', `Running: ${automation.name}`, 'info');
    setTimeout(() => {
      notify('Automation', `Completed: ${automation.name}`, 'success');
    }, 2000);
  };

  return {
    promoteLeadToDiscovery,
    approveDiscovery,
    approveProposal,
    triggerAutomation
  };
};
