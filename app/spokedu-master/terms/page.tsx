import type { Metadata } from 'next';
import { PolicyHeader } from '../components/policy/PolicyHeader';
import {
  MASTER_CUSTOMER_SERVICE_HREF,
  MASTER_PRODUCT_CATALOG,
  MASTER_SUPPORT_EMAIL,
  SPOMAT_PRODUCT_CONTRACT,
} from '../lib/productCatalog';

export const metadata: Metadata = {
  title: {
    absolute: '이용약관 · SPOKEDU LAB',
  },
};

function Section({ id, title, children }: { id?: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mb-8 scroll-mt-20">
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
        <p className="mb-8 text-[12px]" style={{ color: 'var(--spm-t3)' }}>최종 수정일: 2026년 10월 7일</p>

        <Section title="1. 목적">
          <p>이 약관은 SPOKEDU가 제공하는 SPOKEDU LAB 서비스의 이용 조건, 절차, 이용자와 회사의 권리 및 의무를 정합니다.</p>
        </Section>

        <Section title="2. 제공 기능">
          <p>SPOKEDU LAB은 수업 전 수업 라이브러리, 수업 중 수업 도구 또는 SPOMOVE, 수업 후 수업 기록·안내문을 제공하는 교육 운영 보조 서비스입니다.</p>
          <p>학생 기록과 안내문은 교육 운영을 돕기 위한 자료이며 의료, 진단, 평가 자료가 아닙니다.</p>
        </Section>

        <Section title="3. 이용권과 결제">
          <p>로그인 후 무료(Free) 이용자는 놀이체육 Library를 탐색하고, 이번 주 추천 첫 번째 프로그램을 빠른 미리보기로 확인하며, 스탑워치·타이머·점수판을 사용할 수 있습니다. 전체 상세 자료는 Lite부터 이용할 수 있으며, 기간제 유료 무료체험 상품은 제공하지 않습니다.</p>
          <p>{lite.displayName}는 {lite.priceLabel} {lite.billingCycleLabel} 상품이며 전체 놀이체육 Library와 일반 수업 운영, 기록 및 안내문 기능을 제공합니다.</p>
          <p>{premium.displayName}은 {premium.priceLabel} {premium.billingCycleLabel} 상품이며 라이트 전체 기능에 SPOMOVE를 추가로 제공합니다.</p>
          <p>{center.displayName}은 {center.priceLabel} 상품이며 직접 결제를 제공하지 않습니다. 기관 도입은 별도 문의로 안내합니다.</p>
          <p>유료 기능 권한은 결제 성공 또는 별도 계약이 확인된 경우에만 부여됩니다. 결제 금액은 브라우저가 전달한 값이 아니라 서버가 계산한 견적을 기준으로 합니다.</p>
        </Section>

        <Section id="refund" title="4. 자동결제·해지·환불">
          <p>라이트와 프리미엄은 1개월 단위 월 자동결제 상품이며, 1회 결제당 서비스 제공기간은 1개월입니다. 결제수단 등록 후 첫 결제가 성공하면 구독이 시작되며 이후 매월 최초 결제일을 기준으로 자동결제가 진행됩니다.</p>
          <p>이용 중인 라이트에서 프리미엄으로 즉시 업그레이드할 수 있습니다. 이미 결제한 라이트의 남은 이용기간 가치를 반영해 서버가 차액을 계산하고, 그 차액만 즉시 결제합니다. 기존 라이트 결제를 별도 환불한 뒤 프리미엄을 새로 1개월 결제하는 방식은 사용하지 않습니다.</p>
          <p>업그레이드 결제 전에 오늘 결제할 차액, 다음 결제일, 다음 프리미엄 월 결제금액을 확인할 수 있습니다. 결제 성공 즉시 프리미엄 권한이 적용되며, 다음 정기결제일은 기존 라이트 이용 기간 종료일을 유지합니다.</p>
          <p>해지를 예약한 상태(기간 종료 시 자동결제 중단)에서는 화면에서 즉시 업그레이드할 수 없습니다. 변경이 필요하면 고객센터로 문의해 주세요.</p>
          <p>이용자는 언제든 다음 자동결제의 해지를 요청할 수 있습니다. 구독 해지 시 현재 결제된 이용기간 종료일까지 서비스를 이용할 수 있으며 이후 다음 자동결제는 진행되지 않습니다.</p>
          <p>결제 후 7일 이내이고 유료 서비스 또는 유료 콘텐츠를 이용하지 않은 경우 전액 환불을 요청할 수 있습니다.</p>
          <p>유료 서비스 또는 디지털 콘텐츠의 이용이 시작된 이후에는 서비스 이용 내역과 제공된 범위를 기준으로 환불이 제한될 수 있으며 가분적인 서비스의 미제공 부분에 대해서는 관련 법령에 따라 처리합니다.</p>
          <p>서비스가 표시·광고 또는 계약 내용과 다르게 제공되었거나 회사의 귀책사유로 정상적으로 제공되지 않은 경우에는 관련 법령에 따라 취소 또는 환불을 처리합니다.</p>
          <p>환불이 승인된 경우 원 결제수단을 통해 환급하며 실제 환급 완료 시점은 카드사 및 결제수단에 따라 달라질 수 있습니다.</p>
          <p>환불 및 결제 취소 문의는 <a href={`mailto:${MASTER_SUPPORT_EMAIL}`} style={{ color: 'var(--spm-acc)' }}>{MASTER_SUPPORT_EMAIL}</a>로 접수합니다.</p>
          <p>관련 법령에서 이용자에게 더 유리한 기준을 정하고 있는 경우 해당 법령을 우선 적용합니다.</p>
        </Section>

        <Section title="5. SPOMAT">
          <p>SPOMAT 일반가는 {SPOMAT_PRODUCT_CONTRACT.regularPrice.toLocaleString('ko-KR')}원입니다.</p>
          <p>SPOMAT 구매, 배송, 대량 구매 문의는 별도 구매 경로와 안내 기준을 따릅니다.</p>
        </Section>

        <Section title="6. 금지 행위">
          <p>이용자는 다음 행위를 해서는 안 됩니다.</p>
          <ul className="list-disc space-y-2 pl-5">
            <li>계정을 타인에게 양도·대여·공유하거나 다른 사람의 계정을 사용하는 행위</li>
            <li>수업 자료, 영상, 이미지, SPOMOVE 콘텐츠를 허가 없이 복제·배포·공개·판매하거나 다른 서비스의 상품으로 제공하는 행위</li>
            <li>화면 녹화, 크롤링, 자동 수집 도구 등을 이용해 콘텐츠나 데이터를 대량으로 저장·추출하는 행위</li>
            <li>이용권, 결제, 접근권한 또는 기능 제한을 우회하거나 서비스 코드를 역공학·변조하는 행위</li>
            <li>다른 이용자의 수업반, 학생 정보, 출석, 메모와 기록에 접근하거나 이를 외부에 유출하는 행위</li>
            <li>비정상적인 요청, 자동화 도구, 악성 코드 등으로 서비스의 안정적인 운영을 방해하는 행위</li>
            <li>불법·유해한 정보를 저장하거나 타인의 저작권, 개인정보 및 그 밖의 권리를 침해하는 행위</li>
          </ul>
          <p>정상적인 수업 준비와 현장 지도 목적의 이용은 허용되지만, 콘텐츠의 외부 재배포나 상업적 재판매는 허용되지 않습니다.</p>
          <p>위반 행위가 확인되면 사전 안내 후 이용 제한, 콘텐츠 접근 차단 또는 계약 해지가 이루어질 수 있습니다. 보안 침해나 중대한 피해가 우려되는 긴급한 경우에는 우선 조치한 뒤 안내할 수 있으며, 관계 법령에 따른 조치가 병행될 수 있습니다.</p>
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
          <p>결제 오류, 환불·취소, 회원 탈퇴, 개인정보 요청, 센터·기관 도입, 기능 오류 문의는 <a href={MASTER_CUSTOMER_SERVICE_HREF} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--spm-acc)' }}>스포키듀 카카오 채널</a> 또는 <a href={`mailto:${MASTER_SUPPORT_EMAIL}`} style={{ color: 'var(--spm-acc)' }}>{MASTER_SUPPORT_EMAIL}</a>로 연락해 주세요.</p>
        </Section>
      </main>
    </div>
  );
}
