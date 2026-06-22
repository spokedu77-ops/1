export type NoteTableCell = {
  text: string;
  html?: string;
};

export type NoteTableContent = {
  rows: NoteTableCell[][];
  hasHeaderRow?: boolean;
  columnCount?: number;
};

export const DEFAULT_TABLE_ROWS = 3;
export const DEFAULT_TABLE_COLS = 3;

export type NoteTableCellField = `cell:${number}:${number}`;

export function tableCellField(row: number, col: number): NoteTableCellField {
  return `cell:${row}:${col}`;
}

export function parseTableCellField(field: string): { row: number; col: number } | null {
  const match = /^cell:(\d+):(\d+)$/.exec(field);
  if (!match) return null;
  return { row: Number(match[1]), col: Number(match[2]) };
}

export function isTableCellField(field: string): field is NoteTableCellField {
  return parseTableCellField(field) != null;
}

function emptyCell(): NoteTableCell {
  return { text: '', html: '' };
}

export function defaultTableBlockContent(): NoteTableContent {
  const rows: NoteTableCell[][] = [];
  for (let row = 0; row < DEFAULT_TABLE_ROWS; row += 1) {
    const cells: NoteTableCell[] = [];
    for (let col = 0; col < DEFAULT_TABLE_COLS; col += 1) {
      cells.push(emptyCell());
    }
    rows.push(cells);
  }
  return {
    rows,
    hasHeaderRow: true,
    columnCount: DEFAULT_TABLE_COLS,
  };
}

export function normalizeTableContent(raw: unknown): NoteTableContent {
  const fallback = defaultTableBlockContent();
  if (!raw || typeof raw !== 'object') return fallback;
  const record = raw as Record<string, unknown>;
  const columnCount = Math.max(
    1,
    Math.min(12, Number(record.columnCount ?? DEFAULT_TABLE_COLS) || DEFAULT_TABLE_COLS),
  );
  const hasHeaderRow = record.hasHeaderRow !== false;
  const rawRows = Array.isArray(record.rows) ? record.rows : [];
  const rows: NoteTableCell[][] = [];

  for (let rowIndex = 0; rowIndex < Math.max(rawRows.length, DEFAULT_TABLE_ROWS); rowIndex += 1) {
    const rawRow = rawRows[rowIndex];
    const rowCells = Array.isArray(rawRow) ? rawRow : [];
    const cells: NoteTableCell[] = [];
    for (let colIndex = 0; colIndex < columnCount; colIndex += 1) {
      const rawCell = rowCells[colIndex];
      if (typeof rawCell === 'string') {
        cells.push({ text: rawCell });
        continue;
      }
      if (rawCell && typeof rawCell === 'object') {
        const cell = rawCell as Record<string, unknown>;
        cells.push({
          text: typeof cell.text === 'string' ? cell.text : '',
          ...(typeof cell.html === 'string' ? { html: cell.html } : {}),
        });
        continue;
      }
      cells.push(emptyCell());
    }
    rows.push(cells);
  }

  if (rows.length === 0) return fallback;

  return {
    rows,
    hasHeaderRow,
    columnCount,
  };
}

export function getTableCell(
  content: Record<string, unknown> | null | undefined,
  row: number,
  col: number,
): NoteTableCell {
  const table = normalizeTableContent(content);
  return table.rows[row]?.[col] ?? emptyCell();
}

export function patchTableCell(
  content: Record<string, unknown> | null | undefined,
  row: number,
  col: number,
  patch: Partial<NoteTableCell>,
): Record<string, unknown> {
  const table = normalizeTableContent(content);
  const rows = table.rows.map((cells, rowIndex) =>
    cells.map((cell, colIndex) => {
      if (rowIndex !== row || colIndex !== col) return cell;
      return {
        ...cell,
        ...patch,
      };
    }),
  );
  return {
    ...((content ?? {}) as Record<string, unknown>),
    rows,
    hasHeaderRow: table.hasHeaderRow,
    columnCount: table.columnCount,
  };
}

export function appendTableRow(content: Record<string, unknown> | null | undefined): Record<string, unknown> {
  const table = normalizeTableContent(content);
  const columnCount = table.columnCount ?? table.rows[0]?.length ?? DEFAULT_TABLE_COLS;
  const nextRow = Array.from({ length: columnCount }, () => emptyCell());
  return {
    ...((content ?? {}) as Record<string, unknown>),
    rows: [...table.rows, nextRow],
    columnCount,
    hasHeaderRow: table.hasHeaderRow,
  };
}

export function appendTableColumn(content: Record<string, unknown> | null | undefined): Record<string, unknown> {
  const table = normalizeTableContent(content);
  const columnCount = (table.columnCount ?? table.rows[0]?.length ?? DEFAULT_TABLE_COLS) + 1;
  const rows = table.rows.map((cells) => [...cells, emptyCell()]);
  return {
    ...((content ?? {}) as Record<string, unknown>),
    rows,
    columnCount,
    hasHeaderRow: table.hasHeaderRow,
  };
}
