'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import DOMPurify from 'isomorphic-dompurify';
import { Pin, ChevronDown, RefreshCw, Layout, ChevronRight, Package, Receipt, Calendar } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/app/lib/supabase/browser';

interface WeeklyBest {
  id: string;
  title: string;
  content: string | null;
  lesson_plan_session_id: string | null;
  photo_urls: string[];
  feedback_session_id: string | null;
  created_at: string;
}

function sanitizeNoticeHtml(html: string): string {
  if (typeof window !== 'undefined') {
    return DOMPurify.sanitize(html, { ALLOWED_TAGS: ['p', 'br', 'img', 'div', 'span'], ALLOWED_ATTR: ['src', 'alt', 'class'] });
  }
  return html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
}

type InlineImageItem = { after_line: number; url: string };

interface Notice {
  id: number;
  title: string;
  content: string;
  category: string;
  is_pinned: boolean;
  created_at: string;
  image_urls?: string[] | null;
  inline_images?: InlineImageItem[] | null;
}

interface TodaySession {
  id: string;
  title: string;
  start_at: string;
  session_type: string;
}

const CATEGORY_MAP: Record<string, { label: string; color: string }> = {
  must: { label: '필독', color: 'bg-rose-50 text-rose-600 border-rose-100' },
  general: { label: '일반', color: 'bg-slate-50 text-slate-600 border-slate-100' },
  event: { label: '이벤트', color: 'bg-indigo-50 text-indigo-600 border-indigo-100' },
};

function TeacherWeeklyBestCard({
  row,
  isExpanded,
  onToggle,
  supabase,
}: {
  row: WeeklyBest;
  isExpanded: boolean;
  onToggle: () => void;
  supabase: ReturnType<typeof getSupabaseBrowserClient> | null;
}) {
  const [detailLesson, setDetailLesson] = useState<string | null>(null);
  const [detailFeedback, setDetailFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase || !isExpanded) return;
    if (!row.lesson_plan_session_id && !row.feedback_session_id) return;
    (async () => {
      const [lpRes, fbRes] = await Promise.all([
        row.lesson_plan_session_id ? supabase.from('lesson_plans').select('content').eq('session_id', row.lesson_plan_session_id).maybeSingle() : Promise.resolve({ data: null }),
        row.feedback_session_id ? supabase.from('sessions').select('feedback_fields, students_text').eq('id', row.feedback_session_id).maybeSingle() : Promise.resolve({ data: null }),
      ]);
      setDetailLesson(lpRes.data?.content ?? null);
      const fb = fbRes.data as { feedback_fields?: { main_activity?: string; strengths?: string; next_goals?: string; improvements?: string; condition_notes?: string }; students_text?: string } | null;
      if (fb?.students_text) setDetailFeedback(fb.students_text);
      else if (fb?.feedback_fields) {
        const f = fb.feedback_fields;
        const parts: string[] = [];
        if (f.main_activity) parts.push(`✅ 주요 활동\n${f.main_activity}`);
        if (f.strengths) parts.push(`✅ 강점\n${f.strengths}`);
        if (f.improvements) parts.push(`✅ 개선점\n${f.improvements}`);
        if (f.next_goals) parts.push(`✅ 다음 목표\n${f.next_goals}`);
        if (f.condition_notes) parts.push(`✅ 특이사항 및 시작/종료 시간\n${f.condition_notes}`);
        setDetailFeedback(parts.join('\n\n'));
      } else setDetailFeedback(null);
    })();
  }, [supabase, isExpanded, row.id, row.lesson_plan_session_id, row.feedback_session_id]);

  return (
    <div className="bg-white rounded-[28px] transition-all duration-300 border overflow-hidden shadow-sm hover:border-amber-100 border-amber-100/80">
      <button
        type="button"
        onClick={onToggle}
        className="w-full p-6 text-left flex flex-col cursor-pointer"
      >
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[9px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-100">주간베스트</span>
          <span className="text-[10px] text-slate-400 font-medium">{new Date(row.created_at).toLocaleDateString()}</span>
        </div>
        <div className="flex items-start justify-between gap-4">
          <h3 className={`text-[15px] font-black leading-tight flex-1 ${isExpanded ? 'text-indigo-600' : 'text-slate-800'}`}>{row.title}</h3>
          <ChevronDown size={18} className={`text-slate-300 transition-transform duration-300 shrink-0 ${isExpanded ? 'rotate-180 text-indigo-500' : ''}`} />
        </div>
      </button>
      {isExpanded && (
        <div className="px-6 pb-6 animate-in fade-in slide-in-from-top-1 duration-200 space-y-5">
          {row.content && (
            <section>
              <h4 className="text-[10px] font-black text-slate-400 uppercase mb-2">공지</h4>
              <div className="text-[14px] text-slate-600 whitespace-pre-wrap bg-slate-50 p-4 rounded-xl border border-slate-100">{row.content}</div>
            </section>
          )}
          <section>
            <h4 className="text-[10px] font-black text-slate-400 uppercase mb-2">베스트 지도안</h4>
            <div className="text-[14px] text-slate-600 whitespace-pre-wrap bg-slate-50 p-4 rounded-xl border border-slate-100 min-h-[60px]">{row.lesson_plan_session_id ? (detailLesson ?? '로딩 중...') : '— 없음'}</div>
          </section>
          <section>
            <h4 className="text-[10px] font-black text-slate-400 uppercase mb-2">베스트 포토</h4>
            <div className="flex flex-wrap gap-2">
              {row.photo_urls?.length ? row.photo_urls.map((url, i) => (
                <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block w-20 h-20 rounded-lg overflow-hidden border border-slate-200 cursor-pointer">
                  <img src={url} alt="" className="w-full h-full object-cover" />
                </a>
              )) : '— 없음'}
            </div>
          </section>
          <section>
            <h4 className="text-[10px] font-black text-slate-400 uppercase mb-2">베스트 피드백</h4>
            <div className="text-[14px] text-slate-600 whitespace-pre-wrap bg-slate-50 p-4 rounded-xl border border-slate-100 min-h-[60px]">{row.feedback_session_id ? (detailFeedback ?? '로딩 중...') : '— 없음'}</div>
          </section>
        </div>
      )}
    </div>
  );
}

export default function TeacherMainPage() {
  const router = useRouter();
  const [supabase] = useState(() => (typeof window !== 'undefined' ? getSupabaseBrowserClient() : null));
  const [notices, setNotices] = useState<Notice[]>([]);
  const [weeklyBestList, setWeeklyBestList] = useState<WeeklyBest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [expandedWbId, setExpandedWbId] = useState<string | null>(null);
  const [todaySessions, setTodaySessions] = useState<TodaySession[]>([]);
  const [todayLoading, setTodayLoading] = useState(true);
  const [noticeFetchError, setNoticeFetchError] = useState<string | null>(null);
  const [todayFetchError, setTodayFetchError] = useState<string | null>(null);

  const fetchNotices = useCallback(async () => {
    if (!supabase) return;
    try {
      setLoading(true);
      setNoticeFetchError(null);
      const [noticesRes, weeklyRes] = await Promise.all([
        supabase.from('notices').select('*').order('is_pinned', { ascending: false }).order('created_at', { ascending: false }),
        supabase.from('weekly_best').select('*').order('created_at', { ascending: false }),
      ]);
      if (!noticesRes.error) setNotices((noticesRes.data as Notice[]) ?? []);
      if (!weeklyRes.error) setWeeklyBestList((weeklyRes.data as WeeklyBest[]) ?? []);
    } catch (err) {
      console.error('Fetch error:', err);
      setNoticeFetchError('공지사항을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  const unifiedList = useMemo(() => {
    const a = notices.map((n) => ({ type: 'notice' as const, id: String(n.id), created_at: n.created_at, data: n }));
    const b = weeklyBestList.map((w) => ({ type: 'weekly_best' as const, id: w.id, created_at: w.created_at, data: w }));
    return [...a, ...b].sort((x, y) => new Date(y.created_at).getTime() - new Date(x.created_at).getTime());
  }, [notices, weeklyBestList]);

  const fetchTodaySessions = useCallback(async () => {
    if (!supabase) return;
    try {
      setTodayLoading(true);
      setTodayFetchError(null);
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) return;
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
      const { data, error } = await supabase
        .from('sessions')
        .select('id, title, start_at, session_type')
        .eq('created_by', userData.user.id)
        .gte('start_at', start.toISOString())
        .lte('start_at', end.toISOString())
        .order('start_at', { ascending: true });
      if (error) throw error;
      setTodaySessions((data as TodaySession[]) ?? []);
    } catch (err) {
      console.error('Today sessions fetch error:', err);
      setTodayFetchError('오늘 수업을 불러오지 못했습니다.');
    } finally {
      setTodayLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchNotices();
  }, [fetchNotices]);

  useEffect(() => {
    fetchTodaySessions();
  }, [fetchTodaySessions]);

  return (
    <div className="px-6 pt-8 pb-32">
      {/* 웰컴 배너 및 퀵 버튼 */}
      <section className="mb-10">
        <div className="bg-slate-900 rounded-[32px] p-8 text-white shadow-2xl shadow-slate-200 relative overflow-hidden">
          <div className="relative z-10">
            <h2 className="text-2xl font-black mb-6 leading-tight">
              선생님, 오늘도<br />아이들과 즐겁게 몰입하세요!
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => router.push('/teacher/my-classes')}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-3 rounded-2xl text-sm font-black transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <Calendar size={16} /> 주간 일정 <ChevronRight size={16} />
              </button>
              <button 
                onClick={() => router.push('/teacher/inventory')}
                className="bg-white/10 hover:bg-white/20 backdrop-blur-md text-white px-5 py-3 rounded-2xl text-sm font-black transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <Package size={16} /> 교구 목록
              </button>
              <button 
                onClick={() => router.push('/teacher/report')}
                className="bg-white/10 hover:bg-white/20 backdrop-blur-md text-white px-5 py-3 rounded-2xl text-sm font-black transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <Receipt size={16} /> 정산 확인
              </button>
            </div>
          </div>
          <Layout className="absolute -right-4 -bottom-4 w-32 h-32 text-white/5 rotate-12 pointer-events-none" />
        </div>
      </section>

      {/* 오늘 수업 - 공지 위 */}
      <section className="mb-10">
        <h3 className="text-xl font-black text-slate-900 mb-4 px-1">오늘 수업</h3>
        {todayFetchError ? (
          <div className="py-8 text-center bg-white rounded-[28px] border-2 border-slate-100">
            <p className="text-slate-500 text-sm font-bold mb-3">{todayFetchError}</p>
            <button type="button" onClick={fetchTodaySessions} className="text-indigo-600 text-xs font-black hover:underline">
              다시 시도
            </button>
          </div>
        ) : todayLoading ? (
          <div className="py-8 text-center bg-white rounded-[28px] border-2 border-slate-100">
            <div className="w-6 h-6 border-2 border-slate-200 border-t-indigo-500 rounded-full animate-spin mx-auto mb-2" />
            <p className="text-slate-400 text-xs font-bold">로딩 중...</p>
          </div>
        ) : todaySessions.length === 0 ? (
          <div className="py-8 text-center bg-white rounded-[28px] border-2 border-dashed border-slate-100">
            <p className="text-slate-400 text-sm font-bold">오늘 예정된 수업이 없습니다</p>
            <button
              type="button"
              onClick={() => router.push('/teacher/my-classes')}
              className="mt-3 text-indigo-600 text-xs font-black hover:underline"
            >
              주간 일정 보기
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {todaySessions.map((s) => {
              const start = new Date(s.start_at);
              const timeStr = start.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => router.push('/teacher/my-classes')}
                  className="w-full p-4 rounded-[24px] bg-white border-2 border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/30 text-left transition-all flex items-center gap-4 cursor-pointer active:scale-[0.99]"
                >
                  <div className="w-14 h-14 rounded-xl bg-slate-900 text-white flex flex-col items-center justify-center shrink-0">
                    <span className="text-[10px] font-black uppercase">오늘</span>
                    <span className="text-base font-black leading-none">{timeStr}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[9px] font-black px-1.5 py-0.5 rounded uppercase bg-slate-100 text-slate-600">
                      {s.session_type === 'regular_center' ? '센터' : '방문'}
                    </span>
                    <p className="text-sm font-black text-slate-800 truncate mt-1">{s.title || '제목 없음'}</p>
                  </div>
                  <ChevronRight size={18} className="text-slate-300 shrink-0" />
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => router.push('/teacher/my-classes')}
              className="w-full py-3 text-center text-slate-500 text-sm font-bold hover:text-indigo-600 transition-colors"
            >
              주간 일정 · 수업안 보기
            </button>
          </div>
        )}
      </section>

      {/* 공지사항 섹션 */}
      <section className="flex flex-col h-full">
        <div className="flex items-center justify-between mb-6 px-1">
          <h3 className="text-xl font-black text-slate-900">공지사항</h3>
          <button 
            onClick={fetchNotices} 
            className={`p-2 cursor-pointer hover:bg-slate-100 rounded-full transition-all ${loading ? 'animate-spin' : ''}`}
          >
            <RefreshCw size={18} className="text-slate-400" />
          </button>
        </div>

        {/* 공지사항 스크롤 영역: 한 화면에 가득 차지 않게 조정 */}
        <div className="space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar pr-1">
          {noticeFetchError ? (
            <div className="py-20 text-center flex flex-col items-center bg-white rounded-[32px] border border-slate-50">
              <p className="text-slate-500 text-sm font-bold mb-3">{noticeFetchError}</p>
              <button type="button" onClick={fetchNotices} className="text-indigo-600 text-xs font-black hover:underline">
                다시 시도
              </button>
            </div>
          ) : loading ? (
             <div className="py-20 text-center flex flex-col items-center bg-white rounded-[32px] border border-slate-50">
                <div className="w-8 h-8 border-2 border-slate-100 border-t-indigo-600 rounded-full animate-spin mb-4" />
                <p className="text-slate-400 text-xs font-bold">로딩 중...</p>
             </div>
          ) : unifiedList.length > 0 ? (
              unifiedList.map((item) => {
                if (item.type === 'weekly_best') {
                  const row = item.data as WeeklyBest;
                  return (
                    <TeacherWeeklyBestCard
                      key={`wb-${row.id}`}
                      row={row}
                      isExpanded={expandedWbId === row.id}
                      onToggle={() => setExpandedWbId(expandedWbId === row.id ? null : row.id)}
                      supabase={supabase}
                    />
                  );
                }
                const notice = item.data as Notice;
                const category = CATEGORY_MAP[notice.category] ?? CATEGORY_MAP.general;
                const isExpanded = expandedId === notice.id;

                return (
                  <div key={`n-${notice.id}`} className={`bg-white rounded-[28px] transition-all duration-300 border overflow-hidden shadow-sm hover:border-indigo-100
                      ${isExpanded ? 'border-indigo-200 ring-4 ring-indigo-500/5' : 'border-slate-100'}
                      ${notice.is_pinned && !isExpanded ? 'bg-rose-50/30 border-rose-100' : ''}
                    `}
                  >
                    <div
                      role="button"
                      tabIndex={0}
                      className="p-6 cursor-pointer flex flex-col"
                      onClick={() => setExpandedId(isExpanded ? null : notice.id)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpandedId(isExpanded ? null : notice.id); } }}
                    >
                      <div className="flex items-center gap-2 mb-3 pointer-events-none">
                        {notice.is_pinned && <Pin size={12} className="text-rose-500 fill-rose-500" />}
                        <span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold border ${category.color}`}>{category.label}</span>
                        <span className="text-[10px] text-slate-400 font-medium">{new Date(notice.created_at).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-start justify-between gap-4 pointer-events-none">
                        <h3 className={`text-[15px] font-black leading-tight flex-1 ${isExpanded ? 'text-indigo-600' : 'text-slate-800'}`}>{notice.title}</h3>
                        <ChevronDown size={18} className={`text-slate-300 transition-transform duration-300 shrink-0 ${isExpanded ? 'rotate-180 text-indigo-500' : ''}`} />
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="px-6 pb-6 animate-in fade-in slide-in-from-top-1 duration-200">
                        <div className="text-[14px] text-slate-600 font-medium leading-relaxed bg-slate-50 p-5 rounded-[20px] border border-slate-100 break-all select-text max-h-[500px] overflow-y-auto [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-lg [&_img]:my-2">
                          {(notice.content || '').trim().includes('<') ? (
                            <div dangerouslySetInnerHTML={{ __html: sanitizeNoticeHtml(notice.content) }} />
                          ) : ((): React.ReactNode => {
                            const lines = (notice.content || '').split(/\r?\n/);
                            const hasInline = notice.inline_images && notice.inline_images.length > 0;
                            if (!hasInline && notice.image_urls && notice.image_urls.length > 0) {
                              return (
                                <>
                                  <span className="whitespace-pre-wrap">{notice.content}</span>
                                  <div className="flex flex-col gap-3 mt-4">
                                    {notice.image_urls.map((url, i) => (
                                      <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block w-full max-w-full rounded-lg overflow-hidden border border-slate-200 cursor-pointer">
                                        <img src={url} alt={`이미지 ${i + 1}`} className="w-full max-w-full h-auto object-contain" />
                                      </a>
                                    ))}
                                  </div>
                                </>
                              );
                            }
                            if (!hasInline) return <span className="whitespace-pre-wrap">{notice.content}</span>;
                            return (
                              <>
                                {lines.map((line, i) => (
                                  <span key={i}>
                                    <span className="whitespace-pre-wrap">{line}</span>
                                    {i < lines.length - 1 ? '\n' : null}
                                    {(notice.inline_images!).filter((im) => im.after_line === i).map((im, j) => (
                                      <a key={`${i}-${j}`} href={im.url} target="_blank" rel="noopener noreferrer" className="block w-full max-w-full rounded-lg overflow-hidden border border-slate-200 mt-2 cursor-pointer">
                                        <img src={im.url} alt="이미지" className="w-full max-w-full h-auto object-contain" />
                                      </a>
                                    ))}
                                  </span>
                                ))}
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
          ) : (
            <div className="py-20 text-center bg-white rounded-[32px] border border-slate-50">
              <p className="text-slate-300 text-sm font-bold">등록된 공지사항이 없습니다.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}