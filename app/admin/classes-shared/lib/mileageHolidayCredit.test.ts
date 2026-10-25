import { describe, expect, it } from 'vitest';

import {
  blocksPostponeCredit,
  mileageActionDisplayPoints,
  sumMileageActionPoints,
} from './mileageHolidayCredit';
import { MILEAGE_ACTIONS } from '../constants/mileage';

describe('mileageHolidayCredit', () => {
  it('zeroes postpone credits on 2026-10-03 KST', () => {
    const start = '2026-10-02T15:00:00.000Z';
    expect(blocksPostponeCredit(start)).toBe(true);
    expect(mileageActionDisplayPoints('수업 연기', 2500, start)).toBe(0);
    expect(mileageActionDisplayPoints('수업 연기 요청', -5000, start)).toBe(-5000);
  });

  it('keeps weekday postpone +2500', () => {
    const start = '2026-10-23T01:00:00.000Z';
    expect(sumMileageActionPoints('수업 연기', start, MILEAGE_ACTIONS)).toBe(2500);
  });
});
