import test from 'node:test';
import assert from 'node:assert/strict';
import { findUserByCredentials } from './loginPolicy.js';

const users = [
  {
    email: 'leadhunter@kentauros.consulting',
    role: 'leadhunter',
    accessCode: 'kentauros-leads',
  },
];

test('accepts leadhunter access code with accidental spaces and casing', () => {
  const user = findUserByCredentials(users, {
    email: ' Leadhunter@Kentauros.Consulting ',
    password: ' KENTAUROS-LEADS ',
  });

  assert.equal(user?.role, 'leadhunter');
});

test('rejects invalid leadhunter access code', () => {
  const user = findUserByCredentials(users, {
    email: 'leadhunter@kentauros.consulting',
    password: 'kentauros-admin',
  });

  assert.equal(user, null);
});
