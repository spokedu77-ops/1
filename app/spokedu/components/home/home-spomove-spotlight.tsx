'use client';

import { HOME_MEDIA } from '../../data/home-media';
import { homePage } from '../../data/home-page';
import {
  homeBody,
  homeFocusRing,
  homePhotoGrade,
  homeSectionH2,
  homeSectionPadCompact,
  homeSectionScrollMt,
  koreanText,
  siteBtnPrimary,
  siteContainer,
} from '../../lib/ui-classes';
import { MediaPanel } from '../visual';
import { HomeChevron } from './home-chevron';
import { TrackedLink } from './tracked-link';

const PAD_COLORS = ['#3B82F6', '#22C55E', '#EAB308', '#EC4899'] as const;

/**
 * 홈 SPOMOVE — 일반 프로그램 안내 블록 (히어로 문법 사용 안 함)
 */
export function HomeSpomoveSpotlight() {
  const media = HOME_MEDIA[homePage.spomove.mediaKey];
  const { title, lead, flowSteps, useCases, primaryCta, secondaryCta } = homePage.spomove;

  return (
    <section
      id={homePage.spomove.id}
      className={`${homeSectionScrollMt} ${homeSectionPadCompact} border-b border-slate-200/90 bg-white`}
      aria-labelledby="home-spomove-heading"
    >
      <div className={siteContainer}>
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-10">
          <div className={`overflow-hidden rounded-xl border border-slate-200/90 ${homePhotoGrade}`}>
            <MediaPanel
              media={media}
              className="aspect-[5/4] w-full border-0 rounded-none sm:aspect-[4/3]"
              sizes="gateCard"
            />
          </div>

          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#1D4ED8]">프로그램</p>
            <h2 id="home-spomove-heading" className={`${homeSectionH2} mt-2`}>
              {title}
            </h2>
            <p className={`${homeBody} mt-3 max-w-xl`}>{lead}</p>

            <ul className="mt-4 flex flex-wrap gap-2" aria-label="적용 형태">
              {useCases.map((item) => (
                <li
                  key={item.title}
                  className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700"
                >
                  {item.title}
                </li>
              ))}
            </ul>

            <ol className="mt-5 flex flex-wrap items-center gap-2" aria-label="수업 흐름">
              {flowSteps.map((step, index) => (
                <li key={step.label} className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-800 ${koreanText}`}
                  >
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: PAD_COLORS[index] ?? PAD_COLORS[0] }}
                      aria-hidden
                    />
                    {step.label}
                  </span>
                  {index < flowSteps.length - 1 ? (
                    <span className="text-slate-300" aria-hidden>
                      →
                    </span>
                  ) : null}
                </li>
              ))}
            </ol>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
              <TrackedLink
                href={primaryCta.href}
                trackLabel={primaryCta.trackLabel}
                className={`${siteBtnPrimary} ${homeFocusRing}`}
              >
                {primaryCta.label}
              </TrackedLink>
              <TrackedLink
                href={secondaryCta.href}
                trackLabel={secondaryCta.trackLabel}
                className={`inline-flex min-h-11 items-center gap-1.5 text-[15px] font-semibold text-[#1D4ED8] ${homeFocusRing}`}
              >
                {secondaryCta.label}
                <HomeChevron />
              </TrackedLink>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
