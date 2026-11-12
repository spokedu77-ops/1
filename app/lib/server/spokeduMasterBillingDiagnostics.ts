/** Only provider codes/statuses and our deployment region may enter logs or responses. */
export function billingProviderDiagnostics(error: unknown) {
  const value = error && typeof error === 'object'
    ? error as { code?: unknown; providerStatus?: unknown; name?: unknown }
    : {};
  const providerCode = typeof value.code === 'string' && /^[A-Z0-9_]{1,80}$/.test(value.code)
    ? value.code
    : value.name === 'TimeoutError' ? 'BILLING_PROVIDER_TIMEOUT' : 'BILLING_PROVIDER_REQUEST_FAILED';
  return {
    providerCode,
    providerStatus: typeof value.providerStatus === 'number' && Number.isInteger(value.providerStatus)
      && value.providerStatus >= 100 && value.providerStatus <= 599 ? value.providerStatus : null,
    region: /^[a-z]{3}\d$/.test(process.env.VERCEL_REGION ?? '') ? process.env.VERCEL_REGION : 'unknown',
  };
}
