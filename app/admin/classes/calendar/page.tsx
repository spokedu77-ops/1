"use client";

import Link from "next/link";
import { useMemo, useState, useCallback, useLayoutEffect, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { toast } from "sonner";
import { useClassManagement } from "@/app/admin/classes-shared/hooks/useClassManagement";
import type { SessionEvent } from "@/app/admin/classes-shared/types";
import { getSupabaseBrowserClient } from "@/app/lib/supabase/browser";
import { resolveV2BundleFromSession } from "../lib/v2BundleResolve";
import ClassBundlePanel from "../components/ClassBundlePanel";
import { MobileThreeDayView } from "./MobileThreeDayView";
import { MonthExcelGrid } from "./MonthExcelGrid";
import {
  addLocalDays,
  chunkWeeks,
  getMonthGrid,
  startOfLocalDay,
} from "./lib/dateGrid";
import { buildEventsByDayMap } from "./lib/eventsByDay";

/** 스크롤 컨테이너가 실제로 overflow 될 때만 유효 (그 외에는 문서가 스크롤되므로 window 경로 사용) */
function alignRowWithScrollContainerTop(scrollParent: HTMLElement, row: HTMLElement) {
  const p = scrollParent.getBoundingClientRect();
  const r = row.getBoundingClientRect();
  const nextTop = scrollParent.scrollTop + (r.top - p.top);
  scrollParent.scrollTop = Math.max(0, nextTop);
}

const VIEWPORT_GAP_BELOW_TOOLBAR = 6;

export default function ClassManagementCalendar() {
  const {
    allEvents,
    filteredEvents,
    teacherList,
    fetchSessions,
    filterTeacher,
    setFilterTeacher,
  } = useClassManagement();

  /** 월 그리드용: 해당 월의 1일(로컬). 표시 월만 쓰임 */
  const [monthAnchor, setMonthAnchor] = useState<Date>(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  /** 모바일 3일 뷰: 가운데 날짜(로컬 자정). ◀/▶ 로 이동, 「오늘」로 리셋 */
  const [threeDayCenter, setThreeDayCenter] = useState<Date>(() => startOfLocalDay(new Date()));
  /** 로컬 오늘 뱃지용 — useLayoutEffect에서 채워 SSR/CSR 불일치 방지 */
  const [localToday, setLocalToday] = useState<Date | null>(null);
  /** 데스크톱: 오늘이 포함된 주 행 — 월 초 패딩 때문에 1행이 이전 달이어도 이 행을 맨 위로 스크롤 */
  const todayWeekRowRef = useRef<HTMLDivElement | null>(null);
  /** 메인 세로 스크롤(목록·월간 그리드 공통) — 실제 overflow 시에만 scrollTop 적용 */
  const calendarScrollAreaRef = useRef<HTMLDivElement | null>(null);
  /** 페이지 상단 툴바 — window 스크롤 시 오늘 주를 이 아래에 맞춤 */
  const pageToolbarRef = useRef<HTMLElement | null>(null);
  /**
   * 스크롤 후에는 툴바 rect.bottom이 뷰포트 기준으로 줄어들거나 음수가 되어,
   * 매번 읽으면 delta가 누적되어 문서 맨 아래까지 밀린다. 첫 레이아웃에서만 측정한 뷰포트 Y(px)를 고정한다.
   */
  const viewportAlignBelowToolbarPxRef = useRef<number | null>(null);

  useLayoutEffect(() => {
    const now = new Date();
    const sod = startOfLocalDay(now);
    setLocalToday(sod);
    setThreeDayCenter(sod);
    setMonthAnchor(new Date(now.getFullYear(), now.getMonth(), 1));
  }, []);

  const [bundleOpen, setBundleOpen] = useState(false);
  const [bundleTitle, setBundleTitle] = useState("");
  const [bundleGroupIds, setBundleGroupIds] = useState<string[]>([]);

  const openBundleForEvent = useCallback(
    async (ev: SessionEvent) => {
      let { bundleTitle: title, groupIds } = resolveV2BundleFromSession(ev, allEvents);
      if (groupIds.length === 0 && ev.id) {
        const supabase = getSupabaseBrowserClient();
        if (supabase) {
          const { data, error } = await supabase
            .from("sessions")
            .select("group_id")
            .eq("id", ev.id)
            .maybeSingle();
          if (!error && data?.group_id) {
            groupIds = [String(data.group_id)];
          }
        }
      }
      if (groupIds.length === 0) {
        toast.error("연결된 수업 그룹(group_id)을 찾을 수 없습니다. DB 세션을 확인해 주세요.");
      }
      setBundleTitle(title);
      setBundleGroupIds(groupIds);
      setBundleOpen(true);
    },
    [allEvents]
  );

  const monthInfo = useMemo(() => getMonthGrid(monthAnchor), [monthAnchor]);

  /** 일자 버킷 1회 — 모바일·월간 그리드가 동일 맵을 공유 (월 칸은 당월만 있어 별도 월필터 불필요) */
  const eventsByDay = useMemo(() => buildEventsByDayMap(filteredEvents), [filteredEvents]);

  const mobileThreeDays = useMemo(() => {
    const c = startOfLocalDay(threeDayCenter);
    return [addLocalDays(c, -1), c, addLocalDays(c, 1)];
  }, [threeDayCenter]);

  const mobileRangeLabel = useMemo(() => {
    const a = mobileThreeDays[0]!;
    const b = mobileThreeDays[2]!;
    const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
    return `${a.toLocaleDateString("ko-KR", opts)} ~ ${b.toLocaleDateString("ko-KR", opts)}`;
  }, [mobileThreeDays]);

  const monthWeekRows = useMemo(() => chunkWeeks(monthInfo.cells), [monthInfo.cells]);

  const scrollDesktopToTodayWeek = useCallback(() => {
    if (typeof window !== "undefined" && window.matchMedia && !window.matchMedia("(min-width: 768px)").matches) {
      return;
    }
    const row = todayWeekRowRef.current;
    if (!row) return;
    const sod = startOfLocalDay(new Date());
    if (monthInfo.y !== sod.getFullYear() || monthInfo.m !== sod.getMonth()) return;

    const container = calendarScrollAreaRef.current;
    const innerActuallyScrolls =
      container != null && container.scrollHeight > container.clientHeight + 2;

    if (innerActuallyScrolls && container) {
      alignRowWithScrollContainerTop(container, row);
      return;
    }

    if (viewportAlignBelowToolbarPxRef.current == null && pageToolbarRef.current) {
      viewportAlignBelowToolbarPxRef.current =
        pageToolbarRef.current.getBoundingClientRect().bottom + VIEWPORT_GAP_BELOW_TOOLBAR;
    }
    const alignY = viewportAlignBelowToolbarPxRef.current ?? 100;

    const r = row.getBoundingClientRect();
    const nextTop = window.scrollY + r.top - alignY;
    if (Math.abs(r.top - alignY) < 2) return;
    window.scrollTo({ top: Math.max(0, nextTop), left: 0, behavior: "instant" });
  }, [monthInfo.y, monthInfo.m]);

  /** 레이아웃·페인트 반영 후 한 번만 (연속 scrollBy/중복 측정으로 맨 아래까지 가는 것 방지) */
  useLayoutEffect(() => {
    let innerRaf = 0;
    const outerRaf = requestAnimationFrame(() => {
      innerRaf = requestAnimationFrame(() => {
        scrollDesktopToTodayWeek();
      });
    });
    return () => {
      cancelAnimationFrame(outerRaf);
      cancelAnimationFrame(innerRaf);
    };
  }, [scrollDesktopToTodayWeek, monthInfo.cells.length, filteredEvents.length]);

  /** 데이터 로드 후 행 높이가 커지면서 위치가 어긋날 수 있어 한 번 더 정렬 */
  useEffect(() => {
    const t = window.setTimeout(() => {
      scrollDesktopToTodayWeek();
    }, 120);
    return () => clearTimeout(t);
  }, [scrollDesktopToTodayWeek, filteredEvents.length]);

  return (
    <div className="flex min-h-screen bg-white text-slate-900 w-full min-w-0">
      <div className="flex-1 flex flex-col min-w-0">
        <nav
          ref={pageToolbarRef}
          className="border-b px-2 sm:px-4 py-2 sm:py-3 bg-white flex flex-wrap justify-between items-center gap-2 z-10 shrink-0"
        >
          <div className="flex items-center gap-2 sm:gap-4 flex-wrap min-w-0">
            <h1 className="text-base sm:text-lg font-black italic uppercase text-slate-950 flex items-center gap-2 shrink-0">
              <CalendarIcon size={18} className="text-blue-600" /> SPOKEDU 수업
            </h1>

            <div className="hidden md:flex bg-slate-100 rounded-lg p-0.5 items-center">
              <button
                type="button"
                onClick={() =>
                  setMonthAnchor((prev) => {
                    const d = new Date(prev);
                    d.setMonth(d.getMonth() - 1);
                    return d;
                  })
                }
                className="p-1 sm:p-1.5 hover:bg-white rounded-md transition-all"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                type="button"
                onClick={() => {
                  const n = new Date();
                  setMonthAnchor(new Date(n.getFullYear(), n.getMonth(), 1));
                }}
                className="px-2 sm:px-3 py-1 text-xs font-black rounded-md hover:bg-white transition-all"
              >
                이번 달
              </button>
              <button
                type="button"
                onClick={() =>
                  setMonthAnchor((prev) => {
                    const d = new Date(prev);
                    d.setMonth(d.getMonth() + 1);
                    return d;
                  })
                }
                className="p-1 sm:p-1.5 hover:bg-white rounded-md transition-all"
              >
                <ChevronRight size={14} />
              </button>
            </div>

            <div className="text-xs font-black text-slate-600 hidden md:block">{monthInfo.monthLabel}</div>

            {localToday ? (
              <div className="hidden md:flex items-center gap-2 rounded-lg bg-blue-50 px-2.5 py-1 border border-blue-200 shrink-0">
                <span className="text-[10px] font-black uppercase tracking-wide text-blue-800">오늘</span>
                <span className="text-xs font-black text-blue-950 tabular-nums">
                  {localToday.toLocaleDateString("ko-KR", {
                    month: "numeric",
                    day: "numeric",
                    weekday: "long",
                  })}
                </span>
              </div>
            ) : null}

            <div className="flex md:hidden items-center gap-1 bg-slate-100 rounded-lg p-0.5 shrink-0">
              <button
                type="button"
                aria-label="이전 날"
                onClick={() =>
                  setThreeDayCenter((prev) => addLocalDays(startOfLocalDay(prev), -1))
                }
                className="p-1.5 hover:bg-white rounded-md transition-all"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                onClick={() => {
                  const t = startOfLocalDay(new Date());
                  setThreeDayCenter(t);
                  setMonthAnchor(new Date(t.getFullYear(), t.getMonth(), 1));
                }}
                className="px-2 py-1 text-[11px] font-black rounded-md hover:bg-white transition-all whitespace-nowrap"
              >
                오늘
              </button>
              <button
                type="button"
                aria-label="다음 날"
                onClick={() =>
                  setThreeDayCenter((prev) => addLocalDays(startOfLocalDay(prev), 1))
                }
                className="p-1.5 hover:bg-white rounded-md transition-all"
              >
                <ChevronRight size={16} />
              </button>
            </div>
            <div className="text-[10px] font-black text-slate-500 md:hidden truncate max-w-[200px]">
              {mobileRangeLabel}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href="/admin/classes/list?create=1"
              className="px-4 py-2 rounded-full text-xs font-black bg-blue-600 text-white hover:bg-blue-700"
            >
              새 수업 개설
            </Link>
            <select
              className="bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-black text-slate-700 max-w-[160px]"
              value={filterTeacher}
              onChange={(e) => setFilterTeacher(e.target.value)}
            >
              <option value="ALL">전체 선생님</option>
              {teacherList.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <Link
              href="/admin/classes/list"
              className="px-4 py-2 rounded-full text-xs font-black bg-slate-900 text-white hover:bg-slate-800"
            >
              리스트로 이동
            </Link>
          </div>
        </nav>

        <div ref={calendarScrollAreaRef} className="flex-1 min-h-0 overflow-auto bg-slate-50">
          <div className="p-3 w-full max-w-[1600px] mx-auto min-w-0">
            <MobileThreeDayView
              days={mobileThreeDays}
              eventsByDay={eventsByDay}
              onOpen={openBundleForEvent}
            />

            <MonthExcelGrid
              weekRows={monthWeekRows}
              eventsByDay={eventsByDay}
              todayWeekRowRef={todayWeekRowRef}
              onOpen={openBundleForEvent}
            />
            <div className="mt-3 text-[11px] font-bold text-slate-500 md:hidden">
              모바일: 가운데 날짜 기준 전날·당일·다음날만 표시합니다. ◀ ▶ 로 하루씩 이동할 수 있습니다. 항목을 누르면
              번들 모달이 열립니다.
            </div>
            <div className="mt-3 text-[11px] font-bold text-slate-500 hidden md:block">
              월간(엑셀형): 진입 시 «오늘이 속한 주» 행이 먼저 보이도록 스크롤됩니다. 같은 주의 행 높이는 일정이 가장 많은 요일에 맞춰 늘어나며, 항목을 누르면 번들 모달이 열립니다. 마지막 회차는 빨간 FIN 배지로 표시합니다.
            </div>
          </div>
        </div>
      </div>

      <ClassBundlePanel
        visible={bundleOpen}
        bundleTitle={bundleTitle}
        groupIds={bundleGroupIds}
        onClose={() => setBundleOpen(false)}
        onChanged={() => void fetchSessions()}
      />
    </div>
  );
}
