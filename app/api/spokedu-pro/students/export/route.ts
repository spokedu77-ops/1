/**
 * GET /api/spokedu-pro/students/export
 * CSV 다운로드 (basic+ 전용)
 * 쿼리: ?centerId=... (없으면 쿠키/owner 기반)
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/app/lib/supabase/server';
import { getServiceSupabase } from '@/app/lib/server/adminAuth';
import { getActiveCenterIdFromCookie, getCenterMemberRole, type SupabaseClientForMemberRole } from '@/app/lib/server/spokeduProContext';

function escapeCsv(val: string | null | undefined): string {
  if (val == null) return '';
  const s = String(val);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function levelLabel(n: number): string {
  if (n === 1) return '낮음';
  if (n === 3) return '높음';
  return '보통';
}

export async function GET(request: NextRequest) {
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
  if (!centerId) return NextResponse.json({ error: 'No center' }, { status: 404 });

  const role = await getCenterMemberRole(svc as unknown as SupabaseClientForMemberRole, centerId, user.id);
  if (!role) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  // Plan check: basic+만 허용
  const { data: sub } = await svc
    .from('spokedu_pro_subscriptions')
    .select('plan, status')
    .eq('center_id', centerId)
    .maybeSingle();

  const plan = sub?.plan ?? 'free';
  const isActive = !sub || sub.status === 'active' || sub.status === 'trialing';
  if (!isActive || plan === 'free') {
    return NextResponse.json({ error: 'basic_plan_required' }, { status: 403 });
  }

  // Load students
  const DB_READY = process.env.SPOKEDU_PRO_DB_READY === 'true';

  let rows: Array<{
    name: string;
    birthdate?: string | null;
    phone?: string | null;
    parentPhone?: string | null;
    classGroup: string;
    coordination: number;
    agility: number;
    endurance: number;
    balance: number;
    strength: number;
    enrolledAt: string;
  }> = [];

  if (DB_READY) {
    const { data, error } = await svc
      .from('spokedu_pro_students')
      .select('*')
      .eq('center_id', centerId)
      .eq('status', 'active')
      .order('created_at', { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    rows = (data ?? []).map((r) => {
      const scores = (r.physical_scores as Record<string, number | string> | null) ?? {};
      return {
        name: r.name as string,
        birthdate: (r.birthdate as string | null) ?? null,
        phone: (r.phone as string | null) ?? null,
        parentPhone: (r.parent_phone as string | null) ?? null,
        classGroup: (scores.classGroup as string | undefined) ?? '미분류',
        coordination: (scores.coordination as number | undefined) ?? 2,
        agility: (scores.agility as number | undefined) ?? 2,
        endurance: (scores.endurance as number | undefined) ?? 2,
        balance: (scores.balance as number | undefined) ?? 2,
        strength: (scores.strength as number | undefined) ?? 2,
        enrolledAt: (r.created_at as string)?.slice(0, 10) ?? '',
      };
    });
  } else {
    // Fallback: blob
    const { data: blobRow } = await svc
      .from('spokedu_pro_tenant_content')
      .select('draft_value')
      .eq('owner_id', user.id)
      .eq('key', 'students')
      .maybeSingle();
    type BlobStudent = {
      name: string;
      classGroup: string;
      physical: Record<string, number>;
      createdAt: string;
    };
    const students: BlobStudent[] =
      (blobRow?.draft_value as { students?: BlobStudent[] } | null)?.students ?? [];
    rows = students.map((s) => ({
      name: s.name,
      classGroup: s.classGroup ?? '미분류',
      coordination: s.physical?.coordination ?? 2,
      agility: s.physical?.agility ?? 2,
      endurance: s.physical?.endurance ?? 2,
      balance: s.physical?.balance ?? 2,
      strength: s.physical?.strength ?? 2,
      enrolledAt: s.createdAt?.slice(0, 10) ?? '',
    }));
  }

  // Build CSV
  const header = [
    '이름',
    '생년월일',
    '연락처',
    '보호자 연락처',
    '반',
    '조정력',
    '민첩성',
    '지구력',
    '균형감',
    '근력',
    '등록일',
  ].join(',');

  const bodyLines = rows.map((r) =>
    [
      escapeCsv(r.name),
      escapeCsv(r.birthdate),
      escapeCsv(r.phone),
      escapeCsv(r.parentPhone),
      escapeCsv(r.classGroup),
      levelLabel(r.coordination),
      levelLabel(r.agility),
      levelLabel(r.endurance),
      levelLabel(r.balance),
      levelLabel(r.strength),
      escapeCsv(r.enrolledAt),
    ].join(',')
  );

  const csv = '\uFEFF' + [header, ...bodyLines].join('\n'); // BOM for Excel

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="students_${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
