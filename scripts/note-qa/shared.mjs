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
  const service = createClient(SUPABASE_URL, SUPABASE_SERVICE, { auth: { persistSession: false } });
  const { data, error } = await service.auth.admin.generateLink({
    type: 'magiclink',
    email: QA_ID,
    options: { redirectTo: `${baseUrl}/admin/note` },
  });
  if (error || !data?.properties?.action_link) throw new Error('auth link failed');

  const actionUrl = new URL(data.properties.action_link);
  const tokenHash = actionUrl.searchParams.get('token');
  const verificationType = actionUrl.searchParams.get('type') ?? 'magiclink';
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
    sameSite: 'Lax',
  })));
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
