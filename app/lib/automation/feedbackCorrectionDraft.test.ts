import { describe, expect, it } from 'vitest';
import {
  assertCorrectionPreservesSourceTokens,
  normalizeCorrectionDraft,
} from '@/app/lib/automation/feedbackCorrectionDraft';
import type { FeedbackCorrectionInputSnapshot } from '@/app/lib/automation/feedbackCorrectionDraft';

const snapshot: FeedbackCorrectionInputSnapshot = {
  title: '테스트 수업',
  start_at: '2026-11-04T05:00:00.000Z',
  session_type: 'regular_private',
  students_text: '',
  feedback_fields: {
    main_activity: '14:00 시작 드리블 30분',
    strengths: '집중력 90% 유지',
    improvements: '패스 정확도',
    next_goals: '2대1 연습',
    condition_notes: '15:30 종료',
  },
};

describe('feedbackCorrectionDraft', () => {
  it('normalizes five text fields and preserves center document names from snapshot', () => {
    const draft = normalizeCorrectionDraft(
      {
        main_activity: '14:00 시작 드리블 30분.',
        strengths: '집중력 90% 유지.',
        improvements: '패스 정확도.',
        next_goals: '2대1 연습.',
        condition_notes: '15:30 종료.',
      },
      {
        ...snapshot,
        feedback_fields: {
          ...snapshot.feedback_fields,
          center_document_names: ['보고서.pdf'],
        },
      },
    );
    expect(draft?.center_document_names).toEqual(['보고서.pdf']);
    expect(draft?.main_activity).toContain('14:00');
  });

  it('한계: 토큰 검사는 동의어·미세 왜곡·환각 문장을 포착하지 못할 수 있다', () => {
    const draft = normalizeCorrectionDraft(
      {
        main_activity: '14:00 드리블 30분',
        strengths: '리더십이 뛰어나 팀을 완벽히 이끌었다',
        improvements: '패스 정확도.',
        next_goals: '2대1 연습.',
        condition_notes: '15:30 종료.',
      },
      snapshot,
    );
    expect(assertCorrectionPreservesSourceTokens(snapshot, draft!)).toBeNull();
  });

  it('rejects nested feedback_fields or extra top-level keys', () => {
    expect(
      normalizeCorrectionDraft(
        { feedback_fields: snapshot.feedback_fields, main_activity: 'x', strengths: 'a', improvements: 'b', next_goals: 'c', condition_notes: 'd' },
        snapshot,
      ),
    ).toBeNull();
    expect(
      normalizeCorrectionDraft(
        { main_activity: '14:00', strengths: 'a', improvements: 'b', next_goals: 'c', condition_notes: 'd', extra: 'nope' },
        snapshot,
      ),
    ).toBeNull();
  });

  it('rejects drafts that drop too many factual tokens', () => {
    const draft = normalizeCorrectionDraft(
      {
        main_activity: '수업을 진행했습니다.',
        strengths: '잘했습니다.',
        improvements: '더 노력.',
        next_goals: '다음에.',
        condition_notes: '특이사항 없음.',
      },
      snapshot,
    );
    expect(draft).not.toBeNull();
    const err = assertCorrectionPreservesSourceTokens(snapshot, draft!);
    expect(err).toMatch(/핵심 정보/);
  });
});
