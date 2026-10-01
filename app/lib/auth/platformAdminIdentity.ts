import { MASTER_EMAIL, SPOMOVE_EMAIL, ROLES, getAdminEmails } from '@/app/lib/constants/admin';

/** 로그인 alias와 동일 — 플랫폼 운영진 3인 auth 이메일 */
export const PLATFORM_ADMIN_EMAILS = [
  MASTER_EMAIL,
  SPOMOVE_EMAIL,
  'kimkoomin@spokedu.com',
  'kimyoonki@spokedu.com',
] as const;

export function isKnownPlatformAdminEmail(email: string | null | undefined): boolean {
  const normalized = email?.trim().toLowerCase() ?? '';
  if (!normalized) return false;
  if (normalized === MASTER_EMAIL.toLowerCase()) return true;
  if ((PLATFORM_ADMIN_EMAILS as readonly string[]).includes(normalized)) return true;
  return getAdminEmails().includes(normalized);
}

function isAdminRole(role: unknown): boolean {
  if (!role || typeof role !== 'string') return false;
  const lower = role.trim().toLowerCase();
  return lower === ROLES.ADMIN || lower === ROLES.MASTER;
}

export type PlatformAdminUserRow = {
  role?: string | null;
  is_admin?: boolean | null;
};

export function isPlatformAdminFromUserRow(row: PlatformAdminUserRow | null | undefined): boolean {
  if (!row) return false;
  if (isAdminRole(row.role)) return true;
  return row.is_admin === true;
}

export function isPlatformAdminFromProfileRole(role: unknown): boolean {
  return isAdminRole(role);
}

export function isPlatformAdminIdentity(
  email: string | null | undefined,
  userRow: PlatformAdminUserRow | null | undefined,
  profileRole: unknown,
): boolean {
  if (isKnownPlatformAdminEmail(email)) return true;
  if (isPlatformAdminFromProfileRole(profileRole)) return true;
  return isPlatformAdminFromUserRow(userRow);
}
