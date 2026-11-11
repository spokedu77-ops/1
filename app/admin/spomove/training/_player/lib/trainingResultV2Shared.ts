import { formatElapsedSeconds, type TrainingResultConfig } from './trainingResultSummary';

/** Shared V2 presentation only. Activity-specific counters keep their own meaning. */
export const RESULT_V2_TITLES = {
  natural_complete: ['활동 완료', '오늘의 활동을 마쳤어요!'],
  stopped_early: ['중도 종료', '오늘은 여기까지 진행했어요.'],
  cancelled: ['실행 취소', '활동 실행을 취소했어요.'],
  failed: ['실행 오류', '활동 실행이 중단되었어요.'],
} as const;

export const validResultCount = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;

export function resultV2ElapsedMetric(elapsedMs: number) {
  return { label: '활동 시간', value: Number.isFinite(elapsedMs) && elapsedMs >= 0 ? elapsedMs === 0 ? '0초' : formatElapsedSeconds(elapsedMs) : '기록 없음', note: '실제 진행 시간' };
}

/** Only callers whose actual counter is a presented signal use this metric. */
export function resultV2SignalProgress(actual: number | null, target: number | null) {
  return { label: '진행', value: actual !== null ? target !== null ? `${actual} / ${target}회` : `${actual}회` : '기록 없음', note: actual !== null && target !== null ? `전체 ${target}회 중 ${actual}회 진행` : actual !== null ? '실제 신호 제시 횟수' : target !== null ? `설정 ${target}회 · 진행 기록 없음` : '진행 기록 없음', progress: actual !== null && target !== null && actual <= target ? { current: actual, total: target } : undefined };
}

export function resultV2SignalSpeed(cfg: Pick<TrainingResultConfig, 'speed' | 'accel' | 'intervalMode'>) {
  const speed = typeof cfg.speed === 'number' && Number.isFinite(cfg.speed) && cfg.speed > 0 ? cfg.speed : null;
  const accelerating = cfg.accel && !cfg.intervalMode;
  return { label: '자극 시간', value: speed === null ? '기록 없음' : accelerating ? `${speed}초부터 가속` : `${speed}초`, note: accelerating ? '설정 자극 시간 · 점차 짧아짐' : '설정 자극 시간' };
}
