'use client';

import { motion, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';
import { HOME_MEDIA } from '../data/home-media';
import { privatePage } from '../data/private-page';
import { koreanLineBreak, landingCardFrame } from '../lib/ui-classes';
import { ExternalPhoto } from './external-photo';
import { LandingFaqList } from './landing-faq-list';
import { LandingSectionHeading } from './landing-section-heading';
import { LandingHero } from './landing-hero';
import { PrivateApplyForm } from './private-apply-form';
import { PrivateClassFlowGallery } from './private-class-flow-gallery';
import { PrivateCurriculumSection } from './private-curriculum-section';
import { PrivateTrustMetrics } from './private-trust-metrics';
import { LandingAnchorNav } from './landing-anchor-nav';
import { LandingFloatingCta } from './landing-floating-cta';
import { LandingProcessOnePager } from './landing-process-one-pager';
import { MediaPanel } from './visual';

const premiumPanel =
  'overflow-hidden rounded-[1.5rem] border border-stone-200/70 bg-white shadow-[0_18px_50px_-36px_rgba(15,23,42,0.45)]';
const premiumPanelDark =
  'overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#0F1C1A] text-white shadow-[0_18px_50px_-36px_rgba(15,23,42,0.55)]';
const whoCardShell = `flex h-full flex-col px-4 py-4 sm:px-5 sm:py-5 ${premiumPanel}`;
const reviewCardShell = `flex h-full flex-col border-l-[3px] border-l-teal-700 px-5 py-5 sm:px-6 sm:py-6 ${premiumPanel}`;
const privateHeroNeeds = ['운동 자신감', '기초체력', '종목 준비'] as const;
const privateAnchorItems = [
  { href: '#class-flow', label: '수업 현장' },
  { href: '#curriculum', label: '종목' },
  { href: '#process', label: '상담 절차' },
  { href: '#reviews', label: '후기' },
  { href: '#apply', label: '상담' },
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
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-teal-200/90">상담</p>
          <p className={`mt-2 text-lg font-semibold tracking-tight sm:text-xl ${koreanLineBreak}`}>
            아이 상황만 알려주시면, 맞는 수업 방향부터 제안합니다.
          </p>
        </div>
        <a
          href="#apply"
          className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-2xl bg-white px-6 text-sm font-bold text-[#0F1C1A] transition hover:bg-teal-50"
        >
          개인수업 상담
        </a>
      </div>
    </div>
  );
}

export default function PrivateLanding() {
  return (
    <div className="flex w-full flex-col gap-8 pb-24 sm:gap-10 lg:gap-12">
      <div id="hero">
        <LandingHero
          kicker={privatePage.hero.kicker}
          kickerClassName="text-stone-500"
          leading={
            <div className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal-700">학부모</p>
              <div className="flex flex-wrap gap-2" aria-label="개인수업 상담 주제">
                {privateHeroNeeds.map((item) => (
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
          lines={privatePage.hero.lines}
          subtitle={privatePage.hero.subtitle}
          media={HOME_MEDIA[privatePage.hero.mediaKey]}
          visualVariant="editorial"
          priority
          primaryCta={privatePage.heroCtas.primary}
          secondaryCta={privatePage.heroCtas.secondary}
        />
      </div>

      <LandingAnchorNav
        items={privateAnchorItems}
        cta={{ href: '#apply', label: '개인수업 상담' }}
        ariaLabel="개인수업 랜딩 바로가기"
      />

      <Section className="border-y border-stone-200 bg-white px-1 py-5 sm:px-2 sm:py-6">
        <PrivateTrustMetrics />
      </Section>

      <Section className="space-y-4">
        <LandingSectionHeading
          eyebrow={privatePage.whoNeeds.eyebrow}
          title={privatePage.whoNeeds.title}
          accent="teal"
        />
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          {privatePage.whoNeeds.items.map((item) => (
            <article key={item.title} className={whoCardShell}>
              <h3 className={`text-sm font-semibold text-slate-900 sm:text-[15px] ${koreanLineBreak}`}>
                {item.title}
              </h3>
              <p className={`mt-1.5 text-xs leading-relaxed text-slate-600 sm:text-sm ${koreanLineBreak}`}>
                {item.description}
              </p>
            </article>
          ))}
        </div>
      </Section>

      <Section className="space-y-4">
        <LandingSectionHeading
          eyebrow={privatePage.classCompare.eyebrow}
          title={privatePage.classCompare.title}
          accent="teal"
        />
        <div className="grid gap-3 sm:grid-cols-2 sm:items-stretch">
          {privatePage.classCompare.items.map((item, index) => (
            <article
              key={item.title}
              className="flex h-full flex-col overflow-hidden rounded-[1.25rem] border border-slate-200/80 bg-white"
            >
              <MediaPanel
                media={HOME_MEDIA[item.mediaKey]}
                className="aspect-[16/10] min-h-[120px] shrink-0 rounded-none border-0 sm:min-h-0"
                photoPriority={index === 0}
              />
              <div className={`flex flex-1 flex-col border-t border-slate-100 px-4 py-3.5 sm:px-5 sm:py-4`}>
                <h3 className="text-[15px] font-semibold text-slate-950 sm:text-base">{item.title}</h3>
                <p className={`mt-1.5 text-sm leading-relaxed text-slate-600 ${koreanLineBreak}`}>{item.description}</p>
              </div>
            </article>
          ))}
        </div>
      </Section>

      <Section id="class-flow" className="scroll-mt-36 space-y-4">
        <LandingSectionHeading
          eyebrow={privatePage.classFlow.eyebrow}
          title={privatePage.classFlow.title}
          lead={privatePage.classFlow.lead}
          accent="teal"
        />
        <div className="grid gap-3 lg:grid-cols-2 lg:grid-rows-3 lg:items-stretch lg:min-h-[22rem]">
          {privatePage.classFlow.steps.map((step, index) => (
            <article
              key={step.num}
              className={[
                'flex h-full flex-col justify-center px-4 py-3 sm:px-5 sm:py-3.5',
                landingCardFrame,
                index === 0 ? 'lg:col-start-1 lg:row-start-1' : '',
                index === 1 ? 'lg:col-start-1 lg:row-start-2' : '',
                index === 2 ? 'lg:col-start-1 lg:row-start-3' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <span className="text-[10px] font-bold tracking-[0.1em] text-teal-700">{step.num}</span>
              <h3 className={`mt-1 text-sm font-semibold text-slate-950 sm:text-[15px] ${koreanLineBreak}`}>
                {step.title}
              </h3>
              <p className={`mt-1 text-xs leading-relaxed text-slate-600 sm:text-sm ${koreanLineBreak}`}>
                {step.description}
              </p>
            </article>
          ))}
          <div className="min-h-[220px] lg:col-start-2 lg:row-span-3 lg:row-start-1 lg:min-h-0 lg:h-full">
            <PrivateClassFlowGallery images={privatePage.classFlow.images} />
          </div>
        </div>
      </Section>

      <Section>
        <MidConsultCta />
      </Section>

      <Section
        id="curriculum"
        className="scroll-mt-36 rounded-2xl border border-slate-200/80 bg-slate-50/80 px-4 py-5 sm:px-5 sm:py-6"
      >
        <PrivateCurriculumSection />
      </Section>

      <Section className="space-y-6">
        <LandingSectionHeading
          eyebrow="운영"
          title="장소와 수업 단위"
          lead="익숙한 공간에서, 아이에게 맞는 주기로 시작합니다."
          accent="teal"
        />
        <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr] lg:gap-6">
          <div className={`${premiumPanel} px-6 py-7 sm:px-8 sm:py-8`}>
            <div className="flex items-end justify-between gap-3 border-b border-stone-200/80 pb-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-teal-800">수업 장소</p>
                <h3 className="mt-1 text-lg font-semibold tracking-tight text-slate-950">수업 장소</h3>
              </div>
              <p className="text-xs font-medium text-stone-400">상담 후 조율</p>
            </div>
            <ul className="mt-1 divide-y divide-stone-100">
              {privatePage.classFormat.locations.map((loc, index) => (
                <li key={loc.title} className="flex gap-4 py-4 first:pt-5 last:pb-0">
                  <span className="mt-0.5 w-7 shrink-0 text-[11px] font-bold tracking-[0.12em] text-stone-300">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <div className="min-w-0">
                    <p className="text-[15px] font-semibold text-slate-950">{loc.title}</p>
                    <p className={`mt-1 text-sm leading-relaxed text-stone-500 ${koreanLineBreak}`}>
                      {loc.description}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className={`${premiumPanelDark} px-6 py-7 sm:px-8 sm:py-8`}>
            <div className="border-b border-white/10 pb-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-teal-200/90">수업 사이클</p>
              <h3 className="mt-1 text-lg font-semibold tracking-tight text-white">수업 단위</h3>
            </div>
            <ul className="mt-5 space-y-4">
              {privatePage.sessionCycles.items.map((item) => (
                <li key={item.label} className="rounded-2xl bg-white/10 px-4 py-4 ring-1 ring-white/15">
                  <p className="text-[15px] font-semibold text-white">{item.label}</p>
                  <p className={`mt-1.5 text-sm leading-relaxed text-white/70 ${koreanLineBreak}`}>
                    {item.description}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      <Section id="instructors" className="scroll-mt-36 space-y-6">
        <LandingSectionHeading
          eyebrow={privatePage.instructors.eyebrow}
          title={privatePage.instructors.title}
          lead="체육교육 전공 기반 운영진이 수업 설계와 강사 기준을 함께 봅니다."
          accent="teal"
        />
        <div className="grid gap-5 sm:grid-cols-3 sm:gap-5">
          {privatePage.instructors.items.map((item) => (
            <article key={item.name} className={premiumPanel}>
              <div className="relative aspect-[4/5] w-full overflow-hidden bg-stone-100">
                <ExternalPhoto
                  src={item.photo}
                  alt={item.name}
                  className="absolute inset-0"
                  fit="cover"
                  sizes="(max-width: 640px) 100vw, 33vw"
                />
                <div
                  className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[#0F1C1A]/55 to-transparent"
                  aria-hidden
                />
              </div>
              <div className="px-5 py-5 sm:px-6 sm:py-6">
                <h3 className="text-lg font-semibold tracking-tight text-slate-950">{item.name}</h3>
                <p className="mt-1 text-sm font-medium text-teal-800">{item.degree}</p>
                <ul className="mt-4 flex flex-wrap gap-1.5">
                  {item.badges.map((badge) => (
                    <li
                      key={badge}
                      className={`rounded-full bg-stone-100 px-2.5 py-1 text-[11px] font-semibold text-stone-600 ${koreanLineBreak}`}
                    >
                      {badge}
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </div>
      </Section>

      <Section id="reviews" className="scroll-mt-36 space-y-4">
        <LandingSectionHeading
          eyebrow={privatePage.reviews.eyebrow}
          title={privatePage.reviews.title}
          accent="teal"
        />
        <div className="grid gap-3 lg:grid-cols-3">
          {privatePage.reviews.items.map((item) => (
            <article key={item.who + item.course} className={reviewCardShell}>
              <p className="text-sm tracking-wide text-amber-500" aria-label="별점 5점">
                ★★★★★
              </p>
              <p className={`mt-2.5 flex-1 text-sm leading-relaxed text-slate-700 ${koreanLineBreak}`}>
                &ldquo;{item.text}&rdquo;
              </p>
              <div className="mt-3 border-t border-slate-100 pt-2.5">
                <p className="text-sm font-semibold text-slate-950">{item.who}</p>
                <p className="mt-0.5 text-xs text-teal-800">{item.course}</p>
              </div>
            </article>
          ))}
        </div>
      </Section>

      <Section>
        <MidConsultCta />
      </Section>

      <Section id="process" className="scroll-mt-36">
        <LandingProcessOnePager data={privatePage.processOnePager} />
      </Section>

      <Section className="space-y-4">
        <LandingSectionHeading eyebrow={privatePage.faq.eyebrow} title={privatePage.faq.title} accent="teal" />
        <LandingFaqList items={privatePage.faq.items.slice(0, 4)} accent="teal" />
      </Section>

      <Section>
        <PrivateApplyForm />
      </Section>

      <LandingFloatingCta primaryHref="#apply" primaryLabel="개인수업 상담" showAfterId="hero" />
    </div>
  );
}
