/**
 * Admin Note — 다층 불변식 QA (Playwright)
 *
 * 사례 나열이 아니라 규칙 + 조합 스캔으로 교차선택·복사·UI 잔상을 방어한다.
 *
 * Usage:
 *   node scripts/note-invariant-qa.mjs [baseUrl]
 *   node scripts/note-invariant-qa.mjs http://localhost:3000 --doc=7c095438-...
 *   node scripts/note-invariant-qa.mjs http://localhost:3000 --quick  (쌍 스캔 축소)
 */
import {
  NOTE_QA_DOCUMENTS,
  attachPageDiagnostics,
  createNoteQaContext,
  loadPlaywrightChromium,
  runCheck,
} from './note-qa/shared.mjs';
import {
  auditContinuity,
  buildCrossDragPairs,
} from './note-qa/crossDragPairs.mjs';
import {
  clearCrossSelectState,
  crossDragBetweenRows,
  fetchDocumentBlockTexts,
} from './note-qa/domProbe.mjs';

const cliArgs = process.argv.slice(2);
const QUICK = cliArgs.includes('--quick');
const docArg = cliArgs.find((a) => a.startsWith('--doc='));
const ONLY_DOC = docArg ? docArg.slice('--doc='.length) : null;
const baseArg = cliArgs.find((a) => !a.startsWith('--'));
const BASE = (process.env.NOTE_QA_BASE_URL || baseArg || 'http://localhost:3000').replace(/\/$/, '');

const TEXT_TYPES = new Set([
  'text', 'heading', 'heading2', 'heading3',
  'bulletList', 'numberedList', 'todo', 'callout', 'toggle', 'code',
]);

async function runDocumentSuite(page, doc, pageErrors) {
  let failed = 0;
  const prefix = `[${doc.name}]`;

  await page.goto(`${BASE}/admin/note?id=${doc.id}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);

  failed += await runCheck(`${prefix} structural: block rows render`, async () => {
    const n = await page.locator('[data-note-block-row]').count();
    if (n < doc.minRows) throw new Error(`expected >=${doc.minRows} rows, got ${n}`);
  });

  failed += await runCheck(`${prefix} invariant: preview not stuck invisible`, async () => {
    const previews = page.locator('[data-note-preview-text]');
    const count = await previews.count();
    let bad = 0;
    for (let i = 0; i < Math.min(count, 12); i += 1) {
      const el = previews.nth(i);
      const visible = await el.isVisible();
      const opacity = await el.evaluate((node) => {
        const child = node.querySelector(':scope > div, :scope > p');
        if (!child) return 1;
        return Number.parseFloat(getComputedStyle(child).opacity) || 1;
      });
      if (!visible || opacity < 0.1) bad += 1;
    }
    if (bad > 0) throw new Error(`${bad} preview(s) invisible or opacity~0`);
  });

  const visualOrder = await page.evaluate(() => {
    const rows = [...document.querySelectorAll('[data-note-block-row]')].sort((a, b) => {
      const ra = a.getBoundingClientRect();
      const rb = b.getBoundingClientRect();
      return ra.top - rb.top || ra.left - rb.left;
    });
    return rows.map((r) => r.getAttribute('data-block-id')).filter(Boolean);
  });


  const textSelectableIds = [];
  for (const id of visualOrder) {
    const ok = await page.evaluate(
      (blockId) => {
        const esc = CSS.escape(blockId);
        const row = document.querySelector(`[data-note-block-row][data-block-id="${esc}"]`);
        if (!row) return false;
        if (row.querySelector('[data-toggle-title]')) return true;
        if (row.querySelector('[data-note-list-text]')) return true;
        if (row.querySelector('[data-note-preview-text]')) return true;
        if (row.querySelector('.note-rich-editor .ProseMirror')) return true;
        return false;
      },
      id,
    );
    if (ok) textSelectableIds.push(id);
  }

  failed += await runCheck(`${prefix} structural: enough text-selectable rows`, async () => {
    if (textSelectableIds.length < doc.minSelectable) {
      throw new Error(`need ${doc.minSelectable}+ selectable, got ${textSelectableIds.length}`);
    }
  });

  const blockTexts = await fetchDocumentBlockTexts(page);
  const maxPairs = QUICK ? 8 : 40;
  const pairs = buildCrossDragPairs(textSelectableIds.length, { maxPairs });

  failed += await runCheck(
    `${prefix} invariant: cross-drag continuity (${pairs.length} pair scan)`,
    async () => {
      const failures = [];
      for (const [loIdx, hiIdx] of pairs) {
        const anchorId = textSelectableIds[loIdx];
        const hoverId = textSelectableIds[hiIdx];
        if (!anchorId || !hoverId || anchorId === hoverId) continue;

        await clearCrossSelectState(page);
        await crossDragBetweenRows(page, anchorId, hoverId);

        const highlighted = await page.evaluate((ids) => {
          const result = {};
          for (const blockId of ids) {
            const esc = CSS.escape(blockId);
            const row = document.querySelector(`[data-note-block-row][data-block-id="${esc}"]`);
            if (!row) { result[blockId] = false; continue; }
            result[blockId] = row.classList.contains('note-block-row-cross-full')
              || !!row.querySelector('[data-toggle-title].note-toggle-title-cross-active')
              || !!row.querySelector('.note-list-cross-selected')
              || !!row.querySelector('[data-note-preview-text].note-preview-cross-active')
              || !!row.querySelector('.ProseMirror .note-list-cross-selected');
          }
          return result;
        }, visualOrder);

        const isTextSelectable = (id) => textSelectableIds.includes(id);
        const isHighlighted = (id) => !!highlighted[id];
        const { missingHighlights } = auditContinuity(
          visualOrder,
          anchorId,
          hoverId,
          isTextSelectable,
          isHighlighted,
        );

        if (missingHighlights.length > 0) {
          failures.push(`${anchorId.slice(0, 8)}→${hoverId.slice(0, 8)} missing=[${missingHighlights.join(', ')}]`);
        }
      }
      if (failures.length > 0) {
        throw new Error(`${failures.length} pair(s) broke continuity:\n  ${failures.slice(0, 6).join('\n  ')}`);
      }
    },
  );

  failed += await runCheck(`${prefix} invariant: cross-drag clipboard covers span text`, async () => {
    if (textSelectableIds.length < 2) return;
    const anchorId = textSelectableIds[0];
    const hoverId = textSelectableIds[textSelectableIds.length - 1];

    await clearCrossSelectState(page);
    await crossDragBetweenRows(page, anchorId, hoverId);
    await page.keyboard.press('Control+c');
    await page.waitForTimeout(200);
    const clip = await page.evaluate(() => navigator.clipboard.readText().catch(() => ''));

    const span = auditContinuity(
      visualOrder,
      anchorId,
      hoverId,
      (id) => textSelectableIds.includes(id),
      () => true,
    ).span;

    const missingInClip = [];
    for (const id of span) {
      const meta = blockTexts[id];
      if (!meta || !TEXT_TYPES.has(meta.type)) continue;
      const snippet = meta.text.slice(0, Math.min(4, meta.text.length));
      if (snippet.length > 0 && !clip.includes(snippet)) {
        missingInClip.push(`${id.slice(0, 8)}:"${snippet}"`);
      }
    }
    if (missingInClip.length > 0) {
      throw new Error(`clipboard missing span chunks: ${missingInClip.slice(0, 8).join(', ')}`);
    }
    if (!clip.trim()) throw new Error('clipboard empty after full-span drag');
  });

  failed += await runCheck(`${prefix} invariant: focus mid-block then full drag`, async () => {
    if (textSelectableIds.length < 4) return;
    const mid = textSelectableIds[Math.floor(textSelectableIds.length / 2)];
    const row = page.locator(`[data-note-block-row][data-block-id="${mid}"]`);
    const listText = row.locator('[data-note-list-text], [data-note-preview-text]').first();
    if (await listText.count()) {
      await listText.click({ position: { x: 24, y: 10 }, force: true });
      await page.waitForTimeout(500);
    } else {
      const toggle = row.locator('[data-toggle-title]');
      if (await toggle.count()) {
        await toggle.click({ force: true });
        await page.waitForTimeout(300);
      }
    }

    const anchorId = textSelectableIds[0];
    const hoverId = textSelectableIds[textSelectableIds.length - 1];
    await crossDragBetweenRows(page, anchorId, hoverId);

    const missing = [];
    for (const id of visualOrder) {
      if (!textSelectableIds.includes(id)) continue;
      const anchorIdx = visualOrder.indexOf(anchorId);
      const hoverIdx = visualOrder.indexOf(hoverId);
      const lo = Math.min(anchorIdx, hoverIdx);
      const hi = Math.max(anchorIdx, hoverIdx);
      const idx = visualOrder.indexOf(id);
      if (idx < lo || idx > hi) continue;
      const lit = await page.evaluate((blockId) => {
        const esc = CSS.escape(blockId);
        const row = document.querySelector(`[data-note-block-row][data-block-id="${esc}"]`);
        return !!row && (
          row.classList.contains('note-block-row-cross-full')
          || !!row.querySelector('[data-toggle-title].note-toggle-title-cross-active')
          || !!row.querySelector('.note-list-cross-selected')
          || !!row.querySelector('[data-note-preview-text].note-preview-cross-active')
        );
      }, id);
      if (!lit) missing.push(id);
    }
    if (missing.length > 0) {
      throw new Error(`after mid-focus drag, unhighlighted: ${missing.slice(0, 5).join(', ')}`);
    }
  });

  failed += await runCheck(`${prefix} invariant: API text preserved after drag+click`, async () => {
    const before = await fetchDocumentBlockTexts(page);
    const row = page.locator('[data-note-block-row][data-list-sibling="true"]').first();
    if (!(await row.count())) return;
    await row.locator('[data-note-list-text], [data-note-preview-text]').first().click({
      position: { x: 20, y: 10 },
      force: true,
    });
    await page.waitForTimeout(600);
    const after = await fetchDocumentBlockTexts(page);
    const beforeKeys = Object.keys(before).filter((k) => before[k].text.length > 0);
    let lost = 0;
    for (const k of beforeKeys) {
      if (!after[k]?.text && before[k].text) lost += 1;
    }
    if (lost > 0) throw new Error(`${lost} block(s) lost text in API after click`);
  });

  failed += await runCheck(`${prefix} invariant: no stuck cross-active hiding content`, async () => {
    const stuck = await page.locator('[data-note-preview-text].note-preview-cross-active').count();
    if (stuck === 0) return;
    const bad = await page.locator('[data-note-preview-text].note-preview-cross-active').first().evaluate((node) => {
      const child = node.querySelector(':scope > div, :scope > p');
      return child ? Number.parseFloat(getComputedStyle(child).opacity) < 0.1 : false;
    });
    if (bad) throw new Error('stuck note-preview-cross-active with hidden content');
  });

  if (pageErrors.length) {
    console.error(`${prefix} PAGE ERRORS:`, [...new Set(pageErrors)].slice(0, 5).join(' | '));
    failed += 1;
  }

  return failed;
}

async function isQaDocumentAvailable(page, doc) {
  const result = await page.evaluate(async (documentId) => {
    const res = await fetch(`/api/admin/note/bootstrap?documentId=${encodeURIComponent(documentId)}`, {
      credentials: 'include',
    });
    if (!res.ok) return { ok: false, reason: `bootstrap ${res.status}` };
    const json = await res.json();
    const listed = Array.isArray(json.documents)
      && json.documents.some((item) => item.id === documentId && !item.deleted_at);
    const hasBlocks = json.documentId === documentId
      && Array.isArray(json.blocks)
      && json.blocks.length > 0;
    return {
      ok: listed && hasBlocks,
      reason: listed ? 'no active blocks' : 'document unavailable',
    };
  }, doc.id);
  if (result.ok) return true;
  if (ONLY_DOC) {
    throw new Error(`[${doc.name}] QA document unavailable: ${result.reason}`);
  }
  console.warn(`SKIP [${doc.name}] QA document unavailable: ${result.reason}`);
  return false;
}

async function main() {
  const chromium = await loadPlaywrightChromium();
  const browser = await chromium.launch({ headless: true });
  let failed = 0;
  let checkedDocs = 0;
  const pageErrors = [];

  try {
    const context = await createNoteQaContext(browser, BASE);
    const page = await context.newPage();
    attachPageDiagnostics(page, pageErrors);
    await page.goto(`${BASE}/admin/note`, { waitUntil: 'domcontentloaded' });

    const docs = ONLY_DOC
      ? NOTE_QA_DOCUMENTS.filter((d) => d.id === ONLY_DOC)
      : NOTE_QA_DOCUMENTS;

    if (docs.length === 0) {
      throw new Error(`unknown --doc=${ONLY_DOC}`);
    }

    for (const doc of docs) {
      if (!(await isQaDocumentAvailable(page, doc))) continue;
      checkedDocs += 1;
      failed += await runDocumentSuite(page, doc, pageErrors);
    }
    if (checkedDocs === 0) {
      throw new Error('no available QA documents');
    }
  } finally {
    await browser.close();
  }

  console.log(
    failed
      ? `\n${failed} invariant check(s) failed`
      : `\nAll note invariant checks passed (${checkedDocs} doc(s), ${QUICK ? 'quick' : 'full'} scan)`,
  );
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
