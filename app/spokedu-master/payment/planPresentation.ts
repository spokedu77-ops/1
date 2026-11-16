/** Approved payment-screen copy only. Prices and entitlements remain catalog-owned. */
export const PAYMENT_PLAN_COPY = {
  lite: {
    description: '놀이체육 수업 자료와 학생 및 수업 운영에 필요한 관리 기능을 이용할 수 있습니다.',
    features: ['놀이체육 수업 자료 전체 이용', '수업반 · 학생 · 일정 관리', '출석 및 수업 기록 관리', '학생 관찰 및 수업 메모', '수업 안내문 작성 및 지난 기록 활용'],
  },
  premium: {
    description: '라이트의 모든 기능과 SPOMOVE 시지각 움직임 콘텐츠를 함께 이용할 수 있습니다.',
    features: ['라이트의 모든 기능', 'SPOMOVE 활동 콘텐츠 전체 이용', '색상 · 방향 · 숫자 · 이미지 반응 활동', '활동 시간 및 횟수 설정', '전체 화면 활동 실행'],
  },
} as const;

export const PAYMENT_COMPARISON_ROWS = [
  { id: 'library', label: '놀이체육', lite: '제공', premium: '제공' },
  { id: 'management', label: '수업 운영 및 학생 관리', lite: '제공', premium: '제공' },
  { id: 'spomove', label: 'SPOMOVE', lite: '미제공', premium: '제공' },
] as const;

export const BILLING_AUTH_CANCEL_MESSAGE = '카드 등록이 취소되었습니다. 다시 진행하려면 구독 버튼을 선택해 주세요.';
export function isBillingAuthUserCancellation(code: string) {
  return code === 'USER_CANCEL' || code === 'PAY_PROCESS_CANCELED';
}
