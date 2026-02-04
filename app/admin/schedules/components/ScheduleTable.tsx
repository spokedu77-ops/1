'use client';

import type { Schedule } from '@/app/lib/schedules/types';
import { InlineCell } from './InlineCell';
import type { ViewMode } from './ViewToolbar';

interface ScheduleTableProps {
  schedules: Schedule[];
  viewMode: ViewMode;
  editingCell: { rowId: string; column: string } | null;
  onEditingCell: (v: { rowId: string; column: string } | null) => void;
  onRowClick: (schedule: Schedule) => void;
  onFieldSave: (
    id: string,
    field: 'title' | 'assignee' | 'sessions_count' | 'note' | 'status',
    value: string | number | null
  ) => void;
}

function formatDateRange(start: string | null, end: string | null): string {
  if (!start && !end) return '-';
  if (start && !end) return start;
  if (!start && end) return `~ ${end}`;
  return `${start} ~ ${end}`;
}

function ChecklistSummary({ items }: { items: Schedule['checklist'] }) {
  if (!Array.isArray(items) || items.length === 0) return <span className="text-slate-400">-</span>;
  const done = items.filter((i) => i.done).length;
  return (
    <span className="text-sm text-slate-600">
      {done}/{items.length}
    </span>
  );
}

export function ScheduleTable({
  schedules,
  viewMode,
  editingCell,
  onEditingCell,
  onRowClick,
  onFieldSave,
}: ScheduleTableProps) {
  const isEditing = (rowId: string, col: string) =>
    editingCell?.rowId === rowId && editingCell?.column === col;

  if (viewMode === 'groupByAssignee') {
    const byAssignee = new Map<string, Schedule[]>();
    for (const s of schedules) {
      const key = s.assignee ?? '(미지정)';
      if (!byAssignee.has(key)) byAssignee.set(key, []);
      byAssignee.get(key)!.push(s);
    }
    const groups = Array.from(byAssignee.entries()).sort((a, b) =>
      a[0] === '(미지정)' ? 1 : b[0] === '(미지정)' ? -1 : a[0].localeCompare(b[0])
    );

    return (
      <div className="space-y-6">
        {groups.map(([assignee, rows]) => {
          const totalSessions = rows.reduce(
            (sum, r) => sum + (r.sessions_count ?? 0),
            0
          );
          return (
            <div key={assignee} className="rounded-xl border border-slate-200 bg-white overflow-hidden">
              <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                <h3 className="font-semibold text-slate-900">{assignee}</h3>
                <span className="text-sm text-slate-500">
                  총 회기 {totalSessions} / 항목 {rows.length}건
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50 sticky top-0 z-10">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">
                        제목
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">
                        기간
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">
                        회기
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">
                        비고
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">
                        체크리스트
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">
                        상태
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {rows.map((row) => (
                      <tr
                        key={row.id}
                        onClick={() => onRowClick(row)}
                        className="hover:bg-slate-50 cursor-pointer"
                      >
                        <td className="px-4 py-2" onClick={(e) => e.stopPropagation()}>
                          {isEditing(row.id, 'title') ? (
                            <InlineCell
                              kind="text"
                              value={row.title}
                              onSave={(v) => {
                                onFieldSave(row.id, 'title', v);
                                onEditingCell(null);
                              }}
                              placeholder="제목"
                            />
                          ) : (
                            <button
                              type="button"
                              onClick={() => onEditingCell({ rowId: row.id, column: 'title' })}
                              className="text-left w-full px-2 py-1 rounded hover:bg-slate-100 text-sm font-medium text-slate-900"
                            >
                              {row.title || '-'}
                            </button>
                          )}
                        </td>
                        <td className="px-4 py-2 text-sm text-slate-600 whitespace-nowrap">
                          {formatDateRange(row.start_date, row.end_date)}
                        </td>
                        <td className="px-4 py-2" onClick={(e) => e.stopPropagation()}>
                          {isEditing(row.id, 'sessions_count') ? (
                            <InlineCell
                              kind="number"
                              value={row.sessions_count}
                              onSave={(v) => {
                                onFieldSave(row.id, 'sessions_count', v);
                                onEditingCell(null);
                              }}
                              placeholder="-"
                            />
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                onEditingCell({ rowId: row.id, column: 'sessions_count' })
                              }
                              className="text-left w-full px-2 py-1 rounded hover:bg-slate-100 text-sm text-slate-600"
                            >
                              {row.sessions_count ?? '-'}
                            </button>
                          )}
                        </td>
                        <td className="px-4 py-2 max-w-[160px]" onClick={(e) => e.stopPropagation()}>
                          {isEditing(row.id, 'note') ? (
                            <InlineCell
                              kind="text"
                              value={row.note ?? ''}
                              onSave={(v) => {
                                onFieldSave(row.id, 'note', v);
                                onEditingCell(null);
                              }}
                              placeholder="비고"
                            />
                          ) : (
                            <button
                              type="button"
                              onClick={() => onEditingCell({ rowId: row.id, column: 'note' })}
                              className="text-left w-full px-2 py-1 rounded hover:bg-slate-100 text-sm text-slate-600 truncate block"
                            >
                              {row.note?.trim() || '-'}
                            </button>
                          )}
                        </td>
                        <td className="px-4 py-2">
                          <ChecklistSummary items={row.checklist} />
                        </td>
                        <td className="px-4 py-2">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                              row.status === 'done'
                                ? 'bg-slate-100 text-slate-600'
                                : 'bg-green-100 text-green-800'
                            }`}
                          >
                            {row.status === 'done' ? '종료' : '진행중'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50 sticky top-0 z-10">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                제목
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                담당
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                기간
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                회기
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                비고
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                체크리스트
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                상태
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {schedules.map((row) => (
              <tr
                key={row.id}
                onClick={() => onRowClick(row)}
                className="hover:bg-slate-50 cursor-pointer"
              >
                <td className="px-4 py-2" onClick={(e) => e.stopPropagation()}>
                  {isEditing(row.id, 'title') ? (
                    <InlineCell
                      kind="text"
                      value={row.title}
                      onSave={(v) => {
                        onFieldSave(row.id, 'title', v);
                        onEditingCell(null);
                      }}
                      placeholder="제목"
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => onEditingCell({ rowId: row.id, column: 'title' })}
                      className="text-left w-full px-2 py-1 rounded hover:bg-slate-100 text-sm font-medium text-slate-900"
                    >
                      {row.title || '-'}
                    </button>
                  )}
                </td>
                <td className="px-4 py-2" onClick={(e) => e.stopPropagation()}>
                  {isEditing(row.id, 'assignee') ? (
                    <InlineCell
                      kind="text"
                      value={row.assignee ?? ''}
                      onSave={(v) => {
                        onFieldSave(row.id, 'assignee', v || null);
                        onEditingCell(null);
                      }}
                      placeholder="담당"
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => onEditingCell({ rowId: row.id, column: 'assignee' })}
                      className="text-left w-full px-2 py-1 rounded hover:bg-slate-100 text-sm text-slate-600"
                    >
                      {row.assignee ?? '-'}
                    </button>
                  )}
                </td>
                <td className="px-4 py-2 text-sm text-slate-600 whitespace-nowrap">
                  {formatDateRange(row.start_date, row.end_date)}
                </td>
                <td className="px-4 py-2" onClick={(e) => e.stopPropagation()}>
                  {isEditing(row.id, 'sessions_count') ? (
                    <InlineCell
                      kind="number"
                      value={row.sessions_count}
                      onSave={(v) => {
                        onFieldSave(row.id, 'sessions_count', v);
                        onEditingCell(null);
                      }}
                      placeholder="-"
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() =>
                        onEditingCell({ rowId: row.id, column: 'sessions_count' })
                      }
                      className="text-left w-full px-2 py-1 rounded hover:bg-slate-100 text-sm text-slate-600"
                    >
                      {row.sessions_count ?? '-'}
                    </button>
                  )}
                </td>
                <td className="px-4 py-2 max-w-[160px]" onClick={(e) => e.stopPropagation()}>
                  {isEditing(row.id, 'note') ? (
                    <InlineCell
                      kind="text"
                      value={row.note ?? ''}
                      onSave={(v) => {
                        onFieldSave(row.id, 'note', v);
                        onEditingCell(null);
                      }}
                      placeholder="비고"
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => onEditingCell({ rowId: row.id, column: 'note' })}
                      className="text-left w-full px-2 py-1 rounded hover:bg-slate-100 text-sm text-slate-600 truncate block"
                    >
                      {row.note?.trim() || '-'}
                    </button>
                  )}
                </td>
                <td className="px-4 py-2">
                  <ChecklistSummary items={row.checklist} />
                </td>
                <td className="px-4 py-2">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                      row.status === 'done'
                        ? 'bg-slate-100 text-slate-600'
                        : 'bg-green-100 text-green-800'
                    }`}
                  >
                    {row.status === 'done' ? '종료' : '진행중'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
