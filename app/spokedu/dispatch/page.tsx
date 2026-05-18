import type { Metadata } from 'next';
import Link from 'next/link';
import { ImagePlaceholder } from '../components/image-placeholder';
import { FAQList, ProcessSteps, SectionHeader, SplitCTA, WhySpokeduTrustSection } from '../components/blocks';
import {
  dispatchCriteria,
  dispatchHero,
  dispatchImageSlots,
  dispatchOperationTypes,
  dispatchProcess,
  dispatchRecommendations,
  dispatchSpaceModels,
  seoKeywords,
  seoMeta,
} from '../data/content';
import { dispatchCases, operationalCaseLinks } from '../data/cases';
import { dispatchCtas, dispatchHeroCtas } from '../data/ctas';
import { dispatchFaq } from '../data/faqs';
import { inferTrackFromHref } from '../lib/tracking';

export const metadata: Metadata = {
  title: seoMeta.dispatch.title,
  description: seoMeta.dispatch.description,
  keywords: [...seoKeywords.dispatch],
  alternates: {
    canonical: '/spokedu/dispatch',
  },
};

export default function SpokeduDispatchPage() {
  return (
    <div className="space-y-14">
      <section className="rounded-3xl border border-sky-100 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 p-6 text-slate-100 sm:p-10">
        <h1 className="whitespace-pre-line text-3xl font-semibold leading-tight sm:text-5xl">{dispatchHero.title}</h1>
        <p className="mt-5 max-w-4xl whitespace-pre-line text-sm leading-7 text-slate-300 sm:text-base">{dispatchHero.description}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          {dispatchHeroCtas.map((cta, idx) => (
            <Link
              key={`${cta.label}-${idx}`}
              href={cta.href}
              data-track={cta.track ?? inferTrackFromHref(cta.href)}
              data-track-label={cta.label}
              className={
                idx === 0
                  ? 'rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-slate-900'
                  : 'rounded-full border border-slate-500 px-5 py-2.5 text-sm font-semibold text-white'
              }
            >
              {cta.label}
            </Link>
          ))}
        </div>
        <div className="mt-5">
          <Link href="/info/dispatch" className="text-xs font-medium text-slate-300 underline-offset-2 hover:text-white hover:underline">
            기존 파견 상세 페이지 확인
          </Link>
        </div>
      </section>

      <section className="space-y-7">
        <SectionHeader eyebrow="Criteria" title="기관 담당자가 보는 기준" />
        <div className="grid gap-4 md:grid-cols-2">
          {dispatchCriteria.map((item) => (
            <article key={item.title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="space-y-7">
        <SectionHeader eyebrow="Operation Types" title="운영 가능 형태" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {dispatchOperationTypes.map((item) => (
            <article key={item.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-base font-semibold text-slate-900">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="space-y-7">
        <SectionHeader eyebrow="Space & Group Model" title="공간·인원별 운영 방식" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {dispatchSpaceModels.map((item) => (
            <article key={item.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-base font-semibold text-slate-900">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="space-y-7">
        <SectionHeader eyebrow="Recommended Programs" title="기관별 추천 프로그램" />
        <div className="grid gap-4 md:grid-cols-2">
          {dispatchRecommendations.map((item) => (
            <article key={item.group} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-base font-semibold text-slate-900">{item.group}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{item.programs.join(' · ')}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="space-y-7">
        <SectionHeader eyebrow="Photo Slots" title="기관 현장 이미지 영역" description="기관 단체 수업/센터 운영/행사형 수업 사진을 이 슬롯에 배치하세요." />
        <div className="grid gap-4 md:grid-cols-3">
          {dispatchImageSlots.map((item) => (
            <ImagePlaceholder
              key={item.slot}
              slot={item.slot}
              alt={item.alt}
              src={item.src}
              title={item.title}
              caption={item.caption}
              className="h-52"
            />
          ))}
        </div>
      </section>

      <section className="space-y-7">
        <SectionHeader eyebrow="Operation Process" title="운영 프로세스" />
        <ProcessSteps steps={dispatchProcess} />
        <div className="flex flex-wrap justify-center gap-3">
          {dispatchCtas.map((cta, idx) => (
            <Link
              key={`process-${cta.label}-${idx}`}
              href={cta.href}
              data-track={cta.track ?? inferTrackFromHref(cta.href)}
              data-track-label={cta.label}
              className={
                idx === 0
                  ? 'rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white'
                  : 'rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-900'
              }
            >
              {cta.label}
            </Link>
          ))}
        </div>
      </section>

      <section className="space-y-7">
        <SectionHeader eyebrow="Cases" title="실제 사례" />
        <div className="grid gap-3 md:grid-cols-2">
          {dispatchCases.map((item) => (
            <div key={item} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700">
              {item}
            </div>
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

      <section className="space-y-7">
        <SectionHeader eyebrow="FAQ" title="기관 담당자 FAQ" />
        <FAQList items={dispatchFaq} />
      </section>

      <SplitCTA
        title="기관 운영에 맞는 체육교육 제안서를 요청해 보세요."
        description="대상, 공간, 인원, 일정만 알려주시면 운영 목적에 맞춘 구조와 프로그램 조합을 제안합니다."
        buttons={dispatchCtas}
        mobilePriority
      />

      <WhySpokeduTrustSection />
    </div>
  );
}
