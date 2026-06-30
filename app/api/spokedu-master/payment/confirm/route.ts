import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    { error: '단건 결제 confirm 경로는 더 이상 사용하지 않습니다. 월 자동결제 등록 API를 사용해 주세요.' },
    { status: 410 },
  );
}
