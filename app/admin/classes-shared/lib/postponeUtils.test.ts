import { describe, expect, it } from 'vitest';

import { buildPostponeShiftPatch } from './postponeUtils';

describe('buildPostponeShiftPatch', () => {
  const now = Date.parse('2026-08-28T00:50:00+09:00');

  it('미래 슬롯으로 밀린 finished 는 opened 로 되돌린다', () => {
    const patch = buildPostponeShiftPatch(
      { status: 'finished' },
      '2026-08-28T09:00:00.000Z',
      '2026-08-28T10:00:00.000Z',
      now
    );
    expect(patch).toEqual({
      start_at: '2026-08-28T09:00:00.000Z',
      end_at: '2026-08-28T10:00:00.000Z',
      status: 'opened',
    });
  });

  it('미래 슬롯으로 밀린 verified 도 opened 로 되돌린다', () => {
    const patch = buildPostponeShiftPatch(
      { status: 'verified' },
      '2026-08-28T09:00:00.000Z',
      '2026-08-28T10:00:00.000Z',
      now
    );
    expect(patch.status).toBe('opened');
  });

  it('이미 지난 슬롯의 finished 는 status 를 건드리지 않는다', () => {
    const patch = buildPostponeShiftPatch(
      { status: 'finished' },
      '2026-08-22T09:00:00.000Z',
      '2026-08-22T10:00:00.000Z',
      now
    );
    expect(patch).toEqual({
      start_at: '2026-08-22T09:00:00.000Z',
      end_at: '2026-08-22T10:00:00.000Z',
    });
  });

  it('opened 회차는 날짜만 갱신한다', () => {
    const patch = buildPostponeShiftPatch(
      { status: 'opened' },
      '2026-08-28T09:00:00.000Z',
      '2026-08-28T10:00:00.000Z',
      now
    );
    expect(patch).toEqual({
      start_at: '2026-08-28T09:00:00.000Z',
      end_at: '2026-08-28T10:00:00.000Z',
    });
  });
});
