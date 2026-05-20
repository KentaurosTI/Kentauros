import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { useApp } from '../context/AppContext';
import { useI18n } from '../context/I18nContext';
import { useLogs } from '../context/LogsContext';
import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import StatCard from '../components/ui/StatCard';
import Badge from '../components/ui/Badge';
import Chart from '../components/ui/Chart';
import Button from '../components/ui/Button';
import { getDashboardMetrics, getScopedDashboardData } from '../services/operationalWorkflow';
import {
  createDecisionRecommendations,
  createOperationalConversionCycle,
  createWeeklyCeoReview,
  getMastermindLearningEvents,
} from '../services/continuousImprovement';

const Dashboard = () => {
  const { t } = useI18n();
  const { leads, discoveries, clients, projects, backlog, automations, proposals, qaTests, deployments, addBacklog, addLearningEvent } = useData();
  const { user, addNotification } = useApp();
  const { incidents } = useLogs();
  const navigate = useNavigate();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isExecutiveView, setIsExecutiveView] = useState(false);

  const scopedData = useMemo(
    () => getScopedDashboardData({ user, leads, discoveries, clients, projects, backlog, proposals, qaTests, deployments, automations }),
    [user, leads, discoveries, clients, projects, backlog, proposals, qaTests, deployments, automations]
  );

  const metrics = useMemo(
    () => getDashboardMetrics(scopedData),
    [scopedData]
  );
  const decisionRecommendations = useMemo(
    () => createDecisionRecommendations(scopedData),
    [scopedData]
  );
  const weeklyReview = useMemo(
    () => createWeeklyCeoReview(scopedData),
    [scopedData]
  );

  const revenueData = useMemo(() => {
    const months = [t('month.jan'), t('month.feb'), t('month.mar'), t('month.apr'), t('month.may'), t('month.jun')];
    const total = metrics.signedRevenue || scopedData.proposals.reduce((sum, proposal) => sum + Number(proposal.value || 0), 0);
    return months.map((name, index) => ({ name, value: Math.round((total * ((index + 1) / months.length)) / 1000) }));
  }, [metrics.signedRevenue, scopedData.proposals, t]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    addNotification('Atualizando dados', 'Recalculando indicadores a partir dos dados do sistema.', 'info');
    setTimeout(() => {
      setIsRefreshing(false);
      addNotification('Dashboard atualizado', 'Indicadores sincronizados com o estado atual.', 'success');
    }, 800);
  };

  const syncMastermindLearnings = () => {
    const events = getMastermindLearningEvents(scopedData);
    events.forEach(event => addLearningEvent(event));
    addNotification('MasterMind atualizado', `${events.length} aprendizado${events.length === 1 ? '' : 's'} sincronizado${events.length === 1 ? '' : 's'}.`, 'success');
  };

  const createCommercialBacklog = () => {
    const cycle = createOperationalConversionCycle({
      ...scopedData,
      recommendations: decisionRecommendations,
      existingBacklog: backlog,
      ownerId: user?.id,
    });
    const tasks = cycle.backlog;

    tasks.forEach(task => addBacklog(task));
    addLearningEvent(cycle.learningEvent);
    addNotification(
      'Backlog comercial atualizado',
      tasks.length
        ? `${tasks.length} tarefa${tasks.length === 1 ? '' : 's'} criada${tasks.length === 1 ? '' : 's'} a partir do MasterMind.`
        : 'As recomendações comerciais já estavam priorizadas no backlog.',
      tasks.length ? 'success' : 'info'
    );
  };

  return (
    <div className="dashboard-page animate-fade-in">
      <PageHeader
        title={t('dashboard.title')}
        subtitle={t('dashboard.subtitle')}
        actions={
          <>
            <Button variant={isExecutiveView ? 'primary' : 'secondary'} onClick={() => setIsExecutiveView(!isExecutiveView)}>
              {isExecutiveView ? 'Ocultar visão executiva' : 'Visão executiva'}
            </Button>
            <Button variant="secondary" onClick={() => addNotification('Relatório', 'Relatório operacional será gerado com dados reais.', 'info')}>
              {t('dashboard.downloadReport')}
            </Button>
            <Button variant="primary" loading={isRefreshing} onClick={handleRefresh}>
              {isRefreshing ? t('common.loading') : t('dashboard.refreshData')}
            </Button>
          </>
        }
      />

      {isExecutiveView && (
        <div className="executive-view mb-8 p-6 bg-surface border border-[var(--k-gold-500)] rounded-lg">
          <h3 className="text-lg font-bold mb-4 text-[var(--k-gold-500)]">Resumo executivo</h3>
          <div className="grid grid-3 gap-6">
            <Card>
              <div className="text-sm text-muted uppercase font-bold mb-2">Receita assinada</div>
              <div className="text-3xl font-bold">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(metrics.signedRevenue)}
              </div>
            </Card>
            <Card>
              <div className="text-sm text-muted uppercase font-bold mb-2">Qualidade</div>
              <div className="text-3xl font-bold">{metrics.health}%</div>
              <div className="text-xs text-muted mt-2">{qaTests.filter(test => test.status === 'passed').length} testes aprovados</div>
            </Card>
            <Card>
              <div className="text-sm text-muted uppercase font-bold mb-2">Incidentes abertos</div>
              <div className="text-3xl font-bold">{incidents.filter(item => item.status === 'open').length}</div>
            </Card>
          </div>
        </div>
      )}

      <div className="grid grid-4 mb-8">
        <div onClick={() => navigate('/leads')} className="cursor-pointer">
          <StatCard label={t('dashboard.activeLeads')} value={metrics.activeLeads} change={`${scopedData.leads.filter(lead => lead.status === 'qualified').length} qualificados`} trend="up" />
        </div>
        <div onClick={() => navigate('/projects')} className="cursor-pointer">
          <StatCard label={t('dashboard.runningProjects')} value={metrics.activeProjects} change={`${scopedData.projects.length} no total`} />
        </div>
        <div onClick={() => navigate('/qa')} className="cursor-pointer">
          <StatCard label={t('dashboard.systemHealth')} value={`${metrics.health}%`} change={`${scopedData.qaTests.filter(test => test.status === 'passed').length}/${scopedData.qaTests.length || 0} QA aprovados`} trend="up" />
        </div>
        <div onClick={() => navigate('/backlog')} className="cursor-pointer">
          <StatCard label={t('dashboard.backlogItems')} value={metrics.openBacklog} change={`${scopedData.backlog.filter(item => item.status === 'done').length} concluídos`} trend="down" />
        </div>
      </div>

      {scopedData.leads.length > 0 && (
        <div className="grid grid-4 mb-8">
          <StatCard label="Leads qualificados" value={metrics.qualifiedLeads} change={`${metrics.contactedLeads} contatados`} trend="up" />
          <StatCard label="Prontidão média" value={`${metrics.avgReadiness}%`} change="score comercial" />
          <StatCard label="Taxa de ganho" value={`${metrics.conversionRate}%`} change={`${metrics.wonLeads} ganhos`} trend="up" />
          <StatCard label="Follow-ups" value={scopedData.leads.filter(lead => lead.followUpStatus === 'scheduled').length} change="agendados" />
          <StatCard label="Lead para proposta" value={`${metrics.leadToProposalRate}%`} change={`${metrics.proposalCount} propostas`} trend="up" />
          <StatCard label="Proposta para cliente" value={`${metrics.proposalToClientRate}%`} change={`${metrics.clientCount} clientes`} trend="up" />
          <StatCard label="Ticket medio" value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(metrics.averageTicket)} change="propostas" />
          <StatCard label="Discoveries" value={metrics.discoveryCount} change="em base comercial" />
        </div>
      )}

      <div className="grid grid-2 mb-8">
        <Card title={t('dashboard.charts.revenue')}>
          <Chart type="area" data={revenueData} height={280} colors={['#D4AF37']} />
        </Card>
        <Card title={t('dashboard.charts.pipeline')}>
          <Chart type="bar" data={metrics.pipeline} height={280} colors={['#D4AF37', '#10B981', '#F59E0B']} />
        </Card>
      </div>

      <div className="grid grid-2 mb-8">
        <Card
          title="Decisões recomendadas pelo MasterMind"
          footer={<Button variant="primary" className="w-full" onClick={createCommercialBacklog}>Gerar backlog comercial</Button>}
        >
          <div className="flex flex-col gap-sm">
            {decisionRecommendations.slice(0, 4).map(recommendation => (
              <div key={recommendation.id} className="p-md bg-secondary border-radius-sm">
                <div className="flex justify-between gap-sm">
                  <strong>{recommendation.title}</strong>
                  <Badge variant={recommendation.score.priority === 'critica' ? 'danger' : 'warning'}>
                    {recommendation.score.total}
                  </Badge>
                </div>
                <p className="text-sm text-muted mt-xs">{recommendation.origin}</p>
                <div className="text-xs text-muted mt-xs">Impacto: {recommendation.impact.expected}</div>
              </div>
            ))}
            {decisionRecommendations.length === 0 && <span className="text-sm text-muted">Nenhuma decisão crítica no momento.</span>}
          </div>
        </Card>
        <Card title="Revisão semanal CEO" footer={<Button variant="secondary" className="w-full" onClick={syncMastermindLearnings}>Sincronizar aprendizados</Button>}>
          <div className="grid grid-2 gap-sm mb-md">
            <div className="p-sm bg-secondary border-radius-sm">Leads: <strong>{weeklyReview.indicators.leads}</strong></div>
            <div className="p-sm bg-secondary border-radius-sm">Propostas: <strong>{weeklyReview.indicators.proposals}</strong></div>
            <div className="p-sm bg-secondary border-radius-sm">Clientes: <strong>{weeklyReview.indicators.clients}</strong></div>
            <div className="p-sm bg-secondary border-radius-sm">Projetos abertos: <strong>{weeklyReview.indicators.openProjects}</strong></div>
          </div>
          <div className="flex flex-col gap-xs">
            {weeklyReview.nextDecisions.slice(0, 3).map(item => (
              <Badge key={item.id} variant="secondary">{item.title}</Badge>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-3">
        <Card title={t('dashboard.recentActivity')} className="col-span-2">
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>{t('dashboard.table.event')}</th>
                  <th>{t('dashboard.table.entity')}</th>
                  <th>{t('dashboard.table.status')}</th>
                  <th>{t('dashboard.table.time')}</th>
                </tr>
              </thead>
              <tbody>
                {metrics.recentActivity.map((activity, index) => (
                  <tr key={`${activity.event}-${index}`}>
                    <td>{activity.event}</td>
                    <td className="font-semibold">{activity.entity}</td>
                    <td><Badge variant={activity.badgeType}>{activity.status}</Badge></td>
                    <td className="text-muted text-xs">{String(activity.time).split('T')[0]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title={t('dashboard.topAutomations')} footer={<Button variant="secondary" className="w-full" onClick={() => navigate('/automations')}>{t('dashboard.manageAutomations')}</Button>}>
          <div className="automation-list flex flex-col gap-4">
            {metrics.automations.slice(0, 4).map((automation, index) => (
              <div key={automation.id} className="automation-item">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-bold truncate">{automation.name}</span>
                  <Badge variant={automation.status === 'active' ? 'success' : 'secondary'} dot>{automation.status === 'active' ? t('status.active') : t('status.idle')}</Badge>
                </div>
                <div className="progress-bar w-full h-1 bg-surface rounded-full overflow-hidden">
                  <div className="progress-fill h-full transition-all duration-300" style={{ width: `${Math.min(100, automation.runs || 20)}%`, opacity: automation.status === 'active' ? 1 : 0.3, background: 'var(--k-gold-500)' }} />
                </div>
                <div className="text-xs text-muted mt-1">{automation.success || 0}/{automation.runs || 0} execuções com sucesso</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
