'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { toast } from 'sonner';
import DOMPurify from 'isomorphic-dompurify';
import { getSupabaseBrowserClient } from '@/app/lib/supabase/browser';
import { Plus, Trash2, X, Pin, ChevronDown, RefreshCw, Edit3, Image as ImageIcon, FileText, Camera, MessageSquare, ChevronRight } from 'lucide-react';
import { BUCKET_NAME } from '@/app/lib/admin/constants/storage';
import { parseTemplateToFields, isFieldValid } from '@/app/lib/feedbackValidation';
import type { FeedbackFields } from '@/app/lib/feedbackValidation';

const CATEGORIES = [
  { id: 'ALL', label: '전체' },
  { id: 'must', label: '필독', color: 'bg-rose-50 text-rose-600 border-rose-100' },
  { id: 'general', label: '일반', color: 'bg-slate-50 text-slate-600 border-slate-100' },
  { id: 'event', label: '이벤트', color: 'bg-indigo-50 text-indigo-600 border-indigo-100' },
];

function sanitizeNoticeHtml(html: string): string {
  if (typeof window !== 'undefined') {
    return DOMPurify.sanitize(html, { ALLOWED_TAGS: ['p', 'br', 'img', 'div', 'span'], ALLOWED_ATTR: ['src', 'alt', 'class'] });
  }
  return html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
}

function wrapImagesWithDeleteButton(container: HTMLElement): void {
  const imgs = Array.from(container.querySelectorAll('img'));
  imgs.forEach((img) => {
    if (img.closest('[data-image-wrap]')) return;
    const wrap = document.createElement('span');
    wrap.setAttribute('data-image-wrap', 'true');
    wrap.setAttribute('contenteditable', 'false');
    wrap.className = 'relative inline-block my-2';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.setAttribute('data-remove-image', 'true');
    btn.className = 'absolute top-1 right-1 w-7 h-7 rounded-full bg-red-500 text-white flex items-center justify-center text-sm font-bold hover:bg-red-600 z-10 touch-manipulation';
    btn.textContent = '×';
    img.parentNode?.insertBefore(wrap, img);
    wrap.appendChild(img);
    wrap.appendChild(btn);
  });
}

function getContentWithoutWrappers(container: HTMLElement): string {
  const clone = container.cloneNode(true) as HTMLElement;
  clone.querySelectorAll('[data-image-wrap]').forEach((wrap) => {
    const img = wrap.querySelector('img');
    if (img) {
      const replacement = img.cloneNode(true) as HTMLImageElement;
      wrap.parentNode?.replaceChild(replacement, wrap);
    } else {
      wrap.remove();
    }
  });
  return clone.innerHTML;
}

export type InlineImageItem = { after_line: number; url: string };

interface Notice {
  id: number;
  title: string;
  content: string;
  category: string;
  is_pinned: boolean;
  created_at: string;
  author?: string;
  image_urls?: string[] | null;
  inline_images?: InlineImageItem[] | null;
}

export interface WeeklyBest {
  id: string;
  title: string;
  content: string | null;
  lesson_plan_session_id: string | null;
  photo_urls: string[];
  feedback_session_id: string | null;
  created_at: string;
}

type MainTab = 'notice' | 'weekly_best';

function WeeklyBestCard({
  row,
  supabase,
  onDelete,
  onRefresh,
  detailLesson,
  detailFeedback,
  isExpanded,
  onToggle,
}: {
  row: WeeklyBest;
  supabase: ReturnType<typeof getSupabaseBrowserClient> | null;
  onDelete: (id: string) => void;
  onRefresh: () => void;
  detailLesson: string | null;
  detailFeedback: string | null;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="bg-white rounded-[28px] border border-amber-100 overflow-hidden shadow-sm">
      <button
        type="button"
        onClick={onToggle}
        className="w-full p-6 text-left flex items-center justify-between cursor-pointer"
      >
        <div>
          <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-100 mr-2">주간베스트</span>
          <h3 className="text-lg font-black text-slate-800 inline">{row.title}</h3>
          <p className="text-[11px] text-slate-400 mt-1">{new Date(row.created_at).toLocaleDateString('ko-KR')}</p>
        </div>
        <ChevronDown size={20} className={`text-slate-300 transition-transform shrink-0 ${isExpanded ? 'rotate-180' : ''}`} />
      </button>
      {isExpanded && (
        <div className="px-6 pb-6 space-y-6 border-t border-slate-100 pt-4">
          {row.content && (
            <section>
              <h4 className="text-[10px] font-black text-slate-400 uppercase mb-2">공지</h4>
              <div className="text-sm text-slate-700 whitespace-pre-wrap bg-slate-50 p-4 rounded-xl">{row.content}</div>
            </section>
          )}
          <section>
            <h4 className="text-[10px] font-black text-slate-400 uppercase mb-2">베스트 지도안</h4>
            <div className="text-sm text-slate-700 whitespace-pre-wrap bg-slate-50 p-4 rounded-xl min-h-[80px]">
              {row.lesson_plan_session_id ? (detailLesson ?? '로딩 중...') : '— 없음'}
            </div>
          </section>
          <section>
            <h4 className="text-[10px] font-black text-slate-400 uppercase mb-2">베스트 포토</h4>
            <div className="flex flex-wrap gap-2">
              {row.photo_urls?.length ? row.photo_urls.map((url, i) => (
                <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block w-24 h-24 rounded-lg overflow-hidden border border-slate-200 cursor-pointer">
                  <img src={url} alt="" className="w-full h-full object-cover" />
                </a>
              )) : '— 없음'}
            </div>
          </section>
          <section>
            <h4 className="text-[10px] font-black text-slate-400 uppercase mb-2">베스트 피드백</h4>
            <div className="text-sm text-slate-700 whitespace-pre-wrap bg-slate-50 p-4 rounded-xl min-h-[80px]">
              {row.feedback_session_id ? (detailFeedback ?? '로딩 중...') : '— 없음'}
            </div>
          </section>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => onDelete(row.id)}
              className="min-h-[44px] flex items-center gap-1.5 text-slate-500 hover:text-rose-600 text-xs font-bold px-4 py-2 hover:bg-rose-50 rounded-full transition-all touch-manipulation cursor-pointer"
            >
              <Trash2 size={14} /> 삭제
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function WeeklyBestList({
  list,
  loading,
  supabase,
  onRefresh,
  onDelete,
}: {
  list: WeeklyBest[];
  loading: boolean;
  supabase: ReturnType<typeof getSupabaseBrowserClient> | null;
  onRefresh: () => void;
  onDelete: (id: string) => void;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detailLesson, setDetailLesson] = useState<string | null>(null);
  const [detailFeedback, setDetailFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase || !expandedId) return;
    const row = list.find((r) => r.id === expandedId);
    if (!row) return;
    if (!row.lesson_plan_session_id && !row.feedback_session_id) {
      setDetailLesson(null);
      setDetailFeedback(null);
      return;
    }
    (async () => {
      const [lpRes, fbRes] = await Promise.all([
        row.lesson_plan_session_id
          ? supabase.from('lesson_plans').select('content').eq('session_id', row.lesson_plan_session_id).maybeSingle()
          : Promise.resolve({ data: null }),
        row.feedback_session_id
          ? supabase.from('sessions').select('feedback_fields, students_text').eq('id', row.feedback_session_id).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);
      setDetailLesson(lpRes.data?.content ?? null);
      const fb = fbRes.data as { feedback_fields?: FeedbackFields; students_text?: string } | null;
      setDetailFeedback(fb?.students_text ?? (fb?.feedback_fields ? formatFeedbackFields(fb.feedback_fields) : null));
    })();
  }, [supabase, expandedId, list]);

  if (loading) {
    return (
      <div className="py-32 text-center">
        <div className="w-10 h-10 border-4 border-slate-100 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-400 font-bold">불러오는 중...</p>
      </div>
    );
  }
  if (list.length === 0) {
    return (
      <div className="py-32 text-center border-2 border-dashed border-slate-200 rounded-[28px] bg-white">
        <p className="text-slate-400 font-bold">등록된 주간베스트가 없습니다.</p>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      {list.map((row) => (
        <WeeklyBestCard
          key={row.id}
          row={row}
          supabase={supabase}
          onDelete={onDelete}
          onRefresh={onRefresh}
          detailLesson={expandedId === row.id ? detailLesson : null}
          detailFeedback={expandedId === row.id ? detailFeedback : null}
          isExpanded={expandedId === row.id}
          onToggle={() => setExpandedId(expandedId === row.id ? null : row.id)}
        />
      ))}
    </div>
  );
}

function formatFeedbackFields(f: FeedbackFields): string {
  const parts: string[] = [];
  if (f.main_activity) parts.push(`✅ 주요 활동\n${f.main_activity}`);
  if (f.strengths) parts.push(`✅ 강점\n${f.strengths}`);
  if (f.improvements) parts.push(`✅ 개선점\n${f.improvements}`);
  if (f.next_goals) parts.push(`✅ 다음 목표\n${f.next_goals}`);
  if (f.condition_notes) parts.push(`✅ 특이사항\n${f.condition_notes}`);
  return parts.join('\n\n');
}

function WeeklyBestCardWithState({
  row,
  supabase,
  onDelete,
  onRefresh,
}: {
  row: WeeklyBest;
  supabase: ReturnType<typeof getSupabaseBrowserClient> | null;
  onDelete: (id: string) => void;
  onRefresh: () => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
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
      const fb = fbRes.data as { feedback_fields?: FeedbackFields; students_text?: string } | null;
      setDetailFeedback(fb?.students_text ?? (fb?.feedback_fields ? formatFeedbackFields(fb.feedback_fields) : null));
    })();
  }, [supabase, isExpanded, row.id, row.lesson_plan_session_id, row.feedback_session_id]);

  return (
    <WeeklyBestCard
      row={row}
      supabase={supabase}
      onDelete={onDelete}
      onRefresh={onRefresh}
      detailLesson={detailLesson}
      detailFeedback={detailFeedback}
      isExpanded={isExpanded}
      onToggle={() => setIsExpanded((v) => !v)}
    />
  );
}

export default function NoticePage() {
  const [supabase] = useState(() => (typeof window !== 'undefined' ? getSupabaseBrowserClient() : null));
  const [mainTab, setMainTab] = useState<MainTab>('notice');
  const [showWriteChoiceModal, setShowWriteChoiceModal] = useState(false);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [weeklyBestList, setWeeklyBestList] = useState<WeeklyBest[]>([]);
  const [weeklyBestLoading, setWeeklyBestLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState('ALL');

  const [form, setForm] = useState({
    title: '', content: '', category: 'general', is_pinned: false
  });
  const [uploadingImages, setUploadingImages] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showWeeklyBestWizard, setShowWeeklyBestWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [wizardOpenDate, setWizardOpenDate] = useState<Date>(() => new Date());
  const [wbForm, setWbForm] = useState<{
    title: string;
    content: string;
    lesson_plan_session_id: string;
    photo_urls: string[];
    feedback_session_id: string;
  }>({ title: '', content: '', lesson_plan_session_id: '', photo_urls: [], feedback_session_id: '' });
  const [coaches, setCoaches] = useState<{ id: string; name: string }[]>([]);
  const [wbCoachFilter, setWbCoachFilter] = useState('all');
  const [lessonSessions, setLessonSessions] = useState<{ id: string; title: string; start_at: string; created_by: string; lesson_plans?: { content?: string }[]; users?: { name?: string } | null }[]>([]);
  const [feedbackSessions, setFeedbackSessions] = useState<{ id: string; title: string; start_at: string; created_by: string; feedback_fields?: FeedbackFields; students_text?: string; users?: { name?: string } | null }[]>([]);
  const [wbStepLoading, setWbStepLoading] = useState(false);
  const [wbSaving, setWbSaving] = useState(false);
  const wbPhotoInputRef = useRef<HTMLInputElement>(null);

  const fetchNotices = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('notices')
      .select('*')
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false });

    if (!error && data) setNotices(data as Notice[]);
    setLoading(false);
  }, [supabase]);

  const fetchWeeklyBest = useCallback(async () => {
    if (!supabase) return;
    setWeeklyBestLoading(true);
    const { data, error } = await supabase
      .from('weekly_best')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) setWeeklyBestList(data as WeeklyBest[]);
    setWeeklyBestLoading(false);
  }, [supabase]);

  const refreshAll = useCallback(() => {
    fetchNotices();
    fetchWeeklyBest();
  }, [fetchNotices, fetchWeeklyBest]);

  const unifiedList = useMemo(() => {
    const a = notices.map((n) => ({ type: 'notice' as const, id: String(n.id), created_at: n.created_at, data: n }));
    const b = weeklyBestList.map((w) => ({ type: 'weekly_best' as const, id: w.id, created_at: w.created_at, data: w }));
    return [...a, ...b].sort((x, y) => new Date(y.created_at).getTime() - new Date(x.created_at).getTime());
  }, [notices, weeklyBestList]);

  useEffect(() => { fetchNotices(); }, [fetchNotices]);
  useEffect(() => { fetchWeeklyBest(); }, [fetchWeeklyBest]);

  useEffect(() => {
    if (!isModalOpen || !editorRef.current) return;
    let html = form.content || '';
    if (!html.includes('<')) {
      html = html.replace(/\n/g, '<br>');
    }
    editorRef.current.innerHTML = html;
    wrapImagesWithDeleteButton(editorRef.current);
  }, [isModalOpen, form.content]);

  const getWeeklyBestDateRange = useCallback(() => {
    const start = new Date(wizardOpenDate);
    start.setDate(start.getDate() - 7);
    start.setHours(0, 0, 0, 0);
    const end = new Date(wizardOpenDate);
    end.setDate(end.getDate() - 1);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }, [wizardOpenDate]);

  const fetchLessonCandidates = useCallback(async () => {
    if (!supabase) return;
    setWbStepLoading(true);
    const { start, end } = getWeeklyBestDateRange();
    let q = supabase
      .from('sessions')
      .select('id, title, start_at, created_by, lesson_plans(content), users!created_by(id, name)')
      .gte('start_at', start.toISOString())
      .lte('start_at', end.toISOString())
      .order('start_at', { ascending: false });
    if (wbCoachFilter !== 'all') q = q.eq('created_by', wbCoachFilter);
    const { data, error } = await q;
    if (!error && data) {
      const withPlan = (data as { lesson_plans?: { content?: string }[] | { content?: string } }[]).filter((s) => {
        const lp = s.lesson_plans;
        const content = Array.isArray(lp) ? lp[0]?.content : (lp as { content?: string } | null)?.content;
        return !!content;
      });
      setLessonSessions(withPlan as typeof lessonSessions);
    }
    setWbStepLoading(false);
  }, [supabase, getWeeklyBestDateRange, wbCoachFilter]);

  const fetchFeedbackCandidates = useCallback(async () => {
    if (!supabase) return;
    setWbStepLoading(true);
    const { start, end } = getWeeklyBestDateRange();
    let q = supabase
      .from('sessions')
      .select('id, title, start_at, created_by, feedback_fields, students_text, users!created_by(id, name)')
      .gte('start_at', start.toISOString())
      .lte('start_at', end.toISOString())
      .order('start_at', { ascending: false });
    if (wbCoachFilter !== 'all') q = q.eq('created_by', wbCoachFilter);
    const { data, error } = await q;
    if (!error && data) {
      const withFeedback = (data as { feedback_fields?: FeedbackFields; students_text?: string }[]).filter((s) => {
        const fields = s.feedback_fields ?? parseTemplateToFields(s.students_text || '');
        return isFieldValid(fields.main_activity) || isFieldValid(fields.strengths) || isFieldValid(fields.next_goals);
      });
      setFeedbackSessions(withFeedback as typeof feedbackSessions);
    }
    setWbStepLoading(false);
  }, [supabase, getWeeklyBestDateRange, wbCoachFilter]);

  useEffect(() => {
    if (showWeeklyBestWizard && wizardStep === 1 && coaches.length === 0 && supabase) {
      supabase.from('users').select('id, name').eq('is_active', true).order('name').then(({ data }) => {
        if (data) setCoaches(data as { id: string; name: string }[]);
      });
    }
  }, [showWeeklyBestWizard, wizardStep, coaches.length, supabase]);

  useEffect(() => {
    if (showWeeklyBestWizard && wizardStep === 2) fetchLessonCandidates();
  }, [showWeeklyBestWizard, wizardStep, fetchLessonCandidates]);

  useEffect(() => {
    if (showWeeklyBestWizard && wizardStep === 4) fetchFeedbackCandidates();
  }, [showWeeklyBestWizard, wizardStep, fetchFeedbackCandidates]);

  const openWriteChoice = () => {
    setShowWriteChoiceModal(true);
  };

  const openNoticeForm = () => {
    setShowWriteChoiceModal(false);
    setEditingId(null);
    setForm({ title: '', content: '', category: 'general', is_pinned: false });
    setIsModalOpen(true);
  };

  const openWeeklyBestWizard = () => {
    setShowWriteChoiceModal(false);
    setWizardOpenDate(new Date());
    setWizardStep(1);
    setWbForm({ title: '', content: '', lesson_plan_session_id: '', photo_urls: [], feedback_session_id: '' });
    setShowWeeklyBestWizard(true);
  };

  const handleWbPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!supabase || files.length === 0) return;
    const urls: string[] = [];
    for (const file of files) {
      const safeName = file.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9_.-]/g, '_');
      const path = `weekly_best/${Date.now()}_${safeName}`;
      const { error } = await supabase.storage.from(BUCKET_NAME).upload(path, file, { contentType: file.type, upsert: true });
      if (error) {
        toast.error('이미지 업로드 실패');
        return;
      }
      const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(path);
      urls.push(data.publicUrl);
    }
    setWbForm((prev) => ({ ...prev, photo_urls: [...prev.photo_urls, ...urls] }));
    e.target.value = '';
  };

  const saveWeeklyBest = async () => {
    if (!supabase || !wbForm.title.trim()) {
      toast.error('제목을 입력해주세요.');
      return;
    }
    setWbSaving(true);
    try {
      const { error } = await supabase.from('weekly_best').insert([{
        title: wbForm.title,
        content: wbForm.content || null,
        lesson_plan_session_id: wbForm.lesson_plan_session_id || null,
        photo_urls: wbForm.photo_urls,
        feedback_session_id: wbForm.feedback_session_id || null,
      }]);
      if (error) {
        const msg = typeof (error as { message?: string }).message === 'string' ? (error as { message: string }).message : JSON.stringify(error);
        toast.error('저장 실패: ' + msg);
        return;
      }
      toast.success('주간베스트가 등록되었습니다.');
      setShowWeeklyBestWizard(false);
      fetchWeeklyBest();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : (err && typeof err === 'object' && 'message' in err ? String((err as { message: unknown }).message) : '알 수 없는 오류');
      toast.error('저장 실패: ' + msg);
    } finally {
      setWbSaving(false);
    }
  };

  const uploadImages = async (files: File[]): Promise<string[]> => {
    if (!supabase || files.length === 0) return [];
    setUploadingImages(true);
    const urls: string[] = [];
    try {
      for (const file of files) {
        const safeName = file.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9_.-]/g, '_');
        const path = `notices/${Date.now()}_${safeName}`;
        const { error } = await supabase.storage.from(BUCKET_NAME).upload(path, file, { contentType: file.type, upsert: true });
        if (error) throw error;
        const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(path);
        urls.push(data.publicUrl);
      }
    } catch (err) {
      console.error('이미지 업로드 오류:', err);
      toast.error('이미지 업로드에 실패했습니다.');
    } finally {
      setUploadingImages(false);
    }
    return urls;
  };

  const insertImageAtCursor = (urls: string[]) => {
    const el = editorRef.current;
    if (!el) return;
    const placeholder = el.querySelector('[data-image-placeholder]');
    if (!placeholder) return;
    const fragment = document.createDocumentFragment();
    urls.forEach((url, i) => {
      const img = document.createElement('img');
      img.src = url;
      img.alt = '';
      img.className = 'max-w-full h-auto rounded-lg my-2 block';
      fragment.appendChild(img);
      if (i < urls.length - 1) fragment.appendChild(document.createElement('br'));
    });
    placeholder.replaceWith(fragment);
    wrapImagesWithDeleteButton(el);
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    const urls = await uploadImages(files);
    if (urls.length > 0) insertImageAtCursor(urls);
    e.target.value = '';
  };

  const triggerInsertImage = () => {
    const el = editorRef.current;
    if (!el) return;
    el.focus();
    const sel = window.getSelection();
    let range: Range | null = null;
    if (sel && sel.rangeCount > 0) {
      const r = sel.getRangeAt(0);
      if (el.contains(r.commonAncestorContainer)) range = r;
    }
    if (!range) {
      range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
    const placeholder = document.createElement('span');
    placeholder.setAttribute('data-image-placeholder', 'true');
    placeholder.textContent = '\u200b';
    range.insertNode(placeholder);
    range.setStartAfter(placeholder);
    range.setEndAfter(placeholder);
    sel?.removeAllRanges();
    sel?.addRange(range);
    fileInputRef.current?.click();
  };

  const handleSave = async () => {
    const el = editorRef.current;
    const contentHtml = el ? getContentWithoutWrappers(el) : form.content;
    const textOnly = (el?.innerText ?? form.content).trim();
    if (!supabase || !form.title.trim() || !textOnly) return toast.error('제목과 내용을 입력해주세요.');

    try {
      const payload = {
        title: form.title,
        content: contentHtml,
        category: form.category,
        is_pinned: form.is_pinned,
        image_urls: null,
        inline_images: null,
      };
      if (editingId) {
        const { error } = await supabase.from('notices').update(payload).eq('id', editingId);
        if (error) throw error;
        toast.success('수정되었습니다.');
      } else {
        const { error } = await supabase
          .from('notices')
          .insert([{ ...payload, author: '운영진', created_at: new Date().toISOString() }]);
        if (error) throw error;
        toast.success('등록되었습니다.');
      }

      setIsModalOpen(false);
      setEditingId(null);
      setForm({ title: '', content: '', category: 'general', is_pinned: false });
      fetchNotices();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error('저장 실패: ' + msg);
    }
  };

  const openEdit = (notice: Notice, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(notice.id);
    let content = notice.content;
    if ((!content || !content.includes('<')) && notice.inline_images?.length) {
      const lines = (notice.content || '').split(/\r?\n/);
      const parts: string[] = [];
      lines.forEach((line, i) => {
        parts.push(line);
        notice.inline_images!.filter(im => im.after_line === i).forEach(im => parts.push(`<p><img src="${im.url}" alt="" class="max-w-full h-auto rounded-lg my-2 block" /></p>`));
        if (i < lines.length - 1) parts.push('<br>');
      });
      content = parts.join('');
    }
    setForm({
      title: notice.title,
      content,
      category: notice.category,
      is_pinned: notice.is_pinned
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!supabase || !confirm('정말 삭제하시겠습니까?')) return;
    const { error } = await supabase.from('notices').delete().eq('id', id);
    if (error) {
      toast.error('삭제 실패: ' + (error.message || '알 수 없는 오류'));
      return;
    }
    setNotices((prev) => prev.filter((n) => n.id !== id));
    toast.success('삭제되었습니다.');
  };

  const handleDeleteWeeklyBest = async (id: string) => {
    if (!supabase || !confirm('이 주간베스트를 삭제할까요?')) return;
    const { error } = await supabase.from('weekly_best').delete().eq('id', id);
    if (error) {
      toast.error('삭제 실패: ' + (error.message || '알 수 없는 오류'));
      return;
    }
    setWeeklyBestList((prev) => prev.filter((w) => w.id !== id));
    fetchWeeklyBest();
    toast.success('삭제되었습니다.');
  };

  return (
    <div className="min-h-screen bg-[#F9FBFF] pb-[calc(6rem+env(safe-area-inset-bottom,0px))] text-slate-900 w-full font-sans overflow-x-hidden text-left">
      <style>{`
        @import url("https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css");
        * { font-family: "Pretendard Variable", sans-serif !important; letter-spacing: -0.02em; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>

      <header className="sticky top-0 z-40 bg-white/70 backdrop-blur-xl border-b border-slate-200/50 px-4 sm:px-6 pt-[env(safe-area-inset-top,0px)]">
        <div className="max-w-2xl w-full">
          <div className="h-14 sm:h-16 flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <h1 className="text-lg sm:text-xl font-black text-slate-900 truncate">공지사항</h1>
              <div className="bg-indigo-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter shrink-0">Admin</div>
            </div>
            <button
              onClick={refreshAll}
              className={`min-h-[44px] min-w-[44px] p-2 rounded-full hover:bg-slate-100 transition-all flex items-center justify-center touch-manipulation cursor-pointer ${loading || weeklyBestLoading ? 'animate-spin' : ''}`}
            >
              <RefreshCw size={18} className="text-slate-400" />
            </button>
          </div>
          <div className="flex gap-2 pb-3 overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => setMainTab('notice')}
              className={`min-h-[40px] px-4 py-2 rounded-full text-sm font-bold transition-all border shrink-0 touch-manipulation cursor-pointer
                ${mainTab === 'notice' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}
            >
              공지 목록
            </button>
            <button
              type="button"
              onClick={() => setMainTab('weekly_best')}
              className={`min-h-[40px] px-4 py-2 rounded-full text-sm font-bold transition-all border shrink-0 touch-manipulation cursor-pointer
                ${mainTab === 'weekly_best' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}
            >
              주간베스트만
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {mainTab === 'weekly_best' ? (
          <WeeklyBestList
            list={weeklyBestList}
            loading={weeklyBestLoading}
            supabase={supabase}
            onRefresh={fetchWeeklyBest}
            onDelete={handleDeleteWeeklyBest}
          />
        ) : (
          <>
        <div className="flex gap-2 mb-6 sm:mb-8 overflow-x-auto no-scrollbar pb-1">
          {CATEGORIES.map((cat) => (
            <button key={cat.id} type="button" onClick={() => setActiveTab(cat.id)}
              className={`min-h-[44px] px-5 py-2.5 rounded-full text-sm font-bold transition-all border shrink-0 touch-manipulation cursor-pointer
                ${activeTab === cat.id ? 'bg-slate-900 text-white border-slate-900 shadow-lg shadow-slate-200' : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'}`}
            >
              {cat.label}
            </button>
          ))}
        </div>
        
        <div className="space-y-4">
          {loading || weeklyBestLoading ? (
             <div className="py-32 text-center flex flex-col items-center">
                <div className="w-10 h-10 border-4 border-slate-100 border-t-indigo-600 rounded-full animate-spin mb-4" />
                <p className="text-slate-400 font-bold">불러오는 중...</p>
             </div>
          ) : unifiedList
              .filter((item) => item.type === 'weekly_best' || activeTab === 'ALL' || (item.data as Notice).category === activeTab)
              .map((item) => {
                if (item.type === 'weekly_best') {
                  return (
                    <WeeklyBestCardWithState
                      key={`wb-${item.id}`}
                      row={item.data as WeeklyBest}
                      supabase={supabase}
                      onDelete={handleDeleteWeeklyBest}
                      onRefresh={refreshAll}
                    />
                  );
                }
                const notice = item.data as Notice;
                const categoryStyle = CATEGORIES.find((c) => c.id === notice.category) || CATEGORIES[2];
                const isExpanded = expandedId === notice.id;

                return (
                  <div key={`n-${notice.id}`} className={`bg-white rounded-[28px] transition-all duration-300 border overflow-hidden
                      ${isExpanded ? 'border-indigo-200 shadow-xl shadow-indigo-500/5' : 'border-slate-100 hover:border-slate-200 shadow-sm'}
                      ${notice.is_pinned && !isExpanded ? 'bg-rose-50/20 border-rose-100' : ''}
                    `}
                  >
                    <div role="button" tabIndex={0} onClick={() => setExpandedId(isExpanded ? null : notice.id)} onKeyDown={(e) => e.key === 'Enter' && setExpandedId(isExpanded ? null : notice.id)} className="p-6 cursor-pointer">
                      <div className="flex items-center gap-2 mb-3">
                        {notice.is_pinned && <Pin size={14} className="text-rose-500 fill-rose-500" />}
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${categoryStyle.color}`}>{categoryStyle.label}</span>
                        <span className="text-[11px] text-slate-400 font-medium">{new Date(notice.created_at).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-start justify-between gap-4">
                        <h3 className={`text-lg font-black leading-tight flex-1 ${isExpanded ? 'text-indigo-600' : 'text-slate-800'}`}>{notice.title}</h3>
                        <ChevronDown size={20} className={`text-slate-300 transition-transform duration-300 shrink-0 ${isExpanded ? 'rotate-180 text-indigo-500' : ''}`} />
                      </div>
                    </div>

                    <div className={`transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                      <div className="px-6 pb-6 space-y-4">
                        <div className="text-[15px] text-slate-600 font-medium leading-relaxed bg-slate-50 p-6 rounded-[20px] border border-slate-100 max-h-[500px] overflow-y-auto custom-scrollbar break-all [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-lg [&_img]:my-2">
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
                        <div className="flex justify-end gap-2">
                          <button type="button" onClick={(e) => openEdit(notice, e)} className="min-h-[44px] flex items-center gap-1.5 text-slate-500 hover:text-indigo-600 text-xs font-bold px-4 py-2 hover:bg-indigo-50 rounded-full transition-all touch-manipulation cursor-pointer">
                            <Edit3 size={14} /> 수정
                          </button>
                          <button type="button" onClick={(e) => handleDelete(notice.id, e)} className="min-h-[44px] flex items-center gap-1.5 text-slate-500 hover:text-rose-600 text-xs font-bold px-4 py-2 hover:bg-rose-50 rounded-full transition-all touch-manipulation cursor-pointer">
                            <Trash2 size={14} /> 삭제
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
        </div>
          </>
        )}
      </main>

      <button type="button" onClick={() => setShowWriteChoiceModal(true)}
        className="fixed bottom-6 right-4 sm:bottom-10 sm:right-10 w-14 h-14 sm:w-16 sm:h-16 bg-slate-900 text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-90 transition-all z-50 touch-manipulation cursor-pointer"
        style={{ bottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
      >
        <Plus size={28} className="sm:w-8 sm:h-8" />
      </button>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-white w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-t-[32px] sm:rounded-[32px] p-6 sm:p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-start mb-6 sm:mb-8 text-left">
              <div>
                <p className="text-indigo-600 text-[10px] font-black uppercase tracking-widest mb-1">{editingId ? 'Edit' : 'New'} Notice</p>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900">공지 {editingId ? '수정' : '작성'}</h2>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="min-h-[44px] min-w-[44px] p-2 bg-slate-100 rounded-full text-slate-500 flex items-center justify-center touch-manipulation"><X size={20} /></button>
            </div>

            <div className="space-y-6 text-left">
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-400 uppercase ml-1">Category</label>
                <div className="flex gap-2">
                  {CATEGORIES.filter(c => c.id !== 'ALL').map((cat) => (
                    <button key={cat.id} onClick={() => setForm({ ...form, category: cat.id })}
                      className={`flex-1 min-h-[48px] py-3 rounded-2xl text-sm font-bold border transition-all touch-manipulation
                        ${form.category === cat.id ? 'bg-slate-900 text-white border-slate-900 shadow-md' : 'bg-white text-slate-400 border-slate-100'}
                      `}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <input className="w-full min-h-[48px] bg-slate-50 border-none p-4 rounded-2xl outline-none font-bold text-base sm:text-sm text-slate-800 placeholder-slate-300 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 transition-all touch-manipulation"
                  placeholder="제목" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                <div className="bg-slate-50 rounded-2xl border border-slate-100 overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500/20">
                  <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100">
                    <span className="text-[11px] font-black text-slate-500">내용</span>
                    <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleImageSelect} className="hidden" />
                    <button type="button" onClick={triggerInsertImage} disabled={uploadingImages} className="min-h-[36px] px-3 rounded-lg text-xs font-bold text-indigo-600 hover:bg-indigo-50 flex items-center gap-1.5 disabled:opacity-50">
                      {uploadingImages ? <span className="w-4 h-4 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin block" /> : <><ImageIcon size={14} /> 이미지 삽입</>}
                    </button>
                  </div>
                  <div
                    className="min-h-[160px] max-h-[40vh] overflow-y-auto p-4 [&_[data-image-wrap]_img]:max-w-full [&_[data-image-wrap]_img]:h-auto [&_[data-image-wrap]_img]:rounded-lg [&_[data-image-wrap]_img]:block"
                    onClick={(e) => {
                      const btn = (e.target as HTMLElement).closest('[data-remove-image]');
                      if (btn) {
                        e.preventDefault();
                        e.stopPropagation();
                        (btn.closest('[data-image-wrap]') as HTMLElement)?.remove();
                      }
                    }}
                  >
                    <div
                      ref={editorRef}
                      contentEditable
                      suppressContentEditableWarning
                      className="min-h-[160px] font-medium text-base sm:text-sm text-slate-700 leading-relaxed outline-none [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-lg [&_img]:my-2 [&_img]:block"
                      data-placeholder="내용을 입력하세요. 넣을 위치에 커서를 두고 '이미지 삽입'을 누르세요."
                    />
                  </div>
                </div>
                <p className="text-[11px] text-slate-400">커서를 둔 위치에 이미지가 들어갑니다.</p>
              </div>

              <div className={`flex items-center justify-between p-4 rounded-2xl cursor-pointer transition-all border
                  ${form.is_pinned ? 'bg-rose-50 border-rose-100' : 'bg-white border-slate-100'}
                `}
                onClick={() => setForm({ ...form, is_pinned: !form.is_pinned })}
              >
                <div className="flex items-center gap-3 text-left">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${form.is_pinned ? 'bg-rose-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                    <Pin size={16} fill={form.is_pinned ? "currentColor" : "none"} />
                  </div>
                  <span className={`text-sm font-black ${form.is_pinned ? 'text-rose-600' : 'text-slate-600'}`}>상단 고정 (필독)</span>
                </div>
                <div className={`w-10 h-5 rounded-full relative transition-colors ${form.is_pinned ? 'bg-rose-500' : 'bg-slate-200'}`}>
                  <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${form.is_pinned ? 'left-6' : 'left-1'}`} />
                </div>
              </div>

              <button onClick={handleSave} className="w-full min-h-[52px] bg-indigo-600 text-white py-5 rounded-[24px] font-black text-lg hover:bg-indigo-700 shadow-xl shadow-indigo-200 transition-all touch-manipulation">
                {editingId ? '수정 내용 저장' : '공지사항 게시하기'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showWriteChoiceModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" onClick={() => setShowWriteChoiceModal(false)} />
          <div className="relative bg-white w-full max-w-sm rounded-t-[32px] sm:rounded-[32px] p-6 sm:p-8 shadow-2xl">
            <h3 className="text-lg font-black text-slate-900 mb-4">작성할 내용을 선택하세요</h3>
            <div className="space-y-3">
              <button
                type="button"
                onClick={openNoticeForm}
                className="w-full min-h-[52px] px-4 py-3 rounded-2xl border-2 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 text-slate-800 font-bold flex items-center gap-3 transition-all touch-manipulation cursor-pointer"
              >
                <FileText size={22} className="text-indigo-600" />
                일반 공지 올리기
              </button>
              <button
                type="button"
                onClick={openWeeklyBestWizard}
                className="w-full min-h-[52px] px-4 py-3 rounded-2xl border-2 border-slate-200 hover:border-amber-300 hover:bg-amber-50/50 text-slate-800 font-bold flex items-center gap-3 transition-all touch-manipulation cursor-pointer"
              >
                <MessageSquare size={22} className="text-amber-600" />
                주간베스트 올리기
              </button>
            </div>
            <button type="button" onClick={() => setShowWriteChoiceModal(false)} className="mt-4 w-full py-3 text-slate-500 font-bold text-sm cursor-pointer">취소</button>
          </div>
        </div>
      )}

      {showWeeklyBestWizard && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/40 backdrop-blur-md">
          <div className="bg-white w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-t-[32px] sm:rounded-[32px] shadow-2xl flex flex-col">
            <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between z-10">
              <h3 className="text-lg font-black text-slate-900">주간베스트 작성 ({wizardStep}/4)</h3>
              <button type="button" onClick={() => setShowWeeklyBestWizard(false)} className="p-2 rounded-full hover:bg-slate-100"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-6">
              {wizardStep === 1 && (
                <>
                  <p className="text-[11px] text-slate-500">해당 주에 대한 제목과 공지 내용을 입력하세요.</p>
                  <input
                    type="text"
                    placeholder="제목 (필수)"
                    value={wbForm.title}
                    onChange={(e) => setWbForm((p) => ({ ...p, title: e.target.value }))}
                    className="w-full min-h-[48px] px-4 py-3 bg-slate-50 rounded-2xl border-none outline-none font-bold text-slate-800 placeholder-slate-400"
                  />
                  <textarea
                    placeholder="공지 내용 (선택)"
                    value={wbForm.content}
                    onChange={(e) => setWbForm((p) => ({ ...p, content: e.target.value }))}
                    className="w-full min-h-[120px] px-4 py-3 bg-slate-50 rounded-2xl border-none outline-none text-sm text-slate-700 placeholder-slate-400 resize-none"
                  />
                  <button type="button" onClick={() => setWizardStep(2)} className="w-full min-h-[48px] bg-slate-900 text-white rounded-2xl font-bold">다음: 베스트 지도안 선택</button>
                </>
              )}
              {wizardStep === 2 && (
                <>
                  <p className="text-[11px] text-slate-500">작성 시점 기준 -7일 ~ -1일 세션만 후보에 표시됩니다.</p>
                  <select value={wbCoachFilter} onChange={(e) => setWbCoachFilter(e.target.value)} className="w-full min-h-[44px] px-4 bg-slate-50 rounded-xl font-bold text-slate-800 border-none outline-none">
                    <option value="all">전체 선생님</option>
                    {coaches.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  {wbStepLoading ? (
                    <div className="py-8 text-center text-slate-400 font-bold">불러오는 중...</div>
                  ) : (
                    <div className="space-y-2 max-h-[280px] overflow-y-auto">
                      <button
                        type="button"
                        onClick={() => setWbForm((p) => ({ ...p, lesson_plan_session_id: '' }))}
                        className={`w-full p-4 rounded-xl text-left border-2 transition-all ${!wbForm.lesson_plan_session_id ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 hover:border-slate-300'}`}
                      >
                        <p className="font-bold text-slate-600">없음</p>
                        <p className="text-[11px] text-slate-400">선택하지 않고 넘어갑니다</p>
                      </button>
                      {lessonSessions.map((s) => {
                        const raw = s.lesson_plans;
                        const lp = Array.isArray(raw) ? raw[0] : raw;
                        const content = lp && typeof (lp as { content?: string }).content === 'string' ? (lp as { content: string }).content : '';
                        const selected = wbForm.lesson_plan_session_id === s.id;
                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => setWbForm((p) => ({ ...p, lesson_plan_session_id: s.id }))}
                            className={`w-full p-4 rounded-xl text-left border-2 transition-all ${selected ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 hover:border-slate-300'}`}
                          >
                            <p className="font-bold text-slate-800 truncate">{s.title}</p>
                            <p className="text-[11px] text-slate-500 mt-1">{new Date(s.start_at).toLocaleDateString('ko-KR')} · {(s.users as { name?: string })?.name ?? ''}</p>
                            {content && <p className="text-xs text-slate-600 mt-2 line-clamp-2">{content.replace(/\n/g, ' ')}</p>}
                          </button>
                        );
                      })}
                      {lessonSessions.length === 0 && <p className="text-slate-400 text-sm py-2">해당 기간에 수업안이 없습니다.</p>}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setWizardStep(1)} className="flex-1 min-h-[48px] bg-slate-100 text-slate-700 rounded-2xl font-bold">이전</button>
                    <button type="button" onClick={() => setWizardStep(3)} className="flex-1 min-h-[48px] bg-slate-900 text-white rounded-2xl font-bold">다음: 베스트 포토</button>
                  </div>
                </>
              )}
              {wizardStep === 3 && (
                <>
                  <p className="text-[11px] text-slate-500">사진을 업로드하세요. (없으면 없음으로 넘어갈 수 있습니다)</p>
                  <input ref={wbPhotoInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleWbPhotoUpload} />
                  <button type="button" onClick={() => wbPhotoInputRef.current?.click()} className="w-full min-h-[120px] border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-2 text-slate-500 hover:border-indigo-300 hover:bg-indigo-50/30 transition-all">
                    <Camera size={32} />
                    <span className="text-sm font-bold">사진 선택</span>
                  </button>
                  {wbForm.photo_urls.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {wbForm.photo_urls.map((url, i) => (
                        <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border border-slate-200">
                          <img src={url} alt="" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => setWbForm((p) => ({ ...p, photo_urls: p.photo_urls.filter((_, j) => j !== i) }))}
                            className="absolute top-0 right-0 w-6 h-6 bg-red-500 text-white rounded-bl text-xs font-bold flex items-center justify-center"
                          >×</button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setWizardStep(2)} className="flex-1 min-h-[48px] bg-slate-100 text-slate-700 rounded-2xl font-bold">이전</button>
                    <button type="button" onClick={() => setWizardStep(4)} className="flex-1 min-h-[48px] bg-slate-900 text-white rounded-2xl font-bold">다음: 베스트 피드백 선택</button>
                  </div>
                </>
              )}
              {wizardStep === 4 && (
                <>
                  <p className="text-[11px] text-slate-500">작성 시점 기준 -7일 ~ -1일 세션 중 피드백이 있는 것만 표시됩니다.</p>
                  <select value={wbCoachFilter} onChange={(e) => setWbCoachFilter(e.target.value)} className="w-full min-h-[44px] px-4 bg-slate-50 rounded-xl font-bold text-slate-800 border-none outline-none">
                    <option value="all">전체 선생님</option>
                    {coaches.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  {wbStepLoading ? (
                    <div className="py-8 text-center text-slate-400 font-bold">불러오는 중...</div>
                  ) : (
                    <div className="space-y-2 max-h-[280px] overflow-y-auto">
                      <button
                        type="button"
                        onClick={() => setWbForm((p) => ({ ...p, feedback_session_id: '' }))}
                        className={`w-full p-4 rounded-xl text-left border-2 transition-all ${!wbForm.feedback_session_id ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 hover:border-slate-300'}`}
                      >
                        <p className="font-bold text-slate-600">없음</p>
                        <p className="text-[11px] text-slate-400">선택하지 않고 넘어갑니다</p>
                      </button>
                      {feedbackSessions.map((s) => {
                        const selected = wbForm.feedback_session_id === s.id;
                        const text = s.students_text ?? (s.feedback_fields ? formatFeedbackFields(s.feedback_fields) : '');
                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => setWbForm((p) => ({ ...p, feedback_session_id: s.id }))}
                            className={`w-full p-4 rounded-xl text-left border-2 transition-all ${selected ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 hover:border-slate-300'}`}
                          >
                            <p className="font-bold text-slate-800 truncate">{s.title}</p>
                            <p className="text-[11px] text-slate-500 mt-1">{new Date(s.start_at).toLocaleDateString('ko-KR')} · {(s.users as { name?: string })?.name ?? ''}</p>
                            {text && <p className="text-xs text-slate-600 mt-2 line-clamp-2">{text.replace(/\n/g, ' ')}</p>}
                          </button>
                        );
                      })}
                      {feedbackSessions.length === 0 && <p className="text-slate-400 text-sm py-2">해당 기간에 피드백이 없습니다.</p>}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setWizardStep(3)} className="flex-1 min-h-[48px] bg-slate-100 text-slate-700 rounded-2xl font-bold">이전</button>
                    <button type="button" onClick={saveWeeklyBest} disabled={wbSaving} className="flex-1 min-h-[48px] bg-indigo-600 text-white rounded-2xl font-bold disabled:opacity-50">
                      {wbSaving ? '저장 중...' : '주간베스트 게시하기'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}