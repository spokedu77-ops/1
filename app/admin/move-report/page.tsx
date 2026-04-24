'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Download, ExternalLink, Loader2, RefreshCw, Trash2, X } from 'lucide-react';

type SubmissionRow = {
  id: string;
  session_id: string | null;
  age_group: string | null;
  profile_key: string | null;
  profile_title: string | null;
  attribution: Record<string, string> | null;
  created_at: string;
};

type EventName =
  | 'intro_started'
  | 'survey_completed'
  | 'result_viewed'
  | 'lead_saved'
  | 'share_clicked'
  | 'shared_entry_opened'
  | 'shared_entry_completed';

type SummaryWindow = {
  counts: Record<EventName, number>;
  kpi: {
    completionRate: number;
    shareRate: number;
    sharedRecompletionRate: number;
  };
};

type WindowKey = 'today' | 'days7' | 'days30';

function formatPercentSafe(num: number, den: number) {
  if (!den) return '-';
  return `${((num / den) * 100).toFixed(1)}%`;
}

export default function AdminMoveReportPage() {
  const [rows, setRows] = useState<SubmissionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ageFilter, setAgeFilter] = useState('all');
  const [profileFilter, setProfileFilter] = useState('all');
  const [attrTypeFilter, setAttrTypeFilter] = useState<'has_source' | 'utm' | 'ref' | 'none' | 'all'>('has_source');
  const [selected, setSelected] = useState<SubmissionRow | null>(null);

  const [summary, setSummary] = useState<Record<WindowKey, SummaryWindow> | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [windowKey, setWindowKey] = useState<WindowKey>('today');
  const [summaryLoadedAt, setSummaryLoadedAt] = useState<string | null>(null);

  const [attrTop, setAttrTop] = useState<{ source: string; type: 'utm_source' | 'referrer_host' | 'none'; count: number }[] | null>(null);
  const [attrLoading, setAttrLoading] = useState(true);
  const [attrError, setAttrError] = useState<string | null>(null);

  const [funnelResetting, setFunnelResetting] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/move-report/submissions', { credentials: 'include' });
      const json = (await res.json()) as { ok?: boolean; submissions?: SubmissionRow[]; error?: string };
      if (!json.ok) {
        setError(json.error ?? '설문 데이터를 불러오지 못했습니다.');
        setRows([]);
        return;
      }
      setRows(json.submissions ?? []);
    } catch {
      setError('네트워크 오류가 발생했습니다.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const loadSummary = async () => {
    setSummaryLoading(true);
    setSummaryError(null);
    try {
      const res = await fetch('/api/admin/move-report/events-summary', { credentials: 'include' });
      const json = (await res.json()) as {
        ok?: boolean;
        summary?: Record<WindowKey, SummaryWindow>;
        error?: string;
      };
      if (!json.ok || !json.summary) {
        setSummaryError(json.error ?? '퍼널 요약 데이터를 불러오지 못했습니다.');
        setSummary(null);
        return;
      }
      setSummary(json.summary);
      setSummaryLoadedAt(new Date().toLocaleString('ko-KR'));
    } catch {
      setSummaryError('퍼널 요약 네트워크 오류가 발생했습니다.');
      setSummary(null);
    } finally {
      setSummaryLoading(false);
    }
  };

  useEffect(() => {
    void loadSummary();
  }, []);

  const loadAttributionTop = async () => {
    setAttrLoading(true);
    setAttrError(null);
    try {
      const res = await fetch('/api/admin/move-report/attribution-sources', { credentials: 'include' });
      const json = (await res.json()) as {
        ok?: boolean;
        top?: { source: string; type: 'utm_source' | 'referrer_host' | 'none'; count: number }[];
        error?: string;
      };
      if (!json.ok) {
        setAttrError(json.error ?? 'utm 출처 요약을 불러오지 못했습니다.');
        setAttrTop(null);
        return;
      }
      setAttrTop(json.top ?? []);
    } catch {
      setAttrError('utm 출처 요약 네트워크 오류가 발생했습니다.');
      setAttrTop(null);
    } finally {
      setAttrLoading(false);
    }
  };

  useEffect(() => {
    void loadAttributionTop();
  }, []);

  const resetFunnelEvents = async () => {
    if (!window.confirm('퍼널 이벤트 데이터를 전체 삭제할까요?\n(테스트 데이터 정리용 — 복구 불가)')) return;
    setFunnelResetting(true);
    try {
      const res = await fetch('/api/admin/move-report/events-reset', {
        method: 'POST',
        credentials: 'include',
      });
      const json = (await res.json()) as { ok?: boolean; deleted?: number; error?: string };
      if (!json.ok) {
        window.alert(json.error ?? '삭제 중 오류가 발생했습니다.');
        return;
      }
      window.alert(`이벤트 ${json.deleted ?? 0}건 삭제 완료`);
      void loadSummary();
      void loadAttributionTop();
    } catch {
      window.alert('네트워크 오류가 발생했습니다.');
    } finally {
      setFunnelResetting(false);
    }
  };

  const profileOptions = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => {
      if (r.profile_key) set.add(r.profile_key);
    });
    return Array.from(set).sort();
  }, [rows]);

  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      if (ageFilter !== 'all' && (r.age_group ?? '') !== ageFilter) return false;
      if (profileFilter !== 'all' && (r.profile_key ?? '') !== profileFilter) return false;

      if (attrTypeFilter !== 'all') {
        const hasUtm = !!r.attribution?.utm_source;
        const hasRef = !!r.attribution?.referrer_host;
        if (attrTypeFilter === 'has_source' && !hasUtm && !hasRef) return false;
        if (attrTypeFilter === 'utm' && !hasUtm) return false;
        if (attrTypeFilter === 'ref' && (hasUtm || !hasRef)) return false;
        if (attrTypeFilter === 'none' && (hasUtm || hasRef)) return false;
      }

      return true;
    });
  }, [rows, ageFilter, profileFilter, attrTypeFilter]);

  const total = useMemo(() => rows.length, [rows]);
  const activeSummary = summary?.[windowKey] ?? null;

  const exportCsv = () => {
    if (!filteredRows.length) return;
    const header = ['created_at', 'session_id', 'age_group', 'profile_key', 'profile_title', 'utm_source', 'utm_medium', 'ref'];
    const escapeCell = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const lines = [
      header.join(','),
      ...filteredRows.map((r) =>
        [
          new Date(r.created_at).toISOString(),
          r.session_id ?? '',
          r.age_group ?? '',
          r.profile_key ?? '',
          r.profile_title ?? '',
          r.attribution?.utm_source ?? '',
          r.attribution?.utm_medium ?? '',
          r.attribution?.ref ?? '',
        ]
          .map((v) => escapeCell(String(v)))
          .join(',')
      ),
    ];

    const bom = '\uFEFF';
    const blob = new Blob([bom + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const stamp = new Date().toISOString().slice(0, 19).replace(/[-:T]/g, '');
    a.href = url;
    a.download = `move_report_submissions_${stamp}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex-1 min-h-screen bg-slate-50 w-full pb-[env(safe-area-inset-bottom,0px)]">
      <div className="p-4 sm:p-6 md:p-8 min-w-0 max-w-6xl mx-auto">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">MOVE 리포트</h1>
            <p className="text-sm text-slate-500 mt-1">설문 제출 내역 및 퍼널 KPI</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                void load();
                void loadSummary();
                void loadAttributionTop();
              }}
              className="inline-flex min-h-[40px] items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              <RefreshCw className="h-4 w-4" />
              새로고침
            </button>
            <button
              type="button"
              onClick={exportCsv}
              disabled={filteredRows.length === 0}
              className="inline-flex min-h-[40px] items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <Download className="h-4 w-4" />
              CSV 다운로드
            </button>
            <Link
              href="/move-report"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[40px] items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              MOVE 리포트 새창 열기
              <ExternalLink className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {/* 퍼널 KPI */}
        <div className="mb-4 rounded-xl border border-slate-200 bg-white p-3 sm:p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div>
              <div className="text-sm font-semibold text-slate-800">퍼널 KPI</div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                기준: {windowKey === 'today' ? '오늘 00:00~현재' : windowKey === 'days7' ? '최근 7일' : '최근 30일'}
                {summaryLoadedAt ? ` · 갱신 ${summaryLoadedAt}` : ''}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setWindowKey('today')}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold cursor-pointer ${
                  windowKey === 'today' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                오늘
              </button>
              <button
                type="button"
                onClick={() => setWindowKey('days7')}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold cursor-pointer ${
                  windowKey === 'days7' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                7일
              </button>
              <button
                type="button"
                onClick={() => setWindowKey('days30')}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold cursor-pointer ${
                  windowKey === 'days30' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                30일
              </button>
              <button
                type="button"
                onClick={() => void resetFunnelEvents()}
                disabled={funnelResetting}
                className="ml-2 rounded-md px-2.5 py-1 text-xs font-semibold cursor-pointer bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1"
              >
                {funnelResetting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                KPI 리셋
              </button>
            </div>
          </div>
          {summaryLoading ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-500">요약 로딩 중...</div>
          ) : summaryError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-600">{summaryError}</div>
          ) : activeSummary ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-3">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="text-xs text-slate-500">완료율</div>
                <div className="mt-1 text-xl font-bold text-slate-900">
                  {formatPercentSafe(activeSummary.counts.survey_completed, activeSummary.counts.intro_started)}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  {activeSummary.counts.survey_completed} / {activeSummary.counts.intro_started}
                </div>
                <div className="mt-1 text-[11px] text-slate-400">설문완료 / 인트로진입</div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="text-xs text-slate-500">공유율</div>
                <div className="mt-1 text-xl font-bold text-slate-900">
                  {formatPercentSafe(activeSummary.counts.share_clicked, activeSummary.counts.result_viewed)}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  {activeSummary.counts.share_clicked} / {activeSummary.counts.result_viewed}
                </div>
                <div className="mt-1 text-[11px] text-slate-400">공유클릭 / 결과뷰</div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="text-xs text-slate-500">공유유입 재완료율</div>
                <div className="mt-1 text-xl font-bold text-slate-900">
                  {formatPercentSafe(activeSummary.counts.shared_entry_completed, activeSummary.counts.shared_entry_opened)}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  {activeSummary.counts.shared_entry_completed} / {activeSummary.counts.shared_entry_opened}
                </div>
                <div className="mt-1 text-[11px] text-slate-400">공유진입완료 / 공유진입</div>
              </div>
            </div>
          ) : null}

          {/* 유입 출처 분포 */}
          <div className="mt-4 rounded-lg border border-slate-100 bg-slate-50/80 p-3">
            <div className="text-xs font-semibold text-slate-700 mb-1">유입 출처 분포 (최근 30일)</div>
            <p className="text-[11px] text-slate-500 mb-2">
              utm_source 우선, 없으면 referrer_host 표시 · 이벤트 기준
            </p>
            {attrLoading ? (
              <div className="text-xs text-slate-500">로딩 중…</div>
            ) : attrError ? (
              <div className="text-xs text-red-600">{attrError}</div>
            ) : attrTop && attrTop.length > 0 ? (
              <div className="max-h-40 overflow-y-auto text-xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-slate-500 border-b border-slate-200">
                      <th className="py-1 pr-2 font-medium">출처</th>
                      <th className="py-1 pr-2 font-medium">구분</th>
                      <th className="py-1 font-medium text-right">이벤트 수</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attrTop.map((row) => (
                      <tr key={row.source} className="border-b border-slate-100 last:border-0">
                        <td className="py-1 pr-2 text-slate-800 break-all">{row.source}</td>
                        <td className="py-1 pr-2">
                          {row.type === 'utm_source' ? (
                            <span className="rounded px-1.5 py-0.5 bg-blue-50 text-blue-600 font-medium">utm</span>
                          ) : row.type === 'referrer_host' ? (
                            <span className="rounded px-1.5 py-0.5 bg-green-50 text-green-600 font-medium">ref</span>
                          ) : (
                            <span className="rounded px-1.5 py-0.5 bg-slate-100 text-slate-400 font-medium">직접</span>
                          )}
                        </td>
                        <td className="py-1 text-right tabular-nums text-slate-700">{row.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-xs text-slate-500">데이터가 없습니다.</div>
            )}
          </div>
        </div>

        {/* 필터 */}
        <div className="mb-4 rounded-xl border border-slate-200 bg-white p-3 sm:p-4 shadow-sm">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="text-xs text-slate-500">유입 분류</label>
              <select
                value={attrTypeFilter}
                onChange={(e) => setAttrTypeFilter(e.target.value as typeof attrTypeFilter)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
              >
                <option value="has_source">출처 있음 (utm+ref)</option>
                <option value="utm">utm_source만</option>
                <option value="ref">referrer_host만</option>
                <option value="none">직접 접속</option>
                <option value="all">전체</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500">연령대</label>
              <select
                value={ageFilter}
                onChange={(e) => setAgeFilter(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
              >
                <option value="all">전체</option>
                <option value="preschool">preschool</option>
                <option value="elementary">elementary</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500">프로필키</label>
              <select
                value={profileFilter}
                onChange={(e) => setProfileFilter(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
              >
                <option value="all">전체</option>
                {profileOptions.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="mb-3 text-xs text-slate-500">
          총 <span className="font-semibold text-slate-700">{total}</span>건
          {' · '}
          필터 결과 <span className="font-semibold text-slate-700">{filteredRows.length}</span>건
        </div>

        {/* 설문 제출 목록 */}
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-slate-400">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : error ? (
            <div className="py-10 px-4 text-center text-sm text-red-600">{error}</div>
          ) : filteredRows.length === 0 ? (
            <div className="py-10 px-4 text-center text-sm text-slate-500">
              설문 제출 내역이 없습니다. (설문을 완료하면 여기에 쌓입니다)
            </div>
          ) : (
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-slate-600">제출일시</th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-600">연령대</th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-600">프로필키</th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-600">프로필명</th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-600">유입 출처</th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-600">상세</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((r) => (
                  <tr key={r.id} className="border-b border-slate-100 last:border-b-0">
                    <td className="px-3 py-2 text-slate-600">
                      {new Date(r.created_at).toLocaleString('ko-KR', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-3 py-2 text-slate-700">{r.age_group ?? '-'}</td>
                    <td className="px-3 py-2 text-slate-700">{r.profile_key ?? '-'}</td>
                    <td className="px-3 py-2 text-slate-700">{r.profile_title ?? '-'}</td>
                    <td className="px-3 py-2 text-slate-500 text-xs">
                      {r.attribution?.utm_source ?? r.attribution?.referrer_host ?? '-'}
                    </td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => setSelected(r)}
                        className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                      >
                        보기
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* 상세 모달 */}
        {selected ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
            <div className="w-full max-w-lg rounded-2xl bg-white border border-slate-200 shadow-xl">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                <h2 className="text-base font-semibold text-slate-900">설문 제출 상세</h2>
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-xs text-slate-500">제출일시</div>
                  <div className="mt-1 text-slate-800">
                    {new Date(selected.created_at).toLocaleString('ko-KR', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">세션 ID</div>
                  <div className="mt-1 text-slate-700 break-all text-xs">{selected.session_id ?? '-'}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">연령대</div>
                  <div className="mt-1 text-slate-800">{selected.age_group ?? '-'}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">프로필키</div>
                  <div className="mt-1 text-slate-800">{selected.profile_key ?? '-'}</div>
                </div>
                <div className="sm:col-span-2">
                  <div className="text-xs text-slate-500">프로필명</div>
                  <div className="mt-1 text-slate-800">{selected.profile_title ?? '-'}</div>
                </div>
                {selected.attribution && Object.keys(selected.attribution).length > 0 ? (
                  <div className="sm:col-span-2">
                    <div className="text-xs text-slate-500 mb-1">Attribution</div>
                    <div className="rounded-lg bg-slate-50 border border-slate-100 px-3 py-2">
                      {Object.entries(selected.attribution).map(([k, v]) => (
                        <div key={k} className="flex gap-2 text-xs py-0.5">
                          <span className="text-slate-500 min-w-[90px]">{k}</span>
                          <span className="text-slate-800 break-all">{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
                <div className="sm:col-span-2">
                  <div className="text-xs text-slate-500">ID</div>
                  <div className="mt-1 text-slate-700 break-all text-xs">{selected.id}</div>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
