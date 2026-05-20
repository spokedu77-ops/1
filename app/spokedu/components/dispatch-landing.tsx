'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';
import { SPOKEDU_IMAGES } from '../data/images';
import { cardInteractive, landingH1, landingHeroShell, landingPageStack, linkMuted } from '../lib/ui-classes';
import { HeroCtaStack } from './hero-cta-stack';
import { landingCardShell, type LandingCardVariant } from './visual/card-variants';
import { SpokeduHeroVisual } from './spokedu-hero-visual';
import { SpokeduImage } from './spokedu-image';

const heroLines = ['기관의 공간, 인원, 운영 목적에 맞춰', '파견형 체육교육 프로그램을', '제안합니다'];

const programCards = [
  { title: '정규수업', description: '주간 운영 리듬에 맞춘 반복형 파견 수업입니다.' },
  { title: '원데이 체육행사', description: '행사 일정에 맞춘 체험형 단기 프로그램입니다.' },
  { title: '방학캠프', description: '방학 시즌 집중 운영이 가능한 확장형 구성입니다.' },
  { title: 'SPOMOVE', description: '몰입형 반응 활동으로 참여도를 높이는 에듀테크 수업입니다.' },
  { title: 'PAPS', description: '기초체력 요소를 놀이 중심으로 재구성한 프로그램입니다.' },
];

const fitCards = [
  {
    title: '공간 맞춤',
    description: '실내 활동실, 강당, 체육관 조건에 맞게 동선을 설계합니다.',
  },
  {
    title: '인원 맞춤',
    description: '소그룹부터 대규모까지 대기 시간을 줄이는 운영으로 구성합니다.',
  },
  {
    title: '운영 목적 맞춤',
    description: '정규 운영, 행사 운영, 체력 강화 목적에 맞춰 프로그램을 조합합니다.',
  },
];

const processSteps = ['운영 조건 접수', '대상·공간·인원 분석', '프로그램 제안서 전달', '일정·운영 확정', '현장 운영', '후속 리포트'];

const useCases = ['유치원·어린이집', '키움센터·지역아동센터', '학교·방과후 기관', '키즈 복합공간'];

function Section({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const reducedMotion = useReducedMotion();
  return (
    <motion.section
      initial={reducedMotion ? false : { opacity: 0, y: 14 }}
      whileInView={reducedMotion ? {} : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.45, ease: 'easeOut', delay }}
      className={className}
    >
      {children}
    </motion.section>
  );
}

export default function DispatchLanding() {
  const reducedMotion = useReducedMotion();
  const dispatchInquiry = '/spokedu/contact?type=dispatch';

  return (
    <div className={landingPageStack}>
      <Section className={`${landingHeroShell} border-slate-800 bg-slate-950 text-white`}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.2),transparent_44%),radial-gradient(circle_at_bottom_right,rgba(148,163,184,0.14),transparent_42%)]" />
        <div className="relative grid gap-5 lg:grid-cols-[1fr_1.05fr] lg:items-center lg:gap-7">
          <div className="space-y-4 sm:space-y-6">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-300">기관 담당자 · 파견형 체육교육</p>
            <h1 className={`${landingH1} text-white`}>
              {heroLines.map((line, index) => (
                <motion.span
                  key={line}
                  initial={reducedMotion ? false : { opacity: 0, y: 26 }}
                  animate={reducedMotion ? {} : { opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, ease: 'easeOut', delay: 0.08 * index }}
                  className="block"
                >
                  {line}
                </motion.span>
              ))}
            </h1>
            <p className="max-w-xl text-sm leading-6 text-slate-300 sm:text-base sm:leading-7">
              정규수업·원데이·캠프·SPOMOVE·PAPS를 기관 공간·인원·운영 목적에 맞춰 제안합니다.
            </p>
            <div className="lg:hidden">
              <SpokeduHeroVisual
                image={SPOKEDU_IMAGES.dispatch.groupClass}
                tone="cool"
                className="relative h-[min(48vw,220px)] overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 sm:h-[240px]"
              />
            </div>
            <HeroCtaStack
              variant="dark"
              primary={{ href: dispatchInquiry, label: '제안서 문의', trackLabel: 'dispatch-cta-proposal' }}
              secondary={[{ href: dispatchInquiry, label: '기관 수업 제안', trackLabel: 'dispatch-cta-program' }]}
            />
            <p className="text-xs leading-5 text-slate-400 sm:text-sm">
              가정·소그룹 개인수업은{' '}
              <Link href="/spokedu/private" data-track="cta-private" data-track-label="dispatch-to-private" className={linkMuted}>
                개인·소그룹 수업 안내
              </Link>
              를 확인해 주세요.
            </p>
          </div>
          <div className="hidden lg:block">
            <motion.div
              animate={reducedMotion ? {} : { y: [-4, 4, -4] }}
              transition={reducedMotion ? {} : { duration: 8, repeat: Infinity, ease: 'easeInOut' }}
            >
              <SpokeduHeroVisual
                image={SPOKEDU_IMAGES.dispatch.groupClass}
                tone="cool"
                className="relative h-[240px] overflow-hidden rounded-3xl border border-slate-700 bg-slate-900 sm:h-[360px]"
              />
            </motion.div>
          </div>
        </div>
      </Section>

      <Section className="space-y-5" delay={0.05}>
        <h2 className="text-xl font-bold leading-snug text-slate-950 sm:text-3xl">운영 프로그램</h2>
        <p className="text-sm text-slate-600">정규수업부터 SPOMOVE·PAPS까지 기관 조건에 맞게 조합합니다.</p>
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-5">
          {programCards.map((item, index) => {
            const variants: LandingCardVariant[] = ['image', 'dark', 'glass', 'gradient', 'image'];
            return (
            <article
              key={item.title}
              className={`rounded-2xl p-4 sm:p-5 ${landingCardShell(variants[index] ?? 'image')} ${cardInteractive}`}
            >
              <h3 className="text-base font-semibold text-slate-900">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
            </article>
          );
          })}
        </div>
      </Section>

      <Section className="space-y-3" delay={0.07}>
        <h2 className="text-xl font-bold text-slate-950 sm:text-2xl">현장 운영 장면</h2>
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          <SpokeduImage asset={SPOKEDU_IMAGES.dispatch.groupClass} alt={SPOKEDU_IMAGES.dispatch.groupClass.alt} className="aspect-[4/3] rounded-2xl" />
          <SpokeduImage asset={SPOKEDU_IMAGES.dispatch.oneDayEvent} alt={SPOKEDU_IMAGES.dispatch.oneDayEvent.alt} className="aspect-[4/3] rounded-2xl" />
        </div>
      </Section>

      <Section className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8" delay={0.08}>
        <h2 className="text-xl font-bold text-slate-950 sm:text-2xl">공간·인원·운영 목적 맞춤</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {fitCards.map((item, index) => (
            <article
              key={item.title}
              className={`rounded-2xl p-4 ${landingCardShell((['dark', 'glass', 'gradient'] as const)[index] ?? 'image')}`}
            >
              <h3 className="text-sm font-semibold text-slate-900">{item.title}</h3>
              <p className="mt-1.5 text-sm leading-6 text-slate-600">{item.description}</p>
            </article>
          ))}
        </div>
      </Section>

      <Section className="space-y-4" delay={0.1}>
        <h2 className="text-xl font-bold text-slate-950 sm:text-2xl">운영 프로세스</h2>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {processSteps.map((step, index) => (
            <div key={step} className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-indigo-600">Step {index + 1}</p>
              <p className="mt-1.5 text-sm font-medium leading-6 text-slate-700">{step}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section className="space-y-4" delay={0.12}>
        <h2 className="text-xl font-bold text-slate-950 sm:text-2xl">적용 기관 예시</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {useCases.map((item) => (
            <div key={item} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700">
              {item}
            </div>
          ))}
        </div>
      </Section>

      <Section className="rounded-2xl border border-slate-900 bg-slate-950 px-4 py-6 text-white sm:rounded-3xl sm:px-8 sm:py-10" delay={0.15}>
        <h2 className="text-xl font-bold sm:text-3xl">기관 운영에 맞는 제안서를 받아보세요</h2>
        <p className="mt-2 text-sm text-slate-400">대상·공간·인원·일정을 알려주시면 맞춤 제안서를 준비합니다.</p>
        <div className="mt-4 sm:mt-5">
          <HeroCtaStack
            variant="dark"
            primary={{ href: dispatchInquiry, label: '제안서 문의', trackLabel: 'dispatch-final-proposal' }}
            secondary={[{ href: dispatchInquiry, label: '기관 수업 제안', trackLabel: 'dispatch-final-program' }]}
          />
        </div>
      </Section>
    </div>
  );
}
