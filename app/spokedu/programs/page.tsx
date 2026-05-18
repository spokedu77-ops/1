import type { Metadata } from 'next';
import Link from 'next/link';
import { SectionHeader, SplitCTA, WhySpokeduTrustSection } from '../components/blocks';
import { programsHubCtas } from '../data/ctas';
import { seoKeywords, seoMeta } from '../data/content';
import { programs } from '../data/programs';
import { ImagePlaceholder } from '../components/image-placeholder';

export const metadata: Metadata = {
  title: seoMeta.programs.title,
  description: seoMeta.programs.description,
  keywords: [...seoKeywords.programs],
  alternates: {
    canonical: '/spokedu/programs',
  },
};

export default function SpokeduProgramsPage() {
  const programTrackMap: Record<string, string> = {
    spomove: 'cta-program-spomove',
    paps: 'cta-program-paps',
    camp: 'cta-program-camp',
  };

  return (
    <div className="space-y-10 sm:space-y-14">
      <section className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-indigo-50 p-6 sm:p-10">
        <h1 className="whitespace-pre-line text-3xl font-semibold leading-tight text-slate-900 sm:text-5xl">
          프로그램은 상품 목록이 아니라,
          {'\n'}
          스포키듀의 수업 콘텐츠 자산입니다
        </h1>
        <p className="mt-5 max-w-4xl text-sm leading-7 text-slate-700 sm:text-base">
          SPOMOVE, PAPS, 놀이체육, 원데이, 방학캠프, 커리큘럼 콘텐츠는 Private / Dispatch / Curriculum을 연결하는 실행 자산입니다.
        </p>
      </section>

      <section className="space-y-5 sm:space-y-7">
        <SectionHeader
          eyebrow="Programs Matrix"
          title="연결 축과 효과가 한눈에 보이는 프로그램 매트릭스"
          description="각 프로그램은 독립 사업이 아니라, 핵심 축을 지지하는 콘텐츠 자산으로 설계됩니다."
        />
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {programs.map((program) => (
            <article key={program.slug} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
              <ImagePlaceholder
                slot={`program-${program.slug}`}
                alt={program.imageAlt}
                src={program.image}
                title={`${program.title} 대표 이미지`}
                caption={program.category}
                className="mb-3 h-32 sm:mb-4 sm:h-40"
              />
              <h3 className="text-lg font-semibold text-slate-900">{program.title}</h3>
              <p className="mt-1.5 text-xs font-medium text-slate-500">
                카테고리: {program.category} · 대상: {program.target}
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-600">{program.description}</p>
              <p className="mt-3 text-xs font-medium text-slate-500">연결 축: {program.connectedTracks.join(' / ')}</p>
              <p className="mt-1 text-xs font-medium text-slate-500">핵심 효과: {program.effects.join(', ')}</p>
              <p className="mt-2 text-xs font-medium text-indigo-700">
                {program.expandable ? '상세 페이지 제공' : '상세 페이지 준비 중 · 문의 연결'}
              </p>
              <Link
                href={program.href}
                data-track={
                  program.expandable
                    ? programTrackMap[program.slug] ?? `cta-program-detail-${program.slug}`
                    : `cta-program-inquiry-${program.slug}`
                }
                data-track-label={`${program.slug}-${program.expandable ? 'detail-flow' : 'inquiry-flow'}`}
                className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                {program.expandable ? '프로그램 구조 확인하기' : '해당 프로그램 문의하기'}
              </Link>
            </article>
          ))}
        </div>
      </section>

      <SplitCTA
        title="우리 조직에 맞는 프로그램 조합을 제안받아 보세요."
        description="대상, 운영 목적, 공간·인원 조건에 맞춰 어떤 프로그램 자산을 묶어야 하는지 설계해 드립니다."
        buttons={[...programsHubCtas]}
        mobilePriority
      />

      <WhySpokeduTrustSection />
    </div>
  );
}
