'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';
import { inferTrackFromHref } from '../lib/tracking';

type TrackCard = {
  title: string;
  subtitle: string;
  description: string;
  href: string;
  cta: string;
};

type ProgramPreview = {
  name: string;
  description: string;
};

const heroLines = ['움직임으로', '아이의 성장을', '설계합니다'];

const coreTrackCards: TrackCard[] = [
  {
    title: 'Private Class',
    subtitle: '1:1·소그룹 체육수업',
    description: '아이 성향과 속도에 맞춰 몸의 자신감과 기초 움직임을 설계합니다.',
    href: '/private',
    cta: '개인수업 보기',
  },
  {
    title: 'Dispatch Solution',
    subtitle: '기관 파견 체육교육 프로그램',
    description: '기관 운영 목적과 공간에 맞춰 실행 가능한 체육교육을 제안합니다.',
    href: '/dispatch',
    cta: '기관수업 보기',
  },
  {
    title: 'Curriculum & Contents',
    subtitle: '체육수업 커리큘럼·콘텐츠',
    description: '현장 수업을 선생님이 반복 운영 가능한 콘텐츠 시스템으로 만듭니다.',
    href: '/curriculum',
    cta: '커리큘럼 보기',
  },
];

const philosophyItems = [
  {
    code: 'BODY',
    sentence: '기본 움직임을 정확히 익히고, 몸을 스스로 다루는 힘을 키웁니다.',
  },
  {
    code: 'BRAIN',
    sentence: '보고 판단하고 반응하는 과정을 통해 운동을 학습 경험으로 연결합니다.',
  },
  {
    code: 'TOGETHER',
    sentence: '함께 움직이며 규칙과 협력을 익히는 사회적 자신감을 만듭니다.',
  },
];

const proofItems = [
  '스포키듀 LAB',
  '양천거점형키움센터',
  '동작거점형키움센터',
  '다사랑영등포지역아동센터',
  'PLAYZ Lounge',
  '서대문형무소 어린이날 체험 부스',
  '월간 스포키듀',
];

const programPreviews: ProgramPreview[] = [
  { name: 'SPOMOVE', description: '보고 판단하고 반응하는 몰입형 움직임 수업입니다.' },
  { name: 'PAPS', description: '기초체력 요소를 놀이형 학습으로 재구성한 프로그램입니다.' },
  { name: '놀이체육', description: '운동이 낯선 아이도 즐겁게 시작하는 기본 트랙입니다.' },
  { name: '원데이 체육행사', description: '기관 일정과 목적에 맞춘 체험형 단기 프로그램입니다.' },
  { name: '방학캠프', description: '방학 시즌에 맞춘 집중형 체육·협동 프로그램입니다.' },
  { name: '커리큘럼 콘텐츠', description: '선생님 운영 품질을 높이는 수업안·콘텐츠 세트입니다.' },
];

function Section({
  id,
  children,
  className,
  delay = 0,
}: {
  id?: string;
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const reducedMotion = useReducedMotion();
  return (
    <motion.section
      id={id}
      initial={reducedMotion ? false : { opacity: 0, y: 24 }}
      whileInView={reducedMotion ? {} : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.55, ease: 'easeOut', delay }}
      className={className}
    >
      {children}
    </motion.section>
  );
}

export default function SpokeduHomeLanding() {
  const reducedMotion = useReducedMotion();
  const heroVisual = '/images/home/home-hero-class.jpg';

  return (
    <div className="space-y-10 pb-4 sm:space-y-14">
      <Section className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white px-5 pb-6 pt-8 shadow-sm sm:px-10 sm:pb-10 sm:pt-12">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.12),transparent_46%),radial-gradient(circle_at_bottom_right,rgba(15,23,42,0.09),transparent_40%)]" />
        <div className="relative grid gap-7 lg:grid-cols-[1fr_1.05fr] lg:items-center">
          <div className="space-y-5 sm:space-y-6">
            <h1 className="text-[2rem] font-black leading-[1.05] text-slate-950 sm:text-6xl">
              {heroLines.map((line, index) => (
                <motion.span
                  key={line}
                  initial={reducedMotion ? false : { opacity: 0, y: 28 }}
                  animate={reducedMotion ? {} : { opacity: 1, y: 0 }}
                  transition={{ duration: 0.55, ease: 'easeOut', delay: 0.08 * index }}
                  className="block"
                >
                  {line}
                </motion.span>
              ))}
            </h1>
            <p className="max-w-xl text-sm leading-6 text-slate-700 sm:text-base sm:leading-7">
              SPOKEDU는 아이들의 움직임을 교육적으로 설계하고, 그 경험을 수업·커리큘럼·콘텐츠로 확장하는
              아동·청소년 체육교육 브랜드입니다.
            </p>
            <motion.div
              initial={reducedMotion ? false : { opacity: 0, y: 18 }}
              animate={reducedMotion ? {} : { opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.28 }}
              className="grid gap-2.5 sm:flex sm:flex-wrap"
            >
              <Link
                href="/private"
                data-track={inferTrackFromHref('/private')}
                data-track-label="우리 아이 수업 상담하기"
                className="inline-flex items-center justify-center rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-slate-800"
              >
                우리 아이 수업 상담하기
              </Link>
              <Link
                href="/dispatch"
                data-track={inferTrackFromHref('/dispatch')}
                data-track-label="기관 수업 제안 받기"
                className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-900 transition hover:-translate-y-0.5 hover:border-slate-500"
              >
                기관 수업 제안 받기
              </Link>
              <Link
                href="/curriculum"
                data-track={inferTrackFromHref('/curriculum')}
                data-track-label="커리큘럼 콘텐츠 문의"
                className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-900 transition hover:-translate-y-0.5 hover:border-slate-500"
              >
                커리큘럼·콘텐츠 문의
              </Link>
            </motion.div>
          </div>

          <motion.div
            animate={reducedMotion ? {} : { y: [-4, 4, -4] }}
            transition={reducedMotion ? {} : { duration: 8, repeat: Infinity, ease: 'easeInOut' }}
            className="relative h-[240px] overflow-hidden rounded-3xl border border-slate-200 bg-slate-100 sm:h-[360px]"
          >
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${heroVisual})` }}
              aria-label="아이들의 움직임 수업 장면"
              role="img"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/45 via-slate-900/10 to-transparent" />
            <div className="absolute bottom-4 left-4 rounded-xl border border-white/30 bg-white/15 px-3 py-2 text-xs font-medium text-white backdrop-blur-md">
              Real Class Experience
            </div>
          </motion.div>
        </div>
      </Section>

      <Section className="space-y-5" delay={0.05}>
        <div>
          <h2 className="text-2xl font-bold leading-tight text-slate-950 sm:text-4xl">
            아이에게는 수업을,
            <br />
            기관에는 프로그램을,
            <br />
            선생님에게는 커리큘럼을.
          </h2>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {coreTrackCards.map((track) => (
            <article
              key={track.title}
              className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_0_rgba(15,23,42,0.04)] transition hover:-translate-y-1 hover:border-slate-300 hover:shadow-lg"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{track.title}</p>
              <h3 className="mt-2 text-lg font-semibold text-slate-900">{track.subtitle}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{track.description}</p>
              <Link
                href={track.href}
                data-track={inferTrackFromHref(track.href)}
                data-track-label={track.cta}
                className="mt-4 inline-flex items-center text-sm font-semibold text-slate-900 transition group-hover:translate-x-0.5 group-hover:text-indigo-700"
              >
                {track.cta} →
              </Link>
            </article>
          ))}
        </div>
      </Section>

      <Section className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8" delay={0.08}>
        <h2 className="text-2xl font-bold text-slate-950 sm:text-3xl">스포키듀는 체육을 움직임 교육으로 설계합니다</h2>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {philosophyItems.map((item) => (
            <article key={item.code} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-indigo-600">{item.code}</p>
              <p className="mt-2 text-sm leading-6 text-slate-700">{item.sentence}</p>
            </article>
          ))}
        </div>
      </Section>

      <Section className="space-y-4" delay={0.1}>
        <h2 className="text-2xl font-bold text-slate-950 sm:text-3xl">실제 현장에서 아이들을 만나고 있습니다</h2>
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white py-3">
          <div
            className={`proof-marquee flex min-w-max gap-2 px-3 ${reducedMotion ? 'overflow-x-auto pb-1' : ''}`}
            style={reducedMotion ? { animation: 'none' } : undefined}
          >
            {[...proofItems, ...proofItems].map((item, idx) => (
              <div
                key={`${item}-${idx}`}
                className="shrink-0 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700"
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      </Section>

      <Section className="space-y-5" delay={0.12}>
        <div className="flex items-end justify-between gap-3">
          <h2 className="text-2xl font-bold leading-tight text-slate-950 sm:text-4xl">
            수업은 콘텐츠가 되고,
            <br />
            콘텐츠는 커리큘럼이 됩니다
          </h2>
          <Link
            href="/programs"
            data-track={inferTrackFromHref('/programs')}
            data-track-label="프로그램 보기"
            className="hidden rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:-translate-y-0.5 hover:border-slate-500 sm:inline-flex"
          >
            프로그램 보기
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {programPreviews.map((program) => (
            <article
              key={program.name}
              className="rounded-2xl border border-slate-200 bg-white p-4 transition hover:-translate-y-1 hover:border-slate-300"
            >
              <h3 className="text-base font-semibold text-slate-900">{program.name}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{program.description}</p>
            </article>
          ))}
        </div>
        <Link
          href="/programs"
          data-track={inferTrackFromHref('/programs')}
          data-track-label="프로그램 보기"
          className="inline-flex rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:-translate-y-0.5 hover:border-slate-500 sm:hidden"
        >
          프로그램 보기
        </Link>
      </Section>

      <Section className="rounded-3xl border border-slate-900 bg-slate-950 px-5 py-7 text-white sm:px-8 sm:py-10" delay={0.15}>
        <h2 className="text-2xl font-bold sm:text-3xl">지금 필요한 방향을 선택하세요</h2>
        <div className="mt-5 grid gap-2.5 sm:flex sm:flex-wrap">
          <Link
            href="/private"
            data-track={inferTrackFromHref('/private')}
            data-track-label="개인수업 상담"
            className="inline-flex items-center justify-center rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:-translate-y-0.5 hover:bg-slate-200"
          >
            개인수업 상담
          </Link>
          <Link
            href="/dispatch"
            data-track={inferTrackFromHref('/dispatch')}
            data-track-label="기관수업 제안"
            className="inline-flex items-center justify-center rounded-full border border-slate-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:border-slate-400 hover:bg-slate-900"
          >
            기관수업 제안
          </Link>
          <Link
            href="/curriculum"
            data-track={inferTrackFromHref('/curriculum')}
            data-track-label="커리큘럼 문의"
            className="inline-flex items-center justify-center rounded-full border border-slate-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:border-slate-400 hover:bg-slate-900"
          >
            커리큘럼 문의
          </Link>
        </div>
      </Section>

      <style jsx>{`
        @keyframes spokedu-marquee {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(-50%);
          }
        }

        .proof-marquee {
          animation: spokedu-marquee 28s linear infinite;
        }

        @media (prefers-reduced-motion: reduce) {
          .proof-marquee {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}
