import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase, requireAdmin } from '@/app/lib/server/adminAuth';
import { isValidCoachSlugFormat, normalizeCoachSlugInput } from '@/app/move-report/lib/coachSlug';

/**
 * 관리자 전용: 코치 전용 링크 활성/비활성 전환 (남용·오해 소지 시 차단)
 */
export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const body = (await req.json().catch(() => null)) as
      | { slug?: unknown; active?: unknown; reason?: unknown }
      | null;

    const slug = normalizeCoachSlugInput(typeof body?.slug === 'string' ? body.slug : '');
    const active = body?.active === true;
    const reason =
      typeof body?.reason === 'string' && body.reason.trim() ? body.reason.trim().slice(0, 500) : '관리자 비활성화';

    if (!isValidCoachSlugFormat(slug)) {
      return NextResponse.json({ ok: false, error: '유효한 링크 주소(slug)가 필요합니다.' }, { status: 400 });
    }

    const supabase = getServiceSupabase();
    const updates = active
      ? {
          is_active: true,
          disabled_at: null as string | null,
          disabled_reason: null as string | null,
        }
      : {
          is_active: false,
          disabled_at: new Date().toISOString(),
          disabled_reason: reason,
        };

    const { data, error } = await supabase.from('move_report_coach_links').update(updates).eq('slug', slug).select('slug');

    if (error) {
      console.error('[admin/move-report/coach-link-status]', error);
      return NextResponse.json({ ok: false, error: '상태 변경 중 오류가 발생했어요.' }, { status: 500 });
    }
    if (!data?.length) {
      return NextResponse.json({ ok: false, error: '해당 링크를 찾을 수 없어요.' }, { status: 404 });
    }

    return NextResponse.json({ ok: true, slug, active });
  } catch (e) {
    console.error('[admin/move-report/coach-link-status] unexpected', e);
    return NextResponse.json({ ok: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
