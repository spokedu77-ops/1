/** 블록 마퀴·텍스트 드래그 선택이 서로 간섭하지 않게 */
export const noteBlockMarqueeGuard = {
  active: false,
};

export const noteTextDragGuard = {
  active: false,
};

const textDragListeners = new Set<() => void>();

export function setNoteTextDragGuardActive(active: boolean) {
  if (noteTextDragGuard.active === active) return;
  noteTextDragGuard.active = active;
  if (typeof document !== 'undefined') {
    document.body.classList.toggle('note-text-drag-active', active);
  }
  textDragListeners.forEach((listener) => listener());
}

export function subscribeNoteTextDragGuard(listener: () => void) {
  textDragListeners.add(listener);
  return () => {
    textDragListeners.delete(listener);
  };
}

export function isNoteMarqueeBlockingText(): boolean {
  return noteBlockMarqueeGuard.active;
}
