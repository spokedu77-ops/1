/** 랜딩 카드 — 그림자·인디고 글래스 최소화 */

export type LandingCardVariant = 'image' | 'dark' | 'glass' | 'gradient';

export function landingCardShell(variant: LandingCardVariant = 'image'): string {
  switch (variant) {
    case 'dark':
      return 'border-white/10 bg-[#07101f] text-white';
    case 'glass':
      return 'border-slate-200/80 bg-white/90 text-slate-900';
    case 'gradient':
      return 'border-slate-200/80 bg-[#F3F7FC] text-slate-900';
    default:
      return 'border-slate-200/80 bg-white text-slate-900';
  }
}

export function landingCardBodyText(variant: LandingCardVariant): string {
  if (variant === 'dark') return 'text-white/70';
  return 'text-slate-600';
}

export function landingCardTitleText(variant: LandingCardVariant): string {
  if (variant === 'dark') return 'text-white';
  return 'text-[#0B1220]';
}

export function landingCardBadgeText(variant: LandingCardVariant): string {
  if (variant === 'dark') return 'text-sky-300';
  return 'text-[#1D4ED8]';
}
