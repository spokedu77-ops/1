import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');
const calendar = read('app/spokedu-master/activity/MonthSessionCalendar.tsx');
const schedule = read('app/spokedu-master/manage/ScheduleTab.tsx');

describe('MASTER Schedule responsive information contract', () => {
  it('keeps mobile calendar cells focused on date selection and schedule presence', () => {
    expect(calendar).toContain('data-mobile-session-indicator');
    expect(calendar).toContain('data-calendar-event-list className="mt-0.5 hidden');
    expect(calendar).toContain('aria-label={`${formatSeoulSessionDay(item.day');
    expect(calendar).toContain('min-h-12');
  });

  it('retains the full selected-day agenda with an intentional mobile hierarchy', () => {
    expect(schedule).toContain('daySessions.map((session)');
    expect(schedule).toContain('grid-cols-[minmax(0,1fr)_auto]');
    expect(schedule).toContain('md:grid-cols-[auto_minmax(0,1fr)_auto]');
    expect(schedule).toContain('data-agenda-count={daySessions.length}');
  });


});
