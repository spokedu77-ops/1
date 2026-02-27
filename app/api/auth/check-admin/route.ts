/**
 * 관리자 권한 확인 엔드포인트
 * admin/layout.tsx 에서 호출 — 세션이 있고 관리자이면 { admin: true } 반환
 */
import { NextResponse } from 'next/server';
import { requireAdmin } from '@/app/lib/server/adminAuth';

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) {
    const status = auth.response.status;
    return NextResponse.json(
      { admin: false, reason: status === 401 ? 'no-session' : 'forbidden' },
      { status: 200 } // layout은 항상 JSON을 파싱하므로 200으로 반환
    );
  }
  return NextResponse.json({ admin: true });
}
