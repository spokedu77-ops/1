import { TextSelection } from '@tiptap/pm/state';
import type { EditorView } from '@tiptap/pm/view';

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
