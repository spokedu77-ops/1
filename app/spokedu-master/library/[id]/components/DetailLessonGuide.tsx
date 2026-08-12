'use client';

import { ExternalLink, Play, X, ZoomIn } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useRef, useState, type ReactNode, type Ref } from 'react';

import { TrackedVideoIframe } from '../../../components/lesson/TrackedVideoIframe';
import type { LessonDisplayModel } from '../../../lib/lessonDisplayModel';
import { canOptimizeRemoteImage } from '../../../lib/mediaPreferences';
import { getVideoThumbnail, isRemoteImage } from '../../../lib/program-media';

function DetailList({ items, compact = false }: { items: string[]; compact?: boolean }) {
  return (
    <ul className={compact ? 'space-y-1.5' : 'space-y-2'}>
      {items.map((item, index) => (
        <li key={`${index}-${item}`} className="grid grid-cols-[6px_minmax(0,1fr)] gap-2.5 text-[14px] font-semibold leading-[1.65] text-[color:var(--spm-t2)]">
          <span aria-hidden className="mt-[9px] h-1.5 w-1.5 rounded-full bg-slate-300" />
          <span className="min-w-0 break-keep">{item}</span>
        </li>
      ))}
    </ul>
  );
}

function SectionHeading({ number, title, description }: { number?: string; title: string; description?: string }) {
  return (
    <header className="max-w-[76ch]">
      {number ? <p className="text-[11px] font-black tracking-[0.16em] text-[var(--spm-acc)]">{number}</p> : null}
      <h2 className="mt-1 break-keep text-[19px] font-black tracking-[-0.025em] text-[color:var(--spm-t)] sm:text-[20px]">{title}</h2>
      {description ? <p className="mt-1.5 text-[13px] font-semibold leading-[1.6] text-[color:var(--spm-t3)]">{description}</p> : null}
    </header>
  );
}

function MetaGroup({ model }: { model: LessonDisplayModel }) {
  const items = [
    ['테마', model.theme],
    ['대상', model.target],
    ['기능', model.functions.join(', ')],
    ['움직임', model.movements.join(', ')],
    ['공간', model.space],
    ['인원', model.participantFormat],
  ];
  return (
    <dl className="flex flex-wrap gap-2" aria-label="프로그램 분류">
      {items.map(([label, value]) => (
        <div key={label} className="inline-flex min-w-0 max-w-full items-baseline gap-1.5 rounded-[8px] border border-slate-200 bg-slate-50/80 px-2.5 py-1.5 leading-5">
          <dt className="shrink-0 text-[11px] font-black text-[color:var(--spm-t3)]">{label}</dt>
          <dd className="min-w-0 break-words text-[12px] font-bold text-[color:var(--spm-t)]">{value || '정보 없음'}</dd>
        </div>
      ))}
    </dl>
  );
}

function PrepGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className="border-t border-slate-200/80 pt-3.5 first:border-t-0 first:pt-0">
      <h3 className="text-[12px] font-black tracking-[0.03em] text-[color:var(--spm-t3)]">{label}</h3>
      <div className="mt-2">{children}</div>
    </section>
  );
}

function SetupImage({ title, src }: { title: string; src: string }) {
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const trigger = triggerRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
      trigger?.focus();
    };
  }, [open]);

  return (
    <>
      <div className="relative mt-3.5 overflow-hidden rounded-[11px] border border-slate-200/80 bg-[var(--spm-s3)] p-1.5">
        <Image
          src={src}
          alt={`${title} 초기 교구 세팅`}
          width={960}
          height={720}
          priority
          sizes="(min-width: 1024px) 58vw, 100vw"
          className="mx-auto h-auto max-h-none w-full rounded-[8px] object-contain md:max-h-[360px] lg:max-h-[390px]"
          unoptimized={isRemoteImage(src) && !canOptimizeRemoteImage(src)}
        />
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setOpen(true)}
          className="absolute bottom-3 right-3 inline-flex min-h-9 items-center gap-1.5 rounded-[8px] border border-slate-200 bg-white/95 px-2.5 text-[12px] font-black text-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--spm-acc)]"
        >
          <ZoomIn className="h-4 w-4" /> 이미지 확대
        </button>
      </div>
      {open ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/85 p-4 sm:p-8"
          role="dialog"
          aria-modal="true"
          aria-labelledby="setup-image-dialog-title"
          onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}
        >
          <div className="flex max-h-full w-full max-w-6xl flex-col overflow-hidden rounded-[16px] bg-white shadow-2xl">
            <div className="flex min-h-14 items-center justify-between gap-3 border-b border-slate-200 px-4 sm:px-5">
              <h2 id="setup-image-dialog-title" className="min-w-0 truncate text-[15px] font-black text-slate-950">{title} 초기 교구 세팅</h2>
              <button ref={closeRef} type="button" onClick={() => setOpen(false)} className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] text-slate-600 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--spm-acc)]" aria-label="확대 이미지 닫기">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="min-h-0 overflow-auto bg-slate-100 p-3 sm:p-5">
              <Image src={src} alt={`${title} 초기 교구 세팅 확대 이미지`} width={1440} height={1080} sizes="100vw" className="mx-auto h-auto max-h-[calc(100dvh-8rem)] w-auto max-w-full object-contain" unoptimized={isRemoteImage(src) && !canOptimizeRemoteImage(src)} />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function LessonSteps({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  const compact = items.length <= 3;
  const compactColumns = items.length === 1 ? 'md:max-w-2xl md:grid-cols-1' : items.length === 2 ? 'md:max-w-4xl md:grid-cols-2' : 'md:grid-cols-3';
  return (
    <section className="border-t border-slate-200 pt-6 sm:pt-8" aria-labelledby="lesson-method-title">
      <div id="lesson-method-title"><SectionHeading number="02" title="진행 방법" description={`${items.length}단계의 등록된 진행 순서입니다.`} /></div>
      <ol className={`mt-5 ${compact ? `grid gap-4 ${compactColumns}` : 'max-w-[900px] space-y-0'}`}>
        {items.map((item, index) => (
          <li key={`${index}-${item}`} className="relative grid grid-cols-[34px_minmax(0,1fr)] gap-3 pb-5 last:pb-0">
            <div className="relative flex justify-center">
              <span className="relative z-10 grid h-8 w-8 place-items-center rounded-full bg-slate-950 text-[11px] font-black text-white">{index + 1}</span>
              {index < items.length - 1 ? <span aria-hidden className={`absolute bg-slate-300 ${compact ? 'bottom-[-20px] top-8 w-px md:bottom-auto md:left-8 md:right-[-16px] md:top-4 md:h-px md:w-auto' : 'bottom-[-20px] top-8 w-px'}`} /> : null}
            </div>
            <p className="min-w-0 break-keep pt-0.5 text-[15px] font-semibold leading-[1.65] text-[color:var(--spm-t2)]">{item}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

function VariationList({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  return (
    <section className="border-t border-slate-200 pt-6 sm:pt-8" aria-labelledby="variations-title">
      <div id="variations-title"><SectionHeading title="난이도 조절 · 변형 활동" description="등록된 변형 방법만 표시합니다." /></div>
      <ol className="mt-4 max-w-4xl divide-y divide-slate-200 border-y border-slate-200">
        {items.map((item, index) => (
          <li key={`${index}-${item}`} className="grid grid-cols-[24px_minmax(0,1fr)] gap-3 py-3 text-[14px] font-semibold leading-[1.65] text-[color:var(--spm-t2)]">
            <span className="text-[12px] font-black text-slate-400">{String(index + 1).padStart(2, '0')}</span>
            <span className="break-keep">{item}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

type VideoProps = {
  embedUrl?: string;
  directUrl?: string;
  externalUrl?: string;
  sourceUrl?: string;
  autoplay: boolean;
  onPlaybackStarted: () => void;
};

function ReferenceVideo({ title, video }: { title: string; video: VideoProps }) {
  if (!video.embedUrl && !video.directUrl && !video.externalUrl) return null;
  return (
    <section id="lesson-video" className="scroll-mt-20 border-t border-slate-200 pt-6 sm:pt-8" aria-labelledby="reference-video-title">
      <div id="reference-video-title"><SectionHeading title="참고 영상" /></div>
      <div className="mt-4 max-w-[860px] overflow-hidden rounded-[12px] bg-slate-950">
        <div className="relative aspect-video">
          {video.embedUrl ? <TrackedVideoIframe key={video.embedUrl} src={video.embedUrl} title={`${title} 참고 영상`} className="h-full w-full" onPlaybackStarted={video.onPlaybackStarted} posterUrl={getVideoThumbnail(video.sourceUrl) ?? undefined} deferUntilPlay={!video.autoplay} /> : null}
          {video.directUrl ? <video src={video.directUrl} className="h-full w-full object-cover" controls playsInline autoPlay={video.autoplay} muted={video.autoplay} preload="none" poster={getVideoThumbnail(video.sourceUrl)} onPlay={video.onPlaybackStarted} /> : null}
          {video.externalUrl ? <div className="grid h-full place-items-center p-6 text-center text-white"><div><span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[var(--spm-cta)]"><Play className="h-5 w-5 fill-current" /></span><p className="mt-4 text-base font-black">참고 영상 링크</p><a href={video.externalUrl} target="_blank" rel="noreferrer" onClick={video.onPlaybackStarted} className="mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-[10px] bg-white px-5 text-sm font-black text-slate-900">유튜브에서 열기 <ExternalLink className="h-4 w-4" /></a></div></div> : null}
        </div>
      </div>
    </section>
  );
}

export function DetailLessonGuide({ model, headerStatus, actions, video, heroTitleRef }: { model: LessonDisplayModel; headerStatus?: ReactNode; actions: ReactNode; video: VideoProps; heroTitleRef?: Ref<HTMLHeadingElement> }) {
  const hasOverview = model.equipment.length > 0 || model.setupNotes.length > 0 || model.briefingNotes.length > 0 || Boolean(model.objective) || Boolean(model.developmentFocus);
  return (
    <>
      <section className="rounded-[14px] border border-slate-200 bg-white p-5 sm:p-6">
        {headerStatus ? <div className="mb-3">{headerStatus}</div> : null}
        <h1 ref={heroTitleRef} data-detail-hero-title className="max-w-[800px] break-keep text-[30px] font-black leading-[1.18] tracking-[-0.035em] text-[color:var(--spm-t)] sm:text-[32px]">{model.title}</h1>
        {model.description ? <p className="mt-2.5 max-w-[72ch] break-keep text-[14px] font-semibold leading-[1.65] text-[color:var(--spm-t2)] sm:text-[15px]">{model.description}</p> : null}
        <div className="mt-4"><MetaGroup model={model} /></div>
        <div className="mt-5 border-t border-slate-200 pt-4">{actions}</div>
      </section>

      {model.setupImageUrl || hasOverview ? (
        <section id="lesson-preparation" className="grid scroll-mt-20 gap-0 overflow-hidden rounded-[14px] border border-slate-200 bg-white lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.9fr)] lg:items-start">
          {model.setupImageUrl ? <div className="min-w-0 p-5 sm:p-6"><h2 className="text-[19px] font-black tracking-[-0.02em] text-[color:var(--spm-t)] sm:text-[20px]">초기 교구 세팅</h2><SetupImage title={model.title} src={model.setupImageUrl} /></div> : null}
          {hasOverview ? <div className={`min-w-0 border-t border-slate-200 p-5 sm:p-6 lg:border-t-0 ${model.setupImageUrl ? 'lg:border-l' : 'lg:col-span-2'}`}><h2 className="text-[19px] font-black tracking-[-0.02em] text-[color:var(--spm-t)] sm:text-[20px]">수업 한눈에 보기</h2><div className="mt-3.5 space-y-3.5">{model.equipment.length > 0 ? <PrepGroup label="준비물"><DetailList items={model.equipment} compact /></PrepGroup> : null}{model.setupNotes.length > 0 ? <PrepGroup label="세팅"><DetailList items={model.setupNotes} compact /></PrepGroup> : null}{model.briefingNotes.length > 0 ? <PrepGroup label="사전 교육"><DetailList items={model.briefingNotes} compact /></PrepGroup> : null}{model.objective ? <PrepGroup label="수업 목표"><p className="break-keep text-[14px] font-semibold leading-[1.65] text-[color:var(--spm-t2)]">{model.objective}</p></PrepGroup> : null}{model.developmentFocus ? <PrepGroup label="핵심 기능"><p className="break-keep text-[14px] font-semibold leading-[1.65] text-[color:var(--spm-t2)]">{model.developmentFocus}</p></PrepGroup> : null}</div></div> : null}
        </section>
      ) : null}

      {model.coachScript ? <section className="border-t border-slate-200 pt-6 sm:pt-8" aria-labelledby="lesson-opening-title"><div id="lesson-opening-title"><SectionHeading number="01" title="이렇게 시작하세요" description="아이들에게 첫 설명으로 바로 사용할 수 있는 수업 스크립트입니다." /></div><div className="mt-4 max-w-[74ch] border-l-2 border-[var(--spm-acc)]/35 pl-4 sm:pl-5">{model.coachScript.split('\n').map((line) => line.trim()).filter(Boolean).map((line, index) => <p key={`${index}-${line}`} className={`${index > 0 ? 'mt-2.5' : ''} break-keep text-[16px] font-semibold leading-[1.65] text-[color:var(--spm-t)]`}>{line}</p>)}</div></section> : null}
      <LessonSteps items={model.activityMethod} />
      {model.fieldTips.length > 0 || model.safetyNotes.length > 0 ? <section className="border-t border-slate-200 pt-6 sm:pt-8" aria-labelledby="guidance-title"><div id="guidance-title"><SectionHeading title="지도 포인트" /></div><div className={`mt-4 grid gap-6 ${model.fieldTips.length > 0 && model.safetyNotes.length > 0 ? 'md:grid-cols-2' : ''}`}>{model.fieldTips.length > 0 ? <div><h3 className="text-[15px] font-black text-[color:var(--spm-t)]">지도자가 알려줄 것</h3><div className="mt-2.5"><DetailList items={model.fieldTips} /></div></div> : null}{model.safetyNotes.length > 0 ? <div className="border-t border-slate-200 pt-5 md:border-l md:border-t-0 md:pl-6 md:pt-0"><h3 className="text-[15px] font-black text-[color:var(--spm-t)]">안전 유의사항</h3><div className="mt-2.5"><DetailList items={model.safetyNotes} /></div></div> : null}</div></section> : null}
      <ReferenceVideo title={model.title} video={video} />
      <VariationList items={model.variationMethod} />
    </>
  );
}
