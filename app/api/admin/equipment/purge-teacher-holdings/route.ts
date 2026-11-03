import { NextResponse } from 'next/server';
import { getServiceSupabase, requireAdmin } from '@/app/lib/server/adminAuth';
import { purgeTeacherHoldings } from '@/app/lib/equipment/purgeTeacherHoldings';

const CONFIRM_PHRASE = 'PURGE_TEACHER_HOLDINGS';

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  let body: { confirm?: string };
  try {
    body = (await request.json()) as { confirm?: string };
  } catch {
    return NextResponse.json({ error: 'JSON 본문이 필요합니다.' }, { status: 400 });
  }

  if (body.confirm !== CONFIRM_PHRASE) {
    return NextResponse.json(
      { error: `confirm 필드에 "${CONFIRM_PHRASE}" 를 보내야 합니다.` },
      { status: 400 },
    );
  }

  try {
    const service = getServiceSupabase();
    const deleted = await purgeTeacherHoldings(service);
    return NextResponse.json({ ok: true, deleted });
  } catch (e) {
    const message = e instanceof Error ? e.message : '강사 보유 데이터 삭제 실패';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
