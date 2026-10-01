export function isTossClientKeyAllowed(
  clientKey: string | null | undefined,
  environment: string | undefined = process.env.NODE_ENV,
): boolean {
  const normalized = clientKey?.trim() ?? '';
  if (!normalized) return false;
  if (environment === 'production') return normalized.startsWith('live_');
  return normalized.startsWith('test_') || normalized.startsWith('live_');
}
