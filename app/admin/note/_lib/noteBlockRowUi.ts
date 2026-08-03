import { setPendingEditorClick } from '../_components/noteEditorRegistry';
import { isColumnContainerBlock } from './noteColumnBlock';
import { isNoteTextSurfaceTarget, notePointerTargetElement } from './notePointerTarget';

export const EMPTY_BLOCK_PLACEHOLDER = "명령어는 '/'를 입력하세요.";

export const NOTE_BLOCK_HOVER_BRIDGE = 'absolute -left-[120px] top-0 bottom-0 z-[1] w-[120px]';

export const DROP_TARGET_ROW =
  'z-[1] rounded-sm bg-blue-100/90 ring-2 ring-blue-400 shadow-[inset_0_0_0_1px_rgba(59,130,246,0.25)]';

/** 토글 안으로 드롭 시 파란 배경 표시 */
export const DROP_INSIDE_BLOCK_ROW =
  'rounded bg-blue-50 ring-2 ring-blue-300';

/** BlockHandleMenu 기본 크기 — viewport flip/clamp에 사용 */
export const NOTE_BLOCK_HANDLE_MENU_WIDTH = 248;
export const NOTE_BLOCK_HANDLE_MENU_EST_HEIGHT = 292;

/** 점6개 메뉴: 하단/우측에서 잘리지 않게 위·왼쪽으로 flip + clamp */
export function resolveNoteBlockHandleMenuPosition(input: {
  anchorRect: Pick<DOMRect, 'top' | 'bottom' | 'left' | 'right'>;
  menuWidth?: number;
  menuHeight?: number;
  gap?: number;
  viewportPadding?: number;
  viewportWidth?: number;
  viewportHeight?: number;
}): { top: number; left: number } {
  const menuWidth = input.menuWidth ?? NOTE_BLOCK_HANDLE_MENU_WIDTH;
  const menuHeight = input.menuHeight ?? NOTE_BLOCK_HANDLE_MENU_EST_HEIGHT;
  const gap = input.gap ?? 4;
  const pad = input.viewportPadding ?? 8;
  const vh = input.viewportHeight
    ?? (typeof window !== 'undefined' ? window.innerHeight : menuHeight + pad * 2);
  const vw = input.viewportWidth
    ?? (typeof window !== 'undefined' ? window.innerWidth : menuWidth + pad * 2);

  const spaceBelow = vh - input.anchorRect.bottom - pad;
  const spaceAbove = input.anchorRect.top - pad;
  let top = spaceBelow >= menuHeight || spaceBelow >= spaceAbove
    ? input.anchorRect.bottom + gap
    : input.anchorRect.top - menuHeight - gap;
  top = Math.max(pad, Math.min(top, Math.max(pad, vh - menuHeight - pad)));

  let left = input.anchorRect.left;
  left = Math.max(pad, Math.min(left, Math.max(pad, vw - menuWidth - pad)));
  return { top, left };
}

/** 플라이아웃(전환/색): 오른쪽 공간 없으면 왼쪽으로 */
export function resolveNoteBlockHandleFlyoutPosition(input: {
  rowRect: Pick<DOMRect, 'top' | 'left' | 'right'>;
  flyoutWidth?: number;
  viewportPadding?: number;
  viewportWidth?: number;
}): { top: number; left: number } {
  const flyoutWidth = input.flyoutWidth ?? 220;
  const pad = input.viewportPadding ?? 8;
  const vw = input.viewportWidth
    ?? (typeof window !== 'undefined' ? window.innerWidth : flyoutWidth + pad * 2);
  const preferRight = input.rowRect.right + flyoutWidth + pad <= vw;
  const left = preferRight
    ? input.rowRect.right
    : Math.max(pad, input.rowRect.left - flyoutWidth);
  return { top: input.rowRect.top, left };
}

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

/** list/todo — 자식을 sibling BlockRow로 렌더. toggle/columnList/column은 인라인 컨테이너 */
export function blockExternalizesChildren(type: string): boolean {
  if (isColumnContainerBlock(type)) return false;
  if (type === 'toggle') return false;
  return type === 'bulletList' || type === 'numberedList' || type === 'todo';
}
