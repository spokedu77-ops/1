/**
 * /api/spokedu-pro/students/[id]
 * PATCH  — 학생 정보 수정 (이름, 반, 신체기능, 메모)
 * DELETE — 학생 삭제
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/app/lib/supabase/server';
import { getServiceSupabase } from '@/app/lib/server/adminAuth';
import type { StoredStudent, PhysicalFunctions } from '../route';

const CONTENT_KEY = 'students';

async function loadStudents(serviceSupabase: ReturnType<typeof getServiceSupabase>, userId: string): Promise<StoredStudent[]> {
  const { data } = await serviceSupabase
    .from('spokedu_pro_tenant_content')
    .select('draft_value')
    .eq('owner_id', userId)
    .eq('key', CONTENT_KEY)
    .maybeSingle();
  if (!data) return [];
  const val = data.draft_value as { students?: StoredStudent[] };
  return val?.students ?? [];
}

async function saveStudents(serviceSupabase: ReturnType<typeof getServiceSupabase>, userId: string, students: StoredStudent[]): Promise<void> {
  await serviceSupabase
    .from('spokedu_pro_tenant_content')
    .upsert(
      {
        owner_id: userId,
        key: CONTENT_KEY,
        draft_value: { students },
        draft_updated_at: new Date().toISOString(),
      },
      { onConflict: 'owner_id,key' }
    );
}

// PATCH /api/spokedu-pro/students/[id]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const serverSupabase = await createServerSupabaseClient();
    const { data: { user } } = await serverSupabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    let body: { name?: string; classGroup?: string; physical?: Partial<PhysicalFunctions>; note?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    if (body.name !== undefined) {
      const trimmedName = body.name.trim();
      if (!trimmedName) return NextResponse.json({ error: 'name is required' }, { status: 400 });
      if (trimmedName.length > 100) return NextResponse.json({ error: '이름은 100자 이하여야 합니다.' }, { status: 400 });
      body = { ...body, name: trimmedName };
    }
    if (body.classGroup !== undefined && body.classGroup.length > 50) {
      return NextResponse.json({ error: '반 이름은 50자 이하여야 합니다.' }, { status: 400 });
    }

    const serviceSupabase = getServiceSupabase();
    const students = await loadStudents(serviceSupabase, user.id);
    const idx = students.findIndex((s) => s.id === id);
    if (idx === -1) return NextResponse.json({ error: 'Student not found' }, { status: 404 });

    const updated: StoredStudent = {
      ...students[idx],
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.classGroup !== undefined ? { classGroup: body.classGroup } : {}),
      ...(body.physical !== undefined ? { physical: { ...students[idx].physical, ...body.physical } as PhysicalFunctions } : {}),
      ...(body.note !== undefined ? { note: body.note } : {}),
      updatedAt: new Date().toISOString(),
    };

    const next = [...students];
    next[idx] = updated;
    await saveStudents(serviceSupabase, user.id, next);

    return NextResponse.json({ ok: true, student: updated });
  } catch (err) {
    console.error('[students PATCH]', err);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

// DELETE /api/spokedu-pro/students/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const serverSupabase = await createServerSupabaseClient();
    const { data: { user } } = await serverSupabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const serviceSupabase = getServiceSupabase();
    const students = await loadStudents(serviceSupabase, user.id);
    const next = students.filter((s) => s.id !== id);

    if (next.length === students.length) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    await saveStudents(serviceSupabase, user.id, next);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[students DELETE]', err);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
