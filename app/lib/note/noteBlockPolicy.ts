export type NoteBlockPolicyBlock = {
  id: string;
  type: string;
  parent_block_id?: string | null;
};

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

export function canBlockTypeHaveChildren(type: string): boolean {
  return type === 'page'
    || type === 'toggle'
    || type === 'bulletList'
    || type === 'numberedList'
    || type === 'columnList'
    || type === 'column';
}

export function canPlaceBlockTypeInParent(
  movingType: string,
  parentType: string | null,
): boolean {
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

export function canPlaceBlockInParent(
  moving: Pick<NoteBlockPolicyBlock, 'type'>,
  parent: Pick<NoteBlockPolicyBlock, 'type'> | null,
): boolean {
  return canPlaceBlockTypeInParent(moving.type, parent?.type ?? null);
}
