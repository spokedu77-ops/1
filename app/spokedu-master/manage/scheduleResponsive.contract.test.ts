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

  it('limits compact and desktop cells to two one-line event summaries plus overflow count', () => {
    expect(calendar).toContain('item.sessions.slice(0, 2)');
    expect(calendar).toContain('data-calendar-event-line');
    expect(calendar).toContain('min-w-0 truncate');
    expect(calendar).toContain('+{item.sessions.length - 2}');
  });

  it('retains the full selected-day agenda with an intentional mobile hierarchy', () => {
    expect(schedule).toContain('daySessions.map((session)');
    expect(schedule).toContain('grid-cols-[minmax(0,1fr)_auto]');
    expect(schedule).toContain('md:grid-cols-[auto_minmax(0,1fr)_auto]');
    expect(schedule).toContain('data-agenda-count={daySessions.length}');
  });

  it('uses the product breakpoint for the desktop workspace transition', () => {
    expect(calendar).toContain('min-[1200px]:flex');
    expect(schedule).toContain('min-[1200px]:flex');
    expect(calendar).not.toContain('lg:flex-1');
  });
});
