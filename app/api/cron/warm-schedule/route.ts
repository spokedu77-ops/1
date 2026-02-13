/**
 * Vercel Cron 웜업 — 현재 주차 스케줄 API 호출로 콜드스타트 완화
 * vercel.json crons에서 5~15분마다 호출
 */
import { NextResponse } from 'next/server';
import { getCurrentWeekKey } from '@/app/lib/admin/scheduler/getCurrentWeekKey';

export const dynamic = 'force-dynamic';
export const maxDuration = 10;

export async function GET(request: Request) {
  // Vercel Cron은 Authorization: Bearer <CRON_SECRET> 전달. 선택적 검증
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const weekKey = getCurrentWeekKey();
  const base =
    process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  try {
    const res = await fetch(`${base}/api/schedule/${encodeURIComponent(weekKey)}`, {
      next: { revalidate: 0 },
    });
    const ok = res.ok;
    return NextResponse.json({
      ok,
      weekKey,
      status: res.status,
      warmed: ok ? 'schedule-api' : 'schedule-api-error',
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, weekKey, error: err instanceof Error ? err.message : 'fetch failed' },
      { status: 500 }
    );
  }
}
