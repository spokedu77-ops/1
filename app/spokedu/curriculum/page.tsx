import type { Metadata } from 'next';
import Link from 'next/link';
import { ImagePlaceholder } from '../components/image-placeholder';
import { ProcessSteps, SectionHeader, SplitCTA } from '../components/blocks';
import {
  curriculumAudience,
  curriculumCtas,
  curriculumFlow,
  curriculumHero,
  curriculumImageSlots,
  curriculumOfferings,
  curriculumPrograms,
  curriculumWhy,
  seoKeywords,
  seoMeta,
} from '../data/content';

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
          <Link href="/spokedu/contact?type=curriculum" className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white">
            커리큘럼 문의
          </Link>
          <Link href="/spokedu/contact?type=curriculum" className="rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-900">
            콘텐츠 제휴 문의
          </Link>
        </div>
      </section>

      <section className="space-y-7">
        <SectionHeader eyebrow="Why Curriculum" title="왜 커리큘럼이 필요한가" />
        <article className="rounded-2xl border border-slate-200 bg-white p-6 text-sm leading-7 text-slate-700 shadow-sm sm:text-base">
          {curriculumWhy}
        </article>
      </section>

      <section className="space-y-7">
        <SectionHeader eyebrow="Offerings" title="제공 가능한 콘텐츠" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {curriculumOfferings.map((item) => (
            <article key={item.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-base font-semibold text-slate-900">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
            </article>
          ))}
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/spokedu/contact?type=curriculum" className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white">
            커리큘럼 문의
          </Link>
          <Link href="/spokedu/contact?type=curriculum" className="rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-900">
            콘텐츠 제휴 문의
          </Link>
        </div>
      </section>

      <section className="space-y-7">
        <SectionHeader eyebrow="Audience" title="누구에게 필요한가" />
        <div className="grid gap-4 md:grid-cols-2">
          {curriculumAudience.map((item) => (
            <article key={item.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-base font-semibold text-slate-900">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="space-y-7">
        <SectionHeader eyebrow="Photo Slots" title="커리큘럼/강사교육 이미지 영역" description="수업안 자료, 교구 세팅, 강사 교육 장면을 이 슬롯에 배치하세요." />
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
        <SectionHeader eyebrow="Program Portfolio" title="콘텐츠화 가능한 프로그램" />
        <div className="flex flex-wrap gap-2">
          {curriculumPrograms.map((program) => (
            <span key={program} className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700">
              {program}
            </span>
          ))}
        </div>
      </section>

      <section className="space-y-7">
        <SectionHeader eyebrow="Production Flow" title="커리큘럼 제작 흐름" />
        <ProcessSteps steps={curriculumFlow} />
      </section>

      <SplitCTA
        title="현장 수업을 반복 가능한 교육 자산으로 만들고 싶다면, 스포키듀와 함께 설계하세요."
        description="수업안, 매뉴얼, 교구 활용 콘텐츠, 강사 교육까지 한 흐름으로 연결해 드립니다."
        buttons={curriculumCtas}
      />
    </div>
  );
}
