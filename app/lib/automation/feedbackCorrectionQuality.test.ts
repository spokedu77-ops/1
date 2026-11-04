import { describe, expect, it } from 'vitest';
import {
  assertSpomoveUserLiteralsPreserved,
  validateFeedbackCorrectionQuality,
  redactLessonPlanExcerpt,
} from '@/app/lib/automation/feedbackCorrectionQuality';
import type { FeedbackCorrectionInputSnapshot } from '@/app/lib/automation/feedbackCorrectionDraft';

const base: FeedbackCorrectionInputSnapshot = {
  title: '수업',
  start_at: '2026-11-04T05:00:00.000Z',
  session_type: 'regular_private',
  students_text: '',
  feedback_fields: {
    main_activity: 'SPOMOVE-CORE5 드리블 14:00',
    strengths: '90% 집중',
    improvements: '패스',
    next_goals: '2대1',
    condition_notes: '15:30 종료',
  },
};

describe('feedbackCorrectionQuality', () => {
  it('preserves SPOMOVE user literals', () => {
    const draft = { ...base.feedback_fields, main_activity: '드리블 14:00' };
    expect(assertSpomoveUserLiteralsPreserved(base, draft)).toMatch(/SPOMOVE/);
  });

  it('redacts phone-like patterns in lesson excerpts', () => {
    expect(redactLessonPlanExcerpt('문의 010-1234-5678')).toContain('[연락처]');
  });

  it('rejects drafts that replace a field with unrelated content', () => {
    const draft = {
      ...base.feedback_fields,
      main_activity: '완전히 다른 수업 SPOMOVE-FUN2 반응놀이만 진행',
    };
    const err = validateFeedbackCorrectionQuality(base, draft);
    expect(err).toMatch(/연관성|SPOMOVE/);
  });

  it('documents token heuristic limits — fabrication may still pass', () => {
    const draft = {
      ...base.feedback_fields,
      strengths: '90% 집중 유지하며 매우 훌륭한 리더십을 보였고 팀을 이끌었다',
    };
    const err = validateFeedbackCorrectionQuality(base, draft);
    // 토큰(90%, 14:00)은 유지되므로 토큰 검사만으로는 환각 문장을 잡지 못할 수 있음
    expect(err).toBeNull();
  });
});
