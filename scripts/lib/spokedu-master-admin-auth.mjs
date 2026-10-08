import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';

function requiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required for MASTER QA auth`);
  return value;
}

export async function applyMasterAdminSession(context, baseUrl, email) {
  const normalizedEmail = email?.trim().toLowerCase();
  if (!normalizedEmail) throw new Error('MASTER QA email is required');

  const supabaseUrl = requiredEnv('NEXT_PUBLIC_SUPABASE_URL');
  const anonKey = requiredEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  const serviceRole = requiredEnv('SUPABASE_SERVICE_ROLE_KEY');
  const service = createClient(supabaseUrl, serviceRole, { auth: { persistSession: false } });
  const { data: usersData, error: usersError } = await service.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (usersError) throw new Error(`Could not look up MASTER QA user: ${usersError.message}`);
  if (!usersData.users.some((user) => user.email?.trim().toLowerCase() === normalizedEmail)) {
    throw new Error(`MASTER QA user does not exist: ${normalizedEmail}`);
  }

  const { data, error } = await service.auth.admin.generateLink({
    type: 'magiclink',
    email: normalizedEmail,
    options: { redirectTo: `${baseUrl.replace(/\/$/, '')}/` },
  });
  if (error || !data?.properties?.action_link) {
    throw new Error(`Could not create MASTER QA login link: ${error?.message ?? 'missing action link'}`);
  }

  const actionUrl = new URL(data.properties.action_link);
  const tokenHash = actionUrl.searchParams.get('token');
  const verificationType = actionUrl.searchParams.get('type') ?? 'magiclink';
  if (!tokenHash) throw new Error('Could not resolve MASTER QA login token');

  const cookies = [];
  const ssr = createServerClient(supabaseUrl, anonKey, {
    cookies: {
      getAll: () => cookies,
      setAll: (nextCookies) => cookies.splice(0, cookies.length, ...nextCookies),
    },
  });
  const { error: verifyError } = await ssr.auth.verifyOtp({
    token_hash: tokenHash,
    type: verificationType,
  });
  if (verifyError) throw new Error(`MASTER QA OTP verification failed: ${verifyError.message}`);

  await context.addCookies(cookies.map((cookie) => ({
    name: cookie.name,
    value: cookie.value,
    url: baseUrl,
    httpOnly: cookie.options?.httpOnly,
    secure: cookie.options?.secure,
    sameSite: cookie.options?.sameSite === 'strict'
      ? 'Strict'
      : cookie.options?.sameSite === 'none'
        ? 'None'
        : 'Lax',
  })));
}
