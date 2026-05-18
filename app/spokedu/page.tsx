import type { Metadata } from 'next';
import Link from 'next/link';
import {
  PhilosophyCard,
  ProgramAssetCard,
  ProofCard,
  SectionHeader,
  SiteHero,
  SplitCTA,
  TrackCard,
} from './components/blocks';
import {
  coreTracks,
  homeHeroImage,
  philosophyCards,
  programAssets,
  proofItems,
  seoKeywords,
  SPOKEDU_BASE_PATH,
} from './data/content';

export const metadata: Metadata = {
  title: 'SPOKEDU 스포키듀 | 아동·청소년 체육교육 전문 단체',
  description:
    'SPOKEDU는 아이들의 움직임을 교육적으로 설계하고, 그 움직임을 수업·커리큘럼·콘텐츠로 확장하는 아동·청소년 체육교육 전문 단체입니다.',
  keywords: [...seoKeywords.home],
  alternates: {
    canonical: '/spokedu',
  },
};

export default function SpokeduHomePage() {
  return (
    <div className="space-y-16">
      <SiteHero
        title={'움직임으로\n아이의 성장을\n설계합니다'}
        description={
          'SPOKEDU는 아이들의 움직임을 교육적으로 설계하고,\n그 움직임을 수업·커리큘럼·콘텐츠로 확장하는\n아동·청소년 체육교육 전문 단체입니다.\n\n가정에는 1:1·소그룹 체육수업으로,\n기관에는 파견형 체육교육 프로그램으로,\n선생님들에게는 커리큘럼과 교육 콘텐츠로 연결됩니다.'
        }
        keywords={['Private Class', 'Dispatch Solution', 'Curriculum & Contents']}
        heroVisual={homeHeroImage}
        highlights={[
          {
            title: 'Private Class',
            description: '개인·소그룹 수업으로 아이의 움직임 자신감과 기본 기능을 설계합니다.',
          },
          {
            title: 'Dispatch Solution',
            description: '기관의 공간·인원·운영 목적에 맞춘 파견형 체육교육을 제안합니다.',
          },
          {
            title: 'Curriculum & Contents',
            description: '현장 수업을 커리큘럼·콘텐츠·강사교육 자산으로 확장합니다.',
          },
        ]}
        ctas={[
          { label: '우리 아이 수업 상담하기', href: `${SPOKEDU_BASE_PATH}/private` },
          { label: '기관 수업 제안 받기', href: `${SPOKEDU_BASE_PATH}/dispatch` },
          { label: '커리큘럼·콘텐츠 문의', href: `${SPOKEDU_BASE_PATH}/curriculum` },
        ]}
      />

      <section className="space-y-8">
        <SectionHeader
          eyebrow="Philosophy"
          title="스포키듀는 체육을 움직임 교육으로 설계합니다"
          description="SPOKEDU는 체육을 단순히 많이 움직이는 활동으로 보지 않습니다. 아이들이 무엇을 보고, 어떻게 판단하고, 어떤 방식으로 몸을 사용하는지, 그리고 친구와 어떻게 함께 움직이는지까지 수업 안에 설계합니다."
        />
        <div className="grid gap-4 md:grid-cols-3">
          {philosophyCards.map((card) => (
            <PhilosophyCard key={card.code} {...card} />
          ))}
        </div>
      </section>

      <section className="space-y-8">
        <SectionHeader eyebrow="Three Tracks" title="우리는 세 가지 방식으로 체육교육을 만듭니다" />
        <div className="grid gap-4 md:grid-cols-3">
          {coreTracks.map((track) => (
            <TrackCard key={track.title} {...track} />
          ))}
        </div>
      </section>

      <section className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <SectionHeader
          eyebrow="Choose Your Inquiry"
          title="지금 필요한 문의 유형을 바로 선택하세요"
          description="페이지를 끝까지 보기 전에, 현재 목적에 맞는 문의부터 연결할 수 있습니다."
        />
        <div className="grid gap-3 md:grid-cols-3">
          <Link href={`${SPOKEDU_BASE_PATH}/contact?type=private`} className="rounded-2xl border border-slate-200 p-4 text-sm font-semibold text-slate-900 hover:border-indigo-300">
            우리 아이 수업 상담하기
          </Link>
          <Link href={`${SPOKEDU_BASE_PATH}/contact?type=dispatch`} className="rounded-2xl border border-slate-200 p-4 text-sm font-semibold text-slate-900 hover:border-indigo-300">
            기관 수업 제안 요청
          </Link>
          <Link href={`${SPOKEDU_BASE_PATH}/contact?type=curriculum`} className="rounded-2xl border border-slate-200 p-4 text-sm font-semibold text-slate-900 hover:border-indigo-300">
            커리큘럼 문의
          </Link>
        </div>
      </section>

      <section className="space-y-8">
        <SectionHeader
          eyebrow="Living Proof"
          title="SPOKEDU는 실제 현장에서 아이들을 만나고 있습니다"
          description="스포키듀는 철학만 말하지 않습니다. 실제 기관과 가정에서 수업을 운영하고, 그 경험을 월간 기록과 커리큘럼으로 연결합니다."
        />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {proofItems.map((item) => (
            <ProofCard key={item.title} {...item} />
          ))}
        </div>
      </section>

      <section className="space-y-8">
        <SectionHeader
          eyebrow="Signature Programs"
          title={'프로그램은 상품 목록이 아니라,\n스포키듀의 수업 콘텐츠 자산입니다'}
        />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {programAssets.map((asset) => (
            <ProgramAssetCard key={asset.title} {...asset} />
          ))}
        </div>
      </section>

      <SplitCTA
        title={'아이에게는 수업을,\n기관에는 프로그램을,\n선생님에게는 커리큘럼을.'}
        description="스포키듀는 수업을 많이 하는 것보다, 좋은 수업이 반복될 수 있는 구조를 만드는 데 집중합니다."
        buttons={[
          { label: '우리 아이 수업 상담하기', href: `${SPOKEDU_BASE_PATH}/contact?type=private` },
          { label: '기관 수업 제안 요청', href: `${SPOKEDU_BASE_PATH}/contact?type=dispatch` },
          { label: '커리큘럼 문의', href: `${SPOKEDU_BASE_PATH}/contact?type=curriculum` },
        ]}
      />
    </div>
  );
}
