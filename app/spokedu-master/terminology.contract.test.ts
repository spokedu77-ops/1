import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/** BOM·인코딩 노이즈로 assertion 메시지가 깨지지 않게 정규화 */
const read = (path: string) =>
  readFileSync(join(process.cwd(), path), 'utf8').replace(/^\uFEFF/, '');

const USER_VISIBLE_FILES = [
  'app/spokedu-master/dashboard/DashboardView.tsx',
  'app/spokedu-master/dashboard/EntitlementPreviewHome.tsx',
  'app/spokedu-master/library/LibraryView.tsx',
  'app/spokedu-master/library/[id]/LibraryDetailView.tsx',
  'app/spokedu-master/activity/page.tsx',
  'app/spokedu-master/class-record/page.tsx',
  'app/spokedu-master/components/record/RecordProgramPicker.tsx',
  'app/spokedu-master/components/lesson/LessonCatalogCard.tsx',
  'app/spokedu-master/components/lesson/ProgramPreviewModal.tsx',
  'app/spokedu-master/report/page.tsx',
  'app/spokedu-master/spomove/page.tsx',
  'app/spokedu-master/spomove/SpomoveHubView.tsx',
  'app/spokedu-master/spomove/session/page.tsx',
  'app/spokedu-master/components/layout/StatusBar.tsx',
  'app/spokedu-master/components/layout/TabBar.tsx',
  'app/spokedu-master/landing/page.tsx',
  'app/spokedu-master/onboarding/page.tsx',
  'app/spokedu-master/payment/page.tsx',
  'app/spokedu-master/profile/page.tsx',
  'app/spokedu-master/terms/page.tsx',
  'app/spokedu-master/privacy/page.tsx',
  'app/spokedu-master/subscription/page.tsx',
  'app/spokedu-master/students/page.tsx',
  'app/spokedu-master/error.tsx',
  'app/spokedu-master/components/ui/ClassToolsView.tsx',
] as const;


const userVisibleSource = () => USER_VISIBLE_FILES.map(read).join('\n');

const SPOMOVE_COPY_SOURCE_FILES = [
  'app/spokedu-master/spomove/SpomoveHubView.tsx',
  'app/spokedu-master/components/ui/SubscriptionGateWall.tsx',
  'app/spokedu-master/lib/productCatalog.ts',
  'app/spokedu-master/dashboard/DashboardView.tsx',
] as const;

const SPOMOVE_USER_FACING_FILES = [
  ...SPOMOVE_COPY_SOURCE_FILES,
  'app/spokedu-master/spomove/page.tsx',
  'app/spokedu-master/spomove/session/page.tsx',
] as const;

const spomoveCopySource = () => SPOMOVE_COPY_SOURCE_FILES.map(read).join('\n');
const spomoveUserFacingSource = () => SPOMOVE_USER_FACING_FILES.map(read).join('\n');

const unfinishedCopySource = () => [
  ...USER_VISIBLE_FILES,
  'app/spokedu-master/components/ui/ClassToolsView.tsx',
].map(read).join('\n');

describe('SPOKEDU MASTER user-facing terminology and product truth', () => {
  it('uses the fixed representative terms on user-facing screens', () => {
    const source = userVisibleSource();

    expect(source).toContain('라이브러리');
    expect(source).toContain('수업 미리보기');
    expect(source).toContain('전체 수업 자료 보기');
    expect(source).not.toMatch(/>\s*수업 자료\s*</);
    expect(source).not.toMatch(/>\s*수업 자료 보기\s*</);
    expect(source).not.toMatch(/>\s*전체 자료 보기\s*</);
    expect(source).not.toMatch(/>\s*다시 시도하기\s*</);
    expect(source).not.toMatch(/>\s*학생 추가하기\s*</);
    expect(source).not.toMatch(/>\s*다음 수업 자료\s*</);
    expect(source).not.toMatch(/>\s*내 반 명단 준비\s*</);
    expect(source).toContain('수업 기록');
    expect(source).toContain('안내문 작성·복사');
    expect(source).toContain('즐겨찾기');
    expect(source).toContain('오늘 수업 기록 남기기');
    expect(source).toContain('구독 선택');
    expect(source).toContain('프리미엄');
  });

  it('does not expose deprecated representative terms in the checked files', () => {
    const source = userVisibleSource();

    expect(source).not.toContain('맞춤 추천');
    expect(source).not.toContain('AI 추천');
    expect(source).not.toContain('성장 분석');
    expect(source).not.toContain('진행 중');
  });

  it('keeps billing CTA and bookmark labels unified in Korean', () => {
    const source = userVisibleSource();
    const library = read('app/spokedu-master/library/LibraryView.tsx');
    const preview = read('app/spokedu-master/components/lesson/ProgramPreviewModal.tsx');
    const access = read('app/spokedu-master/lib/masterAccessModel.ts');

    expect(access).toContain("return '구독 선택'");
    expect(access).toContain("return '구독 다시 선택'");
    expect(source).not.toContain('이용권 선택');
    expect(source).not.toContain('이용권 다시 구독하기');
    expect(source).not.toContain('이용권 다시 선택');
    expect(library).toContain('즐겨찾기 <span');
    expect(library).not.toContain('>저장 <');
    expect(library).not.toContain('>PRO<');
    expect(preview).not.toContain('PRO 전용');
    expect(source).not.toContain('USE THIS LESSON');
    expect(source).not.toContain('class record');
    expect(source).not.toContain('lesson explanation');
    expect(source).not.toContain('Weekly selection');
    expect(source).not.toContain('director dashboard');
    expect(source).not.toContain('center plan');
    expect(source).not.toContain('CLASS COMMAND');
    expect(source).not.toContain('>operations<');
    expect(source).not.toContain('official preset');
  });

  it('keeps product chrome on --spm-* tokens instead of indigo/legacy hex', () => {
    const source = userVisibleSource();
    const globals = read('app/globals.css');

    expect(globals).toContain('--spm-acc:');
    expect(globals).toContain('--spm-bg:');
    expect(globals).toContain('--spm-acc-a12:');
    expect(source).not.toContain('bg-indigo-');
    expect(source).not.toContain('text-indigo-');
    expect(source).not.toContain('border-indigo-');
    expect(source).not.toContain('#f5f7fb');
    expect(source).not.toContain('#eef2f7');
    expect(source).not.toContain('#4f46e5');
    expect(source).not.toContain('rgba(99,102,241');
    expect(source).not.toContain('rgba(99, 102, 241');
  });

  it('does not expose internal diagnostics or unfinished-feature copy in user-facing screens', () => {
    const source = unfinishedCopySource();

    expect(source).not.toContain('일부 정보가 부족합니다');
    expect(source).not.toContain('수업 정보 보강이 필요합니다');
    expect(source).not.toContain('부족 정보:');
    expect(source).not.toContain('qualityNotice');
    expect(source).not.toContain('학부모 공유 기능 준비 중');
    expect(source).not.toContain('학부모 공유 준비 중');
    expect(source).not.toContain('준비 중');
    expect(source).not.toContain('실행 준비');
  });

  it('presents Lite and Premium as the only direct purchase products from the catalog', () => {
    const payment = read('app/spokedu-master/payment/page.tsx');
    const summary = read('app/spokedu-master/profile/subscriptionSummary.ts');
    const catalog = read('app/spokedu-master/lib/productCatalog.ts');
    const checkout = read('app/api/spokedu-master/payment/create-checkout/route.ts');

    expect(catalog).toContain('MASTER_LITE_PRICE_KRW = 9900');
    expect(catalog).toContain('MASTER_PREMIUM_PRICE_KRW = 28900');
    expect(catalog).toContain("serverPlanKey: 'lite'");
    expect(catalog).toContain("serverPlanKey: 'premium'");
    expect(payment).toContain('getDirectPurchaseMasterProducts');
    expect(summary).toContain('MASTER_PRODUCT_CATALOG.premium');
    expect(payment).not.toContain("(['pro'] as PlanKey[])");
    expect(checkout).toContain('월 자동결제 등록 API를 사용해 주세요.');
  });

  it('does not present unavailable parent sharing or automated delivery as provided features', () => {
    const source = [
      read('app/spokedu-master/landing/page.tsx'),
      read('app/spokedu-master/payment/page.tsx'),
      read('app/spokedu-master/profile/page.tsx'),
      read('app/spokedu-master/terms/page.tsx'),
      read('app/spokedu-master/privacy/page.tsx'),
      read('app/spokedu-master/lib/productCatalog.ts'),
    ].join('\n');

    expect(source).toContain('안내문 작성·복사');
    expect(source).not.toContain('보호자용 공개 링크 제공');
    expect(source).not.toContain('카카오톡 자동 발송 제공');
    expect(source).not.toContain('문자 자동 발송 제공');
  });

  it('keeps support contact unified', () => {
    const source = userVisibleSource();

    expect(source).not.toContain('support@spokedu.com');
    expect(source).not.toContain('help@spokedu.com');
    expect(source).not.toContain('contact@spokedu.com');
    expect(source).not.toContain('스포케듀');
    // Contact is supplied via the MASTER_BUSINESS_INFO constants (verified in businessInfo.contract.test.ts)
    const usesApprovedContact =
      source.includes('spokedu77@gmail.com') ||
      source.includes('MASTER_SUPPORT_EMAIL') ||
      source.includes('MASTER_BUSINESS_INFO') ||
      source.includes('MASTER_CUSTOMER_SERVICE_HREF') ||
      source.includes('MASTER_CENTER_INQUIRY_HREF');
    expect(usesApprovedContact).toBe(true);
  });

  it('uses SPOMOVE copy terms where explanation is needed and forbids misleading labels', () => {
    const copySource = spomoveCopySource();
    const userFacingSource = spomoveUserFacingSource();

    expect(copySource).toContain('공식 활동');
    expect(copySource).toContain('큰 화면');

    expect(userFacingSource).not.toContain('공식 프로그램');
    expect(userFacingSource).not.toContain('구독자 공식 라이브러리');
    expect(userFacingSource).not.toContain('이름으로 찾기');
    expect(userFacingSource).not.toContain('프로그램 이름');
  });
});
