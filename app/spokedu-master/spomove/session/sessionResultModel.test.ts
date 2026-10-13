import { describe, expect, it } from 'vitest';

import {
  completionReasonToSessionState,
  isNaturalSpomoveCompletion,
  resolveSpomoveCompletionPresentation,
  type SpomoveCompletionReason,
} from './sessionResultModel';

describe('SPOMOVE completion semantics', () => {
  it.each([
    ['natural_complete', 'done'],
    ['stopped_early', 'ended'],
    ['cancelled', 'ended'],
    ['failed', 'ended'],
  ] satisfies Array<[SpomoveCompletionReason, 'done' | 'ended']>)(
    'maps %s to the compatible %s UI state',
    (reason, state) => {
      expect(completionReasonToSessionState(reason)).toBe(state);
      expect(isNaturalSpomoveCompletion(reason)).toBe(reason === 'natural_complete');
    },
  );

  it.each([
    ['natural_complete', '훈련 완료', '정상 완료'],
    ['stopped_early', '훈련을 중간에 종료했습니다', '중도 종료'],
    ['cancelled', '훈련이 취소되었습니다', '실행 취소'],
    ['failed', '훈련을 완료하지 못했습니다', '실행 오류'],
  ] satisfies Array<[SpomoveCompletionReason, string, string]>)(
    'presents %s without inferring another completion state',
    (reason, title, statusBadge) => {
      expect(resolveSpomoveCompletionPresentation(reason)).toMatchObject({ title, statusBadge });
    },
  );
});
