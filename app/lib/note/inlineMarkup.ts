export type InlineMark = 'bold' | 'italic' | 'underline' | 'strike' | 'code';

const MARK_TOKENS: Record<InlineMark, { open: string; close: string }> = {
  bold: { open: '**', close: '**' },
  italic: { open: '*', close: '*' },
  underline: { open: '__', close: '__' },
  strike: { open: '~~', close: '~~' },
  code: { open: '`', close: '`' },
};

export type MarkApplyResult = {
  text: string;
  selectionStart: number;
  selectionEnd: number;
};

function clampRange(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function toggleInlineMark(
  text: string,
  mark: InlineMark,
  selectionStart: number,
  selectionEnd: number,
): MarkApplyResult {
  const source = text ?? '';
  const safeStart = clampRange(selectionStart, 0, source.length);
  const safeEnd = clampRange(selectionEnd, 0, source.length);
  const start = Math.min(safeStart, safeEnd);
  const end = Math.max(safeStart, safeEnd);
  const token = MARK_TOKENS[mark];

  if (start === end) {
    const inserted = `${source.slice(0, start)}${token.open}${token.close}${source.slice(end)}`;
    const caret = start + token.open.length;
    return { text: inserted, selectionStart: caret, selectionEnd: caret };
  }

  const hasOuterWrapped =
    start >= token.open.length &&
    end + token.close.length <= source.length &&
    source.slice(start - token.open.length, start) === token.open &&
    source.slice(end, end + token.close.length) === token.close;
  if (hasOuterWrapped) {
    const nextText =
      `${source.slice(0, start - token.open.length)}${source.slice(start, end)}${source.slice(end + token.close.length)}`;
    const nextStart = start - token.open.length;
    return {
      text: nextText,
      selectionStart: nextStart,
      selectionEnd: nextStart + (end - start),
    };
  }

  const selected = source.slice(start, end);
  const hasWrapped = selected.startsWith(token.open) && selected.endsWith(token.close);
  if (hasWrapped && selected.length >= token.open.length + token.close.length) {
    const unwrapped = selected.slice(token.open.length, selected.length - token.close.length);
    const nextText = `${source.slice(0, start)}${unwrapped}${source.slice(end)}`;
    return {
      text: nextText,
      selectionStart: start,
      selectionEnd: start + unwrapped.length,
    };
  }

  const wrapped = `${token.open}${selected}${token.close}`;
  const nextText = `${source.slice(0, start)}${wrapped}${source.slice(end)}`;
  return {
    text: nextText,
    selectionStart: start + token.open.length,
    selectionEnd: start + token.open.length + selected.length,
  };
}

function escapeHtml(input: string): string {
  return input
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/**
 * 단순/경량 마크업 렌더러
 * - 목표: 빠른 미리보기(노션 완전 호환 X)
 */
export function parseInlineMarkupToHtml(input: string): string {
  const escaped = escapeHtml(input ?? '');

  let html = escaped;
  html = html.replace(/`([^`]+)`/g, '<code class="rounded bg-slate-100 px-1 py-0.5 text-[0.9em]">$1</code>');
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__([^_]+)__/g, '<u>$1</u>');
  html = html.replace(/~~([^~]+)~~/g, '<s>$1</s>');
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  html = html.replace(/\[\[([^[\]]+)\]\]/g, '<span class="rounded bg-blue-50 px-1 text-blue-700">$1</span>');
  html = html.replace(/\n/g, '<br />');

  return html;
}

export function extractWikiLinks(input: string): string[] {
  const source = input ?? '';
  const regex = /\[\[([^[\]]+)\]\]/g;
  const links = new Set<string>();
  let match: RegExpExecArray | null = regex.exec(source);
  while (match) {
    const title = (match[1] ?? '').trim();
    if (title) links.add(title);
    match = regex.exec(source);
  }
  return [...links];
}

