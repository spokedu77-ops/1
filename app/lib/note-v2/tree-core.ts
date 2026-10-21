/** Pure page-tree projection. Never mutates records or editor content. */
export type NoteV2TreeRow = {
  id: string;
  title: string;
  parent_id: string | null;
  position: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};
export type NoteV2TreeNode = NoteV2TreeRow & { children: NoteV2TreeNode[] };

export function compareTreeRows(a: NoteV2TreeRow, b: NoteV2TreeRow): number {
  return a.position - b.position
    || a.created_at.localeCompare(b.created_at)
    || a.id.localeCompare(b.id);
}

export function projectNoteV2Tree(rows: readonly NoteV2TreeRow[]): {
  roots: NoteV2TreeNode[];
  trash: NoteV2TreeRow[];
  visibleIds: Set<string>;
  hiddenByAncestorIds: Set<string>;
  corruptIds: Set<string>;
} {
  const all = new Map(rows.map((row) => [row.id, row]));
  const visible = new Set<string>();
  const hidden = new Set<string>();
  const corrupt = new Set<string>();
  const visiting = new Set<string>();

  const isVisible = (id: string): boolean => {
    if (visible.has(id)) return true;
    if (hidden.has(id) || corrupt.has(id)) return false;
    const row = all.get(id);
    if (!row || row.deleted_at) return false;
    if (visiting.has(id)) { for (const cycle of visiting) corrupt.add(cycle); return false; }
    visiting.add(id);
    if (row.parent_id) {
      const parent = all.get(row.parent_id);
      if (!parent) { corrupt.add(id); visiting.delete(id); return false; }
      if (!isVisible(parent.id)) {
        if (!corrupt.has(id)) hidden.add(id);
        visiting.delete(id);
        return false;
      }
    }
    visiting.delete(id);
    visible.add(id);
    return true;
  };

  for (const row of rows) if (!row.deleted_at) isVisible(row.id);
  const nodes = new Map<string, NoteV2TreeNode>();
  for (const row of rows) if (visible.has(row.id)) nodes.set(row.id, { ...row, children: [] });
  const roots: NoteV2TreeNode[] = [];
  for (const node of nodes.values()) {
    if (node.parent_id) nodes.get(node.parent_id)?.children.push(node);
    else roots.push(node);
  }
  const sortChildren = (items: NoteV2TreeNode[]) => {
    items.sort(compareTreeRows);
    for (const item of items) sortChildren(item.children);
  };
  sortChildren(roots);
  return {
    roots,
    trash: rows.filter((row) => Boolean(row.deleted_at)).sort((a, b) =>
      (b.deleted_at ?? '').localeCompare(a.deleted_at ?? '') || compareTreeRows(a, b)),
    visibleIds: visible,
    hiddenByAncestorIds: hidden,
    corruptIds: corrupt,
  };
}

export function getTreeAncestors(id: string, rows: readonly NoteV2TreeRow[]): string[] {
  const map = new Map(rows.map((row) => [row.id, row]));
  const parents: string[] = [];
  const seen = new Set([id]);
  let current = map.get(id);
  while (current?.parent_id && !seen.has(current.parent_id)) {
    seen.add(current.parent_id);
    parents.unshift(current.parent_id);
    current = map.get(current.parent_id);
  }
  return parents;
}

export function flattenTreeIds(nodes: readonly NoteV2TreeNode[]): string[] {
  return nodes.flatMap((node) => [node.id, ...flattenTreeIds(node.children)]);
}
