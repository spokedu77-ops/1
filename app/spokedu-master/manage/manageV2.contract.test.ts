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
    expect(schedule).toContain('rounded-[12px] border border-slate-200 border-l-[3px] bg-white');
    expect(schedule).toContain('놀이체육 ${programCount}');
    expect(schedule).toContain('SPOMOVE ${spomoveCount}');
    expect(calendar).not.toContain('sessionDotClass');
    expect(calendar).not.toContain('점 · 칩');
    expect(calendar).toContain('예정</span>');
    expect(calendar).toContain('완료</span>');
    expect(calendar).toContain('취소</span>');
    expect(schedule).not.toContain('sm:grid-cols-2');
    expect(schedule).toContain('action={hasClasses ?');
    expect(manage).toContain('<MasterPageHeader title="수업 관리" />');
    expect(manage).not.toContain('MasterPageHeader title="수업 관리" action=');
    expect(schedule).toContain('예정된 수업이 없습니다.');
    expect(schedule).toContain('수업 {daySessions.length}개');
    expect(schedule).toContain('data-agenda-count={daySessions.length}');
    expect(schedule).toContain('lg:flex lg:min-h-0 lg:flex-1 lg:flex-col');
    expect(calendar).not.toContain('overflow-visible');
    expect(calendar).toContain('whitespace-normal break-keep');
    expect(calendar).not.toContain('min-w-0 truncate');
    expect(manage).toContain("lg:grid-cols-[minmax(0,1fr)_440px]");
    expect(manage).toContain('<MasterPageShell variant="wide"');
    expect(manage).not.toContain("lg:pr-[434px]");
    expect(calendar).toContain('aria-label="이전 날"');
    expect(calendar).toContain('aria-label="다음 날"');
    expect(calendar).toContain('type="month"');
    expect(calendar).toContain('aria-label="연월 선택"');
    expect(calendar).toContain('addSeoulSessionDays(selectedDay, 1)');
    expect(calendar).not.toContain('aria-label="이전 달"');
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
    expect(detail).toContain('aria-label="수업 관리 메뉴"');
    expect(detail).not.toContain('수업 관리 <ChevronDown');
    expect(detail).toContain('h-11 w-11 shrink-0');
    expect(detail).toContain('수업 완료 취소');
    expect(detail).toContain('h-5 w-5 place-items-center');
    expect(detail).toContain('data-session-create');
    expect(detail).toContain('lg:grid-cols-[minmax(0,1fr)_80px_auto_80px]');
    expect(detail).toContain('REPEAT_LABEL');
    expect(detail).toContain('+ 새 수업반 만들기');
    expect(detail).toContain('aria-expanded={attendanceOpen}');
    expect(detail).toContain('rounded-full px-3 text-[12px]');
    expect(detail).toContain('id: `pending:${key}`');
    expect(detail).toContain('setPrograms(ordered)');
    expect(detail).toContain('setPrograms(previous)');
    expect(detail).toContain('type="date"');
    expect(detail).toContain('splitLessonTitle(officialProgram.title).koreanTitle');
    expect(detail).toContain('<ChevronRight');
    expect(sheet).toContain("lg:static lg:z-auto lg:block");
    expect(sheet).toContain('lg:w-[440px]');
    expect(detail).toContain("return false");
  });

  it('offers favorites and all addable activities without truncating the catalog', () => {
    const picker = read('app/spokedu-master/manage/SessionActivityPicker.tsx');
    expect(detail).toContain('getFavoritesOwnerId');
    expect(detail).toContain('favoriteContentRefsByOwner');
    expect(detail).toContain('favorites={favoriteActivities}');
    expect(picker).toContain("'favorite'");
    expect(picker).toContain('즐겨찾기');
    expect(picker).toContain('visible.map((item)');
    expect(picker).not.toContain('visible.slice(');
    expect(detail).toContain('resolveSpomovePublicDisplayTitle');
    expect(detail).toContain('buildSpomovePresetSearchHaystack');
  });

  it('projects current roster across scheduled and completed Sessions', () => {
    expect(attendance).toContain('buildManageAttendanceProjection');
    expect(attendance).toContain('<AttendanceProjectionTable');
    expect(classDetail).toContain('<AttendanceProjectionTable');
    expect(projection).toContain('overflow-x-auto');
    expect(projection).toContain('sticky left-0');
    expect(projection).not.toContain('AttendanceBook');
    expect(projection).toContain("session.status === 'completed'");
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
