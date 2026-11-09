/** Display formatting only: persisted feedback is not rewritten on read. */
export function feedbackListItems(content: string): string[] {
  return String(content ?? '').replace(/\r\n?/g, '\n').split('\n')
    .map(line => line.trim().replace(/^(?:[-*•]\s*|\d+[.)](?:\s+|(?=[^\d\s])))+/, '').trim())
    .filter(Boolean);
}

export function feedbackListText(content: string, style: 'numbered' | 'bullet'): string {
  return feedbackListItems(content).map((line, index) => `${style === 'numbered' ? `${index + 1}.` : '-'} ${line}`).join('\n');
}

/** Explicit numbered sections own their following detail lines, including pasted sublists. */
export function numberedFeedbackItems(content: string): string[] {
  const raw = String(content ?? '').replace(/\r\n?/g, '\n').trim();
  if (!raw) return [];
  const sections: string[] = [];
  let current: string[] = [];
  for (const line of raw.split('\n')) {
    const marker = line.match(/^\s*\d+[.)](?:\s+|(?=[^\d\s]))(.*)$/);
    if (marker) {
      if (current.join('\n').trim()) sections.push(current.join('\n').trim());
      current = [marker[1] ?? ''];
    } else {
      current.push(line);
    }
  }
  if (current.join('\n').trim()) sections.push(current.join('\n').trim());
  return sections;
}
