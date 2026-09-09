import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');
const manage = read('app/spokedu-master/manage/ManageView.tsx');
const schedule = read('app/spokedu-master/manage/ScheduleTab.tsx');
const detail = read('app/spokedu-master/manage/SessionDetailSheet.tsx');
const attendance = read('app/spokedu-master/manage/AttendanceTab.tsx');
const projection = read('app/spokedu-master/manage/AttendanceProjectionTable.tsx');
const sheet = read('app/spokedu-master/components/ui/BottomSheet.tsx');
const activityRoute = read('app/spokedu-master/activity/page.tsx');
const classDetail = read('app/spokedu-master/classes/[classId]/page.tsx');
const navigation = read('app/spokedu-master/lib/masterNavigationContext.ts');

describe('SPOKEDU MASTER Manage V2 contract', () => {
  it('owns the canonical two-tab IA and keeps activity as a compatibility route', () => {
    expect(manage).toContain("type ManageTab = 'schedule' | 'attendance'");
    expect(manage).toContain('>일정</button>');
    expect(manage).toContain('>출석부</button>');
    expect(manage).not.toContain('내 수업반');
    expect(activityRoute).toContain("import ManageView from '../manage/ManageView'");
    expect(manage).toContain('resolveActivityQuery(searchParams');
    expect(manage).toContain("searchParams.get('capture') === '1'");
    expect(navigation).toContain("'/spokedu-master/manage': ['session', 'date', 'create', 'class', 'program', 'record', 'capture']");
  });

  it('uses a direct calendar and a one-column time-sorted Agenda', () => {
    const calendar = read('app/spokedu-master/activity/MonthSessionCalendar.tsx');
    expect(schedule).toContain('.sort((a, b) => a.startAt.localeCompare(b.startAt))');
    expect(schedule).toContain('rounded-xl border border-slate-200 border-l-2 bg-white');
    expect(schedule).toContain('놀이체육 ${programCount}');
    expect(schedule).toContain('SPOMOVE ${spomoveCount}');
    expect(calendar).not.toContain('sessionDotClass');
    expect(calendar).not.toContain('점 · 칩');
    expect(schedule).not.toContain('sm:grid-cols-2');
    expect(schedule).toContain('action={hasClasses ?');
    expect(manage).toContain('<MasterPageHeader title="수업 관리" />');
    expect(manage).not.toContain('MasterPageHeader title="수업 관리" action=');
    expect(schedule).toContain('예정된 수업이 없습니다.');
    expect(schedule).toContain('수업 {daySessions.length}개');
    expect(calendar).toContain('sm:overflow-visible sm:text-clip sm:whitespace-nowrap');
    expect(calendar).not.toContain("selected ? 'z-10 ring-2");
  });

  it('keeps Session activities, attendance, and completion on existing commands', () => {
    expect(detail).toContain('data.updateSessionProgram');
    expect(detail).toContain('data.reorderSessionPrograms');
    expect(detail).toContain('data.addSessionProgram');
    expect(detail).toContain('data.addSessionSpomove');
    expect(detail).toContain('data.completeSession(activeSession.id');
    expect(detail).toContain('data.saveSessionAttendance');
    expect(detail).toContain("'present' | 'absent'");
    expect(detail).not.toContain('resolveSessionWorkspacePresentation');
    expect(detail).not.toContain('PreviousActivityCarryover');
    expect(detail).not.toContain('NextSessionPlanner');
    expect(detail).not.toContain('수업 시작');
    expect(detail).toContain('size="session"');
    expect(detail).toContain('MoreHorizontal');
    expect(detail).toContain('type="date"');
    expect(detail).toContain('splitLessonTitle(officialProgram.title).koreanTitle');
    expect(detail).not.toContain('<ChevronRight');
    expect(sheet).toContain("document.addEventListener('pointerdown', handlePointerDown, true)");
    expect(detail).toContain("return false");
  });

  it('shares the completed-Session attendance projection', () => {
    expect(attendance).toContain('buildClassAttendanceView');
    expect(attendance).toContain('<AttendanceProjectionTable');
    expect(classDetail).toContain('<AttendanceProjectionTable');
    expect(projection).toContain('overflow-x-auto');
    expect(projection).toContain('sticky left-0');
    expect(projection).not.toContain('AttendanceBook');
    expect(attendance).toContain('일정 보기');
  });

  it('branches recurring creation away from single Session creation', () => {
    expect(detail).toContain("if (!activeSession && repeatMode !== 'none')");
    expect(detail).toContain('await createRecurringSession()');
    expect(detail).toContain('buildScheduleOccurrencePreview');
    expect(detail).toContain('occurrenceOverlaps');
    expect(detail).toContain('occurrences: availableOccurrences');
    expect(detail).toContain('/schedule-rules`');
    expect(detail).toContain('firstSessionId');
    expect(classDetail).not.toContain('RegularSchedulePanel');
  });
});
