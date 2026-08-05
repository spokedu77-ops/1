'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, RefreshCw, X } from 'lucide-react';
import { notifyConsultPendingRefresh } from '@/app/lib/admin/consultPendingBadge';
import { summarizeLeadRow } from '@/app/lib/admin/leadInboxSummary';
import {
  getLeadResponseChecklist,
  leadRouteLabel,
  type LeadEnvelope,
  type LeadRoute,
} from '@/app/spokedu/data/lead-envelope';
import type { CurriculumCommercialMode } from '@/app/spokedu/data/curriculum-commercial-modes';
import type { PrivateStartDirection } from '@/app/spokedu/data/private-page';

type ConsultRow = {
  id: string;
  parent_name: string;
  phone: string | null;
  child_age: string | null;
  content: string;
  consult_type: 'tutoring' | 'center' | string;
  status: string;
  created_at: string;
  lead_route?: string | null;
  lead_context?: LeadEnvelope | null;
  curriculum_mode?: string | null;
  private_start_direction?: string | null;
  private_preferred_format?: string | null;
  conversion_evidence_slug?: string | null;
  source_lead_id?: string | null;
};

const STATUS_LABEL: Record<string, string> = {
  pending: '미확인',
  done: '확인완료',
};

type RouteTab = 'all' | LeadRoute;

function formatDate(iso: string) {
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat('ko-KR', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(d);
  } catch {
    return iso;
  }
}

function resolveRoute(row: ConsultRow): LeadRoute {
  if (row.lead_route === 'private' || row.lead_route === 'curriculum' || row.lead_route === 'dispatch' || row.lead_route === 'other') {
    return row.lead_route;
  }
  if (row.consult_type === 'tutoring') return 'private';
  if (row.content.includes('[커리큘럼')) return 'curriculum';
  if (row.content.includes('[기관 맞춤 제안서 요청]')) return 'dispatch';
  return 'other';
}

export default function AdminConsultPage() {
  const [rows, setRows] = useState<ConsultRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ConsultRow | null>(null);
  const [routeTab, setRouteTab] = useState<RouteTab>('all');
  const [dispatchDetail, setDispatchDetail] = useState<Record<string, unknown> | null>(null);
  const [dispatchLoading, setDispatchLoading] = useState(false);
  const seenPendingIdsRef = useRef<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/consult', { credentials: 'include' });
      const json = (await res.json()) as { ok?: boolean; rows?: ConsultRow[]; error?: string };
      if (!json.ok) {
        setError(json.error ?? '데이터를 불러오지 못했습니다.');
        setRows([]);
        return;
      }
      const nextRows = json.rows ?? [];
      setRows(nextRows);
      for (const r of nextRows) {
        if (r.status === 'pending') seenPendingIdsRef.current.add(r.id);
      }
    } catch {
      setError('네트워크 오류가 발생했습니다.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const pollForNewPending = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/consult', { credentials: 'include' });
      const json = (await res.json()) as { ok?: boolean; rows?: ConsultRow[]; error?: string };
      if (!json.ok) return;

      const nextRows = json.rows ?? [];
      setRows(nextRows);

      const shouldAutoOpen = detail == null && updatingId == null && deletingId == null;
      if (!shouldAutoOpen) {
        for (const r of nextRows) {
          if (r.status === 'pending') seenPendingIdsRef.current.add(r.id);
        }
        return;
      }

      const newPending = nextRows.find(
        (r) => r.status === 'pending' && !seenPendingIdsRef.current.has(r.id),
      );

      for (const r of nextRows) {
        if (r.status === 'pending') seenPendingIdsRef.current.add(r.id);
      }

      if (newPending) setDetail(newPending);
    } catch {
      // ignore network errors for polling
    }
  }, [detail, updatingId, deletingId]);

  useEffect(() => {
    const interval = window.setInterval(() => void pollForNewPending(), 300_000);
    const onVisibility = () => {
      if (!document.hidden) void pollForNewPending();
    };
    const onFocus = () => void pollForNewPending();

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [pollForNewPending]);

  useEffect(() => {
    if (!detail) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDetail(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [detail]);

  useEffect(() => {
    setDispatchDetail(null);
    if (!detail?.source_lead_id || resolveRoute(detail) !== 'dispatch') return;
    let cancelled = false;
    setDispatchLoading(true);
    void (async () => {
      try {
        const res = await fetch(`/api/admin/dispatch-leads?id=${encodeURIComponent(detail.source_lead_id!)}`, {
          credentials: 'include',
        });
        const json = (await res.json()) as { ok?: boolean; lead?: Record<string, unknown> };
        if (!cancelled && json.ok && json.lead) setDispatchDetail(json.lead);
      } catch {
        // ignore
      } finally {
        if (!cancelled) setDispatchLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [detail]);

  async function setStatus(id: string, status: 'pending' | 'done') {
    setUpdatingId(id);
    setError(null);
    try {
      const res = await fetch('/api/admin/consult', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
      const json = (await res.json()) as { ok?: boolean; row?: ConsultRow; error?: string };
      if (!json.ok || !json.row) {
        setError(json.error ?? '상태 변경에 실패했습니다.');
        return;
      }
      setRows((prev) => prev.map((r) => (r.id === id ? json.row! : r)));
      notifyConsultPendingRefresh();
    } catch {
      setError('네트워크 오류가 발생했습니다.');
    } finally {
      setUpdatingId(null);
    }
  }

  async function deleteConsult(row: ConsultRow) {
    const ok = window.confirm(`"${row.parent_name}" 상담을 삭제할까요? 이 작업은 되돌릴 수 없습니다.`);
    if (!ok) return;

    setDeletingId(row.id);
    setError(null);
    try {
      const res = await fetch('/api/admin/consult', {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: row.id }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!json.ok) {
        setError(json.error ?? '삭제에 실패했습니다.');
        return;
      }
      setRows((prev) => prev.filter((r) => r.id !== row.id));
      if (detail?.id === row.id) setDetail(null);
      notifyConsultPendingRefresh();
    } catch {
      setError('네트워크 오류가 발생했습니다.');
    } finally {
      setDeletingId(null);
    }
  }

  const renderRowActions = (row: ConsultRow) => (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        disabled={updatingId === row.id || deletingId === row.id || row.status === 'pending'}
        onClick={() => void setStatus(row.id, 'pending')}
        className="rounded-md border border-slate-600 bg-slate-800 px-2 py-1 text-xs text-slate-200 hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
      >
        미확인
      </button>
      <button
        type="button"
        disabled={updatingId === row.id || deletingId === row.id || row.status === 'done'}
        onClick={() => void setStatus(row.id, 'done')}
        className="rounded-md border border-emerald-700/60 bg-emerald-900/40 px-2 py-1 text-xs text-emerald-100 hover:bg-emerald-900/60 disabled:cursor-not-allowed disabled:opacity-40"
      >
        확인완료
      </button>
      <button
        type="button"
        disabled={updatingId === row.id || deletingId === row.id}
        onClick={() => void deleteConsult(row)}
        className="rounded-md border border-rose-700/60 bg-rose-900/30 px-2 py-1 text-xs text-rose-200 hover:bg-rose-900/50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {deletingId === row.id ? '삭제 중…' : '삭제'}
      </button>
    </div>
  );

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      if (routeTab === 'all') return true;
      return resolveRoute(row) === routeTab;
    });
  }, [rows, routeTab]);

  const pendingCount = filteredRows.filter((row) => row.status === 'pending').length;
  const doneCount = filteredRows.filter((row) => row.status === 'done').length;

  const detailChecklist = detail
    ? getLeadResponseChecklist({
        leadRoute: resolveRoute(detail),
        curriculumMode: (detail.curriculum_mode as CurriculumCommercialMode | null) ?? null,
        privateStartDirection: (detail.private_start_direction as PrivateStartDirection | null) ?? null,
      })
    : null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
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
              <h1 className="text-lg font-semibold tracking-tight text-white">상담 신청</h1>
              <p className="text-xs text-slate-400">Structured Lead · route 필터 · 최신순</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm font-medium text-slate-100 transition hover:bg-slate-700 disabled:opacity-50 sm:w-auto"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            새로고침
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-4 flex flex-wrap gap-2">
          {(
            [
              ['all', '전체'],
              ['private', '개인수업'],
              ['dispatch', '기관수업'],
              ['curriculum', '커리큘럼'],
              ['other', '기타'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setRouteTab(key)}
              className={`flex-1 rounded-lg border px-3 py-1.5 text-sm transition sm:flex-none ${
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
            <p className="mt-0.5 text-base font-semibold text-slate-100">{filteredRows.length}</p>
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

        {error && (
          <div className="mb-6 rounded-lg border border-red-900/80 bg-red-950/50 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        <div className="space-y-3 md:hidden">
          {loading && filteredRows.length === 0 ? (
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-12 text-center text-slate-500">
              <Loader2 className="mx-auto h-8 w-8 animate-spin opacity-60" />
              <p className="mt-2 text-sm">불러오는 중…</p>
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-10 text-center text-slate-500">
              등록된 상담이 없습니다.
            </div>
          ) : (
            filteredRows.map((row) => {
              const summary = summarizeLeadRow({
                lead_route: resolveRoute(row),
                curriculum_mode: row.curriculum_mode ?? null,
                private_start_direction: row.private_start_direction ?? null,
                private_preferred_format: row.private_preferred_format ?? null,
                conversion_evidence_slug: row.conversion_evidence_slug ?? null,
                lead_context: row.lead_context ?? null,
                content: row.content,
                consult_type: row.consult_type,
              });
              return (
                <article key={row.id} className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 shadow-xl shadow-black/30">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">{row.parent_name}</p>
                      <p className="mt-1 text-xs text-slate-400">{formatDate(row.created_at)}</p>
                    </div>
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        row.status === 'done' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-200'
                      }`}
                    >
                      {STATUS_LABEL[row.status] ?? row.status}
                    </span>
                  </div>
                  <div className="mt-2">
                    <span className="inline-flex rounded-full bg-sky-500/20 px-2.5 py-0.5 text-xs font-medium text-sky-200">
                      {summary.badge}
                    </span>
                  </div>
                  <dl className="mt-3 space-y-1.5 text-sm">
                    {summary.lines.slice(0, 3).map((line) => (
                      <div key={line.label} className="grid grid-cols-[4.5rem_1fr] gap-2">
                        <dt className="text-slate-500">{line.label}</dt>
                        <dd className="text-slate-200">{line.value}</dd>
                      </div>
                    ))}
                  </dl>
                  <p className="mt-2 text-xs text-slate-400">{row.phone ?? '—'}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setDetail(row)}
                      className="rounded-md border border-slate-600 bg-slate-800 px-2.5 py-1 text-xs text-slate-200 hover:bg-slate-700"
                    >
                      전체보기
                    </button>
                    {renderRowActions(row)}
                  </div>
                </article>
              );
            })
          )}
        </div>

        <div className="hidden overflow-hidden rounded-xl border border-slate-800 bg-slate-900/40 shadow-2xl shadow-black/40 md:block">
          <div className="overflow-x-auto">
            <table className="min-w-[960px] w-full divide-y divide-slate-800 text-left text-sm">
              <thead className="bg-slate-900/90">
                <tr>
                  <th className="whitespace-nowrap px-4 py-3 font-semibold text-slate-300">접수일시</th>
                  <th className="min-w-[7.5rem] whitespace-nowrap px-4 py-3 font-semibold text-slate-300">이름</th>
                  <th className="whitespace-nowrap px-4 py-3 font-semibold text-slate-300">연락처</th>
                  <th className="whitespace-nowrap px-4 py-3 font-semibold text-slate-300">경로</th>
                  <th className="min-w-[220px] px-4 py-3 font-semibold text-slate-300">요청 요약</th>
                  <th className="whitespace-nowrap px-4 py-3 font-semibold text-slate-300">상세</th>
                  <th className="whitespace-nowrap px-4 py-3 font-semibold text-slate-300">상태</th>
                  <th className="whitespace-nowrap px-4 py-3 font-semibold text-slate-300">처리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {loading && filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-16 text-center text-slate-500">
                      <Loader2 className="mx-auto h-8 w-8 animate-spin opacity-60" />
                      <p className="mt-2 text-sm">불러오는 중…</p>
                    </td>
                  </tr>
                ) : filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-slate-500">
                      등록된 상담이 없습니다.
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row) => {
                    const summary = summarizeLeadRow({
                      lead_route: resolveRoute(row),
                      curriculum_mode: row.curriculum_mode ?? null,
                      private_start_direction: row.private_start_direction ?? null,
                      private_preferred_format: row.private_preferred_format ?? null,
                      conversion_evidence_slug: row.conversion_evidence_slug ?? null,
                      lead_context: row.lead_context ?? null,
                      content: row.content,
                      consult_type: row.consult_type,
                    });
                    return (
                      <tr key={row.id} className="align-top hover:bg-slate-800/30">
                        <td className="whitespace-nowrap px-4 py-3 text-slate-400">{formatDate(row.created_at)}</td>
                        <td className="min-w-[7.5rem] max-w-[14rem] px-4 py-3 font-medium text-white">
                          <span className="block truncate" title={row.parent_name}>
                            {row.parent_name}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-slate-300">{row.phone ?? '—'}</td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <span className="inline-flex rounded-full bg-sky-500/20 px-2.5 py-0.5 text-xs font-medium text-sky-200">
                            {leadRouteLabel(resolveRoute(row))}
                          </span>
                        </td>
                        <td className="min-w-[220px] max-w-md px-4 py-3 text-slate-300">
                          <p className="font-medium text-slate-100">{summary.badge}</p>
                          <ul className="mt-1 space-y-0.5 text-xs text-slate-400">
                            {summary.lines.slice(0, 3).map((line) => (
                              <li key={line.label}>
                                {line.label}: {line.value}
                              </li>
                            ))}
                          </ul>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <button
                            type="button"
                            onClick={() => setDetail(row)}
                            className="rounded-md border border-slate-600 bg-slate-800 px-2.5 py-1 text-xs text-slate-200 hover:bg-slate-700"
                          >
                            전체보기
                          </button>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              row.status === 'done'
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : 'bg-amber-500/20 text-amber-200'
                            }`}
                          >
                            {STATUS_LABEL[row.status] ?? row.status}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">{renderRowActions(row)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {detail && (
        <div
          className="fixed inset-0 z-[400] flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="consult-detail-title"
          onClick={() => setDetail(null)}
        >
          <div
            className="max-h-[92vh] w-full max-w-2xl overflow-hidden rounded-t-2xl border border-slate-700 bg-slate-900 shadow-2xl sm:max-h-[min(90vh,720px)] sm:rounded-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-800 px-5 py-4">
              <div>
                <h2 id="consult-detail-title" className="text-lg font-semibold text-white">
                  상담 상세
                </h2>
                <p className="mt-1 text-xs text-slate-400">
                  {formatDate(detail.created_at)} · {detail.parent_name}
                  {detail.phone ? ` · ${detail.phone}` : ''} · {leadRouteLabel(resolveRoute(detail))}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDetail(null)}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white"
                aria-label="닫기"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="max-h-[calc(min(90vh,720px)-88px)] space-y-4 overflow-y-auto px-5 py-4">
              {(() => {
                const summary = summarizeLeadRow({
                  lead_route: resolveRoute(detail),
                  curriculum_mode: detail.curriculum_mode ?? null,
                  private_start_direction: detail.private_start_direction ?? null,
                  private_preferred_format: detail.private_preferred_format ?? null,
                  conversion_evidence_slug: detail.conversion_evidence_slug ?? null,
                  lead_context: detail.lead_context ?? null,
                  content: detail.content,
                  consult_type: detail.consult_type,
                });
                return (
                  <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-4">
                    <p className="text-sm font-semibold text-indigo-200">{summary.badge}</p>
                    <dl className="mt-3 space-y-2 text-sm">
                      {summary.lines.map((line) => (
                        <div key={line.label} className="grid grid-cols-[5rem_1fr] gap-2">
                          <dt className="text-slate-500">{line.label}</dt>
                          <dd className="text-slate-200">{line.value}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                );
              })()}

              {detailChecklist ? (
                <div className="rounded-xl border border-amber-900/50 bg-amber-950/20 p-4">
                  <p className="text-sm font-semibold text-amber-100">{detailChecklist.title}</p>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-50/90">
                    {detailChecklist.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {resolveRoute(detail) === 'dispatch' ? (
                <div className="rounded-xl border border-slate-700 bg-slate-800/30 p-4">
                  <p className="text-sm font-semibold text-slate-100">Dispatch 원본</p>
                  {dispatchLoading ? (
                    <p className="mt-2 text-xs text-slate-400">불러오는 중…</p>
                  ) : dispatchDetail ? (
                    <pre className="mt-2 whitespace-pre-wrap break-words font-mono text-xs text-slate-300">
                      {JSON.stringify(dispatchDetail, null, 2)}
                    </pre>
                  ) : (
                    <p className="mt-2 text-xs text-slate-400">
                      {detail.source_lead_id
                        ? '원본을 찾지 못했습니다. 마이그레이션·연결을 확인하세요.'
                        : 'source_lead_id 없음 (레거시 미러)'}
                    </p>
                  )}
                </div>
              ) : null}

              <div>
                <p className="mb-2 text-sm font-medium text-slate-400">원문 content</p>
                <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-relaxed text-slate-200">
                  {detail.content}
                </pre>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-800 px-5 py-3">
              <button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(detail.content);
                  } catch {
                    /* ignore */
                  }
                }}
                className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-200 hover:bg-slate-700"
              >
                본문 복사
              </button>
              <button
                type="button"
                onClick={() => setDetail(null)}
                className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
