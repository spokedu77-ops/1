import { describe, expect, it } from 'vitest';
import {
  buildDefaultColumnChildren,
  DEFAULT_COLUMN_COUNT,
  defaultColumnListContent,
  isColumnContainerBlock,
} from './noteColumnBlock';

describe('noteColumnBlock', () => {
  it('defaults to two columns', () => {
    expect(defaultColumnListContent().columnCount).toBe(DEFAULT_COLUMN_COUNT);
    const specs = buildDefaultColumnChildren({
      id: 'list-1',
      document_id: 'doc',
      created_at: '',
      updated_at: '',
    });
    expect(specs).toHaveLength(2);
    expect(specs[0]).toMatchObject({ type: 'column', parent_block_id: 'list-1', order_index: 0 });
    expect(specs[1]).toMatchObject({ type: 'column', parent_block_id: 'list-1', order_index: 1 });
  });

  it('recognizes column container types', () => {
    expect(isColumnContainerBlock('columnList')).toBe(true);
    expect(isColumnContainerBlock('column')).toBe(true);
    expect(isColumnContainerBlock('text')).toBe(false);
  });
});
