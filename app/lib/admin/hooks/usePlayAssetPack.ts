'use client';

import { useCallback, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getSupabaseBrowserClient } from '@/app/lib/supabase/browser';
import { uploadToStorage, getPublicUrl, deleteFromStorage } from '@/app/lib/admin/assets/storageClient';
import { optimizeToWebP } from '@/app/lib/admin/assets/imageOptimizer';
import {
  generateWeekKey,
  playAssetPath,
  playAssetBgmPath,
  PLAY_SLOT_KEYS,
  type PlaySlotKey,
} from '@/app/lib/admin/assets/storagePaths';

export type PlayAssetPackState = {
  bgmPath: string | null;
  images: Record<PlaySlotKey, string | null>;
};

function emptyImages(): Record<PlaySlotKey, string | null> {
  const out = {} as Record<PlaySlotKey, string | null>;
  for (const k of PLAY_SLOT_KEYS) out[k] = null;
  return out;
}

function emptyState(): PlayAssetPackState {
  return { bgmPath: null, images: emptyImages() };
}

function isTableNotFoundError(msg: string): boolean {
  return (
    /schema cache/i.test(msg) ||
    /does not exist/i.test(msg) ||
    /could not find.*table/i.test(msg)
  );
}

export function usePlayAssetPack(year: number, month: number, week: number) {
  const queryClient = useQueryClient();
  const weekKey = generateWeekKey(year, month, week);

  const [localState, setLocalState] = useState<PlayAssetPackState | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);

  const { data: state, isLoading: loading, error: queryError } = useQuery({
    queryKey: ['play_asset_pack', weekKey],
    queryFn: async (): Promise<PlayAssetPackState> => {
      if (typeof window === 'undefined') return emptyState();
      const supabase = getSupabaseBrowserClient();
      try {
        const { data, error: e } = await supabase
          .from('play_asset_packs')
          .select('bgm_path, images_json')
          .eq('week_key', weekKey)
          .maybeSingle();

        if (e) {
          if (isTableNotFoundError(e.message)) {
            throw new Error('TABLE_NOT_FOUND:play_asset_packs');
          }
          throw new Error(e.message);
        }

        const images = emptyImages();
        const raw = (data?.images_json as Record<string, string> | null) ?? {};
        for (const k of PLAY_SLOT_KEYS) {
          images[k] = typeof raw[k] === 'string' ? raw[k] : null;
        }
        // 이전 10키 데이터 호환: a1_off/a1_on → set1/set2에 동일하게 채움
        const oldKeys = ['a1_off', 'a1_on', 'a2_off', 'a2_on', 'a3_off', 'a3_on', 'a4_off', 'a4_on', 'a5_off', 'a5_on'] as const;
        for (let i = 0; i < 5; i++) {
          const offPath = raw[oldKeys[i * 2]];
          const onPath = raw[oldKeys[i * 2 + 1]];
          if (typeof offPath !== 'string' || typeof onPath !== 'string') continue;
          const base = i * 4;
          if (!images[PLAY_SLOT_KEYS[base]]) images[PLAY_SLOT_KEYS[base] as PlaySlotKey] = offPath;
          if (!images[PLAY_SLOT_KEYS[base + 1]]) images[PLAY_SLOT_KEYS[base + 1] as PlaySlotKey] = onPath;
          if (!images[PLAY_SLOT_KEYS[base + 2]]) images[PLAY_SLOT_KEYS[base + 2] as PlaySlotKey] = offPath;
          if (!images[PLAY_SLOT_KEYS[base + 3]]) images[PLAY_SLOT_KEYS[base + 3] as PlaySlotKey] = onPath;
        }
        return {
          bgmPath: data?.bgm_path ?? null,
          images,
        };
      } catch (err) {
        const msg = (err as Error).message;
        if (msg === 'TABLE_NOT_FOUND:play_asset_packs' || isTableNotFoundError(msg)) {
          throw new Error('TABLE_NOT_FOUND:play_asset_packs');
        }
        throw err;
      }
    },
    placeholderData: () => emptyState(),
    staleTime: 30 * 1000,
  });

  const rawState = localState ?? state;
  const resolvedState = rawState ?? emptyState();
  const error = queryError ? (queryError as Error).message : null;
  const tableMissing =
    error != null &&
    (error === 'TABLE_NOT_FOUND:play_asset_packs' || isTableNotFoundError(error));

  const save = useCallback(
    async (next: Partial<PlayAssetPackState>) => {
      const nextState = {
        bgmPath: next.bgmPath !== undefined ? next.bgmPath : resolvedState.bgmPath,
        images: next.images ?? resolvedState.images,
      };
      const imagesJson: Record<string, string> = {};
      for (const k of PLAY_SLOT_KEYS) {
        const v = nextState.images[k];
        if (v) imagesJson[k] = v;
      }
      try {
        const supabase = getSupabaseBrowserClient();
        const { error: upsertError } = await supabase.from('play_asset_packs').upsert(
          {
            week_key: weekKey,
            year,
            month,
            week,
            bgm_path: nextState.bgmPath,
            images_json: imagesJson,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'week_key' }
        );
        if (upsertError) {
          setSaveError(upsertError.message);
          setLastSavedAt(null);
          throw new Error(upsertError.message);
        }
        setSaveError(null);
        setLastSavedAt(Date.now());
        await queryClient.refetchQueries({ queryKey: ['play_asset_pack', weekKey] });
        setLocalState(null);
      } catch (err) {
        const msg = (err as Error).message;
        setSaveError(msg);
        setLastSavedAt(null);
        throw err;
      }
    },
    [weekKey, year, month, week, resolvedState, queryClient]
  );

  const uploadImage = useCallback(
    async (slotKey: PlaySlotKey, file: File): Promise<void> => {
      const webp = await optimizeToWebP(file);
      const path = playAssetPath(weekKey, slotKey, 'webp');
      await uploadToStorage(path, webp, 'image/webp');
      const latest = queryClient.getQueryData<PlayAssetPackState>(['play_asset_pack', weekKey]);
      const baseImages = latest?.images ?? resolvedState.images;
      const next = { ...baseImages, [slotKey]: path };
      await save({ images: next });
    },
    [weekKey, resolvedState.images, save, queryClient]
  );

  const removeImage = useCallback(
    async (slotKey: PlaySlotKey): Promise<void> => {
      const latest = queryClient.getQueryData<PlayAssetPackState>(['play_asset_pack', weekKey]);
      const currentImages = latest?.images ?? resolvedState.images;
      const path = currentImages[slotKey];
      if (!path) return;
      try {
        await deleteFromStorage(path);
      } catch {
        /* ignore */
      }
      const next = { ...currentImages, [slotKey]: null };
      await save({ images: next });
    },
    [weekKey, resolvedState.images, save, queryClient]
  );

  const uploadBgm = useCallback(
    async (file: File): Promise<void> => {
      const slug = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = playAssetBgmPath(weekKey, slug);
      await uploadToStorage(path, file, file.type || 'audio/mpeg');
      await save({ bgmPath: path });
    },
    [weekKey, save]
  );

  const removeBgm = useCallback(async (): Promise<void> => {
    const path = resolvedState.bgmPath;
    if (!path) return;
    try {
      await deleteFromStorage(path);
    } catch {
      /* ignore */
    }
    await save({ bgmPath: null });
  }, [resolvedState.bgmPath, save]);

  const getImageUrl = useCallback(
    (path: string | null) => {
      if (!path) return '';
      const url = getPublicUrl(path);
      return lastSavedAt != null ? `${url}${url.includes('?') ? '&' : '?'}v=${lastSavedAt}` : url;
    },
    [lastSavedAt]
  );

  const getBgmUrl = useCallback((path: string | null) => {
    if (!path) return '';
    return getPublicUrl(path);
  }, []);

  const resetPack = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    for (const path of Object.values(resolvedState.images)) {
      if (path) {
        try {
          await deleteFromStorage(path);
        } catch {
          /* ignore */
        }
      }
    }
    if (resolvedState.bgmPath) {
      try {
        await deleteFromStorage(resolvedState.bgmPath);
      } catch {
        /* ignore */
      }
    }
    await supabase.from('play_asset_packs').upsert(
      {
        week_key: weekKey,
        year,
        month,
        week,
        bgm_path: null,
        images_json: {},
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'week_key' }
    );
    setLocalState(null);
    setSaveError(null);
    setLastSavedAt(null);
    await queryClient.invalidateQueries({ queryKey: ['play_asset_pack', weekKey] });
  }, [weekKey, year, month, week, resolvedState.images, resolvedState.bgmPath, queryClient]);

  return {
    state: resolvedState,
    loading,
    error: tableMissing ? null : error,
    tableMissing,
    weekKey,
    saveError,
    lastSavedAt,
    load: () => queryClient.invalidateQueries({ queryKey: ['play_asset_pack', weekKey] }),
    uploadImage,
    removeImage,
    uploadBgm,
    removeBgm,
    getImageUrl,
    getBgmUrl,
    resetPack,
  };
}
