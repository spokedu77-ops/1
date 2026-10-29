'use server';

import { createCenterSchema } from '@/app/lib/centers/schemas';
import type { Center, CenterListItem, TeacherOption } from '@/app/lib/centers/types';
import { toCenterListItem } from '@/app/lib/centers/listItem';
import { getServiceSupabase, requireAdmin } from '@/app/lib/server/adminAuth';
import { z } from 'zod';

const CENTER_NOT_FOUND_OR_FORBIDDEN = '센터를 찾을 수 없거나 권한이 없습니다.';
const ADMIN_REQUIRED = '관리자 권한이 필요합니다.';
const centerIdSchema = z.string().uuid();
const getCentersFiltersSchema = z.object({
  search: z.string().trim().max(100).optional(),
  status: z.enum(['active', 'paused', 'ended']).optional(),
  region_tag: z.string().trim().max(100).optional(),
});

export type GetCentersFilters = {
  search?: string;
  status?: string;
  region_tag?: string;
};

type MainTeacherJoin = { name: string } | { name: string }[] | null;

type CenterRowWithTeacher = Partial<Center> & {
  main_teacher?: MainTeacherJoin;
  mt2?: MainTeacherJoin;
  mt3?: MainTeacherJoin;
  next_actions?: unknown;
};

function teacherJoinName(j: MainTeacherJoin | undefined): string | null {
  if (j == null) return null;
  return Array.isArray(j) ? j[0]?.name ?? null : j.name ?? null;
}

function normalizeCenterRow(row: CenterRowWithTeacher): Center {
  const { main_teacher, mt2, mt3, ...baseRow } = row;

  return {
    id: baseRow.id as string,
    name: baseRow.name as string,
    region_tag: (baseRow.region_tag as string | null) ?? null,
    address: (baseRow.address as string | null) ?? null,
    access_note: (baseRow.access_note as string | null) ?? null,
    contact_name: (baseRow.contact_name as string | null) ?? null,
    contact_phone: (baseRow.contact_phone as string | null) ?? null,
    contact_email: (baseRow.contact_email as string | null) ?? null,
    contact_role: (baseRow.contact_role as string | null) ?? null,
    status: (baseRow.status as Center['status']) ?? 'active',
    contract_start: (baseRow.contract_start as string | null) ?? null,
    contract_end: (baseRow.contract_end as string | null) ?? null,
    session_fee: (baseRow.session_fee as number | null) ?? null,
    main_teacher_id: (baseRow.main_teacher_id as string | null) ?? null,
    main_teacher_2_id: (baseRow.main_teacher_2_id as string | null) ?? null,
    main_teacher_3_id: (baseRow.main_teacher_3_id as string | null) ?? null,
    weekly_schedule: (baseRow.weekly_schedule as Center['weekly_schedule']) ?? [],
    instructors_default:
      (baseRow.instructors_default as Center['instructors_default']) ?? { main: null, sub: null, backup: [] },
    highlights: (baseRow.highlights as string | null) ?? null,
    criminal_check_facility_id: (baseRow.criminal_check_facility_id as string | null) ?? null,
    criminal_check_files: (baseRow.criminal_check_files as Center['criminal_check_files']) ?? [],
    created_at: (baseRow.created_at as string) ?? new Date().toISOString(),
    updated_at: (baseRow.updated_at as string) ?? new Date().toISOString(),
    main_teacher_name: teacherJoinName(main_teacher),
    main_teacher_2_name: teacherJoinName(mt2),
    main_teacher_3_name: teacherJoinName(mt3),
  };
}

const CENTER_SELECT_WITH_TEACHERS = `
  id,
  name,
  region_tag,
  address,
  access_note,
  contact_name,
  contact_phone,
  contact_email,
  contact_role,
  status,
  contract_start,
  contract_end,
  session_fee,
  main_teacher_id,
  main_teacher_2_id,
  main_teacher_3_id,
  weekly_schedule,
  instructors_default,
  highlights,
  criminal_check_facility_id,
  criminal_check_files,
  created_at,
  updated_at,
  main_teacher:main_teacher_id(id, name),
  mt2:main_teacher_2_id(id, name),
  mt3:main_teacher_3_id(id, name)
`;

export async function getCenters(filters: GetCentersFilters = {}): Promise<CenterListItem[]> {
  const auth = await requireAdmin();
  if (!auth.ok) throw new Error(ADMIN_REQUIRED);
  const parsedFilters = getCentersFiltersSchema.safeParse(filters);
  if (!parsedFilters.success) return [];
  const supabase = getServiceSupabase();
  let q = supabase
    .from('centers')
    .select(
      `
        id,
        name,
        region_tag,
        contact_name,
        contact_phone,
        contact_email,
        contact_role,
        status,
        weekly_schedule,
        highlights,
        updated_at,
        main_teacher:main_teacher_id(name),
        mt2:main_teacher_2_id(name),
        mt3:main_teacher_3_id(name)
      `
    )
    .order('name');

  if (parsedFilters.data.status) {
    q = q.eq('status', parsedFilters.data.status);
  }
  if (parsedFilters.data.region_tag) {
    q = q.eq('region_tag', parsedFilters.data.region_tag);
  }
  if (parsedFilters.data.search) {
    const term = parsedFilters.data.search.replace(/[,%()]/g, ' ').trim();
    if (!term) return [];
    q = q.or(
      `name.ilike.%${term}%,address.ilike.%${term}%,contact_name.ilike.%${term}%,contact_email.ilike.%${term}%`
    );
  }

  const { data, error } = await q;
  if (error) throw error;

  return ((data ?? []) as unknown as CenterRowWithTeacher[]).map((row) => toCenterListItem({
    ...row,
    main_teacher_name: teacherJoinName(row.main_teacher),
    main_teacher_2_name: teacherJoinName(row.mt2),
    main_teacher_3_name: teacherJoinName(row.mt3),
  }));
}

export async function getCenterById(id: string): Promise<Center | null> {
  const auth = await requireAdmin();
  if (!auth.ok) throw new Error(ADMIN_REQUIRED);
  const parsedId = centerIdSchema.safeParse(id);
  if (!parsedId.success) return null;
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from('centers')
    .select(CENTER_SELECT_WITH_TEACHERS)
    .eq('id', parsedId.data)
    .single();
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return normalizeCenterRow(data as CenterRowWithTeacher);
}

/** 활동 중인 강사 목록 조회 (강사 선택 select용) */
export async function getActiveTeachers(): Promise<TeacherOption[]> {
  const auth = await requireAdmin();
  if (!auth.ok) throw new Error(ADMIN_REQUIRED);
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from('users')
    .select('id, name')
    .eq('is_active', true)
    .in('role', ['teacher', 'admin'])
    .order('name');
  if (error) throw error;
  return (data ?? []) as TeacherOption[];
}

export async function createCenter(input: unknown): Promise<{ data?: Center; error?: string }> {
  const auth = await requireAdmin();
  if (!auth.ok) return { error: ADMIN_REQUIRED };
  const parsed = createCenterSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.flatten().formErrors.join(', ') };
  }
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from('centers')
    .insert({
      name: parsed.data.name,
      region_tag: parsed.data.region_tag ?? null,
      address: parsed.data.address ?? null,
      access_note: parsed.data.access_note ?? null,
      contact_name: parsed.data.contact_name ?? null,
      contact_phone: parsed.data.contact_phone ?? null,
      contact_email: parsed.data.contact_email ?? null,
      contact_role: parsed.data.contact_role ?? null,
      status: parsed.data.status,
      contract_start: parsed.data.contract_start ?? null,
      contract_end: parsed.data.contract_end ?? null,
      session_fee: parsed.data.session_fee ?? null,
      main_teacher_id: parsed.data.main_teacher_id ?? null,
      main_teacher_2_id: parsed.data.main_teacher_2_id ?? null,
      main_teacher_3_id: parsed.data.main_teacher_3_id ?? null,
      weekly_schedule: parsed.data.weekly_schedule ?? [],
      instructors_default: parsed.data.instructors_default ?? { main: null, sub: null, backup: [] },
      highlights: parsed.data.highlights ?? null,
      criminal_check_facility_id: parsed.data.criminal_check_facility_id ?? null,
      criminal_check_facility_password: parsed.data.criminal_check_facility_password ?? null,
      criminal_check_files: [],
      next_actions: [],
    })
    .select(CENTER_SELECT_WITH_TEACHERS)
    .single();
  if (error) return { error: error.message };
  return { data: normalizeCenterRow(data as CenterRowWithTeacher) };
}

export async function updateCenter(
  id: string,
  input: unknown
): Promise<{ data?: Center; error?: string }> {
  const auth = await requireAdmin();
  if (!auth.ok) return { error: ADMIN_REQUIRED };
  const parsedId = centerIdSchema.safeParse(id);
  if (!parsedId.success) return { error: CENTER_NOT_FOUND_OR_FORBIDDEN };
  const parsed = createCenterSchema.partial().safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.flatten().formErrors.join(', ') };
  }
  const supabase = getServiceSupabase();
  const payload: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) payload.name = parsed.data.name;
  if (parsed.data.region_tag !== undefined) payload.region_tag = parsed.data.region_tag;
  if (parsed.data.address !== undefined) payload.address = parsed.data.address;
  if (parsed.data.access_note !== undefined) payload.access_note = parsed.data.access_note;
  if (parsed.data.contact_name !== undefined) payload.contact_name = parsed.data.contact_name;
  if (parsed.data.contact_phone !== undefined) payload.contact_phone = parsed.data.contact_phone;
  if (parsed.data.contact_email !== undefined) payload.contact_email = parsed.data.contact_email;
  if (parsed.data.contact_role !== undefined) payload.contact_role = parsed.data.contact_role;
  if (parsed.data.status !== undefined) payload.status = parsed.data.status;
  if (parsed.data.contract_start !== undefined) payload.contract_start = parsed.data.contract_start;
  if (parsed.data.contract_end !== undefined) payload.contract_end = parsed.data.contract_end;
  if (parsed.data.session_fee !== undefined) payload.session_fee = parsed.data.session_fee;
  if (parsed.data.main_teacher_id !== undefined) payload.main_teacher_id = parsed.data.main_teacher_id;
  if (parsed.data.main_teacher_2_id !== undefined) payload.main_teacher_2_id = parsed.data.main_teacher_2_id;
  if (parsed.data.main_teacher_3_id !== undefined) payload.main_teacher_3_id = parsed.data.main_teacher_3_id;
  if (parsed.data.weekly_schedule !== undefined) payload.weekly_schedule = parsed.data.weekly_schedule;
  if (parsed.data.instructors_default !== undefined) payload.instructors_default = parsed.data.instructors_default;
  if (parsed.data.highlights !== undefined) payload.highlights = parsed.data.highlights;
  if (parsed.data.criminal_check_facility_id !== undefined) {
    payload.criminal_check_facility_id = parsed.data.criminal_check_facility_id;
  }
  if (parsed.data.criminal_check_facility_password !== undefined) {
    payload.criminal_check_facility_password = parsed.data.criminal_check_facility_password;
  }
  const { data, error } = await supabase
    .from('centers')
    .update(payload)
    .eq('id', parsedId.data)
    .select(CENTER_SELECT_WITH_TEACHERS)
    .maybeSingle();
  if (error) return { error: error.message };
  if (!data) return { error: CENTER_NOT_FOUND_OR_FORBIDDEN };
  return { data: normalizeCenterRow(data as CenterRowWithTeacher) };
}

export async function deleteCenter(id: string): Promise<{ data?: true; error?: string }> {
  const auth = await requireAdmin();
  if (!auth.ok) return { error: ADMIN_REQUIRED };
  const parsedId = centerIdSchema.safeParse(id);
  if (!parsedId.success) return { error: CENTER_NOT_FOUND_OR_FORBIDDEN };
  const supabase = getServiceSupabase();
  const { data, error } = await supabase.from('centers').delete().eq('id', parsedId.data).select('id');
  if (error) return { error: error.message };
  if (!data || data.length === 0) return { error: CENTER_NOT_FOUND_OR_FORBIDDEN };
  return { data: true };
}

export async function getCenterCriminalCheckPassword(
  id: string
): Promise<{ data?: string | null; error?: string }> {
  const auth = await requireAdmin();
  if (!auth.ok) return { error: ADMIN_REQUIRED };
  const parsedId = centerIdSchema.safeParse(id);
  if (!parsedId.success) return { error: CENTER_NOT_FOUND_OR_FORBIDDEN };

  const { data, error } = await getServiceSupabase()
    .from('centers')
    .select('criminal_check_facility_password')
    .eq('id', parsedId.data)
    .maybeSingle();
  if (error) return { error: error.message };
  if (!data) return { error: CENTER_NOT_FOUND_OR_FORBIDDEN };
  return { data: data.criminal_check_facility_password ?? null };
}
