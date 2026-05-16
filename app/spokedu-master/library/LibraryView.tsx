'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bookmark, Clock, ExternalLink, Lock, MapPin, Play, Search, Smartphone, Users, X, Zap } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useIsPro, useMasterStore } from '../store';
import { LibrarySkeleton } from '../components/ui/Skeleton';
import { CategoryIcon, ProgramThumb } from '../components/ui/ProgramThumb';
import type { Program } from '../types';

const FILTERS = ['전체', '유아', '초등', 'SPOMOVE', '간편 준비', '좁은 공간', '협동', '민첩성'];

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="h-8 shrink-0 rounded-full px-3 text-[12px] font-bold" style={{ background: active ? 'var(--spm-acc)' : 'var(--spm-s2)', color: active ? '#fff' : 'var(--spm-t2)', border: active ? '1px solid transparent' : '1px solid var(--spm-br2)' }}>
      {label}
    </button>
  );
}

function matchFilter(program: Program, filter: string) {
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

// ─── Program Preview Bottom Sheet ────────────────────────────────────────────

function ProgramSheet({ program, isPro, favorite, onFavorite, onClose }: {
  program: Program;
  isPro: boolean;
  favorite: boolean;
  onFavorite: () => void;
  onClose: () => void;
}) {
  const router = useRouter();
  const locked = program.isPro && !isPro;
  const drillId = program.lessonDetail?.relatedSpomoveIds[0] ?? 'speed-track';
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sheetRef.current;
    if (el) { el.style.transform = 'translateY(100%)'; requestAnimationFrame(() => { el.style.transition = 'transform 0.3s cubic-bezier(0.32,0.72,0,1)'; el.style.transform = 'translateY(0)'; }); }
  }, []);

  const close = () => {
    const el = sheetRef.current;
    if (el) { el.style.transform = 'translateY(100%)'; setTimeout(onClose, 280); }
    else { onClose(); }
  };

  const launch = () => {
    close();
    setTimeout(() => router.push(`/spokedu-master/spomove/session?drill=${drillId}&mode=projector&program=${program.id}`), 10);
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-end" onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
      <div className="absolute inset-0 bg-black/70" style={{ backdropFilter: 'blur(4px)' }} onClick={close} />
      <div
        ref={sheetRef}
        className="relative z-10 w-full overflow-hidden rounded-t-[22px] pb-[env(safe-area-inset-bottom)]"
        style={{ background: 'var(--spm-bg)', maxHeight: '88dvh', overflowY: 'auto', willChange: 'transform' }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1"><div className="h-[4px] w-10 rounded-full" style={{ background: 'var(--spm-br2)' }} /></div>

        {/* Hero */}
        <div
          className="relative mx-4 mt-1 flex h-[160px] items-center justify-center overflow-hidden rounded-[16px]"
          style={program.thumbnailUrl ? undefined : { background: `linear-gradient(145deg, ${program.colors[0]}, ${program.colors[1]}, ${program.colors[2]})` }}
        >
          {program.thumbnailUrl ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={program.thumbnailUrl} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
              <div className="absolute inset-0 rounded-[16px]" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.15), rgba(0,0,0,0.45))' }} />
            </>
          ) : (
            <>
              <span className="pointer-events-none absolute right-3 top-3 opacity-[0.08]" aria-hidden>
                <CategoryIcon category={program.category} size={110} color="#fff" strokeWidth={0.7} />
              </span>
              <div className="grid h-[60px] w-[60px] place-items-center rounded-[18px]" style={{ background: 'rgba(0,0,0,0.22)', border: '1px solid rgba(255,255,255,0.16)' }}>
                <CategoryIcon category={program.category} size={28} color="rgba(255,255,255,0.9)" />
              </div>
            </>
          )}
          {locked ? (
            <div className="absolute inset-0 grid place-items-center rounded-[16px] bg-black/55">
              <Lock size={22} color="var(--spm-amb)" />
            </div>
          ) : null}
          {/* Close button */}
          <button type="button" onClick={close} className="absolute right-2.5 top-2.5 grid h-8 w-8 place-items-center rounded-full bg-black/40" aria-label="닫기">
            <X size={14} color="rgba(255,255,255,0.8)" />
          </button>
        </div>

        {/* Content */}
        <div className="px-4 pt-4 pb-6">
          {/* Badges */}
          <div className="mb-2 flex flex-wrap gap-1.5">
            <span className="rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wide" style={{ background: 'rgba(99,102,241,0.14)', color: 'var(--spm-acc)' }}>{program.category}</span>
            {program.isNew ? <span className="rounded-full px-2 py-0.5 text-[10px] font-black" style={{ background: 'rgba(16,185,129,0.14)', color: 'var(--spm-grn)' }}>NEW</span> : null}
            {program.isHot ? <span className="rounded-full px-2 py-0.5 text-[10px] font-black" style={{ background: 'rgba(245,158,11,0.14)', color: 'var(--spm-amb)' }}>HOT</span> : null}
            {program.isPro ? <span className="rounded-full px-2 py-0.5 text-[10px] font-black" style={{ background: 'rgba(99,102,241,0.14)', color: '#a5b4fc' }}>PRO</span> : null}
          </div>

          {/* Title + Bookmark */}
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-[22px] font-black leading-[1.15]" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)', wordBreak: 'keep-all' }}>{program.title}</h2>
            <button type="button" onClick={onFavorite} className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-[10px]" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }} aria-label="즐겨찾기">
              <Bookmark size={16} color={favorite ? 'var(--spm-amb)' : 'var(--spm-t3)'} fill={favorite ? 'var(--spm-amb)' : 'none'} />
            </button>
          </div>

          {/* Key stats */}
          <div className="mt-3 flex flex-wrap gap-2">
            {[
              { Icon: Users, text: program.grade },
              { Icon: Clock, text: `${program.duration}분` },
              { Icon: MapPin, text: program.space },
            ].map(({ Icon, text }) => (
              <span key={text} className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)', color: 'var(--spm-t2)' }}>
                <Icon size={12} color="var(--spm-t3)" />
                {text}
              </span>
            ))}
          </div>

          {/* Description */}
          {program.description ? (
            <p className="mt-4 text-[13px] font-medium leading-6" style={{ color: 'var(--spm-t2)' }}>
              {program.description}
            </p>
          ) : null}

          {/* Coach script preview (Pro programs: teaser only if locked) */}
          {program.lessonDetail?.coachScript && !locked ? (
            <div className="mt-4 rounded-[12px] p-3" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
              <p className="mb-1.5 text-[10px] font-black uppercase tracking-wide" style={{ color: 'var(--spm-t3)' }}>코치 포인트</p>
              <p className="line-clamp-3 text-[12px] font-medium leading-5" style={{ color: 'var(--spm-t2)' }}>{program.lessonDetail.coachScript}</p>
            </div>
          ) : null}

          {/* Equipment quick view */}
          {program.equipment.length > 0 && !locked ? (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {program.equipment.slice(0, 4).map((item) => (
                <span key={item} className="rounded-full px-2.5 py-1 text-[11px] font-semibold" style={{ background: 'var(--spm-s3)', color: 'var(--spm-t2)' }}>{item}</span>
              ))}
              {program.equipment.length > 4 ? <span className="rounded-full px-2.5 py-1 text-[11px] font-semibold" style={{ color: 'var(--spm-t3)' }}>+{program.equipment.length - 4}개</span> : null}
            </div>
          ) : null}

          {/* CTAs */}
          <div className="mt-5 flex flex-col gap-2">
            {locked ? (
              <>
                <Link
                  href="/spokedu-master/payment?plan=pro"
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-[14px] text-[14px] font-black text-white"
                  style={{ background: 'var(--spm-acc)', boxShadow: '0 8px 24px rgba(99,102,241,0.3)' }}
                >
                  Pro로 시작하고 전체 수업안 보기
                </Link>
                <Link
                  href={`/spokedu-master/library/${program.id}`}
                  className="flex h-11 w-full items-center justify-center rounded-[14px] text-[13px] font-bold"
                  style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)', color: 'var(--spm-t2)' }}
                >
                  미리보기
                </Link>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={launch}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-[14px] text-[14px] font-black text-white"
                  style={{ background: 'var(--spm-acc)', boxShadow: '0 8px 24px rgba(99,102,241,0.28)' }}
                >
                  <Play size={16} fill="#fff" />
                  SPOMOVE 실행
                </button>
                <Link
                  href={`/spokedu-master/library/${program.id}`}
                  onClick={close}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-[14px] text-[13px] font-bold"
                  style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)', color: 'var(--spm-t)' }}
                >
                  <ExternalLink size={15} />
                  전체 수업안 보기
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Cards ───────────────────────────────────────────────────────────────────

function PosterCard({ program, rank, locked, used, favorite, onFavorite, onPreview }: {
  program: Program; rank: number; locked: boolean; used: boolean; favorite: boolean;
  onFavorite: () => void; onPreview: () => void;
}) {
  // Landscape (16:9-ish) when thumbnail exists, portrait when gradient fallback
  const isLandscape = !!program.thumbnailUrl;

  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-[14px] lg:w-full ${isLandscape ? 'h-[118px] w-[210px]' : 'h-[196px] w-[140px] lg:h-[210px]'}`}
      style={{ background: program.thumbnailUrl ? '#111' : `linear-gradient(160deg, ${program.colors[0]}, ${program.colors[1]}, ${program.colors[2]})` }}
    >
      {program.thumbnailUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={program.thumbnailUrl} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center pb-14">
          <div className="grid h-[52px] w-[52px] place-items-center rounded-[16px]" style={{ background: 'rgba(0,0,0,0.22)', border: '1px solid rgba(255,255,255,0.14)' }}>
            <CategoryIcon category={program.category} size={24} color="rgba(255,255,255,0.82)" />
          </div>
        </div>
      )}
      <button type="button" onClick={onPreview} className="absolute inset-0 text-left" aria-label={program.title}>
        <div className="absolute left-2.5 top-2.5 flex flex-wrap gap-1">
          {program.isNew ? <span className="rounded-full bg-emerald-400 px-2 py-0.5 text-[9px] font-black text-emerald-950">NEW</span> : null}
          {used ? <span className="rounded-full bg-black/35 px-2 py-0.5 text-[9px] font-black text-white">USED</span> : null}
        </div>
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/92 via-black/60 to-transparent p-3">
          <p className="truncate text-[9px] font-bold uppercase tracking-[0.08em] text-white/50">{program.category} · #{rank}</p>
          <p className="mt-0.5 line-clamp-2 text-[13px] font-bold leading-tight text-white">{program.title}</p>
          <p className="mt-1 text-[10px] font-semibold text-white/55">{program.grade} · {program.duration}분</p>
        </div>
        {locked ? <div className="absolute inset-0 grid place-items-center bg-black/55"><span className="grid h-9 w-9 place-items-center rounded-full" style={{ background: 'rgba(245,158,11,0.14)' }}><Lock size={16} color="var(--spm-amb)" /></span></div> : null}
      </button>
      <button type="button" onClick={onFavorite} className="absolute right-1.5 top-1.5 grid h-9 w-9 place-items-center rounded-full bg-black/40" aria-label={`${program.title} 즐겨찾기`}>
        <Bookmark size={14} color="#fff" fill={favorite ? '#fff' : 'none'} />
      </button>
    </div>
  );
}

function ProgramListItem({ program, locked, used, favorite, onFavorite, onPreview }: {
  program: Program; locked: boolean; used: boolean; favorite: boolean;
  onFavorite: () => void; onPreview: () => void;
}) {
  return (
    <div className="relative flex h-full gap-3 rounded-[14px] p-3 active:scale-[0.99]" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br)' }}>
      <button type="button" onClick={onPreview} className="absolute inset-0 rounded-[14px]" aria-label={`${program.title} 미리보기`} />
      <ProgramThumb program={program} />
      <div className="min-w-0 flex-1 py-0.5">
        <div className="mb-1.5 flex flex-wrap gap-1">
          {program.isNew ? <span className="rounded-full px-2 py-0.5 text-[9px] font-black" style={{ background: 'rgba(16,185,129,0.12)', color: 'var(--spm-grn)' }}>NEW</span> : null}
          {program.isHot ? <span className="rounded-full px-2 py-0.5 text-[9px] font-black" style={{ background: 'rgba(245,158,11,0.12)', color: 'var(--spm-amb)' }}>HOT</span> : null}
          {program.isPro ? <span className="rounded-full px-2 py-0.5 text-[9px] font-black" style={{ background: 'rgba(99,102,241,0.14)', color: '#a5b4fc' }}>PRO</span> : null}
          {used ? <span className="rounded-full px-2 py-0.5 text-[9px] font-black" style={{ background: 'rgba(16,185,129,0.12)', color: 'var(--spm-grn)' }}>최근 사용</span> : null}
        </div>
        <h2 className="truncate text-[14px] font-bold" style={{ color: 'var(--spm-t)' }}>{program.title}</h2>
        <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5">
          <span className="flex items-center gap-1 text-[11px] font-medium" style={{ color: 'var(--spm-t3)' }}><Users size={10} />{program.grade}</span>
          <span className="flex items-center gap-1 text-[11px] font-medium" style={{ color: 'var(--spm-t3)' }}><Clock size={10} />{program.duration}분</span>
          <span className="flex items-center gap-1 text-[11px] font-medium" style={{ color: 'var(--spm-t3)' }}><MapPin size={10} />{program.space}</span>
        </div>
        {program.tags.length > 0 ? (
          <p className="mt-2 line-clamp-1 text-[11px] font-medium" style={{ color: 'var(--spm-t2)' }}>{program.tags.slice(0, 4).join(' · ')}</p>
        ) : null}
      </div>
      <button type="button" onClick={onFavorite} className="relative z-10 grid h-9 w-9 shrink-0 place-items-center rounded-[10px]" style={{ background: 'var(--spm-s3)' }} aria-label={`${program.title} 즐겨찾기`}>
        <Bookmark size={15} color={favorite ? 'var(--spm-amb)' : 'var(--spm-t3)'} fill={favorite ? 'var(--spm-amb)' : 'none'} />
      </button>
      {locked ? <div className="absolute inset-0 flex items-center justify-end rounded-[14px] bg-black/48 pr-5"><span className="rounded-full px-3 py-1 text-[10px] font-black" style={{ background: 'rgba(245,158,11,0.14)', color: 'var(--spm-amb)' }}>PRO 필요</span></div> : null}
    </div>
  );
}

// ─── Sections ────────────────────────────────────────────────────────────────

function FeaturedRail({ programs, onPreview }: { programs: Program[]; onPreview: (p: Program) => void }) {
  const now = new Date();
  const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000);
  const featured = programs.length > 0 ? programs[dayOfYear % programs.length] : undefined;
  if (!featured) return null;
  return (
    <section className="mb-7 px-[22px] sm:px-8 lg:px-10">
      <button
        type="button"
        onClick={() => onPreview(featured)}
        className="relative w-full overflow-hidden rounded-[18px] text-left active:scale-[0.99]"
        style={{ minHeight: 250, boxShadow: '0 22px 52px rgba(0,0,0,0.42)' }}
      >
        {/* Background: image or gradient */}
        {featured.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={featured.thumbnailUrl} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${featured.colors[0]}, ${featured.colors[1]}, ${featured.colors[2]})` }} />
        )}
        {/* Dark scrim for readability */}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.38) 60%, rgba(0,0,0,0.18) 100%)' }} />
        {!featured.thumbnailUrl ? (
          <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 opacity-[0.06]" aria-hidden>
            <CategoryIcon category={featured.category} size={160} color="#fff" strokeWidth={0.7} />
          </span>
        ) : null}
        {/* Content */}
        <div className="relative grid p-5 md:grid-cols-[1fr_auto] md:items-end md:p-7">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/60">오늘 추천 수업</p>
            <h2 className="mt-3 max-w-[580px] text-[30px] font-black leading-tight text-white md:text-[44px]" style={{ fontFamily: 'var(--spm-font-display)', letterSpacing: 0, wordBreak: 'keep-all', textShadow: '0 2px 16px rgba(0,0,0,0.45)' }}>{featured.title}</h2>
            <p className="mt-2 text-[12px] font-semibold text-white/65">{featured.grade} · {featured.duration}분 · {featured.space}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {[`${featured.duration}분`, featured.space, ...featured.tags.slice(0, 3)].map((item) => (
                <span key={item} className="rounded-full bg-black/30 px-3 py-1 text-[11px] font-black text-white/80">{item}</span>
              ))}
            </div>
          </div>
          <span className="relative mt-5 grid h-12 w-12 place-items-center rounded-full md:mt-0" style={{ background: 'rgba(255,255,255,0.18)' }}>
            <Play size={18} color="#fff" fill="#fff" />
          </span>
        </div>
      </button>
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

function ProgramRail({ id, title, caption, programs, isPro, usedProgramIds, favorites, onFavorite, onPreview }: {
  id?: string; title: string; caption: string; programs: Program[];
  isPro: boolean; usedProgramIds: Set<string>; favorites: string[];
  onFavorite: (id: string) => void; onPreview: (p: Program) => void;
}) {
  return (
    <section id={id} className="mb-7 scroll-mt-20">
      <div className="mb-[14px] flex items-baseline justify-between px-[22px] sm:px-8 lg:px-10">
        <h2 className="text-[18px] font-bold" style={{ fontFamily: 'var(--spm-font-display)' }}>{title}</h2>
        <span className="text-[12px] font-medium" style={{ color: 'var(--spm-t3)' }}>{caption}</span>
      </div>
      <div className="scrollbar-hide flex gap-[9px] overflow-x-auto px-[22px] sm:px-8 lg:grid lg:grid-cols-5 lg:overflow-visible lg:px-10">
        {programs.map((program, index) => (
          <PosterCard
            key={`${title}-${program.id}`}
            program={program}
            rank={index + 1}
            locked={program.isPro && !isPro}
            used={usedProgramIds.has(program.id)}
            favorite={favorites.includes(program.id)}
            onFavorite={() => onFavorite(program.id)}
            onPreview={() => onPreview(program)}
          />
        ))}
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
            <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="수업명, 태그, 교구 검색" className="h-11 w-full rounded-[12px] border bg-transparent pl-9 pr-3 text-[14px] font-semibold outline-none" style={{ borderColor: 'var(--spm-br2)', color: 'var(--spm-t)', background: 'var(--spm-s2)' }} />
          </label>
          <button type="button" onClick={onClose} className="grid h-11 w-11 place-items-center rounded-[12px]" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }} aria-label="검색 닫기">
            <X size={18} color="var(--spm-t2)" />
          </button>
        </div>
        <p className="mt-5 text-[12px] font-medium leading-6" style={{ color: 'var(--spm-t3)' }}>검색어를 입력하면 라이브러리 목록에 바로 반영됩니다.</p>
      </div>
    </div>
  );
}

// ─── Main View ───────────────────────────────────────────────────────────────

export default function LibraryView() {
  const isPro = useIsPro();
  const programs = useMasterStore((state) => state.programs);
  const classRecords = useMasterStore((state) => state.classRecords);
  const favorites = useMasterStore((state) => state.favorites);
  const toggleFavorite = useMasterStore((state) => state.toggleFavorite);
  const [mounted, setMounted] = useState(false);
  const [filter, setFilter] = useState('전체');
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [preview, setPreview] = useState<Program | null>(null);

  useEffect(() => { setMounted(true); }, []);

  const usedProgramIds = useMemo(() => new Set(classRecords.map((record) => record.programId)), [classRecords]);
  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return programs.filter((program) => {
      const text = [program.title, program.category, program.grade, program.space, program.description, ...program.tags, ...program.equipment].join(' ').toLowerCase();
      return matchFilter(program, filter) && (!keyword || text.includes(keyword));
    });
  }, [filter, query, programs]);

  if (!mounted) return <LibrarySkeleton />;

  const spomovePrograms = programs.filter((program) => program.tags.includes('SPOMOVE') || program.lessonDetail?.relatedSpomoveIds.length).slice(0, 5);
  const quickPrograms = programs.filter((program) => program.duration <= 18).slice(0, 5);
  const favoritePrograms = programs.filter((program) => favorites.includes(program.id));
  const resetFilters = () => { setFilter('전체'); setQuery(''); };

  return (
    <div className="h-full overflow-y-auto pb-7" style={{ background: 'var(--spm-bg)' }}>
      <header className="px-[22px] pb-5 pt-[22px] sm:px-8 lg:px-10">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--spm-t3)' }}>program library</p>
            <h1 className="mt-1 text-[32px] font-black md:text-[42px]" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)', letterSpacing: 0 }}>라이브러리</h1>
          </div>
          <span className="pb-1 text-[12px] font-bold" style={{ color: 'var(--spm-t2)' }}>{programs.length}개</span>
        </div>
        <button type="button" onClick={() => setSearchOpen(true)} className="mt-5 flex h-11 w-full items-center gap-3 rounded-[12px] px-3 text-left" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
          <Search size={17} color="var(--spm-t3)" />
          <span className="text-[13px] font-semibold" style={{ color: query ? 'var(--spm-t)' : 'var(--spm-t3)' }}>{query || '수업명, 태그, 교구 검색'}</span>
        </button>
      </header>

      <FeaturedRail programs={programs} onPreview={setPreview} />
      <SelectionGuide />

      <section className="scrollbar-hide mb-7 flex gap-2 overflow-x-auto px-[22px] sm:px-8 lg:px-10">
        {FILTERS.map((item) => <Chip key={item} label={item} active={filter === item} onClick={() => setFilter(item)} />)}
      </section>

      {favoritePrograms.length > 0 ? (
        <ProgramRail title="즐겨찾기" caption="자주 쓰는 수업" programs={favoritePrograms} isPro={isPro} usedProgramIds={usedProgramIds} favorites={favorites} onFavorite={toggleFavorite} onPreview={setPreview} />
      ) : null}

      <ProgramRail id="spomove-programs" title="SPOMOVE 연결 수업" caption="큰 화면 실행과 연결" programs={spomovePrograms} isPro={isPro} usedProgramIds={usedProgramIds} favorites={favorites} onFavorite={toggleFavorite} onPreview={setPreview} />
      <ProgramRail id="quick-programs" title="18분 이내 빠른 수업" caption="대체 수업용" programs={quickPrograms} isPro={isPro} usedProgramIds={usedProgramIds} favorites={favorites} onFavorite={toggleFavorite} onPreview={setPreview} />

      <section className="mb-7 px-[22px] sm:px-8 lg:px-10">
        <Link href="/spokedu-master/spomove" className="flex items-center gap-3 rounded-[14px] p-4" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px]" style={{ background: 'rgba(99,102,241,0.14)' }}><Zap size={19} color="var(--spm-acc)" /></span>
          <span className="min-w-0 flex-1">
            <strong className="block text-[14px]" style={{ color: 'var(--spm-t)' }}>SPOMOVE 플레이어</strong>
            <span className="mt-1 block text-[11px]" style={{ color: 'var(--spm-t3)' }}>프로젝터, 태블릿, 모바일에서 바로 실행</span>
          </span>
          <Smartphone size={18} color="var(--spm-t3)" />
        </Link>
      </section>

      <section className="px-[22px] sm:px-8 lg:px-10">
        <div className="mb-[14px] flex items-baseline justify-between gap-3">
          <h2 className="text-[18px] font-bold" style={{ fontFamily: 'var(--spm-font-display)' }}>전체 프로그램</h2>
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-medium" style={{ color: 'var(--spm-t3)' }}>{filtered.length}개</span>
            {filter !== '전체' || query ? <button type="button" onClick={resetFilters} className="rounded-full px-2.5 py-1 text-[11px] font-black" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)', color: 'var(--spm-t2)' }}>초기화</button> : null}
          </div>
        </div>
        {filtered.length > 0 ? (
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((program) => (
              <ProgramListItem
                key={program.id}
                program={program}
                locked={program.isPro && !isPro}
                used={usedProgramIds.has(program.id)}
                favorite={favorites.includes(program.id)}
                onFavorite={() => toggleFavorite(program.id)}
                onPreview={() => setPreview(program)}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-[14px] p-5 text-center" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
            <p className="text-[14px] font-bold" style={{ color: 'var(--spm-t)' }}>조건에 맞는 수업안이 없습니다.</p>
            <p className="mt-1 text-[12px]" style={{ color: 'var(--spm-t3)' }}>필터와 검색어를 조금 바꿔보세요.</p>
            <button type="button" onClick={resetFilters} className="mt-4 h-10 rounded-[12px] px-4 text-[12px] font-black text-white" style={{ background: 'var(--spm-acc)' }}>전체 보기</button>
          </div>
        )}
      </section>

      {searchOpen ? <SearchOverlay query={query} setQuery={setQuery} onClose={() => setSearchOpen(false)} /> : null}

      {preview ? (
        <ProgramSheet
          program={preview}
          isPro={isPro}
          favorite={favorites.includes(preview.id)}
          onFavorite={() => toggleFavorite(preview.id)}
          onClose={() => setPreview(null)}
        />
      ) : null}
    </div>
  );
}
