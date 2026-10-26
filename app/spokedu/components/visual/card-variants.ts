/** 랜딩 카드 — `marketingCardPadding`은 카드 내부에서 별도 적용 */

import { marketingCardPadding } from '../../lib/ui-classes';

export type LandingCardVariant = 'image' | 'dark' | 'glass' | 'gradient';

export { marketingCardPadding as marketingCardContentPad };

const cardFrameBase =
  'border [border-radius:var(--spokedu-marketing-radius-medium)] shadow-[var(--spokedu-marketing-shadow-subtle)]';

export function landingCardShell(variant: LandingCardVariant = 'image'): string {
  switch (variant) {
    case 'dark':
      return `${cardFrameBase} border-white/10 bg-[var(--spokedu-marketing-color-navy)] text-white`;
    case 'glass':
      return `${cardFrameBase} border-[var(--spokedu-marketing-color-border)] bg-white/90 [color:var(--spokedu-marketing-color-ink)]`;
    case 'gradient':
      return `${cardFrameBase} border-[var(--spokedu-marketing-color-border)] bg-[var(--spokedu-marketing-color-paper)] [color:var(--spokedu-marketing-color-ink)]`;
    default:
      return `${cardFrameBase} border-[var(--spokedu-marketing-color-border)] bg-[var(--spokedu-marketing-color-white)] [color:var(--spokedu-marketing-color-ink)]`;
  }
}

export function landingCardBodyText(variant: LandingCardVariant): string {
  if (variant === 'dark') return 'text-white/70';
  return '[color:var(--spokedu-marketing-color-body)]';
}

export function landingCardTitleText(variant: LandingCardVariant): string {
  if (variant === 'dark') return 'text-white';
  return '[color:var(--spokedu-marketing-color-ink)]';
}

export function landingCardBadgeText(variant: LandingCardVariant): string {
  if (variant === 'dark') return '[color:var(--spokedu-marketing-color-dark-eyebrow)]';
  return '[color:var(--spokedu-marketing-color-blue)]';
}
