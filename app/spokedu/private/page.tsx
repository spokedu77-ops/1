import type { Metadata } from 'next';
import Link from 'next/link';
import { ImagePlaceholder } from '../components/image-placeholder';
import { FAQList, ProcessSteps, SectionHeader, SplitCTA } from '../components/blocks';
import {
  privateClassTypes,
  privateConsultFlow,
  privateCtas,
  privateFaq,
  privateHero,
  privateImageSlots,
  privateLocations,
  privateNeeds,
  privateOutcomes,
  privateTopics,
  seoKeywords,
  seoMeta,
} from '../data/content';

export const metadata: Metadata = {
  title: seoMeta.private.title,
  description: seoMeta.private.description,
  keywords: [...seoKeywords.private],
  alternates: {
    canonical: '/spokedu/private',
  },
};

export default function SpokeduPrivatePage() {
  return (
    <div className="space-y-14">
      <section className="rounded-3xl border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-lime-50 p-6 sm:p-10">
        <h1 className="whitespace-pre-line text-3xl font-semibold leading-tight text-slate-900 sm:text-5xl">{privateHero.title}</h1>
        <p className="mt-5 max-w-3xl whitespace-pre-line text-sm leading-7 text-slate-700 sm:text-base">{privateHero.description}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/spokedu/contact?type=private" className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white">
            우리 아이 수업 상담하기
          </Link>
          <Link href="/spokedu/contact?type=private" className="rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-900">
            1:1 체육수업 문의
          </Link>
          <Link href="/spokedu/contact?type=private" className="rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-900">
            소그룹 수업 문의
          </Link>
        </div>
        <div className="mt-5">
          <Link href="/info/private" className="text-xs font-medium text-slate-500 underline-offset-2 hover:text-slate-700 hover:underline">
            기존 안내 페이지 확인
          </Link>
        </div>
      </section>

      <section className="space-y-7">
        <SectionHeader eyebrow="Needs" title="이런 아이에게 필요합니다" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {privateNeeds.map((item) => (
            <article key={item.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-base font-semibold text-slate-900">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="space-y-7">
        <SectionHeader eyebrow="Class Types" title="수업 형태" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {privateClassTypes.map((item) => (
            <article key={item.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-base font-semibold text-slate-900">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="space-y-7">
        <SectionHeader eyebrow="Locations" title="수업 장소" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {privateLocations.map((item) => (
            <article key={item.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-base font-semibold text-slate-900">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="space-y-7">
        <SectionHeader eyebrow="Photo Slots" title="실제 수업 이미지 영역" description="아래 슬롯을 실제 사진으로 교체하면 신뢰감이 즉시 올라갑니다." />
        <div className="grid gap-4 md:grid-cols-3">
          {privateImageSlots.map((item) => (
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
        <SectionHeader eyebrow="Curriculum Focus" title="수업에서 다루는 내용" />
        <div className="flex flex-wrap gap-2">
          {privateTopics.map((topic) => (
            <span key={topic} className="rounded-full border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-700">
              {topic}
            </span>
          ))}
        </div>
      </section>

      <section className="space-y-7">
        <SectionHeader eyebrow="Outcomes" title="아이가 얻는 변화" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {privateOutcomes.map((item) => (
            <article key={item.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-base font-semibold text-slate-900">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="space-y-7">
        <SectionHeader eyebrow="Consult Process" title="상담 흐름" />
        <ProcessSteps steps={privateConsultFlow} />
      </section>

      <section className="space-y-7">
        <SectionHeader eyebrow="FAQ" title="자주 묻는 질문" />
        <FAQList items={privateFaq} />
      </section>

      <SplitCTA
        title="우리 아이에게 맞는 수업을, 지금 상담으로 시작해 보세요."
        description="연령, 현재 운동 경험, 성향, 수업 목적을 기준으로 1:1 또는 소그룹 형태를 제안합니다."
        buttons={privateCtas}
      />
    </div>
  );
}
