import { ADMIN_NAMES } from '@/app/lib/constants/admin';
import { isKnownPlatformAdminEmail, isPlatformAdminFromUserRow } from '@/app/lib/auth/platformAdminIdentity';
import { jsonMetadataSpan, replaceSessionAssistants } from '@/app/admin/classes-shared/lib/sessionMetadata';
import type { SupabaseClient } from '@supabase/supabase-js';

export type FeeIdentity = { name?: string | null; email?: string | null; role?: string | null; is_admin?: boolean | null };

/** Staff teaching is never a payable instructor fee, in either teaching role. */
export function isZeroFeeStaff(teacher: FeeIdentity | null | undefined): boolean {
  return Boolean(teacher && (isPlatformAdminFromUserRow(teacher)
    || isKnownPlatformAdminEmail(teacher.email)
    || (ADMIN_NAMES as readonly string[]).includes(teacher.name?.trim() ?? '')));
}

export function payableTeacherFee(teacher: FeeIdentity | null | undefined, amount: number): number {
  return isZeroFeeStaff(teacher) ? 0 : amount;
}

export function zeroStaffAssistantFees(text: string | null | undefined, staffIds: Set<string>): string | null | undefined {
  if (!text?.includes('EXTRA_TEACHERS:')) return text;
  const span = jsonMetadataSpan(text, 'EXTRA_TEACHERS:');
  if (!span) return text;
  const rows = JSON.parse(text.slice(span.start, span.end));
  if (!Array.isArray(rows) || !rows.some((row) => staffIds.has(row?.id) && row.price !== 0)) return text;
  return replaceSessionAssistants(text, rows.map((row) => staffIds.has(row?.id) ? { ...row, price: 0 } : row));
}

export function applyStaffSessionFees<T extends { created_by?: string | null; price?: number | null; memo?: string | null; students_text?: string | null }>(row: T, staffIds: Set<string>): T {
  return { ...row,
    ...(row.created_by && staffIds.has(row.created_by) ? { price: 0 } : {}),
    ...('memo' in row ? { memo: zeroStaffAssistantFees(row.memo, staffIds) } : {}),
    ...('students_text' in row ? { students_text: zeroStaffAssistantFees(row.students_text, staffIds) } : {}),
  };
}

export async function staffTeacherIds(client: SupabaseClient): Promise<Set<string>> {
  const ids = new Set<string>();
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await client.from('users').select('id,name,role,email,is_admin').order('id').range(offset, offset + 999);
    if (error) throw error;
    for (const teacher of data ?? []) if (isZeroFeeStaff(teacher)) ids.add(teacher.id);
    if (!data || data.length < 1000) return ids;
  }
}

export async function normalizeStaffSessionFees<T extends { created_by?: string | null; price?: number | null; memo?: string | null; students_text?: string | null }>(client: SupabaseClient, rows: T[]): Promise<T[]> {
  const ids = await staffTeacherIds(client);
  return rows.map((row) => applyStaffSessionFees(row, ids));
}
