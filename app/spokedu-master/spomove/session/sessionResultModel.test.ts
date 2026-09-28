import { describe, expect, it } from 'vitest';

import {
  completionReasonToSessionState,
  isNaturalSpomoveCompletion,
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
});
