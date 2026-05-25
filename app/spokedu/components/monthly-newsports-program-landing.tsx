'use client';

import { LandingFinalCta } from './landing-final-cta';
import { LandingHero } from './landing-hero';
import { LandingSection } from './landing-section';
import { NewsportsThemeGrid } from './newsports-theme-grid';
import { MediaPanel } from './visual';
import { HOME_MEDIA } from '../data/home-media';
import { monthlyNewsportsProgramPage } from '../data/monthly-newsports-program-page';
import { landingPageStack, landingSectionTitle } from '../lib/ui-classes';

const pointCardShell =
  'flex h-full flex-col rounded-2xl border border-slate-200/80 bg-white px-4 py-4 sm:px-5 sm:py-5';

export default function MonthlyNewsportsProgramLanding() {
  return (
    <div className={landingPageStack}>
      <LandingHero
        kicker={monthlyNewsportsProgramPage.hero.kicker}
        kickerClassName="text-sky-800"
        lines={monthlyNewsportsProgramPage.hero.lines}
        subtitle={monthlyNewsportsProgramPage.hero.subtitle}
        media={HOME_MEDIA[monthlyNewsportsProgramPage.hero.mediaKey]}
        priority
        primaryCta={{
          label: monthlyNewsportsProgramPage.heroCta.label,
          href: monthlyNewsportsProgramPage.heroCta.href,
          trackLabel: monthlyNewsportsProgramPage.heroCta.trackLabel,
        }}
      />

      <LandingSection className="rounded-2xl border border-sky-200/70 bg-gradient-to-br from-sky-50/60 via-white to-cyan-50/40 px-5 py-6 sm:px-7 sm:py-7">
        <h2 className={landingSectionTitle}>{monthlyNewsportsProgramPage.overview.title}</h2>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-600 [word-break:keep-all] sm:text-[15px]">
          {monthlyNewsportsProgramPage.overview.body}
        </p>
        <p className="mt-3 text-sm font-medium text-sky-900 [word-break:keep-all] sm:text-[15px]">
          {monthlyNewsportsProgramPage.overview.emphasis}
        </p>
      </LandingSection>

      <LandingSection className="space-y-4 sm:space-y-5">
        <NewsportsThemeGrid
          eyebrow={monthlyNewsportsProgramPage.themesSection.eyebrow}
          title={monthlyNewsportsProgramPage.themesSection.title}
          lead={monthlyNewsportsProgramPage.themesSection.lead}
          sectionId={monthlyNewsportsProgramPage.themesSection.sectionId}
        />
      </LandingSection>

      <LandingSection className="rounded-2xl border border-slate-200/80 bg-white px-5 py-6 sm:px-7 sm:py-7">
        <h2 className={landingSectionTitle}>{monthlyNewsportsProgramPage.programPoints.title}</h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 sm:items-stretch sm:gap-4 lg:grid-cols-3">
          {monthlyNewsportsProgramPage.programPoints.items.map((item) => (
            <li key={item.title} className={pointCardShell}>
              <h3 className="text-base font-semibold text-slate-950">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600 [word-break:keep-all]">{item.description}</p>
            </li>
          ))}
        </ul>
      </LandingSection>

      <LandingSection className="rounded-2xl border border-slate-200/80 bg-white px-5 py-6 sm:px-7 sm:py-7">
        <h2 className={landingSectionTitle}>{monthlyNewsportsProgramPage.target.title}</h2>
        <dl className="mt-4 overflow-hidden rounded-xl border border-slate-200/90">
          {monthlyNewsportsProgramPage.target.rows.map((row) => (
            <div key={row.label} className="grid border-b border-slate-200/80 last:border-b-0 sm:grid-cols-[0.7fr_1.3fr]">
              <dt className="bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 [word-break:keep-all]">{row.label}</dt>
              <dd className="px-4 py-3 text-sm text-slate-600 [word-break:keep-all]">{row.value}</dd>
            </div>
          ))}
        </dl>
      </LandingSection>

      <LandingSection className="rounded-2xl border border-slate-200/80 bg-white px-5 py-6 sm:px-7 sm:py-7">
        <h2 className={landingSectionTitle}>{monthlyNewsportsProgramPage.institutionFit.title}</h2>
        <p className="mt-3 text-base font-semibold text-slate-950 [word-break:keep-all] sm:text-lg">
          {monthlyNewsportsProgramPage.institutionFit.lead}
        </p>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600 [word-break:keep-all] sm:text-[15px]">
          {monthlyNewsportsProgramPage.institutionFit.body}
        </p>
        <div className="mt-4 overflow-hidden rounded-xl border border-slate-100">
          <MediaPanel
            media={HOME_MEDIA.proofDasarang}
            className="aspect-[21/9] min-h-[120px] rounded-none border-0 sm:min-h-0"
          />
        </div>
      </LandingSection>

      <LandingFinalCta
        title={monthlyNewsportsProgramPage.finalCta.title}
        description={monthlyNewsportsProgramPage.finalCta.description}
        tone="light"
        backgroundMedia={HOME_MEDIA[monthlyNewsportsProgramPage.hero.mediaKey]}
        links={[
          {
            label: monthlyNewsportsProgramPage.finalCta.label,
            href: monthlyNewsportsProgramPage.finalCta.href,
            trackLabel: monthlyNewsportsProgramPage.finalCta.trackLabel,
            variant: 'primary',
          },
          {
            label: '월간 수업 전체 보기',
            href: monthlyNewsportsProgramPage.relatedMonthlyHref,
            trackLabel: 'program-monthly-newsports-to-monthly',
            variant: 'on-light-outline',
          },
          {
            label: '전체 프로그램 보기',
            href: '/spokedu/programs',
            trackLabel: 'program-monthly-newsports-all',
            variant: 'on-light-outline',
          },
        ]}
      />
    </div>
  );
}
