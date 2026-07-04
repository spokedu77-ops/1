import { homePage } from '../../data/home-page';
import { homeSectionScrollMt, koreanText, siteContainer } from '../../lib/ui-classes';

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
      </div>
    </section>
  );
}
