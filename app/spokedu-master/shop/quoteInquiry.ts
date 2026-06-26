export const SPOKEDU_INQUIRY_EMAIL = 'support@spokedu.com';

export type QuoteInquiryItem = {
  name: string;
  price: number;
  qty: number;
};

export function buildQuoteInquiryMailto(
  items: QuoteInquiryItem[],
  inquiryEmail = SPOKEDU_INQUIRY_EMAIL,
) {
  const total = items.reduce((sum, item) => sum + item.price * item.qty, 0);
  const lines = items.map((item) => {
    const subtotal = item.price * item.qty;
    return `- ${item.name} / 수량 ${item.qty} / ${subtotal.toLocaleString('ko-KR')}원`;
  });
  const subject = '[SPOKEDU MASTER] 교구 견적 문의';
  const body = [
    '아래 품목의 견적을 문의합니다.',
    '',
    ...lines,
    '',
    `예상 합계: ${total.toLocaleString('ko-KR')}원`,
    '',
    '현재 금액은 참고용이며, 실제 견적과 배송 가능 여부를 안내해 주세요.',
  ].join('\n');

  return `mailto:${inquiryEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
