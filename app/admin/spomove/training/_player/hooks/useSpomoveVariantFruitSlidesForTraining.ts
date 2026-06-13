'use client';

import { useCallback, useEffect, useState } from 'react';
import { getSupabaseBrowserClient } from '@/app/lib/supabase/browser';
import { getPublicUrl, withPublicUrlCacheBust } from '@/app/lib/admin/assets/storageClient';
import { resolveSpomovePackCacheBust } from '@/app/lib/spomove/spomoveAssetCacheVersion';
import {
  fruitSlidesForTrainingFromPaths,
  SPOMOVE_VARIANT_PACK_ID,
  type SpomoveVariantAssetsJson,
} from '../lib/variantFruitAssets';
import { buildVariantSlidesFromThemedUrls, type FruitSlide } from '../lib/signals';
import {
  SPOMOVE_THEMED_PACK_BY_THEME,
  SPOMOVE_THEMED_SLOT_COUNT,
  type SpomoveColorThemeId,
} from '../lib/spomoveVariantThemeConfig';

function normalizeThemedPaths(raw: unknown, slotCount: number): (string | null)[] {
  const p = (raw as { paths?: unknown } | null)?.paths;
  if (!Array.isArray(p)) return Array.from({ length: slotCount }, () => null);
  const sliced: (unknown | null)[] = p.slice(0, slotCount);
  while (sliced.length < slotCount) sliced.push(null);
  return sliced.map((x) => (typeof x === 'string' && x.trim() ? x.trim() : null));
}

/** SPOMOVE 트레이닝: 업로드된 이미지 슬롯만 반영(비어 있을 때만 신호 생성 시 색/폴백) */
export function useSpomoveVariantSlidesForTraining(variantColorTheme: SpomoveColorThemeId) {
  const [slides, setSlides] = useState<FruitSlide[]>([]);

  const reload = useCallback(async () => {
    try {
      if (variantColorTheme === 'color') {
        // "색상" 테마: 이미지 없이 색 신호만 사용
        setSlides([]);
        return;
      }
      if (variantColorTheme === 'fruit') {
        const supabase = getSupabaseBrowserClient();
        const { data } = await supabase
          .from('think_asset_packs')
          .select('assets_json, updated_at')
          .eq('id', SPOMOVE_VARIANT_PACK_ID)
          .maybeSingle();
        const raw = data?.assets_json as SpomoveVariantAssetsJson | null;
        const paths = raw?.paths;
        const cacheBust = resolveSpomovePackCacheBust(
          data?.updated_at as string | undefined,
          Array.isArray(paths) ? paths : [],
        );
        setSlides(fruitSlidesForTrainingFromPaths(raw?.paths, cacheBust));
        return;
      }

      const def = SPOMOVE_THEMED_PACK_BY_THEME[variantColorTheme];
      const supabase = getSupabaseBrowserClient();
      const { data } = await supabase
        .from('think_asset_packs')
        .select('assets_json, updated_at')
        .eq('id', def.packId)
        .maybeSingle();
      const paths = normalizeThemedPaths(data?.assets_json, SPOMOVE_THEMED_SLOT_COUNT);
      const cacheBust = resolveSpomovePackCacheBust(data?.updated_at as string | undefined, paths);
      const urls = paths.map((p) => {
        if (p == null || !p.trim()) return '';
        try {
          return withPublicUrlCacheBust(getPublicUrl(p.trim()), cacheBust);
        } catch {
          return '';
        }
      });
      const built = buildVariantSlidesFromThemedUrls(urls);
      setSlides(built.length > 0 ? built : []);
    } catch {
      setSlides([]);
    }
  }, [variantColorTheme]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'visible') void reload();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [reload]);

  return { slides, reload };
}
