'use client';

import { motion, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';
import { HOME_MEDIA } from '../data/home-media';
import { privatePage } from '../data/private-page';
import { audienceLandingStack, koreanLineBreak, landingCardFrame, landingCardPanelPad } from '../lib/ui-classes';
import { ExternalPhoto } from './external-photo';
import { HomeSectionRule } from './home-section-rule';
import { LandingFaqList } from './landing-faq-list';
import { LandingSectionHeading } from './landing-section-heading';
import { LandingStepPanel } from './landing-step-grid';
import { LandingFinalCta } from './landing-final-cta';
import { LandingHero } from './landing-hero';
import { PrivateApplyForm } from './private-apply-form';
import { PrivateClassFlowGallery } from './private-class-flow-gallery';
import { PrivateCurriculumSection } from './private-curriculum-section';
import { PrivateMoveReportSection } from './private-move-report-section';
import { PrivateTrustMetrics } from './private-trust-metrics';
import { LandingAnchorNav } from './landing-anchor-nav';
import { LandingFloatingCta } from './landing-floating-cta';
import { MediaPanel } from './visual';

const whoCardShell = `flex h-full flex-col ${landingCardPanelPad} ${landingCardFrame}`;
const locationCardShell = `flex h-full flex-col ${landingCardPanelPad} ${landingCardFrame}`;
const reviewCardShell = `flex h-full flex-col border-l-4 border-l-teal-600 ${landingCardPanelPad} ${landingCardFrame}`;
const privateHeroNeeds = ['운동 자신감', '기초체력', '종목 준비'] as const;
const privateAnchorItems = [
  { href: '#instructors', label: '소개' },
  { href: '#class-flow', label: '수업 현장' },
  { href: '#curriculum', label: '종목 가이드' },
  { href: '#reviews', label: '후기' },
] as const;
const privateDecisionFlow = [
  { label: '1', title: '아이 상태 확인', body: '운동 경험, 자신감, 목표 종목을 먼저 정리합니다.' },
  { label: '2', title: '수업 방향 선택', body: '1:1, 소그룹, 종목 준비 중 적합한 방향을 좁힙니다.' },
  { label: '3', title: '수업 설계', body: '1:1 또는 소그룹, 장소와 주기를 아이에게 맞춰 제안합니다.' },
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

export default function PrivateLanding() {
  return (
    <div className={`${audienceLandingStack} pb-24`}>
      <div id="hero">
      <LandingHero
        kicker={privatePage.hero.kicker}
        kickerClassName="text-stone-500"
        leading={
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal-700">For Parents</p>
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
        cta={{ href: '#apply', label: '상담 신청' }}
        ariaLabel="개인수업 랜딩 바로가기"
      />

      <Section className="border-y border-stone-200 bg-white px-1 py-8 sm:px-2 sm:py-10">
        <PrivateTrustMetrics />
      </Section>

      <Section
        id="lesson-design"
        className="grid scroll-mt-24 gap-4 rounded-2xl border border-teal-100 bg-teal-50/40 px-5 py-6 sm:px-6 sm:py-7 lg:grid-cols-[0.38fr_0.62fr] lg:items-center"
      >
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal-800">Private Lesson Design</p>
          <h2 className="mt-2 text-2xl font-black leading-tight tracking-tight text-slate-950 sm:text-3xl [word-break:keep-all]">
            아이에게 필요한 수업 방향을 먼저 정리합니다.
          </h2>
          <p className={`mt-3 text-sm leading-relaxed text-slate-600 ${koreanLineBreak}`}>
            운동 경험, 자신감, 목표 종목, 가능한 장소를 함께 확인한 뒤 아이에게 맞는 수업 형태와 운영 방식을
            제안합니다.
          </p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <a
              href="#move-report"
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-teal-200 bg-white px-4 text-sm font-bold text-teal-900"
            >
              움직임 성향 참고하기
            </a>
            <a
              href="#consult-flow"
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-slate-950 px-4 text-sm font-bold text-white"
            >
              상담 흐름 보기
            </a>
          </div>
        </div>
        <ol className="grid gap-3 sm:grid-cols-3">
          {privateDecisionFlow.map((item) => (
            <li key={item.title} className="rounded-xl border border-white/80 bg-white p-4 shadow-sm shadow-slate-900/[0.03]">
              <span className="text-xs font-black text-teal-700">{item.label}</span>
              <h3 className="mt-2 text-sm font-bold text-slate-950">{item.title}</h3>
              <p className={`mt-1.5 text-xs leading-relaxed text-slate-600 ${koreanLineBreak}`}>{item.body}</p>
            </li>
          ))}
        </ol>
      </Section>

      <HomeSectionRule />

      <Section className="space-y-5 sm:space-y-6">
        <LandingSectionHeading eyebrow={privatePage.whoNeeds.eyebrow} title={privatePage.whoNeeds.title} accent="teal" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-3.5 lg:grid-cols-4">
          {privatePage.whoNeeds.items.map((item) => (
            <article key={item.title} className={whoCardShell}>
              <h3 className={`text-[15px] font-semibold text-slate-900 sm:text-base ${koreanLineBreak}`}>
                {item.title}
              </h3>
              <p className={`mt-2 text-sm leading-relaxed text-slate-600 ${koreanLineBreak}`}>{item.description}</p>
            </article>
          ))}
        </div>
      </Section>

      <Section id="instructors" className="scroll-mt-36 space-y-5 sm:space-y-6">
        <LandingSectionHeading
          eyebrow={privatePage.instructors.eyebrow}
          title={privatePage.instructors.title}
          accent="teal"
        />
        <div className="grid gap-3 sm:gap-4 lg:grid-cols-3">
          {privatePage.instructors.items.map((item) => (
            <article key={item.name} className={`relative overflow-hidden pt-1 ${landingCardFrame}`}>
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-teal-500 to-teal-700" aria-hidden />
              <div className="flex flex-col items-center px-5 py-6 text-center sm:px-6 sm:py-7">
                <div className="relative h-36 w-36 shrink-0 overflow-hidden rounded-[1.375rem] border border-slate-200 bg-slate-100 sm:h-44 sm:w-44">
                  <ExternalPhoto src={item.photo} alt={item.name} className="absolute inset-0" fit="cover" />
                </div>
                <div className="mt-4 flex min-w-0 flex-1 flex-col items-center">
                  <h3 className="text-lg font-bold text-slate-950 sm:text-xl">{item.name}</h3>
                  <p className="mt-1 text-sm font-semibold text-teal-800">{item.degree}</p>
                  <ul className="mt-3 flex flex-wrap justify-center gap-2">
                    {item.badges.map((badge) => (
                      <li
                        key={badge}
                        className={`rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600 ${koreanLineBreak}`}
                      >
                        {badge}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </article>
          ))}
        </div>
      </Section>

      <HomeSectionRule />

      <Section className="space-y-5 sm:space-y-6">
        <LandingSectionHeading
          eyebrow={privatePage.classCompare.eyebrow}
          title={privatePage.classCompare.title}
          accent="teal"
        />
        <div className="grid gap-3 sm:grid-cols-2 sm:items-stretch sm:gap-4">
          {privatePage.classCompare.items.map((item, index) => (
            <article key={item.title} className="flex h-full flex-col overflow-hidden rounded-[1.35rem] border border-slate-200/80 bg-white">
              <MediaPanel
                media={HOME_MEDIA[item.mediaKey]}
                className="aspect-[16/10] min-h-[150px] shrink-0 rounded-none border-0 sm:min-h-0"
                photoPriority={index === 0}
              />
              <div className={`flex flex-1 flex-col border-t border-slate-100 ${landingCardPanelPad}`}>
                <h3 className="text-[15px] font-semibold text-slate-950 sm:text-lg">{item.title}</h3>
                <p className={`mt-2 text-sm leading-relaxed text-slate-600 ${koreanLineBreak}`}>{item.description}</p>
              </div>
            </article>
          ))}
        </div>
      </Section>

      <Section id="class-flow" className="scroll-mt-36 space-y-5 sm:space-y-6">
        <LandingSectionHeading
          eyebrow={privatePage.classFlow.eyebrow}
          title={privatePage.classFlow.title}
          lead={privatePage.classFlow.lead}
          accent="teal"
        />
        <div className="grid gap-3 lg:grid-cols-2 lg:grid-rows-3 lg:items-stretch lg:gap-3 lg:min-h-[26rem]">
          {privatePage.classFlow.steps.map((step, index) => (
            <article
              key={step.num}
              className={[
                'flex h-full flex-col justify-center px-4 py-3.5 sm:px-5 sm:py-4',
                landingCardFrame,
                index === 0 ? 'lg:col-start-1 lg:row-start-1' : '',
                index === 1 ? 'lg:col-start-1 lg:row-start-2' : '',
                index === 2 ? 'lg:col-start-1 lg:row-start-3' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <span className="text-[10px] font-bold tracking-[0.1em] text-teal-700">{step.num}</span>
              <h3 className={`mt-1 text-[15px] font-semibold text-slate-950 sm:text-base ${koreanLineBreak}`}>
                {step.title}
              </h3>
              <p className={`mt-1.5 text-sm leading-relaxed text-slate-600 ${koreanLineBreak}`}>{step.description}</p>
            </article>
          ))}
          <div className="min-h-[240px] sm:min-h-[280px] lg:col-start-2 lg:row-span-3 lg:row-start-1 lg:min-h-0 lg:h-full">
            <PrivateClassFlowGallery images={privatePage.classFlow.images} />
          </div>
        </div>
      </Section>

      <HomeSectionRule />

      <Section
        id="curriculum"
        className="scroll-mt-36 rounded-2xl border border-slate-200/80 bg-slate-50/90 px-4 py-6 sm:px-6 sm:py-8"
      >
        <PrivateCurriculumSection />
      </Section>

      <HomeSectionRule />

      <Section className="space-y-5 sm:space-y-6">
        <LandingSectionHeading
          eyebrow={privatePage.classFormat.eyebrow}
          title={privatePage.classFormat.title}
          lead={privatePage.classFormat.lead}
          accent="teal"
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-3.5">
          {privatePage.classFormat.locations.map((loc) => (
            <article key={loc.title} className={locationCardShell}>
              <h3 className="text-[15px] font-semibold text-slate-950 sm:text-base">{loc.title}</h3>
              <p className={`mt-2 text-sm leading-relaxed text-slate-600 ${koreanLineBreak}`}>{loc.description}</p>
            </article>
          ))}
        </div>
      </Section>

      <Section className="space-y-5 sm:space-y-6">
        <LandingSectionHeading
          eyebrow={privatePage.sessionCycles.eyebrow}
          title={privatePage.sessionCycles.title}
          lead={privatePage.sessionCycles.lead}
          accent="teal"
        />
        <div className="grid gap-3 sm:grid-cols-3">
          {privatePage.sessionCycles.items.map((item) => (
            <article
              key={item.label}
              className="rounded-2xl border border-teal-100 bg-teal-50/30 px-4 py-3.5 sm:px-5 sm:py-4"
            >
              <h3 className="text-[15px] font-semibold text-teal-900 sm:text-base">{item.label}</h3>
              <p className={`mt-1.5 text-sm leading-relaxed text-slate-600 ${koreanLineBreak}`}>{item.description}</p>
            </article>
          ))}
        </div>
      </Section>

      <Section>
        <PrivateMoveReportSection />
      </Section>

      <Section id="reviews" className="scroll-mt-36 space-y-5 sm:space-y-6">
        <LandingSectionHeading
          eyebrow={privatePage.reviews.eyebrow}
          title={privatePage.reviews.title}
          lead={privatePage.reviews.lead}
          accent="teal"
        />
        <div className="grid gap-3 sm:gap-4 lg:grid-cols-3">
          {privatePage.reviews.items.map((item) => (
            <article key={item.who + item.course} className={reviewCardShell}>
              <p className="text-sm text-amber-500" aria-hidden>
                ★★★★★
              </p>
              <p className={`mt-2.5 flex-1 text-sm leading-relaxed text-slate-700 ${koreanLineBreak}`}>
                &ldquo;{item.text}&rdquo;
              </p>
              <div className="mt-3.5 border-t border-slate-100 pt-3">
                <p className="text-sm font-semibold text-slate-950">{item.who}</p>
                <p className="mt-0.5 text-xs text-teal-800">{item.course}</p>
              </div>
            </article>
          ))}
        </div>
      </Section>

      <Section className="scroll-mt-24">
        <div id="consult-flow" className="scroll-mt-24">
          <LandingStepPanel steps={privatePage.consultFlow.steps} accent="teal" columns="4">
            <LandingSectionHeading
              eyebrow={privatePage.consultFlow.eyebrow}
              title={privatePage.consultFlow.title}
              accent="teal"
            />
          </LandingStepPanel>
        </div>
      </Section>

      <Section className="space-y-5 sm:space-y-6">
        <LandingSectionHeading eyebrow={privatePage.faq.eyebrow} title={privatePage.faq.title} accent="teal" />
        <LandingFaqList items={privatePage.faq.items} accent="teal" />
      </Section>

      <HomeSectionRule />

      <Section>
        <PrivateApplyForm />
      </Section>

      <LandingFinalCta
        title={privatePage.finalCta.title}
        description={privatePage.finalCta.description}
        tone="dark"
        backgroundMedia={HOME_MEDIA[privatePage.finalCta.mediaKey]}
        links={[{ ...privatePage.finalCta.primary, variant: 'on-dark-primary' }]}
      />

      <LandingFloatingCta primaryHref="#apply" primaryLabel="상담 신청하기" showAfterId="hero" />
    </div>
  );
}
