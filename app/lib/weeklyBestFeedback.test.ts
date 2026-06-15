import { describe, expect, it } from 'vitest';
import {
  formatWeeklyBestFeedbackText,
  normalizeSessionFileUrls,
} from '@/app/lib/weeklyBestFeedback';

describe('normalizeSessionFileUrls', () => {
  it('빈·잘못된 값은 제외한다', () => {
    expect(normalizeSessionFileUrls(null)).toEqual([]);
    expect(normalizeSessionFileUrls(['', '  ', 'https://x/a.pdf'])).toEqual(['https://x/a.pdf']);
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
