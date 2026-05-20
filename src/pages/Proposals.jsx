import { useMemo, useState } from 'react';
import { useData } from '../context/DataContext';
import { useApp } from '../context/AppContext';
import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import StatCard from '../components/ui/StatCard';
import Button from '../components/ui/Button';
import Select from '../components/ui/Select';
import { canAccessAdmin, getMeetingReadyClients } from '../services/operationalWorkflow';
import { buildProposalDocument, downloadTextFile, renderProposalDocumentText, buildContractDocument, downloadContractDocument } from '../services/deliveryDocuments';
import {
  buildProposalFromDiscovery,
  buildRetentionClientFromProposal,
  findExistingProposal,
  isDiscoveryReadyForProposal,
} from '../services/commercialFlow';

const getStatusType = (status) => {
  if (['approved', 'signed', 'won'].includes(status)) return 'success';
  if (status === 'sent') return 'accent';
  if (status === 'rejected') return 'danger';
  return 'secondary';
};

const Proposals = () => {
  const { proposals = [], discoveries, leads, clients, addClient, addProposal, updateProposal, deleteProposal, addProject, addBacklog, addQaTest, addDeployment, addAutomation, addApprovalRequest, addLearningEvent } = useData();
  const { user, addNotification } = useApp();

  const [selectedProposalForContract, setSelectedProposalForContract] = useState(null);

  const handleDeleteProposal = (proposal) => {
    if (proposal.isVirtual) {
      addNotification('Ação não permitida', 'Propostas virtuais são baseadas em leads ganhos. Para removê-la, altere o status do Lead.', 'warning');
      return;
    }

    if (window.confirm(`Tem certeza que deseja deletar a proposta para ${proposal.clientName}?`)) {
      deleteProposal(proposal.id);
      addNotification('Proposta removida', 'A proposta foi excluída com sucesso.', 'success');
    }
  };

  const handleDownloadContract = (proposal) => {
    const client = clients.find(c => c.company === proposal.clientName);
    const discovery = discoveries.find(d => String(d.id) === String(proposal.discoveryId) || d.clientName === proposal.clientName);
    const contract = buildContractDocument({ proposal, discovery, client });
    downloadContractDocument(contract);
    setSelectedProposalForContract(proposal.id);
    updateProposal(proposal.id, { tag: 'Aguardando assinatura' });
    addLearningEvent({
      source: 'contract',
      event_type: 'contract_downloaded',
      title: `Contrato baixado - ${proposal.clientName}`,
      content: 'Cliente baixou o contrato para análise e assinatura.',
      tags: ['Contract', 'Proposal'],
      metadata: { proposalId: proposal.id },
    });
    addNotification('Contrato gerado', 'Contrato disponível para assinatura.', 'info');
  };

  const handleUploadSignedContract = (proposalId) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.doc,.docx,.txt';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const signedContract = {
            filename: file.name,
            uploadedAt: new Date().toISOString(),
            data: event.target.result,
          };
          updateProposal(proposalId, {
            signedContract,
            tag: 'Contrato assinado',
            contractUploadedAt: new Date().toISOString(),
          });
          addNotification('Contrato recebido', 'Upload do contrato assinado realizado.', 'success');
          addLearningEvent({
            source: 'contract',
            event_type: 'contract_signed_uploaded',
            title: `Contrato assinado - ${proposalId}`,
            content: `Arquivo ${file.name} enviado pelo cliente.`,
            tags: ['Contract', 'Signed'],
            metadata: { proposalId, filename: file.name },
          });
          setSelectedProposalForContract(null);
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  const handleConfirmSignedContract = (proposal) => {
    if (!canAccessAdmin(user)) {
      addNotification('Permissão negada', 'Apenas administradores podem confirmar contratos.', 'error');
      return;
    }
    handleSignProposal(proposal);
  };
  const meetingClients = useMemo(() => getMeetingReadyClients(discoveries, leads, clients), [discoveries, leads, clients]);
  const [selectedDiscoveryId, setSelectedDiscoveryId] = useState(meetingClients[0]?.id || '');

  const displayProposals = useMemo(() => {
    const virtual = leads
      .filter(lead => {
        const hasWonStatus = lead.status === 'won';
        const hasGanhoTag = (lead.tags || []).some(t => String(t).toLowerCase().trim() === 'ganho');
        const alreadyHasProposal = proposals.some(p => p.clientName === lead.company);
        return (hasWonStatus || hasGanhoTag) && !alreadyHasProposal;
      })
      .map(lead => {
        const leadValue = Number(lead.value) || 0;
        return {
          id: `virtual-${lead.id}`,
          clientName: lead.company,
          title: `Proposta Gerada (Lead Ganho) - ${lead.company}`,
          status: 'won',
          value: leadValue,
          documents: ['Discovery', 'Pré-acordo'],
          isVirtual: true,
        };
      });
    return [...proposals, ...virtual];
  }, [proposals, leads]);

  const selectedMeeting = meetingClients.find(item => String(item.id) === String(selectedDiscoveryId));

  // Auto-select first meeting if none selected and available
  if (!selectedDiscoveryId && meetingClients.length > 0) {
    setSelectedDiscoveryId(meetingClients[0].id);
  }

  const handleGenerateProposal = () => {
    if (!selectedMeeting) {
      addNotification('Reuniao obrigatoria', 'Selecione um cliente com reuniao realizada para gerar a proposta.', 'error');
      return;
    }

    const discovery = discoveries.find(item => String(item.id) === String(selectedMeeting.discoveryId)) || selectedMeeting;
    const readiness = isDiscoveryReadyForProposal({
      ...discovery,
      estimatedValue: discovery.estimatedValue || selectedMeeting.suggestedValue,
      nextAction: discovery.nextAction || 'Enviar proposta',
    });
    if (!readiness.ready) {
      addNotification('Discovery incompleto', `Preencha antes da proposta: ${readiness.missing.join(', ')}.`, 'error');
      return;
    }

    const existingProposal = findExistingProposal(proposals, discovery);
    if (existingProposal) {
      updateProposal(existingProposal.id, {
        value: Number(discovery.estimatedValue || selectedMeeting.suggestedValue || existingProposal.value || 0),
        summary: discovery.summary || existingProposal.summary,
      });
      addNotification('Proposta atualizada', `Proposta existente de ${selectedMeeting.clientName} foi atualizada.`, 'success');
      return;
    }

    addProposal(buildProposalFromDiscovery({
      ...discovery,
      estimatedValue: discovery.estimatedValue || selectedMeeting.suggestedValue,
      nextAction: discovery.nextAction || 'Enviar proposta',
    }, user));

    addNotification('Proposta gerada', `Proposta criada com base na reuniao de ${selectedMeeting.clientName}.`, 'success');
  };

  const handleSignProposal = (proposal) => {
    if (!canAccessAdmin(user)) {
      addApprovalRequest({
        entity_type: 'Proposal',
        entity_id: String(proposal.id),
        requested_by: user?.id,
        approver_role: 'ADMIN',
        status: 'pending',
        payload: proposal,
        title: `Aprovar proposta - ${proposal.clientName}`,
      });
      updateProposal(proposal.id, { status: 'pending_approval' });
      addNotification('Aprovação solicitada', 'A proposta foi enviada para aprovação Admin antes de virar projeto.', 'info');
      return;
    }

    const proposalDocument = buildProposalDocument({
      proposal,
      discovery: discoveries.find(item => String(item.id) === String(proposal.discoveryId)),
    });
    updateProposal(proposal.id, {
      status: 'approved',
      signedAt: new Date().toISOString(),
      tag: 'Assinado, apto para inicio',
      proposalDocument,
      approvalFlow: [
        ...(proposal.approvalFlow || []).filter(step => step.step !== 'Admin' && step.step !== 'Cliente'),
        { step: 'Admin', status: 'approved', at: new Date().toISOString(), userId: user?.id },
        { step: 'Cliente', status: 'signed', at: new Date().toISOString() },
      ],
    });
    const project = addProject({
      name: proposal.title.replace('Proposta Comercial - ', 'Projeto '),
      client: proposal.clientName,
      status: 'ready',
      readinessTag: 'Assinado, apto para inicio',
      progress: 0,
      priority: 'high',
      budget: proposal.value,
      spent: 0,
      team: [8],
      tags: ['SDD', 'Discovery', 'Apto para inicio'],
      phases: [
        { name: 'Spec SDD', status: 'pending' },
        { name: 'Backlog', status: 'pending' },
        { name: 'Desenvolvimento', status: 'pending' },
        { name: 'QA', status: 'pending' },
        { name: 'Deploy', status: 'pending' },
      ],
      versions: [
        {
          id: `project_start_${Date.now()}`,
          label: 'Projeto criado a partir da proposta',
          source: 'proposal',
          createdAt: new Date().toISOString(),
          proposalId: proposal.id,
          status: 'ready',
        },
      ],
    });

    const relatedDiscovery = discoveries.find(d =>
      String(d.id) === String(proposal.discoveryId) ||
      d.clientName === proposal.clientName ||
      d.leadId === proposal.leadId
    );

    const baseTasks = [
      ['Spec SDD e critérios de aceite', 'Converter decisões do Discovery em especificação validável.', 'high'],
      ['Checklist UX/UI do cliente', 'Mapear solicitações visuais, telas e componentes esperados.', 'medium'],
      ['Implementação assistida por IA', 'Executar desenvolvimento seguindo prompt e aprovação do DEV.', 'high'],
      ['QA, evidências e documentação', 'Validar testes e documentação antes do deploy.', 'high'],
    ];

    const discoveryRequirements = relatedDiscovery?.requirements || relatedDiscovery?.scope || relatedDiscovery?.functionalRequirements || [];
    const discoveryDecisions = relatedDiscovery?.decisions || [];

    if (discoveryRequirements.length > 0) {
      discoveryRequirements.slice(0, 8).forEach((req, index) => {
        const reqTitle = req.title || req.name || req.requirement || String(req);
        const reqDescription = req.description || req.details || '';
        addBacklog({
          projectId: project.id,
          title: reqTitle,
          description: `Requisito funcional: ${reqDescription}`,
          priority: req.priority || 'medium',
          type: 'feature',
          status: 'todo',
          assignee: 8,
          assigneeEmail: 'marcos@kentauros.com',
          order: baseTasks.length + index + 1,
          tags: ['Requisito', 'Discovery'],
        });
      });
    }

    baseTasks.forEach(([title, description, priority], index) => {
      addBacklog({
        projectId: project.id,
        title,
        description,
        priority,
        type: 'task',
        status: 'todo',
        assignee: 8,
        assigneeEmail: 'marcos@kentauros.com',
        order: index + 1,
        tags: ['SDD', 'Discovery', 'IA'],
      });
    });

    addQaTest({
      projectId: project.id,
      title: `Validação inicial - ${proposal.clientName}`,
      type: 'ia_delivery',
      status: 'pending',
      priority: 'high',
      environment: 'staging',
      documentation: 'Aguardando desenvolvimento SDD para gerar evidências.',
    });

    addDeployment({
      projectId: project.id,
      env: 'staging',
      version: 'pendente',
      status: 'aguardando_qa',
      notes: 'Deploy aguardando QA aprovado.',
    });

    addAutomation({
      name: `Fluxo projeto - ${proposal.clientName}`,
      trigger: 'proposal.status = approved',
      action: 'create_project_backlog_qa_deploy',
      status: 'completed',
      runs: 1,
      success: 1,
      lastRun: new Date().toISOString().split('T')[0],
      projectId: project.id,
    });
    addLearningEvent({
      source: 'approval',
      event_type: 'proposal_signed_project_created',
      title: `Projeto criado para ${proposal.clientName}`,
      content: `Proposta aprovada e convertida em projeto com backlog, QA e deploy inicial.`,
      project_id: String(project.id),
      tags: ['Proposal', 'Project', 'Approval'],
      metadata: { proposalId: proposal.id, projectId: project.id },
    });
    if (!clients.some(client => client.company === proposal.clientName || client.name === proposal.clientName)) {
      addClient(buildRetentionClientFromProposal(proposal));
    }
    addNotification('Projeto criado', 'Proposta assinada e projeto liberado para inicio.', 'success');
  };

  const downloadProposal = (proposal) => {
    const document = proposal.proposalDocument || buildProposalDocument({
      proposal,
      discovery: discoveries.find(item => String(item.id) === String(proposal.discoveryId)),
    });
    downloadTextFile(`${String(proposal.clientName).replace(/\s+/g, '-').toLowerCase()}-proposta-kentauros.md`, renderProposalDocumentText(document));
    addLearningEvent({
      source: 'proposal',
      event_type: 'proposal_document_downloaded',
      title: proposal.title,
      content: 'Documento formal de proposta baixado para validação/envio ao cliente.',
      tags: ['Proposal', 'Document'],
      metadata: { proposalId: proposal.id },
    });
  };

  return (
    <div className="proposals-page animate-fade-in">
      <PageHeader
        title="Propostas"
        subtitle="Gere propostas a partir de reunioes realizadas e do contexto do Discovery."
        actions={<Button variant="primary" onClick={handleGenerateProposal}>Gerar proposta</Button>}
      />

      <Card className="mb-xl proposal-base-panel">
        <div className="proposal-base-grid">
          <Select
            label="Cliente com reuniao realizada"
            value={selectedDiscoveryId}
            onChange={setSelectedDiscoveryId}
            options={meetingClients.map(item => ({ value: item.id, label: `${item.clientName} - ${item.status}` }))}
          />
          <div className="proposal-base-summary">
            <div className="text-xs text-muted mb-xs">Base da proposta</div>
            <p className="text-sm text-secondary">{selectedMeeting?.summary || 'Nenhuma reuniao aprovada encontrada.'}</p>
          </div>
        </div>
      </Card>

      <div className="proposal-stats-grid mb-xl">
        <StatCard label="Pipeline total" value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(displayProposals.reduce((acc, p) => acc + Number(p.value || 0), 0))} />
        <StatCard label="Aguardando assinatura" value={displayProposals.filter(p => ['sent', 'draft'].includes(p.status) || p.tag === 'Aguardando assinatura').length} />
        <StatCard label="Assinadas" value={displayProposals.filter(p => ['approved', 'signed', 'won'].includes(p.status) || p.tag === 'Contrato assinado').length} />
      </div>

      <Card className="table-wrapper">
        <table className="table">
          <thead>
            <tr>
              <th>Proposta</th>
              <th>Cliente</th>
              <th>Valor</th>
              <th>Status</th>
              <th>Documentos</th>
              <th>Acoes</th>
            </tr>
          </thead>
          <tbody>
            {displayProposals.map(proposal => (
              <tr key={proposal.id}>
                <td>
                  <div className="font-bold">{proposal.title}</div>
                  <div className="text-xs text-muted">
                    {proposal.isVirtual ? 'Baseado em Lead Ganho' : `Discovery: ${proposal.discoveryId || 'manual'}`}
                  </div>
                </td>
                <td>{proposal.clientName}</td>
                <td className="font-mono">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(proposal.value || 0)}</td>
                <td><Badge variant={getStatusType(proposal.status)}>{proposal.status}</Badge></td>
                <td className="text-xs text-muted">{(proposal.documents || ['Escopo', 'Valores', 'Termos']).join(', ')}</td>
                <td>
                  <div className="flex gap-sm flex-col">
                    <div className="flex gap-sm">
                      <Button variant="secondary" size="sm" onClick={() => downloadProposal(proposal)}>PDF</Button>
                      {proposal.tag === 'Contrato assinado' && canAccessAdmin(user) && (
                        <Button variant="success" size="sm" onClick={() => handleConfirmSignedContract(proposal)}>Confirmar projeto</Button>
                      )}
                      <Button variant="danger" size="sm" onClick={() => handleDeleteProposal(proposal)}>Deletar</Button>
                    </div>
                    {proposal.tag !== 'Contrato assinado' && !['approved', 'signed', 'won'].includes(proposal.status) && (
                      <div className="contract-actions mt-xs">
                        {!proposal.tag ? (
                          <Button variant="outline" size="sm" onClick={() => handleDownloadContract(proposal)}>Gerar Contrato</Button>
                        ) : proposal.tag === 'Aguardando assinatura' ? (
                          <div className="flex gap-sm items-center">
                            <Badge variant="accent">Aguardando assinatura</Badge>
                            <Button variant="primary" size="sm" onClick={() => handleUploadSignedContract(proposal.id)}>Upload Contrato</Button>
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
};

export default Proposals;
