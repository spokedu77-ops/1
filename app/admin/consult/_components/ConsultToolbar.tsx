'use client';

import Link from 'next/link';
import { ArrowLeft, Loader2, RefreshCw } from 'lucide-react';
import type { RouteTab } from '../types';

const ROUTE_TABS: ReadonlyArray<{ key: RouteTab; label: string }> = [
  { key: 'all', label: '전체' },
  { key: 'private', label: '개인수업' },
  { key: 'dispatch', label: '기관수업' },
  { key: 'curriculum', label: '커리큘럼' },
  { key: 'other', label: '기타' },
];

type ConsultToolbarProps = {
  routeTab: RouteTab;
  onRouteTabChange: (tab: RouteTab) => void;
  total: number;
  pendingCount: number;
  doneCount: number;
  loading: boolean;
  onRefresh: () => void;
};

export function ConsultToolbar({
  routeTab,
  onRouteTabChange,
  total,
  pendingCount,
  doneCount,
  loading,
  onRefresh,
}: ConsultToolbarProps) {
  return (
    <>
      <div className="border-b border-slate-800 bg-slate-900/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-6 lg:px-8">
          <div className="flex items-start gap-3 sm:items-center">
            <Link
              href="/admin"
              className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-sm text-slate-200 transition hover:bg-slate-800"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              관리 홈
            </Link>
            <div>
              <h1 className="text-lg font-semibold tracking-tight text-white">상담 관리</h1>
              <p className="text-xs text-slate-400">문의 inbox · 핵심 조건 우선 · 최신순</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm font-medium text-slate-100 transition hover:bg-slate-700 disabled:opacity-50 sm:w-auto"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            새로고침
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
        <div className="mb-3 flex flex-wrap gap-2">
          {ROUTE_TABS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => onRouteTabChange(key)}
              className={`rounded-lg border px-3 py-1.5 text-sm transition ${
                routeTab === key
                  ? 'border-indigo-400 bg-indigo-500/20 text-indigo-100'
                  : 'border-slate-700 bg-slate-900/60 text-slate-300 hover:bg-slate-800'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="mb-4 grid grid-cols-3 gap-2 text-xs sm:max-w-md">
          <div className="rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2">
            <p className="text-slate-400">전체</p>
            <p className="mt-0.5 text-base font-semibold text-slate-100">{total}</p>
          </div>
          <div className="rounded-lg border border-amber-900/60 bg-amber-950/30 px-3 py-2">
            <p className="text-amber-300">미확인</p>
            <p className="mt-0.5 text-base font-semibold text-amber-100">{pendingCount}</p>
          </div>
          <div className="rounded-lg border border-emerald-900/60 bg-emerald-950/30 px-3 py-2">
            <p className="text-emerald-300">완료</p>
            <p className="mt-0.5 text-base font-semibold text-emerald-100">{doneCount}</p>
          </div>
        </div>
      </div>
    </>
  );
}
