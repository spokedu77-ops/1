'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Search, User, BookOpen } from 'lucide-react';
import MileageDetailModal from '@/app/components/admin/MileageDetailModal';
import type { SupabaseClient } from '@supabase/supabase-js';

interface Teacher {
  id: string;
  name: string;
  points: number;
  session_count: number;
  /** 화면 표시용: session_count_logs 실제 건수 */
  logCount?: number;
}

interface CountingTabProps {
  supabase: SupabaseClient | null;
}

export function CountingTab({ supabase }: CountingTabProps) {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);

  const fetchData = useCallback(async () => {
    if (!supabase) return;
    try {
      const { data: userData } = await supabase
        .from('users')
        .select('id, name, points, session_count')
        .eq('is_active', true)
        .not('name', 'in', '("최지훈","김구민","김윤기")')
        .order('name', { ascending: true });

      const { data: logRows } = await supabase
        .from('session_count_logs')
        .select('teacher_id');

      const logCountByTeacher: Record<string, number> = {};
      if (logRows) {
        for (const row of logRows) {
          const tid = row.teacher_id;
          if (tid) logCountByTeacher[tid] = (logCountByTeacher[tid] || 0) + 1;
        }
      }

      const teachersWithLogCount: Teacher[] = (userData || []).map((u) => ({
        ...u,
        session_count: u.session_count ?? 0,
        logCount: logCountByTeacher[u.id] ?? 0,
      })) as Teacher[];
      setTeachers(teachersWithLogCount);
    } catch (error) {
      console.error('Fetch error:', error);
    }
  }, [supabase]);

  useEffect(() => {
    queueMicrotask(() => fetchData());
  }, [fetchData]);

  return (
    <>
      <div className="space-y-6">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
          <input
            type="text"
            placeholder="강사명 검색"
            className="w-full bg-white border border-slate-200 py-2.5 pl-10 pr-4 rounded-xl shadow-sm font-bold text-xs outline-none focus:ring-2 focus:ring-blue-500/20 transition-all cursor-text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {teachers.filter((t) => t.name.includes(searchTerm)).map((t) => (
            <button
              key={t.id}
              onClick={() => setSelectedTeacher(t)}
              className="group bg-white p-4 sm:p-5 rounded-2xl shadow-sm hover:shadow-md hover:border-blue-200 border border-slate-100 transition-all text-left cursor-pointer"
            >
              <div className="bg-blue-50 w-8 h-8 flex items-center justify-center rounded-lg mb-3 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <User size={16} />
              </div>
              <h3 className="font-black text-slate-900 text-sm mb-0.5">{t.name} T</h3>
              <div className="flex items-baseline gap-0.5 mb-2">
                <span className="text-lg font-black text-blue-600">{(t.points || 0).toLocaleString()}</span>
                <span className="text-[10px] font-black text-blue-300 italic">P</span>
              </div>
              <div className="flex items-center gap-1">
                <BookOpen size={12} className="text-slate-400" />
                <span className="text-xs font-bold text-slate-600">{(t.logCount ?? t.session_count ?? 0)}회 수업</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {selectedTeacher && (
        <MileageDetailModal
          teacher={selectedTeacher}
          supabase={supabase}
          onClose={() => setSelectedTeacher(null)}
          onSaved={() => fetchData()}
        />
      )}
    </>
  );
}
