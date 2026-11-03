import { describe, expect, it } from 'vitest';
import { getSimpleRentals, getSimpleStockTotals, type SimpleMove } from './simpleMath';

const move = (id: string, kind: 'RENT' | 'RETURN', qty: number, rent_id: string | null = null): SimpleMove => ({
  id, kind, qty, rent_id, catalog_id: 20, teacher_id: 'teacher-1',
  move_date: '2026-11-03', created_at: '2026-11-03T12:00:00.000Z',
});

describe('SIMPLE V1 수불 수량', () => {
  it('대여 3개에서 2개 반납하면 잔량 1·가용 9', () => {
    const rentals = getSimpleRentals([move('r1', 'RENT', 3), move('m1', 'RETURN', 2, 'r1')]);
    expect(rentals).toHaveLength(1);
    expect(rentals[0].remaining).toBe(1);
    expect(getSimpleStockTotals(20, 10, rentals)).toEqual({ lent: 1, available: 9 });
  });

  it('서로 다른 대여 건의 반납을 혼합하지 않는다', () => {
    const rentals = getSimpleRentals([
      move('r1', 'RENT', 3), move('r2', 'RENT', 2), move('m1', 'RETURN', 2, 'r1'),
    ]);
    expect(rentals.map(r => r.remaining)).toEqual([1, 2]);
    expect(getSimpleStockTotals(20, 10, rentals)).toEqual({ lent: 3, available: 7 });
  });

  it('미입력 수량은 0으로 가정하지 않는다', () => {
    expect(getSimpleStockTotals(20, null, [])).toEqual({ lent: null, available: null });
  });

  it('반납 완료 건은 잔량 0으로 표시한다', () => {
    const rentals = getSimpleRentals([move('r1', 'RENT', 3), move('m1', 'RETURN', 3, 'r1')]);
    expect(rentals[0].remaining).toBe(0);
    expect(getSimpleStockTotals(20, 10, rentals)).toEqual({ lent: 0, available: 10 });
  });

  it('다른 교구의 거래는 재고 계산에서 제외한다', () => {
    const rentals = getSimpleRentals([move('r1', 'RENT', 3)]);
    expect(getSimpleStockTotals(49, 12, rentals)).toEqual({ lent: 0, available: 12 });
  });
});
