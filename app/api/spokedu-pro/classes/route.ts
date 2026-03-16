/**
 * /api/spokedu-pro/classes
 * GET  — 현재 사용자의 반 목록 조회
 * POST — 반 추가 (플랜별 max_classes 한도 체크)
 *
 * 저장소: spokedu_pro_tenant_content (key='classes', owner_id=auth.uid())
 * 데이터 구조: { classes: ClassGroup[] }
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/app/lib/supabase/server';
import { getServiceSupabase } from '@/app/lib/server/adminAuth';
import { getPlanForUser, PLAN_LIMITS } from '@/app/lib/spokedu-pro/planUtils';

const CONTENT_KEY = 'classes';

export type ClassGroup = {
  id: string;
  name: string;
  createdAt: string;
};

async function loadClasses(
  serviceSupabase: ReturnType<typeof getServiceSupabase>,
  userId: string
): Promise<ClassGroup[]> {
  const { data } = await serviceSupabase
    .from('spokedu_pro_tenant_content')
    .select('draft_value')
    .eq('owner_id', userId)
    .eq('key', CONTENT_KEY)
    .maybeSingle();
  if (!data) return [];
  const val = data.draft_value as { classes?: ClassGroup[] };
  return val?.classes ?? [];
}

async function saveClasses(
  serviceSupabase: ReturnType<typeof getServiceSupabase>,
  userId: string,
  classes: ClassGroup[]
): Promise<void> {
  await serviceSupabase
    .from('spokedu_pro_tenant_content')
    .upsert(
      {
        owner_id: userId,
        key: CONTENT_KEY,
        draft_value: { classes },
        published_value: { classes },
        draft_updated_at: new Date().toISOString(),
        published_at: new Date().toISOString(),
      },
      { onConflict: 'owner_id,key' }
    );
}

export async function GET() {
  const serverSupabase = await createServerSupabaseClient();
  const { data: { user } } = await serverSupabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const serviceSupabase = getServiceSupabase();
  const classes = await loadClasses(serviceSupabase, user.id);

  return NextResponse.json({ ok: true, classes });
}

export async function POST(req: NextRequest) {
  const serverSupabase = await createServerSupabaseClient();
  const { data: { user } } = await serverSupabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { name?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const name = body.name?.trim();
  if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 });

  const serviceSupabase = getServiceSupabase();
  const [classes, plan] = await Promise.all([
    loadClasses(serviceSupabase, user.id),
    getPlanForUser(user.id),
  ]);

  // 중복 이름 체크
  if (classes.some((c) => c.name === name)) {
    return NextResponse.json({ error: 'duplicate_name', message: '이미 같은 이름의 반이 있습니다.' }, { status: 409 });
  }

  // 플랜 한도 체크
  const maxClasses = PLAN_LIMITS[plan].maxClasses;
  if (maxClasses !== null && classes.length >= maxClasses) {
    return NextResponse.json(
      {
        error: 'class_limit_exceeded',
        plan,
        limit: maxClasses,
        current: classes.length,
        message:
          plan === 'free'
            ? 'Free 플랜은 반 1개까지 만들 수 있습니다. Basic으로 업그레이드하면 반 3개까지 관리할 수 있어요.'
            : 'Basic 플랜은 반 3개까지 만들 수 있습니다. Pro로 업그레이드하면 반 무제한으로 관리할 수 있어요.',
      },
      { status: 403 }
    );
  }

  const now = new Date().toISOString();
  const newClass: ClassGroup = {
    id: crypto.randomUUID(),
    name,
    createdAt: now,
  };

  await saveClasses(serviceSupabase, user.id, [...classes, newClass]);

  return NextResponse.json({ ok: true, class: newClass }, { status: 201 });
}
