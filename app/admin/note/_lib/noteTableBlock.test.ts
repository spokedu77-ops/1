import { describe, expect, it } from 'vitest';
import {
  appendTableColumn,
  appendTableRow,
  defaultTableBlockContent,
  removeTableColumn,
  removeTableRow,
  resolveTableCellAfterStructureChange,
} from './noteTableBlock';

describe('noteTableBlock structure', () => {
  it('removes a row when more than one exists', () => {
    let content = defaultTableBlockContent() as Record<string, unknown>;
    content = appendTableRow(content);
    expect((content.rows as unknown[][]).length).toBe(4);

    const next = removeTableRow(content, 1);
    expect(next?.rows).toHaveLength(3);
    expect(removeTableRow(next as Record<string, unknown>, 0)).not.toBeNull();
    expect(removeTableRow({ rows: [[{ text: 'a' }]], columnCount: 1 }, 0)).toBeNull();
  });

  it('removes a column when more than one exists', () => {
    let content = defaultTableBlockContent() as Record<string, unknown>;
    content = appendTableColumn(content);
    const colCount = (content.columnCount as number) ?? 0;
    expect(colCount).toBe(4);

    const next = removeTableColumn(content, 2);
    expect(next?.columnCount).toBe(3);
    expect((next?.rows as unknown[][])[0]).toHaveLength(3);
    expect(removeTableColumn({ rows: [[{ text: 'a' }]], columnCount: 1 }, 0)).toBeNull();
  });

  it('refocuses cell index after row/col removal', () => {
    expect(resolveTableCellAfterStructureChange({
      row: 2,
      col: 1,
      nextRowCount: 3,
      nextColCount: 3,
      removedRow: 1,
    })).toEqual({ row: 1, col: 1 });

    expect(resolveTableCellAfterStructureChange({
      row: 0,
      col: 2,
      nextRowCount: 3,
      nextColCount: 2,
      removedCol: 1,
    })).toEqual({ row: 0, col: 1 });
  });
});
