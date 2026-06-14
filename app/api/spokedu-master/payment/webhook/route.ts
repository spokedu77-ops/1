import { NextResponse } from 'next/server';

// 결제 활성화는 confirm route에서만 처리합니다.
// 실제 구현 전에는 이 URL을 Toss 관리자 콘솔에 등록하지 않으며 501을 반환합니다.
// 향후 서명 검증, event allowlist, idempotency, 취소·환불 반영이 필요합니다.
export async function POST() {
  return NextResponse.json(
    {
      error: 'Webhook is not configured',
      code: 'WEBHOOK_NOT_CONFIGURED',
    },
    { status: 501 },
  );
}
