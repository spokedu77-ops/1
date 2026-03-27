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

type FruitSlide = { imageUrl: string; color: ColorItem };
type VariantPanel = { slide: FruitSlide };

const FRUIT_SLIDES: FruitSlide[] = [
  { imageUrl: 'https://i.postimg.cc/vgZrtFz0/APPLE(RED).jpg', color: COLORS.find((c) => c.id === 'red') ?? COLORS[0]! },
  { imageUrl: 'https://i.postimg.cc/yg8my4Pf/BLUBERRY(BLUE).jpg', color: COLORS.find((c) => c.id === 'blue') ?? COLORS[1]! },
  { imageUrl: 'https://i.postimg.cc/qhvsxVLj/BANANA(YELLOW).jpg', color: COLORS.find((c) => c.id === 'yellow') ?? COLORS[3]! },
  { imageUrl: 'https://i.postimg.cc/dkV2jPBj/KIWI(GREEN).jpg', color: COLORS.find((c) => c.id === 'green') ?? COLORS[2]! },
  { imageUrl: 'https://i.postimg.cc/QB0VTLwK/KOREANMELON(YELLOW).png', color: COLORS.find((c) => c.id === 'yellow') ?? COLORS[3]! },
  { imageUrl: 'https://i.postimg.cc/FfD1Lt8y/MELON(GREEN).jpg', color: COLORS.find((c) => c.id === 'green') ?? COLORS[2]! },
  { imageUrl: 'https://i.postimg.cc/Z9V0dk2P/STRAWBERRY(RED).jpg', color: COLORS.find((c) => c.id === 'red') ?? COLORS[0]! },
];

function buildVariantPanels(): VariantPanel[] {
  // 패턴 A: 2패널 모두 같은 이미지
  const patternA = (): VariantPanel[] => {
    const s = r(FRUIT_SLIDES);
    return [{ slide: s }, { slide: s }];
  };

  // 패턴 B: 2패널에 서로 다른 이미지 표시
  const patternB = (): VariantPanel[] => {
    const [s1, s2] = pair(FRUIT_SLIDES);
    return [{ slide: s1 }, { slide: s2 }];
  };

  return Math.random() < 0.5 ? patternA() : patternB();
}

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
      const panels = buildVariantPanels();
      return { type: 'basic_variant_color', bg: '#000000', content: { panels }, voice: null };
    }
    if (level === 3) {
      const a = r(ARROWS);
      return { type: 'arrow', bg: '#0F172A', content: a, voice: null };
    }
    if (level === 4) {
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

/** 반응 인지(basic) 세션 통계: 전환 중복 비율·연속 동일 신호 */
export type DupStats = {
  dupTransitionCount: number;
  transitionCount: number;
  dupRatio: number;
  maxConsecutiveSame: number;
  /** 연속 3회 이상이면 0 (표시 규칙) */
  displayMaxConsecutive: number;
  /** 방어 실패로 3연속이 발생한 경우 */
  tripleViolation: boolean;
};

export function signalFingerprint(sig: Record<string, unknown>): string {
  const t = sig.type as string;
  if (t === 'full_color') return `fc:${String(sig.bg ?? '')}`;
  if (t === 'basic_variant_color') {
    const panels =
      ((sig.content as { panels?: Array<{ slide?: { imageUrl?: string } }> })?.panels) ?? [];
    return `bvc:${panels.map((p) => p?.slide?.imageUrl ?? '').join('|')}`;
  }
  if (t === 'arrow') {
    const c = sig.content as { id?: string };
    return `ar:${c?.id ?? ''}`;
  }
  if (t === 'number') {
    const c = sig.content as { label?: string };
    return `nm:${c?.label ?? ''}`;
  }
  return `raw:${t}`;
}

/**
 * basic 모드: 연속 3동일 금지, 전환 중복 비율 &lt; 20% (엄격).
 */
export function createBasicSignalGenerator(level: number, colors: ColorItem[]) {
  let prev1: string | null = null;
  let prev2: string | null = null;
  let dupTrans = 0;
  let emitted = 0;
  let seqStreak = 0;
  let maxStreak = 0;
  let tripleViolation = false;

  const acceptSignal = (sig: Record<string, unknown>, fp: string) => {
    const wouldDup = prev1 !== null && fp === prev1;
    if (wouldDup) dupTrans++;
    if (emitted === 0) seqStreak = 1;
    else if (fp === prev1) seqStreak++;
    else seqStreak = 1;
    maxStreak = Math.max(maxStreak, seqStreak);
    if (seqStreak >= 3) tripleViolation = true;
    prev2 = prev1;
    prev1 = fp;
    emitted++;
    return sig;
  };

  const tryEmit = (): Record<string, unknown> | null => {
    const emittedBefore = emitted;
    for (let attempt = 0; attempt < 120; attempt++) {
      const sig = generateSignal('basic', level, colors);
      if (!sig) continue;
      const fp = signalFingerprint(sig);
      if (prev1 !== null && prev2 !== null && fp === prev1 && fp === prev2) continue;
      const wouldDup = prev1 !== null && fp === prev1;
      if (wouldDup && emittedBefore >= 1) {
        const transitionsAfter = emittedBefore;
        const newDup = dupTrans + 1;
        if (!(newDup / transitionsAfter < 0.2)) continue;
      }
      return acceptSignal(sig, fp);
    }
    for (let attempt = 0; attempt < 80; attempt++) {
      const sig = generateSignal('basic', level, colors);
      if (!sig) continue;
      const fp = signalFingerprint(sig);
      if (prev1 !== null && prev2 !== null && fp === prev1 && fp === prev2) continue;
      if (prev1 !== null && fp === prev1) continue;
      return acceptSignal(sig, fp);
    }
    const sig = generateSignal('basic', level, colors);
    if (!sig) return null;
    const fp = signalFingerprint(sig);
    return acceptSignal(sig, fp);
  };

  return {
    next: tryEmit,
    getStats(): DupStats {
      const transitionCount = Math.max(0, emitted - 1);
      const dupRatio = transitionCount > 0 ? dupTrans / transitionCount : 0;
      return {
        dupTransitionCount: dupTrans,
        transitionCount,
        dupRatio,
        maxConsecutiveSame: maxStreak,
        displayMaxConsecutive: maxStreak >= 3 ? 0 : maxStreak,
        tripleViolation,
      };
    },
  };
}
