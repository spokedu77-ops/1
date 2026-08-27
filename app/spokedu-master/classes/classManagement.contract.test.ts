import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

describe('MASTER Class and attendance management contracts', () => {
  const activity = read('app/spokedu-master/activity/page.tsx');
  const list = read('app/spokedu-master/classes/page.tsx');
  const detail = read('app/spokedu-master/classes/[classId]/page.tsx');
  const rosterSheet = read('app/spokedu-master/classes/[classId]/ClassRosterSheet.tsx');
  const tabs = read('app/spokedu-master/components/lesson/LessonManagementTabs.tsx');
  const desktopNav = read('app/spokedu-master/components/layout/StatusBar.tsx');
  const mobileNav = read('app/spokedu-master/components/layout/TabBar.tsx');
  const navLabels = read('app/spokedu-master/components/layout/masterNavLabels.ts');

  it('keeps Schedule and Classes as clear operating destinations with local cross-navigation', () => {
    expect(tabs).toContain('/spokedu-master/activity');
    expect(tabs).toContain('/spokedu-master/classes');
    expect(tabs).toContain('일정');
    expect(tabs).toContain('수업반');
    expect(navLabels).toContain("href: '/spokedu-master/activity', label: '수업 일정'");
    expect(navLabels).toContain("href: '/spokedu-master/classes', label: '수업반'");
    expect(desktopNav).toContain('MASTER_NAV_ITEMS');
    expect(mobileNav).toContain('MASTER_NAV_ITEMS');
  });

  it('removes Class management from Calendar and routes the empty state to Classes', () => {
    expect(activity).not.toContain('ClassManagerSheet');
    expect(activity).not.toContain('ClassNameRow');
    expect(activity).not.toContain('수업반 관리</button>');
    expect(activity).toContain('/spokedu-master/classes?create=1');
    expect(activity).toContain("setCreateClassId(resolution.classId)");
    expect(activity).toContain('잘못된 수업반입니다.');
  });

  it('creates Classes with one field and routes to the exact new Class', () => {
    expect(list).toContain("await data.createClass(name.trim())");
    expect(list).toContain('router.push(`/spokedu-master/classes/${created.id}`)');
    expect(list).toContain("searchParams.get('create') !== '1'");
  });

  it('uses state-based Class actions instead of an abstract open action', () => {
    expect(list).toContain('card.priorityWorkState?.primaryLabel');
    expect(list).toContain('다음 수업 준비하기');
    expect(list).toContain('다음 수업 만들기');
    expect(list).toContain('반 흐름 보기');
    expect(list).not.toContain('MASTER_ACTION_COPY.open');
  });

  it('orders Class Detail by current work, context, history, memory, then schedule management', () => {
    const currentWork = detail.indexOf('<SessionSummary label=');
    const rosterTabs = detail.indexOf('role="tablist"');
    const recentHistory = detail.indexOf('최근 완료 수업');
    const memory = detail.indexOf('<ClassMemoryPanel');
    const schedule = detail.indexOf('<RegularSchedulePanel');
    expect(currentWork).toBeGreaterThan(-1);
    expect(rosterTabs).toBeGreaterThan(currentWork);
    expect(recentHistory).toBeGreaterThan(rosterTabs);
    expect(memory).toBeGreaterThan(recentHistory);
    expect(schedule).toBeGreaterThan(memory);
    expect(detail).not.toContain('다음 운영 작업');
    expect(detail).toContain('미기록 수업 선택');
  });

  it('keeps roster mutations Class-scoped and does not soft-delete Students', () => {
    expect(rosterSheet).toContain('await data.addClassStudent(classId, studentId)');
    expect(detail).toContain('await data.removeClassStudent(classItem.id, student.id)');
    expect(rosterSheet).toContain('classIds: [classId]');
    expect(detail).not.toContain('deleteStudent(');
    expect(detail).toContain('과거 출석 및 수업 이력은 유지됩니다.');
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

  it('renders attendance as a completed Session projection without an attendance-book object', () => {
    expect(detail).toContain('buildClassAttendanceView');
    expect(detail).toContain("status === 'present' ? '✓ 출석' : status === 'absent' ? '결석' : '—'");
    expect(detail).toContain('overflow-x-auto');
    expect(detail).toContain('sticky left-0');
    expect(detail).toContain('shiftAttendanceMonth');
    expect(detail).toContain('/spokedu-master/activity?session=${encodeURIComponent(session.id)}');
    expect(detail).not.toContain('AttendanceBook');
    expect(detail).not.toContain('출석부 만들기');
  });

  it('supports fast current-roster attendance without blocking Session completion', () => {
    expect(activity).toContain('const markAllPresent');
    expect(activity).toContain("currentRoster.map((student) => [student.id, 'present' as const])");
    expect(activity).toContain('setAttendanceDirty(true)');
    expect(activity).toContain('미체크 {uncheckedRosterCount}명');
    expect(activity).toContain('actions.markAllPresent && currentRoster.length');
    expect(activity).not.toContain('uncheckedRosterCount === 0');
  });

  it('surfaces incomplete attendance and keeps every repair link Session-exact', () => {
    expect(detail).toContain('buildIncompleteAttendanceSessions');
    expect(detail).toContain('출석 미기록 {incompleteSessions.length}건');
    expect(detail).toContain('session=${encodeURIComponent(incompleteSessions[0]!.id)}');
  });
});
