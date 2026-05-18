import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { SectionHeader, WhySpokeduTrustSection } from '../components/blocks';
import SpokeduContactForm from './contact-form';
import { contactActionCtas, contactPreparationChecklist } from '../data/contact';
import { brandProfile } from '../data/brand';
import { contactHero, seoKeywords, seoMeta } from '../data/content';

export const metadata: Metadata = {
  title: seoMeta.contact.title,
  description: seoMeta.contact.description,
  keywords: [...seoKeywords.contact],
  alternates: {
    canonical: '/spokedu/contact',
  },
};

export default function SpokeduContactPage() {
  const primaryInquiryCtas = contactActionCtas.filter((cta) => cta.type);
  const supportInquiryCtas = contactActionCtas.filter((cta) => !cta.type);

  return (
    <div className="space-y-10 pb-24 md:space-y-12 md:pb-0">
      <section className="rounded-3xl border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-sky-50 p-6 sm:p-10">
        <h1 className="whitespace-pre-line text-3xl font-semibold leading-tight text-slate-900 sm:text-5xl">{contactHero.title}</h1>
        <p className="mt-5 max-w-3xl text-sm leading-7 text-slate-700 sm:text-base">{contactHero.description}</p>
      </section>

      <SectionHeader eyebrow="Inquiry Form" title="문의 유형을 선택하고 바로 접수해 주세요" />
      <Suspense fallback={<div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600 sm:p-6">문의 폼을 불러오는 중입니다...</div>}>
        <SpokeduContactForm />
      </Suspense>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h3 className="text-lg font-semibold text-slate-900">문의 전에 준비하면 좋은 정보</h3>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          아래 항목을 먼저 정리해 두면 상담 속도와 제안 정확도가 높아집니다.
        </p>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {contactPreparationChecklist.map((item) => (
            <li key={item} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              {item}
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h3 className="text-lg font-semibold text-slate-900">빠른 문의 3분기</h3>
        <div className="mt-4 grid gap-2 md:grid-cols-3 md:gap-3">
          {primaryInquiryCtas.map((cta, idx) => (
            <Link
              key={cta.label}
              id={`contact-quick-${cta.type}`}
              data-track={cta.track}
              data-track-label={cta.label}
              href={cta.href}
              className={`inline-flex items-center justify-center rounded-xl border px-4 py-3 text-sm font-semibold transition hover:border-indigo-300 ${
                idx === 0
                  ? 'border-slate-900 bg-slate-900 text-white md:border-slate-300 md:bg-slate-50 md:text-slate-900'
                  : 'border-slate-300 bg-slate-50 text-slate-900'
              }`}
            >
              {cta.label}
            </Link>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {supportInquiryCtas.map((cta) => (
            <a
              key={cta.label}
              id={cta.track === 'cta-phone' ? 'contact-quick-phone' : 'contact-quick-email'}
              data-track={cta.track}
              data-track-label={cta.label}
              href={cta.href}
              className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:border-indigo-300 hover:text-indigo-700"
            >
              {cta.label}
            </a>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h3 className="text-lg font-semibold text-slate-900">브랜드/사업자 정보</h3>
        <div className="mt-3 grid gap-2 text-sm text-slate-700">
          <p><span className="font-semibold text-slate-900">브랜드</span> {brandProfile.nameEn} / {brandProfile.nameKo}</p>
          <p><span className="font-semibold text-slate-900">대표</span> {brandProfile.representative}</p>
          <p><span className="font-semibold text-slate-900">주소</span> {brandProfile.address}</p>
          <p><span className="font-semibold text-slate-900">사업자 정보</span> {brandProfile.businessInfo.displayText}</p>
        </div>
      </section>

      <WhySpokeduTrustSection />

      <div className="fixed inset-x-0 bottom-1 z-20 px-3 md:hidden">
        <div className="mx-auto grid w-full max-w-md grid-cols-3 gap-1.5 rounded-xl border border-slate-200 bg-white/90 p-1.5 shadow-md backdrop-blur">
          <Link
            id="contact-mobile-private"
            data-track="cta-private-contact"
            data-track-label="mobile-private"
            href="/spokedu/contact?type=private"
            className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-2 py-1.5 text-center text-[10px] font-semibold leading-tight text-white"
          >
            우리 아이 수업 상담하기
          </Link>
          <Link
            id="contact-mobile-dispatch"
            data-track="cta-dispatch-contact"
            data-track-label="mobile-dispatch"
            href="/spokedu/contact?type=dispatch"
            className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-center text-[10px] font-semibold leading-tight text-slate-900"
          >
            기관 수업 제안 받기
          </Link>
          <Link
            id="contact-mobile-curriculum"
            data-track="cta-curriculum-contact"
            data-track-label="mobile-curriculum"
            href="/spokedu/contact?type=curriculum"
            className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-center text-[10px] font-semibold leading-tight text-slate-900"
          >
            커리큘럼·콘텐츠 문의
          </Link>
        </div>
      </div>
    </div>
  );
}
