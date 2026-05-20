'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';
import { SPOKEDU_IMAGES } from '../data/images';
import { inferTrackFromHref } from '../lib/tracking';
import { btnPrimaryOnDark, cardInteractive, landingH1, landingHeroShell, landingPageStack, linkMuted } from '../lib/ui-classes';
import { HeroCtaStack } from './hero-cta-stack';
import { ProofMarqueeStrip } from './proof-marquee-strip';
import { SpokeduHeroVisual } from './spokedu-hero-visual';

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
  href: string;
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
    subtitle: '기관 파견 체육교육',
    description: '기관 운영 목적과 공간에 맞춰 실행 가능한 체육교육을 제안합니다.',
    href: '/dispatch',
    cta: '기관수업 보기',
  },
  {
    title: 'Curriculum & Contents',
    subtitle: '체육 커리큘럼·콘텐츠',
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
  '양천 키움센터',
  '동작 키움센터',
  '영등포 다사랑지역아동센터',
  'PLAYZ Lounge',
  '서대문형무소 체험',
  '월간 스포키듀',
] as const;

const programPreviews: ProgramPreview[] = [
  {
    name: 'SPOMOVE',
    description: '보고 판단하고 반응하는 몰입형 움직임 수업입니다.',
    href: '/spokedu/programs/spomove',
  },
  {
    name: 'PAPS',
    description: '기초체력 요소를 놀이형 학습으로 재구성한 프로그램입니다.',
    href: '/spokedu/programs/paps',
  },
  {
    name: '놀이체육',
    description: '운동이 낯선 아이도 즐겁게 시작하는 기본 트랙입니다.',
    href: '/spokedu/contact?type=private',
  },
  {
    name: '원데이 체육행사',
    description: '기관 일정과 목적에 맞춘 체험형 단기 프로그램입니다.',
    href: '/spokedu/programs/oneday-event',
  },
  {
    name: '방학캠프',
    description: '방학 시즌에 맞춘 집중형 체육·협동 프로그램입니다.',
    href: '/spokedu/programs/camp',
  },
  {
    name: '커리큘럼 콘텐츠',
    description: '선생님 운영 품질을 높이는 수업안·콘텐츠 세트입니다.',
    href: '/spokedu/curriculum',
  },
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
      initial={reducedMotion ? false : { opacity: 0, y: 14 }}
      whileInView={reducedMotion ? {} : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.45, ease: 'easeOut', delay }}
      className={className}
    >
      {children}
    </motion.section>
  );
}

export default function SpokeduHomeLanding() {
  const reducedMotion = useReducedMotion();
  return (
    <div className={`${landingPageStack} pb-0 sm:pb-0`}>
      <Section className={`${landingHeroShell} border-slate-200 bg-white`}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.12),transparent_46%),radial-gradient(circle_at_bottom_right,rgba(15,23,42,0.09),transparent_40%)]" />
        <div className="relative grid gap-5 lg:grid-cols-[1fr_1.05fr] lg:items-center lg:gap-7">
          <div className="space-y-4 sm:space-y-6">
            <h1 className={`${landingH1} text-slate-950`}>
              {heroLines.map((line, index) => (
                <motion.span
                  key={line}
                  initial={reducedMotion ? false : { opacity: 0, y: 20 }}
                  animate={reducedMotion ? {} : { opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, ease: 'easeOut', delay: 0.06 * index }}
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
            <HeroCtaStack
              primary={{
                href: '/spokedu/contact?type=private',
                label: '우리 아이 수업 상담하기',
                track: 'cta-private-hero',
              }}
              secondary={[
                {
                  href: '/spokedu/contact?type=dispatch',
                  label: '기관 수업 제안',
                  track: 'cta-dispatch-hero',
                },
                {
                  href: '/spokedu/contact?type=curriculum',
                  label: '커리큘럼 문의',
                  track: 'cta-curriculum-hero',
                },
              ]}
            />
          </div>

          <div className="hidden lg:block">
            <motion.div
              animate={reducedMotion ? {} : { y: [-4, 4, -4] }}
              transition={reducedMotion ? {} : { duration: 8, repeat: Infinity, ease: 'easeInOut' }}
            >
              <SpokeduHeroVisual image={SPOKEDU_IMAGES.home.hero} badge="Real Class Experience" />
            </motion.div>
          </div>
        </div>
      </Section>

      <Section className="space-y-4 sm:space-y-5" delay={0.05}>
        <h2 className="text-xl font-bold leading-snug text-slate-950 sm:text-4xl sm:leading-tight">
          아이에게는 수업을,
          <br />
          기관에는 프로그램을,
          <br className="sm:hidden" />
          <span className="hidden sm:inline">
            <br />
          </span>
          선생님에게는 커리큘럼을.
        </h2>
        <div className="grid gap-2.5 sm:gap-3 md:grid-cols-3">
          {coreTrackCards.map((track) => (
            <article
              key={track.title}
              className={`group rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_1px_0_rgba(15,23,42,0.04)] sm:p-5 ${cardInteractive}`}
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 sm:text-xs sm:tracking-[0.14em]">
                {track.title}
              </p>
              <h3 className="mt-1.5 text-base font-semibold leading-snug text-slate-900 sm:mt-2 sm:text-lg">{track.subtitle}</h3>
              <p className="mt-1.5 line-clamp-2 text-sm leading-5 text-slate-600 sm:mt-2 sm:line-clamp-none sm:leading-6">
                {track.description}
              </p>
              <Link
                href={track.href}
                data-track={inferTrackFromHref(track.href)}
                data-track-label={track.cta}
                className={`mt-3 inline-flex items-center text-sm font-semibold text-slate-900 sm:mt-4 ${linkMuted}`}
              >
                {track.cta} →
              </Link>
            </article>
          ))}
        </div>
      </Section>

      <Section className="rounded-2xl border border-slate-200 bg-white p-4 sm:rounded-3xl sm:p-8" delay={0.08}>
        <h2 className="text-xl font-bold text-slate-950 sm:text-3xl">스포키듀는 체육을 움직임 교육으로 설계합니다</h2>
        <div className="mt-4 grid gap-2.5 sm:mt-5 sm:gap-3 md:grid-cols-3">
          {philosophyItems.map((item) => (
            <article key={item.code} className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 sm:rounded-2xl sm:p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-indigo-600">{item.code}</p>
              <p className="mt-1.5 text-sm leading-5 text-slate-700 sm:mt-2 sm:leading-6">{item.sentence}</p>
            </article>
          ))}
        </div>
      </Section>

      <Section className="space-y-3 sm:space-y-4" delay={0.1}>
        <h2 className="text-xl font-bold text-slate-950 sm:text-3xl">실제 현장에서 아이들을 만나고 있습니다</h2>
        <ProofMarqueeStrip items={proofItems} />
      </Section>

      <Section className="space-y-4 sm:space-y-5" delay={0.12}>
        <div className="flex items-end justify-between gap-3">
          <h2 className="text-xl font-bold leading-snug text-slate-950 sm:text-4xl sm:leading-tight">
            수업은 콘텐츠가 되고,
            <br />
            콘텐츠는 커리큘럼이 됩니다
          </h2>
          <Link
            href="/programs"
            data-track={inferTrackFromHref('/programs')}
            data-track-label="프로그램 보기"
            className="hidden shrink-0 rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-900 sm:inline-flex"
          >
            프로그램 보기
          </Link>
        </div>
        <div className="grid gap-2.5 sm:grid-cols-2 sm:gap-3 lg:grid-cols-3">
          {programPreviews.map((program) => (
            <Link
              key={program.name}
              href={program.href}
              data-track={inferTrackFromHref(program.href)}
              data-track-label={`home-program-${program.name}`}
              className={`block rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-4 ${cardInteractive}`}
            >
              <h3 className="text-sm font-semibold text-slate-900 sm:text-base">{program.name}</h3>
              <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-slate-600 sm:text-sm sm:leading-6">{program.description}</p>
            </Link>
          ))}
        </div>
        <Link
          href="/programs"
          data-track={inferTrackFromHref('/programs')}
          data-track-label="프로그램 보기"
          className="inline-flex rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-900 sm:hidden"
        >
          프로그램 보기
        </Link>
      </Section>

      <Section
        className="rounded-2xl border border-slate-900 bg-slate-950 px-4 py-7 text-white sm:rounded-3xl sm:px-8 sm:py-11"
        delay={0.15}
      >
        <h2 className="text-xl font-bold sm:text-3xl">지금 필요한 방향을 선택하세요</h2>
        <p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">유형별로 맞는 상담으로 연결합니다.</p>
        <div className="mt-4 sm:mt-5">
          <Link
            href="/spokedu/contact"
            data-track="cta-contact"
            data-track-label="home-final-contact"
            className={btnPrimaryOnDark}
          >
            문의 유형 선택하기
          </Link>
        </div>
        <p className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-sm text-slate-400">
          <Link href="/spokedu/private" data-track="cta-private" className="text-slate-200 underline-offset-2 hover:underline">
            개인수업
          </Link>
          <span aria-hidden>·</span>
          <Link href="/spokedu/dispatch" data-track="cta-dispatch" className="text-slate-200 underline-offset-2 hover:underline">
            기관 파견
          </Link>
          <span aria-hidden>·</span>
          <Link href="/spokedu/curriculum" data-track="cta-curriculum" className="text-slate-200 underline-offset-2 hover:underline">
            커리큘럼
          </Link>
        </p>
      </Section>

    </div>
  );
}
