/**
 * Fast Admin Note foundation QA.
 *
 * This is the always-on smoke: it verifies the minimum contract that makes the
 * note trustworthy without running the long exploratory smoke suite.
 *
 * Usage:
 *   node scripts/admin-note-foundation-qa.mjs http://localhost:3000
 */
import nextEnv from '@next/env';
import {
  NOTE_QA_DOCUMENTS,
  createNoteQaContext,
  loadPlaywrightChromium,
  runCheck,
} from './note-qa/shared.mjs';
import { cleanupEphemeralQaDocumentsBestEffort } from './note-qa/cleanupEphemeralDocs.mjs';

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const BASE = (process.argv[2] || process.env.NOTE_QA_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const COMMON_BOARD_ID = NOTE_QA_DOCUMENTS[0]?.id ?? '7c095438-335b-4318-a3fb-09145f01d24a';
const JIHOON_WORK_NOTE_ID = '630e1104-84f9-41a2-b25b-7c4faa6a1300';
const JIHOON_JULY_PAGE_BLOCK_ID = '923724e3-1da2-4343-bf2a-f41854a181a2';
const JIHOON_JULY_PAGE_TITLE = '7월 업무 히스토리';
const FOUNDATION_PREFIX = 'Foundation QA';
const FOUNDATION_CLEANUP_OPTIONS = { titlePrefixes: [FOUNDATION_PREFIX] };
const WAIT = 12_000;

function documentIdFromPage(page) {
  return new URL(page.url()).searchParams.get('id');
}

async function waitForLoaded(page, documentId, { requireRows = true } = {}) {
  await page.waitForFunction(async ({ expectedId, rowsRequired }) => {
    const urlId = new URL(location.href).searchParams.get('id');
    if (expectedId && urlId !== expectedId) return false;
    const loading = document.querySelector('[role="status"]')?.textContent ?? '';
    if (loading.includes('페이지 불러오는 중')) return false;
    if (!rowsRequired) return true;
    return document.querySelectorAll('[data-note-block-row]').length > 0;
  }, { expectedId: documentId, rowsRequired: requireRows }, { timeout: 30_000 });
}

async function openDocument(page, documentId, options = {}) {
  await page.goto(`${BASE}/admin/note?id=${encodeURIComponent(documentId)}`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle').catch(() => undefined);
  await waitForLoaded(page, documentId, options);
}

async function fetchBlocks(page, documentId = documentIdFromPage(page)) {
  if (!documentId) throw new Error('document id missing');
  return page.evaluate(async (docId) => {
    const res = await fetch(
      `/api/admin/note/blocks/load?documentId=${encodeURIComponent(docId)}&skipReconcile=true`,
      { credentials: 'include' },
    );
    if (!res.ok) throw new Error(`blocks/load ${res.status}`);
    const json = await res.json();
    return json.blocks ?? [];
  }, documentId);
}

function isEmptyStoredInputBlock(block) {
  if (block.parent_block_id !== null && block.parent_block_id !== undefined) return false;
  if (!['text', 'todo', 'callout', 'quote'].includes(block.type)) return false;
  const content = block.content ?? {};
  const text = typeof content.text === 'string' ? content.text.trim() : '';
  const html = typeof content.html === 'string'
    ? content.html.replace(/<[^>]*>/g, '').trim()
    : '';
  const title = typeof content.title === 'string' ? content.title.trim() : '';
  return text.length === 0 && html.length === 0 && title.length === 0;
}

async function fetchBootstrapForDocument(page, documentId) {
  return page.evaluate(async (docId) => {
    const res = await fetch(`/api/admin/note/bootstrap?documentId=${encodeURIComponent(docId)}`, {
      credentials: 'include',
    });
    if (!res.ok) throw new Error(`bootstrap ${res.status}`);
    return res.json();
  }, documentId);
}

async function readRenderedRows(page) {
  return page.evaluate(() => [...document.querySelectorAll('[data-note-block-row]')].map((el, index) => ({
    index,
    id: el.getAttribute('data-block-id'),
    text: (el.textContent ?? '').trim(),
  })));
}

async function createDocument(page, title = `${FOUNDATION_PREFIX} ${Date.now()}`) {
  return page.evaluate(async (docTitle) => {
    const res = await fetch('/api/admin/note/documents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ title: docTitle }),
    });
    if (!res.ok) throw new Error(`document create ${res.status}`);
    const json = await res.json();
    return json.document;
  }, title);
}

async function createBlock(page, input) {
  return page.evaluate(async (body) => {
    const res = await fetch('/api/admin/note/blocks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => null);
      throw new Error(json?.error || `block create ${res.status}`);
    }
    const json = await res.json();
    return json.block;
  }, input);
}

async function createSeededDocument(page) {
  const document = await createDocument(page);
  await createBlock(page, {
    documentId: document.id,
    type: 'text',
    content: { text: '', html: '<p></p>' },
    order_index: 0,
    parent_block_id: null,
  });
  await openDocument(page, document.id);
  return document.id;
}

async function createThreeRootTextDocument(page) {
  const document = await createDocument(page, `${FOUNDATION_PREFIX} Insert ${Date.now()}`);
  for (let index = 0; index < 3; index += 1) {
    await createBlock(page, {
      documentId: document.id,
      type: 'text',
      content: { text: `insert-anchor-${index}`, html: `<p>insert-anchor-${index}</p>` },
      order_index: index,
      parent_block_id: null,
    });
  }
  await openDocument(page, document.id);
  return document.id;
}

async function focusRowEditor(page, index = 0) {
  const row = page.locator('[data-note-block-row]').nth(index);
  await row.waitFor({ state: 'visible', timeout: WAIT });
  await row.scrollIntoViewIfNeeded();
  await page.evaluate((idx) => {
    const target = document.querySelectorAll('[data-note-block-row]')[idx];
    target?.scrollIntoView({ block: 'center', inline: 'nearest' });
    const preview = target?.querySelector('[data-note-preview-text]');
    if (preview instanceof HTMLElement) preview.click();
  }, index);
  const editor = row.locator('.ProseMirror').first();
  await editor.waitFor({ state: 'visible', timeout: WAIT });
  await editor.scrollIntoViewIfNeeded();
  await editor.click({ force: true });
  return editor;
}

async function blurEditor(page) {
  await page.locator('[data-note-document-body="true"]').first().click({
    position: { x: 80, y: 12 },
    force: true,
  }).catch(() => page.keyboard.press('Tab'));
  await page.waitForTimeout(900);
}

async function waitForBlockText(page, documentId, text, timeout = 25_000) {
  await page.waitForFunction(async ({ docId, needle }) => {
    const res = await fetch(
      `/api/admin/note/blocks/load?documentId=${encodeURIComponent(docId)}&skipReconcile=true`,
      { credentials: 'include' },
    );
    if (!res.ok) return false;
    const json = await res.json();
    return (json.blocks ?? []).some((block) => JSON.stringify(block.content ?? {}).includes(needle));
  }, { docId: documentId, needle: text }, { timeout });
}

async function waitForDocumentTextNotContaining(page, documentId, text, timeout = 25_000) {
  await page.waitForFunction(async ({ docId, needle }) => {
    const res = await fetch(
      `/api/admin/note/blocks/load?documentId=${encodeURIComponent(docId)}&skipReconcile=true`,
      { credentials: 'include' },
    );
    if (!res.ok) return false;
    const json = await res.json();
    const wholeDocument = (json.blocks ?? [])
      .map((block) => JSON.stringify(block.content ?? {}))
      .join('\n');
    return !wholeDocument.includes(needle);
  }, { docId: documentId, needle: text }, { timeout });
}

async function pastePlainText(page, text) {
  await page.evaluate(async (payload) => {
    await navigator.clipboard.writeText(payload);
  }, text);
  await page.keyboard.press(process.platform === 'darwin' ? 'Meta+V' : 'Control+V');
}

async function addBlockBelowRow(page, rowIndex, blockType) {
  const pickerIndexes = {
    todo: 6,
    toggle: 7,
    page: 16,
  };
  const row = page.locator('[data-note-block-row]').nth(rowIndex);
  await row.waitFor({ state: 'visible', timeout: WAIT });
  await row.hover();
  const addButton = row.locator('[data-note-add-block-below]').first();
  await addButton.waitFor({ state: 'visible', timeout: WAIT });
  await addButton.click({ force: true });
  const picker = page.locator('[data-note-block-picker-menu]').last();
  const command = picker.locator(`[data-note-block-picker-command="${blockType}"]`).first();
  try {
    await command.waitFor({ state: 'visible', timeout: 2_000 });
    await command.click({ force: true });
    return;
  } catch {
    const fallbackIndex = pickerIndexes[blockType];
    if (fallbackIndex === undefined) throw new Error(`No picker fallback index for ${blockType}`);
    const fallbackCommand = picker.locator('button').nth(fallbackIndex);
    await fallbackCommand.waitFor({ state: 'visible', timeout: WAIT });
    await fallbackCommand.click({ force: true });
  }
}

async function assertNoFoundationArtifacts(page) {
  const documents = await page.evaluate(async (prefix) => {
    const res = await fetch('/api/admin/note/bootstrap', { credentials: 'include' });
    if (!res.ok) throw new Error(`bootstrap ${res.status}`);
    const json = await res.json();
    return (json.documents ?? [])
      .filter((doc) => !doc.deleted_at && typeof doc.title === 'string' && doc.title.startsWith(prefix))
      .map((doc) => ({ id: doc.id, title: doc.title }));
  }, FOUNDATION_PREFIX);
  if (documents.length > 0) {
    throw new Error(`foundation QA documents left behind: ${JSON.stringify(documents)}`);
  }
}

async function main() {
  const chromium = await loadPlaywrightChromium();
  const browser = await chromium.launch({ headless: true });
  let context;
  let page;
  let failed = 0;

  try {
    context = await createNoteQaContext(browser, BASE);
    page = await context.newPage();

    failed += await runCheck('common board loads without blank document state', async () => {
      await openDocument(page, COMMON_BOARD_ID);
      const rows = await page.locator('[data-note-block-row]').count();
      const apiBlocks = await fetchBlocks(page, COMMON_BOARD_ID);
      if (rows < 1 && apiBlocks.length < NOTE_QA_DOCUMENTS[0].minRows) {
        throw new Error(`too few rows: dom=${rows} api=${apiBlocks.length}`);
      }
    });

    failed += await runCheck('reload keeps existing child page links and does not create blank blocks', async () => {
      const bootstrap = await fetchBootstrapForDocument(page, JIHOON_WORK_NOTE_ID);
      const bootstrapBlocks = bootstrap.blocks ?? [];
      const expectedPage = bootstrapBlocks.find((block) => block.id === JIHOON_JULY_PAGE_BLOCK_ID);
      if (!expectedPage || expectedPage.type !== 'page') {
        throw new Error(`baseline July page block missing from bootstrap: ${JIHOON_JULY_PAGE_BLOCK_ID}`);
      }

      const initialBlocks = await fetchBlocks(page, JIHOON_WORK_NOTE_ID);
      const initialActiveCount = initialBlocks.length;
      const initialEmptyStoredIds = initialBlocks.filter(isEmptyStoredInputBlock).map((block) => block.id);
      if (initialEmptyStoredIds.length > 0) {
        throw new Error(`baseline has stored empty root input blocks: ${initialEmptyStoredIds.join(', ')}`);
      }

      for (let attempt = 1; attempt <= 8; attempt += 1) {
        await page.goto(`${BASE}/admin/note?id=${encodeURIComponent(JIHOON_WORK_NOTE_ID)}&foundationReload=${Date.now()}-${attempt}`, {
          waitUntil: 'domcontentloaded',
        });
        await page.waitForTimeout(350);
        await page.locator('[data-note-document-body="true"]').click({
          position: { x: 900, y: 760 },
          force: true,
        }).catch(() => undefined);
        await waitForLoaded(page, JIHOON_WORK_NOTE_ID);
        await page.waitForTimeout(500);

        const rows = await readRenderedRows(page);
        const hasJulyById = rows.some((row) => row.id === JIHOON_JULY_PAGE_BLOCK_ID);
        const hasJulyByText = rows.some((row) => row.text.includes(JIHOON_JULY_PAGE_TITLE));
        if (!hasJulyById || !hasJulyByText) {
          throw new Error(`July page disappeared after reload ${attempt}: ${JSON.stringify(rows.slice(0, 14))}`);
        }

        const apiBlocks = await fetchBlocks(page, JIHOON_WORK_NOTE_ID);
        if (apiBlocks.length !== initialActiveCount) {
          throw new Error(`reload ${attempt} changed active block count: before=${initialActiveCount} after=${apiBlocks.length}`);
        }
        const emptyStoredIds = apiBlocks.filter(isEmptyStoredInputBlock).map((block) => block.id);
        if (emptyStoredIds.length > 0) {
          throw new Error(`reload ${attempt} created/still has empty root input blocks: ${emptyStoredIds.join(', ')}`);
        }
      }
    });

    failed += await runCheck('typing persists after reload', async () => {
      const documentId = await createSeededDocument(page);
      const text = `typed-persist-${Date.now()}`;
      const editor = await focusRowEditor(page, 0);
      await editor.click({ force: true });
      await page.keyboard.type(text, { delay: 5 });
      await blurEditor(page);
      await waitForBlockText(page, documentId, text);
      await page.reload({ waitUntil: 'domcontentloaded' });
      await waitForLoaded(page, documentId);
      await waitForBlockText(page, documentId, text);
    });

    failed += await runCheck('page block inserts immediately after focused row', async () => {
      const documentId = await createThreeRootTextDocument(page);
      await focusRowEditor(page, 1);
      await addBlockBelowRow(page, 1, 'page');
      await page.waitForFunction(async ({ docId }) => {
        const res = await fetch(
          `/api/admin/note/blocks/load?documentId=${encodeURIComponent(docId)}&skipReconcile=true`,
          { credentials: 'include' },
        );
        if (!res.ok) return false;
        const json = await res.json();
        return (json.blocks ?? [])
          .filter((block) => !block.deleted_at && !block.parent_block_id)
          .length >= 4;
      }, { docId: documentId }, { timeout: 25_000 });
      const roots = (await fetchBlocks(page, documentId))
        .filter((block) => !block.deleted_at && !block.parent_block_id)
        .sort((a, b) => a.order_index - b.order_index);
      const order = roots.map((block) =>
        block.type === 'page' ? 'page' : (block.content?.text ?? block.type));
      const expected = ['insert-anchor-0', 'insert-anchor-1', 'page', 'insert-anchor-2'];
      if (JSON.stringify(order) !== JSON.stringify(expected)) {
        throw new Error(`page inserted at wrong position: ${JSON.stringify(order)}`);
      }
    });

    failed += await runCheck('callout paste keeps metadata and pasted text', async () => {
      const document = await createDocument(page, `${FOUNDATION_PREFIX} Callout ${Date.now()}`);
      await createBlock(page, {
        documentId: document.id,
        type: 'callout',
        content: { text: 'before', html: '<p>before</p>', icon: '!', blockColor: 'yellow' },
        order_index: 0,
        parent_block_id: null,
      });
      await openDocument(page, document.id);
      await focusRowEditor(page, 0);
      await pastePlainText(page, 'callout pasted line one\ncallout pasted line two');
      await blurEditor(page);
      await waitForBlockText(page, document.id, 'callout pasted line two');
      const [block] = (await fetchBlocks(page, document.id)).filter((row) => row.type === 'callout');
      if (!block) throw new Error('callout missing after paste');
      if (block.content?.icon !== '!' || block.content?.blockColor !== 'yellow') {
        throw new Error(`callout metadata lost: ${JSON.stringify(block.content)}`);
      }
      if (!JSON.stringify(block.content ?? {}).includes('callout pasted line one')) {
        throw new Error(`callout first line missing: ${JSON.stringify(block.content)}`);
      }
    });

    failed += await runCheck('multiline paste creates one undoable transaction', async () => {
      const documentId = await createSeededDocument(page);
      await focusRowEditor(page, 0);
      await pastePlainText(page, 'paste one\npaste two\npaste three');
      await blurEditor(page);
      await waitForBlockText(page, documentId, 'paste three');
      await focusRowEditor(page, 0);
      await page.keyboard.press('Control+Z');
      await waitForDocumentTextNotContaining(page, documentId, 'paste two');
      await waitForDocumentTextNotContaining(page, documentId, 'paste three');
    });

    failed += await runCheck('toggle todo callout page roundtrip through storage', async () => {
      const parent = await createDocument(page, `${FOUNDATION_PREFIX} Blocks ${Date.now()}`);
      const toggle = await createBlock(page, {
        documentId: parent.id,
        type: 'toggle',
        content: { title: 'Toggle foundation', collapsed: false },
        order_index: 0,
        parent_block_id: null,
      });
      await createBlock(page, {
        documentId: parent.id,
        type: 'text',
        content: { text: 'toggle child survives', html: '<p>toggle child survives</p>' },
        order_index: 0,
        parent_block_id: toggle.id,
      });
      await createBlock(page, {
        documentId: parent.id,
        type: 'todo',
        content: { text: 'todo survives', checked: false },
        order_index: 1,
        parent_block_id: null,
      });
      await createBlock(page, {
        documentId: parent.id,
        type: 'callout',
        content: { text: 'callout survives', icon: 'i', blockColor: 'blue' },
        order_index: 2,
        parent_block_id: null,
      });
      const child = await createDocument(page, `${FOUNDATION_PREFIX} Child ${Date.now()}`);
      await createBlock(page, {
        documentId: parent.id,
        type: 'page',
        content: { page_document_id: child.id, title: child.title },
        order_index: 3,
        parent_block_id: null,
      });
      await openDocument(page, parent.id);
      const blocks = await fetchBlocks(page, parent.id);
      const serialized = JSON.stringify(blocks);
      const checks = [
        blocks.some((block) => block.id === toggle.id && block.type === 'toggle'),
        blocks.some((block) => block.parent_block_id === toggle.id && serialized.includes('toggle child survives')),
        blocks.some((block) => block.type === 'todo' && block.content?.checked === false && serialized.includes('todo survives')),
        blocks.some((block) => block.type === 'callout' && block.content?.icon === 'i' && block.content?.blockColor === 'blue'),
        blocks.some((block) => block.type === 'page' && block.content?.page_document_id === child.id),
      ];
      if (!checks.every(Boolean)) throw new Error(`roundtrip checks failed: ${JSON.stringify(checks)}`);
    });

  } finally {
    try {
      const cleaned = await cleanupEphemeralQaDocumentsBestEffort(page, FOUNDATION_CLEANUP_OPTIONS);
      if (cleaned.deleted > 0) {
        console.log(`Cleaned ${cleaned.deleted} ephemeral QA document(s) via ${cleaned.via}.`);
      }
      for (const cleanupError of cleaned.errors) {
        console.warn('WARN cleanup fallback:', cleanupError.message);
      }
      if (page) await assertNoFoundationArtifacts(page);
    } catch (cleanupError) {
      console.error('QA cleanup failed:', cleanupError instanceof Error ? cleanupError.message : cleanupError);
      failed += 1;
    }
    if (context) await context.close().catch(() => undefined);
    await browser.close();
  }

  if (failed > 0) {
    console.error(`\n${failed} foundation check(s) failed.`);
    process.exit(1);
  }
  console.log('\nAll admin note foundation checks passed.');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
