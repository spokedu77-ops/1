'use client';

import { toast } from 'sonner';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { X, Save, Trash2, BookOpen, Calendar, ChevronDown } from 'lucide-react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { TeacherTierBadge } from '@/app/components/admin/TeacherTierBadge';
import {
  cloneTierFeeMap,
  computeTier,
  effectiveFees,
  HARD_CODED_TIER_FEES,
  totalLessonsFromCounts,
  type TierFeeMap,
} from '@/app/lib/teacherTierSchedule';
import { fetchTeacherTierFeeMap } from '@/app/lib/teacherTierFeesStore';

interface Teacher {
  id: string;
  name: string;
  points: number;
  /** 앱 도입 이전 누적 기존값 */
  session_count: number;
  /** 앱 도입 이후 session_count_logs 건수 */
  logCount?: number;
  fee_private?: number | null;
  fee_group?: number | null;
  fee_center_main?: number | null;
  fee_center_assist?: number | null;
}

interface MileageLog {
  id: string;
  teacher_id: string;
  amount: number;
  reason: string;
  session_title: string;
  created_at: string;
  session_id?: string | null;
  session_started_at?: string | null;
}

interface SessionCountLog {
  id: string;
  teacher_id: string;
  session_id: string | null;
  session_title: string;
  count_change: number;
  reason: string;
  created_at: string;
  sessions?: { start_at: string } | null;
}

/** 회차 숫자(1/2, 4/5, 7/10 등) 제거하고 한글 제목만 반환 */
function titleWithoutRound(title: string | null | undefined): string {
  if (!title || !title.trim()) return '';
  return title
    .replace(/^\s*\d+\/\d+\s*/, '')       // 앞의 "7/10 " 제거
    .replace(/\s*[-_]?\s*\d+회차\s*$/i, '')
    .replace(/\s+\d+회\s*$/i, '')
    .replace(/\s+\d+회차\s*$/i, '')
    .trim();
}

function stripTrailingParenDate(text: string): string {
  return text.replace(/\s*\([^()]*\d{4}[^()]*\d{1,2}[^()]*\d{1,2}[^()]*\)\s*$/, '').trim();
}

/** 수업 이름(한글만) + 수업 날짜 괄호 표기 */
function formatSessionWithDate(title: string | null | undefined, dateIso: string): string {
  const clean = stripTrailingParenDate(titleWithoutRound(title));
  const dateStr = new Date(dateIso).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'Asia/Seoul',
  });
  return clean ? `${clean} (${dateStr})` : dateStr;
}

const PENALTY_OPTIONS = [
  { label: '공지 댓글 미등록', value: -5000 },
  { label: '수업 연기 요청', value: -5000 },
  { label: '당일 수업 연기 요청', value: -15000 },
];

interface MileageDetailModalProps {
  teacher: Teacher;
  supabase: SupabaseClient | null;
  onClose: () => void;
  onSaved?: () => void;
}

function SessionCountByMonth({
  logs,
  sessionStartById,
}: {
  logs: SessionCountLog[];
  sessionStartById: Record<string, string>;
}) {
  const [openMonth, setOpenMonth] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const map: Record<string, { total: number; items: SessionCountLog[] }> = {};
    for (const log of logs) {
      const d = new Date(log.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!map[key]) map[key] = { total: 0, items: [] };
      map[key].total += log.count_change;
      map[key].items.push(log);
    }
    return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]));
  }, [logs]);

  if (logs.length === 0) {
    return <div className="py-16 text-center text-slate-200 font-black italic text-sm tracking-tighter uppercase">No session logs found</div>;
  }

  return (
    <div className="space-y-1.5">
      {grouped.map(([monthKey, { total, items }]) => {
        const [y, m] = monthKey.split('-');
        const isOpen = openMonth === monthKey;
        return (
          <div key={monthKey} className="rounded-2xl border border-slate-100 overflow-hidden">
            <button
              onClick={() => setOpenMonth(isOpen ? null : monthKey)}
              className="w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest w-16">{y}.{m}</span>
                <span className="text-sm font-black text-emerald-600">+{total}회</span>
                <span className="text-[9px] text-slate-300 font-bold">{items.length}건</span>
              </div>
              <ChevronDown size={14} className={`text-slate-300 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && (
              <div className="border-t border-slate-50 divide-y divide-slate-50">
                {items.map((log) => (
                  (() => {
                    const resolvedDateIso =
                      (log.session_id ? sessionStartById[log.session_id] : undefined)
                      ?? log.sessions?.start_at
                      ?? log.created_at;
                    return (
                  <div key={log.id} className="flex items-center justify-between px-4 py-2.5 bg-slate-50/50">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-[10px] font-black text-slate-400 shrink-0">
                        {new Date(resolvedDateIso).toLocaleDateString('ko-KR', {
                          month: 'numeric',
                          day: 'numeric',
                          timeZone: 'Asia/Seoul',
                        })}
                      </span>
                      <span className="text-[11px] font-bold text-slate-700 truncate">
                        {formatSessionWithDate(log.session_title, resolvedDateIso)}
                      </span>
                    </div>
                    <span className="text-[10px] font-black text-emerald-500 shrink-0 ml-2">+{log.count_change}</span>
                  </div>
                    );
                  })()
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function MileageDetailModal({ teacher, supabase, onClose, onSaved }: MileageDetailModalProps) {
  const [modalTab, setModalTab] = useState<'mileage' | 'sessions'>('mileage');
  const [teacherLogs, setTeacherLogs] = useState<MileageLog[]>([]);
  const [mileageSessionStartById, setMileageSessionStartById] = useState<Record<string, string>>({});
  const [countSessionStartById, setCountSessionStartById] = useState<Record<string, string>>({});
  const [teacherCountLogs, setTeacherCountLogs] = useState<SessionCountLog[]>([]);
  const [editPointValue, setEditPointValue] = useState<number>(teacher.points || 0);
  const [editSessionCount, setEditSessionCount] = useState<number>(teacher.session_count || 0);
  const [selectedPenalty, setSelectedPenalty] = useState<string>('');
  const [editReason, setEditReason] = useState<string>('');
  const [lastPenaltyLog, setLastPenaltyLog] = useState<MileageLog | null>(null);
  const [tierFeeMap, setTierFeeMap] = useState<TierFeeMap>(() => cloneTierFeeMap(HARD_CODED_TIER_FEES));

  const tierFeePreview = useMemo(() => {
    const tier = computeTier(totalLessonsFromCounts(teacher.session_count, teacher.logCount));
    return effectiveFees(tier, {
      fee_private: teacher.fee_private ?? null,
      fee_group: teacher.fee_group ?? null,
      fee_center_main: teacher.fee_center_main ?? null,
      fee_center_assist: teacher.fee_center_assist ?? null,
    }, tierFeeMap);
  }, [
    teacher.session_count,
    teacher.logCount,
    teacher.fee_private,
    teacher.fee_group,
    teacher.fee_center_main,
    teacher.fee_center_assist,
    tierFeeMap,
  ]);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      const { map: next } = await fetchTeacherTierFeeMap(supabase);
      if (!mounted) return;
      setTierFeeMap(next);
    };
    void run();
    return () => {
      mounted = false;
    };
  }, [supabase]);

  const loadLogs = useCallback(async () => {
    if (!supabase || !teacher?.id) return;
    const { data: mData } = await supabase
      .from('mileage_logs')
      .select('*')
      .eq('teacher_id', teacher.id)
      .order('created_at', { ascending: false });
    if (mData) {
      const logs = mData as MileageLog[];
      setTeacherLogs(logs);
      const ids = Array.from(
        new Set(
          logs
            .map((l) => l.session_id)
            .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
        )
      );
      if (ids.length > 0) {
        const { data: sessions } = await supabase
          .from('sessions')
          .select('id, start_at')
          .in('id', ids);
        const map: Record<string, string> = {};
        (sessions || []).forEach((s) => {
          if (s.id && s.start_at) map[s.id] = s.start_at;
        });
        setMileageSessionStartById(map);
      } else {
        setMileageSessionStartById({});
      }
    }

    const { data: cData } = await supabase
      .from('session_count_logs')
      .select('*, sessions(start_at)')
      .eq('teacher_id', teacher.id)
      .order('created_at', { ascending: false });
    if (cData) {
      const logs = cData as SessionCountLog[];
      setTeacherCountLogs(logs);
      const ids = Array.from(
        new Set(
          logs
            .map((l) => l.session_id)
            .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
        )
      );
      if (ids.length > 0) {
        const { data: sessions } = await supabase
          .from('sessions')
          .select('id, start_at')
          .in('id', ids);
        const map: Record<string, string> = {};
        (sessions || []).forEach((s) => {
          if (s.id && s.start_at) map[s.id] = s.start_at;
        });
        setCountSessionStartById(map);
      } else {
        setCountSessionStartById({});
      }
    }
  }, [supabase, teacher?.id]);

  useEffect(() => {
    setEditPointValue(teacher.points || 0);
    setEditSessionCount(teacher.session_count || 0);
    setSelectedPenalty('');
    setEditReason('');
    setTeacherLogs([]);
    setMileageSessionStartById({});
    setCountSessionStartById({});
    setTeacherCountLogs([]);
    setLastPenaltyLog(null);
    loadLogs();
  }, [teacher, loadLogs]);

  const handleSavePoints = async () => {
    if (!supabase || !teacher) return;
    const prevPoints = teacher.points || 0;
    const nextPoints = editPointValue;
    const diff = nextPoints - prevPoints;
    const prevSessionCount = teacher.session_count || 0;
    const nextSessionCount = editSessionCount;

    if (diff === 0 && prevSessionCount === nextSessionCount) {
      toast.error("변경된 내용이 없습니다.");
      return;
    }

    try {
      const updateData: Record<string, unknown> = {};
      if (diff !== 0) updateData.points = nextPoints;
      if (prevSessionCount !== nextSessionCount) updateData.session_count = nextSessionCount;

      const { error: uError } = await supabase.from('users').update(updateData).eq('id', teacher.id);
      if (uError) throw uError;

      if (diff !== 0) {
        const { error: lError } = await supabase.from('mileage_logs').insert([{
          teacher_id: teacher.id,
          amount: diff,
          reason: editReason || '운영진 수동 조정',
          session_title: '직접 수정'
        }]);
        if (lError) throw lError;
      }

      toast.success("반영되었습니다.");
      onSaved?.();
      onClose();
    } catch (error: unknown) {
      toast.error("실패: " + (error instanceof Error ? error.message : String(error)));
    }
  };

  const handleDeleteLog = async (logId: string) => {
    if (!supabase || !teacher) return;
    const logToDelete = teacherLogs.find(l => l.id === logId);
    if (!logToDelete) return;
    if (!confirm(`이 기록을 삭제하고 마일리지 ${logToDelete.amount > 0 ? '-' : '+'}${Math.abs(logToDelete.amount).toLocaleString()}P를 복구하시겠습니까?`)) return;

    try {
      const { data: user } = await supabase.from('users').select('points').eq('id', teacher.id).single();
      const currentPoints = user?.points ?? 0;
      await supabase.from('users').update({ points: currentPoints - logToDelete.amount }).eq('id', teacher.id);
      const { error } = await supabase.from('mileage_logs').delete().eq('id', logId);
      if (error) throw error;
      // [취소] 로그는 남기지 않음 (운영진 조치)
      setTeacherLogs(prev => prev.filter(l => l.id !== logId));
      onSaved?.();
      toast.success('마일리지가 복구되었습니다.');
    } catch (error: unknown) {
      toast.error("취소 실패: " + (error instanceof Error ? error.message : String(error)));
    }
  };

  const handleQuickPenalty = async () => {
    if (!supabase || !teacher || !selectedPenalty) return;
    const penalty = PENALTY_OPTIONS.find(p => p.label === selectedPenalty);
    if (!penalty) return;
    if (!confirm(`${teacher.name} 강사에게 ${penalty.label} (${penalty.value.toLocaleString()}P)를 차감하시겠습니까?`)) return;

    try {
      const { data: user } = await supabase.from('users').select('points').eq('id', teacher.id).single();
      const currentPoints = user?.points ?? 0;
      await supabase.from('users').update({ points: currentPoints + penalty.value }).eq('id', teacher.id);
      const { data: newLog } = await supabase.from('mileage_logs').insert([{
        teacher_id: teacher.id,
        amount: penalty.value,
        reason: `[Penalty] ${penalty.label}`,
        session_title: '운영진 조치'
      }]).select().single();
      if (newLog) setLastPenaltyLog(newLog as MileageLog);
      toast.success('차감이 완료되었습니다.');
      onSaved?.();
      loadLogs();
    } catch (error: unknown) {
      toast.error('차감 실패: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  const handleUndoPenalty = async () => {
    if (!supabase || !teacher || !lastPenaltyLog) return;
    if (!confirm(`최근 Penalty (${lastPenaltyLog.amount.toLocaleString()}P)를 취소하시겠습니까?`)) return;

    try {
      const { data: user } = await supabase.from('users').select('points').eq('id', teacher.id).single();
      const currentPoints = user?.points ?? 0;
      await supabase.from('users').update({ points: currentPoints - lastPenaltyLog.amount }).eq('id', teacher.id);
      const { error } = await supabase.from('mileage_logs').delete().eq('id', lastPenaltyLog.id);
      if (error) throw error;
      // [취소] 로그는 남기지 않음 (운영진 조치)
      setLastPenaltyLog(null);
      toast.success('Penalty가 취소되었습니다.');
      onSaved?.();
      loadLogs();
    } catch (error: unknown) {
      toast.error('취소 실패: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  const cleanReason = (reason: string) => {
    if (!reason) return '';
    return reason.replace(/\[수업연동\]\s(원복|차감):\s/, '').trim();
  };

  return (
    <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 cursor-default" onClick={onClose}>
      <div className="bg-white w-full max-w-xl rounded-t-[32px] sm:rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        <div className="p-6 sm:p-8 overflow-y-auto">
          <div className="flex justify-between items-start mb-6">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h2 className="text-xl font-black text-slate-950 italic uppercase tracking-tighter">{teacher.name} T</h2>
                <TeacherTierBadge sessionCount={teacher.session_count} logCount={teacher.logCount} />
              </div>
              <p className="text-blue-600 font-black text-2xl mt-1">{(teacher.points || 0).toLocaleString()} <span className="text-xs">P</span></p>
              <p className="text-slate-400 font-bold text-sm mt-1 flex items-center gap-1 flex-wrap">
                <BookOpen size={14} /> {((teacher.session_count || 0) + (teacher.logCount || 0)).toLocaleString()}회 수업 완료
                {teacher.logCount !== undefined && teacher.logCount > 0 && (
                  <span className="text-[10px] text-slate-300 ml-1">(기존 {(teacher.session_count || 0)} + 신규 {teacher.logCount})</span>
                )}
              </p>
              <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-[10px] font-bold text-slate-600">
                <span className="text-slate-400 font-black uppercase tracking-wider">적용 기본 수업료</span>
                <div className="mt-1 grid grid-cols-2 gap-x-2 gap-y-0.5">
                  <span className="text-slate-400">개인</span>
                  <span>{tierFeePreview.fee_private.toLocaleString()}원</span>
                  <span className="text-slate-400">그룹</span>
                  <span>{tierFeePreview.fee_group.toLocaleString()}원</span>
                  <span className="text-slate-400">센터 메인</span>
                  <span>{tierFeePreview.fee_center_main.toLocaleString()}원</span>
                  <span className="text-slate-400">센터 보조</span>
                  <span>{tierFeePreview.fee_center_assist.toLocaleString()}원</span>
                </div>
              </div>
            </div>
            <button onClick={onClose} className="min-h-[44px] min-w-[44px] hover:bg-slate-100 p-2 rounded-full transition-colors cursor-pointer text-slate-400 flex items-center justify-center touch-manipulation"><X size={20}/></button>
          </div>

          <div className="mb-4 space-y-3">
            <div>
              <div className="p-1.5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-3">마일리지</span>
                <input
                  type="number"
                  value={editPointValue}
                  onChange={(e) => setEditPointValue(Number(e.target.value))}
                  className="flex-1 bg-transparent px-4 py-2 font-black text-blue-600 text-lg outline-none cursor-text"
                />
              </div>
              <div className="mt-2 p-1.5 bg-blue-50 rounded-xl border border-blue-100 flex items-center gap-2">
                <span className="text-[9px] font-bold text-blue-600 uppercase tracking-wider px-3">마일리지 변경 사유</span>
                <input
                  type="text"
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  placeholder="예: 베스트 수업안 보너스, 보고 누락 차감 등"
                  className="flex-1 bg-transparent px-4 py-2 font-bold text-blue-700 text-sm outline-none cursor-text"
                />
              </div>
            </div>
            <div className="p-1.5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-2">
              <div className="px-3">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">기존 수업 수</span>
                {(teacher.logCount ?? 0) > 0 && (
                  <p className="text-[9px] text-slate-300 mt-0.5">신규 {teacher.logCount}회 별도 합산</p>
                )}
              </div>
              <input
                type="number"
                value={editSessionCount}
                onChange={(e) => setEditSessionCount(Number(e.target.value))}
                className="flex-1 bg-transparent px-4 py-2 font-black text-emerald-600 text-lg outline-none cursor-text"
              />
            </div>
          </div>

          <button onClick={handleSavePoints} className="w-full bg-slate-900 text-white px-5 py-3.5 rounded-xl font-black text-xs flex items-center justify-center gap-2 hover:bg-blue-600 transition-all shadow-md cursor-pointer mb-6">
            <Save size={14}/> 변경사항 저장
          </button>

          <div className="border-t border-slate-100 pt-6 mb-8">
            <h4 className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-3">Penalty</h4>
            <div className="space-y-2">
              <select
                value={selectedPenalty}
                onChange={(e) => setSelectedPenalty(e.target.value)}
                className="w-full bg-red-50 border-2 border-red-100 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-red-600 cursor-pointer"
              >
                <option value="">차감 항목 선택</option>
                {PENALTY_OPTIONS.map(option => (
                  <option key={option.label} value={option.label}>
                    {option.label} ({option.value.toLocaleString()}P)
                  </option>
                ))}
              </select>
              <div className="flex gap-2">
                <button
                  onClick={handleQuickPenalty}
                  disabled={!selectedPenalty}
                  className="flex-1 bg-red-600 text-white px-5 py-3.5 rounded-xl font-black text-xs flex items-center justify-center gap-2 hover:bg-red-700 transition-all shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  차감 실행
                </button>
                <button
                  onClick={handleUndoPenalty}
                  disabled={!lastPenaltyLog}
                  className="px-5 py-3.5 bg-orange-100 text-orange-700 rounded-xl font-black text-xs hover:bg-orange-200 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                  title="최근 Penalty 취소"
                >
                  롤백
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2 px-1">
              <Calendar size={14} className="text-slate-300"/>
              <h3 className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Activity History</h3>
            </div>

            <div className="flex gap-2 bg-slate-50 rounded-xl p-1">
              <button
                onClick={() => setModalTab('mileage')}
                className={`flex-1 py-2 px-3 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                  modalTab === 'mileage' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                마일리지
              </button>
              <button
                onClick={() => setModalTab('sessions')}
                className={`flex-1 py-2 px-3 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                  modalTab === 'sessions' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                수업 카운팅
              </button>
            </div>

            {modalTab === 'mileage' && (
              (() => {
                const visibleLogs = teacherLogs.filter((log) => !log.reason?.includes('[취소]'));
                return visibleLogs.length > 0 ? (
                visibleLogs.map((log) => (
                  <div key={log.id} className="flex items-center justify-between p-4 rounded-2xl border border-slate-50 bg-white shadow-sm hover:border-blue-100 transition-all">
                    <div className="flex items-center gap-4 sm:gap-6">
                      <div className={`text-sm font-black w-20 sm:w-24 ${log.amount >= 0 ? 'text-blue-600' : 'text-red-500'}`}>
                        {log.amount > 0 ? '+' : ''}{log.amount.toLocaleString()}P
                      </div>
                      <div className="hidden xs:block h-6 w-[1px] bg-slate-100"></div>
                      <div>
                        <p className="text-[11px] font-black text-slate-800 leading-tight">
                          {formatSessionWithDate(
                            log.session_title,
                            (log.session_id ? mileageSessionStartById[log.session_id] : undefined)
                              ?? log.session_started_at
                              ?? log.created_at
                          )}
                        </p>
                        <p className="text-[9px] font-bold text-slate-400 mt-0.5">{cleanReason(log.reason)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[9px] font-bold text-slate-300 tabular-nums whitespace-nowrap">{new Date(log.created_at).toLocaleDateString()}</span>
                      <button onClick={() => handleDeleteLog(log.id)} className="text-slate-200 hover:text-red-500 transition-colors p-1 cursor-pointer">
                        <Trash2 size={14}/>
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-16 text-center text-slate-200 font-black italic text-sm tracking-tighter uppercase">No mileage logs found</div>
              );
              })()
            )}

            {modalTab === 'sessions' && (
              <SessionCountByMonth logs={teacherCountLogs} sessionStartById={countSessionStartById} />
            )}
          </div>
        </div>
        <div className="p-6 pt-0">
          <button onClick={onClose} className="w-full py-4 bg-slate-100 text-slate-900 rounded-2xl font-black text-xs hover:bg-slate-200 transition-all cursor-pointer">CLOSE</button>
        </div>
      </div>
    </div>
  );
}
