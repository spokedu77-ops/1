/**
 * Admin Note QA — 공통 인증·실행 헬퍼
 */
import nextEnv from '@next/env';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
export const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
export const SUPABASE_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
export const QA_ID = process.env.ADMIN_NOTE_QA_ID || 'spm.qa.admin@spokedu.test';

const PLATFORM_ADMIN_EMAILS = [
  'choijihoon@spokedu.com',
  'kimkoomin@spokedu.com',
  'kimyoonki@spokedu.com',
];
const ADMIN_NAMES = ['최지훈', '김윤기', '김구민'];

function isAdminUserRow(row) {
  if (!row) return false;
  const role = typeof row.role === 'string' ? row.role.trim().toLowerCase() : '';
  if (role === 'admin' || role === 'master') return true;
  if (row.is_admin === true) return true;
  const name = typeof row.name === 'string' ? row.name.trim() : '';
  return name.length > 0 && ADMIN_NAMES.includes(name);
}

export async function resolveAdminEmail() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE) return QA_ID;
  const service = createClient(SUPABASE_URL, SUPABASE_SERVICE, { auth: { persistSession: false } });
  const { data, error } = await service.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) throw new Error(`listUsers failed: ${error.message}`);

  const preferred = [
    ...PLATFORM_ADMIN_EMAILS,
    QA_ID,
    'spm.qa.admin@spokedu.test',
  ];
  const seen = new Set();

  for (const email of preferred) {
    const key = email.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    const authUser = data.users.find((u) => u.email?.toLowerCase() === key);
    if (!authUser?.email) continue;

    if (PLATFORM_ADMIN_EMAILS.includes(key)) return authUser.email;

    const { data: userRow } = await service
      .from('users')
      .select('role, is_admin, name')
      .eq('id', authUser.id)
      .maybeSingle();
    if (isAdminUserRow(userRow)) return authUser.email;
  }

  throw new Error(
    'No admin QA user found. Set ADMIN_NOTE_QA_ID to a platform admin email or grant admin role to spm.qa.admin@spokedu.test.',
  );
}

export async function assertAdminBrowserSession(context, baseUrl) {
  const page = await context.newPage();
  try {
    await page.goto(`${baseUrl}/admin/note`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    const json = await page.evaluate(async () => {
      const res = await fetch('/api/auth/check-admin', { credentials: 'include' });
      return res.json();
    });
    if (!json?.admin) {
      throw new Error(`browser session is not admin (${json?.reason ?? 'forbidden'})`);
    }
  } finally {
    await page.close();
  }
}

/** CI·로컬에서 반복 검증하는 고정 QA 문서 */
export const NOTE_QA_DOCUMENTS = [
  {
    id: '7c095438-335b-4318-a3fb-09145f01d24a',
    name: 'common-board',
    minRows: 5,
    minSelectable: 4,
  },
  {
    id: '7682b266-a1b3-486f-99f9-4cb0a6a52f0e',
    name: 'schedule',
    minRows: 2,
    minSelectable: 2,
  },
];

export async function loadPlaywrightChromium() {
  try {
    const mod = await import('playwright');
    return mod.chromium;
  } catch {
    console.warn('SKIP: playwright not installed. Run: npm install -D playwright && npx playwright install chromium');
    process.exit(0);
  }
}

export async function createNoteQaContext(browser, baseUrl) {
  if (!SUPABASE_URL || !SUPABASE_ANON || !SUPABASE_SERVICE) {
    throw new Error('Missing Supabase env for QA auth');
  }
  const adminEmail = await resolveAdminEmail();
  const service = createClient(SUPABASE_URL, SUPABASE_SERVICE, { auth: { persistSession: false } });
  const { data, error } = await service.auth.admin.generateLink({
    type: 'magiclink',
    email: adminEmail,
    options: { redirectTo: `${baseUrl}/admin/note` },
  });
  if (error || !data?.properties?.action_link) throw new Error('auth link failed');

  const actionUrl = new URL(data.properties.action_link);
  const tokenHash = actionUrl.searchParams.get('token_hash')
    ?? actionUrl.searchParams.get('token');
  const verificationType = actionUrl.searchParams.get('type') ?? 'magiclink';
  if (!tokenHash) throw new Error('auth link missing token');
  const cookies = [];
  const ssr = createServerClient(SUPABASE_URL, SUPABASE_ANON, {
    cookies: {
      getAll: () => cookies,
      setAll: (next) => cookies.splice(0, cookies.length, ...next),
    },
  });
  const { error: verifyError } = await ssr.auth.verifyOtp({ token_hash: tokenHash, type: verificationType });
  if (verifyError) throw verifyError;

  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    permissions: ['clipboard-read', 'clipboard-write'],
  });
  await context.addCookies(cookies.map((c) => ({
    name: c.name,
    value: c.value,
    url: baseUrl,
    httpOnly: c.options?.httpOnly,
    secure: c.options?.secure,
    sameSite: c.options?.sameSite === 'strict'
      ? 'Strict'
      : c.options?.sameSite === 'none'
        ? 'None'
        : 'Lax',
  })));
  await assertAdminBrowserSession(context, baseUrl);
  return context;
}

export async function runCheck(name, fn) {
  try {
    await fn();
    console.log(`OK   ${name}`);
    return 0;
  } catch (e) {
    console.error(`FAIL ${name}:`, e instanceof Error ? e.message : e);
    return 1;
  }
}

export function attachPageDiagnostics(page, pageErrors) {
  page.on('pageerror', (e) => pageErrors.push(`pageerror: ${e.message}`));
  page.on('console', (msg) => {
    if (msg.type() === 'error') pageErrors.push(`console: ${msg.text()}`);
  });
}
