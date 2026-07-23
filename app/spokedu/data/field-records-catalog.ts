import type { HomeMediaKey } from './home-media';
import { SPOKEDU_BASE_PATH } from './site';

/** 현장 수업 사례 — 홈·records 공통 원천 */
export type RecordFilterId = 'all' | 'regular' | 'oneday' | 'camp' | 'edtech';

/** 온사이트 사례 요약 — 목적·대상·구성·결과 (블로그는 blogHref로 원문 유지) */
export type FieldRecordOnsiteSummary = {
  purpose: string;
  audience: string;
  composition: readonly string[];
  outcome: string;
};

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
  /** 블로그에서 받아 로컬에 고정한 썸네일 — 런타임 Naver fetch 없음 */
  thumbnailSrc?: string;
  /** 온사이트 요약이 있을 때 후기 원문(네이버 블로그) */
  blogHref?: string;
};

export type FieldRecordSlug =
  | 'dongjak-spomove'
  | 'yangcheon-paps'
  | 'maedong-sports-stepup'
  | 'dasarang-oneday'
  | 'seodaemun-event-booth'
  | 'donghaeng-special-pe'
  | 'gangdong-health-pe'
  | 'shinwol-integrated-pe';

/** 수업 사례 히어로 칩·집계용 기관 유형 */
export type FieldRecordVenueType =
  | '키움센터'
  | '학교'
  | '아동시설'
  | '문화공간'
  | '주민센터'
  | '보건소'
  | '찾아가는 수업';

export type FieldRecordCatalogItem = {
  slug: FieldRecordSlug;
  /** 홈 카드 상단 프로그램 라벨 */
  programLabel: string;
  venue: string;
  /** 히어로 기관 유형 칩·집계 */
  venueType: FieldRecordVenueType;
  /** 홈 sessionLine · records meta */
  meta: string;
  operationType: string;
  description: string;
  mediaKey: HomeMediaKey;
  /** 카드 기본 링크 — 온사이트 요약이 있으면 `/records/[slug]`, 없으면 블로그 */
  href: string;
  ctaLabel: string;
  recordsTrackLabel: string;
  homeTrackLabel: string;
  filters: readonly RecordFilterId[];
  blogImageIndex?: number;
  thumbnailSrc?: string;
  /** 온사이트 요약이 있을 때 후기 원문(네이버 블로그) */
  blogHref?: string;
  /** 상위 사례 온사이트 1페이지용 요약 */
  onsite?: FieldRecordOnsiteSummary;
};

export function getFieldRecordOnsitePath(slug: FieldRecordSlug): string {
  return `${SPOKEDU_BASE_PATH}/records/${slug}`;
}

export function hasFieldRecordOnsiteSummary(
  item: FieldRecordCatalogItem,
): item is FieldRecordCatalogItem & { onsite: FieldRecordOnsiteSummary; blogHref: string } {
  return Boolean(item.onsite && item.blogHref);
}

export type RecordsHeroSummary = {
  caseCount: number;
  venueTypeCount: number;
  operationTypeCount: number;
  venueTypes: FieldRecordVenueType[];
};

const recordsThumb = (slug: FieldRecordSlug, ext: 'jpg' | 'png') =>
  `/images/spokedu/records/${slug}.${ext}` as const;

export const FIELD_RECORD_CATALOG: readonly FieldRecordCatalogItem[] = [
  {
    slug: 'dongjak-spomove',
    programLabel: 'SPOMOVE',
    venue: '동작거점형 우리동네키움센터',
    venueType: '키움센터',
    meta: '초등학생 · SPOMOVE 에듀테크',
    operationType: '정규수업',
    description:
      '스크린 신호를 보고 판단·반응하며 움직이는 SPOMOVE 놀이체육 — 거점형 키움센터 집단 수업입니다.',
    mediaKey: 'proofDongjak',
    href: getFieldRecordOnsitePath('dongjak-spomove'),
    ctaLabel: '사례 요약 보기',
    blogHref: 'https://blog.naver.com/spokedutogether/224288724087',
    recordsTrackLabel: 'records-dongjak-spomove',
    homeTrackLabel: 'cta-home-proof-dongjak',
    filters: ['regular', 'edtech'],
    thumbnailSrc: recordsThumb('dongjak-spomove', 'jpg'),
    onsite: {
      purpose: '스크린 신호를 보고 판단·반응하며 움직이는 SPOMOVE 놀이체육으로 거점센터 정규 참여를 안정화',
      audience: '초등학생 · 거점형 키움센터 집단 수업',
      composition: [
        '빔·스크린 색·위치·방향 신호로 보고 → 선택 → 움직이는 미션을 배치했습니다.',
        '혼합 연령이 함께 참여할 수 있도록 난이도와 대기 동선을 스테이션 단위로 나눴습니다.',
        '짧은 블록 안에서도 규칙 전환이 끊기지 않도록 신호 리듬을 맞춰 운영했습니다.',
      ],
      outcome:
        '수업 중반 이후 신호를 기다린 뒤 움직여 반응하는 흐름이 안정되어, 거점센터 정규 시간대에 맞는 SPOMOVE 운영 틀이 잡혔습니다.',
    },
  },
  {
    slug: 'yangcheon-paps',
    programLabel: 'PAPS',
    venue: '양천거점형키움센터',
    venueType: '키움센터',
    meta: '초등 1~2학년 · PAPS 놀이체육',
    operationType: '정규수업',
    description:
      '3개월간 교구·놀이체육으로 제자리멀리뛰기, 왕복오래달리기, 유연성·근지구력 요소를 경험하는 PAPS 연계 정규수업입니다.',
    mediaKey: 'proofYangcheon',
    href: getFieldRecordOnsitePath('yangcheon-paps'),
    ctaLabel: '사례 요약 보기',
    blogHref: 'https://blog.naver.com/spokedutogether/224286265879',
    recordsTrackLabel: 'records-yangcheon-paps',
    homeTrackLabel: 'cta-home-proof-yangcheon-paps',
    filters: ['regular'],
    thumbnailSrc: recordsThumb('yangcheon-paps', 'jpg'),
    onsite: {
      purpose: 'PAPS 체력 요소를 놀이체육으로 경험하게 해 저학년 정규 수업의 참여·성취 흐름을 만들기',
      audience: '초등 1~2학년 · 양천거점형키움센터',
      composition: [
        '제자리멀리뛰기·왕복오래달리기·유연성·근지구력 요소를 교구·놀이로 재구성했습니다.',
        '3개월 정규 일정에 맞춰 난이도와 교구를 단계적으로 교체했습니다.',
        '저학년 집중 시간에 맞는 짧은 미션 블록과 대기 동선을 함께 설계했습니다.',
      ],
      outcome:
        '측정형 요소를 놀이로 풀면서도 체력 경험의 목적이 드러나, 기관 담당자가 이어갈 수 있는 정규 운영 패턴이 확인됐습니다.',
    },
  },
  {
    slug: 'maedong-sports-stepup',
    programLabel: '스포츠 스텝업',
    venue: '매동초등학교',
    venueType: '학교',
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
    thumbnailSrc: recordsThumb('maedong-sports-stepup', 'jpg'),
  },
  {
    slug: 'dasarang-oneday',
    programLabel: '원데이',
    venue: '다사랑영등포지역아동센터',
    venueType: '아동시설',
    meta: '초등 2~6학년 · 90분 펑셔널 놀이체육',
    operationType: '원데이·행사',
    description:
      '펀스틱 펜싱, 플로어 컬링, 신체기능 놀이체육, SPOMOVE 리듬챌린지로 90분 원데이 체육 프로그램을 운영했습니다.',
    mediaKey: 'proofDasarang',
    href: getFieldRecordOnsitePath('dasarang-oneday'),
    ctaLabel: '사례 요약 보기',
    blogHref: 'https://blog.naver.com/spokedutogether/224286297222',
    recordsTrackLabel: 'records-dasarang',
    homeTrackLabel: 'cta-home-proof-dasarang',
    filters: ['oneday', 'edtech'],
    thumbnailSrc: recordsThumb('dasarang-oneday', 'jpg'),
    onsite: {
      purpose: '하루 일정 안에서 학년 혼합 아동이 안전하게 순환하며 협동·기능 체육을 경험하게 만들기',
      audience: '초등 2~6학년 · 지역아동센터 원데이',
      composition: [
        '펀스틱 펜싱·플로어 컬링·신체기능 놀이체육·SPOMOVE 리듬챌린지를 90분 블록으로 배치했습니다.',
        '학년 혼합 편성에 맞춰 역할·난이도를 이중으로 나눴습니다.',
        '행사 종료까지 안전 동선이 유지되도록 스테이션 순환을 설계했습니다.',
      ],
      outcome:
        '후반 블록에서도 팀 미션 규칙을 이어가는 흐름이 늘어나, 짧은 원데이 일정에서도 참여 밀도를 유지했습니다.',
    },
  },
  {
    slug: 'seodaemun-event-booth',
    programLabel: '원데이·행사',
    venue: '서대문구 독립문공원 어린이날 축제',
    venueType: '문화공간',
    meta: 'SPOMOVE 체험부스 · 어린이날 행사',
    operationType: '원데이·행사',
    description:
      '골프퍼팅, 에어타겟, SPOMOVE 반응인지, 모션탭 등 시간대별 체육 체험부스를 운영했습니다.',
    mediaKey: 'proofEvent',
    href: getFieldRecordOnsitePath('seodaemun-event-booth'),
    ctaLabel: '사례 요약 보기',
    blogHref: 'https://blog.naver.com/spokedu77/224282789801',
    recordsTrackLabel: 'records-seodaemun',
    homeTrackLabel: 'cta-home-proof-seodaemun',
    filters: ['oneday', 'edtech'],
    thumbnailSrc: recordsThumb('seodaemun-event-booth', 'jpg'),
    onsite: {
      purpose: '공공·문화 행사에서 처음 참여하는 아이·가족도 짧은 시간에 체험을 완료하게 만들기',
      audience: '어린이·가족 단위 · 어린이날 체험부스',
      composition: [
        '골프퍼팅·에어타겟·SPOMOVE 반응인지·모션탭을 시간대별 회전형 부스로 구성했습니다.',
        '3~5분 단위 즉시 참여 룰로 대기열을 줄였습니다.',
        '가족 협동 미션으로 보호자와 아이가 함께 참여하도록 동선을 맞췄습니다.',
      ],
      outcome:
        '오후 시간대에도 설명 없이 규칙을 따라 참여하는 비율이 높아, 행사형 부스 패키지로 재적용 가능한 운영 틀이 확인됐습니다.',
    },
  },
  {
    slug: 'donghaeng-special-pe',
    programLabel: '특수체육',
    venue: '찾아가는 동행 체육교실',
    venueType: '찾아가는 수업',
    meta: '특수체육 · 찾아가는 동행체육',
    operationType: '정규수업',
    description:
      '특수체육 현장에서 아이와 함께 움직이는 찾아가는 동행 체육교실 — 맞춤형 활동으로 참여와 성취를 쌓는 수업입니다.',
    mediaKey: 'proofDongjak',
    href: 'https://blog.naver.com/spokedutogether/224338186918',
    ctaLabel: '블로그 후기 보기',
    recordsTrackLabel: 'records-donghaeng-special-blog',
    homeTrackLabel: 'cta-home-proof-donghaeng-blog',
    filters: ['regular'],
    thumbnailSrc: recordsThumb('donghaeng-special-pe', 'jpg'),
  },
  {
    slug: 'gangdong-health-pe',
    programLabel: '일반체육',
    venue: '강동구 보건소 연계 수업',
    venueType: '보건소',
    meta: '일반체육 · 보건소 연계',
    operationType: '정규수업',
    description:
      '강동구 보건소와 연계해 아동·가족 대상으로 운영한 일반체육 수업 — 건강·움직임 습관을 현장 활동으로 이어갑니다.',
    mediaKey: 'proofYangcheon',
    href: 'https://blog.naver.com/spokedu77/224119622722',
    ctaLabel: '블로그 후기 보기',
    recordsTrackLabel: 'records-gangdong-health-blog',
    homeTrackLabel: 'cta-home-proof-gangdong-blog',
    filters: ['regular'],
    thumbnailSrc: recordsThumb('gangdong-health-pe', 'jpg'),
  },
  {
    slug: 'shinwol-integrated-pe',
    programLabel: '전연령 통합체육',
    venue: '신월 2동 주민센터',
    venueType: '주민센터',
    meta: '전연령 · 통합체육 · 주민센터',
    operationType: '원데이·행사',
    description:
      '신월 2동 주민센터에서 전연령이 함께하는 통합체육 — 미니운동회와 신체놀이를 한자리에서 경험하는 현장입니다.',
    mediaKey: 'proofEvent',
    href: 'https://blog.naver.com/spokedu77/224104727469',
    ctaLabel: '블로그 후기 보기',
    recordsTrackLabel: 'records-shinwol-integrated-blog',
    homeTrackLabel: 'cta-home-proof-shinwol-blog',
    filters: ['oneday'],
    thumbnailSrc: recordsThumb('shinwol-integrated-pe', 'jpg'),
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
    blogHref: item.blogHref,
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

/** 카탈로그 기준으로 히어로 숫자·칩을 계산 (하드코딩 금지) */
export function buildRecordsHeroSummary(
  records: readonly FieldRecordCatalogItem[] = FIELD_RECORD_CATALOG,
): RecordsHeroSummary {
  const venueTypes: FieldRecordVenueType[] = [];
  const seenVenue = new Set<FieldRecordVenueType>();
  for (const item of records) {
    if (seenVenue.has(item.venueType)) continue;
    seenVenue.add(item.venueType);
    venueTypes.push(item.venueType);
  }

  const operationTypes = new Set(records.map((item) => item.operationType));

  return {
    caseCount: records.length,
    venueTypeCount: venueTypes.length,
    operationTypeCount: operationTypes.size,
    venueTypes,
  };
}
