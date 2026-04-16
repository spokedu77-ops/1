'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, RefreshCw, X } from 'lucide-react';

type ConsultRow = {
  id: string;
  parent_name: string;
  phone: string | null;
  child_age: string | null;
  content: string;
  consult_type: 'tutoring' | 'center' | string;
  status: string;
  created_at: string;
};

const STATUS_LABEL: Record<string, string> = {
  pending: '미확인',
  done: '확인완료',
};
const TYPE_LABEL: Record<string, string> = {
  tutoring: '과외',
  center: '센터',
};
type TypeTab = 'all' | 'tutoring' | 'center';

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

export default function AdminConsultPage() {
  const [rows, setRows] = useState<ConsultRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ConsultRow | null>(null);
  const [typeTab, setTypeTab] = useState<TypeTab>('all');
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
        (r) => r.status === 'pending' && !seenPendingIdsRef.current.has(r.id)
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
    } catch {
      setError('네트워크 오류가 발생했습니다.');
    } finally {
      setDeletingId(null);
    }
  }

  const filteredRows = rows.filter((row) => {
    if (typeTab === 'all') return true;
    return row.consult_type === typeTab;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="border-b border-slate-800 bg-slate-900/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-sm text-slate-200 transition hover:bg-slate-800"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              관리 홈
            </Link>
            <div>
              <h1 className="text-lg font-semibold tracking-tight text-white">상담 신청</h1>
              <p className="text-xs text-slate-400">consultations · 종합/과외/센터 · 최신순</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm font-medium text-slate-100 transition hover:bg-slate-700 disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            새로고침
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-4 flex flex-wrap gap-2">
          {([
            ['all', '종합'],
            ['tutoring', '과외'],
            ['center', '센터'],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTypeTab(key)}
              className={`rounded-lg border px-3 py-1.5 text-sm transition ${
                typeTab === key
                  ? 'border-indigo-400 bg-indigo-500/20 text-indigo-100'
                  : 'border-slate-700 bg-slate-900/60 text-slate-300 hover:bg-slate-800'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-red-900/80 bg-red-950/50 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/40 shadow-2xl shadow-black/40">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-800 text-left text-sm">
              <thead className="bg-slate-900/90">
                <tr>
                  <th className="whitespace-nowrap px-4 py-3 font-semibold text-slate-300">접수일시</th>
                  <th className="whitespace-nowrap px-4 py-3 font-semibold text-slate-300">이름</th>
                  <th className="whitespace-nowrap px-4 py-3 font-semibold text-slate-300">연락처</th>
                  <th className="whitespace-nowrap px-4 py-3 font-semibold text-slate-300">자녀 나이</th>
                  <th className="whitespace-nowrap px-4 py-3 font-semibold text-slate-300">타입</th>
                  <th className="min-w-[200px] px-4 py-3 font-semibold text-slate-300">상담 내용</th>
                  <th className="whitespace-nowrap px-4 py-3 font-semibold text-slate-300">상세</th>
                  <th className="whitespace-nowrap px-4 py-3 font-semibold text-slate-300">상태</th>
                  <th className="whitespace-nowrap px-4 py-3 font-semibold text-slate-300">처리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {loading && filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-16 text-center text-slate-500">
                      <Loader2 className="mx-auto h-8 w-8 animate-spin opacity-60" />
                      <p className="mt-2 text-sm">불러오는 중…</p>
                    </td>
                  </tr>
                ) : filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-slate-500">
                      등록된 상담이 없습니다.
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row) => (
                    <tr key={row.id} className="align-top hover:bg-slate-800/30">
                      <td className="whitespace-nowrap px-4 py-3 text-slate-400">
                        {formatDate(row.created_at)}
                      </td>
                      <td className="px-4 py-3 font-medium text-white">{row.parent_name}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-300">{row.phone ?? '—'}</td>
                      <td className="px-4 py-3 text-slate-300">{row.child_age ?? '—'}</td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <span className="inline-flex rounded-full bg-sky-500/20 px-2.5 py-0.5 text-xs font-medium text-sky-200">
                          {TYPE_LABEL[row.consult_type] ?? row.consult_type}
                        </span>
                      </td>
                      <td className="max-w-md px-4 py-3 text-slate-300">
                        <span className="line-clamp-3 whitespace-pre-wrap">{row.content}</span>
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
                      <td className="whitespace-nowrap px-4 py-3">
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
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {detail && (
        <div
          className="fixed inset-0 z-[400] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="consult-detail-title"
          onClick={() => setDetail(null)}
        >
          <div
            className="max-h-[min(90vh,720px)] w-full max-w-2xl overflow-hidden rounded-xl border border-slate-700 bg-slate-900 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-800 px-5 py-4">
              <div>
                <h2 id="consult-detail-title" className="text-lg font-semibold text-white">
                  상담 내용 전체
                </h2>
                <p className="mt-1 text-xs text-slate-400">
                  {formatDate(detail.created_at)} · {detail.parent_name}
                  {detail.phone ? ` · ${detail.phone}` : ''}
                  {detail.consult_type ? ` · ${TYPE_LABEL[detail.consult_type] ?? detail.consult_type}` : ''}
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
            <div className="max-h-[calc(min(90vh,720px)-88px)] overflow-y-auto px-5 py-4">
              {detail.child_age ? (
                <p className="mb-3 text-sm text-slate-300">
                  <span className="font-medium text-slate-400">자녀 나이·비고</span> {detail.child_age}
                </p>
              ) : null}
              <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-relaxed text-slate-200">
                {detail.content}
              </pre>
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
