'use client';

import { Search, Plus, LayoutList, Users } from 'lucide-react';

export type ViewMode = 'all' | 'groupByAssignee';
export type StatusFilter = '' | 'active' | 'done';

interface ViewToolbarProps {
  viewMode: ViewMode;
  onViewModeChange: (v: ViewMode) => void;
  statusFilter: StatusFilter;
  onStatusFilterChange: (v: StatusFilter) => void;
  searchQuery: string;
  onSearchChange: (v: string) => void;
  onNewClick: () => void;
}

export function ViewToolbar({
  viewMode,
  onViewModeChange,
  statusFilter,
  onStatusFilterChange,
  searchQuery,
  onSearchChange,
  onNewClick,
}: ViewToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 py-3">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onViewModeChange('all')}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
            viewMode === 'all'
              ? 'bg-slate-200 text-slate-900'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <LayoutList className="h-4 w-4" />
          전체 보기
        </button>
        <button
          type="button"
          onClick={() => onViewModeChange('groupByAssignee')}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
            viewMode === 'groupByAssignee'
              ? 'bg-slate-200 text-slate-900'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Users className="h-4 w-4" />
          담당자별
        </button>
      </div>
      <select
        value={statusFilter}
        onChange={(e) => onStatusFilterChange(e.target.value as StatusFilter)}
        className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 bg-white focus:border-slate-400 focus:outline-none"
      >
        <option value="">전체</option>
        <option value="active">진행중</option>
        <option value="done">종료</option>
      </select>
      <div className="relative flex-1 min-w-[180px] max-w-xs">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="제목·비고 검색"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm focus:border-slate-400 focus:outline-none"
        />
      </div>
      <button
        type="button"
        onClick={onNewClick}
        className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
      >
        <Plus className="h-4 w-4" />
        새로 만들기
      </button>
    </div>
  );
}
