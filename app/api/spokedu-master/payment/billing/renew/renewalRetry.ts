export function calculateRenewalRetryAt(retryCount: number, now = Date.now()): string {
  // The scheduler is hourly, so the first backoff must exceed one interval;
  // otherwise the same poison row would be eligible at the very next run.
  const delayHours = Math.min(24, 2 ** Math.min(Math.max(retryCount, 0) + 1, 5));
  return new Date(now + delayHours * 60 * 60 * 1000).toISOString();
}
