import { NextResponse } from 'next/server';

// 토스페이먼츠는 Stripe Billing Portal에 해당하는 기능이 없습니다.
// 해지 예약은 앱 내 /spokedu-master/subscription, 결제수단·환불은 고객센터.
export async function POST() {
  return NextResponse.json(
    {
      error: '결제 포털은 제공하지 않습니다. 구독 해지는 앱의 구독 관리에서, 그 외 문의는 고객센터로 진행해 주세요.',
      cancelPath: '/spokedu-master/subscription',
      support: true,
    },
    { status: 410 },
  );
}
