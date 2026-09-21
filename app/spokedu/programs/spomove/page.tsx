import { Suspense } from 'react';
import SpomoveCatalogTabs from '../../components/spomove-catalog-tabs';
import SpomoveProgramLanding from '../../components/spomove-program-landing';
import { buildSpokeduPageMetadata, buildProgramDetailOgImage } from '../../data/seo';

export const metadata = buildSpokeduPageMetadata({
  title: 'SPOMOVE | 움직임에 반응하는 시지각 놀이체육',
  description:
    '화면의 자극을 보고 판단하고 움직이는 SPOKEDU의 디지털 움직임 프로그램입니다.',
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
