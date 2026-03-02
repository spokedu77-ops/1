/**
 * 신호 생성: 메모리 패턴, 일반 신호 (basic/stroop/dual)
 */

import { COLORS, ARROWS, NUMBERS, ACTIONS } from '../constants';

type ColorItem = (typeof COLORS)[number];

function generateWithMaxDup(
  pool: ColorItem[],
  count: number,
  maxDupRatio = 0.25
): ColorItem[] {
  const maxDups = Math.floor(count * maxDupRatio);
  const r = (arr: ColorItem[]) => arr[Math.floor(Math.random() * arr.length)];
  let attempts = 0;

  while (attempts < 200) {
    attempts++;
    const result: ColorItem[] = [];
    let dupCount = 0;

    for (let i = 0; i < count; i++) {
      const prevId = result[i - 1]?.id ?? null;
      const filtered = pool.filter((x) => x.id !== prevId);
      const pick = r(filtered.length > 0 ? filtered : pool);

      const seen = new Set(result.map((x) => x.id));
      if (seen.has(pick.id)) dupCount++;

      result.push(pick);
    }

    if (dupCount <= maxDups) return result;
  }
  return Array.from({ length: count }, (_, i) => pool[i % pool.length]);
}

export function generateMemoryPattern(level: number, colors: ColorItem[] = COLORS): ColorItem[] {
  if (level === 1) return generateWithMaxDup(colors, 2);
  if (level === 2) return generateWithMaxDup(colors, 3);
  if (level === 3) return generateWithMaxDup(colors, 10);
  if (level === 4) return generateWithMaxDup(colors, 4);
  return [];
}

const r = <T>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
const pair = <T>(arr: T[]) => {
  const ai = Math.floor(Math.random() * arr.length);
  let bi: number;
  do {
    bi = Math.floor(Math.random() * arr.length);
  } while (bi === ai);
  return [arr[ai], arr[bi]];
};
const triple = <T>(arr: T[]) => {
  const ai = Math.floor(Math.random() * arr.length);
  let bi: number;
  do {
    bi = Math.floor(Math.random() * arr.length);
  } while (bi === ai);
  let ci: number;
  do {
    ci = Math.floor(Math.random() * arr.length);
  } while (ci === ai || ci === bi);
  return [arr[ai], arr[bi], arr[ci]];
};

export function generateSignal(
  mode: string,
  level: number,
  colors: ColorItem[] = COLORS
): Record<string, unknown> | null {
  const activeColors = colors.length >= 2 ? colors : COLORS;

  if (mode === 'basic') {
    if (level === 1) {
      const c = r(activeColors);
      return { type: 'full_color', bg: c.bg, content: { symbol: c.symbol, name: c.name, textColor: c.text }, voice: null };
    }
    if (level === 2) {
      const a = r(ARROWS);
      return { type: 'arrow', bg: '#0F172A', content: a, voice: null };
    }
    if (level === 3) {
      const n = r(NUMBERS);
      return { type: 'number', bg: '#0F172A', content: n, voice: null };
    }
  }

  if (mode === 'stroop') {
    const stroopPool = activeColors.map((c) => ({ name: c.name, hex: c.bg }));
    if (level === 1) {
      const [w, tc] = pair(stroopPool);
      return { type: 'stroop', bg: '#0F172A', content: { word: w.name, textHex: tc.hex }, voice: tc.name };
    }
    if (level === 2) {
      const [w, tc, bg] = triple(stroopPool);
      return { type: 'stroop', bg: bg.hex, content: { word: w.name, textHex: tc.hex }, voice: tc.name };
    }
    if (level === 3) {
      const [w, tc] = pair(stroopPool);
      return { type: 'stroop', bg: '#0F172A', content: { word: w.name, textHex: tc.hex }, voice: w.name };
    }
  }

  if (mode === 'dual') {
    const c = r(activeColors);
    if (level === 1) {
      const n = NUMBERS[Math.floor(Math.random() * 4)];
      return { type: 'dual_num', bg: c.bg, content: { color: c, number: n }, voice: null };
    }
    if (level === 2) {
      const act = r(ACTIONS);
      return { type: 'dual_action', bg: c.bg, content: { color: c, action: act }, voice: null };
    }
    if (level === 3) {
      const [w, tc] = pair(activeColors.map((x) => ({ name: x.name, hex: x.bg })));
      const act = r(ACTIONS);
      return { type: 'dual_stroop_action', bg: '#0F172A', content: { word: w.name, textHex: tc.hex, action: act }, voice: null };
    }
  }

  return null;
}
