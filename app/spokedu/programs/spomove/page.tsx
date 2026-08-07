import { Suspense } from 'react';
import SpomoveCatalogTabs from '../../components/spomove-catalog-tabs';
import SpomoveProgramLanding from '../../components/spomove-program-landing';
import { buildSpokeduPageMetadata, buildProgramDetailOgImage } from '../../data/seo';

export const metadata = buildSpokeduPageMetadata({
  title: 'SPOMOVE | 화면의 정보를 움직임으로 연결하는 신체활동 콘텐츠',
  description:
    '색상·위치·방향·숫자·순서를 확인하고 규칙에 따라 움직이는 SPOMOVE. 기관수업과 지도자용 구독시스템에서 활용하는 스포키듀 콘텐츠입니다.',
  canonical: '/spomove',
  keywords: ['SPOMOVE', 'SPOMAT', '아동 체육', '기관 체육수업', '구독시스템', '에듀테크 체육'],
  pageKey: 'programs',
  ogImage: buildProgramDetailOgImage('spomove'),
});

type SpomovePageProps = {
  searchParams?: Promise<{ tab?: string | string[] }>;
};

function TabsFallback() {
  return (
    <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
      <div className="rounded-[1.5rem] border border-[#DCE3EE] bg-white p-6 text-sm text-[#536279] sm:p-8">
        <p className="font-semibold text-[#0B1F46]">교육·특수체육 자료를 불러오는 중입니다.</p>
        <p className="mt-2">상단의 SPOMOVE 소개와 이용 경로는 그대로 이용할 수 있습니다.</p>
      </div>
    </div>
  );
}

export default async function SpokeduProgramSpomovePage({ searchParams }: SpomovePageProps) {
  const params = searchParams ? await searchParams : {};
  const rawTab = params.tab;
  const tab = Array.isArray(rawTab) ? rawTab[0] : rawTab;
  const showLegacyTabs = tab === 'education' || tab === 'special-pe' || tab === 'catalog';

  if (showLegacyTabs) {
    return (
      <Suspense fallback={<TabsFallback />}>
        <SpomoveCatalogTabs />
      </Suspense>
    );
  }

  return <SpomoveProgramLanding />;
}
