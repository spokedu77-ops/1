'use client';

import { partnersPage } from '../data/partners-page';
import {
  brandInk,
  homeBandSoftBlue,
  homeBandWhite,
  homeBodyLead,
  brandFocusRing,
  homeSectionEyebrow,
  marketingSectionDisplay,
  marketingSectionPadCompact,
  koreanText,
  marketingButtonPrimary,
  marketingButtonSecondary,
  marketingSectionInner,
} from '../lib/ui-classes';
import { TrackedLink } from './home/tracked-link';

/** 파트너·협업 안내 — Contact Primary 보조 */
export function PartnersLanding() {
  const { intro, categories, notes, cta } = partnersPage;

  return (
    <main className="w-full overflow-x-clip" data-spokedu-partners-sections={partnersPage.sectionOrder.length}>
      <section id={intro.id} className={`${marketingSectionPadCompact} bg-white`}>
        <div className={marketingSectionInner}>
          <p className={homeSectionEyebrow}>{intro.eyebrow}</p>
          <h1 className={`${marketingSectionDisplay} mt-3`}>{intro.title}</h1>
          <p className={`${homeBodyLead} mt-4 max-w-2xl`}>{intro.lead}</p>
        </div>
      </section>

      <section id={categories.id} className={`${marketingSectionPadCompact} ${homeBandSoftBlue}`}>
        <div className={marketingSectionInner}>
          <p className={homeSectionEyebrow}>{categories.eyebrow}</p>
          <h2 className={`${marketingSectionDisplay} mt-3`}>{categories.title}</h2>
          <ul className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-3">
            {categories.items.map((item) => (
              <li key={item.id} className="rounded-2xl border border-[#D6E3FF] bg-white px-5 py-5">
                <h3 className={`text-lg font-bold ${koreanText}`} style={{ color: brandInk }}>
                  {item.title}
                </h3>
                <p className={`mt-2 text-sm leading-relaxed text-[#536279] ${koreanText}`}>{item.body}</p>
                <ul className="mt-4 flex flex-wrap gap-1.5">
                  {item.bullets.map((bullet) => (
                    <li
                      key={bullet}
                      className="rounded-full border border-[#D6E3FF] bg-[#EAF1FF] px-2.5 py-1 text-[11px] font-semibold text-[#2C446D]"
                    >
                      {bullet}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id={notes.id} className={`${marketingSectionPadCompact} ${homeBandWhite}`}>
        <div className={marketingSectionInner}>
          <p className={homeSectionEyebrow}>{notes.eyebrow}</p>
          <h2 className={`${marketingSectionDisplay} mt-3`}>{notes.title}</h2>
          <ul className="mt-6 max-w-2xl space-y-2">
            {notes.items.map((item) => (
              <li key={item} className={`text-sm leading-relaxed text-[#536279] ${koreanText}`}>
                · {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id={cta.id} className={`${marketingSectionPadCompact} ${homeBandSoftBlue}`}>
        <div className={marketingSectionInner}>
          <h2 className={marketingSectionDisplay}>{cta.title}</h2>
          <p className={`mt-3 max-w-2xl text-[15px] text-[#536279] ${koreanText}`}>{cta.lead}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <TrackedLink
              href={cta.primary.href}
              trackLabel={cta.primary.trackLabel}
              commercialRoute="curriculum"
              ctaIntentId="audience_partner"
              className={`${marketingButtonPrimary} h-12 px-7 ${brandFocusRing}`}
            >
              {cta.primary.label}
            </TrackedLink>
            <TrackedLink
              href={cta.secondary.href}
              trackLabel={cta.secondary.trackLabel}
              className={`${marketingButtonSecondary} h-12 px-7 ${brandFocusRing}`}
            >
              {cta.secondary.label}
            </TrackedLink>
          </div>
          <p className={`mt-4 text-xs text-stone-500 ${koreanText}`}>
            Primary 문의는 /spokedu/contact 입니다.
          </p>
        </div>
      </section>
    </main>
  );
}
