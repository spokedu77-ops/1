'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';
import { HOME_MEDIA } from '../data/home-media';
import { dispatchPage } from '../data/dispatch-page';
import { inferTrackFromHref } from '../lib/tracking';
import { cardInteractive, fineHover, koreanLineBreak } from '../lib/ui-classes';
import { AudienceTrustStrip } from './audience-trust-strip';
import { DispatchComparisonSection } from './dispatch-comparison-section';
import { DispatchProgramLineup } from './dispatch-program-lineup';
import { DispatchProposalForm } from './dispatch-proposal-form';
import { LandingAnchorNav } from './landing-anchor-nav';
import { LandingFaqList } from './landing-faq-list';
import { LandingFloatingCta } from './landing-floating-cta';
import { LandingSectionHeading } from './landing-section-heading';
import { LandingStepPanel } from './landing-step-grid';
import { LandingHero } from './landing-hero';
import { MediaPanel } from './visual';
import { KAKAO_CHANNEL_URL } from '../data/external-channels';

const focusRing =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600';

const premiumPanel =
  'overflow-hidden rounded-[1.5rem] border border-stone-200/70 bg-white shadow-[0_18px_50px_-36px_rgba(15,23,42,0.45)]';
const premiumPanelDark =
  'overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#0F1C1A] text-white shadow-[0_18px_50px_-36px_rgba(15,23,42,0.55)]';
const whoCardShell =
  'flex h-full flex-col rounded-2xl border border-stone-200/80 bg-stone-50/70 px-4 py-3.5';
const reviewCardShell = `flex h-full flex-col border-l-[3px] border-l-teal-700 px-5 py-4 sm:px-5 sm:py-5 ${premiumPanel}`;

const dispatchHeroChecks = ['공간·인원 확인', '운영 목적 설계', '강사·교구 투입'] as const;
const dispatchAnchorItems = [
  { href: '#comparison', label: '차별성' },
  { href: '#programs', label: '프로그램' },
  { href: '#process', label: '도입 절차' },
  { href: '#faq', label: '자주 묻는 질문' },
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
      initial={reducedMotion ? false : { opacity: 0, y: 10 }}
      whileInView={reducedMotion ? {} : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.12 }}
      transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1], delay }}
      className={className}
    >
      {children}
    </motion.section>
  );
}

function MidConsultCta() {
  return (
    <div className="relative overflow-hidden rounded-[1.5rem] bg-[#0F1C1A] px-6 py-6 text-white sm:px-8 sm:py-7">
      <div
        className="pointer-events-none absolute -right-10 top-0 h-40 w-40 rounded-full bg-teal-400/20 blur-3xl"
        aria-hidden
      />
      <div className="relative flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-center">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-teal-200/90">운영 상담</p>
          <p className={`mt-2 text-lg font-semibold tracking-tight sm:text-xl ${koreanLineBreak}`}>
            공간·인원·일정만 알려주시면, 맞는 운영안부터 제안합니다.
          </p>
        </div>
        <a
          href="#contact"
          className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-2xl bg-white px-6 text-sm font-bold text-[#0F1C1A] transition hover:bg-teal-50"
        >
          기관 운영 상담
        </a>
      </div>
    </div>
  );
}

export default function DispatchLanding() {
  return (
    <div className="flex w-full flex-col gap-8 pb-24 sm:gap-10 lg:gap-12">
      <div id="hero">
        <LandingHero
          kicker={dispatchPage.hero.kicker}
          kickerClassName="text-stone-500"
          leading={
            <div className="rounded-2xl border border-teal-100 bg-teal-50/60 p-4 sm:max-w-xl">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal-800">기관 담당자</p>
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
        cta={{ href: '#contact', label: '기관 운영 상담' }}
        ariaLabel="기관 랜딩 바로가기"
      />

      <Section>
        <AudienceTrustStrip
          badge="연세대 체육교육학과 출신 운영진"
          eyebrow={dispatchPage.trustMetrics.eyebrow}
          items={dispatchPage.trustMetrics.items}
        />
      </Section>

      <Section className={`${premiumPanelDark} px-5 py-6 sm:px-7 sm:py-7`}>
        <div className="grid gap-5 lg:grid-cols-[0.38fr_0.62fr] lg:items-start lg:gap-7">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal-300">기관 프로그램</p>
            <h2 className="mt-2.5 text-xl font-black leading-tight tracking-tight sm:text-2xl [word-break:keep-all]">
              시키는 수업이 아니라, 움직이게 만드는 운영안을 제안합니다.
            </h2>
            <p className={`mt-3 text-sm leading-relaxed text-white/70 ${koreanLineBreak}`}>
              기관 담당자가 비교하는 기준은 강사, 커리큘럼, 결강 대응, 운영 안정성입니다. SPOKEDU는 이 기준을
              먼저 확인하고 현장에 맞는 운영안을 제안합니다.
            </p>
            <a
              href="#process"
              className={`mt-4 inline-flex min-h-11 items-center justify-center rounded-2xl bg-white px-4 text-sm font-bold text-slate-950 ${fineHover}hover:bg-teal-50 ${focusRing}`}
            >
              도입 절차 보기
            </a>
          </div>
          <div className="space-y-3">
            <ul className="grid gap-2.5 sm:grid-cols-3">
              {dispatchPromiseCards.map((item) => (
                <li key={item.title} className="rounded-xl border border-white/10 bg-white/[0.06] p-3.5 sm:p-4">
                  <h3 className="text-sm font-bold text-white">{item.title}</h3>
                  <p className={`mt-1.5 text-xs leading-relaxed text-white/75 ${koreanLineBreak}`}>{item.body}</p>
                </li>
              ))}
            </ul>
            <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3.5">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal-200">제안 전에</p>
              <ul className="mt-2.5 grid gap-2 sm:grid-cols-2">
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

      <Section className="space-y-4">
        <LandingSectionHeading
          eyebrow={dispatchPage.partnerReviews.eyebrow}
          title={dispatchPage.partnerReviews.title}
          accent="teal"
        />
        <div className="grid gap-3 lg:grid-cols-3">
          {dispatchPage.partnerReviews.items.map((item) => (
            <article key={item.name} className={reviewCardShell}>
              <p className="text-sm text-amber-500" aria-hidden>
                ★★★★★
              </p>
              <h3 className={`mt-2 text-[15px] font-semibold leading-snug text-slate-950 sm:text-base ${koreanLineBreak}`}>
                &ldquo;{item.quote}&rdquo;
              </h3>
              <div className="mt-3.5 border-t border-stone-100 pt-3">
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

      <Section className={`${premiumPanel} space-y-5 px-5 py-5 sm:px-6 sm:py-6`}>
        <LandingSectionHeading eyebrow={dispatchPage.whoFits.eyebrow} title={dispatchPage.whoFits.title} accent="teal" />
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {dispatchPage.whoFits.items.map((item) => (
            <article key={item.title} className={whoCardShell}>
              <h3 className={`text-[15px] font-semibold text-slate-900 ${koreanLineBreak}`}>{item.title}</h3>
              <p className={`mt-1.5 text-sm leading-relaxed text-slate-600 ${koreanLineBreak}`}>{item.description}</p>
            </article>
          ))}
        </div>

        <div className="border-t border-stone-100 pt-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-teal-800">
            {dispatchPage.smallSpace.eyebrow}
          </p>
          <h3 className={`mt-1.5 text-lg font-bold tracking-tight text-slate-950 ${koreanLineBreak}`}>
            {dispatchPage.smallSpace.title}
          </h3>
          <p className={`mt-1.5 text-[15px] font-semibold text-slate-950 ${koreanLineBreak}`}>
            {dispatchPage.smallSpace.lead}
          </p>
          <p className={`mt-1.5 max-w-3xl text-sm leading-relaxed text-slate-600 ${koreanLineBreak}`}>
            {dispatchPage.smallSpace.description}
          </p>
          <ul className="mt-3 grid gap-2 sm:grid-cols-3">
            {dispatchPage.smallSpace.criteria.map((item) => (
              <li
                key={item}
                className={`rounded-xl border border-stone-200/80 bg-stone-50/80 px-3 py-2.5 text-sm leading-snug text-stone-700 ${koreanLineBreak}`}
              >
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="border-t border-stone-100 pt-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-teal-800">
            {dispatchPage.coreCurriculum.eyebrow}
          </p>
          <h3 className={`mt-1.5 text-lg font-bold tracking-tight text-slate-950 ${koreanLineBreak}`}>
            {dispatchPage.coreCurriculum.title}
          </h3>
          <div className="mt-2 space-y-1.5">
            {dispatchPage.coreCurriculum.paragraphs.map((p) => (
              <p key={p} className={`text-sm leading-relaxed text-slate-700 ${koreanLineBreak}`}>
                {p}
              </p>
            ))}
          </div>
        </div>
      </Section>

      <Section id="programs" className="scroll-mt-36">
        <DispatchProgramLineup />
      </Section>

      <MidConsultCta />

      <Section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <LandingSectionHeading
            eyebrow={dispatchPage.operationTypes.eyebrow}
            title={dispatchPage.operationTypes.title}
            accent="teal"
          />
          <Link
            href={dispatchPage.examples.href}
            data-track={inferTrackFromHref(dispatchPage.examples.href)}
            data-track-label={dispatchPage.examples.trackLabel}
            className={`shrink-0 text-sm font-semibold text-teal-800 ${fineHover}hover:text-teal-900 ${focusRing}`}
          >
            사례 전체 →
          </Link>
        </div>
        <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr] lg:items-stretch lg:gap-5">
          <div className="grid gap-2.5">
            {dispatchPage.operationTypes.rows.map((row) => (
              <article key={row.label} className={`px-4 py-3.5 sm:px-5 ${premiumPanel}`}>
                <h3 className="text-[15px] font-semibold text-slate-950">{row.label}</h3>
                <p className={`mt-1 text-sm leading-relaxed text-slate-600 ${koreanLineBreak}`}>{row.description}</p>
              </article>
            ))}
          </div>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            {dispatchPage.examples.items.map((item, index) => (
              <Link
                key={item.venue}
                href={item.href}
                data-track={inferTrackFromHref(item.href)}
                data-track-label={`dispatch-example-${item.venue}`}
                className={`group relative block aspect-[4/3] overflow-hidden rounded-[1.25rem] border border-stone-200/70 shadow-[0_12px_40px_-32px_rgba(15,23,42,0.35)] sm:aspect-[3/4] ${cardInteractive} ${focusRing}`}
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
                <div className="absolute inset-x-2.5 bottom-2.5 rounded-xl border border-white/60 bg-white/95 p-2.5">
                  <h3 className={`text-sm font-bold leading-snug text-slate-950 ${koreanLineBreak}`}>{item.venue}</h3>
                  <p className={`mt-0.5 text-xs font-medium text-teal-900 ${koreanLineBreak}`}>
                    {item.audience} · {item.operation}
                  </p>
                </div>
              </Link>
            ))}
          </div>
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

      <MidConsultCta />

      <Section id="faq" className="scroll-mt-36 space-y-4">
        <LandingSectionHeading eyebrow={dispatchPage.faq.eyebrow} title={dispatchPage.faq.title} accent="teal" />
        <LandingFaqList items={dispatchPage.faq.items} accent="teal" />
      </Section>

      <Section>
        <DispatchProposalForm />
      </Section>

      <LandingFloatingCta
        primaryHref="#contact"
        primaryLabel="기관 운영 상담"
        secondaryHref={KAKAO_CHANNEL_URL || undefined}
        secondaryLabel={KAKAO_CHANNEL_URL ? '카카오 상담' : undefined}
        showAfterId="hero"
      />
    </div>
  );
}
