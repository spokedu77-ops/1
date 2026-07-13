import { homePage } from '../../data/home-page';
import { homeFocusRing, homeSectionScrollMt, koreanText, siteContainer } from '../../lib/ui-classes';
import { HomeChevron } from './home-chevron';
import { TrackedLink } from './tracked-link';

export function HomeProofStrip() {
  const { items, processLine } = homePage.proofStrip;
  const pathItems = homePage.audienceGate.items;

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
        <ul className="flex flex-col divide-y divide-slate-200/90 py-4 sm:flex-row sm:divide-x sm:divide-y-0 sm:py-5">
          {items.map((item) => (
            <li
              key={item}
              className={`flex-1 py-3 text-sm font-semibold text-slate-700 first:sm:pr-8 sm:py-0 sm:text-[15px] sm:[&:not(:first-child)]:px-8 ${koreanText}`}
            >
              {item}
            </li>
          ))}
        </ul>
        <p className={`border-t border-slate-200/90 py-4 text-center text-sm font-medium text-slate-600 sm:text-[15px] ${koreanText}`}>
          {processLine}
        </p>
        <div className="hidden border-t border-slate-200/90 py-4 sm:block sm:py-5">
          <p className={`text-sm font-bold text-slate-950 sm:text-[15px] ${koreanText}`}>필요한 방향으로 바로 이동하세요</p>
          <ul className="mt-3 grid gap-2 sm:grid-cols-3">
            {pathItems.map((item) => (
              <li key={item.id}>
                <TrackedLink
                  href={item.href}
                  trackLabel={`proof-strip-${item.trackLabel}`}
                  className={`flex min-h-[4.25rem] items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 py-3 text-left transition hover:border-[#1D4ED8]/40 hover:bg-white ${homeFocusRing}`}
                >
                  <span className="min-w-0">
                    <span className="block text-[11px] font-bold uppercase tracking-[0.12em] text-[#1D4ED8]">
                      {item.badge}
                    </span>
                    <span className={`mt-1 block text-sm font-bold leading-snug text-slate-950 ${koreanText}`}>
                      {item.title}
                    </span>
                  </span>
                  <span className="shrink-0 text-[#1D4ED8]" aria-hidden>
                    <HomeChevron />
                  </span>
                </TrackedLink>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
