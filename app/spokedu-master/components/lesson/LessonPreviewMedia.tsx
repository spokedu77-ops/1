'use client';

import { ExternalLink, Play } from 'lucide-react';
import Image from 'next/image';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useRef } from 'react';

import { CategoryIcon } from '../ui/ProgramThumb';
import {
  getExternalVideoUrl,
  getTrustedProgramVideoUrl,
  getVideoEmbedUrl,
  isDirectVideoUrl,
  resolveProgramHero,
} from '../../lib/program-media';
import { getLessonTheme } from '../../lib/lessonDisplay';
import type { Program } from '../../types';
import { TrackedVideoIframe } from './TrackedVideoIframe';

function CoverImage({ src, alt, sizes, className }: { src: string; alt: string; sizes: string; className?: string }) {
  return <Image src={src} alt={alt} fill sizes={sizes} className={className} unoptimized />;
}

export function LessonPreviewMedia({
  program,
  layout = 'default',
  autoplay = false,
  onPlaybackStarted,
}: {
  program: Program;
  layout?: 'default' | 'preview';
  autoplay?: boolean;
  onPlaybackStarted?: () => void;
}) {
  const heroImage = resolveProgramHero(program);
  const trustedVideoUrl = getTrustedProgramVideoUrl(program);
  const videoEmbedUrl = getVideoEmbedUrl(trustedVideoUrl, { autoplay });
  const directVideoUrl = !videoEmbedUrl && isDirectVideoUrl(trustedVideoUrl) ? trustedVideoUrl : undefined;
  const externalVideoUrl = !videoEmbedUrl && !directVideoUrl ? getExternalVideoUrl(trustedVideoUrl) : undefined;
  const hasVideo = Boolean(videoEmbedUrl || directVideoUrl || externalVideoUrl);
  const title = program.title;
  const playbackReportedRef = useRef(false);
  const reportPlayback = useCallback(() => {
    if (playbackReportedRef.current) return;
    playbackReportedRef.current = true;
    onPlaybackStarted?.();
  }, [onPlaybackStarted]);

  useEffect(() => {
    playbackReportedRef.current = false;
  }, [program.id]);

  let media: ReactNode;
  if (videoEmbedUrl) {
    media = (
      <TrackedVideoIframe
        key={`${program.id}-${videoEmbedUrl}`}
        src={videoEmbedUrl}
        title={`${title} 참고 영상`}
        className="h-full w-full"
        onPlaybackStarted={reportPlayback}
      />
    );
  } else if (directVideoUrl) {
    media = <video src={directVideoUrl} className="h-full w-full object-cover" controls playsInline autoPlay={autoplay} muted onPlay={reportPlayback} />;
  } else if (externalVideoUrl) {
    media = (
      <div className="grid h-full place-items-center bg-slate-950 p-6 text-center text-white">
        <div>
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-indigo-600 text-white ring-4 ring-white/70">
            <Play className="h-5 w-5 fill-current" />
          </span>
          <p className="mt-4 text-base font-black">참고 영상 링크</p>
          <a
            href={externalVideoUrl}
            target="_blank"
            rel="noreferrer"
            onClick={reportPlayback}
            className="mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-black text-slate-950"
          >
            유튜브에서 열기
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </div>
    );
  } else if (heroImage) {
    media = (
      <>
        <div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-indigo-50 to-slate-100 text-indigo-600">
          <CategoryIcon category={getLessonTheme(program) || '체육 수업'} size={48} />
        </div>
        <CoverImage src={heroImage} alt={title} sizes="(min-width: 1024px) 1250px, 100vw" className="object-cover" />
      </>
    );
  } else {
    media = (
      <div className="grid h-full place-items-center bg-slate-900 text-white">
        <CategoryIcon category={getLessonTheme(program) || '체육 수업'} size={48} />
      </div>
    );
  }

  const frameClass =
    layout === 'preview'
      ? 'relative aspect-video w-full'
      : hasVideo
        ? 'relative mx-auto aspect-video w-full'
        : 'relative mx-auto aspect-square w-full max-w-[1250px]';

  return (
    <div className={layout === 'preview' ? 'min-w-0 w-full' : 'lg:h-fit lg:self-start'}>
      <div
        className={
          layout === 'preview'
            ? 'w-full overflow-hidden rounded-[14px] border border-slate-200 bg-slate-50 shadow-[0_12px_40px_rgba(15,23,42,0.12)]'
            : 'overflow-hidden rounded-[18px] border border-slate-200 bg-slate-950 shadow-[0_20px_60px_rgba(15,23,42,0.16)]'
        }
      >
        <div data-preview-media className={frameClass}>{media}</div>
      </div>
    </div>
  );
}
