const ROOT_CHILD_TYPES = new Set([
  'text',
  'heading',
  'heading2',
  'heading3',
  'todo',
  'toggle',
  'page',
  'bulletList',
  'numberedList',
  'divider',
  'callout',
  'quote',
  'code',
  'image',
  'video',
  'table',
  'columnList',
]);

const PAGE_CHILD_TYPES = new Set(ROOT_CHILD_TYPES);

const TOGGLE_CHILD_TYPES = new Set([
  'text',
  'heading',
  'heading2',
  'heading3',
  'todo',
  'bulletList',
  'numberedList',
  'divider',
  'callout',
  'quote',
  'code',
  'image',
  'video',
  'table',
]);

const EMPTY_VISIBLE_TYPES = new Set([
  'text',
  'todo',
  'bulletList',
  'numberedList',
]);

export function canPlaceBlockTypeInParent(movingType, parentType) {
  if (parentType == null) return ROOT_CHILD_TYPES.has(movingType);
  if (parentType === 'page') return PAGE_CHILD_TYPES.has(movingType);
  if (parentType === 'toggle') return TOGGLE_CHILD_TYPES.has(movingType);
  if (parentType === 'bulletList' || parentType === 'numberedList') {
    return movingType === 'bulletList' || movingType === 'numberedList';
  }
  if (parentType === 'columnList') return movingType === 'column';
  if (parentType === 'column') return ROOT_CHILD_TYPES.has(movingType);
  return false;
}

function normalizeText(value) {
  return String(value ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function readBlockText(block) {
  const content = block?.content ?? {};
  if (typeof content.text === 'string') return normalizeText(content.text);
  if (typeof content.title === 'string') return normalizeText(content.title);
  if (typeof content.html === 'string') return normalizeText(content.html);
  return '';
}

function groupSiblings(blocks) {
  const groups = new Map();
  for (const block of blocks) {
    const parentKey = block.parent_block_id ?? '__root__';
    const group = groups.get(parentKey) ?? [];
    group.push(block);
    groups.set(parentKey, group);
  }
  return groups;
}

function findCycle(block, byId) {
  const seen = new Set([block.id]);
  const path = [block.id];
  let current = block;
  while (current?.parent_block_id) {
    const parentId = current.parent_block_id;
    if (seen.has(parentId)) {
      path.push(parentId);
      return path;
    }
    seen.add(parentId);
    path.push(parentId);
    current = byId.get(parentId);
    if (!current) return null;
  }
  return null;
}

export function auditBlockInvariants(blocks) {
  const activeBlocks = [...new Map(
    blocks
      .filter((block) => block && !block.deleted_at)
      .map((block) => [block.id, block]),
  ).values()];
  const byId = new Map(activeBlocks.map((block) => [block.id, block]));
  const issues = {
    missingParents: [],
    crossDocumentParents: [],
    cycles: [],
    forbiddenParents: [],
    duplicateSiblingOrders: [],
    nonContiguousSiblingOrders: [],
    emptyVisibleBlocks: [],
  };

  for (const block of activeBlocks) {
    const parentId = block.parent_block_id ?? null;
    const parent = parentId ? byId.get(parentId) : null;

    if (parentId && !parent) {
      issues.missingParents.push(block);
      continue;
    }
    if (parent && parent.document_id !== block.document_id) {
      issues.crossDocumentParents.push({ block, parent });
      continue;
    }
    if (!canPlaceBlockTypeInParent(block.type, parent?.type ?? null)) {
      issues.forbiddenParents.push({ block, parent });
    }

    const cycle = findCycle(block, byId);
    if (cycle) issues.cycles.push({ block, path: cycle });

    if (EMPTY_VISIBLE_TYPES.has(block.type) && !readBlockText(block)) {
      issues.emptyVisibleBlocks.push(block);
    }
  }

  for (const [parentId, siblings] of groupSiblings(activeBlocks)) {
    const byOrder = new Map();
    for (const block of siblings) {
      const order = Number.isFinite(block.order_index) ? block.order_index : -1;
      const list = byOrder.get(order) ?? [];
      list.push(block);
      byOrder.set(order, list);
    }
    for (const [order, list] of byOrder.entries()) {
      if (list.length > 1) {
        issues.duplicateSiblingOrders.push({ parentId, order, blocks: list });
      }
    }

    const sortedOrders = siblings
      .map((block) => block.order_index)
      .filter((order) => Number.isFinite(order))
      .sort((left, right) => left - right);
    const expected = sortedOrders.every((order, index) => order === index);
    if (!expected) {
      issues.nonContiguousSiblingOrders.push({
        parentId,
        orders: sortedOrders,
        count: siblings.length,
      });
    }
  }

  return issues;
}

export function countCriticalInvariantIssues(issues) {
  return issues.missingParents.length
    + issues.crossDocumentParents.length
    + issues.cycles.length
    + issues.forbiddenParents.length
    + issues.duplicateSiblingOrders.length
    + issues.nonContiguousSiblingOrders.length;
}

export function countWarningInvariantIssues(issues) {
  return issues.emptyVisibleBlocks.length;
}
