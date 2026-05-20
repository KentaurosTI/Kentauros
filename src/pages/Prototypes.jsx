import React, { useState, useEffect, useRef } from 'react';
import { prototypeService } from '../services/prototypeService';
import { openCodeService } from '../services/openCodeService';
import { useI18n } from '../context/I18nContext';
import { useData } from '../context/DataContext';
import { useApp } from '../context/AppContext';
import './Prototypes.css';

const PAGE_ICONS = { home: '🏠', about: 'ℹ️', services: '⚙️', contact: '📬' };
const PAGE_LABELS = { home: 'Home', about: 'Sobre', services: 'Serviços', contact: 'Contato' };

export default function Prototypes() {
  const { t } = useI18n();
  const { addNotification } = useApp();
  const { projects, backlog, leads = [], prototypes = [], addPrototype, updatePrototype, deletePrototype, addLearningEvent, addWorkflowRun, updateBacklog } = useData();
  const [selected, setSelected] = useState(null);
  const [activePage, setActivePage] = useState('home');
  const [showGenerator, setShowGenerator] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState('');
  const [generationProgress, setGenerationProgress] = useState(0);
  const [form, setForm] = useState({ company: '', website: '', industry: 'Tecnologia', projectId: '' });
  const [activeTab, setActiveTab] = useState('preview');
  
  // OpenCode states
  const [showOpenCodeModal, setShowOpenCodeModal] = useState(false);
  const [openCodeGenerating, setOpenCodeGenerating] = useState(false);
  const [openCodeStep, setOpenCodeStep] = useState('');
  const [openCodeProgress, setOpenCodeProgress] = useState(0);
  
  const iframeRef = useRef(null);

  useEffect(() => {
    if (prototypes.length === 0) {
      prototypeService.loadAll().forEach(proto => addPrototype(proto));
    }
  }, [addPrototype, prototypes.length]);

  const handleGenerate = async () => {
    const relatedLead = leads.find(lead => lead.company === form.company || lead.website === form.website);
    if (!form.company.trim()) {
      addNotification('Dados obrigatorios', 'Informe a empresa antes de gerar o prototipo.', 'error');
      return;
    }
    if (!form.website.trim() && !form.projectId && !relatedLead?.website && !relatedLead?.metadata?.website) {
      addNotification('Site necessario', 'Informe um site ou vincule um projeto/lead com contexto suficiente para gerar o prototipo.', 'error');
      return;
    }
    setGenerating(true);
    setGenerationProgress(0);

    try {
      const project = projects.find(item => String(item.id) === String(form.projectId));
      const proto = await prototypeService.generate(
        {
          id: `lead_${Date.now()}`,
          company: project?.client || form.company,
          website: form.website,
          industry: form.industry,
          projectId: project?.id || '',
        },
        (step, progress) => {
          setGenerationStep(t(step));
          setGenerationProgress(progress);
        }
      );
      const relatedLead = leads.find(lead => lead.company === (project?.client || form.company) || lead.website === form.website);
      proto.lead_id = relatedLead?.id || proto.lead_id;
      proto.client_name = project?.client || form.company;
      proto.website_url = form.website || relatedLead?.website || relatedLead?.metadata?.website || '';
      proto.project_id = project?.id || '';
      proto.project_name = project?.name || '';
      prototypeService.save(proto);
      addPrototype(proto);
      addLearningEvent({
        source: 'prototype',
        event_type: 'prototype_generated',
        title: `Prototipo gerado - ${proto.client_name}`,
        content: 'Prototipo visual criado a partir de dados do projeto, Discovery e regras de UX/UI.',
        project_id: String(proto.project_id || ''),
        tags: ['Prototype', 'UX', 'Discovery'],
        metadata: { prototypeId: proto.id, projectName: proto.project_name, clientName: proto.client_name },
      });
      setSelected(proto);
      setShowGenerator(false);
      setActiveTab('preview');
    } catch (e) {
      console.error(e);
    } finally {
      setGenerating(false);
    }
  };

  const handleDelete = (id) => {
    prototypeService.delete(id);
    deletePrototype(id);
    if (selected?.id === id) setSelected(null);
  };

  const handleExport = (proto) => {
    const blob = new Blob([proto.html], { type: 'text/html' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${proto.client_name.replace(/\s+/g, '_')}_prototype.html`;
    a.click();
  };

  const handleApprovePrototype = () => {
    if (!selected) return;
    const updated = prototypeService.approve(selected.id);
    if (updated) {
      addWorkflowRun({
        agent: 'UX_PROTOTYPE',
        projectId: updated.project_id || null,
        status: 'approved',
        mode: 'automatic',
        output: `Prototipo aprovado para ${updated.client_name}.`,
      });
      addLearningEvent({
        source: 'prototype',
        event_type: 'prototype_approved',
        title: `Prototipo aprovado - ${updated.client_name}`,
        content: 'Aprovacao visual liberou a etapa de geracao de codigo.',
        project_id: String(updated.project_id || ''),
        tags: ['Prototype', 'Approval'],
        metadata: { prototypeId: updated.id, status: 'approved' },
      });
      setSelected(updated);
      updatePrototype(updated.id, updated);
    }
  };

  const handleOpenCodeGenerate = async () => {
    if (!selected) return;
    setShowOpenCodeModal(true);
    setOpenCodeGenerating(true);
    setOpenCodeProgress(0);
    try {
      await openCodeService.generateCode(selected, (step, prog) => {
        setOpenCodeStep(step);
        setOpenCodeProgress(prog);
      });
      const updated = prototypeService.markAsCodeGenerated(selected.id);
      const linkedTasks = backlog.filter(task => String(task.projectId) === String(selected.project_id));
      linkedTasks
        .filter(task => String(task.title).toLowerCase().includes('ui') || String(task.title).toLowerCase().includes('ux'))
        .forEach(task => updateBacklog(task.id, { status: 'review', automationMode: 'ecosystem_auto', prototypeId: selected.id }));
      addWorkflowRun({
        agent: 'CODE_GENERATOR',
        projectId: selected.project_id || null,
        status: 'pending_qa',
        mode: 'automatic',
        output: `Codigo gerado a partir do prototipo ${selected.id}.`,
      });
      addLearningEvent({
        source: 'prototype',
        event_type: 'code_generated_from_prototype',
        title: `Codigo gerado - ${selected.client_name}`,
        content: 'OpenCode executado com base no prototipo aprovado e tarefas de UX/UI foram encaminhadas para QA.',
        project_id: String(selected.project_id || ''),
        tags: ['OpenCode', 'Prototype', 'QA'],
        metadata: { prototypeId: selected.id, linkedTasks: linkedTasks.map(task => task.id) },
      });
      setSelected(updated);
      updatePrototype(updated.id, updated);
    } catch (e) {
      console.error(e);
    } finally {
      setOpenCodeGenerating(false);
      setTimeout(() => setShowOpenCodeModal(false), 2000);
    }
  };

  const loadInIframe = (html) => {
    if (!iframeRef.current) return;
    const doc = iframeRef.current.contentDocument || iframeRef.current.contentWindow.document;
    doc.open();
    doc.write(html);
    doc.close();
  };

  useEffect(() => {
    if (selected && activeTab === 'preview') {
      setTimeout(() => loadInIframe(selected.html), 50);
    }
  }, [selected, activeTab]);

  const industries = ['Tecnologia', 'Saúde', 'Educação', 'Varejo', 'Finanças', 'Consultoria', 'Indústria', 'Jurídico'];

  return (
    <div className="prototypes-page">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-left">
          <h1>{t('prototypes.title')}</h1>
          <p>{t('prototypes.subtitle')}</p>
        </div>
        <button className="btn-generate" onClick={() => setShowGenerator(true)}>
          <span>✦</span> {t('prototypes.generate')}
        </button>
      </div>

      <div className="prototypes-layout">
        {/* Sidebar list */}
        <aside className="prototypes-sidebar">
          {prototypes.length === 0 ? (
            <div className="proto-empty">
              <div className="proto-empty-icon">🎨</div>
              <p>{t('prototypes.noPrototypes')}</p>
              <small>{t('prototypes.noPrototypesSubtext')}</small>
            </div>
          ) : (
            prototypes.map(proto => (
              <div
                key={proto.id}
                className={`proto-card ${selected?.id === proto.id ? 'active' : ''}`}
                onClick={() => { setSelected(proto); setActiveTab('preview'); }}
              >
                <div className="proto-card-colors">
                  {Object.values(proto.palette).slice(0, 3).map((c, i) => (
                    <div key={i} className="color-dot" style={{ background: c }} />
                  ))}
                </div>
                <div className="proto-card-info">
                  <h3>{proto.client_name}</h3>
                  <div className="proto-card-meta">
                    <span className="proto-badge">{proto.industry}</span>
                    <span>{new Date(proto.created_at).toLocaleDateString('pt-BR')}</span>
                  </div>
                  <div className="proto-card-url">{proto.website_url || 'sem website'}</div>
                </div>
                <div className="proto-card-actions">
                  <button onClick={(e) => { e.stopPropagation(); handleExport(proto); }} title={t('prototypes.exportPrototype')}>⬇</button>
                  <button className="danger" onClick={(e) => { e.stopPropagation(); handleDelete(proto.id); }} title={t('common.delete')}>✕</button>
                </div>
              </div>
            ))
          )}
        </aside>

        {/* Main viewer */}
        <main className="prototypes-main">
          {!selected ? (
            <div className="proto-main-empty">
              <div className="proto-main-icon">🖥️</div>
              <h2>{t('prototypes.preview')}</h2>
              <p>Selecione um protótipo na lista ou gere um novo para visualizar aqui.</p>
              <button className="btn-generate outline" onClick={() => setShowGenerator(true)}>
                ✦ {t('prototypes.generate')}
              </button>
            </div>
          ) : (
            <>
              {/* Viewer header */}
              <div className="viewer-header">
                <div className="viewer-client">
                  <div className="viewer-palette">
                    {Object.values(selected.palette).slice(0, 4).map((c, i) => (
                      <div key={i} style={{ width: 20, height: 20, background: c, borderRadius: 4 }} />
                    ))}
                  </div>
                  <div>
                    <h2>{selected.client_name}</h2>
                    <span>{selected.industry} · v{selected.version} · {new Date(selected.created_at).toLocaleDateString('pt-BR')}</span>
                  </div>
                </div>
                <div className="viewer-tabs">
                  {['preview', 'insights', 'html'].map(tab => (
                    <button key={tab} className={`tab-btn ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>
                      {tab === 'preview' ? '🖥️ Preview' : tab === 'insights' ? '🧠 Insights' : '💻 HTML'}
                    </button>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {selected.status === 'pending' && (
                    <button onClick={handleApprovePrototype} style={{ background: '#22c55e', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                      ✅ Aprovar Protótipo
                    </button>
                  )}
                  {selected.status === 'approved' && (
                    <button onClick={handleOpenCodeGenerate} style={{ background: '#10b981', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                      🤖 Gerar Código OpenCode
                    </button>
                  )}
                  {selected.status === 'code_generated' && (
                    <button disabled style={{ background: '#374151', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '4px', opacity: 0.7 }}>
                      ✅ Código Gerado
                    </button>
                  )}
                  <button className="btn-export" onClick={() => handleExport(selected)}>
                    ⬇ {t('prototypes.exportPrototype')}
                  </button>
                </div>
              </div>

              {/* Page nav (only for preview) */}
              {activeTab === 'preview' && (
                <div className="page-nav">
                  {selected.pages.map(pg => (
                    <button
                      key={pg}
                      className={`page-nav-btn ${activePage === pg ? 'active' : ''}`}
                      onClick={() => setActivePage(pg)}
                    >
                      {PAGE_ICONS[pg]} {PAGE_LABELS[pg] || pg}
                    </button>
                  ))}
                </div>
              )}

              {/* Content area */}
              <div className="viewer-content">
                {activeTab === 'preview' && (
                  <iframe
                    ref={iframeRef}
                    className="proto-iframe"
                    title={`${selected.client_name} prototype`}
                    sandbox="allow-same-origin"
                  />
                )}

                {activeTab === 'insights' && (
                  <div className="insights-panel">
                    <div className="insight-section">
                      <h3>🔴 {t('prototypes.uxProblems')}</h3>
                      <ul>
                        {selected.ux_problems?.map((p, i) => (
                          <li key={i}><span className="insight-dot red" />{p}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="insight-section">
                      <h3>🟢 {t('prototypes.improvements')}</h3>
                      <ul>
                        {selected.improvements?.map((p, i) => (
                          <li key={i}><span className="insight-dot green" />{p}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="insight-section">
                      <h3>🎨 Paleta de Cores Extraída</h3>
                      <div className="palette-display">
                        {Object.entries(selected.palette || {}).map(([name, color]) => (
                          <div key={name} className="palette-chip">
                            <div className="palette-swatch" style={{ background: color }} />
                            <span className="palette-name">{name}</span>
                            <span className="palette-hex">{color}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'html' && (
                  <pre className="html-code">{selected.html}</pre>
                )}
              </div>
            </>
          )}
        </main>
      </div>

      {/* Generator Modal */}
      {showGenerator && (
        <div className="modal-overlay" onClick={() => !generating && setShowGenerator(false)}>
          <div className="generator-modal" onClick={e => e.stopPropagation()}>
            {generating ? (
              <div className="generating-state">
                <div className="generating-animation">
                  <div className="gen-ring" />
                  <div className="gen-ring gen-ring-2" />
                  <span className="gen-icon">✦</span>
                </div>
                <h2>{t('prototypes.generating')}</h2>
                <p>{t('prototypes.generatingSubtext')}</p>
                <div className="gen-progress-bar">
                  <div className="gen-progress-fill" style={{ width: `${generationProgress}%` }} />
                </div>
                <div className="gen-step">{generationStep}</div>
                <div className="gen-percent">{generationProgress}%</div>
              </div>
            ) : (
              <>
                <div className="modal-header">
                  <h2>✦ {t('prototypes.generate')}</h2>
                  <button className="modal-close" onClick={() => setShowGenerator(false)}>✕</button>
                </div>
                <div className="modal-body">
                  <div className="form-group">
                    <label>Projeto associado</label>
                    <select value={form.projectId} onChange={e => {
                      const project = projects.find(item => String(item.id) === String(e.target.value));
                      setForm(f => ({
                        ...f,
                        projectId: e.target.value,
                        company: project?.client || f.company,
                      }));
                    }}>
                      <option value="">Sem projeto vinculado</option>
                      {projects.map(project => <option key={project.id} value={project.id}>{project.name} - {project.client}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>{t('prototypes.selectLead')} / {t('leads.companyName')}</label>
                    <input
                      type="text"
                      placeholder="Ex: Clínica Saúde Total"
                      value={form.company}
                      onChange={e => setForm(f => ({ ...f, company: e.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <label>{t('prototypes.websiteUrl')}</label>
                    <input
                      type="url"
                      placeholder="https://empresa.com.br"
                      value={form.website}
                      onChange={e => setForm(f => ({ ...f, website: e.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <label>{t('prototypes.industry')}</label>
                    <select value={form.industry} onChange={e => setForm(f => ({ ...f, industry: e.target.value }))}>
                      {industries.map(ind => <option key={ind}>{ind}</option>)}
                    </select>
                  </div>
                  <div className="modal-info">
                    <span>ℹ️</span>
                    <p>A IA vai analisar o segmento e gerar um protótipo profissional com identidade visual customizada, estrutura de conteúdo otimizada e CTAs estratégicos.</p>
                  </div>
                </div>
                <div className="modal-footer">
                  <button className="btn-cancel" onClick={() => setShowGenerator(false)}>{t('common.cancel')}</button>
                  <button className="btn-start" onClick={handleGenerate} disabled={!form.company.trim()}>
                    ✦ {t('prototypes.startGeneration')}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* OpenCode Generator Modal */}
      {showOpenCodeModal && (
        <div className="modal-overlay">
          <div className="generator-modal" style={{ background: '#0a192f', border: '1px solid #64ffda', color: '#64ffda' }}>
            <div className="generating-state">
              <div className="generating-animation">
                <div className="gen-ring" style={{ borderColor: '#64ffda transparent transparent transparent' }} />
                <div className="gen-ring gen-ring-2" style={{ borderColor: 'transparent #64ffda transparent transparent' }} />
                <span className="gen-icon" style={{ color: '#64ffda' }}>🤖</span>
              </div>
              <h2 style={{ color: 'white' }}>{openCodeGenerating ? 'OpenCode em Execução' : 'Código Gerado!'}</h2>
              <p style={{ color: '#8892b0' }}>Orquestrando engenharia de software baseada em IA.</p>
              <div className="gen-progress-bar" style={{ background: 'rgba(100, 255, 218, 0.1)' }}>
                <div className="gen-progress-fill" style={{ width: `${openCodeProgress}%`, background: '#64ffda' }} />
              </div>
              <div className="gen-step" style={{ color: '#64ffda' }}>{openCodeGenerating ? openCodeStep : 'Card de QA criado no Kanban. Acesso liberado.'}</div>
              <div className="gen-percent" style={{ color: 'white' }}>{openCodeProgress}%</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
