import { describe, expect, it } from 'vitest';
import type { MasterSessionDto } from '../types/operational';
import { buildDefaultParentNotice, resolveParentNotice } from './parentNoticeModel';

const session: MasterSessionDto = {
  id: 's1', classId: 'c1', className: '무지개반', startAt: '2026-09-01T01:00:00.000Z', startedAt: null,
  endAt: '2026-09-01T02:00:00.000Z', status: 'completed', memo: '협동이 좋았습니다.', completedAt: '2026-09-01T02:00:00.000Z',
  programs: [{ id: 'p1', sourceType: 'program', programId: 1, spomovePresetId: null, programTitle: '꼬리잡기', sortOrder: 0, isCompleted: true }],
  attendance: [{ id: 'a1', studentId: 'u1', studentName: '민수', status: 'present' }], createdAt: '', updatedAt: '',
};

describe('parent notice model', () => {
  it('builds a stable default from the completed session snapshot', () => {
    expect(buildDefaultParentNotice(session)).toContain('꼬리잡기 활동을 진행했습니다.');
    expect(buildDefaultParentNotice(session)).toContain('출석 1명, 결석 0명');
  });

  it('prefers the teacher-edited persisted notice', () => {
    expect(resolveParentNotice({ ...session, parentNotice: '직접 수정한 안내문' })).toBe('직접 수정한 안내문');
  });
});
