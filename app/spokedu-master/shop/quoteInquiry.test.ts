import { describe, expect, it } from 'vitest';
import { buildQuoteInquiryMailto, SPOKEDU_INQUIRY_EMAIL } from './quoteInquiry';

describe('buildQuoteInquiryMailto', () => {
  it('includes item names, quantities, and the estimated total', () => {
    const href = buildQuoteInquiryMailto([
      { name: '마커콘 세트', price: 8900, qty: 2 },
      { name: '미니 허들', price: 24000, qty: 1 },
    ]);
    const url = new URL(href);
    const body = url.searchParams.get('body');

    expect(url.pathname).toBe(SPOKEDU_INQUIRY_EMAIL);
    expect(body).toContain('마커콘 세트 / 수량 2 / 17,800원');
    expect(body).toContain('미니 허들 / 수량 1 / 24,000원');
    expect(body).toContain('예상 합계: 41,800원');
    expect(body).toContain('참고용');
  });
});
