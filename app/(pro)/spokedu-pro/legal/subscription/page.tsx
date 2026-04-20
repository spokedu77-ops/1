import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'SPOKEDU PRO 구독 안내 | 스포키듀',
  description: '스포키듀 PRO 구독·결제·청약철회·환불 관련 안내(요약).',
};

export default function SpokeduProSubscriptionLegalPage() {
  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-200 px-4 py-10">
      <div className="max-w-2xl mx-auto space-y-8">
        <header className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">SPOKEDU PRO</p>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">구독·결제 안내</h1>
          <p className="text-sm text-slate-400">
            아래는 서비스 이용을 위한 <strong className="text-slate-300">요약 안내</strong>입니다. 세부 약관·특약은 계약서 또는 별도 안내를 따릅니다.
          </p>
        </header>

        <section className="space-y-3 rounded-2xl border border-slate-700 bg-slate-800/40 p-5">
          <h2 className="text-lg font-black text-white">1. 구독 및 결제</h2>
          <p className="text-sm leading-relaxed text-slate-300">
            현재 앱 내 자동 결제(카드 정기결제)는 제공하지 않을 수 있으며, 플랜 전환은 운영팀 안내에 따라 이메일 또는 별도 절차로 진행될 수 있습니다.
            요금표는 앱 내 <strong className="text-white">플랜 &amp; 결제</strong> 화면 및 운영팀 공지와 함께 확인해 주세요.
          </p>
        </section>

        <section className="space-y-3 rounded-2xl border border-slate-700 bg-slate-800/40 p-5">
          <h2 className="text-lg font-black text-white">2. 청약철회·해지</h2>
          <p className="text-sm leading-relaxed text-slate-300">
            전자상거래 등에서의 청약철회 규정이 적용되는 경우, 법령이 정한 범위 내에서 청약철회를 요청하실 수 있습니다.
            해지·일시중지 요청은 앱에 표시된 문의 채널 또는 운영 이메일로 접수해 주세요.
          </p>
          <p className="text-sm leading-relaxed text-slate-300">
            <strong className="text-slate-200">구독 유지 옵션:</strong> 완전 해지 전에{' '}
            <strong className="text-white">일시 중지(휴회)</strong>, <strong className="text-white">다운그레이드(플랜 하향)</strong> 등이
            가능한지는 이용 계약·결제 수단·시점에 따라 달라질 수 있습니다. 가능한 조합은 운영 이메일로 문의해 주시면 개별 안내를 드립니다.
          </p>
        </section>

        <section className="space-y-3 rounded-2xl border border-slate-700 bg-slate-800/40 p-5">
          <h2 className="text-lg font-black text-white">3. 환불</h2>
          <p className="text-sm leading-relaxed text-slate-300">
            환불 가능 여부·금액·시점은 이용 계약 및 결제 수단에 따라 달라질 수 있으며, 구체적인 사항은 운영팀이 개별 안내합니다.
          </p>
        </section>

        <section className="space-y-3 rounded-2xl border border-slate-700 bg-slate-800/40 p-5">
          <h2 className="text-lg font-black text-white">4. 개인정보</h2>
          <p className="text-sm leading-relaxed text-slate-300">
            서비스 이용 과정에서 처리되는 개인정보에 관한 사항은 사이트의 개인정보처리방침을 참고해 주세요.
          </p>
          <Link
            href="/info/gym/privacy"
            className="inline-flex text-sm font-bold text-blue-400 hover:underline"
          >
            개인정보처리방침 보기
          </Link>
        </section>

        <p className="text-xs text-slate-500">
          본 문서는 법률 자문을 대체하지 않습니다. 상용 출시 전 법무 검토를 권장합니다.
        </p>

        <p>
          <Link href="/spokedu-pro" className="text-sm font-bold text-blue-400 hover:underline">
            스포키듀 PRO로 돌아가기
          </Link>
        </p>
      </div>
    </div>
  );
}
