import type { Center, CenterListItem } from './types';

/** Same searchable fields as the server, including an address that is not in the list DTO. */
export function matchesCenterFilters(center: Center, filters: { status: string; region: string; search: string }): boolean {
  if (filters.status === 'active') {
    if (!['regular', 'short', 'ongoing'].includes(center.status)) return false;
  } else if (filters.status && center.status !== filters.status) return false;
  if (filters.region && center.region_tag !== filters.region) return false;
  const term = filters.search.replace(/[,%()]/g, ' ').trim();
  if (!term) return !filters.search.trim();
  const pattern = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/_/g, '.'), 'i');
  return [center.name, center.project_name ?? center.settlement_defaults?.projectName, center.address, center.contact_name, center.contact_email].some((value) => value && pattern.test(value));
}

export function toCenterListItem(row: Partial<Center>): CenterListItem {
  return {
    id: row.id!, name: row.name!, status: row.status ?? 'regular',
    project_name: row.project_name ?? row.settlement_defaults?.projectName ?? null,
    region_tag: row.region_tag ?? null,
    contact_name: row.contact_name ?? null, contact_phone: row.contact_phone ?? null,
    contact_email: row.contact_email ?? null, contact_role: row.contact_role ?? null,
    weekly_schedule: row.weekly_schedule ?? [], highlights: row.highlights ?? null,
    updated_at: row.updated_at!,
    main_teacher_name: row.main_teacher_name ?? null,
    main_teacher_2_name: row.main_teacher_2_name ?? null,
    main_teacher_3_name: row.main_teacher_3_name ?? null,
  };
}
