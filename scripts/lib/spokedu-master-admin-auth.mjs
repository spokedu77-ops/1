import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';

function requiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required for MASTER QA auth`);
  return value;
}

function parseAllowlist(name) {
  return new Set(requiredEnv(name).split(',').map((value) => value.trim().toLowerCase()).filter(Boolean));
}

export function assertQaAuthAllowed(baseUrl, email) {
  if (process.env.ALLOW_SPOKEDU_MASTER_QA_ADMIN_AUTH !== '1') {
    throw new Error('Refusing MASTER QA admin auth without ALLOW_SPOKEDU_MASTER_QA_ADMIN_AUTH=1');
  }

  const target = new URL(baseUrl);
  const allowedHosts = parseAllowlist('SPOKEDU_MASTER_QA_ADMIN_HOST_ALLOWLIST');
  if (!allowedHosts.has(target.host.toLowerCase())) {
    throw new Error(`MASTER QA admin auth host is not allowlisted: ${target.host}`);
  }

  const allowedEmails = parseAllowlist('SPOKEDU_MASTER_QA_ADMIN_EMAIL_ALLOWLIST');
  if (!allowedEmails.has(email)) {
    throw new Error('MASTER QA admin auth email is not allowlisted');
  }
}

function emitDiagnostic(onDiagnostic, stage, ok, detail = {}) {
  onDiagnostic?.({ stage, ok, ...detail });
}

export async function applyMasterAdminSession(context, baseUrl, email, { onDiagnostic } = {}) {
  const normalizedEmail = email?.trim().toLowerCase();
  if (!normalizedEmail) throw new Error('MASTER QA email is required');
  assertQaAuthAllowed(baseUrl, normalizedEmail);

  const supabaseUrl = requiredEnv('NEXT_PUBLIC_SUPABASE_URL');
  const anonKey = requiredEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  const serviceRole = requiredEnv('SUPABASE_SERVICE_ROLE_KEY');
  const service = createClient(supabaseUrl, serviceRole, { auth: { persistSession: false } });
  const { data: usersData, error: usersError } = await service.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (usersError) {
    emitDiagnostic(onDiagnostic, 'qa-user', false);
    throw new Error(`Could not look up MASTER QA user: ${usersError.message}`);
  }
  const qaUser = usersData.users.find((user) => user.email?.trim().toLowerCase() === normalizedEmail);
  if (!qaUser) {
    emitDiagnostic(onDiagnostic, 'qa-user', false);
    throw new Error('MASTER QA user does not exist');
  }
  if (qaUser.app_metadata?.spokedu_master_qa !== true) {
    emitDiagnostic(onDiagnostic, 'qa-user', false);
    throw new Error('Refusing MASTER QA admin auth for a non-QA account');
  }
  emitDiagnostic(onDiagnostic, 'qa-user', true);

  const { data, error } = await service.auth.admin.generateLink({
    type: 'magiclink',
    email: normalizedEmail,
    options: { redirectTo: `${baseUrl.replace(/\/$/, '')}/` },
  });
  if (error || !data?.properties?.action_link) {
    emitDiagnostic(onDiagnostic, 'otp-link', false);
    throw new Error(`Could not create MASTER QA login link: ${error?.message ?? 'missing action link'}`);
  }
  emitDiagnostic(onDiagnostic, 'otp-link', true);

  const actionUrl = new URL(data.properties.action_link);
  const tokenHash = actionUrl.searchParams.get('token');
  const verificationType = actionUrl.searchParams.get('type') ?? 'magiclink';
  if (!tokenHash) {
    emitDiagnostic(onDiagnostic, 'otp-link', false);
    throw new Error('Could not resolve MASTER QA login token');
  }

  const cookies = [];
  const ssr = createServerClient(supabaseUrl, anonKey, {
    cookies: {
      getAll: () => cookies,
      setAll: (nextCookies) => cookies.splice(0, cookies.length, ...nextCookies),
    },
  });
  const { data: verifyData, error: verifyError } = await ssr.auth.verifyOtp({
    token_hash: tokenHash,
    type: verificationType,
  });
  if (verifyError) {
    emitDiagnostic(onDiagnostic, 'otp-session', false);
    throw new Error(`MASTER QA OTP verification failed: ${verifyError.message}`);
  }
  if (!verifyData?.session || !verifyData?.user) {
    emitDiagnostic(onDiagnostic, 'otp-session', false);
    throw new Error('MASTER QA OTP verification returned no session or user');
  }
  emitDiagnostic(onDiagnostic, 'otp-session', true);

  const projectRef = new URL(supabaseUrl).hostname.split('.')[0];
  const expectedCookiePrefix = `sb-${projectRef}-auth-token`;
  if (cookies.length === 0 || cookies.some((cookie) => !cookie.name.startsWith(expectedCookiePrefix))) {
    emitDiagnostic(onDiagnostic, 'cookie-created', false, { count: cookies.length, projectRefMatches: false });
    throw new Error('MASTER QA SSR cookie does not match the configured Supabase project');
  }
  emitDiagnostic(onDiagnostic, 'cookie-created', true, { count: cookies.length, projectRefMatches: true });

  await context.addCookies(cookies.map((cookie) => ({
    name: cookie.name,
    value: cookie.value,
    url: baseUrl,
    httpOnly: cookie.options?.httpOnly,
    secure: new URL(baseUrl).protocol === 'https:' ? cookie.options?.secure : false,
    sameSite: cookie.options?.sameSite === 'strict'
      ? 'Strict'
      : cookie.options?.sameSite === 'none'
        ? 'None'
        : 'Lax',
  })));

  const appliedCookies = await context.cookies(baseUrl);
  const appliedNames = new Set(appliedCookies.map((cookie) => cookie.name));
  if (cookies.some((cookie) => !appliedNames.has(cookie.name))) {
    emitDiagnostic(onDiagnostic, 'browser-cookie', false, { count: cookies.length, projectRefMatches: true });
    throw new Error('MASTER QA SSR cookie was not applied to the BrowserContext');
  }
  emitDiagnostic(onDiagnostic, 'browser-cookie', true, { count: cookies.length, projectRefMatches: true });

  return { userId: verifyData.user.id, projectRef, cookieCount: cookies.length };
}
