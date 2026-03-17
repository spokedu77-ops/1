/**
 * 신호 생성: 메모리 패턴, 일반 신호 (basic/stroop/dual)
 */

import { COLORS, ARROWS, NUMBERS, ACTIONS } from '../constants';

type ColorItem = (typeof COLORS)[number];
export type { ColorItem };

export type Level4Item = { num: number; color: ColorItem };

/** 레벨 1·2용: 전체 중복 횟수 기반 제한 (기존 로직 유지) */
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
  return Array.from({ length: count }, (_, i) => pool[i % pool.length]!);
}

/**
 * 레벨 3·4용: 색깔별 최대 등장 횟수(maxPerColor) 제한 + 인접 중복 금지.
 * 완전 랜덤 배열로 패턴이 보이지 않도록 greedy + retry.
 */
function generateColorsWithPerMax(
  pool: ColorItem[],
  count: number,
  maxPerColor: number
): ColorItem[] {
  for (let attempt = 0; attempt < 500; attempt++) {
    const result: ColorItem[] = [];
    const freq = new Map<string, number>();
    let ok = true;

    for (let i = 0; i < count; i++) {
      const prevId = result[i - 1]?.id ?? null;
      const available = pool.filter(
        (c) => c.id !== prevId && (freq.get(c.id) ?? 0) < maxPerColor
      );
      if (available.length === 0) { ok = false; break; }
      const pick = available[Math.floor(Math.random() * available.length)]!;
      result.push(pick);
      freq.set(pick.id, (freq.get(pick.id) ?? 0) + 1);
    }

    if (ok && result.length === count) return result;
  }
  // 폴백: 라운드로빈
  return Array.from({ length: count }, (_, i) => pool[i % pool.length]!);
}

function fisherYates<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

export function generateMemoryPattern(level: number, colors: ColorItem[] = COLORS): ColorItem[] {
  if (level === 1) return generateWithMaxDup(colors, 3);
  if (level === 2) return generateWithMaxDup(colors, 5);
  if (level === 3) return generateColorsWithPerMax(colors, 10, 3);
  return [];
}

/**
 * 레벨 4 패턴 생성:
 * - 10개의 아이템, 각각 색깔(최대 3회 중복) + 번호(1~10, 셔플된 순서)
 */
export function generateLevel4Pattern(colors: ColorItem[] = COLORS): Level4Item[] {
  const colorSeq = generateColorsWithPerMax(colors, 10, 3);
  const nums = fisherYates([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  return nums.map((num, i) => ({ num, color: colorSeq[i]! }));
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
      // 글자색(textHex), 배경색(bg), 글자 내용(word)이 가리키는 색 — 세 값이 모두 달라야 함
      for (let retry = 0; retry < 25; retry++) {
        const [w, tc, bg] = triple(stroopPool);
        const textHex = tc.hex;
        const bgHex = bg.hex;
        const wordMeaningHex = w.hex;
        if (textHex !== bgHex && textHex !== wordMeaningHex && bgHex !== wordMeaningHex) {
          return { type: 'stroop', bg: bgHex, content: { word: w.name, textHex }, voice: tc.name };
        }
      }
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
