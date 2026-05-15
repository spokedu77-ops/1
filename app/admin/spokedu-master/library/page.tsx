'use client';

import { useEffect, useState } from 'react';
import { BookOpen, Play, Search, X } from 'lucide-react';
import Link from 'next/link';

type Program = {
  id: number;
  title: string;
  video_url: string | null;
  function_type: string;
  function_types?: string[];
  main_theme: string;
  group_size: string;
  equipment: string | null;
  activity_method: string | null;
  activity_tip: string | null;
};

function ProgramCard({ program }: { program: Program }) {
  const fnTypes = Array.isArray(program.function_types) && program.function_types.length > 0
    ? program.function_types
    : [program.function_type];

  return (
    <div className="relative rounded-[14px] p-4" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br)' }}>
      <div className="mb-2 flex flex-wrap gap-1">
        {fnTypes.map((ft) => (
          <span key={ft} className="rounded-full px-2 py-0.5 text-[10px] font-black" style={{ background: 'rgba(99,102,241,0.14)', color: '#a5b4fc' }}>{ft}</span>
        ))}
        <span className="rounded-full px-2 py-0.5 text-[10px] font-black" style={{ background: 'var(--spm-s3)', color: 'var(--spm-t3)' }}>{program.main_theme}</span>
        <span className="rounded-full px-2 py-0.5 text-[10px] font-black" style={{ background: 'var(--spm-s3)', color: 'var(--spm-t3)' }}>{program.group_size}</span>
      </div>
      <h2 className="text-[14px] font-bold leading-tight" style={{ color: 'var(--spm-t)' }}>{program.title}</h2>
      {program.equipment ? (
        <p className="mt-1.5 text-[11px] font-medium" style={{ color: 'var(--spm-t3)' }}>교구: {program.equipment.split('\n').slice(0, 2).join(' · ')}</p>
      ) : null}
      {program.video_url ? (
        <a
          href={program.video_url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 flex h-8 items-center gap-1.5 rounded-[9px] px-3 text-[12px] font-black text-white"
          style={{ background: 'var(--spm-acc)', display: 'inline-flex' }}
        >
          <Play size={12} fill="#fff" />
          영상 보기
        </a>
      ) : null}
    </div>
  );
}

export default function AdminSpokeduMasterLibraryPage() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/spokedu-pro/programs?limit=200', { credentials: 'include' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as { data?: Program[] };
        setPrograms(json.data ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : '불러오기 실패');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const filtered = query.trim()
    ? programs.filter((p) =>
        [p.title, p.function_type, p.main_theme, p.group_size, p.equipment ?? '']
          .join(' ')
          .toLowerCase()
          .includes(query.trim().toLowerCase())
      )
    : programs;

  return (
    <div className="h-full overflow-y-auto pb-7" style={{ background: 'var(--spm-bg)' }}>
      <header className="px-[22px] pb-5 pt-[22px] sm:px-8 lg:px-10">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--spm-t3)' }}>curriculum library</p>
            <h1 className="mt-1 text-[32px] font-black md:text-[42px]" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)', letterSpacing: 0 }}>라이브러리</h1>
          </div>
          <span className="pb-1 text-[12px] font-bold" style={{ color: 'var(--spm-t2)' }}>{programs.length}개</span>
        </div>
        <div className="mt-5 flex items-center gap-2 rounded-[12px] px-3" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)', height: 44 }}>
          <Search size={17} color="var(--spm-t3)" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="수업명, 분류, 교구 검색"
            className="min-w-0 flex-1 bg-transparent text-[13px] font-semibold outline-none"
            style={{ color: 'var(--spm-t)' }}
          />
          {query ? (
            <button type="button" onClick={() => setQuery('')}>
              <X size={16} color="var(--spm-t3)" />
            </button>
          ) : null}
        </div>
        <div className="mt-3 flex items-center justify-between">
          <p className="text-[12px] font-medium" style={{ color: 'var(--spm-t3)' }}>
            실제 커리큘럼 데이터 · {filtered.length}개 표시
          </p>
          <Link
            href="/admin/curriculum"
            className="rounded-full px-3 py-1 text-[11px] font-black"
            style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)', color: 'var(--spm-t2)' }}
          >
            커리큘럼 편집 →
          </Link>
        </div>
      </header>

      <div className="px-[22px] sm:px-8 lg:px-10">
        {loading ? (
          <div className="flex items-center gap-3 py-12 text-slate-400">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-600 border-t-cyan-400" />
            <span className="text-[14px] font-bold">커리큘럼 불러오는 중...</span>
          </div>
        ) : error ? (
          <div className="rounded-[14px] p-5" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)' }}>
            <div className="flex items-center gap-2">
              <BookOpen size={17} color="#f87171" />
              <p className="text-[14px] font-bold text-red-400">불러오기 실패: {error}</p>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-[14px] p-5 text-center" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
            <p className="text-[14px] font-bold" style={{ color: 'var(--spm-t)' }}>
              {query ? '검색 결과가 없습니다.' : '등록된 커리큘럼이 없습니다.'}
            </p>
          </div>
        ) : (
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((program) => (
              <ProgramCard key={program.id} program={program} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
