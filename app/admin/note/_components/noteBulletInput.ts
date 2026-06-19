import { TextSelection } from '@tiptap/pm/state';
import type { EditorView } from '@tiptap/pm/view';
import type { NoteBlock } from '../_lib/types';

export const TEXT_INDENT_UNIT = '\u00A0\u00A0\u00A0\u00A0';

const BULLET_MARKERS = ['• ', '◦ ', '▪ '] as const;
const MAX_BULLET_LEVEL = BULLET_MARKERS.length - 1;

export type ParsedTextLine = {
  level: number;
  prefixLength: number;
  body: string;
  hasBullet: boolean;
};

export function parseTextBlockLine(text: string): ParsedTextLine {
  let remaining = text;
  let level = 0;

  while (remaining.startsWith(TEXT_INDENT_UNIT)) {
    level += 1;
    remaining = remaining.slice(TEXT_INDENT_UNIT.length);
  }
  while (remaining.startsWith('\t')) {
    level += 1;
    remaining = remaining.slice(1);
  }
  while (remaining.startsWith('    ')) {
    level += 1;
    remaining = remaining.slice(4);
  }

  const prefixBeforeBullet = text.length - remaining.length;

  for (const marker of BULLET_MARKERS) {
    if (!remaining.startsWith(marker)) continue;
    return {
      level,
      prefixLength: prefixBeforeBullet + marker.length,
      body: remaining.slice(marker.length),
      hasBullet: true,
    };
  }

  return {
    level,
    prefixLength: prefixBeforeBullet,
    body: remaining,
    hasBullet: false,
  };
}

export function bulletMarkerForLevel(level: number): string {
  const idx = Math.max(0, Math.min(level, MAX_BULLET_LEVEL));
  return BULLET_MARKERS[idx];
}

/** 목록 블록 content.text에 섞인 마커(-, •, 1. 등) 제거 — UI 글리프와 중복 방지 */
export function stripListItemMarkerPrefix(text: string): string {
  const parsed = parseTextBlockLine(text);
  if (parsed.hasBullet) return parsed.body;
  let body = parsed.body;
  if (body === '-' || body === '*') return '';
  body = body.replace(/^[-*]\s*/, '');
  body = body.replace(/^\d+\.\s*/, '');
  for (const marker of BULLET_MARKERS) {
    if (body.startsWith(marker)) {
      body = body.slice(marker.length);
      break;
    }
  }
  return body;
}

/** 목록 블록 저장·동기화 시 content.text/html에서 마커 문자 정리 */
export function normalizeListBlockContentRecord(
  content: Record<string, unknown>,
): Record<string, unknown> {
  const hadHtml = typeof content.html === 'string' && content.html.length > 0;
  const hadBodyHtml = typeof content.bodyHtml === 'string' && content.bodyHtml.length > 0;

  if (typeof content.text !== 'string') {
    if (!hadHtml && !hadBodyHtml) return content;
    const next: Record<string, unknown> = { ...content };
    delete next.html;
    delete next.bodyHtml;
    return next;
  }

  const text = stripListItemMarkerPrefix(content.text);
  const textChanged = text !== content.text;
  if (!textChanged && !hadHtml && !hadBodyHtml) return content;

  const next: Record<string, unknown> = { ...content, text };
  delete next.html;
  delete next.bodyHtml;
  return next;
}

export function buildLinePrefix(level: number, withBullet: boolean): string {
  const indent = TEXT_INDENT_UNIT.repeat(Math.max(0, level));
  return withBullet ? indent + bulletMarkerForLevel(level) : indent;
}

function replaceBlockText(
  view: EditorView,
  blockStart: number,
  blockEnd: number,
  newText: string,
  cursorOffset: number,
  oldPrefixLength: number,
) {
  const parsed = parseTextBlockLine(newText);
  const bodyOffset = Math.max(0, cursorOffset - oldPrefixLength);
  const nextCursor = blockStart + parsed.prefixLength + Math.min(bodyOffset, parsed.body.length);
  const tr = view.state.tr.insertText(newText, blockStart, blockEnd);
  tr.setSelection(TextSelection.create(tr.doc, nextCursor));
  view.dispatch(tr);
}

export type MarkdownBlockTrigger =
  | 'heading' | 'heading2' | 'heading3'
  | 'todo' | 'toggle' | 'divider' | 'callout' | 'code'
  | 'bulletList' | 'numberedList';

/** 서버·bootstrap 로드 직후 목록 블록 content 정리 (부모·하위 문서 공통) */
export function normalizeLoadedNoteBlocks(blocks: NoteBlock[]): NoteBlock[] {
  return blocks.map((block) => {
    if (block.type !== 'bulletList' && block.type !== 'numberedList') return block;
    const content = normalizeListBlockContentRecord((block.content ?? {}) as Record<string, unknown>);
    if (content === block.content) return block;
    return { ...block, content };
  });
}

/** 줄 맨 앞 마크다운 트리거 + Space → 블록 타입 변환 */
export function tryConvertMarkdownBlockTrigger(view: EditorView): MarkdownBlockTrigger | null {
  const { $from } = view.state.selection;
  if (!$from.parent.isTextblock) return null;

  const blockStart = $from.start($from.depth);
  const textBefore = view.state.doc.textBetween(blockStart, $from.pos);
  const parsed = parseTextBlockLine(textBefore);
  if (parsed.level > 0) return null;

  const token = parsed.body.trim();
  // 순서 중요: ### → ## → # 순으로 검사
  if (token === '###') return 'heading3';
  if (token === '##') return 'heading2';
  if (token === '#') return 'heading';
  if (token === '[]' || token === '[ ]') return 'todo';
  if (token === '>') return 'toggle';
  if (token === '---') return 'divider';
  if (token === '!!') return 'callout';
  if (token === '```') return 'code';
  if (token === '-' || token === '*') return 'bulletList';
  if (/^\d+\.$/.test(token)) return 'numberedList';
  return null;
}

/** 마크다운 트리거(+ Space)만으로 타입 변환할 때 본문에 남은 트리거 문자 제거 */
export function stripMarkdownTriggerForTypeChange(
  text: string,
  nextType: MarkdownBlockTrigger,
): string {
  const parsed = parseTextBlockLine(text);
  if (parsed.level > 0) return text;

  const token = parsed.body.trim();
  const body = parsed.body;
  const isTriggerOnly = (() => {
    switch (nextType) {
      case 'heading3':
        return token === '###';
      case 'heading2':
        return token === '##';
      case 'heading':
        return token === '#';
      case 'todo':
        return token === '[]' || token === '[ ]';
      case 'toggle':
        return token === '>';
      case 'divider':
        return token === '---';
      case 'callout':
        return token === '!!';
      case 'code':
        return token === '```';
      case 'bulletList':
        return body === '*' || body === '-';
      case 'numberedList':
        return /^\d+\.$/.test(token);
      default:
        return false;
    }
  })();

  return isTriggerOnly ? '' : text;
}

export function tryConvertMarkdownBulletTrigger(view: EditorView): boolean {
  const { $from } = view.state.selection;
  if (!$from.parent.isTextblock) return false;

  const blockStart = $from.start($from.depth);
  const textBefore = view.state.doc.textBetween(blockStart, $from.pos);
  const parsed = parseTextBlockLine(textBefore);
  if (parsed.body !== '*' && parsed.body !== '-') return false;

  const marker = bulletMarkerForLevel(parsed.level);
  const replaceFrom = $from.pos - 1;
  const tr = view.state.tr.delete(replaceFrom, $from.pos).insertText(marker, replaceFrom);
  tr.setSelection(TextSelection.create(tr.doc, replaceFrom + marker.length));
  view.dispatch(tr);
  return true;
}

export function adjustBulletIndent(view: EditorView, direction: 'in' | 'out'): boolean {
  const { $from } = view.state.selection;
  if (!$from.parent.isTextblock) return false;

  const blockStart = $from.start($from.depth);
  const blockEnd = $from.end($from.depth);
  const blockText = view.state.doc.textBetween(blockStart, blockEnd);
  const parsed = parseTextBlockLine(blockText);
  if (!parsed.hasBullet) return false;

  const cursorOffset = $from.pos - blockStart;

  if (direction === 'in') {
    const newLevel = Math.min(parsed.level + 1, MAX_BULLET_LEVEL);
    const newText = buildLinePrefix(newLevel, true) + parsed.body;
    replaceBlockText(view, blockStart, blockEnd, newText, cursorOffset, parsed.prefixLength);
    return true;
  }

  if (parsed.level === 0) {
    const newText = parsed.body;
    replaceBlockText(view, blockStart, blockEnd, newText, cursorOffset, parsed.prefixLength);
    return true;
  }

  const newLevel = parsed.level - 1;
  const newText = buildLinePrefix(newLevel, true) + parsed.body;
  replaceBlockText(view, blockStart, blockEnd, newText, cursorOffset, parsed.prefixLength);
  return true;
}

export function continueBulletOnEnter(view: EditorView): boolean {
  const { state } = view;
  const { $from } = state.selection;
  if (!$from.parent.isTextblock) return false;

  const blockStart = $from.start($from.depth);
  const blockEnd = $from.end($from.depth);
  const blockText = state.doc.textBetween(blockStart, blockEnd);
  const parsed = parseTextBlockLine(blockText);
  if (!parsed.hasBullet) return false;

  if (parsed.body.trim() === '') {
    const newText = parsed.level > 0 ? buildLinePrefix(parsed.level - 1, true) : '';
    replaceBlockText(view, blockStart, blockEnd, newText, 0, parsed.prefixLength);
    return true;
  }

  const prefix = buildLinePrefix(parsed.level, true);
  let tr = state.tr.split($from.pos);
  const newBlockPos = tr.selection.$from.start(tr.selection.$from.depth);
  tr = tr.insertText(prefix, newBlockPos);
  tr.setSelection(TextSelection.create(tr.doc, newBlockPos + prefix.length));
  view.dispatch(tr);
  return true;
}

export function indentPlainTextBlock(view: EditorView, direction: 'in' | 'out'): boolean {
  const from = view.state.selection.$from;
  const blockStart = from.start(from.depth);
  const blockText = from.parent.textContent ?? '';

  if (direction === 'out') {
    if (blockText.startsWith(TEXT_INDENT_UNIT)) {
      view.dispatch(view.state.tr.delete(blockStart, blockStart + TEXT_INDENT_UNIT.length));
      return true;
    }
    if (blockText.startsWith('\t')) {
      view.dispatch(view.state.tr.delete(blockStart, blockStart + 1));
      return true;
    }
    if (blockText.startsWith('    ')) {
      view.dispatch(view.state.tr.delete(blockStart, blockStart + 4));
      return true;
    }
    return true;
  }

  view.dispatch(view.state.tr.insertText(TEXT_INDENT_UNIT, blockStart));
  return true;
}
