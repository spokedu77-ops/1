import { describe, expect, it } from 'vitest';
import { resolveSessionDisplayStatus } from './sessionDisplayStatus';

describe('Session display status', () => {
  it.each([
    ['scheduled', 'PREP', '예정'],
    ['scheduled', 'RUN', '진행 중'],
    ['scheduled', 'WRAP', '진행 중'],
    ['scheduled', 'ATTENTION', '진행 중'],
    ['completed', 'REVIEW', '완료'],
    ['cancelled', 'RECOVERY', '취소'],
  ] as const)('%s + %s displays %s', (status, presentationKind, label) => {
    expect(resolveSessionDisplayStatus(status, presentationKind)).toBe(label);
  });
});
