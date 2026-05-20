import { PERMISSIONS } from '../data/mock-users.js';
import {
  canAccessAdmin,
  canAccessCommercial,
  canAccessDeploy,
  canAccessDev,
  canAccessQa,
  canAccessUx,
} from './operationalWorkflow.js';

export const MODULE_OWNERSHIP = {
  dashboard: ['ADMIN', 'COMERCIAL', 'DEV', 'UX', 'QA', 'DEVOPS', 'SUPORTE', 'CLIENTE'],
  leads: ['ADMIN', 'COMERCIAL'],
  discovery: ['ADMIN'],
  proposals: ['ADMIN', 'COMERCIAL'],
  clients: ['ADMIN', 'COMERCIAL', 'SUPORTE'],
  projects: ['ADMIN', 'DEV', 'UX', 'QA', 'DEVOPS', 'CLIENTE'],
  kanban: ['ADMIN', 'DEV', 'UX', 'QA'],
  backlog: ['ADMIN', 'DEV'],
  ux: ['ADMIN', 'UX', 'DEV'],
  prototypes: ['ADMIN', 'UX', 'DEV'],
  dev: ['ADMIN', 'DEV'],
  opencode: ['ADMIN', 'DEV', 'QA'],
  qa: ['ADMIN', 'QA', 'DEV'],
  deploy: ['ADMIN', 'DEVOPS', 'DEV'],
  support: ['ADMIN', 'SUPORTE', 'CLIENTE'],
  automations: ['ADMIN', 'DEVOPS'],
  users: ['ADMIN'],
  settings: ['ADMIN'],
  productivity: ['ADMIN'],
  logs: ['ADMIN'],
  audit: ['ADMIN'],
  ceo: ['ADMIN'],
};

export const hasModuleAccess = (user, module) => {
  if (!user) return false;
  const rolePermissions = PERMISSIONS[user.role];
  if (rolePermissions && Object.prototype.hasOwnProperty.call(rolePermissions, module)) {
    return !!rolePermissions[module];
  }

  if (module === 'dashboard') return true;
  if (module === 'discovery' || module === 'users' || module === 'settings' || module === 'productivity' || module === 'logs' || module === 'audit' || module === 'ceo') {
    return canAccessAdmin(user);
  }
  if (module === 'leads' || module === 'proposals' || module === 'clients') return canAccessCommercial(user);
  if (module === 'kanban' || module === 'projects' || module === 'backlog' || module === 'dev' || module === 'opencode') return canAccessDev(user);
  if (module === 'ux' || module === 'prototypes') return canAccessUx(user);
  if (module === 'qa') return canAccessQa(user);
  if (module === 'deploy' || module === 'automations') return canAccessDeploy(user);

  return rolePermissions ? !!rolePermissions[module] : false;
};

const DEFAULT_ROUTE_ORDER = [
  ['dashboard', '/'],
  ['leads', '/leads'],
  ['discovery', '/discovery'],
  ['clients', '/clients'],
  ['prototypes', '/prototypes'],
  ['proposals', '/proposals'],
  ['projects', '/projects'],
  ['kanban', '/kanban'],
  ['backlog', '/backlog'],
  ['ux', '/ux'],
  ['dev', '/dev'],
  ['qa', '/qa'],
  ['deploy', '/deploy'],
  ['support', '/support'],
  ['automations', '/automations'],
  ['settings', '/settings'],
];

export const getDefaultRouteForUser = (user) => {
  const match = DEFAULT_ROUTE_ORDER.find(([module]) => hasModuleAccess(user, module));
  return match?.[1] || '/';
};

export const getUserScope = (user) => {
  if (canAccessAdmin(user)) return 'tenant';
  if (canAccessCommercial(user)) return 'commercial_owner';
  if (canAccessDev(user)) return 'assigned_development';
  if (canAccessQa(user)) return 'assigned_quality';
  if (canAccessDeploy(user)) return 'assigned_deploy';
  return 'self';
};
