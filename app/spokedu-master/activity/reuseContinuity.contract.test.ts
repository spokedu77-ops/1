import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const capture = readFileSync('app/spokedu-master/activity/SessionCapturePanel.tsx', 'utf8');
const carryover = readFileSync('app/spokedu-master/activity/PreviousActivityCarryover.tsx', 'utf8');
const classDetail = readFileSync('app/spokedu-master/classes/[classId]/page.tsx', 'utf8');

describe('Phase 8D next-session continuity', () => {
  it('puts applicationIdea before compact supporting memory and keeps generic memo out', () => {
    const memoryStart = capture.lastIndexOf("if (captureMode === 'memory')");
    const memoryBlock = capture.slice(memoryStart, capture.indexOf("if (captureMode === 'emphasized')", memoryStart));
    expect(memoryBlock.indexOf('nextSessionNote ?')).toBeLessThan(memoryBlock.indexOf('학생 기록 {previousObservations.length}명'));
    expect(memoryBlock).toContain('지난 수업에서 이어갈 점');
    expect(memoryBlock).toContain('지난 수업 자세히 보기');
    expect(memoryBlock).not.toContain('{memo}');
  });

  it('starts carryover with no selection and explains duplicate/unavailable activities', () => {
    expect(carryover).toContain('setSelected([])');
    expect(carryover).toContain('필요한 활동만 선택하세요');
    expect(carryover).toContain('이미 추가됨');
    expect(carryover).toContain('현재 사용할 수 없음');
    expect(carryover).toContain('완료 상태는 가져오지 않습니다');
  });

  it('keeps next-session action primary in Class Detail with memory as context only', () => {
    expect(classDetail).toContain('수업 준비 이어가기');
    expect(classDetail).toContain('지난 수업에서 이어갈 점 · {nextSessionNote}');
    expect(classDetail).toContain("classContinuity.targetSession.status === 'scheduled'");
    expect(classDetail).toContain("priorityWork.session.status === 'scheduled' || priorityWork.workState.attention.attendanceMissing");
  });
});
