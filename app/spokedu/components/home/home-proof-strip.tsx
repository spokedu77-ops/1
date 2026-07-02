import { homePage } from '../../data/home-page';
import { koreanText, siteContainer } from '../../lib/ui-classes';

export function HomeProofStrip() {
  const items = homePage.proofStrip.items;

  return (
    <div className="mt-10 border-y border-slate-200/90 bg-white sm:mt-12 lg:mt-14">
      <div className={siteContainer}>
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
      </div>
    </div>
  );
}
