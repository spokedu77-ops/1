'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { getCenters, createCenter, deleteCenter, type GetCentersFilters } from './actions/centers';
import type { Center, CenterStatus } from '@/app/lib/centers/types';
import { Search, Plus, Loader2, X, Trash2 } from 'lucide-react';

const STATUS_OPTIONS = [
  { value: '', label: '전체' },
  { value: 'active', label: '활성' },
  { value: 'paused', label: '일시중지' },
  { value: 'ended', label: '종료' },
] as const;

interface CentersClientProps {
  initialCenters: Center[];
}

export default function CentersClient({ initialCenters }: CentersClientProps) {
  const [centers, setCenters] = useState<Center[]>(initialCenters);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const [regionFilter, setRegionFilter] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<{
    name: string;
    region_tag: string;
    address: string;
    status: CenterStatus;
  }>({
    name: '',
    region_tag: '',
    address: '',
    status: 'active',
  });
  const [createError, setCreateError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const isInitialMount = useRef(true);

  const loadCenters = useCallback(async () => {
    setIsLoading(true);
    try {
      const filters: GetCentersFilters = {};
      if (statusFilter) filters.status = statusFilter;
      if (regionFilter) filters.region_tag = regionFilter;
      if (search.trim()) filters.search = search.trim();
      const list = await getCenters(filters);
      setCenters(list);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [search, statusFilter, regionFilter]);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    loadCenters();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loadCenters stable, filters trigger reload
  }, [statusFilter, regionFilter, search]);

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
    if (
      !confirm(
        `"${c.name}" 센터를 삭제할까요? 관련 프로그램·재무·로그·파일 등이 모두 삭제되며 되돌릴 수 없습니다.`
      )
    )
      return;
    setDeletingId(c.id);
    try {
      const result = await deleteCenter(c.id);
      if (result.error) alert(result.error);
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
            className="min-h-[44px] inline-flex items-center justify-center gap-2 rounded-full bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 hover:shadow-md transition-all touch-manipulation"
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
            className="rounded-full border border-slate-200 px-3.5 py-2 text-sm bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
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

        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden hover:shadow-md transition-shadow">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          ) : centers.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              조건에 맞는 센터가 없습니다.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100">
                <thead className="bg-white border-b border-slate-200 sticky top-0 z-10">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      센터명
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      지역
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      상태
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 tabular-nums">
                      계약 종료
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      담당자
                    </th>
                    <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500 w-24">
                      동작
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {centers.map((c) => (
                    <tr key={c.id} className="border-l-2 border-l-transparent hover:bg-indigo-50/40 hover:border-l-indigo-500 transition-colors">
                      <td className="px-5 py-3">
                        <Link
                          href={`/admin/centers/${c.id}`}
                          className="font-medium text-indigo-600 hover:text-indigo-700 hover:underline"
                        >
                          {c.name}
                        </Link>
                      </td>
                      <td className="px-5 py-3 text-sm text-slate-600">
                        {c.region_tag ?? '-'}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            c.status === 'active'
                              ? 'bg-indigo-100 text-indigo-800'
                              : c.status === 'paused'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {STATUS_OPTIONS.find((o) => o.value === c.status)?.label ?? c.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-sm text-slate-600 tabular-nums">
                        {c.contract_end ?? '-'}
                      </td>
                      <td className="px-5 py-3 text-sm text-slate-600">
                        {c.contact_name ?? '-'}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleDelete(c)}
                          disabled={deletingId === c.id}
                          className="rounded-xl p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50 transition-colors"
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
                  ))}
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
                className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
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
                  onChange={(e) =>
                    setCreateForm((f) => ({ ...f, status: e.target.value as CenterStatus }))
                  }
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
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
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 hover:shadow-md disabled:opacity-50 transition-all"
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
