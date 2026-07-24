/** 랜딩 카드 — 그림자·인디고 글래스 최소화 */

export type LandingCardVariant = 'image' | 'dark' | 'glass' | 'gradient';

export function landingCardShell(variant: LandingCardVariant = 'image'): string {
  switch (variant) {
    case 'dark':
      return 'border-white/10 bg-[#0B1F46] text-white';
    case 'glass':
      return 'border-[#DCE3EE] bg-white/90 text-slate-900';
    case 'gradient':
      return 'border-[#DCE3EE] bg-[#F5F7FB] text-slate-900';
    default:
      return 'border-[#DCE3EE] bg-white text-slate-900';
  }
}

export function landingCardBodyText(variant: LandingCardVariant): string {
  if (variant === 'dark') return 'text-white/70';
  return 'text-slate-600';
}

export function landingCardTitleText(variant: LandingCardVariant): string {
  if (variant === 'dark') return 'text-white';
  return 'text-[#0B1F46]';
}

export function landingCardBadgeText(variant: LandingCardVariant): string {
  if (variant === 'dark') return 'text-[#9FC0FF]';
  return 'text-[#245DFF]';
}
