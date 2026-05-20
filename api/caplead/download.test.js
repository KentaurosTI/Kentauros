import test from 'node:test';
import assert from 'node:assert/strict';

import handler from './download.ts';

const createResponse = () => {
  const headers = {};

  return {
    headers,
    statusCode: null,
    body: null,
    redirectStatus: null,
    redirectUrl: null,
    setHeader: (key, value) => {
      headers[key] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
    end() {
      return this;
    },
    redirect(code, url) {
      this.redirectStatus = code;
      this.redirectUrl = url;
      return this;
    },
  };
};

test('redirects GET requests to the latest CapLead release URL without cache', async () => {
  const previousUrl = process.env.CAPLEAD_DOWNLOAD_URL;
  process.env.CAPLEAD_DOWNLOAD_URL = 'https://example.com/CapLead-latest.zip';
  const res = createResponse();

  await handler({ method: 'GET' }, res);

  assert.equal(res.redirectStatus, 302);
  assert.equal(res.redirectUrl, 'https://example.com/CapLead-latest.zip');
  assert.equal(res.headers['Cache-Control'], 'no-store, max-age=0');

  if (previousUrl === undefined) delete process.env.CAPLEAD_DOWNLOAD_URL;
  else process.env.CAPLEAD_DOWNLOAD_URL = previousUrl;
});

test('supports HEAD requests for download clients and proxies', async () => {
  const res = createResponse();

  await handler({ method: 'HEAD' }, res);

  assert.equal(res.redirectStatus, 302);
  assert.match(res.redirectUrl, /github\.com\/KentaurosTI\/CapLead\/releases\/latest\/download\/CapLead-latest\.zip/);
  assert.equal(res.headers['Cache-Control'], 'no-store, max-age=0');
});

test('advertises HEAD support in CORS preflight', async () => {
  const res = createResponse();

  await handler({ method: 'OPTIONS' }, res);

  assert.equal(res.statusCode, 204);
  assert.equal(res.headers['Access-Control-Allow-Methods'], 'GET, HEAD, OPTIONS');
});
