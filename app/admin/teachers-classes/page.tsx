'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { getSupabaseBrowserClient } from '@/app/lib/supabase/browser';
import { Send, RotateCcw, User, MapPin, X, ExternalLink, FileText, Maximize2, Search, BookOpen, AlertTriangle } from 'lucide-react';
import { 
  FeedbackFields,
  parseTemplateToFields,
  fieldsToTemplateText
} from '@/app/lib/feedbackValidation';

interface Session {
  id: string;
  title: string;
  start_at: string;
  end_at: string;
  status: 'opened' | 'finished' | 'verified' | 'postponed' | 'cancelled';
  students_text: string;
  photo_url: string[];
  file_url: string[];
  session_type: 'regular_center' | 'regular_private' | 'one_day';
  created_by: string;
  feedback_fields?: FeedbackFields;
  users?: { id: string; name: string };
  lesson_plans?: { content?: string }[];
}

interface Coach {
  id: string;
  name: string;
}

export default function MasterQCPage() {
  const [supabase] = useState(() => (typeof window !== 'undefined' ? getSupabaseBrowserClient() : null));
  const [activeTab, setActiveTab] = useState<'feedback' | 'lessonplan'>('feedback');
  const [coaches, setCoaches] = useState<Coach[]>([]);
  
  useEffect(() => {
    const initPage = async () => {
      if (!supabase) return;
      const { data: userData } = await supabase.from('users').select('id, name').eq('is_active', true).order('name');
      if (userData) setCoaches(userData as Coach[]);
    };
    initPage();
  }, [supabase]);

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-12 text-left">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8 flex flex-col md:flex-row justify-between items-end gap-6">
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter italic uppercase">Spokedu QC</h1>
            <p className="text-slate-500 font-bold mt-2">체육 교육의 기준점, 스포키듀 리포트 마스터 검수</p>
          </div>
        </header>

        {/* 탭 */}
        <div className="flex gap-2 mb-8 bg-white p-1 rounded-2xl shadow-sm border">
          <button 
            onClick={() => setActiveTab('feedback')}
            className={`flex-1 px-6 py-3 rounded-xl text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'feedback' 
                ? 'bg-slate-900 text-white' 
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            피드백 검수
          </button>
          <button 
            onClick={() => setActiveTab('lessonplan')}
            className={`flex-1 px-6 py-3 rounded-xl text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'lessonplan' 
                ? 'bg-slate-900 text-white' 
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <BookOpen size={16} className="inline mr-1" /> 수업안 조회
          </button>
        </div>

        {/* 내용 */}
        {activeTab === 'feedback' ? (
          <FeedbackReviewTab coaches={coaches} supabase={supabase} />
        ) : (
          <LessonPlanTab coaches={coaches} supabase={supabase} />
        )}
      </div>
    </div>
  );
}

// 피드백 검수 탭
function FeedbackReviewTab({ coaches, supabase }: { coaches: Coach[]; supabase: ReturnType<typeof getSupabaseBrowserClient> | null }) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedCoachId, setSelectedCoachId] = useState('all');
  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date();
    const kst = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    kst.setDate(kst.getDate() - 1);
    return kst.toISOString().split('T')[0];
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<Session | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [feedbackFields, setFeedbackFields] = useState<FeedbackFields>({});
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [fileUrls, setFileUrls] = useState<string[]>([]);
  const [zoomedImg, setZoomedImg] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'empty' | 'done' | 'verified'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSessions, setSelectedSessions] = useState<Set<string>>(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [duplicateCheck, setDuplicateCheck] = useState<{ isDuplicate: boolean; similarity?: number; matchedSession?: { title?: string; start_at?: string }; duplicate?: boolean; message?: string } | null>(null);

  const fetchListData = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    setError(null);
    
    try {
      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(selectedDate);
      endOfDay.setHours(23, 59, 59, 999);
      
      let query = supabase
        .from('sessions')
        .select('id, title, start_at, end_at, status, students_text, photo_url, file_url, session_type, created_by, feedback_fields, users:created_by(id, name)')
        .gte('start_at', startOfDay.toISOString())
        .lte('start_at', endOfDay.toISOString())
        .order('start_at', { ascending: true });
      
      if (selectedCoachId !== 'all') {
        query = query.eq('created_by', selectedCoachId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      if (data) setSessions(data as unknown as Session[]);
    } catch (err: unknown) {
      console.error('데이터 로드 실패:', err);
      setError(err instanceof Error ? err.message : '데이터를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [supabase, selectedDate, selectedCoachId]);

  useEffect(() => {
    fetchListData();
  }, [fetchListData]);

  const getSessionStatus = (session: Session): 'empty' | 'done' | 'verified' => {
    if (session.status === 'verified') return 'verified';
    const feedbackFields = session.feedback_fields || parseTemplateToFields(session.students_text || '');
    const hasContent = feedbackFields.main_activity || feedbackFields.strengths || feedbackFields.next_goals;
    return hasContent ? 'done' : 'empty';
  };

  const statistics = useMemo(() => {
    const empty = sessions.filter(s => getSessionStatus(s) === 'empty').length;
    const done = sessions.filter(s => getSessionStatus(s) === 'done').length;
    const verified = sessions.filter(s => getSessionStatus(s) === 'verified').length;
    return { empty, done, verified, total: sessions.length };
  }, [sessions]);

  const filteredAndSearchedSessions = useMemo(() => {
    return sessions.filter(s => {
      if (statusFilter !== 'all') {
        const sessionStatus = getSessionStatus(s);
        if (sessionStatus !== statusFilter) return false;
      }
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const titleMatch = s.title?.toLowerCase().includes(searchLower);
        const coachMatch = coaches.find(c => c.id === s.created_by)?.name.toLowerCase().includes(searchLower);
        if (!titleMatch && !coachMatch) return false;
      }
      return true;
    });
  }, [sessions, statusFilter, searchTerm, coaches]);

  const toggleSelection = (sessionId: string) => {
    setSelectedSessions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sessionId)) newSet.delete(sessionId);
      else newSet.add(sessionId);
      return newSet;
    });
  };

  const selectAll = () => {
    const allDone = filteredAndSearchedSessions.filter(s => getSessionStatus(s) === 'done').map(s => s.id);
    setSelectedSessions(new Set(allDone));
  };

  const clearSelection = () => setSelectedSessions(new Set());

  const handleBulkApprove = async () => {
    if (!supabase || selectedSessions.size === 0) return alert('승인할 리포트를 선택해주세요.');
    if (!confirm(`선택한 ${selectedSessions.size}개의 리포트를 일괄 승인하시겠습니까?`)) return;
    
    setBulkActionLoading(true);
    try {
      const { error } = await supabase.from('sessions').update({ status: 'verified', updated_at: new Date().toISOString() }).in('id', Array.from(selectedSessions));
      if (error) throw error;
      alert(`${selectedSessions.size}개의 리포트가 승인되었습니다.`);
      clearSelection();
      fetchListData();
    } catch (error: unknown) {
      alert('일괄 승인에 실패했습니다: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setBulkActionLoading(false);
    }
  };

  const calculateSimilarity = (text1: string, text2: string): number => {
    const words1 = text1.split(/\s+/).filter(w => w.length > 1);
    const words2 = text2.split(/\s+/).filter(w => w.length > 1);
    if (words1.length === 0 || words2.length === 0) return 0;
    const commonWords = words1.filter(w => words2.includes(w));
    const similarity = (commonWords.length * 2) / (words1.length + words2.length);
    return Math.round(similarity * 100);
  };

  const checkDuplicateFeedback = async (currentSession: Session) => {
    if (!supabase) return { isDuplicate: false };
    try {
      const { data: recentSessions } = await supabase
        .from('sessions')
        .select('id, title, students_text, start_at')
        .eq('created_by', currentSession.created_by)
        .lt('start_at', currentSession.start_at)
        .order('start_at', { ascending: false })
        .limit(5);
      
      if (!recentSessions || recentSessions.length === 0) return { isDuplicate: false };
      
      const currentText = currentSession.students_text || '';
      if (currentText.trim().length < 10) return { isDuplicate: false };
      
      for (const session of recentSessions) {
        const sessionText = session.students_text || '';
        if (sessionText.trim().length < 10) continue;
        
        const similarity = calculateSimilarity(currentText, sessionText);
        if (similarity >= 50) {
          return {
            isDuplicate: true,
            similarity,
            matchedSession: session
          };
        }
      }
      
      return { isDuplicate: false };
    } catch (err) {
      console.error('중복 체크 실패:', err);
      return { isDuplicate: false };
    }
  };

  const openEditModal = async (session: Session) => {
    setSelectedEvent(session);
    const fields = session.feedback_fields || parseTemplateToFields(session.students_text || '');
    setFeedbackFields(fields);
    setPhotoUrls(Array.isArray(session.photo_url) ? session.photo_url : []);
    setFileUrls(Array.isArray(session.file_url) ? session.file_url : []);
    
    // 중복 체크
    const check = await checkDuplicateFeedback(session);
    setDuplicateCheck(check);
    
    setIsModalOpen(true);
  };

  const handleSave = async (newStatus = 'verified') => {
    if (!supabase || !selectedEvent) return;
    try {
      const updatedText = fieldsToTemplateText(feedbackFields);
      const updateData: Record<string, unknown> = { 
        status: newStatus,
        students_text: updatedText,
        feedback_fields: feedbackFields,
        photo_url: photoUrls,
        file_url: fileUrls,
        updated_at: new Date().toISOString()
      };
      const { error } = await supabase.from('sessions').update(updateData).eq('id', selectedEvent.id);
      if (error) throw error;
      alert(newStatus === 'verified' ? '검수 승인 완료!' : '수정 요청 완료!');
      setIsModalOpen(false);
      fetchListData();
    } catch (error: unknown) {
      alert('저장에 실패했습니다: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  return (
    <>
      {zoomedImg && (
        <div className="fixed inset-0 z-[10000] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out" onClick={() => setZoomedImg(null)}>
          <img src={zoomedImg} className="max-w-full max-h-full object-contain rounded-lg" alt="확대" />
          <button className="absolute top-10 right-10 text-white/50 hover:text-white"><X size={40} /></button>
        </div>
      )}

      <div className="flex gap-3 bg-white p-3 rounded-3xl shadow-sm border border-slate-200 mb-8">
        <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="bg-slate-50 px-4 py-2 rounded-xl text-sm font-bold outline-none cursor-pointer" />
        <select value={selectedCoachId} onChange={(e) => setSelectedCoachId(e.target.value)} className="bg-slate-50 px-4 py-2 rounded-xl text-sm font-bold outline-none cursor-pointer">
          <option value="all">전체 강사</option>
          {coaches.map(c => <option key={c.id} value={c.id}>{c.name} 선생님</option>)}
        </select>
      </div>

      {error && (
        <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-6 mb-8">
          <p className="font-bold text-red-600">{error}</p>
          <button onClick={fetchListData} className="mt-4 px-6 py-2 bg-red-600 text-white rounded-xl font-bold hover:bg-red-500">다시 시도</button>
        </div>
      )}

      {!loading && !error && (
        <>
          <div className="mb-8 space-y-4">
            <div className="flex gap-2 bg-white p-1 rounded-2xl shadow-sm border flex-wrap">
              {['all', 'empty', 'done', 'verified'].map(filter => (
                <button 
                  key={filter}
                  onClick={() => setStatusFilter(filter as 'all' | 'empty' | 'done' | 'verified')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    statusFilter === filter ? 'bg-slate-900 text-white' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {filter === 'all' && `전체 (${statistics.total})`}
                  {filter === 'empty' && `미작성 (${statistics.empty})`}
                  {filter === 'done' && `작성완료 (${statistics.done})`}
                  {filter === 'verified' && `검수완료 (${statistics.verified})`}
                </button>
              ))}
            </div>

            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
              <input 
                type="text"
                placeholder="수업명 또는 강사명 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white rounded-xl text-sm font-bold outline-none border-2 border-slate-200 focus:border-blue-400"
              />
            </div>

            {statistics.done > 0 && (
              <button onClick={selectAll} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-200 cursor-pointer">
                작성완료 전체 선택 ({statistics.done}개)
              </button>
            )}
          </div>
        </>
      )}

      {loading ? (
        <div className="py-40 text-center font-black text-slate-300 animate-pulse">Syncing...</div>
      ) : filteredAndSearchedSessions.length === 0 ? (
        <div className="bg-white rounded-[40px] py-32 text-center border border-dashed border-slate-300">
          <p className="text-slate-400 font-bold">{searchTerm || statusFilter !== 'all' ? '검색 결과가 없습니다.' : '해당 일자에 등록된 수업이 없습니다.'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredAndSearchedSessions.map((s) => {
            const sessionStatus = getSessionStatus(s);
            const isSelected = selectedSessions.has(s.id);
            const canSelect = sessionStatus === 'done';
            const isVerified = sessionStatus === 'verified';
            const isDone = sessionStatus === 'done';
            const time = new Date(s.start_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
            const coachName = s.users?.name || coaches.find(c => c.id === s.created_by)?.name || '강사';

            return (
              <div key={s.id} className="relative">
                {canSelect && (
                  <div className="absolute top-3 left-3 z-10">
                    <input type="checkbox" checked={isSelected} onChange={() => toggleSelection(s.id)} className="w-4 h-4 cursor-pointer" onClick={(e) => e.stopPropagation()} />
                  </div>
                )}
                <div className={`bg-white rounded-2xl p-4 shadow-sm border-2 ${isSelected ? 'border-blue-500' : 'border-slate-200'} flex flex-col hover:shadow-lg hover:border-blue-300 transition-all cursor-pointer`} onClick={() => openEditModal(s)}>
                  <div className="flex justify-between items-start mb-3">
                    <span className="bg-indigo-50 text-indigo-600 px-2 py-1 rounded-lg text-[10px] font-bold">{time}</span>
                    <span className={`text-[9px] font-bold px-2 py-1 rounded-lg uppercase ${isVerified ? 'bg-blue-600 text-white' : isDone ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                      {isVerified ? 'DONE' : isDone ? 'READY' : 'EMPTY'}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mb-2 line-clamp-2 text-left leading-tight">{s.title}</h3>
                  <div className="space-y-1 mb-3 text-left">
                    <div className="flex items-center gap-1 text-slate-600 text-xs">
                      <User size={12} /> {coachName}
                    </div>
                    <div className="flex items-center gap-1 text-slate-400 text-[10px]">
                      <MapPin size={10} /> {s.session_type === 'regular_center' ? '센터' : '개인'}
                    </div>
                  </div>
                  <div className="mt-auto flex gap-2">
                    <button 
                      onClick={(e) => { 
                        e.stopPropagation();
                        if(!isVerified) return alert('검수 완료된 리포트만 복사 가능합니다.');
                        navigator.clipboard.writeText(`${window.location.origin}/report/${s.id}`); 
                        alert('링크 복사 완료!'); 
                      }} 
                      className={`p-2 rounded-xl ${isVerified ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'bg-slate-50 text-slate-300 cursor-not-allowed'}`}
                    >
                      <Send size={14} />
                    </button>
                    <button className="flex-1 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-indigo-600 transition-colors">검수</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedSessions.size > 0 && (
        <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-slate-900 text-white px-8 py-4 rounded-full shadow-2xl flex items-center gap-6 z-50">
          <span className="font-bold">{selectedSessions.size}개 선택됨</span>
          <button onClick={handleBulkApprove} disabled={bulkActionLoading} className="px-6 py-2 bg-blue-600 rounded-full font-black hover:bg-blue-500 cursor-pointer disabled:opacity-50">
            {bulkActionLoading ? '처리 중...' : '일괄 승인'}
          </button>
          <button onClick={clearSelection} className="text-slate-400 hover:text-white cursor-pointer">취소</button>
        </div>
      )}

      {/* 모달 */}
      {isModalOpen && selectedEvent && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[999] flex items-center justify-center p-4" onClick={() => setIsModalOpen(false)}>
          <div className="bg-white w-full max-w-3xl rounded-[48px] shadow-2xl flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <div className="p-8 border-b flex justify-between items-center shrink-0">
              <div>
                <h2 className="text-2xl font-black text-slate-900">{selectedEvent.title}</h2>
                <button onClick={() => window.open(`/report/${selectedEvent.id}`, '_blank')} className="text-indigo-500 text-xs font-bold flex items-center gap-1 mt-1 hover:underline cursor-pointer">
                  <ExternalLink size={12} /> 미리보기
                </button>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-300 hover:text-slate-900 cursor-pointer"><X size={32} /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-slate-50/30">
              <div className="flex gap-2">
                <span className={`text-[9px] font-black px-3 py-1.5 rounded-full uppercase ${selectedEvent.session_type === 'regular_center' ? 'bg-indigo-100 text-indigo-600' : 'bg-sky-100 text-sky-600'}`}>
                  {selectedEvent.session_type === 'regular_center' ? '센터 수업' : '개인 수업'}
                </span>
              </div>

              {/* 중복 경고 */}
              {duplicateCheck?.isDuplicate && (
                <div className="bg-amber-50 border-2 border-amber-400 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="text-amber-600" size={20} />
                    <span className="font-bold text-amber-900">중복 의심</span>
                  </div>
                  <p className="text-sm text-amber-800">
                    <strong>{duplicateCheck.matchedSession?.title ?? ''}</strong> ({new Date(duplicateCheck.matchedSession?.start_at ?? 0).toLocaleDateString()})와 
                    <strong className="text-amber-900"> {duplicateCheck.similarity ?? 0}% 유사</strong>합니다.
                  </p>
                  <p className="text-xs text-amber-700 mt-1">
                    복사/붙여넣기 피드백일 수 있습니다. 확인 후 검수해주세요.
                  </p>
                </div>
              )}

              {selectedEvent.session_type === 'regular_center' && (
                <div className="bg-white p-5 rounded-[24px] border border-indigo-100 space-y-3">
                  <p className="text-[10px] font-black text-indigo-400 uppercase">파일</p>
                  {fileUrls.length > 0 ? fileUrls.map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 bg-indigo-50/50 rounded-xl hover:bg-indigo-100 cursor-pointer">
                      <FileText size={18} className="text-indigo-500" />
                      <span className="text-sm font-bold text-slate-600 truncate">{decodeURIComponent(url.split('/').pop() || 'File')}</span>
                      <ExternalLink size={14} className="ml-auto text-indigo-300" />
                    </a>
                  )) : <p className="text-slate-400 text-sm py-4 text-center">업로드된 파일이 없습니다</p>}
                </div>
              )}

              {selectedEvent.session_type !== 'regular_center' && (
                <div className="space-y-3">
                  <p className="text-[10px] font-black text-slate-400 uppercase">사진</p>
                  {photoUrls.length > 0 ? (
                    <div className="grid grid-cols-3 gap-4">
                      {photoUrls.map((url, i) => (
                        <div key={i} className="relative aspect-square rounded-[24px] overflow-hidden border-2 border-white shadow-sm hover:scale-105 cursor-zoom-in" onClick={() => setZoomedImg(url)}>
                          <img src={url} className="w-full h-full object-cover" alt="수업 사진" />
                          <div className="absolute inset-0 bg-black/10 opacity-0 hover:opacity-100 flex items-center justify-center"><Maximize2 size={20} className="text-white" /></div>
                        </div>
                      ))}
                    </div>
                  ) : <p className="text-slate-400 text-sm py-4 text-center bg-white rounded-2xl border">업로드된 사진이 없습니다</p>}
                </div>
              )}

              {selectedEvent.session_type === 'regular_center' ? (
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase block ml-1">메모</label>
                  <textarea 
                    className="w-full min-h-[120px] bg-white rounded-2xl p-4 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-blue-100 resize-none border" 
                    value={feedbackFields.condition_notes || ''} 
                    onChange={(e) => setFeedbackFields({...feedbackFields, condition_notes: e.target.value})}
                    placeholder="센터 수업 메모를 작성하세요..."
                  />
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-[10px] font-black text-slate-400 uppercase ml-1">피드백 내용</p>
                  {[
                    { key: 'main_activity', label: '✅ 오늘 수업의 주요 활동', color: 'indigo', placeholder: '예: 축구 기본기 드리블 연습' },
                    { key: 'strengths', label: '✅ 강점 및 긍정적인 부분', color: 'emerald', placeholder: '예: 드리블 속도가 빨라졌습니다' },
                    { key: 'improvements', label: '✅ 개선이 필요한 부분', color: 'amber', placeholder: '예: 슈팅 정확도 연습 필요' },
                    { key: 'next_goals', label: '✅ 다음 수업 목표 및 계획', color: 'blue', placeholder: '예: 패스 연습과 전술 이해도 향상' },
                    { key: 'condition_notes', label: '✅ 특이사항 및 시작/종료 시간', color: 'slate', placeholder: '예: 14:00 시작, 15:30 종료' }
                  ].map(field => (
                    <div key={field.key} className="space-y-2">
                      <label className={`text-[9px] font-bold text-${field.color}-600 uppercase block ml-1`}>{field.label}</label>
                      <textarea 
                        className={`w-full h-20 bg-white rounded-xl p-3 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-${field.color}-100 resize-none border`}
                        value={(feedbackFields as Record<string, string>)[field.key] || ''} 
                        onChange={(e) => setFeedbackFields({...feedbackFields, [field.key]: e.target.value})}
                        placeholder={field.placeholder}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-8 border-t flex gap-4 shrink-0">
              <button onClick={() => handleSave('finished')} className="flex-1 py-5 bg-slate-50 border rounded-3xl font-bold text-rose-500 hover:bg-rose-50 cursor-pointer">
                <RotateCcw size={18} className="inline mr-1" /> 수정 요청
              </button>
              <button onClick={() => handleSave('verified')} className="flex-[2] py-5 bg-slate-900 rounded-3xl font-black text-white shadow-xl hover:bg-indigo-600 cursor-pointer">
                검수 승인 및 저장
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// 수업안 조회 탭 - 세션 타입 (lesson_plans: API가 배열 또는 단일 객체로 올 수 있음)
type LessonPlanSession = Record<string, unknown> & { id: string; created_by: string; users?: { name?: string } | null; title?: string; start_at?: string; lesson_plans?: { content?: unknown }[] | { content?: unknown } | null };
function getLessonPlanContent(session: LessonPlanSession): string | null {
  const lp = session.lesson_plans;
  if (lp == null) return null;
  const content = Array.isArray(lp) ? lp[0]?.content : (lp as { content?: unknown } | null)?.content;
  return content != null && content !== '' ? String(content) : null;
}
function LessonPlanTab({ coaches, supabase }: { coaches: Coach[]; supabase: ReturnType<typeof getSupabaseBrowserClient> | null }) {
  const [sessions, setSessions] = useState<LessonPlanSession[]>([]);
  const [selectedTeacher, setSelectedTeacher] = useState('all');
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<LessonPlanSession | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const fetchSessions = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/admin/lesson-plans-sessions?teacherId=${encodeURIComponent(selectedTeacher)}&_=${Date.now()}`,
          { credentials: 'include', cache: 'no-store' }
        );
        if (!res.ok) {
          if (res.status === 401 || res.status === 403) {
            setSessions([]);
            return;
          }
          throw new Error(await res.text());
        }
        const data = await res.json();
        setSessions(Array.isArray(data) ? data : []);
      } catch (err: unknown) {
        console.error('수업안 로드 실패:', err instanceof Error ? err.message : err);
        setSessions([]);
      } finally {
        setLoading(false);
      }
    };
    fetchSessions();
  }, [selectedTeacher]);

  const groupedByTeacher = useMemo(() => {
    const groups: Record<string, LessonPlanSession[]> = {};
    sessions.forEach(session => {
      const teacherName = (session.users as { name?: string } | null)?.name || coaches.find(c => c.id === session.created_by)?.name || '미정';
      if (!groups[teacherName]) groups[teacherName] = [];
      groups[teacherName].push(session);
    });
    return groups;
  }, [sessions, coaches]);

  return (
    <>
      <div className="mb-8 flex flex-wrap items-center gap-4">
        <select value={selectedTeacher} onChange={e => setSelectedTeacher(e.target.value)} className="px-4 py-3 bg-white border-2 border-slate-200 rounded-xl font-bold outline-none focus:border-blue-400 hover:border-slate-300 transition-colors cursor-pointer">
          <option value="all">전체 선생님</option>
          {coaches.map(c => <option key={c.id} value={c.id}>{c.name} 선생님</option>)}
        </select>
        <span className="text-sm text-slate-500">이번 주 (일요일~토요일)</span>
      </div>

      {loading ? (
        <div className="py-40 text-center text-slate-400 font-bold animate-pulse">Loading...</div>
      ) : Object.keys(groupedByTeacher).length === 0 ? (
        <div className="bg-white rounded-[40px] py-32 text-center border border-dashed">
          <p className="text-slate-400 font-bold">이번 주 수업이 없습니다</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedByTeacher).map(([teacher, teacherSessions]) => (
            <div key={teacher} className="bg-white rounded-2xl p-6 border-2 border-slate-200 hover:border-blue-200 transition-all">
              <h3 className="text-xl font-black text-slate-900 mb-4">{teacher} 선생님</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {teacherSessions.map((session: LessonPlanSession) => {
                  const hasLessonPlan = !!getLessonPlanContent(session);
                  const date = new Date((session.start_at as string) ?? 0);
                  const formattedDate = `${date.getMonth() + 1}/${date.getDate()} ${date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })}`;
                  
                  return (
                    <button 
                      key={session.id}
                      onClick={() => { if (hasLessonPlan) { setSelectedSession(session); setIsModalOpen(true); } }}
                      className={`p-4 rounded-xl text-left transition-all ${
                        hasLessonPlan 
                          ? 'bg-emerald-50 border-2 border-emerald-200 cursor-pointer hover:bg-emerald-100 hover:border-emerald-300' 
                          : 'bg-slate-50 border-2 border-slate-200 cursor-not-allowed opacity-50'
                      }`}
                      disabled={!hasLessonPlan}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-xs text-slate-500 font-bold">{formattedDate}</span>
                        <span className={`text-[9px] font-bold px-2 py-1 rounded-lg ${
                          hasLessonPlan ? 'bg-emerald-500 text-white' : 'bg-slate-300 text-slate-500'
                        }`}>
                          {hasLessonPlan ? '작성됨' : '미작성'}
                        </span>
                      </div>
                      <p className="text-sm font-bold text-slate-900 line-clamp-2">{String(session.title ?? '')}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 수업안 보기 모달 */}
      {isModalOpen && selectedSession && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4" onClick={() => setIsModalOpen(false)}>
          <div className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <div className="px-8 py-6 border-b flex justify-between items-center">
              <div>
                <h2 className="text-xl font-black text-slate-900">{String(selectedSession.title ?? '')}</h2>
                <p className="text-[10px] font-bold text-slate-400 mt-1">
                  {new Date((selectedSession.start_at as string) ?? 0).toLocaleDateString('ko-KR')} 수업안
                </p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-900 cursor-pointer"><X size={24} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-8 bg-slate-50/30">
              <div className="bg-white rounded-2xl p-6 text-sm leading-relaxed text-slate-700 whitespace-pre-wrap min-h-[400px]">
                {getLessonPlanContent(selectedSession) ?? '내용이 없습니다.'}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
