'use client';

import { toast } from 'sonner';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { getCenters, createCenter, updateCenter, deleteCenter, type GetCentersFilters } from './actions/centers';
import type { Center, CenterListItem, CenterStatus } from '@/app/lib/centers/types';
import { CENTER_STATUS_OPTIONS, CENTER_STATUS_STYLES as STATUS_STYLES } from '@/app/lib/centers/status';
import { matchesCenterFilters, toCenterListItem } from '@/app/lib/centers/listItem';
import { centerDisplayName } from '@/app/lib/centers/displayName';
import { devLogger } from '@/app/lib/logging/devLogger';
import { Search, Plus, Loader2, X, Trash2, ChevronRight } from 'lucide-react';



const DAY_LABELS: Record<string, string> = {
  mon: '월', tue: '화', wed: '수', thu: '목', fri: '금', sat: '토', sun: '일',
};

const CenterDetailModal = dynamic(() => import('./components/CenterDetailModal'), { ssr: false });

interface CentersClientProps {
  initialCenters: CenterListItem[];
  /** CentersHubClient 탭 안에 embed 시 상단 제목 숨김 */
  embedded?: boolean;
}

export default function CentersClient({ initialCenters, embedded = false }: CentersClientProps) {
  const [centers, setCenters] = useState<CenterListItem[]>(initialCenters);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const requestVersion = useRef(0);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'active' | 'ended'>('active');
  const [regionFilter, setRegionFilter] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<{
    name: string;
    region_tag: string;
    address: string;
    project_name: string;
    status: CenterStatus;
  }>({ name: '', region_tag: '', address: '', project_name: '', status: 'regular' });
  const [createError, setCreateError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);
  const lastFilters = useRef(JSON.stringify(['', 'active', '']));

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  const loadCenters = useCallback(async () => {
    const version = ++requestVersion.current;
    setIsLoading(true);
    try {
      const filters: GetCentersFilters = {};
      if (statusFilter) filters.status = statusFilter;
      if (regionFilter) filters.region_tag = regionFilter;
      if (debouncedSearch.trim()) filters.search = debouncedSearch.trim();
      const list = await getCenters(filters);
      if (version === requestVersion.current) setCenters(list);
    } catch (err) {
      devLogger.error(err);
    } finally {
      if (version === requestVersion.current) setIsLoading(false);
    }
  }, [debouncedSearch, statusFilter, regionFilter]);

  useEffect(() => {
    const key = JSON.stringify([debouncedSearch, statusFilter, regionFilter]);
    if (lastFilters.current === key) return;
    lastFilters.current = key;
    void loadCenters();
  }, [loadCenters, debouncedSearch, statusFilter, regionFilter]);

  const handleStatusChange = async (c: CenterListItem, newStatus: CenterStatus) => {
    if (newStatus === c.status) return;
    setUpdatingStatusId(c.id);
    try {
      const result = await updateCenter(c.id, { status: newStatus });
      if (result.error) {
        toast.error(result.error);
      } else if (result.data) applySavedCenter(result.data);
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
        settlement_defaults: { projectName: createForm.project_name.trim() },
        status: createForm.status,
      });
      if (result.error) {
        setCreateError(result.error);
        return;
      }
      setIsCreateOpen(false);
      setCreateForm({ name: '', region_tag: '', address: '', project_name: '', status: 'regular' });
      if (result.data) applySavedCenter(result.data);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (c: CenterListItem) => {
    if (!confirm(`"${c.name}" 센터를 삭제할까요? 되돌릴 수 없습니다.`)) return;
    setDeletingId(c.id);
    try {
      const result = await deleteCenter(c.id);
      if (result.error) toast.error(result.error);
      else {
        requestVersion.current += 1;
        setIsLoading(false);
        setCenters((rows) => rows.filter((row) => row.id !== c.id));
      }
    } finally {
      setDeletingId(null);
    }
  };

  const openDetail = (event: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    setSelectedId(id);
  };
  const applySavedCenter = (center: Center) => {
    // Invalidate any pre-save response without re-fetching the entire list.
    requestVersion.current += 1;
    setIsLoading(false);
    const row = toCenterListItem(center);
    setCenters((previous) => {
      const remaining = previous.filter((item) => item.id !== row.id);
      if (matchesCenterFilters(center, { status: statusFilter, region: regionFilter, search: debouncedSearch })) remaining.push(row);
      return remaining.sort((a, b) => a.name.localeCompare(b.name));
    });
  };

  return (
    <div className={`${embedded ? '' : 'min-h-screen'} bg-slate-50 w-full pb-[env(safe-area-inset-bottom,0px)]`}>
      {selectedId && <CenterDetailModal key={selectedId} id={selectedId}
        onClose={() => setSelectedId(null)} onSaved={applySavedCenter}
        onDeleted={() => { setCenters((rows) => rows.filter((row) => row.id !== selectedId)); setSelectedId(null); }} />}
      <div className="min-w-0 p-3 sm:p-4">
        {!embedded && <h1 className="mb-3 text-xl font-semibold tracking-tight text-slate-900">DB 관리</h1>}
        <div className="mb-3 flex min-w-0 flex-wrap items-center gap-2">
          <div className="relative min-w-0 basis-full sm:basis-auto sm:w-64">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input type="search" aria-label="센터 검색" placeholder="센터명, 프로젝트명, 주소, 담당자 검색" value={search} onChange={(e) => setSearch(e.target.value)}
              className="h-10 w-full min-w-0 rounded-lg border border-slate-200 bg-white pl-8 pr-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20" />
          </div>
          <div role="tablist" aria-label="센터 운영 상태" className="inline-flex shrink-0 gap-1 rounded-lg bg-slate-100 p-1">
            {([{ value: 'active', label: '활성' }, { value: 'ended', label: '종료' }] as const).map(({ value, label }) => <button key={value} type="button" role="tab" aria-selected={statusFilter === value} onClick={() => setStatusFilter(value)} className={`min-h-8 whitespace-nowrap rounded-md px-4 text-sm font-medium ${statusFilter === value ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>{label}</button>)}
          </div>
          <input aria-label="지역 필터" placeholder="지역 태그" value={regionFilter} onChange={(e) => setRegionFilter(e.target.value)} className="h-10 w-24 min-w-0 rounded-lg border border-slate-200 bg-white px-2 text-sm" />
          <button type="button" onClick={() => setIsCreateOpen(true)} className="ml-auto inline-flex h-10 shrink-0 items-center justify-center gap-1 rounded-lg bg-indigo-600 px-3 text-sm font-medium text-white hover:bg-indigo-700">
            <Plus className="h-4 w-4" />센터 추가
          </button>
        </div>

        {isLoading ? <div role="status" className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
          : centers.length === 0 ? <p className="rounded-lg border border-slate-200 bg-white px-3 py-8 text-center text-sm text-slate-500">조건에 맞는 센터가 없습니다.</p>
          : <>
          <div className="space-y-2 min-[900px]:hidden">
            {centers.map((c) => <article key={c.id} className="min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-white">
              <Link href={`/admin/centers/${c.id}`} onClick={(event) => openDetail(event, c.id)} prefetch={false} title={centerDisplayName(c)} aria-label={centerDisplayName(c)}
                className="flex min-h-12 min-w-0 items-center justify-between gap-2 px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-indigo-50 focus-visible:outline-2 focus-visible:outline-indigo-600">
                <span className="min-w-0 break-words [overflow-wrap:anywhere]">{centerDisplayName(c)}</span><ChevronRight className="h-4 w-4 shrink-0 text-indigo-500" />
              </Link>
              <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 border-t border-slate-100 px-3 py-1.5 text-xs text-slate-500">
                <select aria-label={`${c.name} 상태`} value={c.status} onChange={(e) => handleStatusChange(c, e.target.value as CenterStatus)} disabled={updatingStatusId === c.id}
                  className={`h-8 min-w-0 rounded-md px-2 text-xs ${STATUS_STYLES[c.status]}`}>
                  {CENTER_STATUS_OPTIONS.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
                </select>
                {c.region_tag && <span className="max-w-full break-words">{c.region_tag}</span>}
                <span className="min-w-0 break-words">{[c.main_teacher_name, c.main_teacher_2_name, c.main_teacher_3_name].filter(Boolean).join(' · ') || '강사 미배정'}</span>
                <button type="button" onClick={() => handleDelete(c)} disabled={deletingId === c.id} aria-label={`${c.name} 삭제`} className="ml-auto inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-red-50 hover:text-red-600">
                  {deletingId === c.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                </button>
              </div>
            </article>)}
          </div>
          <div className="hidden min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-white min-[900px]:block">
            <table className="w-full table-fixed text-sm">
              <colgroup><col className="w-[31%]" /><col className="w-[11%]" /><col className="w-[15%]" /><col className="w-[24%]" /><col className="w-[13%]" /><col className="w-[6%]" /></colgroup>
              <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs text-slate-500"><tr>
                <th className="px-3 py-2 font-medium">센터명 · 지역</th><th className="px-2 py-2 font-medium">상태</th><th className="px-2 py-2 font-medium">강사</th><th className="px-2 py-2 font-medium">담당자 · 연락처</th><th className="px-2 py-2 font-medium">시간표</th><th className="px-2 py-2 font-medium"><span className="sr-only">삭제</span></th>
              </tr></thead>
              <tbody className="divide-y divide-slate-100">
                {centers.map((c) => <tr key={c.id} className="group hover:bg-indigo-50/40">
                  <td className="p-0">
                    <Link href={`/admin/centers/${c.id}`} onClick={(event) => openDetail(event, c.id)} prefetch={false} title={centerDisplayName(c)} aria-label={centerDisplayName(c)}
                      className="flex min-h-12 min-w-0 items-center gap-2 px-3 py-2 font-semibold text-slate-900 hover:text-indigo-700 focus-visible:outline-2 focus-visible:outline-indigo-600">
                      <span className="min-w-0 flex-1"><span className="block truncate">{centerDisplayName(c)}</span>{c.region_tag && <span className="mt-0.5 block truncate text-xs font-normal text-slate-400">{c.region_tag}</span>}</span>
                      <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 group-hover:text-indigo-500" />
                    </Link>
                  </td>
                  <td className="px-2 py-1"><select aria-label={`${c.name} 상태`} value={c.status} onChange={(e) => handleStatusChange(c, e.target.value as CenterStatus)} disabled={updatingStatusId === c.id}
                    className={`h-8 w-full min-w-0 rounded-md px-1 text-xs ${STATUS_STYLES[c.status]}`}>{CENTER_STATUS_OPTIONS.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}</select></td>
                  <td className="px-2 py-1 text-xs text-slate-600"><span className="block truncate" title={[c.main_teacher_name, c.main_teacher_2_name, c.main_teacher_3_name].filter(Boolean).join(', ')}>{c.main_teacher_name || '미배정'}</span>{[c.main_teacher_2_name, c.main_teacher_3_name].some(Boolean) && <span className="mt-0.5 block truncate text-slate-400">보조 {[c.main_teacher_2_name, c.main_teacher_3_name].filter(Boolean).join(', ')}</span>}</td>
                  <td className="px-2 py-1 text-xs"><span className="block truncate text-slate-700" title={c.contact_name ?? ''}>{c.contact_name || '-'}</span><span className="mt-0.5 block truncate tabular-nums text-slate-500" title={c.contact_phone ?? ''}>{c.contact_phone || '-'}</span></td>
                  <td className="px-2 py-1 text-xs text-slate-500"><span className="block truncate" title={(c.weekly_schedule ?? []).map((slot) => `${DAY_LABELS[slot.day] ?? slot.day} ${slot.start}–${slot.end}`).join(' / ')}>{(c.weekly_schedule ?? []).slice(0, 1).map((slot) => `${DAY_LABELS[slot.day] ?? slot.day} ${slot.start}`).join('') || '미설정'}{(c.weekly_schedule?.length ?? 0) > 1 ? ` +${c.weekly_schedule.length - 1}` : ''}</span></td>
                  <td className="px-1 py-1 text-right"><button type="button" onClick={() => handleDelete(c)} disabled={deletingId === c.id} aria-label={`${c.name} 삭제`} title="삭제" className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-red-50 hover:text-red-600">
                    {deletingId === c.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  </button></td>
                </tr>)}
              </tbody>
            </table>
          </div>
        </>}

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
              <label className="mb-3 block text-sm text-slate-700">수업(프로젝트)명<input maxLength={160} value={createForm.project_name} onChange={(e) => setCreateForm((form) => ({ ...form, project_name: e.target.value }))} className="mt-1 h-10 w-full min-w-0 rounded-lg border border-slate-200 px-3 text-sm" /></label>
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
