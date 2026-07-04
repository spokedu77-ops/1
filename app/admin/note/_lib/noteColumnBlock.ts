import type { NoteBlock } from './types';

export const DEFAULT_COLUMN_COUNT = 2;

export const COLUMN_LIST_TYPE = 'columnList' as const;
export const COLUMN_TYPE = 'column' as const;

export const COLUMN_CONTAINER_TYPES = new Set<string>([
  COLUMN_LIST_TYPE,
  COLUMN_TYPE,
]);

export function isColumnListBlock(type: string): boolean {
  return type === COLUMN_LIST_TYPE;
}

export function isColumnBlock(type: string): boolean {
  return type === COLUMN_TYPE;
}

export function isColumnContainerBlock(type: string): boolean {
  return COLUMN_CONTAINER_TYPES.has(type);
}

export function defaultColumnListContent(): Record<string, unknown> {
  return { columnCount: DEFAULT_COLUMN_COUNT };
}

export function defaultColumnContent(): Record<string, unknown> {
  return {};
}

/** columnList 생성 시 함께 만들 column 자식 스펙 */
export function buildDefaultColumnChildren(
  columnListBlock: Pick<NoteBlock, 'id' | 'document_id' | 'created_at' | 'updated_at'>,
): Array<Pick<NoteBlock, 'type' | 'parent_block_id' | 'order_index' | 'content'>> {
  return Array.from({ length: DEFAULT_COLUMN_COUNT }, (_, order_index) => ({
    type: COLUMN_TYPE,
    parent_block_id: columnListBlock.id,
    order_index,
    content: defaultColumnContent(),
  }));
}
