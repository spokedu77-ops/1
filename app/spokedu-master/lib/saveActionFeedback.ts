import type { MasterAccessSnapshot } from './masterAccessModel';
import { getEntitlementPaymentHref, getEntitlementPrimaryCtaLabel } from './masterAccessModel';
import { getMasterRequestError } from './masterRequestError';

export const OFFLINE_SAVE_MESSAGE = '인터넷 연결이 없어 저장할 수 없습니다. 연결이 복구되면 다시 시도해 주세요.';
export const GENERIC_SAVE_ERROR_MESSAGE = '저장하지 못했습니다. 입력 내용은 유지되어 있습니다. 잠시 후 다시 시도해 주세요.';

export type SaveActionFeedback = {
  message: string;
  retryable: boolean;
  upgradeHref?: string;
  upgradeLabel?: string;
};

export function canAttemptOnlineSave(storeOnline: boolean): boolean {
  return storeOnline;
}

export function getOfflineSaveFeedback(): SaveActionFeedback {
  return {
    message: OFFLINE_SAVE_MESSAGE,
    retryable: true,
  };
}

export function resolveSaveActionFeedback(
  caught: unknown,
  snapshot?: MasterAccessSnapshot | null,
): SaveActionFeedback {
  const clientError = getMasterRequestError(caught);
  if (clientError?.kind === 'forbidden' && snapshot) {
    return {
      message: clientError.message,
      retryable: false,
      upgradeHref: getEntitlementPaymentHref(snapshot),
      upgradeLabel: getEntitlementPrimaryCtaLabel(snapshot),
    };
  }
  if (clientError) {
    return {
      message: clientError.kind === 'network' ? OFFLINE_SAVE_MESSAGE : clientError.message,
      retryable: clientError.kind === 'network' || clientError.kind === 'server',
    };
  }
  return {
    message: GENERIC_SAVE_ERROR_MESSAGE,
    retryable: true,
  };
}
