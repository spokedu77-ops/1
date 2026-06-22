'use client';

import { useCallback, useMemo } from 'react';
import { Plus } from 'lucide-react';
import { useNoteBlockStore, type NoteActiveEditorField } from '../../_store/noteBlockStore';
import {
  appendTableColumn,
  appendTableRow,
  normalizeTableContent,
  tableCellField,
} from '../../_lib/noteTableBlock';
import { NoteEditableField } from '../NoteEditableField';
import type { NoteBlock } from '../../_lib/types';
import type { NoteEditorEnterContext } from '../NoteEditor';

type NoteTableBlockProps = {
  block: NoteBlock;
  contentMarginLeft: number;
  rootBlockShell: string;
  autoFocusSignal?: number;
  mergeFocusCaretOffset?: number;
  onUpdate: (content: Record<string, unknown>) => void;
  onContentSync?: (content: Record<string, unknown>) => void;
  onTrackActiveBlock?: (part?: 'title' | 'editor') => void;
  onFocusBlock?: () => void;
  onShowFormatToolbar?: React.ComponentProps<typeof NoteEditableField>['onShowFormatToolbar'];
  onHideFormatToolbar?: () => void;
  uploadImage?: (file: File) => Promise<string>;
  onOpenDocument?: (documentId: string) => void;
};

export function NoteTableBlock({
  block,
  contentMarginLeft,
  rootBlockShell,
  autoFocusSignal = 0,
  mergeFocusCaretOffset,
  onUpdate,
  onContentSync,
  onTrackActiveBlock,
  onFocusBlock,
  onShowFormatToolbar,
  onHideFormatToolbar,
  uploadImage,
  onOpenDocument,
}: NoteTableBlockProps) {
  const storeContent = useNoteBlockStore((state) => state.byId[block.id]?.content);
  const content = storeContent ?? block.content;
  const table = useMemo(() => normalizeTableContent(content), [content]);
  const activeEditor = useNoteBlockStore((state) => state.activeEditor);

  const syncTable = useCallback((nextContent: Record<string, unknown>) => {
    if (onContentSync) onContentSync(nextContent);
    else onUpdate(nextContent);
  }, [onContentSync, onUpdate]);

  const focusCell = useCallback((row: number, col: number) => {
    useNoteBlockStore.getState().setActiveEditor({
      blockId: block.id,
      field: tableCellField(row, col),
    });
    onTrackActiveBlock?.('editor');
    onFocusBlock?.();
  }, [block.id, onFocusBlock, onTrackActiveBlock]);

  const handleNavigateCell = useCallback((row: number, col: number, direction: 'previous' | 'next') => {
    const rowCount = table.rows.length;
    const colCount = table.rows[0]?.length ?? 0;
    let nextRow = row;
    let nextCol = col;
    if (direction === 'next') {
      nextCol += 1;
      if (nextCol >= colCount) {
        nextCol = 0;
        nextRow += 1;
      }
      if (nextRow >= rowCount) {
        const nextContent = appendTableRow(content as Record<string, unknown>);
        syncTable(nextContent);
        focusCell(rowCount, 0);
        return;
      }
    } else {
      nextCol -= 1;
      if (nextCol < 0) {
        nextRow -= 1;
        if (nextRow < 0) return;
        nextCol = colCount - 1;
      }
    }
    focusCell(nextRow, nextCol);
  }, [content, focusCell, syncTable, table.rows]);

  const renderCell = (rowIndex: number, colIndex: number, isHeader: boolean) => {
    const cell = table.rows[rowIndex]?.[colIndex] ?? { text: '', html: '' };
    const field = tableCellField(rowIndex, colIndex) as NoteActiveEditorField;
    const isActive =
      activeEditor?.blockId === block.id
      && activeEditor.field === field;

    return (
      <td
        key={field}
        className={`min-w-[120px] border border-slate-200 align-top p-0 ${
          isHeader ? 'bg-slate-50 font-medium text-slate-700' : 'bg-white text-slate-800'
        } ${isActive ? 'ring-2 ring-inset ring-blue-400/70' : ''}`}
      >
        <div className="px-2 py-1.5">
          <NoteEditableField
            blockId={block.id}
            blockType="table"
            field={field}
            fallbackContent={content as Record<string, unknown>}
            text={cell.text}
            placeholder=""
            textClassName={`text-[14px] leading-6 ${isHeader ? 'font-medium' : ''}`}
            autoFocusSignal={autoFocusSignal}
            enterCreatesBlock={false}
            tabBehavior="insert-text-indent"
            onTrackActiveBlock={onTrackActiveBlock}
            onFocusBlock={onFocusBlock}
            onContentSync={onContentSync}
            onUpdate={onUpdate}
            onNavigatePrevious={() => handleNavigateCell(rowIndex, colIndex, 'previous')}
            onNavigateNext={() => handleNavigateCell(rowIndex, colIndex, 'next')}
            onShowFormatToolbar={onShowFormatToolbar}
            onHideFormatToolbar={onHideFormatToolbar}
            uploadImage={uploadImage}
            onOpenDocumentById={onOpenDocument}
            mergeFocusCaretOffset={mergeFocusCaretOffset}
            onEditorEnter={(_ctx?: NoteEditorEnterContext) => {
              handleNavigateCell(rowIndex, colIndex, 'next');
            }}
          />
        </div>
      </td>
    );
  };

  return (
    <div
      className={`overflow-x-auto ${rootBlockShell}`}
      style={{ marginLeft: `${contentMarginLeft}px` }}
      data-note-ignore-whitespace
    >
      <table className="w-full border-collapse text-left">
        <tbody>
          {table.rows.map((row, rowIndex) => {
            const isHeader = table.hasHeaderRow !== false && rowIndex === 0;
            return (
              <tr key={`row-${rowIndex}`}>
                {row.map((_cell, colIndex) => renderCell(rowIndex, colIndex, isHeader))}
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[12px] text-slate-500 hover:bg-slate-100"
          onClick={() => syncTable(appendTableRow(content as Record<string, unknown>))}
        >
          <Plus className="h-3.5 w-3.5" />
          행 추가
        </button>
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[12px] text-slate-500 hover:bg-slate-100"
          onClick={() => syncTable(appendTableColumn(content as Record<string, unknown>))}
        >
          <Plus className="h-3.5 w-3.5" />
          열 추가
        </button>
      </div>
    </div>
  );
}
