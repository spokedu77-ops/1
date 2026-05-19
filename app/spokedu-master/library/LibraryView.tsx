'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Bookmark,
  CheckCircle2,
  Clock,
  ExternalLink,
  Lock,
  MapPin,
  MonitorPlay,
  Play,
  Search,
  Smartphone,
  Users,
  X,
  Zap,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useIsPro, useMasterStore } from '../store';
import { LibrarySkeleton } from '../components/ui/Skeleton';
import { CategoryIcon, ProgramThumb } from '../components/ui/ProgramThumb';
import type { Program } from '../types';

const FILTERS = ['전체', '유아', '초등', 'SPOMOVE', '간편 준비', '좁은 공간', '협동', '민첩성'];

function hasSpomoveLink(program: Program) {
  return program.tags.includes('SPOMOVE') || (program.lessonDetail?.relatedSpomoveIds?.length ?? 0) > 0;
}

function hasCompleteLesson(program: Program) {
  return program.steps.length >= 3 && program.equipment.length > 0 && !!(program.description || program.lessonDetail?.objective);
}

function getHeroImage(program: Program) {
  return program.lessonDetail?.heroImageUrl || program.thumbnailUrl;
}

function getSpomoveUseLabel(program: Program) {
  const text = [program.title, program.category, program.description, ...program.tags, program.lessonDetail?.developmentFocus ?? ''].join(' ');
  if (/도입|워밍업|집중|인지|신호/.test(text)) return '도입 3분 집중 전환';
  if (/민첩|순발|방향|반응|스피드/.test(text)) return '수업 중 반응 전환';
  if (/마무리|정리|협동|기억/.test(text)) return '마무리 참여 게임';
  return '큰 화면 몰입 활동';
}

function matchFilter(program: Program, filter: string) {
  if (filter === '전체') return true;
  if (filter === '유아') return program.grade.includes('유아') || program.grade.includes('유치') || program.tags.includes('유아');
  if (filter === '초등') return program.grade.includes('초등');
  if (filter === 'SPOMOVE') return hasSpomoveLink(program);
  if (filter === '간편 준비') return program.tags.includes('준비물 없음') || program.equipment.length <= 2;
  if (filter === '좁은 공간') return program.space.includes('좁은') || program.space.includes('실내');
  if (filter === '협동') return program.tags.includes('협동') || program.category.includes('협동') || program.category.includes('협응');
  if (filter === '민첩성') return program.tags.includes('민첩성') || program.category.includes('민첩');
  return true;
}

function Chip({ label, count, active, onClick }: { label: string; count: number; active: boolean; onClick: () => void }) {
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
      {label}{count > 0 ? <span className="ml-1 text-[10px] opacity-60">{count}</span> : null}
    </button>
  );
}

function ProgramSheet({ program, isPro, favorite, onFavorite, onClose }: {
  program: Program;
  isPro: boolean;
  favorite: boolean;
  onFavorite: () => void;
  onClose: () => void;
}) {
  const router = useRouter();
  const locked = program.isPro && !isPro;
  const drills = useMasterStore((state) => state.drills);
  const detail = program.lessonDetail;
  const drillId = detail?.relatedSpomoveIds[0] ?? drills[0]?.id ?? 'speed-track';
  const connectedDrill = drills.find((d) => d.id === drillId);
  const heroImage = getHeroImage(program);
  const sheetRef = useRef<HTMLDivElement>(null);
  const ruleItems = detail?.rules?.length ? detail.rules : program.steps;

  useEffect(() => {
    const el = sheetRef.current;
    if (!el) return;
    el.style.transform = 'translateY(100%)';
    requestAnimationFrame(() => {
      el.style.transition = 'transform 0.3s cubic-bezier(0.32,0.72,0,1)';
      el.style.transform = 'translateY(0)';
    });
  }, []);

  const close = () => {
    const el = sheetRef.current;
    if (!el) { onClose(); return; }
    el.style.transform = 'translateY(100%)';
    setTimeout(onClose, 280);
  };

  const launch = () => {
    close();
    setTimeout(() => router.push(`/spokedu-master/spomove/session?drill=${drillId}&mode=projector&program=${program.id}`), 10);
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center" onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
      <div className="absolute inset-0 bg-black/80" style={{ backdropFilter: 'blur(8px)' }} onClick={close} />
      <div
        ref={sheetRef}
        className="relative z-10 w-full overflow-hidden rounded-t-[26px] pb-[env(safe-area-inset-bottom)] lg:mb-6 lg:max-w-[1020px] lg:rounded-[26px]"
        style={{ background: 'var(--spm-bg)', maxHeight: '94dvh', overflowY: 'auto', willChange: 'transform', boxShadow: '0 32px 100px rgba(0,0,0,0.56)' }}
      >
        {/* 모바일 드래그 핸들 */}
        <div className="flex justify-center pb-1 pt-3 lg:hidden">
          <div className="h-[4px] w-10 rounded-full" style={{ background: 'var(--spm-br2)' }} />
        </div>
        {/* 닫기 버튼 */}
        <button type="button" onClick={close} className="absolute right-4 top-4 z-20 grid h-9 w-9 place-items-center rounded-full bg-black/50 backdrop-blur-sm" aria-label="닫기">
          <X size={15} color="rgba(255,255,255,0.88)" />
        </button>

        <div className="lg:grid lg:min-h-[640px] lg:grid-cols-[1.1fr_0.9fr]">

          {/* ── 좌측: 히어로 비주얼 ── */}
          <section
            className="relative min-h-[260px] overflow-hidden lg:min-h-[640px]"
            style={heroImage ? undefined : {
              background: `radial-gradient(ellipse 80% 60% at 70% 40%, ${program.colors[2]}55 0%, transparent 65%), linear-gradient(155deg, ${program.colors[0]} 0%, ${program.colors[1]} 55%, ${program.colors[2]}cc 100%)`,
            }}
          >
            {heroImage ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={heroImage} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
                <div className="absolute inset-0" style={{ background: 'linear-gradient(160deg, rgba(0,0,0,0.06) 0%, rgba(0,0,0,0.38) 45%, rgba(0,0,0,0.82) 100%)' }} />
              </>
            ) : (
              <>
                {/* 대형 워터마크 아이콘 — 중앙 배치, 압도적 스케일 */}
                <span className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.07]" style={{ transform: 'translate(-50%, -52%) rotate(-8deg)' }} aria-hidden>
                  <CategoryIcon category={program.category} size={340} color="#fff" strokeWidth={0.42} />
                </span>
                {/* 하단 블러 광 */}
                <div className="pointer-events-none absolute -bottom-8 -right-8 h-52 w-52 rounded-full" style={{ background: program.colors[3], filter: 'blur(48px)', opacity: 0.42 }} />
                <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.04) 0%, rgba(0,0,0,0.72) 100%)' }} />
              </>
            )}

            {/* PRO 잠금 오버레이 */}
            {locked ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/55">
                <span className="grid h-14 w-14 place-items-center rounded-[16px]" style={{ background: 'rgba(245,158,11,0.16)', border: '1px solid rgba(245,158,11,0.3)' }}>
                  <Lock size={24} color="var(--spm-amb)" />
                </span>
                <p className="text-[12px] font-black text-white/70">Pro 전용 수업 패키지</p>
              </div>
            ) : null}

            {/* 히어로 하단 콘텐츠 */}
            <div className="absolute inset-x-0 bottom-0 p-5 lg:p-7">
              {/* 배지 */}
              <div className="mb-3 flex flex-wrap gap-1.5">
                <span className="rounded-full px-2.5 py-1 text-[10px] font-black text-white/75" style={{ background: 'rgba(0,0,0,0.42)', border: '1px solid rgba(255,255,255,0.1)' }}>{program.category}</span>
                {program.isPro ? <span className="rounded-full px-2.5 py-1 text-[10px] font-black" style={{ background: 'rgba(245,158,11,0.28)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.3)' }}>PRO</span> : null}
                {hasSpomoveLink(program) ? <span className="rounded-full px-2.5 py-1 text-[10px] font-black" style={{ background: 'rgba(99,102,241,0.32)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.3)' }}>SPOMOVE 연계</span> : null}
              </div>
              {/* 제목 */}
              <h2 className="max-w-[640px] text-[32px] font-black leading-[1.06] text-white sm:text-[42px] lg:text-[44px]" style={{ fontFamily: 'var(--spm-font-display)', letterSpacing: '-0.01em', wordBreak: 'keep-all', textShadow: '0 2px 16px rgba(0,0,0,0.5)' }}>
                {program.title}
              </h2>
              {/* 설명 */}
              <p className="mt-2.5 max-w-[560px] text-[13px] font-medium leading-6 text-white/65">
                {program.description || detail?.objective || '현장에서 바로 실행할 수 있는 SPOKEDU 수업 패키지입니다.'}
              </p>
              {/* 메타 pill 한 줄 */}
              <div className="mt-3 flex flex-wrap gap-1.5">
                {[
                  { icon: Users, label: program.grade },
                  { icon: Clock, label: `${program.duration}분` },
                  { icon: MapPin, label: program.space },
                ].map(({ icon: Icon, label }) => (
                  <span key={label} className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold text-white/80" style={{ background: 'rgba(0,0,0,0.32)', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <Icon size={10} />
                    {label}
                  </span>
                ))}
              </div>
              {/* 영상 버튼 */}
              {!locked && detail?.videoUrl ? (
                <a href={detail.videoUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex h-9 items-center gap-2 rounded-[10px] px-3 text-[11px] font-black text-white" style={{ background: 'rgba(255,255,255,0.13)', border: '1px solid rgba(255,255,255,0.16)' }}>
                  <Play size={11} fill="#fff" />참고 영상 보기
                </a>
              ) : null}
            </div>
          </section>

          {/* ── 우측: 정보 + CTA ── */}
          <section className="flex flex-col px-4 pb-5 pt-4 lg:overflow-y-auto lg:px-6 lg:py-5">

            {/* 상단: 즐겨찾기 */}
            <div className="mb-4 flex items-center justify-between">
              <p className="text-[10px] font-black uppercase tracking-[0.16em]" style={{ color: 'var(--spm-t3)' }}>수업 패키지 프리뷰</p>
              <button type="button" onClick={onFavorite} className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px]" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }} aria-label="즐겨찾기">
                <Bookmark size={15} color={favorite ? '#fbbf24' : 'var(--spm-t3)'} fill={favorite ? '#fbbf24' : 'none'} />
              </button>
            </div>

            {/* ① CTA — Netflix처럼 모달 열자마자 액션 버튼 먼저 */}
            <div className="mb-5 flex flex-col gap-2">
              {locked ? (
                <>
                  <Link href="/spokedu-master/payment?plan=pro" className="flex h-13 w-full items-center justify-center gap-2 rounded-[14px] text-[14px] font-black text-white" style={{ background: 'var(--spm-acc)', boxShadow: '0 8px 28px rgba(99,102,241,0.35)', height: 52 }}>
                    <Zap size={15} />Pro로 전체 수업안 보기
                  </Link>
                  <Link href={`/spokedu-master/library/${program.id}`} className="flex h-11 w-full items-center justify-center rounded-[13px] text-[12px] font-bold" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)', color: 'var(--spm-t2)' }}>
                    미리보기만 보기
                  </Link>
                </>
              ) : (
                <>
                  <Link href={`/spokedu-master/class-mode/${program.id}`} onClick={close} className="flex w-full items-center justify-center gap-2 rounded-[14px] text-[14px] font-black text-white" style={{ background: 'var(--spm-acc)', boxShadow: '0 8px 28px rgba(99,102,241,0.3)', height: 52 }}>
                    <Play size={15} fill="#fff" />수업 시작
                  </Link>
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={launch} className="flex h-11 items-center justify-center gap-2 rounded-[12px] text-[12px] font-bold" style={{ background: 'linear-gradient(135deg,rgba(99,102,241,0.14),rgba(16,185,129,0.08))', border: '1px solid rgba(99,102,241,0.22)', color: '#a5b4fc' }}>
                      <Zap size={13} />연결 SPOMOVE
                    </button>
                    <Link href={`/spokedu-master/library/${program.id}`} onClick={close} className="flex h-11 items-center justify-center gap-2 rounded-[12px] text-[12px] font-bold" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)', color: 'var(--spm-t2)' }}>
                      <ExternalLink size={13} />수업안 전체
                    </Link>
                  </div>
                </>
              )}
            </div>

            {/* ② 연결 SPOMOVE — 구독 핵심 가치 강조 */}
            <div className="mb-5 rounded-[16px] p-4" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.18), rgba(16,185,129,0.09))', border: '1px solid rgba(99,102,241,0.28)' }}>
              <p className="mb-2 text-[9px] font-black uppercase tracking-[0.16em]" style={{ color: '#818cf8' }}>connected spomove</p>
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px]" style={{ background: 'rgba(99,102,241,0.22)' }}>
                  <Zap size={18} color="#a5b4fc" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-black" style={{ color: 'var(--spm-t)' }}>{connectedDrill?.name ?? 'SPOMOVE 큰 화면'}</p>
                  <p className="mt-0.5 text-[11px] font-semibold" style={{ color: 'var(--spm-t3)' }}>{getSpomoveUseLabel(program)}</p>
                </div>
                <button type="button" onClick={launch} className="shrink-0 rounded-[10px] px-3 py-2 text-[11px] font-black" style={{ background: 'rgba(99,102,241,0.2)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.24)' }}>
                  <MonitorPlay size={14} />
                </button>
              </div>
            </div>

            {/* ③ 수업 핵심 — objective + developmentFocus */}
            {(detail?.objective || detail?.developmentFocus) ? (
              <div className="mb-4 rounded-[14px] p-4" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br)' }}>
                {(
                  [['수업 목표', detail?.objective], ['발달 포인트', detail?.developmentFocus]] as [string, string | undefined][]
                ).filter(([, v]) => !!v).map(([label, value]) => (
                  <div key={label} className="mb-3 last:mb-0">
                    <p className="text-[9px] font-black uppercase tracking-[0.12em]" style={{ color: 'var(--spm-t3)' }}>{label}</p>
                    <p className="mt-0.5 text-[13px] font-semibold leading-5" style={{ color: locked ? 'transparent' : 'var(--spm-t)', textShadow: locked ? '0 0 8px rgba(255,255,255,0.18)' : 'none', filter: locked ? 'blur(4px)' : 'none', userSelect: locked ? 'none' : 'auto' }}>{value}</p>
                  </div>
                ))}
                {locked ? (
                  <p className="mt-2 text-[10px] font-black" style={{ color: 'var(--spm-amb)' }}>Pro에서 전체 확인</p>
                ) : null}
              </div>
            ) : null}

            {/* ④ 진행 단계 — 2개만 */}
            {ruleItems.length > 0 ? (
              <div className="mb-4">
                <p className="mb-2 text-[11px] font-black uppercase tracking-[0.1em]" style={{ color: 'var(--spm-t3)' }}>진행 단계</p>
                <ol className="space-y-1.5">
                  {ruleItems.slice(0, locked ? 1 : 2).map((step, i) => (
                    <li key={i} className="flex gap-2.5 rounded-[11px] p-3" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br)' }}>
                      <span className="mt-px grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] font-black text-white" style={{ background: 'var(--spm-acc)' }}>{i + 1}</span>
                      <p className="text-[12px] font-medium leading-5" style={{ color: 'var(--spm-t)' }}>{step}</p>
                    </li>
                  ))}
                </ol>
                {ruleItems.length > 2 ? (
                  <Link href={`/spokedu-master/library/${program.id}`} onClick={close} className="mt-2 block text-center text-[11px] font-semibold" style={{ color: 'var(--spm-acc)' }}>
                    전체 {ruleItems.length}단계 보기
                  </Link>
                ) : null}
              </div>
            ) : null}

            {/* ⑤ 학부모 문구 미리보기 — 구독 가치 직결 */}
            {detail?.parentNote ? (
              <div className="mb-2 overflow-hidden rounded-[14px]" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
                <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--spm-br)' }}>
                  <p className="text-[9px] font-black uppercase tracking-[0.12em]" style={{ color: 'var(--spm-t3)' }}>학부모 설명 문구</p>
                  {!locked ? (
                    <Link href={`/spokedu-master/report?program=${program.id}`} onClick={close} className="text-[10px] font-black" style={{ color: 'var(--spm-acc)' }}>전체 보기</Link>
                  ) : (
                    <Link href="/spokedu-master/payment?plan=pro" className="text-[10px] font-black" style={{ color: 'var(--spm-amb)' }}>Pro 전용</Link>
                  )}
                </div>
                <p className={`line-clamp-3 px-4 py-3 text-[12px] font-medium leading-6 ${locked ? 'select-none' : ''}`} style={{ color: locked ? 'transparent' : 'var(--spm-t2)', filter: locked ? 'blur(5px)' : 'none' }}>{detail.parentNote}</p>
              </div>
            ) : null}

          </section>
        </div>
      </div>
    </div>
  );
}

function PosterCard({ program, locked, used, favorite, onFavorite, onPreview }: {
  program: Program;
  locked: boolean;
  used: boolean;
  favorite: boolean;
  onFavorite: () => void;
  onPreview: () => void;
}) {
  const heroImage = getHeroImage(program);
  const visualHeight = heroImage ? 118 : 130;
  const infoHeight = heroImage ? 52 : 90;

  return (
    <div className="relative shrink-0 overflow-hidden rounded-[14px] lg:w-full" style={{ width: heroImage ? 218 : 146, height: visualHeight + infoHeight, background: 'var(--spm-s2)', border: '1px solid var(--spm-br)' }}>
      <div className="absolute inset-x-0 top-0 overflow-hidden" style={{ height: visualHeight, background: heroImage ? '#111' : `linear-gradient(155deg, ${program.colors[0]} 0%, ${program.colors[1]} 55%, ${program.colors[2]} 100%)` }}>
        {heroImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={heroImage} alt="" className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <>
            <div className="pointer-events-none absolute right-[-12px] top-[8%] opacity-[0.11]">
              <CategoryIcon category={program.category} size={132} color="#fff" strokeWidth={0.52} />
            </div>
            <div className="pointer-events-none absolute -bottom-6 -left-6 h-28 w-28 rounded-full" style={{ background: program.colors[2], filter: 'blur(30px)', opacity: 0.36 }} />
          </>
        )}
        <div className="absolute left-2 top-2 flex gap-1">
          {program.isNew ? <span className="rounded-[4px] bg-emerald-400 px-1.5 py-0.5 text-[9px] font-black text-emerald-950">NEW</span> : null}
          {program.isHot ? <span className="rounded-[4px] px-1.5 py-0.5 text-[9px] font-black text-black" style={{ background: '#f59e0b' }}>HOT</span> : null}
          {used ? <span className="rounded-[4px] bg-black/40 px-1.5 py-0.5 text-[9px] font-black text-white/70">사용</span> : null}
        </div>
        {locked ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black/54">
            <span className="rounded-full px-2.5 py-1 text-[10px] font-black" style={{ background: 'rgba(245,158,11,0.18)', color: 'var(--spm-amb)' }}>PRO</span>
          </div>
        ) : null}
        {!locked && hasSpomoveLink(program) ? (
          <span className="absolute bottom-1.5 left-2 flex items-center gap-0.5 rounded-[5px] px-1.5 py-0.5 text-[9px] font-black" style={{ background: 'rgba(99,102,241,0.85)', color: '#e0e7ff' }}>
            <Zap size={8} />SPOMOVE
          </span>
        ) : null}
      </div>

      <div className="absolute inset-x-0 bottom-0 px-3 py-2.5" style={{ top: visualHeight }}>
        <p className="text-[9px] font-black uppercase tracking-[0.08em]" style={{ color: 'var(--spm-acc)' }}>{program.category}</p>
        <p className={`mt-0.5 font-bold leading-[1.3] ${heroImage ? 'truncate text-[12px]' : 'line-clamp-2 text-[13px]'}`} style={{ color: 'var(--spm-t)' }}>{program.title}</p>
        {!heroImage ? <p className="mt-1.5 text-[10px] font-medium" style={{ color: 'var(--spm-t3)' }}>{program.grade} · {program.duration}분 · {program.space}</p> : null}
      </div>

      <button type="button" onClick={onPreview} className="absolute inset-0" aria-label={program.title} />
      <button type="button" onClick={onFavorite} className="absolute right-1.5 top-1.5 z-10 grid h-8 w-8 place-items-center rounded-full bg-black/40" aria-label={`${program.title} 즐겨찾기`}>
        <Bookmark size={13} color="#fff" fill={favorite ? '#fff' : 'none'} />
      </button>
    </div>
  );
}

function ProgramListItem({ program, locked, used, favorite, onFavorite, onPreview }: {
  program: Program;
  locked: boolean;
  used: boolean;
  favorite: boolean;
  onFavorite: () => void;
  onPreview: () => void;
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
          {hasSpomoveLink(program) ? <span className="rounded-full px-2 py-0.5 text-[9px] font-black" style={{ background: 'rgba(99,102,241,0.14)', color: '#a5b4fc' }}>SPOMOVE</span> : null}
          {hasCompleteLesson(program) ? <span className="rounded-full px-2 py-0.5 text-[9px] font-black" style={{ background: 'rgba(16,185,129,0.12)', color: 'var(--spm-grn)' }}>수업안</span> : null}
        </div>
        <h2 className="truncate text-[14px] font-bold" style={{ color: 'var(--spm-t)' }}>{program.title}</h2>
        <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5">
          <span className="flex items-center gap-1 text-[11px] font-medium" style={{ color: 'var(--spm-t3)' }}><Users size={10} />{program.grade}</span>
          <span className="flex items-center gap-1 text-[11px] font-medium" style={{ color: 'var(--spm-t3)' }}><Clock size={10} />{program.duration}분</span>
          <span className="flex items-center gap-1 text-[11px] font-medium" style={{ color: 'var(--spm-t3)' }}><MapPin size={10} />{program.space}</span>
        </div>
        {program.tags.length > 0 ? <p className="mt-2 line-clamp-1 text-[11px] font-medium" style={{ color: 'var(--spm-t2)' }}>{program.tags.slice(0, 4).join(' · ')}</p> : null}
      </div>
      <button type="button" onClick={onFavorite} className="relative z-10 grid h-9 w-9 shrink-0 place-items-center rounded-[10px]" style={{ background: 'var(--spm-s3)' }} aria-label={`${program.title} 즐겨찾기`}>
        <Bookmark size={15} color={favorite ? 'var(--spm-amb)' : 'var(--spm-t3)'} fill={favorite ? 'var(--spm-amb)' : 'none'} />
      </button>
      {locked ? <div className="absolute inset-0 flex items-center justify-end rounded-[14px] bg-black/48 pr-5"><span className="rounded-full px-3 py-1 text-[10px] font-black" style={{ background: 'rgba(245,158,11,0.14)', color: 'var(--spm-amb)' }}>PRO 필요</span></div> : null}
    </div>
  );
}

function FeaturedRail({ programs, onPreview }: { programs: Program[]; onPreview: (p: Program) => void }) {
  const now = new Date();
  const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000);
  const featured = programs.length > 0 ? programs[dayOfYear % programs.length] : undefined;
  if (!featured) return null;
  const heroImage = getHeroImage(featured);

  return (
    <section className="mb-7 px-[22px] sm:px-8 lg:px-10">
      <button type="button" onClick={() => onPreview(featured)} className="relative w-full overflow-hidden rounded-[18px] text-left active:scale-[0.99]" style={{ minHeight: 250, boxShadow: '0 22px 52px rgba(0,0,0,0.42)' }}>
        {heroImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={heroImage} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${featured.colors[0]}, ${featured.colors[1]}, ${featured.colors[2]})` }} />
        )}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.38) 60%, rgba(0,0,0,0.18) 100%)' }} />
        {!heroImage ? (
          <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 opacity-[0.06]" aria-hidden>
            <CategoryIcon category={featured.category} size={160} color="#fff" strokeWidth={0.7} />
          </span>
        ) : null}
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

function SituationGuide() {
  const situations = [
    {
      label: '지금 수업 10분 남았어요',
      sub: '준비물 없이 바로 쓸 수 있는 수업',
      href: '#quick-programs',
      tone: 'var(--spm-amb)',
      bg: 'rgba(245,158,11,0.1)',
      Icon: Clock,
    },
    {
      label: 'SPOMOVE 큰 화면이 준비됐어요',
      sub: '프로젝터 · 태블릿 반응훈련 연계',
      href: '#spomove-programs',
      tone: '#818cf8',
      bg: 'rgba(99,102,241,0.12)',
      Icon: Zap,
    },
    {
      label: '완성된 수업안이 필요해요',
      sub: '수업안 + 설명문구 세트 패키지',
      href: '#all-programs',
      tone: 'var(--spm-grn)',
      bg: 'rgba(16,185,129,0.1)',
      Icon: CheckCircle2,
    },
  ] as const;

  return (
    <section className="mb-7 grid gap-2 px-[22px] sm:grid-cols-3 sm:px-8 lg:px-10">
      {situations.map(({ label, sub, href, tone, bg, Icon }) => (
        <Link key={label} href={href} className="flex min-h-[82px] items-center gap-3 rounded-[14px] p-3 active:scale-[0.98]" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px]" style={{ background: bg }}>
            <Icon size={17} color={tone} />
          </span>
          <span className="min-w-0">
            <strong className="block text-[13px]" style={{ color: 'var(--spm-t)' }}>{label}</strong>
            <span className="mt-1 block text-[11px] font-semibold leading-4" style={{ color: 'var(--spm-t3)' }}>{sub}</span>
          </span>
        </Link>
      ))}
    </section>
  );
}

function SubscriptionValueStrip({ programs }: { programs: Program[] }) {
  const readyCount = programs.filter(hasCompleteLesson).length;
  const spomoveCount = programs.filter(hasSpomoveLink).length;
  const values = [
    {
      Icon: CheckCircle2,
      tone: 'var(--spm-grn)',
      bg: 'rgba(16,185,129,0.1)',
      label: `${readyCount}개 완성 패키지`,
      sub: '수업안 + SPOMOVE + 설명문구',
    },
    {
      Icon: Zap,
      tone: '#818cf8',
      bg: 'rgba(99,102,241,0.12)',
      label: `${spomoveCount}개 SPOMOVE 연계`,
      sub: '큰 화면 실행 즉시 이어짐',
    },
    {
      Icon: Play,
      tone: 'var(--spm-amb)',
      bg: 'rgba(245,158,11,0.12)',
      label: '90초 수업 준비',
      sub: '수업안 → 실행 → 문구 3탭 완성',
    },
  ] as const;
  return (
    <section className="mb-7 grid gap-2 px-[22px] sm:grid-cols-3 sm:px-8 lg:px-10">
      {values.map(({ Icon, tone, bg, label, sub }) => (
        <div key={label} className="flex items-center gap-3 rounded-[14px] p-3.5" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px]" style={{ background: bg }}>
            <Icon size={17} color={tone} />
          </span>
          <span>
            <strong className="block text-[14px] font-black" style={{ color: 'var(--spm-t)' }}>{label}</strong>
            <span className="mt-0.5 block text-[11px] font-semibold leading-4" style={{ color: 'var(--spm-t3)' }}>{sub}</span>
          </span>
        </div>
      ))}
    </section>
  );
}

function ProgramRail({ id, title, caption, programs, isPro, usedProgramIds, favorites, onFavorite, onPreview }: {
  id?: string;
  title: string;
  caption: string;
  programs: Program[];
  isPro: boolean;
  usedProgramIds: Set<string>;
  favorites: string[];
  onFavorite: (id: string) => void;
  onPreview: (p: Program) => void;
}) {
  if (!programs.length) return null;
  return (
    <section id={id} className="mb-7 scroll-mt-20">
      <div className="mb-[14px] flex items-baseline justify-between px-[22px] sm:px-8 lg:px-10">
        <h2 className="text-[18px] font-bold" style={{ fontFamily: 'var(--spm-font-display)' }}>{title}</h2>
        <span className="text-[12px] font-medium" style={{ color: 'var(--spm-t3)' }}>{caption}</span>
      </div>
      <div className="scrollbar-hide flex gap-[9px] overflow-x-auto px-[22px] sm:px-8 lg:grid lg:grid-cols-5 lg:overflow-visible lg:px-10">
        {programs.map((program) => (
          <PosterCard
            key={`${title}-${program.id}`}
            program={program}
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
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="수업명, 태그, 교구 검색"
              className="h-11 w-full rounded-[12px] border bg-transparent pl-9 pr-3 text-[14px] font-semibold outline-none"
              style={{ borderColor: 'var(--spm-br2)', color: 'var(--spm-t)', background: 'var(--spm-s2)' }}
            />
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

export default function LibraryView() {
  const isPro = useIsPro();
  const programs = useMasterStore((state) => state.programs);
  const classRecords = useMasterStore((state) => state.classRecords);
  const favorites = useMasterStore((state) => state.favorites);
  const toggleFavorite = useMasterStore((state) => state.toggleFavorite);
  const programsLoaded = useMasterStore((state) => state.programsLoaded);
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

  if (!mounted || !programsLoaded) return <LibrarySkeleton />;

  const spomoveTagged = programs.filter(hasSpomoveLink);
  const spomovePrograms = (spomoveTagged.length > 0 ? spomoveTagged : programs.filter((program) => program.duration <= 15)).slice(0, 5);
  const quickPrograms = programs.filter((program) => program.duration <= 18).slice(0, 5);
  const noPrepPrograms = programs.filter((program) => program.equipment.length <= 2 || program.tags.includes('준비물 없음')).slice(0, 5);
  const smallSpacePrograms = programs.filter((program) => program.space.includes('좁은') || program.space.includes('실내')).slice(0, 5);
  const favoritePrograms = programs.filter((program) => favorites.includes(program.id));
  const resetFilters = () => { setFilter('전체'); setQuery(''); };

  const filterCounts = Object.fromEntries(
    FILTERS.map((item) => [item, item === '전체' ? programs.length : programs.filter((program) => matchFilter(program, item)).length])
  );

  return (
    <div className="h-full overflow-y-auto pb-7" style={{ background: 'var(--spm-bg)' }}>
      <header className="px-[22px] pb-5 pt-[22px] sm:px-8 lg:px-10">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--spm-t3)' }}>program library</p>
            <h1 className="mt-1 text-[32px] font-black md:text-[42px]" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)', letterSpacing: 0 }}>라이브러리</h1>
            <p className="mt-2 max-w-[680px] text-[13px] font-medium leading-6" style={{ color: 'var(--spm-t2)' }}>센터 커리큘럼을 구독자용 수업 패키지로 재구성합니다. 수업안, 큰 화면 SPOMOVE, 설명 문구까지 이어지는 콘텐츠가 핵심입니다.</p>
          </div>
          <span className="pb-1 text-[12px] font-bold" style={{ color: 'var(--spm-t2)' }}>{programs.length}개</span>
        </div>
        <button type="button" onClick={() => setSearchOpen(true)} className="mt-5 flex h-11 w-full items-center gap-3 rounded-[12px] px-3 text-left" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
          <Search size={17} color="var(--spm-t3)" />
          <span className="text-[13px] font-semibold" style={{ color: query ? 'var(--spm-t)' : 'var(--spm-t3)' }}>{query || '수업명, 태그, 교구 검색'}</span>
        </button>
      </header>

      <FeaturedRail programs={programs} onPreview={setPreview} />
      <SubscriptionValueStrip programs={programs} />
      <SituationGuide />

      <section className="scrollbar-hide mb-7 flex gap-2 overflow-x-auto px-[22px] sm:px-8 lg:px-10">
        {FILTERS.filter((item) => item === '전체' || (filterCounts[item] ?? 0) > 0).map((item) => (
          <Chip key={item} label={item} count={item === '전체' ? 0 : (filterCounts[item] ?? 0)} active={filter === item} onClick={() => setFilter(item)} />
        ))}
      </section>

      {favoritePrograms.length > 0 ? (
        <ProgramRail title="즐겨찾기" caption="자주 쓰는 수업" programs={favoritePrograms} isPro={isPro} usedProgramIds={usedProgramIds} favorites={favorites} onFavorite={toggleFavorite} onPreview={setPreview} />
      ) : null}

      <ProgramRail id="spomove-programs" title="SPOMOVE 연결 수업" caption="큰 화면 실행과 연결" programs={spomovePrograms} isPro={isPro} usedProgramIds={usedProgramIds} favorites={favorites} onFavorite={toggleFavorite} onPreview={setPreview} />
      <ProgramRail id="quick-programs" title="18분 이내 빠른 수업" caption="대체 수업용" programs={quickPrograms} isPro={isPro} usedProgramIds={usedProgramIds} favorites={favorites} onFavorite={toggleFavorite} onPreview={setPreview} />
      <ProgramRail title="준비물 적은 수업" caption="현장에서 바로 운영" programs={noPrepPrograms} isPro={isPro} usedProgramIds={usedProgramIds} favorites={favorites} onFavorite={toggleFavorite} onPreview={setPreview} />
      <ProgramRail title="실내·좁은 공간 수업" caption="교실·소규모 공간 대응" programs={smallSpacePrograms} isPro={isPro} usedProgramIds={usedProgramIds} favorites={favorites} onFavorite={toggleFavorite} onPreview={setPreview} />

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

      <section id="all-programs" className="scroll-mt-20 px-[22px] sm:px-8 lg:px-10">
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
            <p className="text-[14px] font-bold" style={{ color: 'var(--spm-t)' }}>조건에 맞는 수업이 없습니다.</p>
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
