'use client';

import { toast } from 'sonner';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { ADMIN_NAMES } from '@/app/admin/classes-shared/constants/admins';
import { getSupabaseBrowserClient } from '@/app/lib/supabase/browser';
import { devLogger } from '@/app/lib/logging/devLogger';
import { Send, RotateCcw, User, MapPin, X, ExternalLink, FileText, Maximize2, Search, BookOpen, AlertTriangle } from 'lucide-react';
import { SessionPhotosCleanupButton } from '@/app/components/admin/assets/SessionPhotosCleanupButton';
import {
  FeedbackFields,
  parseTemplateToFields,
  fieldsToTemplateText,
  getSessionDisplayStatus,
  sessionFileDisplayName,
  alignCenterDocumentNamesWithUrls,
} from '@/app/lib/feedbackValidation';
import { parseExtraTeachers } from '@/app/admin/classes-shared/lib/sessionUtils';

interface Session {
  id: string;
  title: string;
  start_at: string;
  end_at: string;
  status: 'opened' | 'finished' | 'verified' | 'postponed' | 'cancelled';
  students_text: string;
  photo_url: string[];
  file_url: string[];
  session_type: 'regular_center' | 'regular_private' | 'one_day' | 'one_day_center' | 'one_day_private';
  created_by: string;
  memo?: string | null;
  feedback_fields?: FeedbackFields;
  users?: { id: string; name: string };
  lesson_plans?: { content?: string }[];
}

interface Coach {
  id: string;
  name: string;
}

/** QC(피드백·수업안)에서 제외: 운영 admin 계정 — 이름이 `김구민 T` 형태여도 동일인으로 본다 */
function isQcExcludedAdminCoach(coach: { name?: string | null }): boolean {
  const n = String(coach.name ?? '')
    .replace(/\s*T\s*$/i, '')
    .trim();
  return ADMIN_NAMES.includes(n);
}

export default function MasterQCPage() {
  const [supabase] = useState(() => (typeof window !== 'undefined' ? getSupabaseBrowserClient() : null));
  const [activeTab, setActiveTab] = useState<'feedback' | 'lessonplan'>('feedback');
  const [coaches, setCoaches] = useState<Coach[]>([]);

  const qcCoaches = useMemo(
    () => coaches.filter((c) => !isQcExcludedAdminCoach(c)),
    [coaches]
  );
  const excludedAdminCoachIds = useMemo(
    () => coaches.filter((c) => isQcExcludedAdminCoach(c)).map((c) => c.id),
    [coaches]
  );

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
          <div className="flex items-center gap-2">
            <SessionPhotosCleanupButton days={7} />
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
          <FeedbackReviewTab
            coaches={qcCoaches}
            excludedAdminCoachIds={excludedAdminCoachIds}
            supabase={supabase}
          />
        ) : (
          <LessonPlanTab
            coaches={qcCoaches}
            excludedAdminCoachIds={excludedAdminCoachIds}
            supabase={supabase}
          />
        )}
      </div>
    </div>
  );
}

/** 피드백 검수: 과외(개인/원데이) vs 센터 구분 — 수업안 조회와 별도 */
const FEEDBACK_SESSION_TYPES_PRIVATE = ['one_day', 'one_day_private', 'regular_private'] as const satisfies readonly Session['session_type'][];
const FEEDBACK_SESSION_TYPES_CENTER = ['regular_center', 'one_day_center'] as const satisfies readonly Session['session_type'][];

/** lesson-plans-sessions API와 동일한 KST 주간(월 00:00 ~ 일 23:59) UTC 구간 */
function getKstWeekRangeFromYmd(dateYmd: string): { start: Date; end: Date } {
  const KST_OFFSET = 9 * 60 * 60 * 1000;
  const anchorMs = new Date(`${dateYmd}T12:00:00+09:00`).getTime();
  const nowKST = new Date(anchorMs + KST_OFFSET);
  const dayOfWeek = nowKST.getUTCDay();
  const daysFromMonday = (dayOfWeek + 6) % 7;
  const startKST = new Date(nowKST);
  startKST.setUTCDate(nowKST.getUTCDate() - daysFromMonday);
  startKST.setUTCHours(0, 0, 0, 0);
  const endKST = new Date(startKST);
  endKST.setUTCDate(startKST.getUTCDate() + 6);
  endKST.setUTCHours(23, 59, 59, 999);
  return {
    start: new Date(startKST.getTime() - KST_OFFSET),
    end: new Date(endKST.getTime() - KST_OFFSET),
  };
}

function formatKstWeekRangeLabel(start: Date, end: Date): string {
  const opt: Intl.DateTimeFormatOptions = {
    timeZone: 'Asia/Seoul',
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
  };
  return `${new Intl.DateTimeFormat('ko-KR', opt).format(start)} ~ ${new Intl.DateTimeFormat('ko-KR', opt).format(end)}`;
}

// 피드백 검수 탭
function FeedbackReviewTab({
  coaches,
  excludedAdminCoachIds,
  supabase,
}: {
  coaches: Coach[];
  excludedAdminCoachIds: string[];
  supabase: ReturnType<typeof getSupabaseBrowserClient> | null;
}) {
  const getSessionTypeLabel = (sessionType: Session['session_type']): string => {
    switch (sessionType) {
      case 'regular_center':
      case 'one_day_center':
        return '센터';
      case 'one_day':
        return '원데이';
      case 'one_day_private':
      case 'regular_private':
      default:
        return '개인';
    }
  };

  const getSessionTypeBadgeLabel = (sessionType: Session['session_type']): string => {
    switch (sessionType) {
      case 'regular_center':
      case 'one_day_center':
        return '센터 수업';
      case 'one_day':
        return '원데이 수업';
      case 'one_day_private':
      case 'regular_private':
      default:
        return '개인 수업';
    }
  };

  const [sessions, setSessions] = useState<Session[]>([]);
  const [feedbackScope, setFeedbackScope] = useState<'private' | 'center'>('private');
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
      const typeFilter =
        feedbackScope === 'center' ? [...FEEDBACK_SESSION_TYPES_CENTER] : [...FEEDBACK_SESSION_TYPES_PRIVATE];

      let rangeStart: Date;
      let rangeEnd: Date;
      if (feedbackScope === 'center') {
        const w = getKstWeekRangeFromYmd(selectedDate);
        rangeStart = w.start;
        rangeEnd = w.end;
      } else {
        const startOfDay = new Date(selectedDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(selectedDate);
        endOfDay.setHours(23, 59, 59, 999);
        rangeStart = startOfDay;
        rangeEnd = endOfDay;
      }

      let query = supabase
        .from('sessions')
        .select('id, title, start_at, end_at, status, students_text, photo_url, file_url, session_type, created_by, memo, feedback_fields, users:created_by(id, name)')
        .in('session_type', typeFilter)
        .gte('start_at', rangeStart.toISOString())
        .lte('start_at', rangeEnd.toISOString())
        .order('start_at', { ascending: true });
      
      if (selectedCoachId !== 'all') {
        query = query.eq('created_by', selectedCoachId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      if (data) {
        const rows = data as unknown as Session[];
        const filtered =
          excludedAdminCoachIds.length === 0
            ? rows
            : rows.filter((s) => !excludedAdminCoachIds.includes(s.created_by));
        setSessions(filtered);
      }
    } catch (err: unknown) {
      devLogger.error('데이터 로드 실패:', err);
      setError(err instanceof Error ? err.message : '데이터를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [supabase, selectedDate, selectedCoachId, feedbackScope, excludedAdminCoachIds]);

  useEffect(() => {
    fetchListData();
  }, [fetchListData]);

  useEffect(() => {
    setSelectedSessions(new Set());
  }, [feedbackScope]);

  const centerWeekRangeText = useMemo(() => {
    const { start, end } = getKstWeekRangeFromYmd(selectedDate);
    return formatKstWeekRangeLabel(start, end);
  }, [selectedDate]);

  const getSessionStatus = (session: Session): 'empty' | 'done' | 'verified' => {
    return getSessionDisplayStatus({
      ...session,
      feedback_fields: session.feedback_fields ?? parseTemplateToFields(session.students_text || '')
    });
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
    const allDone = filteredAndSearchedSessions
      .filter((s) => getSessionStatus(s) === 'done' && s.status !== 'postponed' && s.status !== 'cancelled')
      .map(s => s.id);
    setSelectedSessions(new Set(allDone));
  };

  const clearSelection = () => setSelectedSessions(new Set());

  const handleBulkApprove = async () => {
    if (!supabase || selectedSessions.size === 0) return toast.success('승인할 리포트를 선택해주세요.');
    if (!confirm(`선택한 ${selectedSessions.size}개의 리포트를 일괄 승인하시겠습니까?`)) return;
    
    setBulkActionLoading(true);
    try {
      const ids = Array.from(selectedSessions);
      const { error } = await supabase.from('sessions').update({ status: 'verified', updated_at: new Date().toISOString() }).in('id', ids);
      if (error) throw error;

      // 수업 카운팅: 일괄 검수 승인 시 session_count_logs 반영
      const toCount = sessions.filter((s) => ids.includes(s.id));
      for (const session of toCount) {
        if (session.created_by && String(session.created_by).trim()) {
          await supabase
            .from('session_count_logs')
            .insert({
              teacher_id: session.created_by,
              session_id: session.id,
              session_title: session.title ?? null,
              count_change: 1,
              reason: '검수 완료',
            })
            .then(({ error: logErr }: { error: { code?: string } | null }) => {
              if (logErr && logErr.code !== '23505' && logErr.code !== '23503') {
                devLogger.error('수업 카운팅 로그 저장 실패:', logErr);
              }
            });
        }
        if (session.memo?.includes('EXTRA_TEACHERS:')) {
          const { extraTeachers } = parseExtraTeachers(session.memo);
          for (const ex of extraTeachers) {
            if (!ex.id) continue;
            await supabase
              .from('session_count_logs')
              .insert({
                teacher_id: ex.id,
                session_id: session.id,
                session_title: session.title ?? null,
                count_change: 1,
                reason: '검수 완료 (보조)',
              })
              .then(({ error: exLog }: { error: { code?: string } | null }) => {
                if (exLog && exLog.code !== '23505' && exLog.code !== '23503') {
                  devLogger.error('수업 카운팅 로그(보조) 저장 실패:', exLog);
                }
              });
          }
        }
      }

      toast.success(`${selectedSessions.size}개의 리포트가 승인되었습니다.`);
      clearSelection();
      fetchListData();
    } catch (error: unknown) {
      toast.error('일괄 승인에 실패했습니다: ' + (error instanceof Error ? error.message : String(error)));
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
      devLogger.error('중복 체크 실패:', err);
      return { isDuplicate: false };
    }
  };

  const openEditModal = async (session: Session) => {
    setSelectedEvent(session);
    const urls = Array.isArray(session.file_url) ? session.file_url : [];
    const isCenter =
      session.session_type === 'regular_center' || session.session_type === 'one_day_center';
    let fields: FeedbackFields = session.feedback_fields || parseTemplateToFields(session.students_text || '');
    if (isCenter && urls.length > 0) {
      fields = {
        ...fields,
        center_document_names: alignCenterDocumentNamesWithUrls(urls, fields.center_document_names),
      };
    } else if (!isCenter) {
      const { center_document_names: _cd, ...rest } = fields as FeedbackFields & {
        center_document_names?: string[];
      };
      fields = rest;
    }
    setFeedbackFields(fields);
    setPhotoUrls(Array.isArray(session.photo_url) ? session.photo_url : []);
    setFileUrls(urls);
    
    // 중복 체크
    const check = await checkDuplicateFeedback(session);
    setDuplicateCheck(check);
    
    setIsModalOpen(true);
  };

  const handleSave = async (newStatus = 'verified') => {
    if (!supabase || !selectedEvent) return;
    if (newStatus === 'verified') {
      const sessionStart = new Date(selectedEvent.start_at);
      const today = new Date();
      sessionStart.setHours(0, 0, 0, 0);
      today.setHours(0, 0, 0, 0);
      if (sessionStart > today) {
        toast.error('수업일이 아직 지나지 않았습니다. 수업일 이후에 검수 승인해 주세요.');
        return;
      }
    }
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

      // 수업 카운팅: finished/verified 시 session_count_logs에 반영 (이미 있으면 23505 스킵)
      if (newStatus === 'finished' || newStatus === 'verified') {
        const reason = newStatus === 'verified' ? '검수 완료' : '작성 완료';
        if (selectedEvent.created_by && String(selectedEvent.created_by).trim()) {
          const { error: logErr } = await supabase.from('session_count_logs').insert({
            teacher_id: selectedEvent.created_by,
            session_id: selectedEvent.id,
            session_title: selectedEvent.title ?? null,
            count_change: 1,
            reason,
          });
          if (logErr && logErr.code !== '23505' && logErr.code !== '23503') {
            devLogger.error('수업 카운팅 로그 저장 실패:', logErr);
          }
        }
        if (selectedEvent.memo?.includes('EXTRA_TEACHERS:')) {
          const { extraTeachers } = parseExtraTeachers(selectedEvent.memo);
          for (const ex of extraTeachers) {
            if (!ex.id) continue;
            const { error: exLog } = await supabase.from('session_count_logs').insert({
              teacher_id: ex.id,
              session_id: selectedEvent.id,
              session_title: selectedEvent.title ?? null,
              count_change: 1,
              reason: `${reason} (보조)`,
            });
            if (exLog && exLog.code !== '23505' && exLog.code !== '23503') {
              devLogger.error('수업 카운팅 로그(보조) 저장 실패:', exLog);
            }
          }
        }
      }

      toast.success(newStatus === 'verified' ? '검수 승인 완료!' : '수정 요청 완료!');
      setIsModalOpen(false);
      fetchListData();
    } catch (error: unknown) {
      toast.error('저장에 실패했습니다: ' + (error instanceof Error ? error.message : String(error)));
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

      <div className="mb-8 space-y-2">
        <div className="flex flex-wrap gap-2 bg-white p-1 rounded-2xl shadow-sm border border-slate-200">
          <button
            type="button"
            onClick={() => setFeedbackScope('private')}
            className={`flex-1 min-w-[8rem] px-4 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
              feedbackScope === 'private' ? 'bg-slate-900 text-white' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            과외 피드백
          </button>
          <button
            type="button"
            onClick={() => setFeedbackScope('center')}
            className={`flex-1 min-w-[8rem] px-4 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
              feedbackScope === 'center' ? 'bg-slate-900 text-white' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            센터 피드백
          </button>
        </div>
        <div className="flex flex-wrap gap-2 sm:gap-3 bg-white p-3 rounded-3xl shadow-sm border border-slate-200 items-start sm:items-center">
          <div className="flex flex-col gap-1 flex-1 min-w-0">
            <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="w-full bg-slate-50 px-4 py-2 rounded-xl text-sm font-bold outline-none cursor-pointer" />
            {feedbackScope === 'center' ? (
              <p className="text-[11px] text-slate-500 font-bold leading-snug px-1">
                주간 조회 (KST 월요일~일요일): {centerWeekRangeText}
              </p>
            ) : (
              <p className="text-[11px] text-slate-500 font-bold px-1">일간 조회: 선택한 날짜의 수업만</p>
            )}
          </div>
          <select value={selectedCoachId} onChange={(e) => setSelectedCoachId(e.target.value)} className="flex-1 min-w-0 bg-slate-50 px-4 py-2 rounded-xl text-sm font-bold outline-none cursor-pointer">
            <option value="all">전체 강사</option>
            {coaches.map(c => <option key={c.id} value={c.id}>{c.name} 선생님</option>)}
          </select>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-[11px] text-slate-600 leading-relaxed space-y-2">
          <p>
            검수 완료된 리포트는 `링크 복사`로 학부모에게 전달하세요.
            단축 URL은 필요 시 자동 발급되어 `/r/XXXXXX` 형태로 복사됩니다.
          </p>
        </div>
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
          <p className="text-slate-400 font-bold">
            {searchTerm || statusFilter !== 'all'
              ? '검색 결과가 없습니다.'
              : feedbackScope === 'center'
                ? '해당 주에 등록된 센터 수업이 없습니다.'
                : '해당 일자에 등록된 과외 수업이 없습니다.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredAndSearchedSessions.map((s) => {
            const sessionStatus = getSessionStatus(s);
            const rawStatus = s.status;
            const isSelected = selectedSessions.has(s.id);
            const canSelect =
              sessionStatus === 'done' &&
              rawStatus !== 'postponed' &&
              rawStatus !== 'cancelled';
            const isVerified = sessionStatus === 'verified';
            const isDone = sessionStatus === 'done';
            const time = new Date(s.start_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
            const coachName = s.users?.name || coaches.find(c => c.id === s.created_by)?.name || '강사';

            const cardBadge = (() => {
              if (rawStatus === 'postponed') {
                return { text: '연기', className: 'bg-purple-100 text-purple-700' };
              }
              if (rawStatus === 'cancelled') {
                return { text: '취소', className: 'bg-rose-100 text-rose-700' };
              }
              if (isVerified) {
                return { text: 'DONE', className: 'bg-blue-600 text-white' };
              }
              if (isDone) {
                return { text: 'READY', className: 'bg-emerald-500 text-white' };
              }
              return { text: 'EMPTY', className: 'bg-slate-100 text-slate-400' };
            })();

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
                    <span className={`text-[9px] font-bold px-2 py-1 rounded-lg uppercase ${cardBadge.className}`}>
                      {cardBadge.text}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mb-2 line-clamp-2 text-left leading-tight">{s.title}</h3>
                  <div className="space-y-1 mb-3 text-left">
                    <div className="flex items-center gap-1 text-slate-600 text-xs">
                      <User size={12} /> {coachName}
                    </div>
                    <div className="flex items-center gap-1 text-slate-400 text-[10px]">
                      <MapPin size={10} /> {getSessionTypeLabel(s.session_type)}
                    </div>
                  </div>
                  <div className="mt-auto flex flex-wrap gap-2 items-center">
                    <button 
                      onClick={(e) => { 
                        e.stopPropagation();
                        if(!isVerified) return toast.error('검수 완료된 리포트만 복사 가능합니다.');
                        void (async () => {
                          try {
                            const res = await fetch('/api/admin/session-short-code', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ sessionId: s.id }),
                            });
                            if (!res.ok) throw new Error('short_code 발급 실패');

                            const json = (await res.json().catch(() => ({}))) as { shortCode?: string };
                            const shortCode = json.shortCode;
                            if (!shortCode) throw new Error('shortCode missing');

                            const shortUrl = `${window.location.origin}/r/${shortCode}`;
                            await navigator.clipboard.writeText(shortUrl);
                            toast.success('링크 복사 완료!');
                          } catch {
                            toast.error('링크 복사에 실패했습니다.');
                          }
                        })();
                      }} 
                      className={`p-2 rounded-xl ${isVerified ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'bg-slate-50 text-slate-300 cursor-not-allowed'}`}
                    >
                      <Send size={14} />
                    </button>
                    <button className="flex-1 min-w-[4rem] py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-indigo-600 transition-colors">검수</button>
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
            <div className="p-8 border-b flex justify-between items-start gap-4 shrink-0">
              <div className="min-w-0 flex-1">
                <h2 className="text-2xl font-black text-slate-900">{selectedEvent.title}</h2>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <button type="button" onClick={() => window.open(`/report/${selectedEvent.id}`, '_blank')} className="text-indigo-500 text-xs font-bold flex items-center gap-1 hover:underline cursor-pointer">
                    <ExternalLink size={12} /> 미리보기
                  </button>
                </div>
              </div>
              <button type="button" onClick={() => setIsModalOpen(false)} className="text-slate-300 hover:text-slate-900 cursor-pointer shrink-0"><X size={32} /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-slate-50/30">
              <div className="flex gap-2">
                <span className={`text-[9px] font-black px-3 py-1.5 rounded-full uppercase ${(selectedEvent.session_type === 'regular_center' || selectedEvent.session_type === 'one_day_center') ? 'bg-indigo-100 text-indigo-600' : 'bg-sky-100 text-sky-600'}`}>
                  {getSessionTypeBadgeLabel(selectedEvent.session_type)}
                </span>
                {selectedEvent.status === 'postponed' && (
                  <span className="text-[9px] font-black px-3 py-1.5 rounded-full uppercase bg-purple-100 text-purple-700">
                    연기
                  </span>
                )}
                {selectedEvent.status === 'cancelled' && (
                  <span className="text-[9px] font-black px-3 py-1.5 rounded-full uppercase bg-rose-100 text-rose-700">
                    취소
                  </span>
                )}
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

              {(() => {
                  const centerCondition =
                    selectedEvent.session_type === 'regular_center' ||
                    selectedEvent.session_type === 'one_day_center';
                  return centerCondition ? (
                    <div className="bg-white p-5 rounded-[24px] border border-indigo-100 space-y-3">
                  <p className="text-[10px] font-black text-indigo-400 uppercase">파일</p>
                  {fileUrls.length > 0 ? fileUrls.map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 bg-indigo-50/50 rounded-xl hover:bg-indigo-100 cursor-pointer">
                      <FileText size={18} className="text-indigo-500" />
                      <span className="text-sm font-bold text-slate-600 truncate">
                        {sessionFileDisplayName(url, i, feedbackFields.center_document_names ?? null)}
                      </span>
                      <ExternalLink size={14} className="ml-auto text-indigo-300" />
                    </a>
                  )) : <p className="text-slate-400 text-sm py-4 text-center">업로드된 파일이 없습니다</p>}
                    </div>
                  ) : null;
                })()}

              {(() => {
                const centerCondition =
                  selectedEvent.session_type === 'regular_center' ||
                  selectedEvent.session_type === 'one_day_center';
                return !centerCondition ? (
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
                ) : null;
              })()}

              {(() => {
                const centerCondition =
                  selectedEvent.session_type === 'regular_center' ||
                  selectedEvent.session_type === 'one_day_center';
                return centerCondition ? (
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
                );
              })()}
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
function LessonPlanTab({
  coaches,
  excludedAdminCoachIds,
  supabase,
}: {
  coaches: Coach[];
  excludedAdminCoachIds: string[];
  supabase: ReturnType<typeof getSupabaseBrowserClient> | null;
}) {
  const [lessonPlanScope, setLessonPlanScope] = useState<'private' | 'center'>('private');
  const [sessions, setSessions] = useState<LessonPlanSession[]>([]);
  const [selectedTeacher, setSelectedTeacher] = useState('all');
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<LessonPlanSession | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const fetchSessions = async () => {
      setLoading(true);
      try {
        const scopeParam = lessonPlanScope === 'center' ? 'center' : 'private';
        const res = await fetch(
          `/api/admin/lesson-plans-sessions?teacherId=${encodeURIComponent(selectedTeacher)}&scope=${scopeParam}&_=${Date.now()}`,
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
        const raw = Array.isArray(data) ? data : [];
        const filtered =
          excludedAdminCoachIds.length === 0
            ? raw
            : raw.filter((s: LessonPlanSession) => !excludedAdminCoachIds.includes(String(s.created_by)));
        setSessions(filtered);
      } catch (err: unknown) {
        devLogger.error('수업안 로드 실패:', err instanceof Error ? err.message : err);
        setSessions([]);
      } finally {
        setLoading(false);
      }
    };
    fetchSessions();
  }, [selectedTeacher, lessonPlanScope, excludedAdminCoachIds]);

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
      <div className="mb-6 flex flex-wrap gap-2 bg-white p-1 rounded-2xl shadow-sm border border-slate-200">
        <button
          type="button"
          onClick={() => setLessonPlanScope('private')}
          className={`flex-1 min-w-[8rem] px-4 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
            lessonPlanScope === 'private' ? 'bg-slate-900 text-white' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          과외 수업안
        </button>
        <button
          type="button"
          onClick={() => setLessonPlanScope('center')}
          className={`flex-1 min-w-[8rem] px-4 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
            lessonPlanScope === 'center' ? 'bg-slate-900 text-white' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          센터 수업안
        </button>
      </div>

      <div className="mb-8 flex flex-wrap items-center gap-4">
        <select value={selectedTeacher} onChange={e => setSelectedTeacher(e.target.value)} className="px-4 py-3 bg-white border-2 border-slate-200 rounded-xl font-bold outline-none focus:border-blue-400 hover:border-slate-300 transition-colors cursor-pointer">
          <option value="all">전체 선생님</option>
          {coaches.map(c => <option key={c.id} value={c.id}>{c.name} 선생님</option>)}
        </select>
        <span className="text-sm text-slate-500">이번 주 (월요일~일요일, KST)</span>
      </div>

      {loading ? (
        <div className="py-40 text-center text-slate-400 font-bold animate-pulse">Loading...</div>
      ) : Object.keys(groupedByTeacher).length === 0 ? (
        <div className="bg-white rounded-[40px] py-32 text-center border border-dashed">
          <p className="text-slate-400 font-bold">
            {lessonPlanScope === 'center'
              ? '이번 주 센터 수업이 없습니다.'
              : '이번 주 과외 수업이 없습니다.'}
          </p>
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
