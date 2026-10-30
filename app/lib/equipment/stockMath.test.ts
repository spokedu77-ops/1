import { describe, expect, it } from 'vitest';
import { assertStockInvariants, canRent, deriveStockMetrics } from '@/app/lib/equipment/stockMath';

describe('deriveStockMetrics', () => {
  it('computes W and A from T, Q, L', () => {
    expect(deriveStockMetrics(100, 5, 30)).toEqual({
      qty_on_hand_total: 100,
      qty_quarantine: 5,
      qty_lent: 30,
      qty_warehouse: 70,
      qty_available: 65,
    });
  });

  it('satisfies invariants for typical stock', () => {
    expect(assertStockInvariants(50, 2, 20)).toBe(true);
  });

  it('rejects lent above total', () => {
    expect(assertStockInvariants(10, 0, 11)).toBe(false);
  });
});

describe('canRent', () => {
  it('allows rent within available', () => {
    expect(canRent(5, 3)).toBe(true);
  });
  it('denies over-rent', () => {
    expect(canRent(2, 3)).toBe(false);
  });
});
