import { Suspense } from 'react';
import SpokeduContactForm from './contact-form';
import { contactPage } from '../data/site';
import { buildSpokeduMetadata } from '../data/seo';
import { landingHeroShell, landingH1 } from '../lib/ui-classes';

export const metadata = buildSpokeduMetadata('contact');

export default function SpokeduContactPage() {
  return (
    <div className="space-y-6 pb-24 sm:space-y-8 sm:pb-10">
      <section className={`${landingHeroShell} border-slate-200 bg-white`}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.12),transparent_50%),radial-gradient(circle_at_bottom_right,rgba(15,23,42,0.06),transparent_42%)]" />
        <div className="relative space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-indigo-600">문의</p>
          <h1 className={`${landingH1} whitespace-pre-line text-slate-950`}>{contactPage.hero.title}</h1>
          <p className="max-w-2xl text-sm leading-6 text-slate-700 sm:text-base sm:leading-7">
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
