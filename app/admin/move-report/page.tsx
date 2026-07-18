'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ExternalLink, Loader2, RefreshCw, X } from 'lucide-react';

type SubmissionRow = {
  id: string;
  session_id: string | null;
  age_group: string | null;
  profile_key: string | null;
  profile_title: string | null;
  attribution: Record<string, string> | null;
  created_at: string;
};

type RateBlock = {
  display: string;
  numerator: number;
  denominator: number;
  percent: number | null;
};

type SourceBreakdownRow = {
  channelKey: string;
  started: number;
  completed: number;
  completionRateDisplay: string;
  consultClicked: number;
};

type ProfileDistributionRow = {
  profileKey: string;
  profileTitle: string;
  completed: number;
  pctDisplay: string;
};

type DailySeriesRow = {
  date: string;
  started: number;
  completed: number;
  consultClicked: number;
};

type SummaryWindow = {
  funnel: {
    startedUnique: number;
    completedUnique: number;
    completionRate: RateBlock;
    resultViewedUnique: number;
  };
  conversion: {
    consultClickedUnique: number;
    applySubmittedUnique: number;
    consultRate: RateBlock;
    applyRate: RateBlock;
    educatorBetaOpened: number;
    educatorBetaSubmitted: number;
    educatorLeadsCount: number;
  };
  shared: {
    pageViewedUnique: number;
    startClickedUnique: number;
    restartRate: RateBlock;
    inboundCompletedUnique: number;
  };
  sourceBreakdown: SourceBreakdownRow[];
  profileDistribution: ProfileDistributionRow[];
  dailySeries: DailySeriesRow[];
  dataQuality?: { orphanCompletedSessions: number };
};

type EducatorLeadRow = {
  id: string;
  name: string;
  contact: string;
  role: string;
  organization: string | null;
  created_at: string;
};

type WindowKey = 'today' | 'days7' | 'days30';

function kpiLine(k: RateBlock, numLabel: string, denLabel: string) {
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
  const [attrTypeFilter, setAttrTypeFilter] = useState<'has_source' | 'utm' | 'ref' | 'none' | 'all'>('all');
  const [selected, setSelected] = useState<SubmissionRow | null>(null);

  const [summary, setSummary] = useState<Record<WindowKey, SummaryWindow> | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [windowKey, setWindowKey] = useState<WindowKey>('today');
  const [summaryLoadedAt, setSummaryLoadedAt] = useState<string | null>(null);

  const [educatorLeads, setEducatorLeads] = useState<EducatorLeadRow[]>([]);
  const [educatorLoading, setEducatorLoading] = useState(true);

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

  const loadEducatorLeads = async () => {
    setEducatorLoading(true);
    try {
      const res = await fetch('/api/admin/move-report/educator-leads', { credentials: 'include' });
      const json = (await res.json()) as { ok?: boolean; leads?: EducatorLeadRow[] };
      setEducatorLeads(json.ok ? (json.leads ?? []).slice(0, 30) : []);
    } catch {
      setEducatorLeads([]);
    } finally {
      setEducatorLoading(false);
    }
  };

  useEffect(() => {
    void load();
    void loadSummary();
    void loadEducatorLeads();
  }, []);

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
    a.href = url;
    a.download = `move_report_submissions_${new Date().toISOString().slice(0, 19).replace(/[-:T]/g, '')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const f = activeSummary?.funnel;
  const c = activeSummary?.conversion;
  const s = activeSummary?.shared;

  return (
    <div className="flex-1 min-h-screen bg-slate-50 w-full pb-[env(safe-area-inset-bottom,0px)]">
      <div className="p-4 sm:p-6 md:p-8 min-w-0 max-w-6xl mx-auto">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">MOVE REPORT 운영 대시보드</h1>
            <p className="text-sm text-slate-500 mt-1 max-w-xl">
              시작·완료·상담 전환·채널만 봅니다. 불필요한 바이럴/레거시 지표는 제거했습니다.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                void load();
                void loadSummary();
                void loadEducatorLeads();
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
            <Link
              href="/move-report/en"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[40px] items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              영문 버전 열기
              <ExternalLink className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <div className="mb-4 rounded-xl border border-slate-200 bg-white p-3 sm:p-4 shadow-sm">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-sm font-semibold text-slate-800">핵심 퍼널 · 전환</div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                기준: {windowKey === 'today' ? '오늘' : windowKey === 'days7' ? '최근 7일' : '최근 30일'}
                {summaryLoadedAt ? ` · 갱신 ${summaryLoadedAt}` : ''}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-1">
              {([
                ['today', '오늘'],
                ['days7', '7일'],
                ['days30', '30일'],
              ] as const).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setWindowKey(key)}
                  className={`rounded-md px-2.5 py-1 text-xs font-semibold cursor-pointer ${
                    windowKey === key ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {summaryLoading ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-500 inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> 요약 로딩 중...
            </div>
          ) : summaryError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-600">{summaryError}</div>
          ) : f && c && s ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 mb-3">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="text-xs text-slate-500">시작</div>
                  <div className="mt-1 text-xl font-bold text-slate-900">{f.startedUnique}</div>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="text-xs text-slate-500">완료</div>
                  <div className="mt-1 text-xl font-bold text-slate-900">{f.completedUnique}</div>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="text-xs text-slate-500">완료율</div>
                  {kpiLine(f.completionRate, '완료∩시작', '시작')}
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="text-xs text-slate-500">결과 조회</div>
                  <div className="mt-1 text-xl font-bold text-slate-900">{f.resultViewedUnique}</div>
                </div>
                <div className="rounded-lg border border-teal-200 bg-teal-50/50 p-3">
                  <div className="text-xs text-teal-800">상담 CTA 클릭</div>
                  <div className="mt-1 text-xl font-bold text-slate-900">{c.consultClickedUnique}</div>
                </div>
                <div className="rounded-lg border border-teal-200 bg-teal-50/50 p-3">
                  <div className="text-xs text-teal-800">상담 CTA율</div>
                  {kpiLine(c.consultRate, 'CTA∩결과', '결과 조회')}
                </div>
                <div className="rounded-lg border border-teal-200 bg-teal-50/50 p-3">
                  <div className="text-xs text-teal-800">연동 접수</div>
                  <div className="mt-1 text-xl font-bold text-slate-900">{c.applySubmittedUnique}</div>
                </div>
                <div className="rounded-lg border border-teal-200 bg-teal-50/50 p-3">
                  <div className="text-xs text-teal-800">접수율</div>
                  {kpiLine(c.applyRate, '접수∩CTA', 'CTA')}
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="text-xs text-slate-500">shared 조회</div>
                  <div className="mt-1 text-xl font-bold text-slate-900">{s.pageViewedUnique}</div>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="text-xs text-slate-500">shared 재시작</div>
                  <div className="mt-1 text-xl font-bold text-slate-900">{s.startClickedUnique}</div>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="text-xs text-slate-500">shared 재시작률</div>
                  {kpiLine(s.restartRate, '재시작', 'shared 조회')}
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="text-xs text-slate-500">educator 리드</div>
                  <div className="mt-1 text-xl font-bold text-slate-900">{c.educatorLeadsCount}</div>
                  <div className="mt-1 text-[10px] text-slate-400">
                    베타 오픈 {c.educatorBetaOpened} · 제출 {c.educatorBetaSubmitted}
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </div>

        {activeSummary && !summaryLoading && !summaryError ? (
          <div className="mb-4 rounded-xl border border-slate-200 bg-white p-3 sm:p-4 shadow-sm">
            <div className="text-sm font-semibold text-slate-800 mb-2">일별 추이</div>
            {activeSummary.dailySeries.length === 0 ? (
              <div className="text-xs text-slate-500 py-2">해당 기간 데이터가 없습니다.</div>
            ) : (
              <div className="overflow-x-auto text-xs">
                <table className="w-full text-left border-collapse min-w-[420px]">
                  <thead>
                    <tr className="text-slate-500 border-b border-slate-200">
                      <th className="py-2 pr-2 font-medium">날짜</th>
                      <th className="py-2 pr-2 font-medium text-right">시작</th>
                      <th className="py-2 pr-2 font-medium text-right">완료</th>
                      <th className="py-2 font-medium text-right">상담 CTA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeSummary.dailySeries.map((row) => (
                      <tr key={row.date} className="border-b border-slate-100 last:border-0">
                        <td className="py-2 pr-2 text-slate-800">{row.date}</td>
                        <td className="py-2 pr-2 text-right tabular-nums">{row.started}</td>
                        <td className="py-2 pr-2 text-right tabular-nums">{row.completed}</td>
                        <td className="py-2 text-right tabular-nums">{row.consultClicked}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : null}

        {activeSummary && !summaryLoading && !summaryError ? (
          <div className="mb-4 rounded-xl border border-slate-200 bg-white p-3 sm:p-4 shadow-sm">
            <div className="text-sm font-semibold text-slate-800 mb-2">채널별 성과</div>
            {activeSummary.sourceBreakdown.length === 0 ? (
              <div className="text-xs text-slate-500 py-2">채널 데이터가 없습니다.</div>
            ) : (
              <div className="overflow-x-auto text-xs">
                <table className="w-full text-left border-collapse min-w-[560px]">
                  <thead>
                    <tr className="text-slate-500 border-b border-slate-200">
                      <th className="py-2 pr-2 font-medium">채널</th>
                      <th className="py-2 pr-2 font-medium text-right">시작</th>
                      <th className="py-2 pr-2 font-medium text-right">완료</th>
                      <th className="py-2 pr-2 font-medium text-right">완료율</th>
                      <th className="py-2 font-medium text-right">상담 CTA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeSummary.sourceBreakdown.map((row) => (
                      <tr key={row.channelKey} className="border-b border-slate-100 last:border-0">
                        <td className="py-2 pr-2 text-slate-800">{channelLabel(row.channelKey)}</td>
                        <td className="py-2 pr-2 text-right tabular-nums">{row.started}</td>
                        <td className="py-2 pr-2 text-right tabular-nums">{row.completed}</td>
                        <td className="py-2 pr-2 text-right tabular-nums">{row.completionRateDisplay}</td>
                        <td className="py-2 text-right tabular-nums">{row.consultClicked}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : null}

        {activeSummary && !summaryLoading && !summaryError ? (
          <div className="mb-4 rounded-xl border border-slate-200 bg-white p-3 sm:p-4 shadow-sm">
            <div className="text-sm font-semibold text-slate-800 mb-2">결과 유형 분포</div>
            {activeSummary.profileDistribution.length === 0 ? (
              <div className="text-xs text-slate-500 py-2">제출 데이터가 없습니다.</div>
            ) : (
              <div className="overflow-x-auto text-xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-slate-500 border-b border-slate-200">
                      <th className="py-2 pr-2 font-medium">유형</th>
                      <th className="py-2 pr-2 font-medium text-right">완료 수</th>
                      <th className="py-2 font-medium text-right">비율</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeSummary.profileDistribution.map((row) => (
                      <tr key={row.profileKey} className="border-b border-slate-100 last:border-0">
                        <td className="py-2 pr-2 text-slate-800">{row.profileTitle}</td>
                        <td className="py-2 pr-2 text-right tabular-nums">{row.completed}</td>
                        <td className="py-2 text-right tabular-nums">{row.pctDisplay}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : null}

        <div className="mb-4 rounded-xl border border-slate-200 bg-white p-3 sm:p-4 shadow-sm">
          <div className="text-sm font-semibold text-slate-800 mb-2">educator 리드 (최근)</div>
          {educatorLoading ? (
            <div className="text-xs text-slate-500">로딩 중...</div>
          ) : educatorLeads.length === 0 ? (
            <div className="text-xs text-slate-500">리드가 없습니다.</div>
          ) : (
            <div className="overflow-x-auto text-xs">
              <table className="w-full text-left border-collapse min-w-[560px]">
                <thead>
                  <tr className="text-slate-500 border-b border-slate-200">
                    <th className="py-2 pr-2 font-medium">일시</th>
                    <th className="py-2 pr-2 font-medium">이름</th>
                    <th className="py-2 pr-2 font-medium">역할</th>
                    <th className="py-2 pr-2 font-medium">기관</th>
                    <th className="py-2 font-medium">연락처</th>
                  </tr>
                </thead>
                <tbody>
                  {educatorLeads.map((lead) => (
                    <tr key={lead.id} className="border-b border-slate-100 last:border-0">
                      <td className="py-2 pr-2 text-slate-600 whitespace-nowrap">
                        {new Date(lead.created_at).toLocaleString('ko-KR')}
                      </td>
                      <td className="py-2 pr-2 text-slate-800">{lead.name}</td>
                      <td className="py-2 pr-2 text-slate-700">{lead.role}</td>
                      <td className="py-2 pr-2 text-slate-700">{lead.organization || '—'}</td>
                      <td className="py-2 text-slate-700">{lead.contact}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {activeSummary?.dataQuality ? (
          <details className="mb-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-700">
            <summary className="cursor-pointer font-medium text-slate-600 py-1">데이터 품질</summary>
            <div className="pt-2 pb-1 text-slate-600">
              시작 없이 완료만 기록된 세션 {activeSummary.dataQuality.orphanCompletedSessions}건
            </div>
          </details>
        ) : null}

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
                <option value="all">전체</option>
                <option value="has_source">출처 있음</option>
                <option value="utm">utm만</option>
                <option value="ref">referrer만</option>
                <option value="none">직접</option>
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
          총 <span className="font-semibold text-slate-700">{rows.length}</span>건 · 필터{' '}
          <span className="font-semibold text-slate-700">{filteredRows.length}</span>건
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          {loading ? (
            <div className="p-6 text-sm text-slate-500 inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> 로딩 중...
            </div>
          ) : error ? (
            <div className="p-6 text-sm text-red-600">{error}</div>
          ) : filteredRows.length === 0 ? (
            <div className="p-6 text-sm text-slate-500">제출 로그가 없습니다.</div>
          ) : (
            <table className="w-full text-left text-xs border-collapse min-w-[720px]">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="px-3 py-2.5 font-medium">일시</th>
                  <th className="px-3 py-2.5 font-medium">연령</th>
                  <th className="px-3 py-2.5 font-medium">유형</th>
                  <th className="px-3 py-2.5 font-medium">utm</th>
                  <th className="px-3 py-2.5 font-medium">session</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer"
                    onClick={() => setSelected(r)}
                  >
                    <td className="px-3 py-2.5 whitespace-nowrap text-slate-700">
                      {new Date(r.created_at).toLocaleString('ko-KR')}
                    </td>
                    <td className="px-3 py-2.5 text-slate-700">{r.age_group ?? '—'}</td>
                    <td className="px-3 py-2.5 text-slate-800">{r.profile_title ?? r.profile_key ?? '—'}</td>
                    <td className="px-3 py-2.5 text-slate-600">{r.attribution?.utm_source ?? '—'}</td>
                    <td className="px-3 py-2.5 font-mono text-[10px] text-slate-500 max-w-[140px] truncate">
                      {r.session_id ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {selected ? (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-lg rounded-xl bg-white shadow-xl border border-slate-200 max-h-[85vh] overflow-auto">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                <h2 className="text-sm font-semibold text-slate-900">제출 상세</h2>
                <button type="button" onClick={() => setSelected(null)} className="p-1 rounded hover:bg-slate-100">
                  <X className="h-4 w-4 text-slate-500" />
                </button>
              </div>
              <div className="p-4 space-y-2 text-xs text-slate-700">
                <div>
                  <span className="text-slate-500">일시</span> {new Date(selected.created_at).toLocaleString('ko-KR')}
                </div>
                <div>
                  <span className="text-slate-500">연령</span> {selected.age_group ?? '—'}
                </div>
                <div>
                  <span className="text-slate-500">유형</span> {selected.profile_title ?? selected.profile_key ?? '—'}
                </div>
                <div>
                  <span className="text-slate-500">session</span>{' '}
                  <span className="font-mono break-all">{selected.session_id ?? '—'}</span>
                </div>
                <pre className="mt-2 rounded-lg bg-slate-50 p-3 overflow-auto text-[11px]">
                  {JSON.stringify(selected.attribution ?? {}, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
