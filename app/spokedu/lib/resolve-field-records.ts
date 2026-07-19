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
  'maedong-sports-stepup': 'proofCenter',
  'donghaeng-special-pe': 'proofDongjak',
  'gangdong-health-pe': 'proofYangcheon',
  'shinwol-integrated-pe': 'proofEvent',
};

export type FieldRecordWithThumbnail = FieldRecordItem & {
  thumbnailSrc?: string;
};

export type HomeFieldRecordCardWithThumbnail = (HomeFieldRecordCardFromCatalog | HomeCaseCard) & {
  thumbnailSrc?: string;
};

/** 카탈로그 thumbnailSrc(로컬 고정)를 유지하고, 없으면 mediaKey 폴백 */
export function resolveFieldRecordsWithThumbnails(
  records: readonly FieldRecordItem[],
): FieldRecordWithThumbnail[] {
  return records.map((record) => ({
    ...record,
    mediaKey: stableRecordMediaBySlug[record.slug] ?? record.mediaKey,
    thumbnailSrc: record.thumbnailSrc,
  }));
}

export function resolveHomeFieldRecordCards(
  cards: readonly (HomeFieldRecordCardFromCatalog | HomeCaseCard)[],
): HomeFieldRecordCardWithThumbnail[] {
  return cards.map((card) => ({
    ...card,
    mediaKey: stableRecordMediaBySlug[card.slug] ?? card.mediaKey,
    thumbnailSrc: card.thumbnailSrc,
  }));
}
