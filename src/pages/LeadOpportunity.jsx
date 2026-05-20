import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CalendarClock, MessageCircle, Sparkles } from 'lucide-react';
import { useData } from '../context/DataContext';
import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Timeline from '../components/ui/Timeline';
import OpportunityScore from '../components/leads/OpportunityScore';
import { buildOpportunityTimeline } from '../services/commercialFlow';
import {
  createDiagnosticByNiche,
  createProposalTemplate,
  getFollowUpQueue,
  getLeadCoolingAlerts,
} from '../services/continuousImprovement';

const formatCurrency = value =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value || 0));

const LeadOpportunity = () => {
  const { leadId } = useParams();
  const navigate = useNavigate();
  const { leads, discoveries = [], proposals = [], projects = [], clients = [], prototypes = [] } = useData();
  const lead = leads.find(item => String(item.id) === String(leadId));

  const timeline = useMemo(() => lead ? buildOpportunityTimeline({
    lead,
    discoveries,
    proposals,
    projects,
    clients,
    prototypes,
    interactions: lead.interactionHistory || [],
  }) : [], [lead, discoveries, proposals, projects, clients, prototypes]);

  if (!lead) {
    return (
      <div className="animate-fade-in">
        <PageHeader title="Oportunidade não encontrada" subtitle="O lead solicitado não existe ou não está no seu escopo." />
        <Button variant="secondary" icon={ArrowLeft} onClick={() => navigate('/leads')}>Voltar para leads</Button>
      </div>
    );
  }

  const diagnostic = createDiagnosticByNiche(lead.industry || lead.category || 'geral');
  const proposalTemplate = createProposalTemplate(lead.prospectingPlan?.offer?.type || 'site');
  const followUp = getFollowUpQueue([lead])[0];
  const coolingAlert = getLeadCoolingAlerts([lead])[0];

  return (
    <div className="lead-opportunity-page animate-fade-in">
      <PageHeader
        title={lead.company}
        subtitle="Página de oportunidade com diagnóstico, próxima ação, score e histórico comercial."
        actions={<Button variant="secondary" icon={ArrowLeft} onClick={() => navigate('/leads')}>Voltar</Button>}
      />

      <div className="grid grid-3 mb-xl">
        <Card title="Score da oportunidade">
          <OpportunityScore lead={lead} />
          <div className="text-sm mt-md">Valor estimado: <strong>{formatCurrency(lead.value)}</strong></div>
        </Card>
        <Card title="Próxima ação" headerActions={coolingAlert ? <Badge variant="danger">Risco {coolingAlert.risk}</Badge> : <Badge variant="success">Em dia</Badge>}>
          <div className="flex gap-sm items-start">
            <CalendarClock size={18} />
            <div>
              <strong>{lead.nextAction || followUp?.message || 'Validar diagnóstico rápido'}</strong>
              <p className="text-sm text-muted mt-xs">Canal sugerido: {lead.phone || lead.whatsapp ? 'WhatsApp' : 'E-mail'}</p>
            </div>
          </div>
        </Card>
        <Card title="Contato">
          <div className="flex flex-col gap-xs">
            <strong>{lead.contact || 'Representante'}</strong>
            <span className="text-sm text-muted">{lead.email || 'sem e-mail'}</span>
            <span className="text-sm text-muted">{lead.phone || lead.whatsapp || 'sem telefone'}</span>
          </div>
        </Card>
      </div>

      <div className="grid grid-2 mb-xl">
        <Card title="Diagnóstico rápido" headerActions={<Sparkles size={18} />}>
          <p className="text-sm text-muted mb-md">{diagnostic.opportunity}</p>
          <div className="flex flex-col gap-xs">
            {diagnostic.problems.map(problem => <Badge key={problem} variant="secondary">{problem}</Badge>)}
          </div>
        </Card>
        <Card title="Estrutura de proposta" headerActions={<MessageCircle size={18} />}>
          <div className="flex flex-col gap-sm">
            {proposalTemplate.sections.map(section => (
              <div key={section} className="p-sm bg-secondary border-radius-sm">{section}</div>
            ))}
          </div>
        </Card>
      </div>

      <Card title="Timeline da oportunidade">
        <Timeline items={timeline.map(item => ({
          title: item.title,
          timestamp: item.date,
          status: item.status,
          description: item.entity,
        }))} />
      </Card>
    </div>
  );
};

export default LeadOpportunity;
