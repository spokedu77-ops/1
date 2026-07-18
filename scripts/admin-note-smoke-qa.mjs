import nextEnv from '@next/env';
import {
  NOTE_QA_DOCUMENTS,
  createNoteQaContext,
  loadPlaywrightChromium,
} from './note-qa/shared.mjs';
import {
  cleanupEphemeralQaDocumentsBestEffort,
  cleanupEphemeralQaDocumentsViaPage,
} from './note-qa/cleanupEphemeralDocs.mjs';

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

async function waitForDocumentBlocksHydrated(page, documentId) {
  await page.waitForFunction(async (expectedId) => {
    const urlId = new URL(location.href).searchParams.get('id');
    if (urlId !== expectedId) return false;
    const res = await fetch(
      `/api/admin/note/blocks/load?documentId=${encodeURIComponent(expectedId)}&skipReconcile=true`,
      { credentials: 'include' },
    );
    if (!res.ok) return false;
    const json = await res.json();
    return Array.isArray(json.blocks);
  }, documentId, { timeout: 30000 });
  await page.getByRole('status', { name: '페이지 불러오는 중' }).waitFor({ state: 'detached', timeout: 30000 }).catch(() => undefined);
  await page.locator('[data-note-block-row]').first().waitFor({ state: 'visible', timeout: 30000 });
  await page.waitForTimeout(800);
}

async function openDocument(page, documentId, { requireBlocks = true } = {}) {
  await page.goto(
    `${BASE}/admin/note?id=${encodeURIComponent(documentId)}`,
    { waitUntil: 'domcontentloaded' },
  );
  await page.waitForLoadState('networkidle').catch(() => undefined);
  await page.getByRole('status', { name: '페이지 불러오는 중' }).waitFor({ state: 'detached', timeout: 30000 }).catch(() => undefined);
  await dismissDevOverlay(page);
  if (requireBlocks) {
    await waitForDocumentBlocksHydrated(page, documentId);
  }
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
  const body = page.locator('[data-note-document-body="true"]').first();
  await body.waitFor({ state: 'visible', timeout: 15000 });
  const box = await body.boundingBox();
  if (box) {
    await page.mouse.click(box.x + Math.min(200, box.width * 0.5), box.y + Math.min(box.height - 24, 420));
  } else {
    await body.click({ force: true });
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
  await page.getByRole('status', { name: '페이지 불러오는 중' }).waitFor({ state: 'detached', timeout: 30000 }).catch(() => undefined);
  await page.waitForTimeout(1500);
  await page.locator('[data-note-block-row]').first().waitFor({ state: 'visible', timeout: 30000 });
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
  // 활성 TipTap이면 preview가 숨겨져 있다 — visible 대기 대신 force/ProseMirror 직접 클릭
  const existingProse = row.locator('.ProseMirror').first();
  if (await existingProse.count()) {
    await existingProse.click({ force: true });
    await page.waitForTimeout(300);
    return existingProse;
  }
  const preview = row.locator('[data-note-preview-text]').first();
  if (await preview.count()) {
    await preview.click({ force: true });
  } else {
    await row.click({ position: { x: 96, y: 14 }, force: true });
  }
  await page.waitForTimeout(500);
  const inRow = row.locator('.ProseMirror').first();
  if (await inRow.count()) {
    await inRow.click({ force: true });
    return inRow;
  }
  await row.locator('[data-note-editor-host]').first().click({ force: true });
  const editor = page.locator('.ProseMirror:visible').last();
  await editor.waitFor({ state: 'visible', timeout: 15000 });
  await editor.click({ force: true });
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
  await openDocument(page, docId, { requireBlocks: false });
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

async function rootBlockFromApi(page, orderIndex = 0) {
  const documentId = documentIdFromPage(page);
  if (!documentId) throw new Error('document id missing in URL');
  const loaded = await fetchBlocksInPage(page, documentId);
  const roots = loaded.blocks
    .filter((block) => !block.parent_block_id)
    .sort((a, b) => a.order_index - b.order_index);
  const block = roots[orderIndex];
  if (!block) throw new Error(`root block missing at index ${orderIndex}`);
  const text = typeof block.content?.text === 'string' ? block.content.text : '';
  return { type: block.type, text, id: block.id };
}

async function rootBlockContentFromApi(page, orderIndex = 0) {
  const documentId = documentIdFromPage(page);
  if (!documentId) throw new Error('document id missing in URL');
  const loaded = await fetchBlocksInPage(page, documentId);
  const roots = loaded.blocks
    .filter((block) => !block.parent_block_id)
    .sort((a, b) => a.order_index - b.order_index);
  const block = roots[orderIndex];
  if (!block) throw new Error(`root block missing at index ${orderIndex}`);
  return {
    id: block.id,
    type: block.type,
    content: block.content ?? {},
  };
}

async function createCalloutDocument(page) {
  const docId = await page.evaluate(async () => {
    const docRes = await fetch('/api/admin/note/documents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ title: `Smoke Callout Paste ${Date.now()}` }),
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
        type: 'callout',
        content: {
          text: 'before',
          html: '<p>before</p>',
          icon: '!',
          blockColor: 'yellow',
        },
        order_index: 0,
        parent_block_id: null,
      }),
    });
    if (!blockRes.ok) {
      const j = await blockRes.json().catch(() => null);
      throw new Error(j?.error || `callout seed failed (${blockRes.status})`);
    }
    return document.id;
  });
  await openDocument(page, docId);
  await waitForEditorSurface(page, 0);
  return docId;
}

async function waitForSlashMenu(page) {
  const menu = page.locator('[data-note-overlay-menu]').first();
  await menu.waitFor({ state: 'visible', timeout: 8000 });
  return menu;
}

function assertNoSlashTrigger(text, label) {
  if (text.includes('/')) {
    throw new Error(`slash trigger leaked in body (${label}): "${text}"`);
  }
}

async function assertFirstRowBlockKind(page, kind) {
  const row = page.locator('[data-note-block-row]').first();
  if (kind === 'todo') {
    const checkbox = row.locator('div.flex.items-start.gap-2 > button[type="button"]').first();
    await checkbox.waitFor({ state: 'visible', timeout: 8000 });
    return;
  }
  if (kind === 'heading') {
    const heading = row.locator('.text-\\[30px\\].font-bold').first();
    await heading.waitFor({ state: 'visible', timeout: 8000 });
    return;
  }
  throw new Error(`unknown block kind assertion: ${kind}`);
}

function todoCheckboxLocator(page, rowIndex) {
  return page.locator('[data-note-block-row]').nth(rowIndex)
    .locator('div.flex.items-start.gap-2 > button[type="button"]');
}

/**
 * 이미 text(위칸)+todo 가 열린 문서에서 Backspace 체인 검증.
 */
async function runTodoBackspaceChainOnOpenDoc(page, label, anchor) {
  const todoBody = `할일본문-${label}`;
  await todoCheckboxLocator(page, 1).first().waitFor({ state: 'visible', timeout: 8000 });
  await waitForBlockText(page, anchor, 0);

  const todoFocused = await focusBlockAt(page, 1);
  await todoFocused.click({ force: true });
  await page.keyboard.type(todoBody, { delay: 35 });
  await page.waitForFunction(
    ({ idx, expected }) => {
      const row = document.querySelectorAll('[data-note-block-row]')[idx];
      return row && (row.innerText || '').includes(expected);
    },
    { idx: 1, expected: todoBody },
    { timeout: 20000 },
  );

  await focusBlockAt(page, 1);
  const todoEditor = page.locator('[data-note-block-row]').nth(1).locator('.ProseMirror').first();
  await todoEditor.click({ clickCount: 3, force: true });
  await page.keyboard.press('Backspace');
  await page.waitForTimeout(500);
  if ((await page.locator('[data-note-block-row]').count()) < 2) {
    throw new Error(`${label}: clearing todo text deleted the row (expected unwrap later)`);
  }
  const afterClear = (await blockEditorTextFromDom(page, 1)).replace(/\s/g, '');
  if (afterClear.includes(todoBody.replace(/\s/g, ''))) {
    throw new Error(`${label}: todo body should be cleared, got "${afterClear}"`);
  }
  if ((await todoCheckboxLocator(page, 1).count()) < 1) {
    throw new Error(`${label}: checkbox should remain after clearing text only`);
  }

  await focusBlockAt(page, 1);
  await page.locator('[data-note-block-row]').nth(1).locator('.ProseMirror').first()
    .click({ force: true });
  for (let attempt = 0; attempt < 3; attempt += 1) {
    if ((await todoCheckboxLocator(page, 1).count()) < 1) break;
    // eslint-disable-next-line no-await-in-loop
    await page.keyboard.press('Backspace');
    // eslint-disable-next-line no-await-in-loop
    await page.waitForTimeout(700);
    if ((await todoCheckboxLocator(page, 1).count()) > 0) {
      // eslint-disable-next-line no-await-in-loop
      await focusBlockAt(page, 1);
    }
  }
  if ((await todoCheckboxLocator(page, 1).count()) > 0) {
    throw new Error(`${label}: empty todo Backspace should unwrap checklist (checkbox still present)`);
  }
  if ((await page.locator('[data-note-block-row]').count()) < 2) {
    throw new Error(`${label}: unwrap should keep empty text block`);
  }
  const afterUnwrap = (await blockEditorTextFromDom(page, 1)).replace(/\s/g, '');
  if (afterUnwrap.length > 0) {
    throw new Error(`${label}: unwrap should leave empty text, got "${afterUnwrap}"`);
  }

  // type 전환 후 TipTap remount — 빈 text에 포커스 재확보 후 삭제
  await focusBlockAt(page, 1);
  await page.locator('[data-note-block-row]').nth(1).locator('.ProseMirror:visible').first()
    .waitFor({ state: 'visible', timeout: 8000 });
  await page.keyboard.press('Backspace');
  await page.waitForTimeout(900);
  if ((await page.locator('[data-note-block-row]').count()) !== 1) {
    const rowCount = await page.locator('[data-note-block-row]').count();
    const kinds = await page.evaluate(() => Array.from(document.querySelectorAll('[data-note-block-row]')).map((row) => {
      const hasTodo = Boolean(row.querySelector('div.flex.items-start.gap-2 > button[type="button"]'));
      const text = (row.querySelector('.ProseMirror')?.textContent || row.textContent || '').trim();
      return { hasTodo, text: text.slice(0, 40) };
    }));
    throw new Error(`${label}: second Backspace should delete empty block (rows=${rowCount}, ${JSON.stringify(kinds)})`);
  }
  const remaining = await waitForBlockText(page, anchor, 0);
  if (!remaining.includes(anchor)) {
    throw new Error(`${label}: previous anchor missing after delete: "${remaining}"`);
  }
  if ((await page.locator('[data-note-block-row]').first().locator('.ProseMirror:visible').count()) < 1) {
    throw new Error(`${label}: focus should land on previous block after empty-block delete`);
  }
}

/**
 * Notion식 체크리스트 Backspace 체인 (부모·하위 공통):
 * 텍스트 지우기 → 체크 해제(text) → 빈 블록 삭제 → 위 칸 포커스
 */
async function assertTodoBackspaceChain(page, label) {
  const anchor = `위칸앵커-${label}`;

  // 문서+text+todo를 API로 먼저 심고 연다 (열린 탭에서 HTTP create는 로컬 캐시에 안 잡혀 UI 1행이 됨)
  const documentId = await page.evaluate(async ({ anchorText }) => {
    const docRes = await fetch('/api/admin/note/documents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ title: `Smoke TodoChain ${Date.now()}` }),
    });
    if (!docRes.ok) throw new Error(`document create failed (${docRes.status})`);
    const { document } = await docRes.json();
    const create = async (type, content, orderIndex) => {
      const res = await fetch('/api/admin/note/blocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          documentId: document.id,
          type,
          content,
          order_index: orderIndex,
          parent_block_id: null,
        }),
      });
      if (!res.ok) throw new Error(`seed ${type} failed (${res.status})`);
    };
    await create('text', { text: anchorText, html: `<p>${anchorText}</p>` }, 0);
    await create('todo', { text: '', checked: false, html: '<p></p>' }, 1);
    return document.id;
  }, { anchorText: anchor });

  await openDocument(page, documentId);
  // 풀 스모크에서 이전 케이스 TipTap/엔진 잔여를 끊기 위해 한 번 리로드
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.getByRole('status', { name: '페이지 불러오는 중' }).waitFor({ state: 'detached', timeout: 30000 }).catch(() => undefined);
  await dismissDevOverlay(page);
  try {
    await page.waitForFunction(() => document.querySelectorAll('[data-note-block-row]').length >= 2, null, {
      timeout: 20000,
    });
  } catch {
    const rowCount = await page.locator('[data-note-block-row]').count();
    const apiCount = await page.evaluate(async (docId) => {
      const res = await fetch(
        `/api/admin/note/blocks/load?documentId=${encodeURIComponent(docId)}&skipReconcile=true`,
        { credentials: 'include' },
      );
      const json = await res.json();
      return (json.blocks ?? []).length;
    }, documentId);
    throw new Error(`${label}: expected 2 seeded rows, dom=${rowCount} api=${apiCount} doc=${documentId}`);
  }
  await waitForEditorSurface(page, 0);
  await waitForEditorSurface(page, 1);
  await todoCheckboxLocator(page, 1).first().waitFor({ state: 'visible', timeout: 15000 });
  await runTodoBackspaceChainOnOpenDoc(page, label, anchor);
}

/**
 * 접힌 토글+자식 forest를 다른 문서로 이동(사이드바 doc: 드롭과 동일 patch 계약).
 * DnD는 CI에서 불안정하므로 transaction API로 forest patch를 적용한 뒤 UI hydrate를 본다.
 */
async function assertToggleForestTransfer(page) {
  const stamp = Date.now();
  const toggleTitle = `토글숲-${stamp}`;
  const childText = `토글자식-${stamp}`;
  const seeded = await page.evaluate(async ({ toggleTitleText, childBody, stamp: docStamp }) => {
    const createDoc = async (title) => {
      const res = await fetch('/api/admin/note/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ title }),
      });
      if (!res.ok) throw new Error(`document create failed (${res.status})`);
      const json = await res.json();
      return json.document;
    };
    const createBlock = async (documentId, type, content, orderIndex, parentBlockId = null) => {
      const res = await fetch('/api/admin/note/blocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          documentId,
          type,
          content,
          order_index: orderIndex,
          parent_block_id: parentBlockId,
        }),
      });
      if (!res.ok) throw new Error(`seed ${type} failed (${res.status})`);
      const json = await res.json();
      return json.block ?? json;
    };

    const source = await createDoc(`Smoke ToggleForest ${docStamp}`);
    const target = await createDoc(`Smoke ToggleForest Target ${docStamp}`);
    const toggle = await createBlock(
      source.id,
      'toggle',
      { title: toggleTitleText, collapsed: true },
      0,
      null,
    );
    const child = await createBlock(
      source.id,
      'text',
      { text: childBody, html: `<p>${childBody}</p>` },
      0,
      toggle.id,
    );
    await createBlock(target.id, 'text', { text: '타깃앵커', html: '<p>타깃앵커</p>' }, 0, null);
    return {
      sourceId: source.id,
      targetId: target.id,
      toggleId: toggle.id,
      childId: child.id,
    };
  }, { toggleTitleText: toggleTitle, childBody: childText, stamp });

  await openDocument(page, seeded.sourceId);
  await page.locator(`[data-block-id="${seeded.toggleId}"]`).waitFor({ state: 'visible', timeout: 20000 });

  await page.evaluate(async ({ sourceId, targetId, toggleId, childId }) => {
    const load = async (documentId) => {
      const res = await fetch(
        `/api/admin/note/blocks/load?documentId=${encodeURIComponent(documentId)}&skipReconcile=true`,
        { credentials: 'include' },
      );
      if (!res.ok) throw new Error(`load failed (${res.status})`);
      const json = await res.json();
      return json.blocks ?? [];
    };
    const sourceBlocks = await load(sourceId);
    const byId = new Map(sourceBlocks.map((block) => [block.id, block]));
    if (!byId.has(toggleId) || !byId.has(childId)) {
      throw new Error('toggle forest missing before transfer');
    }
    const forestIds = [];
    const walk = (id) => {
      forestIds.push(id);
      for (const block of sourceBlocks) {
        if (block.parent_block_id === id) walk(block.id);
      }
    };
    walk(toggleId);
    const updates = forestIds.map((id) => ({
      id,
      document_id: targetId,
      ...(id === toggleId ? { parent_block_id: null } : {}),
    }));
    const tx = await fetch('/api/admin/note/blocks/transaction', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ updates }),
    });
    if (!tx.ok) {
      const err = await tx.text();
      throw new Error(`toggle forest transfer failed (${tx.status}): ${err}`);
    }
  }, seeded);

  const sourceAfter = await page.evaluate(async (sourceId) => {
    const res = await fetch(
      `/api/admin/note/blocks/load?documentId=${encodeURIComponent(sourceId)}&skipReconcile=true`,
      { credentials: 'include' },
    );
    const json = await res.json();
    return (json.blocks ?? []).map((block) => ({ id: block.id, type: block.type }));
  }, seeded.sourceId);
  if (sourceAfter.some((block) => block.id === seeded.toggleId || block.id === seeded.childId)) {
    throw new Error(`toggle forest still on source after transfer: ${JSON.stringify(sourceAfter)}`);
  }

  await openDocument(page, seeded.targetId);
  await page.locator(`[data-block-id="${seeded.toggleId}"]`).waitFor({ state: 'visible', timeout: 20000 });
  const targetAfter = await page.evaluate(async ({ targetId, toggleId, childId }) => {
    const res = await fetch(
      `/api/admin/note/blocks/load?documentId=${encodeURIComponent(targetId)}&skipReconcile=true`,
      { credentials: 'include' },
    );
    const json = await res.json();
    const blocks = json.blocks ?? [];
    const toggle = blocks.find((block) => block.id === toggleId);
    const child = blocks.find((block) => block.id === childId);
    return {
      toggleType: toggle?.type ?? null,
      toggleDoc: toggle?.document_id ?? null,
      childParent: child?.parent_block_id ?? null,
      childDoc: child?.document_id ?? null,
      childText: child?.content?.text ?? '',
    };
  }, seeded);
  if (targetAfter.toggleType !== 'toggle' || targetAfter.toggleDoc !== seeded.targetId) {
    throw new Error(`toggle missing on target: ${JSON.stringify(targetAfter)}`);
  }
  if (
    targetAfter.childParent !== seeded.toggleId
    || targetAfter.childDoc !== seeded.targetId
    || !String(targetAfter.childText).includes(childText)
  ) {
    throw new Error(`toggle child orphaned or missing on target: ${JSON.stringify(targetAfter)}`);
  }
}

/**
 * identityLeave 틀 검증: 빈 블록 Backspace 삭제 → outbound ack → reload 후에도 활성 집합에 없음.
 * (HTTP DELETE 회귀와 별개 — UI→soft_delete→op-log 축)
 */
async function assertIdentityLeaveSurvivesReload(page) {
  const stamp = Date.now();
  const seeded = await page.evaluate(async (docStamp) => {
    const docRes = await fetch('/api/admin/note/documents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ title: `Smoke LeaveAck ${docStamp}` }),
    });
    if (!docRes.ok) throw new Error(`document create failed (${docRes.status})`);
    const { document } = await docRes.json();
    const create = async (content, orderIndex) => {
      const res = await fetch('/api/admin/note/blocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          documentId: document.id,
          type: 'text',
          content,
          order_index: orderIndex,
          parent_block_id: null,
        }),
      });
      if (!res.ok) throw new Error(`seed text failed (${res.status})`);
      const json = await res.json();
      return json.block;
    };
    const keep = await create({ text: `유지-${docStamp}`, html: `<p>유지-${docStamp}</p>` }, 0);
    const gone = await create({ text: '', html: '<p></p>' }, 1);
    return { docId: document.id, keepId: keep.id, goneId: gone.id };
  }, stamp);

  await openDocument(page, seeded.docId);
  await page.locator(`[data-block-id="${seeded.goneId}"]`).waitFor({ state: 'visible', timeout: 20000 });
  // 빈 블록은 preview만 있고 contenteditable이 없을 수 있음 — focusBlockAt과 동일하게 활성화 후 Backspace
  const goneRow = page.locator(`[data-block-id="${seeded.goneId}"]`);
  const preview = goneRow.locator('[data-note-preview-text]').first();
  if (await preview.count()) {
    await preview.click({ force: true });
  } else {
    await goneRow.click({ position: { x: 96, y: 14 }, force: true });
  }
  await page.waitForTimeout(500);
  const editor = goneRow.locator('.ProseMirror, [contenteditable="true"]').first();
  await editor.waitFor({ state: 'visible', timeout: 15000 });
  await editor.click({ force: true });
  await page.keyboard.press('Backspace');
  await page.waitForFunction(
    (goneId) => !document.querySelector(`[data-block-id="${goneId}"]`),
    seeded.goneId,
    { timeout: 15000 },
  );
  // soft_delete가 서버에 반영될 때까지 폴링 (async waitForFunction 즉시 truthy 방지)
  {
    const deadline = Date.now() + 20000;
    let last = { keep: false, gone: true };
    while (Date.now() < deadline) {
      // eslint-disable-next-line no-await-in-loop
      last = await page.evaluate(async ({ docId, keepId, goneId }) => {
        const res = await fetch(
          `/api/admin/note/blocks/load?documentId=${encodeURIComponent(docId)}&skipReconcile=true`,
          { credentials: 'include' },
        );
        if (!res.ok) return { keep: false, gone: true };
        const json = await res.json();
        const ids = (json.blocks ?? []).map((block) => block.id);
        return { keep: ids.includes(keepId), gone: ids.includes(goneId) };
      }, seeded);
      if (last.keep && !last.gone) break;
      // eslint-disable-next-line no-await-in-loop
      await page.waitForTimeout(400);
    }
    if (!last.keep || last.gone) {
      throw new Error(`identityLeave not ack'd on server before reload: ${JSON.stringify(last)}`);
    }
  }
  await page.waitForTimeout(800);

  await openDocument(page, seeded.docId);
  const after = await page.evaluate(async ({ docId, keepId, goneId }) => {
    const res = await fetch(
      `/api/admin/note/blocks/load?documentId=${encodeURIComponent(docId)}&skipReconcile=true`,
      { credentials: 'include' },
    );
    if (!res.ok) throw new Error(`load failed (${res.status})`);
    const json = await res.json();
    const ids = (json.blocks ?? []).map((block) => block.id);
    return {
      ids,
      keepPresent: ids.includes(keepId),
      gonePresent: ids.includes(goneId),
    };
  }, seeded);
  if (!after.keepPresent) {
    throw new Error(`keep block missing after leave reload: ${JSON.stringify(after)}`);
  }
  if (after.gonePresent) {
    throw new Error(`identityLeave resurrected after reload: ${JSON.stringify(after)}`);
  }
  const goneDom = await page.locator(`[data-block-id="${seeded.goneId}"]`).count();
  if (goneDom > 0) {
    throw new Error(`identityLeave still in DOM after reload (count=${goneDom})`);
  }
}

async function slashTurnInto(page, query, expectedType, menuLabel, domKind) {
  await createFreshNote(page);
  const editor = await focusBlockAt(page, 0);
  await editor.click();
  await page.keyboard.type('/', { delay: 35 });
  await waitForSlashMenu(page);
  if (query.length > 0) {
    await page.keyboard.type(query, { delay: 35 });
    await page.waitForTimeout(500);
  }
  const item = page.locator('[data-note-overlay-menu] button').filter({ hasText: menuLabel });
  await item.first().waitFor({ state: 'visible', timeout: 8000 });
  await item.first().click();
  await page.waitForTimeout(1200);
  await assertFirstRowBlockKind(page, domKind);
  const domText = await blockEditorTextFromDom(page, 0);
  assertNoSlashTrigger(domText, `type=${expectedType}`);
  return { type: expectedType, text: domText };
}

async function blockEditorTextFromDom(page, index = 0) {
  const row = page.locator('[data-note-block-row]').nth(index);
  const editor = row.locator(
    '[data-note-editor-host] .ProseMirror:visible, [data-note-list-text] .ProseMirror:visible',
  ).first();
  if (await editor.count()) {
    return (await editor.innerText()).trim();
  }
  return blockTextFromDom(page, index);
}

async function blockTextFromDom(page, index = 0) {
  const row = page.locator('[data-note-block-row]').nth(index);
  const rowCount = await page.locator('[data-note-block-row]').count();
  if (index >= rowCount) {
    throw new Error(`blockTextFromDom: no row at index ${index} (count=${rowCount})`);
  }
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

async function blurActiveEditor(page) {
  const titleInput = page.locator('input[type="text"]').first();
  if (await titleInput.isVisible().catch(() => false)) {
    await titleInput.click();
  } else {
    await page.keyboard.press('Tab');
  }
  await page.waitForTimeout(2200);
}

async function waitForApiBlockText(page, expectedSubstring, index = 0, documentId) {
  await page.waitForFunction(async ({ text, blockIndex, docId }) => {
    const activeDocId = docId || new URL(location.href).searchParams.get('id');
    if (!activeDocId) return false;
    const res = await fetch(
      `/api/admin/note/blocks/load?documentId=${encodeURIComponent(activeDocId)}&skipReconcile=true`,
      { credentials: 'include' },
    );
    if (!res.ok) return false;
    const json = await res.json();
    const blocks = (json.blocks ?? [])
      .filter((b) => b.type === 'text')
      .sort((a, b) => a.order_index - b.order_index);
    const value = blocks[blockIndex]?.content?.text;
    return typeof value === 'string' && value.includes(text);
  }, { text: expectedSubstring, blockIndex: index, docId: documentId ?? null }, { timeout: 30000 });
}

async function typeInFirstBlock(page, text, index = 0) {
  await waitForEditorSurface(page, index);
  await focusBlockAt(page, index);
  await page.waitForTimeout(400);
  const prose = page.locator('[data-note-block-row]').nth(index).locator('.ProseMirror').first();
  if (await prose.count()) {
    await prose.click({ force: true });
    await page.waitForTimeout(200);
    await page.keyboard.type(text, { delay: 10 });
  } else {
    await page.keyboard.type(text, { delay: 10 });
  }
  await blurActiveEditor(page);
}

async function openChildDocumentFromLastPageBlock(page) {
  const parentDocId = documentIdFromPage(page);
  if (!parentDocId) throw new Error('parent document id missing');
  const pageOpenBtn = page.locator('[data-note-open-page-block]').last();
  await pageOpenBtn.waitFor({ state: 'visible', timeout: 30000 });
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

async function createSubPageViaTreeAction(page, parentDocId) {
  const childDocId = await page.evaluate(async (parentDocumentId) => {
    const res = await fetch('/api/admin/note/documents/tree', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        action: 'createSubPage',
        parentDocumentId,
        title: 'Untitled',
      }),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => null);
      throw new Error(json?.error || `createSubPage failed (${res.status})`);
    }
    const json = await res.json();
    return json.document?.id;
  }, parentDocId);
  if (!childDocId) throw new Error('createSubPage response missing child document id');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await waitForDocumentBlocksHydrated(page, parentDocId);
  await page.locator('[data-note-open-page-block]').last().waitFor({ state: 'visible', timeout: 30000 });
  return childDocId;
}

async function waitForBlockText(page, expectedSubstring, index = 0, timeoutMs = 20000) {
  await blurActiveEditor(page);
  const deadline = Date.now() + timeoutMs;
  let last = '';
  while (Date.now() < deadline) {
    last = await blockTextFromDom(page, index).catch(() => '');
    if (last.includes(expectedSubstring)) return last;
    await page.waitForTimeout(500);
  }
  const apiText = await blockTextFromApi(page, index);
  if (apiText.includes(expectedSubstring)) return apiText;
  throw new Error(`timeout waiting for "${expectedSubstring}", dom="${last}" api="${apiText}"`);
}

async function waitForBlockTextNotContaining(page, unexpectedSubstring, index = 0, timeoutMs = 20000) {
  await blurActiveEditor(page);
  const deadline = Date.now() + timeoutMs;
  let last = '';
  while (Date.now() < deadline) {
    last = await blockTextFromDom(page, index).catch(() => '');
    if (!last.includes(unexpectedSubstring)) {
      const apiText = await blockTextFromApi(page, index).catch(() => '');
      if (!apiText.includes(unexpectedSubstring)) return { domText: last, apiText };
    }
    await page.waitForTimeout(500);
  }
  const apiText = await blockTextFromApi(page, index);
  throw new Error(`text still contains "${unexpectedSubstring}", dom="${last}" api="${apiText}"`);
}

async function waitForDocumentTextNotContaining(page, unexpectedSubstring, timeoutMs = 20000) {
  const documentId = documentIdFromPage(page);
  if (!documentId) throw new Error('document id missing in URL');
  const deadline = Date.now() + timeoutMs;
  let lastTexts = [];
  while (Date.now() < deadline) {
    const loaded = await fetchBlocksInPage(page, documentId);
    lastTexts = (loaded.blocks ?? [])
      .filter((block) => !block.deleted_at)
      .map((block) => block.content?.text)
      .filter((text) => typeof text === 'string');
    if (!lastTexts.includes(unexpectedSubstring)) return lastTexts;
    await page.waitForTimeout(500);
  }
  throw new Error(`document still contains "${unexpectedSubstring}": ${JSON.stringify(lastTexts)}`);
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
  await page.locator('[data-note-page-menu-button]').click();
  await page.waitForTimeout(200);
  return page.locator('[data-note-create-subpage]');
}

async function dismissDevOverlay(page) {
  await page.evaluate(() => {
    document.querySelectorAll('nextjs-portal').forEach((node) => node.remove());
    document.querySelectorAll('[data-nextjs-dialog-overlay]').forEach((node) => node.remove());
  }).catch(() => undefined);
}

/** runCheck에서 overlay 제거용 — main이 설정 */
let activeSmokePage = null;

async function runCheck(name, fn) {
  const only = process.argv.find((arg) => arg.startsWith('--only='))?.slice('--only='.length);
  if (only && !name.includes(only)) {
    console.log(`SKIP ${name}`);
    return true;
  }
  try {
    if (activeSmokePage) await dismissDevOverlay(activeSmokePage);
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
    activeSmokePage = page;
    await openDocument(page, FALLBACK_QA_DOC_ID);
    try {
      const preClean = await cleanupEphemeralQaDocumentsViaPage(page);
      if (preClean.deleted > 0) {
        console.log(`Pre-clean ${preClean.deleted} leftover ephemeral QA document(s).`);
      }
    } catch (preCleanError) {
      console.warn(
        'WARN pre-clean ephemeral docs:',
        preCleanError instanceof Error ? preCleanError.message : preCleanError,
      );
    }
    const consoleErrors = [];
    const httpErrors = [];
    page.on('console', (msg) => {
      if (msg.type() !== 'error') return;
      const text = msg.text();
      if (/favicon|extension|devtools/i.test(text)) return;
      consoleErrors.push(text);
    });
    page.on('response', async (response) => {
      if (response.status() < 500) return;
      const url = response.url();
      if (!url.startsWith(BASE)) return;
      let body = '';
      try {
        body = (await response.text()).slice(0, 300);
      } catch {
        body = '';
      }
      httpErrors.push({
        method: response.request().method(),
        status: response.status(),
        url,
        body,
      });
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
    failed += await runCheck('Ctrl+Z restores typed block text', async () => {
      await createFreshNote(page);
      await waitForEditorSurface(page, 0);
      const editor = await focusBlockAt(page, 0);
      const text = `undo-${Date.now()}`;
      await editor.click({ force: true });
      await page.keyboard.type(text, { delay: 10 });
      await page.waitForTimeout(800);
      const typed = await blockTextFromDom(page, 0);
      if (!typed.includes(text)) throw new Error(`typing did not appear before undo: "${typed}"`);
      await page.keyboard.press('Control+Z');
      await page.waitForTimeout(800);
      await waitForBlockTextNotContaining(page, text, 0);
    }) ? 0 : 1;

    failed += await runCheck('paste into callout preserves callout metadata', async () => {
      await createCalloutDocument(page);
      const editor = await focusBlockAt(page, 0);
      await editor.click({ force: true });
      await page.evaluate(() => {
        const target = document.querySelector('[data-note-block-row] .ProseMirror');
        if (!target) throw new Error('callout editor not found');
        const data = new DataTransfer();
        data.setData('text/plain', 'pasted callout text');
        const event = new ClipboardEvent('paste', {
          bubbles: true,
          cancelable: true,
          clipboardData: data,
        });
        target.dispatchEvent(event);
      });
      await page.waitForTimeout(1200);
      await blurActiveEditor(page);
      await page.waitForTimeout(1200);
      const block = await rootBlockContentFromApi(page, 0);
      if (block.type !== 'callout') throw new Error(`expected callout, got ${block.type}`);
      if (block.content.icon !== '!') throw new Error(`callout icon lost: ${JSON.stringify(block.content)}`);
      if (block.content.blockColor !== 'yellow') throw new Error(`callout color lost: ${JSON.stringify(block.content)}`);
      const text = typeof block.content.text === 'string' ? block.content.text : '';
      if (!text.includes('pasted callout text')) throw new Error(`pasted text missing: ${JSON.stringify(block.content)}`);
    }) ? 0 : 1;

    failed += await runCheck('multiline paste undo restores one transaction', async () => {
      await createFreshNote(page);
      const editor = await focusBlockAt(page, 0);
      await editor.click({ force: true });
      await page.evaluate(() => {
        const target = document.querySelector('[data-note-block-row] .ProseMirror');
        if (!target) throw new Error('editor not found');
        const data = new DataTransfer();
        data.setData('text/plain', 'paste line one\npaste line two');
        const event = new ClipboardEvent('paste', {
          bubbles: true,
          cancelable: true,
          clipboardData: data,
        });
        target.dispatchEvent(event);
      });
      await page.waitForTimeout(1600);
      await waitForBlockText(page, 'paste line one', 0, 15000);
      let loaded = await fetchBlocksInPage(page, documentIdFromPage(page));
      const activeTexts = (loaded.blocks ?? [])
        .filter((block) => !block.deleted_at)
        .map((block) => block.content?.text)
        .filter((text) => typeof text === 'string');
      if (!activeTexts.includes('paste line one') || !activeTexts.includes('paste line two')) {
        throw new Error(`multiline paste did not create expected texts: ${JSON.stringify(activeTexts)}`);
      }
      await focusBlockAt(page, 0);
      await page.keyboard.press('Control+Z');
      const afterUndoTexts = await waitForDocumentTextNotContaining(page, 'paste line two', 20000);
      if (afterUndoTexts.includes('paste line two')) {
        throw new Error(`Ctrl+Z did not remove pasted second block: ${JSON.stringify(afterUndoTexts)}`);
      }
      if (afterUndoTexts.includes('paste line one')) {
        throw new Error(`Ctrl+Z did not restore anchor block body: ${JSON.stringify(afterUndoTexts)}`);
      }
    }) ? 0 : 1;

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

    failed += await runCheck('Shift+Tab outdents nested bullet back to root', async () => {
      await createEmptyDocument(page);
      await seedSiblingBulletBlocks(page);
      const first = await listSiblingMetaFromDom(page, 0);
      await focusBulletBlockAt(page, 1);
      await page.keyboard.press('Tab');
      await page.waitForTimeout(1500);
      const nested = await listSiblingMetaFromDom(page, 1);
      if (nested.parentId !== first.blockId) {
        throw new Error(`Tab indent failed before outdent (parent=${nested.parentId ?? 'null'})`);
      }
      await focusBulletBlockAt(page, 1);
      await page.keyboard.press('Shift+Tab');
      await page.waitForTimeout(1500);
      const outdented = await listSiblingMetaFromDom(page, 1);
      if (outdented.parentId !== null) {
        throw new Error(`Shift+Tab did not outdent (parent=${outdented.parentId ?? 'null'})`);
      }
    }) ? 0 : 1;

    failed += await runCheck('slash /체크 turns block into todo without slash in body', async () => {
      await slashTurnInto(page, '체크', 'todo', '체크리스트', 'todo');
    }) ? 0 : 1;

    failed += await runCheck('parent todo backspace chain: clear → unwrap → delete → focus previous', async () => {
      await assertTodoBackspaceChain(page, 'parent');
    }) ? 0 : 1;

    failed += await runCheck('slash /제목 turns block into heading without slash in body', async () => {
      await slashTurnInto(page, '제목', 'heading', '제목 1', 'heading');
    }) ? 0 : 1;

    failed += await runCheck('slash Escape dismisses menu and clears trigger', async () => {
      await createFreshNote(page);
      const editor = await focusBlockAt(page, 0);
      await editor.click();
      await page.keyboard.type('/', { delay: 35 });
      await waitForSlashMenu(page);
      await page.keyboard.type('체크', { delay: 35 });
      await page.keyboard.press('Escape');
      await page.waitForTimeout(1500);
      const menuVisible = await page.locator('[data-note-overlay-menu]').first().isVisible().catch(() => false);
      if (menuVisible) throw new Error('slash menu still visible after Escape');
      const block = await rootBlockFromApi(page, 0);
      if (block.type !== 'text') {
        throw new Error(`Escape should keep text block, got ${block.type}`);
      }
      assertNoSlashTrigger(block.text, 'after Escape');
      const domText = await blockTextFromDom(page, 0);
      assertNoSlashTrigger(domText, 'dom after Escape');
    }) ? 0 : 1;

    failed += await runCheck('slash Enter selects highlighted command', async () => {
      await createFreshNote(page);
      const editor = await focusBlockAt(page, 0);
      await editor.click();
      await page.keyboard.type('/', { delay: 35 });
      await waitForSlashMenu(page);
      await page.keyboard.type('체크', { delay: 35 });
      await page.waitForTimeout(500);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(1200);
      await assertFirstRowBlockKind(page, 'todo');
      const domText = await blockEditorTextFromDom(page, 0);
      assertNoSlashTrigger(domText, 'after Enter');
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
      await waitForApiBlockText(page, '부모본문', 0, parentDocId);
      await createSubPageViaTreeAction(page, parentDocId);
      const { childDocId } = await openChildDocumentFromLastPageBlock(page);
      await waitForDocumentBlocksHydrated(page, childDocId);
      await typeInFirstBlock(page, '하위고유문구', 0);
      await waitForBlockText(page, '하위고유문구', 0);
      const parentTitle = await page.evaluate(async (parentId) => {
        const res = await fetch('/api/admin/note/bootstrap', { credentials: 'include' });
        const json = await res.json();
        return (json.documents ?? []).find((doc) => doc.id === parentId)?.title ?? '';
      }, parentDocId);
      if (!parentTitle) throw new Error('parent title not found for breadcrumb navigation');
      await page.locator('button.mb-4.inline-flex').filter({ hasText: parentTitle }).click();
      await page.waitForURL((url) => url.searchParams.get('id') === parentDocId, { timeout: 20000 });
      await waitForDocumentBlocksHydrated(page, parentDocId);
      const parentText = await waitForBlockText(page, '부모본문', 0);
      if (!parentText.includes('부모본문')) {
        throw new Error(`parent content missing after switch: "${parentText}"`);
      }
      await openChildDocumentFromLastPageBlock(page);
      const childText = await waitForBlockText(page, '하위고유문구', 0);
      if (!childText.includes('하위고유문구')) {
        throw new Error(`child content missing after return: "${childText}"`);
      }
    }) ? 0 : 1;

    failed += await runCheck('child document typing stays visible after reconcile wait', async () => {
      await createFreshNote(page);
      const subPageBtn = await openPageMenu(page);
      await subPageBtn.click();
      await page.locator('[data-note-open-page-block]').last().waitFor({ state: 'visible', timeout: 30000 });
      const { childDocId } = await openChildDocumentFromLastPageBlock(page);
      await waitForDocumentBlocksHydrated(page, childDocId);
      await page.waitForTimeout(1500);
      await typeInFirstBlock(page, '하위타이핑유지', 0);
      await waitForBlockText(page, '하위타이핑유지', 0);
      await waitForApiBlockText(page, '하위타이핑유지', 0, childDocId);
      await clickDocumentBody(page);
      await page.waitForTimeout(800);
      await page.waitForTimeout(RECONCILE_WAIT_MS);
      const rowText = await page.locator('[data-note-block-row]').first().innerText();
      if (!rowText.includes('하위타이핑유지')) {
        const apiText = await blockTextFromApi(page, 0);
        if (!apiText.includes('하위타이핑유지')) {
          throw new Error(`child typing vanished: row="${rowText}" api="${apiText}"`);
        }
      }
    }) ? 0 : 1;

    // todo backspace SSOT는 parent 케이스로 검증 (동일 assertTodoBackspaceChain).
    // 라벨만 child인 중복 케이스는 풀 스모크에서 TipTap 잔여로 flaky해 제거.

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
      await waitForDocumentBlocksHydrated(page, childDocId);
      await waitForEditorSurface(page, 0);
      await typeInFirstBlock(page, '페이지블록진입', 0);
      const text = await waitForBlockText(page, '페이지블록진입', 0);
      if (!text.includes('페이지블록진입')) {
        throw new Error(`could not type in child doc ${childDocId}: "${text}"`);
      }
    }) ? 0 : 1;

    failed += await runCheck('collapsed toggle forest transfers to another document', async () => {
      await assertToggleForestTransfer(page);
    }) ? 0 : 1;

    failed += await runCheck('identityLeave soft_delete survives document reload', async () => {
      await assertIdentityLeaveSurvivesReload(page);
    }) ? 0 : 1;

    if (consoleErrors.length > 0) {
      console.warn('WARN console errors:', consoleErrors.slice(0, 3).join(' | '));
    }
    if (httpErrors.length > 0) {
      console.warn(
        'WARN HTTP 5xx responses:',
        httpErrors
          .slice(0, 5)
          .map((entry) => `${entry.method} ${entry.status} ${entry.url}${entry.body ? ` ${entry.body}` : ''}`)
          .join(' | '),
      );
    }
  } finally {
    try {
      const cleaned = await cleanupEphemeralQaDocumentsBestEffort(page);
      if (cleaned.deleted > 0) {
        console.log(`Cleaned ${cleaned.deleted} ephemeral QA document(s) via ${cleaned.via}.`);
      }
      for (const cleanupError of cleaned.errors) {
        console.warn('WARN cleanup fallback:', cleanupError.message);
      }
    } catch (cleanupError) {
      console.error(
        'QA doc cleanup failed:',
        cleanupError instanceof Error ? cleanupError.message : cleanupError,
      );
      failed += 1;
    }
    if (context) await context.close().catch(() => undefined);
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
