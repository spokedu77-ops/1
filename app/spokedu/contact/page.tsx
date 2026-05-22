import { Suspense } from 'react';
import SpokeduContactForm from './contact-form';
import { contactPageContent } from './contact-page-data';
import { buildSpokeduMetadata } from '../data/seo';
import { landingPageStack } from '../lib/ui-classes';

export const metadata = buildSpokeduMetadata('contact');

export default function SpokeduContactPage() {
  const { hero } = contactPageContent;

  return (
    <div className={`${landingPageStack} gap-8 pb-6 sm:gap-10 sm:pb-8`}>
      <section className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-gradient-to-br from-white via-indigo-50/25 to-sky-50/20 px-5 py-6 sm:px-7 sm:py-8">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_0%,rgba(99,102,241,0.08),transparent_44%),radial-gradient(circle_at_88%_100%,rgba(14,165,233,0.05),transparent_42%)]"
          aria-hidden
        />
        <div className="relative max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-indigo-600">{hero.kicker}</p>
          <h1 className="mt-2.5 text-[1.625rem] font-black leading-[1.22] tracking-tight text-slate-950 sm:text-[2rem] sm:leading-[1.2] lg:text-[2.125rem]">
            {hero.titleLines.map((line) => (
              <span key={line} className="block [word-break:keep-all]">
                {line}
              </span>
            ))}
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-600 sm:mt-3.5 sm:text-[15px] sm:leading-7 [word-break:keep-all] [text-wrap:pretty]">
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
