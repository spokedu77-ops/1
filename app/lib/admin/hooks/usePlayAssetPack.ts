'use client';

import { useCallback, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getSupabaseClient } from '@/app/lib/supabase/client';
import { uploadToStorage, getPublicUrl, deleteFromStorage } from '@/app/lib/admin/assets/storageClient';
import { optimizeToWebP } from '@/app/lib/admin/assets/imageOptimizer';
import {
  generateWeekKey,
  playAssetPath,
  playAssetBgmPath,
  PLAY_SLOT_KEYS,
  type PlaySlotKey,
} from '@/app/lib/admin/assets/storagePaths';

const supabase = getSupabaseClient();

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

  const { data: state, isLoading: loading, error: queryError } = useQuery({
    queryKey: ['play_asset_pack', weekKey],
    queryFn: async (): Promise<PlayAssetPackState> => {
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
        await supabase.from('play_asset_packs').upsert(
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
        setLocalState(nextState);
        queryClient.setQueryData(['play_asset_pack', weekKey], nextState);
      } catch (err) {
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
      const next = { ...resolvedState.images, [slotKey]: path };
      await save({ images: next });
    },
    [weekKey, resolvedState.images, save]
  );

  const removeImage = useCallback(
    async (slotKey: PlaySlotKey): Promise<void> => {
      const path = resolvedState.images[slotKey];
      if (!path) return;
      try {
        await deleteFromStorage(path);
      } catch {
        /* ignore */
      }
      const next = { ...resolvedState.images, [slotKey]: null };
      await save({ images: next });
    },
    [resolvedState.images, save]
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

  const getImageUrl = useCallback((path: string | null) => {
    if (!path) return '';
    return getPublicUrl(path);
  }, []);

  const getBgmUrl = useCallback((path: string | null) => {
    if (!path) return '';
    return getPublicUrl(path);
  }, []);

  return {
    state: resolvedState,
    loading,
    error: tableMissing ? null : error,
    tableMissing,
    load: () => queryClient.invalidateQueries({ queryKey: ['play_asset_pack', weekKey] }),
    uploadImage,
    removeImage,
    uploadBgm,
    removeBgm,
    getImageUrl,
    getBgmUrl,
  };
}
