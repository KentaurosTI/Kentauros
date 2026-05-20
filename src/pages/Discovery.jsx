import React, { useMemo, useState } from 'react';
import { useData } from '../context/DataContext';
import { useApp } from '../context/AppContext';
import { usePermissions } from '../hooks/usePermissions';
import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import StatCard from '../components/ui/StatCard';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Textarea from '../components/ui/Textarea';
import { deriveDiscoveryKnowledge } from '../services/operationalWorkflow';
import { isDiscoveryReadyForProposal } from '../services/commercialFlow';
import { BookOpen, FileText, Mic, Plus, Trash2, Upload } from 'lucide-react';

const emptyMeetingForm = {
  title: '',
  clientName: '',
  status: 'in_progress',
  meetingStatus: 'reuniao_confirmada',
  summary: '',
  opportunity: '',
  scope: '',
  nextAction: '',
  transcription: '',
  diagramming: '',
  decisionsText: '',
  rulesText: '',
  tagsText: '',
  recordings: [],
  estimatedValue: 0,
};

const linesToArray = (value) => String(value || '').split('\n').map(item => item.trim()).filter(Boolean);
const arrayToLines = (value) => (value || []).join('\n');
const meetingStatusLabels = {
  reuniao_confirmada: 'Reunião confirmada',
  reuniao_realizada: 'Reunião realizada',
  em_andamento: 'Em andamento',
};
const formatMeetingStatus = (value) => meetingStatusLabels[value] || String(value || 'Sem status').replaceAll('_', ' ');

const Discovery = () => {
  const { discoveries = [], addDiscovery, updateDiscovery, deleteDiscovery, updateLead, addLearningEvent } = useData();
  const { addNotification } = useApp();
  const { hasPermission } = usePermissions();
  const knowledge = useMemo(() => deriveDiscoveryKnowledge(discoveries), [discoveries]);
  const [selectedDiscovery, setSelectedDiscovery] = useState(null);
  const [discoveryToDelete, setDiscoveryToDelete] = useState(null);
  const [meetingForm, setMeetingForm] = useState(emptyMeetingForm);

  const openMeetingModal = (discovery) => {
    setSelectedDiscovery(discovery);
    setMeetingForm({
      title: discovery.title || '',
      clientName: discovery.clientName || '',
      status: discovery.status || 'in_progress',
      meetingStatus: discovery.meetingStatus || 'reuniao_confirmada',
      summary: discovery.summary || '',
      opportunity: discovery.opportunity || '',
      scope: discovery.scope || '',
      nextAction: discovery.nextAction || '',
      transcription: discovery.transcription || '',
      diagramming: discovery.diagramming || '',
      decisionsText: arrayToLines(discovery.decisions),
      rulesText: arrayToLines(discovery.rules),
      tagsText: (discovery.tags || []).join(', '),
      recordings: discovery.recordings || [],
      transcriptFile: discovery.transcriptFile || null,
      estimatedValue: discovery.estimatedValue || discovery.value || 0,
    });
  };

  const closeMeetingModal = () => {
    setSelectedDiscovery(null);
    setMeetingForm(emptyMeetingForm);
  };

  const handleNewMeeting = () => {
    const discovery = addDiscovery({
      title: `Reunião Discovery - ${new Date().toLocaleDateString('pt-BR')}`,
      clientName: 'Cliente em qualificação',
      status: 'in_progress',
      meetingStatus: 'reuniao_confirmada',
      summary: 'Reunião criada para registrar áudio, transcrição, decisões e requisitos.',
      transcription: '',
      diagramming: '',
      recordings: [],
      decisions: [],
      rules: ['Registrar decisões antes de gerar proposta ou backlog.'],
      tags: ['reuniao_confirmada', 'aprendizado_continuo'],
      createdAt: new Date().toISOString().split('T')[0],
    });

    addLearningEvent({
      source: 'meeting',
      event_type: 'meeting_created',
      title: discovery.title,
      content: discovery.summary,
      tags: ['Discovery', 'Meeting'],
      metadata: { discoveryId: discovery.id },
    });
    addNotification('Nova reunião', 'Registro criado na base de conhecimento.', 'success');
    openMeetingModal(discovery);
  };

  const handleTextUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setMeetingForm(prev => ({
      ...prev,
      transcription: text,
      transcriptFile: {
        name: file.name,
        size: file.size,
        type: file.type || 'text/plain',
        uploadedAt: new Date().toISOString(),
      },
    }));
  };

  const handleAudioUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const recording = {
      id: `rec_${Date.now()}`,
      title: file.name,
      name: file.name,
      type: file.type || 'audio',
      size: file.size,
      status: 'salvo',
      uploadedAt: new Date().toISOString(),
    };

    if (file.size <= 5 * 1024 * 1024) {
      recording.dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    } else {
      recording.storageNote = 'Arquivo maior que 5MB: metadados salvos para upload em storage externo.';
    }

    setMeetingForm(prev => ({ ...prev, recordings: [recording, ...(prev.recordings || [])] }));
  };

  const saveMeeting = () => {
    if (!selectedDiscovery) return;
    const payload = {
      title: meetingForm.title,
      clientName: meetingForm.clientName,
      status: meetingForm.status,
      meetingStatus: meetingForm.meetingStatus,
      summary: meetingForm.summary,
      opportunity: meetingForm.opportunity,
      scope: meetingForm.scope,
      nextAction: meetingForm.nextAction,
      transcription: meetingForm.transcription,
      transcriptFile: meetingForm.transcriptFile,
      diagramming: meetingForm.diagramming,
      decisions: linesToArray(meetingForm.decisionsText),
      rules: linesToArray(meetingForm.rulesText),
      tags: String(meetingForm.tagsText || '').split(',').map(item => item.trim()).filter(Boolean),
      recordings: meetingForm.recordings || [],
      estimatedValue: Number(meetingForm.estimatedValue || 0),
      updatedAt: new Date().toISOString(),
    };

    updateDiscovery(selectedDiscovery.id, payload);
    
    // Sync back to Lead if exists
    if (selectedDiscovery.leadId) {
      updateLead(selectedDiscovery.leadId, { value: payload.estimatedValue });
    }
    addLearningEvent({
      source: 'meeting',
      event_type: 'meeting_knowledge_updated',
      title: payload.title,
      content: [payload.summary, payload.transcription, payload.diagramming].filter(Boolean).join('\n\n').slice(0, 4000),
      tags: ['Discovery', 'Meeting', 'KnowledgeBase'],
      metadata: {
        discoveryId: selectedDiscovery.id,
        recordings: payload.recordings.length,
        decisions: payload.decisions.length,
        hasTranscription: Boolean(payload.transcription),
        hasDiagramming: Boolean(payload.diagramming),
      },
    });
    addNotification('Reunião salva', 'Transcrição, áudio e informações da reunião foram registrados.', 'success');
    closeMeetingModal();
  };

  const requestDeleteMeeting = (discovery) => {
    setDiscoveryToDelete(discovery);
  };

  const confirmDeleteMeeting = () => {
    if (!discoveryToDelete) return;

    deleteDiscovery(discoveryToDelete.id);
    addLearningEvent({
      source: 'meeting',
      event_type: 'meeting_deleted',
      title: discoveryToDelete.title,
      content: `Reunião removida da base Discovery: ${discoveryToDelete.clientName || 'cliente sem nome'}.`,
      tags: ['Discovery', 'Meeting', 'Delete'],
      metadata: { discoveryId: discoveryToDelete.id },
    });
    addNotification('Reunião removida', 'O registro foi excluído da base Discovery.', 'success');

    if (selectedDiscovery?.id === discoveryToDelete.id) {
      closeMeetingModal();
    }
    setDiscoveryToDelete(null);
  };

  if (!hasPermission('discovery')) {
    return (
      <div className="discovery-page animate-fade-in">
        <Card title="Acesso restrito">
          <p className="text-muted">Somente contas Admin podem acessar a base de conhecimento Discovery.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="discovery-page animate-fade-in">
      <PageHeader
        title="Discovery Knowledge Base"
        subtitle="Áudios, gravações, regras e decisões para orientar propostas, projetos e desenvolvimento."
        actions={
          <div className="flex gap-md">
            <Button variant="secondary" icon={Mic} onClick={handleNewMeeting}>
              Assistente de reunião
            </Button>
            <Button variant="primary" icon={Plus} onClick={handleNewMeeting}>
              Nova reunião
            </Button>
          </div>
        }
      />

      <div className="grid grid-3 mb-xl">
        <StatCard label="Reuniões registradas" value={knowledge.length} />
        <StatCard label="Áudios salvos" value={knowledge.reduce((sum, item) => sum + (item.recordings || []).length, 0)} />
        <StatCard label="Decisões mapeadas" value={knowledge.reduce((sum, item) => sum + (item.decisions || []).length, 0)} />
      </div>

      <div className="discovery-card-grid">
        {knowledge.map(discovery => {
          const recordings = discovery.recordings || [];
          const decisions = discovery.decisions || [];
          const rules = discovery.rules || [];
          const tags = discovery.tags || [];
          const readiness = isDiscoveryReadyForProposal(discovery);

          return (
            <Card
              key={discovery.id}
              title={discovery.title}
              className="discovery-card"
              headerActions={<Badge variant={discovery.status === 'approved' ? 'success' : 'warning'}>{formatMeetingStatus(discovery.meetingStatus)}</Badge>}
              footer={
                <div className="discovery-card-actions">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={(event) => {
                      event.stopPropagation();
                      openMeetingModal(discovery);
                    }}
                  >
                    Editar
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    icon={Trash2}
                    onClick={(event) => {
                      event.stopPropagation();
                      requestDeleteMeeting(discovery);
                    }}
                  >
                    Excluir
                  </Button>
                </div>
              }
              hoverable
              role="button"
              tabIndex={0}
              onClick={() => openMeetingModal(discovery)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') openMeetingModal(discovery);
              }}
              style={{ cursor: 'pointer' }}
            >
              <div className="discovery-card-body">
                <section className="discovery-card-section">
                  <span className="text-xs text-muted">Cliente</span>
                  <strong>{discovery.clientName}</strong>
                  <p className="text-sm text-secondary">{discovery.summary || 'Sem resumo registrado.'}</p>
                </section>

                <div className="discovery-card-meta">
                  <div>
                    <Mic size={14} />
                    <strong>{recordings.length}</strong>
                    <span>gravações</span>
                  </div>
                  <div>
                    <FileText size={14} />
                    <strong>{decisions.length}</strong>
                    <span>decisões</span>
                  </div>
                  <div>
                    <BookOpen size={14} />
                    <strong>{tags.length}</strong>
                    <span>tags</span>
                  </div>
                </div>

                <div className="discovery-card-tags">
                  <Badge variant={readiness.ready ? 'success' : 'warning'}>
                    {readiness.ready ? 'Pronto para proposta' : `${readiness.missing.length} pendências`}
                  </Badge>
                  {tags.slice(0, 4).map(tag => <Badge key={tag} variant="secondary">{tag}</Badge>)}
                  {tags.length > 4 && <Badge variant="secondary">+{tags.length - 4}</Badge>}
                </div>

                {!readiness.ready && (
                  <section className="discovery-card-list">
                    <span className="text-xs text-muted">Checklist de prontidão</span>
                    <div className="flex gap-xs flex-wrap">
                      {readiness.missing.map(item => <Badge key={item} variant="warning">{item}</Badge>)}
                    </div>
                  </section>
                )}

                <section className="discovery-card-list">
                  <span className="text-xs text-muted">Decisões para o sistema</span>
                  {decisions.length ? (
                    <ul>
                      {decisions.slice(0, 2).map(decision => <li key={decision}>{decision}</li>)}
                    </ul>
                  ) : (
                    <p>Nenhuma decisão registrada.</p>
                  )}
                </section>

                <section className="discovery-card-list">
                  <span className="text-xs text-muted">Regras operacionais</span>
                  {rules.length ? (
                    <ul>
                      {rules.slice(0, 2).map(rule => <li key={rule}>{rule}</li>)}
                    </ul>
                  ) : (
                    <p>Nenhuma regra registrada.</p>
                  )}
                </section>
              </div>
            </Card>
          );
        })}
      </div>

      <Modal
        isOpen={!!selectedDiscovery}
        onClose={closeMeetingModal}
        title={selectedDiscovery ? `Reunião - ${selectedDiscovery.clientName}` : 'Reunião'}
        size="lg"
        actions={
          <>
            <Button
              variant="danger"
              icon={Trash2}
              onClick={() => {
                requestDeleteMeeting(selectedDiscovery);
                closeMeetingModal();
              }}
            >
              Excluir
            </Button>
            <Button variant="secondary" onClick={closeMeetingModal}>Cancelar</Button>
            <Button variant="primary" onClick={saveMeeting}>Salvar reunião</Button>
          </>
        }
      >
        <div className="discovery-meeting-modal">
          <div className="grid grid-2 gap-md">
            <Input
              label="Título"
              value={meetingForm.title}
              onChange={event => setMeetingForm(prev => ({ ...prev, title: event.target.value }))}
            />
            <Input
              label="Cliente"
              value={meetingForm.clientName}
              onChange={event => setMeetingForm(prev => ({ ...prev, clientName: event.target.value }))}
            />
            <Select
              label="Status da reunião"
              value={meetingForm.meetingStatus}
              onChange={value => setMeetingForm(prev => ({ ...prev, meetingStatus: value }))}
              options={[
                { value: 'reuniao_confirmada', label: 'Reunião confirmada' },
                { value: 'reuniao_realizada', label: 'Reunião realizada' },
                { value: 'em_andamento', label: 'Em andamento' },
              ]}
            />
            <Select
              label="Status do Discovery"
              value={meetingForm.status}
              onChange={value => setMeetingForm(prev => ({ ...prev, status: value }))}
              options={[
                { value: 'in_progress', label: 'Em andamento' },
                { value: 'awaiting_approval', label: 'Aguardando aprovação' },
                { value: 'approved', label: 'Aprovado' },
              ]}
            />
            <Input
              label="Valor estimado (BRL)"
              type="number"
              value={meetingForm.estimatedValue}
              onChange={event => setMeetingForm(prev => ({ ...prev, estimatedValue: event.target.value }))}
              placeholder="Ex: 120000"
            />
          </div>

          <Textarea
            label="Resumo da reunião"
            rows={3}
            value={meetingForm.summary}
            onChange={event => setMeetingForm(prev => ({ ...prev, summary: event.target.value }))}
            wrapperClassName="mt-md"
          />

          <div className="grid grid-2 gap-md mt-md">
            <Textarea
              label="Oportunidade comercial"
              rows={3}
              value={meetingForm.opportunity}
              onChange={event => setMeetingForm(prev => ({ ...prev, opportunity: event.target.value }))}
              placeholder="Ex: melhorar conversao, reduzir atrito no contato, automatizar atendimento."
            />
            <Textarea
              label="Escopo sugerido"
              rows={3}
              value={meetingForm.scope}
              onChange={event => setMeetingForm(prev => ({ ...prev, scope: event.target.value }))}
              placeholder="Ex: diagnostico, prototipo, implementacao com IA e mensuracao."
            />
          </div>

          <Input
            label="Proxima acao"
            value={meetingForm.nextAction}
            onChange={event => setMeetingForm(prev => ({ ...prev, nextAction: event.target.value }))}
            placeholder="Ex: Enviar proposta com diagnostico rapido"
            wrapperClassName="mt-md"
          />

          <div className="grid grid-2 gap-md mt-md">
            <label className="discovery-upload-card">
              <span className="discovery-upload-icon"><Upload size={16} /></span>
              <span>
                <strong>Upload da transcrição</strong>
                <small>{meetingForm.transcriptFile?.name || 'TXT, MD, JSON ou CSV'}</small>
              </span>
              <input type="file" accept=".txt,.md,.json,.csv,text/*" onChange={handleTextUpload} />
            </label>
            <label className="discovery-upload-card">
              <span className="discovery-upload-icon"><Mic size={16} /></span>
              <span>
                <strong>Upload do áudio/gravação</strong>
                <small>{(meetingForm.recordings || [])[0]?.title || 'Áudio ou vídeo da reunião'}</small>
              </span>
              <input type="file" accept="audio/*,video/*" onChange={handleAudioUpload} />
            </label>
          </div>

          <Textarea
            label="Transcrição da reunião"
            rows={6}
            value={meetingForm.transcription}
            onChange={event => setMeetingForm(prev => ({ ...prev, transcription: event.target.value }))}
            placeholder="Cole aqui a transcrição ou faça upload do arquivo."
            wrapperClassName="mt-md"
          />

          <Textarea
            label="Diagramação / fluxograma da reunião"
            rows={4}
            value={meetingForm.diagramming}
            onChange={event => setMeetingForm(prev => ({ ...prev, diagramming: event.target.value }))}
            placeholder="Ex: etapas do projeto, fluxo do cliente, decisões, dependências e responsáveis."
            wrapperClassName="mt-md"
          />

          <div className="grid grid-2 gap-md mt-md">
            <Textarea
              label="Decisões para o sistema"
              rows={5}
              value={meetingForm.decisionsText}
              onChange={event => setMeetingForm(prev => ({ ...prev, decisionsText: event.target.value }))}
              placeholder="Uma decisão por linha."
            />
            <Textarea
              label="Regras operacionais"
              rows={5}
              value={meetingForm.rulesText}
              onChange={event => setMeetingForm(prev => ({ ...prev, rulesText: event.target.value }))}
              placeholder="Uma regra por linha."
            />
          </div>

          <Input
            label="Tags"
            value={meetingForm.tagsText}
            onChange={event => setMeetingForm(prev => ({ ...prev, tagsText: event.target.value }))}
            placeholder="reunião, requisitos, decisões"
            wrapperClassName="mt-md"
          />

          <div className="mt-md">
            <div className="text-xs text-muted mb-xs">Arquivos de áudio salvos</div>
            <div className="flex flex-col gap-xs">
              {(meetingForm.recordings || []).length === 0 && <span className="text-sm text-muted">Nenhuma gravação enviada.</span>}
              {(meetingForm.recordings || []).map(recording => (
                <div key={recording.id} className="discovery-recording-row">
                  <span className="text-sm">{recording.title}</span>
                  <Badge variant="secondary">{Math.max(1, Math.round((recording.size || 0) / 1024))} KB</Badge>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={!!discoveryToDelete}
        onClose={() => setDiscoveryToDelete(null)}
        title="Excluir reunião"
        size="sm"
        actions={
          <>
            <Button variant="secondary" onClick={() => setDiscoveryToDelete(null)}>Cancelar</Button>
            <Button variant="danger" icon={Trash2} onClick={confirmDeleteMeeting}>Excluir reunião</Button>
          </>
        }
      >
        <p className="text-secondary">
          Esta ação removerá a reunião <strong className="text-primary">{discoveryToDelete?.title}</strong> da base Discovery e atualizará os indicadores da tela.
        </p>
      </Modal>
    </div>
  );
};

export default Discovery;
