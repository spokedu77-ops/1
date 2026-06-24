import type { UserProfile } from '../types';

export function getFavoritesOwnerId(profile: UserProfile | null): string {
  if (!profile) return 'local';
  const id = profile.id.trim();
  if (id && id !== 'local') return `id:${id}`;
  const email = profile.email.trim().toLowerCase();
  if (email) return `email:${email}`;
  return 'local';
}

export function getFavoritesByOwner(
  byOwner: Record<string, string[]>,
  ownerId: string,
): string[] {
  return byOwner[ownerId] ?? [];
}

export function isFavoriteByOwner(
  byOwner: Record<string, string[]>,
  ownerId: string,
  programId: string,
): boolean {
  return (byOwner[ownerId] ?? []).includes(programId);
}

export function toggleFavoriteByOwner(
  byOwner: Record<string, string[]>,
  ownerId: string,
  programId: string,
): Record<string, string[]> {
  const current = byOwner[ownerId] ?? [];
  const next = current.includes(programId)
    ? current.filter((id) => id !== programId)
    : [...current, programId];
  return { ...byOwner, [ownerId]: next };
}

export function migrateLegacyFavorites(
  legacy: string[] | undefined,
  ownerId: string | null,
): Record<string, string[]> {
  if (!legacy || legacy.length === 0 || !ownerId) return {};
  return { [ownerId]: [...legacy] };
}
