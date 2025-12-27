'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Send, RotateCcw } from 'lucide-react';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// 강사 페이지와 100% 동일한 템플릿
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
  // 에러 방지를 위해 타입을 명확히 지정함
  const [sessions, setSessions] = useState<any[]>([]);
  const [coaches, setCoaches] = useState<{id: string, name: string}[]>([]);
  const [selectedCoachId, setSelectedCoachId] = useState('all');
  
  // 한국 시간 기준 오늘 날짜 설정
  const [selectedDate, setSelectedDate] = useState(
    new Date(new Date().getTime() + 9 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);

  useEffect(() => {
    const initPage = async () => {
      // 강사 목록 가져오기
      const { data: userData } = await supabase.from('users').select('id, name').order('name');
      if (userData) setCoaches(userData);
      fetchListData('all');
    };
    initPage();
  }, []);

  const fetchListData = async (coachId: string) => {
    setLoading(true);
    let query = supabase.from('sessions').select('*').order('start_at', { ascending: false });
    if (coachId !== 'all') query = query.eq('created_by', coachId);
    const { data } = await query;
    if (data) setSessions(data);
    setLoading(false);
  };

  // 날짜 및 강사 필터링
  const filteredSessions = sessions.filter(s => {
    const sessionDate = s.start_at.substring(0, 10);
    const matchCoach = selectedCoachId === 'all' || s.created_by === selectedCoachId;
    const matchDate = !selectedDate || sessionDate === selectedDate;
    return matchCoach && matchDate;
  });

  const openEditModal = (session: any) => {
    setSelectedEvent(session);
    setFeedback(session.students_text || FEEDBACK_TEMPLATE);
    
    // 사진 데이터 타입 방어
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
      alert(newStatus === 'verified' ? '검수 승인 완료!' : '상태가 원복되었습니다.');
      setIsModalOpen(false);
      fetchListData(selectedCoachId);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 md:p-8">
      <style>{`
        @import url("https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css");
        * { font-family: "Pretendard Variable", sans-serif !important; letter-spacing: -0.02em; }
        .master-row { display: flex; align-items: center; width: 100%; min-width: 850px; gap: 24px; }
      `}</style>

      <div className="max-w-full mx-auto space-y-6">
        <header className="flex flex-col md:flex-row justify-between items-center bg-white p-8 rounded-[32px] shadow-sm border border-slate-200/50 gap-6">
          <div className="text-left">
            <h1 className="text-3xl font-black text-slate-900 italic tracking-tighter">QC DASHBOARD</h1>
            <p className="text-sm font-bold text-indigo-600 uppercase tracking-widest mt-1 text-left">Master Management System</p>
          </div>
          <div className="flex gap-3">
            <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="bg-slate-100 px-4 py-3 rounded-2xl text-sm font-bold border-none outline-none cursor-pointer" />
            <select value={selectedCoachId} onChange={(e) => { setSelectedCoachId(e.target.value); fetchListData(e.target.value); }} className="bg-slate-100 px-4 py-3 rounded-2xl text-sm font-bold border-none outline-none cursor-pointer">
              <option value="all">전체 강사</option>
              {coaches.map(c => <option key={c.id} value={c.id}>{c.name}T</option>)}
            </select>
          </div>
        </header>

        <div className="bg-white rounded-[40px] shadow-xl border border-slate-200/60 overflow-hidden overflow-x-auto">
          <div className="master-row bg-slate-50/80 border-b border-slate-100 px-10 py-5 text-sm font-black text-slate-400 uppercase">
            <div className="w-[180px] shrink-0 text-left">일시 / 강사</div>
            <div className="flex-1 min-w-[250px] text-left">수업 정보</div>
            <div className="w-[140px] text-center shrink-0">작성 상태</div>
            <div className="w-[180px] text-right shrink-0">액션</div>
          </div>

          <div className="divide-y divide-slate-50">
            {filteredSessions.map((s) => {
              const pureContent = s.students_text ? s.students_text.replace(FEEDBACK_TEMPLATE, '').trim() : '';
              const isActuallyDone = (s.status === 'finished' || s.status === 'verified') && pureContent.length > 0;
              const isVerified = s.status === 'verified';
              const dateObj = new Date(s.start_at);

              return (
                <div key={s.id} className="master-row px-10 py-7 hover:bg-slate-50/50 transition-all">
                  <div className="w-[180px] shrink-0 text-left">
                    <p className="text-base font-black text-slate-900 leading-none">
                      {dateObj.getMonth() + 1}/{dateObj.getDate()} <span className="text-indigo-600 ml-1">{dateObj.getHours()}:{String(dateObj.getMinutes()).padStart(2, '0')}</span>
                    </p>
                    <p className="text-sm font-bold text-slate-500 mt-2">{coaches.find(c => c.id === s.created_by)?.name || '강사'}T</p>
                  </div>

                  <div className="flex-1 min-w-[250px] text-left">
                    <p className="text-lg font-bold text-slate-800 truncate" title={s.title}>{s.title}</p>
                    <span className="inline-block mt-1 text-[11px] font-black px-2 py-0.5 rounded-md bg-slate-100 text-slate-400 uppercase">{s.session_type === 'regular_center' ? 'Center' : 'Visit'}</span>
                  </div>

                  <div className="w-[140px] text-center shrink-0">
                    <span className={`px-4 py-2 rounded-full text-[11px] font-black whitespace-nowrap ${isVerified ? 'bg-blue-100 text-blue-700' : isActuallyDone ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-600'}`}>
                      {isVerified ? '● VERIFIED' : isActuallyDone ? '● REPORT DONE' : '○ NO REPORT'}
                    </span>
                  </div>

                  <div className="w-[180px] flex justify-end gap-2 shrink-0">
                    <button 
                      onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/report/${s.id}`); alert('리포트 링크 복사됨'); }}
                      className={`p-3 rounded-2xl transition-all ${isActuallyDone ? 'bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white cursor-pointer' : 'bg-slate-50 text-slate-200 cursor-not-allowed'}`}
                      disabled={!isActuallyDone}
                    >
                      <Send size={20} />
                    </button>
                    <button 
                      onClick={() => openEditModal(s)}
                      className="px-6 py-3 bg-slate-900 text-white rounded-2xl text-sm font-black hover:bg-indigo-600 transition-all shadow-lg cursor-pointer"
                    >
                      검수
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {isModalOpen && selectedEvent && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[999] flex items-center justify-center p-4" onClick={() => setIsModalOpen(false)}>
          <div className="bg-white w-full max-w-2xl rounded-[48px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <div className="px-12 py-8 border-b border-slate-50 flex justify-between items-center text-left">
              <h2 className="text-2xl font-black text-slate-900 leading-tight truncate mr-4">{selectedEvent.title}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-3xl text-slate-300 font-bold hover:text-slate-900 transition-colors cursor-pointer">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-12 space-y-10">
              <div className="grid grid-cols-3 gap-4">
                {photoUrls.map((url, i) => (
                  <div key={i} className="relative aspect-square">
                    <img src={url} className="w-full h-full object-cover rounded-[24px] shadow-sm border border-slate-100" />
                  </div>
                ))}
              </div>
              <div className="text-left space-y-2">
                <label className="text-[11px] font-black text-indigo-500 uppercase tracking-widest ml-1">Report Contents</label>
                <textarea className="w-full h-[350px] bg-slate-50 border-none rounded-[32px] p-8 text-base leading-relaxed text-slate-700 outline-none shadow-inner resize-none focus:bg-white transition-all" value={feedback} onChange={(e) => setFeedback(e.target.value)} />
              </div>
            </div>
            <div className="p-10 bg-slate-50 border-t border-slate-100 flex gap-4">
              <button 
                onClick={() => handleSave('finished')} 
                className="flex-1 py-5 bg-white border border-slate-200 rounded-[24px] font-bold text-rose-500 hover:bg-rose-50 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                <RotateCcw size={20} /> 상태 원복
              </button>
              <button 
                onClick={() => handleSave('verified')} 
                className="flex-[2.5] py-5 bg-slate-900 rounded-[24px] font-black text-white shadow-xl hover:bg-indigo-600 transition-all cursor-pointer"
              >
                최종 수정 및 승인 완료
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}