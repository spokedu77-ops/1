import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';
import { MASTER_SUPPORT_EMAIL } from '../lib/productCatalog';

export const metadata: Metadata = {
  title: '개인정보처리방침 · SPOKEDU MASTER',
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
        <Link href="/spokedu-master/landing" className="grid h-10 w-10 place-items-center rounded-[10px]" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }} aria-label="서비스 소개로 돌아가기">
          <ArrowLeft size={18} color="var(--spm-t2)" />
        </Link>
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.12em]" style={{ color: 'var(--spm-t3)' }}>SPOKEDU MASTER</p>
          <h1 className="text-[18px] font-black">개인정보처리방침</h1>
        </div>
      </header>

      <main className="mx-auto max-w-[720px] px-[22px] pb-12 sm:px-8">
        <p className="mb-8 text-[12px]" style={{ color: 'var(--spm-t3)' }}>최종 수정일: 2026년 6월 28일</p>

        <Section title="1. 수집·처리하는 정보">
          <p>회사는 현재 서비스 제공에 필요한 범위에서 다음 정보를 처리합니다.</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>계정 이메일</li>
            <li>프로필 이름·소속</li>
            <li>학생 이름·그룹</li>
            <li>출석 상태, 관찰·수행·메모, 수업 기록</li>
            <li>안내문 작성·저장 내용</li>
            <li>결제 주문 식별 정보와 이용권 상태</li>
            <li>접속·오류·서비스 이용 기록</li>
          </ul>
          <p>현재 제공하지 않는 보호자 공개 링크, 자동 문자·카카오톡 발송, 보호자 계정, 기관 다중 계정 기능을 전제로 한 개인정보는 수집하지 않습니다.</p>
        </Section>

        <Section title="2. 처리 목적">
          <p>인증 계정 관리, MASTER 이용권 확인, 결제 주문 처리, 수업 운영 데이터 저장, 안내문 작성·복사, 서비스 오류 대응과 보안 관리를 위해 개인정보를 처리합니다.</p>
        </Section>

        <Section title="3. 처리 위탁">
          <p>서비스 운영을 위해 다음 외부 서비스를 사용합니다.</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Supabase: 인증 계정과 서비스 운영 데이터 저장</li>
            <li>Vercel: 웹 서비스 호스팅</li>
            <li>토스페이먼츠: 결제 처리</li>
          </ul>
          <p>실제 사용하지 않는 분석·공유 서비스는 위탁 대상으로 기재하지 않습니다.</p>
        </Section>

        <Section title="4. 데이터 구분">
          <p>서비스 운영 데이터에는 학생 정보, 수업 기록, 안내문, 로컬 작업 데이터가 포함됩니다.</p>
          <p>인증 계정, 결제 증빙, 법정 보관 정보는 운영 데이터 삭제와 별도로 보관될 수 있습니다.</p>
        </Section>

        <Section title="5. 보유 기간">
          <p>서비스 운영 데이터는 사용자가 직접 삭제하거나 탈퇴 처리가 완료될 때까지 보관될 수 있습니다. 다만 결제·분쟁·법정 보관이 필요한 정보는 관련 법령상 필요한 기간 동안 보관될 수 있습니다.</p>
          <p>구체적인 법정 보관 기간과 파기 절차는 법률 전문가 검토가 필요한 항목입니다.</p>
        </Section>

        <Section title="6. 이용자의 권리">
          <p>이용자는 개인정보 조회, 수정, 삭제, 처리정지를 요청할 수 있습니다. 요청은 본인 확인 후 처리합니다.</p>
          <p>MASTER 데이터 삭제는 프로필 화면에서 직접 요청할 수 있으며, 회원 탈퇴나 계정 삭제 요청은 <a href={`mailto:${MASTER_SUPPORT_EMAIL}`} style={{ color: 'var(--spm-acc)' }}>{MASTER_SUPPORT_EMAIL}</a>로 문의해 주세요.</p>
        </Section>

        <Section title="7. 보호 조치">
          <p>회사는 HTTPS 통신, Supabase RLS와 서버 권한 검증, 결제 정보의 토스페이먼츠 처리, 오류 정보의 제한적 기록 등 현재 구현된 보호 조치를 적용합니다.</p>
        </Section>

        <Section title="8. 문의">
          <p>개인정보 요청, 회원 탈퇴, 결제·환불, Center·School 도입, 기능 오류 문의는 <a href={`mailto:${MASTER_SUPPORT_EMAIL}`} style={{ color: 'var(--spm-acc)' }}>{MASTER_SUPPORT_EMAIL}</a>로 연락해 주세요.</p>
        </Section>
      </main>
    </div>
  );
}
