import type { HomeCaseCard } from '../data/home-page';
import type { HomeFieldRecordCardFromCatalog } from '../data/field-records-catalog';
import type { FieldRecordItem } from '../data/records-page';

export type FieldRecordWithThumbnail = FieldRecordItem & {
  thumbnailSrc?: string;
};

export type HomeFieldRecordCardWithThumbnail = (HomeFieldRecordCardFromCatalog | HomeCaseCard) & {
  thumbnailSrc?: string;
};

/** 카탈로그에 고정된 thumbnailSrc를 그대로 전달 (런타임 fetch 없음) */
export function resolveFieldRecordsWithThumbnails(
  records: readonly FieldRecordItem[],
): FieldRecordWithThumbnail[] {
  return records.map((record) => record);
}

export function resolveHomeFieldRecordCards(
  cards: readonly (HomeFieldRecordCardFromCatalog | HomeCaseCard)[],
): HomeFieldRecordCardWithThumbnail[] {
  return cards.map((card) => card);
}
