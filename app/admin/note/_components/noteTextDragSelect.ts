import { Extension } from '@tiptap/core';

import { Plugin } from '@tiptap/pm/state';

import {

  applyCrossBlockSelection,

  blockIdFromPoint,

  clearAllCrossSelectState,

  finalizeCrossSelection,

} from './noteCrossSelect';

import { noteBlockMarqueeGuard, noteTextDragGuard } from '../_lib/noteBlockMarqueeGuard';



const DRAG_THRESHOLD = 3;



/** 블록 간 교차 텍스트 선택 — 같은 블록 안은 ProseMirror 기본 드래그 사용 */

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

              const anchor = { blockId: anchorBlockId, pos: anchorPos, surface: 'editor' as const };

              let crossBlockActive = false;

              let dragActive = false;

              const startX = event.clientX;

              const startY = event.clientY;

              let captured = false;



              const releaseCapture = () => {

                if (!captured) return;

                captured = false;

                try {

                  view.dom.releasePointerCapture(event.pointerId);

                } catch {

                  // ignore

                }

              };



              const cleanup = () => {

                noteTextDragGuard.active = false;

                document.removeEventListener('pointermove', onMove);

                document.removeEventListener('pointerup', onUp);

                document.removeEventListener('pointercancel', onUp);

                releaseCapture();

              };



              const onMove = (ev: PointerEvent) => {

                if (ev.buttons !== 1) return;

                if (noteBlockMarqueeGuard.active) {

                  cleanup();

                  return;

                }



                const dx = Math.abs(ev.clientX - startX);

                const dy = Math.abs(ev.clientY - startY);

                if (!dragActive) {

                  if (dx < DRAG_THRESHOLD && dy < DRAG_THRESHOLD) return;

                  dragActive = true;

                }



                const hoverBlockId = blockIdFromPoint(ev.clientX, ev.clientY);

                if (!hoverBlockId || hoverBlockId === anchorBlockId) return;



                if (!crossBlockActive) {

                  crossBlockActive = true;

                  noteTextDragGuard.active = true;

                  clearAllCrossSelectState();

                  try {

                    view.dom.setPointerCapture(event.pointerId);

                    captured = true;

                  } catch {

                    // ignore

                  }

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

