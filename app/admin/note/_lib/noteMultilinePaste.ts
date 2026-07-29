import { defaultBlockContent } from './constants';
import { DECORATION_CONTENT_KEYS } from './noteContentPatch';
import { MULTILINE_PASTE_SPLIT_TYPES } from './noteBlockTypes';
import type { NoteBlock } from './types';

export function canSplitMultilinePasteToBlocks(blockType: string): boolean {
  return MULTILINE_PASTE_SPLIT_TYPES.has(blockType as NoteBlock['type']);
}

/** 제목 블록 뒤 줄은 일반 문단으로 */
export function insertTypeForMultilinePasteFollowUp(blockType: NoteBlock['type']): NoteBlock['type'] {
  if (blockType === 'heading' || blockType === 'heading2' || blockType === 'heading3') return 'text';
  return blockType;
}

/**
 * HTML/MD 파서가 전부 `text`로 준 멀티라인 paste를 앵커 타입에 맞춘다.
 * 첫 줄만 고치면 후속 줄이 text로 남고, callout 장식(icon)만 묻어 콜아웃이 “사라진” 것처럼 보인다.
 */
export function normalizeMultilinePasteSpecsForAnchor<T extends { type: NoteBlock['type'] }>(
  blockType: NoteBlock['type'],
  specs: T[],
): T[] {
  if (specs.length <= 1) return specs;
  if (specs[0]?.type !== 'text' || blockType === 'text') return specs;
  const followType = insertTypeForMultilinePasteFollowUp(blockType);
  return specs.map((spec, index) => {
    if (spec.type !== 'text') return spec;
    return { ...spec, type: index === 0 ? blockType : followType };
  });
}

export function contentForMultilinePasteLine(
  blockType: NoteBlock['type'],
  line: string,
  sourceContent: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  const base = defaultBlockContent(blockType) as Record<string, unknown>;
  const next: Record<string, unknown> = { ...base, text: line };
  for (const key of DECORATION_CONTENT_KEYS) {
    if (sourceContent && key in sourceContent) next[key] = sourceContent[key];
  }
  if (blockType === 'todo') next.checked = false;
  if (sourceContent?.placedInToggle === true) next.placedInToggle = true;
  if (sourceContent?.createdInsideToggle === true) next.createdInsideToggle = true;
  return next;
}
