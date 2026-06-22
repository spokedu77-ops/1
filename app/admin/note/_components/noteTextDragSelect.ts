import { Extension } from '@tiptap/core';
import { Plugin, TextSelection } from '@tiptap/pm/state';
import {
  applyCrossBlockSelection,
  blockIdFromPoint,
  clearAllCrossSelectState,
  finalizeCrossSelection,
  restoreIntraBlockSelection,
} from './noteCrossSelect';
import { noteBlockMarqueeGuard, setNoteTextDragGuardActive } from '../_lib/noteBlockMarqueeGuard';

const DRAG_THRESHOLD = 3;

/** 클릭은 TipTap 기본 처리, 드래그 시 블록 내·블록 간 텍스트 선택 */
export const NoteTextDragSelectExtension = Extension.create({
  name: 'noteTextDragSelect',
  priority: 1000,
  addProseMirrorPlugins() {
    return [
      new Plugin({
        props: {
          handleDOMEvents: {
            pointerdown(view, event) {
              if (event.button !== 0) return false;
              if (event.shiftKey || event.ctrlKey || event.metaKey) return false;
              if (noteBlockMarqueeGuard.active) return false;

              const target = event.target as HTMLElement | null;
              if (target?.closest?.('a, button, img')) return false;

              const coords = view.posAtCoords({ left: event.clientX, top: event.clientY });
              if (!coords) return false;

              const anchorBlockId = getNoteEditorBlockId(view);
              if (!anchorBlockId) return false;

              const anchorPos = coords.pos;
              const anchor = {
                blockId: anchorBlockId,
                pos: anchorPos,
                surface: 'editor' as const,
              };
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
                  state.tr
                    .setSelection(TextSelection.create(state.doc, from, to))
                    .setMeta('addToHistory', false),
                );
              };

              const cleanup = () => {
                setNoteTextDragGuardActive(false);
                document.removeEventListener('pointermove', onMove);
                document.removeEventListener('pointerup', onUp);
                document.removeEventListener('pointercancel', onUp);
              };

              const onMove = (ev: PointerEvent) => {
                if (ev.buttons !== 1) return;
                if (noteBlockMarqueeGuard.active) {
                  cleanup();
                  clearAllCrossSelectState();
                  return;
                }

                const dx = Math.abs(ev.clientX - startX);
                const dy = Math.abs(ev.clientY - startY);
                if (!dragActive) {
                  if (dx < DRAG_THRESHOLD && dy < DRAG_THRESHOLD) return;
                  dragActive = true;
                  clearAllCrossSelectState();
                }

                const hoverBlockId = blockIdFromPoint(ev.clientX, ev.clientY);

                if (!hoverBlockId || hoverBlockId === anchorBlockId) {
                  if (crossBlockActive) {
                    crossBlockActive = false;
                    setNoteTextDragGuardActive(false);
                    restoreIntraBlockSelection(anchor, ev.clientX, ev.clientY);
                    return;
                  }
                  ev.preventDefault();
                  const headCoords = view.posAtCoords({ left: ev.clientX, top: ev.clientY });
                  if (!headCoords) return;
                  applyIntraBlockRange(headCoords.pos);
                  return;
                }

                ev.preventDefault();
                if (!crossBlockActive) {
                  crossBlockActive = true;
                  setNoteTextDragGuardActive(true);
                }
                applyCrossBlockSelection(anchor, hoverBlockId, ev.clientX, ev.clientY);
              };

              const onUp = (ev: PointerEvent) => {
                if (crossBlockActive && dragActive) {
                  finalizeCrossSelection(anchor, ev.clientX, ev.clientY);
                }
                cleanup();
              };

              document.addEventListener('pointermove', onMove);
              document.addEventListener('pointerup', onUp);
              document.addEventListener('pointercancel', onUp);

              return false;
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
