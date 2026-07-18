import { homePage } from '../../data/home-page';
import { homeFocusRing, homeSectionScrollMt, koreanText, siteContainer } from '../../lib/ui-classes';
import { HomeChevron } from './home-chevron';
import { TrackedLink } from './tracked-link';

/** 슬림 신뢰 스트립 — 운영 방식만. 경로 선택은 게이트 섹션으로 */
export function HomeProofStrip() {
  const { items, processLine } = homePage.proofStrip;

  return (
    <section
      id={homePage.proofStrip.id}
      className={`${homeSectionScrollMt} border-y border-slate-200/90 bg-white`}
      aria-labelledby="home-proof-heading"
    >
      <div className={siteContainer}>
        <h2 id="home-proof-heading" className="sr-only">
          운영 근거
        </h2>
        <ul className="flex flex-col divide-y divide-slate-200/90 py-5 sm:flex-row sm:divide-x sm:divide-y-0 sm:py-6">
          {items.map((item) => (
            <li
              key={item}
              className={`flex-1 py-3 text-sm font-semibold text-slate-700 first:sm:pr-8 sm:py-0 sm:text-[15px] sm:[&:not(:first-child)]:px-8 ${koreanText}`}
            >
              {item}
            </li>
          ))}
        </ul>
        <p
          className={`border-t border-slate-200/90 py-4 text-center text-sm font-medium text-slate-600 sm:py-5 sm:text-[15px] ${koreanText}`}
        >
          {processLine}
        </p>
        <div className="hidden border-t border-slate-200/90 py-4 sm:block sm:py-5">
          <p className={`text-sm font-bold text-slate-950 sm:text-[15px] ${koreanText}`}>바로 찾기</p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {homePage.hero.quickLinks.map((link) => (
              <li key={link.label}>
                <TrackedLink
                  href={link.href}
                  trackLabel={`proof-strip-${link.trackLabel}`}
                  className={`inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50/80 px-3.5 py-2 text-sm font-semibold text-slate-800 transition hover:border-[#1D4ED8]/40 hover:bg-white ${homeFocusRing}`}
                >
                  {link.label}
                  <HomeChevron />
                </TrackedLink>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
