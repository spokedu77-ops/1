import {
  isMultiBlockCrossSelect,
  resolveCrossRanges,
  TEXT_DRAG_THRESHOLD_PX,
  type BlockCrossMeta,
  type CrossSelectAnchor,
  type CrossSelectRange,
} from './noteCrossSelectCore';
import { noteBlockMarqueeGuard, setNoteTextDragGuardActive } from './noteBlockMarqueeGuard';

export type TextDragSessionOptions = {
  anchor: CrossSelectAnchor;
  startX: number;
  startY: number;
  getSpanBlockIds: (hoverId: string) => string[];
  resolveHoverBlockId: (clientX: number, clientY: number) => string | null;
  hoverCaretPos: (blockId: string, clientX: number, clientY: number) => number;
  getBlockMeta: (blockId: string) => BlockCrossMeta | null;
  filterSelectableSpan?: (blockIds: string[]) => string[];
  onDragStart?: () => void;
  onIntraBlock: (clientX: number, clientY: number) => void;
  onCrossBlock: (ranges: CrossSelectRange[], clientX: number, clientY: number) => void;
  onFinalize: (ranges: CrossSelectRange[], clientX: number, clientY: number) => void;
  onAbort?: () => void;
};

/**
 * 노션식 텍스트 드래그 세션 — pointerdown 이후 move/up을 단일 규칙으로 처리.
 * TipTap·목록·토글 제목·미리보기 모두 이 세션을 공유한다.
 */
export function startTextDragSession(options: TextDragSessionOptions): () => void {
  let dragStarted = false;
  let crossBlockActive = false;

  const cleanup = () => {
    setNoteTextDragGuardActive(false);
    document.removeEventListener('pointermove', onMove, true);
    document.removeEventListener('pointerup', onUp, true);
    document.removeEventListener('pointercancel', onUp, true);
  };

  const onMove = (ev: PointerEvent) => {
    if (ev.buttons !== 1) return;
    if (noteBlockMarqueeGuard.active) {
      cleanup();
      options.onAbort?.();
      return;
    }

    const dx = Math.abs(ev.clientX - options.startX);
    const dy = Math.abs(ev.clientY - options.startY);
    if (!dragStarted) {
      if (dx < TEXT_DRAG_THRESHOLD_PX && dy < TEXT_DRAG_THRESHOLD_PX) return;
      dragStarted = true;
      options.onDragStart?.();
    }

    const hoverId = options.resolveHoverBlockId(ev.clientX, ev.clientY);

    if (!hoverId || hoverId === options.anchor.blockId) {
      if (crossBlockActive) {
        crossBlockActive = false;
        setNoteTextDragGuardActive(false);
        options.onIntraBlock(ev.clientX, ev.clientY);
        return;
      }
      ev.preventDefault();
      options.onIntraBlock(ev.clientX, ev.clientY);
      return;
    }

    const span = options.getSpanBlockIds(hoverId);
    const selectableSpan = options.filterSelectableSpan
      ? options.filterSelectableSpan(span)
      : span;
    if (selectableSpan.length <= 1) {
      if (crossBlockActive) {
        crossBlockActive = false;
        setNoteTextDragGuardActive(false);
        options.onAbort?.();
      }
      return;
    }

    const ranges = resolveCrossRanges(
      span,
      options.anchor,
      hoverId,
      options.hoverCaretPos(hoverId, ev.clientX, ev.clientY),
      options.getBlockMeta,
    );

    if (!isMultiBlockCrossSelect(ranges)) return;

    ev.preventDefault();
    if (!crossBlockActive) {
      crossBlockActive = true;
      setNoteTextDragGuardActive(true);
    }
    options.onCrossBlock(ranges, ev.clientX, ev.clientY);
  };

  const onUp = (ev: PointerEvent) => {
    const wasCross = crossBlockActive;
    const wasDragging = dragStarted;
    cleanup();

    if (!wasDragging) return;

    if (wasCross) {
      const hoverId = options.resolveHoverBlockId(ev.clientX, ev.clientY) ?? options.anchor.blockId;
      const span = options.getSpanBlockIds(hoverId);
      const ranges = resolveCrossRanges(
        span,
        options.anchor,
        hoverId,
        options.hoverCaretPos(hoverId, ev.clientX, ev.clientY),
        options.getBlockMeta,
      );
      if (isMultiBlockCrossSelect(ranges)) {
        ev.preventDefault();
        options.onFinalize(ranges, ev.clientX, ev.clientY);
        return;
      }
    }

    options.onAbort?.();
  };

  document.addEventListener('pointermove', onMove, true);
  document.addEventListener('pointerup', onUp, true);
  document.addEventListener('pointercancel', onUp, true);

  return cleanup;
}
