import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');
const manage = read('app/spokedu-master/manage/ManageView.tsx');
const schedule = read('app/spokedu-master/manage/ScheduleTab.tsx');
const picker = read('app/spokedu-master/manage/PreviousSessionPickerSheet.tsx');
const nextSheet = read('app/spokedu-master/manage/session-detail/NextSessionSheet.tsx');

describe('calendar previous Session entry contract', () => {
  it('places previous Session reuse and new Session actions with the selected day', () => {
    expect(schedule).toContain('이전 수업 가져오기');
    expect(schedule).toContain('SPM_SECONDARY_BTN');
    expect(schedule).toContain('SPM_PRIMARY_BTN');
    expect(schedule).toContain('formatSeoulSessionDay(selectedDay');
    expect(schedule).toContain('canClonePrevious ?');
    expect(schedule).not.toContain('action={hasClasses ?');
  });

  it('summarizes source activities before opening explicit copy controls', () => {
    expect(picker).toContain('이전 수업 선택');
    expect(picker).toContain('divide-y divide-slate-100');
    expect(picker).toContain('group-hover:translate-x-1');
    expect(picker).toContain('duration-200');
    expect(picker).not.toContain('shadow');
    expect(picker).not.toContain('copyPrograms');
    expect(picker).toContain('놀이체육');
    expect(picker).toContain('SPOMOVE');
    expect(picker).toContain('등록된 활동 없음');
  });

  it('passes the selected calendar day into the existing create-next sheet', () => {
    expect(manage).toContain('initialTargetDay={selectedDay}');
    expect(manage).toContain('<NextSessionSheet');
    expect(nextSheet).toContain('initialTargetDay ?? addSeoulSessionDays');
    expect(nextSheet).toContain('data.createNextSession');
    expect(nextSheet).toContain('활동 없이 만들기');
    expect(nextSheet).toContain('모든 활동 가져오기');
    expect(nextSheet).toContain('가져올 활동 선택');
    expect(manage).toContain('openCreatedSession(created)');
  });
});
