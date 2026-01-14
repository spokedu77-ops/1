'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Search, X, User, Calendar, Edit3, ArrowUpRight, ArrowDownRight, History, Save, Trash2 } from 'lucide-react';
import Sidebar from '@/app/components/Sidebar';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

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
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [teacherLogs, setTeacherLogs] = useState<MileageLog[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editPointValue, setEditPointValue] = useState<number>(0);

  const fetchData = useCallback(async () => {
    try {
      const { data: tData } = await supabase
        .from('users')
        .select('id, name, points')
        .eq('is_active', true)
        .not('name', 'in', '("최지훈","김구민","김윤기")')
        .order('name', { ascending: true });

      if (tData) setTeachers(tData as Teacher[]);

      const { data: lData } = await supabase
        .from('mileage_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(30);

      if (lData) setLogs(lData as MileageLog[]);
    } catch (error) {
      console.error('Fetch error:', error);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openDetailModal = async (teacher: Teacher) => {
    setSelectedTeacher(teacher);
    setEditPointValue(teacher.points || 0);
    setTeacherLogs([]);
    
    const { data } = await supabase
      .from('mileage_logs')
      .select('*')
      .eq('teacher_id', teacher.id)
      .order('created_at', { ascending: false });
    
    if (data) setTeacherLogs(data as MileageLog[]);
    setIsModalOpen(true);
  };

  const handleSavePoints = async () => {
    if (!selectedTeacher) return;
    const prevPoints = selectedTeacher.points || 0;
    const nextPoints = editPointValue;
    const diff = nextPoints - prevPoints;
    if (diff === 0) return;

    try {
      const { error: uError } = await supabase.from('users').update({ points: nextPoints }).eq('id', selectedTeacher.id);
      if (uError) throw uError;

      const { error: lError } = await supabase.from('mileage_logs').insert([{
        teacher_id: selectedTeacher.id,
        amount: diff,
        reason: '운영진 수동 조정',
        session_title: '직접 수정'
      }]);
      if (lError) throw lError;

      alert("반영되었습니다.");
      fetchData();
      setIsModalOpen(false);
    } catch (error: any) {
      alert("실패: " + error.message);
    }
  };

  const handleDeleteLog = async (logId: string) => {
    if (!confirm('이 기록을 삭제하시겠습니까?')) return;
    try {
      const { error } = await supabase.from('mileage_logs').delete().eq('id', logId);
      if (error) throw error;
      setTeacherLogs(prev => prev.filter(l => l.id !== logId));
      fetchData();
    } catch (error: any) {
      alert("삭제 실패: " + error.message);
    }
  };

  const cleanReason = (reason: string) => {
    if (!reason) return '';
    return reason.replace(/\[수업연동\]\s(원복|차감):\s/, '').trim();
  };

  return (
    <div className="flex min-h-screen bg-[#F8FAFC] text-slate-900 overflow-hidden">
      <Sidebar />
      <main className="flex-1 p-4 sm:p-8 overflow-y-auto">
        <div className="max-w-5xl mx-auto space-y-6">
          
          <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl font-black italic uppercase tracking-tighter text-slate-950">Mileage</h1>
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
                onClick={() => openDetailModal(t)} 
                className="group bg-white p-4 sm:p-5 rounded-2xl shadow-sm hover:shadow-md hover:border-blue-200 border border-slate-100 transition-all text-left cursor-pointer"
              >
                <div className="bg-blue-50 w-8 h-8 flex items-center justify-center rounded-lg mb-3 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <User size={16} />
                </div>
                <h3 className="font-black text-slate-900 text-sm mb-0.5">{t.name} T</h3>
                <div className="flex items-baseline gap-0.5">
                  <span className="text-lg font-black text-blue-600">{(t.points || 0).toLocaleString()}</span>
                  <span className="text-[10px] font-black text-blue-300 italic">P</span>
                </div>
              </button>
            ))}
          </div>

          <section className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-50 flex items-center gap-2">
              <History size={16} className="text-slate-400"/>
              <h3 className="text-sm font-black italic uppercase tracking-tight">Recent Logs</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[500px]">
                <thead>
                  <tr className="bg-slate-50/50">
                    <th className="px-6 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                    <th className="px-6 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Teacher</th>
                    <th className="px-6 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Amount</th>
                    <th className="px-6 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-blue-50/30 transition-colors">
                      <td className="px-6 py-3.5 text-[11px] font-bold text-slate-400 tabular-nums">{new Date(log.created_at).toLocaleDateString()}</td>
                      <td className="px-6 py-3.5 text-xs font-black text-slate-900">{teachers.find(t => t.id === log.teacher_id)?.name || 'N/A'}T</td>
                      <td className={`px-6 py-3.5 text-xs font-black ${log.amount >= 0 ? 'text-blue-600' : 'text-red-500'}`}>
                        {log.amount > 0 ? '+' : ''}{log.amount.toLocaleString()}P
                      </td>
                      <td className="px-6 py-3.5">
                        <span className="text-[11px] font-black text-slate-800 block leading-tight">{log.session_title}</span>
                        <span className="text-[9px] font-bold text-slate-400">{cleanReason(log.reason)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>

      {isModalOpen && selectedTeacher && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 cursor-default" onClick={() => setIsModalOpen(false)}>
          <div className="bg-white w-full max-w-xl rounded-t-[32px] sm:rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <div className="p-6 sm:p-8 overflow-y-auto">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-xl font-black text-slate-950 italic uppercase tracking-tighter">{selectedTeacher.name} T</h2>
                  <p className="text-blue-600 font-black text-2xl mt-1">{(selectedTeacher.points || 0).toLocaleString()} <span className="text-xs">P</span></p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="hover:bg-slate-100 p-2 rounded-full transition-colors cursor-pointer text-slate-400"><X size={20}/></button>
              </div>

              <div className="mb-8 p-1.5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-2">
                <input 
                  type="number" 
                  value={editPointValue} 
                  onChange={(e) => setEditPointValue(Number(e.target.value))}
                  className="flex-1 bg-transparent px-4 py-2 font-black text-blue-600 text-lg outline-none cursor-text"
                />
                <button onClick={handleSavePoints} className="bg-slate-900 text-white px-5 py-2.5 rounded-xl font-black text-xs flex items-center gap-2 hover:bg-blue-600 transition-all shadow-md cursor-pointer">
                  <Save size={14}/> UPDATE
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2 px-1">
                  <Calendar size={14} className="text-slate-300"/>
                  <h3 className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Activity History</h3>
                </div>
                
                {teacherLogs.length > 0 ? (
                  teacherLogs.map((log) => (
                    <div key={log.id} className="flex items-center justify-between p-4 rounded-2xl border border-slate-50 bg-white shadow-sm hover:border-blue-100 transition-all">
                      <div className="flex items-center gap-4 sm:gap-6">
                        <div className={`text-sm font-black w-20 sm:w-24 ${log.amount >= 0 ? 'text-blue-600' : 'text-red-500'}`}>
                          {log.amount > 0 ? '+' : ''}{log.amount.toLocaleString()}P
                        </div>
                        <div className="hidden xs:block h-6 w-[1px] bg-slate-100"></div>
                        <div>
                          <p className="text-[11px] font-black text-slate-800 leading-tight">{log.session_title}</p>
                          <p className="text-[9px] font-bold text-slate-400 mt-0.5">{cleanReason(log.reason)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[9px] font-bold text-slate-300 tabular-nums whitespace-nowrap">{new Date(log.created_at).toLocaleDateString()}</span>
                        <button 
                          onClick={() => handleDeleteLog(log.id)}
                          className="text-slate-200 hover:text-red-500 transition-colors p-1 cursor-pointer"
                        >
                          <Trash2 size={14}/>
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-16 text-center text-slate-200 font-black italic text-sm tracking-tighter uppercase">No activity logs found</div>
                )}
              </div>
            </div>
            <div className="p-6 pt-0">
              <button onClick={() => setIsModalOpen(false)} className="w-full py-4 bg-slate-100 text-slate-900 rounded-2xl font-black text-xs hover:bg-slate-200 transition-all cursor-pointer">CLOSE</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}