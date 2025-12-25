'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useParams } from 'next/navigation';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function PremiumParentReport() {
  const params = useParams();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSession = async () => {
      const { data } = await supabase
        .from('sessions')
        .select('*, users(name)')
        .eq('id', params.id)
        .single();
      setSession(data);
      setLoading(false);
    };
    fetchSession();
  }, [params.id]);

  if (loading) return <div className="min-h-screen flex items-center justify-center font-black text-slate-300 animate-pulse uppercase tracking-tighter">Report Loading...</div>;
  if (!session) return <div className="min-h-screen flex items-center justify-center font-black text-slate-300">리포트를 찾을 수 없습니다.</div>;

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-slate-900 pb-20">
      <style>{`
        @import url("https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css");
        * { font-family: "Pretendard Variable", sans-serif !important; letter-spacing: -0.04em; }
        .glass-card { background: rgba(255, 255, 255, 0.7); backdrop-filter: blur(10px); }
        .magazine-shadow { box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.08); }
      `}</style>

      {/* 상단 브랜딩 바 */}
      <nav className="sticky top-0 z-50 glass-card border-b border-slate-100 px-6 py-4 flex justify-between items-center">
        <h1 className="text-lg font-black italic text-blue-900 tracking-tighter">SPOKEDU</h1>
        <div className="text-[10px] font-black text-slate-400 border border-slate-200 px-2 py-1 rounded">GROWTH ARCHIVE</div>
      </nav>

      <main className="max-w-md mx-auto px-6 pt-10 space-y-12">
        {/* 인트로 섹션: 감성 매거진 느낌 */}
        <header className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="w-8 h-[1px] bg-blue-600"></span>
            <span className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em]">Daily Archive</span>
          </div>
          <h2 className="text-4xl font-black leading-[1.1] tracking-tighter">
            오늘 우리 아이는<br/>
            <span className="text-blue-600">한 뼘 더</span> 자랐습니다.
          </h2>
          <div className="pt-8 flex justify-between items-center border-t border-slate-100">
    <div className="flex items-center gap-4">
      {/* 짤리지 않는 심플한 S 이니셜 서클 */}
      <div className="w-12 h-12 rounded-full bg-[#002D72] flex items-center justify-center text-white shrink-0 shadow-lg shadow-blue-100">
        <span className="text-xl font-black italic tracking-tighter">S</span>
      </div>
      
      <div className="flex flex-col">
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1.5 font-mono">Spokedu Lead</p>
        <div className="flex items-center gap-2">
          <span className="text-[16px] font-black text-slate-900 tracking-tight">{session.users?.name || '담당'} 선생님</span>
        </div>
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

       {/* 사진 갤러리: 실제 유효한 URL 배열이 1개 이상 있을 때만 섹션 자체를 렌더링 */}
{(() => {
  const validPhotos = session.photo_url
    ?.split(',')
    .filter((url: string) => url && url.trim() !== "" && url.startsWith('http'));
    
  if (!validPhotos || validPhotos.length === 0) return null;

  return (
    <section className="space-y-6">
      {validPhotos.map((url: string, i: number) => (
        <div key={i} className="magazine-card rounded-[40px] overflow-hidden bg-slate-100 group">
          <img 
            src={url} 
            className="w-full aspect-[4/5] object-cover img-zoom" 
            alt="" 
          />
        </div>
      ))}
    </section>
  );
})()}

        {/* 피드백 영역: 아날로그 감성 타이포그래피 */}
        <section className="relative">
          <div className="absolute -top-6 -left-2 text-6xl font-serif text-blue-50 opacity-10">“</div>
          <div className="bg-white magazine-shadow rounded-[40px] p-10 relative z-10 border border-slate-50">
            <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-6">Activity Note</p>
            <div className="text-[16px] leading-[1.9] text-slate-700 font-medium whitespace-pre-wrap break-keep">
              {session.students_text}
            </div>
          </div>
          <div className="absolute -bottom-10 -right-2 text-6xl font-serif text-blue-50 opacity-10">”</div>
        </section>

        {/* 푸터 및 브랜드 메시지 */}
        <footer className="pt-10 pb-20 text-center space-y-6">
          <div className="flex justify-center gap-1">
            {[1, 2, 3].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full bg-blue-100"></div>)}
          </div>
          <p className="text-[11px] leading-relaxed text-slate-400 font-bold px-10">
            스포키듀는 단순한 체육 수업을 넘어,<br/>
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