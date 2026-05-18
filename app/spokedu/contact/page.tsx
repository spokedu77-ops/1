import type { Metadata } from 'next';
import Link from 'next/link';
import { SectionHeader } from '../components/blocks';
import { contactActionCtas, contactHero, contactTypes, seoKeywords, seoMeta } from '../data/content';

export const metadata: Metadata = {
  title: seoMeta.contact.title,
  description: seoMeta.contact.description,
  keywords: [...seoKeywords.contact],
  alternates: {
    canonical: '/spokedu/contact',
  },
};

export default function SpokeduContactPage() {
  return (
    <div className="space-y-12 pb-20 md:pb-0">
      <section className="rounded-3xl border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-sky-50 p-6 sm:p-10">
        <h1 className="whitespace-pre-line text-3xl font-semibold leading-tight text-slate-900 sm:text-5xl">{contactHero.title}</h1>
        <p className="mt-5 max-w-3xl text-sm leading-7 text-slate-700 sm:text-base">{contactHero.description}</p>
      </section>

      <section className="space-y-7">
        <SectionHeader eyebrow="Inquiry Types" title="문의 유형 3가지를 먼저 선택해 주세요" />
        <div className="grid gap-4 md:grid-cols-3">
          {contactTypes.map((contactType) => (
            <article key={contactType.title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900">{contactType.title}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">{contactType.description}</p>
              <ul className="mt-4 space-y-2 text-sm text-slate-700">
                {contactType.requiredFields.map((field) => (
                  <li key={field}>- {field}</li>
                ))}
              </ul>
              <Link href={contactType.href} className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white">
                {contactType.cta}
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h3 className="text-lg font-semibold text-slate-900">빠른 문의 채널</h3>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {contactActionCtas.map((cta) => {
            const isExternal = cta.href.startsWith('tel:') || cta.href.startsWith('mailto:');
            const className =
              'inline-flex items-center justify-center rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 transition hover:border-indigo-300 hover:text-indigo-700';
            if (isExternal) {
              return (
                <a key={cta.label} href={cta.href} className={className}>
                  {cta.label}
                </a>
              );
            }
            return (
              <Link key={cta.label} href={cta.href} className={className}>
                {cta.label}
              </Link>
            );
          })}
        </div>
      </section>

      <div className="fixed inset-x-0 bottom-2 z-20 px-3 md:hidden">
        <div className="mx-auto flex w-full max-w-md items-center gap-2 rounded-xl border border-slate-200 bg-white/95 p-2 shadow-lg backdrop-blur">
          <Link href="/spokedu/contact?type=private" className="inline-flex flex-1 items-center justify-center rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white">
            우리 아이 수업 상담하기
          </Link>
          <a href="tel:010-4437-9294" className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-900">
            전화 문의
          </a>
        </div>
      </div>
    </div>
  );
}
