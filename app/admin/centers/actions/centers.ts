'use server';

import { createServerSupabaseClient } from '@/app/lib/supabase/server';
import { createCenterSchema } from '@/app/lib/centers/schemas';
import type { Center, TeacherOption } from '@/app/lib/centers/types';

export type GetCentersFilters = {
  search?: string;
  status?: string;
  region_tag?: string;
};

export async function getCenters(filters: GetCentersFilters = {}): Promise<Center[]> {
  const supabase = await createServerSupabaseClient();
  let q = supabase
    .from('centers')
    .select(
      `
        id,
        name,
        region_tag,
        contact_name,
        contact_phone,
        contact_role,
        status,
        weekly_schedule,
        highlights,
        next_actions,
        created_at,
        updated_at,
        main_teacher:main_teacher_id(id, name)
      `
    )
    .order('name');

  if (filters.status) {
    q = q.eq('status', filters.status);
  }
  if (filters.region_tag) {
    q = q.eq('region_tag', filters.region_tag);
  }
  if (filters.search?.trim()) {
    const term = filters.search.trim();
    q = q.or(`name.ilike.%${term}%,address.ilike.%${term}%,contact_name.ilike.%${term}%`);
  }

  const { data, error } = await q;
  if (error) throw error;

  // UI 목록 화면에서 필요한 컬럼만 select했기 때문에,
  // Center 타입이 요구하는 필드들이 일부 누락됩니다.
  // 여기서는 목록 UI에 영향 없는 값들은 안전한 기본값으로 채웁니다.
  type MainTeacherJoin = { id: string; name: string } | { id: string; name: string }[] | null;
  type CenterListRow = Partial<Center> & { main_teacher?: MainTeacherJoin };
  return ((data ?? []) as unknown as CenterListRow[]).map(({ main_teacher, ...row }) => {
    const mainTeacherName = Array.isArray(main_teacher)
      ? main_teacher[0]?.name ?? null
      : main_teacher?.name ?? null;

    return {
    id: row.id as string,
    name: row.name as string,
    region_tag: (row.region_tag as string | null) ?? null,
    address: (row.address as string | null) ?? null,
    access_note: (row.access_note as string | null) ?? null,
    contact_name: (row.contact_name as string | null) ?? null,
    contact_phone: (row.contact_phone as string | null) ?? null,
    contact_role: (row.contact_role as string | null) ?? null,
    status: (row.status as Center['status']) ?? 'active',
    contract_start: (row.contract_start as string | null) ?? null,
    contract_end: (row.contract_end as string | null) ?? null,
    session_fee: (row.session_fee as number | null) ?? null,
    main_teacher_id: (row.main_teacher_id as string | null) ?? null,
    weekly_schedule: (row.weekly_schedule as Center['weekly_schedule']) ?? [],
    instructors_default:
      (row.instructors_default as Center['instructors_default']) ?? { main: null, sub: null, backup: [] },
    highlights: (row.highlights as string | null) ?? null,
    next_actions: (row.next_actions as Center['next_actions']) ?? [],
    created_at: (row.created_at as string) ?? new Date().toISOString(),
    updated_at: (row.updated_at as string) ?? new Date().toISOString(),
    main_teacher_name: mainTeacherName,
    };
  });
}

export async function getCenterById(id: string): Promise<Center | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('centers')
    .select('*, main_teacher:main_teacher_id(id, name)')
    .eq('id', id)
    .single();
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  const { main_teacher, ...row } = data as Center & { main_teacher?: { id: string; name: string } | null };
  return {
    ...row,
    main_teacher_name: main_teacher?.name ?? null,
  };
}

/** 활동 중인 강사 목록 조회 (강사 선택 select용) */
export async function getActiveTeachers(): Promise<TeacherOption[]> {
  const supabase = await createServerSupabaseClient();
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
  const parsed = createCenterSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.flatten().formErrors.join(', ') };
  }
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('centers')
    .insert({
      name: parsed.data.name,
      region_tag: parsed.data.region_tag ?? null,
      address: parsed.data.address ?? null,
      access_note: parsed.data.access_note ?? null,
      contact_name: parsed.data.contact_name ?? null,
      contact_phone: parsed.data.contact_phone ?? null,
      contact_role: parsed.data.contact_role ?? null,
      status: parsed.data.status,
      contract_start: parsed.data.contract_start ?? null,
      contract_end: parsed.data.contract_end ?? null,
      session_fee: parsed.data.session_fee ?? null,
      main_teacher_id: parsed.data.main_teacher_id ?? null,
      weekly_schedule: parsed.data.weekly_schedule ?? [],
      instructors_default: parsed.data.instructors_default ?? { main: null, sub: null, backup: [] },
      highlights: parsed.data.highlights ?? null,
      next_actions: parsed.data.next_actions ?? [],
    })
    .select()
    .single();
  if (error) return { error: error.message };
  return { data: data as Center };
}

export async function updateCenter(
  id: string,
  input: unknown
): Promise<{ data?: Center; error?: string }> {
  const parsed = createCenterSchema.partial().safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.flatten().formErrors.join(', ') };
  }
  const supabase = await createServerSupabaseClient();
  const payload: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) payload.name = parsed.data.name;
  if (parsed.data.region_tag !== undefined) payload.region_tag = parsed.data.region_tag;
  if (parsed.data.address !== undefined) payload.address = parsed.data.address;
  if (parsed.data.access_note !== undefined) payload.access_note = parsed.data.access_note;
  if (parsed.data.contact_name !== undefined) payload.contact_name = parsed.data.contact_name;
  if (parsed.data.contact_phone !== undefined) payload.contact_phone = parsed.data.contact_phone;
  if (parsed.data.contact_role !== undefined) payload.contact_role = parsed.data.contact_role;
  if (parsed.data.status !== undefined) payload.status = parsed.data.status;
  if (parsed.data.contract_start !== undefined) payload.contract_start = parsed.data.contract_start;
  if (parsed.data.contract_end !== undefined) payload.contract_end = parsed.data.contract_end;
  if (parsed.data.session_fee !== undefined) payload.session_fee = parsed.data.session_fee;
  if (parsed.data.main_teacher_id !== undefined) payload.main_teacher_id = parsed.data.main_teacher_id;
  if (parsed.data.weekly_schedule !== undefined) payload.weekly_schedule = parsed.data.weekly_schedule;
  if (parsed.data.instructors_default !== undefined) payload.instructors_default = parsed.data.instructors_default;
  if (parsed.data.highlights !== undefined) payload.highlights = parsed.data.highlights;
  if (parsed.data.next_actions !== undefined) payload.next_actions = parsed.data.next_actions;

  const { data, error } = await supabase
    .from('centers')
    .update(payload)
    .eq('id', id)
    .select()
    .single();
  if (error) return { error: error.message };
  return { data: data as Center };
}

export async function deleteCenter(id: string): Promise<{ data?: true; error?: string }> {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from('centers').delete().eq('id', id);
  if (error) return { error: error.message };
  return { data: true };
}
