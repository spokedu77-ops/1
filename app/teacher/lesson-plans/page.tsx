'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { createClient } from '@supabase/supabase-js';
import { X, FileText, ChevronDown, ChevronUp } from 'lucide-react';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

interface Session {
  id: string;
  title: string;
  start_at: string;
  session_type: string;
  lesson_plans?: LessonPlan[];
}

interface LessonPlan {
  id: string;
  session_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

function LessonPlansContent() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  
  // 모달 상태
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [modalContent, setModalContent] = useState('');
  const [saving, setSaving] = useState(false);

  // 수업 목록 조회 (sessions + lesson_plans 조인)
  const fetchSessions = async () => {
    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) return;

      const { data, error } = await supabase
        .from('sessions')
        .select('id, title, start_at, session_type, lesson_plans(*)')
        .eq('created_by', userData.user.id)
        .order('start_at', { ascending: true })
        .limit(200);

      if (error) throw error;
      setSessions(data || []);
    } catch (err) {
      console.error('수업 로드 실패:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  // 제목에서 회차/날짜/숫자 정보를 제거하여 베이스 타이틀 추출
  const getBaseTitle = (title: string): string => {
    const original = title;
    
    // 다양한 패턴 처리
    const cleaned = title
      // ✨ 앞쪽 패턴: "1/2 거점 6호 키움센터" → "거점 6호 키움센터"
      .replace(/^\d+\/\d+\s+/i, '')
      // 뒤쪽 패턴들
      .replace(/\s*[-_/]\s*\d+회차$/i, '')
      .replace(/\s+\d+회차$/i, '')
      .replace(/\s*[-_/]\s*\d+회$/i, '')
      .replace(/\s+\d+회$/i, '')
      .replace(/\s*[-_/]\s*\d+차$/i, '')
      .replace(/\s+\d+차$/i, '')
      .replace(/\s*[-_/]\s*\d+$/i, '')
      .replace(/\s*\(\d+\)$/i, '')
      .replace(/\s*\(\d{4}-\d{2}-\d{2}\)$/i, '')
      .replace(/\s*\d{4}-\d{2}-\d{2}$/i, '')
      .trim();
    
    // 디버깅: 변환 전후 출력
    if (original !== cleaned) {
      console.log(`📝 Title 변환: "${original}" → "${cleaned}"`);
    }
    
    return cleaned || original; // 빈 문자열이면 원본 반환
  };

  // 베이스 타이틀별 그룹화 및 회차 계산
  const groupedSessions = useMemo(() => {
    const groups: Record<string, Session[]> = {};
    
    console.log('🔍 전체 세션 수:', sessions.length);
    
    sessions.forEach(session => {
      const baseTitle = getBaseTitle(session.title);
      if (!groups[baseTitle]) groups[baseTitle] = [];
      groups[baseTitle].push(session);
    });
    
    // 각 그룹 내에서 날짜순 정렬
    Object.keys(groups).forEach(title => {
      groups[title].sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime());
      console.log(`📦 그룹 "${title}": ${groups[title].length}개 세션`);
    });
    
    return groups;
  }, [sessions]);

  // 그룹 토글
  const toggleGroup = (title: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(title)) {
        newSet.delete(title);
      } else {
        newSet.add(title);
      }
      return newSet;
    });
  };

  // 수업안 클릭
  const handleSessionClick = (session: Session) => {
    setSelectedSession(session);
    const lessonPlan = session.lesson_plans && session.lesson_plans.length > 0 ? session.lesson_plans[0] : null;
    setModalContent(lessonPlan?.content || '');
    setIsModalOpen(true);
  };

  // 저장
  const handleSave = async () => {
    if (!selectedSession) return;

    setSaving(true);
    try {
      const lessonPlan = selectedSession.lesson_plans && selectedSession.lesson_plans.length > 0 ? selectedSession.lesson_plans[0] : null;

      if (lessonPlan) {
        // 수정
        const { error } = await supabase
          .from('lesson_plans')
          .update({ 
            content: modalContent,
            updated_at: new Date().toISOString()
          })
          .eq('id', lessonPlan.id);

        if (error) throw error;
        alert('수업안이 수정되었습니다.');
      } else {
        // 신규
        const { error } = await supabase
          .from('lesson_plans')
          .insert({
            session_id: selectedSession.id,
            content: modalContent
          });

        if (error) throw error;
        alert('수업안이 저장되었습니다.');
      }

      setIsModalOpen(false);
      fetchSessions();
    } catch (err: any) {
      alert('저장 실패: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // 삭제
  const handleDelete = async () => {
    if (!selectedSession) return;
    const lessonPlan = selectedSession.lesson_plans && selectedSession.lesson_plans.length > 0 ? selectedSession.lesson_plans[0] : null;
    if (!lessonPlan) return;
    if (!confirm('정말 삭제하시겠습니까?')) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('lesson_plans')
        .delete()
        .eq('id', lessonPlan.id);

      if (error) throw error;
      alert('삭제되었습니다.');
      setIsModalOpen(false);
      fetchSessions();
    } catch (err: any) {
      alert('삭제 실패: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex-1 min-h-screen bg-[#F8FAFC] pb-20">
      <div className="max-w-5xl mx-auto p-6 md:p-10 space-y-8 text-left">
        
        {/* 헤더 */}
        <header className="space-y-6 pb-6 border-b-2 border-slate-200">
          <div>
            <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">SPOKEDU</p>
            <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">내 수업안 관리</h1>
            <p className="text-sm text-slate-500 mt-2">수업 제목별로 묶여서 회차별 수업안을 작성하세요</p>
          </div>
        </header>

        {/* 수업 그룹 목록 */}
        {loading ? (
          <div className="py-20 text-center text-slate-400 font-bold animate-pulse">Loading...</div>
        ) : Object.keys(groupedSessions).length === 0 ? (
          <div className="py-20 text-center bg-white rounded-[32px] border-2 border-dashed border-slate-100">
            <p className="text-slate-300 font-bold text-sm tracking-widest uppercase mb-4">등록된 수업이 없습니다</p>
            <p className="text-slate-400 text-xs">관리자가 수업을 생성하면 자동으로 표시됩니다</p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedSessions).map(([title, sessionList]) => {
              const isExpanded = expandedGroups.has(title);
              const completedCount = sessionList.filter(s => 
                s.lesson_plans && s.lesson_plans.length > 0 && s.lesson_plans[0].content
              ).length;
              const totalCount = sessionList.length;

              return (
                <div key={title} className="bg-white rounded-2xl border-2 border-slate-200 overflow-hidden">
                  {/* 그룹 헤더 */}
                  <button 
                    onClick={() => toggleGroup(title)}
                    className="w-full p-5 flex justify-between items-center hover:bg-slate-50 transition-all cursor-pointer text-left"
                  >
                    <div className="flex-1">
                      <h3 className="text-lg font-black text-slate-900 mb-1">{title}</h3>
                      <p className="text-xs text-slate-500">
                        {sessionList[0].session_type === 'regular_center' ? '센터 수업' : '개인 수업'} · {totalCount}회 수업
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-sm font-bold px-3 py-1 rounded-lg ${
                        completedCount === totalCount 
                          ? 'bg-emerald-50 text-emerald-600' 
                          : completedCount > 0 
                            ? 'bg-blue-50 text-blue-600' 
                            : 'bg-slate-100 text-slate-400'
                      }`}>
                        {completedCount}/{totalCount} 작성
                      </span>
                      {isExpanded ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
                    </div>
                  </button>

                  {/* 회차별 목록 */}
                  {isExpanded && (
                    <div className="border-t border-slate-100 p-4 bg-slate-50/50">
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                        {sessionList.map((session, index) => {
                          const hasLessonPlan = session.lesson_plans && session.lesson_plans.length > 0 && session.lesson_plans[0].content;
                          const date = new Date(session.start_at);
                          const formattedDate = `${date.getMonth() + 1}/${date.getDate()}`;

                          return (
                            <button
                              key={session.id}
                              onClick={() => handleSessionClick(session)}
                              className={`p-3 rounded-xl text-left transition-all cursor-pointer border-2 ${
                                hasLessonPlan 
                                  ? 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300' 
                                  : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                              }`}
                            >
                              <div className="flex items-center gap-1 mb-1">
                                <FileText size={12} className={hasLessonPlan ? 'text-emerald-600' : 'text-slate-400'} />
                                <span className={`text-xs font-bold ${hasLessonPlan ? 'text-emerald-600' : 'text-slate-500'}`}>
                                  {index + 1}회차
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-400 font-medium">{formattedDate}</p>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 수업안 작성/수정 모달 */}
      {isModalOpen && selectedSession && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4" onClick={() => setIsModalOpen(false)}>
          <div className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
            
            {/* 헤더 */}
            <div className="px-8 py-6 border-b flex justify-between items-center bg-white text-left">
              <div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight">{selectedSession.title}</h2>
                <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase">
                  {new Date(selectedSession.start_at).toLocaleDateString('ko-KR')} 수업안
                </p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="cursor-pointer text-slate-400 hover:text-slate-900 transition-colors">
                <X size={24} />
              </button>
            </div>

            {/* 내용 */}
            <div className="flex-1 overflow-y-auto p-8 space-y-4 bg-slate-50/30 text-left">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">
                수업안 내용
              </label>
              <textarea 
                className="w-full min-h-[400px] bg-white rounded-2xl p-6 text-sm leading-relaxed text-slate-700 outline-none focus:ring-2 focus:ring-blue-100 shadow-sm border border-slate-100 resize-none transition-all"
                value={modalContent}
                onChange={(e) => setModalContent(e.target.value)}
                placeholder="이번 수업안을 작성하세요...&#10;&#10;예시:&#10;- 주제: 기본 드리블 연습&#10;- 목표: 드리블 자세 교정&#10;- 활동: 콘 드리블, 미니 게임&#10;- 준비물: 축구공, 콘"
              />
            </div>

            {/* 푸터 */}
            <div className="p-8 bg-white border-t flex gap-4">
              {selectedSession.lesson_plans && selectedSession.lesson_plans.length > 0 && (
                <button 
                  onClick={handleDelete}
                  disabled={saving}
                  className="flex-1 bg-rose-50 text-rose-500 py-5 rounded-[22px] font-black text-sm cursor-pointer hover:bg-rose-100 transition-all uppercase disabled:opacity-50"
                >
                  삭제
                </button>
              )}
              <button 
                onClick={handleSave}
                disabled={saving}
                className={`flex-[2] py-5 rounded-[22px] font-black text-sm shadow-xl transition-all cursor-pointer active:scale-95 uppercase ${
                  saving 
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
                    : 'bg-slate-900 text-white hover:bg-blue-600'
                }`}
              >
                {saving ? 'Processing...' : (selectedSession.lesson_plans && selectedSession.lesson_plans.length > 0) ? 'Update' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function LessonPlansPage() {
  return (
    <Suspense fallback={<div className="p-20 text-center font-bold text-slate-300">Loading...</div>}>
      <LessonPlansContent />
    </Suspense>
  );
}
