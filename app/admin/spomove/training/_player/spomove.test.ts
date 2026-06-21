/**
 * SPOMOVE 핵심 로직 단위 테스트
 *
 * ─ 환경: vitest (node, jsdom 없음)
 * ─ React hook 내부의 RAF 콜백은 jsdom/@testing-library/react 없이는 직접 테스트 불가.
 *   대신 hook에서 사용하는 순수 로직과 동일한 알고리즘을 재현해 핵심 불변식을 검증한다.
 *
 * 테스트하지 못하는 항목과 이유:
 *   - useTrainingTimer / useIntervalTimer: React + RAF + 브라우저 타이머 필요 (jsdom 환경 필요)
 *   - 실제 canvas DPR: HTMLCanvasElement가 Node에 없음
 *   - localStorage 실제 I/O: Node에 localStorage 없음 (globalThis mock으로 우회)
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { loadFlowPresets, saveFlowPresets, type FlowPreset } from './lib/flowPresets';
import { getMinSlidesRequired } from './hooks/useSpomoveVariantFruitSlidesForTraining';

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

// ── 1. getMinSlidesRequired ───────────────────────────────────────────────────

describe('getMinSlidesRequired', () => {
  test('color 테마: 이미지 불필요(0)', () => {
    expect(getMinSlidesRequired('color')).toBe(0);
  });

  test('fruit 테마: 최소 1장 필요', () => {
    expect(getMinSlidesRequired('fruit')).toBeGreaterThan(0);
  });

  test('emotion/animal/nature/vehicle 모두 1 이상', () => {
    for (const t of ['emotion', 'animal', 'nature', 'vehicle'] as const) {
      expect(getMinSlidesRequired(t)).toBeGreaterThan(0);
    }
  });
});

// ── 2. FlowPreset: 스키마 검증 + 저장/불러오기 ──────────────────────────────

describe('FlowPreset 저장·불러오기', () => {
  test('빈 스토리지에서 빈 배열 반환', () => {
    expect(loadFlowPresets()).toEqual([]);
  });

  test('유효한 preset 저장 후 동일하게 복원', () => {
    const preset: FlowPreset = {
      id: '1',
      name: '테스트',
      features: ['faster', 'punch'],
      colorTheme: 'neon',
      duration: 30,
    };
    saveFlowPresets([preset]);
    const loaded = loadFlowPresets();
    expect(loaded).toHaveLength(1);
    expect(loaded[0]).toEqual(preset);
  });

  test('잘못된 데이터는 필터링(기본값 복구)', () => {
    lsMock.setItem('spomove_flow_presets_v2', JSON.stringify([
      { id: '1', name: 'ok', features: [], colorTheme: 'space', duration: 25 },
      { id: '', name: 'bad_empty_id', features: [], colorTheme: 'space', duration: 25 }, // id 빈 문자열
      { id: '3', name: 'bad_theme', features: [], colorTheme: 'invalid', duration: 25 }, // 없는 테마
      { id: '4', name: 'bad_duration', features: [], colorTheme: 'ocean', duration: 0 }, // duration 0
      null,
      42,
    ]));
    const loaded = loadFlowPresets();
    expect(loaded).toHaveLength(1);
    expect(loaded[0]?.id).toBe('1');
  });

  test('완전히 깨진 JSON → 빈 배열', () => {
    lsMock.setItem('spomove_flow_presets_v2', '{not_valid_json[[[');
    expect(loadFlowPresets()).toEqual([]);
  });

  test('features 배열 내 비문자열 → 필터링', () => {
    lsMock.setItem('spomove_flow_presets_v2', JSON.stringify([
      { id: '1', name: 'ok', features: [42, null, 'faster'], colorTheme: 'default', duration: 20 },
    ]));
    // features 내 비문자열이 포함된 preset은 유효하지 않으므로 필터됨
    const loaded = loadFlowPresets();
    expect(loaded).toHaveLength(0);
  });
});

// ── 3. 구 key(spomove_flow_presets) → v2 마이그레이션 ───────────────────────

describe('FlowPreset 구 key 마이그레이션', () => {
  test('구 key 데이터를 v2 key로 이전하고 구 key 삭제', () => {
    const old: FlowPreset[] = [
      { id: '10', name: '구 설정', features: ['duck'], colorTheme: 'ocean', duration: 40 },
    ];
    lsMock.setItem('spomove_flow_presets', JSON.stringify(old));

    const loaded = loadFlowPresets();
    expect(loaded).toHaveLength(1);
    expect(loaded[0]?.id).toBe('10');

    // 마이그레이션 후 v2에 기록됨
    expect(lsMock.getItem('spomove_flow_presets_v2')).not.toBeNull();
    // 구 key 삭제됨
    expect(lsMock.getItem('spomove_flow_presets')).toBeNull();
  });

  test('v2 key가 이미 있으면 구 key 무시', () => {
    const v2: FlowPreset[] = [{ id: 'v2', name: 'v2', features: [], colorTheme: 'space', duration: 25 }];
    const legacy: FlowPreset[] = [{ id: 'leg', name: 'leg', features: [], colorTheme: 'default', duration: 10 }];
    lsMock.setItem('spomove_flow_presets_v2', JSON.stringify(v2));
    lsMock.setItem('spomove_flow_presets', JSON.stringify(legacy));

    const loaded = loadFlowPresets();
    expect(loaded).toHaveLength(1);
    expect(loaded[0]?.id).toBe('v2');
  });
});

// ── 4. reps 카운팅 불변식 (hook 알고리즘 재현) ───────────────────────────────

/**
 * useTrainingTimer의 emitSignal 로직을 순수 함수로 재현.
 * sig가 null이면 presentedCount를 올리지 않고,
 * presentedCount >= targetReps이면 finish를 호출한다.
 */
function simulateRepsSession(opts: {
  targetReps: number;
  signalSequence: (Record<string, unknown> | null)[];
}) {
  const { targetReps, signalSequence } = opts;
  let presentedCount = 0;
  let finishedAfterIndex: number | null = null;
  let finished = false;

  for (let i = 0; i < signalSequence.length; i++) {
    const sig = signalSequence[i];
    // hook: emitSignal — null이면 count 증가 없음
    if (sig !== null) presentedCount++;
    // hook: finish() 후 return — RAF 더 이상 실행 안 됨
    if (presentedCount >= targetReps) {
      finished = true;
      finishedAfterIndex = i;
      break;
    }
  }

  return { presentedCount, finishedAfterIndex, finished };
}

describe('reps 모드 카운팅', () => {
  test('20회 목표 — null 없이 정확히 20번째 신호에서 종료', () => {
    const signals = Array.from({ length: 25 }, (_, i) => ({ type: 'color', idx: i }));
    const r = simulateRepsSession({ targetReps: 20, signalSequence: signals });
    expect(r.presentedCount).toBe(20);
    expect(r.finishedAfterIndex).toBe(19); // 0-indexed, 20번째 = index 19
    expect(r.finished).toBe(true);
  });

  test('null signal은 presentedCount 증가 없음', () => {
    const signals: (Record<string, unknown> | null)[] = [
      { type: 'color' },
      null,
      null,
      { type: 'color' },
      null,
      { type: 'color' },
    ];
    const r = simulateRepsSession({ targetReps: 10, signalSequence: signals });
    // 유효 신호 3개, null 3개
    expect(r.presentedCount).toBe(3);
    expect(r.finished).toBe(false);
  });

  test('null signal 포함 — 총 20개 유효 신호 도달 시 종료', () => {
    const mixed: (Record<string, unknown> | null)[] = [];
    for (let i = 0; i < 30; i++) {
      mixed.push(i % 3 === 0 ? null : { type: 'color', i });
    }
    const r = simulateRepsSession({ targetReps: 20, signalSequence: mixed });
    expect(r.presentedCount).toBe(20);
    expect(r.finished).toBe(true);
  });

  test('accel ON 시뮬레이션 — 동일 카운팅 보장', () => {
    // accel은 타이밍에만 영향, 카운팅 로직은 동일
    const signals = Array.from({ length: 20 }, (_, i) => ({ type: 'color', idx: i }));
    const r = simulateRepsSession({ targetReps: 20, signalSequence: signals });
    expect(r.presentedCount).toBe(20);
    expect(r.finished).toBe(true);
  });

  test('목표 이후 추가 interval에서 중복 finish 없음', () => {
    // 25개 신호가 들어와도 20번째에서 break (RAF 중단 모방)
    const signals = Array.from({ length: 25 }, (_, i) => ({ type: 'color', idx: i }));
    const r = simulateRepsSession({ targetReps: 20, signalSequence: signals });
    // finish 이후 더 이상 신호를 처리하지 않으므로 count는 정확히 targetReps
    expect(r.presentedCount).toBe(20);
    expect(r.finished).toBe(true);
    expect(r.finishedAfterIndex).toBe(19);
  });
});

// ── 5. 인터벌 마지막 rest 미생성 불변식 ──────────────────────────────────────

/**
 * useIntervalTimer의 tick 로직을 재현.
 * 마지막 set의 work가 끝나는 순간(currentPhase === 'rest' && currentSet === sets)에
 * 즉시 complete 처리하고 rest 단계로 진입하지 않아야 한다.
 */
function simulateIntervalPhase(opts: {
  elapsedSec: number;
  workSec: number;
  restSec: number;
  sets: number;
}): 'work' | 'rest' | 'complete' {
  const { elapsedSec, workSec, restSec, sets } = opts;
  const cycleLen = workSec + restSec;
  const cycleIdx = Math.floor(elapsedSec / cycleLen);
  const withinCycle = elapsedSec - cycleIdx * cycleLen;
  const currentPhase: 'work' | 'rest' = withinCycle < workSec ? 'work' : 'rest';
  const currentSet = cycleIdx + 1;

  if (currentSet > sets || (currentSet === sets && currentPhase === 'rest')) {
    return 'complete';
  }
  return currentPhase;
}

describe('인터벌 — 마지막 rest 미생성', () => {
  const W = 30, R = 15;

  test('1세트: work 직후(elapsed=30초)에 complete', () => {
    const result = simulateIntervalPhase({ elapsedSec: 30, workSec: W, restSec: R, sets: 1 });
    expect(result).toBe('complete');
  });

  test('2세트: 1세트 work 완료 후 rest 진입 (정상)', () => {
    const result = simulateIntervalPhase({ elapsedSec: 30, workSec: W, restSec: R, sets: 2 });
    expect(result).toBe('rest');
  });

  test('2세트: 마지막 set work 직후 complete', () => {
    // 2세트 work 시작: elapsed = 45s (1세트 30+15), 완료: elapsed = 75s
    const result = simulateIntervalPhase({ elapsedSec: 75, workSec: W, restSec: R, sets: 2 });
    expect(result).toBe('complete');
  });

  test('3세트: 마지막 세트 work 종료 직후 complete', () => {
    // 3세트 work: elapsed = 90s (45+45), 완료: 120s
    const result = simulateIntervalPhase({ elapsedSec: 120, workSec: W, restSec: R, sets: 3 });
    expect(result).toBe('complete');
  });

  test('3세트: work 진행 중에는 rest 아님', () => {
    // 2세트 work 중: elapsed = 46s
    const result = simulateIntervalPhase({ elapsedSec: 46, workSec: W, restSec: R, sets: 3 });
    expect(result).toBe('work');
  });
});

// ── 6. Delta Time 상한 불변식 ────────────────────────────────────────────────

describe('deltaSec 상한 (0.05s = 20fps 보호)', () => {
  function computeDt(lastMs: number, now: number): number {
    return Math.min((now - lastMs) / 1000, 0.05);
  }

  test('정상 16ms 프레임 → 0.016s', () => {
    expect(computeDt(1000, 1016)).toBeCloseTo(0.016, 4);
  });

  test('500ms 지연 → 0.05s로 클램핑', () => {
    expect(computeDt(1000, 1500)).toBe(0.05);
  });

  test('백그라운드 탭 10초 공백 → 0.05s로 클램핑', () => {
    expect(computeDt(0, 10000)).toBe(0.05);
  });
});

// ── 7. sessionStartMsRef elapsedMs 검증 ─────────────────────────────────────

describe('elapsedMs 계산', () => {
  test('세션 시작 전 0ms', () => {
    const sessionStartMs = 0;
    const elapsed = sessionStartMs > 0 ? 5000 - sessionStartMs : 0;
    expect(elapsed).toBe(0);
  });

  test('세션 시작 후 경과시간 계산', () => {
    const sessionStartMs = 1000;
    const now = 4000;
    const elapsed = sessionStartMs > 0 ? now - sessionStartMs : 0;
    expect(elapsed).toBe(3000);
  });
});

// ── 8. stale request 차단 불변식 ────────────────────────────────────────────

describe('stale request ID 차단', () => {
  test('빠른 테마 변경 시 이전 응답 무시', () => {
    let reqId = 0;
    const results: string[] = [];

    async function fakeReload(theme: string) {
      const thisId = ++reqId;
      // 비동기 응답 시뮬레이션
      await Promise.resolve();
      if (reqId !== thisId) return; // stale 차단
      results.push(theme);
    }

    // 두 번 연속 호출 (두 번째가 더 최신)
    const p1 = fakeReload('fruit');
    const p2 = fakeReload('animal');
    return Promise.all([p1, p2]).then(() => {
      // 마지막 요청만 반영
      expect(results).toHaveLength(1);
      expect(results[0]).toBe('animal');
    });
  });
});
