type RenewalStateRow = {
  plan?: string | null;
  status?: string | null;
  last_billing_error?: string | null;
};

export function hasSpokeduMasterBillingRenewalFailure(
  row: RenewalStateRow | null,
  promotionActive: boolean,
): boolean {
  return Boolean(
    !promotionActive
    && row?.status === 'active'
    && (row.plan === 'lite' || row.plan === 'premium' || row.plan === 'pro')
    && row.last_billing_error,
  );
}
