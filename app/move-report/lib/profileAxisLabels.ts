import type { BreakdownResult } from '../types';
import type { MoveReportLocale } from './locale';

/**
 * 프로필 내부 키(예: CRPD) 4글자 → 부모용 축 라벨.
 * 키 문자 자체는 변경하지 않고 표시용으로만 사용한다.
 */
export function axisLabelsFromProfileKey(key: string, locale: MoveReportLocale = 'ko'): string[] | null {
  const k = key?.trim();
  if (k.length < 4) return null;
  const a = k[0];
  const b = k[1];
  const c = k[2];
  const d = k[3];
  if (locale === 'en') {
    return [
      a === 'C' ? 'Collaborative' : 'Independent',
      b === 'R' ? 'Rule-friendly' : 'Exploration-led',
      c === 'P' ? 'Process-focused' : 'Goal-driven',
      d === 'D' ? 'Dynamic energy' : 'Calm energy',
    ];
  }
  return [
    a === 'C' ? '협동형' : '독립형',
    b === 'R' ? '규칙 친화' : '탐구 지향',
    c === 'P' ? '과정 중시' : '목표 지향',
    d === 'D' ? '동적 에너지' : '정적 에너지',
  ];
}

/** 부모용 한 줄 요약 */
export function axisLabelsJoined(key: string, sep = ' · ', locale: MoveReportLocale = 'ko'): string {
  const labels = axisLabelsFromProfileKey(key, locale);
  if (!labels) return '';
  return labels.join(sep);
}

export type AxisHighlight = {
  label: string;
  score: number;
};

/** 응답 점수가 높은 축 1~2개 — 히어로 요약용 */
export function topAxisHighlights(
  bd: BreakdownResult,
  limit = 2,
  locale: MoveReportLocale = 'ko'
): AxisHighlight[] {
  const rows: AxisHighlight[] =
    locale === 'en'
      ? [
          {
            label: bd.social.sel === 'C' ? 'Collaborative' : 'Independent',
            score: Math.max(bd.social.l, bd.social.r),
          },
          {
            label: bd.structure.sel === 'R' ? 'Rule-friendly' : 'Exploration-led',
            score: Math.max(bd.structure.l, bd.structure.r),
          },
          {
            label: bd.motivation.sel === 'P' ? 'Process-focused' : 'Goal-driven',
            score: Math.max(bd.motivation.l, bd.motivation.r),
          },
          {
            label: bd.energy.sel === 'D' ? 'Dynamic energy' : 'Calm energy',
            score: Math.max(bd.energy.l, bd.energy.r),
          },
        ]
      : [
          {
            label: bd.social.sel === 'C' ? '협동형' : '독립형',
            score: Math.max(bd.social.l, bd.social.r),
          },
          {
            label: bd.structure.sel === 'R' ? '규칙 친화' : '탐구 지향',
            score: Math.max(bd.structure.l, bd.structure.r),
          },
          {
            label: bd.motivation.sel === 'P' ? '과정 중시' : '목표 지향',
            score: Math.max(bd.motivation.l, bd.motivation.r),
          },
          {
            label: bd.energy.sel === 'D' ? '동적 에너지' : '정적 에너지',
            score: Math.max(bd.energy.l, bd.energy.r),
          },
        ];
  return [...rows].sort((a, b) => b.score - a.score || a.label.localeCompare(b.label)).slice(0, limit);
}
