import { describe, expect, it } from 'vitest';
import { copyLessonPlanForSchedule, lessonPlanScheduleHeader, lessonPlanWriteError } from './lessonPlan';

describe('lesson plan schedule context', () => {
  it('initializes the actual Tuesday Korean date/time', () => {
    expect(lessonPlanScheduleHeader('2026-11-10T10:00:00Z', '2026-11-10T11:00:00Z'))
      .toBe('2026.11.10.(화요일) 19:00 ~ 20:00');
  });
  it('uses the Korean day at UTC midnight boundaries', () => {
    expect(lessonPlanScheduleHeader('2026-11-09T15:30:00Z')).toBe('2026.11.10.(화요일) 00:30 ~ 00:00');
  });
  it.each(['2026.10.16.(금요일)', '2026.10.16(금요일)', '2026/10/16', '2026-10-16'])('copies %s to the current schedule while preserving body and round', (header) => {
    const content = `${header} 19:00 ~ 20:00 - 4회차\n\n강사명 : 원작성자\n[수업 목표]\n원본`;
    expect(copyLessonPlanForSchedule(content, '2026-11-10T10:00:00Z', '2026-11-10T11:00:00Z'))
      .toBe('2026.11.10.(화요일) 19:00 ~ 20:00 - 4회차\n\n강사명 : 원작성자\n[수업 목표]\n원본');
  });
  it('does not invent a header for free-form content', () => {
    expect(copyLessonPlanForSchedule('[수업 목표]\n내용', '2026-11-10T10:00:00Z')).toBe('[수업 목표]\n내용');
  });
  it.each(['LESSON_PLAN_DATE_REQUIRED', 'LESSON_PLAN_DATE_MISMATCH', 'LESSON_PLAN_STALE', 'LESSON_PLAN_FORBIDDEN'])('provides actionable feedback for %s', (code) => {
    const error = lessonPlanWriteError(code);
    expect(error.status).toBeGreaterThanOrEqual(400);
    expect(error.status).toBeLessThan(500);
    expect(error.message).not.toContain('LESSON_PLAN_');
  });
});
