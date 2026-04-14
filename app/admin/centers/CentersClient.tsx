'use client';

import { toast } from 'sonner';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { getCenters, createCenter, updateCenter, deleteCenter, type GetCentersFilters } from './actions/centers';
import type { Center, CenterStatus } from '@/app/lib/centers/types';
import { devLogger } from '@/app/lib/logging/devLogger';
import { Search, Plus, Loader2, X, Trash2, ChevronRight } from 'lucide-react';

const STATUS_OPTIONS = [
  { value: '', label: '전체' },
  { value: 'active', label: '활성' },
  { value: 'paused', label: '일시중지' },
  { value: 'ended', label: '종료' },
] as const;

const STATUS_LABELS: Record<CenterStatus, string> = {
  active: '활성',
  paused: '일시중지',
  ended: '종료',
};

const STATUS_STYLES: Record<CenterStatus, string> = {
  active: 'bg-indigo-100 text-indigo-800',
  paused: 'bg-amber-100 text-amber-800',
  ended: 'bg-slate-100 text-slate-600',
};

const DAY_LABELS: Record<string, string> = {
  mon: '월', tue: '화', wed: '수', thu: '목', fri: '금', sat: '토', sun: '일',
};

const EMPTY_BADGE = 'inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500';

interface CentersClientProps {
  initialCenters: Center[];
}

export default function CentersClient({ initialCenters }: CentersClientProps) {
  const [centers, setCenters] = useState<Center[]>(initialCenters);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const [regionFilter, setRegionFilter] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<{
    name: string;
    region_tag: string;
    address: string;
    status: CenterStatus;
  }>({ name: '', region_tag: '', address: '', status: 'active' });
  const [createError, setCreateError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);
  const isInitialMount = useRef(true);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  const loadCenters = useCallback(async () => {
    setIsLoading(true);
    try {
      const filters: GetCentersFilters = {};
      if (statusFilter) filters.status = statusFilter;
      if (regionFilter) filters.region_tag = regionFilter;
      if (debouncedSearch.trim()) filters.search = debouncedSearch.trim();
      const list = await getCenters(filters);
      setCenters(list);
    } catch (err) {
      devLogger.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch, statusFilter, regionFilter]);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    loadCenters();
  }, [loadCenters]);

  const handleStatusChange = async (c: Center, newStatus: CenterStatus) => {
    if (newStatus === c.status) return;
    setUpdatingStatusId(c.id);
    try {
      const result = await updateCenter(c.id, { status: newStatus });
      if (result.error) {
        toast.error(result.error);
      } else {
        setCenters((prev) => prev.map((x) => x.id === c.id ? { ...x, status: newStatus } : x));
      }
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');
    if (!createForm.name.trim()) {
      setCreateError('센터명을 입력해주세요.');
      return;
    }
    setSubmitting(true);
    try {
      const result = await createCenter({
        name: createForm.name.trim(),
        region_tag: createForm.region_tag.trim() || null,
        address: createForm.address.trim() || null,
        status: createForm.status,
      });
      if (result.error) {
        setCreateError(result.error);
        return;
      }
      setIsCreateOpen(false);
      setCreateForm({ name: '', region_tag: '', address: '', status: 'active' });
      loadCenters();
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (c: Center) => {
    if (!confirm(`"${c.name}" 센터를 삭제할까요? 되돌릴 수 없습니다.`)) return;
    setDeletingId(c.id);
    try {
      const result = await deleteCenter(c.id);
      if (result.error) toast.error(result.error);
      else loadCenters();
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 w-full pb-[env(safe-area-inset-bottom,0px)]">
      <div className="p-4 sm:p-6 md:p-8 min-w-0">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight">센터 관리</h1>
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="min-h-[44px] inline-flex items-center justify-center gap-2 rounded-full bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 hover:shadow-md transition-all touch-manipulation cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            센터 추가
          </button>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-2 p-1.5 rounded-full bg-slate-100 border border-slate-200/80 w-full sm:w-fit">
          <div className="relative flex-1 min-w-0 sm:min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="센터명, 주소, 담당자 검색"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full min-h-[44px] rounded-full border border-slate-200 py-2 pl-9 pr-3 text-base sm:text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none bg-white touch-manipulation"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-full border border-slate-200 px-3.5 py-2 text-sm bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none cursor-pointer"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <input
            type="text"
            placeholder="지역 태그"
            value={regionFilter}
            onChange={(e) => setRegionFilter(e.target.value)}
            className="rounded-full border border-slate-200 px-3.5 py-2 text-sm w-32 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none bg-white"
          />
        </div>

        {/* 모바일: 카드 뷰 */}
        <div className="block sm:hidden space-y-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          ) : centers.length === 0 ? (
            <div className="py-12 text-center text-slate-500 rounded-xl border border-slate-200 bg-white">
              조건에 맞는 센터가 없습니다.
            </div>
          ) : (
            centers.map((c) => {
              const pendingCount = (c.next_actions ?? []).filter((a) => !a.done).length;
              const schedule = (c.weekly_schedule ?? []);
              return (
                <div key={c.id} className="rounded-xl border border-slate-200 bg-white shadow-sm p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <Link
                      href={`/admin/centers/${c.id}`}
                      className="font-semibold text-indigo-600 hover:text-indigo-700 hover:underline text-base leading-tight"
                    >
                      {c.name}
                    </Link>
                    <div className="flex items-center gap-1 shrink-0">
                      {pendingCount > 0 && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                          대기 {pendingCount}
                        </span>
                      )}
                      <Link href={`/admin/centers/${c.id}`} className="text-slate-400 hover:text-indigo-600">
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    {c.region_tag && (
                      <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{c.region_tag}</span>
                    )}
                    <select
                      value={c.status}
                      onChange={(e) => handleStatusChange(c, e.target.value as CenterStatus)}
                      disabled={updatingStatusId === c.id}
                      className={`rounded-full px-2 py-0.5 text-xs font-medium border-0 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none cursor-pointer disabled:opacity-50 ${STATUS_STYLES[c.status]}`}
                    >
                      <option value="active">활성</option>
                      <option value="paused">일시중지</option>
                      <option value="ended">종료</option>
                    </select>
                    {c.main_teacher_name && (
                      <span className="text-xs text-slate-600 font-medium">{c.main_teacher_name} T</span>
                    )}
                    {!c.main_teacher_name && (
                      <span className={EMPTY_BADGE}>강사 미배정</span>
                    )}
                  </div>
                  {c.contact_name && (
                    <p className="text-xs text-slate-500 mb-1">
                      {c.contact_name}{c.contact_role ? ` (${c.contact_role})` : ''}{c.contact_phone ? ` · ${c.contact_phone}` : ''}
                    </p>
                  )}
                  {schedule.length > 0 ? (
                    <p className="text-xs text-slate-500 mb-1">
                      {schedule.slice(0, 2).map((s) => `${DAY_LABELS[s.day] ?? s.day} ${s.start}~${s.end}`).join(' / ')}
                      {schedule.length > 2 ? ` +${schedule.length - 2}` : ''}
                    </p>
                  ) : (
                    <p className="text-xs text-amber-700 mb-1">시간표 미설정</p>
                  )}
                  {c.highlights && (
                    <p className="text-xs text-slate-400 line-clamp-1">{c.highlights}</p>
                  )}
                  <div className="mt-3 flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleDelete(c)}
                      disabled={deletingId === c.id}
                      className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50 transition-colors cursor-pointer"
                    >
                      {deletingId === c.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* 데스크탑: 테이블 뷰 */}
        <div className="hidden sm:block rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden hover:shadow-md transition-shadow">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          ) : centers.length === 0 ? (
            <div className="py-12 text-center text-slate-500">조건에 맞는 센터가 없습니다.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100">
                <thead className="bg-white border-b border-slate-200 sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">센터명</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 w-20">지역</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 w-28">상태</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 w-28">메인 강사</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">담당자</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">시간표</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 w-16">액션</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500 w-16">삭제</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {centers.map((c) => {
                    const pendingCount = (c.next_actions ?? []).filter((a) => !a.done).length;
                    const schedule = (c.weekly_schedule ?? []);
                    return (
                      <tr
                        key={c.id}
                        className="border-l-2 border-l-transparent hover:bg-indigo-50/40 hover:border-l-indigo-500 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-0.5">
                            <Link
                              href={`/admin/centers/${c.id}`}
                              className="font-medium text-indigo-600 hover:text-indigo-700 hover:underline cursor-pointer"
                            >
                              {c.name}
                            </Link>
                            {c.highlights && (
                              <p className="text-xs text-slate-400 line-clamp-1 max-w-[240px]">{c.highlights}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">{c.region_tag ?? '-'}</td>
                        <td className="px-4 py-3">
                          <select
                            value={c.status}
                            onChange={(e) => handleStatusChange(c, e.target.value as CenterStatus)}
                            disabled={updatingStatusId === c.id}
                            className={`rounded-full px-2.5 py-0.5 text-xs font-medium border-0 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none cursor-pointer disabled:opacity-50 ${STATUS_STYLES[c.status]}`}
                          >
                            <option value="active">{STATUS_LABELS.active}</option>
                            <option value="paused">{STATUS_LABELS.paused}</option>
                            <option value="ended">{STATUS_LABELS.ended}</option>
                          </select>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700 font-medium">
                          {c.main_teacher_name ? (
                            `${c.main_teacher_name} T`
                          ) : (
                            <span className={EMPTY_BADGE}>미배정</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          <div className="flex flex-col gap-0.5">
                            <span>{c.contact_name ?? '-'}</span>
                            {c.contact_phone && <span className="text-xs text-slate-400">{c.contact_phone}</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500">
                          {schedule.length === 0 ? (
                            <span className={EMPTY_BADGE}>미설정</span>
                          ) : (
                            <span>
                              {schedule.slice(0, 2).map((s) => `${DAY_LABELS[s.day] ?? s.day} ${s.start}`).join(' / ')}
                              {schedule.length > 2 ? ` +${schedule.length - 2}` : ''}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {pendingCount > 0 ? (
                            <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                              대기 {pendingCount}
                            </span>
                          ) : (
                            <span className={EMPTY_BADGE}>없음</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleDelete(c)}
                            disabled={deletingId === c.id}
                            className="rounded-xl p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50 transition-colors cursor-pointer"
                            title="삭제"
                          >
                            {deletingId === c.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-slate-200">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900 tracking-tight">센터 추가</h2>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              {createError && (
                <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-xl">{createError}</p>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">센터명 *</label>
                <input
                  type="text"
                  value={createForm.name}
                  onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">지역 태그</label>
                <input
                  type="text"
                  value={createForm.region_tag}
                  onChange={(e) => setCreateForm((f) => ({ ...f, region_tag: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">주소</label>
                <input
                  type="text"
                  value={createForm.address}
                  onChange={(e) => setCreateForm((f) => ({ ...f, address: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">상태</label>
                <select
                  value={createForm.status}
                  onChange={(e) => setCreateForm((f) => ({ ...f, status: e.target.value as CenterStatus }))}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none cursor-pointer"
                >
                  <option value="active">활성</option>
                  <option value="paused">일시중지</option>
                  <option value="ended">종료</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 hover:shadow-md disabled:opacity-50 transition-all cursor-pointer"
                >
                  {submitting ? '저장 중…' : '저장'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
