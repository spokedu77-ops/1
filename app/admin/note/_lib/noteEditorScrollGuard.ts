/** 프로그램적 포커스 시 ProseMirror scrollIntoView 억제 */
export const noteSuppressEditorScrollRef = { current: false };

export function suppressNoteEditorScrollBriefly(ms = 180) {
  noteSuppressEditorScrollRef.current = true;
  window.setTimeout(() => {
    noteSuppressEditorScrollRef.current = false;
  }, ms);
}

export function preserveEditorScrollPosition(
  container: HTMLElement | null,
  run: () => void,
) {
  if (!container) {
    run();
    return;
  }
  const top = container.scrollTop;
  const left = container.scrollLeft;
  run();
  const restore = () => {
    container.scrollTop = top;
    container.scrollLeft = left;
  };
  requestAnimationFrame(() => {
    restore();
    requestAnimationFrame(restore);
  });
}

export function focusWithoutScroll(el: HTMLElement | null | undefined) {
  if (!el) return;
  try {
    el.focus({ preventScroll: true });
  } catch {
    el.focus();
  }
}
