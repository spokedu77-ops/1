import { describe, expect, it } from 'vitest';
import { resolveSessionDisplayStatus } from './sessionDisplayStatus';

describe('Session display status', () => {
  it.each([
    ['scheduled', null, '예정'],
    ['scheduled', '2026-08-26T07:05:00.000Z', '진행 중'],
    ['completed', null, '완료'],
    ['cancelled', '2026-08-26T07:05:00.000Z', '취소'],
  ] as const)('%s + startedAt %s displays %s', (status, startedAt, label) => {
    expect(resolveSessionDisplayStatus({ status, startedAt }).label).toBe(label);
  });
});
