import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/app/lib/server/adminAuth';
import { getGymBypassKeyValue } from '@/app/lib/server/moveReportGymKey';

/** 관리자 전용: DB에 저장된 체육관·단체용 bypass URL */
export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const key = await getGymBypassKeyValue();
    if (!key) {
      return NextResponse.json({ ok: true, configured: false, url: null as string | null });
    }
    const origin = req.nextUrl.origin;
    const url = `${origin}/move-report?key=${encodeURIComponent(key)}`;
    return NextResponse.json({ ok: true, configured: true, url });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Internal Server Error';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
