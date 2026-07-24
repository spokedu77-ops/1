import { brandKicker, koreanLineBreak, landingSectionTitle } from '../lib/ui-classes';

const accentEyebrow = {
  violet: brandKicker,
  sky: brandKicker,
  teal: brandKicker,
} as const;

type LandingSectionHeadingProps = {
  eyebrow?: string;
  title: string;
  lead?: string;
  accent?: keyof typeof accentEyebrow;
  id?: string;
  className?: string;
};

export function LandingSectionHeading({
  eyebrow,
  title,
  lead,
  accent = 'violet',
  id,
  className = '',
}: LandingSectionHeadingProps) {
  return (
    <div id={id} className={`${id ? 'scroll-mt-20' : ''} ${className}`.trim()}>
      {eyebrow ? <p className={accentEyebrow[accent]}>{eyebrow}</p> : null}
      <h2 className={`${landingSectionTitle} ${eyebrow ? 'mt-1' : ''}`}>{title}</h2>
      {lead ? (
        <p className={`mt-2 max-w-3xl text-sm leading-relaxed text-slate-600 sm:text-[15px] ${koreanLineBreak}`}>
          {lead}
        </p>
      ) : null}
    </div>
  );
}
