'use client';

import { useCallback, useEffect, useState } from 'react';
import { getSupabaseBrowserClient } from '@/app/lib/supabase/browser';
import { getPublicUrl } from '@/app/lib/admin/assets/storageClient';
import {
  mergeSpomoveVariantPaths,
  SPOMOVE_VARIANT_PACK_ID,
  type SpomoveVariantAssetsJson,
} from '../lib/variantFruitAssets';
import {
  buildVariantSlidesFromThemedUrls,
  DEFAULT_FRUIT_SLIDES,
  type FruitSlide,
} from '../lib/signals';
import {
  SPOMOVE_THEMED_PACK_BY_THEME,
  type SpomoveColorThemeId,
} from '../lib/spomoveVariantThemeConfig';

function normalizeThemedPaths(raw: unknown, slotCount: number): (string | null)[] {
  const p = (raw as { paths?: unknown } | null)?.paths;
  if (!Array.isArray(p) || p.length !== slotCount) {
    return Array.from({ length: slotCount }, () => null);
  }
  return p.map((x) => (typeof x === 'string' && x.trim() ? x.trim() : null));
}

/** SPOMOVE 트레이닝: 선택 테마의 think_asset_packs → FruitSlide[] (이미지 2개 미만이면 과일 기본) */
export function useSpomoveVariantSlidesForTraining(variantColorTheme: SpomoveColorThemeId) {
  const [slides, setSlides] = useState<FruitSlide[]>(DEFAULT_FRUIT_SLIDES);

  const reload = useCallback(async () => {
    try {
      if (variantColorTheme === 'fruit') {
        const supabase = getSupabaseBrowserClient();
        const { data } = await supabase.from('think_asset_packs').select('assets_json').eq('id', SPOMOVE_VARIANT_PACK_ID).maybeSingle();
        const raw = data?.assets_json as SpomoveVariantAssetsJson | null;
        setSlides(mergeSpomoveVariantPaths(raw?.paths));
        return;
      }

      const def = SPOMOVE_THEMED_PACK_BY_THEME[variantColorTheme];
      const supabase = getSupabaseBrowserClient();
      const { data } = await supabase.from('think_asset_packs').select('assets_json').eq('id', def.packId).maybeSingle();
      const paths = normalizeThemedPaths(data?.assets_json, 4);
      const urls = paths.map((p) => {
        if (p == null || !p.trim()) return '';
        try {
          return getPublicUrl(p.trim());
        } catch {
          return '';
        }
      });
      const built = buildVariantSlidesFromThemedUrls(urls);
      setSlides(built.length >= 2 ? built : DEFAULT_FRUIT_SLIDES);
    } catch {
      setSlides(DEFAULT_FRUIT_SLIDES);
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
