import nextEnv from '@next/env';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

/**
 * Admin Note smoke (logged-in browser).
 *
 * Usage:
 *   node scripts/admin-note-smoke-qa.mjs http://localhost:3000
 *
 * Auth (우선순위):
 *   1) SUPABASE_SERVICE_ROLE_KEY + QA admin user → magic link 세션
 *   2) SPM_QA_PASSWORD + ADMIN_NOTE_QA_ID → 로그인 폼
 */
const BASE = (process.argv[2] || 'http://localhost:3000').replace(/\/$/, '');
const QA_ID = process.env.ADMIN_NOTE_QA_ID || process.env.SPM_QA_ADMIN_EMAIL || 'spm.qa.admin@spokedu.test';
const QA_PASSWORD = process.env.ADMIN_NOTE_QA_PASSWORD || process.env.SPM_QA_PASSWORD || '';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RECONCILE_WAIT_MS = 3500;

async function loadPlaywright() {
  try {
    const mod = await import('playwright');
    return mod.chromium;
  } catch {
    console.warn('SKIP: playwright is not installed. Run: npm install -D playwright && npx playwright install chromium');
    process.exit(0);
  }
}

async function resolveAdminEmail() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE) return QA_ID;
  const service = createClient(SUPABASE_URL, SUPABASE_SERVICE, { auth: { persistSession: false } });
  const { data, error } = await service.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) return QA_ID;
  const preferred = [QA_ID, 'spm.qa.admin@spokedu.test', 'choijihoon@spokedu.com'];
  for (const email of preferred) {
    const found = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (found?.email) return found.email;
  }
  return QA_ID;
}

async function createAuthenticatedContext(browser) {
  if (SUPABASE_URL && SUPABASE_ANON && SUPABASE_SERVICE) {
    const adminEmail = await resolveAdminEmail();
    const service = createClient(SUPABASE_URL, SUPABASE_SERVICE, { auth: { persistSession: false } });
    const { data, error } = await service.auth.admin.generateLink({
      type: 'magiclink',
      email: adminEmail,
      options: { redirectTo: `${BASE}/admin/note` },
    });
    if (!error && data?.properties?.action_link) {
      const actionUrl = new URL(data.properties.action_link);
      const tokenHash = actionUrl.searchParams.get('token');
      const verificationType = actionUrl.searchParams.get('type') ?? 'magiclink';
      if (tokenHash) {
        const cookies = [];
        const ssr = createServerClient(SUPABASE_URL, SUPABASE_ANON, {
          cookies: {
            getAll: () => cookies,
            setAll: (nextCookies) => cookies.splice(0, cookies.length, ...nextCookies),
          },
        });
        const { error: verifyError } = await ssr.auth.verifyOtp({
          token_hash: tokenHash,
          type: verificationType,
        });
        if (!verifyError) {
          const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
          await context.addCookies(cookies.map((cookie) => ({
            name: cookie.name,
            value: cookie.value,
            url: BASE,
            httpOnly: cookie.options?.httpOnly,
            secure: cookie.options?.secure,
            sameSite: cookie.options?.sameSite === 'strict'
              ? 'Strict'
              : cookie.options?.sameSite === 'none'
                ? 'None'
                : 'Lax',
          })));
          return context;
        }
      }
    }
  }

  if (!QA_PASSWORD) {
    throw new Error('No auth: set SUPABASE_SERVICE_ROLE_KEY or SPM_QA_PASSWORD.');
  }

  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  await page.goto(`${BASE}/login?type=admin&next=${encodeURIComponent('/admin/note')}`, {
    waitUntil: 'domcontentloaded',
  });
  await page.locator('input[type="text"]').first().fill(QA_ID);
  await page.locator('input[type="password"]').first().fill(QA_PASSWORD);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/\/admin\/note/, { timeout: 90000, waitUntil: 'domcontentloaded' });
  await page.close();
  return context;
}

async function openNotePage(context) {
  const page = await context.newPage();
  await page.goto(`${BASE}/admin/note`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle').catch(() => undefined);
  return page;
}

function documentIdFromPage(page) {
  return new URL(page.url()).searchParams.get('id');
}

async function fetchBlocksInPage(page, documentId) {
  return page.evaluate(async (docId) => {
    const res = await fetch(
      `/api/admin/note/blocks/load?documentId=${encodeURIComponent(docId)}&skipReconcile=true`,
      { credentials: 'include' },
    );
    if (!res.ok) return { blocks: [], status: res.status };
    const json = await res.json();
    return { blocks: json.blocks ?? [], status: res.status };
  }, documentId);
}

async function seedTextBlockIfEmpty(page, explicitDocumentId) {
  const documentId = explicitDocumentId || documentIdFromPage(page);
  if (!documentId) throw new Error('document id missing in URL');
  const loaded = await fetchBlocksInPage(page, documentId);
  if (loaded.blocks.length > 0) return documentId;
  await page.evaluate(async (docId) => {
    const res = await fetch('/api/admin/note/blocks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        documentId: docId,
        type: 'text',
        content: { text: '', html: '' },
        order_index: 0,
        parent_block_id: null,
      }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => null);
      throw new Error(j?.error || `block seed failed (${res.status})`);
    }
  }, documentId);
  await page.goto(`${BASE}/admin/note?id=${encodeURIComponent(documentId)}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  const after = await fetchBlocksInPage(page, documentId);
  if (after.blocks.length < 1) throw new Error('failed to seed text block');
  return documentId;
}

async function clickDocumentBody(page) {
  const body = page.locator('div.cursor-text').filter({ has: page.locator('nav') }).first();
  if (await body.isVisible().catch(() => false)) {
    await body.click({ position: { x: 120, y: 220 }, force: true });
  } else {
    await page.locator('div.cursor-text').first().click({ position: { x: 120, y: 220 }, force: true });
  }
  await page.waitForTimeout(1200);
}

async function ensureDocumentWithBlocks(page) {
  if (!/id=/.test(page.url())) {
    const plusBtn = page.locator('button[title="새 페이지"]').first();
    if (await plusBtn.isVisible().catch(() => false)) {
      await plusBtn.click();
    } else {
      await page.getByRole('button', { name: /새 페이지/i }).first().click();
    }
    await page.waitForURL(/id=/, { timeout: 30000 });
  }
  await page.waitForTimeout(800);
  await seedTextBlockIfEmpty(page, documentIdFromPage(page));
  await page.locator('[data-note-block-row]').first().waitFor({ state: 'visible', timeout: 30000 });
}

async function createFreshNote(page) {
  const plusBtn = page.locator('button[title="새 페이지"]').first();
  await plusBtn.click();
  await page.waitForURL(/id=/, { timeout: 30000 });
  const docId = documentIdFromPage(page);
  await seedTextBlockIfEmpty(page, docId);
  await page.locator('[data-note-block-row]').first().waitFor({ state: 'visible', timeout: 30000 });
  return docId;
}

async function seedSiblingBulletBlocks(page) {
  const documentId = documentIdFromPage(page);
  if (!documentId) throw new Error('document id missing in URL');
  await page.evaluate(async (docId) => {
    const create = async (orderIndex) => {
      const res = await fetch('/api/admin/note/blocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          documentId: docId,
          type: 'bulletList',
          content: { text: '', number: 1 },
          order_index: orderIndex,
          parent_block_id: null,
        }),
      });
      if (!res.ok) throw new Error(`seed bullet failed (${res.status})`);
    };
    await create(0);
    await create(1);
  }, documentId);
  await page.goto(`${BASE}/admin/note?id=${encodeURIComponent(documentId)}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  const count = await page.locator('[data-note-block-row][data-list-sibling="true"]').count();
  if (count < 2) throw new Error(`expected 2 bullet rows, got ${count}`);
}

async function focusBulletBlockAt(page, index) {
  const row = page.locator('[data-note-block-row][data-list-sibling="true"]').nth(index);
  await row.scrollIntoViewIfNeeded();
  const listHost = row.locator('[data-note-list-text]').first();
  await listHost.click({ position: { x: 40, y: 10 } });
  await page.waitForTimeout(500);
  const editor = row.locator('[data-note-list-text] .ProseMirror').first();
  await editor.waitFor({ state: 'visible', timeout: 15000 });
  await editor.click();
  return editor;
}

async function focusBlockAt(page, index) {
  const row = page.locator('[data-note-block-row]').nth(index);
  await row.scrollIntoViewIfNeeded();
  const preview = row.locator('[data-note-preview-text]').first();
  if (await preview.count()) {
    await preview.click();
  } else {
    await row.click({ position: { x: 96, y: 14 } });
  }
  await page.waitForTimeout(500);
  const inRow = row.locator('.ProseMirror').first();
  if (await inRow.count()) {
    await inRow.click();
    return inRow;
  }
  await row.locator('[data-note-editor-host]').first().click();
  const editor = page.locator('.ProseMirror:visible').last();
  await editor.waitFor({ state: 'visible', timeout: 15000 });
  await editor.click();
  return editor;
}

async function focusLastEditor(page) {
  const count = await page.locator('[data-note-block-row]').count();
  if (count < 1) throw new Error('no block rows');
  return focusBlockAt(page, count - 1);
}

async function clickEditorWhitespace(page) {
  await clickDocumentBody(page);
}

function assertNoListMarker(text, label) {
  const trimmed = text.replace(/\u00a0/g, ' ').trim();
  if (trimmed === '-' || trimmed === '*' || trimmed === '1.') {
    throw new Error(`${label}: marker only remained in body: "${trimmed}"`);
  }
  if (/^[-*]\s/.test(trimmed) || /^\d+\.\s/.test(trimmed)) {
    throw new Error(`${label}: body still starts with list marker: "${trimmed}"`);
  }
}

async function assertLatestListBodyClean(page, label) {
  const listEditor = page.locator('[data-note-list-text] .ProseMirror').last();
  await listEditor.waitFor({ state: 'visible', timeout: 10000 });
  const text = await listEditor.innerText();
  assertNoListMarker(text, label);
  const rows = page.locator('[data-note-block-row][data-list-sibling="true"]');
  const count = await rows.count();
  if (count < 1) throw new Error(`${label}: expected bullet/numbered list row`);
}

async function typeListTrigger(page, trigger) {
  await page.keyboard.type(trigger, { delay: 40 });
  await page.keyboard.press('Space');
  await page.waitForTimeout(700);
}

async function blockParentIdFromApi(page, blockIndex, type = 'bulletList') {
  return page.evaluate(async ({ index, blockType }) => {
    const docId = new URL(location.href).searchParams.get('id');
    const res = await fetch(
      `/api/admin/note/blocks/load?documentId=${encodeURIComponent(docId)}&skipReconcile=true`,
      { credentials: 'include' },
    );
    const json = await res.json();
    const blocks = (json.blocks ?? [])
      .filter((b) => b.type === blockType)
      .sort((a, b) => a.order_index - b.order_index);
    return blocks[index]?.parent_block_id ?? null;
  }, { index: blockIndex, blockType: type });
}

async function blockTextFromApi(page, blockIndex, type = 'text', explicitDocumentId) {
  return page.evaluate(async ({ index, blockType, docId }) => {
    const documentId = docId || new URL(location.href).searchParams.get('id');
    const res = await fetch(
      `/api/admin/note/blocks/load?documentId=${encodeURIComponent(documentId)}&skipReconcile=true`,
      { credentials: 'include' },
    );
    const json = await res.json();
    const blocks = (json.blocks ?? [])
      .filter((b) => b.type === blockType)
      .sort((a, b) => a.order_index - b.order_index);
    const content = blocks[index]?.content;
    return typeof content?.text === 'string' ? content.text : '';
  }, { index: blockIndex, blockType: type, docId: explicitDocumentId ?? null });
}

async function openPageMenu(page) {
  await page.getByRole('button', { name: '페이지 메뉴' }).click();
  await page.waitForTimeout(200);
  return page.locator('div.absolute.right-0.top-full').getByRole('button', { name: '하위 페이지', exact: true });
}

async function runCheck(name, fn) {
  try {
    await fn();
    console.log(`OK  ${name}`);
    return true;
  } catch (e) {
    console.error(`FAIL ${name}:`, e instanceof Error ? e.message : e);
    return false;
  }
}

async function main() {
  const chromium = await loadPlaywright();
  const browser = await chromium.launch({ headless: true });

  let failed = 0;
  let context;
  let page;

  try {
    context = await createAuthenticatedContext(browser);
    page = await openNotePage(context);
    const consoleErrors = [];
    page.on('console', (msg) => {
      if (msg.type() !== 'error') return;
      const text = msg.text();
      if (/favicon|extension|devtools/i.test(text)) return;
      consoleErrors.push(text);
    });
    failed += await runCheck('note page loads', async () => {
      await ensureDocumentWithBlocks(page);
      const rowCount = await page.locator('[data-note-block-row]').count();
      if (rowCount < 1) throw new Error('note blocks not found');
    }) ? 0 : 1;

    await ensureDocumentWithBlocks(page);
    await focusLastEditor(page);

    failed += await runCheck('"- " creates bullet without "-" in body', async () => {
      await typeListTrigger(page, '-');
      await assertLatestListBodyClean(page, 'dash');
    }) ? 0 : 1;

    await clickEditorWhitespace(page);
    await focusLastEditor(page);

    failed += await runCheck('"* " creates bullet without "*" in body', async () => {
      await typeListTrigger(page, '*');
      await assertLatestListBodyClean(page, 'star');
    }) ? 0 : 1;

    await clickEditorWhitespace(page);
    await focusLastEditor(page);

    failed += await runCheck('"1." + space creates numbered list without "1." in body', async () => {
      await page.keyboard.type('1.', { delay: 40 });
      await page.keyboard.press('Space');
      await page.waitForTimeout(700);
      await assertLatestListBodyClean(page, 'numbered');
    }) ? 0 : 1;

    failed += await runCheck('typing persists in list item', async () => {
      const listEditor = page.locator('[data-note-list-text] .ProseMirror').last();
      await listEditor.click();
      await page.keyboard.type('스모크텍스트', { delay: 20 });
      await page.waitForTimeout(500);
      const text = await listEditor.innerText();
      if (!text.includes('스모크텍스트')) throw new Error(`expected typed text, got "${text}"`);
      assertNoListMarker(text, 'after typing');
    }) ? 0 : 1;

    // --- structure / doc tests (각각 새 문서) ---
    failed += await runCheck('Tab indent nests bullet under previous sibling', async () => {
      await createFreshNote(page);
      await seedSiblingBulletBlocks(page);
      await focusBulletBlockAt(page, 1);
      const depthBefore = await blockParentIdFromApi(page, 1);
      await page.keyboard.press('Tab');
      await page.waitForTimeout(1200);
      const depthIndented = await blockParentIdFromApi(page, 1);
      if (!depthIndented || depthIndented === depthBefore) {
        throw new Error(`Tab did not reparent bullet (${depthBefore} -> ${depthIndented})`);
      }
    }) ? 0 : 1;

    failed += await runCheck('typing survives reconcile idle window', async () => {
      try {
        await createFreshNote(page);
      } catch {
        await ensureDocumentWithBlocks(page);
      }
      await focusBlockAt(page, 0);
      await page.keyboard.type('리컨실대기', { delay: 10 });
      await clickDocumentBody(page);
      await page.waitForTimeout(800);
      await page.waitForTimeout(RECONCILE_WAIT_MS);
      await page.waitForTimeout(800);
      const text = await blockTextFromApi(page, 0);
      if (!text.includes('리컨실대기')) {
        const rowText = await page.locator('[data-note-block-row]').first().innerText();
        if (!rowText.includes('리컨실대기')) {
          throw new Error(`text lost after idle reconcile wait: api="${text}" row="${rowText}"`);
        }
      }
    }) ? 0 : 1;

    failed += await runCheck('parent <-> child document switch keeps content', async () => {
      await createFreshNote(page);
      await seedTextBlockIfEmpty(page);
      const parentEditor = await focusBlockAt(page, 0);
      await page.keyboard.type('부모본문', { delay: 15 });
      await page.waitForTimeout(400);
      const subPageBtn = await openPageMenu(page);
      await subPageBtn.click();
      await page.waitForTimeout(1500);
      const pageOpenBtn = page.locator('button[title="클릭하여 페이지 열기"]').last();
      await pageOpenBtn.waitFor({ state: 'visible', timeout: 15000 });
      await pageOpenBtn.click();
      await page.waitForTimeout(1200);
      await seedTextBlockIfEmpty(page);
      const childEditor = await focusBlockAt(page, 0);
      await childEditor.click();
      await page.waitForTimeout(300);
      await page.keyboard.type('하위고유문구', { delay: 15 });
      await page.waitForTimeout(1200);
      const parentCrumb = page.locator('nav').filter({ hasText: '관리자 노트' }).locator('button').nth(1);
      await parentCrumb.click();
      await page.waitForTimeout(1200);
      await seedTextBlockIfEmpty(page);
      const parentText = await blockTextFromApi(page, 0);
      if (!parentText.includes('부모본문')) {
        throw new Error(`parent content missing after switch: "${parentText}"`);
      }
      await page.locator('button[title="클릭하여 페이지 열기"]').last().click();
      await page.waitForTimeout(1200);
      await seedTextBlockIfEmpty(page);
      const childText = await blockTextFromApi(page, 0);
      if (!childText.includes('하위고유문구')) {
        throw new Error(`child content missing after return: "${childText}"`);
      }
    }) ? 0 : 1;

    failed += await runCheck('page block opens child document', async () => {
      await createFreshNote(page);
      const parentDocId = documentIdFromPage(page);
      const childDocId = await page.evaluate(async (parentId) => {
        const docRes = await fetch('/api/admin/note/documents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ title: '스모크 하위', parent_id: parentId }),
        });
        if (!docRes.ok) throw new Error('child doc create failed');
        const { document } = await docRes.json();
        const blockRes = await fetch('/api/admin/note/blocks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            documentId: parentId,
            type: 'page',
            content: { page_document_id: document.id, title: document.title },
            order_index: 1,
            parent_block_id: null,
          }),
        });
        if (!blockRes.ok) throw new Error('page block create failed');
        await fetch('/api/admin/note/blocks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            documentId: document.id,
            type: 'text',
            content: { text: '', html: '' },
            order_index: 0,
            parent_block_id: null,
          }),
        });
        return document.id;
      }, parentDocId);
      await page.goto(`${BASE}/admin/note?id=${encodeURIComponent(childDocId)}`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1200);
      await seedTextBlockIfEmpty(page, childDocId);
      await focusBlockAt(page, 0);
      await page.keyboard.type('페이지블록진입', { delay: 15 });
      await clickDocumentBody(page);
      await page.waitForTimeout(800);
      const text = await blockTextFromApi(page, 0, 'text', childDocId);
      if (!text.includes('페이지블록진입')) {
        throw new Error(`could not type in child doc ${childDocId}: "${text}"`);
      }
    }) ? 0 : 1;

    if (consoleErrors.length > 0) {
      console.warn('WARN console errors:', consoleErrors.slice(0, 3).join(' | '));
    }
  } finally {
    await browser.close();
  }

  if (failed > 0) {
    console.error(`\n${failed} check(s) failed.`);
    process.exit(1);
  }
  console.log('\nAll admin note smoke checks passed.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
