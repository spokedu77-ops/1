'use client';

/**
 * Asset Hub `think_asset_packs` — SPOMOVE 변형 색지각 과일과 SPOMOVE 트레이닝 연동
 */

import { getPublicUrl, withPublicUrlCacheBust } from '@/app/lib/admin/assets/storageClient';
import { SPOMOVE_VARIANT_SLOT_COLOR_IDS } from '@/app/lib/admin/constants/padGrid';
import { COLORS } from '../constants';
import {
  SPOMOVE_VARIANT_FRUIT_SLOT_COUNT,
  type FruitSlide,
} from './signals';

export const SPOMOVE_VARIANT_PACK_ID = 'spomove_variant_fruits';

/** UI·순서: 1~4=각 패드, 5~8=같은 패드 두 번째 (1·5 빨 / 2·6 노 / 3·7 초 / 4·8 파) */
export const VARIANT_FRUIT_SLOT_LABELS: readonly string[] = [
  '1. 사과 (빨강)',
  '2. 바나나 (노랑)',
  '3. 키위 (초록)',
  '4. 블루베리 (파랑)',
  '5. 딸기 (빨강)',
  '6. 레몬 (노랑)',
  '7. 멜론 (초록)',
  '8. 포도 (파랑)',
];

export type SpomoveVariantAssetsJson = {
  /** 길이 8 (레거시 11행은 클라이언트에서 앞 8개만 사용) */
  paths?: (string | null)[];
};

export function normalizeSpomoveVariantFruitPaths(raw: unknown): (string | null)[] {
  const n = SPOMOVE_VARIANT_FRUIT_SLOT_COUNT;
  const mapSlot = (arr: (unknown | null)[]) => {
    const sliced: (unknown | null)[] = arr.slice(0, n);
    while (sliced.length < n) sliced.push(null);
    return sliced.map((x) => (typeof x === 'string' && x.trim() ? x.trim() : null));
  };
  if (Array.isArray(raw)) return mapSlot(raw);
  const p = (raw as SpomoveVariantAssetsJson | null)?.paths;
  if (!Array.isArray(p)) return Array.from({ length: n }, () => null);
  return mapSlot(p);
}

/** Asset Hub 그리드 미리보기 — 업로드 없는 칸은 빈 이미지(기본 외부 URL 없음) */
export function mergeSpomoveVariantPaths(
  paths: (string | null)[] | undefined | null,
  cacheBust?: number
): FruitSlide[] {
  const list = normalizeSpomoveVariantFruitPaths(paths);
  return list.map((p, i) => {
    const color =
      COLORS.find((c) => c.id === SPOMOVE_VARIANT_SLOT_COLOR_IDS[i]) ?? COLORS[0]!;
    if (p == null || typeof p !== 'string' || !p.trim()) {
      return { imageUrl: '', color };
    }
    try {
      return {
        imageUrl: withPublicUrlCacheBust(getPublicUrl(p.trim()), cacheBust),
        color,
      };
    } catch {
      return { imageUrl: '', color };
    }
  });
}

/** 훈련 런타임: Storage에 실제 업로드된 슬롯만 포함 */
export function fruitSlidesForTrainingFromPaths(
  paths: (string | null)[] | undefined | null,
  cacheBust?: number
): FruitSlide[] {
  const list = normalizeSpomoveVariantFruitPaths(paths);
  const out: FruitSlide[] = [];
  for (let i = 0; i < list.length; i++) {
    const p = list[i];
    if (p == null || typeof p !== 'string' || !p.trim()) continue;
    try {
      out.push({
        imageUrl: withPublicUrlCacheBust(getPublicUrl(p.trim()), cacheBust),
        color:
          COLORS.find((c) => c.id === SPOMOVE_VARIANT_SLOT_COLOR_IDS[i]) ?? COLORS[0]!,
      });
    } catch {
      /* skip broken path */
    }
  }
  return out;
}

export function variantFruitUrlsForPreload(slides: FruitSlide[]): string[] {
  return slides.map((s) => s.imageUrl).filter(Boolean);
}
