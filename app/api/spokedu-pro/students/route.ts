/**
 * /api/spokedu-pro/students
 * GET  — 현재 센터의 원생 목록 (spokedu_pro_students 테이블)
 * POST — 원생 추가 (플랜 한도 체크 포함)
 *
 * DB_READY=false: 레거시 JSON blob fallback (spokedu_pro_tenant_content)
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/app/lib/supabase/server';
import { getServiceSupabase } from '@/app/lib/server/adminAuth';
import { getActiveCenterIdFromCookie, getCenterMemberRole, type SupabaseClientForMemberRole } from '@/app/lib/server/spokeduProContext';

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
  birthdate?: string | null;
  phone?: string | null;
  parentPhone?: string | null;
  classGroup: string;
  physical: PhysicalFunctions;
  enrolledAt: string;
  note?: string;
  status: 'active' | 'inactive';
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

const PLAN_LIMITS: Record<string, number> = {
  free: 10,
  basic: 50,
  pro: Infinity,
};

// ─── Legacy blob helpers ──────────────────────────────────────────────────────

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

// ─── GET /api/spokedu-pro/students ───────────────────────────────────────────

export async function GET(request: NextRequest) {
  const serverSupabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await serverSupabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const svc = getServiceSupabase();
  const DB_READY = process.env.SPOKEDU_PRO_DB_READY === 'true';

  if (!DB_READY) {
    const students = await legacyLoad(svc, user.id);
    return NextResponse.json({ ok: true, students });
  }

  // DB mode: resolve center
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
  if (!centerId) return NextResponse.json({ ok: true, students: [] });

  const role = await getCenterMemberRole(svc as unknown as SupabaseClientForMemberRole, centerId, user.id);
  if (!role) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { data, error } = await svc
    .from('spokedu_pro_students')
    .select('*')
    .eq('center_id', centerId)
    .eq('status', 'active')
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const students: StoredStudent[] = (data ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    birthdate: r.birthdate ?? null,
    phone: r.phone ?? null,
    parentPhone: r.parent_phone ?? null,
    classGroup: (r.physical_scores as Record<string, string> | null)?.classGroup ?? '미분류',
    physical: {
      coordination: (r.physical_scores as Record<string, number> | null)?.coordination ?? 2,
      agility: (r.physical_scores as Record<string, number> | null)?.agility ?? 2,
      endurance: (r.physical_scores as Record<string, number> | null)?.endurance ?? 2,
      balance: (r.physical_scores as Record<string, number> | null)?.balance ?? 2,
      strength: (r.physical_scores as Record<string, number> | null)?.strength ?? 2,
    } as PhysicalFunctions,
    enrolledAt: r.created_at?.slice(0, 10) ?? '',
    note: undefined,
    status: r.status as 'active' | 'inactive',
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));

  return NextResponse.json({ ok: true, students });
}

// ─── POST /api/spokedu-pro/students ──────────────────────────────────────────

export async function POST(request: NextRequest) {
  const serverSupabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await serverSupabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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

  const name = body.name?.trim();
  if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 });

  const svc = getServiceSupabase();
  const DB_READY = process.env.SPOKEDU_PRO_DB_READY === 'true';

  if (!DB_READY) {
    // Legacy blob path
    const students = await legacyLoad(svc, user.id);
    const now = new Date().toISOString();
    const newStudent: StoredStudent = {
      id: crypto.randomUUID(),
      name,
      classGroup: body.classGroup ?? '미분류',
      physical: { ...DEFAULT_PHYSICAL, ...(body.physical ?? {}) } as PhysicalFunctions,
      enrolledAt: now.slice(0, 10),
      note: body.note,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    };
    await legacySave(svc, user.id, [...students, newStudent]);
    return NextResponse.json({ ok: true, student: newStudent }, { status: 201 });
  }

  // DB mode: resolve center
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

  // Plan limit check
  const { data: sub } = await svc
    .from('spokedu_pro_subscriptions')
    .select('plan, status')
    .eq('center_id', centerId)
    .maybeSingle();

  const plan = sub?.plan ?? 'free';
  const isActive = !sub || sub.status === 'active' || sub.status === 'trialing';
  const limit = isActive ? (PLAN_LIMITS[plan] ?? 10) : PLAN_LIMITS['free'];

  const { count } = await svc
    .from('spokedu_pro_students')
    .select('id', { count: 'exact', head: true })
    .eq('center_id', centerId)
    .eq('status', 'active');

  if ((count ?? 0) >= limit) {
    return NextResponse.json({ error: 'plan_limit_reached', limit, plan }, { status: 403 });
  }

  const physicalScores = {
    classGroup: body.classGroup ?? '미분류',
    ...DEFAULT_PHYSICAL,
    ...(body.physical ?? {}),
  };

  const { data: inserted, error } = await svc
    .from('spokedu_pro_students')
    .insert({
      center_id: centerId,
      name,
      birthdate: body.birthdate ?? null,
      phone: body.phone ?? null,
      parent_phone: body.parentPhone ?? null,
      physical_scores: physicalScores,
      status: 'active',
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const newStudent: StoredStudent = {
    id: inserted.id,
    name: inserted.name,
    birthdate: inserted.birthdate ?? null,
    phone: inserted.phone ?? null,
    parentPhone: inserted.parent_phone ?? null,
    classGroup: physicalScores.classGroup,
    physical: {
      coordination: physicalScores.coordination,
      agility: physicalScores.agility,
      endurance: physicalScores.endurance,
      balance: physicalScores.balance,
      strength: physicalScores.strength,
    } as PhysicalFunctions,
    enrolledAt: inserted.created_at?.slice(0, 10) ?? '',
    status: 'active',
    createdAt: inserted.created_at,
    updatedAt: inserted.updated_at,
  };

  return NextResponse.json({ ok: true, student: newStudent }, { status: 201 });
}
