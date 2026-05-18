import type { Metadata } from 'next';
import Link from 'next/link';
import { SectionHeader, WhySpokeduTrustSection } from '../components/blocks';
import { operationalCaseLinks } from '../data/cases';
import { aboutLabHighlights, aboutRepresentativeProfile, seoMeta } from '../data/content';
import { inferTrackFromHref } from '../lib/tracking';

export const metadata: Metadata = {
  title: seoMeta.about.title,
  description: seoMeta.about.description,
  alternates: {
    canonical: '/spokedu/about',
  },
  openGraph: {
    title: seoMeta.about.title,
    description: seoMeta.about.description,
    url: '/spokedu/about',
    locale: 'ko_KR',
    type: 'website',
    siteName: 'SPOKEDU',
  },
};

export default function SpokeduAboutPage() {
  return (
    <div className="space-y-12">
      <section className="rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 p-6 text-white sm:p-10">
        <h1 className="text-3xl font-semibold leading-tight sm:text-5xl">우리는 아이를 가르치고, 선생님을 가르치며, 체육수업을 콘텐츠로 만듭니다.</h1>
      </section>

      <section className="space-y-7">
        <SectionHeader
          title="SPOKEDU는 어떤 단체인가"
          description="스포키듀는 아동·청소년 체육교육을 실무적으로 운영하는 팀입니다. 가정, 기관, 강사 교육 현장에서 필요한 수업 기준을 같은 언어로 연결합니다."
        />
        <div className="grid gap-4 md:grid-cols-2">
          {[
            '움직임, 집중, 협동, 자기조절 경험이 함께 일어나도록 수업을 설계합니다.',
            '개인·소그룹부터 기관 파견, 행사형 프로그램까지 운영 맥락에 맞춰 실행합니다.',
            '좋은 체육수업은 선생님의 감각에만 의존해서는 안 됩니다.',
            '현장에서 검증한 수업을 커리큘럼과 콘텐츠로 정리합니다.',
          ].map((item) => (
            <article key={item} className="rounded-2xl border border-slate-200 bg-white p-5 text-sm leading-7 text-slate-700 shadow-sm">
              {item}
            </article>
          ))}
        </div>
      </section>

      <section className="space-y-7 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <SectionHeader eyebrow="Representative" title={`${aboutRepresentativeProfile.name} 대표 소개`} description={aboutRepresentativeProfile.intro} />
        <div className="grid gap-4 md:grid-cols-[0.9fr_1.1fr]">
          <article className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-sm font-semibold text-slate-900">{aboutRepresentativeProfile.role}</p>
            <h3 className="mt-2 text-xl font-semibold text-slate-900">{aboutRepresentativeProfile.name}</h3>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              운영, 수업 설계, 강사 교육, 콘텐츠 자산화까지 하나의 실행 흐름으로 관리합니다.
            </p>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-5">
            <h3 className="text-base font-semibold text-slate-900">주요 운영 포인트</h3>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-700">
              {aboutRepresentativeProfile.points.map((point) => (
                <li key={point}>- {point}</li>
              ))}
            </ul>
          </article>
        </div>
      </section>

      <section className="space-y-7 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <SectionHeader
          eyebrow="SPOKEDU LAB"
          title="스포키듀 LAB은 운영 기준을 만드는 현장 거점입니다"
          description="LAB은 사진 촬영용 공간이 아니라 수업 검증, 강사 교육, 프로그램 개선이 실제로 이루어지는 운영 베이스입니다."
        />
        <div className="grid gap-4 md:grid-cols-3">
          {aboutLabHighlights.map((item) => (
            <article key={item} className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm leading-6 text-slate-700">
              {item}
            </article>
          ))}
        </div>
        <div className="flex flex-wrap gap-3">
          {operationalCaseLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              data-track={item.href === '/spokedu/records' ? 'cta-records' : inferTrackFromHref(item.href)}
              data-track-label={item.label}
              className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:border-indigo-300 hover:text-indigo-700"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </section>

      <WhySpokeduTrustSection />
    </div>
  );
}
