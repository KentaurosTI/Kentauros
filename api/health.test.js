import test from 'node:test';
import assert from 'node:assert/strict';

import { __testing } from './health.ts';

test('reports missing required production integration variables', () => {
  const result = __testing.buildHealthReport({
    nodeEnv: 'production',
    env: {
      VITE_SUPABASE_URL: 'https://example.supabase.co',
      CAPLEAD_IMPORT_API_KEY: '',
    },
  });

  assert.equal(result.ok, false);
  assert.equal(result.checks.capleadImportApiKey.status, 'missing');
});

test('reports healthy integration configuration when required variables exist', () => {
  const result = __testing.buildHealthReport({
    nodeEnv: 'production',
    env: {
      VITE_SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'service',
      CAPLEAD_IMPORT_API_KEY: 'secret',
      CAPLEAD_IMPORT_ALLOWED_ORIGINS: 'https://kentauros-os-app.vercel.app',
    },
  });

  assert.equal(result.ok, true);
});
