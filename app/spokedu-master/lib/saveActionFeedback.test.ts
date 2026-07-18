import { describe, expect, it } from 'vitest';

import { MasterClientRequestError } from './masterRequestError';
import { toMasterClientError, toNetworkMasterClientError } from './clientErrors';
import {
  canAttemptOnlineSave,
  getOfflineSaveFeedback,
  OFFLINE_SAVE_MESSAGE,
  resolveSaveActionFeedback,
} from './saveActionFeedback';
import type { MasterAccessSnapshot } from './masterAccessModel';

const expiredSnapshot: MasterAccessSnapshot = {
  authenticated: true,
  onboardingDone: true,
  plan: 'lite',
  subscriptionStatus: 'expired',
  currentPeriodEnd: '2020-01-01T00:00:00.000Z',
  cancelAtPeriodEnd: false,
  isAdmin: false,
  isCenterOrTeam: false,
  canUseLibrary: false,
  canUseClassTools: false,
  canUseRecords: false,
  canUseSpomove: false,
};

describe('saveActionFeedback', () => {
  it('blocks save attempts when offline', () => {
    expect(canAttemptOnlineSave(false)).toBe(false);
    expect(getOfflineSaveFeedback().message).toBe(OFFLINE_SAVE_MESSAGE);
    expect(getOfflineSaveFeedback().retryable).toBe(true);
  });

  it('allows save when store reports online', () => {
    expect(canAttemptOnlineSave(true)).toBe(true);
  });

  it('maps forbidden errors to payment CTA feedback', () => {
    const error = new MasterClientRequestError(toMasterClientError(403, 'expired'));
    const feedback = resolveSaveActionFeedback(error, expiredSnapshot);
    expect(feedback.retryable).toBe(false);
    expect(feedback.upgradeHref).toBe('/spokedu-master/payment');
    expect(feedback.upgradeLabel).toBe('구독 다시 선택');
  });

  it('maps server errors as retryable save feedback', () => {
    const error = new MasterClientRequestError(toMasterClientError(500));
    const feedback = resolveSaveActionFeedback(error);
    expect(feedback.retryable).toBe(true);
  });

  it('uses the offline save message for mid-request network failures', () => {
    const feedback = resolveSaveActionFeedback(
      new MasterClientRequestError(toNetworkMasterClientError()),
    );
    expect(feedback.message).toBe(OFFLINE_SAVE_MESSAGE);
    expect(feedback.retryable).toBe(true);
  });
});
