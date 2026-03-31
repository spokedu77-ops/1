'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { X, Maximize2 } from 'lucide-react';

interface ReportSession {
  start_at: string;
  photo_url?: string[] | string;
  users?: { name?: string } | null;
  feedback_fields?: {
    main_activity?: string;
    strengths?: string;
    improvements?: string;
    next_goals?: string;
    condition_notes?: string;
  } | null;
  students_text?: string;
  [key: string]: unknown;
}

function renderSmartText(content: string) {
  const raw = String(content ?? '').replace(/\r\n/g, '\n').trim();
  if (!raw) return null;

  const lines = raw.split('\n').map((l) => l.trim()).filter(Boolean);
  const bulletLike = lines.filter((l) => /^[-*•]\s+/.test(l) || /^\d+[.)]\s+/.test(l));

  // If the author wrote bullets/numbering, keep them as a list.
  if (bulletLike.length >= 2 && bulletLike.length >= Math.max(2, Math.floor(lines.length * 0.6))) {
    const items = lines.map((l) => l.replace(/^[-*•]\s+/, '').replace(/^\d+[.)]\s+/, '').trim()).filter(Boolean);
    return (
      <ul className="list-disc pl-5 space-y-2">
        {items.map((it, idx) => (
          <li key={idx} className="text-[15px] leading-[1.9] text-slate-700 font-medium break-keep">
            {it}
          </li>
        ))}
      </ul>
    );
  }

  // Otherwise preserve paragraphs.
  const paragraphs = raw.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  return (
    <div className="space-y-3">
      {paragraphs.map((p, idx) => (
        <p key={idx} className="text-[15px] leading-[1.9] text-slate-700 font-medium break-keep whitespace-pre-wrap">
          {p}
        </p>
      ))}
    </div>
  );
}

function FeedbackCard({
  emoji,
  label,
  content,
  accentBorderClass,
  badgeClass,
}: {
  emoji: string;
  label: string;
  content: string;
  accentBorderClass: string;
  badgeClass: string;
}) {
  if (!content?.trim()) return null;
  return (
    <div
      className={`bg-white rounded-[28px] border border-slate-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden ${accentBorderClass}`}
    >
      <div className="p-7">
        <div className="flex items-center gap-2 mb-4">
          <span className={`text-[11px] font-black px-2 py-1 rounded-full ${badgeClass}`}>
            {emoji} {label}
          </span>
        </div>
        {renderSmartText(content)}
      </div>
    </div>
  );
}

export default function PremiumParentReport() {
  const params = useParams();
  const [session, setSession] = useState<ReportSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<'not_found' | 'not_available' | 'network' | null>(null);
  
  // 이미지 확대를 위한 상태
  const [selectedImg, setSelectedImg] = useState<string | null>(null);

  useEffect(() => {
    if (!params?.id) {
      setLoading(false);
      setLoadError('not_found');
      return;
    }
    const id = String(params.id);
    setLoadError(null);

    const fetchSession = async () => {
      try {
        const res = await fetch(`/api/public/session-report/${encodeURIComponent(id)}`, {
          cache: 'no-store',
        });
        const payload = (await res.json().catch(() => ({}))) as {
          error?: string;
          session?: ReportSession;
        };

        if (!res.ok) {
          setSession(null);
          if (res.status === 404 && payload.error === 'not_available') {
            setLoadError('not_available');
          } else if (res.status === 404) {
            setLoadError('not_found');
          } else {
            setLoadError('network');
          }
          return;
        }

        if (payload.session) setSession(payload.session as ReportSession);
        else setLoadError('not_found');
      } catch {
        setSession(null);
        setLoadError('network');
      } finally {
        setLoading(false);
      }
    };
    fetchSession();
  }, [params?.id]);

  useEffect(() => {
    if (!selectedImg) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedImg(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedImg]);

  if (loading) return <div className="min-h-screen flex items-center justify-center font-black text-slate-300 animate-pulse uppercase tracking-widest">SPOKEDU REPORT LOADING...</div>;
  if (!session) {
    const msg =
      loadError === 'not_available'
        ? '아직 공개되지 않은 리포트입니다.\n선생님 작성 완료 이후 또는 검수 완료 후 다시 링크를 확인해 주세요.'
        : loadError === 'network'
          ? '리포트를 불러오지 못했습니다.\n잠시 후 다시 시도해 주세요.'
          : '리포트를 찾을 수 없습니다.\n링크가 올바른지 확인해 주세요.';
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA] px-6">
        <p className="text-center text-slate-500 font-bold text-sm leading-relaxed whitespace-pre-line">{msg}</p>
      </div>
    );
  }

  const feedback = session.feedback_fields ?? null;
  const hasAnyFeedback = [
    feedback?.main_activity,
    feedback?.strengths,
    feedback?.improvements,
    feedback?.next_goals,
    feedback?.condition_notes,
  ].some((v) => String(v ?? '').trim().length > 0);

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-slate-900 pb-20 selection:bg-blue-100">
      <style>{`
        @import url("https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css");
        * { font-family: "Pretendard Variable", sans-serif !important; letter-spacing: -0.04em; }
        .glass-card { background: rgba(255, 255, 255, 0.8); backdrop-filter: blur(12px); }
        .magazine-shadow { box-shadow: 0 30px 60px -12px rgba(0, 0, 0, 0.08); }
        .img-zoom { transition: transform 0.7s cubic-bezier(0.4, 0, 0.2, 1); }
        .img-container:hover .img-zoom { transform: scale(1.05); }
        .no-scroll { overflow: hidden; }
      `}</style>

      {/* 이미지 풀스크린 모달 (모바일 확대 대응) */}
      {selectedImg && (
        <div 
          className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-300"
          onClick={() => setSelectedImg(null)}
          role="dialog"
          aria-modal="true"
          aria-label="수업 사진 확대"
        >
          <button className="absolute top-6 right-6 text-white/50 hover:text-white transition-colors cursor-pointer">
            <X size={32} />
          </button>
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src={selectedImg} 
              className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl animate-in zoom-in-95 duration-300" 
              alt="수업 사진 확대"
            />
          </>
          <p className="absolute bottom-10 text-white/40 text-[11px] font-bold tracking-widest uppercase">Tap to close</p>
        </div>
      )}

      <nav className="sticky top-0 z-50 glass-card border-b border-slate-100 px-6 py-4 flex justify-between items-center">
        <a href="https://www.instagram.com/spokedu_kids" target="_blank" rel="noreferrer" className="cursor-pointer transition-opacity hover:opacity-70">
          <h1 className="text-lg font-black italic text-blue-900 tracking-tighter uppercase">SPOKEDU</h1>
        </a>
        <div className="text-[10px] font-black text-slate-400 border border-slate-200 px-2 py-1 rounded tracking-widest">GROWTH REPORT</div>
      </nav>

      <main className="max-w-md mx-auto px-6 pt-10 space-y-12">
        <header className="space-y-4 text-left">
          <div className="flex items-center gap-2">
            <span className="w-8 h-[1px] bg-blue-600"></span>
            <span className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em]">Daily Archive</span>
          </div>
          <h2 className="text-4xl font-black leading-[1.1] tracking-tighter text-left">
            오늘 우리 아이는<br/>
            <span className="text-blue-600 italic font-bold">한 뼘 더</span> 자랐습니다.
          </h2>
          
          <div className="pt-8 flex justify-between items-center border-t border-slate-100">
            <div className="flex items-center gap-4 text-left">
              <div className="w-12 h-12 rounded-full bg-[#002D72] flex items-center justify-center text-white shrink-0 shadow-lg shadow-blue-100 font-serif italic text-xl">S</div>
              <div className="flex flex-col">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1.5 font-mono">Spokedu Lead</p>
                <span className="text-[16px] font-black text-slate-900 tracking-tight">{session.users?.name || '담당'} 선생님</span>
              </div>
            </div>
            
            <div className="text-right flex flex-col items-end">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Class Date</p>
              <div className="bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
                <p className="text-[10px] font-black text-slate-500 font-mono">
                  {new Date(session.start_at).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\. /g, '.').slice(0, -1)}
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* 사진 섹션: 클릭 시 모달 열림 */}
        {(() => {
          let validPhotos: string[] = [];
          if (Array.isArray(session.photo_url)) {
            validPhotos = session.photo_url.filter((url: string) => typeof url === 'string' && url.startsWith('http'));
          } else if (typeof session.photo_url === 'string') {
            validPhotos = session.photo_url.split(',').filter((url: string) => url && url.trim() !== "" && url.startsWith('http'));
          }
          if (validPhotos.length === 0) return null;

          return (
            <section className="grid gap-6">
              <div className="flex items-end justify-between">
                <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">사진</p>
                <p className="text-[11px] font-bold text-slate-400">{validPhotos.length}장</p>
              </div>
              {validPhotos.map((url: string, i: number) => (
                <div 
                  key={i} 
                  className="img-container relative rounded-[24px] overflow-hidden bg-slate-100 magazine-shadow cursor-pointer group"
                  onClick={() => setSelectedImg(url)}
                >
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} className="w-full aspect-[4/5] object-cover img-zoom" alt="수업 현장" referrerPolicy="no-referrer" />
                  </>
                  <div className="absolute top-3 left-3 bg-black/40 text-white text-[10px] font-black px-2 py-1 rounded-full backdrop-blur-sm">
                    {i + 1}/{validPhotos.length}
                  </div>
                  <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="bg-white/20 backdrop-blur-md p-3 rounded-full text-white">
                      <Maximize2 size={24} />
                    </div>
                  </div>
                </div>
              ))}
            </section>
          );
        })()}

        {hasAnyFeedback ? (
          <section className="grid gap-4">
            <FeedbackCard
              emoji="✅"
              label="오늘 수업의 주요 활동"
              content={String(feedback?.main_activity ?? '')}
              accentBorderClass="border-l-4 border-l-blue-500"
              badgeClass="bg-blue-50 text-blue-700"
            />
            <FeedbackCard
              emoji="✅"
              label="강점 및 긍정적인 부분"
              content={String(feedback?.strengths ?? '')}
              accentBorderClass="border-l-4 border-l-amber-500"
              badgeClass="bg-amber-50 text-amber-700"
            />
            <FeedbackCard
              emoji="✅"
              label="개선이 필요한 부분 및 피드백"
              content={String(feedback?.improvements ?? '')}
              accentBorderClass="border-l-4 border-l-indigo-500"
              badgeClass="bg-indigo-50 text-indigo-700"
            />
            <FeedbackCard
              emoji="✅"
              label="다음 수업 목표 및 계획"
              content={String(feedback?.next_goals ?? '')}
              accentBorderClass="border-l-4 border-l-emerald-500"
              badgeClass="bg-emerald-50 text-emerald-700"
            />
            <FeedbackCard
              emoji="✅"
              label="특이사항 및 시작/종료 시간"
              content={String(feedback?.condition_notes ?? '')}
              accentBorderClass="border-l-4 border-l-slate-300"
              badgeClass="bg-slate-50 text-slate-700"
            />
          </section>
        ) : (
          <section className="relative">
            <div className="absolute -top-6 -left-2 text-6xl font-serif text-blue-100 opacity-20 italic text-left">“</div>
            <div className="bg-white magazine-shadow rounded-[40px] p-10 relative z-10 border border-slate-50 shadow-blue-900/5 text-left">
              <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-6">Activity Note</p>
              <div className="text-[16px] leading-[1.9] text-slate-700 font-medium whitespace-pre-wrap break-keep">
                {String(session.students_text ?? '')}
              </div>
            </div>
            <div className="absolute -bottom-10 -right-2 text-6xl font-serif text-blue-100 opacity-20 italic">”</div>
          </section>
        )}

        <footer className="pt-10 pb-20 text-center space-y-6">
          <div className="flex justify-center gap-1">
            {[1, 2, 3].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full bg-blue-200"></div>)}
          </div>
          <p className="text-[11px] leading-relaxed text-slate-400 font-bold px-10 break-keep">
            SPOKEDU는 단순한 체육 수업을 넘어,<br/>
            아이들의 신체적 성장과 정서적 교감을 연구합니다.
          </p>
          <div className="pt-8">
            <p className="text-[9px] font-black text-slate-300 tracking-[0.3em] uppercase">© Spokedu Education Group</p>
          </div>
        </footer>
      </main>
    </div>
  );
}