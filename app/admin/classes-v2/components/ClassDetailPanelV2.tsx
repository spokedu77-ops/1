"use client";

import { useEffect, useState, useCallback, useMemo } from 'react';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import { getSupabaseBrowserClient } from '@/app/lib/supabase/browser';
import { devLogger } from '@/app/lib/logging/devLogger';
import type { EditableSession } from '../../classes/types';
import { postponeCascade } from '../../classes/lib/postponeUtils';
import { extendClass } from '../../classes/lib/roundExtendUtils';

interface ClassDetailPanelProps {
  groupId: string | null;
  onClose: () => void;
  onChanged?: () => void;
}

interface SessionRow {
  id: string;
  title: string;
  start_at: string;
  end_at: string;
  status: string | null;
  created_by: string;
  price: number;
  round_index: number | null;
  round_total: number | null;
  sequence_number?: number | null;
  memo?: string | null;
  session_type?: string | null;
  mileage_option?: string | null;
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

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

export default function ClassDetailPanelV2({ groupId, onClose, onChanged }: ClassDetailPanelProps) {
  const [supabase] = useState(() =>
    typeof window !== 'undefined' ? getSupabaseBrowserClient() : null
  );
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [teachers, setTeachers] = useState<{ id: string; name: string }[]>([]);
  const [bulkTeacherId, setBulkTeacherId] = useState<string>('');
  const [bulkTeacherApplying, setBulkTeacherApplying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [extendCount, setExtendCount] = useState(1);
  const [reindexing, setReindexing] = useState(false);

  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [savingTitle, setSavingTitle] = useState(false);

  const [restartCount, setRestartCount] = useState(0);
  const [restartIntervalDays, setRestartIntervalDays] = useState(7);
  const [restarting, setRestarting] = useState(false);
  const [restartWeeklyFrequency, setRestartWeeklyFrequency] = useState<1 | 2>(1);
  const [restartStartDate, setRestartStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [restartStartTime, setRestartStartTime] = useState<string>('10:00');
  const [restartDaysOfWeek, setRestartDaysOfWeek] = useState<number[]>([new Date().getDay()]);

  const [shrinkCount, setShrinkCount] = useState(1);
  const [shrinking, setShrinking] = useState(false);
  const [roundView, setRoundView] = useState<'active' | 'all' | 'completed'>('all');
  const [restoringDeleted, setRestoringDeleted] = useState(false);

  const loadSessions = useCallback(async () => {
    if (!supabase || !groupId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('sessions')
        .select(
          'id, title, start_at, end_at, status, created_by, price, round_index, round_total, sequence_number, memo, session_type, mileage_option'
        )
        .eq('group_id', groupId)
        .order('start_at', { ascending: true });
      if (error) throw error;
      const list = (data || []) as SessionRow[];
      setSessions(list);
      setTitleDraft(list[0]?.title ?? '');
      setRestartCount(list.length);
      setBulkTeacherId(list.find((s) => s.created_by)?.created_by ?? '');

      // 사이클 재시작 기본값: 마지막 회차 다음 주(기본 7일 후), 동일 시간
      const last = list[list.length - 1];
      if (last?.start_at) {
        const lastStart = new Date(last.start_at);
        const nextStart = addDays(lastStart, 7);
        setRestartStartDate(nextStart.toISOString().split('T')[0]);
        setRestartStartTime(nextStart.toTimeString().slice(0, 5));
        setRestartDaysOfWeek([nextStart.getDay()]);
      }
    } catch (err) {
      devLogger.error(err);
    } finally {
      setLoading(false);
    }
  }, [supabase, groupId]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  useEffect(() => {
    if (!supabase) return;
    const fetchTeachers = async () => {
      try {
        const { data } = await supabase
          .from('users')
          .select('id, name')
          .eq('is_active', true)
          .order('name', { ascending: true });
        if (data) setTeachers(data as { id: string; name: string }[]);
      } catch (err) {
        devLogger.error(err);
      }
    };
    fetchTeachers();
  }, [supabase]);

  const handleInlineUpdate = async (idx: number, patch: Partial<EditableSession>) => {
    if (!supabase) return;
    const target = sessions[idx];
    if (!target) return;
    const start = patch.startAt ? patch.startAt : new Date(target.start_at);
    const end = patch.endAt ? patch.endAt : new Date(target.end_at);
    const price = patch.price ?? target.price;
    const teacherId = patch.teacherId ?? target.created_by;

    try {
      const { error } = await supabase
        .from('sessions')
        .update({
          start_at: start.toISOString(),
          end_at: end.toISOString(),
          price,
          created_by: teacherId,
        })
        .eq('id', target.id);
      if (error) throw error;
      onChanged?.();
      const next = [...sessions];
      next[idx] = {
        ...target,
        start_at: start.toISOString(),
        end_at: end.toISOString(),
        price,
        created_by: teacherId,
      };
      setSessions(next);
    } catch (err) {
      devLogger.error(err);
    }
  };

  const handlePostpone = async (sessionId: string) => {
    if (!supabase) return;
    if (!confirm('1주일씩 미루시겠습니까?')) return;
    await postponeCascade(supabase, sessionId, {
      onAfter: () => {
        onChanged?.();
        loadSessions();
      },
    });
  };

  const handleExtend = async () => {
    if (!supabase || !groupId) return;
    if (extendCount <= 0) return;
    if (!confirm(`${extendCount}회차를 추가하시겠습니까?`)) return;
    await extendClass(supabase, groupId, extendCount, {
      onAfter: () => {
        onChanged?.();
        loadSessions();
      },
    });
  };

  const handleReindexRounds = async () => {
    if (!supabase || !groupId) return;
    if (sessions.length <= 1) return;
    const current = [...sessions].sort(
      (a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime()
    );
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
      const sorted = [...sessions].sort(
        (a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime()
      );
      const total = sorted.length;

      await Promise.all(
        sorted.map((row, i) => {
          return supabase
            .from('sessions')
            .update({
              round_index: i + 1,
              round_total: total,
              sequence_number: i + 1,
            })
            .eq('id', row.id);
        })
      );

      onChanged?.();
      loadSessions();
    } catch (err) {
      devLogger.error(err);
    } finally {
      setReindexing(false);
    }
  };

  const handleShrinkTail = async () => {
    if (!supabase || !groupId) return;
    const n = Math.max(1, Math.floor(shrinkCount || 0));
    if (sessions.length === 0) return;

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

    setShrinking(true);
    try {
      const idsToDelete = toRemove.map((s) => s.id);
      const { error: delErr } = await supabase.from('sessions').update({ status: 'deleted' }).in('id', idsToDelete);
      if (delErr) throw delErr;

      const remaining = sorted.filter((s) => !idsToDelete.includes(s.id));
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

      toast.success('회차가 축소되었습니다.');
      onChanged?.();
      loadSessions();
    } catch (err) {
      devLogger.error(err);
      toast.error('회차 축소에 실패했습니다.');
    } finally {
      setShrinking(false);
    }
  };

  const visible = !!groupId;
  const title = sessions[0]?.title || '수업 상세';

  const canSaveTitle = useMemo(() => titleDraft.trim().length > 0, [titleDraft]);

  const timeStatusOf = useCallback((s: { start_at: string; end_at: string; status: string | null }) => {
    const start = new Date(s.start_at);
    const end = new Date(s.end_at);
    const nowMs = Date.now();
    const isPostponed = s.status === 'postponed';
    const isCancelled = s.status === 'cancelled';
    const isDeleted = s.status === 'deleted';
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
    if (sessions.length === 0) return false;
    return sessions.every((s) => {
      const { isCompletedByTime, isCancelled, isDeleted } = timeStatusOf(s);
      // ✅ 연기(postponed)는 "끝난 사이클"로 보지 않습니다. (연기 일정도 다시 진행해야 함)
      return isCompletedByTime || isCancelled || isDeleted;
    });
  }, [sessions, timeStatusOf]);

  useEffect(() => {
    if (!visible) return;
    if (!cycleEnded) return;
    setRoundView((prev) => (prev === 'all' ? 'active' : prev));
  }, [visible, cycleEnded]);

  const plannedTotal = useMemo(() => {
    // ✅ 분모(총회차)는 "연기 제외"한 원래 회차만으로 유지
    const baseAll = sessions.filter(
      (s) => s.status !== 'postponed' && s.status !== 'deleted' && s.status !== 'cancelled'
    );
    const indices = baseAll
      .map((s) => s.round_index)
      .filter((v): v is number => typeof v === 'number');
    if (indices.length) return Math.max(...indices);
    return Math.max(1, baseAll.length || sessions.length);
  }, [sessions]);

  const statusCounts = useMemo(() => {
    const total = sessions.length;
    const postponed = sessions.filter((s) => s.status === 'postponed').length;
    const deleted = sessions.filter((s) => s.status === 'deleted').length;
    const cancelled = sessions.filter((s) => s.status === 'cancelled').length;
    return { total, postponed, deleted, cancelled };
  }, [sessions]);

  const visibleSessions = useMemo(() => {
    // ✅ 날짜는 전부 보여준다 (deleted/cancelled 제외). 연기는 상태만 연기로.
    const baseAll = sessions.filter((s) => s.status !== 'deleted' && s.status !== 'cancelled');
    if (roundView === 'all') return baseAll;
    if (roundView === 'completed') return baseAll.filter((s) => timeStatusOf(s).isCompletedByTime);
    return baseAll.filter((s) => timeStatusOf(s).isActiveByTime);
  }, [sessions, roundView, timeStatusOf]);

  const handleSaveTitle = async () => {
    if (!supabase || !groupId) return;
    const nextTitle = titleDraft.trim();
    if (!nextTitle) return toast.error('수업명을 입력해주세요.');
    if (!confirm(`그룹의 모든 회차 수업명을 "${nextTitle}"로 변경할까요?`)) return;

    setSavingTitle(true);
    try {
      const { error } = await supabase.from('sessions').update({ title: nextTitle }).eq('group_id', groupId);
      if (error) throw error;
      toast.success('수업명이 변경되었습니다.');
      setEditingTitle(false);
      onChanged?.();
      loadSessions();
    } catch (err: unknown) {
      devLogger.error(err);
      toast.error('수업명 변경에 실패했습니다.');
    } finally {
      setSavingTitle(false);
    }
  };

  const handleApplyTeacherToGroup = async () => {
    if (!supabase || !groupId) return;
    const nextTeacherId = String(bulkTeacherId || '').trim();
    if (!nextTeacherId) return toast.error('선생님을 선택해주세요.');
    if (!confirm('그룹의 모든 회차 선생님을 변경할까요?')) return;

    setBulkTeacherApplying(true);
    try {
      const { error } = await supabase.from('sessions').update({ created_by: nextTeacherId }).eq('group_id', groupId);
      if (error) throw error;
      toast.success('선생님이 변경되었습니다.');
      onChanged?.();
      loadSessions();
    } catch (err) {
      devLogger.error(err);
      toast.error('선생님 변경에 실패했습니다.');
    } finally {
      setBulkTeacherApplying(false);
    }
  };

  const handleRestoreDeleted = async () => {
    if (!supabase || !groupId) return;
    if (!confirm("status='deleted'로 숨겨진 회차를 복구할까요?")) return;
    setRestoringDeleted(true);
    try {
      const { error } = await supabase
        .from('sessions')
        .update({ status: 'opened' })
        .eq('group_id', groupId)
        .eq('status', 'deleted');
      if (error) throw error;
      toast.success('삭제된 회차가 복구되었습니다.');
      onChanged?.();
      loadSessions();
    } catch (err) {
      devLogger.error(err);
      toast.error('복구에 실패했습니다.');
    } finally {
      setRestoringDeleted(false);
    }
  };

  const handleRestartCycle = async () => {
    if (!supabase || !groupId) return;
    if (sessions.length === 0) return;
    const count = Math.max(1, Math.floor(restartCount || 0));
    const intervalDays = Math.max(1, Math.floor(restartIntervalDays || 0));

    const last = sessions[sessions.length - 1];
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
        // fallback: 주1회 간격 기반으로라도 전진
        if (restartWeeklyFrequency === 1 && selectedDays.length === 1) {
          // no-op
        }
      }
      return dates;
    };

    const dates = restartWeeklyFrequency === 1 ? Array.from({ length: count }, (_, i) => addDays(startFrom, intervalDays * i)) : buildDates();

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
          title: titleDraft.trim() || title,
          status: 'opened',
          start_at: start.toISOString(),
          end_at: end.toISOString(),
          // 피드백/첨부 초기화(기존 extendClass와 동일 의도)
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
      onChanged?.();
    } catch (err: unknown) {
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
            {!editingTitle ? (
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-slate-900 truncate">{title}</h2>
                <button
                  type="button"
                  onClick={() => setEditingTitle(true)}
                  className="px-2 py-1 rounded-full text-[11px] font-black bg-slate-100 text-slate-700 hover:bg-slate-200"
                >
                  수업명 수정
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold"
                  value={titleDraft}
                  onChange={(e) => setTitleDraft(e.target.value)}
                  placeholder="수업명을 입력하세요"
                />
                <button
                  type="button"
                  disabled={!canSaveTitle || savingTitle}
                  onClick={handleSaveTitle}
                  className="px-3 py-2 rounded-full text-xs font-black bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {savingTitle ? '저장 중...' : '저장'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingTitle(false);
                    setTitleDraft(title);
                  }}
                  className="px-3 py-2 rounded-full text-xs font-black bg-slate-100 text-slate-700 hover:bg-slate-200"
                >
                  취소
                </button>
              </div>
            )}
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
                  수업명/선생님 변경은 그룹 전체에 적용됩니다.
                </p>
                <p className="text-[11px] text-slate-500 font-bold mt-2">
                  전체 {statusCounts.total} · 연기 {statusCounts.postponed} · 취소 {statusCounts.cancelled} · 삭제 {statusCounts.deleted}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <select
                  className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold"
                  value={bulkTeacherId}
                  onChange={(e) => setBulkTeacherId(e.target.value)}
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
                  onClick={handleApplyTeacherToGroup}
                  disabled={bulkTeacherApplying}
                  className="px-3 py-2 rounded-full text-xs font-black bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  {bulkTeacherApplying ? '적용 중...' : '선생님 변경'}
                </button>
                <button
                  type="button"
                  onClick={handleRestoreDeleted}
                  disabled={restoringDeleted}
                  className="px-3 py-2 rounded-full text-xs font-black bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-50"
                >
                  {restoringDeleted ? '복구 중...' : '삭제 복구'}
                </button>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-40 text-slate-400 text-sm font-bold">
              불러오는 중...
            </div>
          ) : (
            <>
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
                    onClick={handleReindexRounds}
                    disabled={reindexing || visibleSessions.length <= 1}
                    className={`px-3 py-1.5 rounded-full text-[11px] font-black border transition ${
                      reindexing || visibleSessions.length <= 1
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
                    {visibleSessions.map((s, idx) => {
                      const start = new Date(s.start_at);
                      const end = new Date(s.end_at);
                      const nowMs = Date.now();
                      const dateStr = start.toISOString().split('T')[0];
                      const timeStr = start.toTimeString().slice(0, 5);
                      // ✅ V2 운영 규칙: 연기/취소/삭제가 아니라면 end_at 경과 = 무조건 완료(정산 누락 0 전략)
                      const isPostponed = s.status === 'postponed';
                      const isCancelled = s.status === 'cancelled';
                      const isDeleted = s.status === 'deleted';
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
                        <tr key={s.id} className="border-t border-slate-100">
                          <td className="px-2 py-2 font-bold text-slate-700">
                            {Math.min(s.round_index ?? idx + 1, plannedTotal)}/{plannedTotal}
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
                                const globalIdx = sessions.findIndex((x) => x.id === s.id);
                                handleInlineUpdate(globalIdx, { startAt, endAt });
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
                                const globalIdx = sessions.findIndex((x) => x.id === s.id);
                                handleInlineUpdate(globalIdx, { startAt, endAt });
                              }}
                            />
                          </td>
                          <td className="px-2 py-2">
                            <select
                              className="w-[104px] bg-transparent border rounded-lg px-2 py-1 font-bold text-slate-700"
                              value={s.created_by}
                              onChange={(e) => {
                                const teacherId = e.target.value;
                                const globalIdx = sessions.findIndex((x) => x.id === s.id);
                                handleInlineUpdate(globalIdx, { teacherId });
                              }}
                            >
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
                              value={s.price ?? 0}
                              onChange={(e) =>
                                handleInlineUpdate(sessions.findIndex((x) => x.id === s.id), { price: Number(e.target.value) || 0 })
                              }
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
                                    ? 'bg-blue-50 text-blue-700'
                                    : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {statusLabel}
                            </span>
                          </td>
                          <td className="px-2 py-2 text-center">
                            <div className="inline-flex items-center justify-center whitespace-nowrap min-w-[52px]">
                              <button
                                type="button"
                                className="inline-flex items-center justify-center whitespace-nowrap px-2.5 py-1.5 text-[10px] font-black rounded-full bg-violet-50 text-violet-600 hover:bg-violet-100"
                                onClick={() => handlePostpone(s.id)}
                              >
                                연기
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 연기 기록 섹션 제거: 날짜는 메인 테이블에서 전부 표시하고, 연기는 상태로만 표시 */}
            </>
          )}

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
                className="ml-auto px-4 py-2 rounded-full text-xs font-bold bg-blue-600 text-white hover:bg-blue-700"
                onClick={handleExtend}
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
                disabled={shrinking}
                onClick={handleShrinkTail}
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
              <div className="space-y-2">
                <div className="text-xs font-black text-slate-600">요일 선택</div>
                <div className="flex gap-2">
                  {DAYS.map((d) => {
                    const baseDay = new Date(`${restartStartDate}T${restartStartTime}`).getDay();
                    const isBase = d.value === baseDay;
                    const isSelected = restartDaysOfWeek.includes(d.value);
                    return (
                      <button
                        key={d.value}
                        type="button"
                        onClick={() => {
                          if (isBase) return;
                          setRestartDaysOfWeek((prev) => {
                            const next = prev.includes(d.value)
                              ? prev.filter((x) => x !== d.value)
                              : [...prev, d.value].sort((a, b) => a - b);
                            return next;
                          });
                        }}
                        disabled={isBase}
                        className={`flex-1 py-2 rounded-lg text-xs font-black transition-all ${
                          isBase
                            ? 'bg-blue-600 text-white cursor-not-allowed'
                            : isSelected
                              ? 'bg-slate-900 text-white'
                              : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'
                        }`}
                      >
                        {d.label}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-slate-500 font-bold">
                  시작일 요일은 자동 포함(고정)이며, 추가 요일을 선택하면 주 2회로 생성됩니다.
                </p>
              </div>
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                className="ml-auto px-4 py-2 rounded-full text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50"
                disabled={restarting}
                onClick={handleRestartCycle}
              >
                {restarting ? '생성 중...' : '사이클 재시작'}
              </button>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}

