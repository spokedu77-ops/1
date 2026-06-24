import { Extension } from '@tiptap/core';
import { Plugin, TextSelection } from '@tiptap/pm/state';
import { crossDragSpanFromOrder } from '@/app/admin/note/_lib/noteCrossSelectSpan';
import { startTextDragSession } from '../_lib/noteTextDragSession';
import {
  buildDocumentCrossBlockMeta,
  hoverDocumentCaretPos,
} from '../_lib/noteCrossSelectBlockMeta';
import {
  applyCrossBlockSelection,
  blockIdFromPoint,
  clearAllCrossSelectState,
  finalizeCrossSelection,
} from './noteCrossSelect';
import { getOrderedBlockRowIds } from './noteBlockIdFromPoint';
import { noteBlockMarqueeGuard } from '../_lib/noteBlockMarqueeGuard';

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

              startTextDragSession({
                anchor,
                startX: event.clientX,
                startY: event.clientY,
                getSpanBlockIds: (hoverId) => (
                  crossDragSpanFromOrder(getOrderedBlockRowIds(), anchor.blockId, hoverId)
                ),
                resolveHoverBlockId: (x, y) => blockIdFromPoint(x, y),
                hoverCaretPos: (blockId, x, y) => (
                  blockId === anchorBlockId
                    ? (view.posAtCoords({ left: x, top: y })?.pos ?? view.state.doc.content.size)
                    : hoverDocumentCaretPos(blockId, x, y)
                ),
                getBlockMeta: buildDocumentCrossBlockMeta,
                onDragStart: () => clearAllCrossSelectState(),
                onIntraBlock: (x, y) => {
                  const headCoords = view.posAtCoords({ left: x, top: y });
                  if (!headCoords) return;
                  const from = Math.min(anchorPos, headCoords.pos);
                  const to = Math.max(anchorPos, headCoords.pos);
                  view.dispatch(
                    view.state.tr
                      .setSelection(TextSelection.create(view.state.doc, from, to))
                      .setMeta('addToHistory', false),
                  );
                },
                onCrossBlock: (_ranges, x, y) => {
                  const hoverId = blockIdFromPoint(x, y);
                  if (!hoverId) return;
                  applyCrossBlockSelection(anchor, hoverId, x, y);
                },
                onFinalize: (_ranges, x, y) => {
                  finalizeCrossSelection(anchor, x, y);
                },
                onAbort: () => clearAllCrossSelectState(),
              });

              return false;
            },
          },
        },
      }),
    ];
  },
});

function getNoteEditorBlockId(view: { dom: HTMLElement }): string | null {
  const row = view.dom.closest('[data-note-block-row]');
  return row?.getAttribute('data-block-id') ?? null;
}
