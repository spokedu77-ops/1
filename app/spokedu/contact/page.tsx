import { Suspense } from 'react';
import SpokeduContactForm from './contact-form';
import { contactPage } from '../data/site';
import { buildSpokeduMetadata } from '../data/seo';
import { landingH1, landingHeroShell, landingPageStack } from '../lib/ui-classes';

export const metadata = buildSpokeduMetadata('contact');

export default function SpokeduContactPage() {
  return (
    <div className={`${landingPageStack} pb-24 sm:pb-10`}>
      <section className={`${landingHeroShell} overflow-hidden border-slate-200/90 bg-white shadow-md shadow-slate-900/5`}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.14),transparent_52%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,0.08),transparent_45%)]" />
        <div className="relative space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-indigo-600">문의</p>
          <h1 className={`${landingH1} whitespace-pre-line text-slate-950`}>{contactPage.hero.title}</h1>
          <p className="max-w-md text-base leading-relaxed text-slate-600 sm:text-lg sm:leading-8">
            {contactPage.hero.subtitle}
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
