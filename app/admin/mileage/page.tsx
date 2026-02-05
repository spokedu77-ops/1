'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { getSupabaseBrowserClient } from '@/app/lib/supabase/browser';
import { Search, X, User, Calendar, Save, Trash2, BookOpen } from 'lucide-react';
import Sidebar from '@/app/components/Sidebar';

interface Teacher {
  id: string;
  name: string;
  points: number;
  session_count: number;
}

interface MileageLog {
  id: string;
  teacher_id: string;
  amount: number;
  reason: string;
  session_title: string;
  created_at: string;
}

interface SessionCountLog {
  id: string;
  teacher_id: string;
  session_id: string | null;
  session_title: string;
  count_change: number;
  reason: string;
  created_at: string;
}

const PENALTY_OPTIONS = [
  { label: '공지 댓글 미등록', value: -5000 },
  { label: '수업 연기 요청', value: -5000 },
  { label: '당일 수업 연기 요청', value: -15000 },
];

export default function AdminMileagePage() {
  const [supabase] = useState(() => (typeof window !== 'undefined' ? getSupabaseBrowserClient() : null));
  const [modalTab, setModalTab] = useState<'mileage' | 'sessions'>('mileage');
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [, setLogs] = useState<MileageLog[]>([]);
  const [, setCountLogs] = useState<SessionCountLog[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [teacherLogs, setTeacherLogs] = useState<MileageLog[]>([]);
  const [teacherCountLogs, setTeacherCountLogs] = useState<SessionCountLog[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editPointValue, setEditPointValue] = useState<number>(0);
  const [editSessionCount, setEditSessionCount] = useState<number>(0);
  const [selectedPenalty, setSelectedPenalty] = useState<string>('');
  const [editReason, setEditReason] = useState<string>('');
  const [lastPenaltyLog, setLastPenaltyLog] = useState<MileageLog | null>(null);

  const fetchData = useCallback(async () => {
    if (!supabase) return;
    try {
      const [tRes, lRes, cRes] = await Promise.all([
        supabase
          .from('users')
          .select('id, name, points, session_count')
          .eq('is_active', true)
          .not('name', 'in', '("최지훈","김구민","김윤기")')
          .order('name', { ascending: true }),
        supabase
          .from('mileage_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(30),
        supabase
          .from('session_count_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(30)
      ]);

      if (tRes.data) setTeachers(tRes.data as Teacher[]);
      if (lRes.data) setLogs(lRes.data as MileageLog[]);
      if (cRes.data) setCountLogs(cRes.data as SessionCountLog[]);
    } catch (error) {
      console.error('Fetch error:', error);
    }
  }, [supabase]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openDetailModal = async (teacher: Teacher) => {
    if (!supabase) return;
    setSelectedTeacher(teacher);
    setEditPointValue(teacher.points || 0);
    setEditSessionCount(teacher.session_count || 0);
    setSelectedPenalty('');
    setEditReason('');
    setTeacherLogs([]);
    setTeacherCountLogs([]);
    
    const { data: mData } = await supabase
      .from('mileage_logs')
      .select('*')
      .eq('teacher_id', teacher.id)
      .order('created_at', { ascending: false });
    
    if (mData) setTeacherLogs(mData as MileageLog[]);

    const { data: cData } = await supabase
      .from('session_count_logs')
      .select('*')
      .eq('teacher_id', teacher.id)
      .order('created_at', { ascending: false });
    
    if (cData) setTeacherCountLogs(cData as SessionCountLog[]);
    
    setIsModalOpen(true);
  };

  const handleSavePoints = async () => {
    if (!supabase || !selectedTeacher) return;
    const prevPoints = selectedTeacher.points || 0;
    const nextPoints = editPointValue;
    const diff = nextPoints - prevPoints;
    
    const prevSessionCount = selectedTeacher.session_count || 0;
    const nextSessionCount = editSessionCount;
    
    if (diff === 0 && prevSessionCount === nextSessionCount) {
      alert("변경된 내용이 없습니다.");
      return;
    }

    try {
      const updateData: Record<string, unknown> = {};
      if (diff !== 0) updateData.points = nextPoints;
      if (prevSessionCount !== nextSessionCount) updateData.session_count = nextSessionCount;
      
      const { error: uError } = await supabase.from('users').update(updateData).eq('id', selectedTeacher.id);
      if (uError) throw uError;

      if (diff !== 0) {
        const { error: lError } = await supabase.from('mileage_logs').insert([{
          teacher_id: selectedTeacher.id,
          amount: diff,
          reason: editReason || '운영진 수동 조정',
          session_title: '직접 수정'
        }]);
        if (lError) throw lError;
      }

      alert("반영되었습니다.");
      fetchData();
      setIsModalOpen(false);
    } catch (error: unknown) {
      alert("실패: " + (error instanceof Error ? error.message : String(error)));
    }
  };

  const handleDeleteLog = async (logId: string) => {
    if (!supabase || !selectedTeacher) return;
    
    const logToDelete = teacherLogs.find(l => l.id === logId);
    if (!logToDelete) return;
    
    if (!confirm(`이 기록을 삭제하고 마일리지 ${logToDelete.amount > 0 ? '-' : '+'}${Math.abs(logToDelete.amount).toLocaleString()}P를 복구하시겠습니까?`)) return;
    
    try {
      // 마일리지 복구 (반대로 적용)
      const { data: user } = await supabase
        .from('users')
        .select('points')
        .eq('id', selectedTeacher.id)
        .single();
      
      const currentPoints = user?.points ?? 0;
      await supabase
        .from('users')
        .update({ points: currentPoints - logToDelete.amount })
        .eq('id', selectedTeacher.id);
      
      // 로그 삭제
      const { error } = await supabase.from('mileage_logs').delete().eq('id', logId);
      if (error) throw error;
      
      // 취소 로그 생성
      await supabase.from('mileage_logs').insert([{
        teacher_id: selectedTeacher.id,
        amount: -logToDelete.amount,
        reason: `[취소] ${logToDelete.reason}`,
        session_title: logToDelete.session_title
      }]);
      
      setTeacherLogs(prev => prev.filter(l => l.id !== logId));
      fetchData();
      alert('마일리지가 복구되었습니다.');
    } catch (error: unknown) {
      alert("취소 실패: " + (error instanceof Error ? error.message : String(error)));
    }
  };

  const handleQuickPenalty = async () => {
    if (!supabase || !selectedTeacher || !selectedPenalty) return;
    
    const penalty = PENALTY_OPTIONS.find(p => p.label === selectedPenalty);
    if (!penalty) return;
    
    if (!confirm(`${selectedTeacher.name} 강사에게 ${penalty.label} (${penalty.value.toLocaleString()}P)를 차감하시겠습니까?`)) return;
    
    try {
      const { data: user } = await supabase
        .from('users')
        .select('points')
        .eq('id', selectedTeacher.id)
        .single();
      
      const currentPoints = user?.points ?? 0;
      await supabase
        .from('users')
        .update({ points: currentPoints + penalty.value })
        .eq('id', selectedTeacher.id);
      
      const { data: newLog } = await supabase.from('mileage_logs').insert([{
        teacher_id: selectedTeacher.id,
        amount: penalty.value,
        reason: `[Penalty] ${penalty.label}`,
        session_title: '운영진 조치'
      }]).select().single();
      
      if (newLog) setLastPenaltyLog(newLog as MileageLog);
      
      alert('차감이 완료되었습니다.');
      fetchData();
      openDetailModal(selectedTeacher);
    } catch (error: unknown) {
      alert('차감 실패: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  const handleUndoPenalty = async () => {
    if (!supabase || !selectedTeacher || !lastPenaltyLog) return;
    
    if (!confirm(`최근 Penalty (${lastPenaltyLog.amount.toLocaleString()}P)를 취소하시겠습니까?`)) return;
    
    try {
      const { data: user } = await supabase
        .from('users')
        .select('points')
        .eq('id', selectedTeacher.id)
        .single();
      
      const currentPoints = user?.points ?? 0;
      await supabase
        .from('users')
        .update({ points: currentPoints - lastPenaltyLog.amount })
        .eq('id', selectedTeacher.id);
      
      await supabase.from('mileage_logs').insert([{
        teacher_id: selectedTeacher.id,
        amount: -lastPenaltyLog.amount,
        reason: `[취소] ${lastPenaltyLog.reason}`,
        session_title: lastPenaltyLog.session_title
      }]);
      
      setLastPenaltyLog(null);
      alert('Penalty가 취소되었습니다.');
      fetchData();
      openDetailModal(selectedTeacher);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      alert('취소 실패: ' + msg);
    }
  };

  const cleanReason = (reason: string) => {
    if (!reason) return '';
    return reason.replace(/\[수업연동\]\s(원복|차감):\s/, '').trim();
  };

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
                onClick={() => openDetailModal(t)} 
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

      {isModalOpen && selectedTeacher && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 cursor-default" onClick={() => setIsModalOpen(false)}>
          <div className="bg-white w-full max-w-xl rounded-t-[32px] sm:rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <div className="p-6 sm:p-8 overflow-y-auto">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-xl font-black text-slate-950 italic uppercase tracking-tighter">{selectedTeacher.name} T</h2>
                  <p className="text-blue-600 font-black text-2xl mt-1">{(selectedTeacher.points || 0).toLocaleString()} <span className="text-xs">P</span></p>
                  <p className="text-slate-400 font-bold text-sm mt-1 flex items-center gap-1">
                    <BookOpen size={14} /> {(selectedTeacher.session_count || 0)}회 수업 완료
                  </p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="min-h-[44px] min-w-[44px] hover:bg-slate-100 p-2 rounded-full transition-colors cursor-pointer text-slate-400 flex items-center justify-center touch-manipulation"><X size={20}/></button>
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
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-3">수업 수</span>
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
                <h4 className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-3">
                  Penalty
                </h4>
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

                {/* 모달 내부 탭 */}
                <div className="flex gap-2 bg-slate-50 rounded-xl p-1">
                  <button
                    onClick={() => setModalTab('mileage')}
                    className={`flex-1 py-2 px-3 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                      modalTab === 'mileage'
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    마일리지
                  </button>
                  <button
                    onClick={() => setModalTab('sessions')}
                    className={`flex-1 py-2 px-3 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                      modalTab === 'sessions'
                        ? 'bg-white text-emerald-600 shadow-sm'
                        : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    수업 카운팅
                  </button>
                </div>
                
                {/* 마일리지 로그 */}
                {modalTab === 'mileage' && (
                  teacherLogs.length > 0 ? (
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
                    <div className="py-16 text-center text-slate-200 font-black italic text-sm tracking-tighter uppercase">No mileage logs found</div>
                  )
                )}

                {/* 수업 카운팅 로그 */}
                {modalTab === 'sessions' && (
                  teacherCountLogs.length > 0 ? (
                    teacherCountLogs.map((log) => (
                      <div key={log.id} className="flex items-center justify-between p-4 rounded-2xl border border-slate-50 bg-white shadow-sm hover:border-emerald-100 transition-all">
                        <div className="flex items-center gap-4 sm:gap-6">
                          <div className="text-sm font-black w-20 sm:w-24 text-emerald-600">
                            +{log.count_change}회
                          </div>
                          <div className="hidden xs:block h-6 w-[1px] bg-slate-100"></div>
                          <div>
                            <p className="text-[11px] font-black text-slate-800 leading-tight">{log.session_title}</p>
                            <p className="text-[9px] font-bold text-slate-400 mt-0.5">{log.reason}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-[9px] font-bold text-slate-300 tabular-nums whitespace-nowrap">{new Date(log.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-16 text-center text-slate-200 font-black italic text-sm tracking-tighter uppercase">No session logs found</div>
                  )
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