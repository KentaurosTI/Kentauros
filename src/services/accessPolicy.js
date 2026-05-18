import { PERMISSIONS } from '../data/mock-users';
import {
  canAccessAdmin,
  canAccessCommercial,
  canAccessDeploy,
  canAccessDev,
  canAccessQa,
  canAccessUx,
} from './operationalWorkflow';

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
};

export const hasModuleAccess = (user, module) => {
  if (!user) return false;
  const rolePermissions = PERMISSIONS[user.role];
  if (rolePermissions && Object.prototype.hasOwnProperty.call(rolePermissions, module)) {
    return !!rolePermissions[module];
  }

  if (module === 'dashboard') return true;
  if (module === 'discovery' || module === 'users' || module === 'settings' || module === 'productivity' || module === 'logs' || module === 'audit') {
    return canAccessAdmin(user);
  }
  if (module === 'leads' || module === 'proposals' || module === 'clients') return canAccessCommercial(user);
  if (module === 'kanban' || module === 'projects' || module === 'backlog' || module === 'dev' || module === 'opencode') return canAccessDev(user);
  if (module === 'ux' || module === 'prototypes') return canAccessUx(user);
  if (module === 'qa') return canAccessQa(user);
  if (module === 'deploy' || module === 'automations') return canAccessDeploy(user);

  return rolePermissions ? !!rolePermissions[module] : false;
};

export const getUserScope = (user) => {
  if (canAccessAdmin(user)) return 'tenant';
  if (canAccessCommercial(user)) return 'commercial_owner';
  if (canAccessDev(user)) return 'assigned_development';
  if (canAccessQa(user)) return 'assigned_quality';
  if (canAccessDeploy(user)) return 'assigned_deploy';
  return 'self';
};
