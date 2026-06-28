import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

const USER_VISIBLE_FILES = [
  'app/spokedu-master/dashboard/DashboardView.tsx',
  'app/spokedu-master/library/LibraryView.tsx',
  'app/spokedu-master/library/[id]/LibraryDetailView.tsx',
  'app/spokedu-master/class-record/page.tsx',
  'app/spokedu-master/report/page.tsx',
  'app/spokedu-master/spomove/page.tsx',
  'app/spokedu-master/spomove/session/page.tsx',
  'app/spokedu-master/components/layout/StatusBar.tsx',
  'app/spokedu-master/components/layout/TabBar.tsx',
  'app/spokedu-master/landing/page.tsx',
  'app/spokedu-master/payment/page.tsx',
  'app/spokedu-master/profile/page.tsx',
  'app/spokedu-master/terms/page.tsx',
  'app/spokedu-master/privacy/page.tsx',
  'app/spokedu-master/subscription/page.tsx',
  'app/spokedu-master/students/page.tsx',
] as const;

const userVisibleSource = () => USER_VISIBLE_FILES.map(read).join('\n');

describe('SPOKEDU MASTER user-facing terminology and product truth', () => {
  it('uses the fixed representative terms on user-facing screens', () => {
    const source = userVisibleSource();

    expect(source).toContain('라이브러리');
    expect(source).toContain('수업 미리보기');
    expect(source).toContain('전체 수업 자료 보기');
    expect(source).toContain('수업 기록');
    expect(source).toContain('안내문');
    expect(source).toContain('즐겨찾기');
    expect(source).toContain('내 활동·기록');
  });

  it('does not expose deprecated representative terms in the checked files', () => {
    const source = userVisibleSource();

    expect(source).not.toContain('저장 수업');
    expect(source).not.toContain('빠른 미리보기');
    expect(source).not.toContain('프로그램 라이브러리');
    expect(source).not.toContain('수업 라이브러리');
    expect(source).not.toContain('학부모 안내 문구');
  });

  it('presents Pro as the only direct purchase product', () => {
    const landing = read('app/spokedu-master/landing/page.tsx');
    const payment = read('app/spokedu-master/payment/page.tsx');
    const checkout = read('app/api/spokedu-master/payment/create-checkout/route.ts');

    expect(landing).toContain('39,900');
    expect(landing).toContain('상담 문의');
    expect(payment).toContain("'39,900'");
    expect(payment).toContain("(['pro'] as PlanKey[])");
    expect(checkout).toContain('isSpokeduMasterDirectPurchasePlan(planKey)');
  });

  it('does not present unavailable parent sharing or automated delivery as provided features', () => {
    const source = [
      read('app/spokedu-master/landing/page.tsx'),
      read('app/spokedu-master/payment/page.tsx'),
      read('app/spokedu-master/profile/page.tsx'),
      read('app/spokedu-master/terms/page.tsx'),
      read('app/spokedu-master/privacy/page.tsx'),
    ].join('\n');

    expect(source).toContain('안내문 작성·저장·복사');
    expect(source).not.toContain('보호자용 공개 링크 제공');
    expect(source).not.toContain('카카오톡 자동 발송 제공');
    expect(source).not.toContain('문자 자동 발송 제공');
  });

  it('keeps support contact unified', () => {
    const source = userVisibleSource();

    expect(source).toContain('support@spokedu.com');
    expect(source).not.toContain('help@spokedu.com');
    expect(source).not.toContain('contact@spokedu.com');
  });
});
