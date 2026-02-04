'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  getSchedules,
  getScheduleById,
  createSchedule,
  updateSchedule,
  updateScheduleField,
  deleteSchedule,
  type GetSchedulesFilters,
} from './actions/schedules';
import type { Schedule } from '@/app/lib/schedules/types';
import { ViewToolbar, type ViewMode, type StatusFilter } from './components/ViewToolbar';
import { ScheduleTable } from './components/ScheduleTable';
import { ScheduleDrawer } from './components/ScheduleDrawer';
import { Loader2, ChevronLeft } from 'lucide-react';

export default function SchedulesPage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingCell, setEditingCell] = useState<{ rowId: string; column: string } | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drawerCreate, setDrawerCreate] = useState(false);
  const [drawerSchedule, setDrawerSchedule] = useState<Schedule | null>(null);

  const loadSchedules = useCallback(async () => {
    setLoading(true);
    try {
      const filters: GetSchedulesFilters = {
        orderBy: 'start_date_asc',
      };
      if (statusFilter) filters.status = statusFilter;
      if (searchQuery.trim()) filters.search = searchQuery.trim();
      const list = await getSchedules(filters);
      setSchedules(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchQuery]);

  useEffect(() => {
    loadSchedules();
  }, [loadSchedules]);

  useEffect(() => {
    if (selectedId && !drawerCreate) {
      getScheduleById(selectedId).then((s) => setDrawerSchedule(s ?? null));
    } else {
      setDrawerSchedule(null);
    }
  }, [selectedId, drawerCreate]);

  const openDrawer = (schedule: Schedule | null) => {
    setDrawerCreate(!schedule);
    setSelectedId(schedule?.id ?? null);
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
    <div className="min-h-screen bg-gray-50 w-full">
      <div className="p-4 sm:p-6 md:p-6">
        <div className="mb-4 flex items-center gap-3">
          <Link
            href="/admin"
            className="flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            <ChevronLeft className="h-4 w-4" />
            대시보드
          </Link>
        </div>
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-bold text-gray-900">일정</h1>
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
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : schedules.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white py-12 text-center text-slate-500">
            조건에 맞는 일정이 없습니다. &quot;새로 만들기&quot;로 추가하세요.
          </div>
        ) : (
          <ScheduleTable
            schedules={schedules}
            viewMode={viewMode}
            editingCell={editingCell}
            onEditingCell={setEditingCell}
            onRowClick={(s) => openDrawer(s)}
            onFieldSave={handleFieldSave}
          />
        )}
      </div>

      {drawerOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/30"
            aria-hidden
            onClick={closeDrawer}
          />
          <ScheduleDrawer
            schedule={drawerSchedule}
            isCreate={drawerCreate}
            onClose={closeDrawer}
            onSave={handleDrawerSave}
            onDelete={!drawerCreate && selectedId ? handleDrawerDelete : undefined}
            onSaved={loadSchedules}
          />
        </>
      )}
    </div>
  );
}
