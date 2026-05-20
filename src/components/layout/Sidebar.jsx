import React from 'react';
import { NavLink } from 'react-router-dom';
import { usePermissions } from '../../hooks/usePermissions';
import { useI18n } from '../../context/I18nContext';
import { LANGUAGES } from '../../data/languages';

const getMenuItems = (t) => [
  { path: '/', label: t('nav.dashboard'), icon: 'M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z', module: 'dashboard' },
  { path: '/kanban', label: t('nav.kanban'), icon: 'M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z', module: 'projects' },
  { path: '/leads', label: t('nav.leads'), icon: 'M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z', module: 'leads' },
  { path: '/discovery', label: t('nav.discovery'), icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z', module: 'discovery' },
  { path: '/proposals', label: t('nav.proposals'), icon: 'M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z', module: 'proposals' },
  { path: '/projects', label: t('nav.projects'), icon: 'M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm10 12h-2v-2h2v2zm0-4h-2v-2h2v2zm0-4h-2V9h2v2zm0-4h-2V5h2v2zm4 12h-2v-2h2v2zm0-4h-2v-2h2v2zm0-4h-2V9h2v2zm0-4h-2V5h2v2z', module: 'projects' },
  { path: '/backlog', label: t('nav.backlog'), icon: 'M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z', module: 'backlog' },
  { path: '/ux', label: t('nav.ux'), icon: 'M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8zm-5.5 9c-.83 0-1.5-.67-1.5-1.5S5.67 9 6.5 9 8 9.67 8 10.5 7.33 12 6.5 12zm3-4C8.67 8 8 7.33 8 6.5S8.67 5 9.5 5s1.5.67 1.5 1.5S10.33 8 9.5 8zm5 0c-.83 0-1.5-.67-1.5-1.5S13.67 5 14.5 5s1.5.67 1.5 1.5S15.33 8 14.5 8zm3 4c-.83 0-1.5-.67-1.5-1.5S16.67 9 17.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z', module: 'ux' },
  { path: '/dev', label: t('nav.dev'), icon: 'M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z', module: 'dev' },
  { path: '/qa', label: t('nav.qa'), icon: 'M14.45 15.45l-4.5-4.5 4.5-4.5L13 5l-6 6 6 6 1.45-1.55z', module: 'qa' },
  { path: '/deploy', label: t('nav.deploy'), icon: 'M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z', module: 'deploy' },
  { path: '/support', label: t('nav.support'), icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z', module: 'support' },
  { path: '/clients', label: t('nav.clients'), icon: 'M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z', module: 'clients' },
  { path: '/users', label: t('nav.users'), icon: 'M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z', module: 'users' },
  { path: '/automations', label: t('nav.automations'), icon: 'M13 2v8h8V2h-8zm-2 20v-8H3v8h8zm10 0v-8h-8v8h8zM3 2v8h8V2H3z', module: 'automations' },
  { path: '/prototypes', label: t('nav.prototypes'), icon: 'M21 3H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H3V5h18v14zM5 10h2v7H5zm4-3h2v10H9zm4 6h2v4h-2zm4-8h2v12h-2z', module: 'prototypes' },
  { path: '/settings', label: t('nav.settings'), icon: 'M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L3.34 8.87c-.11.2-.06.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z', module: 'settings' },
  { path: '/productivity', label: t('nav.productivity') || 'Produtividade', icon: 'M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z', module: 'productivity' },
  { path: '/smart-logs', label: t('nav.logs') || 'Smart Logs', icon: 'M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z', module: 'logs' },
  { path: '/audit', label: t('nav.audit') || 'Auditoria', icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z', module: 'audit' },
  { path: '/ceo', label: 'MasterMind CEO', icon: 'M12 2a5 5 0 00-5 5v1H6a4 4 0 000 8h1v1a5 5 0 005 5 5 5 0 005-5v-1h1a4 4 0 000-8h-1V7a5 5 0 00-5-5zm-3 7V7a3 3 0 116 0v10a3 3 0 11-6 0v-2H6a2 2 0 110-4h3V9zm6 2h3a2 2 0 110 4h-3v-4z', module: 'ceo' },
  { path: '/analytics', label: 'Analytics', icon: 'M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z', module: 'admin' },
];

const Sidebar = () => {
  const { hasPermission } = usePermissions();
  const { t, currentLanguage, setLanguage } = useI18n();
  const menuItems = getMenuItems(t);

  return (
    <aside className="sidebar" role="navigation" aria-label="Main navigation">
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon" aria-hidden="true">K</div>
        <span className="sidebar-logo-text">KENTAUROS</span>
      </div>

      <nav className="sidebar-nav">
        {menuItems.filter(item => hasPermission(item.module)).map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            end={item.path === '/'}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d={item.icon} />
            </svg>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-lang">
          {LANGUAGES.map(lang => (
            <button
              key={lang.code}
              className={`lang-btn ${currentLanguage.code === lang.code ? 'active' : ''}`}
              onClick={() => setLanguage(lang.code)}
              title={lang.label}
            >
              {lang.flag}
            </button>
          ))}
        </div>
        <div className="sidebar-status">
          <div className="status-dot" aria-hidden="true"></div>
          <span>{t('nav.systemStatus')}</span>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
