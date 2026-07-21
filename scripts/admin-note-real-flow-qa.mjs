/**
 * Admin Note real-flow QA.
 *
 * Verifies a mixed editing session stays stable after reload:
 * - root todo/bullet/toggle/page blocks
 * - todo/bullet inside toggle
 * - todo/toggle/page inside page
 * - no invariant drift after the session
 *
 * Usage:
 *   node scripts/admin-note-real-flow-qa.mjs http://localhost:3000
 */
import nextEnv from '@next/env';
import {
  createNoteQaContext,
  loadPlaywrightChromium,
  runCheck,
} from './note-qa/shared.mjs';
import {
  auditBlockInvariants,
  countCriticalInvariantIssues,
  countWarningInvariantIssues,
} from './note-qa/blockInvariants.mjs';

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const BASE = (process.argv[2] || process.env.NOTE_QA_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');

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
    if (!res.ok) {
      const json = await res.json().catch(() => null);
      throw new Error(json?.error || `block create failed (${res.status})`);
    }
    const { block } = await res.json();
    return block;
  }, body);
}

async function fetchBlocks(page, documentId) {
  return page.evaluate(async (docId) => {
    const res = await fetch(
      `/api/admin/note/blocks/load?documentId=${encodeURIComponent(docId)}&skipReconcile=true`,
      { credentials: 'include' },
    );
    if (!res.ok) throw new Error(`blocks load failed (${res.status})`);
    const json = await res.json();
    return json.blocks ?? [];
  }, documentId);
}

async function deleteDocument(page, documentId) {
  await page.evaluate(async (docId) => {
    await fetch(`/api/admin/note/documents?id=${encodeURIComponent(docId)}`, {
      method: 'DELETE',
      credentials: 'include',
    }).catch(() => undefined);
  }, documentId);
}

async function openDocument(page, documentId) {
  await page.goto(`${BASE}/admin/note?id=${encodeURIComponent(documentId)}`, {
    waitUntil: 'domcontentloaded',
  });
  await page.waitForFunction(
    (docId) => new URL(location.href).searchParams.get('id') === docId
      && document.querySelectorAll('[data-note-block-row]').length > 0,
    documentId,
    { timeout: 30_000 },
  );
}

function assertOrder(blocks, parentId, expected) {
  const actual = blocks
    .filter((block) => (block.parent_block_id ?? null) === parentId)
    .sort((a, b) => a.order_index - b.order_index)
    .map((block) => `${block.type}:${
      block.type === 'page'
        ? block.content?.page_document_id
        : block.content?.text ?? block.content?.title ?? ''
    }`);
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`unexpected order for parent=${parentId ?? 'root'}: ${JSON.stringify(actual)}`);
  }
}

async function seedRealFlowDocument(page) {
  const stamp = Date.now();
  const parent = await createDocument(page, `Real Flow QA ${stamp}`);
  const childA = await createDocument(page, `Real Flow Child A ${stamp}`, parent.id);
  const childB = await createDocument(page, `Real Flow Child B ${stamp}`, parent.id);

  const todo = await createBlock(page, {
    documentId: parent.id,
    type: 'todo',
    content: { text: 'root todo keep', checked: false },
    order_index: 0,
    parent_block_id: null,
  });
  const toggle = await createBlock(page, {
    documentId: parent.id,
    type: 'toggle',
    content: { title: 'toggle keep', collapsed: false },
    order_index: 1,
    parent_block_id: null,
  });
  const pageBlock = await createBlock(page, {
    documentId: parent.id,
    type: 'page',
    content: { title: childA.title, page_document_id: childA.id },
    order_index: 2,
    parent_block_id: null,
  });
  await createBlock(page, {
    documentId: parent.id,
    type: 'bulletList',
    content: { text: 'root bullet keep' },
    order_index: 3,
    parent_block_id: null,
  });
  await createBlock(page, {
    documentId: parent.id,
    type: 'bulletList',
    content: { text: 'toggle bullet keep' },
    order_index: 0,
    parent_block_id: toggle.id,
  });
  await createBlock(page, {
    documentId: parent.id,
    type: 'todo',
    content: { text: 'toggle todo keep', checked: false },
    order_index: 1,
    parent_block_id: toggle.id,
  });
  await createBlock(page, {
    documentId: parent.id,
    type: 'todo',
    content: { text: 'page todo keep', checked: false },
    order_index: 0,
    parent_block_id: pageBlock.id,
  });
  await createBlock(page, {
    documentId: parent.id,
    type: 'toggle',
    content: { title: 'page toggle keep', collapsed: false },
    order_index: 1,
    parent_block_id: pageBlock.id,
  });
  await createBlock(page, {
    documentId: parent.id,
    type: 'page',
    content: { title: childB.title, page_document_id: childB.id },
    order_index: 2,
    parent_block_id: pageBlock.id,
  });

  return { parent, childA, childB, todo, toggle, pageBlock };
}

async function main() {
  const chromium = await loadPlaywrightChromium();
  const browser = await chromium.launch({ headless: true });
  let context;
  let page;
  let parentId = null;
  const childIds = [];
  let failed = 0;

  try {
    context = await createNoteQaContext(browser, BASE);
    page = await context.newPage();
    await page.goto(`${BASE}/admin/note`, { waitUntil: 'domcontentloaded' });

    failed += await runCheck('mixed nested editing flow reloads without drift', async () => {
      const seeded = await seedRealFlowDocument(page);
      parentId = seeded.parent.id;
      childIds.push(seeded.childA.id, seeded.childB.id);

      await openDocument(page, parentId);
      await page.reload({ waitUntil: 'domcontentloaded' });
      await openDocument(page, parentId);

      const blocks = await fetchBlocks(page, parentId);
      assertOrder(blocks, null, [
        'todo:root todo keep',
        'toggle:toggle keep',
        `page:${seeded.childA.id}`,
        'bulletList:root bullet keep',
      ]);
      assertOrder(blocks, seeded.toggle.id, [
        'bulletList:toggle bullet keep',
        'todo:toggle todo keep',
      ]);
      assertOrder(blocks, seeded.pageBlock.id, [
        'todo:page todo keep',
        'toggle:page toggle keep',
        `page:${seeded.childB.id}`,
      ]);

      const issues = auditBlockInvariants(blocks);
      const critical = countCriticalInvariantIssues(issues);
      const warnings = countWarningInvariantIssues(issues);
      if (critical > 0 || warnings > 0) {
        throw new Error(`real-flow invariant drift critical=${critical} warnings=${warnings}`);
      }
    });
  } finally {
    if (page) {
      for (const childId of childIds) await deleteDocument(page, childId);
      if (parentId) await deleteDocument(page, parentId);
    }
    if (context) await context.close().catch(() => undefined);
    await browser.close();
  }

  if (failed > 0) process.exit(1);
  console.log('\nAdmin Note real-flow QA passed.');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
