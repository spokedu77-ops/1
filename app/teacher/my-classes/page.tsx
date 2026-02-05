'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { 
  ChevronLeft, ChevronRight, 
  Camera, X, FileText, Paperclip, ChevronDown, ChevronUp, Copy 
} from 'lucide-react';
import { 
  FeedbackFields,
  parseTemplateToFields,
  fieldsToTemplateText
} from '@/app/lib/feedbackValidation';
import { getSupabaseBrowserClient } from '@/app/lib/supabase/browser';

interface Session {
  id: string;
  title: string;
  start_at: string;
  session_type: string;
  status: string;
  group_id?: string | null;
  students_text?: string;
  photo_url?: string[];
  file_url?: string[];
  feedback_fields?: FeedbackFields;
}

interface PreviousLessonPlan {
  sessionId: string;
  start_at: string;
  content: string;
}

function MyClassesContent() {
  const [supabase] = useState(() => (typeof window !== 'undefined' ? getSupabaseBrowserClient() : null));
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<Session | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [feedbackFields, setFeedbackFields] = useState<FeedbackFields>({});
  const [uploading, setUploading] = useState(false);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [fileUrls, setFileUrls] = useState<string[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isLessonPlanModalOpen, setIsLessonPlanModalOpen] = useState(false);
  const [lessonPlanContent, setLessonPlanContent] = useState('');
  const [lessonPlanSaving, setLessonPlanSaving] = useState(false);
  const [currentSessionLessonPlanId, setCurrentSessionLessonPlanId] = useState<string | null>(null);
  const [previousPlans, setPreviousPlans] = useState<PreviousLessonPlan[]>([]);
  const [previousPlansExpandedId, setPreviousPlansExpandedId] = useState<string | null>(null);

  const getBaseTitle = (title: string): string => {
    const original = title;
    const cleaned = title
      .replace(/^\d+\/\d+\s+/i, '')
      .replace(/\s*[-_/]\s*\d+회차$/i, '')
      .replace(/\s+\d+회차$/i, '')
      .replace(/\s*[-_/]\s*\d+회$/i, '')
      .replace(/\s+\d+회$/i, '')
      .replace(/\s*[-_/]\s*\d+차$/i, '')
      .replace(/\s+\d+차$/i, '')
      .replace(/\s*[-_/]\s*\d+$/i, '')
      .replace(/\s+\d+$/i, '')
      .replace(/\d+$/, '')
      .replace(/\s*\(\d+\)$/i, '')
      .replace(/\s*\(\d{4}-\d{2}-\d{2}\)$/i, '')
      .replace(/\s*\d{4}-\d{2}-\d{2}$/i, '')
      .trim();
    return cleaned || original;
  };

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
    if (!supabase) return;
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
  }, [supabase, currentDate]);

  useEffect(() => { getMySchedule(); }, [getMySchedule]);

  const handleItemClick = (session: Session) => {
    setSelectedEvent(session);
    
    if (session.feedback_fields && Object.keys(session.feedback_fields).length > 0) {
      setFeedbackFields(session.feedback_fields);
    } else if (session.students_text) {
      setFeedbackFields(parseTemplateToFields(session.students_text));
    } else {
      setFeedbackFields({});
    }
    
    setPhotoUrls(Array.isArray(session.photo_url) ? session.photo_url : []);
    setFileUrls(Array.isArray(session.file_url) ? session.file_url : []);
    setIsModalOpen(true);
  };

  const handleCompleteSession = async () => {
    if (!supabase || !selectedEvent || uploading) return;
    
    // 센터 수업: 파일만 체크
    if (selectedEvent.session_type === 'regular_center') {
      if (fileUrls.length === 0) {
        return alert('파일을 최소 1개 업로드해주세요.');
      }
    } else {
      // 개인 수업: 필수 필드 체크
      const requiredFields = ['main_activity', 'strengths', 'next_goals'];
      const missingFields = requiredFields.filter(
        field => !feedbackFields[field as keyof FeedbackFields] || 
                 feedbackFields[field as keyof FeedbackFields]!.trim().length < 5
      );
      
      if (missingFields.length > 0) {
        const fieldNames: Record<string, string> = {
          main_activity: '오늘 수업의 주요 활동',
          strengths: '강점 및 긍정적인 부분',
          next_goals: '다음 수업 목표 및 계획'
        };
        const missingFieldNames = missingFields.map(f => fieldNames[f]).join(', ');
        return alert(`다음 필드를 작성해주세요: ${missingFieldNames}`);
      }
    }

    setUploading(true);
    try {
      const { error } = await supabase
        .from('sessions')
        .update({ 
          status: 'finished', 
          feedback_fields: feedbackFields,
          students_text: fieldsToTemplateText(feedbackFields),
          photo_url: photoUrls, 
          file_url: fileUrls
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
    if (!supabase || !selectedEvent || !confirm('초기화하시겠습니까? (작성된 피드백이 삭제됩니다)')) return;
    setUploading(true);
    try {
      await supabase.from('sessions').update({ 
        status: 'pending', 
        students_text: null,
        feedback_fields: {},
        photo_url: [], 
        file_url: [] 
      }).eq('id', selectedEvent.id);
      setIsModalOpen(false);
      getMySchedule();
    } finally { setUploading(false); }
  };

  const uploadFile = async (file: File, bucket: string) => {
    if (!supabase || !selectedEvent) return null;
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

  const openLessonPlanModal = async () => {
    if (!supabase || !selectedEvent) return;
    setLessonPlanContent('');
    setCurrentSessionLessonPlanId(null);
    setPreviousPlans([]);
    setPreviousPlansExpandedId(null);
    setIsLessonPlanModalOpen(true);
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) return;
    const userId = userData.user.id;
    const baseTitle = getBaseTitle(selectedEvent.title);

    const [currentRes, sessionsRes] = await Promise.all([
      supabase.from('lesson_plans').select('id, content').eq('session_id', selectedEvent.id).maybeSingle(),
      supabase.from('sessions').select('id, title, start_at, group_id, lesson_plans(content)').eq('created_by', userId).order('start_at', { ascending: false }).limit(200)
    ]);
    const current = currentRes.data as { id: string; content: string } | null;
    if (current) {
      setLessonPlanContent(current.content || '');
      setCurrentSessionLessonPlanId(current.id);
    }
    const sessionsWithPlans = (sessionsRes.data || []) as Array<{ id: string; title: string; start_at: string; group_id?: string | null; lesson_plans: { content?: string }[] }>;
    const sameClass = sessionsWithPlans.filter(s => s.id !== selectedEvent.id && ((selectedEvent.group_id && s.group_id === selectedEvent.group_id) || getBaseTitle(s.title) === baseTitle));
    const prev: PreviousLessonPlan[] = [];
    sameClass.forEach(s => {
      const raw = s.lesson_plans;
      const lp = Array.isArray(raw) ? raw[0] : raw && typeof raw === 'object' ? raw : null;
      const content = lp && typeof (lp as { content?: string }).content === 'string' ? (lp as { content: string }).content : '';
      if (content.trim()) prev.push({ sessionId: s.id, start_at: s.start_at, content });
    });
    prev.sort((a, b) => new Date(b.start_at).getTime() - new Date(a.start_at).getTime());
    setPreviousPlans(prev);
  };

  const saveLessonPlan = async () => {
    if (!supabase || !selectedEvent) return;
    setLessonPlanSaving(true);
    try {
      if (currentSessionLessonPlanId) {
        const { error } = await supabase.from('lesson_plans').update({ content: lessonPlanContent, updated_at: new Date().toISOString() }).eq('id', currentSessionLessonPlanId);
        if (error) throw error;
        alert('수업안이 수정되었습니다.');
      } else {
        const { error } = await supabase.from('lesson_plans').insert({ session_id: selectedEvent.id, content: lessonPlanContent });
        if (error) throw error;
        alert('수업안이 저장되었습니다.');
      }
      setIsLessonPlanModalOpen(false);
      getMySchedule();
    } catch (err: any) {
      alert('저장 실패: ' + err.message);
    } finally {
      setLessonPlanSaving(false);
    }
  };

  const deleteLessonPlan = async () => {
    if (!supabase || !selectedEvent || !currentSessionLessonPlanId || !confirm('정말 삭제하시겠습니까?')) return;
    setLessonPlanSaving(true);
    try {
      const { error } = await supabase.from('lesson_plans').delete().eq('id', currentSessionLessonPlanId);
      if (error) throw error;
      alert('삭제되었습니다.');
      setCurrentSessionLessonPlanId(null);
      setLessonPlanContent('');
      setIsLessonPlanModalOpen(false);
      getMySchedule();
    } catch (err: any) {
      alert('삭제 실패: ' + err.message);
    } finally {
      setLessonPlanSaving(false);
    }
  };

  const copyPreviousToContent = (content: string) => {
    setLessonPlanContent(content);
    if (previousPlansExpandedId) setPreviousPlansExpandedId(null);
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
              
              // 간소화된 상태 판별
              const feedbackFields = session.feedback_fields || parseTemplateToFields(session.students_text || '');
              const hasContent = feedbackFields.main_activity || feedbackFields.strengths || feedbackFields.next_goals;
              
              const isVerified = session.status === 'verified';
              const isActuallyDone = hasContent;

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
                    isVerified
                      ? 'bg-blue-50 text-blue-500'
                      : isActuallyDone
                      ? 'bg-emerald-50 text-emerald-500' 
                      : 'bg-slate-50 text-slate-300'
                  }`}>
                    {isVerified ? 'Verified' : isActuallyDone ? 'Done' : 'Wait'}
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
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={openLessonPlanModal}
                  className="flex items-center gap-2 px-5 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-black transition-all cursor-pointer shadow-lg shadow-indigo-200 active:scale-[0.98]"
                >
                  <FileText size={18} /> 수업안 작성
                </button>
                <button onClick={() => setIsModalOpen(false)} className="cursor-pointer text-slate-400 hover:text-slate-900 transition-colors p-1"><X size={24} /></button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-6 text-left bg-slate-50/30">
              {/* 센터 수업: 파일 업로드만 */}
              {selectedEvent.session_type === 'regular_center' ? (
                <div className="space-y-6">
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
                  
                  {/* 센터 수업 메모 (선택) */}
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1 mb-2">
                      메모 (선택사항)
                    </label>
                    <textarea 
                      className="w-full h-32 bg-white rounded-2xl p-4 text-sm leading-relaxed text-slate-700 outline-none focus:ring-2 focus:ring-blue-100 shadow-sm border border-slate-100 resize-none transition-all"
                      value={feedbackFields.condition_notes || ''}
                      onChange={(e) => setFeedbackFields({...feedbackFields, condition_notes: e.target.value})}
                      placeholder="특이사항이나 간단한 메모를 남겨주세요"
                    />
                  </div>
                </div>
              ) : (
                /* 개인 수업: 구조화된 필드 입력 */
                <>
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1 mb-2">
                    ✅ 오늘 수업의 주요 활동 *
                  </label>
                  <textarea 
                    className="w-full h-24 bg-white rounded-2xl p-4 text-sm leading-relaxed text-slate-700 outline-none focus:ring-2 focus:ring-blue-100 shadow-sm border border-slate-100 resize-none transition-all"
                    value={feedbackFields.main_activity || ''}
                    onChange={(e) => setFeedbackFields({...feedbackFields, main_activity: e.target.value})}
                    placeholder="예: 축구 기본기 드리블 연습, 미니 게임 진행"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1 mb-2">
                    ✅ 강점 및 긍정적인 부분 *
                  </label>
                  <textarea 
                    className="w-full h-24 bg-white rounded-2xl p-4 text-sm leading-relaxed text-slate-700 outline-none focus:ring-2 focus:ring-blue-100 shadow-sm border border-slate-100 resize-none transition-all"
                    value={feedbackFields.strengths || ''}
                    onChange={(e) => setFeedbackFields({...feedbackFields, strengths: e.target.value})}
                    placeholder="예: 드리블 속도가 빨라졌고, 팀워크가 좋아졌습니다"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1 mb-2">
                    ✅ 개선이 필요한 부분 및 피드백 (선택)
                  </label>
                  <textarea 
                    className="w-full h-24 bg-white rounded-2xl p-4 text-sm leading-relaxed text-slate-700 outline-none focus:ring-2 focus:ring-blue-100 shadow-sm border border-slate-100 resize-none transition-all"
                    value={feedbackFields.improvements || ''}
                    onChange={(e) => setFeedbackFields({...feedbackFields, improvements: e.target.value})}
                    placeholder="예: 슈팅 정확도 연습이 더 필요합니다"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1 mb-2">
                    ✅ 다음 수업 목표 및 계획 *
                  </label>
                  <textarea 
                    className="w-full h-24 bg-white rounded-2xl p-4 text-sm leading-relaxed text-slate-700 outline-none focus:ring-2 focus:ring-blue-100 shadow-sm border border-slate-100 resize-none transition-all"
                    value={feedbackFields.next_goals || ''}
                    onChange={(e) => setFeedbackFields({...feedbackFields, next_goals: e.target.value})}
                    placeholder="예: 패스 연습과 전술 이해도 향상"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1 mb-2">
                    ✅ 특이사항 및 컨디션 체크 (선택)
                  </label>
                  <textarea 
                    className="w-full h-24 bg-white rounded-2xl p-4 text-sm leading-relaxed text-slate-700 outline-none focus:ring-2 focus:ring-blue-100 shadow-sm border border-slate-100 resize-none transition-all"
                    value={feedbackFields.condition_notes || ''}
                    onChange={(e) => setFeedbackFields({...feedbackFields, condition_notes: e.target.value})}
                    placeholder="예: 오늘 컨디션 좋음, 집중력 우수"
                  />
                </div>
              </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">
                    Photos ({photoUrls.length})
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {photoUrls.map((url, i) => (
                      <div key={i} className="relative aspect-square">
                        <img src={url} className="w-full h-full rounded-2xl object-cover border-2 border-white shadow-md" alt="" referrerPolicy="no-referrer" />
                        <button onClick={() => setPhotoUrls(photoUrls.filter((_, idx) => idx !== i))} className="absolute -top-2 -right-2 bg-red-500 text-white w-6 h-6 rounded-full flex items-center justify-center shadow-lg cursor-pointer"><X size={12} /></button>
                      </div>
                    ))}
                    <label className="aspect-square rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center bg-white text-slate-300 hover:bg-slate-50 hover:border-blue-400 cursor-pointer transition-all active:scale-95">
                      <Camera size={24} />
                      <input type="file" className="hidden" accept="image/*" onChange={async (e) => {
                        const url = await uploadFile(e.target.files?.[0] as File, 'session-photos');
                        if (url) setPhotoUrls(prev => [...prev, url]);
                      }} disabled={uploading} />
                    </label>
                  </div>
                </div>
              </>
              )}
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

      {/* 수업안 작성/수정 모달 */}
      {isLessonPlanModalOpen && selectedEvent && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[10000] flex items-center justify-center p-4" onClick={() => setIsLessonPlanModalOpen(false)}>
          <div className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <div className="px-8 py-6 border-b flex justify-between items-center bg-white text-left">
              <div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight">수업안</h2>
                <p className="text-[10px] font-bold text-slate-400 mt-1">
                  {selectedEvent.title} · {new Date(selectedEvent.start_at).toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' })}
                </p>
              </div>
              <button type="button" onClick={() => setIsLessonPlanModalOpen(false)} className="cursor-pointer text-slate-400 hover:text-slate-900 transition-colors"><X size={24} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-slate-50/30 text-left">
              {/* 이전 수업안: 항상 표시 (없을 때 안내 문구) */}
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1 mb-2">이전 수업안 (같은 수업 다른 날짜 · 복사해서 사용)</label>
                {previousPlans.length > 0 ? (
                  <div className="space-y-2">
                    {previousPlans.map((p) => {
                      const isExp = previousPlansExpandedId === p.sessionId;
                      return (
                        <div key={p.sessionId} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                          <button
                            type="button"
                            onClick={() => setPreviousPlansExpandedId(isExp ? null : p.sessionId)}
                            className="w-full px-4 py-3 flex justify-between items-center text-left hover:bg-slate-50 cursor-pointer"
                          >
                            <span className="text-sm font-bold text-slate-700">
                              {new Date(p.start_at).toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' })}
                            </span>
                            {isExp ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
                          </button>
                          {isExp && (
                            <div className="px-4 pb-4 pt-0 border-t border-slate-100">
                              <pre className="text-xs text-slate-600 whitespace-pre-wrap font-sans max-h-40 overflow-y-auto p-3 bg-slate-50 rounded-xl mb-3">{p.content}</pre>
                              <button
                                type="button"
                                onClick={() => copyPreviousToContent(p.content)}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-100 text-indigo-700 text-xs font-black cursor-pointer hover:bg-indigo-200 transition-all"
                              >
                                <Copy size={14} /> 내용 가져오기
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 py-4 px-4 bg-white rounded-2xl border border-slate-100">
                    같은 수업의 이전 회차 수업안이 없습니다. 다른 날짜에 작성한 같은 수업 수업안이 여기 목록으로 표시됩니다.
                  </p>
                )}
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1 mb-2">이번 수업안 내용</label>
                <textarea
                  className="w-full min-h-[280px] bg-white rounded-2xl p-6 text-sm leading-relaxed text-slate-700 outline-none focus:ring-2 focus:ring-blue-100 shadow-sm border border-slate-100 resize-none transition-all"
                  value={lessonPlanContent}
                  onChange={(e) => setLessonPlanContent(e.target.value)}
                  placeholder="수업안을 작성하세요..."
                />
              </div>
            </div>
            <div className="p-8 bg-white border-t flex gap-4">
              {currentSessionLessonPlanId && (
                <button type="button" onClick={deleteLessonPlan} disabled={lessonPlanSaving} className="flex-1 bg-rose-50 text-rose-500 py-5 rounded-[22px] font-black text-sm cursor-pointer hover:bg-rose-100 transition-all uppercase disabled:opacity-50">삭제</button>
              )}
              <button type="button" onClick={saveLessonPlan} disabled={lessonPlanSaving} className={`flex-[2] py-5 rounded-[22px] font-black text-sm shadow-xl transition-all cursor-pointer active:scale-95 uppercase ${lessonPlanSaving ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-slate-900 text-white hover:bg-blue-600'}`}>
                {lessonPlanSaving ? '저장 중...' : currentSessionLessonPlanId ? '수정' : '저장'}
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
