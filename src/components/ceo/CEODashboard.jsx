import React, { useMemo, useState, useEffect } from 'react';
import { ceoService, AGENT_ROLES, AGENT_STATUS } from '../../services/ceo/ceoService';
import {
  CEO_STUDY_LIBRARY,
  applyApprovedCeoSuggestion,
  approveSkillInstallation,
  createCeoApprovalRequest,
  createCeoDiagnostics,
  createCeoRiskExecutionBoard,
  createCeoRiskTaskApprovalRequest,
  createContinuousCeoSuggestions,
  createCodexSuggestionPrompt,
  createManualCeoSuggestion,
  createSkillApprovalRequest,
  createSkillGovernanceRegistry,
  isActiveCeoApproval,
  markCeoSuggestionApplied,
  markSkillInstalled,
  rejectCeoSuggestion,
  summarizeCeoDiagnostics,
} from '../../services/ceo/strategicKernel';
import { buildEconomicMastermindContext } from '../../services/ceo/mastermindContext';
import PageHeader from '../ui/PageHeader';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import Textarea from '../ui/Textarea';
import { Bot, Users, FileText, CheckCircle, Zap, Brain, ShieldCheck, Library, Sparkles, Clipboard, CheckSquare, Wrench } from 'lucide-react';
import './CEODashboard.css';

const AgentCard = ({ agent, onSelect }) => {
  const statusColors = {
    [AGENT_STATUS.IDLE]: 'secondary',
    [AGENT_STATUS.HIRED]: 'accent',
    [AGENT_STATUS.WORKING]: 'warning',
    [AGENT_STATUS.APPROVED]: 'success',
    [AGENT_STATUS.REJECTED]: 'danger',
  };

  return (
    <Card hoverable onClick={() => onSelect(agent)}>
      <div className="flex items-center gap-3 mb-3">
        <div className="agent-icon" data-role={agent.role.toLowerCase()}>
          <Bot size={20} />
        </div>
        <div>
          <strong>{agent.role}</strong>
          <Badge variant={statusColors[agent.status]} size="sm">{agent.status}</Badge>
        </div>
      </div>
      <div className="text-xs text-muted">
        <div>{agent.tasks?.length || 0} tarefas</div>
        <div>{agent.documentation?.length || 0} docs</div>
      </div>
    </Card>
  );
};

const CEODashboard = ({ projectId, project, data = {}, user, addNotification }) => {
  const [agents, setAgents] = useState([]);
  const [projectAgents, setProjectAgents] = useState([]);
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [logs, setLogs] = useState([]);
  const [isHiringModalOpen, setIsHiringModalOpen] = useState(false);
  const [selectedInsight, setSelectedInsight] = useState(null);
  const [manualPrompt, setManualPrompt] = useState('');
  const {
    leads = [],
    proposals = [],
    clients = [],
    projects = [],
    automations = [],
    approvalRequests = [],
    learningEvents = [],
    addApprovalRequest,
    updateApprovalRequest,
    addLearningEvent,
  } = data;

  const economicMastermindContext = useMemo(() => buildEconomicMastermindContext({
    learningEvents,
    approvalRequests,
    projects,
    automations,
  }), [learningEvents, approvalRequests, projects, automations]);
  const mastermindKnowledge = economicMastermindContext.primaryKnowledge;
  const mastermindContextAlerts = economicMastermindContext.alerts;

  const ceoSuggestions = useMemo(() => createContinuousCeoSuggestions({
    leads,
    proposals,
    clients,
    projects,
    automations,
    approvalRequests,
    learningEvents,
    mastermindKnowledge,
  }), [leads, proposals, clients, projects, automations, approvalRequests, learningEvents, mastermindKnowledge]);

  const ceoDiagnostics = useMemo(() => createCeoDiagnostics({
    leads,
    proposals,
    clients,
    automations,
    approvalRequests,
    learningEvents,
    mastermindKnowledge,
  }), [leads, proposals, clients, automations, approvalRequests, learningEvents, mastermindKnowledge]);
  const diagnosticSummary = useMemo(() => summarizeCeoDiagnostics(ceoDiagnostics), [ceoDiagnostics]);
  const riskExecutionBoard = useMemo(() => createCeoRiskExecutionBoard({
    diagnostics: ceoDiagnostics,
    approvalRequests,
  }), [ceoDiagnostics, approvalRequests]);

  const strategicApprovals = useMemo(() =>
    approvalRequests.filter(item => item.metadata?.source === 'ceo_strategic_kernel'),
  [approvalRequests]);
  const skillApprovals = useMemo(() =>
    approvalRequests.filter(item => item.metadata?.source === 'ceo_skill_governance'),
  [approvalRequests]);
  const riskTaskApprovals = useMemo(() =>
    approvalRequests.filter(item => item.metadata?.source === 'ceo_risk_execution_board'),
  [approvalRequests]);
  const skillRegistry = useMemo(() => createSkillGovernanceRegistry({
    approvalRequests: skillApprovals,
    learningEvents,
  }), [skillApprovals, learningEvents]);

  const activeStrategicApprovals = useMemo(() =>
    strategicApprovals.filter(isActiveCeoApproval),
  [strategicApprovals]);
  const pendingStrategicApprovals = useMemo(() =>
    activeStrategicApprovals.filter(item => item.status === 'pending'),
  [activeStrategicApprovals]);
  const approvedStrategicApprovals = useMemo(() =>
    activeStrategicApprovals.filter(item => item.status === 'approved'),
  [activeStrategicApprovals]);
  const suggestionInsights = useMemo(() => [
    ...activeStrategicApprovals.map(approval => ({ type: 'approval', id: approval.id, approval })),
    ...ceoSuggestions.map(suggestion => ({ type: 'suggestion', id: suggestion.id, suggestion })),
  ], [activeStrategicApprovals, ceoSuggestions]);
  const selectedApproval = selectedInsight?.approval;
  const selectedSuggestion = selectedInsight?.suggestion;
  const selectedTitle = selectedApproval?.title || selectedSuggestion?.title;
  const selectedSummary = selectedApproval?.summary || selectedSuggestion?.summary;
  const selectedRisk = selectedApproval?.risk || selectedSuggestion?.risk;
  const selectedActionPlan = selectedApproval?.actionPlan || selectedSuggestion?.actionPlan || [];
  const selectedEvidence = selectedApproval?.evidence || selectedSuggestion?.evidence || [];
  const selectedSkillCandidates = selectedApproval?.metadata?.skillCandidates || selectedSuggestion?.skillCandidates || [];
  const selectedCodexPrompt = selectedApproval?.metadata?.codexPrompt || (selectedSuggestion ? createCodexSuggestionPrompt(selectedSuggestion) : '');
  const selectedAppliedStatus = selectedApproval?.appliedStatus || 'not_applied';
  const knowledgeNodes = [
    { label: 'Estrategia', value: 'Visao, roadmap e alocacao de recursos' },
    { label: 'Conversao', value: `${leads.length} leads e ${proposals.length} propostas` },
    { label: 'Retencao', value: `${clients.length} clientes monitorados` },
    { label: 'Seguranca', value: 'API keys, CORS, permissoes e logs' },
    { label: 'Skills', value: `${skillRegistry.length} skills governadas` },
    { label: 'Automacoes', value: `${automations.length} fluxos cadastrados` },
    { label: 'Riscos', value: `${diagnosticSummary.active} ativos, ${diagnosticSummary.monitoring} em monitoramento` },
    { label: 'Contexto', value: `${economicMastermindContext.summary.primary} sinais primarios, ${economicMastermindContext.summary.rawEvidence} evidencias brutas` },
  ];

  useEffect(() => {
    if (projectId) {
      ceoService.setProjectContext(projectId, project || { id: projectId, name: 'Ecossistema Kentauros' });
      const status = ceoService.getAgentStatus(projectId);
      setProjectAgents(status.agents || []);
      setPendingApprovals(ceoService.getPendingApprovals().filter(a =>
        a.agentKey?.startsWith(`${projectId}-`)
      ));
    }

    const unsubscribe = ceoService.subscribe((event) => {
      if (event.event === 'agent_hired' || event.event === 'agent_installed') {
        setProjectAgents(ceoService.getAgentStatus(projectId)?.agents || []);
      }
      if (event.event === 'approval_requested') {
        setPendingApprovals(ceoService.getPendingApprovals());
      }
      if (event.event === 'log') {
        setLogs(prev => [event.data, ...prev].slice(0, 20));
      }
    });

    return () => unsubscribe();
  }, [projectId]);

  const handleHireAgent = async (role) => {
    try {
      await ceoService.hireAgent(projectId, role);
      const status = ceoService.getAgentStatus(projectId);
      setProjectAgents(status.agents || []);
      setIsHiringModalOpen(false);
    } catch (err) {
      console.error('Erro ao contratar agente:', err);
    }
  };

  const handleSendSuggestionToApproval = (suggestion) => {
    const approval = createCeoApprovalRequest(suggestion, {
      userId: user?.id,
      tenantId: user?.tenant_id,
    });
    addApprovalRequest?.(approval);
    addNotification?.('Sugestao enviada para aprovacao', `${suggestion.title} entrou na fila CEO.`, 'success');
  };

  const approveSuggestionDirectly = (suggestion) => {
    const approval = createCeoApprovalRequest(suggestion, {
      userId: user?.id,
      tenantId: user?.tenant_id,
    });
    const result = applyApprovedCeoSuggestion(approval, { reviewer: user?.name || 'Usuario Kentauros' });
    addApprovalRequest?.(result.approval);
    addLearningEvent?.(result.learningEvent);
    ceoService.log('success', `Sugestao aprovada e registrada no MasterMind: ${suggestion.title}`, {
      approvalId: approval.id,
      actionType: approval.actionType,
    });
    addNotification?.('MasterMind atualizado', `${suggestion.title} virou aprendizado CEO.`, 'success');
    setSelectedInsight(null);
  };

  const rejectSuggestionDirectly = (suggestion) => {
    const approval = createCeoApprovalRequest(suggestion, {
      userId: user?.id,
      tenantId: user?.tenant_id,
    });
    const rejected = rejectCeoSuggestion(approval, {
      reviewer: user?.name || 'Usuario Kentauros',
      reason: 'Rejeitado na revisao executiva',
    });
    addApprovalRequest?.(rejected);
    addNotification?.('Sugestao recusada', `${suggestion.title} foi registrada como recusada.`, 'info');
    setSelectedInsight(null);
  };

  const handleApproveStrategic = (approval) => {
    const result = applyApprovedCeoSuggestion(approval, { reviewer: user?.name || 'Usuario Kentauros' });
    updateApprovalRequest?.(approval.id, result.approval);
    addLearningEvent?.(result.learningEvent);
    ceoService.log('success', `Sugestao aprovada e registrada no MasterMind: ${approval.title}`, {
      approvalId: approval.id,
      actionType: approval.actionType,
    });
    addNotification?.('MasterMind atualizado', `${approval.title} virou aprendizado CEO.`, 'success');
    setSelectedInsight(null);
  };

  const handleMarkSelectedApplied = () => {
    if (!selectedApproval || selectedApproval.status !== 'approved') return;
    const result = markCeoSuggestionApplied(selectedApproval, { reviewer: user?.name || 'Usuario Kentauros' });
    updateApprovalRequest?.(selectedApproval.id, result.approval);
    addLearningEvent?.(result.learningEvent);
    ceoService.log('success', `Sugestao CEO marcada como aplicada: ${selectedApproval.title}`, {
      approvalId: selectedApproval.id,
      actionType: selectedApproval.actionType,
    });
    addNotification?.('Sugestao aplicada', `${selectedApproval.title} foi marcada como aplicada no MasterMind CEO.`, 'success');
    setSelectedInsight(prev => prev ? { ...prev, approval: result.approval } : prev);
  };

  const handleCopySelectedPrompt = async () => {
    if (!selectedCodexPrompt) return;
    try {
      await navigator.clipboard?.writeText(selectedCodexPrompt);
      addNotification?.('Prompt copiado', 'O prompt da sugestao foi copiado para usar no Codex.', 'success');
    } catch {
      addNotification?.('Prompt pronto', 'Selecione o texto do prompt e copie manualmente para o Codex.', 'info');
    }
  };

  const handleRejectStrategic = (approval) => {
    const rejected = rejectCeoSuggestion(approval, {
      reviewer: user?.name || 'Usuario Kentauros',
      reason: 'Rejeitado na revisao executiva',
    });
    updateApprovalRequest?.(approval.id, rejected);
    ceoService.log('warning', `Sugestao CEO rejeitada: ${approval.title}`, { approvalId: approval.id });
    addNotification?.('Sugestao rejeitada', `${approval.title} foi removida da fila ativa.`, 'info');
    setSelectedInsight(null);
  };

  const handleApproveSelected = () => {
    if (selectedApproval) {
      handleApproveStrategic(selectedApproval);
      return;
    }
    if (selectedSuggestion) approveSuggestionDirectly(selectedSuggestion);
  };

  const handleRejectSelected = () => {
    if (selectedApproval) {
      handleRejectStrategic(selectedApproval);
      return;
    }
    if (selectedSuggestion) rejectSuggestionDirectly(selectedSuggestion);
  };

  const handleCreateManualSuggestion = () => {
    const cleanPrompt = manualPrompt.trim();
    if (!cleanPrompt) {
      addNotification?.('Prompt vazio', 'Descreva a sugestao de melhoria antes de enviar ao CEO.', 'warning');
      return;
    }
    const suggestion = createManualCeoSuggestion(cleanPrompt, { userName: user?.name || 'Usuario Kentauros' });
    handleSendSuggestionToApproval(suggestion);
    setManualPrompt('');
  };

  const handleRequestSkillApproval = (skill) => {
    const approval = createSkillApprovalRequest(skill, {
      userId: user?.id,
      tenantId: user?.tenant_id,
    });
    addApprovalRequest?.(approval);
    addNotification?.('Skill enviada para aprovacao', `${skill.name} entrou na governanca do CEO.`, 'success');
  };

  const handleRequestRiskTaskApproval = (task) => {
    const approval = createCeoRiskTaskApprovalRequest(task, {
      userId: user?.id,
      tenantId: user?.tenant_id,
    });
    addApprovalRequest?.(approval);
    addNotification?.('Risco enviado para aprovacao', `${task.title} entrou no quadro de execucao CEO.`, 'success');
  };

  const handleApproveRiskTask = (task) => {
    const approval = riskTaskApprovals.find(item => item.id === task.approvalId);
    if (!approval) return;

    const approvedAt = new Date().toISOString();
    const approved = {
      ...approval,
      status: 'approved',
      appliedStatus: 'awaiting_codex',
      reviewedAt: approvedAt,
      reviewer: user?.name || 'Usuario Kentauros',
    };

    updateApprovalRequest?.(approval.id, approved);
    addLearningEvent?.({
      source: 'ceo_risk_execution_board',
      event_type: 'ceo_risk_task_approved',
      title: `Risco aprovado para execucao - ${task.title}`,
      content: task.summary || '',
      signal_strength: ['critical', 'high'].includes(task.severity) ? 5 : 4,
      tags: ['MasterMind', 'CEO', 'Risco', task.area, 'Aprovacao'],
      metadata: {
        source: 'ceo_risk_execution_board',
        taskId: task.id,
        diagnosticId: task.diagnosticId,
        approvalId: approval.id,
        area: task.area,
        project: task.project,
        owner: task.owner,
      },
    });
    addNotification?.('Execucao aprovada', `${task.title} esta pronta para Codex executar com aprovacao humana.`, 'success');
  };

  const handleApproveSkill = (approval) => {
    const result = approveSkillInstallation(approval, { reviewer: user?.name || 'Usuario Kentauros' });
    updateApprovalRequest?.(approval.id, result.approval);
    addLearningEvent?.(result.learningEvent);
    addNotification?.('Skill aprovada', `${approval.metadata?.skillName || approval.title} aguardando instalacao manual.`, 'success');
  };

  const handleRejectSkill = (approval) => {
    const rejected = rejectCeoSuggestion(approval, {
      reviewer: user?.name || 'Usuario Kentauros',
      reason: 'Skill rejeitada na governanca CEO',
    });
    updateApprovalRequest?.(approval.id, rejected);
    addNotification?.('Skill rejeitada', `${approval.metadata?.skillName || approval.title} foi recusada.`, 'info');
  };

  const handleMarkSkillInstalled = (approval) => {
    const result = markSkillInstalled(approval, { reviewer: user?.name || 'Usuario Kentauros' });
    updateApprovalRequest?.(approval.id, result.approval);
    addLearningEvent?.(result.learningEvent);
    addNotification?.('Skill registrada', `${approval.metadata?.skillName || approval.title} foi marcada como instalada.`, 'success');
  };

  const handleInstallAgent = async (role) => {
    try {
      await ceoService.installAgent(projectId, role);
      const status = ceoService.getAgentStatus(projectId);
      setProjectAgents(status.agents || []);
    } catch (err) {
      console.error('Erro ao instalar agente:', err);
    }
  };

  const handleApprove = async (approvalId) => {
    await ceoService.approveWork(approvalId, 'dev-user');
    setPendingApprovals(ceoService.getPendingApprovals().filter(a =>
      a.agentKey?.startsWith(`${projectId}-`)
    ));
  };

  const handleReject = async (approvalId, reason) => {
    await ceoService.rejectWork(approvalId, 'dev-user', reason);
    setPendingApprovals(ceoService.getPendingApprovals().filter(a =>
      a.agentKey?.startsWith(`${projectId}-`)
    ));
  };

  return (
    <div className="ceo-dashboard animate-fade-in">
      <PageHeader
        title={
          <div className="flex items-center gap-3">
            <div className="ceo-icon"><Zap size={24} /></div>
            MasterMind CEO
          </div>
        }
        subtitle={`Sugestoes continuas, aprovacao humana e aprendizado executivo para ${project?.name || 'Projeto'}`}
        actions={
          <Button variant="primary" onClick={() => setIsHiringModalOpen(true)}>
            <Users size={16} /> Contratar Agente
          </Button>
        }
      />

      <div className="ceo-strategy-hero">
        <div>
          <span className="ceo-kicker">Autonomia com aprovacao</span>
          <h2>O CEO opina, prioriza e aprende. Voce aprova antes de executar.</h2>
          <p>
            Nenhuma contratacao, skill, automacao, mudanca sensivel ou acao externa e aplicada sem passar pela fila de aprovacao.
            Quando aprovada, a decisao vira aprendizado do MasterMind.
          </p>
        </div>
        <div className="ceo-strategy-stats">
          <div><strong>{ceoSuggestions.length}</strong><span>sugestoes novas</span></div>
          <div><strong>{pendingStrategicApprovals.length}</strong><span>aguardando voce</span></div>
          <div><strong>{diagnosticSummary.active}</strong><span>diagnosticos ativos</span></div>
        </div>
      </div>

      <section className="ceo-mindmap-panel" aria-label="Mapa mental do MasterMind CEO">
        <div className="ceo-brain">
          <div className="ceo-brain-core">
            <Brain size={44} />
            <strong>MasterMind</strong>
            <span>CEO</span>
          </div>
          {knowledgeNodes.map((node, index) => (
            <div key={node.label} className={`ceo-knowledge-node node-${index + 1}`}>
              <strong>{node.label}</strong>
              <span>{node.value}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="ceo-suggestion-workbench">
        <div className="ceo-section-header">
          <div>
            <span className="ceo-kicker">Sugestoes e aprovacoes</span>
            <h3>Lista de melhorias sugeridas pelo CEO</h3>
          </div>
          <Badge variant="warning">{suggestionInsights.length} itens</Badge>
        </div>

        <div className="ceo-insight-list">
          {mastermindContextAlerts.length > 0 && (
            <div className="ceo-context-alerts" aria-label="Alertas de consulta economica do MasterMind">
              {mastermindContextAlerts.map(alert => (
                <div key={alert.type} className={`ceo-context-alert severity-${alert.severity}`}>
                  <strong>{alert.message}</strong>
                  <span>{alert.action}</span>
                </div>
              ))}
            </div>
          )}

          {suggestionInsights.length === 0 ? (
            <div className="ceo-empty-state">
              Nenhuma sugestao pendente. O CEO esta usando os aprendizados aprovados como contexto.
            </div>
          ) : (
            suggestionInsights.map((item) => {
              const source = item.approval || item.suggestion;
              return (
                <button
                  key={`${item.type}-${item.id}`}
                  type="button"
                  className="ceo-insight-row"
                  onClick={() => setSelectedInsight(item)}
                >
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant={source.risk === 'alto' ? 'danger' : source.risk === 'medio' ? 'warning' : 'success'}>
                        {item.type === 'approval'
                          ? source.appliedStatus === 'applied'
                            ? 'Aplicada'
                            : source.status === 'approved'
                              ? 'Prompt Codex pronto'
                              : source.status === 'rejected'
                                ? 'Recusada'
                                : 'Aguardando aprovacao'
                          : source.category}
                      </Badge>
                      <span className="text-xs text-muted">{source.actionType || source.score?.priority || 'melhoria'}</span>
                    </div>
                    <strong>{source.title}</strong>
                    <p>{source.summary}</p>
                  </div>
                  <span className="ceo-insight-score">{source.score?.total || source.priority || source.appliedStatus || 'CEO'}</span>
                </button>
              );
            })
          )}
        </div>

        <div className="ceo-manual-prompt">
          <Textarea
            label="Prompt manual de sugestao de melhoria"
            value={manualPrompt}
            onChange={event => setManualPrompt(event.target.value)}
            placeholder="Descreva uma melhoria, risco, automacao ou oportunidade para o CEO avaliar antes de virar aprendizado no MasterMind."
            rows={4}
          />
          <div className="flex justify-end">
            <Button variant="primary" onClick={handleCreateManualSuggestion}>
              Gravar sugestao manual
            </Button>
          </div>
        </div>
      </section>

      <div className="ceo-grid">
        <Card title="Diagnostico do MasterMind" icon={<ShieldCheck size={18} />}>
          <div className="ceo-diagnostic-summary">
            <div><strong>{diagnosticSummary.total}</strong><span>sinais</span></div>
            <div><strong>{diagnosticSummary.active}</strong><span>ativos</span></div>
            <div><strong>{diagnosticSummary.monitoring}</strong><span>monitorando</span></div>
            <div><strong>{diagnosticSummary.mitigated}</strong><span>mitigados</span></div>
          </div>

          <div className="ceo-diagnostic-list">
            {diagnosticSummary.top.length === 0 ? (
              <p className="text-muted text-sm">Nenhum diagnostico critico no contexto atual.</p>
            ) : (
              diagnosticSummary.top.map((diagnostic) => (
                <div key={diagnostic.id} className={`ceo-diagnostic-item status-${diagnostic.status}`}>
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <Badge variant={diagnostic.severity === 'high' || diagnostic.severity === 'critical' ? 'danger' : diagnostic.severity === 'medium' ? 'warning' : 'success'}>
                      {diagnostic.status}
                    </Badge>
                    <span className="text-xs text-muted">{diagnostic.area} · {diagnostic.severity}</span>
                  </div>
                  <strong>{diagnostic.title}</strong>
                  <p>{diagnostic.summary}</p>
                  <div className="ceo-mini-list">
                    {(diagnostic.related || []).slice(0, 4).map(item => <span key={item}>{item}</span>)}
                  </div>
                  <p className="text-xs text-muted mt-2">{diagnostic.recommendedAction}</p>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card title="Quadro de Execucao CEO" icon={<CheckSquare size={18} />}>
          <div className="ceo-risk-board-summary">
            <div><strong>{riskExecutionBoard.summary.total}</strong><span>tarefas</span></div>
            <div><strong>{riskExecutionBoard.summary.pendingApproval}</strong><span>em aprovacao</span></div>
            <div><strong>{riskExecutionBoard.summary.approvedForExecution}</strong><span>prontas</span></div>
          </div>

          <div className="ceo-risk-task-list">
            {riskExecutionBoard.tasks.length === 0 ? (
              <p className="text-muted text-sm">Nenhum risco ativo aguardando quadro de execucao.</p>
            ) : (
              riskExecutionBoard.tasks.map(task => (
                <div key={task.id} className={`ceo-risk-task status-${task.status}`}>
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <Badge variant={task.severity === 'high' || task.severity === 'critical' ? 'danger' : task.severity === 'medium' ? 'warning' : 'success'}>
                      {task.severity}
                    </Badge>
                    <Badge variant={task.status === 'approved_for_execution' ? 'success' : task.status === 'approval_pending' ? 'warning' : 'secondary'}>
                      {task.status}
                    </Badge>
                    <span className="text-xs text-muted">{task.area} · {task.owner}</span>
                  </div>
                  <strong>{task.title}</strong>
                  <p>{task.nextAction}</p>
                  <div className="ceo-mini-list">
                    <span>{task.project}</span>
                    {(task.related || []).slice(0, 3).map(item => <span key={item}>{item}</span>)}
                  </div>
                  <div className="ceo-done-criteria">
                    {(task.doneCriteria || []).slice(0, 2).map(item => <span key={item}>{item}</span>)}
                  </div>
                  <div className="flex justify-between gap-3 items-center mt-3 flex-wrap">
                    <span className="text-xs text-muted">Toda execucao exige aprovacao humana antes de Codex/automacao.</span>
                    {task.status === 'ready_for_approval' && (
                      <Button variant="primary" size="sm" onClick={() => handleRequestRiskTaskApproval(task)}>
                        Solicitar aprovacao
                      </Button>
                    )}
                    {task.status === 'approval_pending' && (
                      <Button variant="primary" size="sm" onClick={() => handleApproveRiskTask(task)}>
                        Aprovar execucao
                      </Button>
                    )}
                    {task.status === 'approved_for_execution' && (
                      <Badge variant="success">Aguardando Codex</Badge>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card title="Sugestoes Continuas do CEO" icon={<Brain size={18} />}>
          <div className="ceo-suggestions">
            {ceoSuggestions.length === 0 ? (
              <p className="text-muted text-sm">Nenhuma nova sugestao. O CEO esta usando aprendizados aprovados como contexto.</p>
            ) : (
              ceoSuggestions.map((suggestion) => (
                <div key={suggestion.id} className="ceo-suggestion-item">
                  <div className="flex justify-between gap-3 items-start">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant={suggestion.risk === 'alto' ? 'danger' : suggestion.risk === 'medio' ? 'warning' : 'success'}>
                          {suggestion.category}
                        </Badge>
                        <span className="text-xs text-muted">Score {suggestion.score.total} · {suggestion.score.priority}</span>
                      </div>
                      <strong>{suggestion.title}</strong>
                      <p className="text-sm text-muted mt-2">{suggestion.summary}</p>
                    </div>
                    <Sparkles size={18} className="text-accent" />
                  </div>
                  <div className="ceo-mini-list">
                    {(suggestion.evidence || []).slice(0, 3).map(item => <span key={item}>{item}</span>)}
                  </div>
                  <div className="flex justify-between gap-3 items-center mt-3 flex-wrap">
                    <span className="text-xs text-muted">Exige aprovacao antes de executar</span>
                    <Button variant="primary" size="sm" onClick={() => handleSendSuggestionToApproval(suggestion)}>
                      Enviar para aprovacao
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card title="Aprovacoes Estrategicas" icon={<ShieldCheck size={18} />}>
          {pendingStrategicApprovals.length === 0 ? (
            <p className="text-muted text-sm">Nenhuma decisao CEO aguardando aprovacao.</p>
          ) : (
            <div className="approvals-list">
              {pendingStrategicApprovals.map((approval) => (
                <div key={approval.id} className="approval-item">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant={approval.risk === 'alto' ? 'danger' : 'warning'}>{approval.priority}</Badge>
                    <span className="text-xs text-muted">{approval.actionType}</span>
                  </div>
                  <strong>{approval.title}</strong>
                  <p className="text-sm text-muted mt-2">{approval.summary}</p>
                  <div className="flex gap-2 mt-3 flex-wrap">
                    <Button variant="primary" size="sm" onClick={() => handleApproveStrategic(approval)}>
                      Aprovar e aprender
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => handleRejectStrategic(approval)}>
                      Rejeitar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="Bibliotecas em Estudo" icon={<Library size={18} />}>
          <div className="ceo-library-list">
            {CEO_STUDY_LIBRARY.map(source => (
              <div key={source.id} className="ceo-library-item">
                <div>
                  <strong>{source.name}</strong>
                  <p className="text-xs text-muted">{source.focus}</p>
                </div>
                <Badge variant={source.risk === 'baixo' ? 'success' : 'warning'}>{source.risk}</Badge>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Governanca de Skills" icon={<Wrench size={18} />}>
          <div className="ceo-skill-registry">
            {skillRegistry.slice(0, 8).map(skill => {
              const approval = skill.approvalId ? skillApprovals.find(item => item.id === skill.approvalId) : null;
              return (
                <div key={skill.name} className="ceo-skill-item">
                  <div>
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <Badge variant={skill.risk === 'alto' ? 'danger' : skill.risk === 'medio' ? 'warning' : 'success'}>
                        {skill.risk}
                      </Badge>
                      <Badge variant="secondary">{skill.status}</Badge>
                    </div>
                    <strong>{skill.name}</strong>
                    <p className="text-xs text-muted mt-1">{skill.reason}</p>
                    <div className="ceo-mini-list">
                      <span>{skill.source}</span>
                      <span>{skill.intendedUse}</span>
                      <span>{skill.permissions.join(', ')}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3 flex-wrap">
                    {skill.status === 'suggested' && (
                      <Button variant="primary" size="sm" onClick={() => handleRequestSkillApproval(skill)}>
                        Solicitar aprovacao
                      </Button>
                    )}
                    {approval?.status === 'pending' && (
                      <>
                        <Button variant="primary" size="sm" onClick={() => handleApproveSkill(approval)}>Aprovar</Button>
                        <Button variant="danger" size="sm" onClick={() => handleRejectSkill(approval)}>Recusar</Button>
                      </>
                    )}
                    {approval?.status === 'approved' && approval.appliedStatus !== 'installed' && (
                      <Button variant="secondary" size="sm" onClick={() => handleMarkSkillInstalled(approval)}>
                        Marcar instalada
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card title="Agentes Contratados" icon={<Bot size={18} />}>
          <div className="agents-grid">
            {projectAgents.length === 0 ? (
              <p className="text-muted text-sm">Nenhum agente contratado ainda</p>
            ) : (
              projectAgents.map((agent, index) => (
                <div key={index} className="agent-item">
                  <div className="flex items-center gap-2">
                    <Bot size={16} />
                    <strong>{agent.role}</strong>
                    <Badge variant={agent.status === 'working' ? 'warning' : 'secondary'} size="sm">
                      {agent.status}
                    </Badge>
                  </div>
                  <span className="text-xs text-muted">{agent.tasksCount} tarefas</span>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card title="Aprovações Pendentes" icon={<CheckCircle size={18} />}>
          {pendingApprovals.length === 0 ? (
            <p className="text-muted text-sm">Nenhuma aprovação pendente</p>
          ) : (
            <div className="approvals-list">
              {pendingApprovals.map((approval) => (
                <div key={approval.id} className="approval-item">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="warning">{approval.agentRole}</Badge>
                    <span className="text-xs text-muted">{approval.work?.title || 'Trabalho sem título'}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="primary" size="sm" onClick={() => handleApprove(approval.id)}>
                      Aprovar
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => handleReject(approval.id, 'Revisar e ajustar')}>
                      Rejeitar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="Logs do CEO" icon={<FileText size={18} />}>
          <div className="ceo-logs">
            {logs.length === 0 ? (
              <p className="text-muted text-sm">Aguardando atividades...</p>
            ) : (
              logs.map((log, index) => (
                <div key={index} className={`log-item log-${log.level}`}>
                  <span className="log-time">{new Date(log.timestamp || Date.now()).toLocaleTimeString()}</span>
                  <span className="log-message">{log.message}</span>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card title="Contratar Novo Agente" icon={<Users size={18} />}>
          <div className="hire-grid">
            {Object.values(AGENT_ROLES).filter(r => r !== 'CEO').map((role) => {
              const isHired = projectAgents.some(a => a.role === role);
              return (
                <div key={role} className="hire-item">
                  <div className="flex items-center gap-2">
                    <Bot size={16} />
                    <span>{role}</span>
                  </div>
                  <Button
                    variant={isHired ? 'secondary' : 'primary'}
                    size="sm"
                    onClick={() => isHired ? handleInstallAgent(role) : handleHireAgent(role)}
                  >
                    {isHired ? 'Instalar' : 'Contratar'}
                  </Button>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <Modal
        isOpen={!!selectedInsight}
        onClose={() => setSelectedInsight(null)}
        title={selectedTitle || 'Detalhes da sugestao'}
        size="lg"
        actions={
          <>
            <Button variant="secondary" onClick={() => setSelectedInsight(null)}>Fechar</Button>
            {selectedApproval?.status !== 'approved' && selectedApproval?.status !== 'rejected' && (
              <Button variant="danger" onClick={handleRejectSelected}>Recusar</Button>
            )}
            <Button variant="secondary" onClick={handleCopySelectedPrompt}>
              <Clipboard size={16} /> Copiar prompt
            </Button>
            {selectedApproval?.status === 'approved' ? (
              <Button
                variant="primary"
                disabled={selectedAppliedStatus === 'applied'}
                onClick={handleMarkSelectedApplied}
              >
                <CheckSquare size={16} /> {selectedAppliedStatus === 'applied' ? 'Aplicada' : 'Marcar aplicada'}
              </Button>
            ) : selectedApproval?.status === 'rejected' ? null : (
              <Button variant="primary" onClick={handleApproveSelected}>Aprovar e gerar prompt</Button>
            )}
          </>
        }
      >
        <div className="ceo-detail-modal">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={selectedRisk === 'alto' ? 'danger' : selectedRisk === 'medio' ? 'warning' : 'success'}>
              Risco {selectedRisk || 'medio'}
            </Badge>
            <span className="text-xs text-muted">
              {selectedApproval
                ? selectedAppliedStatus === 'applied'
                  ? 'Sugestao ja aplicada'
                  : selectedApproval.status === 'approved'
                    ? 'Aprovada com prompt pronto para o Codex'
                    : 'Item aguardando aprovacao'
                : 'Sugestao gerada pelo CEO'}
            </span>
          </div>

          <p className="text-sm text-muted">{selectedSummary}</p>

          <div>
            <label className="input-label">Evidencias observadas</label>
            <div className="ceo-detail-list">
              {selectedEvidence.length ? selectedEvidence.map(item => <span key={item}>{item}</span>) : <span>Sem evidencias adicionais.</span>}
            </div>
          </div>

          <div>
            <label className="input-label">Plano de acao sugerido</label>
            <ol className="ceo-action-plan">
              {selectedActionPlan.length ? selectedActionPlan.map(item => <li key={item}>{item}</li>) : <li>Revisar e registrar aprendizado no MasterMind.</li>}
            </ol>
          </div>

          {selectedSkillCandidates.length > 0 && (
            <div>
              <label className="input-label">Skills candidatas</label>
              <div className="ceo-detail-list">
                {selectedSkillCandidates.map(skill => (
                  <span key={skill.name}>{skill.name} · {skill.installPolicy || 'aprovar antes de instalar'}</span>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="input-label">Prompt para inserir no Codex</label>
            <Textarea
              value={selectedCodexPrompt}
              readOnly
              rows={10}
              className="ceo-codex-prompt"
            />
            <p className="text-xs text-muted mt-2">
              Depois que o Codex executar a melhoria, volte aqui e marque como aplicada para gravar o aprendizado final.
            </p>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isHiringModalOpen}
        onClose={() => setIsHiringModalOpen(false)}
        title="Contratar Novo Agente"
        actions={<Button variant="secondary" onClick={() => setIsHiringModalOpen(false)}>Fechar</Button>}
      >
        <div className="hire-agents-list">
          <p className="text-sm text-muted mb-4">Selecione o tipo de agente para contratar:</p>
          {Object.values(AGENT_ROLES).filter(r => r !== 'CEO').map((role) => (
            <div key={role} className="hire-agent-row">
              <div className="flex items-center gap-3">
                <Bot size={20} />
                <div>
                  <strong>{role}</strong>
                  <p className="text-xs text-muted">{ceoService.getAgentInstallSteps(role).length} passos de instalação</p>
                </div>
              </div>
              <Button variant="primary" onClick={() => { handleHireAgent(role); setIsHiringModalOpen(false); }}>
                Contratar
              </Button>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
};

export default CEODashboard;
