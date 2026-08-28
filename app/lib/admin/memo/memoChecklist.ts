const CHECKLIST_LINE_RE = /^(\s*)- \[( |x|X)\](.*)$/;
const SECTION_LINE_RE = /^##\s+(.*)$/;

export type ChecklistLine = {
  lineIndex: number;
  indent: string;
  checked: boolean;
  label: string;
};

export type MemoSection = {
  key: string;
  title: string;
  startLine: number;
  endLine: number;
  lines: string[];
};

export function extractChecklistLines(body: string): ChecklistLine[] {
  const lines = body.split('\n');
  const items: ChecklistLine[] = [];
  for (let i = 0; i < lines.length; i += 1) {
    const match = lines[i].match(CHECKLIST_LINE_RE);
    if (!match) continue;
    items.push({
      lineIndex: i,
      indent: match[1],
      checked: match[2].toLowerCase() === 'x',
      label: match[3].trimStart(),
    });
  }
  return items;
}

export function toggleChecklistLine(body: string, lineIndex: number): string {
  const lines = body.split('\n');
  const line = lines[lineIndex];
  if (!line) return body;
  const match = line.match(CHECKLIST_LINE_RE);
  if (!match) return body;
  const nextMark = match[2].toLowerCase() === 'x' ? ' ' : 'x';
  lines[lineIndex] = `${match[1]}- [${nextMark}]${match[3]}`;
  return lines.join('\n');
}

export function appendChecklistLine(body: string, label = ''): string {
  const line = label.trim() ? `- [ ] ${label.trim()}` : '- [ ] ';
  if (!body) return `${line}\n`;
  return body.endsWith('\n') ? `${body}${line}\n` : `${body}\n${line}\n`;
}

export function appendSectionHeading(body: string, title = ''): string {
  const line = `## ${title.trim()}`;
  if (!body) return `${line}\n`;
  return body.endsWith('\n') ? `${body}\n${line}\n` : `${body}\n\n${line}\n`;
}

export function parseMemoSections(body: string): { preamble: string; sections: MemoSection[] } {
  const lines = body.split('\n');
  const sectionStarts: Array<{ lineIndex: number; title: string }> = [];

  for (let i = 0; i < lines.length; i += 1) {
    const match = lines[i].match(SECTION_LINE_RE);
    if (!match) continue;
    const title = match[1].trim();
    if (!title) continue;
    sectionStarts.push({ lineIndex: i, title });
  }

  if (sectionStarts.length === 0) {
    return { preamble: body, sections: [] };
  }

  const preamble = lines.slice(0, sectionStarts[0].lineIndex).join('\n');
  const sections: MemoSection[] = [];

  for (let i = 0; i < sectionStarts.length; i += 1) {
    const start = sectionStarts[i];
    const endLine = i + 1 < sectionStarts.length ? sectionStarts[i + 1].lineIndex : lines.length;
    const sectionLines = lines.slice(start.lineIndex + 1, endLine);
    sections.push({
      key: `${start.lineIndex}:${start.title}`,
      title: start.title,
      startLine: start.lineIndex,
      endLine,
      lines: sectionLines,
    });
  }

  return { preamble, sections };
}

export function filterPagesByQuery<T extends { title: string; body?: string }>(
  pages: T[],
  query: string,
): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return pages;
  return pages.filter(
    (p) =>
      (p.title || '').toLowerCase().includes(q) ||
      (p.body || '').toLowerCase().includes(q),
  );
}

export function insertAtCursor(textarea: HTMLTextAreaElement, text: string): number {
  const start = textarea.selectionStart ?? textarea.value.length;
  const end = textarea.selectionEnd ?? start;
  let insert = text;
  const before = textarea.value.slice(0, start);
  if (before.length > 0 && !before.endsWith('\n') && !insert.startsWith('\n')) {
    insert = `\n${insert}`;
  }
  textarea.focus();
  textarea.setRangeText(insert, start, end, 'end');
  return textarea.selectionStart ?? start;
}

/** textarea undo 스택 유지 */
export function toggleChecklistLineInTextarea(textarea: HTMLTextAreaElement, lineIndex: number): boolean {
  const lines = textarea.value.split('\n');
  const line = lines[lineIndex];
  if (!line) return false;
  const match = line.match(CHECKLIST_LINE_RE);
  if (!match) return false;
  const nextMark = match[2].toLowerCase() === 'x' ? ' ' : 'x';
  const nextLine = `${match[1]}- [${nextMark}]${match[3]}`;
  const start = positionAtLineStart(textarea.value, lineIndex);
  const end = start + line.length;
  textarea.focus();
  textarea.setRangeText(nextLine, start, end, 'end');
  return true;
}

export function lineIndexAtPosition(text: string, position: number): number {
  return text.slice(0, position).split('\n').length - 1;
}

export function positionAtLineStart(text: string, lineIndex: number): number {
  const lines = text.split('\n');
  let pos = 0;
  for (let i = 0; i < lineIndex && i < lines.length; i += 1) {
    pos += lines[i].length + 1;
  }
  return pos;
}
