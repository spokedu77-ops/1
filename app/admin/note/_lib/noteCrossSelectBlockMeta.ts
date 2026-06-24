import type { BlockCrossMeta } from './noteCrossSelectCore';
import {
  blockPreviewPlainText,
  getBlockPreviewTextRoot,
  hoverBlockPreviewTextPos,
} from '../_components/noteBlockPreviewCrossSelect';
import { getNoteEditor } from '../_components/noteEditorRegistry';
import {
  blockHasCrossTextContent,
  blockPlainTextFromStore,
  getToggleTitleInput,
  hoverToggleTitlePos,
  preferredCrossSurface,
} from '../_components/noteToggleTitleCrossSelect';
import { resolveListCrossSurface } from '../_components/noteListCrossSelect';

function blockTextEnd(blockId: string, surface: BlockCrossMeta['surface']): number {
  if (surface === 'toggle-title') {
    const input = getToggleTitleInput(blockId);
    if (input && input.value.length > 0) return input.value.length;
    return blockPlainTextFromStore(blockId).length;
  }
  if (surface === 'preview' || surface === 'list-preview') {
    const domLen = blockPreviewPlainText(blockId).length;
    if (domLen > 0) return domLen;
    return blockPlainTextFromStore(blockId).length;
  }
  const editor = getNoteEditor(blockId);
  if (editor) return editor.state.doc.content.size;
  return blockPlainTextFromStore(blockId).length;
}

/** 문서 전체 교차 드래그용 블록 메타 */
export function buildDocumentCrossBlockMeta(blockId: string): BlockCrossMeta | null {
  const hasEditor = !!getNoteEditor(blockId);
  const surface = preferredCrossSurface(blockId, hasEditor)
    ?? (blockHasCrossTextContent(blockId) ? 'preview' : null);
  if (!surface) return null;
  return { surface, textEnd: blockTextEnd(blockId, surface) };
}

/** 목록 형제 교차 드래그용 블록 메타 */
export function buildListCrossBlockMeta(blockId: string): BlockCrossMeta | null {
  const hasEditor = !!getNoteEditor(blockId);
  const hasPreview = !!getBlockPreviewTextRoot(blockId);
  const surface = resolveListCrossSurface(hasEditor, hasPreview);
  return { surface, textEnd: blockTextEnd(blockId, surface) };
}

export function hoverDocumentCaretPos(blockId: string, clientX: number, clientY: number): number {
  const meta = buildDocumentCrossBlockMeta(blockId);
  if (!meta) return 0;
  if (meta.surface === 'toggle-title') {
    const input = getToggleTitleInput(blockId);
    return input ? hoverToggleTitlePos(input, clientX) : 0;
  }
  if (meta.surface === 'preview') {
    return hoverBlockPreviewTextPos(blockId, clientX, clientY);
  }
  const editor = getNoteEditor(blockId);
  if (!editor) return 0;
  const coords = editor.view.posAtCoords({ left: clientX, top: clientY });
  return coords?.pos ?? editor.state.doc.content.size;
}

export function hoverListCaretPos(blockId: string, clientX: number, clientY: number): number {
  const editor = getNoteEditor(blockId);
  if (editor) {
    const coords = editor.view.posAtCoords({ left: clientX, top: clientY });
    return coords?.pos ?? editor.state.doc.content.size;
  }
  if (getBlockPreviewTextRoot(blockId)) {
    return hoverBlockPreviewTextPos(blockId, clientX, clientY);
  }
  return 0;
}
