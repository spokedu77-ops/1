/** 랜딩 카드 리듬용 variant 클래스 (흰 박스 단조 방지) */

export type LandingCardVariant = 'image' | 'dark' | 'glass' | 'gradient';

export function landingCardShell(variant: LandingCardVariant = 'image'): string {
  switch (variant) {
    case 'dark':
      return 'border-slate-800 bg-slate-950 text-white shadow-xl shadow-slate-900/20 ring-1 ring-white/10';
    case 'glass':
      return 'border-white/40 bg-white/70 text-slate-900 shadow-lg shadow-indigo-900/8 backdrop-blur-md ring-1 ring-indigo-100/60';
    case 'gradient':
      return 'border-indigo-200/80 bg-gradient-to-br from-indigo-50 via-white to-lime-50/80 text-slate-900 shadow-md shadow-indigo-900/10';
    default:
      return 'border-slate-200 bg-white text-slate-900 shadow-[0_1px_0_rgba(15,23,42,0.04)]';
  }
}

export function landingCardBodyText(variant: LandingCardVariant): string {
  if (variant === 'dark') return 'text-slate-300';
  return 'text-slate-600';
}

export function landingCardTitleText(variant: LandingCardVariant): string {
  if (variant === 'dark') return 'text-white';
  return 'text-slate-900';
}

export function landingCardBadgeText(variant: LandingCardVariant): string {
  if (variant === 'dark') return 'text-sky-300';
  return 'text-indigo-600';
}
