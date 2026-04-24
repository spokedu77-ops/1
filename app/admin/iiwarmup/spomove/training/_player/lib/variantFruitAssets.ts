'use client';

/**
 * Asset Hub `think_asset_packs` — SPOMOVE 변형 색지각 과일과 SPOMOVE 트레이닝 연동
 */

import { getPublicUrl } from '@/app/lib/admin/assets/storageClient';
import { buildFruitSlidesFromUrls, VARIANT_FRUIT_IMAGE_URLS, type FruitSlide } from './signals';

export const SPOMOVE_VARIANT_PACK_ID = 'spomove_variant_fruits';

/** UI·순서 고정 (11슬롯 = signals 슬롯과 동일) */
export const VARIANT_FRUIT_SLOT_LABELS: readonly string[] = [
  '사과 (빨강)',
  '바나나 (노랑)',
  '블루베리 (파랑)',
  '포도 (파랑)',
  '키위 (초록)',
  '참외 (노랑)',
  '레몬 (노랑)',
  '멜론 (초록)',
  '파인애플 (노랑)',
  '딸기 (빨강)',
  '수박 (초록)',
];

export type SpomoveVariantAssetsJson = {
  /** 길이 11, null이면 해당 슬롯은 기본(postimg) URL */
  paths?: (string | null)[];
};

/** DB에 저장된 Storage 경로 → 공개 URL로 합성한 FruitSlide[] */
export function mergeSpomoveVariantPaths(paths: (string | null)[] | undefined | null): FruitSlide[] {
  const defaults = [...VARIANT_FRUIT_IMAGE_URLS];
  const list =
    Array.isArray(paths) && paths.length === 11 ? paths : Array.from({ length: 11 }, () => null);
  const urls = list.map((p, i) => {
    if (p == null || typeof p !== 'string' || !p.trim()) return defaults[i]!;
    try {
      return getPublicUrl(p.trim());
    } catch {
      return defaults[i]!;
    }
  });
  return buildFruitSlidesFromUrls(urls);
}

export function variantFruitUrlsForPreload(slides: FruitSlide[]): string[] {
  return slides.map((s) => s.imageUrl);
}
