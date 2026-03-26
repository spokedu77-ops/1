import { P } from '../data/profiles';
import type { ComputeResult } from '../types';

export function compute(resps: string[], _age: string, name: string): ComputeResult {
  const c: Record<string, number> = { C: 0, I: 0, R: 0, E: 0, P: 0, G: 0, D: 0, S: 0 };
  resps.forEach((v) => {
    if (v) c[v]++;
  });
  const pick = (a: string, b: string) => (c[a] >= c[b] ? a : b);
  const key = pick('C', 'I') + pick('R', 'E') + pick('P', 'G') + pick('D', 'S');
  return {
    profile: P[key] || P['CRPD'],
    key,
    bd: {
      social: { l: c.C, r: c.I, ll: '협동', rl: '독립', sel: pick('C', 'I') },
      structure: { l: c.R, r: c.E, ll: '규칙', rl: '탐색', sel: pick('R', 'E') },
      motivation: { l: c.P, r: c.G, ll: '과정', rl: '목표', sel: pick('P', 'G') },
      energy: { l: c.D, r: c.S, ll: '동적', rl: '정적', sel: pick('D', 'S') },
    },
    displayName: name.trim() || '우리 아이',
  };
}
