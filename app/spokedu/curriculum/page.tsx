import type { Metadata } from 'next';
import Link from 'next/link';
import { ImagePlaceholder } from '../components/image-placeholder';
import { ProcessSteps, SectionHeader, SplitCTA, WhySpokeduTrustSection } from '../components/blocks';
import {
  curriculumBuyerTargets,
  curriculumDeliveryFormats,
  curriculumFlow,
  curriculumHero,
  curriculumImageSlots,
  curriculumProducts,
  curriculumWhy,
  seoKeywords,
  seoMeta,
} from '../data/content';
import { curriculumCtas, curriculumHeroCtas } from '../data/ctas';
import { inferTrackFromHref } from '../lib/tracking';

export const metadata: Metadata = {
  title: seoMeta.curriculum.title,
  description: seoMeta.curriculum.description,
  keywords: [...seoKeywords.curriculum],
  alternates: {
    canonical: '/spokedu/curriculum',
  },
};

export default function SpokeduCurriculumPage() {
  return (
    <div className="space-y-14">
      <section className="rounded-3xl border border-indigo-100 bg-gradient-to-br from-white via-indigo-50 to-sky-50 p-6 sm:p-10">
        <h1 className="whitespace-pre-line text-3xl font-semibold leading-tight text-slate-900 sm:text-5xl">{curriculumHero.title}</h1>
        <p className="mt-5 max-w-4xl whitespace-pre-line text-sm leading-7 text-slate-700 sm:text-base">{curriculumHero.description}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          {curriculumHeroCtas.map((cta, idx) => (
            <Link
              key={`${cta.label}-${idx}`}
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
        <SectionHeader eyebrow="Why Curriculum" title="왜 커리큘럼이 필요한가" />
        <article className="rounded-2xl border border-slate-200 bg-white p-6 text-sm leading-7 text-slate-700 shadow-sm sm:text-base">
          {curriculumWhy}
        </article>
      </section>

      <section className="space-y-7">
        <SectionHeader
          eyebrow="Curriculum Products"
          title="커리큘럼 상품"
          description="기관·강사팀에서 바로 검토할 수 있도록 제공 단위를 상품 형태로 정리했습니다."
        />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {curriculumProducts.map((item) => (
            <article key={item.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-base font-semibold text-slate-900">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
            </article>
          ))}
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          {curriculumHeroCtas.map((cta, idx) => (
            <Link
              key={`offering-${cta.label}-${idx}`}
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
        <SectionHeader
          eyebrow="Delivery Formats"
          title="제공 형태"
          description="도입 이후 실무에 바로 사용할 수 있는 산출물 기준으로 구성했습니다."
        />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {curriculumDeliveryFormats.map((item) => (
            <article key={item.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-base font-semibold text-slate-900">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="space-y-7">
        <SectionHeader
          eyebrow="Buyers & Partners"
          title="구매/제휴 대상"
          description="강사 개인부터 기관·브랜드 운영사까지 도입 대상과 활용 맥락을 구분해 안내합니다."
        />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {curriculumBuyerTargets.map((item) => (
            <article key={item.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-base font-semibold text-slate-900">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="space-y-7">
        <SectionHeader eyebrow="Photo Slots" title="커리큘럼/강사교육 이미지 영역" description="상품 자료, 교구 세팅, 강사 교육 장면을 이 슬롯에 배치하세요." />
        <div className="grid gap-4 md:grid-cols-3">
          {curriculumImageSlots.map((item) => (
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
        <SectionHeader eyebrow="Production Flow" title="커리큘럼 제작 흐름" />
        <ProcessSteps steps={curriculumFlow} />
      </section>

      <SplitCTA
        title="운영 가능한 체육 콘텐츠 체계를 찾는다면 상담으로 연결해 주세요."
        description="운영 목적, 대상 연령, 현장 조건을 기준으로 제공 범위와 도입 단계를 제안합니다."
        buttons={curriculumCtas}
        mobilePriority
      />

      <WhySpokeduTrustSection />
    </div>
  );
}
