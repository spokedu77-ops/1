import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '이용약관 — SPOKEDU MASTER',
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
        <Link href="/spokedu-master/profile" className="grid h-10 w-10 place-items-center rounded-[10px]" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }} aria-label="뒤로">
          <ArrowLeft size={18} color="var(--spm-t2)" />
        </Link>
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.12em]" style={{ color: 'var(--spm-t3)' }}>SPOKEDU MASTER</p>
          <h1 className="text-[18px] font-black">이용약관</h1>
        </div>
      </header>

      <main className="mx-auto max-w-[720px] px-[22px] pb-12 sm:px-8">
        <p className="mb-8 text-[12px]" style={{ color: 'var(--spm-t3)' }}>최종 수정일: 2026년 5월 15일</p>

        <Section title="제1조 (목적)">
          <p>이 약관은 SPOKEDU(이하 "회사")가 운영하는 SPOKEDU MASTER 서비스(이하 "서비스")의 이용 조건 및 절차, 회사와 이용자 간의 권리·의무 및 책임 사항을 규정함을 목적으로 합니다.</p>
        </Section>

        <Section title="제2조 (정의)">
          <p>"서비스"란 회사가 제공하는 체육교육 프로그램 라이브러리, SPOMOVE 화면 실행, 수업 도구 및 설명 문구 등 일체의 온라인 서비스를 의미합니다.</p>
          <p>"이용자"란 이 약관에 동의하고 서비스를 이용하는 개인 강사, 교사, 센터 운영자 등을 의미합니다.</p>
          <p>"구독"이란 이용자가 월정액을 결제하고 서비스의 유료 기능을 이용할 수 있는 계약을 의미합니다.</p>
        </Section>

        <Section title="제3조 (약관의 효력 및 변경)">
          <p>이 약관은 서비스 화면에 게시하거나 이메일로 공지함으로써 효력이 발생합니다. 회사는 관련 법령을 위반하지 않는 범위에서 약관을 변경할 수 있으며, 변경 시 최소 7일 전에 공지합니다.</p>
        </Section>

        <Section title="제4조 (서비스 이용 및 구독)">
          <p>서비스는 무료 체험(14일)과 유료 구독 플랜(Pro, Center)으로 제공됩니다.</p>
          <p>유료 구독은 토스페이먼츠를 통해 결제되며, 구독 기간은 월 단위입니다.</p>
          <p>이용자는 다음 결제일 전에 언제든지 구독을 취소할 수 있으며, 취소 후에도 해당 기간 종료 시까지 서비스를 이용할 수 있습니다.</p>
          <p>이미 결제된 구독료는 환불되지 않으나, 결제일로부터 7일 이내에 서비스를 이용하지 않은 경우 회사 정책에 따라 환불을 요청할 수 있습니다.</p>
        </Section>

        <Section title="제5조 (이용자의 의무)">
          <p>이용자는 서비스를 이용함에 있어 다음 행위를 해서는 안 됩니다.</p>
          <p>· 타인의 계정을 무단으로 이용하는 행위</p>
          <p>· 서비스 내 콘텐츠를 무단으로 복제·배포·판매하는 행위</p>
          <p>· 서비스 운영을 방해하거나 서버에 과부하를 주는 행위</p>
          <p>· 관련 법령 또는 이 약관을 위반하는 행위</p>
        </Section>

        <Section title="제6조 (서비스의 제공 및 중단)">
          <p>회사는 연중무휴 서비스를 제공하는 것을 원칙으로 하나, 시스템 점검·업그레이드·장애 등의 경우 서비스를 일시 중단할 수 있습니다. 이 경우 사전에 공지합니다.</p>
        </Section>

        <Section title="제7조 (책임 제한)">
          <p>회사는 천재지변, 전쟁, 서비스 제공 업체의 귀책 등 불가항력적 사유로 인한 서비스 중단에 대해 책임을 지지 않습니다.</p>
          <p>회사는 이용자가 서비스를 통해 얻은 정보를 활용하여 발생한 손해에 대해 고의 또는 중대한 과실이 없는 한 책임을 지지 않습니다.</p>
        </Section>

        <Section title="제8조 (분쟁 해결)">
          <p>서비스 이용과 관련하여 분쟁이 발생한 경우 회사와 이용자는 성실하게 협의하여 해결합니다. 협의가 이루어지지 않을 경우 관련 법령에 따른 법원을 관할 법원으로 합니다.</p>
        </Section>

        <Section title="제9조 (문의)">
          <p>이용약관에 관한 문의는 아래 이메일로 연락해 주십시오.</p>
          <p>이메일: <a href="mailto:support@spokedu.com" style={{ color: 'var(--spm-acc)' }}>support@spokedu.com</a></p>
        </Section>
      </main>
    </div>
  );
}
