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
    <div className="flex flex-wrap items-center gap-3 py-3 min-w-0">
      <div className="flex items-center gap-1.5 p-1 rounded-full bg-slate-100 border border-slate-200/80 shrink-0">
        <button
          type="button"
          onClick={() => onViewModeChange('all')}
          className={`flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium transition-all min-h-[44px] touch-manipulation ${
            viewMode === 'all'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-200/60'
          }`}
        >
          <LayoutList className="h-4 w-4 shrink-0" />
          <span className="truncate">전체 보기</span>
        </button>
        <button
          type="button"
          onClick={() => onViewModeChange('groupByAssignee')}
          className={`flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium transition-all min-h-[44px] touch-manipulation ${
            viewMode === 'groupByAssignee'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-200/60'
          }`}
        >
          <Users className="h-4 w-4 shrink-0" />
          <span className="truncate">담당자별</span>
        </button>
      </div>
      <select
        value={statusFilter}
        onChange={(e) => onStatusFilterChange(e.target.value as StatusFilter)}
        className="rounded-full border border-slate-200 px-3.5 py-2 text-sm text-slate-700 bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none min-h-[44px] touch-manipulation shrink-0"
      >
        <option value="">전체</option>
        <option value="active">진행중</option>
        <option value="done">종료</option>
      </select>
      <div className="relative flex-1 min-w-0 w-full sm:w-auto sm:min-w-[180px] sm:max-w-xs">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 shrink-0 pointer-events-none" />
        <input
          type="text"
          placeholder="제목·비고 검색"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full min-w-0 rounded-full border border-slate-200 py-2 pl-9 pr-3 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none min-h-[44px]"
        />
      </div>
      <button
        type="button"
        onClick={onNewClick}
        className="flex items-center gap-2 rounded-full bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 hover:shadow-md transition-all min-h-[44px] touch-manipulation shrink-0"
      >
        <Plus className="h-4 w-4 shrink-0" />
        <span className="truncate">새로 만들기</span>
      </button>
    </div>
  );
}
