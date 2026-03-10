/**
 * /api/spokedu-pro/students
 * GET  — 학생 목록 조회
 * POST — 학생 추가
 *
 * DB_READY=false: spokedu_pro_tenant_content(key='students') JSON 저장 (하위 호환)
 * DB_READY=true:  spokedu_pro_students 실제 테이블 사용 (center_id 기반)
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/app/lib/supabase/server';
import { getServiceSupabase } from '@/app/lib/server/adminAuth';
import { getActiveCenterIdFromCookie } from '@/app/lib/server/spokeduProContext';

const DB_READY = process.env.SPOKEDU_PRO_DB_READY === 'true';
const CONTENT_KEY = 'students';

export type PhysicalLevel = 1 | 2 | 3;
export type PhysicalFunctions = {
  coordination: PhysicalLevel;
  agility: PhysicalLevel;
  endurance: PhysicalLevel;
  balance: PhysicalLevel;
  strength: PhysicalLevel;
};

export type StoredStudent = {
  id: string;
  name: string;
  classGroup: string;
  physical: PhysicalFunctions;
  enrolledAt: string;
  note?: string;
  createdAt: string;
  updatedAt: string;
};

const DEFAULT_PHYSICAL: PhysicalFunctions = {
  coordination: 2,
  agility: 2,
  endurance: 2,
  balance: 2,
  strength: 2,
};

// ── tenant_content helpers (DB_READY=false) ───────────────────────────────────

type SvcClient = ReturnType<typeof getServiceSupabase>;

async function loadStudentsFromContent(svc: SvcClient, userId: string): Promise<StoredStudent[]> {
  const { data } = await svc
    .from('spokedu_pro_tenant_content')
    .select('draft_value')
    .eq('owner_id', userId)
    .eq('key', CONTENT_KEY)
    .maybeSingle();
  if (!data) return [];
  const val = data.draft_value as { students?: StoredStudent[] };
  return val?.students ?? [];
}

async function saveStudentsToContent(svc: SvcClient, userId: string, students: StoredStudent[]): Promise<void> {
  await svc
    .from('spokedu_pro_tenant_content')
    .upsert(
      { owner_id: userId, key: CONTENT_KEY, draft_value: { students }, draft_updated_at: new Date().toISOString() },
      { onConflict: 'owner_id,key' }
    );
}

// ── DB helpers (DB_READY=true) ────────────────────────────────────────────────

type DbStudentRow = {
  id: string;
  name: string;
  class_group: string;
  physical: PhysicalFunctions;
  enrolled_at: string;
  note: string | null;
  created_at: string;
  updated_at: string;
};

function dbToStudent(row: DbStudentRow): StoredStudent {
  return {
    id: row.id,
    name: row.name,
    classGroup: row.class_group ?? '',
    physical: (row.physical as PhysicalFunctions) ?? DEFAULT_PHYSICAL,
    enrolledAt: row.enrolled_at,
    note: row.note ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** 쿠키 또는 owner 조회로 활성 센터 ID를 반환. */
async function resolveCenter(req: NextRequest, svc: SvcClient, userId: string): Promise<string | null> {
  const fromCookie = getActiveCenterIdFromCookie(req);
  if (fromCookie) return fromCookie;

  const { data } = await svc
    .from('spokedu_pro_centers')
    .select('id')
    .eq('owner_id', userId)
    .maybeSingle();
  if (data?.id) return data.id;

  const { data: member } = await svc
    .from('spokedu_pro_center_members')
    .select('center_id')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle();
  return member?.center_id ?? null;
}

// ── GET ───────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const serverSupabase = await createServerSupabaseClient();
    const { data: { user } } = await serverSupabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const svc = getServiceSupabase();

    if (!DB_READY) {
      const students = await loadStudentsFromContent(svc, user.id);
      return NextResponse.json({ ok: true, students });
    }

    const centerId = await resolveCenter(req, svc, user.id);
    if (!centerId) {
      // 센터 미설정: 빈 목록 반환 (bootstrap 필요)
      return NextResponse.json({ ok: true, students: [] });
    }

    const { data, error } = await svc
      .from('spokedu_pro_students')
      .select('id, name, class_group, physical, enrolled_at, note, created_at, updated_at')
      .eq('center_id', centerId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return NextResponse.json({ ok: true, students: (data ?? []).map(dbToStudent) });
  } catch (err) {
    console.error('[students GET]', err);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

// ── POST ──────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const serverSupabase = await createServerSupabaseClient();
    const { data: { user } } = await serverSupabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let body: { name?: string; classGroup?: string; physical?: Partial<PhysicalFunctions>; note?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const name = body.name?.trim();
    if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 });
    if (name.length > 100) return NextResponse.json({ error: '이름은 100자 이하여야 합니다.' }, { status: 400 });

    const classGroup = body.classGroup ?? '미분류';
    if (classGroup.length > 50) return NextResponse.json({ error: '반 이름은 50자 이하여야 합니다.' }, { status: 400 });

    const physical: PhysicalFunctions = { ...DEFAULT_PHYSICAL, ...(body.physical ?? {}) } as PhysicalFunctions;
    const svc = getServiceSupabase();

    if (!DB_READY) {
      const students = await loadStudentsFromContent(svc, user.id);
      const now = new Date().toISOString();
      const newStudent: StoredStudent = {
        id: crypto.randomUUID(),
        name,
        classGroup,
        physical,
        enrolledAt: now.slice(0, 10),
        note: body.note,
        createdAt: now,
        updatedAt: now,
      };
      await saveStudentsToContent(svc, user.id, [...students, newStudent]);
      return NextResponse.json({ ok: true, student: newStudent }, { status: 201 });
    }

    // DB 경로
    const centerId = await resolveCenter(req, svc, user.id);
    if (!centerId) {
      return NextResponse.json({ error: '센터가 설정되지 않았습니다. 센터를 먼저 생성해주세요.' }, { status: 400 });
    }

    const today = new Date().toISOString().slice(0, 10);
    const { data, error } = await svc
      .from('spokedu_pro_students')
      .insert({
        center_id: centerId,
        name,
        class_group: classGroup,
        physical,
        enrolled_at: today,
        note: body.note ?? null,
      })
      .select('id, name, class_group, physical, enrolled_at, note, created_at, updated_at')
      .single();

    if (error) throw error;

    return NextResponse.json({ ok: true, student: dbToStudent(data as DbStudentRow) }, { status: 201 });
  } catch (err) {
    console.error('[students POST]', err);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
