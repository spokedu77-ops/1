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
const FOUNDATION_PREFIX = 'Foundation QA';
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
      const cleaned = await cleanupEphemeralQaDocumentsBestEffort(page);
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
