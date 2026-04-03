"use client";

import { useEffect, useMemo, useState, useCallback } from 'react';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import { getSupabaseBrowserClient } from '@/app/lib/supabase/browser';
import { devLogger } from '@/app/lib/logging/devLogger';
import { postponeCascade, undoPostponeCascade } from '@/app/admin/classes-shared/lib/postponeUtils';
import { extendClass } from '@/app/admin/classes-shared/lib/roundExtendUtils';
import { resolvePlannedTotal } from '../lib/plannedRoundTotal';

type DayOption = { label: string; value: number };
const DAYS: DayOption[] = [
  { label: '일', value: 0 },
  { label: '월', value: 1 },
  { label: '화', value: 2 },
  { label: '수', value: 3 },
  { label: '목', value: 4 },
  { label: '금', value: 5 },
  { label: '토', value: 6 },
];

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function toDateInputValueLocal(d: Date) {
  // type="date"는 "로컬 YYYY-MM-DD" 기준으로 동작해야 합니다.
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

type Props = {
  visible: boolean;
  aliasTitle: string;
  groupIds: string[];
  onClose: () => void;
};

type Row = {
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

export default function ClassAliasViewerPanel({
  visible,
  aliasTitle,
  groupIds,
  onClose,
}: Props) {
  const [supabase] = useState(() =>
    typeof window !== 'undefined' ? getSupabaseBrowserClient() : null
  );
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [teachers, setTeachers] = useState<{ id: string; name: string }[]>([]);
  const [baseGroupId, setBaseGroupId] = useState<string>('');
  const [extendCount, setExtendCount] = useState(1);
  const [reindexing, setReindexing] = useState(false);
  const [shrinkCount, setShrinkCount] = useState(1);
  const [shrinking, setShrinking] = useState(false);

  const [restartCount, setRestartCount] = useState(0);
  const [restartIntervalDays, setRestartIntervalDays] = useState(7);
  const [restarting, setRestarting] = useState(false);
  const [restartWeeklyFrequency, setRestartWeeklyFrequency] = useState<1 | 2>(1);
  const [restartStartDate, setRestartStartDate] = useState<string>(toDateInputValueLocal(new Date()));
  const [restartStartTime, setRestartStartTime] = useState<string>('10:00');
  const [restartDaysOfWeek, setRestartDaysOfWeek] = useState<number[]>([new Date().getDay()]);
  const [undoingPostponeSessionId, setUndoingPostponeSessionId] = useState<string | null>(null);
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);
  const [roundView, setRoundView] = useState<'active' | 'all' | 'completed'>('active');

  const load = useCallback(async () => {
    if (!supabase) return;
    if (!visible) return;
    if (!groupIds.length) {
      setRows([]);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('sessions')
        .select(
          'id, group_id, title, start_at, end_at, status, created_by, price, round_index, round_total, sequence_number'
        )
        .in('group_id', groupIds)
        .not('status', 'in', '("deleted")')
        .order('start_at', { ascending: true });
      if (error) throw error;
      setRows((data || []) as Row[]);
    } catch (err) {
      devLogger.error(err);
    } finally {
      setLoading(false);
    }
  }, [supabase, visible, groupIds]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!visible) return;
    if (baseGroupId) return;
    if (groupIds.length === 0) return;
    setBaseGroupId(groupIds[0] ?? '');
  }, [visible, baseGroupId, groupIds]);

  const groupLabelById = useMemo(() => {
    const map: Record<string, string> = {};
    for (const r of rows) {
      const gid = r.group_id;
      if (!map[gid]) map[gid] = r.title || gid;
    }
    return map;
  }, [rows]);

  const baseRows = useMemo(() => {
    if (!baseGroupId) return [];
    return rows.filter((r) => r.group_id === baseGroupId);
  }, [rows, baseGroupId]);

  const timeStatusOf = useCallback((r: { start_at: string; end_at: string; status: string | null }) => {
    const start = new Date(r.start_at);
    const end = new Date(r.end_at);
    const nowMs = Date.now();
    const isPostponed = r.status === 'postponed';
    const isCancelled = r.status === 'cancelled';
    const isDeleted = r.status === 'deleted';
    const statusLabel = isPostponed
      ? '연기'
      : isCancelled
        ? '취소'
        : isDeleted
          ? '삭제'
          : nowMs > end.getTime()
            ? '완료'
            : nowMs >= start.getTime()
              ? '진행중'
              : '예정';
    // ✅ 연기 세션은 "활성(예정/진행)" 표시 범주에 포함합니다.
    const isCompletedByTime = !isPostponed && !isCancelled && !isDeleted && nowMs > end.getTime();
    const isActiveByTime = !isCancelled && !isDeleted && (!isCompletedByTime || isPostponed);
    return { statusLabel, isCompletedByTime, isActiveByTime, isPostponed, isCancelled, isDeleted };
  }, []);

  const cycleEnded = useMemo(() => {
    if (rows.length === 0) return false;
    return rows.every((r) => {
      const { isCompletedByTime, isCancelled, isDeleted } = timeStatusOf(r);
      // ✅ 연기(postponed)는 "끝난 사이클"로 보지 않습니다.
      return isCompletedByTime || isCancelled || isDeleted;
    });
  }, [rows, timeStatusOf]);

  useEffect(() => {
    if (!visible) return;
    if (!cycleEnded) return;
    setRoundView((prev) => (prev === 'all' ? 'active' : prev));
  }, [visible, cycleEnded]);

  const plannedTotal = useMemo(() => resolvePlannedTotal(rows), [rows]);

  const getActiveSessionsSorted = useCallback((rows: Row[]) => {
    return [...rows]
      .filter((r) => r.status !== 'postponed' && r.status !== 'deleted' && r.status !== 'cancelled')
      .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime());
  }, []);

  const statusCounts = useMemo(() => {
    const total = rows.length;
    const postponed = rows.filter((r) => r.status === 'postponed').length;
    const deleted = rows.filter((r) => r.status === 'deleted').length;
    const cancelled = rows.filter((r) => r.status === 'cancelled').length;
    return { total, postponed, deleted, cancelled };
  }, [rows]);

  const visibleRows = useMemo(() => {
    const baseNoDeleted = rows.filter((r) => r.status !== 'deleted');
    if (roundView === 'all') return baseNoDeleted;
    if (roundView === 'completed') return baseNoDeleted.filter((r) => timeStatusOf(r).isCompletedByTime);
    return baseNoDeleted.filter((r) => timeStatusOf(r).isActiveByTime);
  }, [rows, roundView, timeStatusOf]);

  useEffect(() => {
    if (!visible) return;
    if (!baseGroupId) return;
    if (baseRows.length === 0) return;
    setRestartCount(baseRows.length);
    const sorted = [...baseRows].sort(
      (a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime()
    );
    const last = sorted[sorted.length - 1];
    if (last?.start_at) {
      const lastStart = new Date(last.start_at);
      const nextStart = addDays(lastStart, 7);
      setRestartStartDate(toDateInputValueLocal(nextStart));
      setRestartStartTime(nextStart.toTimeString().slice(0, 5));
      setRestartDaysOfWeek([nextStart.getDay()]);
    }
  }, [visible, baseGroupId, baseRows]);

  useEffect(() => {
    if (!supabase) return;
    if (!visible) return;
    const fetchTeachers = async () => {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('id, name')
          .eq('is_active', true)
          .order('name', { ascending: true });
        if (error) throw error;
        setTeachers((data || []) as { id: string; name: string }[]);
      } catch (err) {
        devLogger.error(err);
      }
    };
    void fetchTeachers();
  }, [supabase, visible]);

  const handleInlineUpdate = async (
    sessionId: string,
    patch: { start_at?: string; end_at?: string; price?: number; created_by?: string }
  ) => {
    if (!supabase) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('sessions').update(patch).eq('id', sessionId);
      if (error) throw error;
      toast.success('저장되었습니다.');
      // 로컬 반영
      setRows((prev) =>
        prev.map((r) => (r.id === sessionId ? { ...r, ...(patch as any) } : r))
      );
    } catch (err) {
      devLogger.error(err);
      toast.error('저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handlePostpone = async (sessionId: string) => {
    if (!supabase) return;
    if (!confirm('1주일씩 미루시겠습니까?')) return;
    await postponeCascade(supabase, sessionId, {
      onAfter: () => {
        void load();
      },
    });
  };

  // postponed 상태였던 회차를 원래 일정으로 되돌립니다.
  const handleUndoPostpone = async (sessionId: string) => {
    if (!supabase) return;
    if (!sessionId) return;
    if (undoingPostponeSessionId === sessionId) return;
    if (!confirm('복구하시겠습니까?')) return;

    setUndoingPostponeSessionId(sessionId);
    try {
      await undoPostponeCascade(supabase, sessionId, {
        onAfter: () => {
          void load();
        },
      });
    } catch (err) {
      devLogger.error(err);
      toast.error('일정 복구에 실패했습니다.');
    } finally {
      setUndoingPostponeSessionId(null);
    }
  };

  const handleExtend = async () => {
    if (!supabase || !baseGroupId) return;
    if (extendCount <= 0) return;
    if (!confirm(`${extendCount}회차를 추가하시겠습니까?`)) return;
    await extendClass(supabase, baseGroupId, extendCount, {
      onAfter: () => {
        void load();
      },
    });
  };

  const handleReindexRounds = async () => {
    if (!supabase || !baseGroupId) return;
    const active = getActiveSessionsSorted(baseRows);
    if (active.length <= 1) return;

    const current = active;
    const preview = current
      .slice(0, 6)
      .map((r, i) => `${i + 1}. ${new Date(r.start_at).toLocaleString('ko-KR')}`)
      .join('\n');
    const previewTail = current
      .slice(-6)
      .map((r, i) => `${current.length - 6 + i + 1}. ${new Date(r.start_at).toLocaleString('ko-KR')}`)
      .join('\n');
    if (
      !confirm(
        `현재 날짜 순서(start_at) 기준으로 회차 번호/총회차/표시를 1..N으로 재정렬합니다.\n- round_index, round_total, sequence_number, round_display가 변경됩니다.\n\n미리보기(앞 6개):\n${preview}\n\n미리보기(뒤 6개):\n${previewTail}`
      )
    )
      return;

    setReindexing(true);
    try {
      const sorted = current;
      const total = sorted.length;
      await Promise.all(
        sorted.map((row, i) => {
          return supabase
            .from('sessions')
            .update({
              round_index: i + 1,
              round_total: total,
              sequence_number: i + 1,
              round_display: `${i + 1}/${total}`,
            })
            .eq('id', row.id);
        })
      );
      toast.success('회차가 재정렬되었습니다.');
      void load();
    } catch (err) {
      devLogger.error(err);
      toast.error('회차 재정렬에 실패했습니다.');
    } finally {
      setReindexing(false);
    }
  };

  const handleShrinkTail = async () => {
    if (!supabase || !baseGroupId) return;
    const n = Math.max(1, Math.floor(shrinkCount || 0));
    const active = getActiveSessionsSorted(baseRows);
    if (active.length === 0) return;
    const toRemove = active.slice(-n);
    if (toRemove.length === 0) return;

    const hasPast = toRemove.some((s) => Date.now() > new Date(s.end_at).getTime());
    const msg = hasPast
      ? `⚠ 과거/완료된 회차가 포함됩니다.\n마지막 ${toRemove.length}개 회차를 DB에서 영구 삭제하고 회차 정보를 재계산할까요?`
      : `마지막 ${toRemove.length}개 회차를 DB에서 영구 삭제하고 회차 정보를 재계산할까요?`;
    if (!confirm(msg)) return;

    setShrinking(true);
    try {
      const idsToDelete = toRemove.map((s) => s.id);
      const { error: delErr } = await supabase
        .from('sessions')
        .delete()
        .in('id', idsToDelete);
      if (delErr) throw delErr;

      const remaining = active.filter((s) => !idsToDelete.includes(s.id));
      if (remaining.length > 0) {
        const total = remaining.length;
        await Promise.all(
          remaining.map((row, i) =>
            supabase
              .from('sessions')
              .update({
                round_index: i + 1,
                round_total: total,
                sequence_number: i + 1,
                round_display: `${i + 1}/${total}`,
              })
              .eq('id', row.id)
          )
        );
      }
      toast.success('회차가 축소되었습니다.');
      void load();
    } catch (err) {
      devLogger.error(err);
      toast.error('회차 축소에 실패했습니다.');
    } finally {
      setShrinking(false);
    }
  };

  const handleDeleteSession = async (groupId: string, sessionId: string) => {
    if (!supabase) return;
    if (!groupId || !sessionId) return;
    if (deletingSessionId === sessionId) return;
    if (!confirm("해당 회차를 DB에서 영구 삭제할까요?")) return;

    setDeletingSessionId(sessionId);
    try {
      const { error: delErr } = await supabase.from('sessions').delete().eq('id', sessionId);
      if (delErr) throw delErr;
      // 재정렬 없이 삭제만 — 재정렬 시 cancelled 제외 active 수로 round_total이 줄어
      // 7·8회차가 5·6회차로 바뀌어 사라져 보이는 문제 방지.
      toast.success('회차가 삭제되었습니다.');
      void load();
    } catch (err) {
      devLogger.error(err);
      toast.error('회차 삭제에 실패했습니다.');
    } finally {
      setDeletingSessionId(null);
    }
  };

  const handleRestartCycle = async () => {
    if (!supabase || !baseGroupId) return;
    if (baseRows.length === 0) return;
    const count = Math.max(1, Math.floor(restartCount || 0));
    const intervalDays = Math.max(1, Math.floor(restartIntervalDays || 0));

    const sorted = [...baseRows].sort(
      (a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime()
    );
    const last = sorted[sorted.length - 1];
    const baseStart = new Date(last.start_at);
    const baseEnd = new Date(last.end_at);
    const baseDurationMs = baseEnd.getTime() - baseStart.getTime();
    if (!Number.isFinite(baseDurationMs) || baseDurationMs <= 0) {
      return toast.error('마지막 회차 시간이 올바르지 않아 재시작할 수 없습니다.');
    }

    const nextGroupId = crypto.randomUUID();
    const startFrom = new Date(`${restartStartDate}T${restartStartTime}`);
    if (!Number.isFinite(startFrom.getTime())) return toast.error('시작일/시간이 올바르지 않습니다.');

    const selectedDays =
      restartWeeklyFrequency === 1
        ? [new Date(`${restartStartDate}T${restartStartTime}`).getDay()]
        : restartDaysOfWeek.length
          ? restartDaysOfWeek
          : [new Date(`${restartStartDate}T${restartStartTime}`).getDay()];

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
      restartWeeklyFrequency === 1
        ? Array.from({ length: count }, (_, i) => addDays(startFrom, intervalDays * i))
        : buildDates();

    if (
      !confirm(
        `사이클을 재시작할까요?\n- 기존 회차는 그대로 유지\n- 새 그룹으로 ${count}회차 생성(예정)\n- 시작: ${startFrom.toLocaleString('ko-KR')}\n- 패턴: ${restartWeeklyFrequency === 1 ? `주1회(${intervalDays}일 간격)` : `주2회(요일 ${selectedDays.join(',')})`}\n`
      )
    ) {
      return;
    }

    setRestarting(true);
    try {
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
        const start = dates[i - 1];
        const end = new Date(start.getTime() + baseDurationMs);
        newSessions.push({
          ...insertBase,
          group_id: nextGroupId,
          title: aliasTitle,
          status: 'opened',
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

      const { error } = await supabase.from('sessions').insert(newSessions);
      if (error) throw error;
      toast.success('새 사이클이 생성되었습니다.');
      void load();
    } catch (err) {
      devLogger.error(err);
      toast.error('사이클 재시작에 실패했습니다.');
    } finally {
      setRestarting(false);
    }
  };

  return (
    <div
      className={`fixed inset-0 z-50 transition ${visible ? 'pointer-events-auto' : 'pointer-events-none'}`}
    >
      <div
        className={`absolute inset-0 bg-black/30 transition-opacity ${visible ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />
      <aside
        className={`absolute right-0 top-0 h-full w-full max-w-3xl bg-white shadow-2xl border-l border-slate-100 flex flex-col transition-transform ${
          visible ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <header className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
              Class Detail (V2)
            </p>
            <h2 className="text-lg font-black text-slate-900 truncate">{aliasTitle}</h2>
            <p className="text-xs text-slate-500 font-bold mt-1">
              {groupIds.length}개 그룹 · {rows.length}회차{saving ? ' · 저장 중...' : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-100 text-slate-500"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        <div className="flex-1 overflow-auto p-6 space-y-4">
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h3 className="text-sm font-black text-slate-800">그룹 설정</h3>
                <p className="text-xs text-slate-500 font-bold mt-1">
                  별칭으로 묶인 그룹의 회차를 한 화면에서 편집합니다.
                </p>
                <p className="text-[11px] text-slate-500 font-bold mt-2">
                  전체 {statusCounts.total} · 연기 {statusCounts.postponed} · 취소 {statusCounts.cancelled} · 삭제 {statusCounts.deleted}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <select
                  className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold max-w-[220px]"
                  value={baseGroupId}
                  onChange={(e) => setBaseGroupId(e.target.value)}
                >
                  <option value="" disabled>
                    기준 그룹 선택
                  </option>
                  {groupIds.map((gid) => (
                    <option key={gid} value={gid}>
                      {(groupLabelById[gid] || gid).slice(0, 24)}
                    </option>
                  ))}
                </select>
                <span className="text-[11px] font-black text-slate-400">
                  확장/축소/재시작은 기준 그룹에 적용
                </span>
              </div>
            </div>
          </div>
          {loading ? (
            <div className="flex items-center justify-center h-40 text-slate-400 text-sm font-bold">
              불러오는 중...
            </div>
          ) : rows.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-slate-400 text-sm font-bold">
              표시할 회차가 없습니다.
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-800">회차 목록</h3>
                <div className="flex items-center gap-2">
                  <select
                    className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-[11px] font-black text-slate-700"
                    value={roundView}
                    onChange={(e) => setRoundView(e.target.value as any)}
                  >
                    <option value="active">예정/진행만</option>
                    <option value="all">전체</option>
                    <option value="completed">완료만</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => void handleReindexRounds()}
                    disabled={reindexing || baseRows.length <= 1}
                    className={`px-3 py-1.5 rounded-full text-[11px] font-black border transition ${
                      reindexing || baseRows.length <= 1
                        ? 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {reindexing ? '정렬 중...' : '회차 재정렬'}
                  </button>
                </div>
              </div>

              <div className="overflow-x-hidden rounded-2xl border border-slate-100">
                <table className="w-full table-fixed text-xs">
                  <thead className="bg-slate-50 text-[11px] font-bold text-slate-500">
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
                    {visibleRows.map((r, idx) => {
                      const start = new Date(r.start_at);
                      const end = new Date(r.end_at);
                      const nowMs = Date.now();
                      const dateStr = toDateInputValueLocal(start);
                      const timeStr = start.toTimeString().slice(0, 5);
                      // ✅ V2 운영 규칙: 연기/취소/삭제가 아니라면 end_at 경과 = 무조건 완료(정산 누락 0 전략)
                      const isPostponed = r.status === 'postponed';
                      const isCancelled = r.status === 'cancelled';
                      const isDeleted = r.status === 'deleted';
                      const statusLabel = isPostponed
                        ? '연기'
                        : isCancelled
                          ? '취소'
                          : isDeleted
                            ? '삭제'
                            : nowMs > end.getTime()
                              ? '완료'
                              : nowMs >= start.getTime()
                                ? '진행중'
                                : '예정';
                      return (
                        <tr key={r.id} className="border-t border-slate-100">
                          <td className="px-2 py-2 font-bold text-slate-700">
                            {Math.min(r.round_index ?? idx + 1, plannedTotal)}/{plannedTotal}
                          </td>
                          <td className="px-2 py-2">
                            <input
                              type="date"
                              className="w-[112px] bg-transparent border rounded-lg px-2 py-1"
                              value={dateStr}
                              onChange={(e) => {
                                const [y, m, d] = e.target.value.split('-').map(Number);
                                const startAt = new Date(start);
                                startAt.setFullYear(y, m - 1, d);
                                const duration = (end.getTime() - start.getTime()) / (1000 * 60);
                                const endAt = new Date(startAt);
                                endAt.setMinutes(endAt.getMinutes() + duration);
                                void handleInlineUpdate(r.id, {
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
                                const [hh, mm] = e.target.value.split(':').map(Number);
                                const startAt = new Date(start);
                                startAt.setHours(hh, mm, 0, 0);
                                const duration = (end.getTime() - start.getTime()) / (1000 * 60);
                                const endAt = new Date(startAt);
                                endAt.setMinutes(endAt.getMinutes() + duration);
                                void handleInlineUpdate(r.id, {
                                  start_at: startAt.toISOString(),
                                  end_at: endAt.toISOString(),
                                });
                              }}
                            />
                          </td>
                          <td className="px-2 py-2">
                            <select
                              className="w-[104px] bg-transparent border rounded-lg px-2 py-1 font-bold text-slate-700"
                              value={r.created_by ?? ''}
                              onChange={(e) => {
                                const teacherId = e.target.value;
                                void handleInlineUpdate(r.id, { created_by: teacherId });
                              }}
                            >
                              <option value="" disabled>
                                선생님 선택
                              </option>
                              {teachers.map((t) => (
                                <option key={t.id} value={t.id}>
                                  {t.name} T
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-2 py-2 text-right">
                            <input
                              key={`price-${r.id}-${r.price ?? 0}`}
                              type="number"
                              className="w-[88px] bg-transparent border rounded-lg px-2 py-1 text-right"
                              defaultValue={Number(r.price) || 0}
                              onBlur={(e) => {
                                void handleInlineUpdate(r.id, { price: Number(e.target.value) || 0 });
                              }}
                            />
                          </td>
                          <td className="px-2 py-2 text-center">
                            <span
                              className={`inline-flex px-2 py-1 rounded-full text-[10px] font-bold ${
                                statusLabel === '삭제'
                                  ? 'bg-slate-100 text-slate-700'
                                  : statusLabel === '취소'
                                    ? 'bg-rose-50 text-rose-700'
                                    : statusLabel === '연기'
                                      ? 'bg-purple-50 text-purple-700'
                                      : statusLabel === '완료'
                                        ? 'bg-emerald-50 text-emerald-700'
                                        : statusLabel === '진행중'
                                          ? 'bg-blue-50 text-blue-800 border border-blue-200/70'
                                          : 'bg-amber-50 text-amber-900 border border-amber-200/70'
                              }`}
                            >
                              {statusLabel}
                            </span>
                          </td>
                          <td className="px-2 py-2 text-center">
                            <div className="inline-flex flex-col items-stretch gap-1 min-w-[52px] mx-auto">
                              {r.status === 'postponed' ? (
                                <button
                                  type="button"
                                  className="inline-flex items-center justify-center whitespace-nowrap px-2.5 py-1.5 text-[10px] font-black rounded-full bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50"
                                  disabled={undoingPostponeSessionId === r.id}
                                  onClick={() => void handleUndoPostpone(r.id)}
                                >
                                  {undoingPostponeSessionId === r.id ? '복구 중...' : '연기 취소'}
                                </button>
                              ) : r.status === 'cancelled' || r.status === 'deleted' ? null : (
                                <button
                                  type="button"
                                  className="inline-flex items-center justify-center whitespace-nowrap px-2.5 py-1.5 text-[10px] font-black rounded-full bg-violet-50 text-violet-600 hover:bg-violet-100"
                                  onClick={() => void handlePostpone(r.id)}
                                >
                                  연기
                                </button>
                              )}
                              {r.status !== 'cancelled' && r.status !== 'deleted' && (
                                <button
                                  type="button"
                                  className="inline-flex items-center justify-center whitespace-nowrap px-2.5 py-1.5 text-[10px] font-black rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-50"
                                  disabled={deletingSessionId === r.id || statusLabel === '완료'}
                                  onClick={() => void handleDeleteSession(r.group_id, r.id)}
                                >
                                  {deletingSessionId === r.id ? '삭제 중...' : '삭제'}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* 연기 기록 섹션 제거: 날짜는 메인 테이블에서 전부 표시하고, 연기는 상태로만 표시 */}

              <div className="mt-4 border-t border-slate-100 pt-4 space-y-3">
                <h3 className="text-sm font-black text-slate-800">회차 확장</h3>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    className="w-20 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-sm"
                    value={extendCount}
                    onChange={(e) => setExtendCount(Number(e.target.value) || 1)}
                  />
                  <span className="text-xs text-slate-600">회 추가</span>
                  <button
                    type="button"
                    className="ml-auto px-4 py-2 rounded-full text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                    onClick={() => void handleExtend()}
                    disabled={!baseGroupId}
                  >
                    회차 확장
                  </button>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4 space-y-3">
                <h3 className="text-sm font-black text-slate-800">회차 축소/삭제</h3>
                <p className="text-xs text-slate-500 font-bold">
                  마지막 N회차를 status='deleted'로 숨기고, 남은 회차의 번호/총회차를 재계산합니다.
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    className="w-20 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-sm"
                    value={shrinkCount}
                    onChange={(e) => setShrinkCount(Number(e.target.value) || 1)}
                  />
                  <span className="text-xs text-slate-600">회 줄이기</span>
                  <button
                    type="button"
                    className="ml-auto px-4 py-2 rounded-full text-xs font-bold bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50"
                    disabled={shrinking || !baseGroupId}
                    onClick={() => void handleShrinkTail()}
                  >
                    {shrinking ? '처리 중...' : '마지막 회차 삭제'}
                  </button>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4 space-y-3">
                <h3 className="text-sm font-black text-slate-800">사이클 재시작</h3>
                <p className="text-xs text-slate-500 font-bold">
                  기존 그룹은 그대로 유지하고, 새 그룹을 예정으로 생성합니다.
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  <label className="text-xs font-black text-slate-600">회차</label>
                  <input
                    type="number"
                    min={1}
                    className="w-20 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-sm"
                    value={restartCount}
                    onChange={(e) => setRestartCount(Number(e.target.value) || 1)}
                  />
                  <label className="text-xs font-black text-slate-600 ml-2">패턴</label>
                  <select
                    className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-sm font-bold"
                    value={restartWeeklyFrequency}
                    onChange={(e) => setRestartWeeklyFrequency(Number(e.target.value) === 2 ? 2 : 1)}
                  >
                    <option value={1}>주 1회</option>
                    <option value={2}>주 2회</option>
                  </select>
                  {restartWeeklyFrequency === 1 && (
                    <>
                      <label className="text-xs font-black text-slate-600 ml-2">간격(일)</label>
                      <input
                        type="number"
                        min={1}
                        className="w-20 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-sm"
                        value={restartIntervalDays}
                        onChange={(e) => setRestartIntervalDays(Number(e.target.value) || 7)}
                      />
                    </>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <label className="text-xs font-black text-slate-600">시작일</label>
                  <input
                    type="date"
                    className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-sm"
                    value={restartStartDate}
                    onChange={(e) => setRestartStartDate(e.target.value)}
                  />
                  <label className="text-xs font-black text-slate-600">시간</label>
                  <input
                    type="time"
                    className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-sm"
                    value={restartStartTime}
                    onChange={(e) => setRestartStartTime(e.target.value)}
                  />
                </div>

                {restartWeeklyFrequency === 2 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    {DAYS.map((d) => {
                      const baseDay = new Date(`${restartStartDate}T${restartStartTime}`).getDay();
                      const isSelected = restartDaysOfWeek.includes(d.value);
                      const isBase = d.value === baseDay;
                      return (
                        <button
                          key={d.value}
                          type="button"
                          onClick={() => {
                            setRestartDaysOfWeek((prev) => {
                              const set = new Set(prev);
                              if (set.has(d.value)) set.delete(d.value);
                              else set.add(d.value);
                              const next = Array.from(set).sort((a, b) => a - b);
                              return next.length ? next : [baseDay];
                            });
                          }}
                          className={`px-3 py-1.5 rounded-full text-xs font-black border ${
                            isSelected
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                          } ${isBase ? 'ring-2 ring-blue-100' : ''}`}
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
                    disabled={restarting || !baseGroupId}
                    onClick={() => void handleRestartCycle()}
                  >
                    {restarting ? '생성 중...' : '사이클 재시작'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

