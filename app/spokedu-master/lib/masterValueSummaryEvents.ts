export const MASTER_VALUE_SUMMARY_INVALIDATED = 'spokedu-master:value-summary-invalidated';

export function invalidateMasterValueSummary() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(MASTER_VALUE_SUMMARY_INVALIDATED));
}
