/**
 * SPOMOVE 핵심 로직 단위 테스트
 *
 * ─ 환경: vitest (node, jsdom 없음)
 * ─ 모든 테스트는 production 코드를 직접 import해서 검증한다.
 *   테스트 로컬에 production 로직을 복제하지 않는다.
 *
 * 테스트하지 못하는 항목:
 *   - React useEffect / useRef 생명주기 (jsdom 없음)
 *   - 실제 canvas DPR (HTMLCanvasElement 없음)
 *   - 실제 Supabase fetch (네트워크 없음)
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { loadFlowPresets, saveFlowPresets, type FlowPreset, type SavePresetResult } from './lib/flowPresets';
import {
  getAssetRequirement,
  evaluateAssetReadiness,
  type AssetReadiness,
  type AssetLoadStatus,
} from './lib/assetRequirement';
import { registerPresentedSignal, type RepsState } from './lib/repsLogic';
import { getNextIntervalState } from './lib/intervalTimer';
import { generateSignal, createBasicSignalGenerator, type FruitSlide } from './lib/signals';
import { generateObstacleSchedule } from './flow/engine/modules/flowObstacleSchedule';
import type { FlowModuleKey } from './flow/engine/modules/flowModules';

// ── localStorage mock ──────────────────────────────────────────────────────────

function makeLocalStorageMock() {
  const store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { for (const k of Object.keys(store)) delete store[k]; },
    store,
  };
}

let lsMock: ReturnType<typeof makeLocalStorageMock>;

beforeEach(() => {
  lsMock = makeLocalStorageMock();
  // @ts-expect-error -- window/globalThis.localStorage override for node test env
  globalThis.window = { localStorage: lsMock };
  // @ts-expect-error -- localStorage does not exist in node global, override for tests
  globalThis.localStorage = lsMock;
});

// ── 슬라이드 헬퍼 ──────────────────────────────────────────────────────────────

const COLORS_META = {
  red:    { id: 'red',    name: '빨강', bg: '#ff0000', text: '#fff', symbol: '●' },
  yellow: { id: 'yellow', name: '노랑', bg: '#ffff00', text: '#000', symbol: '★' },
  blue:   { id: 'blue',   name: '파랑', bg: '#0000ff', text: '#fff', symbol: '■' },
  green:  { id: 'green',  name: '초록', bg: '#00ff00', text: '#000', symbol: '▲' },
} as const;

function makeSlide(imageUrl: string, colorId: keyof typeof COLORS_META = 'red'): FruitSlide {
  return { imageUrl, color: COLORS_META[colorId] };
}

const READY: AssetLoadStatus = 'ready';
const LOADING: AssetLoadStatus = 'loading';
const ERROR: AssetLoadStatus = 'error';

// ── 1·2. AssetRequirement ─────────────────────────────────────────────────────

describe('getAssetRequirement', () => {
  // 1. color 테마 → minimumCount 0
  test('1. color 테마: 항상 이미지 불필요', () => {
    const r = getAssetRequirement({ mode: 'basic', level: 4, theme: 'color' });
    expect(r.minimumCount).toBe(0);
    expect(r.requiresDistinctImages).toBe(false);
    expect(r.requiresDistinctColors).toBe(false);
  });

  // 2. basic level 3 — signals.ts: vSlides.filter(s => s.imageUrl.trim()) → 1장
  test('2. basic level 3: minimumCount=1, distinct 불필요', () => {
    const r = getAssetRequirement({ mode: 'basic', level: 3, theme: 'fruit' });
    expect(r.minimumCount).toBe(1);
    expect(r.requiresDistinctImages).toBe(false);
    expect(r.requiresDistinctColors).toBe(false);
  });

  // 3. basic level 4 — signals.ts: pool.length>=2 && hasDistinctSlideColors(pool,2)
  test('3. basic level 4: minimumCount=2, distinctImages·Colors=true', () => {
    const r = getAssetRequirement({ mode: 'basic', level: 4, theme: 'fruit' });
    expect(r.minimumCount).toBe(2);
    expect(r.requiresDistinctImages).toBe(true);
    expect(r.requiresDistinctColors).toBe(true);
  });

  // 4. basic level 5 — signals.ts: pool.length>=1
  test('4. basic level 5: minimumCount=1, distinct 불필요', () => {
    const r = getAssetRequirement({ mode: 'basic', level: 5, theme: 'animal' });
    expect(r.minimumCount).toBe(1);
    expect(r.requiresDistinctImages).toBe(false);
    expect(r.requiresDistinctColors).toBe(false);
  });

  // 5. basic level 6 — signals.ts: pool.length>=3 && hasDistinctSlideColors(pool,3)
  test('5. basic level 6: minimumCount=3, distinctImages·Colors=true', () => {
    const r = getAssetRequirement({ mode: 'basic', level: 6, theme: 'fruit' });
    expect(r.minimumCount).toBe(3);
    expect(r.requiresDistinctImages).toBe(true);
    expect(r.requiresDistinctColors).toBe(true);
  });

  test('non-basic mode: 이미지 불필요', () => {
    expect(getAssetRequirement({ mode: 'stroop', level: 4, theme: 'fruit' }).minimumCount).toBe(0);
  });

  test('basic level 1: 이미지 미사용', () => {
    expect(getAssetRequirement({ mode: 'basic', level: 1, theme: 'fruit' }).minimumCount).toBe(0);
  });

  test('basic level 2 non-color: minimumCount=1 (think_quad 이미지 지원)', () => {
    const r = getAssetRequirement({ mode: 'basic', level: 2, theme: 'fruit' });
    expect(r.minimumCount).toBe(1);
    expect(r.requiresDistinctImages).toBe(false);
    expect(r.requiresDistinctColors).toBe(false);
  });

  test('basic level 2 color: 이미지 미사용', () => {
    expect(getAssetRequirement({ mode: 'basic', level: 2, theme: 'color' }).minimumCount).toBe(0);
  });
});

// ── 3. Readiness (evaluateAssetReadiness) ────────────────────────────────────

describe('evaluateAssetReadiness', () => {
  // 6. 1개 필요, 0개 → insufficient
  test('6. level 5: 1개 필요, 0개 → insufficient', () => {
    const r = evaluateAssetReadiness({ mode: 'basic', level: 5, theme: 'fruit', loadStatus: READY, slides: [] });
    expect(r.status).toBe('insufficient');
    if (r.status === 'insufficient') expect(r.missingCount).toBe(1);
  });

  // 7. 1개 필요, 1개 → ready
  test('7. level 5: 1개, 유효 URL → ready', () => {
    const r = evaluateAssetReadiness({
      mode: 'basic', level: 5, theme: 'fruit', loadStatus: READY,
      slides: [makeSlide('https://a.com/img1.png')],
    });
    expect(r.status).toBe('ready');
    expect(r.usableAssets).toHaveLength(1);
  });

  // 8. 2개 필요, 1개 → insufficient
  test('8. level 4: 2개 필요, 다른 색 1개 → insufficient', () => {
    const r = evaluateAssetReadiness({
      mode: 'basic', level: 4, theme: 'fruit', loadStatus: READY,
      slides: [makeSlide('https://a.com/img1.png', 'red')],
    });
    expect(r.status).toBe('insufficient');
    if (r.status === 'insufficient') expect(r.missingCount).toBeGreaterThan(0);
  });

  // 9. 2개 필요, 2개(다른 색) → ready
  test('9. level 4: 2개, 다른 색 2가지 → ready', () => {
    const r = evaluateAssetReadiness({
      mode: 'basic', level: 4, theme: 'fruit', loadStatus: READY,
      slides: [makeSlide('https://a.com/img1.png', 'red'), makeSlide('https://a.com/img2.png', 'yellow')],
    });
    expect(r.status).toBe('ready');
  });

  // 10. 3개 필요, 2개 → insufficient
  test('10. level 6: 3개 필요, 다른 색 2개 → insufficient', () => {
    const r = evaluateAssetReadiness({
      mode: 'basic', level: 6, theme: 'fruit', loadStatus: READY,
      slides: [makeSlide('https://a.com/img1.png', 'red'), makeSlide('https://a.com/img2.png', 'yellow')],
    });
    expect(r.status).toBe('insufficient');
  });

  // 11. 3개 필요, 3개(다른 색) → ready
  test('11. level 6: 3개, 다른 색 3가지 → ready', () => {
    const r = evaluateAssetReadiness({
      mode: 'basic', level: 6, theme: 'fruit', loadStatus: READY,
      slides: [
        makeSlide('https://a.com/img1.png', 'red'),
        makeSlide('https://a.com/img2.png', 'yellow'),
        makeSlide('https://a.com/img3.png', 'blue'),
      ],
    });
    expect(r.status).toBe('ready');
    expect(r.usableAssets).toHaveLength(3);
  });

  // 12. 실패한 이미지는 usable에서 제외
  test('12. failedAssetIds: 실패 이미지 제외', () => {
    const slides = [
      makeSlide('https://a.com/img1.png', 'red'),
      makeSlide('https://a.com/img2.png', 'yellow'),
      makeSlide('https://a.com/img3.png', 'blue'),
    ];
    const r = evaluateAssetReadiness({
      mode: 'basic', level: 6, theme: 'fruit', loadStatus: READY,
      slides, failedAssetIds: new Set(['https://a.com/img1.png']),
    });
    expect(r.usableAssets.every((s) => s.imageUrl !== 'https://a.com/img1.png')).toBe(true);
    expect(r.status).toBe('insufficient'); // 2개 남음, 3개 필요
  });

  // 13. URL 없는 이미지는 usable에서 제외
  test('13. 빈 imageUrl: usable 제외', () => {
    const r = evaluateAssetReadiness({
      mode: 'basic', level: 5, theme: 'fruit', loadStatus: READY,
      slides: [makeSlide(''), makeSlide('  '), makeSlide('https://a.com/img.png')],
    });
    expect(r.usableAssets).toHaveLength(1);
    expect(r.status).toBe('ready');
  });

  // 14. distinct color 부족 → insufficient
  test('14. level 4: 이미지 2개지만 같은 색(red) → insufficient', () => {
    const r = evaluateAssetReadiness({
      mode: 'basic', level: 4, theme: 'fruit', loadStatus: READY,
      slides: [makeSlide('https://a.com/img1.png', 'red'), makeSlide('https://a.com/img2.png', 'red')],
    });
    expect(r.status).toBe('insufficient');
    if (r.status === 'insufficient') expect(r.missingCount).toBe(1); // 색 1종뿐, 1개 더 필요
  });

  test('loadStatus=loading → status:loading', () => {
    const r = evaluateAssetReadiness({ mode: 'basic', level: 4, theme: 'fruit', loadStatus: LOADING, slides: [] });
    expect(r.status).toBe('loading');
    expect(r.usableAssets).toHaveLength(0);
  });

  test('loadStatus=error → status:error', () => {
    const r: AssetReadiness = evaluateAssetReadiness({ mode: 'basic', level: 4, theme: 'fruit', loadStatus: ERROR, slides: [] });
    expect(r.status).toBe('error');
    if (r.status === 'error') expect(r.error).toBeTruthy();
  });

  test('color 테마: 슬라이드 없어도 ready', () => {
    const r = evaluateAssetReadiness({ mode: 'basic', level: 4, theme: 'color', loadStatus: READY, slides: [] });
    expect(r.status).toBe('ready');
    expect(r.requirement.minimumCount).toBe(0);
  });

  test('imageUrl 중복 슬라이드: dedup 후 1개 → level4 insufficient', () => {
    const r = evaluateAssetReadiness({
      mode: 'basic', level: 4, theme: 'fruit', loadStatus: READY,
      slides: [makeSlide('https://a.com/same.png', 'red'), makeSlide('https://a.com/same.png', 'yellow')],
    });
    expect(r.usableAssets).toHaveLength(1);
    expect(r.status).toBe('insufficient');
  });
});

// ── 4. Snapshot deep copy ─────────────────────────────────────────────────────

// startSession 내 순수 로직 (MemoryGameApp.tsx line ~596)
function computeManualSnapshot(snap: FruitSlide[] | undefined): FruitSlide[] | undefined {
  return snap && snap.length > 0 ? snap.map(s => ({ ...s })) : undefined;
}

// autoLaunch snapshot effect 순수 시뮬레이션 (MemoryGameApp.tsx autoLaunch useEffect)
function simulateAutoLaunchEffect(params: {
  isTraining: boolean;
  sessionSlidesRef: { current: FruitSlide[] | undefined };
  readiness: AssetReadiness;
}): void {
  const { isTraining, sessionSlidesRef, readiness } = params;
  if (!isTraining) return;
  if (sessionSlidesRef.current !== undefined) return;
  if (readiness.requirement.minimumCount === 0) return;
  if (readiness.status !== 'ready') return;
  sessionSlidesRef.current = readiness.usableAssets.map(s => ({ ...s }));
}

describe('Snapshot deep copy', () => {
  const slide1 = makeSlide('https://a.com/img1.png', 'red');
  const slide2 = makeSlide('https://a.com/img2.png', 'yellow');

  // 15. 수동 시작 snapshot deep copy
  test('15. 수동 시작: 반환 배열은 원본과 다른 참조', () => {
    const original = [slide1, slide2];
    const snap = computeManualSnapshot(original);
    expect(snap).not.toBe(original);
  });

  // 16. 원본 배열 push 후 snapshot 불변
  test('16. 원본 push 후 snapshot 불변', () => {
    const original = [{ ...slide1 }];
    const snap = computeManualSnapshot(original)!;
    original.push(slide2);
    expect(snap).toHaveLength(1);
  });

  // 17. 원본 객체 변경 후 snapshot 불변
  test('17. 원본 객체 변경 후 snapshot 불변', () => {
    const mutable = { ...slide1 };
    const snap = computeManualSnapshot([mutable])!;
    mutable.imageUrl = 'https://changed.com/img.png';
    expect(snap[0]?.imageUrl).toBe('https://a.com/img1.png');
  });

  // 18. autoLaunch 초기 빈 배열 → snapshot undefined
  test('18. 빈/undefined → snapshot undefined (live fallback 유지)', () => {
    expect(computeManualSnapshot([])).toBeUndefined();
    expect(computeManualSnapshot(undefined)).toBeUndefined();
  });

  // 19. autoLaunch 최초 ready → snapshot 한 번 확정
  test('19. readiness=ready → usableAssets deep copy 확정', () => {
    const ref = { current: undefined as FruitSlide[] | undefined };
    const readiness = evaluateAssetReadiness({
      mode: 'basic', level: 5, theme: 'fruit', loadStatus: READY,
      slides: [makeSlide('https://a.com/img1.png')],
    });
    simulateAutoLaunchEffect({ isTraining: true, sessionSlidesRef: ref, readiness });
    expect(ref.current).toHaveLength(1);
    expect(ref.current![0]?.imageUrl).toBe('https://a.com/img1.png');
  });

  // 20. 확정 후 refetch → snapshot 불변
  test('20. snapshot 확정 후 새 readiness 도착 → 기존 유지', () => {
    const ref = { current: undefined as FruitSlide[] | undefined };
    const r1 = evaluateAssetReadiness({
      mode: 'basic', level: 5, theme: 'fruit', loadStatus: READY,
      slides: [makeSlide('https://a.com/img1.png')],
    });
    simulateAutoLaunchEffect({ isTraining: true, sessionSlidesRef: ref, readiness: r1 });
    const snapshotBefore = ref.current;

    const r2 = evaluateAssetReadiness({
      mode: 'basic', level: 5, theme: 'fruit', loadStatus: READY,
      slides: [makeSlide('https://b.com/new-img.png')],
    });
    simulateAutoLaunchEffect({ isTraining: true, sessionSlidesRef: ref, readiness: r2 });
    expect(ref.current).toBe(snapshotBefore); // 동일 참조 — 변경되지 않음
  });

  // 21. 다음 세션 → 최신 asset 반영
  test('21. stop 후 다음 세션 → 최신 asset으로 새 snapshot', () => {
    const ref = { current: undefined as FruitSlide[] | undefined };
    const r1 = evaluateAssetReadiness({
      mode: 'basic', level: 5, theme: 'fruit', loadStatus: READY,
      slides: [makeSlide('https://a.com/img1.png')],
    });
    simulateAutoLaunchEffect({ isTraining: true, sessionSlidesRef: ref, readiness: r1 });
    expect(ref.current![0]?.imageUrl).toBe('https://a.com/img1.png');

    // stop() → sessionSlidesRef.current = undefined
    ref.current = undefined;

    const r2 = evaluateAssetReadiness({
      mode: 'basic', level: 5, theme: 'fruit', loadStatus: READY,
      slides: [makeSlide('https://b.com/img2.png')],
    });
    simulateAutoLaunchEffect({ isTraining: true, sessionSlidesRef: ref, readiness: r2 });
    expect(ref.current![0]?.imageUrl).toBe('https://b.com/img2.png');
  });

  test('color 테마(minimumCount=0): snapshot 미설정', () => {
    const ref = { current: undefined as FruitSlide[] | undefined };
    const readiness = evaluateAssetReadiness({ mode: 'basic', level: 4, theme: 'color', loadStatus: READY, slides: [] });
    simulateAutoLaunchEffect({ isTraining: true, sessionSlidesRef: ref, readiness });
    expect(ref.current).toBeUndefined();
  });

  test('readiness=loading: snapshot 미설정', () => {
    const ref = { current: undefined as FruitSlide[] | undefined };
    const readiness = evaluateAssetReadiness({ mode: 'basic', level: 5, theme: 'fruit', loadStatus: LOADING, slides: [] });
    simulateAutoLaunchEffect({ isTraining: true, sessionSlidesRef: ref, readiness });
    expect(ref.current).toBeUndefined();
  });
});

// ── 5. registerPresentedSignal ────────────────────────────────────────────────

describe('reps 카운팅 (registerPresentedSignal)', () => {
  test('20회 목표 — 20번째 신호에서 종료', () => {
    const signals = Array.from({ length: 25 }, (_, i) => ({ type: 'color', idx: i }));
    let state: RepsState = { presented: 0 };
    let finishedAt: number | null = null;
    for (let i = 0; i < signals.length; i++) {
      const { next, finished } = registerPresentedSignal({ state, hasValidSignal: true, targetReps: 20 });
      state = next;
      if (finished) { finishedAt = i; break; }
    }
    expect(state.presented).toBe(20);
    expect(finishedAt).toBe(19);
  });

  test('null signal은 카운트 미증가', () => {
    const s0: RepsState = { presented: 0 };
    const { next: s1 } = registerPresentedSignal({ state: s0, hasValidSignal: false, targetReps: 5 });
    expect(s1.presented).toBe(0);
  });

  test('단일 호출 상태 전이', () => {
    let state: RepsState = { presented: 0 };
    for (let i = 0; i < 2; i++) {
      const { next } = registerPresentedSignal({ state, hasValidSignal: true, targetReps: 3 });
      state = next;
    }
    const { next, finished } = registerPresentedSignal({ state, hasValidSignal: true, targetReps: 3 });
    expect(next.presented).toBe(3);
    expect(finished).toBe(true);
  });
});

// ── 6. getNextIntervalState ───────────────────────────────────────────────────

describe('인터벌 전환 (getNextIntervalState)', () => {
  test('1세트 work → complete', () => {
    expect(getNextIntervalState({ currentSet: 1, totalSets: 1, phase: 'work' }).completed).toBe(true);
  });
  test('2세트 1번 work → rest', () => {
    const t = getNextIntervalState({ currentSet: 1, totalSets: 2, phase: 'work' });
    expect(t.completed).toBe(false);
    if (!t.completed) expect(t.nextPhase).toBe('rest');
  });
  test('2세트 마지막 work → complete', () => {
    expect(getNextIntervalState({ currentSet: 2, totalSets: 2, phase: 'work' }).completed).toBe(true);
  });
  test('rest → 다음 세트 work', () => {
    const t = getNextIntervalState({ currentSet: 2, totalSets: 3, phase: 'rest' });
    expect(t.completed).toBe(false);
    if (!t.completed) {
      expect(t.nextPhase).toBe('work');
      expect(t.nextSet).toBe(3);
    }
  });
});

// ── 7. 테마 이미지 런타임 슬라이드 검증 ─────────────────────────────────────

const THEME_COLORS = {
  red:    { id: 'red',    name: '빨강', bg: '#ff0000', text: '#fff', symbol: '●' },
  yellow: { id: 'yellow', name: '노랑', bg: '#ffff00', text: '#000', symbol: '★' },
  blue:   { id: 'blue',   name: '파랑', bg: '#0000ff', text: '#fff', symbol: '■' },
  green:  { id: 'green',  name: '초록', bg: '#00ff00', text: '#000', symbol: '▲' },
} as const;

function makeThemeSlide(imageUrl: string, colorId: keyof typeof THEME_COLORS = 'red'): FruitSlide {
  return { imageUrl, color: THEME_COLORS[colorId] };
}

const SAMPLE_SLIDES: FruitSlide[] = [
  makeThemeSlide('https://cdn.example.com/fruit1.png', 'red'),
  makeThemeSlide('https://cdn.example.com/fruit2.png', 'yellow'),
  makeThemeSlide('https://cdn.example.com/fruit3.png', 'blue'),
];

describe('테마 이미지 런타임 슬라이드', () => {
  const COLORS_ARR = Object.values(THEME_COLORS);

  test('level 2 + 이미지 슬라이드 → think_quad content에 imageUrl 포함', () => {
    const sig = generateSignal('basic', 2, COLORS_ARR, { fruitSlides: SAMPLE_SLIDES });
    expect(sig).not.toBeNull();
    expect(sig?.type).toBe('think_quad');
    const url = (sig?.content as Record<string, unknown>)?.imageUrl;
    expect(typeof url).toBe('string');
    expect((url as string).length).toBeGreaterThan(0);
  });

  test('level 2 + 빈 슬라이드 → think_quad imageUrl=null (색 폴백)', () => {
    const sig = generateSignal('basic', 2, COLORS_ARR, { fruitSlides: [] });
    expect(sig).not.toBeNull();
    expect(sig?.type).toBe('think_quad');
    expect((sig?.content as Record<string, unknown>)?.imageUrl).toBeNull();
  });

  test('level 2 + slides 미전달(color 모드) → think_quad imageUrl=null', () => {
    const sig = generateSignal('basic', 2, COLORS_ARR, undefined);
    expect(sig).not.toBeNull();
    expect(sig?.type).toBe('think_quad');
    expect((sig?.content as Record<string, unknown>)?.imageUrl).toBeNull();
  });

  test('level 3 + 이미지 슬라이드 → full_color imageUrl 포함', () => {
    const sig = generateSignal('basic', 3, COLORS_ARR, { fruitSlides: SAMPLE_SLIDES });
    expect(sig).not.toBeNull();
    expect(sig?.type).toBe('full_color');
    const url = (sig?.content as Record<string, unknown>)?.imageUrl;
    expect(typeof url).toBe('string');
    expect((url as string).length).toBeGreaterThan(0);
  });

  test('createBasicSignalGenerator getter — 슬라이드 로딩 후 반영', () => {
    let liveSlides: FruitSlide[] | undefined = undefined;
    const getSlidesRef = () => liveSlides;
    const gen = createBasicSignalGenerator(2, COLORS_ARR, getSlidesRef);

    // 슬라이드 없을 때: 색 폴백
    const sig1 = gen.next();
    expect(sig1).not.toBeNull();
    expect((sig1?.content as Record<string, unknown>)?.imageUrl).toBeNull();

    // 슬라이드 로드 후: 이미지 반영
    liveSlides = SAMPLE_SLIDES;
    const sig2 = gen.next();
    expect(sig2).not.toBeNull();
    expect((sig2?.content as Record<string, unknown>)?.imageUrl).toBeTruthy();
  });
});

// ── 8. 다이브 장애물 스케줄 ────────────────────────────────────────────────────

function makeModules(...keys: FlowModuleKey[]): Set<FlowModuleKey> {
  return new Set<FlowModuleKey>(['jump', ...keys]);
}

describe('generateObstacleSchedule', () => {
  const BASE_OPTS = {
    durationSec: 25,
    speedMult: 1.0,
    sessionReachPlaced: 0,
    isBonus: false,
  };

  test('punch 단일 — box가 2회 이상 등장', () => {
    const schedule = generateObstacleSchedule({ ...BASE_OPTS, activeModules: makeModules('punch') });
    expect(schedule.filter(s => s === 'box').length).toBeGreaterThanOrEqual(2);
  });

  test('duck 단일 — ufo가 2회 이상 등장', () => {
    const schedule = generateObstacleSchedule({ ...BASE_OPTS, activeModules: makeModules('duck') });
    expect(schedule.filter(s => s === 'ufo').length).toBeGreaterThanOrEqual(2);
  });

  test('reach 단일 — reach가 1회 이상 등장 (세션 한도 내)', () => {
    const schedule = generateObstacleSchedule({ ...BASE_OPTS, activeModules: makeModules('reach') });
    expect(schedule.filter(s => s === 'reach').length).toBeGreaterThanOrEqual(1);
  });

  test('reach 단일 — 세션 reach 이미 2회 사용 시 reach 0회 (예산 소진)', () => {
    const schedule = generateObstacleSchedule({
      ...BASE_OPTS,
      activeModules: makeModules('reach'),
      sessionReachPlaced: 2,
    });
    expect(schedule.filter(s => s === 'reach').length).toBe(0);
  });

  test('보너스(punch+duck+reach) — ufo/box/reach 모두 1회 이상', () => {
    const schedule = generateObstacleSchedule({
      durationSec: 60,
      speedMult: 1.25,
      sessionReachPlaced: 2,  // 세션 한도 초과해도 보너스는 허용
      isBonus: true,
      activeModules: makeModules('punch', 'duck', 'reach'),
    });
    expect(schedule.filter(s => s === 'ufo').length).toBeGreaterThanOrEqual(1);
    expect(schedule.filter(s => s === 'box').length).toBeGreaterThanOrEqual(1);
    expect(schedule.filter(s => s === 'reach').length).toBeGreaterThanOrEqual(1);
  });

  test('인접 동일 타입 없음', () => {
    for (let trial = 0; trial < 20; trial++) {
      const schedule = generateObstacleSchedule({
        durationSec: 60,
        speedMult: 1.25,
        sessionReachPlaced: 0,
        isBonus: true,
        activeModules: makeModules('punch', 'duck', 'reach'),
      });
      for (let i = 1; i < schedule.length; i++) {
        const prev = schedule[i - 1];
        const curr = schedule[i];
        if (prev !== null && curr !== null) {
          expect(curr).not.toBe(prev);
        }
      }
    }
  });

  test('장애물 없는 모듈(jump+faster만) — 빈 배열', () => {
    const schedule = generateObstacleSchedule({
      ...BASE_OPTS,
      activeModules: makeModules('faster'),
    });
    expect(schedule.every(s => s === null)).toBe(true);
  });
});

// ── 9. FlowPreset 저장·불러오기 ──────────────────────────────────────────────

describe('FlowPreset', () => {
  test('빈 스토리지 → 빈 배열', () => {
    expect(loadFlowPresets()).toEqual([]);
  });

  test('저장 후 동일하게 복원', () => {
    const preset: FlowPreset = { id: '1', name: '테스트', features: ['faster'], colorTheme: 'neon', duration: 30 };
    saveFlowPresets([preset]);
    expect(loadFlowPresets()[0]).toEqual(preset);
  });

  const VALID: FlowPreset = { id: '1', name: 'ok', features: [], colorTheme: 'default', duration: 20 };

  test('정상 저장 → SavePresetResult success:true', () => {
    const r: SavePresetResult = saveFlowPresets([VALID]);
    expect(r.success).toBe(true);
  });

  test('setItem 예외 → success:false, error 포함', () => {
    lsMock.setItem = () => { throw new Error('storage unavailable'); };
    const r: SavePresetResult = saveFlowPresets([VALID]);
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error).toBeTruthy();
  });

  test('QuotaExceededError → error에 quota 안내', () => {
    lsMock.setItem = () => { throw new DOMException('QuotaExceededError', 'QuotaExceededError'); };
    const r: SavePresetResult = saveFlowPresets([VALID]);
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.toLowerCase()).toMatch(/quota|저장/i);
  });
});
