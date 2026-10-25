type RenewalStateRow = {
  plan?: string | null;
  status?: string | null;
  last_billing_error?: string | null;
  renewal_retry_count?: number | null;
};

export const SPOKEDU_MASTER_RENEWAL_MAX_ATTEMPTS = 5;

export function hasSpokeduMasterBillingRenewalFailure(
  row: RenewalStateRow | null,
): boolean {
  return Boolean(
    row?.status === 'active'
    && (row.plan === 'lite' || row.plan === 'premium' || row.plan === 'pro')
    && row.last_billing_error,
  );
}

export function isSpokeduMasterAutomaticRenewalStopped(row: RenewalStateRow | null): boolean {
  return Boolean(
    hasSpokeduMasterBillingRenewalFailure(row)
    && (row?.renewal_retry_count ?? 0) >= SPOKEDU_MASTER_RENEWAL_MAX_ATTEMPTS,
  );
}
