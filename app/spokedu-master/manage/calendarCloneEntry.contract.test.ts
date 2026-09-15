import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');
const manage = read('app/spokedu-master/manage/ManageView.tsx');
const schedule = read('app/spokedu-master/manage/ScheduleTab.tsx');
const picker = read('app/spokedu-master/manage/PreviousSessionPickerSheet.tsx');
const nextSheet = read('app/spokedu-master/manage/session-detail/NextSessionSheet.tsx');

describe('calendar previous Session entry contract', () => {
  it('places secondary clone and primary new Session actions with the selected day', () => {
    expect(schedule).toContain('직전 수업으로 만들기');
    expect(schedule).toContain('SPM_SECONDARY_BTN');
    expect(schedule).toContain('SPM_PRIMARY_BTN');
    expect(schedule).toContain('formatSeoulSessionDay(selectedDay');
    expect(schedule).toContain('canClonePrevious ?');
    expect(schedule).not.toContain('action={hasClasses ?');
  });

  it('uses clean one-column navigation rows without copy controls', () => {
    expect(picker).toContain('divide-y divide-slate-100');
    expect(picker).toContain('group-hover:translate-x-1');
    expect(picker).toContain('duration-200');
    expect(picker).not.toContain('shadow');
    expect(picker).not.toContain('copyPrograms');
  });

  it('passes the selected calendar day into the existing create-next sheet', () => {
    expect(manage).toContain('initialTargetDay={selectedDay}');
    expect(manage).toContain('<NextSessionSheet');
    expect(nextSheet).toContain('initialTargetDay ?? addSeoulSessionDays');
    expect(nextSheet).toContain('data.createNextSession');
    expect(manage).toContain('openCreatedSession(created)');
  });
});
