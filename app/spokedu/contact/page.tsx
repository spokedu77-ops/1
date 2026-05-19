import { Suspense } from 'react';
import SpokeduContactForm from './contact-form';
import { SpokeduRelatedLinks } from '../components/seo-related-links';
import { brandProfile } from '../data/brand';
import { contactHero } from '../data/content';
import { buildSpokeduMetadata } from '../data/seo';

export const metadata = buildSpokeduMetadata('contact');

export default function SpokeduContactPage() {
  return (
    <div className="space-y-6 pb-24 sm:space-y-10 sm:pb-8">
      <section className="rounded-2xl border border-slate-200 bg-gradient-to-br from-indigo-50 via-white to-lime-50 p-4 sm:rounded-3xl sm:p-10">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-indigo-600">Contact</p>
        <h1 className="mt-2 max-w-3xl whitespace-pre-line text-[2rem] font-black leading-[1.05] tracking-tight text-slate-900 sm:mt-3 sm:text-4xl sm:font-semibold sm:leading-tight lg:text-5xl">
          {contactHero.title}
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-700 sm:text-base">
          문의 유형을 먼저 선택하면 필요한 항목만 입력할 수 있습니다.
        </p>
      </section>

      <Suspense
        fallback={
          <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600 sm:p-6">
            문의 폼을 불러오는 중입니다...
          </div>
        }
      >
        <SpokeduContactForm />
      </Suspense>

      <SpokeduRelatedLinks page="contact" />

      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs leading-5 text-slate-600 sm:p-5 sm:text-sm">
        <p>
          <span className="font-semibold text-slate-800">{brandProfile.nameKo}</span> · 대표 {brandProfile.representative}
        </p>
        <p className="mt-1">{brandProfile.address}</p>
        <p className="mt-1">{brandProfile.businessInfo.displayText}</p>
      </section>
    </div>
  );
}
