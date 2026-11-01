import { NextResponse } from 'next/server';
import { GET as readSettlement } from '../settlement-sheet/route';
import { requireAdmin } from '@/app/lib/server/adminAuth';
import { MASTER_EMAIL } from '@/app/lib/constants/admin';

/** A read-only namespace. Mutations are never forwarded to the stable API. */
export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  if (auth.email?.toLowerCase() !== MASTER_EMAIL) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  return readSettlement(request);
}

const rejectWrite = () => NextResponse.json({ error: 'LAB 서버는 읽기 전용입니다. 테스트 저장은 탭 내부 격리 복사본에서만 가능합니다.', code: 'LAB_READ_ONLY' }, {
  status: 405, headers: { Allow: 'GET', 'Cache-Control': 'private, no-store' },
});
export const PUT = rejectWrite;
export const POST = rejectWrite;
export const PATCH = rejectWrite;
export const DELETE = rejectWrite;
