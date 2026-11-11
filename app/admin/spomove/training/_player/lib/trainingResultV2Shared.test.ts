import { describe, expect, it } from 'vitest';
import { resultV2ElapsedMetric, resultV2SignalProgress, resultV2SignalSpeed, validResultCount } from './trainingResultV2Shared';

describe('shared V2 presentation boundaries', () => {
  it('distinguishes zero elapsed time from missing or invalid time', () => {
    expect(resultV2ElapsedMetric(0).value).toBe('0초');
    for (const value of [Number.NaN, Number.POSITIVE_INFINITY, -1]) expect(resultV2ElapsedMetric(value).value).toBe('기록 없음');
  });
  it('accepts only non-negative safe integer counts', () => {
    for (const value of [0, 5, Number.MAX_SAFE_INTEGER]) expect(validResultCount(value)).toBe(true);
    for (const value of [null, undefined, '5', -1, 0.5, Number.NaN, Number.POSITIVE_INFINITY, Number.MAX_SAFE_INTEGER + 1]) expect(validResultCount(value)).toBe(false);
  });
  it('never manufactures progress from a configured target or clamps real counts', () => {
    expect(resultV2SignalProgress(null, 5)).toMatchObject({ value: '기록 없음', note: '설정 5회 · 진행 기록 없음', progress: undefined });
    expect(resultV2SignalProgress(0, 5)).toMatchObject({ value: '0 / 5회', progress: { current: 0, total: 5 } });
    expect(resultV2SignalProgress(6, 5)).toMatchObject({ value: '6 / 5회', progress: undefined });
    expect(resultV2SignalProgress(2, null).value).toBe('2회');
  });
  it('keeps acceleration distinct from interval timing and invalid speed', () => {
    expect(resultV2SignalSpeed({ speed: 2, accel: true }).value).toBe('2초부터 가속');
    expect(resultV2SignalSpeed({ speed: 2, accel: true, intervalMode: true }).value).toBe('2초');
    expect(resultV2SignalSpeed({ speed: Number.NaN }).value).toBe('기록 없음');
  });
});
