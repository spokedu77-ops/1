'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';
import { HOME_MEDIA, HOME_PROOF_FIELDS, type HomeMediaItem } from '../data/home-media';
import { inferTrackFromHref } from '../lib/tracking';
import { homeFinalCta } from '../data/site';
import { cardInteractive, fineHover, landingH1, landingHeroShell, landingPageStack } from '../lib/ui-classes';
import { HeroCtaStack } from './hero-cta-stack';
import { MediaPanel, MediaRenderer, MotionPoster, ProgramShowcase, ProofFieldWall } from './visual';

const focusRing =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500';

type HeroChoice = {
  audience: string;
  title: string;
  href: string;
  track: string;
};

type TrackCard = {
  badge: string;
  title: string;
  description: string;
  href: string;
  cta: string;
  media: HomeMediaItem;
  trackLabel: string;
};

const heroLines = ['움직임으로', '아이의 성장을', '설계합니다'];

const heroChoices: HeroChoice[] = [
  {
    audience: '학부모라면',
    title: '우리 아이 개인·소그룹 수업 상담',
    href: '/spokedu/private',
    track: 'cta-home-private-choice',
  },
  {
    audience: '기관 담당자라면',
    title: '정규수업·원데이·캠프 제안 요청',
    href: '/spokedu/dispatch',
    track: 'cta-home-dispatch-choice',
  },
  {
    audience: '강사·파트너라면',
    title: '커리큘럼·콘텐츠 문의',
    href: '/spokedu/curriculum',
    track: 'cta-home-curriculum-choice',
  },
];

const coreTrackCards: TrackCard[] = [
  {
    badge: 'For Parents',
    title: '아이에게 맞춘 1:1·소그룹 체육수업',
    description: '운동을 싫어하는 아이도 자기 속도로 움직임을 시작합니다.',
    href: '/spokedu/private',
    cta: '개인수업 보기',
    media: HOME_MEDIA.trackPrivate,
    trackLabel: 'cta-home-private-track',
  },
  {
    badge: 'For Institutions',
    title: '기관에 맞춘 파견형 체육교육',
    description: '공간·인원·목적에 맞춰 정규수업과 행사를 제안합니다.',
    href: '/spokedu/dispatch',
    cta: '기관수업 보기',
    media: HOME_MEDIA.trackDispatch,
    trackLabel: 'cta-home-dispatch-track',
  },
  {
    badge: 'For Teachers & Partners',
    title: '체육수업 커리큘럼·콘텐츠',
    description: '현장 수업을 수업안, 매뉴얼, 강사교육 콘텐츠로 만듭니다.',
    href: '/spokedu/curriculum',
    cta: '커리큘럼 보기',
    media: HOME_MEDIA.trackCurriculum,
    trackLabel: 'cta-home-curriculum-track',
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

function HeroChoiceCards() {
  return (
    <div className="grid gap-2 sm:grid-cols-3 sm:gap-2.5" role="navigation" aria-label="방문 목적 선택">
      {heroChoices.map((choice) => (
        <Link
          key={choice.href}
          href={choice.href}
          data-track={inferTrackFromHref(choice.href)}
          data-track-label={choice.track}
          className={`group block rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition active:scale-[0.99] ${cardInteractive} ${focusRing} ${fineHover}hover:border-indigo-200 ${fineHover}hover:bg-indigo-50/40`}
        >
          <p className="text-[11px] font-semibold text-indigo-600 sm:text-xs">{choice.audience}</p>
          <p className="mt-1 line-clamp-2 text-sm font-semibold leading-snug text-slate-900">{choice.title}</p>
        </Link>
      ))}
    </div>
  );
}

export default function SpokeduHomeLanding() {
  const reducedMotion = useReducedMotion();

  return (
    <div className={`${landingPageStack} pb-0 sm:pb-0`}>
      <Section className={`${landingHeroShell} border-slate-200 bg-white`}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.14),transparent_46%),radial-gradient(circle_at_bottom_right,rgba(15,23,42,0.08),transparent_42%)]" />
        <div className="relative grid gap-5 lg:grid-cols-[1fr_1.05fr] lg:items-start lg:gap-7">
          <div className="order-1 space-y-4 sm:space-y-5">
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
              학부모·기관·강사 중 지금 필요한 방향을 골라 바로 이동하세요.
            </p>
            <div className="lg:hidden">
              <MotionPoster media={HOME_MEDIA.homeHero} variant="compact" />
            </div>
            <HeroChoiceCards />
            <HeroCtaStack
              primary={{
                href: '/spokedu/contact?type=private',
                label: '우리 아이 수업 상담하기',
                track: 'cta-private',
                trackLabel: 'cta-home-private-hero',
              }}
              secondary={[
                {
                  href: '/spokedu/contact?type=dispatch',
                  label: '기관 수업 제안',
                  track: 'cta-dispatch',
                  trackLabel: 'cta-home-dispatch-hero',
                },
                {
                  href: '/spokedu/contact?type=curriculum',
                  label: '커리큘럼 문의',
                  track: 'cta-curriculum',
                  trackLabel: 'cta-home-curriculum-hero',
                },
              ]}
            />
          </div>
          <div className="order-2 hidden lg:block">
            <MotionPoster media={HOME_MEDIA.homeHero} variant="hero" />
          </div>
        </div>
      </Section>

      <Section className="space-y-4 sm:space-y-5" delay={0.05}>
        <h2 className="text-xl font-bold leading-snug text-slate-950 sm:text-3xl sm:leading-tight">
          목적에 맞는 입구를 선택하세요
        </h2>
        <div className="grid gap-2.5 sm:gap-3 md:grid-cols-3">
          {coreTrackCards.map((track, index) => (
            <motion.div
              key={track.href}
              initial={reducedMotion ? false : { opacity: 0, y: 12 }}
              whileInView={reducedMotion ? {} : { opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.4, ease: 'easeOut', delay: 0.06 * index }}
            >
              <Link
                href={track.href}
                data-track={inferTrackFromHref(track.href)}
                data-track-label={track.trackLabel}
                className={`group flex h-full min-h-[280px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_0_rgba(15,23,42,0.04)] sm:min-h-[300px] ${cardInteractive} ${focusRing}`}
              >
                <MediaPanel
                  media={track.media}
                  className="aspect-[16/10] shrink-0 rounded-none border-0 border-b border-slate-200/80 sm:aspect-[16/9]"
                />
                <div className="flex flex-1 flex-col p-3.5 sm:p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-indigo-600 sm:text-[11px]">
                    {track.badge}
                  </p>
                  <h3 className="mt-1.5 text-base font-semibold leading-snug text-slate-900">{track.title}</h3>
                  <p className="mt-1 line-clamp-2 text-sm leading-5 text-slate-600">{track.description}</p>
                  <span className="mt-auto inline-flex items-center pt-3 text-sm font-semibold text-slate-900 group-hover:text-indigo-700">
                    {track.cta}
                    <span className="ml-1 transition group-hover:translate-x-0.5" aria-hidden>
                      →
                    </span>
                  </span>
                </div>
              </Link>
            </motion.div>
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
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-slate-950 sm:text-3xl">실제 현장에서 아이들을 만나고 있습니다</h2>
          <p className="max-w-2xl text-sm leading-6 text-slate-600">
            스포키듀는 수업을 말로만 설명하지 않습니다.
            <br />
            LAB에서 준비하고, 현장에서 운영하고, 그 경험을 기록과 커리큘럼으로 정리합니다.
          </p>
        </div>
        <ProofFieldWall fields={HOME_PROOF_FIELDS} />
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-4">
          <p className="text-sm leading-5 text-slate-600">
            실제 수업 사례와 월간 스포키듀 기록을 확인할 수 있습니다.
          </p>
          <Link
            href="/spokedu/records"
            data-track={inferTrackFromHref('/spokedu/records')}
            data-track-label="cta-home-proof-section-records"
            className={`inline-flex min-h-10 shrink-0 items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 ${focusRing} ${fineHover}hover:-translate-y-0.5 ${fineHover}hover:border-slate-400 ${fineHover}hover:shadow-md`}
          >
            현장기록 보기
          </Link>
        </div>
      </Section>

      <Section className="space-y-3 sm:space-y-4" delay={0.12}>
        <div className="space-y-2">
          <h2 className="text-xl font-bold leading-snug text-slate-950 sm:text-4xl sm:leading-tight">
            수업은 콘텐츠가 되고,
            <br />
            콘텐츠는 커리큘럼이 됩니다
          </h2>
          <p className="max-w-2xl text-sm leading-6 text-slate-600">
            SPOMOVE, PAPS, 놀이체육, 원데이, 캠프, 커리큘럼 콘텐츠는
            <br />
            아이·기관·선생님을 연결하는 스포키듀의 수업 자산입니다.
          </p>
        </div>
        <ProgramShowcase />
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-4">
          <p className="text-sm leading-5 text-slate-600">상세 프로그램은 대상과 공간, 운영 목적에 맞춰 조합됩니다.</p>
          <Link
            href="/spokedu/programs"
            data-track={inferTrackFromHref('/spokedu/programs')}
            data-track-label="cta-home-programs-all"
            className={`inline-flex min-h-10 shrink-0 items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 ${focusRing} ${fineHover}hover:-translate-y-0.5 ${fineHover}hover:border-slate-400 ${fineHover}hover:shadow-md`}
          >
            프로그램 전체 보기
          </Link>
        </div>
      </Section>

      <Section
        className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 px-5 py-9 text-white shadow-xl ring-1 ring-white/10 sm:rounded-3xl sm:px-10 sm:py-12"
        delay={0.15}
      >
        <div className="pointer-events-none absolute inset-0 opacity-80" aria-hidden>
          <MediaRenderer media={HOME_MEDIA.finalCta} intensity="soft" className="h-full w-full" />
        </div>
        <div className="pointer-events-none absolute inset-0 bg-slate-950/85" aria-hidden />
        <div className="relative max-w-2xl">
          <h2 className="text-2xl font-bold tracking-tight sm:text-4xl">{homeFinalCta.title}</h2>
          <p className="mt-3 text-sm leading-6 text-slate-200 sm:text-base sm:leading-7">{homeFinalCta.subtitle}</p>
          <div className="mt-5 sm:mt-6">
            <HeroCtaStack
              variant="dark"
              primary={{
                href: homeFinalCta.primary.href,
                label: homeFinalCta.primary.label,
                trackLabel: homeFinalCta.primary.trackLabel,
              }}
              secondary={homeFinalCta.secondary.map((item) => ({
                href: item.href,
                label: item.label,
                trackLabel: item.trackLabel,
              }))}
            />
          </div>
        </div>
      </Section>
    </div>
  );
}
