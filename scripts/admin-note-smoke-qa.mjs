import nextEnv from '@next/env';
import {
  NOTE_QA_DOCUMENTS,
  createNoteQaContext,
  loadPlaywrightChromium,
} from './note-qa/shared.mjs';

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
const QA_PASSWORD = process.env.ADMIN_NOTE_QA_PASSWORD || process.env.SPM_QA_PASSWORD || '';
const RECONCILE_WAIT_MS = 3500;
/** CI·로컬 invariant QA와 동일한 고정 문서 */
const FALLBACK_QA_DOC_ID = NOTE_QA_DOCUMENTS[0]?.id ?? '7c095438-335b-4318-a3fb-09145f01d24a';

async function createAuthenticatedContext(browser) {
  try {
    return await createNoteQaContext(browser, BASE);
  } catch (authError) {
    if (!QA_PASSWORD) throw authError;
  }

  const QA_ID = process.env.ADMIN_NOTE_QA_ID || process.env.SPM_QA_ADMIN_EMAIL || 'spm.qa.admin@spokedu.test';
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

function documentIdFromPage(page) {
  return new URL(page.url()).searchParams.get('id');
}

async function openDocument(page, documentId) {
  await page.goto(
    `${BASE}/admin/note?id=${encodeURIComponent(documentId)}`,
    { waitUntil: 'domcontentloaded' },
  );
  await page.waitForLoadState('networkidle').catch(() => undefined);
  await page.getByRole('status', { name: '페이지 불러오는 중' }).waitFor({ state: 'detached', timeout: 30000 }).catch(() => undefined);
  await page.locator('[data-note-block-row]').first().waitFor({ state: 'visible', timeout: 30000 });
  const currentId = documentIdFromPage(page);
  if (currentId !== documentId) {
    throw new Error(`openDocument expected ${documentId}, got ${currentId ?? 'none'}`);
  }
  await page.waitForTimeout(1500);
}

async function resolveLastPageChildDocumentId(page, parentDocumentId) {
  return page.evaluate(async (parentId) => {
    const res = await fetch(
      `/api/admin/note/blocks/load?documentId=${encodeURIComponent(parentId)}&skipReconcile=true`,
      { credentials: 'include' },
    );
    if (!res.ok) throw new Error(`blocks load failed (${res.status})`);
    const json = await res.json();
    const pageBlocks = (json.blocks ?? []).filter((block) => block.type === 'page');
    const last = pageBlocks[pageBlocks.length - 1];
    const childId = last?.content?.page_document_id;
    return typeof childId === 'string' && childId.length > 0 ? childId : null;
  }, parentDocumentId);
}

async function resolveDocumentId(page) {
  const fromUrl = documentIdFromPage(page);
  if (fromUrl) return fromUrl;

  await page.goto(
    `${BASE}/admin/note?id=${encodeURIComponent(FALLBACK_QA_DOC_ID)}`,
    { waitUntil: 'domcontentloaded' },
  );
  await page.waitForTimeout(1500);
  const afterNav = documentIdFromPage(page);
  if (afterNav) return afterNav;

  return page.evaluate(async (fallbackId) => {
    const res = await fetch('/api/admin/note/bootstrap', { credentials: 'include' });
    if (!res.ok) throw new Error(`bootstrap failed (${res.status})`);
    const json = await res.json();
    const docs = json.documents ?? [];
    const existing = docs.find((doc) => doc.id === fallbackId);
    if (existing) return existing.id;
    if (docs.length > 0) return docs[0].id;
    const createRes = await fetch('/api/admin/note/documents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ title: 'Smoke QA' }),
    });
    if (!createRes.ok) throw new Error(`document create failed (${createRes.status})`);
    const { document } = await createRes.json();
    return document.id;
  }, FALLBACK_QA_DOC_ID);
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
  let documentId = await resolveDocumentId(page);
  await openDocument(page, documentId);
  documentId = await resolveDocumentId(page);
  await seedTextBlockIfEmpty(page, documentId);
  await page.locator('[data-note-block-row]').first().waitFor({ state: 'visible', timeout: 30000 });
}

async function createFreshNote(page) {
  const docId = await page.evaluate(async () => {
    const docRes = await fetch('/api/admin/note/documents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ title: `Smoke ${Date.now()}` }),
    });
    if (!docRes.ok) {
      const j = await docRes.json().catch(() => null);
      throw new Error(j?.error || `document create failed (${docRes.status})`);
    }
    const { document } = await docRes.json();
    const blockRes = await fetch('/api/admin/note/blocks', {
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
    if (!blockRes.ok) {
      const j = await blockRes.json().catch(() => null);
      throw new Error(j?.error || `block seed failed (${blockRes.status})`);
    }
    return document.id;
  });
  await openDocument(page, docId);
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
  const editable = page.locator(
    '[data-note-block-row] [data-note-editor-host], [data-note-block-row] [data-note-list-text]',
  );
  const count = await editable.count();
  if (count > 0) {
    const host = editable.last();
    await host.scrollIntoViewIfNeeded();
    await host.click({ position: { x: 40, y: 10 } });
    await page.waitForTimeout(400);
    const editor = host.locator('.ProseMirror').first();
    if (await editor.count()) {
      await editor.click();
      return editor;
    }
  }
  const rowCount = await page.locator('[data-note-block-row]').count();
  if (rowCount < 1) throw new Error('no block rows');
  return focusBlockAt(page, rowCount - 1);
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

async function createEmptyDocument(page) {
  const docId = await page.evaluate(async () => {
    const docRes = await fetch('/api/admin/note/documents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ title: `Smoke ${Date.now()}` }),
    });
    if (!docRes.ok) {
      const j = await docRes.json().catch(() => null);
      throw new Error(j?.error || `document create failed (${docRes.status})`);
    }
    const { document } = await docRes.json();
    return document.id;
  });
  await openDocument(page, docId);
  return docId;
}

async function listSiblingMetaFromDom(page, index) {
  const row = page.locator('[data-note-block-row][data-list-sibling="true"]').nth(index);
  const blockId = await row.getAttribute('data-block-id');
  const parentId = await row.getAttribute('data-parent-block-id');
  return {
    blockId: blockId ?? null,
    parentId: parentId && parentId.length > 0 ? parentId : null,
  };
}

async function blockTextFromDom(page, index = 0) {
  const row = page.locator('[data-note-block-row]').nth(index);
  const preview = row.locator('[data-note-preview-text]');
  if (await preview.count()) {
    return (await preview.innerText()).trim();
  }
  const listEditor = row.locator('[data-note-list-text] .ProseMirror');
  if (await listEditor.count()) {
    return (await listEditor.innerText()).trim();
  }
  const editor = row.locator('.ProseMirror');
  if (await editor.count()) {
    return (await editor.innerText()).trim();
  }
  return (await row.innerText()).trim();
}

async function waitForEditorSurface(page, index = 0) {
  const row = page.locator('[data-note-block-row]').nth(index);
  await row.waitFor({ state: 'visible', timeout: 30000 });
  await page.waitForFunction(
    (idx) => {
      const target = document.querySelectorAll('[data-note-block-row]')[idx];
      if (!target) return false;
      return !!(
        target.querySelector('[data-note-preview-text]')
        || target.querySelector('[data-note-editor-host]')
        || target.querySelector('[data-note-list-text]')
        || target.querySelector('.ProseMirror')
      );
    },
    index,
    { timeout: 30000 },
  );
}

async function typeInFirstBlock(page, text, index = 0) {
  await waitForEditorSurface(page, index);
  await focusBlockAt(page, index);
  await page.waitForTimeout(400);
  const prose = page.locator('[data-note-block-row]').nth(index).locator('.ProseMirror').first();
  if (await prose.count()) {
    await prose.click({ force: true });
    await page.waitForTimeout(200);
    await page.keyboard.insertText(text);
  } else {
    await page.keyboard.insertText(text);
  }
  await clickDocumentBody(page);
  await page.waitForTimeout(900);
}

async function openChildDocumentFromLastPageBlock(page) {
  const parentDocId = documentIdFromPage(page);
  if (!parentDocId) throw new Error('parent document id missing');
  const pageOpenBtn = page.locator('button[title="클릭하여 페이지 열기"]').last();
  await pageOpenBtn.waitFor({ state: 'visible', timeout: 15000 });
  await pageOpenBtn.click();
  await page.waitForURL((url) => {
    const id = url.searchParams.get('id');
    return Boolean(id && id !== parentDocId);
  }, { timeout: 20000 });
  const childDocId = documentIdFromPage(page);
  if (!childDocId) throw new Error('child document id missing after page open');
  await waitForEditorSurface(page, 0);
  return { parentDocId, childDocId };
}

async function waitForBlockText(page, expectedSubstring, index = 0, timeoutMs = 20000) {
  const deadline = Date.now() + timeoutMs;
  let last = '';
  while (Date.now() < deadline) {
    await clickDocumentBody(page);
    await page.waitForTimeout(400);
    last = await blockTextFromDom(page, index);
    if (last.includes(expectedSubstring)) return last;
    await page.waitForTimeout(500);
  }
  const apiText = await blockTextFromApi(page, index);
  if (apiText.includes(expectedSubstring)) return apiText;
  throw new Error(`timeout waiting for "${expectedSubstring}", dom="${last}" api="${apiText}"`);
}

async function blockTextFromPage(page, blockIndex, type = 'text', explicitDocumentId) {
  const domText = await blockTextFromDom(page, blockIndex);
  if (domText.length > 0) return domText;
  return blockTextFromApi(page, blockIndex, type, explicitDocumentId);
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
  const chromium = await loadPlaywrightChromium();
  const browser = await chromium.launch({ headless: true });

  let failed = 0;
  let context;
  let page;

  try {
    context = await createAuthenticatedContext(browser);
    page = await context.newPage();
    await openDocument(page, FALLBACK_QA_DOC_ID);
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

    failed += await runCheck('"- " creates bullet without "-" in body', async () => {
      await createFreshNote(page);
      await focusBlockAt(page, 0);
      await typeListTrigger(page, '-');
      await assertLatestListBodyClean(page, 'dash');
    }) ? 0 : 1;

    failed += await runCheck('"* " creates bullet without "*" in body', async () => {
      await createFreshNote(page);
      await focusBlockAt(page, 0);
      await typeListTrigger(page, '*');
      await assertLatestListBodyClean(page, 'star');
    }) ? 0 : 1;

    failed += await runCheck('"1." + space creates numbered list without "1." in body', async () => {
      await createFreshNote(page);
      await focusBlockAt(page, 0);
      await page.keyboard.type('1.', { delay: 40 });
      await page.keyboard.press('Space');
      await page.waitForTimeout(700);
      await assertLatestListBodyClean(page, 'numbered');
    }) ? 0 : 1;

    failed += await runCheck('typing persists in list item', async () => {
      await createFreshNote(page);
      await focusBlockAt(page, 0);
      await typeListTrigger(page, '-');
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
      await createEmptyDocument(page);
      await seedSiblingBulletBlocks(page);
      const first = await listSiblingMetaFromDom(page, 0);
      await focusBulletBlockAt(page, 1);
      const before = await listSiblingMetaFromDom(page, 1);
      if (!before.blockId) throw new Error('second bullet row missing block id');
      await page.keyboard.press('Tab');
      await page.waitForTimeout(1500);
      const after = await listSiblingMetaFromDom(page, 1);
      if (!first.blockId) throw new Error('first bullet row missing block id');
      if (after.parentId !== first.blockId) {
        throw new Error(
          `Tab did not reparent bullet (${before.parentId ?? 'null'} -> ${after.parentId ?? 'null'}, expected parent ${first.blockId})`,
        );
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
      const parentDocId = await createFreshNote(page);
      await typeInFirstBlock(page, '부모본문', 0);
      await waitForBlockText(page, '부모본문', 0);
      const subPageBtn = await openPageMenu(page);
      await subPageBtn.click();
      await page.waitForTimeout(2000);
      const childDocId = await resolveLastPageChildDocumentId(page, parentDocId);
      if (!childDocId) throw new Error('subpage child document id not found');
      await openDocument(page, childDocId);
      await typeInFirstBlock(page, '하위고유문구', 0);
      await waitForBlockText(page, '하위고유문구', 0);
      await openDocument(page, parentDocId);
      const parentText = await waitForBlockText(page, '부모본문', 0);
      if (!parentText.includes('부모본문')) {
        throw new Error(`parent content missing after switch: "${parentText}"`);
      }
      await openDocument(page, childDocId);
      const childText = await waitForBlockText(page, '하위고유문구', 0);
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
      await openDocument(page, childDocId);
      await waitForEditorSurface(page, 0);
      await typeInFirstBlock(page, '페이지블록진입', 0);
      const text = await waitForBlockText(page, '페이지블록진입', 0);
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
