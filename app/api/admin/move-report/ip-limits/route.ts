import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase, requireAdmin } from '@/app/lib/server/adminAuth';

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const supabase = getServiceSupabase();
    const { count: total, error: e1 } = await supabase.from('move_report_ip_limits').select('*', { count: 'exact', head: true });
    if (e1) {
      return NextResponse.json({ ok: false, error: e1.message }, { status: 500 });
    }
    const { count: atLimit, error: e2 } = await supabase
      .from('move_report_ip_limits')
      .select('*', { count: 'exact', head: true })
      .gte('count', 3);
    if (e2) {
      return NextResponse.json({ ok: false, error: e2.message }, { status: 500 });
    }

    const { data: rows, error: e3 } = await supabase
      .from('move_report_ip_limits')
      .select('ip, count, updated_at')
      .order('count', { ascending: false })
      .order('updated_at', { ascending: false })
      .limit(300);

    if (e3) {
      console.error('[admin/move-report/ip-limits] list', e3);
      return NextResponse.json({ ok: false, error: e3.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      totalIps: total ?? 0,
      ipsAtLimit: atLimit ?? 0,
      rows: (rows ?? []) as { ip: string; count: number; updated_at: string }[],
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Internal Server Error';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

/** 테스트·운영 정리: 모든 IP 완료 카운트 행 삭제 */
export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const body = (await req.json().catch(() => ({}))) as { clearAll?: unknown };
    if (body.clearAll !== true) {
      return NextResponse.json({ ok: false, error: '지원하지 않는 요청입니다.' }, { status: 400 });
    }

    const supabase = getServiceSupabase();
    const { error, count } = await supabase
      .from('move_report_ip_limits')
      .delete({ count: 'exact' })
      .gte('count', 0);

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, deleted: count ?? 0 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Internal Server Error';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const body = (await req.json().catch(() => ({}))) as { ip?: unknown };
    const ip = typeof body.ip === 'string' ? body.ip.trim() : '';
    if (!ip) {
      return NextResponse.json({ ok: false, error: 'IP 주소가 필요합니다.' }, { status: 400 });
    }

    const supabase = getServiceSupabase();
    const { error, count } = await supabase.from('move_report_ip_limits').delete({ count: 'exact' }).eq('ip', ip);
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
    if (!count) {
      return NextResponse.json({ ok: false, error: '해당 IP 기록을 찾지 못했습니다.' }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Internal Server Error';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
