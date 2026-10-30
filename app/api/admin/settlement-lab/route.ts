import { NextResponse } from 'next/server';
import { GET as readSettlement } from '../settlement-sheet/route';
import { getServiceSupabase, requireAdmin } from '@/app/lib/server/adminAuth';
import { MASTER_EMAIL } from '@/app/lib/constants/admin';

/** A read-only namespace. Mutations are never forwarded to the stable API. */
export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  if (auth.email?.toLowerCase() !== MASTER_EMAIL) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (new URL(request.url).searchParams.get('scope') === 'context') {
    const result = await getServiceSupabase().from('centers').select('id,name,session_fee,main_teacher_id,main_teacher_2_id,main_teacher_3_id').order('name');
    if (result.error) return NextResponse.json({ error: '센터 원본 조회 실패' }, { status: 500 });
    return NextResponse.json({ centers: result.data ?? [] }, { headers: { 'Cache-Control': 'private, no-store' } });
  }
  return readSettlement(request);
}

const rejectWrite = () => NextResponse.json({ error: 'LAB 서버는 읽기 전용입니다. 테스트 저장은 탭 내부 격리 복사본에서만 가능합니다.', code: 'LAB_READ_ONLY' }, {
  status: 405, headers: { Allow: 'GET', 'Cache-Control': 'private, no-store' },
});
export const PUT = rejectWrite;
export const POST = rejectWrite;
export const PATCH = rejectWrite;
export const DELETE = rejectWrite;
