/**
 * Admin Note slow-machine basic QA.
 *
 * Local-only smoke for low-spec symptoms:
 * - Enter creates a visible block immediately.
 * - Sidebar document clicks still work after idle/slow rendering.
 *
 * Usage:
 *   node scripts/admin-note-slow-basic-qa.mjs http://localhost:3000
 */
import nextEnv from '@next/env';
import {
  createNoteQaContext,
  loadPlaywrightChromium,
  runCheck,
} from './note-qa/shared.mjs';

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const BASE = (process.argv[2] || 'http://localhost:3000').replace(/\/$/, '');
const CPU_RATE = Number(process.env.ADMIN_NOTE_SLOW_CPU_RATE || '4');
const IDLE_MS = Number(process.env.ADMIN_NOTE_SLOW_IDLE_MS || '7000');

async function enableSlowMode(page) {
  const client = await page.context().newCDPSession(page);
  await client.send('Emulation.setCPUThrottlingRate', { rate: CPU_RATE }).catch(() => undefined);
}

async function createQaDocument(page, title) {
  return page.evaluate(async (docTitle) => {
    const docRes = await fetch('/api/admin/note/documents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ title: docTitle }),
    });
    if (!docRes.ok) throw new Error(`document create failed (${docRes.status})`);
    const { document } = await docRes.json();
    const blockRes = await fetch('/api/admin/note/blocks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        documentId: document.id,
        type: 'text',
        content: { text: 'seed', html: '<p>seed</p>' },
        order_index: 0,
        parent_block_id: null,
      }),
    });
    if (!blockRes.ok) throw new Error(`block seed failed (${blockRes.status})`);
    return document.id;
  }, title);
}

async function createDocument(page, title, parentId = null) {
  return page.evaluate(async ({ docTitle, parentDocumentId }) => {
    const res = await fetch('/api/admin/note/documents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        title: docTitle,
        ...(parentDocumentId ? { parent_id: parentDocumentId } : {}),
      }),
    });
    if (!res.ok) throw new Error(`document create failed (${res.status})`);
    const { document } = await res.json();
    return document;
  }, { docTitle: title, parentDocumentId: parentId });
}

async function createBlock(page, body) {
  return page.evaluate(async (payload) => {
    const res = await fetch('/api/admin/note/blocks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`block create failed (${res.status})`);
    const { block } = await res.json();
    return block;
  }, body);
}

async function openDocument(page, documentId) {
  await page.goto(`${BASE}/admin/note?id=${encodeURIComponent(documentId)}`, {
    waitUntil: 'domcontentloaded',
  });
  await page.locator('[data-note-block-row]').first().waitFor({ state: 'visible', timeout: 30000 });
}

async function focusEditorInRow(page, row) {
  await row.scrollIntoViewIfNeeded();
  await row.locator('[data-note-editor-host]').first().click({ force: true });
  const editor = row.locator('.ProseMirror').first();
  await editor.waitFor({ state: 'visible', timeout: 15000 });
  await editor.click({ force: true });
  await page.keyboard.press('End');
  return editor;
}

async function focusRowByText(page, text) {
  const row = page
    .locator('[data-note-block-row]')
    .filter({ hasText: text })
    .first();
  await focusEditorInRow(page, row);
  return row;
}

async function pressEnterAndExpectRows(page, expectedBefore, timeout = 2000) {
  const startedAt = Date.now();
  await page.keyboard.press('Enter');
  await page.waitForFunction(
    (expected) => document.querySelectorAll('[data-note-block-row]').length > expected,
    expectedBefore,
    { timeout },
  );
  return Date.now() - startedAt;
}

async function waitForDocumentId(page, documentId) {
  await page.waitForFunction(
    (expectedId) => new URL(location.href).searchParams.get('id') === expectedId,
    documentId,
    { timeout: 20000 },
  );
}

async function clickSidebarDocumentTitle(page, title) {
  const titleNode = page.locator('p').filter({ hasText: title }).first();
  await titleNode.waitFor({ state: 'visible', timeout: 20000 });
  const button = titleNode.locator('xpath=ancestor::div[@role="button"][1]');
  await button.click({ timeout: 15000 });
}

async function focusFirstEditor(page) {
  const row = page.locator('[data-note-block-row]').first();
  await row.scrollIntoViewIfNeeded();
  await row.locator('[data-note-editor-host]').first().click({ force: true });
  const editor = row.locator('.ProseMirror').first();
  await editor.waitFor({ state: 'visible', timeout: 15000 });
  await editor.click({ force: true });
  return editor;
}

async function deleteQaDocuments(page, ids) {
  await page.evaluate(async (documentIds) => {
    for (const id of documentIds) {
      await fetch(`/api/admin/note/documents?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        credentials: 'include',
      }).catch(() => undefined);
    }
  }, ids);
}

async function main() {
  const chromium = await loadPlaywrightChromium();
  const browser = await chromium.launch({ headless: true });
  let context;
  let page;
  const createdIds = [];
  let failed = 0;

  try {
    context = await createNoteQaContext(browser, BASE);
    page = await context.newPage();
    await enableSlowMode(page);
    await page.goto(`${BASE}/admin/note`, { waitUntil: 'domcontentloaded' });

    const stamp = Date.now();
    const docA = await createQaDocument(page, `Slow QA A ${stamp}`);
    const docB = await createQaDocument(page, `Slow QA B ${stamp}`);
    const parentDoc = await createDocument(page, `Slow QA Parent ${stamp}`);
    const childDoc = await createDocument(page, `Slow QA Child ${stamp}`, parentDoc.id);
    createdIds.push(docA, docB, childDoc.id, parentDoc.id);

    await createBlock(page, {
      documentId: childDoc.id,
      type: 'todo',
      content: { text: 'child todo instant', html: '<p>child todo instant</p>', checked: false },
      order_index: 0,
      parent_block_id: null,
    });
    const toggle = await createBlock(page, {
      documentId: childDoc.id,
      type: 'toggle',
      content: { title: 'toggle instant', collapsed: false },
      order_index: 1,
      parent_block_id: null,
    });
    await createBlock(page, {
      documentId: childDoc.id,
      type: 'todo',
      content: { text: 'toggle child todo instant', html: '<p>toggle child todo instant</p>', checked: false },
      order_index: 0,
      parent_block_id: toggle.id,
    });

    failed += await runCheck('Enter creates a visible block under CPU throttle', async () => {
      await openDocument(page, docA);
      const before = await page.locator('[data-note-block-row]').count();
      const editor = await focusFirstEditor(page);
      await editor.click({ force: true });
      await page.keyboard.press('End');
      await pressEnterAndExpectRows(page, before);
    });

    failed += await runCheck('Child-page todo Enter creates the next todo immediately', async () => {
      await openDocument(page, childDoc.id);
      const before = await page.locator('[data-note-block-row]').count();
      await focusRowByText(page, 'child todo instant');
      await pressEnterAndExpectRows(page, before);
      const rows = await page.locator('[data-note-block-row]').evaluateAll((nodes) =>
        nodes.map((node) => ({
          parent: node.getAttribute('data-parent-block-id'),
          text: node.textContent ?? '',
        })),
      );
      const anchorIndex = rows.findIndex((row) => row.text.includes('child todo instant'));
      if (anchorIndex < 0 || !rows[anchorIndex + 1] || rows[anchorIndex + 1].parent !== '') {
        throw new Error('child-page todo Enter did not create an adjacent root sibling');
      }
    });

    failed += await runCheck('Toggle-child todo Enter creates an immediate child sibling', async () => {
      await openDocument(page, childDoc.id);
      const before = await page.locator('[data-note-block-row]').count();
      await focusRowByText(page, 'toggle child todo instant');
      await pressEnterAndExpectRows(page, before);
      const childCount = await page.locator(`[data-note-block-row][data-parent-block-id="${toggle.id}"]`).count();
      if (childCount < 2) {
        throw new Error('toggle child todo Enter did not create a second child row');
      }
    });

    failed += await runCheck('Sidebar document clicks work after slow idle', async () => {
      await openDocument(page, docA);
      await page.waitForTimeout(IDLE_MS);
      await clickSidebarDocumentTitle(page, `Slow QA B ${stamp}`);
      await waitForDocumentId(page, docB);
      await page.waitForTimeout(1000);
      await clickSidebarDocumentTitle(page, `Slow QA A ${stamp}`);
      await waitForDocumentId(page, docA);
    });
  } finally {
    if (page && createdIds.length > 0) {
      await deleteQaDocuments(page, createdIds).catch(() => undefined);
    }
    if (context) await context.close().catch(() => undefined);
    await browser.close();
  }

  if (failed > 0) process.exit(1);
  console.log('\nAdmin Note slow basic QA passed.');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
