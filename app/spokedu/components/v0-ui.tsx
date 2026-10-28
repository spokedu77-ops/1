import type { ReactNode } from 'react';
import {
  koreanLineBreak,
  v0Eyebrow,
  v0EyebrowDark,
  v0Lead,
  v0SectionKicker,
  v0SectionTitle,
} from '../lib/ui-classes';

/** v0 public landing — 통일 eyebrow (라이트 섹션) */
export function V0Eyebrow({
  children,
  dark = false,
  className = '',
}: {
  children: ReactNode;
  dark?: boolean;
  className?: string;
}) {
  return (
    <span className={`${dark ? v0EyebrowDark : v0Eyebrow} ${className}`.trim()}>{children}</span>
  );
}

/** v0 public landing — 섹션 eyebrow + h2 + optional lead */
export function V0SectionBlock({
  eyebrow,
  title,
  description,
  align = 'center',
  className = '',
  titleClassName = '',
}: {
  eyebrow: string;
  title: string;
  description?: string;
  align?: 'center' | 'left';
  className?: string;
  titleClassName?: string;
}) {
  const wrap =
    align === 'center' ? `mx-auto mb-14 max-w-2xl text-center ${koreanLineBreak}` : `max-w-3xl ${koreanLineBreak}`;
  return (
    <div className={`${wrap} ${className}`.trim()}>
      <V0Eyebrow>{eyebrow}</V0Eyebrow>
      <h2 className={`mt-5 text-balance ${v0SectionTitle} ${titleClassName}`.trim()}>{title}</h2>
      {description ? <p className={`mt-5 ${v0Lead}`}>{description}</p> : null}
    </div>
  );
}

/** v0 — DESIGN PRINCIPLES 등 좌측 정렬 kicker + h2 */
export function V0SectionHeader({
  kicker,
  title,
  className = '',
}: {
  kicker: string;
  title: string;
  className?: string;
}) {
  return (
    <div className={`mb-10 ${className}`.trim()}>
      <p className={v0SectionKicker}>{kicker}</p>
      <h2 className={`mt-3 ${v0SectionTitle}`}>{title}</h2>
    </div>
  );
}
