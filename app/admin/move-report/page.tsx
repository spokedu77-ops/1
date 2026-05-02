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

type FunnelKpiBlock = {
  display: string;
  numerator: number;
  denominator: number;
  percent: number | null;
};

type SummaryWindow = {
  completion: FunnelKpiBlock;
  share: FunnelKpiBlock;
  sharedReentry: FunnelKpiBlock;
  dataQuality?: {
    orphanCompletedSessions: number;
    orphanResultCardOpenedSessions: number;
    orphanSharedCompletedSessions: number;
  };
  rawEventTotals: Record<string, number>;
  parentViral: {
    startedUnique: number;
    completedUnique: number;
    resultCardOpenedUnique: number;
    sharedPageViewedUnique: number;
    sharedStartClickedUnique: number;
  };
  educatorDistribution: {
    coachLinkCreated: number;
    coachLinkLanding: number;
    coachSubmissionCompleted: number;
    coachDashboardViewed: number;
    coachCsvDownloaded: number;
  };
};

type WindowKey = 'today' | 'days7' | 'days30';

type EducatorLeadRow = {
  id: string;
  name: string;
  contact: string;
  role: string;
  organization: string | null;
  target_age_group: string;
  needed_feature: string;
  source: string;
  consent: boolean;
  meta: unknown;
  created_at: string;
};

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

  const [attrTop, setAttrTop] = useState<
    { source: string; count: number; bucket: 'mr_source' | 'utm' | 'coach_link' | 'shared' | 'ref' | 'direct' }[] | null
  >(null);
  const [attrLoading, setAttrLoading] = useState(true);
  const [attrError, setAttrError] = useState<string | null>(null);

  const [funnelResetting, setFunnelResetting] = useState(false);

  const [educatorRows, setEducatorRows] = useState<EducatorLeadRow[]>([]);
  const [educatorLoading, setEducatorLoading] = useState(true);
  const [educatorError, setEducatorError] = useState<string | null>(null);
  const [coachDisableSlug, setCoachDisableSlug] = useState('');
  const [coachDisableReason, setCoachDisableReason] = useState('');
  const [coachDisabling, setCoachDisabling] = useState(false);

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
        top?: { source: string; count: number; bucket: 'mr_source' | 'utm' | 'coach_link' | 'shared' | 'ref' | 'direct' }[];
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

  const loadEducatorLeads = async () => {
    setEducatorLoading(true);
    setEducatorError(null);
    try {
      const res = await fetch('/api/admin/move-report/educator-leads', { credentials: 'include' });
      const json = (await res.json()) as { ok?: boolean; leads?: EducatorLeadRow[]; error?: string };
      if (!json.ok) {
        setEducatorError(json.error ?? '교육자 베타 신청 목록을 불러오지 못했습니다.');
        setEducatorRows([]);
        return;
      }
      setEducatorRows(json.leads ?? []);
    } catch {
      setEducatorError('교육자 베타 신청 목록 네트워크 오류가 발생했습니다.');
      setEducatorRows([]);
    } finally {
      setEducatorLoading(false);
    }
  };

  useEffect(() => {
    void loadEducatorLeads();
  }, []);

  const exportEducatorLeadsCsv = () => {
    if (!educatorRows.length) return;
    const header = [
      'created_at',
      'name',
      'contact',
      'role',
      'organization',
      'target_age_group',
      'needed_feature',
      'source',
      'status',
    ];
    const escapeCell = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const lines = [
      header.join(','),
      ...educatorRows.map((r) =>
        [
          new Date(r.created_at).toISOString(),
          r.name,
          r.contact,
          r.role,
          r.organization ?? '',
          r.target_age_group,
          r.needed_feature,
          r.source,
          'new',
        ]
          .map((c) => escapeCell(String(c)))
          .join(','),
      ),
    ];
    const bom = '\uFEFF';
    const blob = new Blob([bom + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const stamp = new Date().toISOString().slice(0, 19).replace(/[-:T]/g, '');
    a.href = url;
    a.download = `move_report_educator_leads_${stamp}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const submitCoachLinkDisable = async () => {
    const slug = coachDisableSlug.trim().toLowerCase().replace(/_/g, '-');
    if (!slug) {
      window.alert('비활성화할 링크 주소(slug)를 입력해 주세요.');
      return;
    }
    if (!window.confirm(`이 코치 링크를 비활성화할까요?\n${slug}`)) return;
    setCoachDisabling(true);
    try {
      const res = await fetch('/api/admin/move-report/coach-link-status', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          active: false,
          reason: coachDisableReason.trim() || '관리자 비활성화',
        }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!json.ok) {
        window.alert(json.error ?? '처리에 실패했습니다.');
        return;
      }
      window.alert('비활성화되었습니다. 제출·대시보드에서 제외됩니다.');
      setCoachDisableSlug('');
      setCoachDisableReason('');
    } catch {
      window.alert('네트워크 오류가 발생했습니다.');
    } finally {
      setCoachDisabling(false);
    }
  };

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
                void loadEducatorLeads();
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
            <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-3">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="text-xs text-slate-500">완료율 (세션 유니크)</div>
                {kpiLine(activeSummary.completion, '시작한 세션 중 완료', '시작 세션')}
                <div className="mt-1 text-[10px] text-slate-400">
                  분자: 완료 ∩ 시작 · 분모: intro_started ∪ move_report_started (session_id)
                </div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="text-xs text-slate-500">공유 카드 열림 (세션 유니크)</div>
                {kpiLine(activeSummary.share, '결과 조회 세션 중 카드 열림', '결과 화면 조회')}
                <div className="mt-1 text-[10px] text-slate-400">
                  분자: result_card_opened ∩ result_viewed · 분모: result_viewed
                </div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="text-xs text-slate-500">공유 유입 재완료 (세션 유니크)</div>
                {kpiLine(activeSummary.sharedReentry, 'shared 시작 클릭 세션 중 공유 유입 완료', 'shared 시작 클릭')}
                <div className="mt-1 text-[10px] text-slate-400">
                  공유 유입 완료: 완료 이벤트 메타에서 mr_source=shared 또는 출처 분류 shared
                </div>
              </div>
            </div>
            {activeSummary.dataQuality &&
            ((activeSummary.dataQuality.orphanCompletedSessions ?? 0) > 0 ||
              (activeSummary.dataQuality.orphanResultCardOpenedSessions ?? 0) > 0 ||
              (activeSummary.dataQuality.orphanSharedCompletedSessions ?? 0) > 0) ? (
              <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50/90 px-3 py-2 text-[11px] text-amber-950 space-y-1">
                <div className="font-semibold text-amber-900">데이터 품질 안내</div>
                {(activeSummary.dataQuality.orphanCompletedSessions ?? 0) > 0 ? (
                  <div>
                    시작 이벤트 없이 완료만 기록된 세션 {activeSummary.dataQuality.orphanCompletedSessions}건
                  </div>
                ) : null}
                {(activeSummary.dataQuality.orphanResultCardOpenedSessions ?? 0) > 0 ? (
                  <div>
                    결과 화면 조회 없이 결과 카드만 연 세션 {activeSummary.dataQuality.orphanResultCardOpenedSessions}건
                  </div>
                ) : null}
                {(activeSummary.dataQuality.orphanSharedCompletedSessions ?? 0) > 0 ? (
                  <div>
                    shared 페이지에서 시작 클릭 없이 공유 유입 완료만 기록된 세션{' '}
                    {activeSummary.dataQuality.orphanSharedCompletedSessions}건
                  </div>
                ) : null}
              </div>
            ) : null}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
              <div className="rounded-lg border border-slate-100 bg-white p-3">
                <div className="text-xs font-semibold text-slate-700 mb-1">부모 바이럴 (유니크 세션·건수)</div>
                <ul className="text-[11px] text-slate-600 space-y-0.5 tabular-nums">
                  <li>시작: {activeSummary.parentViral.startedUnique}</li>
                  <li>완료: {activeSummary.parentViral.completedUnique}</li>
                  <li>결과 카드 열림: {activeSummary.parentViral.resultCardOpenedUnique}</li>
                  <li>shared 조회: {activeSummary.parentViral.sharedPageViewedUnique}</li>
                  <li>shared에서 시작 클릭: {activeSummary.parentViral.sharedStartClickedUnique}</li>
                </ul>
              </div>
              <div className="rounded-lg border border-slate-100 bg-white p-3">
                <div className="text-xs font-semibold text-slate-700 mb-1">교육자 배포 (이벤트 건수)</div>
                <ul className="text-[11px] text-slate-600 space-y-0.5 tabular-nums">
                  <li>링크 생성: {activeSummary.educatorDistribution.coachLinkCreated}</li>
                  <li>코치 링크 랜딩: {activeSummary.educatorDistribution.coachLinkLanding}</li>
                  <li>제출 완료(코치): {activeSummary.educatorDistribution.coachSubmissionCompleted}</li>
                  <li>대시보드 조회: {activeSummary.educatorDistribution.coachDashboardViewed}</li>
                  <li>CSV 다운로드: {activeSummary.educatorDistribution.coachCsvDownloaded}</li>
                </ul>
              </div>
            </div>
            </>
          ) : null}

          {/* 유입 출처 분포 */}
          <div className="mt-4 rounded-lg border border-slate-100 bg-slate-50/80 p-3">
            <div className="text-xs font-semibold text-slate-700 mb-1">유입 출처 분포 (최근 30일)</div>
            <p className="text-[11px] text-slate-500 mb-2">
              mr_source → utm → coach_link → shared 이벤트 → referrer → 직접 순으로 분류합니다.
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
                          {row.bucket === 'utm' ? (
                            <span className="rounded px-1.5 py-0.5 bg-blue-50 text-blue-600 font-medium">utm</span>
                          ) : row.bucket === 'ref' ? (
                            <span className="rounded px-1.5 py-0.5 bg-green-50 text-green-600 font-medium">ref</span>
                          ) : row.bucket === 'mr_source' ? (
                            <span className="rounded px-1.5 py-0.5 bg-violet-50 text-violet-700 font-medium">mr</span>
                          ) : row.bucket === 'coach_link' ? (
                            <span className="rounded px-1.5 py-0.5 bg-orange-50 text-orange-700 font-medium">coach</span>
                          ) : row.bucket === 'shared' ? (
                            <span className="rounded px-1.5 py-0.5 bg-pink-50 text-pink-700 font-medium">shared</span>
                          ) : (
                            <span className="rounded px-1.5 py-0.5 bg-slate-100 text-slate-500 font-medium">direct</span>
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

        <div className="mb-4 grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div className="rounded-xl border border-slate-200 bg-white p-3 sm:p-4 shadow-sm">
            <div className="text-sm font-semibold text-slate-800 mb-1">교육자 베타 신청</div>
            <p className="text-[11px] text-slate-500 mb-2">move_report_educator_leads · 동의·역할·연락처 등 운영 확인용</p>
            <div className="flex flex-wrap gap-2 mb-2">
              <button
                type="button"
                onClick={() => void loadEducatorLeads()}
                className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                목록 새로고침
              </button>
              <button
                type="button"
                onClick={exportEducatorLeadsCsv}
                disabled={educatorRows.length === 0}
                className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                CSV보내기
              </button>
            </div>
            {educatorLoading ? (
              <div className="text-xs text-slate-500 py-2">로딩 중…</div>
            ) : educatorError ? (
              <div className="text-xs text-red-600 py-2">{educatorError}</div>
            ) : educatorRows.length === 0 ? (
              <div className="text-xs text-slate-500 py-2">신청 내역이 없습니다.</div>
            ) : (
              <div className="max-h-56 overflow-auto text-xs border border-slate-100 rounded-lg">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-slate-500 border-b border-slate-200 bg-slate-50">
                      <th className="py-1 px-2 font-medium">시각</th>
                      <th className="py-1 px-2 font-medium">이름</th>
                      <th className="py-1 px-2 font-medium">연락처</th>
                      <th className="py-1 px-2 font-medium">역할</th>
                      <th className="py-1 px-2 font-medium">소속</th>
                      <th className="py-1 px-2 font-medium">연령</th>
                      <th className="py-1 px-2 font-medium">기능</th>
                      <th className="py-1 px-2 font-medium">source</th>
                      <th className="py-1 px-2 font-medium">상태</th>
                    </tr>
                  </thead>
                  <tbody>
                    {educatorRows.map((r) => (
                      <tr key={r.id} className="border-b border-slate-100 last:border-0">
                        <td className="py-1 px-2 text-slate-600 whitespace-nowrap">
                          {new Date(r.created_at).toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="py-1 px-2 text-slate-800">{r.name}</td>
                        <td className="py-1 px-2 text-slate-700 break-all max-w-[120px]">{r.contact}</td>
                        <td className="py-1 px-2 text-slate-600">{r.role}</td>
                        <td className="py-1 px-2 text-slate-600 break-all max-w-[100px]">{r.organization ?? '—'}</td>
                        <td className="py-1 px-2 text-slate-600">{r.target_age_group}</td>
                        <td className="py-1 px-2 text-slate-600">{r.needed_feature}</td>
                        <td className="py-1 px-2 text-slate-600">{r.source}</td>
                        <td className="py-1 px-2 text-slate-500">new</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-3 sm:p-4 shadow-sm">
            <div className="text-sm font-semibold text-slate-800 mb-1">코치 전용 링크 비활성화</div>
            <p className="text-[11px] text-slate-500 mb-2">남용·오해 소지 시 slug로 차단합니다. DB 마이그레이션(is_active) 적용 후 동작합니다.</p>
            <div className="flex flex-col gap-2 max-w-md">
              <input
                type="text"
                value={coachDisableSlug}
                onChange={(e) => setCoachDisableSlug(e.target.value)}
                placeholder="slug (예: rainbow-gym)"
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
              <input
                type="text"
                value={coachDisableReason}
                onChange={(e) => setCoachDisableReason(e.target.value)}
                placeholder="사유 (선택)"
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={() => void submitCoachLinkDisable()}
                disabled={coachDisabling}
                className="rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 w-fit"
              >
                {coachDisabling ? '처리 중…' : '비활성화'}
              </button>
            </div>
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
