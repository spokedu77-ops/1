import { koreanLineBreak, landingSectionTitle } from '../lib/ui-classes';

const accentEyebrow = {
  violet: 'text-violet-700',
  sky: 'text-sky-700',
  teal: 'text-teal-800',
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
      {eyebrow ? (
        <p className={`text-[11px] font-bold uppercase tracking-[0.2em] ${accentEyebrow[accent]}`}>{eyebrow}</p>
      ) : null}
      <h2 className={`${landingSectionTitle} ${eyebrow ? 'mt-1' : ''}`}>{title}</h2>
      {lead ? (
        <p className={`mt-2 max-w-3xl text-sm leading-relaxed text-slate-600 sm:text-[15px] ${koreanLineBreak}`}>
          {lead}
        </p>
      ) : null}
    </div>
  );
}
