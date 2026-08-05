import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase, requireAdmin } from '@/app/lib/server/adminAuth';

/** Dispatch canonical lead — source_lead_id로 원본 조회 */
export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const id = req.nextUrl.searchParams.get('id')?.trim() ?? '';
    if (!id) {
      return NextResponse.json({ ok: false, error: 'id가 필요합니다.' }, { status: 400 });
    }

    const supabase = getServiceSupabase();
    const { data, error } = await supabase.from('dispatch_leads').select('*').eq('id', id).maybeSingle();
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ ok: false, error: 'dispatch lead를 찾을 수 없습니다.' }, { status: 404 });
    }

    return NextResponse.json({ ok: true, lead: data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Internal Server Error';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
