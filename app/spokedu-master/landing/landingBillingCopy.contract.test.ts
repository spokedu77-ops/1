import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const landing = readFileSync(join(process.cwd(), 'app/spokedu-master/landing/page.tsx'), 'utf8');

function getPricingEntrySource(id: string) {
  const match = landing.match(new RegExp(`\\{\\s*id: '${id}',[\\s\\S]*?\\n  \\},`));
  expect(match, `${id} pricing entry should exist`).not.toBeNull();
  return match![0];
}

describe('SPOKEDU MASTER landing billing copy', () => {
  it('describes the current monthly billing model instead of the removed trial or 30-day purchase model', () => {
    expect(landing).toContain('월 자동결제');
    expect(landing).toContain('언제든 해지 예약');
    expect(landing).toContain('이용 기간 종료일까지 사용');

    expect(landing).not.toContain('신용카드 없이 시작');
    expect(landing).not.toContain('14일 후 자동 만료');
    expect(landing).not.toContain('결제 후 30일 이용');
  });

  it('keeps Lite includes honest to server entitlements (no records/explanations on Lite)', () => {
    const lite = getPricingEntrySource('lite');
    const premium = getPricingEntrySource('premium');

    expect(lite).toContain("'기록·안내문은 프리미엄'");
    expect(lite).toContain("'출석부'");
    expect(lite).not.toContain("'수업 기록·학생 명단'");
    expect(lite).not.toContain("'안내문 작성·복사'");
    expect(premium).toContain("'수업 기록·학생 명단'");
    expect(premium).toContain("'안내문 작성·복사'");
  });
});
