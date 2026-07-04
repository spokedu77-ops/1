import type { NoteBlock } from './types';

/** TipTap 인라인 rich-text 편집기를 쓰는 블록 */
export const INLINE_RICH_TEXT_BLOCK_TYPES = new Set<NoteBlock['type']>([
  'text',
  'heading',
  'heading2',
  'heading3',
  'todo',
  'callout',
  'quote',
  'code',
]);

/** 블록 간 텍스트 cross-select 대상 */
export const TEXT_CROSS_SELECT_BLOCK_TYPES = new Set<NoteBlock['type']>([
  ...INLINE_RICH_TEXT_BLOCK_TYPES,
  'bulletList',
  'numberedList',
  'toggle',
]);

/** Turn into 시 text/html을 옮길 수 있는 블록 */
export const TEXT_CARRYING_BLOCK_TYPES = new Set<NoteBlock['type']>([
  ...INLINE_RICH_TEXT_BLOCK_TYPES,
  'bulletList',
  'numberedList',
]);

/** 멀티라인 paste → 여러 블록으로 쪼개기 */
export const MULTILINE_PASTE_SPLIT_TYPES = new Set<NoteBlock['type']>([
  'text',
  'heading',
  'heading2',
  'heading3',
  'todo',
  'callout',
  'quote',
  'bulletList',
  'numberedList',
]);

/** 맨 앞 Backspace → paragraph 전환 대상 */
export const INLINE_DECORATED_BLOCK_TYPES = new Set<NoteBlock['type']>([
  'heading',
  'heading2',
  'heading3',
  'todo',
  'callout',
  'quote',
  'code',
]);

/** 토글 content에서 자식 블록으로 이전 후 제거하는 레거시 키 */
export const TOGGLE_LEGACY_CONTENT_KEYS = [
  'body',
  'bodyHtml',
  'legacyBody',
  'legacyBodyHtml',
  'images',
] as const;

export function isInlineRichTextBlockType(type: string): boolean {
  return INLINE_RICH_TEXT_BLOCK_TYPES.has(type as NoteBlock['type']);
}
