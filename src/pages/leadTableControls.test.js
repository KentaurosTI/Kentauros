import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getLeadPage,
  getSelectableLeadIds,
  reconcileSelectedLeadIds,
} from './leadTableControls.js';

const makeLeads = (count) => Array.from({ length: count }, (_, index) => ({
  id: `lead-${index + 1}`,
  company: `Lead ${index + 1}`,
}));

test('paginates leads with selectable page sizes', () => {
  const page = getLeadPage(makeLeads(42), 2, 25);

  assert.equal(page.totalItems, 42);
  assert.equal(page.totalPages, 2);
  assert.equal(page.currentPage, 2);
  assert.equal(page.startItem, 26);
  assert.equal(page.endItem, 42);
  assert.deepEqual(page.pageLeads.map(lead => lead.id), Array.from({ length: 17 }, (_, index) => `lead-${index + 26}`));
});

test('falls back to 10 leads when page size is invalid', () => {
  const page = getLeadPage(makeLeads(12), 1, 99);

  assert.equal(page.pageSize, 10);
  assert.equal(page.totalPages, 2);
  assert.deepEqual(page.pageLeads.map(lead => lead.id), Array.from({ length: 10 }, (_, index) => `lead-${index + 1}`));
});

test('clamps requested page to the available range', () => {
  const page = getLeadPage(makeLeads(12), 9, 10);

  assert.equal(page.currentPage, 2);
  assert.equal(page.startItem, 11);
  assert.equal(page.endItem, 12);
});

test('returns the selectable ids for the visible page', () => {
  const ids = getSelectableLeadIds(makeLeads(3));

  assert.deepEqual(ids, ['lead-1', 'lead-2', 'lead-3']);
});

test('removes selected ids that are not present after filtering or deleting', () => {
  const selected = new Set(['lead-1', 'lead-2', 'lead-99']);
  const reconciled = reconcileSelectedLeadIds(selected, makeLeads(2));

  assert.deepEqual([...reconciled], ['lead-1', 'lead-2']);
});
