import type { UserProfile } from '../types';
import {
  getRecentActivityOwnerId,
  type RecentActivityOwner,
} from './recentProgramActivity';

export function getFavoritesOwnerId(profile: UserProfile | null): string | null {
  return getRecentActivityOwnerId(profile);
}

export function normalizeFavoriteProgramIds(programIds: unknown): string[] {
  if (!Array.isArray(programIds)) return [];
  const seen = new Set<string>();
  return programIds.filter((programId): programId is string => {
    if (typeof programId !== 'string' || !programId || seen.has(programId)) return false;
    seen.add(programId);
    return true;
  });
}

export function normalizeFavoritesByOwner(
  byOwner: unknown,
): Record<string, string[]> {
  if (!byOwner || typeof byOwner !== 'object' || Array.isArray(byOwner)) return {};
  return Object.fromEntries(
    Object.entries(byOwner)
      .filter(([ownerId]) => ownerId.startsWith('id:') || ownerId.startsWith('email:'))
      .map(([ownerId, programIds]) => [ownerId, normalizeFavoriteProgramIds(programIds)])
      .filter(([, programIds]) => programIds.length > 0),
  );
}

export function getFavoritesByOwner(
  byOwner: Record<string, string[]>,
  ownerId: string | null,
): string[] {
  if (!ownerId) return [];
  return byOwner[ownerId] ?? [];
}

export function isFavoriteByOwner(
  byOwner: Record<string, string[]>,
  ownerId: string | null,
  programId: string,
): boolean {
  if (!ownerId) return false;
  return (byOwner[ownerId] ?? []).includes(programId);
}

export function toggleFavoriteByOwner(
  byOwner: Record<string, string[]>,
  ownerId: string | null,
  programId: string,
): Record<string, string[]> {
  if (!ownerId || !programId) return byOwner;
  const current = normalizeFavoriteProgramIds(byOwner[ownerId]);
  const next = current.includes(programId)
    ? current.filter((id) => id !== programId)
    : [...current, programId];
  if (next.length === 0) {
    const withoutOwner = { ...byOwner };
    delete withoutOwner[ownerId];
    return withoutOwner;
  }
  return { ...byOwner, [ownerId]: next };
}

export function migrateLegacyFavorites(
  legacy: unknown,
  ownerId: string | null,
): Record<string, string[]> {
  const programIds = normalizeFavoriteProgramIds(legacy);
  if (programIds.length === 0 || !ownerId) return {};
  return { [ownerId]: programIds };
}

export function migrateFavoriteOwners(
  byOwner: Record<string, string[]>,
  owner: RecentActivityOwner,
): Record<string, string[]> {
  if (!owner.emailOwnerId || owner.emailOwnerId === owner.ownerId) return byOwner;
  const emailProgramIds = byOwner[owner.emailOwnerId] ?? [];
  if (emailProgramIds.length === 0) return byOwner;
  const withoutEmailOwner = { ...byOwner };
  delete withoutEmailOwner[owner.emailOwnerId];
  return {
    ...withoutEmailOwner,
    [owner.ownerId]: normalizeFavoriteProgramIds([
      ...(byOwner[owner.ownerId] ?? []),
      ...emailProgramIds,
    ]),
  };
}

export function claimPendingLegacyFavorites(
  byOwner: Record<string, string[]>,
  pendingLegacyProgramIds: string[],
  owner: RecentActivityOwner,
): {
  favoriteProgramIdsByOwner: Record<string, string[]>;
  pendingLegacyFavoriteProgramIds: string[];
} {
  const migratedOwners = migrateFavoriteOwners(byOwner, owner);
  const pending = normalizeFavoriteProgramIds(pendingLegacyProgramIds);
  if (pending.length === 0) {
    return {
      favoriteProgramIdsByOwner: migratedOwners,
      pendingLegacyFavoriteProgramIds: [],
    };
  }
  return {
    favoriteProgramIdsByOwner: {
      ...migratedOwners,
      [owner.ownerId]: normalizeFavoriteProgramIds([
        ...(migratedOwners[owner.ownerId] ?? []),
        ...pending,
      ]),
    },
    pendingLegacyFavoriteProgramIds: [],
  };
}
