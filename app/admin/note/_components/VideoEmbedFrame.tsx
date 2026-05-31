'use client';

import { isAllowedVideoEmbedUrl } from '@/app/lib/note/videoEmbed';

export function VideoEmbedFrame({
  embedUrl,
  title = '영상',
}: {
  embedUrl: string;
  title?: string;
}) {
  if (!isAllowedVideoEmbedUrl(embedUrl)) return null;

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-slate-950">
      <iframe
        src={embedUrl}
        title={title}
        className="absolute inset-0 h-full w-full border-0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        loading="lazy"
        referrerPolicy="strict-origin-when-cross-origin"
      />
    </div>
  );
}
