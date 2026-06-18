import type { MarkdownBlockTrigger } from '../_components/noteBulletInput';
import { stripListItemMarkerPrefix, stripMarkdownTriggerForTypeChange } from '../_components/noteBulletInput';
import { defaultBlockContent } from './constants';
import type { NoteBlock } from './types';

const TEXT_CARRYING_BLOCK_TYPES = new Set<NoteBlock['type']>([
  'text', 'heading', 'heading2', 'heading3', 'bulletList', 'numberedList', 'todo', 'callout', 'code',
]);

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
  return {
    ...base,
    text,
    ...(!didStripTrigger && html !== undefined ? { html } : {}),
    ...(!didStripTrigger && bodyHtml !== undefined ? { bodyHtml } : {}),
    ...(typeof prev.checked === 'boolean' && nextType === 'todo' ? { checked: prev.checked } : {}),
  };
}
