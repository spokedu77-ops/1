import { isProductionDeployment } from '../../lib/deploymentEnvironment';

export function isTossClientKeyAllowed(
  clientKey: string | null | undefined,
  environment?: string,
  vercelEnvironment?: string,
): boolean {
  const normalized = clientKey?.trim() ?? '';
  if (!/^(test|live)_ck_[A-Za-z0-9]+$/.test(normalized)) return false;
  if (isProductionDeployment({
    nodeEnvironment: environment,
    vercelEnvironment,
  })) return normalized.startsWith('live_ck_');
  return true;
}
