import type { Metadata } from 'next';
import { ProgramAssetCard, SectionHeader, SplitCTA } from '../components/blocks';
import { programAssets, seoKeywords, seoMeta, SPOKEDU_BASE_PATH } from '../data/content';

export const metadata: Metadata = {
  title: seoMeta.programs.title,
  description: seoMeta.programs.description,
  keywords: [...seoKeywords.programs],
  alternates: {
    canonical: '/spokedu/programs',
  },
};

export default function SpokeduProgramsPage() {
  return (
    <div className="space-y-14">
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

      <section className="space-y-7">
        <SectionHeader
          eyebrow="Programs Matrix"
          title="연결 축과 효과가 한눈에 보이는 프로그램 매트릭스"
          description="각 프로그램은 독립 사업이 아니라, 핵심 축을 지지하는 콘텐츠 자산으로 설계됩니다."
        />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {programAssets.map((asset) => (
            <ProgramAssetCard key={asset.title} {...asset} />
          ))}
        </div>
      </section>

      <SplitCTA
        title="우리 조직에 맞는 프로그램 조합을 제안받아 보세요."
        description="대상, 운영 목적, 공간·인원 조건에 맞춰 어떤 프로그램 자산을 묶어야 하는지 설계해 드립니다."
        buttons={[
          { label: '개인수업 연결 보기', href: `${SPOKEDU_BASE_PATH}/private` },
          { label: '기관수업 연결 보기', href: `${SPOKEDU_BASE_PATH}/dispatch` },
          { label: '커리큘럼 연결 보기', href: `${SPOKEDU_BASE_PATH}/curriculum` },
        ]}
      />
    </div>
  );
}
