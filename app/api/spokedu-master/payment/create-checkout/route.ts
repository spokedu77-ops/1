import { NextResponse } from 'next/server';
import { isSpokeduMasterPaidPlan } from '@/app/lib/server/spokeduMasterPayment';

export async function POST(request: Request) {
  let body: { plan?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: '요청 형식이 올바르지 않습니다.' }, { status: 400 });
  }

  if (body.plan === 'pro' || body.plan === 'team' || body.plan === 'center') {
    return NextResponse.json({ error: '구형 단건 결제 상품은 더 이상 직접 결제할 수 없습니다.' }, { status: 400 });
  }

  if (!isSpokeduMasterPaidPlan(body.plan)) {
    return NextResponse.json({ error: '직접 결제 가능한 상품이 아닙니다.' }, { status: 400 });
  }

  return NextResponse.json(
    { error: '월 자동결제 등록 API를 사용해 주세요.' },
    { status: 409 },
  );
}
