import { Extension } from '@tiptap/core';
import { Plugin, TextSelection } from '@tiptap/pm/state';
import {
  applyCrossBlockSelection,
  blockIdFromPoint,
  clearAllCrossSelectState,
  finalizeCrossSelection,
  restoreIntraBlockSelection,
} from './noteCrossSelect';
import { noteBlockMarqueeGuard } from '../_lib/noteBlockMarqueeGuard';

const DRAG_THRESHOLD = 3;

/** ProseMirror 기본 드래그 선택 + 블록 간 교차 텍스트 선택 */
export const NoteTextDragSelectExtension = Extension.create({
  name: 'noteTextDragSelect',
  priority: 1000,
  addProseMirrorPlugins() {
    return [
      new Plugin({
        props: {
          handleDOMEvents: {
            mousedown(view, event) {
              if (event.button !== 0) return false;
              if (event.shiftKey || event.ctrlKey || event.metaKey) return false;
              if (noteBlockMarqueeGuard.active) return false;

              const target = event.target as HTMLElement | null;
              if (target?.closest?.('a, button, img')) return false;

              const coords = view.posAtCoords({ left: event.clientX, top: event.clientY });
              if (!coords) return false;

              const anchorBlockId = getNoteEditorBlockId(view);
              if (!anchorBlockId) return false;

              event.preventDefault();
              view.focus();
              clearAllCrossSelectState();

              const anchorPos = coords.pos;
              const anchor = { blockId: anchorBlockId, pos: anchorPos };
              let dragActive = false;
              let crossBlockActive = false;
              const startX = event.clientX;
              const startY = event.clientY;

              const applyIntraBlockRange = (headPos: number) => {
                const from = Math.min(anchorPos, headPos);
                const to = Math.max(anchorPos, headPos);
                const { state } = view;
                if (state.selection.from === from && state.selection.to === to) return;
                view.dispatch(
                  state.tr.setSelection(TextSelection.create(state.doc, from, to)),
                );
              };

              applyIntraBlockRange(anchorPos);

              const onMove = (ev: MouseEvent) => {
                if (ev.buttons !== 1) return;
                const dx = Math.abs(ev.clientX - startX);
                const dy = Math.abs(ev.clientY - startY);
                if (!dragActive) {
                  if (dx < DRAG_THRESHOLD && dy < DRAG_THRESHOLD) return;
                  dragActive = true;
                }

                const hoverBlockId = blockIdFromPoint(ev.clientX, ev.clientY);

                if (!hoverBlockId || hoverBlockId === anchorBlockId) {
                  if (crossBlockActive) {
                    crossBlockActive = false;
                    restoreIntraBlockSelection(anchor, ev.clientX, ev.clientY);
                    return;
                  }
                  const headCoords = view.posAtCoords({ left: ev.clientX, top: ev.clientY });
                  if (!headCoords) return;
                  applyIntraBlockRange(headCoords.pos);
                  return;
                }

                // 세로 드래그로 다른 블록 — 교차 텍스트 선택
                if (dx >= dy) return;

                crossBlockActive = true;
                applyCrossBlockSelection(anchor, hoverBlockId, ev.clientX, ev.clientY);
              };

              const onUp = (ev: MouseEvent) => {
                document.removeEventListener('mousemove', onMove);
                document.removeEventListener('mouseup', onUp);
                if (crossBlockActive && dragActive) {
                  finalizeCrossSelection(anchor, ev.clientX, ev.clientY);
                }
              };

              document.addEventListener('mousemove', onMove);
              document.addEventListener('mouseup', onUp);

              return true;
            },
          },
        },
      }),
    ];
  },
});

function getNoteEditorBlockId(view: { dom: HTMLElement; state: unknown }): string | null {
  const editorDom = view.dom;
  const row = editorDom.closest('[data-note-block-row]');
  const fromRow = row?.getAttribute('data-block-id');
  if (fromRow) return fromRow;
  return null;
}
