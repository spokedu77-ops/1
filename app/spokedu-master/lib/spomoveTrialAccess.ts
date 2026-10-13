import type { MasterAccessSnapshot } from './masterAccessModel';
import { findOfficialSpomovePreset } from '../spomove/officialSpomovePresets';
import { isHubRunnablePreset } from '../spomove/movements/isHubVisiblePreset';

export function resolveLiteSpomoveTrialPresetId(explicitSlotIds: readonly (string | null | undefined)[]) {
  const explicitId = explicitSlotIds[0]?.trim();
  if (!explicitId) return null;
  const preset = findOfficialSpomovePreset(explicitId);
  return preset && isHubRunnablePreset(preset) ? preset.id : null;
}

export function isActiveLiteAccess(snapshot: MasterAccessSnapshot | null | undefined) {
  return snapshot?.plan === 'lite' && snapshot.subscriptionStatus === 'active' && !snapshot.isAdmin;
}

export function canAccessSpomovePreset(
  snapshot: MasterAccessSnapshot | null | undefined,
  presetId: string | null | undefined,
) {
  if (!snapshot || !presetId) return false;
  if (snapshot.canUseSpomove) return true;
  return isActiveLiteAccess(snapshot) && snapshot.spomoveTrialPresetId === presetId;
}
