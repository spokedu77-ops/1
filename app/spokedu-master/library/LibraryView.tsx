'use client';

import Link from 'next/link';
import { Lock, Search, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { PROGRAMS } from '../lib/data';
import { useIsPro } from '../store';

const CATEGORIES = ['전체', '민첩성', '반응속도', '협응력', '놀이체육', '체력'];
const GRADES = ['전학년', '유치부', '초등 저', '초등 고', '중고등'];

function ThumbGrid({ colors, size = 72 }: { colors: [string, string, string, string]; size?: number }) {
  return (
    <div
      className="grid shrink-0 grid-cols-2 grid-rows-2 gap-0.5 overflow-hidden rounded-[12px]"
      style={{ width: size, height: size }}
      aria-hidden
    >
      {colors.map((color) => (
        <span key={color} style={{ background: color }} />
      ))}
    </div>
  );
}

function Chip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-8 shrink-0 rounded-full px-3 text-[12px] font-bold"
      style={{
        background: active ? 'var(--spm-acc)' : 'var(--spm-s2)',
        color: active ? '#fff' : 'var(--spm-t2)',
        border: active ? '1px solid transparent' : '1px solid var(--spm-br2)',
      }}
    >
      {label}
    </button>
  );
}

function PosterCard({ program, rank, locked }: { program: (typeof PROGRAMS)[number]; rank: number; locked: boolean }) {
  return (
    <Link
      href={locked ? '/spokedu-master/profile' : `/spokedu-master/library/${program.id}`}
      className="relative h-[186px] w-[130px] shrink-0 overflow-hidden rounded-[14px] active:scale-[0.97]"
      style={{ background: `linear-gradient(135deg, ${program.colors[0]}, ${program.colors[1]}, ${program.colors[2]})` }}
    >
      <span
        className="absolute bottom-[-13px] left-[-4px] text-[52px] font-bold leading-none tracking-[-0.08em]"
        style={{
          fontFamily: 'var(--spm-font-display)',
          color: 'rgba(13,13,20,0.74)',
          WebkitTextStroke: '1px rgba(255,255,255,0.18)',
        }}
      >
        {rank}
      </span>
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/78 to-transparent p-3 pl-8">
        <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-white/45">{program.category}</p>
        <p className="mt-1 line-clamp-2 text-[13px] font-bold leading-tight tracking-[-0.02em] text-white">{program.title}</p>
      </div>
      {locked ? (
        <div className="absolute inset-0 grid place-items-center bg-black/55 backdrop-blur-[2px]">
          <span className="grid h-9 w-9 place-items-center rounded-full" style={{ background: 'rgba(245,158,11,0.14)' }}>
            <Lock size={16} color="var(--spm-amb)" />
          </span>
        </div>
      ) : null}
    </Link>
  );
}

function ProgramListItem({ program, locked }: { program: (typeof PROGRAMS)[number]; locked: boolean }) {
  return (
    <Link
      href={locked ? '/spokedu-master/profile' : `/spokedu-master/library/${program.id}`}
      className="relative flex gap-3 rounded-[14px] p-3 active:scale-[0.99]"
      style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br)' }}
    >
      <ThumbGrid colors={program.colors} />
      <div className="min-w-0 flex-1 py-0.5">
        <div className="mb-1.5 flex flex-wrap gap-1">
          {program.isNew ? (
            <span className="rounded-full px-2 py-0.5 text-[9px] font-black" style={{ background: 'rgba(16,185,129,0.12)', color: 'var(--spm-grn)' }}>
              NEW
            </span>
          ) : null}
          {program.isHot ? (
            <span className="rounded-full px-2 py-0.5 text-[9px] font-black" style={{ background: 'rgba(245,158,11,0.12)', color: 'var(--spm-amb)' }}>
              HOT
            </span>
          ) : null}
          {program.isPro ? (
            <span className="rounded-full px-2 py-0.5 text-[9px] font-black" style={{ background: 'rgba(99,102,241,0.14)', color: '#a5b4fc' }}>
              PRO
            </span>
          ) : null}
        </div>
        <h2 className="truncate text-[14px] font-bold tracking-[-0.02em]" style={{ color: 'var(--spm-t)' }}>
          {program.title}
        </h2>
        <p className="mt-1 text-[11px] font-medium" style={{ color: 'var(--spm-t3)' }}>
          {program.grade} / {program.duration}분 / {program.space}
        </p>
        <p className="mt-2 line-clamp-1 text-[11px] font-medium" style={{ color: 'var(--spm-t2)' }}>
          {program.tags.join(' · ')}
        </p>
      </div>
      {locked ? (
        <div className="absolute inset-0 flex items-center justify-end rounded-[14px] bg-black/48 pr-5 backdrop-blur-[2px]">
          <span className="rounded-full px-3 py-1 text-[10px] font-black" style={{ background: 'rgba(245,158,11,0.14)', color: 'var(--spm-amb)' }}>
            PRO 잠금
          </span>
        </div>
      ) : null}
    </Link>
  );
}

function SearchOverlay({
  query,
  setQuery,
  onClose,
}: {
  query: string;
  setQuery: (value: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[80] flex justify-center bg-black">
      <div className="min-h-dvh w-full max-w-[390px] px-[22px] pt-[22px]" style={{ background: 'var(--spm-bg)' }}>
        <div className="flex items-center gap-2">
          <label className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" color="var(--spm-t3)" />
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="수업안, 태그, 대상 검색"
              className="h-11 w-full rounded-[12px] border bg-transparent pl-9 pr-3 text-[14px] font-semibold outline-none"
              style={{ borderColor: 'var(--spm-br2)', color: 'var(--spm-t)', background: 'var(--spm-s2)' }}
            />
          </label>
          <button
            type="button"
            onClick={onClose}
            className="grid h-11 w-11 place-items-center rounded-[12px]"
            style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}
            aria-label="검색 닫기"
          >
            <X size={18} color="var(--spm-t2)" />
          </button>
        </div>
        <p className="mt-5 text-[12px] font-medium leading-6" style={{ color: 'var(--spm-t3)' }}>
          검색어를 입력한 뒤 닫으면 라이브러리 목록에 바로 반영됩니다.
        </p>
      </div>
    </div>
  );
}

export default function LibraryView() {
  const isPro = useIsPro();
  const [category, setCategory] = useState('전체');
  const [grade, setGrade] = useState('전학년');
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);

  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return PROGRAMS.filter((program) => {
      const matchCategory = category === '전체' || program.category === category;
      const matchGrade = grade === '전학년' || program.grade.includes(grade.replace(' ', ''));
      const text = [program.title, program.category, program.grade, program.space, program.description, ...program.tags].join(' ').toLowerCase();
      const matchQuery = !keyword || text.includes(keyword);
      return matchCategory && matchGrade && matchQuery;
    });
  }, [category, grade, query]);

  const topPrograms = PROGRAMS.slice(0, 4);

  return (
    <div className="h-full overflow-y-auto pb-7" style={{ background: 'var(--spm-bg)' }}>
      <header className="px-[22px] pb-5 pt-[22px]">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--spm-t3)' }}>
              program library
            </p>
            <h1
              className="mt-1 text-[32px] font-black tracking-[-0.06em]"
              style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)' }}
            >
              라이브러리
            </h1>
          </div>
          <span className="pb-1 text-[12px] font-bold" style={{ color: 'var(--spm-t2)' }}>
            153개
          </span>
        </div>

        <button
          type="button"
          onClick={() => setSearchOpen(true)}
          className="mt-5 flex h-11 w-full items-center gap-3 rounded-[12px] px-3 text-left"
          style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}
        >
          <Search size={17} color="var(--spm-t3)" />
          <span className="text-[13px] font-semibold" style={{ color: query ? 'var(--spm-t)' : 'var(--spm-t3)' }}>
            {query || '수업안, 태그, 대상 검색'}
          </span>
        </button>
      </header>

      <section className="mb-4 flex gap-2 overflow-x-auto px-[22px]">
        {CATEGORIES.map((item) => (
          <Chip key={item} label={item} active={category === item} onClick={() => setCategory(item)} />
        ))}
      </section>

      <section className="mb-7 flex gap-2 overflow-x-auto px-[22px]">
        {GRADES.map((item) => (
          <Chip key={item} label={item} active={grade === item} onClick={() => setGrade(item)} />
        ))}
      </section>

      <section className="mb-7">
        <div className="mb-[14px] flex items-baseline justify-between px-[22px]">
          <h2 className="text-[17px] font-bold tracking-[-0.03em]" style={{ fontFamily: 'var(--spm-font-display)' }}>
            TOP 4
          </h2>
          <span className="text-[12px] font-medium" style={{ color: 'var(--spm-t3)' }}>
            이번 주 추천
          </span>
        </div>
        <div className="flex gap-[9px] overflow-x-auto px-[22px]">
          {topPrograms.map((program, index) => (
            <PosterCard key={program.id} program={program} rank={index + 1} locked={program.isPro && !isPro} />
          ))}
        </div>
      </section>

      <section className="px-[22px]">
        <div className="mb-[14px] flex items-baseline justify-between">
          <h2 className="text-[17px] font-bold tracking-[-0.03em]" style={{ fontFamily: 'var(--spm-font-display)' }}>
            전체 프로그램
          </h2>
          <span className="text-[12px] font-medium" style={{ color: 'var(--spm-t3)' }}>
            {filtered.length}개
          </span>
        </div>
        {filtered.length > 0 ? (
          <div className="space-y-2">
            {filtered.map((program) => (
              <ProgramListItem key={program.id} program={program} locked={program.isPro && !isPro} />
            ))}
          </div>
        ) : (
          <div className="rounded-[14px] p-5 text-center" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
            <p className="text-[14px] font-bold" style={{ color: 'var(--spm-t)' }}>
              조건에 맞는 수업안이 없어요
            </p>
            <p className="mt-1 text-[12px]" style={{ color: 'var(--spm-t3)' }}>
              필터나 검색어를 조금 넓혀보세요.
            </p>
          </div>
        )}
      </section>

      {searchOpen ? <SearchOverlay query={query} setQuery={setQuery} onClose={() => setSearchOpen(false)} /> : null}
    </div>
  );
}
