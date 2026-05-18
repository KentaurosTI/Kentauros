import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import { useApp } from './context/AppContext';
import { usePermissions } from './hooks/usePermissions';

// Pages
import Dashboard from './pages/Dashboard';
import Leads from './pages/Leads';
import Projects from './pages/Projects';
import Backlog from './pages/Backlog';
import Support from './pages/Support';
import Clients from './pages/Clients';
import QA from './pages/QA';
import Deploy from './pages/Deploy';
import Discovery from './pages/Discovery';
import Proposals from './pages/Proposals';
import Automations from './pages/Automations';
import Users from './pages/Users';
import UXDesign from './pages/UXDesign';
import Development from './pages/Development';
import Settings from './pages/Settings';
import Login from './pages/Login';
import Kanban from './pages/Kanban';
import Prototypes from './pages/Prototypes';
import CodeGenerator from './pages/CodeGenerator';
import Audit from './pages/Audit';
import SmartLogs from './pages/SmartLogs';
import Productivity from './pages/Productivity';
import CEO from './pages/CEO';
import SmartAnalytics from './pages/SmartAnalytics';

function App() {
  const { user, loading } = useApp();
  const { hasPermission } = usePermissions();

  if (loading) return <div className="loader">Initializing OS...</div>;

  if (!user) {
    return <Login />;
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/kanban" element={hasPermission('projects') ? <Kanban /> : <Navigate to="/" />} />
        <Route path="/leads" element={hasPermission('leads') ? <Leads /> : <Navigate to="/" />} />
        <Route path="/discovery" element={hasPermission('discovery') ? <Discovery /> : <Navigate to="/" />} />
        <Route path="/proposals" element={hasPermission('proposals') ? <Proposals /> : <Navigate to="/" />} />
        <Route path="/projects" element={hasPermission('projects') ? <Projects /> : <Navigate to="/" />} />
        <Route path="/backlog" element={hasPermission('backlog') ? <Backlog /> : <Navigate to="/" />} />
        <Route path="/ux" element={hasPermission('ux') ? <UXDesign /> : <Navigate to="/" />} />
        <Route path="/dev" element={hasPermission('dev') ? <Development /> : <Navigate to="/" />} />
        <Route path="/qa" element={hasPermission('qa') ? <QA /> : <Navigate to="/" />} />
        <Route path="/deploy" element={hasPermission('deploy') ? <Deploy /> : <Navigate to="/" />} />
        <Route path="/support" element={hasPermission('support') ? <Support /> : <Navigate to="/" />} />
        <Route path="/clients" element={hasPermission('clients') ? <Clients /> : <Navigate to="/" />} />
        <Route path="/users" element={hasPermission('users') ? <Users /> : <Navigate to="/" />} />
        <Route path="/automations" element={hasPermission('automations') ? <Automations /> : <Navigate to="/" />} />
        <Route path="/settings" element={hasPermission('settings') ? <Settings /> : <Navigate to="/" />} />
        <Route path="/prototypes" element={hasPermission('prototypes') ? <Prototypes /> : <Navigate to="/" />} />
        <Route path="/opencode" element={hasPermission('dev') || hasPermission('qa') ? <CodeGenerator /> : <Navigate to="/" />} />
        
        {/* CEO Agent */}
        <Route path="/ceo" element={hasPermission('admin') ? <CEO /> : <Navigate to="/" />} />
        <Route path="/ceo/:projectId" element={hasPermission('admin') ? <CEO /> : <Navigate to="/" />} />

        {/* Analytics */}
        <Route path="/analytics" element={hasPermission('admin') ? <SmartAnalytics /> : <Navigate to="/" />} />

        {/* Enterprise Modules */}
        <Route path="/audit" element={hasPermission('audit') ? <Audit /> : <Navigate to="/" />} />
        <Route path="/smart-logs" element={hasPermission('logs') ? <SmartLogs /> : <Navigate to="/" />} />
        <Route path="/productivity" element={hasPermission('productivity') ? <Productivity /> : <Navigate to="/" />} />
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}

export default App;
