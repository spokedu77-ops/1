'use client';

import { ExternalLink, Play, X, ZoomIn } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useRef, useState, type ReactNode, type Ref } from 'react';

import { TrackedVideoIframe } from '../../../components/lesson/TrackedVideoIframe';
import type { LessonDisplayModel } from '../../../lib/lessonDisplayModel';
import { canOptimizeRemoteImage } from '../../../lib/mediaPreferences';
import { getVideoThumbnail, isRemoteImage } from '../../../lib/program-media';

type VideoProps = { embedUrl?: string; directUrl?: string; externalUrl?: string; sourceUrl?: string; autoplay: boolean; onPlaybackStarted: () => void };

const PANEL_CLASS = 'flex h-full min-w-0 flex-col';
const PANEL_HEADING_CLASS = 'm-0 flex min-h-7 items-center text-[21px] font-black leading-7 tracking-[-0.025em] text-[color:var(--spm-t)]';
const PANEL_BODY_CLASS = 'mt-4 min-h-0 flex-1';

export function splitLessonTitle(title: string): { koreanTitle: string; englishTitle: string | null } {
  const value = title.trim();
  const match = value.match(/^(.*?)\s*\(([^()]+)\)\s*$/);
  if (!match) return { koreanTitle: value, englishTitle: null };
  const koreanTitle = match[1]?.trim() || value;
  const englishTitle = match[2]?.trim() || null;
  return { koreanTitle, englishTitle };
}

function SetupImage({ title, src }: { title: string; src: string }) {
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const trigger = triggerRef.current;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKeyDown);
    return () => { document.body.style.overflow = overflow; window.removeEventListener('keydown', onKeyDown); trigger?.focus(); };
  }, [open]);
  return <>
    <div className="relative flex h-full min-h-0 items-center justify-center overflow-hidden rounded-[14px] bg-[color-mix(in_srgb,var(--spm-s3)_55%,white)] p-3 sm:p-4">
      <Image src={src} alt={`${title} 초기 교구 세팅`} width={1200} height={900} priority sizes="(min-width: 900px) 48vw, 100vw" className="mx-auto max-h-full w-full object-contain" unoptimized={isRemoteImage(src) && !canOptimizeRemoteImage(src)} />
      <button ref={triggerRef} type="button" onClick={() => setOpen(true)} className="absolute bottom-3 right-3 inline-flex min-h-11 items-center gap-2 rounded-[10px] border border-white/80 bg-white/95 px-3.5 text-[13px] font-black text-slate-800 shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--spm-acc)]"><ZoomIn className="h-4 w-4" /> 이미지 확대</button>
    </div>
    {open ? <div role="dialog" aria-modal="true" aria-labelledby="setup-image-dialog-title" className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/85 p-4 sm:p-8" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}><div className="flex max-h-full w-full max-w-6xl flex-col overflow-hidden rounded-[16px] bg-white"><div className="flex min-h-14 items-center justify-between border-b px-4 sm:px-5"><h2 id="setup-image-dialog-title" className="truncate text-[16px] font-black">{title} 초기 교구 세팅</h2><button ref={closeRef} type="button" onClick={() => setOpen(false)} className="inline-flex h-11 w-11 items-center justify-center rounded-[10px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--spm-acc)]" aria-label="확대 이미지 닫기"><X /></button></div><div className="min-h-0 overflow-auto bg-slate-100 p-3 sm:p-5"><Image src={src} alt={`${title} 초기 교구 세팅 확대 이미지`} width={1600} height={1200} sizes="100vw" className="mx-auto h-auto max-h-[calc(100dvh-8rem)] w-auto max-w-full object-contain" unoptimized={isRemoteImage(src) && !canOptimizeRemoteImage(src)} /></div></div></div> : null}
  </>;
}

function LessonVideo({ model, video }: { model: LessonDisplayModel; video: VideoProps }) {
  const poster = model.setupImageUrl ?? getVideoThumbnail(video.sourceUrl) ?? undefined;
  if (!video.embedUrl && !video.directUrl && !video.externalUrl) return <div className="grid aspect-video place-items-center rounded-[14px] bg-slate-100 text-[15px] font-bold text-slate-500">등록된 수업 영상이 없습니다.</div>;
  return <div className="relative aspect-video w-full overflow-hidden rounded-[14px] bg-slate-950 shadow-[0_14px_34px_rgba(15,23,42,0.12)]">
    {video.embedUrl ? <TrackedVideoIframe key={video.embedUrl} src={video.embedUrl} title={`${model.title} 수업 영상`} className="h-full w-full" onPlaybackStarted={video.onPlaybackStarted} posterUrl={poster} deferUntilPlay={!video.autoplay} /> : null}
    {video.directUrl ? <video src={video.directUrl} className="h-full w-full object-contain" controls playsInline autoPlay={video.autoplay} muted={video.autoplay} preload="none" poster={poster} onPlay={video.onPlaybackStarted} /> : null}
    {video.externalUrl ? <div className="grid h-full place-items-center p-6 text-center text-white"><div><Play className="mx-auto h-9 w-9" /><a href={video.externalUrl} target="_blank" rel="noreferrer" onClick={video.onPlaybackStarted} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-[10px] bg-white px-5 text-[14px] font-black text-slate-900">영상 열기 <ExternalLink className="h-4 w-4" /></a></div></div> : null}
  </div>;
}

function MethodColumn({ model }: { model: LessonDisplayModel }) {
  return <div data-detail-panel="method" className={PANEL_CLASS}><h2 className={PANEL_HEADING_CLASS}>진행 방법</h2><div className={PANEL_BODY_CLASS}><ol className="m-0 divide-y divide-slate-200/80">{model.activityMethod.map((item, index) => <li key={`${index}-${item}`} className="grid grid-cols-[32px_minmax(0,1fr)] gap-3 py-3.5 first:pt-0"><span className="pt-0.5 text-[14px] font-black tabular-nums text-[var(--spm-acc)]">{String(index + 1).padStart(2, '0')}</span><p className="m-0 break-keep text-[15px] font-semibold leading-[1.65] text-[color:var(--spm-t)]">{item}</p></li>)}</ol>{model.variationMethod.length > 0 ? <section className="mt-6 border-t border-slate-200 pt-5"><h3 className="m-0 text-[17px] font-black tracking-[-0.015em] text-[color:var(--spm-t)]">난이도 조절 · 변형 활동</h3><ul className="m-0 mt-3 space-y-2.5">{model.variationMethod.map((item, index) => <li key={`${index}-${item}`} className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-2.5"><span className="mt-0.5 rounded-full bg-[color-mix(in_srgb,var(--spm-acc)_8%,white)] px-2.5 py-1 text-[12px] font-black text-[var(--spm-acc)]">변형 {index + 1}</span><p className="m-0 break-keep text-[14px] font-semibold leading-[1.65] text-[color:var(--spm-t2)] sm:text-[15px]">{item}</p></li>)}</ul></section> : null}</div></div>;
}

function OverviewColumn({ model }: { model: LessonDisplayModel }) {
  return <div data-detail-panel="overview" className={PANEL_CLASS}><h2 className={PANEL_HEADING_CLASS}>수업 한눈에 보기</h2><div className={`${PANEL_BODY_CLASS} divide-y divide-slate-200/90 rounded-[14px] bg-white px-5 sm:px-6`}>{model.equipment.length > 0 ? <section className="py-5 first:pt-5"><h3 className="m-0 text-[15px] font-black text-[color:var(--spm-t)]">준비물</h3><div className="mt-3 flex flex-wrap gap-2">{model.equipment.map((item) => <span key={item} className="max-w-full break-words rounded-[9px] bg-[var(--spm-s3)] px-3 py-1.5 text-[14px] font-bold text-[color:var(--spm-t2)]">{item}</span>)}</div></section> : null}{model.coachScript ? <section className="py-5"><h3 className="m-0 text-[15px] font-black text-[color:var(--spm-t)]">스크립트</h3><p className="m-0 mt-3 whitespace-pre-line break-keep border-l-2 border-[color-mix(in_srgb,var(--spm-acc)_35%,white)] pl-4 text-[15px] font-semibold leading-[1.72] text-[color:var(--spm-t2)]">{model.coachScript}</p></section> : null}{model.briefingNotes.length > 0 ? <section className="py-5"><h3 className="m-0 text-[15px] font-black text-[color:var(--spm-t)]">사전교육</h3><ul className="m-0 mt-3 space-y-2">{model.briefingNotes.map((item, index) => <li key={`${index}-${item}`} className="grid grid-cols-[6px_minmax(0,1fr)] gap-3 text-[15px] font-semibold leading-[1.65] text-[color:var(--spm-t2)]"><span aria-hidden className="mt-[10px] h-1.5 w-1.5 rounded-full bg-slate-300" /><span className="break-keep">{item}</span></li>)}</ul></section> : null}</div></div>;
}

export function DetailLessonGuide({ model, actions, video, heroTitleRef }: { model: LessonDisplayModel; actions: ReactNode; video: VideoProps; heroTitleRef?: Ref<HTMLHeadingElement> }) {
  const title = splitLessonTitle(model.title);
  const hasOverview = model.equipment.length > 0 || Boolean(model.coachScript) || model.briefingNotes.length > 0;
  return <div>
    <header className="mx-auto max-w-[980px] px-1 pb-12 pt-8 text-center sm:pb-14 sm:pt-10">
      <h1 ref={heroTitleRef} data-detail-hero-title className="mx-auto max-w-[900px] break-keep text-[30px] font-black leading-[1.2] tracking-[-0.04em] text-[color:var(--spm-t)] sm:text-[34px]">{title.koreanTitle}</h1>
      {title.englishTitle ? <p data-detail-english-title className="mx-auto mt-2 max-w-[760px] break-words text-[15px] font-semibold leading-6 text-[color:var(--spm-t3)] sm:text-[17px]">{title.englishTitle}</p> : null}
      <div data-detail-public-tags className="mx-auto mt-4 flex max-w-3xl flex-wrap justify-center gap-2">{model.tags.map((tag) => <span key={tag} className="max-w-full break-words rounded-full bg-white/80 px-3 py-1.5 text-[13px] font-semibold text-[color:var(--spm-t2)] ring-1 ring-slate-200/80">{tag}</span>)}</div>
      <div className="mt-6">{actions}</div>
    </header>

    <section data-detail-row="execution" className="grid items-stretch gap-8 rounded-[18px] bg-white p-5 shadow-[0_16px_44px_rgba(15,23,42,0.055)] ring-1 ring-slate-200/65 sm:p-7 min-[900px]:min-h-[440px] min-[900px]:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] min-[900px]:gap-9">
      <div id="lesson-video" data-detail-panel="video" className={`${PANEL_CLASS} scroll-mt-20`}><h2 className={PANEL_HEADING_CLASS}>수업 영상</h2><div className={`${PANEL_BODY_CLASS} flex items-center bg-slate-950`}><LessonVideo model={model} video={video} /></div></div>
      <MethodColumn model={model} />
    </section>

    {model.setupImageUrl || hasOverview ? <section id="lesson-preparation" data-detail-row="preparation" className="mt-16 grid items-stretch scroll-mt-20 gap-8 rounded-[18px] bg-[color-mix(in_srgb,var(--spm-s2)_64%,white)] p-5 sm:mt-[72px] sm:p-7 min-[900px]:min-h-[420px] min-[900px]:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] min-[900px]:gap-9">{model.setupImageUrl ? <div data-detail-panel="setup" className={PANEL_CLASS}><h2 className={PANEL_HEADING_CLASS}>초기 교구 세팅</h2><div className={PANEL_BODY_CLASS}><SetupImage title={model.title} src={model.setupImageUrl} /></div>{model.setupNotes.length > 0 ? <p className="m-0 mt-3 break-keep text-[14px] font-semibold leading-6 text-[color:var(--spm-t3)]">{model.setupNotes.join(' · ')}</p> : null}</div> : null}{hasOverview ? <OverviewColumn model={model} /> : null}</section> : null}
  </div>;
}
