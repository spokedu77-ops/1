import { getNoteEditor } from './noteEditorRegistry';
import { isRowCrossTextSelectable } from './noteToggleTitleCrossSelect';

/** 화면에 보이는 모든 블록 행 id — 위→아래 문서 순 (필터 없음) */
export function getOrderedBlockRowIds(): string[] {
  if (typeof document === 'undefined') return [];
  const rows = [...document.querySelectorAll<HTMLElement>('[data-note-block-row]')].sort((a, b) => {
    const ra = a.getBoundingClientRect();
    const rb = b.getBoundingClientRect();
    return ra.top - rb.top || ra.left - rb.left;
  });
  return rows
    .map((row) => row.getAttribute('data-block-id'))
    .filter((id): id is string => !!id);
}

/** 화면에 보이는 텍스트/토글 제목 블록 id — 위→아래 문서 순 */
export function getOrderedSelectableBlockIds(): string[] {
  return getOrderedBlockRowIds().filter((id) =>
    isRowCrossTextSelectable(id, !!getNoteEditor(id)),
  );
}

function escapeBlockId(id: string): string {
  if (typeof globalThis.CSS?.escape === 'function') {
    return globalThis.CSS.escape(id);
  }
  return id;
}

/**
 * 포인터 위치의 교차 선택 가능 블록 id.
 * restrictToIds가 있으면 그 집합 안에서만 선택 (목록 형제 드래그 등).
 */
export function resolveNoteBlockIdFromPoint(
  x: number,
  y: number,
  options?: { restrictToIds?: readonly string[] },
): string | null {
  if (typeof document === 'undefined') return null;
  const restrict = options?.restrictToIds ? new Set(options.restrictToIds) : null;

  const elements = document.elementsFromPoint(x, y);
  for (const el of elements) {
    const row = (el as HTMLElement).closest?.('[data-note-block-row]');
    if (!row) continue;
    const id = row.getAttribute('data-block-id');
    if (!id) continue;
    if (restrict && !restrict.has(id)) continue;
    if (isRowCrossTextSelectable(id, !!getNoteEditor(id))) return id;
  }

  const order = getOrderedSelectableBlockIds().filter((id) => !restrict || restrict.has(id));
  if (order.length === 0) return null;

  let bestId: string | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const id of order) {
    const row = document.querySelector<HTMLElement>(
      `[data-note-block-row][data-block-id="${escapeBlockId(id)}"]`,
    );
    if (!row) continue;
    const rect = row.getBoundingClientRect();
    if (y < rect.top - 8 || y > rect.bottom + 8) continue;
    const rowCenterY = (rect.top + rect.bottom) / 2;
    const distance = Math.abs(y - rowCenterY);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestId = id;
    }
  }

  return bestId;
}
