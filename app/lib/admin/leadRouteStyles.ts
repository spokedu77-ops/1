import type { LeadRoute } from '@/app/spokedu/data/lead-envelope';

/** 문의 유형(route) badge — 목록/상세 공통. 조건 태그는 사용하지 않음. */
export const LEAD_ROUTE_STYLES: Record<
  LeadRoute,
  { badge: string; label: string }
> = {
  private: {
    label: '개인수업',
    badge: 'bg-cyan-500/15 text-cyan-200 ring-cyan-500/35',
  },
  dispatch: {
    label: '기관수업',
    badge: 'bg-violet-500/15 text-violet-200 ring-violet-500/35',
  },
  curriculum: {
    label: '커리큘럼',
    badge: 'bg-amber-500/15 text-amber-200 ring-amber-500/35',
  },
  other: {
    label: '기타',
    badge: 'bg-slate-500/20 text-slate-300 ring-slate-500/40',
  },
};

export function leadRouteBadgeClass(route: LeadRoute | null | undefined): string {
  if (!route) return LEAD_ROUTE_STYLES.other.badge;
  return LEAD_ROUTE_STYLES[route]?.badge ?? LEAD_ROUTE_STYLES.other.badge;
}
