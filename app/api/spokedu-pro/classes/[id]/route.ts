/**
 * /api/spokedu-pro/classes/[id]
 * PATCH  — 반 이름 변경
 * DELETE — 반 삭제 (해당 반 학생의 classGroup은 '미분류'로 변경됨)
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/app/lib/supabase/server';
import { getServiceSupabase } from '@/app/lib/server/adminAuth';
import type { ClassGroup } from '../route';

const CLASSES_KEY = 'classes';
const STUDENTS_KEY = 'students';

type StoredStudent = {
  id: string;
  name: string;
  classGroup: string;
  [key: string]: unknown;
};

async function loadClasses(
  supabase: ReturnType<typeof getServiceSupabase>,
  userId: string
): Promise<ClassGroup[]> {
  const { data } = await supabase
    .from('spokedu_pro_tenant_content')
    .select('draft_value')
    .eq('owner_id', userId)
    .eq('key', CLASSES_KEY)
    .maybeSingle();
  return ((data?.draft_value as { classes?: ClassGroup[] })?.classes) ?? [];
}

async function saveClasses(
  supabase: ReturnType<typeof getServiceSupabase>,
  userId: string,
  classes: ClassGroup[]
): Promise<void> {
  await supabase
    .from('spokedu_pro_tenant_content')
    .upsert(
      {
        owner_id: userId,
        key: CLASSES_KEY,
        draft_value: { classes },
        published_value: { classes },
        draft_updated_at: new Date().toISOString(),
        published_at: new Date().toISOString(),
      },
      { onConflict: 'owner_id,key' }
    );
}

async function loadStudents(
  supabase: ReturnType<typeof getServiceSupabase>,
  userId: string
): Promise<StoredStudent[]> {
  const { data } = await supabase
    .from('spokedu_pro_tenant_content')
    .select('draft_value')
    .eq('owner_id', userId)
    .eq('key', STUDENTS_KEY)
    .maybeSingle();
  return ((data?.draft_value as { students?: StoredStudent[] })?.students) ?? [];
}

async function saveStudents(
  supabase: ReturnType<typeof getServiceSupabase>,
  userId: string,
  students: StoredStudent[]
): Promise<void> {
  await supabase
    .from('spokedu_pro_tenant_content')
    .upsert(
      {
        owner_id: userId,
        key: STUDENTS_KEY,
        draft_value: { students },
        published_value: { students },
        draft_updated_at: new Date().toISOString(),
      },
      { onConflict: 'owner_id,key' }
    );
}

// PATCH /api/spokedu-pro/classes/[id] — 반 이름 변경
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const serverSupabase = await createServerSupabaseClient();
  const { data: { user } } = await serverSupabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  let body: { name?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const newName = body.name?.trim();
  if (!newName) return NextResponse.json({ error: 'name is required' }, { status: 400 });

  const supabase = getServiceSupabase();
  const classes = await loadClasses(supabase, user.id);

  const idx = classes.findIndex((c) => c.id === id);
  if (idx === -1) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  if (classes.some((c) => c.name === newName && c.id !== id)) {
    return NextResponse.json({ error: 'duplicate_name', message: '이미 같은 이름의 반이 있습니다.' }, { status: 409 });
  }

  const oldName = classes[idx].name;
  const updated = classes.map((c) => (c.id === id ? { ...c, name: newName } : c));

  // 학생의 classGroup도 함께 변경
  const students = await loadStudents(supabase, user.id);
  const updatedStudents = students.map((s) =>
    s.classGroup === oldName ? { ...s, classGroup: newName, updatedAt: new Date().toISOString() } : s
  );

  await Promise.all([
    saveClasses(supabase, user.id, updated),
    saveStudents(supabase, user.id, updatedStudents),
  ]);

  return NextResponse.json({ ok: true, class: updated[idx] });
}

// DELETE /api/spokedu-pro/classes/[id] — 반 삭제
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const serverSupabase = await createServerSupabaseClient();
  const { data: { user } } = await serverSupabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  const supabase = getServiceSupabase();
  const classes = await loadClasses(supabase, user.id);

  const target = classes.find((c) => c.id === id);
  if (!target) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const remaining = classes.filter((c) => c.id !== id);

  // 해당 반에 속한 학생 → '미분류'로 이동
  const students = await loadStudents(supabase, user.id);
  const updatedStudents = students.map((s) =>
    s.classGroup === target.name
      ? { ...s, classGroup: '미분류', updatedAt: new Date().toISOString() }
      : s
  );

  await Promise.all([
    saveClasses(supabase, user.id, remaining),
    saveStudents(supabase, user.id, updatedStudents),
  ]);

  return NextResponse.json({ ok: true });
}
