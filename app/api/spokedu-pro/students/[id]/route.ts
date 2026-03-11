/**
 * /api/spokedu-pro/students/[id]
 * PATCH  — 학생 정보 수정 (이름, 반, 신체기능, 메모)
 * DELETE — 학생 삭제
 *
 * DB_READY=false: tenant_content JSON blob 수정
 * DB_READY=true:  spokedu_pro_students 테이블 직접 수정 (center_id 소유권 검증)
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/app/lib/supabase/server';
import { getServiceSupabase } from '@/app/lib/server/adminAuth';
import { resolveCenter, loadStudentsFromContent, saveStudentsToContent } from '@/app/lib/server/spokeduProUtils';
import {
  type PhysicalFunctions,
  type StoredStudent,
  type DbStudentRow,
  dbToStudent,
} from '@/app/lib/types/spokeduPro';

const DB_READY = process.env.SPOKEDU_PRO_DB_READY === 'true';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const serverSupabase = await createServerSupabaseClient();
    const { data: { user } } = await serverSupabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    let body: { name?: string; classGroup?: string; physical?: Partial<PhysicalFunctions>; note?: string };
    try { body = await req.json(); }
    catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

    if (body.name !== undefined) {
      const t = body.name.trim();
      if (!t) return NextResponse.json({ error: 'name is required' }, { status: 400 });
      if (t.length > 100) return NextResponse.json({ error: '이름은 100자 이하여야 합니다.' }, { status: 400 });
      body = { ...body, name: t };
    }
    if (body.classGroup !== undefined && body.classGroup.length > 50) {
      return NextResponse.json({ error: '반 이름은 50자 이하여야 합니다.' }, { status: 400 });
    }

    const svc = getServiceSupabase();

    if (!DB_READY) {
      const students = await loadStudentsFromContent(svc, user.id);
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
      await saveStudentsToContent(svc, user.id, next);
      return NextResponse.json({ ok: true, student: updated });
    }

    const centerId = await resolveCenter(req, svc, user.id);
    if (!centerId) return NextResponse.json({ error: '센터가 설정되지 않았습니다.' }, { status: 400 });

    let mergedPhysical: PhysicalFunctions | undefined;
    if (body.physical !== undefined) {
      const { data: existing } = await svc
        .from('spokedu_pro_students').select('physical')
        .eq('id', id).eq('center_id', centerId).maybeSingle();
      if (!existing) return NextResponse.json({ error: 'Student not found' }, { status: 404 });
      mergedPhysical = { ...(existing.physical as PhysicalFunctions), ...body.physical } as PhysicalFunctions;
    }

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.name !== undefined) updates.name = body.name;
    if (body.classGroup !== undefined) updates.class_group = body.classGroup;
    if (mergedPhysical !== undefined) updates.physical = mergedPhysical;
    if (body.note !== undefined) updates.note = body.note;

    const { data, error } = await svc
      .from('spokedu_pro_students').update(updates)
      .eq('id', id).eq('center_id', centerId)
      .select('id, name, class_group, physical, enrolled_at, note, created_at, updated_at')
      .single();

    if (error) {
      if (error.code === 'PGRST116') return NextResponse.json({ error: 'Student not found' }, { status: 404 });
      throw error;
    }
    return NextResponse.json({ ok: true, student: dbToStudent(data as DbStudentRow) });
  } catch (err) {
    console.error('[students PATCH]', err);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const serverSupabase = await createServerSupabaseClient();
    const { data: { user } } = await serverSupabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const svc = getServiceSupabase();

    if (!DB_READY) {
      const students = await loadStudentsFromContent(svc, user.id);
      const next = students.filter((s) => s.id !== id);
      if (next.length === students.length) return NextResponse.json({ error: 'Student not found' }, { status: 404 });
      await saveStudentsToContent(svc, user.id, next);
      return NextResponse.json({ ok: true });
    }

    const centerId = await resolveCenter(req, svc, user.id);
    if (!centerId) return NextResponse.json({ error: '센터가 설정되지 않았습니다.' }, { status: 400 });

    const { error, count } = await svc
      .from('spokedu_pro_students').delete({ count: 'exact' })
      .eq('id', id).eq('center_id', centerId);

    if (error) throw error;
    if ((count ?? 0) === 0) return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[students DELETE]', err);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
