import { setPendingEditorClick } from '../_components/noteEditorRegistry';
import { isNoteTextSurfaceTarget, notePointerTargetElement } from './notePointerTarget';

export const EMPTY_BLOCK_PLACEHOLDER = "명령어는 '/'를 입력하세요.";

export const NOTE_BLOCK_HOVER_BRIDGE = 'absolute -left-[120px] top-0 bottom-0 z-[1] w-[120px]';

export const DROP_TARGET_ROW =
  'z-[1] rounded-sm bg-blue-100/90 ring-2 ring-blue-400 shadow-[inset_0_0_0_1px_rgba(59,130,246,0.25)]';

/** 토글 안으로 드롭 시 파란 배경 표시 */
export const DROP_INSIDE_BLOCK_ROW =
  'rounded bg-blue-50 ring-2 ring-blue-300';

/** row 들여쓰기·줄 여백 등 텍스트 표면 밖을 눌렀을 때 해당 블록 편집기로 포커스 */
export function focusNoteBlockRowFromChrome(
  e: React.PointerEvent<HTMLElement>,
  blockId: string,
  onFocusBlock?: () => void,
) {
  if (e.button !== 0 || !onFocusBlock) return;
  const el = notePointerTargetElement(e.target);
  if (!el) return;
  if (el.closest(
    '.note-block-gutter, button, input, textarea, a, [data-toggle-title], [data-note-ignore-whitespace]',
  )) {
    return;
  }
  if (isNoteTextSurfaceTarget(e.target)) return;
  setPendingEditorClick(blockId, e.clientX, e.clientY);
  onFocusBlock();
}

export function blockRowBgClass(content: Record<string, unknown> | null | undefined): string {
  switch (content?.blockColor) {
    case 'gray':
      return 'rounded-sm bg-neutral-100/90';
    case 'brown':
      return 'rounded-sm bg-amber-50/90';
    case 'orange':
      return 'rounded-sm bg-orange-50/90';
    default:
      return '';
  }
}

export function readBlockColor(content: Record<string, unknown> | null | undefined): string {
  const color = content?.blockColor;
  return typeof color === 'string' && color.length > 0 ? color : 'default';
}

export function noteBlockRowMouseEnter(e: React.MouseEvent<HTMLDivElement>) {
  const row = e.currentTarget;
  let ancestor = row.parentElement?.closest('[data-note-block-row]');
  while (ancestor) {
    ancestor.removeAttribute('data-row-hovered');
    ancestor = ancestor.parentElement?.closest('[data-note-block-row]');
  }
  row.setAttribute('data-row-hovered', '');
}

export function noteBlockRowMouseLeave(e: React.MouseEvent<HTMLDivElement>) {
  e.currentTarget.removeAttribute('data-row-hovered');
}

export function blockExternalizesChildren(type: string): boolean {
  return type === 'toggle' || type === 'bulletList' || type === 'numberedList';
}
