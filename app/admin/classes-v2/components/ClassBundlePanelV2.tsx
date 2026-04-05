"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Minus, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { getSupabaseBrowserClient } from "@/app/lib/supabase/browser";
import { devLogger } from "@/app/lib/logging/devLogger";
import { postponeCascade } from "@/app/admin/classes-shared/lib/postponeUtils";
import { undoPostponeCascade } from "@/app/admin/classes-shared/lib/postponeUtils";
import { extendClass } from "@/app/admin/classes-shared/lib/roundExtendUtils";
import { parseExtraTeachers, buildMemoWithExtras } from "@/app/admin/classes-shared/lib/sessionUtils";
import { resolvePlannedTotal } from "@/app/admin/classes-v2/lib/plannedRoundTotal";
import { SESSION_TYPE_OPTIONS } from "@/app/admin/classes-v2/lib/sessionTypeCategory";
import SessionMileageModal from "./SessionMileageModal";
import type { TeacherInput } from "@/app/admin/classes-shared/types";

type RoundView = "active" | "all" | "completed";

type Props = {
  visible: boolean;
  bundleTitle: string;
  groupIds: string[];
  onClose: () => void;
  onChanged?: () => void;
};

type Teacher = { id: string; name: string };

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

/** 번들 병합 시 메인 사이클의 대표 session_type (빈도 우선, 동률이면 one_day가 아닌 타입 우선) */
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

/** DB에 남은 one_day_*를 regular_*로 바꿔 캘린더·다른 화면에서 개인=초록으로 일관되게 보이게 함 */
function normalizeMergedSessionType(t: string): string {
  if (t.includes("one_day_private")) return "regular_private";
  if (t.includes("one_day_center")) return "regular_center";
  if (t === "one_day") return "regular_private";
  return t;
}

/**
 * 회차 합치기 시 타입 결정: 메인 그룹만 보면 원데이만 남아 regular_private가 누락될 수 있어
 * 번들(합칠 모든 그룹) 활성 세션을 기준으로 한다. regular_*가 하나라도 있으면 그쪽으로 통일.
 */
function resolveMergedBundleSessionType(rows: SessionRow[]): string | null {
  const active = rows.filter(
    (r) => r.status !== "postponed" && r.status !== "cancelled" && r.status !== "deleted"
  );
  const types = active
    .map((r) => r.session_type)
    .filter((t): t is string => typeof t === "string" && t.length > 0);
  if (types.includes("regular_private")) return "regular_private";
  if (types.includes("regular_center")) return "regular_center";
  return resolveMainSessionTypeFromRows(rows);
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

/** 일괄 적용 대상: 취소/삭제 제외, 시간상 완료 제외 */
function isSessionBulkTarget(row: { start_at: string; end_at: string; status: string | null }) {
  if (row.status === "cancelled" || row.status === "deleted") return false;
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

/** 마지막 회차일이 오늘 0시 이전이면 지난 사이클(완료)로 묶음 */
function isPastCycleGroup(list: SessionRow[]): boolean {
  const bounds = getCycleCalendarBounds(list);
  if (!bounds) return false;
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  return bounds.endDayMs < startOfToday.getTime();
}

type ToolPanelKey = "extend" | "shrink" | "restart";

export default function ClassBundlePanelV2({ visible, bundleTitle, groupIds, onClose, onChanged }: Props) {
  const [supabase] = useState(() =>
    typeof window !== "undefined" ? getSupabaseBrowserClient() : null
  );

  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const teacherMap = useMemo(() => {
    const map: Record<string, string> = {};
    teachers.forEach((t) => (map[t.id] = t.name));
    return map;
  }, [teachers]);

  const [loading, setLoading] = useState(false);
  const [roundView, setRoundView] = useState<RoundView>("active");
  const [openGroupIds, setOpenGroupIds] = useState<Record<string, boolean>>({});
  const [pastArchiveOpen, setPastArchiveOpen] = useState(false);
  const [sessionsByGroupId, setSessionsByGroupId] = useState<Record<string, SessionRow[]>>({});
  const [localGroupIds, setLocalGroupIds] = useState<string[]>([]);
  const [mergingByBundle, setMergingByBundle] = useState(false);
  const [undoingPostponeSessionId, setUndoingPostponeSessionId] = useState<string | null>(null);
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
  const [bulkTeacherApplyingGid, setBulkTeacherApplyingGid] = useState<string | null>(null);

  const [bundleTab, setBundleTab] = useState<"rounds" | "info">("rounds");
  const [infoAddress, setInfoAddress] = useState("");
  const [infoPhone, setInfoPhone] = useState("");
  const [infoChild, setInfoChild] = useState("");
  const [infoTuitionPaid, setInfoTuitionPaid] = useState(false);
  const [infoNotes, setInfoNotes] = useState("");
  const [infoLoading, setInfoLoading] = useState(false);
  const [infoSaving, setInfoSaving] = useState(false);

  const [sessionTypePanelOpen, setSessionTypePanelOpen] = useState(false);
  const [bundleSessionTypeDraft, setBundleSessionTypeDraft] = useState("regular_private");
  const [bundleSessionTypesMixed, setBundleSessionTypesMixed] = useState(false);
  const [savingSessionType, setSavingSessionType] = useState(false);

  /** 회차 확장 / 축소 / 재시작 블록 접기(기본 접힘) */
  const [toolPanelOpenByGroup, setToolPanelOpenByGroup] = useState<
    Record<string, Partial<Record<ToolPanelKey, boolean>>>
  >({});

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
    if (!visible) {
      setBundleTab("rounds");
    }
  }, [visible]);

  useEffect(() => {
    if (!visible || bundleTab !== "info" || !bundleKey) return;
    let cancelled = false;
    (async () => {
      setInfoLoading(true);
      try {
        const res = await fetch(
          `/api/admin/class-bundle-info?bundleKey=${encodeURIComponent(bundleKey)}`,
          { credentials: "include" }
        );
        const data = (await res.json()) as {
          error?: string;
          info?: {
            address: string | null;
            phone: string | null;
            childInfo: string | null;
            tuitionPaid: boolean;
            notes: string | null;
          } | null;
        };
        if (cancelled) return;
        if (!res.ok) throw new Error(data.error || "불러오기 실패");
        const inf = data.info;
        if (inf) {
          setInfoAddress(inf.address ?? "");
          setInfoPhone(inf.phone ?? "");
          setInfoChild(inf.childInfo ?? "");
          setInfoTuitionPaid(!!inf.tuitionPaid);
          setInfoNotes(inf.notes ?? "");
        } else {
          setInfoAddress("");
          setInfoPhone("");
          setInfoChild("");
          setInfoTuitionPaid(false);
          setInfoNotes("");
        }
      } catch (err) {
        devLogger.error(err);
        toast.error("수업 정보를 불러오지 못했습니다. (class_bundle_info 테이블·API 확인)");
      } finally {
        if (!cancelled) setInfoLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [visible, bundleTab, bundleKey]);

  const handleSaveBundleInfo = useCallback(async () => {
    if (!bundleKey) return;
    setInfoSaving(true);
    try {
      const res = await fetch("/api/admin/class-bundle-info", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          bundleKey,
          address: infoAddress.trim() || null,
          phone: infoPhone.trim() || null,
          childInfo: infoChild.trim() || null,
          tuitionPaid: infoTuitionPaid,
          notes: infoNotes.trim() || null,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || "저장 실패");
      toast.success("수업 정보가 저장되었습니다.");
    } catch (err) {
      devLogger.error(err);
      toast.error(err instanceof Error ? err.message : "저장에 실패했습니다.");
    } finally {
      setInfoSaving(false);
    }
  }, [bundleKey, infoAddress, infoPhone, infoChild, infoTuitionPaid, infoNotes]);

  const loadTeachers = useCallback(async () => {
    if (!supabase) return;
    try {
      const { data, error } = await supabase
        .from("users")
        .select("id, name")
        .eq("is_active", true)
        .order("name", { ascending: true });
      if (error) throw error;
      setTeachers((data || []) as Teacher[]);
    } catch (err) {
      devLogger.error(err);
    }
  }, [supabase]);

  const loadAll = useCallback(async () => {
    if (!supabase) return;
    if (!visible) return;
    if (effectiveGroupIds.length === 0) {
      setSessionsByGroupId({});
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("sessions")
        .select(
          "id, group_id, title, start_at, end_at, status, created_by, price, round_index, round_total, sequence_number, session_type, memo, mileage_option"
        )
        .in("group_id", effectiveGroupIds)
        .order("start_at", { ascending: true });
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
      const hasActiveRound = nonDeleted.some((r) => {
        if (r.status === "cancelled") return false;
        return getTimeStatusLabel(r).isActiveByTime;
      });
      if (!hasActiveRound && nonDeleted.length > 0) {
        setRoundView((prev) => (prev === "active" ? "all" : prev));
      }

      const bundleRows = effectiveGroupIds.flatMap((gid) => map[gid] || []);
      const resolvedType =
        resolveMergedBundleSessionType(bundleRows) ??
        resolveMainSessionTypeFromRows(bundleRows) ??
        "regular_private";
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

      setBulkTeacherIdByGroup((prev) => {
        const next = { ...prev };
        for (const gid of effectiveGroupIds) {
          const list = map[gid] || [];
          if (next[gid] == null) {
            next[gid] = list.find((s) => s.created_by)?.created_by ?? "";
          }
        }
        return next;
      });

      // 기본 오픈: 예정/진행 사이클만 펼침. 지난 사이클(완료)은 접어 둠.
      // 단, 진행·예정 사이클이 하나도 없으면(전부 지난 사이클) 아카이브+각 사이클을 펼쳐 회차 확장·재시작 등이 보이게 함.
      const nextOpen: Record<string, boolean> = {};
      for (const gid of effectiveGroupIds) {
        const list = map[gid] || [];
        if (list.length === 0) continue;
        nextOpen[gid] = !isPastCycleGroup(list);
      }
      const hasCurrentCycle = effectiveGroupIds.some((gid) => {
        const list = map[gid] || [];
        return list.length > 0 && !isPastCycleGroup(list);
      });
      const hasAnySessions = effectiveGroupIds.some((gid) => (map[gid] || []).length > 0);
      if (hasAnySessions && !hasCurrentCycle) {
        for (const gid of effectiveGroupIds) {
          const list = map[gid] || [];
          if (list.length > 0) nextOpen[gid] = true;
        }
        setPastArchiveOpen(true);
        setToolPanelOpenByGroup((prev) => {
          const next = { ...prev };
          for (const gid of effectiveGroupIds) {
            if ((map[gid] || []).length === 0) continue;
            next[gid] = { ...next[gid], extend: true };
          }
          return next;
        });
      } else {
        setPastArchiveOpen(false);
      }
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
        for (const gid of effectiveGroupIds) {
          if (next[gid] == null) next[gid] = (map[gid] || []).length || 1;
        }
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
    if (!visible) return;
    void loadTeachers();
  }, [visible, loadTeachers]);

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
    }
  }, [visible]);

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

  const handlePostpone = async (gid: string, sessionId: string) => {
    if (!supabase) return;
    if (!confirm("1주일씩 미루시겠습니까?")) return;
    await postponeCascade(supabase, sessionId, {
      onAfter: () => {
        void loadAll();
        onChanged?.();
      },
    });
  };

  // postponed 상태였던 회차를 원래 슬롯 기준으로 복구합니다.
  const handleUndoPostpone = async (sessionId: string) => {
    if (!supabase) return;
    if (!sessionId) return;
    if (undoingPostponeSessionId === sessionId) return;
    if (!confirm("복구하시겠습니까?")) return;

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
      const sorted = active;
      const total = sorted.length;
      await Promise.all(
        sorted.map((row, i) => {
          return supabase
            .from("sessions")
            .update({
              round_index: i + 1,
              round_total: total,
              sequence_number: i + 1,
              round_display: `${i + 1}/${total}`,
            })
            .eq("id", row.id);
        })
      );
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
    if (!confirm("해당 회차를 DB에서 영구 삭제할까요?")) return;

    setDeletingSessionId(sessionId);
    try {
      const { error: delErr } = await supabase.from("sessions").delete().eq("id", sessionId);
      if (delErr) throw delErr;
      // 재정렬 없이 삭제만 — 재정렬 시 cancelled 제외 active 수로 round_total이 줄어
      // 7·8회차가 5·6회차로 바뀌어 사라져 보이는 문제 방지.
      toast.success("회차가 삭제되었습니다.");
      await loadAll();
      onChanged?.();
    } catch (err) {
      devLogger.error(err);
      toast.error("회차 삭제에 실패했습니다.");
    } finally {
      setDeletingSessionId(null);
    }
  };

  // 1+7회차처럼 group_id가 2개로 분리된 경우, 메인(총회차가 가장 큰) group_id로 합쳐서 1개의 회차로 보이게 합니다.
  const handleMergeCycleRounds = async () => {
    if (!supabase) return;
    if (mergingByBundle) return;

    const gids = effectiveGroupIds.filter((gid) => (sessionsByGroupId[gid] || []).length > 0);
    if (gids.length <= 1) return;

    // 메인 = plannedTotalOfGroup이 가장 큰 사이클(동률이면 시작이 더 이른 사이클)
    const score = (gid: string) => plannedTotalOfGroup(sessionsByGroupId[gid] || []);
    const minStart = (gid: string) => {
      const rows = sessionsByGroupId[gid] || [];
      const times = rows.map((r) => new Date(r.start_at).getTime());
      return times.length ? Math.min(...times) : Number.POSITIVE_INFINITY;
    };

    const maxTotal = Math.max(...gids.map((g) => score(g)));
    const mainCandidates = gids.filter((g) => score(g) === maxTotal);
    const mainGid =
      mainCandidates.sort((a, b) => minStart(a) - minStart(b))[0] ?? gids[0] ?? "";
    if (!mainGid) return;

    const otherGids = gids.filter((g) => g !== mainGid);
    if (otherGids.length === 0) return;

    if (
      !confirm(
        `번들 내 사이클을 하나로 합칠까요?\n- 메인: ${mainGid.slice(0, 8)}\n- 대상: ${otherGids.length}개`
      )
    )
      return;

    setMergingByBundle(true);
    try {
      const bundleRows = gids.flatMap((g) => sessionsByGroupId[g] || []);
      const rawMainType = resolveMergedBundleSessionType(bundleRows);
      const mainSessionType = rawMainType ? normalizeMergedSessionType(rawMainType) : null;

      // 1) 메인 group_id로 세션 group_id 이동
      const { error: moveErr } = await supabase
        .from("sessions")
        .update({ group_id: mainGid })
        .in("group_id", otherGids);
      if (moveErr) throw moveErr;

      // 1b) 편입된 세션 포함 메인 그룹 전체 session_type을 메인 사이클 대표값으로 통일 (캘린더 색상 일치)
      if (mainSessionType) {
        const { error: typeErr } = await supabase
          .from("sessions")
          .update({ session_type: mainSessionType })
          .eq("group_id", mainGid);
        if (typeErr) throw typeErr;
      }

      // 2) 메인 group_id 기준으로 회차 번호/총회차 재계산
      const { data: mainRows, error: mainSelErr } = await supabase
        .from("sessions")
        .select("id, start_at, end_at, status, round_total")
        .eq("group_id", mainGid);
      if (mainSelErr) throw mainSelErr;

      const allMain = (mainRows || []) as Array<{
        id: string;
        start_at: string;
        end_at: string;
        status: string | null;
        round_total: number | null;
      }>;

      const baseAll = allMain.filter(
        (r) => r.status !== "postponed" && r.status !== "cancelled" && r.status !== "deleted"
      );
      const sortedBase = [...baseAll].sort(
        (a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime()
      );
      const total = sortedBase.length;
      if (total >= 1) {
        await Promise.all(
          sortedBase.map((row, i) =>
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

      toast.success("회차를 합쳤습니다.");

      await loadAll();
      onChanged?.();
    } catch (err) {
      devLogger.error(err);
      toast.error("회차 합치기에 실패했습니다.");
    } finally {
      setMergingByBundle(false);
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

      const remaining = active.filter((s) => !idsToDelete.includes(s.id));
      if (remaining.length > 0) {
        const total = remaining.length;
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

    const count = Math.max(1, Math.floor(restartCountByGroup[gid] || sessions.length || 1));
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
      const { id: _id, created_at: _ca, updated_at: _ua, start_at: _sa, end_at: _ea, status: _st, ...insertBase } =
        last as any;
      void _id;
      void _ca;
      void _ua;
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
    if (!nextTeacherId && !timeStr) {
      return toast.error("선생님 또는 시작 시간 중 하나 이상 입력해주세요.");
    }

    const rows = (sessionsByGroupId[gid] || []).filter(isSessionBulkTarget);
    if (rows.length === 0) {
      return toast.error(
        "변경할 수 있는 회차가 없습니다. (종료된 회차만 있거나 취소·삭제만 있습니다.)"
      );
    }

    const parts: string[] = [];
    if (nextTeacherId) parts.push("메인 강사");
    if (timeStr) parts.push("시작 시간");
    if (
      !confirm(
        `종료되지 않은 회차 ${rows.length}건만 ${parts.join("·")}을(를) 변경할까요? (보조는 메인과 겹치면 제외됩니다.)`
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
        if (timeStr) {
          const { start_at, end_at } = applyLocalTimeKeepDuration(s.start_at, s.end_at, timeStr);
          patch.start_at = start_at;
          patch.end_at = end_at;
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

  const sortedGroupIds = useMemo(() => {
    return [...effectiveGroupIds].sort((a, b) => {
      const ar = sessionsByGroupId[a] || [];
      const br = sessionsByGroupId[b] || [];
      const aMin = ar.length ? Math.min(...ar.map((s) => new Date(s.start_at).getTime())) : Number.POSITIVE_INFINITY;
      const bMin = br.length ? Math.min(...br.map((s) => new Date(s.start_at).getTime())) : Number.POSITIVE_INFINITY;
      return aMin - bMin;
    });
  }, [effectiveGroupIds, sessionsByGroupId]);

  const { currentGroupIds, pastGroupIds } = useMemo(() => {
    const current: string[] = [];
    const past: string[] = [];
    for (const gid of sortedGroupIds) {
      const rows = sessionsByGroupId[gid] || [];
      if (!rows.length) continue;
      if (isPastCycleGroup(rows)) past.push(gid);
      else current.push(gid);
    }
    return { currentGroupIds: current, pastGroupIds: past };
  }, [sortedGroupIds, sessionsByGroupId]);

  const displayTitle = useMemo(() => titleDraft.trim() || bundleTitle, [titleDraft, bundleTitle]);

  const renderCycleSection = (gid: string) => {
    const cycleNum = sortedGroupIds.indexOf(gid) + 1;
    const rows = sessionsByGroupId[gid] || [];
    const open = !!openGroupIds[gid];
    const label = `${formatDateRange(rows)} · ${plannedTotalOfGroup(rows)}회`;
    return (
      <section key={gid} className="border border-slate-100 rounded-2xl overflow-hidden bg-white">
                    <button
                      type="button"
                      onClick={() => toggleGroup(gid)}
                      className="w-full px-4 py-3 bg-slate-50 hover:bg-slate-100 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {open ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronRight className="w-4 h-4 text-slate-500" />}
                        <span className="text-xs font-black text-slate-700 truncate">
                          사이클 {cycleNum} · {label}
                        </span>
                      </div>
                      <span className="text-[11px] font-black text-slate-400">{gid.slice(0, 8)}</span>
                    </button>

                    {open && (
                      <div className="p-4 space-y-3">
                        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                          <h4 className="text-sm font-black text-slate-800">그룹 설정</h4>
                          <p className="text-xs text-slate-500 font-bold mt-1">
                            수업명은 상단에서 번들 전체로 변경합니다. 아래 일괄 적용은{" "}
                            <span className="text-slate-700">종료되지 않은 회차</span>에만 메인 강사·시작 시간을
                            반영합니다. 회차별 보조1·보조2는 표에서 설정합니다 (최대 3인: 메인+보조2).
                          </p>
                          <div className="mt-3 flex items-center gap-2 flex-wrap">
                            <select
                              className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold min-w-[140px]"
                              value={bulkTeacherIdByGroup[gid] ?? ""}
                              onChange={(e) =>
                                setBulkTeacherIdByGroup((prev) => ({ ...prev, [gid]: e.target.value }))
                              }
                            >
                              <option value="">메인 강사 선택</option>
                              {teachers.map((t) => (
                                <option key={t.id} value={t.id}>
                                  {t.name} T
                                </option>
                              ))}
                            </select>
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
                            <button
                              type="button"
                              onClick={() => void handleBulkApplyToGroup(gid)}
                              disabled={bulkTeacherApplyingGid === gid}
                              className="px-3 py-2 rounded-full text-xs font-black bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50"
                            >
                              {bulkTeacherApplyingGid === gid ? "적용 중..." : "일괄 적용"}
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-2">
                          <div className="text-xs font-black text-slate-700">회차 목록</div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              className={`px-3 py-1.5 rounded-full text-[11px] font-black border ${
                                reindexingByGroup[gid]
                                  ? "bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed"
                                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                              }`}
                              disabled={!!reindexingByGroup[gid]}
                              onClick={() => void handleReindexRounds(gid)}
                            >
                              {reindexingByGroup[gid] ? "정렬 중..." : "회차 재정렬"}
                            </button>
                          </div>
                        </div>

                        <div className="rounded-2xl border border-slate-100 overflow-hidden">
                          <table className="w-full table-fixed text-xs">
                            <colgroup>
                              <col className="w-[52px]" />
                              <col className="w-[120px]" />
                              <col className="w-[108px]" />
                              <col />
                              <col className="w-[64px]" />
                              <col className="w-[56px]" />
                              <col className="w-[78px]" />
                            </colgroup>
                            <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 border-b border-slate-100">
                              <tr>
                                <th className="px-2 py-2 text-left">회차</th>
                                <th className="px-2 py-2 text-left">날짜</th>
                                <th className="px-2 py-2 text-left">시간</th>
                                <th className="px-2 py-2 text-left">강사 / 수업료</th>
                                <th className="px-2 py-2 text-center">마일리지</th>
                                <th className="px-2 py-2 text-center">상태</th>
                                <th className="px-2 py-2 text-center">액션</th>
                              </tr>
                            </thead>
                            <tbody>
                              {rows
                                .filter((r) => {
                                  if (r.status === "deleted") return false;
                                  if (r.status === "cancelled") return roundView === "all";
                                  if (roundView === "all") return true;
                                  const s = getTimeStatusLabel(r);
                                  if (roundView === "completed") return s.isCompletedByTime;
                                  return s.isActiveByTime;
                                })
                                .map((r, i) => {
                                  const start = new Date(r.start_at);
                                  const end = new Date(r.end_at);
                                  const dateStr = toDateInputValueLocal(start);
                                  const timeStr = start.toTimeString().slice(0, 5);
                                  const total = plannedTotalOfGroup(rows);
                                  const n = Math.min(r.round_index ?? i + 1, total);
                                  const s = getTimeStatusLabel(r);
                                  const assistList = extraTeachersFromMemo(r.memo);
                                  return (
                                    <tr key={r.id} className="border-t border-slate-100">
                                      <td className="px-2 py-2 font-bold text-slate-700">{n}/{total}</td>
                                      <td className="px-2 py-2">
                                        <input
                                          type="date"
                                          className="w-full bg-transparent border rounded-lg px-2 py-1"
                                          value={dateStr}
                                          onChange={(e) => {
                                            const [y, m, d] = e.target.value.split("-").map(Number);
                                            const startAt = new Date(start);
                                            startAt.setFullYear(y, m - 1, d);
                                            const duration = (end.getTime() - start.getTime()) / (1000 * 60);
                                            const endAt = new Date(startAt);
                                            endAt.setMinutes(endAt.getMinutes() + duration);
                                            void applyInlineUpdate(gid, r.id, {
                                              start_at: startAt.toISOString(),
                                              end_at: endAt.toISOString(),
                                            });
                                          }}
                                        />
                                      </td>
                                      <td className="px-2 py-2">
                                        <input
                                          type="time"
                                          className="w-full bg-transparent border rounded-lg px-2 py-1"
                                          value={timeStr}
                                          onChange={(e) => {
                                            const [hh, mm] = e.target.value.split(":").map(Number);
                                            const startAt = new Date(start);
                                            startAt.setHours(hh, mm, 0, 0);
                                            const duration = (end.getTime() - start.getTime()) / (1000 * 60);
                                            const endAt = new Date(startAt);
                                            endAt.setMinutes(endAt.getMinutes() + duration);
                                            void applyInlineUpdate(gid, r.id, {
                                              start_at: startAt.toISOString(),
                                              end_at: endAt.toISOString(),
                                            });
                                          }}
                                        />
                                      </td>
                                      <td className="px-2 py-1.5 min-w-0">
                                        <div className="flex flex-col gap-1.5 min-w-0">
                                          {/* 메인 강사 + 수업료 */}
                                          <div className="flex items-center gap-1.5 min-w-0">
                                            <select
                                              className="min-w-0 flex-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-[11px] font-bold text-slate-800"
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
                                              className="w-[80px] shrink-0 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-[11px] font-bold text-right text-slate-800"
                                              placeholder="수업료"
                                              defaultValue={Number(r.price) || 0}
                                              onBlur={(e) => void applyInlineUpdate(gid, r.id, { price: Number(e.target.value) || 0 })}
                                            />
                                          </div>
                                          {/* 보조 강사 행 */}
                                          {assistList.map((ex, aidx) => (
                                            <div key={aidx} className="flex items-center gap-1.5 min-w-0">
                                              <select
                                                className="min-w-0 flex-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-[11px] font-bold text-slate-600"
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
                                                className="w-[80px] shrink-0 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-[11px] font-bold text-right text-slate-600"
                                                placeholder="수업료"
                                                defaultValue={Number(ex.price) || 0}
                                                onBlur={(e) => void setAssistPriceAt(gid, r, aidx, Number(e.target.value) || 0)}
                                              />
                                              <button
                                                type="button"
                                                title="보조 제거"
                                                className="shrink-0 rounded p-1 text-slate-300 hover:bg-rose-50 hover:text-rose-500 transition-colors"
                                                onClick={() => void removeAssistRow(gid, r, aidx)}
                                              >
                                                <Minus size={12} strokeWidth={2.5} />
                                              </button>
                                            </div>
                                          ))}
                                          {/* 보조 추가 */}
                                          {assistList.length < 2 && (
                                            <button
                                              type="button"
                                              className="flex items-center gap-0.5 text-[10px] font-black text-blue-500 hover:text-blue-700 transition-colors w-fit"
                                              onClick={() => void addAssistRow(gid, r)}
                                            >
                                              <Plus size={11} strokeWidth={2.5} />
                                              보조 추가
                                            </button>
                                          )}
                                        </div>
                                      </td>
                                      <td className="px-1 py-2 text-center align-top">
                                        <button
                                          type="button"
                                          className="px-2 py-1.5 rounded-lg text-[10px] font-black bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-200/80 w-full max-w-[58px]"
                                          onClick={() => setMileageModal({ gid, row: r })}
                                        >
                                          설정
                                        </button>
                                      </td>
                                      <td className="px-2 py-2 text-center">
                                        <span
                                          className={`inline-flex px-2 py-1 rounded-full text-[10px] font-black ${statusBadgeClass(s.label)}`}
                                        >
                                          {s.label}
                                        </span>
                                      </td>
                                      <td className="px-2 py-2 text-center">
                                        {r.status === "cancelled" || r.status === "deleted" ? null : (
                                          <div className="flex flex-col items-stretch gap-1 max-w-[68px] mx-auto">
                                            {r.status === "postponed" ? (
                                              <button
                                                type="button"
                                                className="px-2.5 py-1.5 rounded-full text-[10px] font-black bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50"
                                                disabled={undoingPostponeSessionId === r.id}
                                                onClick={() => void handleUndoPostpone(r.id)}
                                              >
                                                {undoingPostponeSessionId === r.id ? "복구 중..." : "연기 취소"}
                                              </button>
                                            ) : (
                                              <button
                                                type="button"
                                                className="px-2.5 py-1.5 rounded-full text-[10px] font-black bg-violet-50 text-violet-600 hover:bg-violet-100"
                                                onClick={() => void handlePostpone(gid, r.id)}
                                              >
                                                연기
                                              </button>
                                            )}
                                            <button
                                              type="button"
                                              className="px-2.5 py-1.5 rounded-full text-[10px] font-black bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-50"
                                              disabled={deletingSessionId === r.id || !s.isActiveByTime}
                                              onClick={() => void handleDeleteSession(gid, r.id)}
                                            >
                                              {deletingSessionId === r.id ? "삭제 중..." : "삭제"}
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

                        <div className="mt-3 border-t border-slate-100 pt-2">
                          <button
                            type="button"
                            onClick={() => toggleToolPanel(gid, "extend")}
                            className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-2 text-left hover:bg-slate-50"
                          >
                            <span className="text-xs font-black text-slate-700">회차 확장</span>
                            {isToolPanelOpen(gid, "extend") ? (
                              <ChevronDown className="h-4 w-4 shrink-0 text-slate-500" />
                            ) : (
                              <ChevronRight className="h-4 w-4 shrink-0 text-slate-500" />
                            )}
                          </button>
                          {isToolPanelOpen(gid, "extend") ? (
                            <div className="space-y-2 px-1 pb-2 pt-1">
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  min={1}
                                  className="w-20 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-sm"
                                  value={extendCountByGroup[gid] ?? 1}
                                  onChange={(e) =>
                                    setExtendCountByGroup((prev) => ({
                                      ...prev,
                                      [gid]: Number(e.target.value) || 1,
                                    }))
                                  }
                                />
                                <span className="text-xs text-slate-600">회 추가</span>
                                <button
                                  type="button"
                                  className="ml-auto px-4 py-2 rounded-full text-xs font-bold bg-blue-600 text-white hover:bg-blue-700"
                                  onClick={() => {
                                    const n = Math.max(1, Math.floor(extendCountByGroup[gid] ?? 1));
                                    if (!confirm(`${n}회차를 추가하시겠습니까?`)) return;
                                    void handleExtend(gid, n);
                                  }}
                                >
                                  회차 확장
                                </button>
                              </div>
                            </div>
                          ) : null}
                        </div>

                        <div className="border-t border-slate-100 pt-2">
                          <button
                            type="button"
                            onClick={() => toggleToolPanel(gid, "shrink")}
                            className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-2 text-left hover:bg-slate-50"
                          >
                            <span className="text-xs font-black text-slate-700">회차 축소/삭제</span>
                            {isToolPanelOpen(gid, "shrink") ? (
                              <ChevronDown className="h-4 w-4 shrink-0 text-slate-500" />
                            ) : (
                              <ChevronRight className="h-4 w-4 shrink-0 text-slate-500" />
                            )}
                          </button>
                          {isToolPanelOpen(gid, "shrink") ? (
                            <div className="space-y-2 px-1 pb-2 pt-1">
                              <p className="text-[11px] text-slate-500 font-bold">
                                마지막 N회차를 status='deleted'로 숨기고 회차 정보를 재계산합니다.
                              </p>
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  min={1}
                                  className="w-20 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-sm"
                                  value={shrinkCountByGroup[gid] ?? 1}
                                  onChange={(e) =>
                                    setShrinkCountByGroup((prev) => ({
                                      ...prev,
                                      [gid]: Number(e.target.value) || 1,
                                    }))
                                  }
                                />
                                <span className="text-xs text-slate-600">회 줄이기</span>
                                <button
                                  type="button"
                                  className="ml-auto px-4 py-2 rounded-full text-xs font-bold bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50"
                                  disabled={!!shrinkingByGroup[gid]}
                                  onClick={() => void handleShrinkTail(gid)}
                                >
                                  {shrinkingByGroup[gid] ? "처리 중..." : "마지막 회차 삭제"}
                                </button>
                              </div>
                            </div>
                          ) : null}
                        </div>

                        <div className="border-t border-slate-100 pt-2">
                          <button
                            type="button"
                            onClick={() => toggleToolPanel(gid, "restart")}
                            className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-2 text-left hover:bg-slate-50"
                          >
                            <span className="text-xs font-black text-slate-700">사이클 재시작</span>
                            {isToolPanelOpen(gid, "restart") ? (
                              <ChevronDown className="h-4 w-4 shrink-0 text-slate-500" />
                            ) : (
                              <ChevronRight className="h-4 w-4 shrink-0 text-slate-500" />
                            )}
                          </button>
                          {isToolPanelOpen(gid, "restart") ? (
                            <div className="space-y-3 px-1 pb-2 pt-1">
                          <p className="text-[11px] text-slate-500 font-bold">
                            기존 사이클은 유지하고, 새 group_id로 예정 회차를 생성합니다.
                          </p>
                          <div className="flex items-center gap-2 flex-wrap">
                            <label className="text-xs font-black text-slate-600">회차</label>
                            <input
                              type="number"
                              min={1}
                              className="w-20 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-sm"
                              value={restartCountByGroup[gid] ?? rows.length ?? 1}
                              onChange={(e) =>
                                setRestartCountByGroup((prev) => ({
                                  ...prev,
                                  [gid]: Number(e.target.value) || 1,
                                }))
                              }
                            />
                            <label className="text-xs font-black text-slate-600 ml-2">패턴</label>
                            <select
                              className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-sm font-bold"
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
                                <label className="text-xs font-black text-slate-600 ml-2">간격(일)</label>
                                <input
                                  type="number"
                                  min={1}
                                  className="w-20 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-sm"
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

                          <div className="flex items-center gap-2 flex-wrap">
                            <label className="text-xs font-black text-slate-600">시작일</label>
                            <input
                              type="date"
                              className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-sm"
                              value={restartStartDateByGroup[gid] ?? toDateInputValueLocal(new Date())}
                              onChange={(e) =>
                                setRestartStartDateByGroup((prev) => ({ ...prev, [gid]: e.target.value }))
                              }
                            />
                            <label className="text-xs font-black text-slate-600">시간</label>
                            <input
                              type="time"
                              className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-sm"
                              value={restartStartTimeByGroup[gid] ?? "10:00"}
                              onChange={(e) =>
                                setRestartStartTimeByGroup((prev) => ({ ...prev, [gid]: e.target.value }))
                              }
                            />
                          </div>

                          {(restartWeeklyFrequencyByGroup[gid] ?? 1) === 2 && (
                            <div className="flex items-center gap-2 flex-wrap">
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
                                    className={`px-3 py-1.5 rounded-full text-xs font-black border ${
                                      isBase
                                        ? "bg-blue-600 text-white border-blue-600 cursor-not-allowed"
                                        : isSelected
                                          ? "bg-slate-900 text-white border-slate-900"
                                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
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
                              className="ml-auto px-4 py-2 rounded-full text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50"
                              disabled={!!restartingByGroup[gid]}
                              onClick={() => void handleRestartCycle(gid)}
                            >
                              {restartingByGroup[gid] ? "생성 중..." : "사이클 재시작"}
                            </button>
                          </div>
                            </div>
                          ) : null}
                        </div>
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
        className={`absolute right-0 top-0 h-full w-full max-w-6xl bg-white shadow-2xl border-l border-slate-100 flex flex-col transition-transform ${
          visible ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <header className="shrink-0 px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-100 flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1 space-y-2">
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Class Bundle (V2)</p>
            {!editingTitle ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-black text-slate-900 truncate">{displayTitle}</h2>
                  <button
                    type="button"
                    onClick={() => setEditingTitle(true)}
                    className="px-2 py-1 rounded-full text-[11px] font-black bg-slate-100 text-slate-700 hover:bg-slate-200 shrink-0"
                  >
                    수업명 수정
                  </button>
                  <button
                    type="button"
                    onClick={() => setSessionTypePanelOpen((o) => !o)}
                    className={`px-2 py-1 rounded-full text-[11px] font-black shrink-0 border ${
                      sessionTypePanelOpen
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    수업 타입
                  </button>
                </div>
                {sessionTypePanelOpen ? (
                  <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:flex-row sm:flex-wrap sm:items-center">
                    <label className="text-[11px] font-black text-slate-600 shrink-0">수업 타입 (번들 전체)</label>
                    <select
                      className="min-w-[180px] flex-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-bold text-slate-800"
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
                      className="shrink-0 rounded-lg bg-slate-900 px-3 py-1.5 text-[11px] font-black text-white hover:bg-slate-800 disabled:opacity-50"
                    >
                      {savingSessionType ? "저장 중..." : "적용"}
                    </button>
                    {bundleSessionTypesMixed ? (
                      <p className="w-full text-[11px] font-bold text-amber-800">
                        세션마다 타입이 다릅니다. 적용 시 번들 전체가 위 선택값으로 통일됩니다.
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <input
                  className="w-full min-w-0 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold"
                  value={titleDraft}
                  onChange={(e) => setTitleDraft(e.target.value)}
                  placeholder="수업명을 입력하세요"
                />
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    disabled={!titleDraft.trim() || savingTitle}
                    onClick={() => void handleSaveBundleTitle()}
                    className="px-3 py-2 rounded-full text-xs font-black bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {savingTitle ? "저장 중..." : "저장"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingTitle(false);
                      void loadAll();
                    }}
                    className="px-3 py-2 rounded-full text-xs font-black bg-slate-100 text-slate-700 hover:bg-slate-200"
                  >
                    취소
                  </button>
                </div>
              </div>
            )}
            <p className="text-xs text-slate-500 font-bold">{groupIds.length}개 사이클</p>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 text-slate-500 shrink-0">
            <X className="w-5 h-5" />
          </button>
        </header>

        <div className="flex gap-1 px-4 sm:px-6 border-b border-slate-100 shrink-0 overflow-x-auto">
          <button
            type="button"
            onClick={() => setBundleTab("rounds")}
            className={`px-4 py-2.5 text-xs font-black rounded-t-lg border-b-2 -mb-px transition-colors ${
              bundleTab === "rounds"
                ? "border-blue-600 text-blue-700 bg-white"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            회차 / 강사
          </button>
          <button
            type="button"
            onClick={() => setBundleTab("info")}
            className={`px-4 py-2.5 text-xs font-black rounded-t-lg border-b-2 -mb-px transition-colors ${
              bundleTab === "info"
                ? "border-blue-600 text-blue-700 bg-white"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            수업 정보
          </button>
        </div>

        {bundleTab === "rounds" ? (
          <div className="flex-1 overflow-auto p-4 sm:p-6 space-y-4 min-h-0">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-xs font-black text-slate-600 min-w-0">
                사이클(그룹)별로 접기/펼치기 할 수 있습니다. 완료된 일정은 아래 <span className="text-slate-800">지난 사이클</span>에
                모입니다.
              </div>
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => void handleMergeCycleRounds()}
                  disabled={
                    mergingByBundle ||
                    effectiveGroupIds.filter((gid) => (sessionsByGroupId[gid] || []).length > 0).length <= 1
                  }
                  className="px-3 py-2 rounded-full text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {mergingByBundle ? "합치는 중..." : "회차 합치기"}
                </button>
                <select
                  className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-black text-slate-700"
                  value={roundView}
                  onChange={(e) => setRoundView(e.target.value as RoundView)}
                >
                  <option value="active">예정/진행만</option>
                  <option value="all">전체</option>
                  <option value="completed">완료만</option>
                </select>
              </div>
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
                  <section className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50/90">
                    <button
                      type="button"
                      onClick={() => setPastArchiveOpen((o) => !o)}
                      className="w-full px-4 py-3 bg-slate-100/80 hover:bg-slate-100 flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {pastArchiveOpen ? (
                          <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
                        )}
                        <span className="text-xs font-black text-slate-700 truncate">
                          지난 사이클 ({pastGroupIds.length}개)
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
        ) : (
          <div className="flex-1 overflow-auto p-4 sm:p-6 min-h-0">
            {!bundleKey ? (
              <p className="text-sm font-bold text-slate-500">사이클(그룹)이 없어 수업 정보를 저장할 수 없습니다.</p>
            ) : infoLoading ? (
              <div className="flex items-center justify-center h-40 text-slate-400 text-sm font-bold">불러오는 중...</div>
            ) : (
              <div className="max-w-xl space-y-4">
                <p className="text-xs font-bold text-slate-500">
                  이 번들({effectiveGroupIds.length}개 사이클)에 공통으로 쓰는 연락·주소 정보입니다. DB에 `bundle_key`로
                  저장됩니다.
                </p>
                <label className="block space-y-1">
                  <span className="text-[11px] font-black text-slate-600 uppercase tracking-wide">주소</span>
                  <textarea
                    className="w-full min-h-[72px] rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-800"
                    value={infoAddress}
                    onChange={(e) => setInfoAddress(e.target.value)}
                    placeholder="도로명 / 상세 주소"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-[11px] font-black text-slate-600 uppercase tracking-wide">연락처</span>
                  <input
                    type="text"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-800"
                    value={infoPhone}
                    onChange={(e) => setInfoPhone(e.target.value)}
                    placeholder="010-0000-0000"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-[11px] font-black text-slate-600 uppercase tracking-wide">아이 정보</span>
                  <textarea
                    className="w-full min-h-[80px] rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-800"
                    value={infoChild}
                    onChange={(e) => setInfoChild(e.target.value)}
                    placeholder="이름, 학년, 특이사항 등"
                  />
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    checked={infoTuitionPaid}
                    onChange={(e) => setInfoTuitionPaid(e.target.checked)}
                  />
                  <span className="text-sm font-bold text-slate-800">수업료 납부 완료</span>
                </label>
                <label className="block space-y-1">
                  <span className="text-[11px] font-black text-slate-600 uppercase tracking-wide">메모</span>
                  <input
                    type="text"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-800"
                    value={infoNotes}
                    onChange={(e) => setInfoNotes(e.target.value)}
                    placeholder="운영 메모"
                  />
                </label>
                <button
                  type="button"
                  disabled={infoSaving}
                  onClick={() => void handleSaveBundleInfo()}
                  className="px-5 py-2.5 rounded-xl text-xs font-black bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {infoSaving ? "저장 중..." : "저장"}
                </button>
              </div>
            )}
          </div>
        )}
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

