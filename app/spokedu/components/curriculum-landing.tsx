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

const exampleCardShell =
  'flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white';

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
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:items-stretch sm:gap-4 lg:grid-cols-4">
          {curriculumPage.contentProducts.items.map((item, index) => (
            <article key={item.title} className={contentCardShell}>
              <MediaPanel
                media={HOME_MEDIA[item.mediaKey]}
                className="aspect-[5/3] min-h-[120px] shrink-0 rounded-none border-0 sm:min-h-0"
                photoPriority={index === 0}
              />
              <div className="flex flex-1 flex-col border-t border-slate-100 p-5">
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
          <h2 className={landingSectionTitle}>{curriculumPage.serviceExamples.title}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600 [word-break:keep-all] sm:text-[15px]">
            {curriculumPage.serviceExamples.lead}
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:items-stretch sm:gap-4">
          {curriculumPage.serviceExamples.items.map((item) => {
            const inner = (
              <>
                <MediaPanel
                  media={HOME_MEDIA[item.mediaKey]}
                  className="aspect-[16/10] shrink-0 rounded-none border-0"
                />
                <div className="flex flex-1 flex-col p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-teal-200 bg-teal-50 px-2.5 py-0.5 text-[11px] font-semibold text-teal-800">
                      {item.status}
                    </span>
                    <span className="text-xs text-slate-500">{item.date}</span>
                  </div>
                  <h3 className="mt-2 text-base font-semibold text-slate-950 sm:text-lg [word-break:keep-all]">
                    {item.title}
                  </h3>
                  <p className="mt-1 text-sm font-medium text-slate-700 [word-break:keep-all]">{item.venue}</p>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600 [word-break:keep-all]">
                    {item.description}
                  </p>
                  {'href' in item && item.href ? (
                    <span className="mt-3 text-sm font-semibold text-indigo-700">자세히 보기 →</span>
                  ) : null}
                </div>
              </>
            );

            return 'href' in item && item.href ? (
              <Link
                key={item.title}
                href={item.href}
                data-track="curriculum-example-link"
                data-track-label={`curriculum-example-${item.title}`}
                className={`${exampleCardShell} transition hover:border-teal-200 hover:shadow-md`}
              >
                {inner}
              </Link>
            ) : (
              <article key={item.title} className={exampleCardShell}>
                {inner}
              </article>
            );
          })}
        </div>
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
