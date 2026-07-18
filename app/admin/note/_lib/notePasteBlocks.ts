import { defaultBlockContent } from './constants';
import {
  canSplitMultilinePasteToBlocks,
  contentForMultilinePasteLine,
  insertTypeForMultilinePasteFollowUp,
} from './noteMultilinePaste';
import { defaultImageBlockContent } from './noteImageBlock';
import { normalizeTableContent, type NoteTableContent } from './noteTableBlock';
import { isPageLinkBlock, isTodoBlock, isToggleBlock } from './noteBlockSemantics';
import type { NoteBlock } from './types';

export type PastedBlockSpec = {
  type: NoteBlock['type'];
  text: string;
  html?: string;
  checked?: boolean;
  language?: string;
  imageUrl?: string;
  pageDocumentId?: string;
  caption?: string;
  tableContent?: NoteTableContent;
  listNestLevel?: number;
  collapsed?: boolean;
  children?: PastedBlockSpec[];
};

export function pastedBlocksFromPlainLines(
  blockType: NoteBlock['type'],
  lines: string[],
): PastedBlockSpec[] {
  const followType = insertTypeForMultilinePasteFollowUp(blockType);
  return lines.map((line, index) => ({
    type: index === 0 ? blockType : followType,
    text: line,
  }));
}

export function contentForPastedBlock(
  spec: PastedBlockSpec,
  sourceContent: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  if (spec.type === 'image' && spec.imageUrl) {
    return {
      ...defaultImageBlockContent(),
      url: spec.imageUrl,
      caption: spec.caption ?? '',
    };
  }
  if (spec.type === 'table' && spec.tableContent) {
    return normalizeTableContent(spec.tableContent);
  }
  if (spec.type === 'divider') {
    return {};
  }
  if (isPageLinkBlock(spec)) {
    return {
      ...defaultBlockContent('page'),
      title: spec.text,
      ...(spec.pageDocumentId ? { page_document_id: spec.pageDocumentId } : {}),
    };
  }
  if (isToggleBlock(spec)) {
    const next = { ...defaultBlockContent('toggle') } as Record<string, unknown>;
    next.title = spec.text;
    if (spec.collapsed != null) next.collapsed = spec.collapsed;
    if (sourceContent?.placedInToggle === true) next.placedInToggle = true;
    if (sourceContent?.createdInsideToggle === true) next.createdInsideToggle = true;
    return next;
  }
  const next = contentForMultilinePasteLine(spec.type, spec.text, sourceContent);
  if (spec.html?.trim()) next.html = spec.html;
  if (isTodoBlock(spec)) {
    next.checked = spec.checked ?? false;
    if ((spec.listNestLevel ?? 0) > 0) {
      next.listNestLevel = spec.listNestLevel;
    }
  }
  if (spec.type === 'code' && spec.language) next.language = spec.language;
  return next;
}

export function isStructuralHtmlPasteSpec(spec: PastedBlockSpec): boolean {
  if (spec.type === 'image' || spec.type === 'table' || spec.type === 'divider') return true;
  if (spec.type === 'toggle' && (spec.children?.length ?? 0) > 0) return true;
  return false;
}

export { canSplitMultilinePasteToBlocks as canSplitPasteToBlocks };
