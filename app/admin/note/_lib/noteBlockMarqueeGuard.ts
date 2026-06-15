/** 블록 마퀴·텍스트 드래그 선택이 서로 간섭하지 않게 */
export const noteBlockMarqueeGuard = {
  active: false,
};

export const noteTextDragGuard = {
  active: false,
};

export function isNoteMarqueeBlockingText(): boolean {
  return noteBlockMarqueeGuard.active;
}
