'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { getSupabaseBrowserClient } from '@/app/lib/supabase/browser';
import { Search, User, BookOpen } from 'lucide-react';
import Sidebar from '@/app/components/Sidebar';
import MileageDetailModal from '@/app/components/admin/MileageDetailModal';

interface Teacher {
  id: string;
  name: string;
  points: number;
  session_count: number;
}

export default function AdminMileagePage() {
  const [supabase] = useState(() => (typeof window !== 'undefined' ? getSupabaseBrowserClient() : null));
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);

  const fetchData = useCallback(async () => {
    if (!supabase) return;
    try {
      const { data } = await supabase
        .from('users')
        .select('id, name, points, session_count')
        .eq('is_active', true)
        .not('name', 'in', '("최지훈","김구민","김윤기")')
        .order('name', { ascending: true });

      if (data) setTeachers(data as Teacher[]);
    } catch (error) {
      console.error('Fetch error:', error);
    }
  }, [supabase]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <div className="flex min-h-screen bg-[#F8FAFC] text-slate-900 overflow-hidden">
      <Sidebar />
      <main className="flex-1 p-4 sm:p-8 overflow-y-auto pb-[env(safe-area-inset-bottom,0px)] min-w-0">
        <div className="max-w-5xl mx-auto space-y-6">
          
          <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl font-black italic uppercase tracking-tighter text-slate-950">Teacher Stats</h1>
              <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">Administration</p>
            </div>
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
          </header>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {teachers.filter(t => t.name.includes(searchTerm)).map(t => (
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
                  <span className="text-xs font-bold text-slate-600">{(t.session_count || 0)}회 수업</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </main>

      {selectedTeacher && (
        <MileageDetailModal
          teacher={selectedTeacher}
          supabase={supabase}
          onClose={() => setSelectedTeacher(null)}
          onSaved={() => fetchData()}
        />
      )}
    </div>
  );
}