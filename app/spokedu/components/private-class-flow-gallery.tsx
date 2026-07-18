import type { PrivateClassFlowImage } from '../data/private-page';
import { ExternalPhoto } from './external-photo';

type PrivateClassFlowGalleryProps = {
  images: readonly PrivateClassFlowImage[];
};

/** 과외 안내(/info/private) 실사진 기반 — 1 히어로 + 하단 밀집 그리드 */
export function PrivateClassFlowGallery({ images }: PrivateClassFlowGalleryProps) {
  const [hero, ...rest] = images;
  if (!hero) return null;

  return (
    <div className="space-y-3">
      <div className="relative aspect-[16/8] overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-100 shadow-sm sm:aspect-[16/7]">
        <ExternalPhoto src={hero.src} alt={hero.alt} className="absolute inset-0" fit="cover" priority />
      </div>
      {rest.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {rest.map((img) => (
            <div
              key={img.alt}
              className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-100 shadow-sm"
            >
              <ExternalPhoto src={img.src} alt={img.alt} className="absolute inset-0" fit="cover" />
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
