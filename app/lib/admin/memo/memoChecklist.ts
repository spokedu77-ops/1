const CHECKLIST_LINE_RE = /^(\s*)- \[( |x|X)\](.*)$/;

export type ChecklistLine = {
  lineIndex: number;
  indent: string;
  checked: boolean;
  label: string;
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
