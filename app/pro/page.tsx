import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'SPOKEDU PRO | 체육교육 수업 준비·운영·설명',
  description:
    '체육교육자를 위한 수업 준비·운영·설명 플랫폼. 프로그램 라이브러리, SPOMOVE 반응훈련, 성장 리포트와 보조 기능을 한곳에서.',
};

function SectionShell({
  id,
  className = '',
  children,
}: {
  id?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className={`relative scroll-mt-20 ${className}`}>
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">{children}</div>
    </section>
  );
}

function PrimaryCta({ className = '' }: { className?: string }) {
  return (
    <Link
      href="/pro/apply"
      className={`inline-flex min-h-[48px] items-center justify-center rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-3 text-sm font-black text-white shadow-lg shadow-cyan-900/30 transition hover:brightness-110 ${className}`}
    >
      베타 관장단 신청하기
    </Link>
  );
}

function SecondaryCta({ className = '' }: { className?: string }) {
  return (
    <Link
      href="/pro/apply?type=inquiry"
      className={`inline-flex min-h-[48px] items-center justify-center rounded-2xl border border-white/15 bg-white/5 px-6 py-3 text-sm font-black text-white backdrop-blur-sm transition hover:bg-white/10 ${className}`}
    >
      도입 문의하기
    </Link>
  );
}

function HeroMockCard() {
  return (
    <div className="relative w-full max-w-md mx-auto lg:mx-0">
      <div
        aria-hidden
        className="absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-fuchsia-500/25 via-cyan-500/20 to-violet-600/25 blur-2xl"
      />
      <div className="relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-slate-900/80 shadow-2xl shadow-black/50 backdrop-blur-xl">
        <div className="border-b border-white/10 px-4 py-3 flex items-center justify-between gap-2">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-200/90">SPOKEDU PRO</span>
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold text-slate-300">3축</span>
        </div>
        <div className="grid grid-cols-2 gap-2 p-4">
          <div className="aspect-square rounded-2xl bg-gradient-to-br from-fuchsia-400 to-fuchsia-600 shadow-inner shadow-black/20" />
          <div className="aspect-square rounded-2xl bg-gradient-to-br from-cyan-300 to-cyan-600 shadow-inner shadow-black/20" />
          <div className="aspect-square rounded-2xl bg-gradient-to-br from-lime-300 to-emerald-600 shadow-inner shadow-black/20" />
          <div className="aspect-square rounded-2xl bg-gradient-to-br from-orange-300 to-orange-600 shadow-inner shadow-black/20" />
        </div>
        <div className="px-4 pb-4">
          <div className="rounded-xl border border-white/10 bg-black/40 px-3 py-2.5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Preview</p>
            <p className="text-sm font-black text-white mt-0.5">라이브러리 · SPOMOVE · 리포트</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProLandingPage() {
  return (
    <div className="min-h-[var(--viewport-height-px,100dvh)] bg-[#050509] text-slate-100 selection:bg-violet-500/40 selection:text-white">
      {/* 배경 */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -left-[20%] top-[-18%] h-[480px] w-[480px] rounded-full bg-fuchsia-600/15 blur-[120px]" />
        <div className="absolute right-[-15%] top-[8%] h-[520px] w-[520px] rounded-full bg-cyan-500/12 blur-[130px]" />
        <div className="absolute bottom-[-20%] left-[25%] h-[420px] w-[420px] rounded-full bg-violet-600/14 blur-[110px]" />
        <div
          className="absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
            maskImage: 'radial-gradient(ellipse at top, black, transparent 72%)',
          }}
        />
      </div>

      <div className="relative z-10">
        {/* Hero */}
        <SectionShell className="pt-10 pb-16 sm:pt-14 sm:pb-20 lg:pt-20 lg:pb-28">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-center">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-cyan-200/90">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.9)]" />
                SPOKEDU PRO
              </p>
              <h1 className="mt-6 text-3xl font-black leading-[1.12] tracking-tight text-white sm:text-4xl lg:text-5xl">
                SPOKEDU PRO는
                <br />
                <span className="bg-gradient-to-r from-fuchsia-300 via-cyan-200 to-violet-300 bg-clip-text text-transparent">
                  체육 수업 준비·화면 기반 활동·학부모 설명을 한곳에서 돕는 구독 서비스
                </span>
                입니다.
              </h1>
              <p className="mt-6 max-w-xl text-base leading-relaxed text-slate-300 sm:text-lg">
                <span className="font-semibold text-slate-200">
                  수업 준비는 쉽게, 수업은 더 몰입감 있게, 학부모 설명은 더 전문적으로.
                </span>
                <br className="hidden sm:block" />
                프로그램 라이브러리·SPOMOVE·리포트와 보조 기능을 한 흐름에서 다룹니다.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                <PrimaryCta className="w-full sm:w-auto" />
                <SecondaryCta className="w-full sm:w-auto" />
              </div>
              <p className="mt-6 max-w-xl text-sm leading-relaxed text-slate-500">
                별도 전용 장비 없이 TV·빔프로젝터·태블릿으로 시작할 수 있습니다.
                <br />
                체육·놀이 현장과 학교, 기관에서 활용하기 좋게 구성했습니다. 베타 신청 후 14일 프리미엄 체험을 안내드립니다.
              </p>
            </div>
            <HeroMockCard />
          </div>
        </SectionShell>

        {/* 3축 소개 */}
        <SectionShell className="border-t border-white/5 py-16 sm:py-20">
          <h2 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
            SPOKEDU PRO의 세 가지 축
          </h2>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {[
              {
                title: '1. 프로그램 라이브러리',
                body: '영상과 핵심 진행법 중심으로 수업 프로그램을 빠르게 확인하고 꺼내 쓰세요.',
              },
              {
                title: '2. SPOMOVE (반응훈련)',
                body: '라이브러리와 이어 쓰는 스크린 활동으로, 수업 전 집중 전환이나 순발력 등에 활용하세요.',
              },
              {
                title: '3. 추가 기능 · 성장 리포트',
                body: '수업 운영을 돕는 보조 기능과, 아이의 변화를 정리해 학부모·기관에 설명할 수 있는 리포트입니다.',
              },
            ].map((c) => (
              <div
                key={c.title}
                className="rounded-2xl border border-cyan-500/20 bg-gradient-to-b from-cyan-950/30 to-slate-950/40 p-5"
              >
                <h3 className="text-lg font-black text-cyan-100">{c.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-300">{c.body}</p>
              </div>
            ))}
          </div>
        </SectionShell>

        {/* 실제 사용 흐름 */}
        <SectionShell className="border-t border-white/5 bg-black/25 py-16 sm:py-20">
          <h2 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
            실제 사용 흐름
          </h2>
          <p className="mt-3 max-w-3xl text-sm text-slate-400 sm:text-base">
            긴 수업안을 외우기보다, 영상·진행 요약으로 빠르게 확인하고 현장에 가져가 SPOMOVE·보조 기능까지 한 번에 쓰는 흐름입니다.
          </p>
          <ol className="mt-10 grid gap-4 md:grid-cols-3">
            {[
              '라이브러리에서 이번 주 프로그램을 고름',
              '강사가 모바일로 영상·진행 요약을 확인',
              '현장에서 SPOMOVE·보조 기능을 함께 활용',
            ].map((step, i) => (
              <li
                key={step}
                className="relative rounded-2xl border border-white/10 bg-white/[0.04] p-5 pt-8"
              >
                <span className="absolute left-5 top-4 flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 text-sm font-black text-white">
                  {i + 1}
                </span>
                <p className="mt-6 text-sm font-semibold leading-relaxed text-slate-200">{step}</p>
              </li>
            ))}
          </ol>
        </SectionShell>

        {/* 가격 / 베타 */}
        <SectionShell id="pricing" className="py-16 sm:py-20">
          <h2 className="text-2xl font-black tracking-tight text-white sm:text-3xl">상황에 맞게 시작하세요.</h2>
          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.05] p-6 sm:p-8 shadow-2xl shadow-black/40 backdrop-blur-sm">
              <h3 className="text-xl font-black text-white">Library</h3>
              <p className="mt-2 text-3xl font-black text-white">월 49,900원</p>
              <p className="mt-2 text-sm text-slate-400">프로그램 라이브러리 + 보조 기능 중심</p>
              <p className="mt-6 text-xs font-bold uppercase tracking-wider text-slate-500">포함</p>
              <ul className="mt-3 space-y-2 text-sm text-slate-300">
                {[
                  '프로그램 라이브러리 150개+',
                  '영상·진행 가이드',
                  '매월 콘텐츠 업데이트',
                  '수업 보조도구',
                ].map((x) => (
                  <li key={x} className="flex gap-2">
                    <span className="text-emerald-400">✓</span>
                    {x}
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative rounded-[1.75rem] border border-amber-400/25 bg-gradient-to-b from-amber-950/20 to-slate-950/60 p-6 sm:p-8 shadow-2xl shadow-black/40">
              <span className="absolute -top-3 right-6 rounded-full bg-amber-500 px-3 py-1 text-xs font-black text-slate-950 shadow">
                추천
              </span>
              <h3 className="text-xl font-black text-white">All-in-One</h3>
              <p className="mt-2 text-3xl font-black text-white">월 79,900원</p>
              <p className="mt-2 text-sm text-slate-400">라이브러리 + SPOMOVE + 성장 리포트를 함께 쓰는 플랜</p>
              <p className="mt-6 text-xs font-bold uppercase tracking-wider text-slate-500">포함</p>
              <ul className="mt-3 space-y-2 text-sm text-slate-300">
                {[
                  'Library 기능 전체 포함',
                  'SPOMOVE 반응훈련 50개+',
                  '스크린 전체화면 실행',
                  '주간 추천 구성(대시보드)',
                  '원생 성장 리포트',
                ].map((x) => (
                  <li key={x} className="flex gap-2">
                    <span className="text-emerald-400">✓</span>
                    {x}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <p className="mt-8 text-center text-xs text-slate-500 sm:text-sm">
            베타 관장단 한정 가격입니다. 정식 출시 시 가격이 변경될 수 있습니다.
          </p>
        </SectionShell>

        {/* FAQ */}
        <SectionShell className="border-t border-white/5 py-16 sm:py-20">
          <h2 className="text-2xl font-black tracking-tight text-white sm:text-3xl">자주 묻는 질문</h2>
          <dl className="mt-10 space-y-4">
            {[
              {
                q: '별도 장비가 필요한가요?',
                a: '별도 전용 장비는 필요하지 않습니다. TV, 빔프로젝터, 태블릿, 노트북 등 화면을 띄울 수 있는 환경이면 시작할 수 있습니다.',
              },
              {
                q: '체육·놀이 수업에 어떻게 녹이나요?',
                a: '유치부 워밍업, 초등부 순발력·집중 전환, 캠프·방학 활동, 학부모 설명 자료와 함께 쓰기 좋습니다.',
              },
              {
                q: '강사도 같이 쓸 수 있나요?',
                a: '도장 운영 방식에 맞춰 강사용 계정 또는 접속 방식을 안내드릴 예정입니다.',
              },
              {
                q: '플랜 구성이 헷갈려요.',
                a: 'Library는 라이브러리·보조 기능 중심, All-in-One은 SPOMOVE와 리포트까지 포함합니다. 도입 전 문의로 맞춤 안내가 가능합니다.',
              },
              {
                q: '무료체험이 있나요?',
                a: '14일 프리미엄 체험으로 핵심 기능을 먼저 사용해볼 수 있습니다.',
              },
            ].map((item) => (
              <div
                key={item.q}
                className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 sm:px-5 sm:py-5"
              >
                <dt className="text-sm font-black text-white sm:text-base">Q. {item.q}</dt>
                <dd className="mt-2 text-sm leading-relaxed text-slate-400">A. {item.a}</dd>
              </div>
            ))}
          </dl>
        </SectionShell>

        {/* 마지막 CTA */}
        <SectionShell className="border-t border-white/5 pb-20 pt-12 sm:pb-28 sm:pt-16">
          <div className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-slate-900/90 via-violet-950/40 to-cyan-950/30 p-8 text-center shadow-2xl shadow-black/50 sm:p-12">
            <h2 className="text-2xl font-black tracking-tight text-white sm:text-3xl">이번 주 수업부터 바로 바꿔보세요.</h2>
            <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <PrimaryCta />
              <SecondaryCta />
            </div>
            <p className="mt-6 text-xs text-slate-500 sm:text-sm">베타 관장단은 한정 모집으로 운영됩니다.</p>
          </div>
          <p className="mt-10 text-center text-xs text-slate-600">
            <Link href="/spokedu-master/terms" className="font-bold text-slate-500 underline-offset-2 hover:text-slate-400 hover:underline">
              구독·청약철회·환불 안내
            </Link>
          </p>
        </SectionShell>
      </div>
    </div>
  );
}
