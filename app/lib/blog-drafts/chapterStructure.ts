type DocNode = { type?: string; attrs?: { level?: number }; content?: DocNode[] };

function topBlocks(content: unknown): DocNode[] {
  const nodes = (content as { content?: unknown } | null)?.content;
  return Array.isArray(nodes) ? nodes as DocNode[] : [];
}

export function chapterBlockCounts(content: unknown) {
  const nodes = topBlocks(content);
  return {
    h2: nodes.filter(node => node.type === 'heading' && node.attrs?.level === 2).length,
    rules: nodes.filter(node => node.type === 'horizontalRule').length,
  };
}

/** True when a restored Chapter document would lose an H2 or divider. */
export function chapterStructureRegressed(previous: unknown, next: unknown) {
  const before = chapterBlockCounts(previous);
  if (before.h2 < 3 || before.rules < 2) return false;
  const after = chapterBlockCounts(next);
  return after.h2 < before.h2 || after.rules < before.rules;
}
