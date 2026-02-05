'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { X, Maximize2 } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/app/lib/supabase/browser';

interface ReportSession {
  start_at: string;
  photo_url?: string[] | string;
  users?: { name?: string } | null;
  [key: string]: unknown;
}

export default function PremiumParentReport() {
  const params = useParams();
  const [supabase] = useState(() => (typeof window !== 'undefined' ? getSupabaseBrowserClient() : null));
  const [session, setSession] = useState<ReportSession | null>(null);
  const [loading, setLoading] = useState(true);
  
  // 이미지 확대를 위한 상태
  const [selectedImg, setSelectedImg] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) return;
    if (!params?.id) {
      setLoading(false);
      return;
    }
    const fetchSession = async () => {
      const { data } = await supabase
        .from('sessions')
        .select('*, users(name)')
        .eq('id', params.id)
        .single();
      if (data) setSession(data as ReportSession);
      setLoading(false);
    };
    fetchSession();
  }, [supabase, params?.id]);

  if (loading) return <div className="min-h-screen flex items-center justify-center font-black text-slate-300 animate-pulse uppercase tracking-widest">SPOKEDU REPORT LOADING...</div>;
  if (!session) return <div className="min-h-screen flex items-center justify-center font-black text-slate-300">리포트를 찾을 수 없습니다.</div>;

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
        <div className="text-[10px] font-black text-slate-400 border border-slate-200 px-2 py-1 rounded tracking-widest">GROWTH ARCHIVE</div>
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
              {validPhotos.map((url: string, i: number) => (
                <div 
                  key={i} 
                  className="img-container relative rounded-[40px] overflow-hidden bg-slate-100 magazine-shadow cursor-pointer group"
                  onClick={() => setSelectedImg(url)}
                >
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} className="w-full aspect-[4/5] object-cover img-zoom" alt="수업 현장" referrerPolicy="no-referrer" />
                  </>
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

        <section className="relative">
          <div className="absolute -top-6 -left-2 text-6xl font-serif text-blue-100 opacity-20 italic text-left">“</div>
          <div className="bg-white magazine-shadow rounded-[40px] p-10 relative z-10 border border-slate-50 shadow-blue-900/5 text-left">
            <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-6">Activity Note</p>
            <div className="text-[16px] leading-[1.9] text-slate-700 font-medium whitespace-pre-wrap break-keep">
              {session.students_text}
            </div>
          </div>
          <div className="absolute -bottom-10 -right-2 text-6xl font-serif text-blue-100 opacity-20 italic">”</div>
        </section>

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