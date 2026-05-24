import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '개인정보처리방침 — SPOKEDU MASTER',
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="mb-3 text-[17px] font-black" style={{ color: 'var(--spm-t)', fontFamily: 'var(--spm-font-display)' }}>{title}</h2>
      <div className="space-y-3 text-[13px] font-medium leading-7" style={{ color: 'var(--spm-t2)' }}>{children}</div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <div className="min-h-dvh" style={{ background: 'var(--spm-bg)', color: 'var(--spm-t)', fontFamily: 'var(--spm-font-body)' }}>
      <header className="flex items-center gap-3 px-[22px] pb-6 pt-[22px] sm:px-8">
        <Link href="/spokedu-master/profile" className="grid h-10 w-10 place-items-center rounded-[10px]" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }} aria-label="뒤로">
          <ArrowLeft size={18} color="var(--spm-t2)" />
        </Link>
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.12em]" style={{ color: 'var(--spm-t3)' }}>SPOKEDU MASTER</p>
          <h1 className="text-[18px] font-black">개인정보처리방침</h1>
        </div>
      </header>

      <main className="mx-auto max-w-[720px] px-[22px] pb-12 sm:px-8">
        <p className="mb-8 text-[12px]" style={{ color: 'var(--spm-t3)' }}>최종 수정일: 2026년 5월 15일</p>

        <Section title="1. 수집하는 개인정보 항목">
          <p>회사는 서비스 제공을 위해 다음의 개인정보를 수집합니다.</p>
          <p>· <strong style={{ color: 'var(--spm-t)' }}>필수 항목</strong>: 이메일 주소 (서비스 인증 및 구독 관리용)</p>
          <p>· <strong style={{ color: 'var(--spm-t)' }}>결제 정보</strong>: 결제 처리는 토스페이먼츠에서 담당하며, 회사는 카드 번호 등 결제 상세 정보를 직접 수집·저장하지 않습니다.</p>
          <p>· <strong style={{ color: 'var(--spm-t)' }}>서비스 이용 정보</strong>: 이용자가 직접 입력한 이름, 소속, 담당 연령대, 프로그램 유형 (선택 사항)</p>
          <p>· <strong style={{ color: 'var(--spm-t)' }}>수업 운영 정보</strong>: 이용자가 직접 입력한 학생 이름, 반/그룹, 수업 출석, 관찰 메모, 동작 체크 기록 (선택 사항)</p>
          <p>· <strong style={{ color: 'var(--spm-t)' }}>자동 수집</strong>: 접속 IP, 브라우저 종류, 서비스 이용 기록 (서비스 개선 목적)</p>
        </Section>

        <Section title="2. 개인정보 수집 및 이용 목적">
          <p>· 서비스 회원 인증 및 관리</p>
          <p>· 구독 결제 처리 및 구독 상태 관리</p>
          <p>· 수업 기록, 학생 이력, 보호자 공유 링크 제공</p>
          <p>· 서비스 이용 통계 분석 및 개선</p>
          <p>· 이용약관 위반 사항 확인 및 분쟁 해결</p>
        </Section>

        <Section title="3. 개인정보 보유 및 이용 기간">
          <p>회사는 회원 탈퇴 시 즉시 개인정보를 파기합니다. 단, 관련 법령에 따라 일정 기간 보관이 필요한 경우 해당 기간 동안 보관 후 파기합니다.</p>
          <p>· 전자상거래 등에서의 소비자 보호에 관한 법률: 계약 및 청약 철회 기록 5년, 대금 결제 기록 5년</p>
          <p>· 통신비밀보호법: 서비스 이용 로그 기록 3개월</p>
        </Section>

        <Section title="4. 개인정보의 제3자 제공">
          <p>회사는 이용자의 동의 없이 개인정보를 제3자에게 제공하지 않습니다. 단, 다음의 경우는 예외입니다.</p>
          <p>· 법령에 따른 수사기관의 요청이 있는 경우</p>
          <p>· <strong style={{ color: 'var(--spm-t)' }}>결제 처리 위탁</strong>: 토스페이먼츠 (한국) — 결제 처리 목적으로 이메일, 결제 금액 등 최소한의 정보를 공유합니다.</p>
        </Section>

        <Section title="5. 개인정보 처리 위탁">
          <p>회사는 원활한 서비스 제공을 위해 다음과 같이 개인정보 처리를 위탁합니다.</p>
          <p>· <strong style={{ color: 'var(--spm-t)' }}>Supabase Inc.</strong> — 인증 및 데이터 저장 (미국)</p>
          <p>· <strong style={{ color: 'var(--spm-t)' }}>토스페이먼츠</strong> — 결제 처리 (한국)</p>
          <p>· <strong style={{ color: 'var(--spm-t)' }}>Vercel Inc.</strong> — 서비스 호스팅 (미국)</p>
        </Section>

        <Section title="6. 이용자의 권리">
          <p>이용자는 언제든지 자신의 개인정보를 조회, 수정, 삭제할 수 있습니다. 또한 개인정보 처리에 대한 동의를 철회할 수 있으며, 이 경우 서비스 이용이 제한될 수 있습니다.</p>
          <p>개인정보 관련 요청은 아래 이메일로 문의해 주십시오.</p>
        </Section>

        <Section title="7. 개인정보 보호 책임자">
          <p>회사는 개인정보 처리에 관한 업무를 담당하는 개인정보 보호 책임자를 지정하고 있습니다.</p>
          <p>이메일: <a href="mailto:support@spokedu.com" style={{ color: 'var(--spm-acc)' }}>support@spokedu.com</a></p>
        </Section>

        <Section title="8. 개인정보 보호 조치">
          <p>회사는 개인정보 보호를 위해 다음의 조치를 취하고 있습니다.</p>
          <p>· 이메일 OTP 기반 인증으로 비밀번호 저장 없이 안전하게 처리</p>
          <p>· HTTPS 암호화 통신</p>
          <p>· Supabase Row Level Security(RLS)를 통한 데이터 접근 제한</p>
          <p>· 결제 정보의 직접 저장 없이 토스페이먼츠 PCI DSS 준수 처리</p>
        </Section>

        <Section title="9. 변경 사항 공지">
          <p>이 방침이 변경되는 경우 변경 시행 7일 전부터 서비스 내 공지 또는 이메일로 알려드립니다.</p>
        </Section>
      </main>
    </div>
  );
}
