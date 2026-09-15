import type { Metadata } from 'next';
import { PolicyHeader } from '../components/policy/PolicyHeader';
import {
  MASTER_PRODUCT_CATALOG,
  MASTER_SUPPORT_EMAIL,
  SPOMAT_PRODUCT_CONTRACT,
} from '../lib/productCatalog';

export const metadata: Metadata = {
  title: '이용약관 · SPOKEDU MASTER',
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="mb-3 text-[20px] font-semibold leading-7" style={{ color: 'var(--spm-t)', fontFamily: 'var(--spm-font-display)' }}>{title}</h2>
      <div className="space-y-3 text-[15px] font-normal leading-7" style={{ color: 'var(--spm-t2)' }}>{children}</div>
    </section>
  );
}

export default async function TermsPage({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  const { from } = await searchParams;
  const lite = MASTER_PRODUCT_CATALOG.lite;
  const premium = MASTER_PRODUCT_CATALOG.premium;
  const center = MASTER_PRODUCT_CATALOG.center;

  return (
    <div className="min-h-dvh" style={{ background: 'var(--spm-bg)', color: 'var(--spm-t)', fontFamily: 'var(--spm-font-body)' }}>
      <PolicyHeader title="이용약관" fromProfile={from === 'profile'} />

      <main className="mx-auto max-w-[760px] px-5 pb-12 sm:px-8">
        <p className="mb-8 text-[12px]" style={{ color: 'var(--spm-t3)' }}>최종 수정일: 2026년 7월 1일</p>

        <Section title="1. 목적">
          <p>이 약관은 SPOKEDU가 제공하는 SPOKEDU MASTER 서비스의 이용 조건, 절차, 이용자와 회사의 권리 및 의무를 정합니다.</p>
        </Section>

        <Section title="2. 제공 기능">
          <p>SPOKEDU MASTER는 수업 전 수업 라이브러리, 수업 중 수업 도구 또는 SPOMOVE, 수업 후 수업 기록·안내문을 제공하는 교육 운영 보조 서비스입니다.</p>
          <p>학생 기록과 안내문은 교육 운영을 돕기 위한 자료이며 의료, 진단, 평가 자료가 아닙니다.</p>
        </Section>

        <Section title="3. 이용권과 결제">
          <p>{lite.displayName}는 {lite.priceLabel} {lite.billingCycleLabel} 상품이며 SPOMOVE를 제외한 MASTER 기본 기능을 제공합니다.</p>
          <p>{premium.displayName}은 {premium.priceLabel} {premium.billingCycleLabel} 상품이며 라이트 기능에 수업 기록과 SPOMOVE를 추가로 제공하고 SPOMAT 회원가 자격을 제공합니다.</p>
          <p>{center.displayName}은 {center.priceLabel} 상품이며 직접 결제를 제공하지 않습니다. 기관 도입은 별도 문의로 안내합니다.</p>
          <p>무료 체험 상품은 제공하지 않습니다. 신규 사용자는 결제 성공 또는 별도 계약이 확인된 경우에만 유료 기능 권한을 받을 수 있습니다.</p>
        </Section>

        <Section title="4. 자동결제와 해지">
          <p>라이트와 프리미엄은 월 자동결제 상품입니다. 결제수단 등록 후 첫 결제가 성공하면 구독이 시작되고, 이후 매월 최초 결제일을 기준으로 자동결제가 시도됩니다.</p>
          <p>라이트 이용 중 프리미엄으로 즉시 변경하면 프리미엄 정가 28,900원이 새로 결제됩니다. 기존 라이트 잔여기간에 대한 차액 계산이나 별도 환급은 없으며, 결제 성공 시점부터 프리미엄 1개월과 새 자동결제 주기가 시작됩니다.</p>
          <p>구독 해지를 요청하면 즉시 권한을 제거하지 않고, 이미 결제된 이용 기간 종료일까지 사용할 수 있습니다. 이후 다음 자동결제는 진행되지 않습니다.</p>
          <p>환불·취소 가능 여부는 관련 법령, 회사 정책, 실제 이용 내역에 따라 달라질 수 있습니다. 문의는 <a href={`mailto:${MASTER_SUPPORT_EMAIL}`} style={{ color: 'var(--spm-acc)' }}>{MASTER_SUPPORT_EMAIL}</a>로 접수해 주세요.</p>
        </Section>

        <Section title="5. SPOMAT">
          <p>SPOMAT 일반가는 {SPOMAT_PRODUCT_CONTRACT.regularPrice.toLocaleString('ko-KR')}원입니다.</p>
          <p>프리미엄 구독자는 {SPOMAT_PRODUCT_CONTRACT.premiumPrice.toLocaleString('ko-KR')}원의 회원가 자격을 가질 수 있습니다.</p>
          <p>SPOMAT 구매, 배송, 대량 구매 문의는 별도 구매 경로와 안내 기준을 따릅니다.</p>
        </Section>

        <Section title="6. 금지 행위">
          <p>서비스 콘텐츠를 무단 복제, 배포, 판매하거나 다른 사용자의 계정 및 데이터에 접근하는 행위, 서비스 운영을 방해하는 행위를 금지합니다.</p>
        </Section>

        <Section title="7. 서비스 변경과 중단">
          <p>회사는 서비스 개선, 보안, 운영상 필요에 따라 기능을 변경하거나 일시 중단할 수 있습니다. 중요한 변경은 가능한 방식으로 안내합니다.</p>
        </Section>

        <Section title="8. 데이터 삭제와 탈퇴">
          <p>프로필에서 제공하는 기능은 MASTER 운영 데이터 삭제입니다. 학생 정보, 수업·출석 기록, 학생별 기록, 저장한 안내문, 즐겨찾기와 현재 기기의 MASTER 로컬 작업 데이터를 삭제합니다.</p>
          <p>로그인 계정, 이용권 결제 주문, 결제·환불 증빙, 법령상 보관이 필요한 기록은 삭제 대상이 아닙니다.</p>
          <p>회원 탈퇴는 자동 처리 기능을 제공하지 않습니다. 탈퇴 요청은 본인 확인 후 처리되며 <a href={`mailto:${MASTER_SUPPORT_EMAIL}`} style={{ color: 'var(--spm-acc)' }}>{MASTER_SUPPORT_EMAIL}</a>로 문의해 주세요.</p>
        </Section>

        <Section title="9. 문의">
          <p>결제 오류, 환불·취소, 회원 탈퇴, 개인정보 요청, 센터·기관 도입, 기능 오류 문의는 <a href={`mailto:${MASTER_SUPPORT_EMAIL}`} style={{ color: 'var(--spm-acc)' }}>{MASTER_SUPPORT_EMAIL}</a>로 연락해 주세요.</p>
        </Section>
      </main>
    </div>
  );
}
