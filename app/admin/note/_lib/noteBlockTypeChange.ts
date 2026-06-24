import type { MarkdownBlockTrigger } from '../_components/noteBulletInput';
import { stripListItemMarkerPrefix, stripMarkdownTriggerForTypeChange } from '../_components/noteBulletInput';
import { defaultBlockContent } from './constants';
import { normalizeTodoBlockContentRecord } from './noteTodoContent';
import type { NoteBlock } from './types';

const TEXT_CARRYING_BLOCK_TYPES = new Set<NoteBlock['type']>([
  'text', 'heading', 'heading2', 'heading3', 'bulletList', 'numberedList', 'todo', 'callout', 'code',
]);

/** 전환 시 고유 데이터(하위 문서 연결·미디어·표 등)가 사라지는 블록 */
const NON_CONVERTIBLE_FROM_TYPES = new Set<NoteBlock['type']>([
  'page', 'image', 'video', 'table', 'divider',
]);

const NON_CONVERTIBLE_FROM_LABELS: Partial<Record<NoteBlock['type'], string>> = {
  page: '하위 문서(페이지)',
  image: '이미지',
  video: '영상',
  table: '표',
  divider: '구분선',
};

/** 블록 형식 전환이 데이터 손실을 일으키면 사용자에게 보여줄 이유. 허용이면 null */
export function getBlockedTypeChangeReason(
  prevType: NoteBlock['type'],
  nextType: NoteBlock['type'],
  prevContent?: Record<string, unknown> | null,
): string | null {
  if (prevType === nextType) return null;

  if (nextType === 'page') {
    return '하위 문서 블록은「전환」으로 만들 수 없습니다. + 메뉴에서 페이지를 추가하세요.';
  }

  if (NON_CONVERTIBLE_FROM_TYPES.has(prevType)) {
    const label = NON_CONVERTIBLE_FROM_LABELS[prevType] ?? prevType;
    if (prevType === 'page') {
      const pageId = typeof prevContent?.page_document_id === 'string'
        ? prevContent.page_document_id.trim()
        : '';
      const title = typeof prevContent?.title === 'string' ? prevContent.title.trim() : '';
      if (pageId || title) {
        return `${label} 블록은 다른 형식으로 바꿀 수 없습니다. 연결된 문서·제목이 사라집니다.`;
      }
    }
    return `${label} 블록은 다른 형식으로 전환할 수 없습니다.`;
  }

  return null;
}

export function filterTurnIntoCommands<T extends { type: NoteBlock['type'] }>(
  blockType: NoteBlock['type'],
  commands: T[],
  prevContent?: Record<string, unknown> | null,
): T[] {
  return commands.filter(
    (command) => !getBlockedTypeChangeReason(blockType, command.type, prevContent),
  );
}

function readCarriedTextForTypeChange(
  prevContent: Record<string, unknown> | null | undefined,
  prevType: NoteBlock['type'],
): string {
  const prev = prevContent ?? {};
  if (prevType === 'toggle') {
    if (typeof prev.title === 'string' && prev.title.length > 0) return prev.title;
    if (typeof prev.text === 'string') return prev.text;
    return '';
  }
  return typeof prev.text === 'string' ? prev.text : '';
}

/** 블록 타입 변환 시 본문(text/html)을 가능한 한 유지한다. */
export function buildContentForTypeChange(
  prevContent: Record<string, unknown> | null | undefined,
  prevType: NoteBlock['type'],
  nextType: NoteBlock['type'],
): Record<string, unknown> {
  const prev = prevContent ?? {};

  if (nextType === 'toggle') {
    const base = defaultBlockContent('toggle');
    const canCarry = TEXT_CARRYING_BLOCK_TYPES.has(prevType) || prevType === 'toggle';
    if (!canCarry) return base;
    const rawText = readCarriedTextForTypeChange(prevContent, prevType);
    const title = stripMarkdownTriggerForTypeChange(rawText, 'toggle');
    return {
      ...base,
      title,
      ...(typeof prev.depth === 'number' ? { depth: prev.depth } : {}),
      ...(prev.placedInToggle === true ? { placedInToggle: true } : {}),
      ...(prev.createdInsideToggle === true ? { createdInsideToggle: true } : {}),
    };
  }

  if (prevType === 'toggle' && TEXT_CARRYING_BLOCK_TYPES.has(nextType)) {
    const base = defaultBlockContent(nextType);
    const rawText = readCarriedTextForTypeChange(prevContent, prevType);
    const text = stripMarkdownTriggerForTypeChange(rawText, nextType as MarkdownBlockTrigger);
    return {
      ...base,
      text,
      ...(typeof prev.depth === 'number' ? { depth: prev.depth } : {}),
      ...(prev.placedInToggle === true ? { placedInToggle: true } : {}),
      ...(prev.createdInsideToggle === true ? { createdInsideToggle: true } : {}),
    };
  }

  const base = defaultBlockContent(nextType);
  if (!TEXT_CARRYING_BLOCK_TYPES.has(prevType) || !TEXT_CARRYING_BLOCK_TYPES.has(nextType)) {
    return base;
  }
  const rawText = typeof prev.text === 'string' ? prev.text : '';
  let text = TEXT_CARRYING_BLOCK_TYPES.has(nextType)
    ? stripMarkdownTriggerForTypeChange(rawText, nextType as MarkdownBlockTrigger)
    : rawText;
  if (nextType === 'bulletList' || nextType === 'numberedList') {
    text = stripListItemMarkerPrefix(text);
  }
  const didStripTrigger = text !== rawText;
  const html = typeof prev.html === 'string' ? prev.html : undefined;
  const bodyHtml = typeof prev.bodyHtml === 'string' ? prev.bodyHtml : undefined;
  const next = {
    ...base,
    text,
    ...(!didStripTrigger && html !== undefined ? { html } : {}),
    ...(!didStripTrigger && bodyHtml !== undefined ? { bodyHtml } : {}),
    ...(typeof prev.checked === 'boolean' && nextType === 'todo' ? { checked: prev.checked } : {}),
  };
  if (nextType === 'todo') {
    return normalizeTodoBlockContentRecord(next);
  }
  return next;
}
