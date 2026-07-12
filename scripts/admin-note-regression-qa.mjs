/**
 * Phase 1–2 회귀 QA (Playwright + API)
 *
 * Usage:
 *   node scripts/admin-note-regression-qa.mjs http://localhost:3000
 */
import nextEnv from '@next/env';
import {
  NOTE_QA_DOCUMENTS,
  createNoteQaContext,
  loadPlaywrightChromium,
  runCheck,
} from './note-qa/shared.mjs';

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const BASE = (process.argv[2] || 'http://localhost:3000').replace(/\/$/, '');
const COMMON_BOARD_ID = NOTE_QA_DOCUMENTS[0]?.id ?? '7c095438-335b-4318-a3fb-09145f01d24a';
const GYM_TOGGLE_TITLE = '체육관 이용방법';

function matchesGymToggleTitle(value) {
  return typeof value === 'string' && value.includes(GYM_TOGGLE_TITLE);
}

async function openDocument(page, documentId) {
  await page.goto(
    `${BASE}/admin/note?id=${encodeURIComponent(documentId)}`,
    { waitUntil: 'domcontentloaded' },
  );
  await page.waitForLoadState('networkidle').catch(() => undefined);
  await page.getByRole('status', { name: '페이지 불러오는 중' }).waitFor({ state: 'detached', timeout: 45000 }).catch(() => undefined);
  await page.locator('[data-note-block-row]').first().waitFor({ state: 'visible', timeout: 45000 });
  await page.waitForTimeout(2000);
}

async function fetchBlocks(page, documentId, { skipServerMigration = false } = {}) {
  return page.evaluate(async ({ docId, skip }) => {
    const params = new URLSearchParams({ documentId: docId });
    if (skip) params.set('skipReconcile', 'true');
    const res = await fetch(`/api/admin/note/blocks/load?${params}`, { credentials: 'include' });
    if (!res.ok) throw new Error(`blocks/load ${res.status}`);
    const json = await res.json();
    return json.blocks ?? [];
  }, { docId: documentId, skip: skipServerMigration });
}

async function findToggleWithGymTitle(page, documentId) {
  const blocks = await fetchBlocks(page, documentId);
  const toggle = blocks.find((block) => {
    if (block.type !== 'toggle') return false;
    const title = block.content?.title;
    const text = block.content?.text;
    return matchesGymToggleTitle(title) || matchesGymToggleTitle(text);
  });
  if (!toggle) {
    const titles = blocks
      .filter((b) => b.type === 'toggle')
      .map((b) => (b.content?.title ?? b.content?.text ?? '').toString().trim())
      .filter(Boolean);
    throw new Error(`toggle "${GYM_TOGGLE_TITLE}" not found. toggles: ${titles.join(' | ') || '(none)'}`);
  }
  const children = blocks.filter((b) => b.parent_block_id === toggle.id);
  const legacyBody = [
    toggle.content?.body,
    toggle.content?.legacyBody,
    toggle.content?.bodyHtml,
    toggle.content?.legacyBodyHtml,
  ].filter((v) => typeof v === 'string' && v.trim()).join(' ');
  const childText = children
    .map((c) => (typeof c.content?.text === 'string' ? c.content.text : ''))
    .join(' ')
    .trim();
  return { toggle, children, legacyBody, childText };
}

async function expandGymToggleInDom(page) {
  const result = await page.evaluate(async (needle) => {
    const inputs = [...document.querySelectorAll('[data-toggle-title]')];
    const input = inputs.find((el) => (el.value || '').includes(needle));
    if (!input) return { ok: false, reason: 'input-not-found' };
    input.scrollIntoView({ block: 'center' });
    const toggleRoot = input.closest('.relative.overflow-visible.py-0\\.5')
      ?? input.parentElement?.parentElement;
    const button = toggleRoot?.querySelector('button');
    button?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 900));
    const childrenContainer = toggleRoot?.querySelector('.note-block-children');
    const visibleText = childrenContainer?.innerText?.trim() ?? '';
    const childRowCount = childrenContainer
      ? childrenContainer.querySelectorAll('[data-note-block-row], [data-note-editor-host], [data-note-preview-text]').length
      : 0;
    return {
      ok: true,
      titleValue: input.value,
      childRowCount,
      visibleText,
    };
  }, GYM_TOGGLE_TITLE);
  if (!result.ok) throw new Error(`toggle "${GYM_TOGGLE_TITLE}" not in DOM (${result.reason})`);
  return result;
}

async function createFreshDocumentWithTextBlock(page) {
  return page.evaluate(async () => {
    const docRes = await fetch('/api/admin/note/documents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ title: `Regression QA ${Date.now()}` }),
    });
    if (!docRes.ok) throw new Error(`document create ${docRes.status}`);
    const { document } = await docRes.json();
    const blockRes = await fetch('/api/admin/note/blocks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        documentId: document.id,
        type: 'text',
        content: { text: '삭제QA마커', html: '<p>삭제QA마커</p>' },
        order_index: 0,
        parent_block_id: null,
      }),
    });
    if (!blockRes.ok) throw new Error(`block create ${blockRes.status}`);
    const { block } = await blockRes.json();
    return { documentId: document.id, blockId: block.id };
  });
}

async function softDeleteBlock(page, blockId) {
  await page.evaluate(async (id) => {
    const res = await fetch('/api/admin/note/blocks', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ ids: [id] }),
    });
    if (!res.ok) throw new Error(`soft delete ${res.status}`);
  }, blockId);
}

async function main() {
  const chromium = await loadPlaywrightChromium();
  const browser = await chromium.launch({ headless: true });
  let failed = 0;

  try {
    const context = await createNoteQaContext(browser, BASE);
    const page = await context.newPage();

    failed += await runCheck('공통 보드 문서 로드', async () => {
      await openDocument(page, COMMON_BOARD_ID);
      const urlId = new URL(page.url()).searchParams.get('id');
      if (urlId !== COMMON_BOARD_ID) throw new Error(`expected ${COMMON_BOARD_ID}, got ${urlId}`);
      const rows = await page.locator('[data-note-block-row]').count();
      if (rows < 1) throw new Error('no block rows');
    });

    failed += await runCheck('blocks/load 기본 경로에 skipReconcile 없음 (앱)', async () => {
      const usesSkip = await page.evaluate(async (docId) => {
        const res = await fetch(`/api/admin/note/blocks/load?documentId=${encodeURIComponent(docId)}`, {
          credentials: 'include',
        });
        return res.ok;
      }, COMMON_BOARD_ID);
      if (!usesSkip) throw new Error('full load failed');
    });

    failed += await runCheck(`토글 "${GYM_TOGGLE_TITLE}" DB 본문 존재`, async () => {
      const { toggle, children, legacyBody, childText } = await findToggleWithGymTitle(page, COMMON_BOARD_ID);
      const hasContent = Boolean(childText.trim() || legacyBody.trim());
      if (!hasContent) {
        throw new Error(
          `no body in DB for toggle ${toggle.id} (children=${children.length}, legacy="${legacyBody.slice(0, 80)}")`,
        );
      }
    });

    failed += await runCheck(`토글 "${GYM_TOGGLE_TITLE}" UI 펼침 후 본문 표시`, async () => {
      await openDocument(page, COMMON_BOARD_ID);
      const { childText, legacyBody } = await findToggleWithGymTitle(page, COMMON_BOARD_ID);
      const { childRowCount, visibleText } = await expandGymToggleInDom(page);
      const expectedSnippet = (childText || legacyBody).trim().slice(0, 12);
      if (childRowCount < 1 && !visibleText) {
        throw new Error(`toggle expanded but no child rows (api childText="${childText.slice(0, 60)}")`);
      }
      if (expectedSnippet && !visibleText.includes(expectedSnippet.slice(0, 6))) {
        throw new Error(
          `visible "${visibleText.slice(0, 80)}" does not match api "${expectedSnippet}"`,
        );
      }
    });

    failed += await runCheck('삭제 후 새로고침 시 블록 부활 없음', async () => {
      const { documentId, blockId } = await createFreshDocumentWithTextBlock(page);
      await softDeleteBlock(page, blockId);
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);
      const blocks = await fetchBlocks(page, documentId);
      const zombie = blocks.find((b) => b.id === blockId);
      if (zombie) throw new Error(`deleted block ${blockId} still in load response`);
      const marker = blocks.some((b) => (b.content?.text ?? '').includes('삭제QA마커'));
      if (marker) throw new Error('deleted marker text still visible in another block');
    });

    failed += await runCheck('타이핑 후 idle — 본문 유지 (smoke parity)', async () => {
      const docId = await page.evaluate(async () => {
        const docRes = await fetch('/api/admin/note/documents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ title: `Typing QA ${Date.now()}` }),
        });
        const { document } = await docRes.json();
        await fetch('/api/admin/note/blocks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            documentId: document.id,
            type: 'text',
            content: { text: '', html: '' },
            order_index: 0,
          }),
        });
        return document.id;
      });
      await openDocument(page, docId);
      const row = page.locator('[data-note-block-row]').first();
      const preview = row.locator('[data-note-preview-text]');
      if (await preview.count()) {
        await preview.click();
      } else {
        await row.click({ position: { x: 96, y: 14 } });
      }
      await page.waitForTimeout(500);
      const editor = page.locator('[data-note-block-row]').first().locator('.ProseMirror').first();
      await editor.waitFor({ state: 'visible', timeout: 15000 });
      await editor.click();
      await page.keyboard.type('타이핑유지QA', { delay: 10 });
      await page.locator('div.cursor-text').first().click({ position: { x: 100, y: 200 }, force: true });
      await page.waitForTimeout(800);
      await page.waitForTimeout(3500);
      const text = await page.evaluate(async (id) => {
        const res = await fetch(`/api/admin/note/blocks/load?documentId=${encodeURIComponent(id)}`, {
          credentials: 'include',
        });
        const json = await res.json();
        const blocks = (json.blocks ?? []).filter((b) => b.type === 'text').sort((a, b) => a.order_index - b.order_index);
        return blocks[0]?.content?.text ?? '';
      }, docId);
      if (!text.includes('타이핑유지QA')) {
        const rowText = await page.locator('[data-note-block-row]').first().innerText();
        if (!rowText.includes('타이핑유지QA')) {
          throw new Error(`text lost after idle: api="${text}" row="${rowText}"`);
        }
      }
    });

    await context.close();
  } finally {
    await browser.close();
  }

  if (failed > 0) {
    console.error(`\n${failed} regression check(s) failed.`);
    process.exit(1);
  }
  console.log('\nAll admin note regression checks passed.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
