import type { Editor } from '@tiptap/react';
import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import {
  applyBlockPreviewCrossHighlight,
  clearBlockPreviewCrossHighlight,
  extractBlockPreviewSlice,
  getBlockPreviewTextRoot,
  hoverBlockPreviewTextPos,
} from './noteBlockPreviewCrossSelect';

export type ListCrossRange = {
  blockId: string;
  from: number;
  to: number;
  surface?: 'editor' | 'toggle-title' | 'preview' | 'list-preview';
};

export const listCrossHighlightKey = new PluginKey<DecorationSet>('listCrossHighlight');

function safeDocRange(doc: ProseMirrorNode, from: number, to: number) {
  const docSize = doc.content.size;
  const safeFrom = Math.max(1, Math.min(from, docSize - 1));
  const safeTo = Math.max(safeFrom, Math.min(to, docSize - 1));
  return { from: safeFrom, to: safeTo };
}

function buildDecorationSet(doc: ProseMirrorNode, from: number, to: number) {
  const range = safeDocRange(doc, from, to);
  if (range.to <= range.from) return DecorationSet.empty;
  return DecorationSet.create(doc, [
    Decoration.inline(range.from, range.to, { class: 'note-list-cross-selected' }),
  ]);
}

export const NoteListCrossHighlightExtension = Extension.create({
  name: 'noteListCrossHighlight',
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: listCrossHighlightKey,
        state: {
          init: () => DecorationSet.empty,
          apply(tr, old) {
            const meta = tr.getMeta(listCrossHighlightKey);
            if (meta === 'clear') return DecorationSet.empty;
            if (meta && typeof meta.from === 'number' && typeof meta.to === 'number') {
              return buildDecorationSet(tr.doc, meta.from, meta.to);
            }
            if (tr.docChanged) return old.map(tr.mapping, tr.doc);
            return old;
          },
        },
        props: {
          decorations(state) {
            return listCrossHighlightKey.getState(state) ?? DecorationSet.empty;
          },
        },
      }),
    ];
  },
});

export function applyListCrossHighlight(editor: Editor, from: number, to: number) {
  const view = editor.view;
  if (!view || (editor as { isDestroyed?: boolean }).isDestroyed) return;
  view.dispatch(
    editor.state.tr
      .setMeta(listCrossHighlightKey, { from, to })
      .setMeta('addToHistory', false),
  );
}

export function clearListCrossHighlight(editor: Editor) {
  const view = editor.view;
  if (!view || (editor as { isDestroyed?: boolean }).isDestroyed) return;
  view.dispatch(
    editor.state.tr
      .setMeta(listCrossHighlightKey, 'clear')
      .setMeta('addToHistory', false),
  );
}

let getEditorFromRegistry: (blockId: string) => Editor | null = () => null;
let getToggleTitleFromRegistry: (blockId: string) => HTMLInputElement | null = () => null;

export function bindListCrossHighlightEditorLookup(
  lookup: (blockId: string) => Editor | null,
  toggleTitleLookup?: (blockId: string) => HTMLInputElement | null,
) {
  getEditorFromRegistry = lookup;
  if (toggleTitleLookup) getToggleTitleFromRegistry = toggleTitleLookup;
}

export function extractListCrossText(ranges: ListCrossRange[]): string {
  return ranges
    .map(({ blockId, from, to, surface }) => {
      if (surface === 'toggle-title') {
        const input = getToggleTitleFromRegistry(blockId);
        if (!input) return '';
        const len = input.value.length;
        const safeFrom = Math.max(0, Math.min(from, len));
        const safeTo = Math.max(safeFrom, Math.min(to, len));
        return input.value.slice(safeFrom, safeTo);
      }
      if (surface === 'list-preview' || surface === 'preview') {
        return extractBlockPreviewSlice(blockId, from, to);
      }
      const editor = getEditorFromRegistry(blockId);
      if (!editor) return '';
      const range = safeDocRange(editor.state.doc, from, to);
      return editor.state.doc.textBetween(range.from, range.to, '\n');
    })
    .filter((chunk) => chunk.length > 0)
    .join('\n');
}
