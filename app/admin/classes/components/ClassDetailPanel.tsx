"use client";

import { useEffect, useState, useCallback } from 'react';
import { X } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/app/lib/supabase/browser';
import { devLogger } from '@/app/lib/logging/devLogger';
import type { EditableSession } from '../types';
import { postponeCascade } from '../lib/postponeUtils';
import { extendClass } from '../lib/roundExtendUtils';

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
}

export default function ClassDetailPanel({
  groupId,
  onClose,
  onChanged,
}: ClassDetailPanelProps) {
  const [supabase] = useState(() =>
    typeof window !== 'undefined' ? getSupabaseBrowserClient() : null
  );
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [extendCount, setExtendCount] = useState(1);

  const loadSessions = useCallback(async () => {
    if (!supabase || !groupId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('sessions')
        .select(
          'id, title, start_at, end_at, status, created_by, price, round_index, round_total'
        )
        .eq('group_id', groupId)
        .order('start_at', { ascending: true });
      if (error) throw error;
      setSessions((data || []) as SessionRow[]);
    } catch (err) {
      devLogger.error(err);
    } finally {
      setLoading(false);
    }
  }, [supabase, groupId]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

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
      if (onChanged) onChanged();
      // 로컬 세션 갱신
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

  const visible = !!groupId;
  const title = sessions[0]?.title || '수업 상세';

  return (
    <div
      className={`fixed inset-0 z-50 transition ${
        visible ? 'pointer-events-auto' : 'pointer-events-none'
      }`}
    >
      <div
        className={`absolute inset-0 bg-black/30 transition-opacity ${
          visible ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
      />
      <aside
        className={`absolute right-0 top-0 h-full w-full max-w-xl bg-white shadow-2xl border-l border-slate-100 flex flex-col transition-transform ${
          visible ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <header className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
              Class Detail
            </p>
            <h2 className="text-lg font-black text-slate-900 truncate">{title}</h2>
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
          {loading ? (
            <div className="flex items-center justify-center h-40 text-slate-400 text-sm font-bold">
              불러오는 중...
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-800">회차 목록</h3>
              </div>
              <div className="overflow-x-auto rounded-2xl border border-slate-100">
                <table className="min-w-full text-xs">
                  <thead className="bg-slate-50 text-[11px] font-bold text-slate-500">
                    <tr>
                      <th className="px-3 py-2 text-left">회차</th>
                      <th className="px-3 py-2 text-left">날짜</th>
                      <th className="px-3 py-2 text-left">시간</th>
                      <th className="px-3 py-2 text-right">금액</th>
                      <th className="px-3 py-2 text-center">상태</th>
                      <th className="px-3 py-2 text-center">액션</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.map((s, idx) => {
                      const start = new Date(s.start_at);
                      const end = new Date(s.end_at);
                      const dateStr = start.toISOString().split('T')[0];
                      const timeStr = start.toTimeString().slice(0, 5);
                      const statusLabel =
                        s.status === 'finished'
                          ? '완료'
                          : s.status === 'cancelled'
                          ? '취소'
                          : s.status === 'postponed'
                          ? '연기'
                          : '예정';
                      return (
                        <tr key={s.id} className="border-t border-slate-100">
                          <td className="px-3 py-2 font-bold text-slate-700">
                            {s.round_index}/{s.round_total}
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="date"
                              className="bg-transparent border rounded-lg px-2 py-1"
                              value={dateStr}
                              onChange={(e) => {
                                const [y, m, d] = e.target.value.split('-').map(Number);
                                const startAt = new Date(start);
                                startAt.setFullYear(y, m - 1, d);
                                const duration =
                                  (end.getTime() - start.getTime()) / (1000 * 60);
                                const endAt = new Date(startAt);
                                endAt.setMinutes(endAt.getMinutes() + duration);
                                handleInlineUpdate(idx, { startAt, endAt });
                              }}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="time"
                              className="bg-transparent border rounded-lg px-2 py-1"
                              value={timeStr}
                              onChange={(e) => {
                                const [hh, mm] = e.target.value.split(':').map(Number);
                                const startAt = new Date(start);
                                startAt.setHours(hh, mm, 0, 0);
                                const duration =
                                  (end.getTime() - start.getTime()) / (1000 * 60);
                                const endAt = new Date(startAt);
                                endAt.setMinutes(endAt.getMinutes() + duration);
                                handleInlineUpdate(idx, { startAt, endAt });
                              }}
                            />
                          </td>
                          <td className="px-3 py-2 text-right">
                            <input
                              type="number"
                              className="w-20 bg-transparent border rounded-lg px-2 py-1 text-right"
                              value={s.price ?? 0}
                              onChange={(e) =>
                                handleInlineUpdate(idx, {
                                  price: Number(e.target.value) || 0,
                                })
                              }
                            />
                          </td>
                          <td className="px-3 py-2 text-center">
                            <span className="inline-flex px-2 py-1 rounded-full bg-slate-100 text-[10px] font-bold text-slate-700">
                              {statusLabel}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-center">
                            <button
                              type="button"
                              className="px-2 py-1 text-[10px] font-bold rounded-full bg-violet-50 text-violet-600 mr-1"
                              onClick={() => handlePostpone(s.id)}
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
            </div>
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
        </div>
      </aside>
    </div>
  );
}

