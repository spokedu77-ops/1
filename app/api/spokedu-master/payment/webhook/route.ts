import { NextResponse } from 'next/server';

// 토스페이먼츠 웹훅 (Phase 2 구현 예정)
// 현재는 결제 확인을 /api/spokedu-master/payment/confirm 에서 동기 처리합니다.
export async function POST() {
  return NextResponse.json({ ok: true });
}
