import type { HomeCaseCard } from '../data/home-page';
import type { HomeFieldRecordCardFromCatalog } from '../data/field-records-catalog';
import type { HomeMediaKey } from '../data/home-media';
import type { FieldRecordItem } from '../data/records-page';

/** slug → 로컬 records 폴더 미디어 (카탈로그 mediaKey와 동일하게 유지) */
const stableRecordMediaBySlug: Partial<Record<string, HomeMediaKey>> = {
  'dongjak-spomove': 'proofDongjak',
  'yangcheon-paps': 'proofYangcheon',
  'dasarang-oneday': 'proofDasarang',
  'seodaemun-event-booth': 'proofEvent',
};

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
  return records.map((record) => {
    const resolved: FieldRecordWithThumbnail = { ...record };
    resolved.mediaKey = stableRecordMediaBySlug[record.slug] ?? record.mediaKey;
    delete resolved.thumbnailSrc;
    return resolved;
  });
}

export function resolveHomeFieldRecordCards(
  cards: readonly (HomeFieldRecordCardFromCatalog | HomeCaseCard)[],
): HomeFieldRecordCardWithThumbnail[] {
  return cards.map((card) => {
    const resolved: HomeFieldRecordCardWithThumbnail = { ...card };
    resolved.mediaKey = stableRecordMediaBySlug[card.slug] ?? card.mediaKey;
    delete resolved.thumbnailSrc;
    return resolved;
  });
}
