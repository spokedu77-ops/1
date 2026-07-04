import { TextSelection } from '@tiptap/pm/state';
import type { EditorView } from '@tiptap/pm/view';
import { ensureNoteBlockVersion } from '../_lib/noteBlockVersion';
import { migrateToggleBodyToChildBlocks } from '../_lib/noteToggleContent';
import type { NoteBlock } from '../_lib/types';

export const TEXT_INDENT_UNIT = '\u00A0\u00A0\u00A0\u00A0';

const BULLET_MARKERS = ['• ', '◦ ', '▪ '] as const;

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
  return BULLET_MARKERS[Math.max(0, level) % BULLET_MARKERS.length];
}

/** 목록 블록 content.text에 섞인 마커(-, •, 1. 등) 제거 — UI 글리프와 중복 방지 */
export function stripListItemMarkerPrefix(text: string): string {
  const parsed = parseTextBlockLine(text);
  if (parsed.hasBullet) return parsed.body;
  let body = parsed.body;
  if (body === '-' || body === '*') return '';
  body = body.replace(/^[-*]\s+/, '');
  body = body.replace(/^\d+\.\s+/, '');
  for (const marker of BULLET_MARKERS) {
    if (body.startsWith(marker)) {
      body = body.slice(marker.length);
      break;
    }
  }
  return body;
}

/** TipTap html 첫 문단 앞 글머리 마커 제거 — 별도 UI 글리프와 중복·밀림 방지 */
export function stripListItemMarkerFromHtml(html: string): string {
  if (!html.trim()) return html;
  return html.replace(
    /^(<p[^>]*>)(\s*(?:&nbsp;|&#160;|\u00a0)*)((?:[-*•◦▪▫]\s+|\d+\.\s+))/i,
    '$1$2',
  );
}

/** 로드 직후 등 — html에 마커(-, *)만 남은 stale 데이터인지 */
function listHtmlLooksLikeStaleMarker(html: string): boolean {
  const stripped = html.replace(/<[^>]+>/g, '').trim();
  if (!stripped) return true;
  if (stripped === '-' || stripped === '*') return true;
  if (/^[-*•◦▪▫]\s*$/.test(stripped)) return true;
  return false;
}

function dropStaleListHtmlFields(content: Record<string, unknown>): Record<string, unknown> {
  let next: Record<string, unknown> | null = null;
  if (typeof content.html === 'string' && listHtmlLooksLikeStaleMarker(content.html)) {
    next = { ...(next ?? content) };
    delete next.html;
  }
  if (typeof content.bodyHtml === 'string' && listHtmlLooksLikeStaleMarker(content.bodyHtml)) {
    next = { ...(next ?? content) };
    delete next.bodyHtml;
  }
  return next ?? content;
}

/** 목록 블록 저장·동기화 시 content.text에서 마커 문자만 정리 (서식 html은 유지) */
export function normalizeListBlockContentRecord(
  content: Record<string, unknown>,
): Record<string, unknown> {
  if (typeof content.text !== 'string') {
    return dropStaleListHtmlFields(content);
  }

  const text = stripListItemMarkerPrefix(content.text);
  let next: Record<string, unknown> = text === content.text ? content : { ...content, text };
  if (typeof next.html === 'string' && next.html.trim()) {
    const cleanedHtml = stripListItemMarkerFromHtml(next.html);
    if (cleanedHtml !== next.html) {
      next = { ...next, html: cleanedHtml };
    }
  }
  return dropStaleListHtmlFields(next);
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

export function resolveMarkdownBlockTriggerFromTextBeforeCursor(
  textBeforeCursor: string,
): MarkdownBlockTrigger | null {
  const parsed = parseTextBlockLine(textBeforeCursor);
  if (parsed.level > 0) return null;

  const token = parsed.body.trim();
  // Order matters: ### -> ## -> #.
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

/** 서버·bootstrap 로드 직후 목록·토글 content 정리 (부모·하위 문서 공통) */
export function prepareLoadedNoteBlocks(blocks: NoteBlock[]): {
  blocks: NoteBlock[];
  toggleMigration: ReturnType<typeof migrateToggleBodyToChildBlocks>;
} {
  const listNormalized = blocks.map((block) => {
    const withVersion = ensureNoteBlockVersion(block);
    if (withVersion.type !== 'bulletList' && withVersion.type !== 'numberedList') {
      return withVersion;
    }
    const content = normalizeListBlockContentRecord((withVersion.content ?? {}) as Record<string, unknown>);
    if (content === withVersion.content) return withVersion;
    return { ...withVersion, content };
  });
  const toggleMigration = migrateToggleBodyToChildBlocks(listNormalized);
  return { blocks: toggleMigration.blocks, toggleMigration };
}

export function normalizeLoadedNoteBlocks(blocks: NoteBlock[]): NoteBlock[] {
  return prepareLoadedNoteBlocks(blocks).blocks;
}

/** 줄 맨 앞 마크다운 트리거 + Space → 블록 타입 변환 */
export function tryConvertMarkdownBlockTrigger(view: EditorView): MarkdownBlockTrigger | null {
  const { $from } = view.state.selection;
  if (!$from.parent.isTextblock) return null;

  const blockStart = $from.start($from.depth);
  const textBefore = view.state.doc.textBetween(blockStart, $from.pos);
  return resolveMarkdownBlockTriggerFromTextBeforeCursor(textBefore);
}

/** Notion-style markdown shortcut: consume the typed trigger before block type conversion. */
export function consumeMarkdownBlockTrigger(view: EditorView): MarkdownBlockTrigger | null {
  const trigger = tryConvertMarkdownBlockTrigger(view);
  if (!trigger) return null;

  const { $from } = view.state.selection;
  const blockStart = $from.start($from.depth);
  const textBefore = view.state.doc.textBetween(blockStart, $from.pos);
  const parsed = parseTextBlockLine(textBefore);
  const triggerStart = blockStart + textBefore.length - parsed.body.length;
  const tr = view.state.tr.delete(triggerStart, $from.pos);
  tr.setSelection(TextSelection.create(tr.doc, triggerStart));
  view.dispatch(tr);
  return trigger;
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
        return token === '*' || token === '-';
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
    const newLevel = parsed.level + 1;
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
