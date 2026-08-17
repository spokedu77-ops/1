/** 랜딩 카드 — 그림자·인디고 글래스 최소화 */

export type LandingCardVariant = 'image' | 'dark' | 'glass' | 'gradient';

export function landingCardShell(variant: LandingCardVariant = 'image'): string {
  switch (variant) {
    case 'dark':
      return 'border-white/10 bg-[var(--spokedu-marketing-color-navy)] text-white';
    case 'glass':
      return 'border-[var(--spokedu-marketing-color-border)] bg-white/90 [color:var(--spokedu-marketing-color-ink)]';
    case 'gradient':
      return 'border-[var(--spokedu-marketing-color-border)] bg-[var(--spokedu-marketing-color-paper)] [color:var(--spokedu-marketing-color-ink)]';
    default:
      return 'border-[var(--spokedu-marketing-color-border)] bg-[var(--spokedu-marketing-color-white)] [color:var(--spokedu-marketing-color-ink)]';
  }
}

export function landingCardBodyText(variant: LandingCardVariant): string {
  if (variant === 'dark') return 'text-white/70';
  return '[color:var(--spokedu-marketing-color-body)]';
}

export function landingCardTitleText(variant: LandingCardVariant): string {
  if (variant === 'dark') return 'text-white';
  return '[color:var(--spokedu-marketing-color-navy)]';
}

export function landingCardBadgeText(variant: LandingCardVariant): string {
  if (variant === 'dark') return '[color:var(--spokedu-marketing-color-dark-eyebrow)]';
  return '[color:var(--spokedu-marketing-color-blue)]';
}
