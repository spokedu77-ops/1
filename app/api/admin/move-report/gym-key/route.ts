import { type NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/app/lib/server/adminAuth';
import { regenerateGymBypassKey } from '@/app/lib/server/moveReportGymKey';

/** 관리자 전용: 체육관 bypass 키 재발급 (이전 링크 무효) */
export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const newKey = await regenerateGymBypassKey();
    const origin = req.nextUrl.origin;
    const url = `${origin}/move-report?key=${encodeURIComponent(newKey)}`;
    return NextResponse.json({ ok: true, url });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Internal Server Error';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
