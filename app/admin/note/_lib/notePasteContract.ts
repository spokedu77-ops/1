import type { NoteBlock } from './types';
import {
  buildBlockClipboardPayload,
  serializeBlockClipboardPayload,
} from './noteBlockClipboard';
import { textLikeContentIsBlank } from './noteInputContract';
import {
  isStructuralHtmlPasteSpec,
  type PastedBlockSpec,
} from './notePasteBlocks';

/**
 * C6 Paste — 복사/붙여넣기 단일 계약.
 * 문서 depth·선택 표면(블록 마퀴 vs cross-select)과 무관하게 같은 클립보드·insert 의미.
 */

const FILLABLE_ANCHOR_TYPES = new Set<NoteBlock['type']>([
  'text',
  'todo',
  'bulletList',
  'numberedList',
  'heading',
  'heading2',
  'heading3',
  'quote',
  'callout',
  'toggle',
  'code',
]);

export type NotePasteInsertMode = 'fill-anchor' | 'insert-after';

/** 빈 앵커면 현재 칸을 채우고, 아니면 아래(뒤)에 삽입 — 블록 MIME·HTML/MD 동일 */
export function resolvePasteInsertMode(
  anchor: Pick<NoteBlock, 'type' | 'content'>,
  specs: ReadonlyArray<PastedBlockSpec>,
  options?: {
    /** props content 대신 store/live merge 결과 — 미반영 타이핑 wipe 방지 */
    liveContent?: Record<string, unknown>;
    /** 블록 크롬 클립보드 등: 절대 현재 칸을 덮지 않음 */
    forceInsertAfter?: boolean;
  },
): NotePasteInsertMode {
  if (options?.forceInsertAfter) return 'insert-after';
  if (specs.length === 0) return 'insert-after';
  if (!FILLABLE_ANCHOR_TYPES.has(anchor.type)) return 'insert-after';
  const content = (options?.liveContent ?? anchor.content ?? {}) as Record<string, unknown>;
  if (!textLikeContentIsBlank(content)) return 'insert-after';
  return 'fill-anchor';
}

/** 멀티 블록 선택 → NOTE_BLOCKS_JSON (앱 내 구조 보존). 실패 시 null */
export function resolveStructuredBlocksClipboardPlain(
  blocks: ReadonlyArray<NoteBlock>,
  selectedIds: Iterable<string>,
): string | null {
  const payload = buildBlockClipboardPayload(blocks as NoteBlock[], selectedIds);
  if (!payload || payload.blocks.length === 0) return null;
  return serializeBlockClipboardPayload(payload);
}

/**
 * cross-select 복사: 블록이 2개 이상이면 구조 클립보드, 아니면 plain 슬라이스.
 * plainFallback은 기존 extractActiveCrossSelectClipboardText 결과.
 */
export function resolveCrossSelectClipboardPlain(options: {
  blocks: ReadonlyArray<NoteBlock>;
  blockIds: ReadonlyArray<string>;
  plainFallback: string | null;
}): string | null {
  const uniqueIds = [...new Set(options.blockIds.filter(Boolean))];
  if (uniqueIds.length > 1) {
    return resolveStructuredBlocksClipboardPlain(options.blocks, uniqueIds)
      ?? options.plainFallback;
  }
  return options.plainFallback;
}

/** TipTap이 구조 paste로 claim해야 하는지 — applyPastedBlockSpecs 게이트와 동일 축 */
export function shouldClaimStructuralPasteSpecs(specs: ReadonlyArray<PastedBlockSpec>): boolean {
  if (specs.length === 0) return false;
  if (specs.length > 1) return true;
  const only = specs[0];
  if (!only) return false;
  if (isStructuralHtmlPasteSpec(only)) return true;
  if ((only.listNestLevel ?? 0) > 0) return true;
  if ((only.children?.length ?? 0) > 0) return true;
  // 단일 text(+inline html)는 TipTap 인라인 paste. 그 외 타입은 구조 적용.
  return only.type !== 'text';
}

/** TipTap/문서 핸들러가 구조 paste로 넘겨야 하는지 */
export function shouldApplyStructuralPasteSpecs(specs: ReadonlyArray<PastedBlockSpec>): boolean {
  return shouldClaimStructuralPasteSpecs(specs);
}
