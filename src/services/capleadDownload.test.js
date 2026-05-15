import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CAPLEAD_DEFAULT_DOWNLOAD_URL,
  getCapLeadDownloadUrl,
  triggerCapLeadDownload,
} from './capleadDownload.js';

test('uses the configured CapLead download URL when available', () => {
  const url = getCapLeadDownloadUrl({
    VITE_CAPLEAD_DOWNLOAD_URL: 'https://example.com/releases/CapLead.zip',
  });

  assert.equal(url, 'https://example.com/releases/CapLead.zip');
});

test('falls back to the stable latest CapLead package path', () => {
  assert.equal(CAPLEAD_DEFAULT_DOWNLOAD_URL, '/downloads/caplead/latest/CapLead-latest.zip');
  assert.equal(getCapLeadDownloadUrl({ DEV: false }), '/api/caplead/download');
});

test('uses the local API download endpoint during development', () => {
  assert.equal(getCapLeadDownloadUrl({ DEV: true }), 'http://localhost:3001/api/caplead/download');
});

test('creates a temporary download link for CapLead', () => {
  const clicks = [];
  const removed = [];
  const appended = [];
  const anchor = {
    click: () => clicks.push('clicked'),
    remove: () => removed.push('removed'),
  };
  const fakeWindow = {
    document: {
      createElement: (tagName) => {
        assert.equal(tagName, 'a');
        return anchor;
      },
      body: {
        appendChild: (node) => appended.push(node),
      },
    },
  };

  const url = triggerCapLeadDownload(fakeWindow, {
    VITE_CAPLEAD_DOWNLOAD_URL: 'https://example.com/CapLead-latest.zip',
  });

  assert.equal(url, 'https://example.com/CapLead-latest.zip');
  assert.equal(anchor.href, 'https://example.com/CapLead-latest.zip');
  assert.equal(anchor.download, 'CapLead-latest.zip');
  assert.equal(anchor.rel, 'noopener');
  assert.equal(anchor.target, '_blank');
  assert.deepEqual(appended, [anchor]);
  assert.deepEqual(clicks, ['clicked']);
  assert.deepEqual(removed, ['removed']);
});
