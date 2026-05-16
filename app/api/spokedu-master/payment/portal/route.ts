import { NextResponse } from 'next/server';

// 토스페이먼츠는 Stripe Billing Portal에 해당하는 기능이 없습니다.
// 구독 취소/결제수단 변경은 이메일 고객센터로 처리합니다.
export async function POST() {
  return NextResponse.json({ error: '이메일 고객센터를 이용해주세요.' }, { status: 410 });
}
