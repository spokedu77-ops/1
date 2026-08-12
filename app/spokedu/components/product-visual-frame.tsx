import Image from 'next/image';
import { marketingCaption } from '../lib/ui-classes';

type ProductVisualFrameProps = {
  src: string;
  alt: string;
  caption?: string;
  label?: string;
  priority?: boolean;
  sizes?: string;
  className?: string;
  imageClassName?: string;
  aspectClassName?: string;
  emphasis?: 'hero' | 'feature' | 'compact';
};

const emphasisClass = {
  hero: 'rounded-[2rem] p-3 shadow-[var(--spokedu-marketing-shadow-object)] sm:p-4 lg:p-[1.125rem]',
  feature: 'rounded-[1.75rem] p-3 shadow-[var(--spokedu-marketing-shadow-media)] sm:p-4',
  compact: 'rounded-[1.375rem] p-2.5 shadow-[var(--spokedu-marketing-shadow-subtle)] sm:p-3',
} as const;

export function ProductVisualFrame({
  src,
  alt,
  caption,
  label = 'SPOKEDU SUBSCRIPTION SYSTEM',
  priority = false,
  sizes = '(min-width: 1024px) 56vw, 92vw',
  className = '',
  imageClassName = 'object-contain',
  aspectClassName = 'aspect-[16/10]',
  emphasis = 'feature',
}: ProductVisualFrameProps) {
  return (
    <figure
      className={`group border border-white/80 bg-white/90 backdrop-blur-xl transition duration-300 motion-reduce:transform-none motion-reduce:transition-none [@media(hover:hover)_and_(pointer:fine)]:hover:-translate-y-1 [@media(hover:hover)_and_(pointer:fine)]:hover:shadow-[0_34px_90px_rgba(15,33,70,0.2)] ${emphasisClass[emphasis]} ${className}`}
    >
      <div className="flex min-h-9 items-center justify-between gap-4 px-1 pb-3 sm:px-2">
        <span className="flex gap-1.5" aria-hidden>
          <span className="h-2.5 w-2.5 rounded-full bg-[#C5CFDD]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#D7DEE8]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#E4E9F0]" />
        </span>
        <span className="truncate text-[10px] font-extrabold tracking-[0.12em] text-[#6D7B90] sm:text-[11px]">{label}</span>
      </div>
      <div className={`relative overflow-hidden rounded-[0.875rem] border border-[#DFE6F1] bg-[#F5F8FF] ${aspectClassName}`}>
        <Image src={src} alt={alt} fill priority={priority} sizes={sizes} className={imageClassName} />
      </div>
      {caption ? <figcaption className={`${marketingCaption} px-1 pb-1 pt-3 sm:px-2`}>{caption}</figcaption> : null}
    </figure>
  );
}
