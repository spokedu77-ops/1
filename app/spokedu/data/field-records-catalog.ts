import type { HomeMediaKey } from './home-media';

/** 현장 수업 사례 — 홈·records 공통 원천 */
export type RecordFilterId = 'all' | 'regular' | 'oneday' | 'camp' | 'edtech';

export type FieldRecordItem = {
  slug: string;
  venue: string;
  meta: string;
  operationType: string;
  description: string;
  mediaKey: HomeMediaKey;
  href: string;
  ctaLabel: string;
  trackLabel: string;
  filters: readonly RecordFilterId[];
  /** 네이버 블로그 연동 시 대표(og) 이미지 제외 후 본문 사진 순서 — 0이 첫 현장 사진 */
  blogImageIndex?: number;
  /** 네이버 블로그 현장 사진 — 빌드 타임 고정 (런타임 fetch 금지) */
  thumbnailSrc?: string;
};

export type FieldRecordSlug =
  | 'dongjak-spomove'
  | 'yangcheon-paps'
  | 'maedong-sports-stepup'
  | 'dasarang-oneday'
  | 'seodaemun-event-booth';

export type FieldRecordCatalogItem = {
  slug: FieldRecordSlug;
  /** 홈 카드 상단 프로그램 라벨 */
  programLabel: string;
  venue: string;
  /** 홈 sessionLine · records meta */
  meta: string;
  operationType: string;
  description: string;
  mediaKey: HomeMediaKey;
  href: string;
  ctaLabel: string;
  recordsTrackLabel: string;
  homeTrackLabel: string;
  filters: readonly RecordFilterId[];
  blogImageIndex?: number;
  thumbnailSrc?: string;
};

export const FIELD_RECORD_CATALOG: readonly FieldRecordCatalogItem[] = [
  {
    slug: 'dongjak-spomove',
    programLabel: 'SPOMOVE',
    venue: '동작거점형 우리동네키움센터',
    meta: '초등학생 · SPOMOVE 에듀테크',
    operationType: '정규수업',
    description:
      '스크린 신호를 보고 판단·반응하며 움직이는 SPOMOVE 놀이체육 — 거점형 키움센터 집단 수업입니다.',
    mediaKey: 'proofDongjak',
    href: 'https://blog.naver.com/spokedutogether/224288724087',
    ctaLabel: '블로그 후기 보기',
    recordsTrackLabel: 'records-dongjak-spomove-blog',
    homeTrackLabel: 'cta-home-proof-dongjak-blog',
    filters: ['regular', 'edtech'],
  },
  {
    slug: 'yangcheon-paps',
    programLabel: 'PAPS',
    venue: '양천거점형키움센터',
    meta: '초등 1~2학년 · PAPS 놀이체육',
    operationType: '정규수업',
    description:
      '3개월간 교구·놀이체육으로 제자리멀리뛰기, 왕복오래달리기, 유연성·근지구력 요소를 경험하는 PAPS 연계 정규수업입니다.',
    mediaKey: 'proofYangcheon',
    href: 'https://blog.naver.com/spokedutogether/224286265879',
    ctaLabel: '블로그 후기 보기',
    recordsTrackLabel: 'records-yangcheon-paps-blog',
    homeTrackLabel: 'cta-home-proof-yangcheon-paps-blog',
    filters: ['regular'],
  },
  {
    slug: 'maedong-sports-stepup',
    programLabel: '스포츠 스텝업',
    venue: '매동초등학교',
    meta: '종로거점형키움센터 연계 · 6개월 늘봄 스포츠',
    operationType: '정규수업',
    description:
      '클라이밍, 피클볼, 플로어볼, 플로어컬링, 플래그풋볼, 야구, 권투를 차례로 경험하는 스포츠 스텝업 늘봄 연계 수업입니다.',
    mediaKey: 'proofCenter',
    href: 'https://blog.naver.com/spokedutogether/224288711414',
    ctaLabel: '블로그 후기 보기',
    recordsTrackLabel: 'records-maedong-sports-blog',
    homeTrackLabel: 'cta-home-proof-maedong-blog',
    filters: ['regular'],
  },
  {
    slug: 'dasarang-oneday',
    programLabel: '원데이',
    venue: '다사랑영등포지역아동센터',
    meta: '초등 2~6학년 · 90분 펑셔널 놀이체육',
    operationType: '원데이·행사',
    description:
      '펀스틱 펜싱, 플로어 컬링, 신체기능 놀이체육, SPOMOVE 리듬챌린지로 90분 원데이 체육 프로그램을 운영했습니다.',
    mediaKey: 'proofDasarang',
    href: 'https://blog.naver.com/spokedutogether/224286297222',
    ctaLabel: '블로그 후기 보기',
    recordsTrackLabel: 'records-dasarang-blog',
    homeTrackLabel: 'cta-home-proof-dasarang-blog',
    filters: ['oneday', 'edtech'],
  },
  {
    slug: 'seodaemun-event-booth',
    programLabel: '원데이·행사',
    venue: '서대문구 독립문공원 어린이날 축제',
    meta: 'SPOMOVE 체험부스 · 어린이날 행사',
    operationType: '원데이·행사',
    description:
      '골프퍼팅, 에어타겟, SPOMOVE 반응인지, 모션탭 등 시간대별 체육 체험부스를 운영했습니다.',
    mediaKey: 'proofEvent',
    href: 'https://blog.naver.com/spokedu77/224282789801',
    ctaLabel: '블로그 후기 보기',
    recordsTrackLabel: 'records-seodaemun-blog',
    homeTrackLabel: 'cta-home-proof-seodaemun-blog',
    filters: ['oneday', 'edtech'],
  },
] as const;

/** 홈 현장 4카드 노출 순서 (첫 항목 = 대표 카드) */
export const HOME_FEATURED_FIELD_RECORD_SLUGS: readonly FieldRecordSlug[] = [
  'dongjak-spomove',
  'yangcheon-paps',
  'dasarang-oneday',
  'seodaemun-event-booth',
] as const;

export function getFieldRecordCatalogItem(slug: FieldRecordSlug): FieldRecordCatalogItem {
  const item = FIELD_RECORD_CATALOG.find((r) => r.slug === slug);
  if (!item) throw new Error(`Unknown field record slug: ${slug}`);
  return item;
}

export function catalogItemToRecordsPageItem(item: FieldRecordCatalogItem): FieldRecordItem {
  return {
    slug: item.slug,
    venue: item.venue,
    meta: item.meta,
    operationType: item.operationType,
    description: item.description,
    mediaKey: item.mediaKey,
    href: item.href,
    ctaLabel: item.ctaLabel,
    trackLabel: item.recordsTrackLabel,
    filters: item.filters,
    blogImageIndex: item.blogImageIndex,
    thumbnailSrc: item.thumbnailSrc,
  };
}

export type HomeFieldRecordCardFromCatalog = {
  slug: FieldRecordSlug;
  tagline: string;
  venue: string;
  sessionLine: string;
  href: string;
  trackLabel: string;
  mediaKey: HomeMediaKey;
  blogImageIndex?: number;
  thumbnailSrc?: string;
};

export function catalogItemToHomeCard(item: FieldRecordCatalogItem): HomeFieldRecordCardFromCatalog {
  return {
    slug: item.slug,
    tagline: item.programLabel,
    venue: item.venue,
    sessionLine: item.meta,
    href: item.href,
    trackLabel: item.homeTrackLabel,
    mediaKey: item.mediaKey,
    blogImageIndex: item.blogImageIndex,
    thumbnailSrc: item.thumbnailSrc,
  };
}

export function buildHomeFieldRecordCards(): HomeFieldRecordCardFromCatalog[] {
  return HOME_FEATURED_FIELD_RECORD_SLUGS.map((slug) =>
    catalogItemToHomeCard(getFieldRecordCatalogItem(slug)),
  );
}

export function buildRecordsPageFieldRecords(): FieldRecordItem[] {
  return FIELD_RECORD_CATALOG.map(catalogItemToRecordsPageItem);
}
