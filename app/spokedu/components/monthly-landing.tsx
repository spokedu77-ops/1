'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { LandingFinalCta } from './landing-final-cta';
import { LandingHero } from './landing-hero';
import { LandingSection } from './landing-section';
import { MediaPanel } from './visual';
import { HOME_MEDIA } from '../data/home-media';
import { monthlyPage } from '../data/monthly-page';
import { fineHover, landingPageStack, landingSectionTitle } from '../lib/ui-classes';
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

  return (
    <div className={landingPageStack}>
      <LandingHero
        kicker={monthlyPage.hero.kicker}
        lines={monthlyPage.hero.lines}
        subtitle={monthlyPage.hero.subtitle}
        media={HOME_MEDIA[monthlyPage.hero.mediaKey]}
        priority
        primaryCta={{
          label: monthlyPage.hero.cta.label,
          href: monthlyPage.hero.cta.href,
          trackLabel: monthlyPage.hero.cta.trackLabel,
        }}
      />

      <LandingSection className="space-y-4 sm:space-y-5" delay={0.04}>
        <h2 className={landingSectionTitle}>{monthlyPage.definition.title}</h2>
        <div className="grid gap-4 lg:grid-cols-[1.1fr_minmax(0,1fr)] lg:items-stretch">
          <p className="text-sm leading-relaxed text-slate-600 sm:text-base [word-break:keep-all]">
            {monthlyPage.definition.body}
          </p>
          <MediaPanel
            media={HOME_MEDIA[monthlyPage.definition.mediaKey]}
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

      <LandingFinalCta
        title={monthlyPage.cta.title}
        description={monthlyPage.cta.description}
        tone="light"
        backgroundMedia={HOME_MEDIA[monthlyPage.cta.mediaKey]}
        links={[
          {
            label: monthlyPage.cta.label,
            href: monthlyPage.cta.href,
            trackLabel: monthlyPage.cta.trackLabel,
            variant: 'primary',
          },
        ]}
      />
    </div>
  );
}
