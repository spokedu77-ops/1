'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Link from 'next/link';
import {
  getSchedules,
  createSchedule,
  updateSchedule,
  updateScheduleField,
  deleteSchedule,
  type GetSchedulesFilters,
} from './actions/schedules';
import type { Schedule } from '@/app/lib/schedules/types';
import type { CenterOption } from './components/ScheduleDrawer';
import { useDebouncedValue } from './hooks/useDebouncedValue';
import { ViewToolbar, type ViewMode, type StatusFilter } from './components/ViewToolbar';
import { ScheduleTable } from './components/ScheduleTable';
import { ScheduleDrawer } from './components/ScheduleDrawer';
import { Loader2, ChevronLeft, ChevronDown } from 'lucide-react';

const PAGE_SIZE = 50;

interface SchedulesClientProps {
  initialSchedules: Schedule[];
  /** 연결 센터 드롭다운 및 테이블 표시용 */
  centers?: CenterOption[];
  /** 일정에서 센터 클릭 시 (2탭 레이아웃에서 센터 관리 탭으로 전환 등) */
  onCenterClick?: (centerId: string) => void;
}

export default function SchedulesClient({ initialSchedules, centers = [], onCenterClick }: SchedulesClientProps) {
  const centerIdToName = useMemo(() => {
    const m: Record<string, string> = {};
    centers.forEach((c) => { m[c.id] = c.name; });
    return m;
  }, [centers]);
  const [schedules, setSchedules] = useState<Schedule[]>(initialSchedules);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(initialSchedules.length >= PAGE_SIZE);
  const [viewMode, setViewMode] = useState<ViewMode>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('');
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebouncedValue(searchQuery.trim(), 350);
  const [editingCell, setEditingCell] = useState<{ rowId: string; column: string } | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drawerCreate, setDrawerCreate] = useState(false);
  const [drawerSchedule, setDrawerSchedule] = useState<Schedule | null>(null);
  const isInitialMount = useRef(true);

  const loadSchedules = useCallback(
    async (opts?: { append?: boolean }) => {
      const append = opts?.append ?? false;
      const offset = append ? schedules.length : 0;
      const setLoader = append ? setLoadingMore : setLoading;
      setLoader(true);
      try {
        const filters: GetSchedulesFilters = {
          orderBy: 'start_date_asc',
          limit: PAGE_SIZE,
          offset,
        };
        if (statusFilter) filters.status = statusFilter;
        if (debouncedSearch) filters.search = debouncedSearch;
        const list = await getSchedules(filters);
        setHasMore(list.length >= PAGE_SIZE);
        if (append) {
          setSchedules((prev) => [...prev, ...list]);
        } else {
          setSchedules(list);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoader(false);
      }
    },
    [statusFilter, debouncedSearch, schedules.length]
  );

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    loadSchedules();
  }, [statusFilter, debouncedSearch]);

  useEffect(() => {
    if (selectedId && !drawerCreate) {
      setDrawerSchedule((prev) => {
        const next = schedules.find((s) => s.id === selectedId);
        return next ?? prev;
      });
    } else if (!selectedId && !drawerCreate) {
      setDrawerSchedule(null);
    }
  }, [selectedId, drawerCreate, schedules]);

  const openDrawer = (schedule: Schedule | null) => {
    setDrawerCreate(!schedule);
    setSelectedId(schedule?.id ?? null);
    setDrawerSchedule(schedule ?? null);
  };

  const closeDrawer = () => {
    setSelectedId(null);
    setDrawerCreate(false);
    setDrawerSchedule(null);
  };

  const handleFieldSave = async (
    id: string,
    field: 'title' | 'assignee' | 'sessions_count' | 'note' | 'status',
    value: string | number | null
  ) => {
    const res = await updateScheduleField(id, field, value);
    if (res.error) {
      console.error(res.error);
      return;
    }
    if (res.data) {
      setSchedules((prev) =>
        prev.map((s) => (s.id === id ? res.data! : s))
      );
      if (selectedId === id) setDrawerSchedule(res.data);
    }
  };

  const handleDrawerSave = async (data: Partial<Schedule>) => {
    if (drawerCreate) {
      const res = await createSchedule(data);
      if (res.error) return { error: res.error };
      loadSchedules();
      return {};
    }
    if (selectedId) {
      const res = await updateSchedule(selectedId, data);
      if (res.error) return { error: res.error };
      if (res.data) {
        setSchedules((prev) =>
          prev.map((s) => (s.id === selectedId ? res.data! : s))
        );
        setDrawerSchedule(res.data);
      }
      return {};
    }
    return {};
  };

  const handleDrawerDelete = async (id: string) => {
    const res = await deleteSchedule(id);
    if (res.error) return { error: res.error };
    setSchedules((prev) => prev.filter((s) => s.id !== id));
    closeDrawer();
    return {};
  };

  const drawerOpen = selectedId !== null || drawerCreate;

  return (
    <div className="min-h-screen bg-slate-50 w-full pb-[env(safe-area-inset-bottom,0px)]">
      <div className="p-4 sm:p-6 md:p-6 min-w-0">
        <div className="mb-4 flex items-center gap-3">
          <Link
            href="/admin"
            className="min-h-[44px] flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-slate-900 touch-manipulation cursor-pointer"
          >
            <ChevronLeft className="h-4 w-4 shrink-0" />
            <span className="truncate">대시보드</span>
          </Link>
        </div>
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate min-w-0">일정</h1>
        </div>

        <ViewToolbar
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onNewClick={() => openDrawer(null)}
        />

        {loading ? (
          <div className="flex items-center justify-center py-12 min-h-[200px]">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : schedules.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white py-12 text-center text-slate-500 text-sm">
            조건에 맞는 일정이 없습니다. &quot;새로 만들기&quot;로 추가하세요.
          </div>
        ) : (
          <>
            <ScheduleTable
              schedules={schedules}
              viewMode={viewMode}
              editingCell={editingCell}
              onEditingCell={setEditingCell}
              onRowClick={(s) => openDrawer(s)}
              onFieldSave={handleFieldSave}
              centerIdToName={centerIdToName}
              onCenterClick={onCenterClick}
            />
            {hasMore && (
              <div className="mt-4 flex justify-center">
                <button
                  type="button"
                  onClick={() => loadSchedules({ append: true })}
                  disabled={loadingMore}
                  className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 min-h-[44px] cursor-pointer"
                >
                  {loadingMore ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                  더 보기
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {drawerOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/30 cursor-pointer"
            aria-hidden
            onClick={closeDrawer}
          />
          <ScheduleDrawer
            schedule={drawerSchedule}
            isCreate={drawerCreate}
            centers={centers}
            onClose={closeDrawer}
            onSave={handleDrawerSave}
            onDelete={!drawerCreate && selectedId ? handleDrawerDelete : undefined}
            onSaved={() => loadSchedules()}
          />
        </>
      )}
    </div>
  );
}
