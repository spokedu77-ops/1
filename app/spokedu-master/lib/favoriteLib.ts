import type { UserProfile } from '../types';
import {
  getRecentActivityOwnerId,
  type RecentActivityOwner,
} from './recentProgramActivity';

export function getFavoritesOwnerId(profile: UserProfile | null): string | null {
  return getRecentActivityOwnerId(profile);
}

export type FavoriteContentType = 'program' | 'spomove';

export type FavoriteContentRef = {
  type: FavoriteContentType;
  id: string;
};

export type FavoritesByOwner = Record<string, FavoriteContentRef[]>;

export function isFavoriteContentRef(value: unknown): value is FavoriteContentRef {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const candidate = value as { type?: unknown; id?: unknown };
  return (candidate.type === 'program' || candidate.type === 'spomove')
    && typeof candidate.id === 'string'
    && Boolean(candidate.id.trim());
}

export function normalizeFavoriteContentRefs(value: unknown): FavoriteContentRef[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const refs: FavoriteContentRef[] = [];
  for (const item of value) {
    if (!isFavoriteContentRef(item)) continue;
    const ref = { type: item.type, id: item.id.trim() } as FavoriteContentRef;
    const key = `${ref.type}:${ref.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    refs.push(ref);
  }
  return refs;
}

export function normalizeFavoriteContentRefsByOwner(value: unknown): FavoritesByOwner {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value)
      .filter(([ownerId]) => ownerId.startsWith('id:') || ownerId.startsWith('email:'))
      .map(([ownerId, refs]) => [ownerId, normalizeFavoriteContentRefs(refs)])
      .filter(([, refs]) => refs.length > 0),
  );
}

export function getFavoriteContentRefs(byOwner: FavoritesByOwner, ownerId: string | null) {
  return ownerId ? byOwner[ownerId] ?? [] : [];
}

export function getFavoriteContentIds(
  byOwner: FavoritesByOwner,
  ownerId: string | null,
  type: FavoriteContentType,
) {
  return getFavoriteContentRefs(byOwner, ownerId).filter((ref) => ref.type === type).map((ref) => ref.id);
}

export function isFavoriteContent(
  byOwner: FavoritesByOwner,
  ownerId: string | null,
  ref: FavoriteContentRef,
) {
  return getFavoriteContentRefs(byOwner, ownerId).some((item) => item.type === ref.type && item.id === ref.id);
}

export function toggleFavoriteContent(
  byOwner: FavoritesByOwner,
  ownerId: string | null,
  ref: FavoriteContentRef,
): FavoritesByOwner {
  if (!ownerId || !isFavoriteContentRef(ref)) return byOwner;
  const current = getFavoriteContentRefs(byOwner, ownerId);
  const exists = current.some((item) => item.type === ref.type && item.id === ref.id);
  const next = exists
    ? current.filter((item) => item.type !== ref.type || item.id !== ref.id)
    : [...current, { type: ref.type, id: ref.id.trim() }];
  if (next.length === 0) {
    const withoutOwner = { ...byOwner };
    delete withoutOwner[ownerId];
    return withoutOwner;
  }
  return { ...byOwner, [ownerId]: next };
}

export function classifyLegacyFavoriteIds(
  value: unknown,
  programIds: ReadonlySet<string>,
  spomoveIds: ReadonlySet<string>,
): { refs: FavoriteContentRef[]; pending: string[]; collisions: string[] } {
  const refs: FavoriteContentRef[] = [];
  const pending: string[] = [];
  const collisions: string[] = [];
  for (const id of normalizeFavoriteProgramIds(value)) {
    const program = programIds.has(id);
    const spomove = spomoveIds.has(id);
    if (program && spomove) collisions.push(id);
    else if (program) refs.push({ type: 'program', id });
    else if (spomove) refs.push({ type: 'spomove', id });
    else pending.push(id);
  }
  return { refs, pending, collisions };
}

export function mergeFavoriteContentRefs(local: FavoriteContentRef[], remote: FavoriteContentRef[]) {
  return normalizeFavoriteContentRefs([...remote, ...local]);
}

export function migrateFavoriteContentOwners(byOwner: FavoritesByOwner, owner: RecentActivityOwner): FavoritesByOwner {
  if (!owner.emailOwnerId || owner.emailOwnerId === owner.ownerId) return byOwner;
  const emailRefs = byOwner[owner.emailOwnerId] ?? [];
  if (emailRefs.length === 0) return byOwner;
  const next = { ...byOwner };
  delete next[owner.emailOwnerId];
  next[owner.ownerId] = mergeFavoriteContentRefs(next[owner.ownerId] ?? [], emailRefs);
  return next;
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

export function mergeFavoriteProgramIds(local: string[], remote: string[]): string[] {
  return normalizeFavoriteProgramIds([...remote, ...local]);
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
