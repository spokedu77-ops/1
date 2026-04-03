'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { getSupabaseBrowserClient } from '@/app/lib/supabase/browser';
import { devLogger } from '@/app/lib/logging/devLogger';
import { Calendar, RefreshCw, FileText, ExternalLink, Star, Plus, X, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

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

interface NoteDocument {
  id: string;
  title: string;
  is_favorite: boolean;
  updated_at: string;
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

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';

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
  const [isPostponeModalOpen, setIsPostponeModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [noticeMemo, setNoticeMemo] = useState('');
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [isSubmittingNotice, setIsSubmittingNotice] = useState(false);
  const [noticeError, setNoticeError] = useState('');
  const [deletingNoticeId, setDeletingNoticeId] = useState<string | null>(null);

  const fetchPostponeNotices = useCallback(async () => {
    setPostponeLoading(true);
    try {
      const res = await fetch('/api/admin/postpone-notices?limit=10&offset=0');
      if (!res.ok) return;
      const json = await res.json();
      const notices: PostponeNotice[] = json.notices ?? [];
      setPostponeNotices(notices);
      setPostponeTotal(typeof json.total === 'number' ? json.total : notices.length);
    } catch (err) {
      devLogger.error('Postpone notices fetch error:', err);
    } finally {
      setPostponeLoading(false);
    }
  }, []);

  const fetchData = useCallback(async () => {
    if (!supabaseUrl || !supabase) return;
    setLoading(true);
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

      const rawClasses = classesRes.data || [];

      // ✅ 라운드 토탈 흔들림 방지:
      // deleted 만 제외하고 cancelled 포함 전체에서 round_total 최댓값을 분모로 사용한다.
      // cancelled 세션은 round_total 을 보존하므로 계약 총 회차를 올바르게 반영한다.
      const activeGroupRoundTotal: Record<string, number> = {};
      for (const c of rawClasses as any[]) {
        const gid = c.group_id;
        if (!gid) continue;
        const st = String(c.status ?? '');
        if (st === 'deleted') continue;
        const rt = c.round_total;
        if (typeof rt === 'number' && Number.isFinite(rt) && rt > 0) {
          activeGroupRoundTotal[gid] = Math.max(activeGroupRoundTotal[gid] ?? 0, rt);
        }
      }

      const formattedClasses = rawClasses
        .map((c: { id: string; start_at: string; end_at: string; title?: string; status?: string; round_display?: string; round_index?: number; round_total?: number; users?: { name?: string } }) => {
          const endTime = new Date(c.end_at);
          const isPostponed = c.status === 'postponed';
          const isCancelled = c.status === 'cancelled';
          const total = activeGroupRoundTotal[(c as any).group_id] ?? c.round_total;
          const roundIndex = typeof c.round_index === 'number' ? c.round_index : undefined;
          const roundDisplay =
            typeof roundIndex === 'number' && Number.isFinite(roundIndex) && typeof total === 'number' && Number.isFinite(total) && total > 0
              ? `${roundIndex}/${total}`
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
        })
        .sort((a: IClassSession, b: IClassSession) => {
          const timeA = new Date(a.startAt).getTime();
          const timeB = new Date(b.startAt).getTime();
          if (timeA !== timeB) return timeA - timeB;
          if (a.isPostponed || a.isCancelled) return 1;
          if (b.isPostponed || b.isCancelled) return -1;
          return 0;
        });

      setTodayClasses(formattedClasses);
      setFetchError(null);
    } catch (err) {
      devLogger.error('Fetch Error:', err);
      setFetchError(err instanceof Error ? err.message : '데이터를 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchData();
    fetchPostponeNotices();
  }, [fetchData, fetchPostponeNotices]);

  const openPostponeModal = async () => {
    setSelectedDate('');
    setSelectedTeacherId('');
    setNoticeMemo('');
    setNoticeError('');
    setIsPostponeModalOpen(true);
    if (teachers.length === 0) {
      try {
        const res = await fetch('/api/admin/postpone-notices/teachers');
        if (res.ok) {
          const json = await res.json();
          setTeachers(json.teachers ?? []);
        }
      } catch (err) {
        devLogger.error('Teachers fetch error:', err);
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
      await fetch(`/api/admin/postpone-notices/${id}`, { method: 'DELETE' });
      setPostponeNotices((prev) => prev.filter((n) => n.id !== id));
      setPostponeTotal((prev) => Math.max(prev - 1, 0));
    } catch (err) {
      devLogger.error(err);
    } finally {
      setDeletingNoticeId(null);
    }
  };

  const getNoticeDateDisplay = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' });
  };

  const isNoticeUrgent = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diff = Math.floor((date.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
    return diff <= 1;
  };

  const formatNoteDate = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return '방금';
    if (diffMin < 60) return `${diffMin}분 전`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `${diffH}시간 전`;
    return d.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
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
              onClick={() => { fetchData(); fetchPostponeNotices(); }}
              className="min-h-[44px] min-w-[44px] p-3 bg-slate-100 text-slate-600 hover:bg-slate-900 hover:text-white rounded-xl transition-all cursor-pointer group touch-manipulation flex items-center justify-center"
              aria-label="새로고침"
            >
              <RefreshCw size={18} className="group-hover:rotate-180 transition-transform duration-500" aria-hidden />
            </button>
          </div>
        </header>

        {/* 1+3. Today Sessions / 수업 연기 알림 — 데스크탑 2열, 모바일 세로 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8 w-full min-w-0">

          {/* 1. Today's Sessions */}
          <section className="min-w-0">
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
            <div className="border-t border-slate-50 divide-y divide-slate-50 overflow-x-auto">
              {todayClasses.length > 0 ? todayClasses.map((cls) => (
                <div key={cls.id} className={`py-3 flex flex-wrap items-center justify-between gap-2 min-w-0 ${
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
              )) : <p className="py-4 text-[11px] text-slate-300 italic">No classes scheduled.</p>}
            </div>
          </section>

          {/* 3. 수업 연기 알림 */}
          <section className="min-w-0">
            <div className="flex items-center justify-between mb-2 sm:mb-4">
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
            <div className="rounded-xl border border-slate-200 bg-white p-3">
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
          </section>

        </div>{/* end 2열 그리드 */}

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
