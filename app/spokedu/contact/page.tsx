import ContactFormShell from './contact-form-shell';
import { contactPageContent } from './contact-page-data';
import { buildSpokeduMetadata } from '../data/seo';
import {
  homeSectionEyebrow,
  koreanLineBreak,
  landingHeroShell,
  landingH1,
  landingPageStack,
  landingHeroSubtitle,
} from '../lib/ui-classes';

export const metadata = buildSpokeduMetadata('contact');

export default function SpokeduContactPage() {
  const { hero, expectGuide } = contactPageContent;

  return (
    <div className={`${landingPageStack} gap-8 sm:gap-10`}>
      <section className={landingHeroShell}>
        <div className="max-w-2xl">
          <p className={homeSectionEyebrow}>{hero.kicker}</p>
          <h1 className={`${landingH1} mt-2 sm:mt-2.5`}>
            {hero.titleLines.map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
          </h1>
          <p
            className={`${landingHeroSubtitle} mt-4 max-w-xl text-slate-600 ${koreanLineBreak} [text-wrap:pretty]`}
          >
            {hero.subtitle}
          </p>
        </div>
      </section>

      <section className="overflow-hidden rounded-[1.75rem] border border-[#D6E3FF] bg-white shadow-[0_18px_50px_rgba(15,33,70,0.07)]">
        <div className="h-1.5 w-full bg-[#0B1F46]" aria-hidden />
        <div className="px-5 py-5 sm:px-6 sm:py-6">
          <p className={`text-sm font-semibold text-[#0B1F46] ${koreanLineBreak}`}>{expectGuide.responseNote}</p>
          <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.14em] text-[#245DFF]">
            {expectGuide.checklistTitle}
          </p>
          <ul className="mt-2.5 grid gap-2 sm:grid-cols-2">
            {expectGuide.items.map((item) => (
              <li
                key={item}
                className={`flex gap-2 rounded-lg border border-[#DCE3EE] bg-[#F7F9FD] px-3 py-2 text-sm leading-snug text-slate-700 ${koreanLineBreak}`}
              >
                <span className="mt-0.5 shrink-0 text-[#245DFF]" aria-hidden>
                  ✓
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <ContactFormShell />
    </div>
  );
}
