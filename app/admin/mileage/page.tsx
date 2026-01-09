'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Search, X, User, Calendar, Star, Edit3, ArrowUpRight, ArrowDownRight, History } from 'lucide-react';
import Sidebar from '@/app/components/Sidebar';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

interface Teacher {
  id: string;
  name: string;
  points: number;
}

interface MileageLog {
  id: string;
  teacher_id: string;
  amount: number;
  reason: string;
  session_title: string;
  created_at: string;
}

export default function AdminMileagePage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [logs, setLogs] = useState<MileageLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(''); // 초기값 빈 문자열 보장
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [teacherLogs, setTeacherLogs] = useState<MileageLog[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: tData } = await supabase
        .from('users')
        .select('id, name, points')
        .eq('is_active', true)
        .not('name', 'in', '("최지훈","김구민","김윤기")')
        .order('name', { ascending: true });

      if (tData) {
        setTeachers(tData.map(t => ({ ...t, points: t.points ?? 0 })));
      }

      const { data: lData } = await supabase
        .from('mileage_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (lData) setLogs(lData);
    } catch (error) {
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openDetailModal = async (teacher: Teacher) => {
    setSelectedTeacher(teacher);
    setTeacherLogs([]);
    const { data } = await supabase
      .from('mileage_logs')
      .select('*')
      .eq('teacher_id', teacher.id)
      .order('created_at', { ascending: false });
    
    if (data) setTeacherLogs(data);
    setIsModalOpen(true);
  };

  const handleManualEdit = async (val: number) => {
    if (!selectedTeacher) return;
    const currentPoints = selectedTeacher.points;
    const diff = val - currentPoints;
    if (diff === 0) return;

    const { error } = await supabase.from('users').update({ points: val }).eq('id', selectedTeacher.id);
    if (!error) {
      await supabase.from('mileage_logs').insert([{
        teacher_id: selectedTeacher.id,
        amount: diff,
        reason: `관리자 직접 수정 (이전: ${currentPoints}P)`,
        session_title: '운영진 조정'
      }]);
      setSelectedTeacher({ ...selectedTeacher, points: val });
      fetchData();
    }
  };

  return (
    <div className="flex min-h-screen bg-[#F8FAFC] text-slate-900">
      <Sidebar />
      <style jsx global>{`
        .cursor-pointer-all button, 
        .cursor-pointer-all [role="button"],
        .cursor-pointer-all input {
          cursor: pointer !important;
        }
      `}</style>

      <main className="flex-1 p-4 sm:p-8 overflow-auto cursor-pointer-all">
        <div className="max-w-6xl mx-auto space-y-8">
          
          <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-black tracking-tighter italic uppercase text-slate-950">MILEAGE DASHBOARD</h1>
              <p className="text-slate-400 text-sm font-bold mt-1">강사별 마일리지 현황 및 투명한 활동 로그</p>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
              <input 
                type="text" 
                placeholder="강사명 검색" 
                className="w-full bg-white border-none py-3 pl-12 pr-4 rounded-2xl shadow-sm text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all" 
                value={searchTerm || ''} // undefined 방지
                onChange={(e) => setSearchTerm(e.target.value)} 
              />
            </div>
          </header>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {teachers.filter(t => (t.name || '').includes(searchTerm)).map(t => (
              <button 
                key={t.id} 
                onClick={() => openDetailModal(t)} 
                className="group bg-white p-6 rounded-[32px] shadow-sm text-left border border-transparent hover:border-blue-500 transition-all active:scale-95"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="bg-slate-50 p-3 rounded-2xl group-hover:bg-blue-50 transition-colors">
                    <User size={20} className="text-slate-400 group-hover:text-blue-500" />
                  </div>
                  <ArrowUpRight size={20} className="text-slate-200 group-hover:text-blue-500" />
                </div>
                <h3 className="font-black text-slate-900 text-lg">{t.name} T</h3>
                <p className="text-2xl font-black text-blue-600 mt-1">{(t.points || 0).toLocaleString()} <span className="text-xs">P</span></p>
              </button>
            ))}
          </div>

          <div className="bg-white rounded-[40px] shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-8 border-b border-slate-50 flex items-center gap-3">
              <History className="text-blue-500" size={20}/>
              <h3 className="text-lg font-black italic uppercase tracking-tight">Recent Global Logs</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50">
                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Teacher</th>
                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Amount</th>
                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Reason / Session</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-8 py-5 text-xs font-bold text-slate-400 tabular-nums">
                        {new Date(log.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-8 py-5 text-sm font-black text-slate-900">
                        {teachers.find(t => t.id === log.teacher_id)?.name || '알 수 없음'}T
                      </td>
                      <td className={`px-8 py-5 text-sm font-black ${log.amount >= 0 ? 'text-blue-500' : 'text-red-500'}`}>
                        {log.amount >= 0 ? '+' : ''}{log.amount.toLocaleString()}
                      </td>
                      <td className="px-8 py-5">
                        <div className="text-xs font-black text-slate-800">{log.reason}</div>
                        <div className="text-[10px] text-slate-400 font-bold mt-0.5">{log.session_title || ''}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      {isModalOpen && selectedTeacher && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4" onClick={() => setIsModalOpen(false)}>
          <div className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <div className="p-8 sm:p-10 overflow-y-auto">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h2 className="text-2xl font-black text-slate-950 italic uppercase">{selectedTeacher.name} T LOGS</h2>
                  <p className="text-blue-600 font-black text-lg">Current Total: {(selectedTeacher.points || 0).toLocaleString()} P</p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="bg-slate-100 p-2 rounded-full text-slate-400 hover:text-slate-900 transition-all"><X size={20}/></button>
              </div>

              <div className="mb-8 p-6 bg-slate-50 rounded-3xl border border-slate-100 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Edit3 size={18} className="text-slate-400"/>
                  <span className="text-xs font-black text-slate-500 uppercase tracking-tighter">Manual Correction</span>
                </div>
                <input 
                  type="number" 
                  value={selectedTeacher.points ?? 0} // 절대 undefined 안되게 수정
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setSelectedTeacher({...selectedTeacher, points: val});
                  }}
                  onBlur={(e) => handleManualEdit(Number(e.target.value))} 
                  className="w-32 p-3 rounded-2xl font-black text-blue-600 outline-none border-2 border-transparent focus:border-blue-500 shadow-sm text-right"
                />
              </div>

              <div className="space-y-4">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Calendar size={14}/> Activity Timeline
                </h3>
                {teacherLogs.length > 0 ? (
                  teacherLogs.map((log) => (
                    <div key={log.id} className="flex gap-4 p-4 rounded-2xl border border-slate-50 bg-white shadow-sm hover:border-blue-100 transition-all">
                      <div className={`mt-1 p-2 rounded-xl h-fit ${log.amount >= 0 ? 'bg-blue-50 text-blue-500' : 'bg-red-50 text-red-500'}`}>
                        {log.amount >= 0 ? <ArrowUpRight size={16}/> : <ArrowDownRight size={16}/>}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <span className="text-sm font-black text-slate-900 leading-tight">{log.reason || ''}</span>
                          <span className="text-[10px] font-bold text-slate-300 tabular-nums whitespace-nowrap ml-2">
                            {new Date(log.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 font-black mt-1 uppercase tracking-tighter">{log.session_title || '일반 항목'}</p>
                        <p className={`text-sm font-black mt-2 ${log.amount >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                          {log.amount >= 0 ? '+' : ''}{(log.amount || 0).toLocaleString()} P
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-20 text-center">
                    <History size={40} className="mx-auto text-slate-100 mb-4"/>
                    <p className="text-slate-300 font-bold text-sm italic">기록된 로그가 없습니다.</p>
                  </div>
                )}
              </div>
            </div>
            <button 
              onClick={() => setIsModalOpen(false)} 
              className="m-8 mt-0 py-4 bg-slate-950 text-white rounded-2xl font-black hover:bg-blue-600 transition-all shadow-xl shadow-slate-200"
            >
              CONFIRM & CLOSE
            </button>
          </div>
        </div>
      )}
    </div>
  );
}