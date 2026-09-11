import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { readSessionDetailSource } from './manage/session-detailTestSource';

const classDetail = readFileSync('app/spokedu-master/classes/[classId]/page.tsx', 'utf8');
const studentDetail = readFileSync('app/spokedu-master/students/[studentId]/page.tsx', 'utf8');
const session = readSessionDetailSource();
const capture = readFileSync('app/spokedu-master/activity/SessionCapturePanel.tsx', 'utf8');

describe('UI Foundation v3.2 deep operational contract', () => {
  it('uses operational page grammar for Class detail without a student card grid', () => {
    expect(classDetail).toContain('MasterPageShell variant="operational"');
    expect(classDetail).toContain('<ClassRosterSheet');
    expect(classDetail).toContain('<AttendanceProjectionTable');
    expect(classDetail).toContain('학생 관리');
    expect(classDetail).toContain('출석부');
    expect(classDetail).not.toContain('CLASS DETAIL');
    expect(classDetail).not.toContain('grid-cols-3');
  });

  it('presents Student detail as guidance and linked history rows', () => {
    expect(studentDetail).toContain('MasterPageShell variant="operational"');
    expect(studentDetail).toContain('MasterPageHeader');
    expect(studentDetail).toContain('title="지도 참고"');
    expect(studentDetail).toContain('title="수업 이력"');
    expect(studentDetail).toContain('MasterCollectionRow');
    expect(studentDetail).not.toContain('shadow-sm');
    expect(studentDetail).not.toContain('font-black');
  });

  it('uses the simple operational Session sequence without runtime workspaces', () => {
    expect(session).toContain('수업 활동');
    expect(session).toContain('출석');
    expect(session).toContain('메모');
    expect(session).not.toContain('resolveSessionWorkspacePresentation');
    expect(session).not.toContain("presentationKind === 'RUN'");
    expect(session).not.toContain('SPM_JOURNEY_SURFACE');
    expect(session).not.toContain('SPM_JOURNEY_EYEBROW');
    expect(capture).not.toContain('SPM_JOURNEY_SURFACE');
    expect(capture).not.toContain('SPM_JOURNEY_EYEBROW');
  });

  it('preserves the existing persistence and completion calls', () => {
    expect(session).toContain('await data.updateSessionProgram');
    expect(session).toContain("persist(activeSession ? 'completed' : 'scheduled')");
    expect(session).toContain('await captureRef.current?.save()');
    expect(session).toContain('전체 출석');
  });
});
