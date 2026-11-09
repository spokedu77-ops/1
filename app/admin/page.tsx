'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { getSupabaseBrowserClient } from '@/app/lib/supabase/browser';
import { devLogger } from '@/app/lib/logging/devLogger';
import { buildGroupPlannedTotals } from '@/app/admin/classes-shared/lib/plannedRoundTotal';
import { clampRoundIndex } from '@/app/admin/classes-shared/lib/roundFields';
import { BookOpen, Box, Building2, CheckCircle, ClipboardList, MessageSquare, Pin, RefreshCw, Plus, Users, X, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import styles from './AdminDashboard.module.css';
import VatCalculator from '@/app/components/admin/VatCalculator';

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

type ClassTimeBucket = 'postponed' | 'cancelled' | 'done' | 'ongoing' | 'upcoming';

/** 오늘 서머리: status(finished)가 아니라 실제 시각으로 예정/진행/완료를 나눈다. */
function getClassTimeBucket(cls: IClassSession): ClassTimeBucket {
  if (cls.isPostponed) return 'postponed';
  if (cls.isCancelled) return 'cancelled';
  const now = Date.now();
  const start = new Date(cls.startAt).getTime();
  const end = new Date(cls.endAt).getTime();
  if (Number.isFinite(end) && now > end) return 'done';
  if (Number.isFinite(start) && now >= start) return 'ongoing';
  return 'upcoming';
}

const CLASS_BUCKET_SORT_ORDER: Record<ClassTimeBucket, number> = {
  ongoing: 0,
  upcoming: 1,
  done: 2,
  postponed: 3,
  cancelled: 4,
};

function compareTodayClasses(a: IClassSession, b: IClassSession) {
  const ba = getClassTimeBucket(a);
  const bb = getClassTimeBucket(b);
  if (ba !== bb) return CLASS_BUCKET_SORT_ORDER[ba] - CLASS_BUCKET_SORT_ORDER[bb];
  return new Date(a.startAt).getTime() - new Date(b.startAt).getTime();
}

interface PostponeNotice {
  id: string;
  notice_date: string;
  start_date: string;
  end_date: string;
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
  selectedEndDate,
  onSelect,
}: {
  selectedDate: string;
  selectedEndDate?: string;
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
        <button type="button" onClick={prevMonth} aria-label="이전 달" className="p-1 rounded hover:bg-slate-100 cursor-pointer">
          <ChevronLeft className="h-4 w-4 text-slate-500" />
        </button>
        <span className="text-sm font-semibold text-slate-700">
          {year}년 {month + 1}월
        </span>
        <button type="button" onClick={nextMonth} aria-label="다음 달" className="p-1 rounded hover:bg-slate-100 cursor-pointer">
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
          const isInRange = Boolean(selectedEndDate && dateStr >= selectedDate && dateStr <= selectedEndDate);
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
                ${isSelected ? 'bg-indigo-600 text-white' : isInRange ? 'bg-indigo-100 text-indigo-800' : ''}
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
  const [selectedEndDate, setSelectedEndDate] = useState('');
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
  const [postponeError, setPostponeError] = useState(false);
  const [noticePreviewError, setNoticePreviewError] = useState(false);
  const [weeklyBestPreviewError, setWeeklyBestPreviewError] = useState(false);
  const [, setClock] = useState(0);

  const fetchPostponeNotices = useCallback(async () => {
    setPostponeLoading(true);
    setPostponeError(false);
    try {
      const res = await fetch('/api/admin/postpone-notices?limit=10&offset=0');
      if (!res.ok) throw new Error(await readApiError(res, 'Failed to load postpone notices.'));
      const json = await res.json();
      const notices: PostponeNotice[] = json.notices ?? [];
      setPostponeNotices(notices);
      setPostponeTotal(typeof json.total === 'number' ? json.total : notices.length);
    } catch (err) {
      setPostponeError(true);
      devLogger.error('Postpone notices fetch error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to load postpone notices.');
    } finally {
      setPostponeLoading(false);
    }
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setUpcomingPostponedLoading(true);
    setFetchError(null);
    try {
      const res = await fetch('/api/admin/dashboard/sessions', { credentials: 'include', cache: 'no-store' });
      const payload = (await res.json().catch(() => ({}))) as {
        today?: SessionRow[];
        upcomingPostponed?: SessionRow[];
        error?: string;
      };
      if (!res.ok) throw new Error(payload.error || '데이터를 불러올 수 없습니다.');

      const rawClasses = payload.today ?? [];
      const rawUpcomingPostponedClasses = payload.upcomingPostponed ?? [];

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
            time: new Date(c.start_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Seoul' }),
            endTime: endTime.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Seoul' }),
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
        .sort(compareTodayClasses);

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
  }, []);

  const fetchNoticePreviews = useCallback(async () => {
    if (!supabase) return;
    setNoticePreviewLoading(true);
    setNoticePreviewError(false);
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
      setNoticePreviewError(true);
      devLogger.error('[dashboard] notice previews fetch error:', err);
      setNoticePreviews([]);
    } finally {
      setNoticePreviewLoading(false);
    }
  }, [supabase]);

  const fetchWeeklyBestPreviews = useCallback(async () => {
    if (!supabase) return;
    setWeeklyBestPreviewLoading(true);
    setWeeklyBestPreviewError(false);
    try {
      const { data, error } = await supabase
        .from('weekly_best')
        .select('id, title, created_at')
        .order('created_at', { ascending: false })
        .limit(12);

      if (error) throw error;
      setWeeklyBestPreviews((data as WeeklyBestPreview[]) ?? []);
    } catch (err) {
      setWeeklyBestPreviewError(true);
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
      };
      setConsultSummary(res.ok && json.ok && typeof json.pendingCount === 'number' ? {
        pendingCount: json.pendingCount,
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
    fetchNoticePreviews();
    fetchWeeklyBestPreviews();
    fetchConsultSummary();
  }, [fetchData, fetchPostponeNotices, fetchNoticePreviews, fetchWeeklyBestPreviews, fetchConsultSummary]);

  const openPostponeModal = async () => {
    setSelectedDate('');
    setSelectedEndDate('');
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
    if (selectedEndDate && selectedEndDate < selectedDate) {
      setNoticeError('종료일은 시작일 이후로 선택해 주세요.');
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
          start_date: selectedDate,
          end_date: selectedEndDate || selectedDate,
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

  const getNoticeDateDisplay = (dateStr: string, endDate?: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    const start = date.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' });
    if (!endDate || endDate === dateStr) return start;
    const end = new Date(endDate + 'T00:00:00');
    return `${start} ~ ${end.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })}`;
  };

  const getClassDateDisplay = (startAt: string) => {
    const date = new Date(startAt);
    return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', weekday: 'short' });
  };

  const pinnedNoticePreviews = noticePreviews
    .filter((notice) => notice.is_pinned)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 1);
  const recentDashboardFeed = [...weeklyBestPreviews]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 1)
    .map((row) => ({ ...row, key: `wb-${row.id}` }));

  useEffect(() => {
    const timer = window.setInterval(() => setClock((value) => value + 1), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const refresh = () => {
    void fetchData(); void fetchPostponeNotices(); void fetchNoticePreviews();
    void fetchWeeklyBestPreviews(); void fetchConsultSummary();
  };
  const bucketLabels: Record<ClassTimeBucket, string> = { upcoming: '예정', ongoing: '진행', done: '완료', postponed: '연기', cancelled: '취소' };
  const shortcuts = [
    { name: '업무 노트', href: '/admin/note', icon: ClipboardList },
    { name: '기관·개인 관리', href: '/admin/centers', icon: Building2 },
    { name: '강사 관리', href: '/admin/users', icon: Users },
    { name: '커리큘럼 관리', href: '/admin/curriculum', icon: BookOpen },
    { name: '교구·재고', href: '/admin/inventory', icon: Box },
  ];

  const scheduleChanges = [
    ...postponeNotices.map((notice) => ({ kind: 'notice' as const, notice })),
    ...upcomingPostponedClasses.map((session) => ({ kind: 'session' as const, session })),
  ];

  return (
    <div className={styles.dashboard}>
      <div className={styles.content}>
        <header className={styles.header}>
          <div className={styles.titleRow}><h1>관리 홈</h1><span className={styles.date}>{new Date().toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul', month: 'long', day: 'numeric', weekday: 'long' })}</span></div>
          <div className={styles.headerActions}>
            <VatCalculator className={styles.calculator} />
            <button type="button" onClick={refresh} aria-label="운영 현황 새로고침" title="운영 현황 새로고침" className={styles.refresh}><RefreshCw size={18} /></button>
          </div>
        </header>
        <nav aria-label="업무 바로가기" className={styles.shortcuts}>
          <Link href="/admin/consult" className={styles.consult}><MessageSquare size={15} />미처리 상담<span className={styles.count}>{consultSummaryLoading ? '조회 중' : consultSummary ? `${consultSummary.pendingCount}건` : '조회 실패'}</span></Link>
          <Link href="/admin/teachers-classes" className={styles.review}><CheckCircle size={15} />수업 검수</Link>
          <span className={styles.divider} aria-hidden="true" />
          {shortcuts.map(({ name, href, icon: Icon }) => <Link key={href} href={href}><Icon size={15} />{name}</Link>)}
        </nav>
        <div className={styles.grid}>
          <section aria-labelledby="today-heading" className={`${styles.panel} ${styles.schedule}`}>
            <div className={styles.panelHeader}>
              <div><h2 id="today-heading">오늘의 수업 일정</h2><p>진행 상태는 수업 시간 기준으로 표시합니다.</p></div>
              <Link href="/admin/classes/calendar" className={styles.calendarLink}>전체 일정<ChevronRight size={15} /></Link>
            </div>
            {loading ? <p role="status" className={styles.empty}><Loader2 size={18} className="animate-spin" />수업 일정을 불러오는 중입니다.</p> : fetchError ? <div role="alert" className={styles.error}>{fetchError}<button type="button" onClick={() => void fetchData()}>다시 시도</button></div> : todayClasses.length === 0 ? <p className={styles.empty}>오늘 등록된 수업이 없습니다.</p> : <div className={styles.scheduleBody}>
              <div className={styles.tableHeader} aria-hidden="true"><span>시간</span><span>수업명</span><span>담당 강사</span><span>회차</span><span>진행 상태</span></div>
              <div>{[...todayClasses].sort(compareTodayClasses).map((cls) => {
                const bucket = getClassTimeBucket(cls);
                return <div key={cls.id} className={styles.classRow} data-status={bucket}>
                  <span className={styles.time}>{cls.time}–{cls.endTime}</span>
                  <p className={styles.classTitle}>{cls.title.replace(/^\d+\/\d+\s*/, '').trim() || cls.title}</p>
                  <span className={styles.teacher}><span className={styles.mobileLabel}>강사</span>{cls.teacher}</span>
                  <span className={styles.round}><span className={styles.mobileLabel}>회차</span>{cls.roundDisplay || '미등록'}</span>
                  <span className={styles.status} data-status={bucket}>{bucketLabels[bucket]}</span>
                </div>;
              })}</div>
            </div>}
          </section>
          <div className={styles.rightColumn}>
            <section aria-labelledby="changes-heading" className={`${styles.panel} ${styles.changes}`}>
              <div className={styles.panelHeader}>
                <div><h2 id="changes-heading">일정 변경</h2><p>연기 알림 · 오늘 이후 휴강 일정</p></div>
                <button type="button" onClick={openPostponeModal} className={styles.addNotice}><Plus size={15} />알림 등록</button>
              </div>
              {(postponeLoading || upcomingPostponedLoading) ? <p role="status" className={styles.empty}>일정 변경을 불러오는 중입니다.</p> : <>
                {(postponeError || fetchError) && <p role="alert" className={styles.error}>일부 일정 변경을 불러오지 못했습니다.<button type="button" onClick={() => { void fetchData(); void fetchPostponeNotices(); }}>다시 시도</button></p>}
                {scheduleChanges.length === 0 ? <p className={styles.empty}>{postponeError || fetchError ? '다시 조회해 주세요.' : '등록된 일정 변경이 없습니다.'}</p> : <ul className={styles.changeList}>
                  {scheduleChanges.map((entry) => entry.kind === 'notice' ? <li key={`notice-${entry.notice.id}`} className={styles.changeCard}>
                    <span className={styles.changeBadge}>연기</span>
                    <div className={styles.changeText}><p>{entry.notice.teacher_name}</p><p>{getNoticeDateDisplay(entry.notice.start_date || entry.notice.notice_date, entry.notice.end_date)}</p>{entry.notice.memo && <p>{entry.notice.memo}</p>}</div>
                    <button type="button" aria-label={`${entry.notice.teacher_name} 연기 알림 삭제`} onClick={() => void handleDeleteNotice(entry.notice.id)} disabled={deletingNoticeId === entry.notice.id} className={styles.deleteNotice}>{deletingNoticeId === entry.notice.id ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}</button>
                  </li> : <li key={`session-${entry.session.id}`} className={styles.changeCard}><span className={styles.changeBadge} data-kind="closed">휴강</span><div className={styles.changeText}><p>{entry.session.title}</p><p>{getClassDateDisplay(entry.session.startAt)} · {entry.session.time} · {entry.session.teacher}</p></div></li>)}
                </ul>}
                <div className={styles.changeFooter}>
                  <span>연기 알림 {postponeError ? '조회 실패' : `${postponeTotal}건`} · 휴강 {fetchError ? '조회 실패' : `${upcomingPostponedClasses.length}건 (최대 8건)`}</span>
                </div>
              </>}
            </section>
            <section aria-labelledby="notices-heading" className={`${styles.panel} ${styles.notices}`}>
              <div className={styles.panelHeader}><h2 id="notices-heading">공지사항</h2><Link href="/admin/notice" className={styles.allNotices}>전체 보기<ChevronRight size={13} /></Link></div>
              {(noticePreviewError || weeklyBestPreviewError) && <p role="alert" className={styles.error}>일부 공지를 불러오지 못했습니다.<button type="button" onClick={() => { void fetchNoticePreviews(); void fetchWeeklyBestPreviews(); }}>다시 시도</button></p>}
              {noticePreviewLoading || weeklyBestPreviewLoading ? <p role="status" className={styles.empty}>공지를 불러오는 중입니다.</p> : <div className={styles.noticeGroups}>
                <div>{pinnedNoticePreviews.length === 0 ? <p className={styles.noticeEmpty}>{noticePreviewError ? '고정 공지 조회 실패' : '고정 공지 없음'}</p> : <ul className={styles.noticeList}>{pinnedNoticePreviews.map((notice) => <li key={notice.id}><Link href="/admin/notice" className={styles.noticeCard}><span className={styles.pinnedBadge}><Pin size={11} />고정</span><span className={styles.noticeTitle}>{notice.title}</span></Link></li>)}</ul>}</div>
                <div>{recentDashboardFeed.length === 0 ? <p className={styles.noticeEmpty}>{weeklyBestPreviewError ? '주간베스트 조회 실패' : '등록된 주간베스트 없음'}</p> : <ul className={styles.noticeList}>{recentDashboardFeed.map((row) => <li key={row.key}><Link href="/admin/notice" className={styles.noticeCard}><span className={styles.latestBadge}>주간베스트</span><span className={styles.noticeTitle}>{row.title}</span><span className={styles.noticeDate}>{formatNoticeShortMd(row.created_at)}</span></Link></li>)}</ul>}</div>
              </div>}
            </section>
          </div>
        </div>
      </div>

      {/* 수업 연기 알림 등록 모달 */}
      {isPostponeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div role="dialog" aria-modal="true" aria-label="수업 연기 알림 등록" className="max-h-[90dvh] w-full max-w-sm overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h2 className="text-base font-semibold text-slate-900">수업 연기 알림 등록</h2>
              <button
                type="button"
                onClick={() => setIsPostponeModalOpen(false)}
                aria-label="연기 알림 등록 닫기"
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
                    selectedEndDate={selectedEndDate}
                    onSelect={(date) => {
                      if (!selectedDate || selectedEndDate) {
                        setSelectedDate(date);
                        setSelectedEndDate('');
                      } else if (date < selectedDate) {
                        setSelectedDate(date);
                      } else {
                        setSelectedEndDate(date);
                      }
                    }}
                  />
                </div>
                {selectedDate && selectedEndDate && (
                  <p className="mt-1.5 text-xs font-bold text-indigo-600 text-center">
                    선택 범위: {selectedDate} ~ {selectedEndDate}
                  </p>
                )}
                {selectedDate && !selectedEndDate && (
                  <p className="mt-1.5 text-xs font-bold text-indigo-600 text-center">
                    시작일: {selectedDate} · 종료일을 한 번 더 클릭하세요
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
