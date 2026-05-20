type HealthInput = {
  nodeEnv?: string;
  env?: Record<string, string | undefined>;
};

const hasValue = (value?: string) => Boolean(String(value || '').trim());

function check(status: 'ok' | 'missing' | 'warning', message: string) {
  return { status, message };
}

function buildHealthReport({ nodeEnv = process.env.NODE_ENV, env = process.env }: HealthInput = {}) {
  const isProduction = nodeEnv === 'production';
  const checks = {
    supabaseUrl: hasValue(env.VITE_SUPABASE_URL || env.SUPABASE_URL)
      ? check('ok', 'Supabase URL configurada.')
      : check(isProduction ? 'missing' : 'warning', 'Supabase URL ausente.'),
    supabaseKey: hasValue(env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY)
      ? check('ok', 'Chave Supabase configurada.')
      : check(isProduction ? 'missing' : 'warning', 'Chave Supabase ausente.'),
    capleadImportApiKey: hasValue(env.CAPLEAD_IMPORT_API_KEY)
      ? check('ok', 'API key CapLead configurada.')
      : check(isProduction ? 'missing' : 'warning', 'CAPLEAD_IMPORT_API_KEY ausente.'),
    capleadAllowedOrigins: hasValue(env.CAPLEAD_IMPORT_ALLOWED_ORIGINS)
      ? check('ok', 'Origens CapLead configuradas.')
      : check(isProduction ? 'missing' : 'warning', 'CAPLEAD_IMPORT_ALLOWED_ORIGINS ausente.'),
  };

  return {
    ok: Object.values(checks).every(item => item.status === 'ok' || item.status === 'warning'),
    environment: nodeEnv || 'development',
    checkedAt: new Date().toISOString(),
    checks,
  };
}

export async function GET() {
  const report = buildHealthReport();
  return Response.json(report, { status: report.ok ? 200 : 503 });
}

export const __testing = {
  buildHealthReport,
};
