import { recordsProofSummaryAreas } from './cases';
import { recordsProofImageAssets, recordsCaseImageBySlug, SPOKEDU_IMAGES } from './images';

export type RecordsProofTile = {
  label: string;
  image: string;
  alt: string;
  assetId: string;
};

export const recordsProofTiles: RecordsProofTile[] = recordsProofImageAssets.map((asset) => ({
  label:
    asset.id === 'record-lab'
      ? '스포키듀 LAB'
      : asset.id === 'private-small-group'
        ? '개인·소그룹 수업'
        : asset.id === 'dispatch-group'
          ? '기관 파견 수업'
          : asset.id === 'dispatch-oneday'
            ? '원데이 체육행사'
            : asset.id === 'program-camp'
              ? '방학캠프'
              : asset.id === 'monthly-hero'
                ? '월간 스포키듀 기록'
                : '커리큘럼 콘텐츠화',
  image: asset.src,
  alt: asset.alt,
  assetId: asset.id,
}));

export const recordsHubLinks = [
  { label: '수업 사례', href: '/spokedu/cases', track: 'cta-records-cases' },
  { label: '월간 스포키듀', href: '/spokedu/monthly', track: 'cta-records-monthly' },
  { label: '교육 인사이트', href: '/spokedu/insights', track: 'cta-records-insights' },
] as const;

export { recordsProofSummaryAreas, recordsCaseImageBySlug, SPOKEDU_IMAGES };
