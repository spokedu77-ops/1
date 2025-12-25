'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

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

export default function MyClassesPage() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [feedback, setFeedback] = useState(FEEDBACK_TEMPLATE);
  const [uploading, setUploading] = useState(false);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);

  const getMySchedule = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    
    const { data: rawSessions, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('created_by', user.id)
      .order('start_at', { ascending: true });
    
    if (!error && rawSessions) setSessions(rawSessions);
    setLoading(false);
  };

  useEffect(() => { getMySchedule(); }, []);

  const handleItemClick = (session: any) => {
    setSelectedEvent(session);
    setFeedback(session.students_text || FEEDBACK_TEMPLATE);
    
    // [수정] JSON 파싱 대신 콤마 구분자로 사진 불러오기
    let initialPhotos: string[] = [];
    if (session.photo_url && typeof session.photo_url === 'string') {
      initialPhotos = session.photo_url
        .split(',')
        .filter(url => url && url.trim() !== "" && url.startsWith('http'));
    }
    setPhotoUrls(initialPhotos);
    setIsModalOpen(true);
  };

  // [수정] 기록 완료 함수: 관리자/학부모 리포트와 형식을 맞춤 (콤마 구분자 저장)
  const handleCompleteSession = async () => {
    if (!selectedEvent) return;
    
    try {
      const { error } = await supabase
        .from('sessions')
        .update({ 
          status: 'finished', 
          students_text: feedback.trim(), 
          photo_url: photoUrls.join(',') // JSON.stringify 대신 join(',') 사용
        })
        .eq('id', selectedEvent.id);

      if (!error) { 
        alert('리포트 작성이 완료되었습니다! 마스터 검수 후 학부모님께 전달됩니다.'); 
        setIsModalOpen(false); 
        getMySchedule(); 
      } else {
        throw error;
      }
    } catch (err) {
      alert('저장 중 오류가 발생했습니다.');
    }
  };

  const handleResetSession = async () => {
    if (!selectedEvent) return;
    if (!confirm('작성된 내용을 초기화하고 상태를 작성대기로 변경하시겠습니까?')) return;

    const { error } = await supabase
      .from('sessions')
      .update({ 
        status: 'pending',
        students_text: FEEDBACK_TEMPLATE, 
        photo_url: "" // 초기화 시 빈 문자열
      })
      .eq('id', selectedEvent.id);

    if (!error) {
      setFeedback(FEEDBACK_TEMPLATE);
      setPhotoUrls([]);
      alert('초기화되었습니다.');
      setIsModalOpen(false);
      getMySchedule();
    }
  };

  const handlePhotoUpload = async (e: any) => {
    if (photoUrls.length >= 3) return alert('사진은 최대 3장까지만 가능합니다.');
    try {
      setUploading(true);
      const file = e.target.files[0];
      if (!file) return;
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
      await supabase.storage.from('session-photos').upload(fileName, file);
      const { data } = supabase.storage.from('session-photos').getPublicUrl(fileName);
      setPhotoUrls(prev => [...prev, data.publicUrl]);
    } catch (error) { alert('업로드 실패'); } finally { setUploading(false); }
  };

  return (
    <div className="flex-1 min-h-screen bg-[#F8FAFC]">
      <style>{`
        @import url("https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css");
        * { font-family: "Pretendard Variable", sans-serif !important; letter-spacing: -0.025em; }
        .cursor-pointer { cursor: pointer !important; }
      `}</style>

      <div className="max-w-5xl mx-auto p-6 md:p-10 space-y-8">
        <header className="flex justify-between items-end pb-6 border-b-2 border-slate-200">
          <div>
            <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1 text-left">Spokidue Management</p>
            <h1 className="text-3xl font-black text-slate-900 tracking-tighter">내 수업 일정</h1>
          </div>
        </header>

        <section className="grid grid-cols-1 gap-4">
          {loading ? (
            <div className="py-20 text-center text-slate-400 font-bold">로딩 중...</div>
          ) : (
            sessions.map((session) => (
              <div 
                key={session.id} 
                onClick={() => handleItemClick(session)} 
                className="bg-white p-5 md:p-6 rounded-[28px] shadow-sm border border-slate-100 flex items-center justify-between hover:border-blue-400 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-4 md:gap-6 min-w-0">
                  <div className="flex-shrink-0 flex flex-col items-center justify-center bg-slate-50 w-16 h-16 md:w-20 md:h-20 rounded-2xl">
                    <span className="text-[9px] font-bold text-slate-400 mb-0.5 uppercase">Time</span>
                    <span className="text-base md:text-lg font-black text-slate-900 leading-none">
                      {new Date(session.start_at).getHours()}:{String(new Date(session.start_at).getMinutes()).padStart(2, '0')}
                    </span>
                  </div>
                  <div className="truncate text-left">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${session.session_type === 'regular_center' ? 'bg-indigo-50 text-indigo-600' : 'bg-sky-50 text-sky-600'}`}>
                        {session.session_type === 'regular_center' ? '센터' : '방문'}
                      </span>
                      <span className="text-[11px] font-bold text-slate-400">
                        {new Date(session.start_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', weekday: 'short' })}
                      </span>
                    </div>
                    <h3 className="text-lg md:text-xl font-black text-slate-900 truncate tracking-tight">{session.title || '수업'}</h3>
                  </div>
                </div>
                <div className={`px-4 py-2 rounded-full text-[11px] font-black shrink-0 ${session.status === 'finished' ? 'bg-emerald-50 text-emerald-500' : 'bg-slate-50 text-slate-300'}`}>
                  {session.status === 'finished' ? '기록완료' : '작성대기'}
                </div>
              </div>
            ))
          )}
        </section>
      </div>

      {isModalOpen && selectedEvent && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-0 md:p-6" onClick={() => setIsModalOpen(false)}>
          <div className="bg-white w-full h-full md:h-auto md:max-w-2xl md:rounded-[40px] shadow-2xl flex flex-col max-h-screen md:max-h-[92vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-6 md:px-10 py-5 border-b border-slate-50 flex justify-between items-center bg-white">
              <h2 className="text-xl font-black text-slate-900 tracking-tight">수업 피드백 작성</h2>
              <button onClick={() => setIsModalOpen(false)} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-50 text-slate-400 hover:text-slate-900 cursor-pointer font-bold transition-all">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-10 pb-40 md:pb-10">
              <div className="space-y-4">
                <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest ml-1 text-left block">Daily Feedback Report</label>
                <textarea 
                  className="w-full h-80 md:h-[400px] bg-slate-50 border-none rounded-[32px] p-6 md:p-8 text-[15px] leading-relaxed text-slate-700 outline-none focus:bg-white focus:ring-4 focus:ring-blue-50 transition-all shadow-inner resize-none"
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                />
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 text-left block">Class Photos ({photoUrls.length}/3)</label>
                <div className="grid grid-cols-3 gap-3">
                  {photoUrls.map((url, i) => (
                    <div key={i} className="relative aspect-square">
                      <img 
                        src={url} 
                        className="w-full h-full rounded-2xl object-cover border-2 border-white shadow-md" 
                        alt="" 
                      />
                      <button onClick={() => setPhotoUrls(photoUrls.filter((_, idx) => idx !== i))} className="absolute -top-2 -right-2 bg-slate-900 text-white w-6 h-6 rounded-full text-[10px] flex items-center justify-center cursor-pointer shadow-lg">✕</button>
                    </div>
                  ))}
                  {photoUrls.length < 3 && (
                    <label className="aspect-square rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center bg-slate-50 text-slate-300 cursor-pointer hover:bg-white hover:border-blue-400 transition-all">
                      <span className="text-xl">📸</span>
                      <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} disabled={uploading} />
                    </label>
                  )}
                </div>
              </div>
            </div>

            <div className="fixed md:static bottom-0 left-0 right-0 p-6 md:p-8 bg-white border-t border-slate-50 flex gap-4 z-20">
              <button 
                onClick={handleResetSession} 
                className="flex-1 bg-slate-100 text-slate-400 py-4 md:py-5 rounded-[22px] font-bold text-sm cursor-pointer hover:bg-slate-200 transition-colors"
              >
                기록 초기화
              </button>
              <button 
                onClick={handleCompleteSession} 
                className="flex-[2] bg-slate-900 text-white py-4 md:py-5 rounded-[22px] font-black text-sm shadow-xl hover:bg-blue-600 transition-all cursor-pointer"
              >
                기록 완료 및 저장
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}