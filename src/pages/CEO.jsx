import React from 'react';
import CEODashboard from '../components/ceo/CEODashboard';
import { useData } from '../context/DataContext';
import { useApp } from '../context/AppContext';
import { useParams } from 'react-router-dom';

const CEO = () => {
  const data = useData();
  const { user, addNotification } = useApp();
  const { projectId } = useParams();
  const { projects } = data;

  const project = projectId ? projects.find(p => p.id === projectId) : null;

  return (
    <CEODashboard
      projectId={projectId || 'kentauros-global'}
      project={project || { id: 'kentauros-global', name: 'Ecossistema Kentauros' }}
      data={data}
      user={user}
      addNotification={addNotification}
    />
  );
};

export default CEO;
