import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

describe('SPOKEDU MASTER entry copy alignment', () => {
  it('keeps login OTP copy aligned with no-trial billing policy', () => {
    const login = read('app/login/page.tsx');

    expect(login).toContain('SPOKEDU MASTER 시작하기');
    expect(login).toContain('이용권 선택 후 사용할 수 있습니다');
    expect(login).toContain('이메일 인증으로 시작하기');

    expect(login).not.toContain('14일');
    expect(login).not.toContain('무료 체험');
    expect(login).not.toContain('SPOKEDU MASTER Trial');
  });

  it('keeps spokedu curriculum marketing aligned with MASTER billing policy', () => {
    const curriculum = read('app/spokedu/data/curriculum-page.ts');

    expect(curriculum).toContain('월 자동결제');
    expect(curriculum).toContain('이용권 보기');
    expect(curriculum).toContain('/spokedu-master/landing#pricing');

    expect(curriculum).not.toContain('7일 무료 체험');
    expect(curriculum).not.toContain('14일');
    expect(curriculum).not.toContain('무료 체험');
    expect(curriculum).not.toContain('오픈 예정');
  });

  it('keeps the parent route as a blocked public link sink, not a browse feature', () => {
    const parent = read('app/spokedu-master/parent/[studentId]/page.tsx');
    const routeAccess = read('app/spokedu-master/components/layout/masterRouteAccess.ts');
    const proxy = read('proxy.ts');

    expect(parent).toContain('보호자 공개 링크는 현재 제공하지 않습니다.');
    expect(parent).not.toContain('useMasterStore');
    expect(routeAccess).toContain('`${basePath}/parent`');
    expect(proxy).toContain("'/spokedu-master/parent'");
  });
});
