'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';
import { HOME_MEDIA } from '../data/home-media';
import { curriculumPage } from '../data/curriculum-page';
import { landingPageStack, landingSectionTitle } from '../lib/ui-classes';
import { LandingFinalCta } from './landing-final-cta';
import { LandingHero } from './landing-hero';
import { MediaPanel } from './visual';

const contentCardShell =
  'flex h-full flex-col overflow-hidden rounded-[1.25rem] border border-slate-200/80 bg-white';

const packageCardShell =
  'flex h-full flex-col rounded-2xl border border-slate-200/80 bg-white px-4 py-5 sm:px-5 sm:py-6';

function Section({ children, className = '', delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const reducedMotion = useReducedMotion();
  return (
    <motion.section
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

export default function CurriculumLanding() {
  return (
    <div className={landingPageStack}>
      <LandingHero
        kicker="강사 · 기관 · 파트너 · 교육 콘텐츠"
        kickerClassName="text-teal-700"
        lines={curriculumPage.hero.lines}
        subtitle={curriculumPage.hero.subtitle}
        media={HOME_MEDIA[curriculumPage.hero.mediaKey]}
        priority
        primaryCta={curriculumPage.heroCtas.primary}
      />

      <Section className="space-y-5 sm:space-y-7">
        <div>
          <h2 className={landingSectionTitle}>{curriculumPage.contentProducts.title}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600 [word-break:keep-all] sm:text-[15px]">
            {curriculumPage.contentProducts.lead}
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:items-stretch sm:gap-4 lg:grid-cols-3 xl:grid-cols-5">
          {curriculumPage.contentProducts.items.map((item, index) => (
            <article key={item.title} className={contentCardShell}>
              <MediaPanel
                media={HOME_MEDIA[item.mediaKey]}
                className="aspect-[5/3] min-h-[120px] shrink-0 rounded-none border-0 sm:min-h-0"
                photoPriority={index === 0}
              />
              <div className="flex flex-1 flex-col border-t border-slate-100 p-4">
                <h3 className="text-sm font-semibold text-slate-950 sm:text-base">{item.title}</h3>
                <p className="mt-1.5 line-clamp-3 text-sm leading-relaxed text-slate-600 [word-break:keep-all]">
                  {item.description}
                </p>
              </div>
            </article>
          ))}
        </div>
      </Section>

      <Section className="space-y-5 sm:space-y-7">
        <div>
          <h2 className={landingSectionTitle}>{curriculumPage.packages.title}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600 [word-break:keep-all] sm:text-[15px]">
            {curriculumPage.packages.lead}
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:items-stretch sm:gap-4">
          {curriculumPage.packages.items.map((item) => (
            <article key={item.title} className={packageCardShell}>
              <h3 className="text-base font-semibold text-slate-950 sm:text-lg [word-break:keep-all]">
                {item.title}
              </h3>
              <p className="mt-2 flex-1 line-clamp-3 text-sm leading-relaxed text-slate-600 [word-break:keep-all]">
                {item.description}
              </p>
            </article>
          ))}
        </div>
      </Section>

      <Section className="overflow-hidden rounded-[1.75rem] border border-teal-200/60 bg-white px-5 py-8 sm:rounded-[2rem] sm:px-8 sm:py-10">
        <h2 className={landingSectionTitle}>{curriculumPage.productionFlow.title}</h2>
        <ol className="mt-5 flex gap-2.5 overflow-x-auto pb-1 scroll-smooth [scrollbar-width:thin] sm:grid sm:grid-cols-2 sm:gap-3 sm:overflow-visible lg:grid-cols-4">
          {curriculumPage.productionFlow.steps.map((step, index) => (
            <li
              key={step.label}
              className="flex min-w-[10.5rem] shrink-0 flex-col rounded-xl border border-teal-100 bg-teal-50/30 px-3.5 py-3.5 sm:min-w-0"
            >
              <span className="text-[10px] font-semibold tracking-[0.08em] text-teal-700">{index + 1}단계</span>
              <span className="mt-1 text-sm font-semibold text-slate-900 [word-break:keep-all]">{step.label}</span>
              <span className="mt-1.5 line-clamp-3 text-xs leading-relaxed text-slate-600 [word-break:keep-all]">
                {step.detail}
              </span>
            </li>
          ))}
        </ol>
      </Section>

      <Section className="overflow-hidden rounded-[1.75rem] border border-indigo-200/60 bg-gradient-to-br from-indigo-50/80 via-white to-violet-50/40 px-5 py-8 sm:rounded-[2rem] sm:px-8 sm:py-10">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-indigo-600">강사용 구독 도구</p>
        <h2 className="mt-2 text-xl font-black leading-snug text-slate-950 [word-break:keep-all] sm:text-2xl">
          수업안·SPOMOVE·설명 문구를 매주 쓸 수 있는 도구
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600 [word-break:keep-all] sm:text-[15px]">
          SPOKEDU MASTER는 프로그램 라이브러리, 큰 화면 실행 도구, 수업 기록, 보호자·기관 설명 문구를 한 곳에서 제공하는 강사용 수업 운영 플랫폼입니다. 커리큘럼 콘텐츠를 실제 수업에서 반복 활용하고 싶은 강사와 기관에 적합합니다.
        </p>
        <ul className="mt-4 flex flex-wrap gap-2" aria-label="SPOKEDU MASTER 주요 기능">
          {['프로그램 라이브러리', 'SPOMOVE 큰 화면 실행', '수업 기록', '설명 문구 자동 생성', '7일 무료 체험'].map((tag) => (
            <li key={tag}>
              <span className="rounded-full border border-indigo-200 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-800">
                {tag}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/spokedu-master/landing"
            data-track="curriculum-to-master-landing"
            data-track-label="curriculum-master-cta-primary"
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-indigo-600 px-5 text-sm font-bold text-white transition hover:bg-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
          >
            SPOKEDU MASTER 살펴보기
          </Link>
          <Link
            href="/spokedu-master/landing"
            data-track="curriculum-to-master-trial"
            data-track-label="curriculum-master-cta-trial"
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-indigo-300 bg-white px-5 text-sm font-bold text-indigo-700 transition hover:border-indigo-400 hover:bg-indigo-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
          >
            7일 무료 체험
          </Link>
        </div>
      </Section>

      <LandingFinalCta
        title={curriculumPage.finalCta.title}
        description={curriculumPage.finalCta.description}
        tone="dark"
        backgroundMedia={HOME_MEDIA[curriculumPage.finalCta.mediaKey]}
        links={[{ ...curriculumPage.finalCta.primary, variant: 'on-dark-primary' }]}
      />
    </div>
  );
}
