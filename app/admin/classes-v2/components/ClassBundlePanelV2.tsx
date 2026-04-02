"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, X } from "lucide-react";
import { toast } from "sonner";
import { getSupabaseBrowserClient } from "@/app/lib/supabase/browser";
import { devLogger } from "@/app/lib/logging/devLogger";
import { postponeCascade } from "@/app/admin/classes/lib/postponeUtils";
import { extendClass } from "@/app/admin/classes/lib/roundExtendUtils";

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
};

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
  const [roundView, setRoundView] = useState<RoundView>("all");
  const [openGroupIds, setOpenGroupIds] = useState<Record<string, boolean>>({});
  const [sessionsByGroupId, setSessionsByGroupId] = useState<Record<string, SessionRow[]>>({});
  const [localGroupIds, setLocalGroupIds] = useState<string[]>([]);

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
  const [bulkTeacherApplyingGid, setBulkTeacherApplyingGid] = useState<string | null>(null);
  const [restoringDeletedByGroup, setRestoringDeletedByGroup] = useState<Record<string, boolean>>({});

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
          "id, group_id, title, start_at, end_at, status, created_by, price, round_index, round_total, sequence_number"
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

      // 기본 오픈: 가장 가까운 예정/진행 사이클 1개, 없으면 첫 번째
      const candidates = effectiveGroupIds
        .map((gid) => {
          const list = map[gid] || [];
          const minStart = list.length ? Math.min(...list.map((s) => new Date(s.start_at).getTime())) : Number.POSITIVE_INFINITY;
          const hasActive = list.some((s) => getTimeStatusLabel(s).isActiveByTime);
          return { gid, minStart, hasActive };
        })
        .sort((a, b) => {
          if (a.hasActive !== b.hasActive) return a.hasActive ? -1 : 1;
          return a.minStart - b.minStart;
        });
      const first = candidates[0]?.gid;
      if (first) setOpenGroupIds((prev) => ({ ...prev, [first]: true }));

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
          next[gid] = base.toISOString().split("T")[0]!;
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
    if (!visible) setEditingTitle(false);
  }, [visible]);

  const plannedTotalOfGroup = useCallback((rows: SessionRow[]) => {
    const baseAll = rows.filter(
      (r) => r.status !== "postponed" && r.status !== "cancelled" && r.status !== "deleted"
    );
    const indices = baseAll
      .map((r) => r.round_index)
      .filter((v): v is number => typeof v === "number");
    if (indices.length) return Math.max(...indices);
    return Math.max(1, baseAll.length || rows.length || 1);
  }, []);

  const toggleGroup = (gid: string) => {
    setOpenGroupIds((prev) => ({ ...prev, [gid]: !prev[gid] }));
  };

  const applyInlineUpdate = async (
    gid: string,
    sessionId: string,
    patch: { start_at?: string; end_at?: string; price?: number; created_by?: string }
  ) => {
    if (!supabase) return;
    try {
      const { error } = await supabase.from("sessions").update(patch).eq("id", sessionId);
      if (error) throw error;
      setSessionsByGroupId((prev) => {
        const next = { ...prev };
        next[gid] = (next[gid] || []).map((r) => (r.id === sessionId ? { ...r, ...(patch as any) } : r));
        return next;
      });
      onChanged?.();
    } catch (err) {
      devLogger.error(err);
      toast.error("수정에 실패했습니다.");
    }
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
    if (sessions.length <= 1) return;
    const current = [...sessions].sort(
      (a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime()
    );
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
      const sorted = [...sessions].sort(
        (a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime()
      );
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

  const handleShrinkTail = async (gid: string) => {
    if (!supabase) return;
    const sessions = sessionsByGroupId[gid] || [];
    if (sessions.length === 0) return;
    const n = Math.max(1, Math.floor(shrinkCountByGroup[gid] || 1));
    const sorted = [...sessions].sort(
      (a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime()
    );
    const toRemove = sorted.slice(-n);
    if (toRemove.length === 0) return;
    const hasPast = toRemove.some((s) => Date.now() > new Date(s.end_at).getTime());
    const msg = hasPast
      ? `⚠ 과거/완료된 회차가 포함됩니다.\n마지막 ${toRemove.length}개 회차를 'deleted'로 숨기고 회차 정보를 재계산할까요?`
      : `마지막 ${toRemove.length}개 회차를 'deleted'로 숨기고 회차 정보를 재계산할까요?`;
    if (!confirm(msg)) return;

    setShrinkingByGroup((prev) => ({ ...prev, [gid]: true }));
    try {
      const idsToDelete = toRemove.map((s) => s.id);
      const { error: delErr } = await supabase
        .from("sessions")
        .update({ status: "deleted" })
        .in("id", idsToDelete);
      if (delErr) throw delErr;

      const remaining = sorted.filter((s) => !idsToDelete.includes(s.id));
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

  const handleApplyTeacherToGroup = async (gid: string) => {
    if (!supabase) return;
    const nextTeacherId = String(bulkTeacherIdByGroup[gid] || "").trim();
    if (!nextTeacherId) return toast.error("선생님을 선택해주세요.");
    if (!confirm("이 사이클(그룹)의 모든 회차 선생님을 변경할까요?")) return;
    setBulkTeacherApplyingGid(gid);
    try {
      const { error } = await supabase.from("sessions").update({ created_by: nextTeacherId }).eq("group_id", gid);
      if (error) throw error;
      toast.success("선생님이 변경되었습니다.");
      onChanged?.();
      void loadAll();
    } catch (err) {
      devLogger.error(err);
      toast.error("선생님 변경에 실패했습니다.");
    } finally {
      setBulkTeacherApplyingGid(null);
    }
  };

  const handleRestoreDeletedForGroup = async (gid: string) => {
    if (!supabase) return;
    if (!confirm("status='deleted'로 숨겨진 회차를 복구할까요?")) return;
    setRestoringDeletedByGroup((prev) => ({ ...prev, [gid]: true }));
    try {
      const { error } = await supabase
        .from("sessions")
        .update({ status: "opened" })
        .eq("group_id", gid)
        .eq("status", "deleted");
      if (error) throw error;
      toast.success("삭제된 회차가 복구되었습니다.");
      onChanged?.();
      void loadAll();
    } catch (err) {
      devLogger.error(err);
      toast.error("복구에 실패했습니다.");
    } finally {
      setRestoringDeletedByGroup((prev) => ({ ...prev, [gid]: false }));
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

  const displayTitle = useMemo(() => titleDraft.trim() || bundleTitle, [titleDraft, bundleTitle]);

  return (
    <div className={`fixed inset-0 z-50 transition ${visible ? "pointer-events-auto" : "pointer-events-none"}`}>
      <div
        className={`absolute inset-0 bg-black/30 transition-opacity ${visible ? "opacity-100" : "opacity-0"}`}
        onClick={onClose}
      />
      <aside
        className={`absolute right-0 top-0 h-full w-full max-w-4xl bg-white shadow-2xl border-l border-slate-100 flex flex-col transition-transform ${
          visible ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <header className="px-6 py-4 border-b border-slate-100 flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1 space-y-2">
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Class Bundle (V2)</p>
            {!editingTitle ? (
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-black text-slate-900 truncate">{displayTitle}</h2>
                <button
                  type="button"
                  onClick={() => setEditingTitle(true)}
                  className="px-2 py-1 rounded-full text-[11px] font-black bg-slate-100 text-slate-700 hover:bg-slate-200 shrink-0"
                >
                  수업명 수정
                </button>
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

        <div className="flex-1 overflow-auto p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-xs font-black text-slate-600">
              사이클(그룹)별로 접기/펼치기 할 수 있습니다.
            </div>
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

          {loading ? (
            <div className="flex items-center justify-center h-40 text-slate-400 text-sm font-bold">불러오는 중...</div>
          ) : (
            <div className="space-y-3">
              {sortedGroupIds.map((gid, idx) => {
                const rows = sessionsByGroupId[gid] || [];
                const open = !!openGroupIds[gid];
                const label = `${formatDateRange(rows)} · ${plannedTotalOfGroup(rows)}회`;
                return (
                  <section key={gid} className="border border-slate-100 rounded-2xl overflow-hidden">
                    <button
                      type="button"
                      onClick={() => toggleGroup(gid)}
                      className="w-full px-4 py-3 bg-slate-50 hover:bg-slate-100 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {open ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronRight className="w-4 h-4 text-slate-500" />}
                        <span className="text-xs font-black text-slate-700 truncate">
                          사이클 {idx + 1} · {label}
                        </span>
                      </div>
                      <span className="text-[11px] font-black text-slate-400">{gid.slice(0, 8)}</span>
                    </button>

                    {open && (
                      <div className="p-4 space-y-3">
                        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                          <h4 className="text-sm font-black text-slate-800">그룹 설정</h4>
                          <p className="text-xs text-slate-500 font-bold mt-1">
                            수업명은 상단에서 번들 전체로 변경합니다. 선생님은 이 사이클(그룹) 전체 회차에 적용됩니다.
                          </p>
                          <div className="mt-3 flex items-center gap-2 flex-wrap">
                            <select
                              className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold min-w-[140px]"
                              value={bulkTeacherIdByGroup[gid] ?? ""}
                              onChange={(e) =>
                                setBulkTeacherIdByGroup((prev) => ({ ...prev, [gid]: e.target.value }))
                              }
                            >
                              <option value="">선생님 선택</option>
                              {teachers.map((t) => (
                                <option key={t.id} value={t.id}>
                                  {t.name} T
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              onClick={() => void handleApplyTeacherToGroup(gid)}
                              disabled={bulkTeacherApplyingGid === gid}
                              className="px-3 py-2 rounded-full text-xs font-black bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50"
                            >
                              {bulkTeacherApplyingGid === gid ? "적용 중..." : "선생님 변경"}
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleRestoreDeletedForGroup(gid)}
                              disabled={!!restoringDeletedByGroup[gid]}
                              className="px-3 py-2 rounded-full text-xs font-black bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-50"
                            >
                              {restoringDeletedByGroup[gid] ? "복구 중..." : "삭제 복구"}
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
                            <thead className="bg-white text-[11px] font-bold text-slate-500">
                              <tr>
                                <th className="px-2 py-2 text-left w-[56px]">회차</th>
                                <th className="px-2 py-2 text-left w-[106px]">날짜</th>
                                <th className="px-2 py-2 text-left w-[80px]">시간</th>
                                <th className="px-2 py-2 text-left w-[98px]">선생님</th>
                                <th className="px-2 py-2 text-right w-[78px]">금액</th>
                                <th className="px-2 py-2 text-center w-[58px]">상태</th>
                                <th className="px-2 py-2 text-center w-[62px]">액션</th>
                              </tr>
                            </thead>
                            <tbody>
                              {rows
                                .filter((r) => {
                                  if (roundView === "all") return true;
                                  const s = getTimeStatusLabel(r);
                                  if (roundView === "completed") return s.isCompletedByTime;
                                  return s.isActiveByTime;
                                })
                                .map((r, i) => {
                                  const start = new Date(r.start_at);
                                  const end = new Date(r.end_at);
                                  const dateStr = start.toISOString().split("T")[0];
                                  const timeStr = start.toTimeString().slice(0, 5);
                                  const total = plannedTotalOfGroup(rows);
                                  const n = Math.min(r.round_index ?? i + 1, total);
                                  const s = getTimeStatusLabel(r);
                                  return (
                                    <tr key={r.id} className="border-t border-slate-100">
                                      <td className="px-2 py-2 font-bold text-slate-700">{n}/{total}</td>
                                      <td className="px-2 py-2">
                                        <input
                                          type="date"
                                          className="w-[112px] bg-transparent border rounded-lg px-2 py-1"
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
                                          className="w-[84px] bg-transparent border rounded-lg px-2 py-1"
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
                                      <td className="px-2 py-2">
                                        <select
                                          className="w-[104px] bg-transparent border rounded-lg px-2 py-1 font-bold text-slate-700"
                                          value={r.created_by ?? ""}
                                          onChange={(e) => void applyInlineUpdate(gid, r.id, { created_by: e.target.value })}
                                        >
                                          <option value="" disabled>선생님</option>
                                          {teachers.map((t) => (
                                            <option key={t.id} value={t.id}>
                                              {t.name} T
                                            </option>
                                          ))}
                                        </select>
                                      </td>
                                      <td className="px-2 py-2 text-right">
                                        <input
                                          type="number"
                                          className="w-[88px] bg-transparent border rounded-lg px-2 py-1 text-right"
                                          value={Number(r.price) || 0}
                                          onChange={(e) => void applyInlineUpdate(gid, r.id, { price: Number(e.target.value) || 0 })}
                                        />
                                      </td>
                                      <td className="px-2 py-2 text-center">
                                        <span className="inline-flex px-2 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                                          {s.label}
                                        </span>
                                      </td>
                                      <td className="px-2 py-2 text-center">
                                        <button
                                          type="button"
                                          className="px-2.5 py-1.5 rounded-full text-[10px] font-black bg-violet-50 text-violet-600 hover:bg-violet-100"
                                          onClick={() => void handlePostpone(gid, r.id)}
                                        >
                                          연기
                                        </button>
                                      </td>
                                    </tr>
                                  );
                                })}
                            </tbody>
                          </table>
                        </div>

                        <div className="mt-3 border-t border-slate-100 pt-3 space-y-3">
                          <h4 className="text-xs font-black text-slate-700">회차 확장</h4>
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

                        <div className="border-t border-slate-100 pt-3 space-y-3">
                          <h4 className="text-xs font-black text-slate-700">회차 축소/삭제</h4>
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

                        <div className="border-t border-slate-100 pt-3 space-y-3">
                          <h4 className="text-xs font-black text-slate-700">사이클 재시작</h4>
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
                              value={restartStartDateByGroup[gid] ?? new Date().toISOString().split("T")[0]}
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
                                  `${restartStartDateByGroup[gid] ?? new Date().toISOString().split("T")[0]}T${restartStartTimeByGroup[gid] ?? "10:00"}`
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
                      </div>
                    )}
                  </section>
                );
              })}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

