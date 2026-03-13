/**
 * /api/spokedu-pro/students
 * GET  — 현재 사용자의 학생 목록 조회
 * POST — 학생 추가 (플랜 한도 체크: free≤10, basic≤50, pro=무제한)
 *
 * 저장소: spokedu_pro_tenant_content (key='students', owner_id=auth.uid())
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/app/lib/supabase/server';
import { getServiceSupabase } from '@/app/lib/server/adminAuth';
import { getPlanForUser, PLAN_LIMITS } from '@/app/lib/spokedu-pro/planUtils';

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

export async function GET() {
  const serverSupabase = await createServerSupabaseClient();
  const { data: { user } } = await serverSupabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const serviceSupabase = getServiceSupabase();
  const students = await loadStudents(serviceSupabase, user.id);

  return NextResponse.json({ ok: true, students });
}

export async function POST(req: NextRequest) {
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

  const serviceSupabase = getServiceSupabase();
  const students = await loadStudents(serviceSupabase, user.id);

  // ── 플랜 한도 체크 ──────────────────────────────────────────────────
  const plan = await getPlanForUser(user.id);
  const limit = PLAN_LIMITS[plan].students;
  if (students.length >= limit) {
    return NextResponse.json(
      {
        error: 'student_limit_exceeded',
        plan,
        limit,
        current: students.length,
        message: `${plan === 'free' ? 'Free 플랜은 최대 10명' : 'Basic 플랜은 최대 50명'}까지 등록할 수 있습니다. 업그레이드하세요.`,
      },
      { status: 403 }
    );
  }

  const now = new Date().toISOString();
  const newStudent: StoredStudent = {
    id: crypto.randomUUID(),
    name,
    classGroup: body.classGroup ?? '미분류',
    physical: { ...DEFAULT_PHYSICAL, ...(body.physical ?? {}) } as PhysicalFunctions,
    enrolledAt: now.slice(0, 10),
    note: body.note,
    createdAt: now,
    updatedAt: now,
  };

  await saveStudents(serviceSupabase, user.id, [...students, newStudent]);

  return NextResponse.json({ ok: true, student: newStudent }, { status: 201 });
}
