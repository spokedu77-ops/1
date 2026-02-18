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
  /** center_id → 센터 이름 (연결 센터 클릭 시 탭 전환용) */
  centerIdToName?: Record<string, string>;
  onCenterClick?: (centerId: string) => void;
}

function statusLabel(status: Schedule['status']): string {
  switch (status) {
    case 'scheduled':
      return '진행 예정';
    case 'active':
      return '진행중';
    case 'done':
      return '종료';
    default:
      return status;
  }
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

/** 날짜 구간만 (시간 제외) */
function formatDateRangeOnly(start: string | null, end: string | null): string {
  if (!start && !end) return '-';
  const startPart = start ? formatDateWithDay(start) : '';
  const endPart = end ? formatDateWithDay(end) : '';
  if (start && !end) return startPart || start;
  if (!start && end) return endPart ? `~ ${endPart}` : `~ ${end}`;
  return [startPart, endPart].filter(Boolean).join(' ~ ') || `${start} ~ ${end}`;
}

/** 특정 일자만: "4.11(토), 11.14(금)" 형태 */
function formatSessionDates(dates: string[]): string {
  if (!dates?.length) return '-';
  return dates.map((d) => formatDateWithDay(d)).filter(Boolean).join(', ');
}

/** 행 기준 날짜 표시: session_dates 있으면 나열, 없으면 기간 */
function formatRowDate(row: Schedule): string {
  if (Array.isArray(row.session_dates) && row.session_dates.length > 0) {
    return formatSessionDates(row.session_dates);
  }
  return formatDateRangeOnly(row.start_date, row.end_date);
}

/** 비고: 줄 단위 불릿 목록 표시 */
function NoteDisplay({ note }: { note: string | null }) {
  const lines = note?.split(/\n/).map((l) => l.trim()).filter(Boolean) ?? [];
  if (lines.length === 0) return <span className="text-slate-400">-</span>;
  return (
    <ul className="list-disc list-inside text-sm text-slate-600 text-left space-y-0.5">
      {lines.map((line, i) => (
        <li key={i}>{line}</li>
      ))}
    </ul>
  );
}

/** 시간 구간만 */
function formatTimeRange(startTime?: string | null, endTime?: string | null): string {
  if (!startTime && !endTime) return '';
  if (startTime && !endTime) return startTime;
  if (!startTime && endTime) return `~ ${endTime}`;
  return `${startTime} ~ ${endTime}`;
}

/** 제목 표시: 센터 연결 시 센터명, 아니면 일정 제목 */
function displayTitle(row: Schedule, centerIdToName?: Record<string, string>): string {
  if (row.center_id && centerIdToName?.[row.center_id]) return centerIdToName[row.center_id];
  return row.title || '-';
}

function ScheduleCard({
  row,
  onRowClick,
  centerIdToName,
  onCenterClick,
}: {
  row: Schedule;
  onRowClick: (s: Schedule) => void;
  centerIdToName?: Record<string, string>;
  onCenterClick?: (centerId: string) => void;
}) {
  const timeStr = formatTimeRange(row.start_time, row.end_time);
  const titleText = displayTitle(row, centerIdToName);
  const handleCardKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onRowClick(row);
    }
  };
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onRowClick(row)}
      onKeyDown={handleCardKeyDown}
      className="w-full text-left rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all min-h-[44px] touch-manipulation cursor-pointer"
    >
      <div className="flex items-start justify-between gap-2 min-w-0">
        {row.center_id && onCenterClick ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onCenterClick(row.center_id!);
            }}
            className="font-medium text-slate-900 truncate flex-1 min-w-0 text-left text-indigo-600 hover:underline cursor-pointer"
          >
            {titleText}
          </button>
        ) : (
          <span className="font-medium text-slate-900 truncate flex-1 min-w-0">
            {titleText}
          </span>
        )}
        <span
          className={`shrink-0 inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
            row.status === 'done'
              ? 'bg-slate-100 text-slate-600'
              : row.status === 'scheduled'
                ? 'bg-amber-100 text-amber-800'
                : 'bg-indigo-100 text-indigo-800'
          }`}
        >
          {statusLabel(row.status)}
        </span>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500">
        <span className="truncate">{row.assignee ?? '-'}</span>
        <span className="whitespace-nowrap tabular-nums shrink-0">
          {formatRowDate(row)}
          {timeStr ? ` · ${timeStr}` : ''}
        </span>
        {row.sessions_count != null && (
          <span className="tabular-nums shrink-0">회기 {row.sessions_count}</span>
        )}
      </div>
      {row.center_id && onCenterClick && (
        <div className="mt-1 text-xs">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onCenterClick(row.center_id!);
            }}
            className="text-indigo-600 hover:underline cursor-pointer"
          >
            센터 상세 보기
          </button>
        </div>
      )}
      {Array.isArray(row.day_of_week) && row.day_of_week.length > 0 && (
        <div className="mt-1 text-xs text-slate-500">
          매주 {row.day_of_week.map((d) => DAY_NAMES[d]).join('·')}
        </div>
      )}
    </div>
  );
}

export function ScheduleTable({
  schedules,
  viewMode,
  editingCell,
  onEditingCell,
  onRowClick,
  onFieldSave,
  centerIdToName,
  onCenterClick,
}: ScheduleTableProps) {
  const isEditing = (rowId: string, col: string) =>
    editingCell?.rowId === rowId && editingCell?.column === col;

  const renderDateAndTime = (row: Schedule) => {
    const dateStr = formatRowDate(row);
    const timeStr = formatTimeRange(row.start_time, row.end_time);
    if (!dateStr && !timeStr) return '-';
    if (timeStr) return <><span className="block">{dateStr}</span><span className="block text-slate-500 text-xs">{timeStr}</span></>;
    return dateStr;
  };

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
                    <ScheduleCard key={row.id} row={row} onRowClick={onRowClick} centerIdToName={centerIdToName} onCenterClick={onCenterClick} />
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
                          ) : row.center_id && onCenterClick ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onCenterClick(row.center_id!);
                              }}
                              className="text-left w-full px-2 py-1 rounded focus:ring-2 focus:ring-indigo-500/30 text-sm font-medium text-indigo-600 hover:underline cursor-pointer"
                            >
                              {displayTitle(row, centerIdToName)}
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => onEditingCell({ rowId: row.id, column: 'title' })}
                              className="text-left w-full px-2 py-1 rounded focus:ring-2 focus:ring-indigo-500/30 text-sm font-medium text-slate-900 cursor-pointer"
                            >
                              {displayTitle(row, centerIdToName)}
                            </button>
                          )}
                        </td>
                        <td className="px-5 py-3 text-sm text-slate-600 tabular-nums">
                          {renderDateAndTime(row)}
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
                              className="text-left w-full px-2 py-1 rounded focus:ring-2 focus:ring-indigo-500/30 text-sm text-slate-600 cursor-pointer"
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
                              className="text-left w-full px-2 py-1 rounded focus:ring-2 focus:ring-indigo-500/30 text-sm text-slate-600 block cursor-pointer min-w-0"
                            >
                              <NoteDisplay note={row.note} />
                            </button>
                          )}
                        </td>
                        <td className="px-5 py-3">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              row.status === 'done'
                                ? 'bg-slate-100 text-slate-600'
                                : row.status === 'scheduled'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-indigo-100 text-indigo-800'
                            }`}
                          >
                            {statusLabel(row.status)}
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
          <ScheduleCard key={row.id} row={row} onRowClick={onRowClick} centerIdToName={centerIdToName} onCenterClick={onCenterClick} />
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
                    ) : row.center_id && onCenterClick ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onCenterClick(row.center_id!);
                        }}
                        className="text-left w-full px-2 py-1 rounded focus:ring-2 focus:ring-indigo-500/30 text-sm font-medium text-indigo-600 hover:underline truncate block min-w-0 cursor-pointer"
                      >
                        {displayTitle(row, centerIdToName)}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onEditingCell({ rowId: row.id, column: 'title' })}
                        className="text-left w-full px-2 py-1 rounded focus:ring-2 focus:ring-indigo-500/30 text-sm font-medium text-slate-900 truncate block min-w-0 cursor-pointer"
                      >
                        {displayTitle(row, centerIdToName)}
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
                        className="text-left w-full px-2 py-1 rounded focus:ring-2 focus:ring-indigo-500/30 text-sm text-slate-600 truncate block min-w-0 cursor-pointer"
                      >
                        {row.assignee ?? '-'}
                      </button>
                    )}
                  </td>
                  <td className="px-5 py-3 text-sm text-slate-600 tabular-nums">
                    {renderDateAndTime(row)}
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
                        className="text-left w-full px-2 py-1 rounded focus:ring-2 focus:ring-indigo-500/30 text-sm text-slate-600 cursor-pointer"
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
                        className="text-left w-full px-2 py-1 rounded focus:ring-2 focus:ring-indigo-500/30 text-sm text-slate-600 block min-w-0 cursor-pointer"
                      >
                        <NoteDisplay note={row.note} />
                      </button>
                    )}
                  </td>
                  <td className="px-5 py-3 whitespace-nowrap">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        row.status === 'done'
                          ? 'bg-slate-100 text-slate-600'
                          : row.status === 'scheduled'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-indigo-100 text-indigo-800'
                      }`}
                    >
                      {statusLabel(row.status)}
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
