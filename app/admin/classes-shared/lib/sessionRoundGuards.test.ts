import { describe, expect, it } from 'vitest';

import { isCrossGroupSlotConflictRow } from './sessionRoundGuards';

describe('isCrossGroupSlotConflictRow', () => {
  it('제목에 회차가 있어도 같은 현장·다른 그룹이면 충돌이다', () => {
    expect(
      isCrossGroupSlotConflictRow(
        { group_id: 'old', status: 'opened', title: '신사 11남 학교체육 3/8' },
        { title: '신사 11남 학교체육' }
      )
    ).toBe(true);
  });

  it('괄호 담당 표기만 달라도 같은 현장으로 본다', () => {
    expect(
      isCrossGroupSlotConflictRow(
        { group_id: 'old', status: 'opened', title: '반포 10남 학교체육 (정재원 / 성연호)' },
        { title: '반포 10남 학교체육' }
      )
    ).toBe(true);
  });

  it('자기 그룹은 제외한다', () => {
    expect(
      isCrossGroupSlotConflictRow(
        { group_id: 'same', status: 'opened', title: '양화초 늘봄 1/8' },
        { title: '양화초 늘봄', excludeGroupId: 'same' }
      )
    ).toBe(false);
  });

  it('취소·삭제 칸은 충돌이 아니다', () => {
    expect(
      isCrossGroupSlotConflictRow(
        { group_id: 'old', status: 'cancelled', title: '양화초 늘봄 1/8' },
        { title: '양화초 늘봄' }
      )
    ).toBe(false);
    expect(
      isCrossGroupSlotConflictRow(
        { group_id: 'old', status: 'deleted', title: '양화초 늘봄 1/8' },
        { title: '양화초 늘봄' }
      )
    ).toBe(false);
  });

  it('다른 수업명은 같은 시각이어도 충돌이 아니다', () => {
    expect(
      isCrossGroupSlotConflictRow(
        { group_id: 'other', status: 'opened', title: '화곡 농구' },
        { title: '양화초 늘봄' }
      )
    ).toBe(false);
  });
});
