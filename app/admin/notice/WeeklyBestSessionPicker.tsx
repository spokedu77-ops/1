'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { Search } from 'lucide-react';

export type WeeklyBestPickerItem = {
  id: string;
  title: string;
  start_at: string;
  users?: { name?: string } | null;
};

type CoachOption = { id: string; name: string };

function toDateInputValue(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatGroupDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'numeric', day: 'numeric', weekday: 'short' });
}

function getCoachName(item: WeeklyBestPickerItem): string {
  return (item.users as { name?: string } | null | undefined)?.name ?? '';
}

type WeeklyBestSessionPickerProps<T extends WeeklyBestPickerItem> = {
  items: T[];
  selectedId: string;
  onSelect: (id: string) => void;
  loading: boolean;
  emptyMessage: string;
  noResultsMessage?: string;
  coaches: CoachOption[];
  coachFilter: string;
  onCoachFilterChange: (value: string) => void;
  anchorDate: Date;
  onAnchorDateChange: (date: Date) => void;
  dateRangeLabel: string;
  getSearchText: (item: T) => string;
  getSummary: (item: T) => string;
  renderPreview: (item: T | null) => ReactNode;
  renderBadge?: (item: T) => ReactNode;
  allowNone?: boolean;
};

export function WeeklyBestSessionPicker<T extends WeeklyBestPickerItem>({
  items,
  selectedId,
  onSelect,
  loading,
  emptyMessage,
  noResultsMessage = '검색어·강사·기간을 바꿔 보세요.',
  coaches,
  coachFilter,
  onCoachFilterChange,
  anchorDate,
  onAnchorDateChange,
  dateRangeLabel,
  getSearchText,
  getSummary,
  renderPreview,
  renderBadge,
  allowNone = true,
}: WeeklyBestSessionPickerProps<T>) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => getSearchText(item).toLowerCase().includes(q));
  }, [items, searchQuery, getSearchText]);

  const groupedItems = useMemo(() => {
    const groups = new Map<string, T[]>();
    for (const item of filteredItems) {
      const key = item.start_at.slice(0, 10);
      const list = groups.get(key) ?? [];
      list.push(item);
      groups.set(key, list);
    }
    return [...groups.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [filteredItems]);

  const selectedItem = useMemo(
    () => (selectedId ? items.find((item) => item.id === selectedId) ?? null : null),
    [items, selectedId],
  );

  return (
    <div className="space-y-3">
      <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50/80 p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="제목·강사·내용 검색"
            className="w-full min-h-[40px] rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm font-medium text-slate-800 outline-none focus:border-indigo-400"
          />
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <select
            value={coachFilter}
            onChange={(e) => onCoachFilterChange(e.target.value)}
            className="min-h-[40px] flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-800 outline-none"
          >
            <option value="all">전체 선생님</option>
            {coaches.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <input
            type="date"
            value={toDateInputValue(anchorDate)}
            onChange={(e) => {
              const v = e.target.value;
              if (!v) return;
              const [y, m, d] = v.split('-').map(Number);
              if (!y || !m || !d) return;
              onAnchorDateChange(new Date(y, m - 1, d));
            }}
            className="min-h-[40px] rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-800 outline-none"
            title="기준일 (이 날짜 기준 -7일 ~ -1일)"
          />
        </div>
        <p className="text-[11px] font-bold text-slate-500">조회 기간: {dateRangeLabel}</p>
      </div>

      {loading ? (
        <div className="py-12 text-center text-slate-400 font-bold">불러오는 중...</div>
      ) : (
        <div className="flex min-h-[320px] flex-col gap-3 sm:min-h-[360px] sm:flex-row">
          <div className="flex max-h-[220px] min-h-0 flex-[2] flex-col overflow-hidden rounded-2xl border border-slate-200 sm:max-h-[360px]">
            <div className="flex-1 overflow-y-auto">
              {allowNone && (
                <button
                  type="button"
                  onClick={() => onSelect('')}
                  className={`w-full border-b border-slate-100 px-4 py-3 text-left transition-colors ${
                    !selectedId ? 'bg-indigo-50' : 'hover:bg-slate-50'
                  }`}
                >
                  <p className="text-sm font-bold text-slate-600">없음</p>
                  <p className="text-[11px] text-slate-400">선택하지 않고 넘어갑니다</p>
                </button>
              )}
              {groupedItems.length === 0 ? (
                <p className="px-4 py-6 text-sm text-slate-400">
                  {items.length === 0 ? emptyMessage : noResultsMessage}
                </p>
              ) : (
                groupedItems.map(([dateKey, groupItems]) => (
                  <div key={dateKey}>
                    <div className="sticky top-0 z-[1] border-b border-slate-100 bg-slate-100/95 px-4 py-1.5 text-[10px] font-black uppercase tracking-wide text-slate-500">
                      {formatGroupDate(groupItems[0]!.start_at)}
                    </div>
                    {groupItems.map((item) => {
                      const selected = selectedId === item.id;
                      const summary = getSummary(item);
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => onSelect(item.id)}
                          className={`w-full border-b border-slate-100 px-4 py-3 text-left transition-colors last:border-b-0 ${
                            selected ? 'bg-indigo-50' : 'hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-bold text-slate-800 line-clamp-1">{item.title}</p>
                            {renderBadge?.(item)}
                          </div>
                          <p className="mt-0.5 text-[11px] text-slate-500">{getCoachName(item)}</p>
                          {summary && (
                            <p className="mt-1 text-xs text-slate-600 line-clamp-1">{summary.replace(/\n/g, ' ')}</p>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="flex min-h-[160px] flex-[3] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
            <div className="border-b border-slate-200 px-4 py-2">
              <p className="text-[10px] font-black uppercase text-slate-400">미리보기</p>
              {selectedItem && (
                <p className="mt-0.5 truncate text-xs font-bold text-slate-700">{selectedItem.title}</p>
              )}
            </div>
            <div className="flex-1 overflow-y-auto p-4 text-sm text-slate-700 whitespace-pre-wrap">
              {selectedItem ? renderPreview(selectedItem) : (
                <p className="text-slate-400">항목을 선택하면 전체 내용이 표시됩니다.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
