import test from 'node:test';
import assert from 'node:assert/strict';

import { getDefaultRouteForUser, hasModuleAccess } from './accessPolicy.js';
import { PERMISSIONS } from '../data/mock-users.js';

const leadhunter = {
  id: 15,
  role: 'leadhunter',
  tags: ['LEADHUNTER'],
};

test('leadhunter can access discovery through the centralized module policy', () => {
  assert.equal(hasModuleAccess(leadhunter, 'discovery'), true);
});

test('restricted users are routed to their first allowed module instead of dashboard', () => {
  assert.equal(getDefaultRouteForUser(leadhunter), '/leads');
});

test('admin users keep dashboard as their default route', () => {
  assert.equal(getDefaultRouteForUser({ role: 'admin', tags: ['ADMIN'] }), '/');
});

test('admin users can access the MasterMind CEO screen', () => {
  assert.equal(hasModuleAccess({ role: 'admin', tags: ['ADMIN'] }, 'ceo'), true);
});

test('route permission matrix is explicit for every configured role', () => {
  const modules = ['dashboard', 'leads', 'discovery', 'clients', 'prototypes', 'projects', 'qa', 'deploy', 'ceo'];

  for (const role of Object.keys(PERMISSIONS)) {
    const user = { role, tags: [role.toUpperCase()] };
    for (const module of modules) {
      assert.equal(hasModuleAccess(user, module), Boolean(PERMISSIONS[role][module]), `${role}:${module}`);
    }
  }
});
