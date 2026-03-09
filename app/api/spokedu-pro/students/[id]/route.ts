/**
 * /api/spokedu-pro/students/[id]
 * PATCH  — 원생 정보 수정
 * DELETE — 원생 soft-delete (status='inactive')
 *
 * DB_READY=false: 레거시 JSON blob fallback
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/app/lib/supabase/server';
import { getServiceSupabase } from '@/app/lib/server/adminAuth';
import { getActiveCenterIdFromCookie, getCenterMemberRole, type SupabaseClientForMemberRole } from '@/app/lib/server/spokeduProContext';
import type { StoredStudent, PhysicalFunctions } from '../route';

const BLOB_KEY = 'students';

async function legacyLoad(
  svc: ReturnType<typeof getServiceSupabase>,
  userId: string
): Promise<StoredStudent[]> {
  const { data } = await svc
    .from('spokedu_pro_tenant_content')
    .select('draft_value')
    .eq('owner_id', userId)
    .eq('key', BLOB_KEY)
    .maybeSingle();
  if (!data) return [];
  const val = data.draft_value as { students?: StoredStudent[] };
  return val?.students ?? [];
}

async function legacySave(
  svc: ReturnType<typeof getServiceSupabase>,
  userId: string,
  students: StoredStudent[]
): Promise<void> {
  await svc.from('spokedu_pro_tenant_content').upsert(
    {
      owner_id: userId,
      key: BLOB_KEY,
      draft_value: { students },
      draft_updated_at: new Date().toISOString(),
    },
    { onConflict: 'owner_id,key' }
  );
}

// ─── PATCH /api/spokedu-pro/students/[id] ────────────────────────────────────

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const serverSupabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await serverSupabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  let body: {
    name?: string;
    classGroup?: string;
    physical?: Partial<PhysicalFunctions>;
    note?: string;
    birthdate?: string;
    phone?: string;
    parentPhone?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const svc = getServiceSupabase();
  const DB_READY = process.env.SPOKEDU_PRO_DB_READY === 'true';

  if (!DB_READY) {
    const students = await legacyLoad(svc, user.id);
    const idx = students.findIndex((s) => s.id === id);
    if (idx === -1) return NextResponse.json({ error: 'Student not found' }, { status: 404 });

    const updated: StoredStudent = {
      ...students[idx],
      ...(body.name !== undefined ? { name: body.name.trim() } : {}),
      ...(body.classGroup !== undefined ? { classGroup: body.classGroup } : {}),
      ...(body.physical !== undefined
        ? { physical: { ...students[idx].physical, ...body.physical } as PhysicalFunctions }
        : {}),
      ...(body.note !== undefined ? { note: body.note } : {}),
      updatedAt: new Date().toISOString(),
    };

    const next = [...students];
    next[idx] = updated;
    await legacySave(svc, user.id, next);
    return NextResponse.json({ ok: true, student: updated });
  }

  // DB mode
  const cookieCenterId = getActiveCenterIdFromCookie(request);
  let centerId: string | null = cookieCenterId;
  if (!centerId) {
    const { data: center } = await svc
      .from('spokedu_pro_centers')
      .select('id')
      .eq('owner_id', user.id)
      .maybeSingle();
    centerId = center?.id ?? null;
  }
  if (!centerId) return NextResponse.json({ error: 'Center not found' }, { status: 404 });

  const role = await getCenterMemberRole(svc as unknown as SupabaseClientForMemberRole, centerId, user.id);
  if (!role) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  // Verify student belongs to this center
  const { data: existing } = await svc
    .from('spokedu_pro_students')
    .select('id, physical_scores')
    .eq('id', id)
    .eq('center_id', centerId)
    .maybeSingle();
  if (!existing) return NextResponse.json({ error: 'Student not found' }, { status: 404 });

  const prevScores = (existing.physical_scores as Record<string, unknown> | null) ?? {};
  const newScores: Record<string, unknown> = {
    ...prevScores,
    ...(body.classGroup !== undefined ? { classGroup: body.classGroup } : {}),
    ...(body.physical ?? {}),
  };

  const updatePayload: Record<string, unknown> = {
    physical_scores: newScores,
    updated_at: new Date().toISOString(),
  };
  if (body.name !== undefined) updatePayload.name = body.name.trim();
  if (body.birthdate !== undefined) updatePayload.birthdate = body.birthdate;
  if (body.phone !== undefined) updatePayload.phone = body.phone;
  if (body.parentPhone !== undefined) updatePayload.parent_phone = body.parentPhone;

  const { data: updated, error } = await svc
    .from('spokedu_pro_students')
    .update(updatePayload)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const scores = (updated.physical_scores as Record<string, unknown> | null) ?? {};
  const student: StoredStudent = {
    id: updated.id,
    name: updated.name,
    birthdate: (updated.birthdate as string | null) ?? null,
    phone: (updated.phone as string | null) ?? null,
    parentPhone: (updated.parent_phone as string | null) ?? null,
    classGroup: (scores.classGroup as string | undefined) ?? '미분류',
    physical: {
      coordination: (scores.coordination as number | undefined) ?? 2,
      agility: (scores.agility as number | undefined) ?? 2,
      endurance: (scores.endurance as number | undefined) ?? 2,
      balance: (scores.balance as number | undefined) ?? 2,
      strength: (scores.strength as number | undefined) ?? 2,
    } as PhysicalFunctions,
    enrolledAt: (updated.created_at as string)?.slice(0, 10) ?? '',
    status: updated.status as 'active' | 'inactive',
    createdAt: updated.created_at as string,
    updatedAt: updated.updated_at as string,
  };

  return NextResponse.json({ ok: true, student });
}

// ─── DELETE /api/spokedu-pro/students/[id] ───────────────────────────────────

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const serverSupabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await serverSupabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const svc = getServiceSupabase();
  const DB_READY = process.env.SPOKEDU_PRO_DB_READY === 'true';

  if (!DB_READY) {
    const students = await legacyLoad(svc, user.id);
    const next = students.filter((s) => s.id !== id);
    if (next.length === students.length) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }
    await legacySave(svc, user.id, next);
    return NextResponse.json({ ok: true });
  }

  // DB mode: soft delete
  const cookieCenterId = getActiveCenterIdFromCookie(request);
  let centerId: string | null = cookieCenterId;
  if (!centerId) {
    const { data: center } = await svc
      .from('spokedu_pro_centers')
      .select('id')
      .eq('owner_id', user.id)
      .maybeSingle();
    centerId = center?.id ?? null;
  }
  if (!centerId) return NextResponse.json({ error: 'Center not found' }, { status: 404 });

  const role = await getCenterMemberRole(svc as unknown as SupabaseClientForMemberRole, centerId, user.id);
  if (!role) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { error } = await svc
    .from('spokedu_pro_students')
    .update({ status: 'inactive', updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('center_id', centerId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
