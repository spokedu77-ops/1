'use client';

import { useState, useEffect, useCallback, Suspense, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  ChevronLeft, ChevronRight, Calendar as CalendarIcon, 
  Camera, X, CheckCircle2, FileText, Paperclip 
} from 'lucide-react';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
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

interface Session {
  id: string;
  title: string;
  start_at: string;
  session_type: string;
  status: string;
  students_text?: string;
  photo_url?: string[];
  file_url?: string[];
}

function MyClassesContent() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<Session | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [feedback, setFeedback] = useState(FEEDBACK_TEMPLATE);
  const [uploading, setUploading] = useState(false);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [fileUrls, setFileUrls] = useState<string[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());

  const isToday = (dateString: string) => {
    const today = new Date();
    const target = new Date(dateString);
    return today.getFullYear() === target.getFullYear() &&
           today.getMonth() === target.getMonth() &&
           today.getDate() === target.getDate();
  };

  const getWeekRange = (date: Date) => {
    const tempDate = new Date(date);
    const day = tempDate.getDay();
    const diff = tempDate.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(tempDate.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    return { monday, sunday };
  };

  const getMySchedule = useCallback(async () => {
    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) return;

      const { monday, sunday } = getWeekRange(new Date(currentDate));
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('created_by', userData.user.id)
        .gte('start_at', monday.toISOString())
        .lte('start_at', sunday.toISOString())
        .order('start_at', { ascending: true });

      if (error) throw error;
      setSessions(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [currentDate]);

  useEffect(() => { getMySchedule(); }, [getMySchedule]);

  const handleItemClick = (session: Session) => {
    setSelectedEvent(session);
    setFeedback(session.students_text || FEEDBACK_TEMPLATE);
    setPhotoUrls(Array.isArray(session.photo_url) ? session.photo_url : []);
    setFileUrls(Array.isArray(session.file_url) ? session.file_url : []);
    setIsModalOpen(true);
  };

  // [핵심 수정] 마일리지 등 다른 필드를 보호하며 피드백만 저장
  const handleCompleteSession = async () => {
    if (!selectedEvent || uploading) return;
    
    // 빈 양식 방지: 템플릿 제외 실질적 내용이 있는지 체크
    const pureContent = feedback.replace(FEEDBACK_TEMPLATE, '').replace(/\s/g, '');
    if (pureContent.length < 5) {
      return alert('수업 피드백 내용을 입력해주세요.');
    }

    setUploading(true);
    try {
      const { error } = await supabase
        .from('sessions')
        .update({ 
          status: 'finished', 
          students_text: feedback.trim(), 
          photo_url: photoUrls, 
          file_url: fileUrls 
          // mileage_option 등을 명시하지 않음으로써 관리자가 설정한 정산 데이터 보호
        })
        .eq('id', selectedEvent.id);

      if (error) throw error;
      alert('성공적으로 저장되었습니다.');
      setIsModalOpen(false);
      getMySchedule();
    } catch (err: any) {
      alert('저장 실패: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleResetStatus = async () => {
    if (!selectedEvent || !confirm('초기화하시겠습니까? (작성된 피드백이 삭제됩니다)')) return;
    setUploading(true);
    try {
      await supabase.from('sessions').update({ 
        status: 'pending', 
        students_text: null, 
        photo_url: [], 
        file_url: [] 
      }).eq('id', selectedEvent.id);
      setIsModalOpen(false);
      getMySchedule();
    } finally { setUploading(false); }
  };

  const uploadFile = async (file: File, bucket: string) => {
    if (!selectedEvent) return null;
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const safeFileName = `${selectedEvent.id}/${Date.now()}.${fileExt}`;
      const { error } = await supabase.storage.from(bucket).upload(safeFileName, file);
      if (error) throw error;
      const { publicUrl } = supabase.storage.from(bucket).getPublicUrl(safeFileName).data;
      return publicUrl;
    } catch (err: any) {
      alert(`파일 업로드 오류: ${err.message}`);
      return null;
    } finally {
      setUploading(false);
    }
  };

  const { monday, sunday } = getWeekRange(new Date(currentDate));

  return (
    <div className="flex-1 min-h-screen bg-[#F8FAFC] pb-20">
      <div className="max-w-5xl mx-auto p-6 md:p-10 space-y-8 text-left">
        <header className="space-y-6 pb-6 border-b-2 border-slate-200">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">SPOKEDU</p>
              <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">MY SCHEDULE</h1>
            </div>
            <button onClick={() => setCurrentDate(new Date())} className="px-4 py-2 bg-white border rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-50 cursor-pointer transition-all active:scale-95">오늘</button>
          </div>
          <div className="flex items-center justify-between bg-white p-2 rounded-2xl shadow-sm border">
            <button onClick={() => setCurrentDate(new Date(currentDate.setDate(currentDate.getDate() - 7)))} className="p-3 cursor-pointer"><ChevronLeft size={20} className="text-slate-400" /></button>
            <span className="text-sm font-black text-slate-700">
              {monday.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })} - {sunday.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
            </span>
            <button onClick={() => setCurrentDate(new Date(currentDate.setDate(currentDate.getDate() + 7)))} className="p-3 cursor-pointer"><ChevronRight size={20} className="text-slate-400" /></button>
          </div>
        </header>

        <div className="grid gap-4">
          {loading ? (
            <div className="py-20 text-center text-slate-400 font-bold animate-pulse">Syncing...</div>
          ) : sessions.length === 0 ? (
            <div className="py-20 text-center bg-white rounded-[32px] border-2 border-dashed border-slate-100 text-slate-300 font-bold text-sm tracking-widest uppercase">No Data</div>
          ) : (
            sessions.map((session) => {
              const startDate = new Date(session.start_at);
              const dayName = startDate.toLocaleDateString('ko-KR', { weekday: 'short' });
              const dateDisplay = `${startDate.getMonth() + 1}.${startDate.getDate()}`;
              const timeDisplay = `${startDate.getHours()}:${String(startDate.getMinutes()).padStart(2, '0')}`;
              
              // [상태 판별 개선] 템플릿 제외 텍스트가 있어야 Done으로 표시
              const pureContent = session.students_text 
                ? session.students_text.replace(FEEDBACK_TEMPLATE, '').replace(/\s/g, '') 
                : '';
              
              const isVerified = session.status === 'verified';
              const isActuallyDone = (session.status === 'finished' || isVerified) && pureContent.length > 5;

              return (
                <div key={session.id} onClick={() => handleItemClick(session)} className={`p-4 md:p-6 rounded-[28px] shadow-sm border-2 transition-all cursor-pointer flex items-center justify-between ${isToday(session.start_at) ? 'border-blue-400 bg-blue-50/30' : 'bg-white border-transparent hover:border-slate-200'}`}>
                  <div className="flex items-center gap-4 md:gap-6">
                    <div className={`w-20 h-20 rounded-2xl flex flex-col items-center justify-center shrink-0 ${isToday(session.start_at) ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-50 text-slate-900'}`}>
                      <span className={`text-[10px] font-black uppercase mb-0.5 ${isToday(session.start_at) ? 'text-blue-100' : 'text-slate-400'}`}>{dayName} {dateDisplay}</span>
                      <span className="text-lg font-black leading-none">{timeDisplay}</span>
                    </div>
                    <div className="text-left">
                      <div className="flex gap-2 mb-1">
                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase ${session.session_type === 'regular_center' ? 'bg-indigo-100 text-indigo-600' : 'bg-sky-100 text-sky-600'}`}>{session.session_type === 'regular_center' ? 'Center' : 'Visit'}</span>
                      </div>
                      <h3 className="text-base md:text-lg font-black text-slate-800 tracking-tight line-clamp-1">{session.title || 'Untitled'}</h3>
                    </div>
                  </div>
                  <div className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest shrink-0 ${
                    isActuallyDone || isVerified
                      ? 'bg-emerald-50 text-emerald-500' 
                      : 'bg-slate-50 text-slate-300'
                  }`}>
                    {(isActuallyDone || isVerified) ? 'Done' : 'Wait'}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {isModalOpen && selectedEvent && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4" onClick={() => setIsModalOpen(false)}>
          <div className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
            <div className="px-8 py-6 border-b flex justify-between items-center bg-white sticky top-0 z-10 text-left">
              <div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight uppercase">Session Report</h2>
                <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase">
                  {new Date(selectedEvent.start_at).toLocaleString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="cursor-pointer text-slate-400 hover:text-slate-900 transition-colors"><X size={24} /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-10 text-left bg-slate-50/30">
              {selectedEvent.session_type === 'regular_center' && (
                <div className="space-y-4 p-6 bg-blue-50/50 rounded-[32px] border border-blue-100">
                  <div className="flex items-center gap-2 text-blue-600 font-black text-[10px] uppercase tracking-widest">
                    <Paperclip size={14} /> Center Documents
                  </div>
                  <div className="grid gap-2">
                    {fileUrls.map((url, i) => (
                      <div key={i} className="flex items-center justify-between bg-white p-3 rounded-xl border border-blue-100 shadow-sm">
                        <span className="text-xs font-bold text-slate-600 truncate max-w-[300px]">{url.split('/').pop()}</span>
                        <button onClick={() => setFileUrls(fileUrls.filter((_, idx) => idx !== i))} className="text-slate-300 hover:text-red-500 cursor-pointer"><X size={16} /></button>
                      </div>
                    ))}
                    <label className="flex items-center justify-center p-4 bg-white border-2 border-dashed border-blue-200 rounded-xl text-blue-500 hover:bg-blue-50 cursor-pointer transition-all active:scale-95">
                      <span className="text-xs font-black uppercase tracking-widest">+ Add File</span>
                      <input type="file" className="hidden" onChange={async (e) => {
                        const url = await uploadFile(e.target.files?.[0] as File, 'session-files');
                        if (url) setFileUrls(prev => [...prev, url]);
                      }} disabled={uploading} />
                    </label>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">Daily Feedback</label>
                <textarea 
                  className="w-full min-h-[300px] bg-white rounded-[32px] p-8 text-[15px] leading-relaxed text-slate-700 outline-none focus:ring-4 focus:ring-blue-50 shadow-sm border border-slate-100 resize-none transition-all"
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="아이들의 성장을 기록해주세요..."
                />
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">Photos ({photoUrls.length}/3)</label>
                <div className="grid grid-cols-3 gap-3">
                  {photoUrls.map((url, i) => (
                    <div key={i} className="relative aspect-square">
                      <img src={url} className="w-full h-full rounded-2xl object-cover border-2 border-white shadow-md" alt="" referrerPolicy="no-referrer" />
                      <button onClick={() => setPhotoUrls(photoUrls.filter((_, idx) => idx !== i))} className="absolute -top-2 -right-2 bg-red-500 text-white w-6 h-6 rounded-full flex items-center justify-center shadow-lg cursor-pointer"><X size={12} /></button>
                    </div>
                  ))}
                  {photoUrls.length < 3 && (
                    <label className="aspect-square rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center bg-white text-slate-300 hover:bg-slate-50 hover:border-blue-400 cursor-pointer transition-all active:scale-95">
                      <Camera size={24} />
                      <input type="file" className="hidden" accept="image/*" onChange={async (e) => {
                        const url = await uploadFile(e.target.files?.[0] as File, 'session-photos');
                        if (url) setPhotoUrls(prev => [...prev, url]);
                      }} disabled={uploading} />
                    </label>
                  )}
                </div>
              </div>
            </div>

            <div className="p-8 bg-white border-t flex gap-4">
              {selectedEvent.status === 'finished' && (
                <button onClick={handleResetStatus} disabled={uploading} className="flex-1 bg-slate-100 text-slate-400 py-5 rounded-[22px] font-black text-sm cursor-pointer hover:bg-red-50 transition-all uppercase">Reset</button>
              )}
              <button onClick={handleCompleteSession} disabled={uploading} className={`flex-[2] py-5 rounded-[22px] font-black text-sm shadow-xl transition-all cursor-pointer active:scale-95 uppercase ${uploading ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-slate-900 text-white hover:bg-blue-600'}`}>
                {uploading ? 'Processing...' : 'Complete & Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MyClassesPage() {
  return (
    <Suspense fallback={<div className="p-20 text-center font-bold text-slate-300">Syncing...</div>}>
      <MyClassesContent />
    </Suspense>
  );
}