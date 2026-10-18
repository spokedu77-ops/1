import type { Metadata } from 'next';
import { SpomovePublicCatalog } from '../../../components/spomove-public-catalog';
import { buildSpokeduPageMetadata } from '../../../data/seo';

const PAGE_TITLE = 'SPOMOVE 프로그램 구성 | SPOKEDU';
const PAGE_DESCRIPTION =
  'SPOMOVE 반응 유형(단순·선택·복합)과 SEE·DECIDE·MOVE 흐름, 활동 예시를 소개합니다. 기관 도입과 SPOKEDU LAB 경로를 안내합니다.';

export const metadata: Metadata = {
  title: PAGE_TITLE,
  ...buildSpokeduPageMetadata({
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    canonical: '/spomove/catalog',
    keywords: ['SPOMOVE', '스포무브', '체육교육 프로그램', '프로그램 구성'],
    pageKey: 'programs',
  }),
};

export default function SpomoveCatalogPage() {
  return <SpomovePublicCatalog />;
}
