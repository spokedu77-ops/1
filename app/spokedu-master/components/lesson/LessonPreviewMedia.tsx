'use client';

import { ExternalLink, Play } from 'lucide-react';
import Image from 'next/image';
import type { ReactNode } from 'react';

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

function CoverImage({ src, alt, sizes, className }: { src: string; alt: string; sizes: string; className?: string }) {
  return <Image src={src} alt={alt} fill sizes={sizes} className={className} unoptimized />;
}

export function LessonPreviewMedia({ program }: { program: Program }) {
  const heroImage = resolveProgramHero(program);
  const trustedVideoUrl = getTrustedProgramVideoUrl(program);
  const videoEmbedUrl = getVideoEmbedUrl(trustedVideoUrl, { autoplay: true });
  const directVideoUrl = !videoEmbedUrl && isDirectVideoUrl(trustedVideoUrl) ? trustedVideoUrl : undefined;
  const externalVideoUrl = !videoEmbedUrl && !directVideoUrl ? getExternalVideoUrl(trustedVideoUrl) : undefined;
  const hasVideo = Boolean(videoEmbedUrl || directVideoUrl || externalVideoUrl);
  const title = program.title;

  let media: ReactNode;
  if (videoEmbedUrl) {
    media = (
      <iframe
        key={`${program.id}-${videoEmbedUrl}`}
        src={videoEmbedUrl}
        title={`${title} 참고 영상`}
        className="h-full w-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
        allowFullScreen
      />
    );
  } else if (directVideoUrl) {
    media = <video src={directVideoUrl} className="h-full w-full object-cover" controls playsInline autoPlay muted />;
  } else if (externalVideoUrl) {
    media = (
      <div className="grid h-full place-items-center bg-slate-950 p-6 text-center text-white">
        <div>
          <Play className="mx-auto h-10 w-10 fill-current text-red-500" />
          <p className="mt-4 text-base font-black">참고 영상 링크</p>
          <a
            href={externalVideoUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-black text-slate-950"
          >
            유튜브에서 열기
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </div>
    );
  } else if (heroImage) {
    media = <CoverImage src={heroImage} alt={title} sizes="(min-width: 1024px) 1250px, 100vw" className="object-cover" />;
  } else {
    media = (
      <div className="grid h-full place-items-center bg-slate-900 text-white">
        <CategoryIcon category={getLessonTheme(program) || '체육 수업'} size={48} />
      </div>
    );
  }

  return (
    <div className="lg:h-fit lg:self-start">
      <div className="overflow-hidden rounded-[18px] border border-slate-200 bg-slate-950 shadow-[0_20px_60px_rgba(15,23,42,0.16)]">
        <div className={`relative mx-auto ${hasVideo ? 'aspect-video w-full' : 'aspect-square w-full max-w-[1250px]'}`}>
          {media}
        </div>
      </div>
    </div>
  );
}
