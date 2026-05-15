import test from 'node:test';
import assert from 'node:assert/strict';

import {
  filterDeletedLeads,
  markLeadDeleted,
  mergeLeadSources,
  readDeletedLeadIds,
} from './leadDeletionRegistry.js';

const createStorage = () => {
  const values = new Map();
  return {
    getItem: key => values.get(key) || null,
    setItem: (key, value) => values.set(key, value),
  };
};

test('records deleted lead ids per tenant and user', () => {
  const storage = createStorage();

  markLeadDeleted(storage, 'tenant-a', 'user-1', 'lead-1');

  assert.deepEqual([...readDeletedLeadIds(storage, 'tenant-a', 'user-1')], ['lead-1']);
  assert.deepEqual([...readDeletedLeadIds(storage, 'tenant-b', 'user-1')], []);
});

test('filters deleted leads from remote refresh results', () => {
  const deletedIds = new Set(['lead-2']);
  const leads = [
    { id: 'lead-1', company: 'Keep' },
    { id: 'lead-2', company: 'Deleted' },
  ];

  assert.deepEqual(filterDeletedLeads(leads, deletedIds), [{ id: 'lead-1', company: 'Keep' }]);
});

test('keeps deleted remote leads out while preserving pending local leads', () => {
  const deletedIds = new Set(['lead-2']);
  const remoteLeads = [
    { id: 'lead-1', company: 'Remote keep' },
    { id: 'lead-2', company: 'Remote deleted' },
  ];
  const localLeads = [
    { id: 'lead-2', company: 'Local deleted' },
    { id: 'lead-3', company: 'Pending local' },
  ];

  const merged = mergeLeadSources(remoteLeads, localLeads, deletedIds);

  assert.deepEqual(merged.map(lead => lead.id), ['lead-1', 'lead-3']);
});
