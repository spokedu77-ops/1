"use client";

import { useEffect, useMemo, useState, useCallback } from 'react';
import Link from 'next/link';
import Sidebar from '@/app/components/Sidebar';
import { getSupabaseBrowserClient } from '@/app/lib/supabase/browser';
import { devLogger } from '@/app/lib/logging/devLogger';
import type { ClassGroup } from '../types';
import ClassDetailPanel from '../components/ClassDetailPanel';

function getCleanClassTitle(title: string): string {
  const original = title ?? '';
  const cleaned = original
    // 1/1, 3/6 같은 분수 회차 제거 (앞/뒤/중간 어디든)
    .replace(/\b\d+\s*\/\s*\d+\b/g, ' ')
    // 6회차, 6회, 6차 제거 (앞/뒤/중간 어디든)
    .replace(/\b\d+\s*(회차|회|차)\b/g, ' ')
    // 구분자/공백 정리
    .replace(/[|_]/g, ' ')
    .replace(/\s*-\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return cleaned || original.trim();
}

type TimeFilter = 'upcoming' | 'ongoing' | 'completed';
type TimeStatus = 'upcoming' | 'ongoing' | 'completed';

export default function ClassListPage() {
  const [supabase] = useState(() =>
    typeof window !== 'undefined' ? getSupabaseBrowserClient() : null
  );
  const [groups, setGroups] = useState<ClassGroup[]>([]);
  const [teacherMap, setTeacherMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('upcoming');

  const fetchGroups = useCallback(async () => {
    if (!supabase) return;
    try {
      const [sessionsRes, usersRes] = await Promise.all([
        supabase
          .from('sessions')
          .select('group_id, title, start_at, status, created_by')
          .neq('status', 'deleted'),
        supabase
          .from('users')
          .select('id, name')
          .eq('is_active', true),
      ]);

      if (usersRes.data) {
        const map: Record<string, string> = {};
        (usersRes.data as { id: string; name: string }[]).forEach((u) => {
          map[u.id] = u.name ?? '';
        });
        setTeacherMap(map);
      }

      const { data, error } = sessionsRes;
      if (error) throw error;
      if (!data) {
        setGroups([]);
        return;
      }

      const map = new Map<string, ClassGroup>();
      (data as any[]).forEach((row) => {
        if (!row.group_id) return;
        const key = row.group_id as string;
        const existing = map.get(key);
        const startAt = row.start_at as string;
        const isFinished = row.status === 'finished';
        const teacherId = row.created_by as string | null;

        if (!existing) {
          map.set(key, {
            groupId: key,
            title: row.title || '',
            roundTotal: 1,
            completedCount: isFinished ? 1 : 0,
            firstClassAt: startAt,
            lastClassAt: startAt,
            teacherIds: teacherId ? [teacherId] : [],
          });
        } else {
          existing.roundTotal += 1;
          if (isFinished) existing.completedCount += 1;
          if (startAt < existing.firstClassAt) existing.firstClassAt = startAt;
          if (startAt > existing.lastClassAt) existing.lastClassAt = startAt;
          if (teacherId && !existing.teacherIds.includes(teacherId)) {
            existing.teacherIds.push(teacherId);
          }
        }
      });

      const list = Array.from(map.values()).sort(
        (a, b) => new Date(b.firstClassAt).getTime() - new Date(a.firstClassAt).getTime()
      );
      setGroups(list);
    } catch (err) {
      devLogger.error(err);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  const nowMs = Date.now();
  const getTimeStatus = useCallback(
    (g: ClassGroup): TimeStatus => {
      const firstMs = new Date(g.firstClassAt).getTime();
      const lastMs = new Date(g.lastClassAt).getTime();
      if (Number.isFinite(firstMs) && nowMs < firstMs) return 'upcoming';
      if (Number.isFinite(lastMs) && nowMs > lastMs) return 'completed';
      return 'ongoing';
    },
    [nowMs]
  );

  const visibleGroups = useMemo(() => {
    return groups.filter((g) => getTimeStatus(g) === timeFilter);
  }, [groups, timeFilter, getTimeStatus]);

  const filterCounts = useMemo(() => {
    const counts: Record<TimeStatus, number> = { upcoming: 0, ongoing: 0, completed: 0 };
    for (const g of groups) counts[getTimeStatus(g)] += 1;
    return counts;
  }, [groups, getTimeStatus]);

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 px-6 py-6 overflow-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black text-slate-900">수업 목록</h1>
            <p className="text-xs text-slate-500 font-bold mt-1">
              group_id 기준으로 묶인 수업 시리즈입니다.
            </p>
          </div>
          <Link
            href="/admin/classes"
            className="px-4 py-2 rounded-full text-sm font-bold bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
          >
            캘린더 보기
          </Link>
        </div>

        <div className="mb-4">
          <div className="inline-flex gap-2 bg-white p-1 rounded-2xl shadow-sm border border-slate-100">
            <button
              type="button"
              onClick={() => setTimeFilter('upcoming')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                timeFilter === 'upcoming' ? 'bg-slate-900 text-white' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              예정 ({filterCounts.upcoming})
            </button>
            <button
              type="button"
              onClick={() => setTimeFilter('ongoing')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                timeFilter === 'ongoing' ? 'bg-slate-900 text-white' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              진행중 ({filterCounts.ongoing})
            </button>
            <button
              type="button"
              onClick={() => setTimeFilter('completed')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                timeFilter === 'completed' ? 'bg-slate-900 text-white' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              완료 ({filterCounts.completed})
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-40 text-slate-400 text-sm font-bold">
            불러오는 중...
          </div>
        ) : visibleGroups.length === 0 ? (
          <div className="flex items-center justify-center h-40 text-slate-400 text-sm font-bold">
            표시할 수업이 없습니다.
          </div>
        ) : (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-xs font-bold text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left">수업명</th>
                  <th className="px-4 py-3 text-left">선생님</th>
                  <th className="px-4 py-3 text-left">진행</th>
                  <th className="px-4 py-3 text-left">첫 수업일</th>
                  <th className="px-4 py-3 text-left">상태</th>
                  <th className="px-4 py-3 text-right">바로가기</th>
                </tr>
              </thead>
              <tbody>
                {visibleGroups.map((g) => {
                  const firstDate = new Date(g.firstClassAt).toLocaleDateString('ko-KR', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                  });
                  const progress = `${g.completedCount}/${g.roundTotal}`;
                  const statusLabel =
                    g.completedCount === 0
                      ? '예정'
                      : g.completedCount >= g.roundTotal
                      ? '완료'
                      : '진행중';
                  const teacherNames = g.teacherIds
                    .map((id) => teacherMap[id] || id)
                    .filter(Boolean)
                    .join(', ') || '-';

                  return (
                    <tr key={g.groupId} className="border-t border-slate-100 hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-bold text-slate-800">{getCleanClassTitle(g.title)}</td>
                      <td className="px-4 py-3 text-slate-600">{teacherNames}</td>
                      <td className="px-4 py-3 text-slate-600">{progress} 완료</td>
                      <td className="px-4 py-3 text-slate-600">{firstDate}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex px-3 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">
                          {statusLabel}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedGroupId(g.groupId)}
                          className="inline-flex px-3 py-1.5 rounded-full text-[11px] font-bold bg-blue-600 text-white hover:bg-blue-700 transition"
                        >
                          상세
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>

      <ClassDetailPanel
        groupId={selectedGroupId}
        onClose={() => setSelectedGroupId(null)}
        onChanged={() => fetchGroups()}
      />
    </div>
  );
}

