'use client';

import Link from 'next/link';
import { Bookmark, Lock, Play, Search, Smartphone, X, Zap } from 'lucide-react';
import { useMemo, useState } from 'react';
import { PROGRAMS } from '../lib/data';
import { useIsPro, useMasterStore } from '../store';

const FILTERS = ['전체', '유아', '초등', 'SPOMOVE', '간편 준비', '좁은 공간', '협동', '민첩성'];

function ThumbGrid({ colors, size = 72 }: { colors: [string, string, string, string]; size?: number }) {
  return <div className="grid shrink-0 grid-cols-2 grid-rows-2 gap-0.5 overflow-hidden rounded-[12px]" style={{ width: size, height: size }} aria-hidden>{colors.map((color) => <span key={color} style={{ background: color }} />)}</div>;
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="h-8 shrink-0 rounded-full px-3 text-[12px] font-bold" style={{ background: active ? 'var(--spm-acc)' : 'var(--spm-s2)', color: active ? '#fff' : 'var(--spm-t2)', border: active ? '1px solid transparent' : '1px solid var(--spm-br2)' }}>{label}</button>;
}

function matchFilter(program: (typeof PROGRAMS)[number], filter: string) {
  if (filter === '전체') return true;
  if (filter === '유아') return program.grade.includes('유아') || program.grade.includes('유치') || program.tags.includes('유아');
  if (filter === '초등') return program.grade.includes('초등');
  if (filter === '협동') return program.tags.includes('협동') || program.category.includes('협동') || program.category.includes('협응');
  if (filter === '민첩성') return program.tags.includes('민첩성') || program.category.includes('민첩');
  if (filter === '간편 준비') return program.tags.includes('준비물 없음') || program.equipment.length <= 2;
  if (filter === '좁은 공간') return program.space.includes('좁은');
  if (filter === 'SPOMOVE') return program.tags.includes('SPOMOVE') || !!program.lessonDetail?.relatedSpomoveIds.length;
  return true;
}

function PosterCard({ program, rank, locked, used, favorite, onFavorite }: { program: (typeof PROGRAMS)[number]; rank: number; locked: boolean; used: boolean; favorite: boolean; onFavorite: () => void }) {
  return (
    <div className="relative h-[196px] w-[140px] shrink-0 overflow-hidden rounded-[14px] lg:h-[210px] lg:w-full" style={{ background: `linear-gradient(135deg, ${program.colors[0]}, ${program.colors[1]}, ${program.colors[2]})` }}>
      <Link href={locked ? '/spokedu-master/profile' : `/spokedu-master/library/${program.id}`} className="absolute inset-0 active:scale-[0.98]">
        <span className="absolute bottom-[-13px] left-[-4px] text-[54px] font-bold leading-none" style={{ fontFamily: 'var(--spm-font-display)', color: 'rgba(13,13,20,0.74)', WebkitTextStroke: '1px rgba(255,255,255,0.18)' }}>{rank}</span>
        <div className="absolute left-3 top-3 flex gap-1.5">{program.isNew ? <span className="rounded-full bg-emerald-400 px-2 py-0.5 text-[9px] font-black text-emerald-950">NEW</span> : null}{used ? <span className="rounded-full bg-black/35 px-2 py-0.5 text-[9px] font-black text-white">USED</span> : null}</div>
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/78 to-transparent p-3 pl-8"><p className="text-[9px] font-bold uppercase tracking-[0.08em] text-white/45">{program.category}</p><p className="mt-1 line-clamp-2 text-[13px] font-bold leading-tight text-white">{program.title}</p></div>
        {locked ? <div className="absolute inset-0 grid place-items-center bg-black/55 backdrop-blur-[2px]"><span className="grid h-9 w-9 place-items-center rounded-full" style={{ background: 'rgba(245,158,11,0.14)' }}><Lock size={16} color="var(--spm-amb)" /></span></div> : null}
      </Link>
      <button type="button" onClick={onFavorite} className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-black/30" aria-label={`${program.title} 즐겨찾기`}>
        <Bookmark size={15} color="#fff" fill={favorite ? '#fff' : 'none'} />
      </button>
    </div>
  );
}

function ProgramListItem({ program, locked, used, favorite, onFavorite }: { program: (typeof PROGRAMS)[number]; locked: boolean; used: boolean; favorite: boolean; onFavorite: () => void }) {
  return (
    <div className="relative flex h-full gap-3 rounded-[14px] p-3 active:scale-[0.99]" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br)' }}>
      <Link href={locked ? '/spokedu-master/profile' : `/spokedu-master/library/${program.id}`} className="absolute inset-0 rounded-[14px]" aria-label={program.title} />
      <ThumbGrid colors={program.colors} />
      <div className="min-w-0 flex-1 py-0.5">
        <div className="mb-1.5 flex flex-wrap gap-1">{program.isNew ? <span className="rounded-full px-2 py-0.5 text-[9px] font-black" style={{ background: 'rgba(16,185,129,0.12)', color: 'var(--spm-grn)' }}>NEW</span> : null}{program.isHot ? <span className="rounded-full px-2 py-0.5 text-[9px] font-black" style={{ background: 'rgba(245,158,11,0.12)', color: 'var(--spm-amb)' }}>HOT</span> : null}{program.isPro ? <span className="rounded-full px-2 py-0.5 text-[9px] font-black" style={{ background: 'rgba(99,102,241,0.14)', color: '#a5b4fc' }}>PRO</span> : null}{used ? <span className="rounded-full px-2 py-0.5 text-[9px] font-black" style={{ background: 'rgba(16,185,129,0.12)', color: 'var(--spm-grn)' }}>최근 사용</span> : null}</div>
        <h2 className="truncate text-[14px] font-bold" style={{ color: 'var(--spm-t)' }}>{program.title}</h2>
        <p className="mt-1 text-[11px] font-medium" style={{ color: 'var(--spm-t3)' }}>{program.grade} / {program.duration}분 / {program.space}</p>
        <p className="mt-2 line-clamp-1 text-[11px] font-medium" style={{ color: 'var(--spm-t2)' }}>{program.tags.join(' · ')}</p>
      </div>
      <button type="button" onClick={onFavorite} className="relative z-10 grid h-9 w-9 shrink-0 place-items-center rounded-[10px]" style={{ background: 'var(--spm-s3)' }} aria-label={`${program.title} 즐겨찾기`}>
        <Bookmark size={15} color={favorite ? 'var(--spm-amb)' : 'var(--spm-t3)'} fill={favorite ? 'var(--spm-amb)' : 'none'} />
      </button>
      {locked ? <div className="absolute inset-0 flex items-center justify-end rounded-[14px] bg-black/48 pr-5 backdrop-blur-[2px]"><span className="rounded-full px-3 py-1 text-[10px] font-black" style={{ background: 'rgba(245,158,11,0.14)', color: 'var(--spm-amb)' }}>PRO 필요</span></div> : null}
    </div>
  );
}

function FeaturedRail() {
  const featured = PROGRAMS[0]!;
  return (
    <section className="mb-7 px-[22px] sm:px-8 lg:px-10">
      <Link href={`/spokedu-master/library/${featured.id}`} className="grid overflow-hidden rounded-[18px] p-5 active:scale-[0.99] md:grid-cols-[1fr_auto] md:items-end md:p-7" style={{ background: `linear-gradient(135deg, ${featured.colors[0]}, ${featured.colors[1]}, ${featured.colors[2]})`, boxShadow: '0 18px 42px rgba(99,102,241,0.2)' }}>
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/55">오늘 추천 수업</p>
          <h2 className="mt-3 max-w-[580px] text-[28px] font-black leading-tight text-white md:text-[40px]" style={{ fontFamily: 'var(--spm-font-display)', letterSpacing: 0, wordBreak: 'keep-all' }}>{featured.title}</h2>
          <p className="mt-2 max-w-[520px] text-[12px] font-semibold leading-5 text-white/65 md:text-[14px]">{featured.description}</p>
          <div className="mt-5 flex flex-wrap gap-2">{[`${featured.duration}분`, featured.space, ...featured.tags.slice(0, 2)].map((item) => <span key={item} className="rounded-full bg-black/20 px-3 py-1 text-[11px] font-black text-white/75">{item}</span>)}</div>
        </div>
        <span className="mt-5 grid h-12 w-12 place-items-center rounded-full md:mt-0" style={{ background: 'rgba(255,255,255,0.15)' }}><Play size={18} color="#fff" fill="#fff" /></span>
      </Link>
    </section>
  );
}

function SelectionGuide() {
  const items = [
    { title: '오늘 바로 쓸 수업', caption: '추천과 빠른 수업부터 확인', href: '#quick-programs', Icon: Play },
    { title: '큰 화면과 연결', caption: 'SPOMOVE 연계 수업 모음', href: '#spomove-programs', Icon: Zap },
    { title: '준비물까지 연결', caption: '상세에서 교구 스토어로 이동', href: '/spokedu-master/shop', Icon: Smartphone },
  ] as const;

  return (
    <section className="mb-7 grid gap-2 px-[22px] sm:grid-cols-3 sm:px-8 lg:px-10">
      {items.map(({ title, caption, href, Icon }) => (
        <Link key={title} href={href} className="flex min-h-[82px] items-center gap-3 rounded-[14px] p-3" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px]" style={{ background: 'rgba(99,102,241,0.14)' }}>
            <Icon size={17} color="var(--spm-acc)" />
          </span>
          <span className="min-w-0">
            <strong className="block text-[13px]" style={{ color: 'var(--spm-t)' }}>{title}</strong>
            <span className="mt-1 block text-[11px] font-semibold leading-4" style={{ color: 'var(--spm-t3)' }}>{caption}</span>
          </span>
        </Link>
      ))}
    </section>
  );
}

function ProgramRail({ id, title, caption, programs, isPro, usedProgramIds, favorites, onFavorite }: { id?: string; title: string; caption: string; programs: typeof PROGRAMS; isPro: boolean; usedProgramIds: Set<string>; favorites: string[]; onFavorite: (id: string) => void }) {
  return (
    <section id={id} className="mb-7 scroll-mt-20">
      <div className="mb-[14px] flex items-baseline justify-between px-[22px] sm:px-8 lg:px-10"><h2 className="text-[18px] font-bold" style={{ fontFamily: 'var(--spm-font-display)' }}>{title}</h2><span className="text-[12px] font-medium" style={{ color: 'var(--spm-t3)' }}>{caption}</span></div>
      <div className="flex gap-[9px] overflow-x-auto px-[22px] sm:px-8 lg:grid lg:grid-cols-5 lg:overflow-visible lg:px-10">{programs.map((program, index) => <PosterCard key={`${title}-${program.id}`} program={program} rank={index + 1} locked={program.isPro && !isPro} used={usedProgramIds.has(program.id)} favorite={favorites.includes(program.id)} onFavorite={() => onFavorite(program.id)} />)}</div>
    </section>
  );
}

function SearchOverlay({ query, setQuery, onClose }: { query: string; setQuery: (value: string) => void; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[80] flex justify-center bg-black/80">
      <div className="min-h-dvh w-full max-w-[1180px] px-[22px] pt-[22px] sm:px-8 lg:px-10" style={{ background: 'var(--spm-bg)' }}>
        <div className="flex items-center gap-2">
          <label className="relative flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" color="var(--spm-t3)" /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="수업명, 태그, 교구 검색" className="h-11 w-full rounded-[12px] border bg-transparent pl-9 pr-3 text-[14px] font-semibold outline-none" style={{ borderColor: 'var(--spm-br2)', color: 'var(--spm-t)', background: 'var(--spm-s2)' }} /></label>
          <button type="button" onClick={onClose} className="grid h-11 w-11 place-items-center rounded-[12px]" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }} aria-label="검색 닫기"><X size={18} color="var(--spm-t2)" /></button>
        </div>
        <p className="mt-5 text-[12px] font-medium leading-6" style={{ color: 'var(--spm-t3)' }}>검색어를 입력하면 라이브러리 목록에 바로 반영됩니다.</p>
      </div>
    </div>
  );
}

export default function LibraryView() {
  const isPro = useIsPro();
  const classRecords = useMasterStore((state) => state.classRecords);
  const favorites = useMasterStore((state) => state.favorites);
  const toggleFavorite = useMasterStore((state) => state.toggleFavorite);
  const [filter, setFilter] = useState('전체');
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const usedProgramIds = useMemo(() => new Set(classRecords.map((record) => record.programId)), [classRecords]);
  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return PROGRAMS.filter((program) => {
      const text = [program.title, program.category, program.grade, program.space, program.description, ...program.tags, ...program.equipment].join(' ').toLowerCase();
      return matchFilter(program, filter) && (!keyword || text.includes(keyword));
    });
  }, [filter, query]);
  const spomovePrograms = PROGRAMS.filter((program) => program.tags.includes('SPOMOVE') || program.lessonDetail?.relatedSpomoveIds.length).slice(0, 5);
  const quickPrograms = PROGRAMS.filter((program) => program.duration <= 18).slice(0, 5);
  const favoritePrograms = PROGRAMS.filter((program) => favorites.includes(program.id));
  const resetFilters = () => {
    setFilter('전체');
    setQuery('');
  };

  return (
    <div className="h-full overflow-y-auto pb-7" style={{ background: 'var(--spm-bg)' }}>
      <header className="px-[22px] pb-5 pt-[22px] sm:px-8 lg:px-10">
        <div className="flex items-end justify-between gap-4"><div><p className="text-[12px] font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--spm-t3)' }}>program library</p><h1 className="mt-1 text-[32px] font-black md:text-[42px]" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)', letterSpacing: 0 }}>라이브러리</h1></div><span className="pb-1 text-[12px] font-bold" style={{ color: 'var(--spm-t2)' }}>{PROGRAMS.length}개</span></div>
        <button type="button" onClick={() => setSearchOpen(true)} className="mt-5 flex h-11 w-full items-center gap-3 rounded-[12px] px-3 text-left" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}><Search size={17} color="var(--spm-t3)" /><span className="text-[13px] font-semibold" style={{ color: query ? 'var(--spm-t)' : 'var(--spm-t3)' }}>{query || '수업명, 태그, 교구 검색'}</span></button>
      </header>
      <FeaturedRail />
      <SelectionGuide />
      <section className="mb-7 flex gap-2 overflow-x-auto px-[22px] sm:px-8 lg:px-10">{FILTERS.map((item) => <Chip key={item} label={item} active={filter === item} onClick={() => setFilter(item)} />)}</section>
      {favoritePrograms.length > 0 ? <ProgramRail title="즐겨찾기" caption="자주 쓰는 수업" programs={favoritePrograms} isPro={isPro} usedProgramIds={usedProgramIds} favorites={favorites} onFavorite={toggleFavorite} /> : null}
      <ProgramRail id="spomove-programs" title="SPOMOVE 연결 수업" caption="큰 화면 실행과 연결" programs={spomovePrograms} isPro={isPro} usedProgramIds={usedProgramIds} favorites={favorites} onFavorite={toggleFavorite} />
      <ProgramRail id="quick-programs" title="18분 이내 빠른 수업" caption="대체 수업용" programs={quickPrograms} isPro={isPro} usedProgramIds={usedProgramIds} favorites={favorites} onFavorite={toggleFavorite} />
      <section className="mb-7 px-[22px] sm:px-8 lg:px-10"><Link href="/spokedu-master/spomove" className="flex items-center gap-3 rounded-[14px] p-4" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}><span className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px]" style={{ background: 'rgba(99,102,241,0.14)' }}><Zap size={19} color="var(--spm-acc)" /></span><span className="min-w-0 flex-1"><strong className="block text-[14px]" style={{ color: 'var(--spm-t)' }}>SPOMOVE 플레이어</strong><span className="mt-1 block text-[11px]" style={{ color: 'var(--spm-t3)' }}>프로젝터, 태블릿, 모바일에서 바로 실행</span></span><Smartphone size={18} color="var(--spm-t3)" /></Link></section>
      <section className="px-[22px] sm:px-8 lg:px-10"><div className="mb-[14px] flex items-baseline justify-between gap-3"><h2 className="text-[18px] font-bold" style={{ fontFamily: 'var(--spm-font-display)' }}>전체 프로그램</h2><div className="flex items-center gap-2"><span className="text-[12px] font-medium" style={{ color: 'var(--spm-t3)' }}>{filtered.length}개</span>{filter !== '전체' || query ? <button type="button" onClick={resetFilters} className="rounded-full px-2.5 py-1 text-[11px] font-black" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)', color: 'var(--spm-t2)' }}>초기화</button> : null}</div></div>{filtered.length > 0 ? <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">{filtered.map((program) => <ProgramListItem key={program.id} program={program} locked={program.isPro && !isPro} used={usedProgramIds.has(program.id)} favorite={favorites.includes(program.id)} onFavorite={() => toggleFavorite(program.id)} />)}</div> : <div className="rounded-[14px] p-5 text-center" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}><p className="text-[14px] font-bold" style={{ color: 'var(--spm-t)' }}>조건에 맞는 수업안이 없습니다.</p><p className="mt-1 text-[12px]" style={{ color: 'var(--spm-t3)' }}>필터와 검색어를 조금 바꿔보세요.</p><button type="button" onClick={resetFilters} className="mt-4 h-10 rounded-[12px] px-4 text-[12px] font-black text-white" style={{ background: 'var(--spm-acc)' }}>전체 보기</button></div>}</section>
      {searchOpen ? <SearchOverlay query={query} setQuery={setQuery} onClose={() => setSearchOpen(false)} /> : null}
    </div>
  );
}
