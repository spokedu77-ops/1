/** pointer/mouse 이벤트 target이 Text 노드일 때 closest()가 깨지지 않게 보정 */
export function notePointerTargetElement(target: EventTarget | null): HTMLElement | null {
  if (!target) return null;
  if (target instanceof HTMLElement) return target;
  if (target instanceof Node) return target.parentElement;
  return null;
}

export function isNoteTextSurfaceTarget(target: EventTarget | null): boolean {
  const el = notePointerTargetElement(target);
  if (!el) return false;
  return !!el.closest(
    '.ProseMirror, .note-rich-editor, [contenteditable="true"], input, textarea, [data-toggle-title]',
  );
}

/** 블록 마퀴 zone으로 pointer 이벤트가 올라가지 않게 */
export function stopNoteEditorPointerBubble(e: { stopPropagation: () => void }) {
  e.stopPropagation();
}
