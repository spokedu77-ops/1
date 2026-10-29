import type { FieldRecordItem, FieldRecordSlug } from './field-records-catalog';

/** v0 아카이브 필터·카드 배지 (대표 카테고리 1개) */
export const RECORDS_V0_FILTERS = [
  '전체 보기',
  '학교·늘봄 정기수업',
  '키움센터·복지관',
  '특수·포용 체육',
  'SPOMOVE',
  '미니올림픽·체험부스',
] as const;

export type RecordsV0Filter = (typeof RECORDS_V0_FILTERS)[number];
export type RecordsV0Category = Exclude<RecordsV0Filter, '전체 보기'>;

const CATEGORY_BY_SLUG: Record<FieldRecordSlug, RecordsV0Category> = {
  'maedong-sports-stepup': '학교·늘봄 정기수업',
  'donghaeng-special-pe': '특수·포용 체육',
  'dongjak-spomove': 'SPOMOVE',
  'yangcheon-paps': '키움센터·복지관',
  'gangdong-health-pe': '키움센터·복지관',
  'dasarang-oneday': '키움센터·복지관',
  'seodaemun-event-booth': '미니올림픽·체험부스',
  'shinwol-integrated-pe': '미니올림픽·체험부스',
};

/** v0 시안 카드 노출 순서 (썸네일·현장 매핑 검증용) */
export const RECORDS_V0_CARD_ORDER: readonly FieldRecordSlug[] = [
  'maedong-sports-stepup',
  'donghaeng-special-pe',
  'dongjak-spomove',
  'yangcheon-paps',
  'seodaemun-event-booth',
  'shinwol-integrated-pe',
  'gangdong-health-pe',
  'dasarang-oneday',
] as const;

const THEME_BY_SLUG: Partial<Record<FieldRecordSlug, string>> = {
  'maedong-sports-stepup': '스포츠 스텝업 & 뉴스포츠 순환',
  'donghaeng-special-pe': '수행 수준 맞춤형 포용 체육',
  'dongjak-spomove': '시지각 브레인 놀이체육',
  'yangcheon-paps': '초등 저학년 맞춤형 PAPS 놀이체육',
  'seodaemun-event-booth': '대규모 SPOMOVE 체험부스',
  'dasarang-oneday': '90분 펑셔널 & 팀빌딩 원데이',
  'gangdong-health-pe': '공간 최적화 펑셔널 놀이체육',
  'shinwol-integrated-pe': '전연령 통합 미니운동회',
};

export function getRecordsV0Category(slug: string): RecordsV0Category {
  const mapped = CATEGORY_BY_SLUG[slug as FieldRecordSlug];
  if (mapped) return mapped;
  return '키움센터·복지관';
}

/** 배지와 겹치지 않는 카드 부제(프로그램·테마 한 줄) */
export function getRecordsV0CardTheme(record: FieldRecordItem, categoryBadge: RecordsV0Category): string {
  const fromSlug = THEME_BY_SLUG[record.slug as FieldRecordSlug];
  if (fromSlug) return fromSlug;
  const { programLabel, operationType } = record;
  if (programLabel !== categoryBadge && programLabel !== operationType) {
    return programLabel;
  }
  return record.description.split(/[.!]/)[0]?.trim() || record.programLabel;
}

export function sortRecordsForV0<T extends { slug: string }>(records: readonly T[]): T[] {
  const order = new Map(RECORDS_V0_CARD_ORDER.map((slug, index) => [slug, index]));
  return [...records].sort((a, b) => {
    const ai = order.get(a.slug as FieldRecordSlug) ?? 999;
    const bi = order.get(b.slug as FieldRecordSlug) ?? 999;
    return ai - bi;
  });
}
