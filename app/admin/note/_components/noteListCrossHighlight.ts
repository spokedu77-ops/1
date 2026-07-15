import type { Editor } from '@tiptap/react';
import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import {
  extractBlockPreviewSlice,
  getBlockPreviewTextRoot,
} from './noteBlockPreviewCrossSelect';
import { useNoteBlockStore } from '../_store/noteBlockStore';
import { stripListItemMarkerPrefix } from './noteBulletInput';

export type ListCrossRange = {
  blockId: string;
  from: number;
  to: number;
  surface?: 'editor' | 'toggle-title' | 'preview' | 'list-preview';
};

export const listCrossHighlightKey = new PluginKey<DecorationSet>('listCrossHighlight');

function safeDocRange(doc: ProseMirrorNode, from: number, to: number) {
  const docSize = doc.content.size;
  const safeFrom = Math.max(0, Math.min(from, docSize));
  const safeTo = Math.max(safeFrom, Math.min(to, docSize));
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

function blockPlainTextFromStore(blockId: string): string {
  const block = useNoteBlockStore.getState().getBlock(blockId);
  if (!block) return '';
  const content = block.content ?? {};
  if (block.type === 'toggle') {
    if (typeof content.title === 'string' && content.title.length > 0) return content.title;
    return typeof content.text === 'string' ? content.text : '';
  }
  let text = typeof content.text === 'string' ? content.text : '';
  if (block.type === 'bulletList' || block.type === 'numberedList') {
    text = stripListItemMarkerPrefix(text);
  }
  return text;
}

function extractPreviewOrStoreSlice(
  blockId: string,
  from: number,
  to: number,
): string {
  if (getBlockPreviewTextRoot(blockId)) {
    const slice = extractBlockPreviewSlice(blockId, from, to);
    if (slice.length > 0 || to > from) return slice;
  }
  const full = blockPlainTextFromStore(blockId);
  const safeFrom = Math.max(0, Math.min(from, full.length));
  const safeTo = Math.max(safeFrom, Math.min(to, full.length));
  return full.slice(safeFrom, safeTo);
}

let getCrossRangesForClipboard: () => ListCrossRange[] = () => [];
let getListCrossRangesForClipboard: () => ListCrossRange[] = () => [];
let crossClipboardSnapshot: ListCrossRange[] = [];

export function syncCrossClipboardSnapshot(ranges: ListCrossRange[]) {
  crossClipboardSnapshot = ranges.length > 1
    ? ranges.map((range) => ({ ...range }))
    : [];
}

export function clearCrossClipboardSnapshot() {
  crossClipboardSnapshot = [];
}

function resolveClipboardRanges(): ListCrossRange[] {
  const cross = getCrossRangesForClipboard();
  const list = getListCrossRangesForClipboard();
  if (cross.length > 1) return cross;
  if (list.length > 1) return list;
  if (cross.length === 1) return cross;
  if (list.length === 1) return list;
  return crossClipboardSnapshot.length > 1 ? crossClipboardSnapshot : [];
}

export function bindCrossSelectClipboardSources(
  crossRanges: () => ListCrossRange[],
  listRanges: () => ListCrossRange[],
) {
  getCrossRangesForClipboard = crossRanges;
  getListCrossRangesForClipboard = listRanges;
}

export function syncCrossTextActiveBodyClass() {
  if (typeof document === 'undefined') return;
  const active =
    getCrossRangesForClipboard().length > 0
    || getListCrossRangesForClipboard().length > 0;
  document.body.classList.toggle('note-cross-text-active', active);
}

export function extractActiveCrossSelectClipboardText(): string | null {
  const ranges = resolveClipboardRanges();
  if (ranges.length === 0) return null;

  const text = extractListCrossText(ranges);
  if (!text.trim()) return null;
  if (ranges.length === 1) {
    const only = ranges[0];
    if (!only || only.to <= only.from) return null;
  }
  return text;
}

export function extractListCrossText(ranges: ListCrossRange[]): string {
  return ranges
    .map(({ blockId, from, to, surface }) => {
      if (surface === 'toggle-title') {
        const input = getToggleTitleFromRegistry(blockId);
        if (input) {
          const len = input.value.length;
          const safeFrom = Math.max(0, Math.min(from, len));
          const safeTo = Math.max(safeFrom, Math.min(to, len));
          return input.value.slice(safeFrom, safeTo);
        }
        const full = blockPlainTextFromStore(blockId);
        const safeFrom = Math.max(0, Math.min(from, full.length));
        const safeTo = Math.max(safeFrom, Math.min(to, full.length));
        return full.slice(safeFrom, safeTo);
      }
      if (surface === 'list-preview' || surface === 'preview') {
        return extractPreviewOrStoreSlice(blockId, from, to);
      }
      const editor = getEditorFromRegistry(blockId);
      if (editor) {
        const range = safeDocRange(editor.state.doc, from, to);
        return editor.state.doc.textBetween(range.from, range.to, '\n');
      }
      return extractPreviewOrStoreSlice(blockId, from, to);
    })
    .filter((chunk) => chunk.length > 0)
    .join('\n');
}
