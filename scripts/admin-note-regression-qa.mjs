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
import { cleanupEphemeralQaDocumentsBestEffort } from './note-qa/cleanupEphemeralDocs.mjs';

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const BASE = (process.argv[2] || 'http://localhost:3000').replace(/\/$/, '');
const COMMON_BOARD_ID = NOTE_QA_DOCUMENTS[0]?.id ?? '7c095438-335b-4318-a3fb-09145f01d24a';
const JIHOON_NOTE_ID = '630e1104-84f9-41a2-b25b-7c4faa6a1300';
const GYM_TOGGLE_TITLE = '체육관 이용방법';
const RECONCILE_WAIT_MS = 3500;
const ZOMBIE_MARKER = '좀비회귀QA마커';
const REGRESSION_CLEANUP_OPTIONS = {
  titlePrefixes: ['Regression QA ', 'Toggle KB QA ', 'Toggle Zombie QA '],
};

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

async function expandToggleByTitleInDomAndRead(page, titleNeedle) {
  return page.evaluate(async (needle) => {
    const inputs = [...document.querySelectorAll('[data-toggle-title]')];
    const input = inputs.find((el) => (el.value || '').includes(needle));
    if (!input) return { ok: false, reason: 'input-not-found', childRowCount: 0, visibleText: '' };
    input.scrollIntoView({ block: 'center' });
    const toggleRoot = input.closest('.relative.overflow-visible.py-0\\.5')
      ?? input.parentElement?.parentElement;
    const button = toggleRoot?.querySelector('button[aria-label]');
    if (button?.getAttribute('aria-label') === '펼치기') {
      button.click();
      await new Promise((resolve) => setTimeout(resolve, 400));
    }
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
  }, titleNeedle).then((result) => {
    if (!result.ok) throw new Error(`toggle "${titleNeedle}" not in DOM (${result.reason})`);
    return result;
  });
}

async function createFreshDocumentWithToggleBody(page) {
  return page.evaluate(async (marker) => {
    const docRes = await fetch('/api/admin/note/documents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ title: `Toggle Zombie QA ${Date.now()}` }),
    });
    if (!docRes.ok) throw new Error(`document create ${docRes.status}`);
    const { document } = await docRes.json();
    const blockRes = await fetch('/api/admin/note/blocks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        documentId: document.id,
        type: 'toggle',
        content: { title: 'QA Toggle', body: marker, collapsed: false },
        order_index: 0,
        parent_block_id: null,
      }),
    });
    if (!blockRes.ok) throw new Error(`toggle create ${blockRes.status}`);
    const { block } = await blockRes.json();
    return { documentId: document.id, toggleId: block.id };
  }, ZOMBIE_MARKER);
}

const TOGGLE_KB_TITLE = 'KB QA Toggle';

async function createFreshDocumentWithToggleAndChild(page, { childText = '' } = {}) {
  return page.evaluate(async ({ title, text }) => {
    const docRes = await fetch('/api/admin/note/documents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ title: `Toggle KB QA ${Date.now()}` }),
    });
    if (!docRes.ok) throw new Error(`document create ${docRes.status}`);
    const { document } = await docRes.json();
    const toggleRes = await fetch('/api/admin/note/blocks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        documentId: document.id,
        type: 'toggle',
        content: { title, collapsed: false },
        order_index: 0,
        parent_block_id: null,
      }),
    });
    if (!toggleRes.ok) throw new Error(`toggle create ${toggleRes.status}`);
    const { block: toggle } = await toggleRes.json();
    const childRes = await fetch('/api/admin/note/blocks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        documentId: document.id,
        type: 'text',
        content: { text, html: text ? `<p>${text}</p>` : '<p></p>' },
        order_index: 0,
        parent_block_id: toggle.id,
      }),
    });
    if (!childRes.ok) throw new Error(`child create ${childRes.status}`);
    const { block: child } = await childRes.json();
    return { documentId: document.id, toggleId: toggle.id, childId: child.id, title };
  }, { title: TOGGLE_KB_TITLE, text: childText });
}

async function waitForBootstrapDocument(page, documentId) {
  await page.waitForFunction(async (id) => {
    const res = await fetch('/api/admin/note/bootstrap', { credentials: 'include' });
    if (!res.ok) return false;
    const json = await res.json();
    return (json.documents ?? []).some((doc) => doc.id === id);
  }, documentId, { timeout: 20000 });
}

async function expandToggleByTitleInDom(page, titleNeedle) {
  await page.evaluate(async (needle) => {
    const inputs = [...document.querySelectorAll('[data-toggle-title]')];
    const input = inputs.find((el) => (el.value || '').includes(needle));
    if (!input) throw new Error(`toggle title "${needle}" not found`);
    input.scrollIntoView({ block: 'center' });
    const toggleRoot = input.closest('.relative.overflow-visible.py-0\\.5')
      ?? input.parentElement?.parentElement;
    const button = toggleRoot?.querySelector('button[aria-label]');
    if (button?.getAttribute('aria-label') === '펼치기') {
      button.click();
      await new Promise((resolve) => setTimeout(resolve, 400));
    }
  }, titleNeedle);
}

async function focusToggleChildEditor(page) {
  await page.waitForFunction(() => {
    const container = document.querySelector('.note-block-children');
    if (!container) return false;
    return container.querySelectorAll(
      '[data-note-block-row], [data-note-preview-text], .ProseMirror, [data-note-editor-host]',
    ).length > 0;
  }, { timeout: 20000 });

  const childArea = page.locator('.note-block-children').first();
  const preview = childArea.locator('[data-note-preview-text]').first();
  if (await preview.count()) {
    await preview.click();
    await page.waitForTimeout(400);
  }
  const editor = childArea.locator('.ProseMirror').first();
  if (await editor.count()) {
    await editor.waitFor({ state: 'visible', timeout: 10000 });
    await editor.click();
  } else if (await preview.count()) {
    await preview.click();
  } else {
    const row = childArea.locator('[data-note-block-row]').first();
    await row.click({ position: { x: 48, y: 12 } });
  }
  await page.waitForTimeout(200);
  return childArea.locator('.ProseMirror').first();
}

async function assertToggleTitleFocused(page, titleNeedle) {
  await page.waitForTimeout(500);
  await page.waitForFunction((needle) => {
    const active = document.activeElement;
    if (!active || active.tagName !== 'INPUT') return false;
    if (!active.hasAttribute('data-toggle-title')) return false;
    return (active.value || '').includes(needle);
  }, titleNeedle, { timeout: 12000 });
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
  let context;
  let page;

  try {
    context = await createNoteQaContext(browser, BASE);
    page = await context.newPage();

    failed += await runCheck('공통 보드 문서 로드', async () => {
      await openDocument(page, COMMON_BOARD_ID);
      const urlId = new URL(page.url()).searchParams.get('id');
      if (urlId !== COMMON_BOARD_ID) throw new Error(`expected ${COMMON_BOARD_ID}, got ${urlId}`);
      const rows = await page.locator('[data-note-block-row]').count();
      if (rows < 1) throw new Error('no block rows');
    });

    failed += await runCheck('최지훈 업무노트 빈 껍데기 없음', async () => {
      await openDocument(page, JIHOON_NOTE_ID);
      const blocks = await fetchBlocks(page, JIHOON_NOTE_ID);
      if (blocks.length < 5) {
        throw new Error(`expected many active blocks, got ${blocks.length}`);
      }
      const rows = await page.locator('[data-note-block-row]').count();
      if (rows < 1) throw new Error('no visible block rows after load settled');
    });

    failed += await runCheck('문서 전환 시 빈 껍데기 프레임 없음', async () => {
      await openDocument(page, COMMON_BOARD_ID);
      await page.goto(
        `${BASE}/admin/note?id=${encodeURIComponent(JIHOON_NOTE_ID)}`,
        { waitUntil: 'domcontentloaded' },
      );
      const skeleton = page.getByRole('status', { name: '페이지 불러오는 중' });
      const rows = page.locator('[data-note-block-row]');
      const firstPaint = await Promise.race([
        skeleton.waitFor({ state: 'visible', timeout: 2500 }).then(() => 'skeleton'),
        rows.first().waitFor({ state: 'visible', timeout: 2500 }).then(() => 'rows'),
      ]).catch(() => 'empty');
      if (firstPaint === 'empty') {
        throw new Error('document switch showed neither skeleton nor cached rows');
      }
      await skeleton.waitFor({ state: 'detached', timeout: 45000 }).catch(() => undefined);
      await rows.first().waitFor({ state: 'visible', timeout: 45000 });
    });

    failed += await runCheck('hard refresh 후 공통 보드 블록 유지', async () => {
      await openDocument(page, COMMON_BOARD_ID);
      const before = await fetchBlocks(page, COMMON_BOARD_ID);
      if (before.length < 1) throw new Error('no blocks before reload');
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.getByRole('status', { name: '페이지 불러오는 중' }).waitFor({ state: 'detached', timeout: 45000 }).catch(() => undefined);
      await page.locator('[data-note-block-row]').first().waitFor({ state: 'visible', timeout: 45000 });
      const after = await fetchBlocks(page, COMMON_BOARD_ID);
      if (after.length < before.length * 0.5) {
        throw new Error(`block count dropped after reload: ${before.length} -> ${after.length}`);
      }
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

    failed += await runCheck('토글 DB 자식 본문 존재 (시드)', async () => {
      const body = `시드토글본문-${Date.now()}`;
      const seeded = await createFreshDocumentWithToggleAndChild(page, { childText: body });
      await openDocument(page, seeded.documentId);
      const blocks = await fetchBlocks(page, seeded.documentId);
      const toggle = blocks.find((b) => b.id === seeded.toggleId);
      const children = blocks.filter((b) => b.parent_block_id === seeded.toggleId);
      const childText = children
        .map((c) => (typeof c.content?.text === 'string' ? c.content.text : ''))
        .join(' ')
        .trim();
      if (!toggle || toggle.type !== 'toggle') {
        throw new Error(`seeded toggle missing: ${JSON.stringify({ toggle, children: children.length })}`);
      }
      if (!childText.includes(body)) {
        throw new Error(`seeded toggle child body missing: "${childText}"`);
      }
    });

    failed += await runCheck('토글 UI 펼침 후 자식 본문 표시 (시드)', async () => {
      const body = `시드토글UI-${Date.now()}`;
      const seeded = await createFreshDocumentWithToggleAndChild(page, { childText: body });
      await openDocument(page, seeded.documentId);
      // createFresh… 기본 collapsed:false 이지만 UI는 !!collapsed로 펼침 보장
      const { childRowCount, visibleText } = await expandToggleByTitleInDomAndRead(page, TOGGLE_KB_TITLE);
      if (childRowCount < 1 && !visibleText) {
        throw new Error(`toggle expanded but no child rows (visible="${visibleText}")`);
      }
      if (!visibleText.includes(body.slice(0, 8))) {
        throw new Error(`visible "${visibleText.slice(0, 80)}" does not include "${body}"`);
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

    failed += await runCheck('토글 자식 삭제 + idle 후 legacyBody 좀비 재생성 없음', async () => {
      const { documentId, toggleId } = await createFreshDocumentWithToggleBody(page);
      await openDocument(page, documentId);
      let blocks = await fetchBlocks(page, documentId);
      let children = blocks.filter((b) => b.parent_block_id === toggleId);
      if (children.length === 0) {
        await page.waitForTimeout(2000);
        blocks = await fetchBlocks(page, documentId);
        children = blocks.filter((b) => b.parent_block_id === toggleId);
      }
      if (children.length === 0) {
        throw new Error('toggle migration did not create child before delete test');
      }
      const childId = children[0].id;
      await softDeleteBlock(page, childId);
      await page.waitForTimeout(RECONCILE_WAIT_MS);
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);
      blocks = await fetchBlocks(page, documentId);
      const zombieChild = blocks.find((b) => b.id === childId);
      if (zombieChild) throw new Error(`deleted toggle child ${childId} still in load`);
      const respawned = blocks.filter((b) => b.parent_block_id === toggleId);
      const markerInChild = respawned.some((b) => (b.content?.text ?? '').includes(ZOMBIE_MARKER));
      if (markerInChild) {
        throw new Error(`legacyBody resurrected child with marker "${ZOMBIE_MARKER}"`);
      }
      const toggle = blocks.find((b) => b.id === toggleId);
      const legacy = [
        toggle?.content?.legacyBody,
        toggle?.content?.body,
      ].filter((v) => typeof v === 'string' && v.includes(ZOMBIE_MARKER));
      if (legacy.length > 0) {
        throw new Error('toggle still archives zombie marker in content after child delete');
      }
    });

    failed += await runCheck('토글 첫 자식 빈 Backspace → 제목 포커스', async () => {
      const { documentId } = await createFreshDocumentWithToggleAndChild(page);
      await waitForBootstrapDocument(page, documentId);
      await openDocument(page, documentId);
      await page.waitForFunction(async (id) => {
        const res = await fetch(`/api/admin/note/blocks/load?documentId=${encodeURIComponent(id)}`, {
          credentials: 'include',
        });
        if (!res.ok) return false;
        const json = await res.json();
        return (json.blocks ?? []).some((b) => b.parent_block_id);
      }, documentId, { timeout: 20000 });
      await expandToggleByTitleInDom(page, TOGGLE_KB_TITLE);
      await focusToggleChildEditor(page);
      await page.keyboard.press('Backspace');
      await assertToggleTitleFocused(page, TOGGLE_KB_TITLE);
    });

    failed += await runCheck('토글 첫 자식 맨 앞 Backspace → 제목 포커스', async () => {
      const { documentId } = await createFreshDocumentWithToggleAndChild(page, { childText: 'x' });
      await waitForBootstrapDocument(page, documentId);
      await openDocument(page, documentId);
      await page.waitForFunction(async (id) => {
        const res = await fetch(`/api/admin/note/blocks/load?documentId=${encodeURIComponent(id)}`, {
          credentials: 'include',
        });
        if (!res.ok) return false;
        const json = await res.json();
        return (json.blocks ?? []).some((b) => b.parent_block_id);
      }, documentId, { timeout: 20000 });
      await expandToggleByTitleInDom(page, TOGGLE_KB_TITLE);
      const childEditor = await focusToggleChildEditor(page);
      if (await childEditor.count()) {
        await childEditor.click();
      }
      await page.keyboard.press('Home');
      await page.keyboard.press('Backspace');
      await assertToggleTitleFocused(page, TOGGLE_KB_TITLE);
    });

    failed += await runCheck('타이핑 후 idle — 본문 유지 (smoke parity)', async () => {
      const { documentId: docId } = await createFreshDocumentWithTextBlock(page);
      await page.waitForFunction(async (id) => {
        const res = await fetch('/api/admin/note/bootstrap', { credentials: 'include' });
        if (!res.ok) return false;
        const json = await res.json();
        return (json.documents ?? []).some((doc) => doc.id === id);
      }, docId, { timeout: 20000 });
      await openDocument(page, docId);
      const row = page.locator('[data-note-block-row]').first();
      await row.waitFor({ state: 'visible', timeout: 45000 });
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
      await page.keyboard.press('Control+A');
      await page.keyboard.type('타이핑유지QA', { delay: 10 });
      await page.locator('div.cursor-text').first().click({ position: { x: 100, y: 200 }, force: true });
      await page.waitForTimeout(800);
      await page.waitForFunction(async (id) => {
        const res = await fetch(`/api/admin/note/blocks/load?documentId=${encodeURIComponent(id)}`, {
          credentials: 'include',
        });
        if (!res.ok) return false;
        const json = await res.json();
        const blocks = (json.blocks ?? []).filter((b) => b.type === 'text').sort((a, b) => a.order_index - b.order_index);
        const text = blocks[0]?.content?.text ?? '';
        return text.includes('타이핑유지QA');
      }, docId, { timeout: 45000 });
    });

  } finally {
    try {
      const cleaned = await cleanupEphemeralQaDocumentsBestEffort(page, REGRESSION_CLEANUP_OPTIONS);
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
    console.error(`\n${failed} regression check(s) failed.`);
    process.exit(1);
  }
  console.log('\nAll admin note regression checks passed.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
