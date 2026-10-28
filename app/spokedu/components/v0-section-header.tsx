import type { ReactNode } from 'react';
import { koreanLineBreak, v0Eyebrow, v0Lead, v0SectionTitle } from '../lib/ui-classes';

type V0SectionHeaderProps = {
  eyebrow: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  align?: 'center' | 'left';
  className?: string;
  titleClassName?: string;
};

export function V0SectionHeader({
  eyebrow,
  title,
  description,
  align = 'center',
  className = '',
  titleClassName = '',
}: V0SectionHeaderProps) {
  const alignClass = align === 'center' ? 'mx-auto max-w-2xl text-center' : 'max-w-3xl text-left';

  return (
    <div className={`${alignClass} ${koreanLineBreak} ${className}`}>
      <span className={v0Eyebrow}>{eyebrow}</span>
      <h2 className={`mt-5 ${v0SectionTitle} text-slate-950 ${titleClassName}`}>{title}</h2>
      {description ? <p className={`mt-5 ${v0Lead}`}>{description}</p> : null}
    </div>
  );
}
