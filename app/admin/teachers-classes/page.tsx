'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// 강사 페이지와 100% 동일한 템플릿 (띄어쓰기 주의)
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
  const [coaches, setCoaches] = useState<any[]>([]);
  const [selectedCoachId, setSelectedCoachId] = useState('all');
  
  // 날짜 필터 (기본값: 오늘)
  const [selectedDate, setSelectedDate] = useState(
  new Date(new Date().getTime() + 9 * 60 * 60 * 1000).toISOString().split('T')[0]
);
  
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const initPage = async () => {
      // 1. 강사 목록
      const { data: userData } = await supabase.from('users').select('id, name, email').order('name');
      if (userData) setCoaches(userData);
      
      // 2. 수업 목록
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

  const filteredSessions = sessions.filter(s => {
    const sessionDate = s.start_at.substring(0, 10);
    const matchCoach = selectedCoachId === 'all' || s.created_by === selectedCoachId;
    const matchDate = !selectedDate || sessionDate === selectedDate;
    return matchCoach && matchDate;
  });

  const openEditModal = (session: any) => {
    setSelectedEvent(session);
    setFeedback(session.students_text || FEEDBACK_TEMPLATE);
    
    // 사진 파싱 방어코드
    let photos: string[] = [];
    if (session.photo_url && typeof session.photo_url === 'string') {
        photos = session.photo_url.split(',').filter((url: string) => url.trim() !== '' && url.startsWith('http'));
    } else if (Array.isArray(session.photo_url)) {
        photos = session.photo_url;
    }
    setPhotoUrls(photos);
    
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    const { error } = await supabase
      .from('sessions')
      .update({
        students_text: feedback,
        photo_url: photoUrls.join(','),
        status: 'finished'
      })
      .eq('id', selectedEvent.id);

    if (!error) {
      alert('검수 및 수정이 완료되었습니다.');
      setIsModalOpen(false);
      fetchListData(selectedCoachId);
    } else {
      alert('저장 실패: ' + error.message);
    }
  };

  const handlePhotoUpload = async (e: any) => {
    try {
      if (photoUrls.length >= 3) return alert('최대 3장');
      setUploading(true);
      const file = e.target.files[0];
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
      await supabase.storage.from('session-photos').upload(fileName, file);
      const { data } = supabase.storage.from('session-photos').getPublicUrl(fileName);
      setPhotoUrls(prev => [...prev, data.publicUrl]);
    } catch (err) { alert('실패'); } finally { setUploading(false); }
  };

  return (
    <div className="min-h-screen bg-[#F1F5F9] p-4 md:p-8">
      <style>{`
        @import url("https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css");
        * { font-family: "Pretendard Variable", sans-serif !important; letter-spacing: -0.025em; }
        button, select, label, input, .cursor-pointer { cursor: pointer !important; }
        .qc-table tr:hover { background-color: #F8FAFC; }
      `}</style>

      <div className="max-w-screen-2xl mx-auto space-y-6">
        <header className="flex flex-col md:flex-row justify-between items-center bg-white p-8 rounded-[32px] shadow-sm border border-slate-200/50">
          <div>
            <h1 className="text-3xl font-black text-slate-900 italic tracking-tighter">QC DASHBOARD</h1>
            <p className="text-xs font-bold text-indigo-600 uppercase tracking-[0.2em] mt-1">Master Management System</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-4 mt-6 md:mt-0">
            {/* 날짜 필터 */}
            <div className="bg-slate-100 px-5 py-3 rounded-2xl flex items-center gap-3 border border-slate-200/50">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</span>
              <input 
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-sm font-black text-slate-700 outline-none w-[130px]"
              />
            </div>

            {/* 강사 필터 */}
            <div className="bg-slate-100 px-5 py-3 rounded-2xl flex items-center gap-3 border border-slate-200/50">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Coach</span>
              <select 
                value={selectedCoachId} 
                onChange={(e) => { setSelectedCoachId(e.target.value); fetchListData(e.target.value); }}
                className="bg-transparent text-sm font-black text-slate-700 outline-none min-w-[150px]"
              >
                <option value="all">전체 강사</option>
                {coaches.map(c => <option key={c.id} value={c.id}>{c.name || c.email} 선생님</option>)}
              </select>
            </div>

            <button 
              onClick={() => { setSelectedDate(''); setSelectedCoachId('all'); fetchListData('all'); }}
              className="text-[10px] font-black text-slate-400 hover:text-slate-600 transition-all uppercase px-2"
            >
              Reset
            </button>
          </div>
        </header>

        <div className="bg-white rounded-[40px] shadow-xl shadow-slate-200/50 border border-slate-200/60 overflow-hidden">
          <table className="w-full text-left border-collapse qc-table">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100">
                <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest">일시</th>
                <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest">강사</th>
                <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest">수업 정보</th>
                <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest text-center">상태</th>
                <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest text-center">작성량</th>
                <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest text-right">액션</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredSessions.map((s) => {
                // [기똥찬 로직]
                // 1. 전체 텍스트에서 템플릿(FEEDBACK_TEMPLATE)을 제거합니다.
                // 2. 앞뒤 공백(trim)을 제거합니다.
                // 3. 남은 글자 수가 0보다 커야 진짜 내용을 쓴 것입니다.
                const pureContent = s.students_text 
                  ? s.students_text.replace(FEEDBACK_TEMPLATE, '').trim() 
                  : '';
                
                // 최종 조건: DB상태가 finished 이고, 강사가 내용을 채웠어야 함
                const isActuallyDone = s.status === 'finished' && pureContent.length > 0;

                return (
                  <tr key={s.id} className="transition-colors">
                    <td className="px-8 py-6">
                      <p className="text-sm font-black text-slate-900">{new Date(s.start_at).toLocaleDateString()}</p>
                      <p className="text-[11px] text-slate-400 font-bold mt-0.5">
                        {new Date(s.start_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </p>
                    </td>

                    <td className="px-8 py-6">
                      <span className="text-sm font-black text-slate-700">
                        {coaches.find(c => c.id === s.created_by)?.name || '강사'} T
                      </span>
                    </td>

                    <td className="px-8 py-6">
                      <p className="text-sm font-black text-slate-800">{s.title}</p>
                      <div className="flex gap-2 mt-1.5">
                        <span className="text-[9px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-black uppercase">
                          {s.session_type === 'regular_center' ? 'Center' : 'Visit'}
                        </span>
                      </div>
                    </td>
                    
                    {/* 상태 렌더링 */}
                    <td className="px-8 py-6 text-center">
                      {isActuallyDone ? (
                        <span className="inline-flex items-center px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-black tracking-tight">
                          ● REPORT DONE
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-3 py-1 rounded-full bg-rose-50 text-rose-500 text-[10px] font-black tracking-tight">
                          ○ NO REPORT
                        </span>
                      )}
                    </td>

                    {/* 디버깅 및 확인용: 순수 작성 글자 수 */}
                    <td className="px-8 py-6 text-center">
                        <span className="text-[10px] font-bold text-slate-400">
                          {pureContent.length > 0 ? `+${pureContent.length}자` : '내용 없음'}
                        </span>
                    </td>

                    <td className="px-8 py-6 text-right flex justify-end gap-2">
                      <button 
                        onClick={() => {
                          const url = `${window.location.origin}/report/${s.id}`;
                          navigator.clipboard.writeText(url);
                          alert('리포트 주소가 복사되었습니다.');
                        }}
                        // 리포트가 완성 안됐으면 링크 복사 버튼 비활성화 시각 효과 (선택사항)
                        className={`text-[11px] font-black px-4 py-3 rounded-xl transition-all ${
                          isActuallyDone 
                          ? 'bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white' 
                          : 'bg-slate-50 text-slate-300'
                        }`}
                      >
                        🔗 링크 복사
                      </button>
                      <button 
                        onClick={() => openEditModal(s)}
                        className="text-xs font-black bg-slate-900 text-white px-6 py-3 rounded-xl hover:bg-indigo-600 transition-all"
                      >
                        상세 검수
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          
          {loading && <div className="p-32 text-center text-sm font-black text-slate-300 animate-pulse uppercase">Searching...</div>}
          {!loading && filteredSessions.length === 0 && (
            <div className="p-32 text-center text-sm font-black text-slate-400 uppercase">
              해당 조건의 수업 데이터가 없습니다.
            </div>
          )}
        </div>

        {/* 모달 */}
        {isModalOpen && selectedEvent && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[9999] flex items-center justify-center p-4" onClick={() => setIsModalOpen(false)}>
            <div className="bg-white w-full max-w-2xl rounded-[48px] shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
              <div className="px-12 py-10 border-b border-slate-50 flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-black text-slate-900">{selectedEvent.title}</h2>
                  <p className="text-xs font-bold text-slate-400 mt-1">강사 피드백 및 사진 검수</p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="bg-slate-50 text-slate-400 w-12 h-12 rounded-full flex items-center justify-center hover:bg-slate-100 transition-all">✕</button>
              </div>
              <div className="flex-1 overflow-y-auto p-12 space-y-10">
                <div className="grid grid-cols-3 gap-6">
                  {photoUrls.map((url, i) => (
                    <div key={i} className="relative aspect-square group">
                      <img src={url} className="w-full h-full object-cover rounded-[24px] shadow-md transition-transform group-hover:scale-[1.02]" alt="수업사진" />
                      <button onClick={() => setPhotoUrls(prev => prev.filter((_, idx) => idx !== i))} className="absolute -top-3 -right-3 bg-red-500 text-white w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center border-4 border-white shadow-lg">✕</button>
                    </div>
                  ))}
                  {photoUrls.length < 3 && (
                    <label className="aspect-square rounded-[24px] border-4 border-dashed border-slate-100 flex flex-col items-center justify-center bg-slate-50 hover:bg-white hover:border-indigo-200 transition-all cursor-pointer">
                      <span className="text-3xl mb-1">📸</span>
                      <span className="text-[10px] font-black text-slate-400">UPLOAD</span>
                      <input type="file" className="hidden" onChange={handlePhotoUpload} />
                    </label>
                  )}
                </div>
                <div className="space-y-4">
                   <label className="text-[10px] font-black text-indigo-500 uppercase tracking-widest ml-1">Report Content</label>
                   <textarea 
                    className="w-full h-[350px] bg-slate-50 border-none rounded-[32px] p-8 text-sm leading-relaxed text-slate-700 outline-none shadow-inner focus:bg-white focus:ring-2 focus:ring-indigo-100 transition-all"
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                  />
                </div>
              </div>
              <div className="p-10 bg-slate-50/50 border-t border-slate-100 flex gap-4 mt-auto">
                <button onClick={() => setIsModalOpen(false)} className="flex-1 py-5 bg-white border border-slate-200 rounded-[22px] font-bold text-slate-400 hover:bg-slate-50 transition-all">닫기</button>
                <button onClick={handleSave} className="flex-[2] py-5 bg-slate-900 rounded-[22px] font-black text-white shadow-xl shadow-slate-200 hover:bg-indigo-600 transition-all active:scale-[0.98]">수정 및 검수 완료</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}