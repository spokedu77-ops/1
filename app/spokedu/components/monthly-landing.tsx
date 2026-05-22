'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { LandingSection } from './landing-section';
import { MediaPanel, MediaRenderer, MotionPoster } from './visual';
import { HOME_MEDIA } from '../data/home-media';
import { monthlyPage } from '../data/monthly-page';
import {
  btnPrimary,
  fineHover,
  landingH1,
  landingHeroCopy,
  landingHeroGrid,
  landingHeroSubtitle,
  landingHeroVisual,
  landingPageStack,
  landingSectionTitle,
} from '../lib/ui-classes';
import { inferTrackFromHref } from '../lib/tracking';

const focusRing =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500';

function BenefitCard({
  title,
  description,
  index,
  reducedMotion,
}: {
  title: string;
  description: string;
  index: number;
  reducedMotion: boolean | null;
}) {
  return (
    <motion.article
      initial={reducedMotion ? false : { opacity: 0, y: 12 }}
      whileInView={reducedMotion ? {} : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.4, delay: 0.05 * index }}
      className="flex h-full flex-col rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5"
    >
      <h3 className="text-base font-bold text-slate-950 [word-break:keep-all]">{title}</h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600 [word-break:keep-all]">{description}</p>
    </motion.article>
  );
}

export function MonthlyLanding() {
  const reducedMotion = useReducedMotion();
  const heroMedia = HOME_MEDIA[monthlyPage.hero.mediaKey];
  const definitionMedia = HOME_MEDIA[monthlyPage.definition.mediaKey];
  const ctaMedia = HOME_MEDIA[monthlyPage.cta.mediaKey];

  return (
    <div className={landingPageStack}>
      <LandingSection className="relative -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className={landingHeroGrid}>
          <div className={landingHeroCopy}>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-indigo-600">
              {monthlyPage.hero.kicker}
            </p>
            <h1 className={`${landingH1} text-slate-950`}>
              {monthlyPage.hero.lines.map((line, index) => (
                <motion.span
                  key={line}
                  initial={reducedMotion ? false : { opacity: 0, y: 24 }}
                  animate={reducedMotion ? {} : { opacity: 1, y: 0 }}
                  transition={{ duration: 0.55, ease: [0.25, 0.1, 0.25, 1], delay: 0.07 * index }}
                  className="block"
                >
                  {line}
                </motion.span>
              ))}
            </h1>
            <p
              className={`${landingHeroSubtitle} max-w-[20.5rem] [word-break:keep-all] sm:max-w-lg`}
            >
              {monthlyPage.hero.subtitle}
            </p>
            <div className="mt-6 sm:mt-7">
              <Link
                href={monthlyPage.hero.cta.href}
                data-track={inferTrackFromHref(monthlyPage.hero.cta.href)}
                data-track-label={monthlyPage.hero.cta.trackLabel}
                className={`${btnPrimary} min-h-12 !w-full sm:!w-auto`}
              >
                {monthlyPage.hero.cta.label}
              </Link>
            </div>
          </div>
          <div className={landingHeroVisual}>
            <MotionPoster media={heroMedia} variant="cinematic" priority sizes="heroSplit" />
          </div>
        </div>
      </LandingSection>

      <LandingSection className="space-y-4 sm:space-y-5" delay={0.04}>
        <h2 className={landingSectionTitle}>{monthlyPage.definition.title}</h2>
        <div className="grid gap-4 lg:grid-cols-[1.1fr_minmax(0,1fr)] lg:items-stretch">
          <p className="text-sm leading-relaxed text-slate-600 sm:text-base [word-break:keep-all]">
            {monthlyPage.definition.body}
          </p>
          <MediaPanel
            media={definitionMedia}
            className="aspect-[16/10] min-h-[180px] overflow-hidden rounded-2xl border border-slate-200/80 lg:aspect-auto lg:min-h-[200px]"
            sizes="card2"
            photoPriority
          />
        </div>
      </LandingSection>

      <LandingSection className="space-y-4 sm:space-y-5" delay={0.06}>
        <h2 className={landingSectionTitle}>{monthlyPage.benefits.title}</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:items-stretch sm:gap-4">
          {monthlyPage.benefits.items.map((item, index) => (
            <BenefitCard
              key={item.title}
              title={item.title}
              description={item.description}
              index={index}
              reducedMotion={reducedMotion}
            />
          ))}
        </div>
      </LandingSection>

      <LandingSection className="space-y-4 sm:space-y-5" delay={0.08}>
        <div>
          <h2 className={landingSectionTitle}>{monthlyPage.themeExamples.title}</h2>
          <p className="mt-2 text-sm text-slate-600 [word-break:keep-all]">{monthlyPage.themeExamples.lead}</p>
        </div>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3 lg:grid-cols-3">
          {monthlyPage.themeExamples.items.map((theme, index) => (
            <motion.article
              key={theme.title}
              initial={reducedMotion ? false : { opacity: 0, y: 10 }}
              whileInView={reducedMotion ? {} : { opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.15 }}
              transition={{ duration: 0.35, delay: 0.03 * index }}
              className="rounded-xl border border-slate-200/80 bg-slate-50/60 px-4 py-3.5 sm:px-4 sm:py-4"
            >
              <h3 className="text-sm font-bold text-indigo-900 [word-break:keep-all]">{theme.title}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-600 sm:text-sm [word-break:keep-all]">
                {theme.description}
              </p>
            </motion.article>
          ))}
        </div>
      </LandingSection>

      <LandingSection className="space-y-4 sm:space-y-5" delay={0.1}>
        <h2 className={landingSectionTitle}>{monthlyPage.operations.title}</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:items-stretch sm:gap-4">
          {monthlyPage.operations.items.map((item, index) => (
            <motion.article
              key={item.title}
              initial={reducedMotion ? false : { opacity: 0, y: 10 }}
              whileInView={reducedMotion ? {} : { opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.35, delay: 0.04 * index }}
              className="flex h-full flex-col rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-indigo-600">{item.title}</p>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600 [word-break:keep-all]">
                {item.description}
              </p>
            </motion.article>
          ))}
        </div>
      </LandingSection>

      <LandingSection className="rounded-2xl border border-slate-200/80 bg-slate-50/50 px-5 py-6 sm:px-7 sm:py-7" delay={0.11}>
        <h2 className={landingSectionTitle}>{monthlyPage.roleCompare.title}</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 sm:gap-5">
          <div className="rounded-xl border border-indigo-200/60 bg-white px-4 py-4 sm:px-5">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-indigo-700">월간 수업</p>
            <p className="mt-2 text-sm leading-relaxed text-slate-600 [word-break:keep-all]">
              {monthlyPage.roleCompare.monthlyLead}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200/80 bg-white px-4 py-4 sm:px-5">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">커리큘럼 콘텐츠</p>
            <p className="mt-2 text-sm leading-relaxed text-slate-600 [word-break:keep-all]">
              {monthlyPage.roleCompare.curriculumLead}
            </p>
            <Link
              href={monthlyPage.roleCompare.curriculumHref}
              data-track={inferTrackFromHref(monthlyPage.roleCompare.curriculumHref)}
              data-track-label="monthly-to-curriculum"
              className={`mt-3 inline-flex text-sm font-semibold text-slate-700 ${fineHover}hover:text-indigo-700 ${focusRing}`}
            >
              {monthlyPage.roleCompare.curriculumLinkLabel} →
            </Link>
          </div>
        </div>
      </LandingSection>

      <LandingSection className="relative overflow-hidden rounded-2xl border border-indigo-200/70 bg-gradient-to-br from-indigo-50 via-white to-sky-50 px-5 py-8 sm:rounded-3xl sm:px-8 sm:py-10">
        <div className="pointer-events-none absolute inset-0 opacity-40" aria-hidden>
          <MediaRenderer media={ctaMedia} intensity="photo" sizes="full" className="h-full w-full" />
        </div>
        <div className="pointer-events-none absolute inset-0 bg-white/78" aria-hidden />
        <div className="relative mx-auto max-w-xl text-center">
          <h2 className="text-xl font-bold text-slate-900 sm:text-2xl [word-break:keep-all]">
            {monthlyPage.cta.title}
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-slate-600 [word-break:keep-all] sm:text-[15px]">
            {monthlyPage.cta.description}
          </p>
          <div className="mt-6 flex justify-center">
            <Link
              href={monthlyPage.cta.href}
              data-track={inferTrackFromHref(monthlyPage.cta.href)}
              data-track-label={monthlyPage.cta.trackLabel}
              className={`${btnPrimary} min-h-12 !w-full sm:!min-w-[18rem] sm:!w-auto`}
            >
              {monthlyPage.cta.label}
            </Link>
          </div>
        </div>
      </LandingSection>
    </div>
  );
}
