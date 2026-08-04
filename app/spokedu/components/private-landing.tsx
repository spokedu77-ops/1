'use client';

import { motion, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';
import { HOME_MEDIA } from '../data/home-media';
import { privatePage } from '../data/private-page';
import { koreanLineBreak, landingCardFrame } from '../lib/ui-classes';
import { LandingFaqList } from './landing-faq-list';
import { LandingFinalCta } from './landing-final-cta';
import { LandingSectionHeading } from './landing-section-heading';
import { LandingHero } from './landing-hero';
import { PrivateApplyForm } from './private-apply-form';
import { PrivateClassFlowGallery } from './private-class-flow-gallery';
import { PrivateTrustMetrics } from './private-trust-metrics';
import { LandingAnchorNav } from './landing-anchor-nav';
import { LandingFloatingCta } from './landing-floating-cta';
import { LandingProcessOnePager } from './landing-process-one-pager';
import { MediaPanel } from './visual';

const premiumPanel =
  'overflow-hidden rounded-[1.5rem] border border-stone-200/70 bg-white shadow-[0_18px_50px_-36px_rgba(15,23,42,0.45)]';
const premiumPanelDark =
  'overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#0B1F46] text-white shadow-[0_18px_50px_-36px_rgba(15,23,42,0.55)]';
const whoCardShell = `flex h-full flex-col px-4 py-4 sm:px-5 sm:py-5 ${premiumPanel}`;
const reviewCardShell = `flex h-full flex-col border-l-[3px] border-l-teal-700 px-5 py-5 sm:px-6 sm:py-6 ${premiumPanel}`;
const privateHeroNeeds = ['운동 자신감', '기초체력', '종목 준비'] as const;
const privateAnchorItems = [
  { href: '#fit', label: '아이 적합성' },
  { href: '#format', label: '수업 방식' },
  { href: '#class-flow', label: '실제 수업' },
  { href: '#reviews', label: '학부모 사례' },
  { href: '#apply', label: '상담' },
] as const;

function PrivateGoalFitSection() {
  const section = privatePage.goalPaths;

  return (
    <div className="space-y-4">
      <LandingSectionHeading eyebrow={section.eyebrow} title={section.title} lead={section.lead} accent="teal" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {section.items.map((item) => (
          <article key={item.title} className={whoCardShell}>
            <h3 className={`text-[15px] font-bold text-slate-950 ${koreanLineBreak}`}>{item.title}</h3>
            <p className={`mt-2 text-xs font-semibold leading-relaxed text-teal-800 ${koreanLineBreak}`}>
              {item.childSignal}
            </p>
            <p className={`mt-2 text-sm leading-relaxed text-slate-600 ${koreanLineBreak}`}>{item.classDirection}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {item.programs.map((program) => (
                <span key={program} className="rounded-full border border-stone-200 bg-stone-50 px-2 py-0.5 text-[11px] font-semibold text-stone-600">
                  {program}
                </span>
              ))}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function PrivateConsultConditionsSection() {
  return (
    <div className={`${premiumPanel} space-y-4 px-5 py-5 sm:px-6 sm:py-6`}>
      <LandingSectionHeading
        eyebrow="상담 가능 조건"
        title="수업 장소와 주기는 상담에서 함께 맞춥니다"
        lead="처음부터 장소·횟수·형태를 모두 정하고 오실 필요는 없습니다. 아이 상태와 가능한 조건을 함께 보고 시작점을 정합니다."
        accent="teal"
      />
      <div className="grid gap-3 lg:grid-cols-2">
        <div>
          <p className="text-sm font-bold text-slate-950">가능한 장소</p>
          <ul className="mt-2 grid gap-2 sm:grid-cols-2">
            {privatePage.classFormat.locations.slice(0, 4).map((loc) => (
              <li key={loc.title} className="rounded-xl border border-stone-200/80 bg-stone-50/80 p-3">
                <p className="text-sm font-semibold text-slate-900">{loc.title}</p>
                <p className={`mt-1 text-xs leading-relaxed text-slate-600 ${koreanLineBreak}`}>{loc.description}</p>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-sm font-bold text-slate-950">가능한 수업 단위</p>
          <ul className="mt-2 grid gap-2">
            {privatePage.sessionCycles.items.map((item) => (
              <li key={item.label} className="rounded-xl border border-teal-100 bg-teal-50/60 p-3">
                <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                <p className={`mt-1 text-xs leading-relaxed text-slate-600 ${koreanLineBreak}`}>{item.description}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function PrivateInstructorTrustSection() {
  return (
    <div className={`${premiumPanelDark} px-5 py-6 text-white sm:px-7 sm:py-7`}>
      <LandingSectionHeading
        eyebrow={privatePage.instructors.eyebrow}
        title="지도자 신뢰는 프로필보다 수업 기준으로 확인합니다"
        lead="체육교육 전공 운영진이 수업 구조와 강사 기준을 함께 봅니다. 화면에는 핵심 기준만 남기고, 세부 배정은 상담에서 확인합니다."
        accent="teal"
      />
      <div className="mt-4 grid gap-2.5 sm:grid-cols-3">
        {privatePage.instructors.items.map((item) => (
          <article key={item.name} className="rounded-xl border border-white/10 bg-white/[0.06] p-4">
            <h3 className="text-sm font-bold text-white">{item.name}</h3>
            <p className="mt-1 text-xs font-semibold text-[#A8C0FF]">{item.degree}</p>
            <p className={`mt-2 text-xs leading-relaxed text-white/70 ${koreanLineBreak}`}>{item.badges[0]}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
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

      <Section id="fit" className="scroll-mt-36">
        <PrivateGoalFitSection />
      </Section>

      <Section id="format" className="scroll-mt-36 space-y-4">
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
              <div className="flex flex-1 flex-col border-t border-slate-100 px-4 py-3.5 sm:px-5 sm:py-4">
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
        <PrivateConsultConditionsSection />
      </Section>

      <Section id="instructors" className="scroll-mt-36">
        <PrivateInstructorTrustSection />
      </Section>

      <Section id="reviews" className="scroll-mt-36 space-y-4">
        <LandingSectionHeading
          eyebrow={privatePage.reviews.eyebrow}
          title={privatePage.reviews.title}
          accent="teal"
        />
        <div className="grid gap-3 lg:grid-cols-2">
          {privatePage.reviews.items.slice(0, 2).map((item) => (
            <article key={item.who + item.course} className={reviewCardShell}>
              <p className={`flex-1 text-sm leading-relaxed text-slate-700 ${koreanLineBreak}`}>
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
      <Section id="process" className="scroll-mt-36">
        <LandingProcessOnePager data={privatePage.processOnePager} />
      </Section>

      <Section className="space-y-4">
        <LandingSectionHeading eyebrow={privatePage.faq.eyebrow} title={privatePage.faq.title} accent="teal" />
        <LandingFaqList items={privatePage.faq.items.slice(0, 4)} accent="teal" />
      </Section>

      <LandingFinalCta
        eyebrow="상담"
        title={privatePage.finalCta.title}
        description={privatePage.finalCta.description}
        backgroundMedia={HOME_MEDIA[privatePage.finalCta.mediaKey]}
        links={[
          {
            label: privatePage.finalCta.primary.label,
            href: privatePage.finalCta.primary.href,
            trackLabel: privatePage.finalCta.primary.trackLabel,
          },
        ]}
      />

      <Section>
        <PrivateApplyForm />
      </Section>

      <LandingFloatingCta primaryHref="#apply" primaryLabel="개인수업 상담" showAfterId="hero" />
    </div>
  );
}
