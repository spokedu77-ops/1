import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';
import {
  MASTER_PRO_DURATION_DAYS,
  MASTER_PRO_FEATURES,
  MASTER_PRO_PRICE_KRW,
  MASTER_SUPPORT_EMAIL,
  MASTER_TRIAL_DAYS,
} from '../lib/productCatalog';

export const metadata: Metadata = {
  title: '이용약관 · SPOKEDU MASTER',
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="mb-3 text-[17px] font-black" style={{ color: 'var(--spm-t)', fontFamily: 'var(--spm-font-display)' }}>{title}</h2>
      <div className="space-y-3 text-[13px] font-medium leading-7" style={{ color: 'var(--spm-t2)' }}>{children}</div>
    </section>
  );
}

export default function TermsPage() {
  return (
    <div className="min-h-dvh" style={{ background: 'var(--spm-bg)', color: 'var(--spm-t)', fontFamily: 'var(--spm-font-body)' }}>
      <header className="flex items-center gap-3 px-[22px] pb-6 pt-[22px] sm:px-8">
        <Link href="/spokedu-master/landing" className="grid h-10 w-10 place-items-center rounded-[10px]" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }} aria-label="서비스 소개로 돌아가기">
          <ArrowLeft size={18} color="var(--spm-t2)" />
        </Link>
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.12em]" style={{ color: 'var(--spm-t3)' }}>SPOKEDU MASTER</p>
          <h1 className="text-[18px] font-black">이용약관</h1>
        </div>
      </header>

      <main className="mx-auto max-w-[720px] px-[22px] pb-12 sm:px-8">
        <p className="mb-8 text-[12px]" style={{ color: 'var(--spm-t3)' }}>최종 수정일: 2026년 6월 28일</p>

        <Section title="1. 목적">
          <p>이 약관은 SPOKEDU가 제공하는 SPOKEDU MASTER 서비스의 이용 조건, 절차, 이용자와 회사의 권리·의무를 정합니다.</p>
        </Section>

        <Section title="2. 현재 제공 기능">
          <p>현재 제공 중인 기능은 라이브러리, SPOMOVE 실행, 학생 관리, 수업 기록, 학생별 기록 확인, 안내문 작성·저장·복사, 즐겨찾기·최근 활동입니다.</p>
          <ul className="list-disc space-y-1 pl-5">
            {MASTER_PRO_FEATURES.map((feature) => <li key={feature}>{feature}</li>)}
          </ul>
          <p>보호자용 공개 링크, 카카오톡·문자 자동 발송, 보호자 계정, 강사 초대, 다중 사용자, 기관 단위 데이터 관리 기능은 현재 제공하지 않습니다.</p>
        </Section>

        <Section title="3. 무료 체험과 Pro 이용권">
          <p>신규 MASTER 이용자는 {MASTER_TRIAL_DAYS}일 무료 체험을 사용할 수 있습니다. 체험은 서버에 기록된 MASTER 체험 기간을 기준으로 판단됩니다.</p>
          <p>SPOKEDU MASTER Pro는 {MASTER_PRO_PRICE_KRW.toLocaleString('ko-KR')}원, {MASTER_PRO_DURATION_DAYS}일 단건 이용권입니다. 자동 결제나 자동 갱신은 없습니다.</p>
          <p>기간이 종료되면 계속 사용하기 위해 이용권을 다시 결제해야 합니다.</p>
        </Section>

        <Section title="4. Center·School 상품">
          <p>Center와 School은 현재 일반 사용자에게 직접 결제 상품으로 판매하지 않습니다. 기관 도입, 학교 도입, 다중 계정 운영은 별도 상담으로 안내합니다.</p>
          <p>기존에 활성화된 Center 이용권이 있는 사용자는 기존 권한 정책에 따라 계속 이용할 수 있습니다.</p>
        </Section>

        <Section title="5. 결제와 환불 문의">
          <p>결제는 토스페이먼츠를 통해 처리되며, 회사는 카드번호 등 결제수단의 민감 정보를 직접 저장하지 않습니다.</p>
          <p>환불·취소 가능 여부는 관련 법령, 회사 정책, 실제 이용 내역에 따라 달라질 수 있습니다. 문의는 <a href={`mailto:${MASTER_SUPPORT_EMAIL}`} style={{ color: 'var(--spm-acc)' }}>{MASTER_SUPPORT_EMAIL}</a>로 접수해 주세요.</p>
        </Section>

        <Section title="6. 교육 운영 보조 서비스">
          <p>SPOKEDU MASTER의 수업 자료, 학생 기록, 안내문은 교육 운영을 돕기 위한 자료입니다. 학생 기록은 의료·진단·평가 자료가 아닙니다.</p>
          <p>안내문은 사용자가 확인하고 수정한 뒤 사용하는 초안이며, 실제 전달 여부와 내용 책임은 사용자에게 있습니다.</p>
        </Section>

        <Section title="7. 금지 행위">
          <p>서비스 콘텐츠를 무단 복제·배포·재판매하거나, 다른 사용자의 계정·데이터에 접근하거나, 서비스 운영을 방해하는 행위를 금지합니다.</p>
        </Section>

        <Section title="8. 서비스 변경과 중단">
          <p>회사는 서비스 개선, 보안, 운영상 필요에 따라 기능을 변경하거나 일시 중단할 수 있습니다. 중요한 변경은 가능한 방식으로 안내합니다.</p>
        </Section>

        <Section title="9. MASTER 데이터 삭제와 회원 탈퇴">
          <p>프로필에서 제공하는 기능은 MASTER 운영 데이터 삭제입니다. 학생 정보, 수업 기록, 학생별 기록, 저장한 안내문, 현재 기기의 MASTER 로컬 작업 데이터를 삭제합니다.</p>
          <p>로그인 계정, 이용권, 결제 주문, 결제·환불 증빙, 법령상 보관이 필요한 기록은 삭제 대상이 아닙니다.</p>
          <p>회원 탈퇴는 자동 처리 기능을 제공하지 않습니다. 탈퇴 요청은 본인 확인 후 처리되며 <a href={`mailto:${MASTER_SUPPORT_EMAIL}`} style={{ color: 'var(--spm-acc)' }}>{MASTER_SUPPORT_EMAIL}</a>로 문의해 주세요.</p>
        </Section>

        <Section title="10. 문의">
          <p>결제 오류, 환불·취소, 회원 탈퇴, 개인정보 요청, Center·School 도입, 기능 오류 문의는 <a href={`mailto:${MASTER_SUPPORT_EMAIL}`} style={{ color: 'var(--spm-acc)' }}>{MASTER_SUPPORT_EMAIL}</a>로 연락해 주세요.</p>
        </Section>
      </main>
    </div>
  );
}
