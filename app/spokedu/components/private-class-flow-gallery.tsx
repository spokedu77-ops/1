import type { PrivateClassFlowImage } from '../data/private-page';
import { ExternalPhoto } from './external-photo';

type PrivateClassFlowGalleryProps = {
  images: readonly PrivateClassFlowImage[];
  className?: string;
};

/** 수업 스케치 — 큰 사진 1장 + 아래 작은 사진 2장 (커리큘럼 가이드 제외) */
export function PrivateClassFlowGallery({ images, className = '' }: PrivateClassFlowGalleryProps) {
  const hero = images.find((img) => img.large) ?? images[0];
  const thumbs = images.filter((img) => img !== hero).slice(0, 2);
  if (!hero) return null;

  return (
    <div className={`flex h-full min-h-0 flex-col gap-3 ${className}`}>
      <div className="relative aspect-[16/10] w-full shrink-0 overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-100 shadow-sm lg:aspect-auto lg:min-h-0 lg:flex-[1.4]">
        <ExternalPhoto src={hero.src} alt={hero.alt} className="absolute inset-0" fit="cover" priority sizes="(max-width: 1024px) 100vw, 55vw" />
      </div>
      {thumbs.length > 0 ? (
        <div className="grid shrink-0 grid-cols-2 gap-3 lg:min-h-0 lg:flex-1 lg:shrink">
          {thumbs.map((img) => (
            <div
              key={img.alt}
              className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-100 shadow-sm lg:aspect-auto lg:h-full lg:min-h-[7.5rem]"
            >
              <ExternalPhoto
                src={img.src}
                alt={img.alt}
                className="absolute inset-0"
                fit="cover"
                sizes="(max-width: 1024px) 50vw, 28vw"
              />
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
