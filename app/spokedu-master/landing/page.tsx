import Link from 'next/link';
import { BookOpen, CheckCircle2, ChevronRight, Clock, MapPin, Play, Shield, Timer, Users, Zap } from 'lucide-react';
import { MASTER_PRODUCT_CATALOG } from '../lib/productCatalog';

const FEATURES = [
  {
    icon: BookOpen,
    color: 'rgba(99,102,241,0.18)',
    ic: 'var(--spm-acc)',
    title: '라이브러리',
    desc: '유아부터 초등까지, 실내외 환경에 맞는 100여 개 수업 자료가 즉시 사용 가능한 형태로 정리되어 있습니다. 태그와 검색으로 오늘 쓸 수업을 30초 안에 찾습니다.',
    items: ['연령·환경·준비물 필터', '즐겨찾기와 최근 사용', '수업 준비 키트 연결'],
  },
  {
    icon: Zap,
    color: 'rgba(16,185,129,0.15)',
    ic: 'var(--spm-grn)',
    title: 'SPOMOVE',
    desc: '설치 없이 웹에서 바로 실행하는 화면 기반 반응훈련입니다. 프로젝터·TV·태블릿에 연결하면 아이들이 화면 신호를 보고 몸을 움직입니다.',
    items: ['빔·TV·태블릿 실행', '색상·방향·숫자 신호', '반응 시간 기록'],
  },
  {
    icon: Timer,
    color: 'rgba(245,158,11,0.14)',
    ic: 'var(--spm-amb)',
    title: '수업 도구',
    desc: '수업 중 바로 꺼내 쓰는 타이머, 팀 나누기, 학생 뽑기, 점수판이 한 곳에 있습니다. 수업 흐름을 끊지 않고 진행을 도와줍니다.',
    items: ['스톱워치 · 점수판', '팀 나누기 · 학생 뽑기', '수업 모드 전체화면 실행'],
  },
] as const;

const PRICING = [
  {
    id: 'pro',
    title: 'Pro',
    badge: '가장 인기',
    price: MASTER_PRODUCT_CATALOG.pro.priceLabel.replace(/원$/, ''),
    period: MASTER_PRODUCT_CATALOG.pro.durationLabel,
    desc: '전문 강사가 매주 쓰는 수업 준비 환경',
    includes: ['라이브러리 무제한', 'SPOMOVE 큰 화면 실행', '수업 도구 전체', '안내문 (학부모·기관·학교용)'],
    accent: 'rgba(99,102,241,0.18)',
    border: 'rgba(99,102,241,0.42)',
    badgeColor: 'var(--spm-acc)',
    recommended: true,
  },
  {
    id: 'team',
    title: 'Center',
    badge: '기관·센터용',
    price: MASTER_PRODUCT_CATALOG.center.priceLabel,
    period: MASTER_PRODUCT_CATALOG.center.durationLabel,
    desc: '여러 수업을 운영하는 센터와 기관을 위한 플랜',
    includes: ['Pro 기능 전체', '센터 수업 자료 활용', '기관 제출용 안내문', '추가 계정·기관 도입 별도 문의'],
    accent: 'rgba(16,185,129,0.12)',
    border: 'rgba(16,185,129,0.38)',
    badgeColor: 'var(--spm-grn)',
    recommended: false,
  },
] as const;

const STATS = [
  { label: '수업 프로그램', value: '100+', Icon: BookOpen },
  { label: 'SPOMOVE 공식 활동', value: '4개', Icon: Zap },
  { label: '연령 대상', value: '유아~중등', Icon: Users },
  { label: '수업 공간', value: '실내 · 실외', Icon: MapPin },
];

const FLOW = [
  { num: '1', label: '라이브러리에서 수업 고르기', caption: '태그와 검색으로 오늘 쓸 수업 자료를 30초 안에 찾습니다', color: 'rgba(99,102,241,0.14)', accent: 'var(--spm-acc)' },
  { num: '2', label: 'SPOMOVE 큰 화면 실행', caption: '프로젝터·TV에 연결해 아이들이 화면 신호를 보고 움직입니다', color: 'rgba(16,185,129,0.12)', accent: 'var(--spm-grn)' },
  { num: '3', label: '수업 도구 활용', caption: '타이머, 팀 나누기, 학생 뽑기를 수업 중에 바로 씁니다', color: 'rgba(245,158,11,0.12)', accent: 'var(--spm-amb)' },
] as const;

const HERO_PROOF = [
  { label: 'SPOMOVE 활용', value: '별도 실행', caption: '일부 수업은 활동과 함께 활용 가능' },
  { label: '수업 준비 흐름', value: '3단계', caption: '고르기, 실행하기, 설명하기' },
  { label: '바로 쓰는 자료', value: '5종', caption: '영상, 준비물, 세팅, 문구' },
] as const;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://spokedu.com';

export const metadata = {
  title: 'SPOKEDU MASTER — 체육교육 수업 운영 서비스',
  description: '수업 자료와 영상, SPOMOVE 큰 화면 반응 활동, 안내문을 제공하는 체육교육 30일 이용권 서비스. 14일 무료 체험으로 시작하세요.',
  robots: { index: true, follow: true },
  openGraph: {
    type: 'website' as const,
    url: `${SITE_URL}/spokedu-master/landing`,
    siteName: 'SPOKEDU MASTER',
    title: 'SPOKEDU MASTER — 체육교육 수업 운영 서비스',
    description: '수업 자료와 영상, SPOMOVE 큰 화면 반응 활동, 안내문을 제공하는 체육교육 30일 이용권 서비스. 14일 무료 체험으로 시작하세요.',
    locale: 'ko_KR',
    images: [{ url: `${SITE_URL}/api/spokedu-master/og`, width: 1200, height: 630, alt: 'SPOKEDU MASTER — 체육 강사의 수업 준비 플랫폼' }],
  },
  twitter: {
    card: 'summary_large_image' as const,
    title: 'SPOKEDU MASTER — 체육교육 수업 운영 서비스',
    description: '수업 자료와 영상, SPOMOVE 큰 화면 반응 활동, 안내문을 제공하는 체육교육 30일 이용권 서비스. 14일 무료 체험으로 시작하세요.',
    images: [`${SITE_URL}/api/spokedu-master/og`],
  },
};

export default function LandingPage() {
  return (
    <div className="min-h-dvh" style={{ background: 'var(--spm-bg)', color: 'var(--spm-t)', fontFamily: 'var(--spm-font-body)' }}>
      {/* Nav */}
      <header className="sticky top-0 z-50 flex items-center justify-between border-b px-[22px] py-4 sm:px-10" style={{ background: 'rgba(7,7,12,0.92)', backdropFilter: 'blur(20px)', borderColor: 'var(--spm-br2)' }}>
        <div className="flex items-baseline gap-2">
          <span className="text-[11px] font-black uppercase tracking-[0.18em]" style={{ color: 'var(--spm-t3)' }}>SPOKEDU</span>
          <span className="text-[17px] font-black" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)' }}>MASTER</span>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/spokedu-master/dashboard" className="hidden h-9 items-center rounded-full px-4 text-[12px] font-black sm:flex" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)', color: 'var(--spm-t2)' }}>
            로그인
          </Link>
          <Link href="/login?mode=trial&next=/spokedu-master/onboarding" className="flex h-9 items-center rounded-full px-4 text-[12px] font-black text-white" style={{ background: 'var(--spm-acc)', boxShadow: '0 4px 14px rgba(99,102,241,0.3)' }}>
            무료 체험
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section
        className="relative overflow-hidden px-[22px] pb-8 pt-[74px] sm:px-10 sm:pb-10 sm:pt-[92px]"
        style={{
          backgroundImage: 'linear-gradient(90deg, rgba(7,7,12,0.94) 0%, rgba(7,7,12,0.72) 48%, rgba(7,7,12,0.42) 100%), linear-gradient(0deg, rgba(7,7,12,0.96) 0%, rgba(7,7,12,0.2) 44%), url("/images/spokedu/home/home-hero-movement.jpg")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="mx-auto grid max-w-[1120px] gap-10 lg:grid-cols-[minmax(0,0.92fr)_minmax(320px,0.5fr)] lg:items-end">
          <div className="max-w-[720px]">
            <span className="inline-flex items-center rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em]" style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.22)', color: '#dbeafe' }}>
              체육교육 OTT · 14일 무료 체험
            </span>
            <h1 className="mt-5 text-[46px] font-black leading-[0.98] md:text-[76px]" style={{ fontFamily: 'var(--spm-font-display)', color: '#fff', letterSpacing: 0, wordBreak: 'keep-all' }}>
              SPOKEDU<br />MASTER
            </h1>
            <p className="mt-6 max-w-[640px] text-[19px] font-black leading-8 md:text-[23px]" style={{ color: '#fff', wordBreak: 'keep-all' }}>
              수업 자료와 영상, SPOMOVE 큰 화면 반응 활동, 안내문을 이용합니다.
            </p>
            <p className="mt-4 max-w-[620px] text-[14px] font-semibold leading-7 md:text-[15px]" style={{ color: 'rgba(255,255,255,0.78)' }}>
              오늘 체육수업을 고르고, 체육관 TV에 바로 띄우고, 수업 후 가치를 설명하는 흐름까지 이어지는 한국형 체육수업 운영 서비스입니다.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/login?mode=trial&next=/spokedu-master/onboarding" className="flex h-14 w-full items-center justify-center gap-2 rounded-[14px] text-[16px] font-black text-white sm:w-auto sm:min-w-[200px]" style={{ background: 'var(--spm-acc)', boxShadow: '0 12px 32px rgba(99,102,241,0.36)' }}>
              <Play size={16} fill="#fff" />
              무료 체험으로 수업 열기
            </Link>
            <Link href="#pricing" className="flex h-14 w-full items-center justify-center gap-1.5 rounded-[14px] text-[15px] font-black sm:w-auto sm:min-w-[160px]" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)', color: 'var(--spm-t)' }}>
              서비스 구성 보기 <ChevronRight size={16} />
            </Link>
            </div>
            <p className="mt-4 text-[12px] font-semibold" style={{ color: 'rgba(255,255,255,0.62)' }}>신용카드 없이 시작 · 14일 후 자동 만료 · 결제 후 30일 이용</p>
          </div>
          <div className="grid gap-3">
            {HERO_PROOF.map((item) => (
              <div key={item.label} className="rounded-[16px] p-4" style={{ background: 'rgba(7,7,12,0.58)', border: '1px solid rgba(255,255,255,0.18)', backdropFilter: 'blur(16px)' }}>
                <p className="text-[11px] font-black" style={{ color: 'rgba(255,255,255,0.62)' }}>{item.label}</p>
                <p className="mt-1 text-[28px] font-black leading-none" style={{ color: '#fff', fontFamily: 'var(--spm-font-display)' }}>{item.value}</p>
                <p className="mt-2 text-[12px] font-semibold" style={{ color: 'rgba(255,255,255,0.74)' }}>{item.caption}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats strip */}
      <section className="border-y px-[22px] py-8 sm:px-10" style={{ borderColor: 'var(--spm-br2)', background: 'var(--spm-s2)' }}>
        <div className="mx-auto grid max-w-[960px] grid-cols-2 gap-6 sm:grid-cols-4">
          {STATS.map(({ label, value, Icon }) => (
            <div key={label} className="text-center">
              <Icon size={20} color="var(--spm-acc)" className="mx-auto mb-2" />
              <p className="text-[24px] font-black" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)' }}>{value}</p>
              <p className="mt-1 text-[11px] font-semibold" style={{ color: 'var(--spm-t3)' }}>{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 3-step flow */}
      <section className="px-[22px] py-[80px] sm:px-10">
        <div className="mx-auto max-w-[960px]">
          <p className="mb-2 text-center text-[11px] font-black uppercase tracking-[0.16em]" style={{ color: 'var(--spm-acc)' }}>수업 루프</p>
          <h2 className="mb-12 text-center text-[32px] font-black md:text-[42px]" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)', wordBreak: 'keep-all' }}>오늘 수업이 3단계로 완성됩니다</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {FLOW.map(({ num, label, caption, color, accent }) => (
              <div key={num} className="rounded-[20px] p-6" style={{ background: color, border: `1px solid ${color}` }}>
                <span className="mb-4 grid h-10 w-10 place-items-center rounded-full text-[16px] font-black text-white" style={{ background: accent }}>{num}</span>
                <h3 className="text-[18px] font-black" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)' }}>{label}</h3>
                <p className="mt-2 text-[13px] font-medium leading-6" style={{ color: 'var(--spm-t2)' }}>{caption}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t px-[22px] py-[80px] sm:px-10" style={{ borderColor: 'var(--spm-br2)' }}>
        <div className="mx-auto max-w-[960px]">
          <p className="mb-2 text-center text-[11px] font-black uppercase tracking-[0.16em]" style={{ color: 'var(--spm-acc)' }}>핵심 기능</p>
          <h2 className="mb-14 text-center text-[32px] font-black md:text-[42px]" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)', wordBreak: 'keep-all' }}>수업 준비의 모든 단계</h2>
          <div className="grid gap-6 md:grid-cols-3">
            {FEATURES.map(({ icon: Icon, color, ic, title, desc, items }) => (
              <div key={title} className="rounded-[22px] p-6" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
                <span className="mb-5 grid h-12 w-12 place-items-center rounded-[15px]" style={{ background: color }}>
                  <Icon size={22} color={ic} />
                </span>
                <h3 className="text-[20px] font-black" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)' }}>{title}</h3>
                <p className="mt-3 text-[13px] font-medium leading-6" style={{ color: 'var(--spm-t2)' }}>{desc}</p>
                <ul className="mt-5 space-y-2">
                  {items.map((item) => (
                    <li key={item} className="flex items-center gap-2 text-[12px] font-semibold" style={{ color: 'var(--spm-t2)' }}>
                      <CheckCircle2 size={13} color={ic} strokeWidth={2} />{item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="border-t px-[22px] py-[80px] sm:px-10" style={{ borderColor: 'var(--spm-br2)', background: 'var(--spm-s2)' }}>
        <div className="mx-auto max-w-[760px]">
          <p className="mb-2 text-center text-[11px] font-black uppercase tracking-[0.16em]" style={{ color: 'var(--spm-acc)' }}>플랜과 가격</p>
          <h2 className="mb-4 text-center text-[32px] font-black md:text-[42px]" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)', wordBreak: 'keep-all' }}>수업 품질에 맞는 플랜</h2>
          <p className="mb-12 text-center text-[14px] font-medium" style={{ color: 'var(--spm-t3)' }}>14일 무료 체험 후 선택 · 결제 후 30일 이용</p>
          <div className="grid gap-5 md:grid-cols-2">
            {PRICING.map((p) => (
              <div key={p.id} className="rounded-[22px] p-6" style={{ background: p.accent, border: `1.5px solid ${p.border}` }}>
                {p.recommended ? (
                  <span className="mb-3 inline-block rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.1em]" style={{ background: 'rgba(99,102,241,0.22)', color: p.badgeColor }}>{p.badge}</span>
                ) : (
                  <span className="mb-3 inline-block rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.1em]" style={{ background: 'rgba(16,185,129,0.14)', color: p.badgeColor }}>{p.badge}</span>
                )}
                <div className="flex items-end justify-between">
                  <h3 className="text-[26px] font-black" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)' }}>{p.title}</h3>
                  <div className="text-right">
                    <span className="text-[24px] font-black" style={{ color: 'var(--spm-t)' }}>{p.price}원</span>
                    <span className="ml-1 text-[12px]" style={{ color: 'var(--spm-t3)' }}>/{p.period}</span>
                  </div>
                </div>
                <p className="mt-2 text-[13px] font-medium" style={{ color: 'var(--spm-t2)' }}>{p.desc}</p>
                <ul className="mt-5 space-y-2.5">
                  {p.includes.map((item) => (
                    <li key={item} className="flex items-center gap-2 text-[13px] font-semibold" style={{ color: 'var(--spm-t2)' }}>
                      <CheckCircle2 size={14} color="var(--spm-grn)" strokeWidth={2} />{item}
                    </li>
                  ))}
                </ul>
                <Link href={p.id === 'team' ? 'mailto:support@spokedu.com?subject=SPOKEDU%20MASTER%20Center%20%EB%8F%84%EC%9E%85%20%EC%83%81%EB%8B%B4' : '/spokedu-master/profile?plans=1'} className="mt-6 flex h-12 w-full items-center justify-center rounded-[13px] text-[14px] font-black text-white" style={{ background: p.recommended ? 'var(--spm-acc)' : 'rgba(16,185,129,0.8)', boxShadow: p.recommended ? '0 8px 24px rgba(99,102,241,0.32)' : 'none' }}>
                  {p.id === 'team' ? 'Center 도입 상담' : `${p.title} 플랜 보기`}
                </Link>
              </div>
            ))}
          </div>
          <div className="mt-8 flex items-start gap-3 rounded-[14px] px-5 py-4" style={{ background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.16)' }}>
            <Shield size={16} color="var(--spm-grn)" className="mt-0.5 shrink-0" />
            <p className="text-[12px] font-semibold leading-6" style={{ color: 'var(--spm-t2)' }}>
              토스페이먼츠 보안 결제 · 결제 후 30일 이용 · 플랜 변경은 문의 기반으로 처리 · 카드 정보는 SPOKEDU 서버에 저장되지 않습니다.
            </p>
          </div>
          <p className="mt-5 text-center text-[13px] font-medium" style={{ color: 'var(--spm-t3)' }}>
            학교와 기관 도입은 <a href="mailto:support@spokedu.com" style={{ color: 'var(--spm-acc)' }}>support@spokedu.com</a>으로 문의해 주세요.
          </p>
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-t px-[22px] py-[80px] text-center sm:px-10" style={{ borderColor: 'var(--spm-br2)' }}>
        <div className="mx-auto max-w-[560px]">
          <h2 className="text-[32px] font-black md:text-[40px]" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)', wordBreak: 'keep-all' }}>
            오늘 첫 수업을 골라보세요
          </h2>
          <p className="mt-4 text-[14px] font-medium leading-7" style={{ color: 'var(--spm-t2)' }}>
            14일 무료 체험으로 라이브러리, SPOMOVE, 수업 도구를 경험해보세요.
          </p>
          <Link href="/login?mode=trial&next=/spokedu-master/onboarding" className="mt-8 inline-flex h-14 items-center gap-2 rounded-[14px] px-8 text-[16px] font-black text-white" style={{ background: 'var(--spm-acc)', boxShadow: '0 12px 32px rgba(99,102,241,0.36)' }}>
            <Play size={16} fill="#fff" />
            14일 무료 체험 시작
          </Link>
          <p className="mt-3 text-[12px] font-semibold" style={{ color: 'var(--spm-t3)' }}>신용카드 없이 시작 · 14일 후 자동 만료</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t px-[22px] py-10 sm:px-10" style={{ borderColor: 'var(--spm-br2)', background: 'var(--spm-s2)' }}>
        <div className="mx-auto max-w-[960px]">
          <div className="mb-8 flex items-baseline gap-2">
            <span className="text-[11px] font-black uppercase tracking-[0.18em]" style={{ color: 'var(--spm-t3)' }}>SPOKEDU</span>
            <span className="text-[17px] font-black" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)' }}>MASTER</span>
          </div>
          <div className="mb-8 grid gap-x-8 gap-y-2 sm:grid-cols-[auto_1fr]">
            <p className="text-[10px] font-black uppercase tracking-[0.1em]" style={{ color: 'var(--spm-t3)' }}>사업자 정보</p>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
              {[
                ['상호', '스포케듀'],
                ['대표자', '최지훈'],
                ['사업자등록번호', '311-63-00356'],
                ['통신판매업신고', '신청 중'],
                ['주소', '서울특별시 강동구 성내동 430-2, 7층 2호'],
                ['고객센터', 'support@spokedu.com'],
              ].map(([label, value]) => (
                <div key={label} className="contents">
                  <dt className="text-[10px] font-semibold" style={{ color: 'var(--spm-t3)' }}>{label}</dt>
                  <dd className="text-[10px] font-medium" style={{ color: 'var(--spm-t2)' }}>{value}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px]" style={{ color: 'var(--spm-t3)' }}>
            <Link href="/spokedu-master/terms" style={{ color: 'var(--spm-t3)' }}>이용약관</Link>
            <Link href="/spokedu-master/privacy" style={{ color: 'var(--spm-t3)' }}>개인정보처리방침</Link>
            <a href="mailto:support@spokedu.com" style={{ color: 'var(--spm-t3)' }}>고객센터</a>
          </div>
          <p className="mt-4 text-[10px]" style={{ color: 'var(--spm-t3)' }}>
            <Clock size={10} className="mr-1 inline" />가격과 기능은 공지 없이 변경될 수 있습니다. 결제 전 최신 플랜 내용을 확인해 주세요.
          </p>
        </div>
      </footer>
    </div>
  );
}
