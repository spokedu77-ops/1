'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';
import { HOME_MEDIA } from '../data/home-media';
import { curriculumPage } from '../data/curriculum-page';
import { btnPrimary, btnSecondary, koreanLineBreak } from '../lib/ui-classes';
import { inferTrackFromHref } from '../lib/tracking';
import { CurriculumInquiryForm } from './curriculum-inquiry-form';
import { LandingAnchorNav } from './landing-anchor-nav';
import { LandingSectionHeading } from './landing-section-heading';
import { LandingFloatingCta } from './landing-floating-cta';
import { LandingHero } from './landing-hero';
import { MediaPanel } from './visual';

const premiumPanel =
  'overflow-hidden rounded-[1.5rem] border border-stone-200/70 bg-white shadow-[0_18px_50px_-36px_rgba(15,23,42,0.45)]';
const premiumPanelDark =
  'overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#0F1C1A] text-white shadow-[0_18px_50px_-36px_rgba(15,23,42,0.55)]';
const axisCardShell = 'flex h-full flex-col rounded-2xl border border-stone-200/80 bg-stone-50/70 px-4 py-3.5';
const productCardShell = `flex h-full flex-col ${premiumPanel}`;
const historyCardShell = `flex h-full flex-col ${premiumPanel}`;

const focusRing =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600';

const curriculumHeroNeeds = ['수업안', '지도자 교육', 'SPOMOVE'] as const;
const curriculumAnchorItems = [
  { href: '#products', label: '콘텐츠' },
  { href: '#history', label: '운영 이력' },
  { href: '#training', label: '교육' },
  { href: '#inquiry', label: '문의' },
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
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-teal-200/90">교육·콘텐츠</p>
          <p className={`mt-2 text-lg font-semibold tracking-tight sm:text-xl ${koreanLineBreak}`}>
            필요한 범위만 알려주시면, 맞는 교육·콘텐츠 방식부터 제안합니다.
          </p>
        </div>
        <a
          href="#inquiry"
          className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-2xl bg-white px-6 text-sm font-bold text-[#0F1C1A] transition hover:bg-teal-50"
        >
          커리큘럼·교육 문의
        </a>
      </div>
    </div>
  );
}

export default function CurriculumLanding() {
  const spotlight = curriculumPage.masterSpotlight;

  return (
    <div className="flex w-full flex-col gap-8 overflow-x-clip pb-24 sm:gap-10 lg:gap-12">
      <div id="hero">
        <LandingHero
          kicker={curriculumPage.hero.kicker}
          kickerClassName="text-stone-500"
          leading={
            <div className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal-700">For Educators</p>
              <div className="flex flex-wrap gap-2" aria-label="커리큘럼·교육 주제">
                {curriculumHeroNeeds.map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-teal-100 bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-900"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          }
          lines={curriculumPage.hero.lines}
          subtitle={curriculumPage.hero.subtitle}
          media={HOME_MEDIA[curriculumPage.hero.mediaKey]}
          visualVariant="editorial"
          priority
          primaryCta={curriculumPage.heroCtas.primary}
          secondaryCta={curriculumPage.heroCtas.secondary}
        />
      </div>

      <LandingAnchorNav
        items={curriculumAnchorItems}
        cta={{ href: '#inquiry', label: '교육·커리큘럼 문의' }}
        ariaLabel="커리큘럼 랜딩 바로가기"
      />

      <Section className={`${premiumPanel} px-5 py-5 sm:px-6 sm:py-6`}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
          <span className="inline-flex w-fit items-center rounded-full border border-teal-100 bg-teal-50 px-3.5 py-1.5 text-xs font-semibold text-teal-900">
            {curriculumPage.hero.trustBadge}
          </span>
          <p className={`max-w-xl text-sm leading-relaxed text-stone-600 sm:text-right ${koreanLineBreak}`}>
            현장 수업 기준으로 수업안·지도자 교육·SPOMOVE 도입까지 한 흐름으로 제공합니다.
          </p>
        </div>
        <ul className="mt-5 grid gap-2.5 sm:grid-cols-3" aria-label="커리큘럼 핵심 축">
          {curriculumPage.trustMetrics.items.map((item) => (
            <li
              key={`${item.value}-${item.label}`}
              className="rounded-2xl border border-stone-200/80 bg-stone-50/80 px-4 py-3.5"
            >
              <p className="text-sm font-semibold text-slate-950">{item.value}</p>
              <p className={`mt-1 text-xs leading-relaxed text-stone-600 ${koreanLineBreak}`}>{item.label}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section className={`${premiumPanelDark} px-5 py-6 sm:px-7 sm:py-7`}>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal-300">
          {curriculumPage.leaderAxes.eyebrow}
        </p>
        <h2 className="mt-2.5 text-xl font-black leading-tight tracking-tight sm:text-2xl [word-break:keep-all]">
          {curriculumPage.leaderAxes.title}
        </h2>
        <p className={`mt-3 max-w-2xl text-sm leading-relaxed text-white/70 ${koreanLineBreak}`}>
          {curriculumPage.leaderAxes.lead}
        </p>
        <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
          {curriculumPage.leaderAxes.items.map((item) => (
            <article key={item.title} className="rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3.5">
              <h3 className="text-sm font-bold text-white">{item.title}</h3>
              <p className={`mt-1.5 text-xs leading-relaxed text-white/75 ${koreanLineBreak}`}>{item.description}</p>
            </article>
          ))}
        </div>
      </Section>

      <Section id="products" className="scroll-mt-36 space-y-4">
        <LandingSectionHeading
          eyebrow={curriculumPage.contentProducts.eyebrow}
          title={curriculumPage.contentProducts.title}
          lead={curriculumPage.contentProducts.lead}
          accent="teal"
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {curriculumPage.contentProducts.items.map((item, index) => (
            <article key={item.title} className={productCardShell}>
              <MediaPanel
                media={HOME_MEDIA[item.mediaKey]}
                className="aspect-[5/3] min-h-[110px] shrink-0 rounded-none border-0"
                photoPriority={index === 0}
              />
              <div className="flex flex-1 flex-col border-t border-stone-100 px-4 py-3.5">
                <h3 className="text-sm font-semibold text-slate-950 sm:text-base">{item.title}</h3>
                <p className={`mt-1.5 text-sm leading-relaxed text-slate-600 ${koreanLineBreak}`}>{item.description}</p>
              </div>
            </article>
          ))}
        </div>
      </Section>

      <Section id="history" className="scroll-mt-36 space-y-4">
        <LandingSectionHeading
          eyebrow={curriculumPage.serviceExamples.eyebrow}
          title={curriculumPage.serviceExamples.title}
          lead={curriculumPage.serviceExamples.lead}
          accent="teal"
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {curriculumPage.serviceExamples.items.map((item) => {
            const inner = (
              <>
                <MediaPanel
                  media={HOME_MEDIA[item.mediaKey]}
                  className="aspect-[16/10] shrink-0 rounded-none border-0"
                />
                <div className="flex flex-1 flex-col p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-teal-200 bg-teal-50 px-2.5 py-0.5 text-[11px] font-semibold text-teal-800">
                      {item.status}
                    </span>
                    <span className="text-xs text-stone-500">{item.date}</span>
                  </div>
                  <h3 className={`mt-2 text-[15px] font-semibold text-slate-950 ${koreanLineBreak}`}>{item.title}</h3>
                  <p className={`mt-1 text-sm font-medium text-teal-900 ${koreanLineBreak}`}>{item.venue}</p>
                  <p className={`mt-2 flex-1 text-sm leading-relaxed text-slate-600 ${koreanLineBreak}`}>
                    {item.description}
                  </p>
                  {'href' in item && item.href ? (
                    <span className="mt-3 text-sm font-semibold text-teal-800">자세히 보기 →</span>
                  ) : null}
                </div>
              </>
            );

            return 'href' in item && item.href ? (
              <Link
                key={item.title}
                href={item.href}
                data-track={inferTrackFromHref(item.href)}
                data-track-label={`curriculum-example-${item.title}`}
                className={`${historyCardShell} transition hover:border-teal-200`}
              >
                {inner}
              </Link>
            ) : (
              <article key={item.title} className={historyCardShell}>
                {inner}
              </article>
            );
          })}
        </div>
      </Section>

      <Section id="training" className="scroll-mt-36 space-y-4">
        <LandingSectionHeading
          eyebrow={curriculumPage.trainingTracks.eyebrow}
          title={curriculumPage.trainingTracks.title}
          accent="teal"
        />
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          {curriculumPage.trainingTracks.items.map((item) => (
            <article key={item.title} className={axisCardShell}>
              <h3 className="text-sm font-semibold text-slate-950 sm:text-base">{item.title}</h3>
              <p className={`mt-1.5 text-sm leading-relaxed text-slate-600 ${koreanLineBreak}`}>{item.body}</p>
            </article>
          ))}
        </div>
      </Section>

      <Section id="master" className={`${premiumPanel} px-5 py-6 sm:px-7 sm:py-7`}>
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-teal-800">{spotlight.eyebrow}</p>
        <h2 className={`mt-2.5 text-xl font-semibold leading-snug text-stone-950 sm:text-2xl ${koreanLineBreak}`}>
          {spotlight.title}
        </h2>
        <p className={`mt-3 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-[15px] ${koreanLineBreak}`}>
          {spotlight.lead}
        </p>
        <ul className="mt-4 flex flex-wrap gap-2" aria-label="SPOKEDU MASTER 주요 기능">
          {spotlight.tags.map((tag) => (
            <li key={tag}>
              <span className="rounded-full border border-teal-200/80 bg-teal-50/60 px-3 py-1.5 text-xs font-semibold text-teal-900">
                {tag}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Link
            href={spotlight.primary.href}
            data-track={inferTrackFromHref(spotlight.primary.href)}
            data-track-label={spotlight.primary.trackLabel}
            className={`${btnPrimary} min-h-12 !w-full sm:!w-auto ${focusRing}`}
          >
            {spotlight.primary.label}
          </Link>
          <Link
            href={spotlight.secondary.href}
            data-track={inferTrackFromHref(spotlight.secondary.href)}
            data-track-label={spotlight.secondary.trackLabel}
            className={`${btnSecondary} min-h-12 !w-full sm:!w-auto ${focusRing}`}
          >
            {spotlight.secondary.label}
          </Link>
        </div>
      </Section>

      <MidConsultCta />

      <Section>
        <CurriculumInquiryForm />
      </Section>

      <LandingFloatingCta
        primaryHref="#inquiry"
        primaryLabel="커리큘럼·교육 문의"
        showAfterId="hero"
      />
    </div>
  );
}
