import test from 'node:test';
import assert from 'node:assert/strict';
import { mockUsers, PERMISSIONS, ROLES } from './mock-users.js';

test('defines leadhunter as a restricted access profile', () => {
  assert.equal(ROLES.leadhunter.label, 'Leadhunter');

  const allowed = Object.entries(PERMISSIONS.leadhunter)
    .filter(([, value]) => value)
    .map(([module]) => module)
    .sort();

  assert.deepEqual(allowed, ['clients', 'discovery', 'leads', 'prototypes']);
  assert.ok(mockUsers.some(user => user.role === 'leadhunter'));
});
