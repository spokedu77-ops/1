import { Suspense } from 'react';
import SpokeduContactForm from './contact-form';
import { contactPageContent } from './contact-page-data';
import { buildSpokeduMetadata } from '../data/seo';
import { homeSectionEyebrow, koreanLineBreak, landingHeroShell, landingH1, landingPageStack, landingHeroSubtitle } from '../lib/ui-classes';

export const metadata = buildSpokeduMetadata('contact');

export default function SpokeduContactPage() {
  const { hero } = contactPageContent;

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

      <Suspense
        fallback={
          <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600 sm:p-6">
            문의 폼을 불러오는 중입니다.
          </div>
        }
      >
        <SpokeduContactForm />
      </Suspense>
    </div>
  );
}
