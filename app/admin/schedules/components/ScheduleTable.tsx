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

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

function formatDateWithDay(dateStr: string | null): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr + 'T12:00:00');
    if (Number.isNaN(d.getTime())) return dateStr;
    const day = DAY_NAMES[d.getDay()];
    const parts = dateStr.split('-');
    return `${parts[1]}/${parts[2]}(${day})`;
  } catch {
    return dateStr;
  }
}

function formatDateRange(
  start: string | null,
  end: string | null,
  startTime?: string | null,
  endTime?: string | null
): string {
  if (!start && !end) return '-';
  const startPart = start ? (startTime ? `${formatDateWithDay(start)} ${startTime}` : start) : '';
  const endPart = end ? (endTime ? `${formatDateWithDay(end)} ${endTime}` : end) : '';
  if (start && !end) return startPart || start;
  if (!start && end) return endPart ? `~ ${endPart}` : `~ ${end}`;
  return [startPart, endPart].filter(Boolean).join(' ~ ') || `${start} ~ ${end}`;
}

function ChecklistSummary({ items }: { items: Schedule['checklist'] }) {
  if (!Array.isArray(items) || items.length === 0) return <span className="text-slate-400">-</span>;
  const done = items.filter((i) => i.done).length;
  return (
    <span className="text-sm text-slate-600 tabular-nums">
      {done}/{items.length}
    </span>
  );
}

function ScheduleCard({
  row,
  onRowClick,
}: {
  row: Schedule;
  onRowClick: (s: Schedule) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onRowClick(row)}
      className="w-full text-left rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all min-h-[44px] touch-manipulation"
    >
      <div className="flex items-start justify-between gap-2 min-w-0">
        <span className="font-medium text-slate-900 truncate flex-1 min-w-0">
          {row.title || '-'}
        </span>
        <span
          className={`shrink-0 inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
            row.status === 'done'
              ? 'bg-slate-100 text-slate-600'
              : 'bg-indigo-100 text-indigo-800'
          }`}
        >
          {row.status === 'done' ? '종료' : '진행중'}
        </span>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500">
        <span className="truncate">{row.assignee ?? '-'}</span>
        <span className="whitespace-nowrap tabular-nums shrink-0">
          {formatDateRange(row.start_date, row.end_date, row.start_time, row.end_time)}
        </span>
        {row.sessions_count != null && (
          <span className="tabular-nums shrink-0">회기 {row.sessions_count}</span>
        )}
      </div>
      {Array.isArray(row.day_of_week) && row.day_of_week.length > 0 && (
        <div className="mt-1 text-xs text-slate-500">
          매주 {row.day_of_week.map((d) => DAY_NAMES[d]).join('·')}
        </div>
      )}
      {Array.isArray(row.checklist) && row.checklist.length > 0 && (
        <div className="mt-1.5 text-xs text-slate-400 tabular-nums">
          체크리스트 {row.checklist.filter((i) => i.done).length}/{row.checklist.length}
        </div>
      )}
    </button>
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
        {/* Mobile: cards per group */}
        <div className="md:hidden space-y-4">
          {groups.map(([assignee, rows]) => {
            const totalSessions = rows.reduce(
              (sum, r) => sum + (r.sessions_count ?? 0),
              0
            );
            return (
              <div key={assignee} className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                <div className="bg-slate-50/80 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                  <h3 className="font-semibold text-slate-900 truncate min-w-0">{assignee}</h3>
                  <span className="text-sm text-slate-500 tabular-nums shrink-0">
                    총 회기 {totalSessions} / {rows.length}건
                  </span>
                </div>
                <div className="p-3 space-y-2">
                  {rows.map((row) => (
                    <ScheduleCard key={row.id} row={row} onRowClick={onRowClick} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        {/* Desktop: grouped tables */}
        <div className="hidden md:block space-y-6">
          {groups.map(([assignee, rows]) => {
            const totalSessions = rows.reduce(
              (sum, r) => sum + (r.sessions_count ?? 0),
              0
            );
            return (
              <div key={assignee} className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                <div className="bg-slate-50/80 px-5 py-3.5 border-b border-slate-200 flex items-center justify-between sticky top-0 z-10">
                  <h3 className="font-semibold text-slate-900 tracking-tight truncate min-w-0">{assignee}</h3>
                  <span className="text-sm text-slate-500 tabular-nums shrink-0">
                    총 회기 {totalSessions} / 항목 {rows.length}건
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-100">
                  <thead className="bg-white border-b border-slate-200 sticky top-[52px] z-10">
                    <tr>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        제목
                      </th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        기간
                      </th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        회기
                      </th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        비고
                      </th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        체크리스트
                      </th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        상태
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {rows.map((row) => (
                      <tr
                        key={row.id}
                        onClick={() => onRowClick(row)}
                        className="cursor-pointer border-l-2 border-l-transparent hover:bg-indigo-50/40 hover:border-l-indigo-500 transition-colors"
                      >
                        <td className="px-5 py-3" onClick={(e) => e.stopPropagation()}>
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
                              className="text-left w-full px-2 py-1 rounded focus:ring-2 focus:ring-indigo-500/30 text-sm font-medium text-slate-900"
                            >
                              {row.title || '-'}
                            </button>
                          )}
                        </td>
                        <td className="px-5 py-3 text-sm text-slate-600 whitespace-nowrap tabular-nums">
                          {formatDateRange(row.start_date, row.end_date, row.start_time, row.end_time)}
                        </td>
                        <td className="px-5 py-3 tabular-nums" onClick={(e) => e.stopPropagation()}>
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
                              className="text-left w-full px-2 py-1 rounded focus:ring-2 focus:ring-indigo-500/30 text-sm text-slate-600"
                            >
                              {row.sessions_count ?? '-'}
                            </button>
                          )}
                        </td>
                        <td className="px-5 py-3 max-w-[160px]" onClick={(e) => e.stopPropagation()}>
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
                              className="text-left w-full px-2 py-1 rounded focus:ring-2 focus:ring-indigo-500/30 text-sm text-slate-600 truncate block"
                            >
                              {row.note?.trim() || '-'}
                            </button>
                          )}
                        </td>
                        <td className="px-5 py-3">
                          <ChecklistSummary items={row.checklist} />
                        </td>
                        <td className="px-5 py-3">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              row.status === 'done'
                                ? 'bg-slate-100 text-slate-600'
                                : 'bg-indigo-100 text-indigo-800'
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
      </div>
    );
  }

  return (
    <>
      {/* Mobile: card list */}
      <div className="md:hidden space-y-3">
        {schedules.map((row) => (
          <ScheduleCard key={row.id} row={row} onRowClick={onRowClick} />
        ))}
      </div>
      {/* Desktop: table */}
      <div className="hidden md:block rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 table-fixed md:table-auto">
            <thead className="bg-white border-b border-slate-200 sticky top-0 z-10">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider min-w-0 w-[20%]">
                  제목
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                  담당
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                  기간
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                  회기
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider min-w-0 w-[15%]">
                  비고
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                  체크리스트
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                  상태
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {schedules.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => onRowClick(row)}
                  className="cursor-pointer border-l-2 border-l-transparent hover:bg-indigo-50/40 hover:border-l-indigo-500 transition-colors"
                >
                  <td className="px-5 py-3 min-w-0" onClick={(e) => e.stopPropagation()}>
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
                        className="text-left w-full px-2 py-1 rounded focus:ring-2 focus:ring-indigo-500/30 text-sm font-medium text-slate-900 truncate block min-w-0"
                      >
                        {row.title || '-'}
                      </button>
                    )}
                  </td>
                  <td className="px-5 py-3 min-w-0" onClick={(e) => e.stopPropagation()}>
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
                        className="text-left w-full px-2 py-1 rounded focus:ring-2 focus:ring-indigo-500/30 text-sm text-slate-600 truncate block min-w-0"
                      >
                        {row.assignee ?? '-'}
                      </button>
                    )}
                  </td>
                  <td className="px-5 py-3 text-sm text-slate-600 whitespace-nowrap tabular-nums">
                    {formatDateRange(row.start_date, row.end_date, row.start_time, row.end_time)}
                  </td>
                  <td className="px-5 py-3 tabular-nums whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
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
                        className="text-left w-full px-2 py-1 rounded focus:ring-2 focus:ring-indigo-500/30 text-sm text-slate-600"
                      >
                        {row.sessions_count ?? '-'}
                      </button>
                    )}
                  </td>
                  <td className="px-5 py-3 max-w-[160px] min-w-0" onClick={(e) => e.stopPropagation()}>
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
                        className="text-left w-full px-2 py-1 rounded focus:ring-2 focus:ring-indigo-500/30 text-sm text-slate-600 truncate block min-w-0"
                      >
                        {row.note?.trim() || '-'}
                      </button>
                    )}
                  </td>
                  <td className="px-5 py-3 whitespace-nowrap">
                    <ChecklistSummary items={row.checklist} />
                  </td>
                  <td className="px-5 py-3 whitespace-nowrap">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        row.status === 'done'
                          ? 'bg-slate-100 text-slate-600'
                          : 'bg-indigo-100 text-indigo-800'
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
    </>
  );
}
