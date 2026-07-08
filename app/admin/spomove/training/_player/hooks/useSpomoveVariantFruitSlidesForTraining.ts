'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { getSupabaseBrowserClient } from '@/app/lib/supabase/browser';
import { getPublicUrl, withPublicUrlCacheBust } from '@/app/lib/admin/assets/storageClient';
import { resolveSpomovePackCacheBust } from '@/app/lib/spomove/spomoveAssetCacheVersion';
import {
  fruitSlidesForTrainingFromPaths,
  SPOMOVE_VARIANT_PACK_ID,
  type SpomoveVariantAssetsJson,
} from '../lib/variantFruitAssets';
import { buildVariantSlidesFromThemedUrls, uniqueSlidesByImageUrl, type FruitSlide } from '../lib/signals';
import {
  SPOMOVE_THEMED_PACK_BY_THEME,
  SPOMOVE_THEMED_SLOT_COUNT,
  type SpomoveColorThemeId,
} from '../lib/spomoveVariantThemeConfig';
import { type AssetLoadStatus } from '../lib/assetRequirement';

export type { AssetLoadStatus };

/**
 * @deprecated evaluateAssetReadiness({ mode, level, theme, ... }) 를 사용할 것.
 * 테마만으로 최소 슬라이드 수를 판단하는 이 함수는 level 별 distinct image/color 조건을 반영하지 않는다.
 */
export function getMinSlidesRequired(theme: SpomoveColorThemeId): number {
  return theme === 'color' ? 0 : 1;
}

function normalizeThemedPaths(raw: unknown, slotCount: number): (string | null)[] {
  const p = (raw as { paths?: unknown } | null)?.paths;
  if (!Array.isArray(p)) return Array.from({ length: slotCount }, () => null);
  const sliced: (unknown | null)[] = p.slice(0, slotCount);
  while (sliced.length < slotCount) sliced.push(null);
  return sliced.map((x) => (typeof x === 'string' && x.trim() ? x.trim() : null));
}

/**
 * SPOMOVE 트레이닝: 업로드된 이미지 슬롯만 반영(비어 있을 때 신호 생성 시 색/폴백).
 * - status: 로딩 상태 (AssetLoadStatus)
 * - reqIdRef: stale Supabase 응답 차단 (테마 변경 직후 이전 응답이 덮어쓰기 방지)
 */
export function useSpomoveVariantSlidesForTraining(variantColorTheme: SpomoveColorThemeId) {
  const [slides, setSlides] = useState<FruitSlide[]>([]);
  const [status, setStatus] = useState<AssetLoadStatus>('idle');
  const [loadedTheme, setLoadedTheme] = useState<SpomoveColorThemeId | null>(null);
  const reqIdRef = useRef(0);

  const reload = useCallback(async () => {
    const thisId = ++reqIdRef.current;
    setSlides([]);
    setLoadedTheme(null);
    setStatus('loading');

    try {
      if (variantColorTheme === 'color') {
        if (reqIdRef.current !== thisId) return;
        setSlides([]);
        setLoadedTheme(variantColorTheme);
        setStatus('ready');
        return;
      }

      if (variantColorTheme === 'fruit') {
        const supabase = getSupabaseBrowserClient();
        const { data } = await supabase
          .from('think_asset_packs')
          .select('assets_json, updated_at')
          .eq('id', SPOMOVE_VARIANT_PACK_ID)
          .maybeSingle();
        if (reqIdRef.current !== thisId) return;
        const raw = data?.assets_json as SpomoveVariantAssetsJson | null;
        const paths = raw?.paths;
        const cacheBust = resolveSpomovePackCacheBust(
          data?.updated_at as string | undefined,
          Array.isArray(paths) ? paths : [],
        );
        const built = fruitSlidesForTrainingFromPaths(raw?.paths, cacheBust);
        setSlides(built);
        setLoadedTheme(variantColorTheme);
        setStatus('ready');
        return;
      }

      const def = SPOMOVE_THEMED_PACK_BY_THEME[variantColorTheme];
      const supabase = getSupabaseBrowserClient();
      const { data } = await supabase
        .from('think_asset_packs')
        .select('assets_json, updated_at')
        .eq('id', def.packId)
        .maybeSingle();
      if (reqIdRef.current !== thisId) return;
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
      setLoadedTheme(variantColorTheme);
      setStatus('ready');
    } catch {
      if (reqIdRef.current !== thisId) return;
      setSlides([]);
      setLoadedTheme(variantColorTheme);
      setStatus('error');
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

  return { slides, status, reload, loadedTheme };
}

const ALL_VARIANT_PACK_IDS = [
  SPOMOVE_VARIANT_PACK_ID,
  ...Object.values(SPOMOVE_THEMED_PACK_BY_THEME).map((def) => def.packId),
] as const;

function slidesFromPackRow(
  packId: string,
  assetsJson: unknown,
  updatedAt: string | undefined,
): FruitSlide[] {
  if (packId === SPOMOVE_VARIANT_PACK_ID) {
    const raw = assetsJson as SpomoveVariantAssetsJson | null;
    const paths = raw?.paths;
    const cacheBust = resolveSpomovePackCacheBust(
      updatedAt,
      Array.isArray(paths) ? paths : [],
    );
    return fruitSlidesForTrainingFromPaths(raw?.paths, cacheBust);
  }

  const paths = normalizeThemedPaths(assetsJson, SPOMOVE_THEMED_SLOT_COUNT);
  const cacheBust = resolveSpomovePackCacheBust(updatedAt, paths);
  const urls = paths.map((p) => {
    if (p == null || !p.trim()) return '';
    try {
      return withPublicUrlCacheBust(getPublicUrl(p.trim()), cacheBust);
    } catch {
      return '';
    }
  });
  return buildVariantSlidesFromThemedUrls(urls);
}

/**
 * 사이먼 3번(Mixed Gallery): 과일 + 탈것·감정·동물·자연물·음식 등 업로드된 전체 변형 색상 이미지를 한 풀로 합칩니다.
 */
export function useSpomoveAllVariantSlidesForTraining(enabled: boolean) {
  const [slides, setSlides] = useState<FruitSlide[]>([]);
  const [status, setStatus] = useState<AssetLoadStatus>('idle');
  const reqIdRef = useRef(0);

  const reload = useCallback(async () => {
    if (!enabled) {
      setSlides([]);
      setStatus('idle');
      return;
    }

    const thisId = ++reqIdRef.current;
    setStatus('loading');

    try {
      const supabase = getSupabaseBrowserClient();
      const { data } = await supabase
        .from('think_asset_packs')
        .select('id, assets_json, updated_at')
        .in('id', [...ALL_VARIANT_PACK_IDS]);
      if (reqIdRef.current !== thisId) return;

      const merged: FruitSlide[] = [];
      for (const packId of ALL_VARIANT_PACK_IDS) {
        const row = (data ?? []).find(
          (r: { id: string; assets_json: unknown; updated_at?: string | null }) => r.id === packId,
        );
        if (!row) continue;
        merged.push(
          ...slidesFromPackRow(
            packId,
            row.assets_json,
            row.updated_at as string | undefined,
          ),
        );
      }

      setSlides(uniqueSlidesByImageUrl(merged));
      setStatus('ready');
    } catch {
      if (reqIdRef.current !== thisId) return;
      setSlides([]);
      setStatus('error');
    }
  }, [enabled]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    if (!enabled) return;
    const onVis = () => {
      if (document.visibilityState === 'visible') void reload();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [enabled, reload]);

  return { slides, status, reload };
}
