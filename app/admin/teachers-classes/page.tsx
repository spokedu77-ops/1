'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Send, RotateCcw, User, MapPin, X, ExternalLink, FileText, Maximize2 } from 'lucide-react';

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
  
  // 한국 시간(KST) 날짜 가져오기 개선
  const getTodayKST = () => {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    const kstDate = new Date(now.getTime() - offset);
    return kstDate.toISOString().split('T')[0];
  };

  const [selectedDate, setSelectedDate] = useState(getTodayKST());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [feedback, setFeedback] = useState('');
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [fileUrls, setFileUrls] = useState<string[]>([]);
  const [zoomedImg, setZoomedImg] = useState<string | null>(null);

  const fetchListData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase.from('sessions').select('*').order('start_at', { ascending: true });
      if (error) throw error;
      if (data) setSessions(data);
    } catch (err: any) {
      console.error('데이터 로드 실패:', err);
      setError('데이터를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initPage = async () => {
      const { data: userData } = await supabase.from('users').select('id, name').order('name');
      if (userData) setCoaches(userData);
      fetchListData();
    };
    initPage();
  }, [fetchListData]);

  const filteredSessions = sessions.filter(s => {
    const sessionKST = new Date(s.start_at).toISOString().split('T')[0];
    const matchDate = sessionKST === selectedDate;
    const matchCoach = selectedCoachId === 'all' || s.created_by === selectedCoachId;
    return matchDate && matchCoach;
  });

  const openEditModal = (session: any) => {
    setSelectedEvent(session);
    setFeedback(session.students_text || FEEDBACK_TEMPLATE);
    setPhotoUrls(Array.isArray(session.photo_url) ? session.photo_url : []);
    setFileUrls(Array.isArray(session.file_url) ? session.file_url : []);
    setIsModalOpen(true);
  };

  const handleSave = async (newStatus = 'verified') => {
    if (!selectedEvent) return;

    try {
      const updateData: any = { 
        status: newStatus,
        students_text: feedback,
        photo_url: photoUrls,
        file_url: fileUrls,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('sessions')
        .update(updateData)
        .eq('id', selectedEvent.id);

      if (error) throw error;

      alert(newStatus === 'verified' ? '검수 승인 완료!' : '수정 요청 완료!');
      setIsModalOpen(false);
      fetchListData();
    } catch (error: any) {
      console.error('저장 실패:', error);
      alert('저장에 실패했습니다: ' + error.message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-12 text-left">
      {zoomedImg && (
        <div className="fixed inset-0 z-[10000] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out" onClick={() => setZoomedImg(null)}>
          <img src={zoomedImg} className="max-w-full max-h-full object-contain rounded-lg animate-in zoom-in-95 duration-200" alt="확대" />
          <button className="absolute top-10 right-10 text-white/50 hover:text-white transition-colors"><X size={40} /></button>
        </div>
      )}

      <div className="max-w-6xl mx-auto">
        <header className="mb-12 flex flex-col md:flex-row justify-between items-end gap-6">
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter italic uppercase">Spokedu QC</h1>
            <p className="text-slate-500 font-bold mt-2">체육 교육의 기준점, 스포키듀 리포트 마스터 검수</p>
          </div>
          <div className="flex gap-3 bg-white p-3 rounded-3xl shadow-sm border border-slate-200">
            <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="bg-slate-50 px-4 py-2 rounded-xl text-sm font-bold outline-none cursor-pointer" />
            <select value={selectedCoachId} onChange={(e) => setSelectedCoachId(e.target.value)} className="bg-slate-50 px-4 py-2 rounded-xl text-sm font-bold outline-none cursor-pointer">
              <option value="all">전체 강사</option>
              {coaches.map(c => <option key={c.id} value={c.id}>{c.name} 선생님</option>)}
            </select>
          </div>
        </header>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-4 border border-red-200">
            <p className="font-bold">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="py-40 text-center font-black text-slate-300 animate-pulse tracking-widest uppercase">Syncing Spokedu Data...</div>
        ) : filteredSessions.length === 0 ? (
          <div className="bg-white rounded-[40px] py-32 text-center border border-dashed border-slate-300">
            <p className="text-slate-400 font-bold">해당 일자에 등록된 수업이 없습니다.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredSessions.map((s) => {
              // 상태 판별 단순화
              const isEmpty = !s.students_text || s.students_text.trim() === '' || s.students_text === FEEDBACK_TEMPLATE;
              const isVerified = s.status === 'verified';
              const isDone = !isEmpty && !isVerified;
              
              const time = new Date(s.start_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
              const coachName = coaches.find(c => c.id === s.created_by)?.name || '강사';

              return (
                <div key={s.id} className="bg-white rounded-[40px] p-8 shadow-sm border border-slate-200 flex flex-col hover:shadow-xl transition-all duration-300">
                  <div className="flex justify-between items-start mb-6">
                    <span className="bg-indigo-50 text-indigo-600 px-4 py-1.5 rounded-full text-xs font-black tracking-tight">{time}</span>
                    <span className={`text-[11px] font-black px-3 py-1.5 rounded-xl uppercase tracking-widest ${
                      isVerified ? 'bg-blue-600 text-white shadow-md' : 
                      isDone ? 'bg-emerald-500 text-white shadow-md' : 
                      'bg-slate-100 text-slate-300'
                    }`}>
                      {isVerified ? 'VERIFIED' : isDone ? 'DONE' : 'EMPTY'}
                    </span>
                  </div>

                  <h3 className="text-2xl font-black text-slate-900 mb-2 line-clamp-1 tracking-tight text-left">{s.title}</h3>
                  <div className="space-y-2 mb-8 text-left">
                    <div className="flex items-center gap-2 text-slate-500 text-sm font-bold">
                      <User size={16} className="text-indigo-400" /> {coachName} 선생님
                    </div>
                    <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
                      <MapPin size={16} /> {s.session_type === 'regular_center' ? 'SPOKEDU 센터' : '방문 수업'}
                    </div>
                  </div>

                  <div className="mt-auto flex gap-3">
                    <button 
                      onClick={() => { 
                        if(!isVerified) return alert('검수가 완료(VERIFIED)된 리포트만 링크 복사가 가능합니다.');
                        navigator.clipboard.writeText(`${window.location.origin}/report/${s.id}`); 
                        alert('리포트 링크가 복사되었습니다.'); 
                      }} 
                      className={`p-4 rounded-3xl transition-all cursor-pointer ${isVerified ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'bg-slate-50 text-slate-200 cursor-not-allowed'}`} 
                      title="링크 복사"
                    >
                      <Send size={20} />
                    </button>
                    <button onClick={() => openEditModal(s)} className="flex-1 py-4 bg-slate-900 text-white rounded-3xl text-sm font-black hover:bg-indigo-600 transition-all shadow-lg active:scale-95 cursor-pointer">리포트 검수</button>
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
            <div className="p-10 border-b flex justify-between items-center bg-white sticky top-0 z-10 text-left">
              <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight leading-tight">{selectedEvent.title}</h2>
                <button onClick={() => window.open(`/report/${selectedEvent.id}`, '_blank')} className="text-indigo-500 text-xs font-bold flex items-center gap-1 mt-1 hover:underline cursor-pointer"><ExternalLink size={12} /> 미리보기</button>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-300 hover:text-slate-900 cursor-pointer transition-colors"><X size={32} /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-10 space-y-10 bg-slate-50/50 text-left">
              {fileUrls.length > 0 && (
                <div className="bg-white p-5 rounded-[24px] border border-indigo-100 space-y-3">
                  <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-1 font-mono text-left">Attached Docs</p>
                  {fileUrls.map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 bg-indigo-50/50 rounded-xl hover:bg-indigo-100 transition-colors cursor-pointer">
                      <FileText size={18} className="text-indigo-500" />
                      <span className="text-sm font-bold text-slate-600 truncate">{decodeURIComponent(url.split('/').pop() || 'File')}</span>
                      <ExternalLink size={14} className="ml-auto text-indigo-300" />
                    </a>
                  ))}
                </div>
              )}

              {photoUrls.length > 0 && (
                <div className="grid grid-cols-3 gap-4">
                  {photoUrls.map((url, i) => (
                    <div key={i} className="relative aspect-square rounded-[24px] overflow-hidden border-2 border-white shadow-sm hover:scale-105 transition-all cursor-zoom-in group" onClick={() => setZoomedImg(url)}>
                      <img src={url} className="w-full h-full object-cover" alt="수업 사진" />
                      <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center"><Maximize2 size={20} className="text-white" /></div>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-4">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2 text-left block">Final Review</label>
                <textarea className="w-full h-80 bg-white border-none shadow-inner rounded-[32px] p-8 text-base leading-relaxed text-slate-700 outline-none focus:ring-2 focus:ring-indigo-100 transition-all resize-none" value={feedback} onChange={(e) => setFeedback(e.target.value)} />
              </div>
            </div>

            <div className="p-10 bg-white border-t flex gap-4">
              <button onClick={() => handleSave('finished')} className="flex-1 py-5 bg-slate-50 border border-slate-200 rounded-3xl font-bold text-rose-500 hover:bg-rose-50 transition-all cursor-pointer"><RotateCcw size={18} className="inline mr-1" /> 수정 요청</button>
              <button onClick={() => handleSave('verified')} className="flex-[2] py-5 bg-slate-900 rounded-3xl font-black text-white shadow-xl hover:bg-indigo-600 transition-all cursor-pointer">검수 승인 및 저장</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}