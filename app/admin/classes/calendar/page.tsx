"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import UserManagement from "@/app/admin/users/UserManagement";
import styles from "./CalendarWorkspace.module.css";
import { Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { useClassManagement } from "@/app/admin/classes-shared/hooks/useClassManagement";
import type { SessionEvent } from "@/app/admin/classes-shared/types";
import { getSupabaseBrowserClient } from "@/app/lib/supabase/browser";
import { resolveV2BundleFromSession } from "../lib/v2BundleResolve";
import ClassBundlePanel from "../components/ClassBundlePanel";
import { ClassOpsPolicyReference } from "./components/ClassOpsPolicyReference";
import { useClassOpsReferenceData } from "./hooks/useClassOpsReferenceData";
import { MobileThreeDayView } from "./MobileThreeDayView";
import { MonthExcelGrid } from "./MonthExcelGrid";
import { addLocalDays, chunkWeeks, getMonthGrid, startOfLocalDay } from "./lib/dateGrid";
import { buildEventsByDayMap } from "./lib/eventsByDay";
import { computeTier, effectiveFees, tierLabelKo, totalLessonsFromCounts } from "@/app/lib/teacherTierSchedule";

function alignRowWithScrollContainerTop(scrollParent: HTMLElement, row: HTMLElement) {
  const parentRect = scrollParent.getBoundingClientRect();
  const rowRect = row.getBoundingClientRect();
  scrollParent.scrollTop = Math.max(0, scrollParent.scrollTop + rowRect.top - parentRect.top);
}

const VIEWPORT_GAP_BELOW_TOOLBAR = 6;

function ClassManagementCalendarContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  type WorkspaceTab = 'calendar' | 'teachers' | 'policy' | 'fees';
  const requestedTab = searchParams.get('workspace');
  const workspaceTab: WorkspaceTab = requestedTab === 'teachers' || requestedTab === 'policy' || requestedTab === 'fees' ? requestedTab : 'calendar';
  const setWorkspaceTab = (tab: WorkspaceTab) => {
    const query = new URLSearchParams(searchParams.toString());
    query.set('workspace', tab);
    router.replace(`/admin/classes/calendar?${query}`, { scroll: false });
  };
  const [displayNow, setDisplayNow] = useState(() => Date.now());
  useEffect(() => {
    const refreshClock = () => setDisplayNow(Date.now());
    const interval = window.setInterval(refreshClock, 30_000);
    document.addEventListener('visibilitychange', refreshClock);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', refreshClock);
    };
  }, []);
  const {
    allEvents,
    filteredEvents,
    sessionsFetchNotice,
    fetchSessions,
    filterTeacher,
    setFilterTeacher: setFilterTeacherState,
    supabase,
  } = useClassManagement();
  const setFilterTeacher = (id: string) => {
    setFilterTeacherState(id);
    const query = new URLSearchParams(searchParams.toString());
    if (id === 'ALL') query.delete('teacher'); else query.set('teacher', id);
    query.delete('createTeacher');
    router.replace(`/admin/classes/calendar?${query}`, { scroll: false });
  };
  const teacherFromUrl = searchParams.get('teacher') || 'ALL';
  useEffect(() => { setFilterTeacherState(teacherFromUrl); }, [teacherFromUrl, setFilterTeacherState]);
  const reference = useClassOpsReferenceData(supabase);
  const [monthAnchor, setMonthAnchor] = useState(() => {
    const date = new Date();
    return new Date(date.getFullYear(), date.getMonth(), 1);
  });
  const [threeDayCenter, setThreeDayCenter] = useState(() => startOfLocalDay(new Date()));
  const [localToday, setLocalToday] = useState<Date | null>(null);
  const todayWeekRowRef = useRef<HTMLDivElement | null>(null);
  const calendarScrollAreaRef = useRef<HTMLDivElement | null>(null);
  const pageToolbarRef = useRef<HTMLElement | null>(null);
  const viewportAlignBelowToolbarPxRef = useRef<number | null>(null);
  const [bundleOpen, setBundleOpen] = useState(false);
  const [bundleTitle, setBundleTitle] = useState("");
  const [bundleGroupIds, setBundleGroupIds] = useState<string[]>([]);

  useLayoutEffect(() => {
    const now = new Date();
    const today = startOfLocalDay(now);
    setLocalToday(today);
    setThreeDayCenter(today);
    setMonthAnchor(new Date(now.getFullYear(), now.getMonth(), 1));
  }, []);

  const openBundleForEvent = useCallback(async (event: SessionEvent) => {
    let { bundleTitle: title, groupIds } = resolveV2BundleFromSession(event, allEvents);
    if (groupIds.length === 0 && event.id) {
      const browserClient = getSupabaseBrowserClient();
      if (browserClient) {
        const { data, error } = await browserClient.from("sessions").select("group_id").eq("id", event.id).maybeSingle();
        if (!error && data?.group_id) groupIds = [String(data.group_id)];
      }
    }
    if (groupIds.length === 0) toast.error("연결된 수업 그룹을 찾을 수 없습니다. DB 세션을 확인해 주세요.");
    setBundleTitle(title);
    setBundleGroupIds(groupIds);
    setBundleOpen(true);
  }, [allEvents]);

  const monthInfo = useMemo(() => getMonthGrid(monthAnchor), [monthAnchor]);
  const eventsByDay = useMemo(() => buildEventsByDayMap(filteredEvents), [filteredEvents]);
  const mobileThreeDays = useMemo(() => {
    const center = startOfLocalDay(threeDayCenter);
    return [addLocalDays(center, -1), center, addLocalDays(center, 1)];
  }, [threeDayCenter]);
  const mobileRangeLabel = useMemo(() => {
    const options: Intl.DateTimeFormatOptions = { month: "numeric", day: "numeric" };
    return `${mobileThreeDays[0]!.toLocaleDateString("ko-KR", options)}–${mobileThreeDays[2]!.toLocaleDateString("ko-KR", options)}`;
  }, [mobileThreeDays]);
  const monthWeekRows = useMemo(() => chunkWeeks(monthInfo.cells), [monthInfo.cells]);
  const selectedTeacher = reference.teachers.find((teacher) => teacher.id === filterTeacher) ?? null;
  const selectedTeacherCount = selectedTeacher ? totalLessonsFromCounts(selectedTeacher.session_count, selectedTeacher.log_count) : 0;
  const selectedTeacherTier = selectedTeacher ? computeTier(selectedTeacherCount) : null;
  const selectedTeacherFees = selectedTeacher && selectedTeacherTier ? effectiveFees(selectedTeacherTier, selectedTeacher, reference.tierFeeMap) : null;
  const filterOptions = reference.filterTeachers;

  useEffect(() => {
    void fetchSessions({ anchor: monthAnchor });
    const refresh = () => { void fetchSessions({ anchor: monthAnchor }); };
    window.addEventListener('classes-auto-finish-completed', refresh);
    return () => window.removeEventListener('classes-auto-finish-completed', refresh);
  }, [fetchSessions, monthAnchor]);

  const scrollDesktopToTodayWeek = useCallback(() => {
    if (workspaceTab !== "calendar") return;
    if (typeof window !== "undefined" && window.matchMedia && !window.matchMedia("(min-width: 900px)").matches) return;
    const row = todayWeekRowRef.current;
    if (!row) return;
    const today = startOfLocalDay(new Date());
    if (monthInfo.y !== today.getFullYear() || monthInfo.m !== today.getMonth()) return;
    const container = calendarScrollAreaRef.current;
    if (container && container.scrollHeight > container.clientHeight + 2) {
      alignRowWithScrollContainerTop(container, row);
      return;
    }
    if (viewportAlignBelowToolbarPxRef.current == null && pageToolbarRef.current) {
      viewportAlignBelowToolbarPxRef.current = pageToolbarRef.current.getBoundingClientRect().bottom + VIEWPORT_GAP_BELOW_TOOLBAR;
    }
    const alignY = viewportAlignBelowToolbarPxRef.current ?? 100;
    const rowRect = row.getBoundingClientRect();
    if (Math.abs(rowRect.top - alignY) < 2) return;
    window.scrollTo({ top: Math.max(0, window.scrollY + rowRect.top - alignY), left: 0, behavior: "instant" });
  }, [monthInfo.m, monthInfo.y, workspaceTab]);

  useLayoutEffect(() => {
    let innerFrame = 0;
    const outerFrame = requestAnimationFrame(() => { innerFrame = requestAnimationFrame(scrollDesktopToTodayWeek); });
    return () => { cancelAnimationFrame(outerFrame); cancelAnimationFrame(innerFrame); };
  }, [filteredEvents.length, monthInfo.cells.length, scrollDesktopToTodayWeek]);

  useEffect(() => {
    const timer = window.setTimeout(scrollDesktopToTodayWeek, 120);
    return () => clearTimeout(timer);
  }, [filteredEvents.length, scrollDesktopToTodayWeek]);

  const goToday = () => {
    const today = startOfLocalDay(new Date());
    setThreeDayCenter(today);
    setMonthAnchor(new Date(today.getFullYear(), today.getMonth(), 1));
  };

  return (
    <div className={`${styles.page} min-w-0 bg-slate-50 text-slate-900`}>
      <main className="mx-auto w-full max-w-[1480px] px-3 pb-16 pt-3 sm:px-6 min-[1200px]:px-8">
        <header className="flex items-center justify-between gap-3">
          <div><h1 className="text-xl font-bold tracking-tight text-slate-950 sm:text-[22px]">수업 통합 운영 관리</h1><p className="mt-0.5 text-xs text-slate-500">일정에서 강사·운영 규칙·수업료 기준까지 한 흐름으로 확인합니다.</p></div>
          <Link href="/admin/classes/list" className="hidden min-h-11 shrink-0 items-center rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700 hover:bg-slate-50 sm:inline-flex">수업 목록</Link>
        </header>

        <div role="tablist" aria-label="수업관리 화면" className={styles.tabs}>
          {([{ key: 'calendar', label: '수업 일정' }, { key: 'teachers', label: '강사 정보' }, { key: 'policy', label: '운영 기준' }, { key: 'fees', label: '수업료' }] as const).map(tab => (
            <button key={tab.key} type="button" role="tab" id={`workspace-tab-${tab.key}`} aria-controls={`workspace-panel-${tab.key}`} aria-selected={workspaceTab === tab.key} tabIndex={workspaceTab === tab.key ? 0 : -1} className={styles.tab} onClick={() => setWorkspaceTab(tab.key)} onKeyDown={event => {
              const keys = ['calendar', 'teachers', 'policy', 'fees'] as const;
              const index = keys.indexOf(tab.key);
              const next = event.key === 'ArrowRight' ? (index + 1) % keys.length : event.key === 'ArrowLeft' ? (index + keys.length - 1) % keys.length : event.key === 'Home' ? 0 : event.key === 'End' ? keys.length - 1 : null;
              if (next === null) return;
              event.preventDefault();
              setWorkspaceTab(keys[next]!);
              document.getElementById(`workspace-tab-${keys[next]}`)?.focus();
            }}>{tab.label}</button>
          ))}
        </div>
        <div role="tabpanel" id="workspace-panel-calendar" aria-labelledby="workspace-tab-calendar" hidden={workspaceTab !== "calendar"}>
        <section aria-labelledby="class-ops-calendar" className="mt-3">
          <div className="flex items-end justify-between gap-3 border-b border-slate-200 pb-2"><div><h2 id="class-ops-calendar" className="text-base font-bold tracking-tight text-slate-950">수업 캘린더</h2></div><div className="hidden items-center gap-3 text-[11px] text-slate-500 sm:flex"><span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-blue-600" />예정</span><span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-emerald-600" />완료</span><span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-violet-600" />연기</span><span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-rose-600" />취소</span></div></div>
          <nav ref={pageToolbarRef} className="mt-2 flex flex-col gap-2 min-[900px]:flex-row min-[900px]:items-center min-[900px]:justify-between" aria-label="캘린더 도구">
            <div className="flex w-full items-center gap-2 min-[900px]:w-auto"><button type="button" aria-label="이전 기간" onClick={() => { if (window.matchMedia("(min-width: 900px)").matches) setMonthAnchor((previous) => new Date(previous.getFullYear(), previous.getMonth() - 1, 1)); else setThreeDayCenter((previous) => addLocalDays(previous, -1)); }} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white"><ChevronLeft size={17} /></button><button type="button" onClick={goToday} className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold">오늘</button><strong className="min-w-0 flex-1 text-center text-base font-extrabold tabular-nums min-[900px]:min-w-32 min-[900px]:flex-none">{monthInfo.monthLabel}<span className="ml-2 text-xs font-semibold text-slate-500 min-[900px]:hidden">{mobileRangeLabel}</span></strong><button type="button" aria-label="다음 기간" onClick={() => { if (window.matchMedia("(min-width: 900px)").matches) setMonthAnchor((previous) => new Date(previous.getFullYear(), previous.getMonth() + 1, 1)); else setThreeDayCenter((previous) => addLocalDays(previous, 1)); }} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white"><ChevronRight size={17} /></button></div>
            <div className="grid grid-cols-2 gap-2 min-[900px]:flex"><label className="sr-only" htmlFor="class-ops-calendar-teacher">강사 필터</label><select id="class-ops-calendar-teacher" value={filterTeacher} onChange={(event) => setFilterTeacher(event.target.value)} className="h-11 min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 min-[900px]:w-44"><option value="ALL">전체 강사</option>{filterOptions.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.name}</option>)}</select><Link href="/admin/classes/list?create=1" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-blue-600 px-4 text-xs font-bold text-white hover:bg-blue-700"><CalendarDays className="mr-1.5 h-4 w-4" />신규 수업</Link></div>
          </nav>
          {selectedTeacher && selectedTeacherTier && selectedTeacherFees ? <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm"><strong className="text-slate-950">{selectedTeacher.name}</strong><span className="text-slate-600">{selectedTeacher.is_active ? "활동 중" : "비활성"}</span><span className="font-bold text-blue-800">인정 {selectedTeacherCount.toLocaleString("ko-KR")}회 · {tierLabelKo(selectedTeacherTier)}</span><span className="text-xs font-semibold text-slate-600">개인 {selectedTeacherFees.fee_private.toLocaleString("ko-KR")} · 그룹 {selectedTeacherFees.fee_group.toLocaleString("ko-KR")} · 센터 메인 {selectedTeacherFees.fee_center_main.toLocaleString("ko-KR")} · 보조 {selectedTeacherFees.fee_center_assist.toLocaleString("ko-KR")}원</span></div> : null}

          {sessionsFetchNotice ? <div role={sessionsFetchNotice.type === "error" ? "alert" : "status"} className={`mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2 ${sessionsFetchNotice.type === "error" ? "border-rose-200 bg-rose-50 text-rose-900" : "border-amber-200 bg-amber-50 text-amber-950"}`}><p className="text-xs font-bold">{sessionsFetchNotice.type === "error" ? "수업 일정을 불러오지 못했습니다. 빈 일정이 아니라 조회 실패 상태입니다." : "일부 일정만 불러왔습니다. 뒤쪽 일정이 빠져 있을 수 있습니다."}</p><button type="button" onClick={() => void fetchSessions({ anchor: monthAnchor })} className="min-h-11 rounded-lg border border-current bg-white px-3 text-xs font-bold">다시 불러오기</button></div> : null}
          <div ref={calendarScrollAreaRef} className="mt-2 min-w-0">
            <MobileThreeDayView days={mobileThreeDays} eventsByDay={eventsByDay} onOpen={openBundleForEvent} now={displayNow} />
            <MonthExcelGrid weekRows={monthWeekRows} eventsByDay={eventsByDay} todayWeekRowRef={todayWeekRowRef} onOpen={openBundleForEvent} now={displayNow} />
          </div>
          {localToday ? <p className="mt-2 text-[11px] text-slate-500">오늘 {localToday.toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "long" })} · 수업을 선택하면 기존 상세 관리 패널이 열립니다.</p> : null}
        </section>

        </div>
        <div role="tabpanel" id="workspace-panel-teachers" aria-labelledby="workspace-tab-teachers" hidden={workspaceTab !== "teachers"} className={styles.panel}>
        <UserManagement onChanged={reference.reload} />
        </div>
        <div role="tabpanel" id="workspace-panel-policy" aria-labelledby="workspace-tab-policy" hidden={workspaceTab !== "policy"} className={styles.panel}><ClassOpsPolicyReference /></div>
        <div role="tabpanel" id="workspace-panel-fees" aria-labelledby="workspace-tab-fees" hidden={workspaceTab !== "fees"} className={styles.panel}><UserManagement mode="fees" onChanged={reference.reload} /></div>
      </main>
      <ClassBundlePanel visible={bundleOpen} bundleTitle={bundleTitle} groupIds={bundleGroupIds} calendarEvents={allEvents} calendarDataStatus={sessionsFetchNotice ? "incomplete" : allEvents.length > 0 ? "range-limited" : "unavailable"} onClose={() => setBundleOpen(false)} onChanged={() => void fetchSessions({ anchor: monthAnchor })} />
    </div>
  );
}

export default function ClassManagementCalendar() {
  return <Suspense fallback={<p role="status" className="p-4 text-sm text-slate-500">Loading...</p>}><ClassManagementCalendarContent /></Suspense>;
}
