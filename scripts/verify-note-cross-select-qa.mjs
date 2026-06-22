/**
 * 노트 편집기 — 교차선택·복사·토글 안 목록 수동 QA (Playwright)
 * Usage: node scripts/verify-note-cross-select-qa.mjs [baseUrl] [documentId]
 */
import nextEnv from '@next/env';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const BASE = (process.argv[2] || 'http://localhost:3000').replace(/\/$/, '');
const DOC_ID = process.argv[3] || '7682b266-a1b3-486f-99f9-4cb0a6a52f0e';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const QA_ID = process.env.ADMIN_NOTE_QA_ID || 'spm.qa.admin@spokedu.test';

async function authContext(browser) {
  const adminEmail = QA_ID;
  const service = createClient(SUPABASE_URL, SUPABASE_SERVICE, { auth: { persistSession: false } });
  const { data, error } = await service.auth.admin.generateLink({
    type: 'magiclink',
    email: adminEmail,
    options: { redirectTo: `${BASE}/admin/note` },
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
    url: BASE,
    sameSite: 'Lax',
  })));
  return context;
}

async function run(name, fn) {
  try {
    await fn();
    console.log(`OK   ${name}`);
    return 0;
  } catch (e) {
    console.error(`FAIL ${name}:`, e instanceof Error ? e.message : e);
    return 1;
  }
}

async function main() {
  const { chromium } = await import('playwright');
  const browser = await chromium.launch({ headless: true });
  let failed = 0;
  const pageErrors = [];

  try {
    const context = await authContext(browser);
    const page = await context.newPage();
    page.on('pageerror', (e) => pageErrors.push(e.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') pageErrors.push(msg.text());
    });

    await page.goto(`${BASE}/admin/note?id=${DOC_ID}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);

    failed += await run('blocks render', async () => {
      const n = await page.locator('[data-note-block-row]').count();
      if (n < 2) throw new Error(`expected >=2 rows, got ${n}`);
    });

    failed += await run('preview text visible (no stuck opacity:0)', async () => {
      const previews = page.locator('[data-note-preview-text]');
      const count = await previews.count();
      let hidden = 0;
      for (let i = 0; i < Math.min(count, 8); i += 1) {
        const el = previews.nth(i);
        const visible = await el.isVisible();
        if (!visible) hidden += 1;
        const opacity = await el.evaluate((node) => {
          const child = node.querySelector(':scope > div, :scope > p');
          if (!child) return 1;
          return Number.parseFloat(getComputedStyle(child).opacity) || 1;
        });
        if (opacity < 0.1) hidden += 1;
      }
      if (hidden > 0) throw new Error(`${hidden} preview(s) invisible or opacity~0`);
    });

    failed += await run('list cross-drag copy (sibling bullets)', async () => {
      const rows = page.locator('[data-note-block-row][data-list-sibling="true"]');
      const n = await rows.count();
      if (n < 2) throw new Error(`need 2+ list siblings, got ${n}`);
      const first = rows.first();
      const last = rows.nth(Math.min(n - 1, 2));
      await first.scrollIntoViewIfNeeded();
      const box1 = await first.boundingBox();
      const box2 = await last.boundingBox();
      if (!box1 || !box2) throw new Error('no bounding box');
      await page.mouse.move(box1.x + 40, box1.y + 8);
      await page.mouse.down();
      await page.mouse.move(box2.x + 40, box2.y + box2.height - 4, { steps: 12 });
      await page.waitForTimeout(400);
      await page.mouse.up();
      await page.waitForTimeout(300);
      await page.keyboard.press('Control+c');
      await page.waitForTimeout(200);
      const clip = await page.evaluate(() => navigator.clipboard.readText().catch(() => ''));
      const lines = clip.split('\n').filter((l) => l.trim().length > 0);
      if (lines.length < 2) {
        throw new Error(`clipboard has ${lines.length} line(s): ${JSON.stringify(clip.slice(0, 120))}`);
      }
    });

    failed += await run('click bullet after drag — text still visible in API', async () => {
      const row = page.locator('[data-note-block-row][data-list-sibling="true"]').first();
      await row.locator('[data-note-list-text]').click({ position: { x: 30, y: 10 }, force: true });
      await page.waitForTimeout(800);
      const apiText = await page.evaluate(async () => {
        const docId = new URL(location.href).searchParams.get('id');
        const res = await fetch(`/api/admin/note/blocks/load?documentId=${docId}&skipReconcile=true`, { credentials: 'include' });
        const json = await res.json();
        const blocks = (json.blocks ?? []).filter((b) => b.type === 'bulletList');
        return blocks.map((b) => (typeof b.content?.text === 'string' ? b.content.text : '')).join('|');
      });
      if (!apiText || apiText.replace(/\|/g, '').trim().length === 0) {
        throw new Error('bullet blocks empty in API after click');
      }
      const invisible = await page.locator('[data-note-preview-text].note-preview-cross-active').count();
      if (invisible > 0) {
        const stuck = await page.locator('[data-note-preview-text].note-preview-cross-active').first().evaluate((node) => {
          const child = node.querySelector(':scope > div, :scope > p');
          return child ? getComputedStyle(child).opacity : '1';
        });
        if (Number.parseFloat(stuck) < 0.1) throw new Error('stuck note-preview-cross-active with hidden content');
      }
    });

    failed += await run('toggle child: type in list without losing prior text', async () => {
      const toggleTitle = page.locator('[data-toggle-title]').first();
      if (!(await toggleTitle.count())) throw new Error('no toggle on page');
      const listInToggle = page.locator('[data-note-block-row][data-list-sibling="true"]').first();
      await listInToggle.scrollIntoViewIfNeeded();
      await listInToggle.locator('[data-note-list-text]').click({ position: { x: 30, y: 10 }, force: true });
      await page.waitForTimeout(600);
      const editor = page.locator('[data-note-list-text] .ProseMirror:visible').first();
      await editor.waitFor({ state: 'visible', timeout: 10000 });
      const before = (await editor.innerText()).trim();
      await editor.click();
      await page.keyboard.type('Q', { delay: 30 });
      await page.waitForTimeout(500);
      const after = (await editor.innerText()).trim();
      if (!after.includes('Q')) throw new Error(`typed Q not in editor: "${after}"`);
      if (before.length > 0 && !after.includes(before.slice(0, Math.min(3, before.length)))) {
        throw new Error(`prior text lost: before="${before}" after="${after}"`);
      }
    });

    if (pageErrors.length) {
      console.error('PAGE ERRORS:', [...new Set(pageErrors)].slice(0, 5).join(' | '));
      failed += 1;
    }
  } finally {
    await browser.close();
  }

  console.log(failed ? `\n${failed} check(s) failed` : '\nAll cross-select checks passed');
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
