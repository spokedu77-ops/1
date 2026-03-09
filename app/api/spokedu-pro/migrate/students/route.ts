/**
 * POST /api/spokedu-pro/migrate/students
 * 일회성 마이그레이션: JSON blob → spokedu_pro_students + spokedu_pro_attendance 테이블.
 * 로그인한 사용자의 활성 센터에 대해 실행.
 * 중복 실행 안전: 이미 DB에 있는 원생은 건너뜀.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/app/lib/supabase/server';
import { getServiceSupabase } from '@/app/lib/server/adminAuth';
import { getActiveCenterIdFromCookie, getCenterMemberRole, type SupabaseClientForMemberRole } from '@/app/lib/server/spokeduProContext';
import type { StoredStudent } from '../../students/route';

type BlobStudent = StoredStudent & { id: string };

export async function POST(request: NextRequest) {
  const serverSupabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await serverSupabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const svc = getServiceSupabase();

  // Resolve center
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
  if (!centerId) return NextResponse.json({ error: 'No active center found' }, { status: 404 });

  const role = await getCenterMemberRole(svc as unknown as SupabaseClientForMemberRole, centerId, user.id);
  if (role !== 'owner') return NextResponse.json({ error: 'Owner only' }, { status: 403 });

  // Load blob students
  const { data: blobRow } = await svc
    .from('spokedu_pro_tenant_content')
    .select('draft_value')
    .eq('owner_id', user.id)
    .eq('key', 'students')
    .maybeSingle();

  const blobStudents: BlobStudent[] =
    (blobRow?.draft_value as { students?: BlobStudent[] } | null)?.students ?? [];

  if (blobStudents.length === 0) {
    return NextResponse.json({ ok: true, migrated: 0, skipped: 0, message: 'Nothing to migrate' });
  }

  // Existing student names to skip duplicates
  const { data: existingRows } = await svc
    .from('spokedu_pro_students')
    .select('name')
    .eq('center_id', centerId);
  const existingNames = new Set((existingRows ?? []).map((r) => (r.name as string).trim()));

  let migrated = 0;
  let skipped = 0;

  for (const s of blobStudents) {
    if (existingNames.has(s.name.trim())) {
      skipped++;
      continue;
    }

    const physicalScores = {
      classGroup: s.classGroup ?? '미분류',
      ...(s.physical ?? {}),
    };

    const { data: inserted, error: insertErr } = await svc
      .from('spokedu_pro_students')
      .insert({
        center_id: centerId,
        name: s.name.trim(),
        birthdate: null,
        phone: null,
        parent_phone: null,
        physical_scores: physicalScores,
        status: 'active',
        created_at: s.createdAt ?? new Date().toISOString(),
        updated_at: s.updatedAt ?? new Date().toISOString(),
      })
      .select('id')
      .single();

    if (insertErr || !inserted) {
      console.error('[migrate/students] insert error', insertErr);
      continue;
    }

    migrated++;
  }

  // Migrate attendance blobs: attendance_YYYY-MM-DD
  const { data: allBlobRows } = await svc
    .from('spokedu_pro_tenant_content')
    .select('key, draft_value')
    .eq('owner_id', user.id)
    .like('key', 'attendance_%');

  // Build name→newId map for attendance migration
  const { data: newStudentRows } = await svc
    .from('spokedu_pro_students')
    .select('id, name')
    .eq('center_id', centerId);

  const nameToId: Record<string, string> = {};
  for (const row of newStudentRows ?? []) {
    nameToId[(row.name as string).trim()] = row.id as string;
  }

  // Also build old blob id → name map
  const oldIdToName: Record<string, string> = {};
  for (const s of blobStudents) {
    oldIdToName[s.id] = s.name.trim();
  }

  let attendanceMigrated = 0;
  for (const blobRow of allBlobRows ?? []) {
    const dateMatch = (blobRow.key as string).match(/^attendance_(\d{4}-\d{2}-\d{2})$/);
    if (!dateMatch) continue;
    const date = dateMatch[1];
    const records = (blobRow.draft_value as { records?: Record<string, string> } | null)?.records ?? {};

    const upsertRows: Array<{
      center_id: string;
      student_id: string;
      date: string;
      status: string;
    }> = [];

    for (const [oldStudentId, status] of Object.entries(records)) {
      const studentName = oldIdToName[oldStudentId];
      if (!studentName) continue;
      const newStudentId = nameToId[studentName];
      if (!newStudentId) continue;
      upsertRows.push({ center_id: centerId, student_id: newStudentId, date, status });
    }

    if (upsertRows.length > 0) {
      await svc
        .from('spokedu_pro_attendance')
        .upsert(upsertRows, { onConflict: 'student_id,date' });
      attendanceMigrated += upsertRows.length;
    }
  }

  return NextResponse.json({
    ok: true,
    migrated,
    skipped,
    attendanceMigrated,
    message: `원생 ${migrated}명 마이그레이션 완료 (${skipped}명 건너뜀), 출석 ${attendanceMigrated}건`,
  });
}
