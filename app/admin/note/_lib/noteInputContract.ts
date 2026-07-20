import type { NoteBlock } from './types';

export type NoteInputInsertReason = 'explicit' | 'enter' | 'paste' | 'duplicate' | 'system';

const BLANK_GUARDED_TYPES = new Set<NoteBlock['type']>([
  'text',
  'todo',
  'bulletList',
  'numberedList',
]);

export function textLikeContentIsBlank(content: Record<string, unknown>): boolean {
  const text = typeof content.text === 'string' ? content.text.trim() : '';
  const title = typeof content.title === 'string' ? content.title.trim() : '';
  const html = typeof content.html === 'string'
    ? content.html
      .replace(/<br\s*\/?>/gi, '')
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .trim()
    : '';
  return !text && !title && !html;
}

export function shouldCreateVisibleBlockFromInput(options: {
  type: NoteBlock['type'];
  content: Record<string, unknown>;
  reason: NoteInputInsertReason;
}): boolean {
  if (!BLANK_GUARDED_TYPES.has(options.type)) return true;
  if (!textLikeContentIsBlank(options.content)) return true;

  // Direct user actions may intentionally create an empty editable row.
  return options.reason === 'explicit'
    || options.reason === 'enter'
    || options.reason === 'duplicate';
}
