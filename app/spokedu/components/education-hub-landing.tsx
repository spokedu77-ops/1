import Link from 'next/link';
import { educationHubPage } from '../data/education-hub';
import { inferTrackFromHref } from '../lib/tracking';
import {
  brandBlue,
  brandInk,
  homeBodyLead,
  homeGateCard,
  homeSectionEyebrow,
  homeSectionH2,
  homeSectionPadCompact,
  koreanText,
  siteContainer,
} from '../lib/ui-classes';

/** 체육교육 허브 최소 셸 — 기존 게이트 카드·섹션 토큰 재사용 */
export function EducationHubLanding() {
  const { hero, paths, cta } = educationHubPage;

  return (
    <main>
      <section className={`${homeSectionPadCompact} bg-white`}>
        <div className={siteContainer}>
          <p className={homeSectionEyebrow}>{hero.eyebrow}</p>
          <h1 className={`${homeSectionH2} mt-3 max-w-3xl`}>{hero.title}</h1>
          <p className={`${homeBodyLead} mt-4`}>{hero.lead}</p>
        </div>
      </section>

      <section className={`${homeSectionPadCompact} bg-[#F5F7FB]`} aria-labelledby="education-paths-heading">
        <div className={siteContainer}>
          <h2 id="education-paths-heading" className={`text-lg font-bold tracking-tight sm:text-xl ${koreanText}`} style={{ color: brandInk }}>
            수업 경로 선택
          </h2>
          <ul className="mt-6 grid grid-cols-1 gap-4 min-[700px]:grid-cols-2 min-[700px]:gap-5">
            {paths.map((path) => (
              <li key={path.id} className="min-w-0">
                <Link
                  href={path.href}
                  data-track={inferTrackFromHref(path.href)}
                  data-track-label={path.trackLabel}
                  className={`${homeGateCard} block h-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#245DFF]`}
                >
                  <div className="flex h-full min-w-0 flex-col px-5 py-5 sm:px-6 sm:py-6">
                    <p className="text-[12px] font-bold tracking-[0.08em]" style={{ color: brandBlue }}>
                      {path.badge}
                    </p>
                    <h3 className={`mt-1.5 text-lg font-bold tracking-[-0.02em] sm:text-xl ${koreanText}`} style={{ color: brandInk }}>
                      {path.title}
                    </h3>
                    <p className={`mt-2 text-sm leading-relaxed text-[#536279] ${koreanText}`}>{path.description}</p>
                    <span className="mt-auto inline-flex items-center gap-1.5 pt-5 text-[15px] font-semibold" style={{ color: brandBlue }}>
                      {path.ctaLabel}
                      <span aria-hidden>→</span>
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className={`${homeSectionPadCompact} bg-white`}>
        <div className={`${siteContainer} max-w-2xl`}>
          <h2 className={`text-xl font-bold tracking-tight sm:text-2xl ${koreanText}`} style={{ color: brandInk }}>
            {cta.title}
          </h2>
          <p className={`mt-3 text-[15px] leading-relaxed text-[#536279] sm:text-base ${koreanText}`}>{cta.lead}</p>
          <Link
            href={cta.href}
            data-track={inferTrackFromHref(cta.href)}
            data-track-label={cta.trackLabel}
            className={`mt-6 inline-flex min-h-12 items-center justify-center rounded-full px-6 text-[15px] font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#245DFF] ${koreanText}`}
            style={{ backgroundColor: brandBlue }}
          >
            {cta.label}
          </Link>
        </div>
      </section>
    </main>
  );
}
