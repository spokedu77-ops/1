import type { RefundProviderEvidence } from './spokeduMasterRefundReview';

export type RefundPgAttemptResult = {
  ok: boolean;
  providerStatus: string;
  errorCode: string | null;
  refundedAmount: number | null;
};

export type RefundPgProvider = {
  lookupEvidence(orderId: string): Promise<RefundProviderEvidence>;
  attemptCancellation(input: { orderId: string; amount: number }): Promise<RefundPgAttemptResult>;
};

const PG_EXECUTION_DISABLED = 'PG_EXECUTION_DISABLED';

/** Mock provider — never calls Toss. Real execution stays behind Product Decision. */
export function createMockRefundPgProvider(options?: { failOrderIds?: ReadonlySet<string> }): RefundPgProvider {
  const failOrderIds = options?.failOrderIds ?? new Set<string>();

  return {
    async lookupEvidence(orderId: string): Promise<RefundProviderEvidence> {
      if (!orderId.trim()) {
        return { state: 'lookup_error', refundedAmount: null, cancellation: 'unknown' };
      }
      if (failOrderIds.has(orderId)) {
        return { state: 'lookup_error', refundedAmount: null, cancellation: 'unknown' };
      }
      return { state: 'verified', refundedAmount: 0, cancellation: 'none' };
    },

    async attemptCancellation(input: { orderId: string; amount: number }): Promise<RefundPgAttemptResult> {
      if (failOrderIds.has(input.orderId)) {
        return {
          ok: false,
          providerStatus: 'mock_failed',
          errorCode: 'MOCK_PG_FAILURE',
          refundedAmount: null,
        };
      }
      return {
        ok: false,
        providerStatus: 'disabled',
        errorCode: PG_EXECUTION_DISABLED,
        refundedAmount: null,
      };
    },
  };
}

export const defaultRefundPgProvider = createMockRefundPgProvider();

export { PG_EXECUTION_DISABLED };
