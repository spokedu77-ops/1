import { getProfiles } from '../data/catalog';
import type { MoveReportLocale } from './locale';
import type { ComputeResult } from '../types';

/** 비어 있거나 기본값이면 locale 기본 표시명으로 통일 */
export function resolveMoveReportDisplayName(name: string, locale: MoveReportLocale = 'ko'): string {
  const t = name.trim();
  if (locale === 'en') {
    if (!t || t === 'child' || t.toLowerCase() === 'your child') return 'Your child';
    return t;
  }
  if (!t || t === '아이') return '우리 아이';
  return t;
}

const AXIS_SHORT = {
  ko: {
    social: { ll: '협동', rl: '독립' },
    structure: { ll: '규칙', rl: '탐색' },
    motivation: { ll: '과정', rl: '목표' },
    energy: { ll: '동적', rl: '정적' },
  },
  en: {
    social: { ll: 'Coop', rl: 'Solo' },
    structure: { ll: 'Rules', rl: 'Explore' },
    motivation: { ll: 'Process', rl: 'Goal' },
    energy: { ll: 'Dynamic', rl: 'Calm' },
  },
} as const;

export function compute(
  resps: string[],
  _age: string,
  name: string,
  locale: MoveReportLocale = 'ko'
): ComputeResult {
  const c: Record<string, number> = { C: 0, I: 0, R: 0, E: 0, P: 0, G: 0, D: 0, S: 0 };
  resps.forEach((v) => {
    if (v) c[v]++;
  });
  const pick = (a: string, b: string) => (c[a] >= c[b] ? a : b);
  const key = pick('C', 'I') + pick('R', 'E') + pick('P', 'G') + pick('D', 'S');
  const profiles = getProfiles(locale);
  const labels = AXIS_SHORT[locale];
  return {
    profile: profiles[key] || profiles['CRPD'],
    key,
    bd: {
      social: { l: c.C, r: c.I, ll: labels.social.ll, rl: labels.social.rl, sel: pick('C', 'I') },
      structure: {
        l: c.R,
        r: c.E,
        ll: labels.structure.ll,
        rl: labels.structure.rl,
        sel: pick('R', 'E'),
      },
      motivation: {
        l: c.P,
        r: c.G,
        ll: labels.motivation.ll,
        rl: labels.motivation.rl,
        sel: pick('P', 'G'),
      },
      energy: { l: c.D, r: c.S, ll: labels.energy.ll, rl: labels.energy.rl, sel: pick('D', 'S') },
    },
    displayName: resolveMoveReportDisplayName(name, locale),
  };
}
