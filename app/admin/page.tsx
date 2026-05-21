'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { getSupabaseBrowserClient } from '@/app/lib/supabase/browser';
import { devLogger } from '@/app/lib/logging/devLogger';
import { buildGroupPlannedTotals } from '@/app/admin/classes-shared/lib/plannedRoundTotal';
import { clampRoundIndex } from '@/app/admin/classes-shared/lib/roundFields';
import { BarChart3, Calendar, MessageSquare, Pin, RefreshCw, Plus, X, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

// --- Interfaces ---
interface IClassSession {
  id: string;
  startAt: string;
  endAt: string;
  time: string;
  endTime: string;
  title: string;
  teacher: string;
  isPostponed?: boolean;
  isCancelled?: boolean;
  status?: string;
  roundDisplay?: string;
}

interface PostponeNotice {
  id: string;
  notice_date: string;
  memo: string | null;
  teacher_name: string;
}

interface Teacher {
  id: string;
  name: string;
}

interface NoticePreview {
  id: number;
  title: string;
  category: string;
  is_pinned: boolean;
  created_at: string;
}

interface ConsultSummary {
  pendingCount: number;
  latestPending: {
    parent_name: string;
    child_age: string | null;
    consult_type: string;
    created_at: string;
  } | null;
}

interface SessionRow {
  id: string;
  start_at: string;
  end_at: string;
  title?: string;
  status?: string;
  round_display?: string;
  round_index?: number;
  round_total?: number;
  group_id?: string | null;
  users?: { name?: string };
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';

async function readApiError(res: Response, fallback: string) {
  try {
    const json = (await res.json()) as { error?: unknown };
    return typeof json.error === 'string' && json.error.trim() ? json.error : fallback;
  } catch {
    return fallback;
  }
}

/** 대시보드 최근 공지 줄에 쓰는 짧은 날짜 (예: 4.27, 5.4, 5.11) */
function formatNoticeShortMd(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}.${d.getDate()}`;
}

interface WeeklyBestPreview {
  id: string;
  title: string;
  created_at: string;
}

// --- 인라인 미니 캘린더 ---
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

function MiniCalendar({
  selectedDate,
  onSelect,
}: {
  selectedDate: string;
  onSelect: (date: string) => void;
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [viewDate, setViewDate] = useState<Date>(() => {
    if (selectedDate) {
      const d = new Date(selectedDate + 'T00:00:00');
      return new Date(d.getFullYear(), d.getMonth(), 1);
    }
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));

  const toDateStr = (d: number) => {
    const mm = String(month + 1).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    return `${year}-${mm}-${dd}`;
  };

  return (
    <div className="select-none">
      <div className="flex items-center justify-between mb-2">
        <button type="button" onClick={prevMonth} className="p-1 rounded hover:bg-slate-100 cursor-pointer">
          <ChevronLeft className="h-4 w-4 text-slate-500" />
        </button>
        <span className="text-sm font-semibold text-slate-700">
          {year}년 {month + 1}월
        </span>
        <button type="button" onClick={nextMonth} className="p-1 rounded hover:bg-slate-100 cursor-pointer">
          <ChevronRight className="h-4 w-4 text-slate-500" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {WEEKDAYS.map((w, i) => (
          <div
            key={w}
            className={`text-center text-[10px] font-bold py-0.5 ${i === 0 ? 'text-rose-400' : i === 6 ? 'text-blue-400' : 'text-slate-400'}`}
          >
            {w}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((d, i) => {
          if (d === null) return <div key={`e-${i}`} />;
          const dateStr = toDateStr(d);
          const isSelected = dateStr === selectedDate;
          const isToday = dateStr === today.toISOString().split('T')[0];
          const isPast = new Date(dateStr + 'T00:00:00') < today;
          const dayOfWeek = (firstDay + d - 1) % 7;
          return (
            <button
              key={dateStr}
              type="button"
              onClick={() => !isPast && onSelect(dateStr)}
              disabled={isPast}
              className={`text-center text-xs py-1.5 rounded-lg font-medium transition-colors cursor-pointer
                ${isSelected ? 'bg-indigo-600 text-white' : ''}
                ${!isSelected && isToday ? 'bg-indigo-50 text-indigo-700 font-bold' : ''}
                ${!isSelected && !isToday && !isPast ? (dayOfWeek === 0 ? 'text-rose-500 hover:bg-rose-50' : dayOfWeek === 6 ? 'text-blue-500 hover:bg-blue-50' : 'text-slate-700 hover:bg-slate-100') : ''}
                ${isPast ? 'text-slate-200 cursor-not-allowed' : ''}
              `}
            >
              {d}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// --- 메인 대시보드 ---
export default function SpokeduHQDashboard() {
  const [supabase] = useState(() => (typeof window !== 'undefined' ? getSupabaseBrowserClient() : null));
  const [todayClasses, setTodayClasses] = useState<IClassSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // 수업 연기 알림
  const [postponeNotices, setPostponeNotices] = useState<PostponeNotice[]>([]);
  const [postponeTotal, setPostponeTotal] = useState(0);
  const [postponeLoading, setPostponeLoading] = useState(true);
  const [upcomingPostponedClasses, setUpcomingPostponedClasses] = useState<IClassSession[]>([]);
  const [upcomingPostponedLoading, setUpcomingPostponedLoading] = useState(true);
  const [isPostponeModalOpen, setIsPostponeModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [noticeMemo, setNoticeMemo] = useState('');
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [isSubmittingNotice, setIsSubmittingNotice] = useState(false);
  const [noticeError, setNoticeError] = useState('');
  const [deletingNoticeId, setDeletingNoticeId] = useState<string | null>(null);
  const [noticePreviews, setNoticePreviews] = useState<NoticePreview[]>([]);
  const [noticePreviewLoading, setNoticePreviewLoading] = useState(true);
  const [weeklyBestPreviews, setWeeklyBestPreviews] = useState<WeeklyBestPreview[]>([]);
  const [weeklyBestPreviewLoading, setWeeklyBestPreviewLoading] = useState(true);
  const [consultSummary, setConsultSummary] = useState<ConsultSummary | null>(null);
  const [consultSummaryLoading, setConsultSummaryLoading] = useState(true);
  const [moveReportCount, setMoveReportCount] = useState<number | null>(null);
  const [moveReportLoading, setMoveReportLoading] = useState(true);

  const fetchPostponeNotices = useCallback(async () => {
    setPostponeLoading(true);
    try {
      const res = await fetch('/api/admin/postpone-notices?limit=10&offset=0');
      if (!res.ok) throw new Error(await readApiError(res, 'Failed to load postpone notices.'));
      const json = await res.json();
      const notices: PostponeNotice[] = json.notices ?? [];
      setPostponeNotices(notices);
      setPostponeTotal(typeof json.total === 'number' ? json.total : notices.length);
    } catch (err) {
      devLogger.error('Postpone notices fetch error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to load postpone notices.');
    } finally {
      setPostponeLoading(false);
    }
  }, []);

  const fetchData = useCallback(async () => {
    if (!supabaseUrl || !supabase) return;
    setLoading(true);
    setUpcomingPostponedLoading(true);
    setFetchError(null);
    try {
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();

      const classesRes = await supabase
        .from('sessions')
        .select('*, users:created_by(id, name)')
        .gte('start_at', startOfDay)
        .lte('start_at', endOfDay)
        .order('start_at', { ascending: true });

      if (classesRes.error) throw classesRes.error;

      const upcomingPostponedRes = await supabase
        .from('sessions')
        .select('*, users:created_by(id, name)')
        .eq('status', 'postponed')
        .gte('start_at', startOfDay)
        .order('start_at', { ascending: true })
        .limit(8);

      if (upcomingPostponedRes.error) throw upcomingPostponedRes.error;

      const rawClasses = (classesRes.data || []) as SessionRow[];
      const rawUpcomingPostponedClasses = (upcomingPostponedRes.data || []) as SessionRow[];

      const groupPlannedTotals = buildGroupPlannedTotals(
        rawClasses
      );
      const upcomingPostponedGroupPlannedTotals = buildGroupPlannedTotals(rawUpcomingPostponedClasses);

      const formatSession = (c: SessionRow, totals: Record<string, number | undefined>) => {
          const endTime = new Date(c.end_at);
          const isPostponed = c.status === 'postponed';
          const isCancelled = c.status === 'cancelled';
          const total =
            (c.group_id ? totals[String(c.group_id)] : undefined) ?? c.round_total;
          const roundIndex = typeof c.round_index === 'number' ? c.round_index : undefined;
          const roundDisplay =
            typeof roundIndex === 'number' && Number.isFinite(roundIndex) && typeof total === 'number' && Number.isFinite(total) && total > 0
              ? `${clampRoundIndex(roundIndex, total)}/${total}`
              : undefined;
          return {
            id: c.id,
            startAt: c.start_at,
            endAt: c.end_at,
            time: new Date(c.start_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false }),
            endTime: endTime.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false }),
            title: c.title || '제목 없음',
            teacher: c.users?.name || '미정',
            isPostponed,
            isCancelled,
            status: c.status,
            roundDisplay,
          };
        };

      const formattedClasses = rawClasses
        .map((c) => formatSession(c, groupPlannedTotals))
        .sort((a: IClassSession, b: IClassSession) => {
          const timeA = new Date(a.startAt).getTime();
          const timeB = new Date(b.startAt).getTime();
          if (timeA !== timeB) return timeA - timeB;
          if (a.isPostponed || a.isCancelled) return 1;
          if (b.isPostponed || b.isCancelled) return -1;
          return 0;
        });

      const formattedUpcomingPostponedClasses = rawUpcomingPostponedClasses
        .map((c) => formatSession(c, upcomingPostponedGroupPlannedTotals));

      setTodayClasses(formattedClasses);
      setUpcomingPostponedClasses(formattedUpcomingPostponedClasses);
      setFetchError(null);
    } catch (err) {
      devLogger.error('Fetch Error:', err);
      setFetchError(err instanceof Error ? err.message : '데이터를 불러올 수 없습니다.');
    } finally {
      setLoading(false);
      setUpcomingPostponedLoading(false);
    }
  }, [supabase]);

  const fetchMoveReportMetric = useCallback(async () => {
    setMoveReportLoading(true);
    try {
      const res = await fetch('/api/admin/move-report/submissions', { credentials: 'include' });
      const json = (await res.json()) as { ok?: boolean; submissions?: unknown[] };
      setMoveReportCount(json.ok ? json.submissions?.length ?? 0 : null);
    } catch (err) {
      devLogger.error('Move report metric fetch error:', err);
      setMoveReportCount(null);
    } finally {
      setMoveReportLoading(false);
    }
  }, []);

  const fetchNoticePreviews = useCallback(async () => {
    if (!supabase) return;
    setNoticePreviewLoading(true);
    try {
      const { data, error } = await supabase
        .from('notices')
        .select('id, title, category, is_pinned, created_at')
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setNoticePreviews((data as NoticePreview[]) ?? []);
    } catch (err) {
      devLogger.error('[dashboard] notice previews fetch error:', err);
      setNoticePreviews([]);
    } finally {
      setNoticePreviewLoading(false);
    }
  }, [supabase]);

  const fetchWeeklyBestPreviews = useCallback(async () => {
    if (!supabase) return;
    setWeeklyBestPreviewLoading(true);
    try {
      const { data, error } = await supabase
        .from('weekly_best')
        .select('id, title, created_at')
        .order('created_at', { ascending: false })
        .limit(12);

      if (error) throw error;
      setWeeklyBestPreviews((data as WeeklyBestPreview[]) ?? []);
    } catch (err) {
      devLogger.error('[dashboard] weekly best previews fetch error:', err);
      setWeeklyBestPreviews([]);
    } finally {
      setWeeklyBestPreviewLoading(false);
    }
  }, [supabase]);

  const fetchConsultSummary = useCallback(async () => {
    setConsultSummaryLoading(true);
    try {
      const res = await fetch('/api/admin/consult/summary', { credentials: 'include' });
      const json = (await res.json()) as {
        ok?: boolean;
        pendingCount?: number;
        latestPending?: ConsultSummary['latestPending'];
      };
      setConsultSummary(json.ok ? {
        pendingCount: typeof json.pendingCount === 'number' ? json.pendingCount : 0,
        latestPending: json.latestPending ?? null,
      } : null);
    } catch (err) {
      devLogger.error('[dashboard] consult summary fetch error:', err);
      setConsultSummary(null);
    } finally {
      setConsultSummaryLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    fetchPostponeNotices();
    fetchMoveReportMetric();
    fetchNoticePreviews();
    fetchWeeklyBestPreviews();
    fetchConsultSummary();
  }, [fetchData, fetchPostponeNotices, fetchMoveReportMetric, fetchNoticePreviews, fetchWeeklyBestPreviews, fetchConsultSummary]);

  const openPostponeModal = async () => {
    setSelectedDate('');
    setSelectedTeacherId('');
    setNoticeMemo('');
    setNoticeError('');
    setIsPostponeModalOpen(true);
    if (teachers.length === 0) {
      try {
        const res = await fetch('/api/admin/postpone-notices/teachers');
        if (!res.ok) throw new Error(await readApiError(res, 'Failed to load teachers.'));
        const json = await res.json();
        setTeachers(json.teachers ?? []);
      } catch (err) {
        devLogger.error('Teachers fetch error:', err);
        setNoticeError(err instanceof Error ? err.message : 'Failed to load teachers.');
      }
    }
  };

  const handlePostponeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setNoticeError('');
    if (!selectedDate) {
      setNoticeError('날짜를 선택해주세요.');
      return;
    }
    if (!selectedTeacherId) {
      setNoticeError('강사를 선택해주세요.');
      return;
    }
    setIsSubmittingNotice(true);
    try {
      const res = await fetch('/api/admin/postpone-notices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacher_id: selectedTeacherId,
          notice_date: selectedDate,
          memo: noticeMemo.trim() || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setNoticeError(json.error ?? '저장에 실패했습니다.');
        return;
      }
      setPostponeNotices((prev) =>
        [...prev, json.notice]
          .sort((a, b) => a.notice_date.localeCompare(b.notice_date))
          .slice(0, 10)
      );
      setPostponeTotal((prev) => prev + 1);
      setIsPostponeModalOpen(false);
    } catch (err) {
      devLogger.error(err);
      setNoticeError('네트워크 오류가 발생했습니다.');
    } finally {
      setIsSubmittingNotice(false);
    }
  };

  const handleDeleteNotice = async (id: string) => {
    setDeletingNoticeId(id);
    try {
      const res = await fetch(`/api/admin/postpone-notices/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(await readApiError(res, 'Failed to delete postpone notice.'));
      setPostponeNotices((prev) => prev.filter((n) => n.id !== id));
      setPostponeTotal((prev) => Math.max(prev - 1, 0));
    } catch (err) {
      devLogger.error(err);
      toast.error(err instanceof Error ? err.message : 'Failed to delete postpone notice.');
    } finally {
      setDeletingNoticeId(null);
    }
  };

  const getNoticeDateDisplay = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' });
  };

  const getClassDateDisplay = (startAt: string) => {
    const date = new Date(startAt);
    return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', weekday: 'short' });
  };

  const pinnedNoticePreviews = noticePreviews.filter((notice) => notice.is_pinned);

  /** 공지 + 주간베스트를 날짜순으로 섞은 뒤 3개. 주간베스트가 DB에 있는데 상위 3개에 없으면 최신 주간베스트를 포함하도록 보정 */
  const recentDashboardFeed = React.useMemo(() => {
    type FeedItem = { source: 'notice' | 'weekly_best'; key: string; title: string; created_at: string };
    const noticeItems: FeedItem[] = noticePreviews.map((n) => ({
      source: 'notice',
      key: `n-${n.id}`,
      title: n.title,
      created_at: n.created_at,
    }));
    const wbItems: FeedItem[] = weeklyBestPreviews.map((w) => ({
      source: 'weekly_best',
      key: `wb-${w.id}`,
      title: w.title,
      created_at: w.created_at,
    }));
    const merged = [...noticeItems, ...wbItems].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
    let top = merged.slice(0, 3);
    const latestWb = wbItems[0];
    if (latestWb && wbItems.length > 0 && !top.some((t) => t.source === 'weekly_best')) {
      top = [latestWb, ...merged.filter((x) => x.key !== latestWb.key)].slice(0, 3);
      top = [...top].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
    return top;
  }, [noticePreviews, weeklyBestPreviews]);

  const isNoticeUrgent = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diff = Math.floor((date.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
    return diff <= 1;
  };

  const isClassFinished = (cls: IClassSession) => {
    if (cls.isPostponed || cls.isCancelled) return false;
    if (cls.status === 'finished') return true;
    return new Date() > new Date(cls.endAt);
  };

  if (loading && !fetchError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-white">
        <div className="w-10 h-10 border-2 border-slate-200 border-t-slate-600 rounded-full animate-spin" />
        <p className="text-sm font-bold text-slate-400">HQ INITIALIZING...</p>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4 max-w-md px-4 text-center">
          <p className="text-sm font-bold text-red-600">{fetchError}</p>
          <button
            type="button"
            onClick={() => { setFetchError(null); fetchData(); }}
            className="px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-700 cursor-pointer"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white px-4 pt-2 pb-[max(1rem,env(safe-area-inset-bottom,0px))] sm:p-6 md:p-8 sm:pt-6 flex flex-col items-center">
      <div className="w-full max-w-6xl space-y-4 sm:space-y-8 md:space-y-12 min-w-0">

        {/* Header */}
        <header className="flex flex-col sm:flex-row justify-between sm:items-end gap-3 border-b-2 pb-3 sm:pb-8 border-slate-900">
          <div>
            <h1 className="text-2xl sm:text-4xl font-black italic tracking-tighter text-slate-900 uppercase leading-none mb-1">
              Spokedu HQ
            </h1>
            <div className="flex flex-wrap items-center gap-2 sm:gap-4">
              <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">
                Operational Control Center
              </p>
              <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                {new Date().toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', weekday: 'short' })}
              </span>
            </div>
          </div>
          <div className="flex gap-2 sm:gap-3">
            <button
              onClick={() => { fetchData(); fetchPostponeNotices(); fetchMoveReportMetric(); fetchNoticePreviews(); fetchWeeklyBestPreviews(); fetchConsultSummary(); }}
              className="min-h-[44px] min-w-[44px] p-3 bg-slate-100 text-slate-600 hover:bg-slate-900 hover:text-white rounded-xl transition-all cursor-pointer group touch-manipulation flex items-center justify-center"
              aria-label="새로고침"
            >
              <RefreshCw size={18} className="group-hover:rotate-180 transition-transform duration-500" aria-hidden />
            </button>
          </div>
        </header>

        {/* 관리 홈: 패널 2개 — (1) 오늘 수업·연기·휴강 (2) 공지·상담·MOVE·안내 링크 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8 w-full min-w-0">

          {/* 패널 1 */}
          <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 space-y-6">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2 sm:mb-4">
                <div className="flex items-center gap-2">
                  <Calendar size={14} className="text-slate-400 shrink-0" />
                  <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Today Session Summary</h2>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-bold text-slate-400 whitespace-nowrap">
                    완료 {todayClasses.filter(c => isClassFinished(c)).length} /
                    진행중 {todayClasses.filter(c => !isClassFinished(c) && !c.isPostponed && !c.isCancelled).length} /
                    연기 {todayClasses.filter(c => c.isPostponed).length}
                  </span>
                </div>
              </div>
              <div className="border-t border-slate-100 divide-y divide-slate-50 overflow-x-auto rounded-lg border border-slate-100">
                {todayClasses.length > 0 ? todayClasses.map((cls) => (
                  <div key={cls.id} className={`py-3 flex flex-wrap items-center justify-between gap-2 min-w-0 px-1 ${
                    isClassFinished(cls) ? 'opacity-20 grayscale' :
                    cls.isPostponed ? 'bg-purple-50 border-l-4 border-purple-400 pl-3' :
                    cls.isCancelled ? 'bg-red-50 border-l-4 border-red-400 pl-3 line-through' : ''
                  }`}>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-4 min-w-0 flex-1">
                      <span className="text-[11px] font-bold tabular-nums text-slate-400 w-20 sm:w-24 shrink-0">{cls.time} - {cls.endTime}</span>
                      {cls.roundDisplay && (
                        <span className="text-[8px] font-black text-slate-500 bg-slate-200 px-2 py-0.5 rounded uppercase shrink-0">{cls.roundDisplay}</span>
                      )}
                      <span className="text-[12px] font-bold text-slate-800 truncate min-w-0">{(cls.title || '').replace(/^\d+\/\d+\s*/, '').trim() || cls.title}</span>
                      {cls.isPostponed && (
                        <span className="text-[8px] font-black text-purple-600 bg-purple-100 px-2 py-1 rounded uppercase">연기됨</span>
                      )}
                      {cls.isCancelled && (
                        <span className="text-[8px] font-black text-red-600 bg-red-100 px-2 py-1 rounded uppercase">취소됨</span>
                      )}
                    </div>
                    <span className="text-[9px] font-black text-slate-300 uppercase tracking-tighter shrink-0">{cls.teacher}</span>
                  </div>
                )) : <p className="py-4 text-[11px] text-slate-300 italic px-2">No classes scheduled.</p>}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">수업 연기 알림</h2>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400">{postponeTotal}건</span>
                  <button
                    type="button"
                    onClick={openPostponeModal}
                    className="inline-flex items-center gap-1 rounded-full bg-rose-600 px-2.5 py-1 text-[10px] font-bold text-white hover:bg-rose-700 transition-colors cursor-pointer"
                  >
                    <Plus className="h-3 w-3" />
                    등록
                  </button>
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-3">
                {postponeLoading ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="h-5 w-5 animate-spin text-slate-300" />
                  </div>
                ) : postponeNotices.length === 0 ? (
                  <p className="py-4 text-center text-[11px] text-slate-400 italic">연기 알림 없음</p>
                ) : (
                  <div className="space-y-2">
                    {postponeNotices.map((n) => {
                      const dateDisplay = getNoticeDateDisplay(n.notice_date);
                      const urgent = isNoticeUrgent(n.notice_date);
                      return (
                        <div key={n.id} className="px-3 py-2 bg-rose-50/50 border border-rose-100 rounded-xl">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-bold text-slate-800 truncate min-w-0">{n.teacher_name}</span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                  urgent ? 'bg-rose-200 text-rose-800' : 'bg-rose-50 text-rose-600'
                                }`}
                              >
                                {dateDisplay}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleDeleteNotice(n.id)}
                                disabled={deletingNoticeId === n.id}
                                className="rounded p-0.5 text-slate-300 hover:bg-red-50 hover:text-red-500 disabled:opacity-50 cursor-pointer"
                              >
                                {deletingNoticeId === n.id
                                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  : <X className="h-3.5 w-3.5" />}
                              </button>
                            </div>
                          </div>
                          {n.memo && (
                            <p className="text-[11px] text-slate-500 mt-0.5 truncate">{n.memo}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-purple-100 bg-purple-50/50 p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <h3 className="text-[10px] font-black text-purple-500 uppercase tracking-widest">휴강 알림</h3>
                <span className="text-[10px] text-purple-400">{upcomingPostponedClasses.length}건</span>
              </div>
              {upcomingPostponedLoading ? (
                <div className="flex items-center justify-center py-5">
                  <Loader2 className="h-4 w-4 animate-spin text-purple-300" />
                </div>
              ) : upcomingPostponedClasses.length === 0 ? (
                <p className="py-3 text-center text-[11px] text-purple-300 italic">오늘 이후 휴강 수업 없음</p>
              ) : (
                <div className="space-y-2">
                  {upcomingPostponedClasses.map((cls) => (
                    <div key={cls.id} className="rounded-lg border border-purple-100 bg-white/80 px-3 py-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold text-purple-600 shrink-0">
                          {getClassDateDisplay(cls.startAt)}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 shrink-0">
                          {cls.time}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center justify-between gap-2">
                        <p className="min-w-0 truncate text-xs font-bold text-slate-800">
                          {(cls.title || '').replace(/^\d+\/\d+\s*/, '').trim() || cls.title}
                        </p>
                        <span className="shrink-0 text-[9px] font-bold text-slate-400">
                          {cls.teacher}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* 패널 2 */}
          <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 space-y-6">
            <div>
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Pin className="h-3.5 w-3.5 text-rose-400" />
                  <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">공지</h2>
                </div>
                <Link href="/admin/notice" className="text-[10px] font-semibold text-slate-400 hover:text-slate-700">
                  전체 보기
                </Link>
              </div>
              {noticePreviewLoading || weeklyBestPreviewLoading ? (
                <div className="flex items-center justify-center py-5">
                  <Loader2 className="h-4 w-4 animate-spin text-slate-300" />
                </div>
              ) : pinnedNoticePreviews.length === 0 && recentDashboardFeed.length === 0 ? (
                <p className="py-3 text-center text-[11px] text-slate-400 italic">등록된 공지 없음</p>
              ) : (
                <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                  {pinnedNoticePreviews.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-[9px] font-black text-rose-500 uppercase tracking-widest">고정 · 필독</p>
                      {pinnedNoticePreviews.map((notice) => (
                        <Link
                          key={notice.id}
                          href="/admin/notice"
                          className="flex items-center justify-between gap-2 rounded-lg border border-rose-100 bg-white px-3 py-2 hover:bg-rose-50/50"
                        >
                          <span className="min-w-0 truncate text-xs font-bold text-slate-800">{notice.title}</span>
                          <Pin className="h-3 w-3 shrink-0 fill-rose-500 text-rose-500" />
                        </Link>
                      ))}
                    </div>
                  )}

                  {recentDashboardFeed.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">최근 공지</p>
                      {recentDashboardFeed.map((row) => (
                        <Link
                          key={row.key}
                          href="/admin/notice"
                          className="flex items-center justify-between gap-2 rounded-lg bg-white px-3 py-2 hover:bg-slate-100"
                        >
                          <span className="flex min-w-0 flex-1 items-center gap-2">
                            {row.source === 'weekly_best' ? (
                              <span className="shrink-0 rounded border border-amber-100 bg-amber-50 px-1.5 py-0.5 text-[8px] font-black text-amber-700">
                                주간베스트
                              </span>
                            ) : null}
                            <span className="min-w-0 truncate text-xs font-bold text-slate-700">{row.title}</span>
                          </span>
                          <span className="shrink-0 text-[10px] font-bold tabular-nums text-slate-500">
                            {formatNoticeShortMd(row.created_at)}
                          </span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between mb-2 sm:mb-4">
              <div className="flex items-center gap-2">
                <MessageSquare size={14} className="text-emerald-500 shrink-0" />
                <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">상담 신청</h2>
                {typeof consultSummary?.pendingCount === 'number' && consultSummary.pendingCount > 0 && (
                  <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-emerald-600 px-1.5 py-0.5 text-[10px] font-black text-white">
                    +{consultSummary.pendingCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] text-slate-400">미처리 상담</span>
            </div>
            <Link
              href="/admin/consult"
              className="group mb-4 block rounded-xl border border-emerald-100 bg-emerald-50/60 p-4 transition-all hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-emerald-50 hover:shadow-sm cursor-pointer"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-emerald-700">상담 신청 관리</p>
                  <p className="mt-1 text-[11px] text-slate-500">새 상담 요청과 처리 상태를 확인합니다.</p>
                </div>
                <div className="rounded-xl bg-white p-2 text-emerald-600 shadow-sm">
                  <MessageSquare className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-6">
                {consultSummaryLoading ? (
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    불러오는 중
                  </div>
                ) : (
                  <>
                    <p className="text-3xl font-black tracking-tight text-slate-900">
                      {consultSummary?.pendingCount?.toLocaleString() ?? '-'}
                    </p>
                    <p className="mt-1 text-[11px] font-medium text-slate-400">미처리 상담 수</p>
                    {consultSummary?.latestPending && (
                      <p className="mt-3 truncate text-[11px] text-emerald-700">
                        최근: {consultSummary.latestPending.parent_name}
                        {consultSummary.latestPending.child_age ? ` · ${consultSummary.latestPending.child_age}` : ''}
                      </p>
                    )}
                  </>
                )}
              </div>
              <p className="mt-5 text-[11px] font-semibold text-emerald-700 transition-colors group-hover:text-emerald-800">
                상담 신청 열기
              </p>
            </Link>

            <div className="flex items-center justify-between mb-2 sm:mb-4">
              <div className="flex items-center gap-2">
                <BarChart3 size={14} className="text-blue-400 shrink-0" />
                <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">MOVE 리포트</h2>
              </div>
              <span className="text-[10px] text-slate-400">최근 제출</span>
            </div>
            <Link
              href="/admin/move-report"
              className="group block rounded-xl border border-blue-100 bg-blue-50/60 p-4 transition-all hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50 hover:shadow-sm cursor-pointer"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-blue-600">MOVE 리포트 관리</p>
                  <p className="mt-1 text-[11px] text-slate-500">결과 제출과 퍼널 지표를 확인합니다.</p>
                </div>
                <div className="rounded-xl bg-white p-2 text-blue-600 shadow-sm">
                  <BarChart3 className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-6">
                {moveReportLoading ? (
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    불러오는 중
                  </div>
                ) : (
                  <>
                    <p className="text-3xl font-black tracking-tight text-slate-900">
                      {moveReportCount === null ? '-' : moveReportCount.toLocaleString()}
                    </p>
                    <p className="mt-1 text-[11px] font-medium text-slate-400">최근 제출 수</p>
                  </>
                )}
              </div>
              <p className="mt-5 text-[11px] font-semibold text-blue-600 transition-colors group-hover:text-blue-700">
                리포트 대시보드 열기
              </p>
            </Link>

            <div>
              <h2 className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">안내 페이지</h2>
              <div className="grid gap-2">
                {[
                  { n: '0', label: 'SPOKEDU 홈페이지', href: '/spokedu' },
                  { n: '1', label: '체육관', href: '/info/gym' },
                  { n: '2', label: '과외', href: '/info/private' },
                  { n: '3', label: '파견', href: '/info/dispatch' },
                  { n: '4', label: '구독서비스', href: '/info/curriculum' },
                ].map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-bold text-slate-800 transition-colors hover:border-slate-300 hover:bg-slate-50"
                  >
                    <span>
                      {item.n}. {item.label}
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" aria-hidden />
                  </a>
                ))}
              </div>
            </div>
          </section>

        </div>

      </div>

      {/* 수업 연기 알림 등록 모달 */}
      {isPostponeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h2 className="text-base font-semibold text-slate-900">수업 연기 알림 등록</h2>
              <button
                type="button"
                onClick={() => setIsPostponeModalOpen(false)}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handlePostponeSubmit} className="px-5 py-4 space-y-4">
              {noticeError && (
                <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{noticeError}</p>
              )}

              {/* 캘린더 */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  연기 날짜 선택
                </label>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <MiniCalendar
                    selectedDate={selectedDate}
                    onSelect={setSelectedDate}
                  />
                </div>
                {selectedDate && (
                  <p className="mt-1.5 text-xs text-indigo-600 font-medium text-center">
                    선택: {new Date(selectedDate + 'T00:00:00').toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })}
                  </p>
                )}
              </div>

              {/* 강사 선택 */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  강사 선택
                </label>
                <select
                  value={selectedTeacherId}
                  onChange={(e) => setSelectedTeacherId(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none cursor-pointer"
                >
                  <option value="">강사를 선택하세요</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              {/* 메모 */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  메모 (선택)
                </label>
                <textarea
                  value={noticeMemo}
                  onChange={(e) => setNoticeMemo(e.target.value)}
                  placeholder="사유 또는 추가 내용"
                  rows={2}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsPostponeModalOpen(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingNotice}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-50 cursor-pointer"
                >
                  {isSubmittingNotice && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  등록
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
