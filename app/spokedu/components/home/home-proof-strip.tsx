import { homePage } from '../../data/home-page';
import {
  homeBody,
  homeSectionH2,
  homeSectionPadCompact,
  homeSectionScrollMt,
  koreanText,
  siteContainer,
} from '../../lib/ui-classes';

/** 경로·SPOMOVE 이후 — “왜 SPOKEDU인가” 신뢰 블록 (히어로 직후 경로 선택과 역할 분리) */
export function HomeProofStrip() {
  const { title, lead, items, processLabel, processLine } = homePage.proofStrip;
  const processSteps = processLine.split(/\s*→\s*/).filter(Boolean);

  return (
    <section
      id={homePage.proofStrip.id}
      className={`${homeSectionScrollMt} ${homeSectionPadCompact} bg-[#FAFAF8]`}
      aria-labelledby="home-proof-heading"
    >
      <div className={siteContainer}>
        <h2 id="home-proof-heading" className={homeSectionH2}>
          {title}
        </h2>
        <p className={`${homeBody} mt-4 max-w-2xl`}>{lead}</p>

        <ul className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-3.5">
          {items.map((item) => (
            <li
              key={item}
              className={`rounded-xl border border-slate-200/90 bg-white px-4 py-4 text-sm font-semibold leading-snug text-slate-800 sm:px-5 sm:text-[15px] ${koreanText}`}
            >
              {item}
            </li>
          ))}
        </ul>

        <div className="mt-6 rounded-xl border border-slate-200/90 bg-slate-50/80 px-4 py-5 sm:px-6 sm:py-6">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">{processLabel}</p>
          <ol className="mt-4 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-2 sm:gap-y-2.5">
            {processSteps.map((step, index) => (
              <li key={step} className="flex min-w-0 items-center gap-2">
                <span
                  className={`inline-flex rounded-lg bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-800 ring-1 ring-slate-200/90 ${koreanText}`}
                >
                  {step}
                </span>
                {index < processSteps.length - 1 ? (
                  <span className="hidden text-slate-400 sm:inline" aria-hidden>
                    →
                  </span>
                ) : null}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
