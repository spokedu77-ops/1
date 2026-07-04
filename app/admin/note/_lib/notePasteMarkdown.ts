import type { NoteBlock } from './types';
import type { PastedBlockSpec } from './notePasteBlocks';

const HEADING_RE = /^(#{1,3})\s+(.+)$/;
const BULLET_RE = /^(\s*)([-*+•])\s+(.+)$/;
const ORDERED_RE = /^(\s*)(\d+)[.)]\s+(.+)$/;
const TODO_RE = /^(\s*)\[( |x|X)\]\s+(.+)$/;
const QUOTE_RE = /^>\s+(.+)$/;
const CALLOUT_RE = /^!!\s+(.+)$/;
const DIVIDER_RE = /^(-{3,}|\*{3,}|_{3,})$/;
const CODE_FENCE_RE = /^```(\w*)$/;

function markerDepth(indent: string): number {
  return Math.max(0, Math.floor(indent.replace(/\t/g, '  ').length / 2));
}

export function parseMarkdownPlainToBlocks(text: string): PastedBlockSpec[] | null {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  if (lines.length === 0) return null;

  const specs: PastedBlockSpec[] = [];
  let inCode = false;
  let codeLang = 'plain';
  let codeLines: string[] = [];
  let sawBlockMarker = false;

  const flushCode = () => {
    if (codeLines.length === 0) return;
    specs.push({
      type: 'code',
      text: codeLines.join('\n'),
      language: codeLang || 'plain',
    });
    codeLines = [];
    codeLang = 'plain';
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    if (!line.trim() && !inCode) continue;

    const fence = line.match(CODE_FENCE_RE);
    if (fence) {
      sawBlockMarker = true;
      if (inCode) {
        flushCode();
        inCode = false;
      } else {
        inCode = true;
        codeLang = fence[1]?.trim() || 'plain';
      }
      continue;
    }

    if (inCode) {
      codeLines.push(line);
      continue;
    }

    if (DIVIDER_RE.test(line.trim())) {
      sawBlockMarker = true;
      specs.push({ type: 'divider', text: '' });
      continue;
    }

    const heading = line.match(HEADING_RE);
    if (heading) {
      sawBlockMarker = true;
      const level = heading[1].length;
      const type: NoteBlock['type'] = level === 1 ? 'heading' : level === 2 ? 'heading2' : 'heading3';
      specs.push({ type, text: heading[2].trim() });
      continue;
    }

    const todo = line.match(TODO_RE);
    if (todo) {
      sawBlockMarker = true;
      specs.push({
        type: 'todo',
        text: todo[3].trim(),
        checked: todo[2].toLowerCase() === 'x',
        listNestLevel: markerDepth(todo[1]),
      });
      continue;
    }

    const callout = line.match(CALLOUT_RE);
    if (callout) {
      sawBlockMarker = true;
      specs.push({ type: 'callout', text: callout[1].trim() });
      continue;
    }

    const quote = line.match(QUOTE_RE);
    if (quote) {
      sawBlockMarker = true;
      specs.push({ type: 'quote', text: quote[1].trim() });
      continue;
    }

    const bullet = line.match(BULLET_RE);
    if (bullet) {
      sawBlockMarker = true;
      specs.push({
        type: 'bulletList',
        text: bullet[3].trim(),
        listNestLevel: markerDepth(bullet[1]),
      });
      continue;
    }

    const ordered = line.match(ORDERED_RE);
    if (ordered) {
      sawBlockMarker = true;
      specs.push({
        type: 'numberedList',
        text: ordered[3].trim(),
        listNestLevel: markerDepth(ordered[1]),
      });
      continue;
    }

    specs.push({ type: 'text', text: line.trim() });
  }

  if (inCode) flushCode();
  if (!sawBlockMarker && specs.length <= 1) return null;
  if (specs.length === 0) return null;
  return specs;
}

export function shouldSplitMarkdownPaste(specs: PastedBlockSpec[]): boolean {
  if (specs.length > 1) return true;
  const only = specs[0];
  if (!only) return false;
  return only.type !== 'text';
}
