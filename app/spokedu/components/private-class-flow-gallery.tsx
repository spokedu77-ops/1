import type { PrivateClassFlowImage } from '../data/private-page';
import { ExternalPhoto } from './external-photo';

type PrivateClassFlowGalleryProps = {
  images: readonly PrivateClassFlowImage[];
};

const GRID_AREAS = ['hero', 'sub1', 'sub2'] as const;

/** 과외 안내(/info/private)와 동일한 1+2 갤러리 그리드 — cover로 여백 없이 채움 */
export function PrivateClassFlowGallery({ images }: PrivateClassFlowGalleryProps) {
  return (
    <div
      className="grid grid-cols-2 gap-3"
      style={{
        gridTemplateAreas: '"hero hero" "sub1 sub2"',
      }}
    >
      {images.map((img, index) => (
        <div
          key={img.alt}
          className={`relative overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-100 shadow-sm ${
            img.large ? 'aspect-[16/7]' : 'aspect-square'
          }`}
          style={{ gridArea: GRID_AREAS[index] ?? 'auto' }}
        >
          <ExternalPhoto
            src={img.src}
            alt={img.alt}
            className="absolute inset-0"
            fit="cover"
            priority={index === 0}
          />
        </div>
      ))}
    </div>
  );
}
