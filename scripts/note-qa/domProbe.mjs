/**
 * 브라우저 DOM 프로브 — page.evaluate에 주입하는 순수 함수들
 */

export function probeOrderedRowIds() {
  const rows = [...document.querySelectorAll('[data-note-block-row]')].sort((a, b) => {
    const ra = a.getBoundingClientRect();
    const rb = b.getBoundingClientRect();
    return ra.top - rb.top || ra.left - rb.left;
  });
  return rows
    .map((row) => row.getAttribute('data-block-id'))
    .filter((id) => typeof id === 'string' && id.length > 0);
}

export function probeIsTextSelectableRow(blockId) {
  const esc = typeof CSS !== 'undefined' && typeof CSS.escape === 'function'
    ? CSS.escape(blockId)
    : blockId;
  const row = document.querySelector(`[data-note-block-row][data-block-id="${esc}"]`);
  if (!row) return false;
  if (row.querySelector('[data-toggle-title]')) return true;
  if (row.querySelector('[data-note-list-text]')) return true;
  if (row.querySelector('[data-note-preview-text]')) return true;
  if (row.querySelector('.note-rich-editor .ProseMirror')) return true;
  return false;
}

export function probeIsRowCrossHighlighted(blockId) {
  const esc = typeof CSS !== 'undefined' && typeof CSS.escape === 'function'
    ? CSS.escape(blockId)
    : blockId;
  const row = document.querySelector(`[data-note-block-row][data-block-id="${esc}"]`);
  if (!row) return false;
  if (row.classList.contains('note-block-row-cross-full')) return true;
  if (row.querySelector('[data-toggle-title].note-toggle-title-cross-active')) return true;
  if (row.querySelector('.note-list-cross-selected')) return true;
  if (row.querySelector('[data-note-preview-text].note-preview-cross-active')) return true;
  if (row.querySelector('.ProseMirror .note-list-cross-selected')) return true;
  const input = row.querySelector('[data-toggle-title]');
  if (input?.classList.contains('note-toggle-title-cross-active')) return true;
  return false;
}

export function probeRowDragPoint(blockId, edge) {
  const esc = typeof CSS !== 'undefined' && typeof CSS.escape === 'function'
    ? CSS.escape(blockId)
    : blockId;
  const row = document.querySelector(`[data-note-block-row][data-block-id="${esc}"]`);
  if (!row) return null;

  const targets = [
    row.querySelector('[data-toggle-title]'),
    row.querySelector('[data-note-list-text]'),
    row.querySelector('[data-note-preview-text]'),
    row.querySelector('.ProseMirror'),
    row,
  ].filter(Boolean);

  const target = targets[0];
  const rect = target.getBoundingClientRect();
  const y = edge === 'start' ? rect.top + Math.min(12, rect.height / 2) : rect.bottom - Math.min(8, rect.height / 2);
  const x = rect.left + Math.min(48, Math.max(16, rect.width * 0.15));
  return { x, y };
}

export async function fetchDocumentBlockTexts(page) {
  return page.evaluate(async () => {
    const docId = new URL(location.href).searchParams.get('id');
    const res = await fetch(`/api/admin/note/blocks/load?documentId=${docId}&skipReconcile=true`, {
      credentials: 'include',
    });
    const json = await res.json();
    const map = {};
    for (const b of json.blocks ?? []) {
      const content = b.content ?? {};
      let text = '';
      if (b.type === 'toggle') {
        text = typeof content.title === 'string' && content.title
          ? content.title
          : (typeof content.text === 'string' ? content.text : '');
      } else if (typeof content.text === 'string') {
        text = content.text.replace(/^[\s•◦\-\d.]+\s*/, '');
      }
      map[b.id] = { type: b.type, text: text.trim() };
    }
    return map;
  });
}

export async function clearCrossSelectState(page) {
  await page.keyboard.press('Escape');
  await page.waitForTimeout(120);
  await page.evaluate(() => {
    document.body.classList.remove('note-cross-text-active');
    document.querySelectorAll('.note-block-row-cross-full').forEach((el) => {
      el.classList.remove('note-block-row-cross-full');
    });
    document.querySelectorAll('.note-preview-cross-active').forEach((el) => {
      el.classList.remove('note-preview-cross-active');
      el.querySelector('[data-note-preview-cross-overlay]')?.remove();
    });
    document.querySelectorAll('[data-toggle-title].note-toggle-title-cross-active').forEach((el) => {
      el.classList.remove('note-toggle-title-cross-active', 'note-toggle-title-cross-full');
    });
    const sel = window.getSelection();
    if (sel?.rangeCount) sel.removeAllRanges();
  });
  await page.waitForTimeout(100);
}

export async function crossDragBetweenRows(page, anchorId, hoverId) {
  await page.evaluate(
    async ({ anchorId: aId, hoverId: hId }) => {
      function dragPoint(blockId, edge) {
        const esc = CSS.escape(blockId);
        const row = document.querySelector(`[data-note-block-row][data-block-id="${esc}"]`);
        if (!row) return null;
        row.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        const targets = [
          row.querySelector('[data-toggle-title]'),
          row.querySelector('[data-note-list-text]'),
          row.querySelector('[data-note-preview-text]'),
          row.querySelector('.ProseMirror'),
          row,
        ].filter(Boolean);
        const target = targets[0];
        const rect = target.getBoundingClientRect();
        const y = edge === 'start'
          ? rect.top + Math.min(12, rect.height / 2)
          : rect.bottom - Math.min(8, rect.height / 2);
        const x = rect.left + Math.min(48, Math.max(16, rect.width * 0.15));
        return { x, y, target };
      }

      const anchor = dragPoint(aId, 'start');
      const hover = dragPoint(hId, 'end');
      if (!anchor || !hover) {
        throw new Error(`drag points missing: ${aId} → ${hId}`);
      }

      const pe = (type, x, y, buttons = 1) => new PointerEvent(type, {
        bubbles: true,
        cancelable: true,
        composed: true,
        clientX: x,
        clientY: y,
        button: 0,
        buttons,
        pointerId: 1,
        pointerType: 'mouse',
        isPrimary: true,
      });

      anchor.target.dispatchEvent(pe('pointerdown', anchor.x, anchor.y, 1));

      const steps = 24;
      for (let i = 1; i <= steps; i += 1) {
        const t = i / steps;
        const x = anchor.x + (hover.x - anchor.x) * t;
        const y = anchor.y + (hover.y - anchor.y) * t;
        document.dispatchEvent(pe('pointermove', x, y, 1));
        await new Promise((resolve) => setTimeout(resolve, 12));
      }

      document.dispatchEvent(pe('pointerup', hover.x, hover.y, 0));
    },
    { anchorId, hoverId },
  );
  await page.waitForTimeout(400);
}
