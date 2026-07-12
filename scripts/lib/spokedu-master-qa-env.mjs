import nextEnv from '@next/env';

const { loadEnvConfig } = nextEnv;

export function loadMasterQaEnv() {
  loadEnvConfig(process.cwd());

  if (process.env.SPM_RUNTIME_ENV !== 'staging') return;

  const mappings = [
    ['NEXT_PUBLIC_SUPABASE_URL', 'STAGING_NEXT_PUBLIC_SUPABASE_URL'],
    ['NEXT_PUBLIC_SUPABASE_ANON_KEY', 'STAGING_NEXT_PUBLIC_SUPABASE_ANON_KEY'],
    ['SUPABASE_SERVICE_ROLE_KEY', 'STAGING_SUPABASE_SERVICE_ROLE_KEY'],
    ['NEXT_PUBLIC_TOSS_CLIENT_KEY', 'STAGING_NEXT_PUBLIC_TOSS_CLIENT_KEY'],
    ['TOSS_SECRET_KEY', 'STAGING_TOSS_SECRET_KEY'],
  ];

  for (const [target, source] of mappings) {
    if (!process.env[target] && process.env[source]) {
      process.env[target] = process.env[source];
    }
  }
}
