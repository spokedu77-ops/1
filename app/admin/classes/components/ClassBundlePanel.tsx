"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronRight, Minus, Pencil, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { getSupabaseBrowserClient } from "@/app/lib/supabase/browser";
import { devLogger } from "@/app/lib/logging/devLogger";
import {
  MILEAGE_LABEL_POSTPONE,
  MILEAGE_LABEL_POSTPONE_REQUEST,
} from "@/app/admin/classes-shared/constants/mileage";
import {
  applySessionLinkedMileage,
  appendMileageActionLabel,
} from "@/app/admin/classes-shared/lib/applySessionLinkedMileage";
import { postponeCascade, undoPostponeCascade } from "@/app/admin/classes-shared/lib/postponeUtils";
import { extendClass } from "@/app/admin/classes-shared/lib/roundExtendUtils";
import { omitSessionIdentityForInsertClone } from "@/app/admin/classes-shared/lib/sessionInsertClone";
import { parseExtraTeachers, buildMemoWithExtras, extractMileageAction } from "@/app/admin/classes-shared/lib/sessionUtils";
import { resolvePlannedTotal, resolvePlannedTotalAfterDeleting } from "@/app/admin/classes-shared/lib/plannedRoundTotal";
import { formatRoundDisplay } from "@/app/admin/classes-shared/lib/roundFields";
import { reindexGroupRounds } from "@/app/admin/classes-shared/lib/reindexGroupRounds";
import { findCrossGroupSlotConflicts } from "@/app/admin/classes-shared/lib/sessionRoundGuards";
import {
  isSessionScheduleDraftDirty,
  isoRangeFromDateTimeInputs,
  mergeSessionScheduleDraft,
  type SessionScheduleDraft,
} from "@/app/admin/classes/lib/sessionScheduleDraftUtils";
import { SESSION_TYPE_OPTIONS } from "@/app/admin/classes/lib/sessionTypeCategory";
import {
  dominantSessionType,
  resolveDefaultAssistSessionPrice,
  resolveDefaultSessionPrice,
  shiftSessionToWeekday,
  type TeacherFeeRow,
} from "@/app/admin/classes/lib/bulkSessionDefaults";
import { cloneTierFeeMap, HARD_CODED_TIER_FEES, type TierFeeMap } from "@/app/lib/teacherTierSchedule";
import { fetchTeacherTierFeeMap } from "@/app/lib/teacherTierFeesStore";
import { fetchTeacherLogCounts } from "@/app/admin/users/fetchTeacherLogCounts";
import SessionMileageModal from "./SessionMileageModal";
import type { TeacherInput } from "@/app/admin/classes-shared/types";

type RoundView = "active" | "all" | "completed";

const RESTART_CYCLE_ROUNDS = 8;

type Props = {
  visible: boolean;
  bundleTitle: string;
  groupIds: string[];
  onClose: () => void;
  onChanged?: () => void;
};

type DayOption = { label: string; value: number };
const DAYS: DayOption[] = [
  { label: "일", value: 0 },
  { label: "월", value: 1 },
  { label: "화", value: 2 },
  { label: "수", value: 3 },
  { label: "목", value: 4 },
  { label: "금", value: 5 },
  { label: "토", value: 6 },
];

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function toDateInputValueLocal(d: Date) {
  // type="date"는 "로컬 YYYY-MM-DD" 의미로 동작해야 합니다.
  // toISOString()은 UTC 기준이라 한국 로컬 날짜가 하루 밀리는 문제가 생깁니다.
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

type SessionRow = {
  id: string;
  group_id: string;
  title: string | null;
  start_at: string;
  end_at: string;
  status: string | null;
  created_by: string | null;
  price: number | null;
  round_index: number | null;
  round_total: number | null;
  sequence_number?: number | null;
  session_type: string | null;
  memo?: string | null;
  mileage_option?: string | null;
};

/** v1 수업 모달(SessionEditModal)과 동일: memo의 EXTRA_TEACHERS, 보조 최대 2명 */
function extraTeachersFromMemo(memo: string | null | undefined): TeacherInput[] {
  const { extraTeachers } = parseExtraTeachers(memo || "");
  return extraTeachers.slice(0, 2);
}

function persistMemoExtras(rowMemo: string | null | undefined, extras: TeacherInput[]): string {
  const { cleanMemo } = parseExtraTeachers(rowMemo || "");
  const list = extras.slice(0, 2).map((e) => ({
    id: e.id || "",
    price: Number(e.price) || 0,
  }));
  if (list.length === 0) return cleanMemo;
  return buildMemoWithExtras(cleanMemo, list);
}

function statusBadgeClass(label: string): string {
  switch (label) {
    case "완료":
      return "bg-slate-700 text-white ring-1 ring-slate-600/30";
    case "예정":
      return "bg-amber-50 text-amber-900 border border-amber-200/80";
    case "진행중":
      return "bg-blue-50 text-blue-800 border border-blue-200/80";
    case "연기":
      return "bg-violet-100 text-violet-900 border border-violet-200";
    case "취소":
      return "bg-rose-50 text-rose-800 border border-rose-200/80";
    case "삭제":
      return "bg-slate-100 text-slate-700 border border-slate-200/80";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

/** 활성 세션 기준 대표 session_type (빈도 우선, 동률이면 one_day가 아닌 타입 우선) */
function resolveMainSessionTypeFromRows(rows: SessionRow[]): string | null {
  const active = rows.filter(
    (r) => r.status !== "postponed" && r.status !== "cancelled" && r.status !== "deleted"
  );
  const types = active
    .map((r) => r.session_type)
    .filter((t): t is string => typeof t === "string" && t.length > 0);
  if (types.length === 0) return null;
  const counts = new Map<string, number>();
  for (const t of types) counts.set(t, (counts.get(t) || 0) + 1);
  const unique = [...new Set(types)];
  unique.sort((a, b) => {
    const ca = counts.get(a) || 0;
    const cb = counts.get(b) || 0;
    if (cb !== ca) return cb - ca;
    const aOne = a.includes("one_day") ? 1 : 0;
    const bOne = b.includes("one_day") ? 1 : 0;
    return aOne - bOne;
  });
  return unique[0] ?? null;
}

function formatDateRange(rows: SessionRow[]) {
  if (rows.length === 0) return "-";
  const sorted = [...rows].sort(
    (a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime()
  );
  const start = new Date(sorted[0]!.start_at).toLocaleDateString("ko-KR", {
    month: "2-digit",
    day: "2-digit",
  });
  const end = new Date(sorted[sorted.length - 1]!.start_at).toLocaleDateString("ko-KR", {
    month: "2-digit",
    day: "2-digit",
  });
  return `${start} ~ ${end}`;
}

function getTimeStatusLabel(row: { start_at: string; end_at: string; status: string | null }) {
  const start = new Date(row.start_at);
  const end = new Date(row.end_at);
  const nowMs = Date.now();
  const isPostponed = row.status === "postponed";
  const isCancelled = row.status === "cancelled";
  const isDeleted = row.status === "deleted";
  const label = isPostponed
    ? "연기"
    : isCancelled
      ? "취소"
      : isDeleted
        ? "삭제"
        : nowMs > end.getTime()
          ? "완료"
          : nowMs >= start.getTime()
            ? "진행중"
            : "예정";
  const isCompletedByTime = !isPostponed && !isCancelled && !isDeleted && nowMs > end.getTime();
  const isActiveByTime = !isCancelled && !isDeleted && (!isCompletedByTime || isPostponed);
  return { label, isCompletedByTime, isActiveByTime };
}

/**
 * 일괄 적용 대상: 회차 목록「진행·예정 (연기 제외)」필터와 동일.
 * 취소·삭제·연기·시간상 완료 회차는 제외합니다.
 */
function isSessionBulkTarget(row: { start_at: string; end_at: string; status: string | null }) {
  if (row.status === "cancelled" || row.status === "deleted" || row.status === "postponed") return false;
  return !getTimeStatusLabel(row).isCompletedByTime;
}

/** 로컬 날짜 유지, 시·분만 변경. 수업 길이(ms) 유지 */
function applyLocalTimeKeepDuration(startAtIso: string, endAtIso: string, timeHHmm: string) {
  const [hh, mm] = timeHHmm.split(":").map(Number);
  const start = new Date(startAtIso);
  const end = new Date(endAtIso);
  const durationMs = end.getTime() - start.getTime();
  const newStart = new Date(start);
  if (Number.isFinite(hh) && Number.isFinite(mm)) {
    newStart.setHours(hh, mm, 0, 0);
  }
  const newEnd = new Date(
    newStart.getTime() + (Number.isFinite(durationMs) && durationMs > 0 ? durationMs : 3600000)
  );
  return { start_at: newStart.toISOString(), end_at: newEnd.toISOString() };
}

/** 사이클(그룹)의 캘린더 구간: 첫 회차가 있는 날 00:00 ~ 마지막 회차 종료일 23:59:59 (로컬) */
function getCycleCalendarBounds(list: SessionRow[]): { startDayMs: number; endDayMs: number } | null {
  const use = list.filter((s) => s.status !== "deleted");
  if (use.length === 0) return null;
  const sorted = [...use].sort(
    (a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime()
  );
  const first = new Date(sorted[0]!.start_at);
  const last = new Date(sorted[sorted.length - 1]!.end_at);
  const startDayMs = new Date(first.getFullYear(), first.getMonth(), first.getDate()).getTime();
  const endDayMs = new Date(
    last.getFullYear(),
    last.getMonth(),
    last.getDate(),
    23,
    59,
    59,
    999
  ).getTime();
  return { startDayMs, endDayMs };
}

/** 마지막 회차일이 오늘 0시 이전이면 캘린더상 종료 */
function isPastCycleGroup(list: SessionRow[]): boolean {
  const bounds = getCycleCalendarBounds(list);
  if (!bounds) return false;
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  return bounds.endDayMs < startOfToday.getTime();
}

/** 번들 내 가장 최근(마지막) 사이클 group_id */
function getLatestGroupIdWithSessions(
  sortedGroupIds: string[],
  sessionsByGroupId: Record<string, SessionRow[]>
): string | null {
  for (let i = sortedGroupIds.length - 1; i >= 0; i--) {
    const gid = sortedGroupIds[i]!;
    if ((sessionsByGroupId[gid] || []).length > 0) return gid;
  }
  return null;
}

/**
 * 지난 사이클 아카이브·읽기 전용.
 * 시범 1회만 등록 후 연장 대기처럼 번들의 최신 사이클은 날짜가 지나도 도구를 유지한다.
 */
function isArchivedPastCycleGroup(
  list: SessionRow[],
  gid: string,
  latestGid: string | null
): boolean {
  if (latestGid && gid === latestGid) return false;
  return isPastCycleGroup(list);
}

type ToolPanelKey = "extend" | "shrink" | "restart";

export default function ClassBundlePanel({ visible, bundleTitle, groupIds, onClose, onChanged }: Props) {
  const [supabase] = useState(() =>
    typeof window !== "undefined" ? getSupabaseBrowserClient() : null
  );

  const [teachers, setTeachers] = useState<TeacherFeeRow[]>([]);
  const [tierFeeMap, setTierFeeMap] = useState<TierFeeMap>(() => cloneTierFeeMap(HARD_CODED_TIER_FEES));
  const bundleBulkRef = useRef({ teacher: {} as Record<string, string>, price: {} as Record<string, string> });
  const teacherMap = useMemo(() => {
    const map: Record<string, string> = {};
    teachers.forEach((t) => {
      if (!t?.id) return;
      map[t.id] = t.name ?? "";
    });
    return map;
  }, [teachers]);

  const [loading, setLoading] = useState(false);
  const [roundView, setRoundView] = useState<RoundView>("active");
  const [openGroupIds, setOpenGroupIds] = useState<Record<string, boolean>>({});
  const [pastArchiveOpen, setPastArchiveOpen] = useState(false);
  const [sessionsByGroupId, setSessionsByGroupId] = useState<Record<string, SessionRow[]>>({});
  const [localGroupIds, setLocalGroupIds] = useState<string[]>([]);
  const [undoingPostponeSessionId, setUndoingPostponeSessionId] = useState<string | null>(null);
  const [postponingSessionId, setPostponingSessionId] = useState<string | null>(null);
  const [scheduleDraftBySessionId, setScheduleDraftBySessionId] = useState<
    Record<string, SessionScheduleDraft>
  >({});
  const [savingSessionScheduleId, setSavingSessionScheduleId] = useState<string | null>(null);
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);
  const [mileageModal, setMileageModal] = useState<{ gid: string; row: SessionRow } | null>(null);

  const [extendCountByGroup, setExtendCountByGroup] = useState<Record<string, number>>({});
  const [shrinkCountByGroup, setShrinkCountByGroup] = useState<Record<string, number>>({});
  const [reindexingByGroup, setReindexingByGroup] = useState<Record<string, boolean>>({});
  const [shrinkingByGroup, setShrinkingByGroup] = useState<Record<string, boolean>>({});

  const [restartingByGroup, setRestartingByGroup] = useState<Record<string, boolean>>({});
  const [restartCountByGroup, setRestartCountByGroup] = useState<Record<string, number>>({});
  const [restartIntervalDaysByGroup, setRestartIntervalDaysByGroup] = useState<Record<string, number>>({});
  const [restartWeeklyFrequencyByGroup, setRestartWeeklyFrequencyByGroup] = useState<Record<string, 1 | 2>>({});
  const [restartStartDateByGroup, setRestartStartDateByGroup] = useState<Record<string, string>>({});
  const [restartStartTimeByGroup, setRestartStartTimeByGroup] = useState<Record<string, string>>({});
  const [restartDaysOfWeekByGroup, setRestartDaysOfWeekByGroup] = useState<Record<string, number[]>>({});

  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [savingTitle, setSavingTitle] = useState(false);
  const [bulkTeacherIdByGroup, setBulkTeacherIdByGroup] = useState<Record<string, string>>({});
  const [bulkStartTimeByGroup, setBulkStartTimeByGroup] = useState<Record<string, string>>({});
  /** "" = 요일 변경 없음 */
  const [bulkDayOfWeekByGroup, setBulkDayOfWeekByGroup] = useState<Record<string, string>>({});
  const [bulkPriceByGroup, setBulkPriceByGroup] = useState<Record<string, string>>({});
  const [bulkAssistTeacherIdByGroup, setBulkAssistTeacherIdByGroup] = useState<Record<string, string>>({});
  const [bulkAssistPriceByGroup, setBulkAssistPriceByGroup] = useState<Record<string, string>>({});
  const [bulkTeacherApplyingGid, setBulkTeacherApplyingGid] = useState<string | null>(null);
  const [bulkAssistApplyingGid, setBulkAssistApplyingGid] = useState<string | null>(null);

  bundleBulkRef.current = { teacher: bulkTeacherIdByGroup, price: bulkPriceByGroup };


  const [sessionTypePanelOpen, setSessionTypePanelOpen] = useState(false);
  const [bundleSessionTypeDraft, setBundleSessionTypeDraft] = useState("regular_private");
  const [bundleSessionTypesMixed, setBundleSessionTypesMixed] = useState(false);
  const [savingSessionType, setSavingSessionType] = useState(false);

  /** 회차 확장 / 축소 / 재시작 블록 접기(기본 접힘) */
  const [toolPanelOpenByGroup, setToolPanelOpenByGroup] = useState<
    Record<string, Partial<Record<ToolPanelKey, boolean>>>
  >({});

  /** 일괄 적용 블록 — 현재 사이클에서 기본 펼침 */
  const [bulkOpenByGroup, setBulkOpenByGroup] = useState<Record<string, boolean>>({});
  /** 사이클 도구(재정렬·확장·축소·재시작) 접기(기본 접힘) */
  const [cycleToolsOpenByGroup, setCycleToolsOpenByGroup] = useState<Record<string, boolean>>({});

  /** prop groupIds와 재시작으로 붙은 localGroupIds 합집합 — 첫 오픈 시 loadAll 레이스 방지 */
  const effectiveGroupIds = useMemo(() => {
    const s = new Set<string>();
    for (const id of groupIds) {
      if (id) s.add(String(id));
    }
    for (const id of localGroupIds) {
      if (id) s.add(String(id));
    }
    return Array.from(s);
  }, [groupIds, localGroupIds]);

  const bundleKey = useMemo(
    () => [...effectiveGroupIds].map((id) => String(id)).sort().join(","),
    [effectiveGroupIds]
  );

  useEffect(() => {
    setScheduleDraftBySessionId({});
  }, [bundleKey, visible]);

  const loadAll = useCallback(async () => {
    if (!supabase) return;
    if (!visible) return;
    if (effectiveGroupIds.length === 0) {
      setSessionsByGroupId({});
      return;
    }
    setLoading(true);
    try {
      const [sessionsRes, usersRes, tierRes] = await Promise.all([
        supabase
          .from("sessions")
          .select(
            "id, group_id, title, start_at, end_at, status, created_by, price, round_index, round_total, sequence_number, session_type, memo, mileage_option"
          )
          .in("group_id", effectiveGroupIds)
          .order("start_at", { ascending: true }),
        supabase
          .from("users")
          .select(
            "id, name, session_count, fee_private, fee_group, fee_center_main, fee_center_assist"
          )
          .eq("is_active", true)
          .order("name", { ascending: true }),
        fetchTeacherTierFeeMap(supabase),
      ]);

      const { data, error } = sessionsRes;
      if (usersRes.error) devLogger.error(usersRes.error);
      const baseTeachers = (usersRes.data || []) as TeacherFeeRow[];
      const logCountByTeacher = await fetchTeacherLogCounts(
        supabase,
        baseTeachers.map((t) => t.id),
      );
      const teacherRows = baseTeachers.map((t) => ({
        ...t,
        logCount: logCountByTeacher[t.id] ?? 0,
      }));
      setTeachers(teacherRows);
      setTierFeeMap(tierRes.map);

      if (error) throw error;
      const rows = (data || []) as SessionRow[];
      const map: Record<string, SessionRow[]> = {};
      for (const r of rows) {
        const gid = r.group_id;
        if (!map[gid]) map[gid] = [];
        map[gid]!.push(r);
      }
      setSessionsByGroupId(map);

      // 기본 필터가 "예정/진행만"이라, 전부 종료된 번들은 행이 0건으로 보임 → 캘린더·리스트와 동일하게 회차 표를 쓰려면 "전체"로 전환
      const nonDeleted = rows.filter((r) => r.status !== "deleted");
      const hasScheduledRound = nonDeleted.some((r) => {
        if (r.status === "cancelled") return false;
        if (r.status === "postponed") return false;
        const s = getTimeStatusLabel(r);
        return !s.isCompletedByTime;
      });
      if (!hasScheduledRound && nonDeleted.length > 0) {
        setRoundView((prev) => (prev === "active" ? "all" : prev));
      }

      const bundleRows = effectiveGroupIds.flatMap((gid) => map[gid] || []);
      const resolvedType = resolveMainSessionTypeFromRows(bundleRows) ?? "regular_private";
      const distinctTypes = new Set(
        bundleRows
          .map((r) => r.session_type)
          .filter((t): t is string => typeof t === "string" && t.length > 0)
      );
      setBundleSessionTypeDraft(resolvedType);
      setBundleSessionTypesMixed(distinctTypes.size > 1);

      const flatTitles = effectiveGroupIds.flatMap((gid) => map[gid] || []).map((r) => r.title);
      const firstTitle = flatTitles.find((t) => t && String(t).trim());
      if (firstTitle) setTitleDraft(String(firstTitle).trim());

      const prevBulk = bundleBulkRef.current;
      const nextBulkT: Record<string, string> = { ...prevBulk.teacher };
      const nextBulkP: Record<string, string> = { ...prevBulk.price };
      for (const gid of effectiveGroupIds) {
        const list = map[gid] || [];
        if (nextBulkT[gid] == null || nextBulkT[gid] === "") {
          nextBulkT[gid] = list.find((s) => s.created_by)?.created_by ?? "";
        }
        const tid = nextBulkT[gid] ?? "";
        const teacher = teacherRows.find((t) => t.id === tid);
        const dom = dominantSessionType(list);
        nextBulkP[gid] = teacher
          ? String(resolveDefaultSessionPrice(teacher, dom, tierRes.map))
          : "";
      }
      setBulkTeacherIdByGroup(nextBulkT);
      setBulkPriceByGroup(nextBulkP);

      setBulkDayOfWeekByGroup((prev) => {
        const n = { ...prev };
        for (const gid of effectiveGroupIds) {
          if (n[gid] === undefined) n[gid] = "";
        }
        return n;
      });

      const sortedForLoad = [...effectiveGroupIds].sort((a, b) => {
        const ar = map[a] || [];
        const br = map[b] || [];
        const aMin = ar.length ? Math.min(...ar.map((s) => new Date(s.start_at).getTime())) : Number.POSITIVE_INFINITY;
        const bMin = br.length ? Math.min(...br.map((s) => new Date(s.start_at).getTime())) : Number.POSITIVE_INFINITY;
        return aMin - bMin;
      });
      const latestGidOnLoad = getLatestGroupIdWithSessions(sortedForLoad, map);

      // 기본 오픈: 예정/진행 사이클만 펼침. 지난 사이클은 아카이브에 두고, 아카이브는 지난 사이클이 있으면 열어 둔다.
      const nextOpen: Record<string, boolean> = {};
      for (const gid of effectiveGroupIds) {
        const list = map[gid] || [];
        if (list.length === 0) continue;
        nextOpen[gid] = !isArchivedPastCycleGroup(list, gid, latestGidOnLoad);
      }
      const hasCurrentCycle = effectiveGroupIds.some((gid) => {
        const list = map[gid] || [];
        return list.length > 0 && !isArchivedPastCycleGroup(list, gid, latestGidOnLoad);
      });
      const hasPastCycle = effectiveGroupIds.some((gid) => {
        const list = map[gid] || [];
        return list.length > 0 && isArchivedPastCycleGroup(list, gid, latestGidOnLoad);
      });
      const hasAnySessions = effectiveGroupIds.some((gid) => (map[gid] || []).length > 0);
      if (hasAnySessions && !hasCurrentCycle) {
        for (const gid of effectiveGroupIds) {
          const list = map[gid] || [];
          if (list.length > 0) nextOpen[gid] = true;
        }
      }
      setPastArchiveOpen(hasPastCycle);
      setOpenGroupIds(nextOpen);

      // 기본값(확장/축소/재시작) 초기화
      setExtendCountByGroup((prev) => {
        const next = { ...prev };
        for (const gid of effectiveGroupIds) if (next[gid] == null) next[gid] = 1;
        return next;
      });
      setShrinkCountByGroup((prev) => {
        const next = { ...prev };
        for (const gid of effectiveGroupIds) if (next[gid] == null) next[gid] = 1;
        return next;
      });
      setRestartCountByGroup((prev) => {
        const next = { ...prev };
        for (const gid of effectiveGroupIds) if (next[gid] == null) next[gid] = RESTART_CYCLE_ROUNDS;
        return next;
      });
      setRestartWeeklyFrequencyByGroup((prev) => {
        const next = { ...prev };
        for (const gid of effectiveGroupIds) if (next[gid] == null) next[gid] = 1;
        return next;
      });
      setRestartIntervalDaysByGroup((prev) => {
        const next = { ...prev };
        for (const gid of effectiveGroupIds) if (next[gid] == null) next[gid] = 7;
        return next;
      });
      setRestartStartDateByGroup((prev) => {
        const next = { ...prev };
        for (const gid of effectiveGroupIds) {
          if (next[gid] != null) continue;
          const list = map[gid] || [];
          const last = list[list.length - 1];
          const base = last?.start_at ? addDays(new Date(last.start_at), 7) : new Date();
          next[gid] = toDateInputValueLocal(base);
        }
        return next;
      });
      setRestartStartTimeByGroup((prev) => {
        const next = { ...prev };
        for (const gid of effectiveGroupIds) {
          if (next[gid] != null) continue;
          const list = map[gid] || [];
          const last = list[list.length - 1];
          const base = last?.start_at ? addDays(new Date(last.start_at), 7) : new Date();
          next[gid] = base.toTimeString().slice(0, 5);
        }
        return next;
      });
      setRestartDaysOfWeekByGroup((prev) => {
        const next = { ...prev };
        for (const gid of effectiveGroupIds) {
          if (next[gid] != null) continue;
          const list = map[gid] || [];
          const last = list[list.length - 1];
          const base = last?.start_at ? addDays(new Date(last.start_at), 7) : new Date();
          next[gid] = [base.getDay()];
        }
        return next;
      });
    } catch (err) {
      devLogger.error(err);
      toast.error("사이클 정보를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [supabase, visible, effectiveGroupIds]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (!visible) return;
    setLocalGroupIds(groupIds);
  }, [visible, groupIds]);

  useEffect(() => {
    if (!visible) {
      setEditingTitle(false);
      setSessionTypePanelOpen(false);
      setRoundView("active");
    }
  }, [visible]);

  /** 같은 모달에서 번들(그룹)만 바뀔 때도 기본은 진행·예정(연기 제외) */
  useEffect(() => {
    if (!visible) return;
    setRoundView("active");
  }, [visible, bundleKey]);

  const plannedTotalOfGroup = useCallback((rows: SessionRow[]) => resolvePlannedTotal(rows), []);

  const getActiveSessionsSorted = useCallback((rows: SessionRow[]) => {
    return [...rows]
      .filter((r) => r.status !== "postponed" && r.status !== "cancelled" && r.status !== "deleted")
      .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime());
  }, []);

  const toggleGroup = (gid: string) => {
    setOpenGroupIds((prev) => ({ ...prev, [gid]: !prev[gid] }));
  };

  const toggleToolPanel = (gid: string, key: ToolPanelKey) => {
    setToolPanelOpenByGroup((prev) => {
      const cur = prev[gid] ?? {};
      return { ...prev, [gid]: { ...cur, [key]: !cur[key] } };
    });
  };

  const isToolPanelOpen = (gid: string, key: ToolPanelKey) => !!toolPanelOpenByGroup[gid]?.[key];

  const applyInlineUpdate = async (
    gid: string,
    sessionId: string,
    patch: {
      start_at?: string;
      end_at?: string;
      price?: number;
      created_by?: string;
      memo?: string | null;
      mileage_option?: string | null;
    }
  ) => {
    if (!supabase) return;
    try {
      const { error } = await supabase.from("sessions").update(patch).eq("id", sessionId);
      if (error) throw error;
      toast.success("저장되었습니다.");
      if (patch.start_at && patch.end_at) {
        setScheduleDraftBySessionId((prev) => {
          const next = { ...prev };
          delete next[sessionId];
          return next;
        });
      }
      setSessionsByGroupId((prev) => {
        const next = { ...prev };
        next[gid] = (next[gid] || []).map((r) => (r.id === sessionId ? { ...r, ...(patch as any) } : r));
        return next;
      });
      onChanged?.();
    } catch (err) {
      devLogger.error(err);
      toast.error("저장에 실패했습니다.");
    }
  };

  const saveSessionSchedule = async (gid: string, r: SessionRow) => {
    const savedDateStr = toDateInputValueLocal(new Date(r.start_at));
    const savedTimeStr = new Date(r.start_at).toTimeString().slice(0, 5);
    const draft =
      scheduleDraftBySessionId[r.id] ??
      ({ dateStr: savedDateStr, timeStr: savedTimeStr } satisfies SessionScheduleDraft);
    const patchIso = isoRangeFromDateTimeInputs(
      r.start_at,
      r.end_at,
      draft.dateStr,
      draft.timeStr
    );
    if (!patchIso) {
      toast.error("날짜와 시간을 확인해 주세요.");
      return;
    }
    setSavingSessionScheduleId(r.id);
    try {
      const rows = sessionsByGroupId[gid] || [];
      const rowsAfterSchedule = rows.map((row) =>
        row.id === r.id
          ? { ...row, start_at: patchIso.start_at, end_at: patchIso.end_at }
          : row
      );
      await applyInlineUpdate(gid, r.id, {
        start_at: patchIso.start_at,
        end_at: patchIso.end_at,
      });
      if (supabase) {
        const n = await reindexGroupRounds(supabase, rowsAfterSchedule);
        if (n > 1) {
          toast.message("날짜 저장 후 회차 번호를 날짜 순으로 맞췄습니다.");
          void loadAll();
          onChanged?.();
        }
      }
    } finally {
      setSavingSessionScheduleId(null);
    }
  };

  const saveSessionExtras = async (gid: string, row: SessionRow, extras: TeacherInput[]) => {
    const memo = persistMemoExtras(row.memo, extras);
    await applyInlineUpdate(gid, row.id, { memo });
  };

  const addAssistRow = async (gid: string, row: SessionRow) => {
    const extras = extraTeachersFromMemo(row.memo);
    if (extras.length >= 2) return;
    await saveSessionExtras(gid, row, [...extras, { id: "", price: 0 }]);
  };

  const removeAssistRow = async (gid: string, row: SessionRow, index: number) => {
    const extras = extraTeachersFromMemo(row.memo).filter((_, i) => i !== index);
    await saveSessionExtras(gid, row, extras);
  };

  const setAssistIdAt = async (gid: string, row: SessionRow, index: number, teacherId: string) => {
    const extras = [...extraTeachersFromMemo(row.memo)];
    while (extras.length <= index) extras.push({ id: "", price: 0 });
    extras[index] = { ...extras[index]!, id: teacherId };
    await saveSessionExtras(gid, row, extras);
  };

  const setAssistPriceAt = async (gid: string, row: SessionRow, index: number, price: number) => {
    const extras = [...extraTeachersFromMemo(row.memo)];
    while (extras.length <= index) extras.push({ id: "", price: 0 });
    extras[index] = { ...extras[index]!, price };
    await saveSessionExtras(gid, row, extras);
  };

  const applyMainTeacher = async (gid: string, row: SessionRow, newMainId: string) => {
    let extras = extraTeachersFromMemo(row.memo);
    extras = extras.filter((t) => !t.id || t.id !== newMainId);
    const memo = persistMemoExtras(row.memo, extras);
    await applyInlineUpdate(gid, row.id, { created_by: newMainId, memo });
  };

  const handlePostpone = async (
    _gid: string,
    sessionId: string,
    kind: "postpone" | "postpone_request"
  ) => {
    if (!supabase) return;
    if (postponingSessionId === sessionId) return;
    const mileageLabel =
      kind === "postpone_request" ? MILEAGE_LABEL_POSTPONE_REQUEST : MILEAGE_LABEL_POSTPONE;
    const mileageHint =
      kind === "postpone_request"
        ? "마일리지 −5,000 (수업 연기 요청)이 연기 기록에 자동 반영됩니다."
        : "마일리지 +2,500 (수업 연기)이 연기 기록에 자동 반영됩니다.";
    if (
      !confirm(
        `「${kind === "postpone_request" ? "연기요청" : "연기"}(일정 미루기)」: 현재 회차부터 이후 회차 날짜를 한 칸씩 미룹니다.\n${mileageHint}\n회차 차감·수업료 0원 처리가 목적이면 「회차 취소(차감)」를 사용하세요.\n\n계속할까요?`
      )
    )
      return;

    setPostponingSessionId(sessionId);
    try {
      const postponedId = await postponeCascade(supabase, sessionId, {
        onAfter: () => {
          void loadAll();
          onChanged?.();
        },
      });
      if (!postponedId) return;

      const { data: ghost, error: ghostError } = await supabase
        .from("sessions")
        .select("id, start_at, title, memo, mileage_option, created_by")
        .eq("id", postponedId)
        .maybeSingle();
      if (ghostError || !ghost?.id) {
        toast.error("일정은 연기되었지만 마일리지 대상 회차를 찾지 못했습니다. 마일리지에서 직접 넣어 주세요.");
        return;
      }

      const prevAction = extractMileageAction(
        ghost.memo || "",
        ghost.mileage_option ?? undefined
      ).mileageAction;
      const nextActionStr = appendMileageActionLabel(prevAction, mileageLabel);
      const result = await applySessionLinkedMileage(supabase, {
        sessionId: ghost.id,
        sessionStartAt: ghost.start_at ?? null,
        title: ghost.title ?? null,
        memo: ghost.memo,
        mileage_option: ghost.mileage_option,
        created_by: ghost.created_by ?? null,
        nextActionStr,
      });
      if (!result.ok) {
        toast.error(result.error || "일정은 연기되었지만 마일리지 반영에 실패했습니다.");
        return;
      }
      if (result.warning) toast.error(`경고: ${result.warning}`);
      else toast.success(`${mileageLabel} 마일리지가 반영되었습니다.`);
      void loadAll();
      onChanged?.();
    } finally {
      setPostponingSessionId(null);
    }
  };

  // postponed 상태였던 회차를 원래 슬롯 기준으로 복구합니다.
  const handleUndoPostpone = async (sessionId: string) => {
    if (!supabase) return;
    if (!sessionId) return;
    if (undoingPostponeSessionId === sessionId) return;
    if (!confirm("연기 전 시간 슬롯 기준으로 복구합니다. 계속할까요?")) return;

    setUndoingPostponeSessionId(sessionId);
    try {
      await undoPostponeCascade(supabase, sessionId, {
        onAfter: () => {
          void loadAll();
          onChanged?.();
        },
      });
    } catch (err) {
      devLogger.error(err);
      toast.error("일정 복구에 실패했습니다.");
    } finally {
      setUndoingPostponeSessionId(null);
    }
  };

  const handleExtend = async (gid: string, addCount: number) => {
    if (!supabase) return;
    if (addCount <= 0) return;
    await extendClass(supabase, gid, addCount, {
      onAfter: () => {
        void loadAll();
        onChanged?.();
      },
    });
  };

  const handleReindexRounds = async (gid: string) => {
    if (!supabase) return;
    const sessions = sessionsByGroupId[gid] || [];
    const active = getActiveSessionsSorted(sessions);
    if (active.length <= 1) return;
    const current = active;
    const preview = current
      .slice(0, 6)
      .map((r, i) => `${i + 1}. ${new Date(r.start_at).toLocaleString("ko-KR")}`)
      .join("\n");
    const previewTail = current
      .slice(-6)
      .map((r, i) => `${current.length - 6 + i + 1}. ${new Date(r.start_at).toLocaleString("ko-KR")}`)
      .join("\n");
    if (
      !confirm(
        `현재 날짜 순서(start_at) 기준으로 회차 번호/총회차/표시를 1..N으로 재정렬합니다.\n- round_index, round_total, sequence_number, round_display가 변경됩니다.\n\n미리보기(앞 6개):\n${preview}\n\n미리보기(뒤 6개):\n${previewTail}`
      )
    )
      return;

    setReindexingByGroup((prev) => ({ ...prev, [gid]: true }));
    try {
      await reindexGroupRounds(supabase, sessions);
      toast.success("회차가 재정렬되었습니다.");
      void loadAll();
      onChanged?.();
    } catch (err) {
      devLogger.error(err);
      toast.error("회차 재정렬에 실패했습니다.");
    } finally {
      setReindexingByGroup((prev) => ({ ...prev, [gid]: false }));
    }
  };

  const handleDeleteSession = async (gid: string, sessionId: string) => {
    if (!supabase) return;
    if (!sessionId) return;
    if (deletingSessionId === sessionId) return;

    const { data: curr, error: fetchErr } = await supabase
      .from("sessions")
      .select("id, round_index, round_total, start_at, status")
      .eq("id", sessionId)
      .maybeSingle();
    if (fetchErr) {
      devLogger.error(fetchErr);
      toast.error("회차 정보를 불러오지 못했습니다.");
      return;
    }
    if (!curr?.id) {
      toast.error("회차 정보를 찾을 수 없습니다.");
      return;
    }

    const groupRows = sessionsByGroupId[gid] || [];
    const contractTotal = resolvePlannedTotal(groupRows.length > 0 ? groupRows : [curr]);
    const roundIndex =
      typeof curr.round_index === "number" && Number.isFinite(curr.round_index)
        ? curr.round_index
        : null;
    const roundLabel =
      roundIndex != null && contractTotal > 0
        ? formatRoundDisplay(roundIndex, contractTotal)
        : null;

    const confirmMsg = roundLabel
      ? `「${roundLabel}」 회차를 차감(취소) 처리합니다.\n\n· 해당 회차는 소진·수업료 0원입니다.\n· 이후 회차 번호·날짜는 그대로입니다. (예: 3/8 취소 → 다음 8.14 수업은 4/8)\n· 일정을 미루려면 「연기(일정 미루기)」를 사용하세요.\n\n계속할까요?`
      : "해당 회차를 차감(취소) 처리합니다.\n\n· 해당 회차는 소진·수업료 0원입니다.\n· 이후 회차 번호·날짜는 재정렬·미루기하지 않습니다.\n· 일정을 미루려면 「연기(일정 미루기)」를 사용하세요.\n\n계속할까요?";
    if (!confirm(confirmMsg)) return;

    setDeletingSessionId(sessionId);
    try {
      // 취소 = price 0 + 해당 회차 슬롯 소진. round_index·round_total·날짜는 유지(재정렬·연기 금지).
      const cancelPatch: {
        status: string;
        price: number;
        round_display?: string;
      } = { status: "cancelled", price: 0 };
      if (roundIndex != null && contractTotal > 0) {
        cancelPatch.round_display = formatRoundDisplay(roundIndex, contractTotal);
      }

      const { data: cancelledRow, error: cancelErr } = await supabase
        .from("sessions")
        .update(cancelPatch)
        .eq("id", sessionId)
        .select("id")
        .maybeSingle();
      if (cancelErr) throw cancelErr;
      if (!cancelledRow?.id) throw new Error("BUNDLE_SESSION_NOT_CANCELLED");
      toast.success(
        roundLabel
          ? `「${roundLabel}」 회차가 차감(취소) 처리되었습니다. 이후 회차 번호·날짜는 유지됩니다.`
          : "회차가 차감(취소) 처리되었습니다."
      );
      await loadAll();
      onChanged?.();
    } catch (err) {
      devLogger.error(err);
      toast.error("회차 차감(취소) 처리에 실패했습니다.");
    } finally {
      setDeletingSessionId(null);
    }
  };

  const handleShrinkTail = async (gid: string) => {
    if (!supabase) return;
    const sessions = sessionsByGroupId[gid] || [];
    const active = getActiveSessionsSorted(sessions);
    if (active.length === 0) return;
    const n = Math.max(1, Math.floor(shrinkCountByGroup[gid] || 1));
    const toRemove = active.slice(-n);
    if (toRemove.length === 0) return;
    const hasPast = toRemove.some((s) => Date.now() > new Date(s.end_at).getTime());
    const msg = hasPast
      ? `⚠ 과거/완료된 회차가 포함됩니다.\n마지막 ${toRemove.length}개 회차를 DB에서 영구 삭제하고 회차 정보를 재계산할까요?`
      : `마지막 ${toRemove.length}개 회차를 DB에서 영구 삭제하고 회차 정보를 재계산할까요?`;
    if (!confirm(msg)) return;

    setShrinkingByGroup((prev) => ({ ...prev, [gid]: true }));
    try {
      const idsToDelete = toRemove.map((s) => s.id);
      const { error: delErr } = await supabase.from("sessions").delete().in("id", idsToDelete);
      if (delErr) throw delErr;

      const total = resolvePlannedTotalAfterDeleting(sessions, idsToDelete.length);
      const remaining = active.filter((s) => !idsToDelete.includes(s.id));
      const remainingActiveIds = new Set(remaining.map((s) => s.id));
      const remainingTotalRows = sessions.filter(
        (s) => !idsToDelete.includes(s.id) && !remainingActiveIds.has(s.id) && s.status !== "deleted"
      );
      if (remaining.length > 0) {
        await Promise.all(
          remaining.map((row, i) =>
            supabase
              .from("sessions")
              .update({
                round_index: i + 1,
                round_total: total,
                sequence_number: i + 1,
                round_display: `${i + 1}/${total}`,
              })
              .eq("id", row.id)
          )
        );
      }
      if (remainingTotalRows.length > 0) {
        await Promise.all(
          remainingTotalRows.map((row) => {
            const patch = {
              round_total: total,
              ...(typeof row.round_index === "number"
                ? { round_display: `${Math.min(row.round_index, total)}/${total}` }
                : {}),
            };
            return supabase.from("sessions").update(patch).eq("id", row.id);
          })
        );
      }
      toast.success("회차가 축소되었습니다.");
      void loadAll();
      onChanged?.();
    } catch (err) {
      devLogger.error(err);
      toast.error("회차 축소에 실패했습니다.");
    } finally {
      setShrinkingByGroup((prev) => ({ ...prev, [gid]: false }));
    }
  };

  const handleRestartCycle = async (gid: string) => {
    if (!supabase) return;
    const sessions = sessionsByGroupId[gid] || [];
    if (sessions.length === 0) return;
    const sorted = [...sessions].sort(
      (a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime()
    );
    const last = sorted[sorted.length - 1]!;
    const baseStart = new Date(last.start_at);
    const baseEnd = new Date(last.end_at);
    const baseDurationMs = baseEnd.getTime() - baseStart.getTime();
    if (!Number.isFinite(baseDurationMs) || baseDurationMs <= 0) {
      return toast.error("마지막 회차 시간이 올바르지 않아 재시작할 수 없습니다.");
    }

    const count = Math.max(1, Math.floor(restartCountByGroup[gid] ?? RESTART_CYCLE_ROUNDS));
    const intervalDays = Math.max(1, Math.floor(restartIntervalDaysByGroup[gid] || 7));
    const weeklyFreq = restartWeeklyFrequencyByGroup[gid] || 1;
    const startDate = restartStartDateByGroup[gid];
    const startTime = restartStartTimeByGroup[gid];
    const startFrom = new Date(`${startDate}T${startTime}`);
    if (!Number.isFinite(startFrom.getTime())) return toast.error("시작일/시간이 올바르지 않습니다.");
    const selectedDays =
      weeklyFreq === 1
        ? [startFrom.getDay()]
        : (restartDaysOfWeekByGroup[gid] && restartDaysOfWeekByGroup[gid]!.length
            ? restartDaysOfWeekByGroup[gid]!
            : [startFrom.getDay()]);

    const buildDates = () => {
      const dates: Date[] = [];
      const cursor = new Date(startFrom);
      while (dates.length < count) {
        const weekStart = new Date(cursor);
        weekStart.setDate(cursor.getDate() - cursor.getDay());
        for (const d of selectedDays) {
          const dayDate = new Date(weekStart);
          dayDate.setDate(weekStart.getDate() + d);
          dayDate.setHours(startFrom.getHours(), startFrom.getMinutes(), 0, 0);
          if (dayDate >= startFrom && dates.length < count) dates.push(new Date(dayDate));
        }
        cursor.setDate(cursor.getDate() + 7);
      }
      return dates;
    };

    const dates =
      weeklyFreq === 1
        ? Array.from({ length: count }, (_, i) => addDays(startFrom, intervalDays * i))
        : buildDates();

    const restartTitle = String(bundleTitle || last.title || "").trim();
    const restartTeacherId = String(last.created_by ?? "");
    const restartStartAtList = dates.map((d) => d.toISOString());
    const slotConflicts = await findCrossGroupSlotConflicts(supabase, {
      teacherId: restartTeacherId,
      title: restartTitle,
      startAtList: restartStartAtList,
    });
    if (slotConflicts.length > 0) {
      const sample = slotConflicts
        .slice(0, 3)
        .map((c) => `${new Date(c.start_at).toLocaleString("ko-KR")} (${c.round_display ?? "회차?"})`)
        .join("\n");
      toast.error(
        `새 사이클 일정이 기존 다른 그룹 수업과 ${slotConflicts.length}건 겹칩니다. 구 사이클을 정리·취소한 뒤 재시작하세요.\n${sample}`
      );
      return;
    }

    if (
      !confirm(
        `사이클을 재시작할까요?\n- 기존 회차는 그대로 유지\n- 새 그룹으로 ${count}회차 생성(예정)\n- 시작: ${startFrom.toLocaleString("ko-KR")}\n- 패턴: ${weeklyFreq === 1 ? `주1회(${intervalDays}일 간격)` : `주2회(요일 ${selectedDays.join(",")})`}\n`
      )
    ) {
      return;
    }

    setRestartingByGroup((prev) => ({ ...prev, [gid]: true }));
    try {
      const nextGroupId = crypto.randomUUID();
      const base = omitSessionIdentityForInsertClone(last as Record<string, unknown>);
      const { start_at: _sa, end_at: _ea, status: _st, ...insertBase } = base;
      void _sa;
      void _ea;
      void _st;

      const newSessions: Record<string, unknown>[] = [];
      for (let i = 1; i <= dates.length; i++) {
        const start = dates[i - 1]!;
        const end = new Date(start.getTime() + baseDurationMs);
        newSessions.push({
          ...insertBase,
          group_id: nextGroupId,
          title: bundleTitle,
          status: "opened",
          start_at: start.toISOString(),
          end_at: end.toISOString(),
          students_text: null,
          feedback_fields: {},
          photo_url: [],
          file_url: [],
          round_index: i,
          round_total: dates.length,
          sequence_number: i,
          round_display: `${i}/${dates.length}`,
        });
      }

      const { error } = await supabase.from("sessions").insert(newSessions);
      if (error) throw error;
      toast.success("새 사이클이 생성되었습니다.");

      // 모달 내부에서도 즉시 보이게 groupIds 추가 + 펼치기
      setLocalGroupIds((prev) => (prev.includes(nextGroupId) ? prev : [...prev, nextGroupId]));
      setOpenGroupIds((prev) => ({ ...prev, [nextGroupId]: true }));
      onChanged?.();
      void loadAll();
    } catch (err) {
      devLogger.error(err);
      toast.error("사이클 재시작에 실패했습니다.");
    } finally {
      setRestartingByGroup((prev) => ({ ...prev, [gid]: false }));
    }
  };

  const handleSaveBundleTitle = async () => {
    if (!supabase || effectiveGroupIds.length === 0) return;
    const nextTitle = titleDraft.trim();
    if (!nextTitle) return toast.error("수업명을 입력해주세요.");
    if (!confirm(`번들에 포함된 모든 사이클의 수업명을 "${nextTitle}"로 변경할까요?`)) return;
    setSavingTitle(true);
    try {
      const { error } = await supabase
        .from("sessions")
        .update({ title: nextTitle })
        .in("group_id", effectiveGroupIds);
      if (error) throw error;
      toast.success("수업명이 변경되었습니다.");
      setEditingTitle(false);
      onChanged?.();
      void loadAll();
    } catch (err) {
      devLogger.error(err);
      toast.error("수업명 변경에 실패했습니다.");
    } finally {
      setSavingTitle(false);
    }
  };

  const handleSaveBundleSessionType = async () => {
    if (!supabase || effectiveGroupIds.length === 0) return;
    const next = bundleSessionTypeDraft.trim();
    if (!next) return toast.error("수업 타입을 선택해주세요.");
    const label = SESSION_TYPE_OPTIONS.find((o) => o.value === next)?.label ?? next;
    if (
      !confirm(
        `번들에 포함된 모든 사이클(${effectiveGroupIds.length}개 group_id)의 세션에 수업 타입을 "${label}"(으)로 통일할까요?`
      )
    )
      return;
    setSavingSessionType(true);
    try {
      const { error } = await supabase
        .from("sessions")
        .update({ session_type: next })
        .in("group_id", effectiveGroupIds);
      if (error) throw error;
      toast.success("수업 타입이 반영되었습니다.");
      setBundleSessionTypesMixed(false);
      onChanged?.();
      void loadAll();
    } catch (err) {
      devLogger.error(err);
      toast.error("수업 타입 변경에 실패했습니다.");
    } finally {
      setSavingSessionType(false);
    }
  };

  const handleBulkApplyToGroup = async (gid: string) => {
    if (!supabase) return;
    const nextTeacherId = String(bulkTeacherIdByGroup[gid] || "").trim();
    const timeStr = String(bulkStartTimeByGroup[gid] || "").trim();
    const dowRaw = String(bulkDayOfWeekByGroup[gid] ?? "").trim();
    const wantsDow = dowRaw !== "" && Number.isFinite(Number(dowRaw));
    const priceStr = String(bulkPriceByGroup[gid] ?? "").trim();
    const wantsPrice = priceStr !== "" && Number.isFinite(Number(priceStr));
    const priceNum = wantsPrice ? Math.max(0, Math.floor(Number(priceStr))) : 0;

    if (!nextTeacherId && !timeStr && !wantsDow && !wantsPrice) {
      return toast.error("선생님·요일·시작 시간·수업료 중 최소 한 항목을 지정해 주세요.");
    }

    const rows = (sessionsByGroupId[gid] || []).filter(isSessionBulkTarget);
    if (rows.length === 0) {
      return toast.error(
        "변경할 수 있는 회차가 없습니다. (진행·예정(연기 제외)에 해당하는 회차가 없거나, 취소·삭제·연기·시간 완료만 있습니다.)"
      );
    }

    const parts: string[] = [];
    if (nextTeacherId) parts.push("메인 강사");
    if (wantsDow) parts.push(`요일(${DAYS.find((d) => String(d.value) === dowRaw)?.label ?? dowRaw})`);
    if (timeStr) parts.push("시작 시간");
    if (wantsPrice) parts.push(`수업료(${priceNum.toLocaleString("ko-KR")}원)`);
    if (
      !confirm(
        `진행·예정(연기 제외) 회차 ${rows.length}건만 ${parts.join("·")}을(를) 변경할까요? (보조는 메인과 겹치면 제외됩니다.)`
      )
    ) {
      return;
    }

    setBulkTeacherApplyingGid(gid);
    try {
      for (const s of rows) {
        const patch: Record<string, unknown> = {};
        if (nextTeacherId) {
          const extras = extraTeachersFromMemo(s.memo).filter((t) => t.id && t.id !== nextTeacherId);
          const memo = persistMemoExtras(s.memo, extras);
          patch.created_by = nextTeacherId;
          patch.memo = memo;
        }
        let startAt = s.start_at;
        let endAt = s.end_at;
        if (wantsDow) {
          const sh = shiftSessionToWeekday(startAt, endAt, Number(dowRaw));
          startAt = sh.start_at;
          endAt = sh.end_at;
        }
        if (timeStr) {
          const t = applyLocalTimeKeepDuration(startAt, endAt, timeStr);
          startAt = t.start_at;
          endAt = t.end_at;
        }
        if (wantsDow || timeStr) {
          patch.start_at = startAt;
          patch.end_at = endAt;
        }
        if (wantsPrice) {
          patch.price = priceNum;
        }
        const { error } = await supabase.from("sessions").update(patch).eq("id", s.id);
        if (error) throw error;
      }
      toast.success(`일괄 적용 완료: ${rows.length}건`);
      onChanged?.();
      void loadAll();
    } catch (err) {
      devLogger.error(err);
      toast.error("일괄 적용에 실패했습니다.");
    } finally {
      setBulkTeacherApplyingGid(null);
    }
  };

  const handleBulkApplyAssistToGroup = async (gid: string) => {
    if (!supabase) return;
    const assistId = String(bulkAssistTeacherIdByGroup[gid] || "").trim();
    if (!assistId) return;

    const priceStr = String(bulkAssistPriceByGroup[gid] ?? "").trim();
    const wantsPrice = priceStr !== "" && Number.isFinite(Number(priceStr));
    const priceNum = wantsPrice ? Math.max(0, Math.floor(Number(priceStr))) : 0;
    const assistTeacher = teachers.find((t) => t.id === assistId);
    const list = sessionsByGroupId[gid] || [];
    const domType = dominantSessionType(list);
    const defaultAssistPrice = resolveDefaultAssistSessionPrice(assistTeacher, domType, tierFeeMap);

    const rows = (sessionsByGroupId[gid] || []).filter(isSessionBulkTarget);
    if (rows.length === 0) {
      return toast.error(
        "변경할 수 있는 회차가 없습니다. (진행·예정(연기 제외)에 해당하는 회차가 없거나, 취소·삭제·연기·시간 완료만 있습니다.)"
      );
    }

    const assistName = teacherMap[assistId] || "보조 강사";
    const priceLabel = wantsPrice
      ? `${priceNum.toLocaleString("ko-KR")}원`
      : `${defaultAssistPrice.toLocaleString("ko-KR")}원(등급 기본)`;
    if (
      !confirm(
        `진행·예정(연기 제외) 회차 ${rows.length}건에 보조1로 「${assistName}」(${priceLabel})을(를) 일괄 지정할까요? 메인과 동일한 회차는 건너뜁니다. 선택하지 않은 보조2는 유지됩니다.`
      )
    ) {
      return;
    }

    setBulkAssistApplyingGid(gid);
    try {
      let applied = 0;
      for (const s of rows) {
        const mainId = String(s.created_by || "").trim();
        if (assistId === mainId) continue;

        const prev = extraTeachersFromMemo(s.memo);
        const assistPrice = wantsPrice ? priceNum : Number(prev[0]?.price) || defaultAssistPrice;
        const keptSecond = prev
          .filter((t) => t.id && t.id !== mainId && t.id !== assistId)
          .slice(0, 1)[0];
        const nextExtras: TeacherInput[] = [
          { id: assistId, price: assistPrice },
          ...(keptSecond ? [keptSecond] : []),
        ].slice(0, 2);

        const memo = persistMemoExtras(s.memo, nextExtras);
        const { error } = await supabase.from("sessions").update({ memo }).eq("id", s.id);
        if (error) throw error;
        applied += 1;
      }
      toast.success(`보조 일괄 적용 완료: ${applied}건`);
      onChanged?.();
      void loadAll();
    } catch (err) {
      devLogger.error(err);
      toast.error("보조 일괄 적용에 실패했습니다.");
    } finally {
      setBulkAssistApplyingGid(null);
    }
  };

  const sortedGroupIds = useMemo(() => {
    return [...effectiveGroupIds].sort((a, b) => {
      const ar = sessionsByGroupId[a] || [];
      const br = sessionsByGroupId[b] || [];
      const aMin = ar.length ? Math.min(...ar.map((s) => new Date(s.start_at).getTime())) : Number.POSITIVE_INFINITY;
      const bMin = br.length ? Math.min(...br.map((s) => new Date(s.start_at).getTime())) : Number.POSITIVE_INFINITY;
      return aMin - bMin;
    });
  }, [effectiveGroupIds, sessionsByGroupId]);

  const latestGroupId = useMemo(
    () => getLatestGroupIdWithSessions(sortedGroupIds, sessionsByGroupId),
    [sortedGroupIds, sessionsByGroupId]
  );

  const { currentGroupIds, pastGroupIds } = useMemo(() => {
    const current: string[] = [];
    const past: string[] = [];
    for (const gid of sortedGroupIds) {
      const rows = sessionsByGroupId[gid] || [];
      if (!rows.length) continue;
      if (isArchivedPastCycleGroup(rows, gid, latestGroupId)) past.push(gid);
      else current.push(gid);
    }
    return { currentGroupIds: current, pastGroupIds: past };
  }, [sortedGroupIds, sessionsByGroupId, latestGroupId]);

  const displayTitle = useMemo(() => titleDraft.trim() || bundleTitle, [titleDraft, bundleTitle]);
  const displayTypeLabel = bundleSessionTypesMixed
    ? "타입 혼재"
    : SESSION_TYPE_OPTIONS.find((o) => o.value === bundleSessionTypeDraft)?.label ??
      (bundleSessionTypeDraft || "타입");

  const renderCycleSection = (gid: string) => {
    const cycleNum = sortedGroupIds.indexOf(gid) + 1;
    const rows = sessionsByGroupId[gid] || [];
    const open = !!openGroupIds[gid];
    const label = `${formatDateRange(rows)} · ${plannedTotalOfGroup(rows)}회`;
    const cycleMainUndecided = rows
      .filter(isSessionBulkTarget)
      .some((s) => {
        const tid = String(s.created_by || "").trim();
        if (!tid) return true;
        const tname = String(teacherMap[tid] || "").trim();
        return tname === "미정";
      });
    const isSpecialLectureGroup = dominantSessionType(rows) === "special_lecture";
    const isPastCycle = isArchivedPastCycleGroup(rows, gid, latestGroupId);
    return (
      <section
        key={gid}
        title={gid}
        className={
          isPastCycle
            ? "overflow-hidden rounded-xl border border-slate-200 bg-slate-50"
            : "overflow-hidden rounded-xl border border-slate-200 bg-white"
        }
      >
                    <button
                      type="button"
                      onClick={() => toggleGroup(gid)}
                      className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-slate-50"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        {open ? <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" /> : <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />}
                        <span className="truncate text-sm font-semibold text-slate-800">
                          {cycleNum}사이클 · {label}
                        </span>
                        {isPastCycle ? (
                          <span className="shrink-0 rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                            종료
                          </span>
                        ) : null}
                      </div>
                    </button>

                    {open && (
                      <div className="space-y-3 border-t border-slate-100 px-3 py-3">
                        {isPastCycle ? (
                          <p className="text-[11px] text-slate-500">
                            종료 사이클 · 전체 회차만 조회. 일괄 적용·도구·연기·취소는 없습니다.
                          </p>
                        ) : null}
                        {!isPastCycle ? (
<div className="overflow-hidden rounded-lg border border-slate-200">
                          <button
                            type="button"
                            onClick={() =>
                              setBulkOpenByGroup((prev) => ({ ...prev, [gid]: !(prev[gid] ?? false) }))
                            }
                            className="flex w-full items-center justify-between gap-2 px-3 py-2 hover:bg-slate-50"
                          >
                            <span className="text-xs font-semibold text-slate-700">일괄 적용</span>
                            {(bulkOpenByGroup[gid] ?? false) ? (
                              <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
                            ) : (
                              <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                            )}
                          </button>
                          {(bulkOpenByGroup[gid] ?? false) ? (
                            <div className="space-y-3 border-t border-slate-100 px-3 py-3">
                          <p className="text-[11px] text-slate-500">
                            목록 필터에 보이는 진행·예정 회차에만 적용됩니다.
                            {isSpecialLectureGroup
                              ? " 특강은 보조 일괄도 가능합니다."
                              : " 보조는 회차 행에서 설정합니다."}
                          </p>
                          <div className="flex flex-col gap-3">
                            <div className="flex flex-wrap items-end gap-2">
                              <span className="w-full text-[11px] font-semibold text-slate-500">메인</span>
                              <select
                                className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold min-w-[140px]"
                                value={bulkTeacherIdByGroup[gid] ?? ""}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  setBulkTeacherIdByGroup((prev) => ({ ...prev, [gid]: v }));
                                  const teacher = teachers.find((t) => t.id === v);
                                  const list = sessionsByGroupId[gid] || [];
                                  if (teacher && list.length) {
                                    const st = dominantSessionType(list);
                                    setBulkPriceByGroup((p) => ({
                                      ...p,
                                      [gid]: String(resolveDefaultSessionPrice(teacher, st, tierFeeMap)),
                                    }));
                                  } else if (!v) {
                                    setBulkPriceByGroup((p) => ({ ...p, [gid]: "" }));
                                  }
                                }}
                              >
                                <option value="">메인 강사 선택</option>
                                {teachers.map((t) => (
                                  <option key={t.id} value={t.id}>
                                    {t.name ?? ""} T
                                  </option>
                                ))}
                              </select>
                              <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600">
                                요일
                                <select
                                  className="bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold min-w-[5.5rem]"
                                  value={bulkDayOfWeekByGroup[gid] ?? ""}
                                  onChange={(e) =>
                                    setBulkDayOfWeekByGroup((prev) => ({ ...prev, [gid]: e.target.value }))
                                  }
                                >
                                  <option value="">유지</option>
                                  {DAYS.map((d) => (
                                    <option key={d.value} value={String(d.value)}>
                                      {d.label}
                                    </option>
                                  ))}
                                </select>
                              </label>
                              <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600">
                                시작
                                <input
                                  type="time"
                                  className="bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold"
                                  value={bulkStartTimeByGroup[gid] ?? ""}
                                  onChange={(e) =>
                                    setBulkStartTimeByGroup((prev) => ({
                                      ...prev,
                                      [gid]: e.target.value,
                                    }))
                                  }
                                />
                              </label>
                              <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600">
                                수업료(원)
                                <input
                                  type="number"
                                  min={0}
                                  step={1000}
                                  className="w-[100px] bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold text-right"
                                  placeholder="등급 기본"
                                  value={bulkPriceByGroup[gid] ?? ""}
                                  onChange={(e) =>
                                    setBulkPriceByGroup((prev) => ({ ...prev, [gid]: e.target.value }))
                                  }
                                />
                              </label>
                              <button
                                type="button"
                                onClick={() => void handleBulkApplyToGroup(gid)}
                                disabled={bulkTeacherApplyingGid === gid || bulkAssistApplyingGid === gid}
                                className="h-8 rounded-md bg-slate-900 px-3 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                              >
                                {bulkTeacherApplyingGid === gid ? "적용 중..." : "메인 적용"}
                              </button>
                            </div>
                            {isSpecialLectureGroup ? (
                              <>
                                <div className="flex flex-wrap items-end gap-2">
                                  <span className="w-full text-[11px] font-semibold text-slate-500">보조</span>
                                  <select
                                    className="min-w-[140px] rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs"
                                    value={bulkAssistTeacherIdByGroup[gid] ?? ""}
                                    onChange={(e) => {
                                      const v = e.target.value;
                                      setBulkAssistTeacherIdByGroup((prev) => ({ ...prev, [gid]: v }));
                                      const teacher = teachers.find((t) => t.id === v);
                                      const list = sessionsByGroupId[gid] || [];
                                      if (teacher && list.length) {
                                        const st = dominantSessionType(list);
                                        setBulkAssistPriceByGroup((p) => ({
                                          ...p,
                                          [gid]: String(resolveDefaultAssistSessionPrice(teacher, st, tierFeeMap)),
                                        }));
                                      } else if (!v) {
                                        setBulkAssistPriceByGroup((p) => ({ ...p, [gid]: "" }));
                                      }
                                    }}
                                  >
                                    <option value="">보조 강사 선택 (비우면 미적용)</option>
                                    {teachers.map((t) => (
                                      <option key={t.id} value={t.id}>
                                        {t.name ?? ""} T
                                      </option>
                                    ))}
                                  </select>
                                  <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600">
                                    보조 수업료(원)
                                    <input
                                      type="number"
                                      min={0}
                                      step={1000}
                                      className="w-[100px] bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold text-right"
                                      placeholder="등급 기본"
                                      value={bulkAssistPriceByGroup[gid] ?? ""}
                                      onChange={(e) =>
                                        setBulkAssistPriceByGroup((prev) => ({
                                          ...prev,
                                          [gid]: e.target.value,
                                        }))
                                      }
                                    />
                                  </label>
                                  <button
                                    type="button"
                                    onClick={() => void handleBulkApplyAssistToGroup(gid)}
                                    disabled={
                                      bulkAssistApplyingGid === gid ||
                                      bulkTeacherApplyingGid === gid ||
                                      !String(bulkAssistTeacherIdByGroup[gid] || "").trim()
                                    }
                                    className="h-8 rounded-md bg-amber-500 px-3 text-xs font-semibold text-slate-900 hover:bg-amber-400 disabled:opacity-50"
                                  >
                                    {bulkAssistApplyingGid === gid ? "적용 중..." : "보조 적용"}
                                  </button>
                                </div>
                              </>
                            ) : null}
                          </div>
                            </div>
                          ) : null}
                        </div>
                        ) : null}

                        {isPastCycle ? (
                          <p className="text-[11px] text-slate-400">필터 없음 · 전체 회차</p>
                        ) : null}

<div
                          className={
                            cycleMainUndecided && !isPastCycle
                              ? "overflow-hidden rounded-lg border-2 border-red-400 bg-red-50/50"
                              : "overflow-hidden rounded-lg border border-slate-200"
                          }
                        >
                          <table className="w-full table-fixed text-xs">
                            <colgroup>
                              <col className="w-[40px]" />
                              <col className="w-[118px]" />
                              <col className="w-[168px]" />
                              <col className="w-[40px]" />
                              <col className="w-[40px]" />
                              <col className="w-[64px]" />
                            </colgroup>
                            <thead className="border-b border-slate-100 bg-slate-50 text-[11px] font-medium text-slate-500">
                              <tr>
                                <th className="px-2 py-1.5 text-left">회차</th>
                                <th className="px-2 py-1.5 text-left">일정</th>
                                <th className="px-2 py-1.5 text-left">강사</th>
                                <th className="px-2 py-1.5 text-center">마일</th>
                                <th className="px-2 py-1.5 text-center">상태</th>
                                <th className="px-2 py-1.5 text-center">관리</th>
                              </tr>
                            </thead>
                            <tbody>
                              {rows
                                .filter((r) => {
                                  if (r.status === "deleted") return false;
                                  const view = isPastCycle ? "all" : roundView;
                                  if (r.status === "cancelled") return view === "all";
                                  if (view === "all") return true;
                                  const s = getTimeStatusLabel(r);
                                  if (view === "completed") {
                                    return r.status === "postponed" || s.isCompletedByTime;
                                  }
                                  if (r.status === "postponed") return false;
                                  return !s.isCompletedByTime;
                                })
                                .map((r, i) => {
                                  const start = new Date(r.start_at);
                                  const savedDateStr = toDateInputValueLocal(start);
                                  const savedTimeStr = start.toTimeString().slice(0, 5);
                                  const scheduleDraft = scheduleDraftBySessionId[r.id];
                                  const dateStr = scheduleDraft?.dateStr ?? savedDateStr;
                                  const timeStr = scheduleDraft?.timeStr ?? savedTimeStr;
                                  const scheduleDirty =
                                    !!scheduleDraft &&
                                    isSessionScheduleDraftDirty(
                                      scheduleDraft,
                                      savedDateStr,
                                      savedTimeStr
                                    );
                                  const total = plannedTotalOfGroup(rows);
                                  const n = Math.min(r.round_index ?? i + 1, total);
                                  const s = getTimeStatusLabel(r);
                                  const assistList = extraTeachersFromMemo(r.memo);
                                  return (
                                    <tr key={r.id} className="border-t border-slate-100 align-top">
                                      <td className="px-2 py-2 font-semibold text-slate-700">{n}/{total}</td>
                                      <td className="px-2 py-2">
                                        <div className="flex flex-col gap-1">
                                          <input
                                          type="date"
                                          className="w-full max-w-full rounded-md border border-slate-200 px-1 py-1 text-[11px]"
                                          value={dateStr}
                                          onChange={(e) => {
                                            setScheduleDraftBySessionId((prev) => ({
                                              ...prev,
                                              [r.id]: mergeSessionScheduleDraft(
                                                prev[r.id],
                                                savedDateStr,
                                                savedTimeStr,
                                                { dateStr: e.target.value }
                                              ),
                                            }));
                                          }}
                                        />
                                          <input
                                            type="time"
                                            className="w-full max-w-full rounded-md border border-slate-200 px-1 py-1 text-[11px]"
                                            value={timeStr}
                                            onChange={(e) => {
                                              setScheduleDraftBySessionId((prev) => ({
                                                ...prev,
                                                [r.id]: mergeSessionScheduleDraft(
                                                  prev[r.id],
                                                  savedDateStr,
                                                  savedTimeStr,
                                                  { timeStr: e.target.value }
                                                ),
                                              }));
                                            }}
                                          />
                                          {scheduleDirty ? (
                                          <button
                                            type="button"
                                            disabled={savingSessionScheduleId === r.id}
                                            onClick={() => void saveSessionSchedule(gid, r)}
                                            className="rounded-md bg-blue-600 px-1.5 py-1 text-[10px] font-semibold text-white hover:bg-blue-700 disabled:opacity-40"
                                          >
                                            {savingSessionScheduleId === r.id
                                              ? "저장 중…"
                                              : "저장"}
                                          </button>
                                          ) : null}
                                        </div>
                                      </td>
                                      <td className="min-w-0 overflow-hidden px-1.5 py-1.5">
                                        <div className="flex min-w-0 flex-col gap-1">
                                          <div className="flex min-w-0 items-center gap-1">
                                            <select
                                              className="min-w-0 flex-1 rounded-md border border-slate-200 bg-white px-1.5 py-1 text-[11px] text-slate-800"
                                              value={r.created_by ?? ""}
                                              onChange={(e) => void applyMainTeacher(gid, r, e.target.value)}
                                            >
                                              <option value="" disabled>강사 선택</option>
                                              {teachers.map((t) => (
                                                <option key={t.id} value={t.id}>{t.name}</option>
                                              ))}
                                            </select>
                                            <input
                                              key={`price-${r.id}-${r.price ?? 0}`}
                                              type="number"
                                              className="w-[64px] shrink-0 rounded-md border border-slate-200 bg-white px-1 py-1 text-right text-[11px] text-slate-800"
                                              placeholder="수업료"
                                              defaultValue={Number(r.price) || 0}
                                              onBlur={(e) => void applyInlineUpdate(gid, r.id, { price: Number(e.target.value) || 0 })}
                                            />
                                          </div>
                                          {assistList.map((ex, aidx) => (
                                            <div key={aidx} className="flex min-w-0 items-center gap-1">
                                              <select
                                                className="min-w-0 flex-1 rounded-md border border-slate-200 bg-white px-1.5 py-1 text-[11px] text-slate-600"
                                                value={ex.id}
                                                onChange={(e) => void setAssistIdAt(gid, r, aidx, e.target.value)}
                                              >
                                                <option value="">보조 강사</option>
                                                {teachers.map((t) => (
                                                  <option key={t.id} value={t.id}>{t.name}</option>
                                                ))}
                                              </select>
                                              <input
                                                key={`assist-price-${r.id}-${aidx}-${ex.price ?? 0}`}
                                                type="number"
                                                className="w-[64px] shrink-0 rounded-md border border-slate-200 bg-white px-1 py-1 text-right text-[11px] text-slate-600"
                                                placeholder="수업료"
                                                defaultValue={Number(ex.price) || 0}
                                                onBlur={(e) => void setAssistPriceAt(gid, r, aidx, Number(e.target.value) || 0)}
                                              />
                                              <button
                                                type="button"
                                                title="보조 제거"
                                                className="shrink-0 rounded p-1 text-slate-300 hover:bg-rose-50 hover:text-rose-500"
                                                onClick={() => void removeAssistRow(gid, r, aidx)}
                                              >
                                                <Minus size={12} strokeWidth={2.5} />
                                              </button>
                                            </div>
                                          ))}
                                          {assistList.length < 2 && (
                                            <button
                                              type="button"
                                              className="flex w-fit items-center gap-0.5 text-[10px] font-medium text-slate-500 hover:text-slate-800"
                                              onClick={() => void addAssistRow(gid, r)}
                                            >
                                              <Plus size={11} strokeWidth={2.5} />
                                              보조
                                            </button>
                                          )}
                                        </div>
                                      </td>
                                      <td className="px-1 py-2 text-center">
                                        <button
                                          type="button"
                                          className="rounded-md px-1.5 py-1 text-[10px] font-semibold text-amber-800 hover:bg-amber-50"
                                          onClick={() => setMileageModal({ gid, row: r })}
                                        >
                                          설정
                                        </button>
                                      </td>
                                      <td className="px-2 py-2 text-center">
                                        <span
                                          className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-semibold ${statusBadgeClass(s.label)}`}
                                        >
                                          {s.label}
                                        </span>
                                      </td>
                                      <td className="px-1 py-2 text-center">
                                        {isPastCycle ||
                                        r.status === "cancelled" ||
                                        r.status === "deleted" ? null : (
                                          <div className="mx-auto flex max-w-[92px] flex-col items-stretch gap-1">
                                            {r.status === "postponed" ? (
                                              <button
                                                type="button"
                                                className="rounded-md bg-violet-600 px-1.5 py-1 text-[10px] font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
                                                disabled={undoingPostponeSessionId === r.id}
                                                onClick={() => void handleUndoPostpone(r.id)}
                                              >
                                                {undoingPostponeSessionId === r.id ? "복구 중..." : "연기 취소"}
                                              </button>
                                            ) : (
                                              <>
                                                <button
                                                  type="button"
                                                  className="rounded-md border border-violet-200 bg-violet-50 px-1.5 py-1 text-[10px] font-semibold text-violet-800 hover:bg-violet-100 disabled:opacity-50"
                                                  disabled={postponingSessionId === r.id}
                                                  onClick={() => void handlePostpone(gid, r.id, "postpone")}
                                                >
                                                  {postponingSessionId === r.id ? "처리 중..." : "연기"}
                                                </button>
                                                <button
                                                  type="button"
                                                  className="rounded-md border border-indigo-200 bg-indigo-50 px-1.5 py-1 text-[10px] font-semibold text-indigo-800 hover:bg-indigo-100 disabled:opacity-50"
                                                  disabled={postponingSessionId === r.id}
                                                  onClick={() => void handlePostpone(gid, r.id, "postpone_request")}
                                                >
                                                  {postponingSessionId === r.id ? "처리 중..." : "연기요청"}
                                                </button>
                                              </>
                                            )}
                                            <button
                                              type="button"
                                              className="rounded-md border border-rose-200 bg-rose-50 px-1.5 py-1 text-[10px] font-semibold text-rose-800 hover:bg-rose-100 disabled:opacity-50"
                                              disabled={deletingSessionId === r.id}
                                              onClick={() => void handleDeleteSession(gid, r.id)}
                                            >
                                              {deletingSessionId === r.id ? "차감 중..." : "회차 취소"}
                                            </button>
                                          </div>
                                        )}
                                      </td>
                                    </tr>
                                  );
                                })}
                            </tbody>
                          </table>
                        </div>

                        {!isPastCycle ? (
<div className="overflow-hidden rounded-lg border border-slate-200">
                          <button
                            type="button"
                            onClick={() =>
                              setCycleToolsOpenByGroup((prev) => ({
                                ...prev,
                                [gid]: !prev[gid],
                              }))
                            }
                            className="flex w-full items-center justify-between gap-2 px-3 py-2 hover:bg-slate-50"
                          >
                            <span className="text-xs font-semibold text-slate-700">도구</span>
                            {cycleToolsOpenByGroup[gid] ? (
                              <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
                            ) : (
                              <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                            )}
                          </button>
                          {cycleToolsOpenByGroup[gid] ? (
                            <div className="space-y-4 border-t border-slate-100 px-3 py-3">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[11px] font-semibold text-slate-500">회차 번호</span>
<button
                              type="button"
                              className={`rounded-md border px-2.5 py-1.5 text-[11px] font-semibold ${
                                reindexingByGroup[gid]
                                  ? "cursor-not-allowed border-slate-100 bg-slate-50 text-slate-300"
                                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                              }`}
                              disabled={!!reindexingByGroup[gid]}
                              onClick={() => void handleReindexRounds(gid)}
                            >
                              {reindexingByGroup[gid] ? "정렬 중..." : "날짜순 재정렬"}
                            </button>
                              </div>
<div className="space-y-2">
                            <p className="text-[11px] font-semibold text-slate-500">확장</p>
                            <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  min={1}
                                  className="w-16 rounded-md border border-slate-200 px-2 py-1 text-sm"
                                  value={extendCountByGroup[gid] ?? 1}
                                  onChange={(e) =>
                                    setExtendCountByGroup((prev) => ({
                                      ...prev,
                                      [gid]: Number(e.target.value) || 1,
                                    }))
                                  }
                                />
                                <span className="text-xs text-slate-600">회</span>
                                <button
                                  type="button"
                                  className="ml-auto rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
                                  onClick={() => {
                                    const n = Math.max(1, Math.floor(extendCountByGroup[gid] ?? 1));
                                    if (!confirm(`${n}회차를 추가하시겠습니까?`)) return;
                                    void handleExtend(gid, n);
                                  }}
                                >
                                  추가
                                </button>
                              </div>
                        </div>

                        <div className="space-y-2">
                            <p className="text-[11px] font-semibold text-slate-500">축소</p>
                              <p className="text-[11px] text-slate-500">
                                마지막 N회를 삭제 처리하고 회차를 다시 매깁니다. 기본 목록에서는 숨겨집니다.
                              </p>
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  min={1}
                                  className="w-16 rounded-md border border-slate-200 px-2 py-1 text-sm"
                                  value={shrinkCountByGroup[gid] ?? 1}
                                  onChange={(e) =>
                                    setShrinkCountByGroup((prev) => ({
                                      ...prev,
                                      [gid]: Number(e.target.value) || 1,
                                    }))
                                  }
                                />
                                <span className="text-xs text-slate-600">회</span>
                                <button
                                  type="button"
                                  className="ml-auto rounded-md bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
                                  disabled={!!shrinkingByGroup[gid]}
                                  onClick={() => void handleShrinkTail(gid)}
                                >
                                  {shrinkingByGroup[gid] ? "처리 중..." : "마지막 삭제"}
                                </button>
                              </div>
                        </div>

                        <div className="space-y-2">
                            <p className="text-[11px] font-semibold text-slate-500">사이클 재시작</p>
                          <p className="text-[11px] text-slate-500">
                            기존 사이클은 두고 새 그룹으로 예정 회차를 만듭니다.
                          </p>
                          <div className="flex flex-wrap items-center gap-2">
                            <label className="text-[11px] text-slate-600">회차</label>
                            <input
                              type="number"
                              min={1}
                              className="w-16 rounded-md border border-slate-200 px-2 py-1 text-sm"
                              value={restartCountByGroup[gid] ?? RESTART_CYCLE_ROUNDS}
                              onChange={(e) =>
                                setRestartCountByGroup((prev) => ({
                                  ...prev,
                                  [gid]: Number(e.target.value) || RESTART_CYCLE_ROUNDS,
                                }))
                              }
                            />
                            <label className="text-[11px] text-slate-600">패턴</label>
                            <select
                              className="rounded-md border border-slate-200 px-2 py-1 text-sm"
                              value={restartWeeklyFrequencyByGroup[gid] ?? 1}
                              onChange={(e) =>
                                setRestartWeeklyFrequencyByGroup((prev) => ({
                                  ...prev,
                                  [gid]: Number(e.target.value) === 2 ? 2 : 1,
                                }))
                              }
                            >
                              <option value={1}>주 1회</option>
                              <option value={2}>주 2회</option>
                            </select>
                            {(restartWeeklyFrequencyByGroup[gid] ?? 1) === 1 && (
                              <>
                                <label className="text-[11px] text-slate-600">간격(일)</label>
                                <input
                                  type="number"
                                  min={1}
                                  className="w-16 rounded-md border border-slate-200 px-2 py-1 text-sm"
                                  value={restartIntervalDaysByGroup[gid] ?? 7}
                                  onChange={(e) =>
                                    setRestartIntervalDaysByGroup((prev) => ({
                                      ...prev,
                                      [gid]: Number(e.target.value) || 7,
                                    }))
                                  }
                                />
                              </>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <label className="text-[11px] text-slate-600">시작일</label>
                            <input
                              type="date"
                              className="rounded-md border border-slate-200 px-2 py-1 text-sm"
                              value={restartStartDateByGroup[gid] ?? toDateInputValueLocal(new Date())}
                              onChange={(e) =>
                                setRestartStartDateByGroup((prev) => ({ ...prev, [gid]: e.target.value }))
                              }
                            />
                            <label className="text-[11px] text-slate-600">시간</label>
                            <input
                              type="time"
                              className="rounded-md border border-slate-200 px-2 py-1 text-sm"
                              value={restartStartTimeByGroup[gid] ?? "10:00"}
                              onChange={(e) =>
                                setRestartStartTimeByGroup((prev) => ({ ...prev, [gid]: e.target.value }))
                              }
                            />
                          </div>

                          {(restartWeeklyFrequencyByGroup[gid] ?? 1) === 2 && (
                            <div className="flex flex-wrap items-center gap-1.5">
                              {DAYS.map((d) => {
                                const baseDay = new Date(
                                  `${restartStartDateByGroup[gid] ?? toDateInputValueLocal(new Date())}T${
                                    restartStartTimeByGroup[gid] ?? "10:00"
                                  }`
                                ).getDay();
                                const isBase = d.value === baseDay;
                                const selected = restartDaysOfWeekByGroup[gid] ?? [baseDay];
                                const isSelected = selected.includes(d.value);
                                return (
                                  <button
                                    key={d.value}
                                    type="button"
                                    disabled={isBase}
                                    onClick={() => {
                                      if (isBase) return;
                                      setRestartDaysOfWeekByGroup((prev) => {
                                        const cur = prev[gid] ?? [baseDay];
                                        const next = cur.includes(d.value)
                                          ? cur.filter((x) => x !== d.value)
                                          : [...cur, d.value].sort((a, b) => a - b);
                                        return { ...prev, [gid]: next.length ? next : [baseDay] };
                                      });
                                    }}
                                    className={`rounded-md border px-2.5 py-1 text-xs font-semibold ${
                                      isBase
                                        ? "cursor-not-allowed border-blue-600 bg-blue-600 text-white"
                                        : isSelected
                                          ? "border-slate-900 bg-slate-900 text-white"
                                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                                    }`}
                                  >
                                    {d.label}
                                  </button>
                                );
                              })}
                            </div>
                          )}

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              className="ml-auto rounded-md bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                              disabled={!!restartingByGroup[gid]}
                              onClick={() => void handleRestartCycle(gid)}
                            >
                              {restartingByGroup[gid] ? "생성 중..." : "재시작"}
                            </button>
                          </div>
                        </div>
                            </div>
                          ) : null}
                        </div>
                        ) : null}

                      </div>
                    )}
                  </section>
    );
  };

  return (
    <div className={`fixed inset-0 z-[400] transition ${visible ? "pointer-events-auto" : "pointer-events-none"}`}>
      <div
        className={`absolute inset-0 bg-black/30 transition-opacity ${visible ? "opacity-100" : "opacity-0"}`}
        onClick={onClose}
      />
      <aside
        className={`absolute right-0 top-0 h-full w-full max-w-2xl bg-white shadow-2xl border-l border-slate-100 flex flex-col transition-transform ${
          visible ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 px-4 py-3 sm:px-5">
          <div className="min-w-0 flex-1 space-y-2">
            {!editingTitle ? (
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="truncate text-base font-semibold text-slate-900">{displayTitle}</h2>
                  <span className="text-xs text-slate-400">{groupIds.length}사이클</span>
                  <button
                    type="button"
                    onClick={() => setEditingTitle(true)}
                    className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-800 hover:bg-slate-50"
                  >
                    <Pencil className="h-3 w-3" />
                    이름 수정
                  </button>
                  <button
                    type="button"
                    onClick={() => setSessionTypePanelOpen((o) => !o)}
                    className={`inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-semibold ${
                      sessionTypePanelOpen
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-200 bg-white text-slate-800 hover:bg-slate-50"
                    }`}
                  >
                    {displayTypeLabel}
                  </button>
                </div>
                {sessionTypePanelOpen ? (
                  <div className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2 sm:flex-row sm:flex-wrap sm:items-center">
                    <select
                      className="min-w-[180px] flex-1 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-800"
                      value={bundleSessionTypeDraft}
                      onChange={(e) => setBundleSessionTypeDraft(e.target.value)}
                    >
                      {SESSION_TYPE_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                      {!SESSION_TYPE_OPTIONS.some((o) => o.value === bundleSessionTypeDraft) &&
                      bundleSessionTypeDraft ? (
                        <option value={bundleSessionTypeDraft}>{bundleSessionTypeDraft} (현재 DB)</option>
                      ) : null}
                    </select>
                    <button
                      type="button"
                      disabled={savingSessionType || effectiveGroupIds.length === 0}
                      onClick={() => void handleSaveBundleSessionType()}
                      className="shrink-0 rounded-md bg-slate-900 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                    >
                      {savingSessionType ? "저장 중..." : "적용"}
                    </button>
                    {bundleSessionTypesMixed ? (
                      <p className="w-full text-[11px] text-amber-800">
                        세션 타입이 섞여 있습니다. 적용하면 번들 전체가 통일됩니다.
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <input
                  className="w-full min-w-0 rounded-md border border-slate-200 px-3 py-2 text-sm"
                  value={titleDraft}
                  onChange={(e) => setTitleDraft(e.target.value)}
                  placeholder="수업명을 입력하세요"
                />
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    disabled={!titleDraft.trim() || savingTitle}
                    onClick={() => void handleSaveBundleTitle()}
                    className="rounded-md bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {savingTitle ? "저장 중..." : "저장"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingTitle(false);
                      void loadAll();
                    }}
                    className="rounded-md px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100"
                  >
                    취소
                  </button>
                </div>
              </div>
            )}
          </div>
          <button type="button" onClick={onClose} className="shrink-0 rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <X className="h-5 w-5" />
          </button>
        </header>


          <div className="min-h-0 flex-1 space-y-3 overflow-auto p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-end gap-2">
                  <select
                    className="min-w-[10rem] rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700"
                    value={roundView}
                    onChange={(e) => setRoundView(e.target.value as RoundView)}
                  >
                    <optgroup label="예정">
                      <option value="active">진행·예정 (연기 제외)</option>
                    </optgroup>
                    <optgroup label="전체">
                      <option value="all">모든 회차</option>
                    </optgroup>
                    <optgroup label="연기 및 완료">
                      <option value="completed">연기·시간 완료</option>
                    </optgroup>
                  </select>
            </div>

            {loading ? (
              <div className="flex items-center justify-center h-40 text-slate-400 text-sm font-bold">불러오는 중...</div>
            ) : effectiveGroupIds.length === 0 ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-6 text-sm font-bold text-amber-900">
                이 번들에 연결된 <span className="font-black">group_id</span>가 없습니다. 세션에 그룹이 지정돼 있는지
                확인해 주세요.
              </div>
            ) : Object.keys(sessionsByGroupId).length === 0 ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-6 text-sm font-bold text-rose-900">
                회차를 불러오지 못했습니다. 같은 그룹의 세션이 삭제됐거나, 조회 권한·필터를 확인해 주세요.
              </div>
            ) : (
              <div className="space-y-3">
                {currentGroupIds.map((gid) => renderCycleSection(gid))}
                {pastGroupIds.length > 0 && (
                  <section className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                    <button
                      type="button"
                      onClick={() => setPastArchiveOpen((o) => !o)}
                      className="flex w-full items-center justify-between gap-2 px-3 py-2.5 hover:bg-slate-100"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        {pastArchiveOpen ? (
                          <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
                        ) : (
                          <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                        )}
                        <span className="truncate text-sm font-semibold text-slate-700">
                          지난 사이클 {pastGroupIds.length}
                        </span>
                      </div>
                    </button>
                    {pastArchiveOpen && (
                      <div className="p-3 space-y-3 border-t border-slate-200">
                        {pastGroupIds.map((gid) => renderCycleSection(gid))}
                      </div>
                    )}
                  </section>
                )}
              </div>
            )}
          </div>
        </aside>

      <SessionMileageModal
        open={!!mileageModal}
        onClose={() => setMileageModal(null)}
        sessionId={mileageModal?.row.id ?? ""}
        sessionStartAt={mileageModal?.row.start_at ?? null}
        title={mileageModal?.row.title ?? null}
        memo={mileageModal?.row.memo}
        mileage_option={mileageModal?.row.mileage_option}
        created_by={mileageModal?.row.created_by ?? null}
        onSaved={() => {
          onChanged?.();
          void loadAll();
        }}
      />
    </div>
  );
}
