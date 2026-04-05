'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled' | 'expired';
type Plan = 'free' | 'basic' | 'pro';

type SubscriptionRow = {
  centerId: string;
  centerName: string | null;
  ownerId: string | null;
  plan: Plan;
  status: SubscriptionStatus;
  trialEnd: string | null;
  currentPeriodEnd: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  updatedAt: string | null;
};

type EventRow = {
  id: string;
  event_type: string;
  actor_id: string | null;
  month_key: string | null;
  meta: Record<string, unknown> | null;
  created_at: string;
};

const STATUS_OPTIONS: SubscriptionStatus[] = ['trialing', 'active', 'past_due', 'canceled', 'expired'];
const PLAN_OPTIONS: Plan[] = ['free', 'basic', 'pro'];

const STATUS_LABEL: Record<SubscriptionStatus, string> = {
  trialing: '체험 중',
  active: '활성',
  past_due: '결제 지연',
  canceled: '해지',
  expired: '만료',
};

function formatDate(value: string | null): string {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString('ko-KR');
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function textOrDash(value: unknown): string {
  if (value === null || value === undefined || value === '') return '-';
  return String(value);
}

export default function AdminSpokeduProSubscriptionsPage() {
  const [rows, setRows] = useState<SubscriptionRow[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<string>('');
  const [query, setQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editing, setEditing] = useState<SubscriptionRow | null>(null);
  const [patching, setPatching] = useState(false);
  const [bulkApplying, setBulkApplying] = useState(false);

  const [nextStatus, setNextStatus] = useState<SubscriptionStatus>('active');
  const [nextPlan, setNextPlan] = useState<Plan>('basic');
  const [nextTrialEnd, setNextTrialEnd] = useState('');
  const [nextPeriodEnd, setNextPeriodEnd] = useState('');
  const [nextMaxClasses, setNextMaxClasses] = useState('');
  const [reason, setReason] = useState('');
  const [bulkStatus, setBulkStatus] = useState<SubscriptionStatus>('active');
  const [bulkPlan, setBulkPlan] = useState<Plan>('basic');
  const [bulkReason, setBulkReason] = useState('');
  const [bulkDryRun, setBulkDryRun] = useState(true);
  const [failedBulkIds, setFailedBulkIds] = useState<string[]>([]);
  const [lastBulkMessage, setLastBulkMessage] = useState<string | null>(null);
  const [showBulkPreview, setShowBulkPreview] = useState(false);

  const loadRows = useCallback(async (overrides?: { status?: string; q?: string }) => {
    const status = overrides?.status ?? statusFilter;
    const q = overrides?.q ?? query;
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (q.trim()) params.set('q', q.trim());
    params.set('limit', '200');
    const url = `/api/admin/spokedu-pro/subscriptions?${params.toString()}`;
    const res = await fetch(url, { credentials: 'include' });
    const data = (await res.json().catch(() => ({}))) as { ok?: boolean; rows?: SubscriptionRow[]; error?: string };
    if (!res.ok || !data.ok) throw new Error(data.error ?? '구독 목록을 불러오지 못했습니다.');
    setRows(data.rows ?? []);
  }, [query, statusFilter]);

  const loadEvents = useCallback(async () => {
    const res = await fetch('/api/admin/spokedu-pro/subscription-events?limit=50', { credentials: 'include' });
    const data = (await res.json().catch(() => ({}))) as { ok?: boolean; rows?: EventRow[]; error?: string };
    if (!res.ok || !data.ok) throw new Error(data.error ?? '변경 이력을 불러오지 못했습니다.');
    setEvents(data.rows ?? []);
  }, []);

  const reloadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([loadRows(), loadEvents()]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : '데이터를 불러오지 못했습니다.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [loadEvents, loadRows]);

  useEffect(() => {
    void reloadAll();
  }, [reloadAll]);

  useEffect(() => {
    setSelectedIds((prev) => prev.filter((id) => rows.some((row) => row.centerId === id)));
  }, [rows]);

  const openEditor = useCallback((row: SubscriptionRow) => {
    setEditing(row);
    setNextStatus(row.status);
    setNextPlan(row.plan);
    setNextTrialEnd(row.trialEnd ? row.trialEnd.slice(0, 16) : '');
    setNextPeriodEnd(row.currentPeriodEnd ? row.currentPeriodEnd.slice(0, 16) : '');
    setNextMaxClasses('');
    setReason('');
  }, []);

  const closeEditor = useCallback(() => {
    setEditing(null);
    setReason('');
  }, []);

  const summary = useMemo(() => {
    const counts: Record<SubscriptionStatus, number> = {
      trialing: 0,
      active: 0,
      past_due: 0,
      canceled: 0,
      expired: 0,
    };
    for (const row of rows) counts[row.status] += 1;
    return counts;
  }, [rows]);

  const submitPatch = useCallback(async () => {
    if (!editing) return;
    if (!reason.trim()) {
      alert('변경 사유를 입력해 주세요.');
      return;
    }
    setPatching(true);
    try {
      const payload: Record<string, unknown> = {
        status: nextStatus,
        plan: nextPlan,
        reason: reason.trim(),
      };
      if (nextTrialEnd.trim()) payload.trialEnd = new Date(nextTrialEnd).toISOString();
      if (nextPeriodEnd.trim()) payload.currentPeriodEnd = new Date(nextPeriodEnd).toISOString();
      if (nextMaxClasses.trim() !== '') payload.maxClasses = Number(nextMaxClasses);

      const res = await fetch(`/api/admin/spokedu-pro/subscriptions/${editing.centerId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error ?? '상태 변경에 실패했습니다.');
      closeEditor();
      await reloadAll();
    } catch (e) {
      const msg = e instanceof Error ? e.message : '상태 변경에 실패했습니다.';
      alert(msg);
    } finally {
      setPatching(false);
    }
  }, [closeEditor, editing, nextMaxClasses, nextPeriodEnd, nextPlan, nextStatus, nextTrialEnd, reason, reloadAll]);

  const allChecked = rows.length > 0 && rows.every((row) => selectedIds.includes(row.centerId));

  const toggleAll = useCallback(() => {
    if (allChecked) {
      setSelectedIds([]);
      return;
    }
    setSelectedIds(rows.map((row) => row.centerId));
  }, [allChecked, rows]);

  const toggleOne = useCallback((centerId: string) => {
    setSelectedIds((prev) => (prev.includes(centerId) ? prev.filter((id) => id !== centerId) : [...prev, centerId]));
  }, []);

  const applyBulkStatus = useCallback(async (confirmed = false) => {
    if (selectedIds.length === 0) return;
    if (!bulkReason.trim()) {
      alert('대량 변경 사유를 입력해 주세요.');
      return;
    }
    if (bulkDryRun) {
      const names = rows
        .filter((r) => selectedIds.includes(r.centerId))
        .slice(0, 10)
        .map((r) => r.centerName ?? r.centerId);
      const more = selectedIds.length > 10 ? ` 외 ${selectedIds.length - 10}개` : '';
      setLastBulkMessage(
        `[DRY-RUN] ${selectedIds.length}개 센터가 ${STATUS_LABEL[bulkStatus]} / ${bulkPlan} 로 변경됩니다. 대상: ${names.join(', ')}${more}`
      );
      return;
    }
    if (!confirmed) {
      setShowBulkPreview(true);
      return;
    }
    setBulkApplying(true);
    try {
      const payload = {
        status: bulkStatus,
        plan: bulkPlan,
        reason: bulkReason.trim(),
      };

      const results = await Promise.all(
        selectedIds.map(async (centerId) => {
          const res = await fetch(`/api/admin/spokedu-pro/subscriptions/${centerId}`, {
            method: 'PATCH',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
          return { centerId, ok: res.ok && !!data.ok, error: data.error };
        })
      );

      const failed = results.filter((r) => !r.ok);
      setFailedBulkIds(failed.map((f) => f.centerId));
      if (failed.length > 0) {
        setLastBulkMessage(`대량 변경 중 ${failed.length}건 실패했습니다. 실패 항목만 재시도할 수 있습니다.`);
      } else {
        setLastBulkMessage(`${results.length}건 상태 변경이 완료되었습니다.`);
      }
      setSelectedIds([]);
      setBulkReason('');
      await reloadAll();
      setShowBulkPreview(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : '대량 상태 변경에 실패했습니다.';
      alert(msg);
    } finally {
      setBulkApplying(false);
    }
  }, [bulkDryRun, bulkPlan, bulkReason, bulkStatus, reloadAll, rows, selectedIds]);

  const retryFailedBulk = useCallback(async () => {
    if (failedBulkIds.length === 0) return;
    setSelectedIds(failedBulkIds);
    setLastBulkMessage(`실패 항목 ${failedBulkIds.length}개를 재선택했습니다. 일괄 적용 버튼으로 재시도하세요.`);
  }, [failedBulkIds]);

  const jumpToCenter = useCallback(
    async (centerId: string) => {
      setStatusFilter('');
      setQuery(centerId);
      await loadRows({ status: '', q: centerId });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [loadRows]
  );

  const autoCompleteOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of rows) {
      if (row.centerName) map.set(row.centerName, row.centerName);
      map.set(row.centerId, row.centerId);
    }
    return Array.from(map.values()).slice(0, 300);
  }, [rows]);

  const previewRows = useMemo(() => {
    return rows.filter((r) => selectedIds.includes(r.centerId)).map((r) => ({
      centerId: r.centerId,
      centerName: r.centerName ?? '(이름 없음)',
      beforeStatus: r.status,
      beforePlan: r.plan,
      afterStatus: bulkStatus,
      afterPlan: bulkPlan,
    }));
  }, [bulkPlan, bulkStatus, rows, selectedIds]);

  const selectExpiredTrialTargets = useCallback(() => {
    const now = Date.now();
    const target = rows
      .filter((r) => r.status === 'trialing' && r.trialEnd && new Date(r.trialEnd).getTime() < now)
      .map((r) => r.centerId);
    setSelectedIds(target);
    setBulkStatus('expired');
    setBulkPlan('free');
    setLastBulkMessage(`만료된 trial ${target.length}건을 선택했습니다.`);
  }, [rows]);

  const selectPastDueTargets = useCallback(() => {
    const target = rows.filter((r) => r.status === 'past_due').map((r) => r.centerId);
    setSelectedIds(target);
    setBulkStatus('active');
    setLastBulkMessage(`past_due ${target.length}건을 선택했습니다.`);
  }, [rows]);

  return (
    <section className="px-4 md:px-8 py-6 space-y-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900">스포키듀 구독 운영</h1>
          <p className="text-sm text-slate-500">센터별 구독 상태 조회/수정 및 변경 이력 확인</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/admin/spokedu-pro" className="px-3 py-2 rounded-lg border border-slate-300 text-sm font-bold text-slate-700 hover:bg-slate-100">
            스포키듀 편집으로
          </Link>
          <button
            type="button"
            onClick={() => void reloadAll()}
            className="px-3 py-2 rounded-lg bg-slate-900 text-white text-sm font-bold hover:bg-slate-800"
          >
            새로고침
          </button>
        </div>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        {STATUS_OPTIONS.map((status) => (
          <div key={status} className="rounded-xl border border-slate-200 bg-white px-3 py-2">
            <p className="text-[11px] text-slate-500 font-bold">{STATUS_LABEL[status]}</p>
            <p className="text-xl font-black text-slate-900">{summary[status]}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 flex flex-col md:flex-row gap-2 md:items-center">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-slate-300 text-sm"
        >
          <option value="">전체 상태</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </select>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          list="center-suggestions"
          placeholder="센터명/centerId 검색"
          className="px-3 py-2 rounded-lg border border-slate-300 text-sm md:w-72"
        />
        <datalist id="center-suggestions">
          {autoCompleteOptions.map((opt) => (
            <option key={opt} value={opt} />
          ))}
        </datalist>
        <button
          type="button"
          onClick={() => void reloadAll()}
          className="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-bold hover:bg-blue-700"
        >
          조회
        </button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void selectExpiredTrialTargets()}
          className="px-3 py-2 rounded-lg border border-amber-300 text-amber-900 text-sm font-bold hover:bg-amber-50"
        >
          만료 trial 자동 선택
        </button>
        <button
          type="button"
          onClick={() => void selectPastDueTargets()}
          className="px-3 py-2 rounded-lg border border-violet-300 text-violet-900 text-sm font-bold hover:bg-violet-50"
        >
          past_due 자동 선택
        </button>
      </div>

      {selectedIds.length > 0 && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-3">
          <p className="text-sm font-bold text-blue-900">선택된 {selectedIds.length}개 센터 대량 상태 변경</p>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <select
              value={bulkStatus}
              onChange={(e) => setBulkStatus(e.target.value as SubscriptionStatus)}
              className="px-3 py-2 rounded-lg border border-blue-300 text-sm bg-white"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </select>
            <select
              value={bulkPlan}
              onChange={(e) => setBulkPlan(e.target.value as Plan)}
              className="px-3 py-2 rounded-lg border border-blue-300 text-sm bg-white"
            >
              {PLAN_OPTIONS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            <input
              value={bulkReason}
              onChange={(e) => setBulkReason(e.target.value)}
              placeholder="대량 변경 사유 (필수)"
              className="px-3 py-2 rounded-lg border border-blue-300 text-sm bg-white md:col-span-2"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-blue-900">
            <input
              type="checkbox"
              checked={bulkDryRun}
              onChange={(e) => setBulkDryRun(e.target.checked)}
            />
            드라이런 모드(실제 변경 없이 대상/결과만 미리보기)
          </label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void applyBulkStatus()}
              disabled={bulkApplying}
              className="px-3 py-2 rounded-lg bg-blue-700 text-white text-sm font-bold hover:bg-blue-800 disabled:opacity-50"
            >
              {bulkApplying ? '대량 처리 중...' : bulkDryRun ? '드라이런 실행' : '선택 항목 일괄 적용'}
            </button>
            {!bulkDryRun && (
              <button
                type="button"
                onClick={() => setShowBulkPreview(true)}
                className="px-3 py-2 rounded-lg border border-blue-300 text-blue-900 text-sm font-bold hover:bg-blue-100"
              >
                변경 미리보기
              </button>
            )}
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="px-3 py-2 rounded-lg border border-blue-300 text-blue-900 text-sm font-bold hover:bg-blue-100"
            >
              선택 해제
            </button>
            {failedBulkIds.length > 0 && (
              <button
                type="button"
                onClick={() => void retryFailedBulk()}
                className="px-3 py-2 rounded-lg border border-amber-300 text-amber-900 text-sm font-bold hover:bg-amber-100"
              >
                실패 항목 재선택 ({failedBulkIds.length})
              </button>
            )}
          </div>
        </div>
      )}

      {lastBulkMessage && (
        <div className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-700">
          {lastBulkMessage}
        </div>
      )}

      {error && <div className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}

      <div className="rounded-xl border border-slate-200 bg-white overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-left px-3 py-2">
                <input type="checkbox" checked={allChecked} onChange={toggleAll} />
              </th>
              <th className="text-left px-3 py-2">센터</th>
              <th className="text-left px-3 py-2">플랜</th>
              <th className="text-left px-3 py-2">상태</th>
              <th className="text-left px-3 py-2">체험/갱신일</th>
              <th className="text-left px-3 py-2">업데이트</th>
              <th className="text-left px-3 py-2">동작</th>
            </tr>
          </thead>
          <tbody>
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-slate-400">
                  조회 결과가 없습니다.
                </td>
              </tr>
            )}
            {rows.map((row) => (
              <tr key={row.centerId} className="border-t border-slate-100">
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(row.centerId)}
                    onChange={() => toggleOne(row.centerId)}
                  />
                </td>
                <td className="px-3 py-2">
                  <p className="font-semibold text-slate-800">{row.centerName ?? '(이름 없음)'}</p>
                  <p className="text-xs text-slate-500">{row.centerId}</p>
                </td>
                <td className="px-3 py-2 font-semibold capitalize">{row.plan}</td>
                <td className="px-3 py-2">{STATUS_LABEL[row.status]}</td>
                <td className="px-3 py-2">
                  <p className="text-xs text-slate-700">trial: {formatDate(row.trialEnd)}</p>
                  <p className="text-xs text-slate-700">period: {formatDate(row.currentPeriodEnd)}</p>
                </td>
                <td className="px-3 py-2 text-xs text-slate-500">{formatDate(row.updatedAt)}</td>
                <td className="px-3 py-2">
                  <button
                    type="button"
                    onClick={() => openEditor(row)}
                    className="px-2.5 py-1.5 rounded-md bg-slate-800 text-white text-xs font-bold hover:bg-slate-700"
                  >
                    상태 변경
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-base font-black text-slate-900 mb-3">최근 상태 변경 이력</h2>
        <div className="space-y-2">
          {events.length === 0 && <p className="text-sm text-slate-400">기록이 없습니다.</p>}
          {events.map((ev) => (
            <div key={ev.id} className="rounded-lg border border-slate-200 px-3 py-3">
              <p className="text-xs text-slate-500">{formatDate(ev.created_at)}</p>
              <p className="text-sm text-slate-800">
                <span className="font-bold">{ev.event_type}</span> · actor: {ev.actor_id ?? '-'}
              </p>
              {(() => {
                const meta = asRecord(ev.meta);
                const before = asRecord(meta?.before);
                const after = asRecord(meta?.after);
                const centerId = textOrDash(meta?.centerId);
                const reasonText = textOrDash(meta?.reason);
                if (!meta) return null;
                return (
                  <div className="mt-2 rounded border border-slate-200 bg-slate-50 p-2 text-[12px] text-slate-700">
                    <p className="mb-1">
                      centerId:{' '}
                      <button
                        type="button"
                        onClick={() => void jumpToCenter(centerId)}
                        className="font-mono underline underline-offset-2 text-blue-700 hover:text-blue-900"
                      >
                        {centerId}
                      </button>{' '}
                      · 사유: {reasonText}
                    </p>
                    {before && after ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <div className="rounded border border-slate-200 bg-white p-2">
                          <p className="font-bold text-slate-800 mb-1">Before</p>
                          <p className={before.status !== after.status ? 'font-bold text-rose-700' : ''}>
                            status: {textOrDash(before.status)}
                          </p>
                          <p className={before.plan !== after.plan ? 'font-bold text-rose-700' : ''}>
                            plan: {textOrDash(before.plan)}
                          </p>
                          <p className={before.trialEnd !== after.trialEnd ? 'font-bold text-rose-700' : ''}>
                            trialEnd: {textOrDash(before.trialEnd)}
                          </p>
                          <p className={before.currentPeriodEnd !== after.currentPeriodEnd ? 'font-bold text-rose-700' : ''}>
                            periodEnd: {textOrDash(before.currentPeriodEnd)}
                          </p>
                          <p className={before.maxClasses !== after.maxClasses ? 'font-bold text-rose-700' : ''}>
                            maxClasses: {textOrDash(before.maxClasses)}
                          </p>
                        </div>
                        <div className="rounded border border-slate-200 bg-white p-2">
                          <p className="font-bold text-slate-800 mb-1">After</p>
                          <p className={before.status !== after.status ? 'font-bold text-emerald-700' : ''}>
                            status: {textOrDash(after.status)}
                          </p>
                          <p className={before.plan !== after.plan ? 'font-bold text-emerald-700' : ''}>
                            plan: {textOrDash(after.plan)}
                          </p>
                          <p className={before.trialEnd !== after.trialEnd ? 'font-bold text-emerald-700' : ''}>
                            trialEnd: {textOrDash(after.trialEnd)}
                          </p>
                          <p className={before.currentPeriodEnd !== after.currentPeriodEnd ? 'font-bold text-emerald-700' : ''}>
                            periodEnd: {textOrDash(after.currentPeriodEnd)}
                          </p>
                          <p className={before.maxClasses !== after.maxClasses ? 'font-bold text-emerald-700' : ''}>
                            maxClasses: {textOrDash(after.maxClasses)}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <pre className="mt-1 text-[11px] text-slate-600 whitespace-pre-wrap break-all bg-white rounded p-2">
                        {JSON.stringify(meta, null, 2)}
                      </pre>
                    )}
                  </div>
                );
              })()}
            </div>
          ))}
        </div>
      </div>

      {editing && (
        <div className="fixed inset-0 z-[300] bg-black/50 flex items-center justify-center p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white shadow-xl border border-slate-200 p-5 space-y-4">
            <div>
              <h3 className="text-lg font-black text-slate-900">구독 상태 변경</h3>
              <p className="text-xs text-slate-500 mt-1">
                {editing.centerName ?? '(이름 없음)'} · {editing.centerId}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="text-sm text-slate-700 space-y-1">
                <span className="font-semibold">상태</span>
                <select
                  value={nextStatus}
                  onChange={(e) => setNextStatus(e.target.value as SubscriptionStatus)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300"
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABEL[s]}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm text-slate-700 space-y-1">
                <span className="font-semibold">플랜</span>
                <select
                  value={nextPlan}
                  onChange={(e) => setNextPlan(e.target.value as Plan)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300"
                >
                  {PLAN_OPTIONS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="text-sm text-slate-700 space-y-1">
                <span className="font-semibold">trial_end (선택)</span>
                <input
                  type="datetime-local"
                  value={nextTrialEnd}
                  onChange={(e) => setNextTrialEnd(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300"
                />
              </label>
              <label className="text-sm text-slate-700 space-y-1">
                <span className="font-semibold">current_period_end (선택)</span>
                <input
                  type="datetime-local"
                  value={nextPeriodEnd}
                  onChange={(e) => setNextPeriodEnd(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300"
                />
              </label>
            </div>

            <label className="text-sm text-slate-700 space-y-1 block">
              <span className="font-semibold">max_classes (선택)</span>
              <input
                type="number"
                value={nextMaxClasses}
                onChange={(e) => setNextMaxClasses(e.target.value)}
                placeholder="입력하지 않으면 기존값 유지"
                className="w-full px-3 py-2 rounded-lg border border-slate-300"
              />
            </label>

            <label className="text-sm text-slate-700 space-y-1 block">
              <span className="font-semibold">변경 사유 (필수)</span>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 rounded-lg border border-slate-300"
                placeholder="예: 결제 확인 지연, 해지 요청 접수 등"
              />
            </label>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={closeEditor}
                className="px-3 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm font-bold hover:bg-slate-100"
              >
                취소
              </button>
              <button
                type="button"
                disabled={patching}
                onClick={() => void submitPatch()}
                className="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 disabled:opacity-50"
              >
                {patching ? '처리 중...' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showBulkPreview && selectedIds.length > 0 && (
        <div className="fixed inset-0 z-[310] bg-black/50 flex items-center justify-center p-4">
          <div className="w-full max-w-3xl rounded-2xl bg-white shadow-xl border border-slate-200 p-5 space-y-4">
            <div>
              <h3 className="text-lg font-black text-slate-900">대량 변경 미리보기</h3>
              <p className="text-xs text-slate-500 mt-1">
                선택 {selectedIds.length}건 · 상태 {STATUS_LABEL[bulkStatus]} · 플랜 {bulkPlan}
              </p>
            </div>
            <div className="max-h-[45vh] overflow-auto rounded-lg border border-slate-200">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="text-left px-3 py-2">센터</th>
                    <th className="text-left px-3 py-2">Before</th>
                    <th className="text-left px-3 py-2">After</th>
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((r) => (
                    <tr key={r.centerId} className="border-t border-slate-100">
                      <td className="px-3 py-2">
                        <p className="font-semibold text-slate-800">{r.centerName}</p>
                        <p className="text-xs text-slate-500">{r.centerId}</p>
                      </td>
                      <td className="px-3 py-2">
                        <p>status: {STATUS_LABEL[r.beforeStatus]}</p>
                        <p>plan: {r.beforePlan}</p>
                      </td>
                      <td className="px-3 py-2">
                        <p className={r.beforeStatus !== r.afterStatus ? 'font-bold text-emerald-700' : ''}>
                          status: {STATUS_LABEL[r.afterStatus]}
                        </p>
                        <p className={r.beforePlan !== r.afterPlan ? 'font-bold text-emerald-700' : ''}>
                          plan: {r.afterPlan}
                        </p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowBulkPreview(false)}
                className="px-3 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm font-bold hover:bg-slate-100"
              >
                닫기
              </button>
              <button
                type="button"
                disabled={bulkApplying || bulkDryRun}
                onClick={() => void applyBulkStatus(true)}
                className="px-3 py-2 rounded-lg bg-blue-700 text-white text-sm font-bold hover:bg-blue-800 disabled:opacity-50"
              >
                {bulkApplying ? '적용 중...' : '이대로 일괄 적용'}
              </button>
            </div>
            {bulkDryRun && (
              <p className="text-xs text-amber-700">
                드라이런 모드가 켜져 있어 실제 적용할 수 없습니다. 체크 해제 후 진행해 주세요.
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
