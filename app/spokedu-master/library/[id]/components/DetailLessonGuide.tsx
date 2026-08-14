'use client';

import { ExternalLink, Play, X, ZoomIn } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useRef, useState, type ReactNode, type Ref } from 'react';

import { TrackedVideoIframe } from '../../../components/lesson/TrackedVideoIframe';
import type { LessonDisplayModel } from '../../../lib/lessonDisplayModel';
import { canOptimizeRemoteImage } from '../../../lib/mediaPreferences';
import { getVideoThumbnail, isRemoteImage } from '../../../lib/program-media';

function DetailList({ items }: { items: string[] }) {
  return <ul className="space-y-1.5">{items.map((item, index) => <li key={`${index}-${item}`} className="grid min-w-0 grid-cols-[6px_minmax(0,1fr)] gap-2.5 text-[14px] font-semibold leading-[1.6] text-[color:var(--spm-t2)]"><span aria-hidden className="mt-2.5 h-1.5 w-1.5 rounded-full bg-slate-300" /><span className="min-w-0 break-keep">{item}</span></li>)}</ul>;
}

function InfoGroup({ label, children }: { label: string; children: ReactNode }) {
  return <section className="border-t border-slate-200 pt-3.5 first:border-0 first:pt-0"><h3 className="text-[12px] font-black text-[color:var(--spm-t3)]">{label}</h3><div className="mt-2">{children}</div></section>;
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
    <div className="relative mt-4 overflow-hidden rounded-[11px] border border-slate-200 bg-[var(--spm-s3)] p-2">
      <Image src={src} alt={`${title} 초기 교구 세팅`} width={960} height={720} priority sizes="(min-width: 1100px) 50vw, 100vw" className="mx-auto h-auto max-h-[390px] w-full object-contain" unoptimized={isRemoteImage(src) && !canOptimizeRemoteImage(src)} />
      <button ref={triggerRef} type="button" onClick={() => setOpen(true)} className="absolute bottom-3 right-3 inline-flex min-h-11 items-center gap-1.5 rounded-[8px] border border-slate-200 bg-white/95 px-3 text-[12px] font-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--spm-acc)]"><ZoomIn className="h-4 w-4" /> 이미지 확대</button>
    </div>
    {open ? <div role="dialog" aria-modal="true" aria-labelledby="setup-image-dialog-title" className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/85 p-4 sm:p-8" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}><div className="flex max-h-full w-full max-w-6xl flex-col overflow-hidden rounded-[16px] bg-white"><div className="flex min-h-14 items-center justify-between border-b px-4"><h2 id="setup-image-dialog-title" className="truncate text-[15px] font-black">{title} 초기 교구 세팅</h2><button ref={closeRef} type="button" onClick={() => setOpen(false)} className="inline-flex h-11 w-11 items-center justify-center rounded-[10px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--spm-acc)]" aria-label="확대 이미지 닫기"><X /></button></div><div className="min-h-0 overflow-auto bg-slate-100 p-3 sm:p-5"><Image src={src} alt={`${title} 초기 교구 세팅 확대 이미지`} width={1440} height={1080} sizes="100vw" className="mx-auto h-auto max-h-[calc(100dvh-8rem)] w-auto max-w-full object-contain" unoptimized={isRemoteImage(src) && !canOptimizeRemoteImage(src)} /></div></div></div> : null}
  </>;
}

type VideoProps = { embedUrl?: string; directUrl?: string; externalUrl?: string; sourceUrl?: string; autoplay: boolean; onPlaybackStarted: () => void };

function LessonVideo({ model, video }: { model: LessonDisplayModel; video: VideoProps }) {
  const poster = model.setupImageUrl ?? getVideoThumbnail(video.sourceUrl) ?? undefined;
  if (!video.embedUrl && !video.directUrl && !video.externalUrl) return <div className="grid aspect-video place-items-center rounded-[11px] bg-slate-100 text-sm font-bold text-slate-500">등록된 수업 영상이 없습니다.</div>;
  return <div className="relative aspect-video overflow-hidden rounded-[11px] bg-slate-950">
    {video.embedUrl ? <TrackedVideoIframe key={video.embedUrl} src={video.embedUrl} title={`${model.title} 수업 영상`} className="h-full w-full" onPlaybackStarted={video.onPlaybackStarted} posterUrl={poster} deferUntilPlay={!video.autoplay} /> : null}
    {video.directUrl ? <video src={video.directUrl} className="h-full w-full object-contain" controls playsInline autoPlay={video.autoplay} muted={video.autoplay} preload="none" poster={poster} onPlay={video.onPlaybackStarted} /> : null}
    {video.externalUrl ? <div className="grid h-full place-items-center p-6 text-center text-white"><div><Play className="mx-auto h-8 w-8" /><a href={video.externalUrl} target="_blank" rel="noreferrer" onClick={video.onPlaybackStarted} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-[9px] bg-white px-5 text-sm font-black text-slate-900">영상 열기 <ExternalLink className="h-4 w-4" /></a></div></div> : null}
  </div>;
}

function LessonExecutionSection({ model, video }: { model: LessonDisplayModel; video: VideoProps }) {
  return <section id="lesson-execution" data-detail-section="execution" className="grid scroll-mt-20 overflow-hidden rounded-[14px] border border-slate-200 bg-white min-[1100px]:grid-cols-2">
    <div id="lesson-video" className="min-w-0 scroll-mt-20 p-5 sm:p-6"><h2 className="mb-4 text-[20px] font-black">수업 영상</h2><LessonVideo model={model} video={video} /></div>
    <div className="min-w-0 border-t border-slate-200 p-5 sm:p-6 min-[1100px]:border-l min-[1100px]:border-t-0">
      <h2 className="text-[20px] font-black">진행 방법</h2>
      <ol className="mt-4 space-y-3">{model.activityMethod.map((item, index) => <li key={`${index}-${item}`} className="grid grid-cols-[30px_minmax(0,1fr)] gap-3"><span className="grid h-7 w-7 place-items-center rounded-full bg-slate-950 text-[11px] font-black text-white">{index + 1}</span><span className="break-keep text-[14px] font-semibold leading-6 text-[color:var(--spm-t2)]">{item}</span></li>)}</ol>
      {model.variationMethod.length > 0 ? <div className="mt-6 border-t border-slate-200 pt-5"><h3 className="text-[16px] font-black">난이도 조절 · 변형 활동</h3><div className="mt-3"><DetailList items={model.variationMethod} /></div></div> : null}
      {model.fieldTips.length > 0 || model.safetyNotes.length > 0 ? <div className="mt-6 grid gap-5 border-t border-slate-200 pt-5 sm:grid-cols-2">{model.fieldTips.length > 0 ? <InfoGroup label="지도자가 알려줄 것"><DetailList items={model.fieldTips} /></InfoGroup> : null}{model.safetyNotes.length > 0 ? <InfoGroup label="안전 유의사항"><DetailList items={model.safetyNotes} /></InfoGroup> : null}</div> : null}
    </div>
  </section>;
}

function LessonPreparationSection({ model }: { model: LessonDisplayModel }) {
  const hasOverview = model.equipment.length > 0 || Boolean(model.coachScript) || model.briefingNotes.length > 0 || Boolean(model.objective) || Boolean(model.developmentFocus);
  if (!model.setupImageUrl && !hasOverview) return null;
  return <section id="lesson-preparation" data-detail-section="preparation" className="grid scroll-mt-20 overflow-hidden rounded-[14px] border border-slate-200 bg-white min-[1100px]:grid-cols-2">
    <div className="min-w-0 p-5 sm:p-6"><h2 className="text-[20px] font-black">초기 교구 세팅</h2>{model.setupImageUrl ? <SetupImage title={model.title} src={model.setupImageUrl} /> : <p className="mt-3 text-sm font-semibold text-slate-500">등록된 세팅 이미지가 없습니다.</p>}{model.setupNotes.length > 0 ? <div className="mt-4"><InfoGroup label="세팅"><DetailList items={model.setupNotes} /></InfoGroup></div> : null}</div>
    {hasOverview ? <div className="min-w-0 border-t border-slate-200 p-5 sm:p-6 min-[1100px]:border-l min-[1100px]:border-t-0"><h2 className="text-[20px] font-black">수업 한눈에 보기</h2><div className="mt-4 space-y-4">{model.equipment.length > 0 ? <InfoGroup label="준비물"><DetailList items={model.equipment} /></InfoGroup> : null}{model.coachScript ? <InfoGroup label="스크립트"><div className="border-l-2 border-[var(--spm-acc)]/40 pl-4 text-[15px] font-bold leading-7 text-[color:var(--spm-t)] whitespace-pre-line">{model.coachScript}</div></InfoGroup> : null}{model.briefingNotes.length > 0 ? <InfoGroup label="사전교육"><DetailList items={model.briefingNotes} /></InfoGroup> : null}{model.objective ? <InfoGroup label="수업 목표"><p className="text-sm font-semibold leading-6 text-[color:var(--spm-t2)]">{model.objective}</p></InfoGroup> : null}{model.developmentFocus ? <InfoGroup label="핵심 기능"><p className="text-sm font-semibold leading-6 text-[color:var(--spm-t2)]">{model.developmentFocus}</p></InfoGroup> : null}</div></div> : null}
  </section>;
}

export function DetailLessonGuide({ model, headerStatus, actions, video, heroTitleRef }: { model: LessonDisplayModel; headerStatus?: ReactNode; actions: ReactNode; video: VideoProps; heroTitleRef?: Ref<HTMLHeadingElement> }) {
  return <>
    <section className="rounded-[14px] border border-slate-200 bg-white p-5 text-center sm:p-6">
      {headerStatus ? <div className="mb-3 flex justify-center">{headerStatus}</div> : null}
      <h1 ref={heroTitleRef} data-detail-hero-title className="mx-auto max-w-[800px] break-keep text-[30px] font-black leading-[1.18] tracking-[-0.035em] sm:text-[32px]">{model.title}</h1>
      <div data-detail-public-tags className="mx-auto mt-3 flex max-w-3xl flex-wrap justify-center gap-2">{model.tags.map((tag) => <span key={tag} className="max-w-full break-words rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[12px] font-bold text-[color:var(--spm-t2)]">{tag}</span>)}</div>
      {model.description ? <p className="mx-auto mt-3 max-w-[68ch] break-keep text-[14px] font-semibold leading-6 text-[color:var(--spm-t2)]">{model.description}</p> : null}
      <div className="mt-5 border-t border-slate-200 pt-4">{actions}</div>
    </section>
    <LessonExecutionSection model={model} video={video} />
    <LessonPreparationSection model={model} />
  </>;
}
