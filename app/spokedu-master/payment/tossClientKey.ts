import { isProductionDeployment } from '@/app/lib/deploymentEnvironment';

export function isTossClientKeyAllowed(
  clientKey: string | null | undefined,
  environment?: string,
  vercelEnvironment?: string,
): boolean {
  const normalized = clientKey?.trim() ?? '';
  if (!normalized) return false;
  if (isProductionDeployment({
    nodeEnvironment: environment,
    vercelEnvironment,
  })) return normalized.startsWith('live_');
  return normalized.startsWith('test_') || normalized.startsWith('live_');
}
