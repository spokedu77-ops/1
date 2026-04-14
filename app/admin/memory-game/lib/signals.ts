/**
 * 신호 생성: 메모리 패턴, 일반 신호 (basic/stroop/dual)
 */

import { COLORS, ARROWS, NUMBERS, DUAL_TWO_COLORS, DUAL_LR_ARROWS } from '../constants';

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

/** Task Switching 「반대로」 — 보이는 색/방향의 짝 반대(콘 기준) */
export const TASK_SWITCH_OPPOSITE_COLOR_ID: Record<string, string> = {
  red: 'green',
  green: 'red',
  blue: 'yellow',
  yellow: 'blue',
};

export const TASK_SWITCH_OPPOSITE_ARROW_ID: Record<string, string> = {
  up: 'down',
  down: 'up',
  left: 'right',
  right: 'left',
};

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

export type FruitSlide = { imageUrl: string; color: ColorItem };
/** 패널: cells 권장. 하위호환 slide 단일 */
export type VariantPanelContent = {
  cells?: FruitSlide[];
  slide?: FruitSlide;
};

/**
 * 변형 색지각(basic 3~5번): 기본은 postimg 직링크. Asset Hub에서 Storage 경로를 넣으면 `buildFruitSlidesFromUrls`로 대체 URL 사용.
 */
export const VARIANT_FRUIT_IMAGE_URLS: readonly string[] = [
  'https://i.postimg.cc/T1qR0LG3/APPLE(RED).jpg',
  'https://i.postimg.cc/h49Pcwm6/BANANA(YELLOW).jpg',
  'https://i.postimg.cc/44zNsMc0/BLUBERRY(BLUE).jpg',
  'https://i.postimg.cc/G3khdNDW/GRAPE(BLUE).png',
  'https://i.postimg.cc/L4z627PQ/KIWI(GREEN).jpg',
  'https://i.postimg.cc/zX8DBjS5/KOREANMELON(YELLOW).png',
  'https://i.postimg.cc/PrTfx4zP/LEMON(YELLOW).png',
  'https://i.postimg.cc/yYs6dPX6/MELON(GREEN).jpg',
  'https://i.postimg.cc/kXsJtbf4/Pineapple(YELLOW).png',
  'https://i.postimg.cc/13z903jB/Strawberry(RED).png',
  'https://i.postimg.cc/52tx52Rn/WATERMELON(GREEN).png',
];

/** 슬롯 순서는 VARIANT_FRUIT_IMAGE_URLS·FRUIT_SLIDES와 동일 (콘 색 매핑) */
const VARIANT_SLOT_COLOR_IDS: readonly ('red' | 'yellow' | 'blue' | 'green')[] = [
  'red',
  'yellow',
  'blue',
  'blue',
  'green',
  'yellow',
  'yellow',
  'green',
  'yellow',
  'red',
  'green',
];

export function buildFruitSlidesFromUrls(urls: readonly string[]): FruitSlide[] {
  return urls.map((imageUrl, i) => ({
    imageUrl,
    color: COLORS.find((c) => c.id === VARIANT_SLOT_COLOR_IDS[i]) ?? COLORS[0]!,
  }));
}

/** Asset Hub 테마 슬롯(과일 외 4칸 등) — 비어 있지 않은 URL만, 콘 색은 슬롯 순서로 순환 */
export function buildVariantSlidesFromThemedUrls(urls: readonly string[]): FruitSlide[] {
  const out: FruitSlide[] = [];
  let colorIdx = 0;
  for (let i = 0; i < urls.length; i++) {
    const imageUrl = (urls[i] ?? '').trim();
    if (!imageUrl) continue;
    out.push({
      imageUrl,
      color: COLORS[colorIdx % COLORS.length]!,
    });
    colorIdx++;
  }
  return out;
}

export const DEFAULT_FRUIT_SLIDES: FruitSlide[] = buildFruitSlidesFromUrls(VARIANT_FRUIT_IMAGE_URLS);

function fruitPoolExcluding(excludeImageUrl: string | null, slides: FruitSlide[]): FruitSlide[] {
  if (!excludeImageUrl) return slides;
  const filtered = slides.filter((s) => s.imageUrl !== excludeImageUrl);
  return filtered.length > 0 ? filtered : slides;
}

/** 1단계: 가로 3패널 동일 과일 */
function buildVariantTier1(excludeImageUrl: string | null, slides: FruitSlide[]): VariantPanelContent[] {
  const s = r(fruitPoolExcluding(excludeImageUrl, slides));
  return [{ cells: [s] }, { cells: [s] }, { cells: [s] }];
}

/**
 * 2단계: 가로 3패널만(추가 열·패널 안 스택 없음).
 * 매 신호마다 1·2·3 중 **몇 개 패널에 과일을 둘지** 정하고, 그만큼 칸을 골라 **패널당 과일 1장**만 둠(전부 같은 과일).
 * 과일 없는 패널은 cells 비움 → 화면에선 흰 빈 칸.
 */
function buildVariantTier2(excludeImageUrl: string | null, slides: FruitSlide[]): VariantPanelContent[] {
  const s = r(fruitPoolExcluding(excludeImageUrl, slides));
  const k = r([1, 2, 3]);
  const chosen = fisherYates([0, 1, 2]).slice(0, k);
  const active = new Set(chosen);
  return [0, 1, 2].map((i) => (active.has(i) ? { cells: [s] } : { cells: [] }));
}

/** 3단계: 서로 다른 과일 2패널만 */
function buildVariantTier3(excludePairKey: string | null, slides: FruitSlide[]): VariantPanelContent[] {
  for (let attempt = 0; attempt < 200; attempt++) {
    const [a, b] = pair(slides);
    const key = [a!.imageUrl, b!.imageUrl].sort().join('|');
    if (excludePairKey && key === excludePairKey) continue;
    return [{ cells: [a!] }, { cells: [b!] }];
  }
  const [a, b] = pair(slides);
  return [{ cells: [a!] }, { cells: [b!] }];
}

export type GenerateSignalOptions = {
  /** 1·2단계: 직전과 동일 과일 URL 제외 */
  excludeVariantImageUrl?: string | null;
  /** 3단계: 직전과 동일 과일 쌍(정렬된 url1|url2) 제외 */
  excludeVariantPairKey?: string | null;
  /** Asset Hub 등에서 주입한 과일 슬롯(미지정 시 DEFAULT_FRUIT_SLIDES) */
  fruitSlides?: FruitSlide[];
  /** Task Switching 1단계: 직전 trial 규칙(연속 반대로 방지·약 30% 반대로 비율) */
  taskSwitchPrevRule?: 'color' | 'position' | 'reverse' | null;
};

export function generateSignal(
  mode: string,
  level: number,
  colors: ColorItem[] = COLORS,
  opts?: GenerateSignalOptions
): Record<string, unknown> | null {
  const activeColors = colors.length >= 2 ? colors : COLORS;

  if (mode === 'basic') {
    if (level === 1) {
      const c = r(activeColors);
      /** Think Studio StageA와 동일 2×2(PAD_GRID: 위 빨·초 / 아래 파·노), 해당 칸만 강조 */
      return {
        type: 'think_quad',
        bg: '#0F172A',
        content: {
          colorId: c.id,
          fillHex: c.bg,
          symbol: c.symbol,
          name: c.name,
          textColor: c.text,
        },
        voice: null,
      };
    }
    if (level === 2) {
      const c = r(activeColors);
      return {
        type: 'full_color',
        bg: c.bg,
        content: { symbol: c.symbol, textColor: c.text, name: c.name },
        voice: null,
      };
    }
    if (level === 3) {
      const vSlides = opts?.fruitSlides ?? DEFAULT_FRUIT_SLIDES;
      const panels = buildVariantTier1(opts?.excludeVariantImageUrl ?? null, vSlides);
      return {
        type: 'basic_variant_color',
        bg: '#000000',
        content: { variantTier: 1, panels },
        voice: null,
      };
    }
    if (level === 4) {
      const vSlides = opts?.fruitSlides ?? DEFAULT_FRUIT_SLIDES;
      const panels = buildVariantTier2(opts?.excludeVariantImageUrl ?? null, vSlides);
      return {
        type: 'basic_variant_color',
        bg: '#000000',
        content: { variantTier: 2, panels },
        voice: null,
      };
    }
    if (level === 5) {
      const vSlides = opts?.fruitSlides ?? DEFAULT_FRUIT_SLIDES;
      const panels = buildVariantTier3(opts?.excludeVariantPairKey ?? null, vSlides);
      return {
        type: 'basic_variant_color',
        bg: '#000000',
        content: { variantTier: 3, panels },
        voice: null,
      };
    }
    if (level === 6) {
      const a = r(ARROWS);
      return { type: 'arrow', bg: '#0F172A', content: a, voice: null };
    }
    if (level === 7) {
      const n = r(NUMBERS);
      return { type: 'number', bg: '#0F172A', content: n, voice: null };
    }
  }

  if (mode === 'stroop') {
    const stroopPool = activeColors.map((c) => ({ name: c.name, hex: c.bg }));
    const WHITE = '#FFFFFF';

    /** 1~4: 화살표 채움 — 신호마다 방향 말하기 vs 채움 색 말하기 무작위; 3·4는 역규칙(힌트 음성이 반대 차원) */
    const pickArrowStroop = (bgHex: string, reverse: boolean) => {
      const arrow = r(ARROWS);
      const fill = r(stroopPool);
      const taskDir = Math.random() < 0.5;
      const voice = !reverse
        ? taskDir
          ? arrow.voice
          : fill.name
        : taskDir
          ? fill.name
          : arrow.voice;
      return {
        type: 'stroop_arrow' as const,
        bg: bgHex,
        content: {
          arrowId: arrow.id,
          fillHex: fill.hex,
          stroopArrowTask: taskDir ? ('direction' as const) : ('fill' as const),
          stroopArrowReverse: reverse,
        },
        voice,
      };
    };

    const pickBgNotFill = (fillHex: string) => {
      const candidates = stroopPool.filter((c) => c.hex !== fillHex);
      return (candidates.length ? r(candidates) : r(stroopPool)).hex;
    };

    // 1~2: 화살표 스트룹/역스트룹 통합 (배경 흰색 / 배경 간섭)
    if (level === 1) return pickArrowStroop(WHITE, Math.random() < 0.5);
    if (level === 2) {
      const reverse = Math.random() < 0.5;
      const fill = r(stroopPool);
      const bgHex = pickBgNotFill(fill.hex);
      const arrow = r(ARROWS);
      const taskDir = Math.random() < 0.5;
      const voice = !reverse ? (taskDir ? arrow.voice : fill.name) : (taskDir ? fill.name : arrow.voice);
      return {
        type: 'stroop_arrow',
        bg: bgHex,
        content: {
          arrowId: arrow.id,
          fillHex: fill.hex,
          stroopArrowTask: taskDir ? ('direction' as const) : ('fill' as const),
          stroopArrowReverse: reverse,
        },
        voice,
      };
    }

    // 3: 글자 스트룹/역스트룹 통합(배경 흰색)
    if (level === 3) {
      const [w, tc] = pair(stroopPool);
      const sayMeaning = Math.random() < 0.5;
      const reverse = Math.random() < 0.5;
      return {
        type: 'stroop',
        bg: WHITE,
        content: {
          word: w.name,
          textHex: tc.hex,
          stroopKind: reverse
            ? (sayMeaning ? ('word_meaning_rev' as const) : ('ink_rev' as const))
            : (sayMeaning ? ('word_meaning' as const) : ('ink' as const)),
        },
        voice: !reverse ? (sayMeaning ? w.name : tc.name) : (sayMeaning ? tc.name : w.name),
      };
    }

    // 4~5: 기존 6·8번 유지
    if (level === 4) {
      for (let retry = 0; retry < 25; retry++) {
        const [w, tc, bg] = triple(stroopPool);
        const textHex = tc.hex;
        const bgHex = bg.hex;
        const wordMeaningHex = w.hex;
        if (textHex !== bgHex && textHex !== wordMeaningHex && bgHex !== wordMeaningHex) {
          return {
            type: 'stroop',
            bg: bgHex,
            content: { word: w.name, textHex, stroopKind: 'bg_interference' as const },
            voice: tc.name,
          };
        }
      }
      const [w, tc, bg] = triple(stroopPool);
      return {
        type: 'stroop',
        bg: bg.hex,
        content: { word: w.name, textHex: tc.hex, stroopKind: 'bg_interference' as const },
        voice: tc.name,
      };
    }
    if (level === 5) {
      const shuffled = fisherYates([...stroopPool]);
      const w = shuffled[0]!;
      const tc = shuffled[1]!;
      const bg = shuffled[2]!;
      const miss = shuffled[3]!;
      return {
        type: 'stroop',
        bg: bg.hex,
        content: {
          word: w.name,
          textHex: tc.hex,
          stroopKind: 'missing' as const,
          missingColorName: miss.name,
        },
        voice: miss.name,
      };
    }
  }

  if (mode === 'dual') {
    const lv = level === 2 ? 2 : 1;
    if (lv === 1) {
      const c = r(activeColors);
      const n = r(NUMBERS);
      return { type: 'dual_num', bg: c.bg, content: { color: c, number: n }, voice: null };
    }
    const c = r(DUAL_TWO_COLORS);
    const a = r(DUAL_LR_ARROWS);
    return { type: 'dual_color_arrow', bg: c.bg, content: { color: c, arrow: a }, voice: null };
  }

  if (mode === 'flanker') {
    const packRow = (
      circles: { id: string; bg: string; text: string }[],
      sizeMults?: number[]
    ) => ({
      type: 'flanker_row' as const,
      bg: '#0F172A',
      content: {
        circles,
        centerIndex: Math.floor((circles.length - 1) / 2),
        targetColorId: circles[Math.floor((circles.length - 1) / 2)]!.id,
        ...(sizeMults && sizeMults.length === circles.length ? { sizeMults } : {}),
      },
      voice: null,
    });
    if (level === 1) {
      const c = r(activeColors);
      const circles = Array.from({ length: 5 }, () => ({
        id: c.id,
        bg: c.bg,
        text: c.text,
      }));
      return packRow(circles);
    }
    if (level === 2) {
      const pool = activeColors.length >= 2 ? activeColors : COLORS;
      const pickThree = (): [ColorItem, ColorItem, ColorItem] => {
        if (pool.length >= 3) {
          const s = fisherYates([...pool]);
          return [s[0]!, s[1]!, s[2]!];
        }
        if (pool.length === 2) {
          return [pool[0]!, pool[1]!, r(pool)];
        }
        return [pool[0]!, pool[0]!, pool[0]!];
      };
      const [left, mid, right] = pickThree();
      const cell = (c: ColorItem) => ({ id: c.id, bg: c.bg, text: c.text });
      /** 1번·5번 / 2·3·4번 / 서로 다른 색 그룹(가능 시 3색) */
      const circles = [cell(left), cell(mid), cell(mid), cell(mid), cell(right)];
      return packRow(circles);
    }
    if (level === 3) {
      const circles = Array.from({ length: 5 }, () => {
        const c = r(activeColors);
        return { id: c.id, bg: c.bg, text: c.text };
      });
      return packRow(circles);
    }
    if (level === 4) {
      const pool = activeColors.length >= 2 ? activeColors : COLORS;
      /** 5슬롯: 색 다양성(팔레트 크기에 맞는 상한) · 인접 동일 색 금지 — 4색이면 최대 2회 등 */
      const maxPer = Math.max(2, Math.ceil(5 / Math.max(1, pool.length)));
      const colorSeq = generateColorsWithPerMax(pool, 5, maxPer);
      const circles = colorSeq.map((c) => ({ id: c.id, bg: c.bg, text: c.text }));
      /** 원마다 다른 상대 크기(셔플) — 표시층에서 행 너비·30vmin 상한과 맞춤 */
      const sizeMults = fisherYates([0.68, 0.78, 0.9, 1.05, 1.22]);
      return packRow(circles, sizeMults);
    }
    if (level === 5) {
      const pool = activeColors.length >= 2 ? activeColors : COLORS;
      const colorSeq = generateColorsWithPerMax(pool, 3, 2);
      const circles = colorSeq.map((c) => ({ id: c.id, bg: c.bg, text: c.text }));
      const sizeMults = fisherYates([1.0, 0.62, 0.28]);
      return packRow(circles, sizeMults);
    }
    if (level === 6) {
      const pool = activeColors.length >= 2 ? activeColors : COLORS;
      const maxPer = Math.max(2, Math.ceil(5 / Math.max(1, pool.length)));
      const colorSeq = generateColorsWithPerMax(pool, 5, maxPer);
      const circles = colorSeq.map((c) => ({ id: c.id, bg: c.bg, text: c.text }));
      const sizeMults = fisherYates([1.0, 0.62, 0.44, 0.28, 0.14]);
      return packRow(circles, sizeMults);
    }
    return null;
  }

  /** Go/No-Go: 억제 통제 — Go는 이동, No-Go는 제자리(멈춤) */
  if (mode === 'gonogo') {
    const goColorIds = new Set(['red', 'blue', 'yellow']);
    if (level === 1) {
      const poolGo = COLORS.filter((c) => goColorIds.has(c.id)).filter((c) => activeColors.some((a) => a.id === c.id));
      const green = COLORS.find((c) => c.id === 'green');
      const poolNg = green && activeColors.some((a) => a.id === 'green') ? [green] : [];
      const pack = (c: ColorItem, isGo: boolean) => ({
        type: 'gonogo_color' as const,
        bg: c.bg,
        content: {
          colorId: c.id,
          symbol: c.symbol,
          textColor: c.text,
          name: c.name,
          isGo,
        },
        voice: null,
      });
      if (poolGo.length > 0 && poolNg.length > 0) {
        if (Math.random() < 0.5) return pack(r(poolGo), true);
        return pack(poolNg[0]!, false);
      }
      if (poolGo.length > 0) return pack(r(poolGo), true);
      if (poolNg.length > 0) return pack(poolNg[0]!, false);
      const c = r(activeColors);
      return pack(c, goColorIds.has(c.id));
    }
    if (level === 2) {
      const isGo = Math.random() < 0.5;
      const shape = isGo ? ('circle' as const) : ('triangle' as const);
      const fill = r(COLORS);
      return {
        type: 'gonogo_shape',
        bg: '#0F172A',
        content: { shape, isGo, fillHex: fill.bg },
        voice: null,
      };
    }
    if (level === 3) {
      const isGo = Math.random() < 0.5;
      if (isGo) {
        const a = r(ARROWS);
        return {
          type: 'gonogo_action',
          bg: '#0F172A',
          content: {
            kind: 'arrow' as const,
            arrowId: a.id,
            icon: a.icon,
            label: a.label,
            isGo: true,
          },
          voice: null,
        };
      }
      return {
        type: 'gonogo_action',
        bg: '#0F172A',
        content: { kind: 'stop' as const, isGo: false },
        voice: null,
      };
    }
    if (level === 4) {
      const isGo = Math.random() < 0.5;
      const shape = isGo ? ('circle' as const) : ('triangle' as const);
      const randomBg = r(COLORS).bg;
      return {
        type: 'gonogo_dual',
        bg: randomBg,
        content: { shape, isGo },
        voice: null,
      };
    }
    return null;
  }

  /** Task Switching: 규칙(색 / 위치 / 반대로) + cue 표현 단계(1=글자 2=아이콘 3=테두리) */
  if (mode === 'taskswitch') {
    const cueTier = level >= 1 && level <= 3 ? level : 1;
    type TsRule = 'color' | 'position' | 'reverse';
    const prevRule = opts?.taskSwitchPrevRule ?? null;
    let rule: TsRule;
    if (level === 1) {
      const u = Math.random();
      if (prevRule === 'reverse') {
        /** 연속 「반대로」 방지 — 색/위치만 */
        rule = u < 0.5 ? 'color' : 'position';
      } else {
        /** 약 30% 반대로, 나머지는 색·위치 균등 */
        if (u < 0.3) rule = 'reverse';
        else if (u < 0.65) rule = 'color';
        else rule = 'position';
      }
    } else {
      rule = (['color', 'position', 'reverse'] as const)[Math.floor(Math.random() * 3)]!;
    }

    const pack = (tsRule: TsRule, sk: 'color' | 'arrow', payload: Record<string, unknown>): Record<string, unknown> => {
      const { bg: bgVal, ...rest } = payload;
      return {
        type: 'task_switch' as const,
        bg: (bgVal as string) ?? '#0F172A',
        content: {
          cueTier,
          rule: tsRule,
          stimulusKind: sk,
          ...rest,
        },
        voice: null,
      };
    };

    if (rule === 'color') {
      const c = r(activeColors);
      return pack('color', 'color', {
        bg: c.bg,
        colorId: c.id,
        symbol: c.symbol,
        textColor: c.text,
        name: c.name,
      });
    }
    if (rule === 'position') {
      const a = r(ARROWS);
      return pack('position', 'arrow', {
        bg: '#0F172A',
        arrowId: a.id,
        icon: a.icon,
        label: a.label,
      });
    }
    const useColor = Math.random() < 0.5;
    if (useColor) {
      const c = r(activeColors);
      return pack('reverse', 'color', {
        bg: c.bg,
        colorId: c.id,
        symbol: c.symbol,
        textColor: c.text,
        name: c.name,
      });
    }
    const a = r(ARROWS);
    return pack('reverse', 'arrow', {
      bg: '#0F172A',
      arrowId: a.id,
      icon: a.icon,
      label: a.label,
    });
  }

  /** 사이먼: 위치는 createSimonSignalGenerator에서 양극단 순환으로만 생성 */
  if (mode === 'simon') return null;

  return null;
}

/**
 * 사이먼 효과: 화면 좌·우·상·하 양극단을 번갈아 배치(도형 중심 좌표 0~1).
 * 직교 방향은 안전 여백 안에서 무작위로 살짝 흔들어 매 신호 질감 유지.
 */
export function pickSimonPolePosition(edge: number, margin = 0.125): { posX: number; posY: number } {
  const m = Math.max(0.08, Math.min(0.16, margin));
  const span = Math.max(0.2, 1 - 2 * m);
  const ortho = () => m + Math.random() * span;
  const poleJitter = () => 0.006 + Math.random() * 0.028;
  switch (edge % 4) {
    case 0:
      return { posX: m + poleJitter(), posY: ortho() };
    case 1:
      return { posX: 1 - m - poleJitter(), posY: ortho() };
    case 2:
      return { posX: ortho(), posY: m + poleJitter() };
    case 3:
    default:
      return { posX: ortho(), posY: 1 - m - poleJitter() };
  }
}

/** 사이먼 전용: 1번=도형+색 / 2번=↑↓←→ 화살표+방향 · 색(또는 방향) 중복 규칙 + 좌→우→상→하 극단 순환 */
export function createSimonSignalGenerator(level: number, colors: ColorItem[]) {
  const activeColors = colors.length >= 2 ? colors : COLORS;
  let edgeIdx = 0;
  return createColorDupConstrainedGenerator(
    () => {
      const { posX, posY } = pickSimonPolePosition(edgeIdx % 4);
      if (level === 1) {
        const shapes = ['circle', 'triangle', 'square'] as const;
        const shape = shapes[Math.floor(Math.random() * shapes.length)]!;
        const c = r(activeColors);
        return {
          type: 'simon_shape',
          bg: '#0F172A',
          content: {
            shape,
            fillHex: c.bg,
            colorId: c.id,
            name: c.name,
            textColor: c.text,
            posX,
            posY,
          },
          voice: null,
        };
      }
      if (level === 2) {
        const a = ARROWS[Math.floor(Math.random() * ARROWS.length)]!;
        return {
          type: 'simon_arrow',
          bg: '#0F172A',
          content: {
            arrowId: a.id,
            icon: a.icon,
            label: a.label,
            posX,
            posY,
          },
          voice: null,
        };
      }
      return null;
    },
    colorDupFingerprint,
    () => {
      edgeIdx = (edgeIdx + 1) % 4;
    }
  );
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
  if (t === 'think_quad') {
    const id = (sig.content as { colorId?: string })?.colorId ?? '';
    return `tq:${id}`;
  }
  if (t === 'basic_variant_color') {
    const c = sig.content as {
      variantTier?: number;
      panels?: VariantPanelContent[];
    };
    const tier = c.variantTier ?? 1;
    const panels = c.panels ?? [];
    const part = panels
      .map((p) => {
        const cells = p.cells ?? (p.slide ? [p.slide] : []);
        return cells.map((s) => s.imageUrl).join(',');
      })
      .join(';');
    return `bvc:${tier}:${part}`;
  }
  if (t === 'arrow') {
    const c = sig.content as { id?: string };
    return `ar:${c?.id ?? ''}`;
  }
  if (t === 'number') {
    const c = sig.content as { label?: string };
    return `nm:${c?.label ?? ''}`;
  }
  if (t === 'stroop') {
    const c = sig.content as { word?: string; textHex?: string; stroopKind?: string; missingColorName?: string };
    return `st:${String(sig.bg ?? '')}:${c.word}:${c.textHex}:${c.stroopKind ?? ''}:${c.missingColorName ?? ''}`;
  }
  if (t === 'stroop_arrow') {
    const c = sig.content as {
      arrowId?: string;
      fillHex?: string;
      stroopArrowTask?: string;
      stroopArrowReverse?: boolean;
    };
    return `sta:${String(sig.bg ?? '')}:${c.arrowId}:${c.fillHex}:${c.stroopArrowTask}:${c.stroopArrowReverse}`;
  }
  if (t === 'simon_shape') {
    const c = sig.content as { shape?: string; fillHex?: string; posX?: number; posY?: number };
    return `simon:${c.shape}:${c.fillHex}:${((c.posX ?? 0) * 1000) | 0}:${((c.posY ?? 0) * 1000) | 0}`;
  }
  if (t === 'simon_arrow') {
    const c = sig.content as { arrowId?: string; posX?: number; posY?: number };
    return `simon_ar:${c.arrowId}:${((c.posX ?? 0) * 1000) | 0}:${((c.posY ?? 0) * 1000) | 0}`;
  }
  if (t === 'flanker_row') {
    const c = sig.content as {
      circles?: { id: string }[];
      targetColorId?: string;
      sizeMults?: number[];
    };
    const ids = (c.circles ?? []).map((x) => x.id).join(',');
    const sm = (c.sizeMults ?? []).map((x) => (Math.round(x * 1000) / 1000).toString()).join(',');
    return `fk:${c.targetColorId ?? ''}:${ids}:${sm}`;
  }
  if (t === 'gonogo_color') {
    const c = sig.content as { colorId?: string; isGo?: boolean };
    return `gnc:${c.colorId ?? ''}:${String(c.isGo)}`;
  }
  if (t === 'gonogo_shape') {
    const c = sig.content as { shape?: string; isGo?: boolean };
    return `gns:${c.shape ?? ''}:${String(c.isGo)}`;
  }
  if (t === 'gonogo_action') {
    const c = sig.content as { kind?: string; arrowId?: string; isGo?: boolean };
    return `gna:${c.kind ?? ''}:${c.arrowId ?? ''}:${String(c.isGo)}`;
  }
  if (t === 'gonogo_dual') {
    const c = sig.content as { shape?: string; isGo?: boolean };
    return `gnd:${c.shape ?? ''}:${String(c.isGo)}`;
  }
  if (t === 'task_switch') {
    const c = sig.content as {
      cueTier?: number;
      rule?: string;
      stimulusKind?: string;
      colorId?: string;
      arrowId?: string;
    };
    return `ts:${c.cueTier ?? 0}:${c.rule ?? ''}:${c.stimulusKind ?? ''}:${c.colorId ?? ''}:${c.arrowId ?? ''}`;
  }
  return `raw:${t}`;
}

/** 연속 동일 전환 비율 상한 — basic(전 지문)·사이먼/듀얼/스트룹(색 지문) 공통 */
const SIGNAL_DUP_RATIO_MAX = 0.2;

/**
 * basic 모드: 연속 3동일 금지, 전환 중복 비율 &lt; 20% (엄격).
 */
export function createBasicSignalGenerator(
  level: number,
  colors: ColorItem[],
  fruitSlides: FruitSlide[] = DEFAULT_FRUIT_SLIDES
) {
  let prev1: string | null = null;
  let prev2: string | null = null;
  let dupTrans = 0;
  let emitted = 0;
  let seqStreak = 0;
  let maxStreak = 0;
  let tripleViolation = false;
  /** 1·2단계: 직전 대표 과일 URL */
  let lastVariantImageUrl: string | null = null;
  /** 3단계: 직전 과일 쌍 키 (정렬 url|url) */
  let lastVariantPairKey: string | null = null;

  const genOpts = (): GenerateSignalOptions => {
    const o: GenerateSignalOptions = { fruitSlides };
    if (level === 3 || level === 4) o.excludeVariantImageUrl = lastVariantImageUrl;
    else if (level === 5) o.excludeVariantPairKey = lastVariantPairKey;
    return o;
  };

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
    if ((sig.type as string) === 'basic_variant_color') {
      const content = sig.content as { variantTier?: number; panels?: VariantPanelContent[] };
      const tier = content.variantTier ?? 1;
      const panels = content.panels ?? [];
      if (tier === 3) {
        const urls = panels
          .flatMap((p) => (p.cells ?? (p.slide ? [p.slide] : [])).map((s) => s.imageUrl))
          .filter(Boolean)
          .sort();
        lastVariantPairKey = urls.length >= 2 ? `${urls[0]}|${urls[1]}` : urls[0] ?? null;
        lastVariantImageUrl = null;
      } else {
        const withFruit = panels.find((p) => (p.cells ?? (p.slide ? [p.slide] : [])).length > 0);
        const cells = withFruit?.cells ?? (withFruit?.slide ? [withFruit.slide] : []);
        lastVariantImageUrl = cells[0]?.imageUrl ?? null;
        lastVariantPairKey = null;
      }
    }
    return sig;
  };

  const tryEmit = (): Record<string, unknown> | null => {
    const emittedBefore = emitted;
    for (let attempt = 0; attempt < 120; attempt++) {
      const sig = generateSignal('basic', level, colors, genOpts());
      if (!sig) continue;
      const fp = signalFingerprint(sig);
      if (prev1 !== null && prev2 !== null && fp === prev1 && fp === prev2) continue;
      const wouldDup = prev1 !== null && fp === prev1;
      if (wouldDup && emittedBefore >= 1) {
        const transitionsAfter = emittedBefore;
        const newDup = dupTrans + 1;
        if (!(newDup / transitionsAfter < SIGNAL_DUP_RATIO_MAX)) continue;
      }
      return acceptSignal(sig, fp);
    }
    for (let attempt = 0; attempt < 80; attempt++) {
      const sig = generateSignal('basic', level, colors, genOpts());
      if (!sig) continue;
      const fp = signalFingerprint(sig);
      if (prev1 !== null && prev2 !== null && fp === prev1 && fp === prev2) continue;
      if (prev1 !== null && fp === prev1) continue;
      return acceptSignal(sig, fp);
    }
    const sig = generateSignal('basic', level, colors, genOpts());
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

/**
 * 색 기준 연속 중복 판정용 지문(반응 인지 basic 외: 사이먼·듀얼·스트룹 등).
 * basic 모드는 signalFingerprint 전체를 쓰므로 여기서는 쓰지 않음.
 */
export function colorDupFingerprint(sig: Record<string, unknown>): string {
  const t = sig.type as string;
  if (t === 'simon_shape') {
    const c = sig.content as { colorId?: string };
    return `cd:${c.colorId ?? ''}`;
  }
  if (t === 'simon_arrow') {
    const c = sig.content as { arrowId?: string };
    return `cd:${c.arrowId ?? ''}`;
  }
  if (t === 'flanker_row') {
    const c = sig.content as { targetColorId?: string };
    return `cd:${c.targetColorId ?? ''}`;
  }
  if (t === 'gonogo_color') {
    const c = sig.content as { colorId?: string; isGo?: boolean };
    return `cd:gn:c:${c.colorId ?? ''}:${String(c.isGo)}`;
  }
  if (t === 'gonogo_shape') {
    const c = sig.content as { shape?: string; isGo?: boolean };
    return `cd:gn:s:${c.shape ?? ''}:${String(c.isGo)}`;
  }
  if (t === 'gonogo_action') {
    const c = sig.content as { kind?: string; arrowId?: string; isGo?: boolean };
    return `cd:gn:a:${c.kind ?? ''}:${c.arrowId ?? ''}:${String(c.isGo)}`;
  }
  if (t === 'gonogo_dual') {
    const c = sig.content as { shape?: string; isGo?: boolean };
    return `cd:gn:d:${c.shape ?? ''}:${String(c.isGo)}`;
  }
  if (t === 'task_switch') {
    return `cd:${signalFingerprint(sig)}`;
  }
  if (t === 'dual_num' || t === 'dual_color_arrow') {
    const col = (sig.content as { color?: { id?: string } })?.color;
    return `cd:${col?.id ?? ''}`;
  }
  if (t === 'stroop_arrow') {
    const c = sig.content as { fillHex?: string };
    return `cd:${c.fillHex ?? ''}`;
  }
  if (t === 'stroop') {
    const c = sig.content as { textHex?: string };
    return `cd:${c.textHex ?? ''}`;
  }
  return `cd:full:${signalFingerprint(sig)}`;
}

/**
 * 사이먼·듀얼·스트룹 등: 연속 동일 **색** 전환 비율 &lt; 20%, 연속 3동일 색 금지(basic과 동일 정책).
 */
export function createColorDupConstrainedGenerator(
  emitRaw: () => Record<string, unknown> | null,
  fingerprint: (sig: Record<string, unknown>) => string = colorDupFingerprint,
  onAfterAccept?: () => void
) {
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
    onAfterAccept?.();
    return sig;
  };

  const tryEmit = (): Record<string, unknown> | null => {
    const emittedBefore = emitted;
    for (let attempt = 0; attempt < 120; attempt++) {
      const sig = emitRaw();
      if (!sig) continue;
      const fp = fingerprint(sig);
      if (prev1 !== null && prev2 !== null && fp === prev1 && fp === prev2) continue;
      const wouldDup = prev1 !== null && fp === prev1;
      if (wouldDup && emittedBefore >= 1) {
        const transitionsAfter = emittedBefore;
        const newDup = dupTrans + 1;
        if (!(newDup / transitionsAfter < SIGNAL_DUP_RATIO_MAX)) continue;
      }
      return acceptSignal(sig, fp);
    }
    for (let attempt = 0; attempt < 80; attempt++) {
      const sig = emitRaw();
      if (!sig) continue;
      const fp = fingerprint(sig);
      if (prev1 !== null && prev2 !== null && fp === prev1 && fp === prev2) continue;
      if (prev1 !== null && fp === prev1) continue;
      return acceptSignal(sig, fp);
    }
    const sig = emitRaw();
    if (!sig) return null;
    const fp = fingerprint(sig);
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

export function createModeColorDupGenerator(
  mode: string,
  level: number,
  colors: ColorItem[],
  opts?: GenerateSignalOptions
) {
  return createColorDupConstrainedGenerator(
    () => generateSignal(mode, level, colors, opts),
    colorDupFingerprint
  );
}

/**
 * Task Switching: 1단계에서 직전 규칙을 넘겨 연속 「반대로」를 막고 약 30% 비율을 맞춤.
 */
export function createTaskSwitchSignalGenerator(level: number, colors: ColorItem[], opts?: GenerateSignalOptions) {
  let lastRule: 'color' | 'position' | 'reverse' | null = null;
  const base = createColorDupConstrainedGenerator(
    () => generateSignal('taskswitch', level, colors, { ...opts, taskSwitchPrevRule: lastRule }),
    colorDupFingerprint
  );
  return {
    next(): Record<string, unknown> | null {
      const sig = base.next();
      if (sig && (sig.type as string) === 'task_switch') {
        const r = (sig.content as { rule?: string }).rule;
        if (r === 'color' || r === 'position' || r === 'reverse') lastRule = r;
      }
      return sig;
    },
    getStats: base.getStats,
  };
}
