'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { motion, useReducedMotion } from 'framer-motion';
import { useCallback, useEffect, useRef } from 'react';
import { HOME_MEDIA } from '../data/home-media';
import { curriculumPage } from '../data/curriculum-page';
import {
  curriculumCommercialModes,
  curriculumModeList,
  curriculumModeScrollTarget,
  curriculumSubmitLabel,
  isCurriculumCommercialMode,
  resolveCurriculumMode,
  type CurriculumCommercialMode,
} from '../data/curriculum-commercial-modes';
import { getPublicProductContract } from '../data/public-product-contract';
import { trackCommercialEvent } from '../lib/commercial-events';
import { captureAcquisitionFromLocation } from '../lib/acquisition';
import {
  brandBlue,
  brandInk,
  homeBandSoftBlue,
  homeBandWhite,
  homeBodyLead,
  homeFocusRing,
  homeGateCard,
  homePhotoGrade,
  homeSectionEyebrow,
  homeSectionH2,
  homeSectionPadCompact,
  koreanText,
  siteBtnPrimary,
  siteBtnSecondary,
  siteContainer,
} from '../lib/ui-classes';
import { CurriculumInquiryForm } from './curriculum-inquiry-form';
import { HomeChevron } from './home/home-chevron';
import { TrackedLink } from './home/tracked-link';
import { LandingProcessOnePager } from './landing-process-one-pager';
import { MediaPanel } from './visual';

const publicProduct = getPublicProductContract();

/**
 * 구독시스템 설득 허브 (≤7 섹션) + mode=training|license|package|master 호환.
 * 로그인/결제 UI는 구현하지 않고 MASTER handoff만 연결한다.
 */
export default function CurriculumLanding() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const modeParam = searchParams.get('mode');
  const mode = resolveCurriculumMode(modeParam);
  const active = curriculumCommercialModes[mode];
  const reducedMotion = useReducedMotion();
  const scrolledForMode = useRef<string | null>(null);

  const {
    hero,
    audience,
    classFlow,
    contentScope,
    plans,
    spomoveRelation,
    handoffSecondary,
    trainingTracks,
    secondaryIntents,
    finalCta,
  } = curriculumPage;

  const setMode = useCallback(
    (next: CurriculumCommercialMode, hash?: string) => {
      trackCommercialEvent({
        name: 'selection_changed',
        route: 'curriculum',
        selectionId: next,
      });
      const params = new URLSearchParams(searchParams.toString());
      params.set('mode', next);
      const qs = params.toString();
      const targetHash = hash ?? curriculumModeScrollTarget(next);
      router.replace(`${pathname}?${qs}#${targetHash}`, { scroll: false });
      if (typeof window !== 'undefined') {
        window.requestAnimationFrame(() => {
          document.getElementById(targetHash)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      }
    },
    [pathname, router, searchParams],
  );

  useEffect(() => {
    captureAcquisitionFromLocation();
  }, []);

  useEffect(() => {
    const raw = searchParams.get('mode');
    if (!raw || scrolledForMode.current === raw) return;
    scrolledForMode.current = raw;
    const target = curriculumModeScrollTarget(mode);
    window.requestAnimationFrame(() => {
      document.getElementById(target)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, [mode, searchParams]);

  const showInquiry = Boolean(modeParam && isCurriculumCommercialMode(modeParam));

  return (
    <main
      className="w-full overflow-x-clip pb-24"
      data-spokedu-curriculum-sections={curriculumPage.sectionOrder.length}
      data-curriculum-mode={mode}
    >
      {/* 1. Hero */}
      <section id={hero.id} className={`${homeSectionPadCompact} bg-white`}>
        <div className={siteContainer}>
          <motion.div
            className="max-w-3xl"
            initial={reducedMotion ? false : { opacity: 0, y: 12 }}
            animate={reducedMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
          >
            <p className={homeSectionEyebrow}>{hero.eyebrow}</p>
            <h1 className={`${homeSectionH2} mt-3`}>{hero.title}</h1>
            <p className={`${homeBodyLead} mt-4`}>{hero.lead}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <TrackedLink
                href={hero.primaryCta.href}
                trackLabel={hero.primaryCta.trackLabel}
                commercialRoute="curriculum"
                ctaIntentId={hero.primaryCta.ctaIntentId}
                className={`${siteBtnPrimary} h-12 min-h-12 px-7 ${homeFocusRing}`}
              >
                {hero.primaryCta.label}
              </TrackedLink>
              <TrackedLink
                href={hero.secondaryCta.href}
                trackLabel={hero.secondaryCta.trackLabel}
                commercialRoute="curriculum"
                ctaIntentId={hero.secondaryCta.ctaIntentId}
                className={`${siteBtnSecondary} h-12 min-h-12 px-7 ${homeFocusRing}`}
              >
                {hero.secondaryCta.label}
              </TrackedLink>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 2. Audience */}
      <section id={audience.id} className={`${homeSectionPadCompact} ${homeBandSoftBlue}`}>
        <div className={siteContainer}>
          <p className={homeSectionEyebrow}>{audience.eyebrow}</p>
          <h2 className={`${homeSectionH2} mt-3`}>{audience.title}</h2>
          <p className={`mt-3 max-w-2xl text-[15px] leading-relaxed text-[#536279] sm:text-base ${koreanText}`}>
            {audience.lead}
          </p>
          <ul className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {audience.primary.map((item) => (
              <li
                key={item.title}
                className="rounded-2xl border border-[#D6E3FF] bg-white px-5 py-5 shadow-[0_12px_40px_-32px_rgba(15,23,42,0.35)]"
              >
                <h3 className={`text-base font-bold ${koreanText}`} style={{ color: brandInk }}>
                  {item.title}
                </h3>
                <p className={`mt-2 text-sm leading-relaxed text-[#536279] ${koreanText}`}>{item.body}</p>
              </li>
            ))}
          </ul>
          <div className="mt-6 rounded-2xl border border-dashed border-stone-300 bg-white/70 px-5 py-4 sm:flex sm:items-center sm:justify-between sm:gap-6">
            <div className="min-w-0">
              <p className={`text-sm font-semibold ${koreanText}`} style={{ color: brandInk }}>
                {audience.secondary.title}
              </p>
              <p className={`mt-1 text-sm leading-relaxed text-[#536279] ${koreanText}`}>{audience.secondary.body}</p>
            </div>
            <TrackedLink
              href={audience.secondary.href}
              trackLabel={audience.secondary.trackLabel}
              commercialRoute="dispatch"
              ctaIntentId={audience.secondary.ctaIntentId}
              className={`${siteBtnSecondary} mt-4 h-11 shrink-0 sm:mt-0 ${homeFocusRing}`}
            >
              {audience.secondary.ctaLabel}
            </TrackedLink>
          </div>
        </div>
      </section>

      {/* 3. Class flow */}
      <section id={classFlow.id} className={`${homeSectionPadCompact} ${homeBandWhite}`}>
        <div className={siteContainer}>
          <p className={homeSectionEyebrow}>{classFlow.eyebrow}</p>
          <h2 className={`${homeSectionH2} mt-3`}>{classFlow.title}</h2>
          <p className={`mt-3 max-w-2xl text-[15px] leading-relaxed text-[#536279] sm:text-base ${koreanText}`}>
            {classFlow.lead}
          </p>
          <ol className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {classFlow.steps.map((step, index) => (
              <li key={step.title} className="rounded-2xl border border-stone-200/80 bg-stone-50/80 px-4 py-4">
                <p className="text-[11px] font-bold tracking-[0.08em]" style={{ color: brandBlue }}>
                  {index + 1}. {step.phase}
                </p>
                <h3 className={`mt-1.5 text-sm font-bold ${koreanText}`} style={{ color: brandInk }}>
                  {step.title}
                </h3>
                <p className={`mt-1.5 text-sm leading-relaxed text-[#536279] ${koreanText}`}>{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* 4. Content scope */}
      <section id={contentScope.id} className={`${homeSectionPadCompact} ${homeBandSoftBlue}`}>
        <div className={siteContainer}>
          <p className={homeSectionEyebrow}>{contentScope.eyebrow}</p>
          <h2 className={`${homeSectionH2} mt-3`}>{contentScope.title}</h2>
          <p className={`mt-3 max-w-2xl text-[15px] leading-relaxed text-[#536279] sm:text-base ${koreanText}`}>
            {contentScope.lead}
          </p>
          <ul className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {contentScope.items.map((item, index) => (
              <li key={item.title} className={`${homeGateCard} overflow-hidden`}>
                <div className="relative aspect-[16/10] w-full overflow-hidden">
                  <MediaPanel
                    media={HOME_MEDIA[item.mediaKey]}
                    className={`absolute inset-0 h-full w-full border-0 rounded-none ${homePhotoGrade}`}
                    sizes="gateCard"
                    photoPriority={index === 0}
                    objectFit="cover"
                  />
                </div>
                <div className="px-5 py-5">
                  <h3 className={`text-base font-bold ${koreanText}`} style={{ color: brandInk }}>
                    {item.title}
                  </h3>
                  <p className={`mt-2 text-sm leading-relaxed text-[#536279] ${koreanText}`}>{item.description}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 5. Plans — public contract only */}
      <section id={plans.id} className={`${homeSectionPadCompact} ${homeBandWhite}`}>
        <div className={siteContainer}>
          <p className={homeSectionEyebrow}>{plans.eyebrow}</p>
          <h2 className={`${homeSectionH2} mt-3`}>{plans.title}</h2>
          <p className={`mt-3 max-w-2xl text-[15px] leading-relaxed text-[#536279] sm:text-base ${koreanText}`}>
            {plans.lead}
          </p>
          <ul className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
            {publicProduct.plans.map((plan) => (
              <li
                key={plan.code}
                className="flex h-full flex-col rounded-2xl border border-stone-200/80 bg-white px-5 py-5 shadow-[0_14px_40px_-34px_rgba(15,23,42,0.4)]"
                data-plan-code={plan.code}
                data-purchasable={plan.purchasable ? 'true' : 'false'}
              >
                <p className="text-[12px] font-bold tracking-[0.08em]" style={{ color: brandBlue }}>
                  {plan.billingCycleLabel}
                </p>
                <h3 className={`mt-1.5 text-lg font-bold ${koreanText}`} style={{ color: brandInk }}>
                  {plan.displayName}
                </h3>
                {plan.priceLabel ? (
                  <p className={`mt-2 text-xl font-bold tracking-tight ${koreanText}`} style={{ color: brandInk }}>
                    {plan.priceLabel}
                  </p>
                ) : (
                  <p className={`mt-2 text-sm font-semibold text-[#536279] ${koreanText}`}>
                    가격 없음 · 로그인 후 이용
                  </p>
                )}
                <ul className="mt-4 flex-1 space-y-1.5">
                  {plan.featureSummary.map((feature) => (
                    <li key={feature} className={`text-sm leading-relaxed text-[#536279] ${koreanText}`}>
                      · {feature}
                    </li>
                  ))}
                </ul>
                {plan.includesSpomove ? (
                  <p className={`mt-3 text-xs font-semibold ${koreanText}`} style={{ color: brandBlue }}>
                    SPOMOVE 포함
                  </p>
                ) : null}
                {plan.code === 'lite' || plan.code === 'premium' ? (
                  <TrackedLink
                    href={publicProduct.handoff.paymentPlanHref(plan.code)}
                    trackLabel={`curriculum-plan-${plan.code}`}
                    commercialRoute="curriculum"
                    ctaIntentId="master_handoff"
                    className={`${siteBtnPrimary} mt-5 h-11 w-full justify-center ${homeFocusRing}`}
                  >
                    {plan.displayName} 시작하기
                  </TrackedLink>
                ) : (
                  <TrackedLink
                    href={publicProduct.handoff.freeStartHref}
                    trackLabel="curriculum-plan-free"
                    commercialRoute="curriculum"
                    ctaIntentId="free_start"
                    className={`${siteBtnPrimary} mt-5 h-11 w-full justify-center ${homeFocusRing}`}
                  >
                    무료로 시작하기
                  </TrackedLink>
                )}
              </li>
            ))}
          </ul>
          <p className={`mt-4 text-sm text-[#536279] ${koreanText}`}>{publicProduct.freeScopeNote}</p>
          <div
            className="mt-6 rounded-2xl border border-dashed border-stone-300 bg-stone-50/80 px-5 py-5 sm:flex sm:items-center sm:justify-between sm:gap-6"
            data-center-inquiry="true"
          >
            <div className="min-w-0">
              <p className={`text-base font-bold ${koreanText}`} style={{ color: brandInk }}>
                {publicProduct.centerInquiry.displayName}
              </p>
              <p className={`mt-1 text-sm leading-relaxed text-[#536279] ${koreanText}`}>
                {publicProduct.centerInquiry.summary.join(' · ')}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setMode('master', 'inquiry')}
              className={`${siteBtnSecondary} mt-4 h-11 shrink-0 sm:mt-0 ${homeFocusRing}`}
              data-track-label="curriculum-center-inquiry"
            >
              {publicProduct.centerInquiry.ctaLabel}
            </button>
          </div>
          <p className={`mt-4 text-sm text-[#536279] ${koreanText}`}>{plans.annualNote}</p>
          <p className={`mt-1 text-sm text-[#536279] ${koreanText}`}>{plans.spomatNote}</p>
        </div>
      </section>

      {/* 6. SPOMOVE relation */}
      <section id={spomoveRelation.id} className={`${homeSectionPadCompact} ${homeBandSoftBlue}`}>
        <div className={siteContainer}>
          <p className={homeSectionEyebrow}>{spomoveRelation.eyebrow}</p>
          <h2 className={`${homeSectionH2} mt-3`}>{spomoveRelation.title}</h2>
          <p className={`mt-3 max-w-2xl text-[15px] leading-relaxed text-[#536279] sm:text-base ${koreanText}`}>
            {spomoveRelation.lead}
          </p>
          <ul className="mt-5 flex flex-wrap gap-2">
            {spomoveRelation.points.map((point) => (
              <li
                key={point}
                className="rounded-full border border-[#D6E3FF] bg-[#EAF1FF] px-3 py-1.5 text-xs font-semibold text-[#2C446D]"
              >
                {point}
              </li>
            ))}
          </ul>
          <TrackedLink
            href={spomoveRelation.primary.href}
            trackLabel={spomoveRelation.primary.trackLabel}
            commercialRoute="curriculum"
            ctaIntentId={spomoveRelation.primary.ctaIntentId}
            className={`${siteBtnSecondary} mt-6 h-12 px-7 ${homeFocusRing}`}
          >
            {spomoveRelation.primary.label}
            <HomeChevron />
          </TrackedLink>
        </div>
      </section>

      {/* 7. Handoff + secondary intents */}
      <section id={handoffSecondary.id} className={`${homeSectionPadCompact} ${homeBandWhite}`}>
        <div className={siteContainer}>
          <p className={homeSectionEyebrow}>{handoffSecondary.eyebrow}</p>
          <h2 className={`${homeSectionH2} mt-3`}>{handoffSecondary.title}</h2>
          <p className={`mt-3 max-w-2xl text-[15px] leading-relaxed text-[#536279] sm:text-base ${koreanText}`}>
            {handoffSecondary.lead}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <TrackedLink
              href={handoffSecondary.primary.href}
              trackLabel={handoffSecondary.primary.trackLabel}
              commercialRoute="curriculum"
              ctaIntentId={handoffSecondary.primary.ctaIntentId}
              className={`${siteBtnPrimary} h-12 px-7 ${homeFocusRing}`}
            >
              {handoffSecondary.primary.label}
            </TrackedLink>
            <TrackedLink
              href={handoffSecondary.secondary.href}
              trackLabel={handoffSecondary.secondary.trackLabel}
              commercialRoute="curriculum"
              ctaIntentId={handoffSecondary.secondary.ctaIntentId}
              className={`${siteBtnSecondary} h-12 px-7 ${homeFocusRing}`}
            >
              {handoffSecondary.secondary.label}
            </TrackedLink>
            <TrackedLink
              href={handoffSecondary.login.href}
              trackLabel={handoffSecondary.login.trackLabel}
              commercialRoute="curriculum"
              ctaIntentId={handoffSecondary.login.ctaIntentId}
              className={`${siteBtnSecondary} h-12 px-7 ${homeFocusRing}`}
            >
              {handoffSecondary.login.label}
            </TrackedLink>
          </div>

          {/* Secondary: training / license / package */}
          <div className="mt-12 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <article id={trainingTracks.id} className="scroll-mt-28 rounded-2xl border border-stone-200 bg-stone-50/80 px-5 py-5">
              <p className="text-[11px] font-bold tracking-[0.08em]" style={{ color: brandBlue }}>
                {trainingTracks.eyebrow}
              </p>
              <h3 className={`mt-2 text-lg font-bold ${koreanText}`} style={{ color: brandInk }}>
                {trainingTracks.title}
              </h3>
              <p className={`mt-2 text-sm leading-relaxed text-[#536279] ${koreanText}`}>{trainingTracks.lead}</p>
              <ul className="mt-4 space-y-2">
                {trainingTracks.items.map((item) => (
                  <li key={item.title}>
                    <p className={`text-sm font-semibold ${koreanText}`} style={{ color: brandInk }}>
                      {item.title}
                    </p>
                    <p className={`text-sm text-[#536279] ${koreanText}`}>{item.body}</p>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => setMode('training', 'inquiry')}
                className={`${siteBtnSecondary} mt-5 h-11 ${homeFocusRing}`}
                data-track-label={trainingTracks.cta.trackLabel}
              >
                {trainingTracks.cta.label}
              </button>
            </article>

            <article
              id={secondaryIntents.license.id}
              className="scroll-mt-28 rounded-2xl border border-stone-200 bg-stone-50/80 px-5 py-5"
            >
              <p className="text-[11px] font-bold tracking-[0.08em]" style={{ color: brandBlue }}>
                {secondaryIntents.license.eyebrow}
              </p>
              <h3 className={`mt-2 text-lg font-bold ${koreanText}`} style={{ color: brandInk }}>
                {secondaryIntents.license.title}
              </h3>
              <p className={`mt-2 text-sm leading-relaxed text-[#536279] ${koreanText}`}>
                {secondaryIntents.license.lead}
              </p>
              <button
                type="button"
                onClick={() => setMode('license', 'inquiry')}
                className={`${siteBtnSecondary} mt-5 h-11 ${homeFocusRing}`}
                data-track-label={secondaryIntents.license.trackLabel}
              >
                {secondaryIntents.license.ctaLabel}
              </button>
            </article>

            <article
              id={secondaryIntents.package.id}
              className="scroll-mt-28 rounded-2xl border border-stone-200 bg-stone-50/80 px-5 py-5"
            >
              <p className="text-[11px] font-bold tracking-[0.08em]" style={{ color: brandBlue }}>
                {secondaryIntents.package.eyebrow}
              </p>
              <h3 className={`mt-2 text-lg font-bold ${koreanText}`} style={{ color: brandInk }}>
                {secondaryIntents.package.title}
              </h3>
              <p className={`mt-2 text-sm leading-relaxed text-[#536279] ${koreanText}`}>
                {secondaryIntents.package.lead}
              </p>
              <button
                type="button"
                onClick={() => setMode('package', 'inquiry')}
                className={`${siteBtnSecondary} mt-5 h-11 ${homeFocusRing}`}
                data-track-label={secondaryIntents.package.trackLabel}
              >
                {secondaryIntents.package.ctaLabel}
              </button>
            </article>
          </div>

          {/* Mode picker (URL intent 보존) */}
          <div id="modes" className="mt-10 scroll-mt-28">
            <p className={`text-sm font-semibold ${koreanText}`} style={{ color: brandInk }}>
              기존 도입 모드 바로가기
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {curriculumModeList.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setMode(item.id)}
                  aria-pressed={item.id === mode}
                  className={`rounded-full border px-3.5 py-2 text-xs font-semibold transition ${homeFocusRing} ${
                    item.id === mode
                      ? 'border-[#245DFF] bg-[#EAF1FF] text-[#245DFF]'
                      : 'border-stone-200 bg-white text-stone-700 hover:border-stone-300'
                  }`}
                >
                  {item.title}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className={`${homeSectionPadCompact} ${homeBandSoftBlue}`}>
        <div className={siteContainer}>
          <h2 className={`${homeSectionH2}`}>{finalCta.title}</h2>
          <p className={`mt-3 max-w-2xl text-[15px] leading-relaxed text-[#536279] ${koreanText}`}>
            {finalCta.description}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <TrackedLink
              href={finalCta.primary.href}
              trackLabel={finalCta.primary.trackLabel}
              commercialRoute="curriculum"
              ctaIntentId={finalCta.primary.ctaIntentId}
              className={`${siteBtnPrimary} h-12 px-7 ${homeFocusRing}`}
            >
              {finalCta.primary.label}
            </TrackedLink>
            <TrackedLink
              href={finalCta.secondary.href}
              trackLabel={finalCta.secondary.trackLabel}
              commercialRoute="curriculum"
              ctaIntentId={finalCta.secondary.ctaIntentId}
              className={`${siteBtnSecondary} h-12 px-7 ${homeFocusRing}`}
            >
              {finalCta.secondary.label}
            </TrackedLink>
          </div>
        </div>
      </section>

      {/* Secondary inquiry — mode intent */}
      {showInquiry ? (
        <section id="inquiry" className={`${homeSectionPadCompact} ${homeBandWhite} scroll-mt-28`}>
          <div className={siteContainer} data-mode-section={active.sectionId}>
            <LandingProcessOnePager data={curriculumPage.processOnePager} />
            <div className="mt-8">
              <p className={`mb-3 text-sm text-[#536279] ${koreanText}`}>
                현재 문의 모드: <strong style={{ color: brandInk }}>{active.title}</strong> —{' '}
                {curriculumSubmitLabel(mode)}
              </p>
              <CurriculumInquiryForm
                leadMode={mode}
                formDefaults={active.formDefaults}
                onLeadModeChange={(next) => setMode(next, 'inquiry')}
              />
            </div>
            {mode === 'master' ? (
              <p className={`mt-4 text-sm text-[#536279] ${koreanText}`}>
                개인 지도자는{' '}
                <Link href={publicProduct.handoff.freeStartHref} className="font-semibold underline">
                  무료로 시작하기
                </Link>
                가 Primary입니다. 이 폼은 센터·기관 구독 문의용입니다.
              </p>
            ) : null}
          </div>
        </section>
      ) : null}
    </main>
  );
}
