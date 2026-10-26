import type { ReactNode } from 'react';
import {
  marketingSectionContentStack,
  marketingSectionFrame,
  marketingSectionFrameCompact,
  marketingSectionInner,
} from '../lib/ui-classes';

type MarketingSectionFrameProps = {
  children: ReactNode;
  compact?: boolean;
  className?: string;
  innerClassName?: string;
};

/** 공개 마케팅 — 섹션 band + `.site-container` + 내부 stack */
export function MarketingSectionFrame({
  children,
  compact = false,
  className = '',
  innerClassName = '',
}: MarketingSectionFrameProps) {
  return (
    <section className={`${compact ? marketingSectionFrameCompact : marketingSectionFrame} ${className}`.trim()}>
      <div className={`${marketingSectionInner} ${marketingSectionContentStack} ${innerClassName}`.trim()}>
        {children}
      </div>
    </section>
  );
}
