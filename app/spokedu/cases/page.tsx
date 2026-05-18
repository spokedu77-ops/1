import type { Metadata } from 'next';
import Link from 'next/link';
import { SectionHeader, WhySpokeduTrustSection } from '../components/blocks';
import { caseArchiveCards } from '../data/cases';
import { ImagePlaceholder } from '../components/image-placeholder';
import { inferTrackFromHref } from '../lib/tracking';

export const metadata: Metadata = {
  title: '수업 사례 아카이브 | SPOKEDU',
  description: '기관 및 아동 대상 실제 수업 운영 사례를 아카이브로 정리합니다.',
  alternates: {
    canonical: '/spokedu/cases',
  },
  openGraph: {
    title: '수업 사례 아카이브 | SPOKEDU',
    description: '기관 및 아동 대상 실제 수업 운영 사례를 아카이브로 정리합니다.',
    url: '/spokedu/cases',
    locale: 'ko_KR',
    type: 'website',
    siteName: 'SPOKEDU',
  },
};

export default function SpokeduCasesPage() {
  return (
    <div className="space-y-10">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-10">
        <h1 className="text-3xl font-semibold text-slate-900 sm:text-5xl">수업 사례</h1>
        <p className="mt-4 text-sm leading-7 text-slate-600 sm:text-base">
          기관 환경, 대상 연령, 운영 목적에 맞춰 어떻게 수업을 설계하고 실행했는지 사례 중심으로 정리합니다.
        </p>
      </section>
      <section className="space-y-6">
        <SectionHeader title="대표 사례 아카이브" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {caseArchiveCards.map((item) => (
            <article id={item.slug} key={item.slug} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <ImagePlaceholder
                slot={`case-${item.slug}`}
                alt={item.images[0]?.alt ?? `${item.title} 사례 이미지`}
                src={item.images[0]?.src}
                title={item.title}
                caption={`${item.institution} · ${item.program} · ${item.date}`}
                className="mb-4 h-40"
              />
              <h3 className="text-base font-semibold text-slate-900">{item.title}</h3>
              <p className="mt-1 text-xs font-medium text-slate-500">
                {item.type} · 대상 {item.target} · {item.location}
              </p>
              <p className="mt-2 text-sm text-slate-600">{item.summary}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {item.tags.map((tag) => (
                  <span key={tag} className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-700">
                    #{tag}
                  </span>
                ))}
              </div>
              <Link
                href={item.href}
                data-track={inferTrackFromHref(item.href)}
                data-track-label={item.title}
                className="mt-4 inline-flex text-sm font-semibold text-indigo-700 hover:text-indigo-800"
              >
                사례 상세 보기 →
              </Link>
            </article>
          ))}
        </div>
      </section>

      <WhySpokeduTrustSection />
    </div>
  );
}
