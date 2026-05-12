'use client';

import Link from 'next/link';
import { Lock, Play, Search, Smartphone, X, Zap } from 'lucide-react';
import { useMemo, useState } from 'react';
import { PROGRAMS } from '../lib/data';
import { useIsPro, useMasterStore } from '../store';

const CATEGORIES = ['전체', '민첩성', '반응속도', '협응성', '대근육', '체력'];
const GRADES = ['전체 학년', '유치부', '초등 저학년', '초등 고학년', '중등'];

function ThumbGrid({ colors, size = 72 }: { colors: [string, string, string, string]; size?: number }) {
  return (
    <div className="grid shrink-0 grid-cols-2 grid-rows-2 gap-0.5 overflow-hidden rounded-[12px]" style={{ width: size, height: size }} aria-hidden>
      {colors.map((color) => <span key={color} style={{ background: color }} />)}
    </div>
  );
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="h-8 shrink-0 rounded-full px-3 text-[12px] font-bold" style={{ background: active ? 'var(--spm-acc)' : 'var(--spm-s2)', color: active ? '#fff' : 'var(--spm-t2)', border: active ? '1px solid transparent' : '1px solid var(--spm-br2)' }}>{label}</button>;
}

function PosterCard({ program, rank, locked, used }: { program: (typeof PROGRAMS)[number]; rank: number; locked: boolean; used: boolean }) {
  return (
    <Link href={locked ? '/spokedu-master/profile' : `/spokedu-master/library/${program.id}`} className="relative h-[196px] w-[140px] shrink-0 overflow-hidden rounded-[14px] active:scale-[0.98] lg:h-[210px] lg:w-full" style={{ background: `linear-gradient(135deg, ${program.colors[0]}, ${program.colors[1]}, ${program.colors[2]})` }}>
      <span className="absolute bottom-[-13px] left-[-4px] text-[54px] font-bold leading-none" style={{ fontFamily: 'var(--spm-font-display)', color: 'rgba(13,13,20,0.74)', WebkitTextStroke: '1px rgba(255,255,255,0.18)' }}>{rank}</span>
      <div className="absolute left-3 top-3 flex gap-1.5">
        {program.isNew ? <span className="rounded-full bg-emerald-400 px-2 py-0.5 text-[9px] font-black text-emerald-950">NEW</span> : null}
        {used ? <span className="rounded-full bg-black/35 px-2 py-0.5 text-[9px] font-black text-white">USED</span> : null}
      </div>
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/78 to-transparent p-3 pl-8">
        <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-white/45">{program.category}</p>
        <p className="mt-1 line-clamp-2 text-[13px] font-bold leading-tight text-white">{program.title}</p>
      </div>
      {locked ? <div className="absolute inset-0 grid place-items-center bg-black/55 backdrop-blur-[2px]"><span className="grid h-9 w-9 place-items-center rounded-full" style={{ background: 'rgba(245,158,11,0.14)' }}><Lock size={16} color="var(--spm-amb)" /></span></div> : null}
    </Link>
  );
}

function ProgramListItem({ program, locked, used }: { program: (typeof PROGRAMS)[number]; locked: boolean; used: boolean }) {
  return (
    <Link href={locked ? '/spokedu-master/profile' : `/spokedu-master/library/${program.id}`} className="relative flex h-full gap-3 rounded-[14px] p-3 active:scale-[0.99]" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br)' }}>
      <ThumbGrid colors={program.colors} />
      <div className="min-w-0 flex-1 py-0.5">
        <div className="mb-1.5 flex flex-wrap gap-1">
          {program.isNew ? <span className="rounded-full px-2 py-0.5 text-[9px] font-black" style={{ background: 'rgba(16,185,129,0.12)', color: 'var(--spm-grn)' }}>NEW</span> : null}
          {program.isHot ? <span className="rounded-full px-2 py-0.5 text-[9px] font-black" style={{ background: 'rgba(245,158,11,0.12)', color: 'var(--spm-amb)' }}>HOT</span> : null}
          {program.isPro ? <span className="rounded-full px-2 py-0.5 text-[9px] font-black" style={{ background: 'rgba(99,102,241,0.14)', color: '#a5b4fc' }}>PRO</span> : null}
          {used ? <span className="rounded-full px-2 py-0.5 text-[9px] font-black" style={{ background: 'rgba(16,185,129,0.12)', color: 'var(--spm-grn)' }}>이 반 사용</span> : null}
        </div>
        <h2 className="truncate text-[14px] font-bold" style={{ color: 'var(--spm-t)' }}>{program.title}</h2>
        <p className="mt-1 text-[11px] font-medium" style={{ color: 'var(--spm-t3)' }}>{program.grade} / {program.duration}분 / {program.space}</p>
        <p className="mt-2 line-clamp-1 text-[11px] font-medium" style={{ color: 'var(--spm-t2)' }}>{program.tags.join(' · ')}</p>
      </div>
      {locked ? <div className="absolute inset-0 flex items-center justify-end rounded-[14px] bg-black/48 pr-5 backdrop-blur-[2px]"><span className="rounded-full px-3 py-1 text-[10px] font-black" style={{ background: 'rgba(245,158,11,0.14)', color: 'var(--spm-amb)' }}>PRO 필요</span></div> : null}
    </Link>
  );
}

function FeaturedRail({ usedProgramIds }: { usedProgramIds: Set<string> }) {
  const featured = PROGRAMS[0]!;
  return (
    <section className="mb-7 px-[22px] sm:px-8 lg:px-10">
      <Link href={`/spokedu-master/library/${featured.id}`} className="grid overflow-hidden rounded-[18px] p-5 active:scale-[0.99] md:grid-cols-[1fr_auto] md:items-end md:p-7" style={{ background: `linear-gradient(135deg, ${featured.colors[0]}, ${featured.colors[1]}, ${featured.colors[2]})`, boxShadow: '0 18px 42px rgba(99,102,241,0.2)' }}>
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/55">오늘 반 맞춤 추천</p>
          <h2 className="mt-3 max-w-[580px] text-[28px] font-black leading-tight text-white md:text-[40px]" style={{ fontFamily: 'var(--spm-font-display)', letterSpacing: 0, wordBreak: 'keep-all' }}>{featured.title}</h2>
          <p className="mt-2 max-w-[520px] text-[12px] font-semibold leading-5 text-white/65 md:text-[14px]">
            최근 수업 기록과 방향 전환 약점을 기준으로 추천합니다. 이 반에서 사용한 프로그램 {usedProgramIds.size}개가 추천 정확도를 높입니다.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">{['15분', '마커콘', 'SPOMOVE 연결'].map((item) => <span key={item} className="rounded-full bg-black/20 px-3 py-1 text-[11px] font-black text-white/75">{item}</span>)}</div>
        </div>
        <span className="mt-5 grid h-12 w-12 place-items-center rounded-full md:mt-0" style={{ background: 'rgba(255,255,255,0.15)' }}><Play size={18} color="#fff" fill="#fff" /></span>
      </Link>
    </section>
  );
}

function SubscriptionValueStrip() {
  const items = [
    ['153', '프로그램'],
    ['PWA', '웹 실행'],
    ['누적', '성장 기록'],
  ];
  return (
    <section className="mb-7 grid grid-cols-3 gap-2 px-[22px] sm:px-8 lg:px-10">
      {items.map(([value, label]) => (
        <div key={label} className="rounded-[12px] p-3 text-center" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
          <p className="text-[20px] font-black" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)' }}>{value}</p>
          <p className="mt-1 text-[10px] font-semibold" style={{ color: 'var(--spm-t3)' }}>{label}</p>
        </div>
      ))}
    </section>
  );
}

function ProgramRail({ title, caption, programs, isPro, usedProgramIds }: { title: string; caption: string; programs: typeof PROGRAMS; isPro: boolean; usedProgramIds: Set<string> }) {
  return (
    <section className="mb-7">
      <div className="mb-[14px] flex items-baseline justify-between px-[22px] sm:px-8 lg:px-10">
        <h2 className="text-[18px] font-bold" style={{ fontFamily: 'var(--spm-font-display)' }}>{title}</h2>
        <span className="text-[12px] font-medium" style={{ color: 'var(--spm-t3)' }}>{caption}</span>
      </div>
      <div className="flex gap-[9px] overflow-x-auto px-[22px] sm:px-8 lg:grid lg:grid-cols-5 lg:overflow-visible lg:px-10">
        {programs.map((program, index) => <PosterCard key={`${title}-${program.id}`} program={program} rank={index + 1} locked={program.isPro && !isPro} used={usedProgramIds.has(program.id)} />)}
      </div>
    </section>
  );
}

function SearchOverlay({ query, setQuery, onClose }: { query: string; setQuery: (value: string) => void; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[80] flex justify-center bg-black/80">
      <div className="min-h-dvh w-full max-w-[1180px] px-[22px] pt-[22px] sm:px-8 lg:px-10" style={{ background: 'var(--spm-bg)' }}>
        <div className="flex items-center gap-2">
          <label className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" color="var(--spm-t3)" />
            <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="수업명, 태그, 대상 검색" className="h-11 w-full rounded-[12px] border bg-transparent pl-9 pr-3 text-[14px] font-semibold outline-none" style={{ borderColor: 'var(--spm-br2)', color: 'var(--spm-t)', background: 'var(--spm-s2)' }} />
          </label>
          <button type="button" onClick={onClose} className="grid h-11 w-11 place-items-center rounded-[12px]" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }} aria-label="검색 닫기"><X size={18} color="var(--spm-t2)" /></button>
        </div>
        <p className="mt-5 text-[12px] font-medium leading-6" style={{ color: 'var(--spm-t3)' }}>검색어를 입력하면 라이브러리 목록과 추천 레일에 바로 반영됩니다.</p>
      </div>
    </div>
  );
}

export default function LibraryView() {
  const isPro = useIsPro();
  const classRecords = useMasterStore((state) => state.classRecords);
  const [category, setCategory] = useState('전체');
  const [grade, setGrade] = useState('전체 학년');
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const usedProgramIds = useMemo(() => new Set(classRecords.map((record) => record.programId)), [classRecords]);

  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return PROGRAMS.filter((program) => {
      const matchCategory = category === '전체' || program.category === category;
      const matchGrade = grade === '전체 학년' || program.grade.includes(grade.replace(' ', ''));
      const text = [program.title, program.category, program.grade, program.space, program.description, ...program.tags].join(' ').toLowerCase();
      return matchCategory && matchGrade && (!keyword || text.includes(keyword));
    });
  }, [category, grade, query]);

  const topPrograms = PROGRAMS.slice(0, 5);
  const spomovePrograms = PROGRAMS.filter((program) => program.tags.includes('SPOMOVE') || program.lessonDetail?.relatedSpomoveIds.length).slice(0, 5);
  const quickPrograms = PROGRAMS.filter((program) => program.duration <= 18).slice(0, 5);

  return (
    <div className="h-full overflow-y-auto pb-7" style={{ background: 'var(--spm-bg)' }}>
      <header className="px-[22px] pb-5 pt-[22px] sm:px-8 lg:px-10">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--spm-t3)' }}>program library</p>
            <h1 className="mt-1 text-[32px] font-black md:text-[42px]" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)', letterSpacing: 0 }}>라이브러리</h1>
          </div>
          <span className="pb-1 text-[12px] font-bold" style={{ color: 'var(--spm-t2)' }}>153개</span>
        </div>
        <button type="button" onClick={() => setSearchOpen(true)} className="mt-5 flex h-11 w-full items-center gap-3 rounded-[12px] px-3 text-left" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
          <Search size={17} color="var(--spm-t3)" />
          <span className="text-[13px] font-semibold" style={{ color: query ? 'var(--spm-t)' : 'var(--spm-t3)' }}>{query || '수업명, 태그, 대상 검색'}</span>
        </button>
      </header>

      <FeaturedRail usedProgramIds={usedProgramIds} />
      <SubscriptionValueStrip />

      <section className="mb-4 flex gap-2 overflow-x-auto px-[22px] sm:px-8 lg:px-10">{CATEGORIES.map((item) => <Chip key={item} label={item} active={category === item} onClick={() => setCategory(item)} />)}</section>
      <section className="mb-7 flex gap-2 overflow-x-auto px-[22px] sm:px-8 lg:px-10">{GRADES.map((item) => <Chip key={item} label={item} active={grade === item} onClick={() => setGrade(item)} />)}</section>

      <ProgramRail title="TOP 5" caption="이번 주 추천" programs={topPrograms} isPro={isPro} usedProgramIds={usedProgramIds} />
      <ProgramRail title="SPOMOVE 연결 수업" caption="웹 실행 포함" programs={spomovePrograms} isPro={isPro} usedProgramIds={usedProgramIds} />
      <ProgramRail title="15분 이내 빠른 수업" caption="대체 수업용" programs={quickPrograms} isPro={isPro} usedProgramIds={usedProgramIds} />

      <section className="mb-7 px-[22px] sm:px-8 lg:px-10">
        <Link href="/spokedu-master/spomove" className="flex items-center gap-3 rounded-[14px] p-4" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px]" style={{ background: 'rgba(99,102,241,0.14)' }}><Zap size={19} color="var(--spm-acc)" /></span>
          <span className="min-w-0 flex-1"><strong className="block text-[14px]" style={{ color: 'var(--spm-t)' }}>SPOMOVE 웹 플레이어</strong><span className="mt-1 block text-[11px]" style={{ color: 'var(--spm-t3)' }}>프로젝터, 태블릿, 모바일에서 바로 실행</span></span>
          <Smartphone size={18} color="var(--spm-t3)" />
        </Link>
      </section>

      <section className="px-[22px] sm:px-8 lg:px-10">
        <div className="mb-[14px] flex items-baseline justify-between">
          <h2 className="text-[18px] font-bold" style={{ fontFamily: 'var(--spm-font-display)' }}>전체 프로그램</h2>
          <span className="text-[12px] font-medium" style={{ color: 'var(--spm-t3)' }}>{filtered.length}개</span>
        </div>
        {filtered.length > 0 ? <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">{filtered.map((program) => <ProgramListItem key={program.id} program={program} locked={program.isPro && !isPro} used={usedProgramIds.has(program.id)} />)}</div> : <div className="rounded-[14px] p-5 text-center" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}><p className="text-[14px] font-bold" style={{ color: 'var(--spm-t)' }}>조건에 맞는 수업이 없습니다.</p><p className="mt-1 text-[12px]" style={{ color: 'var(--spm-t3)' }}>필터와 검색어를 조금 바꿔보세요.</p></div>}
      </section>

      {searchOpen ? <SearchOverlay query={query} setQuery={setQuery} onClose={() => setSearchOpen(false)} /> : null}
    </div>
  );
}
