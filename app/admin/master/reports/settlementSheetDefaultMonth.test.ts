import { describe, expect, it, vi } from 'vitest';
import { resolveDefaultSettlementMonth } from './settlementSheetCore';

describe('settlement sheet default month contract', () => {
  it('uses the current Seoul month instead of the latest future month', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-26T03:00:00.000Z'));
    const data = {
      months: {
        '2026-10': { key: '2026-10' },
        '2026-11': { key: '2026-11' },
      },
      centers: {}, settings: { vatMethod: 'sheet', year: 2026 },
    };
    expect(resolveDefaultSettlementMonth(data as never, '', new Date())).toBe('2026-10');
    expect(resolveDefaultSettlementMonth(data as never, '2026-11', new Date())).toBe('2026-11');
    vi.useRealTimers();
  });
});
