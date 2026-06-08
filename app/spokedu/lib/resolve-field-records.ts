import type { HomeFieldRecordCard } from '../data/home-page';
import type { FieldRecordItem } from '../data/records-page';
import { fetchNaverBlogThumbnail, isNaverBlogPostUrl } from './naver-blog-thumbnail';
import { isExternalHref } from './external-link';

export type FieldRecordWithThumbnail = FieldRecordItem & {
  thumbnailSrc?: string;
};

export type HomeFieldRecordCardWithThumbnail = HomeFieldRecordCard & {
  thumbnailSrc?: string;
};

export async function resolveFieldRecordsWithThumbnails(
  records: readonly FieldRecordItem[],
): Promise<FieldRecordWithThumbnail[]> {
  return Promise.all(
    records.map(async (record) => {
      if (!isExternalHref(record.href) || !isNaverBlogPostUrl(record.href)) {
        return record;
      }
      const thumbnailSrc = await fetchNaverBlogThumbnail(record.href, {
        imageIndex: record.blogImageIndex ?? 0,
      });
      return thumbnailSrc ? { ...record, thumbnailSrc } : record;
    }),
  );
}

export async function resolveHomeFieldRecordCards(
  cards: readonly HomeFieldRecordCard[],
): Promise<HomeFieldRecordCardWithThumbnail[]> {
  return Promise.all(
    cards.map(async (card) => {
      if (!isExternalHref(card.href) || !isNaverBlogPostUrl(card.href)) {
        return card;
      }
      const thumbnailSrc = await fetchNaverBlogThumbnail(card.href, {
        imageIndex: card.blogImageIndex ?? 0,
      });
      return thumbnailSrc ? { ...card, thumbnailSrc } : card;
    }),
  );
}
