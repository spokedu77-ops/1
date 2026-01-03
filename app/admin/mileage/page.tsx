'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Search, X, Check, User, Calendar, Star, Edit3 } from 'lucide-react';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

interface Teacher { id: string; name: string; points: number | null; }
interface Session { id: string; title: string; start_at: string; }

export default function AdminMileagePage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [teacherSessions, setTeacherSessions] = useState<Session[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // 현재 세션에서 활성화된 토글 상태 관리
  const [activeActions, setActiveActions] = useState<string[]>([]);

  const fetchTeachers = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('users')
      .select('id, name, points')
      .eq('is_active', true)
      .not('name', 'in', '("최지훈","김구민","김윤기")')
      .order('name', { ascending: true });
    
    // null 방어: points가 null이면 0으로 치환해서 저장
    if (data) {
      setTeachers(data.map(t => ({ ...t, points: t.points ?? 0 })));
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchTeachers(); }, [fetchTeachers]);

  const openManageModal = async (teacher: Teacher) => {
    setSelectedTeacher(teacher);
    setActiveActions([]); 
    const today = new Date();
    const startRange = new Date(today.setDate(today.getDate() - today.getDay())).toISOString();
    const endRange = new Date(today.setDate(today.getDate() + 14)).toISOString();
    const { data } = await supabase.from('sessions').select('id, title, start_at').eq('created_by', teacher.id).gte('start_at', startRange).lte('start_at', endRange).order('start_at', { ascending: true });
    if (data) setTeacherSessions(data);
    setIsModalOpen(true);
  };

  const saveLog = async (teacherId: string, amount: number, reason: string, sessionTitle?: string) => {
    await supabase.from('mileage_logs').insert([{
      teacher_id: teacherId,
      amount: amount,
      reason: reason,
      session_title: sessionTitle || '공통 항목'
    }]);
  };

  // 토글 포인트 반영 (Undo 기능 포함)
  const handleToggleAction = async (amount: number, label: string, actionKey: string, sessionTitle?: string) => {
    if (!selectedTeacher) return;

    const isActive = activeActions.includes(actionKey);
    const finalAmount = isActive ? -amount : amount;
    const finalReason = isActive ? `${label} (취소됨)` : label;

    const currentPoints = selectedTeacher.points ?? 0;
    const newPoints = currentPoints + finalAmount;

    const { error } = await supabase
      .from('users')
      .update({ points: newPoints })
      .eq('id', selectedTeacher.id);

    if (!error) {
      await saveLog(selectedTeacher.id, finalAmount, finalReason, sessionTitle);
      
      if (isActive) {
        setActiveActions(prev => prev.filter(a => a !== actionKey));
      } else {
        setActiveActions(prev => [...prev, actionKey]);
      }
      
      const updatedTeacher = { ...selectedTeacher, points: newPoints };
      setSelectedTeacher(updatedTeacher);
      setTeachers(prev => prev.map(t => t.id === selectedTeacher.id ? updatedTeacher : t));
    }
  };

  const handleManualEdit = async (val: number) => {
    if (!selectedTeacher) return;
    const currentPoints = selectedTeacher.points ?? 0;
    const diff = val - currentPoints;
    const { error } = await supabase.from('users').update({ points: val }).eq('id', selectedTeacher.id);
    if (!error) {
      await saveLog(selectedTeacher.id, diff, `관리자 수기 수정 (이전: ${currentPoints}P)`);
      const updatedTeacher = { ...selectedTeacher, points: val };
      setSelectedTeacher(updatedTeacher);
      setTeachers(prev => prev.map(t => t.id === selectedTeacher.id ? updatedTeacher : t));
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-6 pb-32">
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="flex justify-between items-end">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">강사 마일리지 관리</h1>
          <div className="relative w-64">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input type="text" placeholder="강사 검색" className="w-full bg-white border-none py-2.5 pl-10 pr-4 rounded-xl shadow-sm text-sm outline-none" value={searchTerm} onChange={(e)=>setSearchTerm(e.target.value)} />
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {teachers.filter(t => t.name?.includes(searchTerm)).map(t => (
            <button key={t.id} onClick={() => openManageModal(t)} className="bg-white p-6 rounded-[32px] shadow-sm text-left cursor-pointer hover:border-blue-500 border border-transparent transition-all active:scale-95">
              <h3 className="font-black text-slate-800 text-lg mb-1">{t.name} T</h3>
              <p className="text-2xl font-black text-blue-600">{(t.points ?? 0).toLocaleString()} P</p>
            </button>
          ))}
        </div>
      </div>

      {isModalOpen && selectedTeacher && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={() => setIsModalOpen(false)}>
          <div className="bg-white w-full max-w-3xl rounded-[40px] shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-10 max-h-[85vh] overflow-y-auto">
              <div className="flex justify-between items-start mb-8">
                <h2 className="text-3xl font-black text-slate-900">{selectedTeacher.name} T 관리</h2>
                <button onClick={() => setIsModalOpen(false)} className="cursor-pointer text-slate-400 hover:text-slate-600"><X size={24}/></button>
              </div>

              {/* 수기 수정 */}
              <div className="mb-8 p-5 bg-blue-50 rounded-[24px] flex items-center gap-4 border border-blue-100">
                <Edit3 size={18} className="text-blue-500"/>
                <span className="text-xs font-black text-blue-700 uppercase tracking-tighter">Current Points Edit:</span>
                <input type="number" value={selectedTeacher.points ?? 0} onChange={(e) => handleManualEdit(Number(e.target.value))} className="w-32 p-2 rounded-xl font-black text-blue-600 outline-none border-none shadow-sm"/>
              </div>

              {/* 공통 항목 */}
              <div className="mb-10">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Star size={14}/> Common Achievements</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { label: '베스트 포토/피드백', val: 2000 },
                    { label: '베스트 수업안 선정', val: 4000 },
                    { label: '하루 3개 이상 수업', val: 5000 },
                    { label: '개인수업 25회 달성', val: 15000 },
                    { label: '공지 댓글 미등록', val: -5000 },
                  ].map((item) => {
                    const key = `common-${item.label}`;
                    const isActive = activeActions.includes(key);
                    return (
                      <button key={key} onClick={() => handleToggleAction(item.val, item.label, key)} className={`p-4 rounded-2xl border text-left cursor-pointer transition-all flex flex-col justify-between h-20 ${isActive ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'bg-white border-slate-100 hover:border-blue-400 hover:shadow-md'}`}>
                        <div className={`text-[10px] font-black ${isActive ? 'text-blue-100' : 'text-slate-500'}`}>{item.label}</div>
                        <div className="text-sm font-black flex justify-between items-center w-full">
                          <span>{item.val > 0 ? '+' : ''}{item.val.toLocaleString()}</span>
                          {isActive && <Check size={14}/>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 세션 항목 */}
              <div>
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Calendar size={14}/> Weekly Schedule Actions</h3>
                <div className="space-y-4">
                  {teacherSessions.map((session) => (
                    <div key={session.id} className="bg-slate-50 p-6 rounded-[28px] border border-slate-100">
                      <div className="text-xs font-black text-slate-800 mb-4">{session.title} <span className="text-slate-400 ml-2 font-medium">{new Date(session.start_at).toLocaleDateString()}</span></div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {[
                          { label: '보고 누락', val: -2500 },
                          { label: '피드백 누락', val: -2500 },
                          { label: '당일 연기 (센터)', val: 5000 },
                          { label: '당일 연기 요청 (강사)', val: -15000 },
                          { label: '무단 결강', val: -50000 },
                        ].map((act) => {
                          const key = `${session.id}-${act.label}`;
                          const isActive = activeActions.includes(key);
                          return (
                            <button key={key} onClick={() => handleToggleAction(act.val, act.label, key, session.title)} className={`py-3 px-2 rounded-xl text-[9px] font-black border cursor-pointer transition-all flex items-center justify-center gap-1 ${isActive ? 'bg-rose-500 border-rose-500 text-white' : 'bg-white border-slate-100 hover:border-blue-500'}`}>
                              {isActive ? <><Check size={10}/> 반영됨</> : `${act.label} (${act.val > 0 ? '+' : ''}${act.val.toLocaleString()})`}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <button onClick={() => setIsModalOpen(false)} className="mt-10 w-full py-5 bg-slate-900 text-white rounded-[24px] font-black cursor-pointer hover:bg-blue-600 transition-all shadow-xl active:scale-95">반영 확인 및 닫기</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}