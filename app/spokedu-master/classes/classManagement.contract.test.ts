import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { readSessionDetailSource } from '../manage/session-detailTestSource';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

describe('MASTER Class and attendance management contracts', () => {
  const manage = read('app/spokedu-master/manage/ManageView.tsx');
  const schedule = read('app/spokedu-master/manage/ScheduleTab.tsx');
  const activity = readSessionDetailSource();
  const projection = read('app/spokedu-master/manage/AttendanceProjectionTable.tsx');
  const list = read('app/spokedu-master/classes/page.tsx');
  const detail = read('app/spokedu-master/classes/[classId]/page.tsx');
  const rosterSheet = read('app/spokedu-master/classes/[classId]/ClassRosterSheet.tsx');
  const desktopNav = read('app/spokedu-master/components/layout/StatusBar.tsx');
  const mobileNav = read('app/spokedu-master/components/layout/TabBar.tsx');
  const navLabels = read('app/spokedu-master/components/layout/masterNavLabels.ts');

  it('keeps Schedule and Classes as clear operating destinations with local cross-navigation', () => {
    expect(navLabels).toContain("href: '/spokedu-master/manage', label: '수업 관리'");
    expect(list).not.toContain('LessonManagementTabs');
    expect(detail).not.toContain('LessonManagementTabs');
    expect(list).toContain('href="/spokedu-master/manage"');
    expect(desktopNav).toContain('MASTER_NAV_ITEMS');
    expect(mobileNav).toContain('MASTER_NAV_ITEMS');
  });

  it('removes Class management from Calendar and routes the empty state to Classes', () => {
    expect(activity).not.toContain('ClassManagerSheet');
    expect(activity).not.toContain('ClassNameRow');
    expect(activity).not.toContain('수업반 관리</button>');
    expect(schedule).toContain('/spokedu-master/classes?create=1');
    expect(manage).toContain("setCreateClassId(resolution.classId)");
    expect(manage).toContain('유효하지 않은 수업반입니다.');
  });

  it('creates Classes with one field and routes to the exact new Class', () => {
    expect(list).toContain("await data.createClass(name.trim())");
    expect(list).toContain('router.push(`/spokedu-master/classes/${created.id}`)');
    expect(list).toContain("searchParams.get('create') !== '1'");
  });

  it('uses state-based Class actions instead of an abstract open action', () => {
    expect(list).toContain('MasterCollectionRow');
    expect(list).not.toContain('내 수업반');
    expect(list).not.toContain('확인할 기록');
    expect(list).toContain('다음 일정 없음');
    expect(list).toContain('학생 없음');
    expect(list).toContain('다음 수업');
    expect(list).not.toContain('MASTER_ACTION_COPY.open');
  });

  it('keeps Class Detail focused on roster count and monthly attendance', () => {
    expect(detail).not.toContain('SessionSummary');
    expect(detail).not.toContain('ClassMemoryPanel');
    expect(detail).not.toContain('role="tablist"');
    expect(detail).not.toContain('학생 명단');
    expect(detail).not.toContain('지난 출석');
    expect(detail).not.toContain('지난 수업</h2>');
    expect(detail).not.toContain('지금 해야 할 일');
    expect(detail).not.toContain('이력 보기');
    expect(detail).toContain('학생 관리');
    expect(detail).toContain('출석부');
    expect(detail).toContain('<ClassRosterSheet');
    expect(detail).toContain('await data.updateClass(classItem.id, editName.trim())');
    expect(detail).not.toContain('RegularSchedulePanel');
  });

  it('keeps roster mutations Class-scoped and does not soft-delete Students', () => {
    expect(rosterSheet).toContain('await data.addClassStudent(classId, studentId)');
    expect(rosterSheet).toContain('await data.removeClassStudent(classId, student.id)');
    expect(rosterSheet).toContain('classIds: [classId]');
    expect(detail).not.toContain('deleteStudent(');
    expect(rosterSheet).toContain('과거 출석 및 수업 이력은 유지됩니다.');
    expect(rosterSheet).toContain('resolveClassRosterCandidates');
  });

  it('supports search multi-add, no-result prefill, bulk preview, and honest partial failures', () => {
    expect(rosterSheet).toContain('type="checkbox"');
    expect(rosterSheet).toContain('선택한 학생 추가');
    expect(rosterSheet).toContain('openNew(query.trim())');
    expect(rosterSheet).toContain('여러 명 빠르게 등록');
    expect(rosterSheet).toContain('parseRosterPaste');
    expect(rosterSheet).toContain('자동으로 합치지 않습니다.');
    expect(rosterSheet).toContain('명 등록 완료 ·');
  });

  it('renders attendance as a Session projection without an attendance-book object', () => {
    expect(detail).toContain('buildClassAttendanceView');
    expect(detail).toContain('AttendanceProjectionTable');
    expect(detail).toContain('attendanceView.sessions');
    expect(detail).toContain('shiftAttendanceMonth');
    expect(projection).toContain('/spokedu-master/activity?session=${encodeURIComponent(session.id)}');
    expect(detail).not.toContain('AttendanceBook');
    expect(detail).not.toContain('출석부 만들기');
  });

  it('supports fast current-roster attendance without blocking Session completion', () => {
    expect(activity).toContain("Object.fromEntries(roster.map((student) => [student.id, 'present' as const]))");
    expect(activity).toContain('전체 출석');
    expect(activity).toContain('전체 해제');
    expect(activity).toContain('aria-pressed={allStudentsPresent}');
    expect(activity).not.toContain('uncheckedRosterCount === 0');
  });

  it('keeps incomplete-attendance helpers available without rendering Class Detail debt panels', () => {
    const model = read('app/spokedu-master/classes/classManagementModel.ts');
    expect(model).toContain('export function buildIncompleteAttendanceSessions');
    expect(detail).not.toContain('buildIncompleteAttendanceSessions');
    expect(detail).not.toContain('출석 미기록');
  });
});
