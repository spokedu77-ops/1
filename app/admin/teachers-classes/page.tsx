'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Send, RotateCcw, Calendar, User, MapPin, X, CheckCircle, ExternalLink } from 'lucide-react';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const FEEDBACK_TEMPLATE = `✅ 오늘 수업의 주요 활동
- 

✅ 강점 및 긍정적인 부분
- 

✅ 개선이 필요한 부분 및 피드백
- 

✅ 다음 수업 목표 및 계획
- 

✅ 특이사항 및 컨디션 체크
- `;

export default function MasterQCPage() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [coaches, setCoaches] = useState<{id: string, name: string}[]>([]);
  const [selectedCoachId, setSelectedCoachId] = useState('all');
  
  const getKSTDate = (date: Date) => {
    const kstDate = new Date(date.getTime() + 9 * 60 * 60 * 1000);
    return kstDate.toISOString().split('T')[0];
  };

  const [selectedDate, setSelectedDate] = useState(getKSTDate(new Date()));
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);

  useEffect(() => {
    const initPage = async () => {
      const { data: userData } = await supabase.from('users').select('id, name').order('name');
      if (userData) setCoaches(userData);
      fetchListData();
    };
    initPage();
  }, []);

  const fetchListData = async () => {
    setLoading(true);
    const { data } = await supabase.from('sessions').select('*').order('start_at', { ascending: true });
    if (data) setSessions(data);
    setLoading(false);
  };

  const filteredSessions = sessions.filter(s => {
    const sessionKST = getKSTDate(new Date(s.start_at));
    const matchDate = sessionKST === selectedDate;
    const matchCoach = selectedCoachId === 'all' || s.created_by === selectedCoachId;
    return matchDate && matchCoach;
  });

  const openEditModal = (session: any) => {
    setSelectedEvent(session);
    setFeedback(session.students_text || FEEDBACK_TEMPLATE);
    let photos: string[] = [];
    if (session.photo_url && typeof session.photo_url === 'string') {
        photos = session.photo_url.split(',').filter((url: string) => url.trim() !== '' && url.startsWith('http'));
    } else if (Array.isArray(session.photo_url)) {
        photos = session.photo_url;
    }
    setPhotoUrls(photos);
    setIsModalOpen(true);
  };

  const handleSave = async (newStatus = 'verified') => {
    if (!selectedEvent) return;
    const { error } = await supabase
      .from('sessions')
      .update({ 
        students_text: feedback, 
        photo_url: photoUrls.join(','), 
        status: newStatus 
      })
      .eq('id', selectedEvent.id);

    if (!error) {
      alert(newStatus === 'verified' ? '검수 완료! 이제 부모님이 리포트를 보실 수 있습니다.' : '강사 수정 가능 상태로 변경되었습니다.');
      setIsModalOpen(false);
      fetchListData();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-12">
      <div className="max-w-6xl mx-auto">
        
        <div className="mb-12 flex flex-col md:flex-row justify-between items-end gap-6">
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter italic">SPOKEDU QC</h1>
            <p className="text-slate-500 font-bold mt-2">전문적인 체육 교육의 기준, 스포키듀 리포트 관리</p>
          </div>
          
          <div className="flex gap-3 bg-white p-3 rounded-3xl shadow-sm border border-slate-200">
            <input 
              type="date" 
              value={selectedDate} 
              onChange={(e) => setSelectedDate(e.target.value)} 
              className="bg-slate-50 px-4 py-2 rounded-xl text-sm font-bold outline-none cursor-pointer hover:bg-slate-100 transition-colors"
            />
            <select 
              value={selectedCoachId} 
              onChange={(e) => setSelectedCoachId(e.target.value)}
              className="bg-slate-50 px-4 py-2 rounded-xl text-sm font-bold outline-none cursor-pointer hover:bg-slate-100 transition-colors"
            >
              <option value="all">전체 강사</option>
              {coaches.map(c => <option key={c.id} value={c.id}>{c.name}T</option>)}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center py-20 gap-4">
            <div className="w-10 h-10 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin"></div>
            <p className="font-bold text-slate-400 text-sm italic">SPOKEDU LOADING...</p>
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="bg-white rounded-[40px] py-32 text-center border border-dashed border-slate-300">
            <p className="text-slate-400 font-bold">선택하신 날짜에 등록된 수업이 없습니다.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredSessions.map((s) => {
              const pureContent = s.students_text ? s.students_text.replace(FEEDBACK_TEMPLATE, '').trim() : '';
              const isActuallyDone = (s.status === 'finished' || s.status === 'verified') && pureContent.length > 0;
              const isVerified = s.status === 'verified';
              const time = new Date(s.start_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
              const coachName = coaches.find(c => c.id === s.created_by)?.name || '강사';

              return (
                <div key={s.id} className="bg-white rounded-[40px] p-8 shadow-sm border border-slate-200 flex flex-col hover:shadow-xl transition-all duration-300">
                  <div className="flex justify-between items-start mb-6">
                    <span className="bg-indigo-50 text-indigo-600 px-4 py-1.5 rounded-full text-xs font-black tracking-tight">{time}</span>
                    <span className={`text-[11px] font-black px-3 py-1.5 rounded-xl uppercase tracking-widest ${isVerified ? 'bg-blue-600 text-white shadow-md shadow-blue-100' : isActuallyDone ? 'bg-emerald-500 text-white shadow-md shadow-emerald-100' : 'bg-slate-100 text-slate-400'}`}>
                      {isVerified ? 'VERIFIED' : isActuallyDone ? 'DONE' : 'EMPTY'}
                    </span>
                  </div>

                  <h3 className="text-2xl font-black text-slate-900 mb-2 line-clamp-1 tracking-tight">{s.title}</h3>
                  
                  <div className="space-y-2 mb-8">
                    <div className="flex items-center gap-2 text-slate-500 text-sm font-bold">
                      <User size={16} className="text-indigo-400" /> {coachName} 선생님
                    </div>
                    <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
                      <MapPin size={16} /> {s.session_type === 'regular_center' ? 'SPOKEDU 센터' : '방문 수업'}
                    </div>
                  </div>

                  <div className="mt-auto flex gap-3">
                    <button 
                      onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/report/${s.id}`); alert('부모님용 링크가 복사되었습니다.'); }}
                      disabled={!isActuallyDone}
                      className={`p-4 rounded-3xl transition-all cursor-pointer ${isActuallyDone ? 'bg-slate-100 text-slate-600 hover:bg-slate-200 active:scale-95' : 'bg-slate-50 text-slate-200 cursor-not-allowed'}`}
                      title="링크 복사"
                    >
                      <Send size={20} />
                    </button>
                    <button 
                      onClick={() => openEditModal(s)}
                      className="flex-1 py-4 bg-slate-900 text-white rounded-3xl text-sm font-black hover:bg-indigo-600 transition-all shadow-lg active:scale-95 cursor-pointer"
                    >
                      리포트 검수
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {isModalOpen && selectedEvent && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[999] flex items-center justify-center p-4" onClick={() => setIsModalOpen(false)}>
          <div className="bg-white w-full max-w-2xl rounded-[48px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <div className="p-10 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight leading-tight">{selectedEvent.title}</h2>
                <button 
                   onClick={() => window.open(`/report/${selectedEvent.id}`, '_blank')}
                   className="text-indigo-500 text-xs font-bold flex items-center gap-1 mt-1 hover:underline cursor-pointer"
                >
                  <ExternalLink size={12} /> 부모님용 화면 미리보기
                </button>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-300 hover:text-slate-900 cursor-pointer transition-colors"><X size={32} /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-10 space-y-10 bg-slate-50/50">
              {photoUrls.length > 0 && (
                <div className="grid grid-cols-3 gap-4">
                  {photoUrls.map((url, i) => (
                    <div key={i} className="aspect-square rounded-[24px] overflow-hidden border-2 border-white shadow-sm hover:scale-105 transition-transform">
                      <img src={url} className="w-full h-full object-cover" alt="수업 현장" />
                    </div>
                  ))}
                </div>
              )}
              <div className="space-y-4">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Report Feedback</label>
                <textarea 
                  className="w-full h-80 bg-white border-none shadow-inner rounded-[32px] p-8 text-base leading-relaxed text-slate-700 focus:ring-2 focus:ring-indigo-100 outline-none transition-all" 
                  value={feedback} 
                  onChange={(e) => setFeedback(e.target.value)} 
                />
              </div>
            </div>

            <div className="p-10 bg-white border-t border-slate-100 flex gap-4">
              <button onClick={() => handleSave('finished')} className="flex-1 py-5 bg-slate-50 border border-slate-200 rounded-3xl font-bold text-rose-500 hover:bg-rose-50 transition-all cursor-pointer">
                <RotateCcw size={18} className="inline mr-1" /> 반려
              </button>
              <button onClick={() => handleSave('verified')} className="flex-[2] py-5 bg-slate-900 rounded-3xl font-black text-white shadow-xl hover:bg-indigo-600 transition-all cursor-pointer">
                검수 승인 및 저장
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}