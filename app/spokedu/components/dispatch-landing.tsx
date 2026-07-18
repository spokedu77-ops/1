'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';
import { HOME_MEDIA } from '../data/home-media';
import { dispatchPage } from '../data/dispatch-page';
import { inferTrackFromHref } from '../lib/tracking';
import {
  audienceLandingStack,
  cardInteractive,
  fineHover,
  koreanLineBreak,
  landingCardShell,
} from '../lib/ui-classes';
import { DispatchComparisonSection } from './dispatch-comparison-section';
import { DispatchProgramLineup } from './dispatch-program-lineup';
import { DispatchProposalForm } from './dispatch-proposal-form';
import { HomeSectionRule } from './home-section-rule';
import { LandingAnchorNav } from './landing-anchor-nav';
import { LandingFaqList } from './landing-faq-list';
import { LandingFloatingCta } from './landing-floating-cta';
import { LandingSectionHeading } from './landing-section-heading';
import { LandingStepPanel } from './landing-step-grid';
import { LandingFinalCta } from './landing-final-cta';
import { LandingHero } from './landing-hero';
import { MediaPanel } from './visual';

const focusRing =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600';

const institutionCardShell = `flex h-full flex-col px-4 py-4 sm:px-5 sm:py-5 ${landingCardShell}`;
const dispatchHeroChecks = ['공간·인원 확인', '운영 목적 설계', '강사·교구 투입'] as const;
const dispatchAnchorItems = [
  { href: '#comparison', label: '차별성' },
  { href: '#programs', label: '프로그램' },
  { href: '#process', label: '도입 절차' },
  { href: '#faq', label: 'FAQ' },
] as const;
const dispatchPromiseCards = [
  {
    title: '전공자 기반 커리큘럼',
    body: '체육교육 전공 운영진이 현장 조건과 대상 연령에 맞춰 수업 흐름을 설계합니다.',
  },
  {
    title: '검증 강사 파견',
    body: '단기 인력 매칭이 아니라 스포키듀 수업 기준을 이해한 강사가 투입됩니다.',
  },
  {
    title: '운영 리스크 대응',
    body: '공간, 인원, 결강, 대체 수업까지 기관 담당자가 걱정하는 운영 변수를 같이 봅니다.',
  },
] as const;
const dispatchDecisionChecks = [
  '대상 연령과 참여 인원',
  '수업 공간과 이동 동선',
  '정기·원데이·방학 운영 방식',
  '특수 아동 포함 여부',
] as const;

const reviewAccentBorder = {
  violet: 'border-l-teal-500',
  sky: 'border-l-teal-600',
  lime: 'border-l-teal-400',
} as const;

function Section({
  children,
  className = '',
  delay = 0,
  id,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  id?: string;
}) {
  const reducedMotion = useReducedMotion();
  return (
    <motion.section
      id={id}
      initial={reducedMotion ? false : { opacity: 0, y: 12 }}
      whileInView={reducedMotion ? {} : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.12 }}
      transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1], delay }}
      className={className}
    >
      {children}
    </motion.section>
  );
}

export default function DispatchLanding() {
  return (
    <div className={`${audienceLandingStack} pb-24`}>
      <div id="hero">
      <LandingHero
        kicker={dispatchPage.hero.kicker}
        kickerClassName="text-stone-500"
        leading={
          <div className="rounded-2xl border border-teal-100 bg-teal-50/60 p-4 sm:max-w-xl">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal-800">For Institutions</p>
            <ul className="mt-3 grid gap-2 sm:grid-cols-3" aria-label="기관 프로그램 제안 기준">
              {dispatchHeroChecks.map((item) => (
                <li key={item} className="rounded-xl bg-white px-3 py-2 text-xs font-semibold text-slate-700">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        }
        lines={dispatchPage.hero.lines}
        subtitle={dispatchPage.hero.subtitle}
        media={HOME_MEDIA[dispatchPage.hero.mediaKey]}
        visualVariant="editorial"
        priority
        primaryCta={dispatchPage.heroCtas.primary}
        secondaryCta={dispatchPage.heroCtas.secondary}
      />
      </div>

      <LandingAnchorNav
        items={dispatchAnchorItems}
        cta={{ href: '#contact', label: '제안서 요청' }}
        ariaLabel="기관 랜딩 바로가기"
      />

      <Section className="border-y border-stone-200 bg-white py-8 sm:py-10">
        <span className="inline-flex items-center rounded-full bg-teal-600/10 px-3.5 py-1.5 text-xs font-semibold text-teal-900">
          연세대 체육교육학과 출신 운영진
        </span>
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-stone-500 mt-6">
          {dispatchPage.trustMetrics.eyebrow}
        </p>
        <dl className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-3 sm:gap-8">
          {dispatchPage.trustMetrics.items.map((item) => (
            <div key={item.label}>
              <dt className="text-2xl font-bold tracking-tight text-stone-950 sm:text-[1.75rem]">{item.value}</dt>
              <dd className={`mt-1 text-sm text-stone-600 ${koreanLineBreak}`}>{item.label}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section className="rounded-2xl bg-[#0B1220] px-5 py-7 text-white sm:px-7 sm:py-8">
        <div className="grid gap-5 lg:grid-cols-[0.38fr_0.62fr] lg:items-start lg:gap-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal-300">Institution Program</p>
            <h2 className="mt-3 text-2xl font-black leading-tight tracking-tight sm:text-3xl [word-break:keep-all]">
              시키는 수업이 아니라, 움직이게 만드는 운영안을 제안합니다.
            </h2>
            <p className={`mt-4 text-sm leading-relaxed text-white/70 ${koreanLineBreak}`}>
              기관 담당자가 비교하는 기준은 강사, 커리큘럼, 결강 대응, 운영 안정성입니다.
              SPOKEDU는 이 기준을 먼저 확인하고 현장에 맞는 운영안을 제안합니다.
            </p>
            <a
              href="#process"
              className={`mt-5 inline-flex min-h-11 items-center justify-center rounded-full bg-white px-4 text-sm font-bold text-slate-950 ${fineHover}hover:bg-teal-50 ${focusRing}`}
            >
              도입 절차 보기
            </a>
          </div>
          <div className="space-y-3">
            <ul className="grid gap-3 sm:grid-cols-3">
              {dispatchPromiseCards.map((item) => (
                <li key={item.title} className="rounded-xl border border-white/10 bg-white/[0.06] p-4">
                  <h3 className="text-sm font-bold text-white">{item.title}</h3>
                  <p className={`mt-2 text-xs leading-relaxed text-white/65 ${koreanLineBreak}`}>{item.body}</p>
                </li>
              ))}
            </ul>
            <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal-200">Before Proposal</p>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {dispatchDecisionChecks.map((item) => (
                  <li key={item} className="rounded-lg bg-white/[0.06] px-3 py-2 text-xs font-semibold text-white/80">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </Section>

      <HomeSectionRule />

      <Section className="space-y-5 sm:space-y-6">
        <LandingSectionHeading
          eyebrow={dispatchPage.partnerReviews.eyebrow}
          title={dispatchPage.partnerReviews.title}
          accent="teal"
        />
        <div className="grid gap-3 sm:gap-4 lg:grid-cols-3">
          {dispatchPage.partnerReviews.items.map((item) => (
            <article
              key={item.name}
              className={`flex h-full flex-col border-l-4 p-4 sm:p-5 ${landingCardShell} ${reviewAccentBorder[item.accent]}`}
            >
              <p className="text-sm text-amber-500" aria-hidden>
                ★★★★★
              </p>
              <h3 className={`mt-2.5 text-[15px] font-semibold leading-snug text-slate-950 sm:text-base ${koreanLineBreak}`}>
                &ldquo;{item.quote}&rdquo;
              </h3>
              <p className={`mt-2 flex-1 text-sm leading-relaxed text-slate-600 ${koreanLineBreak}`}>{item.body}</p>
              <div className="mt-3.5 border-t border-slate-100 pt-3">
                <p className="text-sm font-semibold text-slate-950">{item.name}</p>
                <p className="mt-0.5 text-xs text-teal-800">{item.org}</p>
              </div>
            </article>
          ))}
        </div>
      </Section>

      <Section id="comparison" className="scroll-mt-36">
        <DispatchComparisonSection />
      </Section>

      <HomeSectionRule />

      <Section className="space-y-5 sm:space-y-6">
        <LandingSectionHeading eyebrow={dispatchPage.whoFits.eyebrow} title={dispatchPage.whoFits.title} accent="teal" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-3.5 lg:grid-cols-3">
          {dispatchPage.whoFits.items.map((item) => (
            <article key={item.title} className={institutionCardShell}>
              <h3 className={`text-[15px] font-semibold text-slate-900 sm:text-base ${koreanLineBreak}`}>
                {item.title}
              </h3>
              <p className={`mt-2 text-sm leading-relaxed text-slate-600 ${koreanLineBreak}`}>{item.description}</p>
            </article>
          ))}
        </div>
      </Section>

      <Section className="rounded-2xl border border-stone-200/80 bg-white px-4 py-5 sm:px-6 sm:py-6">
        <LandingSectionHeading
          eyebrow={dispatchPage.smallSpace.eyebrow}
          title={dispatchPage.smallSpace.title}
          accent="teal"
        />
        <p className={`mt-2 text-[15px] font-semibold text-slate-950 sm:text-lg ${koreanLineBreak}`}>
          {dispatchPage.smallSpace.lead}
        </p>
        <p className={`mt-2 max-w-3xl text-sm leading-relaxed text-slate-600 ${koreanLineBreak}`}>
          {dispatchPage.smallSpace.description}
        </p>
        <ul className="mt-3.5 grid gap-2 sm:grid-cols-3 sm:gap-2.5">
          {dispatchPage.smallSpace.criteria.map((item) => (
            <li
              key={item}
              className={`rounded-xl border border-stone-200 bg-[#FAFAF8] px-3 py-2.5 text-sm leading-snug text-stone-700 sm:px-3.5 sm:py-3 ${koreanLineBreak}`}
            >
              {item}
            </li>
          ))}
        </ul>
      </Section>

      <Section className="rounded-2xl border border-stone-200/80 bg-[#FAFAF8] px-4 py-5 sm:px-6 sm:py-6">
        <LandingSectionHeading
          eyebrow={dispatchPage.coreCurriculum.eyebrow}
          title={dispatchPage.coreCurriculum.title}
          accent="teal"
        />
        <div className="mt-3 space-y-2">
          {dispatchPage.coreCurriculum.paragraphs.map((p) => (
            <p key={p} className={`text-sm leading-relaxed text-slate-700 sm:text-[15px] ${koreanLineBreak}`}>
              {p}
            </p>
          ))}
        </div>
      </Section>

      <Section id="programs" className="scroll-mt-36">
        <DispatchProgramLineup />
      </Section>

      <HomeSectionRule />

      <Section className="space-y-5 sm:space-y-6">
        <LandingSectionHeading
          eyebrow={dispatchPage.operationTypes.eyebrow}
          title={dispatchPage.operationTypes.title}
          accent="teal"
        />
        <div className="grid gap-4 lg:grid-cols-[1fr_1.05fr] lg:items-stretch lg:gap-5">
          <div className="grid gap-2.5">
            {dispatchPage.operationTypes.rows.map((row) => (
              <article key={row.label} className={`px-4 py-3.5 sm:px-5 sm:py-4 ${landingCardShell}`}>
                <h3 className="text-[15px] font-semibold text-slate-950 sm:text-base">{row.label}</h3>
                <p className={`mt-1.5 text-sm leading-relaxed text-slate-600 ${koreanLineBreak}`}>{row.description}</p>
              </article>
            ))}
          </div>
          <MediaPanel
            media={HOME_MEDIA[dispatchPage.operationTypes.mediaKey]}
            className="aspect-[16/11] min-h-[200px] rounded-[1.25rem] border-slate-200/80 lg:min-h-full"
          />
        </div>
      </Section>

      <Section className="space-y-5 sm:space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <LandingSectionHeading eyebrow={dispatchPage.examples.eyebrow} title={dispatchPage.examples.title} accent="teal" />
          <Link
            href={dispatchPage.examples.href}
            data-track={inferTrackFromHref(dispatchPage.examples.href)}
            data-track-label={dispatchPage.examples.trackLabel}
            className={`shrink-0 text-sm font-semibold text-teal-800 ${fineHover}hover:text-teal-900 ${focusRing}`}
          >
            사례 전체 →
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-3.5">
          {dispatchPage.examples.items.map((item, index) => (
            <Link
              key={item.venue}
              href={item.href}
              data-track={inferTrackFromHref(item.href)}
              data-track-label={`dispatch-example-${item.venue}`}
              className={`group relative block aspect-[4/3] overflow-hidden rounded-2xl border border-slate-200/90 shadow-sm sm:aspect-[4/5] ${cardInteractive} ${focusRing}`}
            >
              <MediaPanel
                media={HOME_MEDIA[item.mediaKey]}
                className="absolute inset-0 h-full w-full rounded-none border-0"
                photoPriority={index === 0}
              />
              <div
                className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-900/55 via-slate-900/10 to-transparent"
                aria-hidden
              />
              <div className="absolute inset-x-3 bottom-3 rounded-xl border border-white/60 bg-white/95 p-3 sm:inset-x-2.5 sm:bottom-2.5">
                <h3 className={`text-sm font-bold leading-snug text-slate-950 ${koreanLineBreak}`}>{item.venue}</h3>
                <p className={`mt-1 text-xs font-medium text-teal-900 ${koreanLineBreak}`}>
                  {item.audience} · {item.operation}
                </p>
                <p className={`mt-1 text-xs leading-snug text-slate-600 ${koreanLineBreak}`}>{item.activity}</p>
              </div>
            </Link>
          ))}
        </div>
      </Section>

      <Section id="process" className="scroll-mt-36">
        <LandingStepPanel steps={dispatchPage.processSteps.steps} accent="teal" columns="5">
          <LandingSectionHeading
            eyebrow={dispatchPage.processSteps.eyebrow}
            title={dispatchPage.processSteps.title}
            lead={dispatchPage.processSteps.lead}
            accent="teal"
          />
        </LandingStepPanel>
      </Section>

      <Section id="faq" className="scroll-mt-36 space-y-5 sm:space-y-6">
        <LandingSectionHeading eyebrow={dispatchPage.faq.eyebrow} title={dispatchPage.faq.title} accent="teal" />
        <LandingFaqList items={dispatchPage.faq.items} accent="teal" />
      </Section>

      <HomeSectionRule />

      <Section>
        <DispatchProposalForm />
      </Section>

      <LandingFinalCta
        title={dispatchPage.finalCta.title}
        description={dispatchPage.finalCta.description}
        tone="dark"
        backgroundMedia={HOME_MEDIA[dispatchPage.finalCta.mediaKey]}
        links={[{ ...dispatchPage.finalCta.primary, variant: 'on-dark-primary' }]}
      />

      <LandingFloatingCta
        primaryHref="#contact"
        primaryLabel="제안서 요청하기"
        secondaryHref="https://pf.kakao.com/_VGWxeb/chat"
        secondaryLabel="카카오 B2B 상담"
        showAfterId="hero"
      />
    </div>
  );
}
