'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ExternalLink, Loader2, RefreshCw, Trash2, X } from 'lucide-react';

type SubmissionRow = {
  id: string;
  session_id: string | null;
  age_group: string | null;
  profile_key: string | null;
  profile_title: string | null;
  attribution: Record<string, string> | null;
  created_at: string;
};

type FunnelKpiBlock = {
  display: string;
  numerator: number;
  denominator: number;
  percent: number | null;
};

type SourceBreakdownRow = {
  channelKey: string;
  visits: number;
  started: number;
  completed: number;
  completionRateDisplay: string;
  resultCardOpened: number;
  sharedRestart: number;
};

type ProfileDistributionRow = {
  profileKey: string;
  profileTitle: string;
  completed: number;
  pctDisplay: string;
  resultCardOpened: number;
};

type ViralBlock = {
  visitUnique: number;
  startedUnique: number;
  completedUnique: number;
  completionRate: FunnelKpiBlock;
  resultCardOpenedUnique: number;
  shareRate: FunnelKpiBlock;
  sharedPageViewedUnique: number;
  sharedStartClickedUnique: number;
  sharedRestartRate: FunnelKpiBlock;
  sharedInboundCompletedUnique: number;
  sharedReentryRate: FunnelKpiBlock;
};

type SummaryWindow = {
  viral: ViralBlock;
  completion: FunnelKpiBlock;
  share: FunnelKpiBlock;
  sharedReentry: FunnelKpiBlock;
  dataQuality?: {
    orphanCompletedSessions: number;
    orphanResultCardOpenedSessions: number;
    orphanSharedCompletedSessions: number;
  };
  sourceBreakdown: SourceBreakdownRow[];
  profileDistribution: ProfileDistributionRow[];
};

type WindowKey = 'today' | 'days7' | 'days30';

function kpiLine(k: FunnelKpiBlock, numLabel: string, denLabel: string) {
  return (
    <>
      <div className="mt-1 text-xl font-bold text-slate-900">{k.display}</div>
      <div className="mt-1 text-xs text-slate-500">
        {k.denominator > 0 ? `${k.numerator} / ${k.denominator}` : '—'}
      </div>
      <div className="mt-1 text-[11px] text-slate-400">
        {numLabel} / {denLabel}
      </div>
    </>
  );
}

function channelLabel(key: string): string {
  if (key === 'parent_direct') return 'parent_direct';
  if (key === 'educator_campaign') return 'educator_campaign';
  if (key === 'shared') return 'shared';
  if (key === 'direct_unknown') return 'direct_unknown';
  if (key.startsWith('utm:')) return `utm · ${key.slice(4)}`;
  if (key.startsWith('ref:')) return `referrer · ${key.slice(4)}`;
  return key;
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
          .join(','),
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

  const v = activeSummary?.viral;

  return (
    <div className="flex-1 min-h-screen bg-slate-50 w-full pb-[env(safe-area-inset-bottom,0px)]">
      <div className="p-4 sm:p-6 md:p-8 min-w-0 max-w-6xl mx-auto">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">MOVE REPORT 바이럴 대시보드</h1>
            <p className="text-sm text-slate-500 mt-1 max-w-xl">
              무료 MOVE REPORT가 어디서 유입되고, 얼마나 완료되고, shared 카드로 다시 퍼지는지 확인합니다.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                void load();
                void loadSummary();
              }}
              className="inline-flex min-h-[40px] items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              <RefreshCw className="h-4 w-4" />
              새로고침
            </button>
            <Link
              href="/move-report"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[40px] items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              MOVE REPORT 열기
              <ExternalLink className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {/* 핵심 퍼널 */}
        <div className="mb-4 rounded-xl border border-slate-200 bg-white p-3 sm:p-4 shadow-sm">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-sm font-semibold text-slate-800">핵심 퍼널</div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                기준: {windowKey === 'today' ? '오늘 00:00~현재' : windowKey === 'days7' ? '최근 7일' : '최근 30일'}
                {summaryLoadedAt ? ` · 갱신 ${summaryLoadedAt}` : ''}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-1">
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
                className="ml-1 rounded-md px-2.5 py-1 text-xs font-semibold cursor-pointer bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1"
              >
                {funnelResetting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                이벤트 초기화
              </button>
            </div>
          </div>

          {summaryLoading ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-500">요약 로딩 중...</div>
          ) : summaryError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-600">{summaryError}</div>
          ) : activeSummary && v ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 mb-3">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="text-xs text-slate-500">방문 수</div>
                  <div className="mt-1 text-xl font-bold text-slate-900">{v.visitUnique}</div>
                  <div className="mt-1 text-[10px] text-slate-400">intro_started 유니크 세션</div>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="text-xs text-slate-500">테스트 시작</div>
                  <div className="mt-1 text-xl font-bold text-slate-900">{v.startedUnique}</div>
                  <div className="mt-1 text-[10px] text-slate-400">intro ∪ move_report_started</div>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="text-xs text-slate-500">테스트 완료</div>
                  <div className="mt-1 text-xl font-bold text-slate-900">{v.completedUnique}</div>
                  <div className="mt-1 text-[10px] text-slate-400">survey / move_report 완료</div>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="text-xs text-slate-500">완료율</div>
                  {kpiLine(v.completionRate, '완료 ∩ 시작', '시작 세션')}
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="text-xs text-slate-500">결과 카드 보기</div>
                  <div className="mt-1 text-xl font-bold text-slate-900">{v.resultCardOpenedUnique}</div>
                  <div className="mt-1 text-[10px] text-slate-400">move_report_result_card_opened</div>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="text-xs text-slate-500">결과 카드 보기율</div>
                  {kpiLine(v.shareRate, '카드 열림 ∩ 결과 조회', '결과 화면 조회')}
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="text-xs text-slate-500">shared 페이지 방문</div>
                  <div className="mt-1 text-xl font-bold text-slate-900">{v.sharedPageViewedUnique}</div>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="text-xs text-slate-500">shared에서 다시 시작 클릭</div>
                  <div className="mt-1 text-xl font-bold text-slate-900">{v.sharedStartClickedUnique}</div>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="text-xs text-slate-500">shared 재시작률</div>
                  {kpiLine(v.sharedRestartRate, 'shared 시작 클릭', 'shared 페이지 조회')}
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="text-xs text-slate-500">shared 유입 완료</div>
                  <div className="mt-1 text-xl font-bold text-slate-900">{v.sharedInboundCompletedUnique}</div>
                  <div className="mt-1 text-[10px] text-slate-400">mr_source=shared 등 분류</div>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 sm:col-span-2">
                  <div className="text-xs text-slate-500">shared 유입 → 재완료 (참고)</div>
                  {kpiLine(v.sharedReentryRate, 'shared 시작 후 shared 출처 완료', 'shared 시작 클릭')}
                </div>
              </div>
              <p className="text-[10px] text-slate-400 mb-3">
                채널 표에서 내부 실험용 링크 유입(coach)은 제외됩니다. coach 관련 API·데이터는 서버에 보존됩니다.
              </p>
            </>
          ) : null}
        </div>

        {/* 채널별 성과 */}
        {activeSummary && !summaryLoading && !summaryError ? (
          <div className="mb-4 rounded-xl border border-slate-200 bg-white p-3 sm:p-4 shadow-sm">
            <div className="text-sm font-semibold text-slate-800 mb-2">채널별 성과</div>
            <p className="text-[11px] text-slate-500 mb-2">
              세션의 첫 방문/시작 이벤트 기준 채널입니다. parent_direct · educator_campaign · shared · direct_unknown 및 utm / referrer
              조합을 포함합니다.
            </p>
            {activeSummary.sourceBreakdown.length === 0 ? (
              <div className="text-xs text-slate-500 py-2">해당 기간에 표시할 채널 데이터가 없습니다.</div>
            ) : (
              <div className="overflow-x-auto text-xs">
                <table className="w-full text-left border-collapse min-w-[720px]">
                  <thead>
                    <tr className="text-slate-500 border-b border-slate-200">
                      <th className="py-2 pr-2 font-medium">채널</th>
                      <th className="py-2 pr-2 font-medium text-right">방문</th>
                      <th className="py-2 pr-2 font-medium text-right">시작</th>
                      <th className="py-2 pr-2 font-medium text-right">완료</th>
                      <th className="py-2 pr-2 font-medium text-right">완료율</th>
                      <th className="py-2 pr-2 font-medium text-right">결과 카드</th>
                      <th className="py-2 font-medium text-right">shared 재시작</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeSummary.sourceBreakdown.map((row) => (
                      <tr key={row.channelKey} className="border-b border-slate-100 last:border-0">
                        <td className="py-2 pr-2 text-slate-800">{channelLabel(row.channelKey)}</td>
                        <td className="py-2 pr-2 text-right tabular-nums">{row.visits}</td>
                        <td className="py-2 pr-2 text-right tabular-nums">{row.started}</td>
                        <td className="py-2 pr-2 text-right tabular-nums">{row.completed}</td>
                        <td className="py-2 pr-2 text-right tabular-nums">{row.completionRateDisplay}</td>
                        <td className="py-2 pr-2 text-right tabular-nums">{row.resultCardOpened}</td>
                        <td className="py-2 text-right tabular-nums">{row.sharedRestart}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : null}

        {/* 결과 유형 분포 */}
        {activeSummary && !summaryLoading && !summaryError ? (
          <div className="mb-4 rounded-xl border border-slate-200 bg-white p-3 sm:p-4 shadow-sm">
            <div className="text-sm font-semibold text-slate-800 mb-2">결과 유형 분포</div>
            <p className="text-[11px] text-slate-500 mb-2">동일 기간 설문 제출 건수 기준입니다.</p>
            {activeSummary.profileDistribution.length === 0 ? (
              <div className="text-xs text-slate-500 py-2">제출 데이터가 없습니다.</div>
            ) : (
              <div className="overflow-x-auto text-xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-slate-500 border-b border-slate-200">
                      <th className="py-2 pr-2 font-medium">유형명</th>
                      <th className="py-2 pr-2 font-medium text-right">완료 수</th>
                      <th className="py-2 pr-2 font-medium text-right">비율</th>
                      <th className="py-2 font-medium text-right">결과 카드 보기</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeSummary.profileDistribution.map((row) => (
                      <tr key={row.profileKey} className="border-b border-slate-100 last:border-0">
                        <td className="py-2 pr-2 text-slate-800">{row.profileTitle}</td>
                        <td className="py-2 pr-2 text-right tabular-nums">{row.completed}</td>
                        <td className="py-2 pr-2 text-right tabular-nums">{row.pctDisplay}</td>
                        <td className="py-2 text-right tabular-nums">{row.resultCardOpened}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : null}

        {/* 데이터 품질 — 접힘 · KPI보다 작게 */}
        {activeSummary?.dataQuality ? (
          <details className="mb-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-700">
            <summary className="cursor-pointer font-medium text-slate-600 py-1">데이터 품질 안내</summary>
            <div className="space-y-1 pt-2 pb-1 text-slate-600">
              <div>시작 이벤트 없이 완료만 기록된 세션 {(activeSummary.dataQuality.orphanCompletedSessions ?? 0)}건</div>
              <div>
                결과 화면 조회 없이 결과 카드만 연 세션 {(activeSummary.dataQuality.orphanResultCardOpenedSessions ?? 0)}건
              </div>
              <div>
                shared 시작 클릭 없이 shared 출처 완료만 기록된 세션 {(activeSummary.dataQuality.orphanSharedCompletedSessions ?? 0)}건
              </div>
            </div>
          </details>
        ) : null}

        {/* 필터 · 설문 목록 — 운영 확인용 (바이럴 보조) */}
        <div className="mb-4 rounded-xl border border-slate-200 bg-white p-3 sm:p-4 shadow-sm">
          <div className="flex flex-wrap items-end justify-between gap-3 mb-3">
            <div className="text-sm font-semibold text-slate-800">최근 제출 로그</div>
            <button
              type="button"
              onClick={exportCsv}
              disabled={filteredRows.length === 0}
              className="text-xs font-medium text-slate-600 underline underline-offset-2 hover:text-slate-900 disabled:opacity-40 disabled:no-underline"
            >
              필터 결과 CSV 저장
            </button>
          </div>
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
