import { describe, expect, it } from 'vitest';
import {
  formatWeeklyBestByline,
  formatWeeklyBestFeedbackText,
  nestedRecordName,
  normalizeSessionFileUrls,
} from '@/app/lib/weeklyBestFeedback';

describe('normalizeSessionFileUrls', () => {
  it('빈·잘못된 값은 제외한다', () => {
    expect(normalizeSessionFileUrls(null)).toEqual([]);
    expect(normalizeSessionFileUrls(['', '  ', 'https://x/a.pdf'])).toEqual(['https://x/a.pdf']);
  });
});

describe('nestedRecordName / formatWeeklyBestByline', () => {
  it('users 객체·배열에서 강사명을 읽는다', () => {
    expect(nestedRecordName({ name: '김강사' })).toBe('김강사');
    expect(nestedRecordName([{ name: '이강사' }])).toBe('이강사');
    expect(nestedRecordName(null)).toBe('');
  });

  it('강사·수업명·날짜 한 줄을 만든다', () => {
    expect(
      formatWeeklyBestByline({
        teacherName: '김강사',
        title: '송파 13남',
        startAt: '2026-09-10T03:00:00.000Z',
      }),
    ).toContain('김강사');
  });
});

describe('formatWeeklyBestFeedbackText', () => {
  it('feedback_note가 있으면 세션·첨부 내용보다 우선한다', () => {
    expect(
      formatWeeklyBestFeedbackText('관리자 수기 요약', {
        session_type: 'regular_center',
        file_url: ['https://x/a.pdf'],
        students_text: '선생님 텍스트',
      }),
    ).toBe('관리자 수기 요약');
  });

  it('feedback_note가 없으면 센터 첨부 파일명을 표시한다', () => {
    expect(
      formatWeeklyBestFeedbackText(null, {
        session_type: 'regular_center',
        file_url: ['https://x/report.pdf'],
      }),
    ).toContain('센터 피드백 첨부');
  });
});
