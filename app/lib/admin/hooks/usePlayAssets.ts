/**
 * Play 에셋: Action 이미지 업로드/삭제 및 play_scenarios 업데이트
 * 슬롯 고정 경로 + 덮어쓰기(upsert). WebP 강제.
 */

'use client';

import { useCallback, useState } from 'react';
import { getSupabaseBrowserClient } from '@/app/lib/supabase/browser';
import { useQueryClient } from '@tanstack/react-query';
import { ACTION_KEYS, type ActionKey } from '@/app/lib/admin/constants/physics';
import type { Slot } from '@/app/lib/admin/assets/imageOptimizer';
import { optimizeToWebP } from '@/app/lib/admin/assets/imageOptimizer';
import { actionImagePath } from '@/app/lib/admin/assets/storagePaths';
import { uploadToStorage, getPublicUrl, deleteFromStorage } from '@/app/lib/admin/assets/storageClient';

const supabase = getSupabaseBrowserClient();

export type PlayAssetsState = {
  actions: Record<string, Partial<Record<Slot | 'off' | 'on', string>>>;
  backgrounds?: Record<string, string>;
  bgm?: string;
};

function emptyActions(): Record<string, Partial<Record<Slot | 'off' | 'on', string>>> {
  const actions: Record<string, Partial<Record<Slot | 'off' | 'on', string>>> = {};
  for (const key of ACTION_KEYS as readonly ActionKey[]) {
    actions[key] = { off: '', on: '', off1: '', off2: '', on1: '', on2: '' };
  }
  return actions;
}

export function usePlayAssets(themeId: string | null) {
  const queryClient = useQueryClient();
  const [assets, setAssets] = useState<PlayAssetsState>({ actions: emptyActions() });
  const [loading, setLoading] = useState(false);

  const loadAssetPack = useCallback(async () => {
    if (!themeId) {
      setAssets({ actions: emptyActions() });
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('play_scenarios')
        .select('scenario_json')
        .eq('id', themeId)
        .eq('type', 'asset_pack')
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Asset Pack 로드 실패:', error);
        setAssets({ actions: emptyActions() });
        return;
      }

      if (data?.scenario_json?.assets) {
        const actions = data.scenario_json.assets.actions || {};
        const normalized: Record<string, Partial<Record<Slot | 'off' | 'on', string>>> = {};
        for (const key of ACTION_KEYS as readonly ActionKey[]) {
          const slots = actions[key] || {};
          normalized[key] = {
            off: slots.off ?? '',
            on: slots.on ?? '',
            off1: slots.off1 ?? '',
            off2: slots.off2 ?? '',
            on1: slots.on1 ?? '',
            on2: slots.on2 ?? '',
          };
        }
        setAssets({
          actions: normalized,
          backgrounds: data.scenario_json.assets.backgrounds,
          bgm: data.scenario_json.assets.bgm,
        });
      } else {
        setAssets({ actions: emptyActions() });
      }
    } finally {
      setLoading(false);
    }
  }, [themeId]);

  const saveAssetPack = useCallback(
    async (nextAssets: PlayAssetsState) => {
      if (!themeId) return;
      const { data: row } = await supabase
        .from('play_scenarios')
        .select('scenario_json')
        .eq('id', themeId)
        .eq('type', 'asset_pack')
        .single();

      const theme = (row?.scenario_json as { theme?: string })?.theme ?? themeId.split('_')[0] ?? 'theme';
      const scenarioJson = {
        theme,
        assets: nextAssets,
      };
      const { error } = await supabase
        .from('play_scenarios')
        .upsert({
          id: themeId,
          name: `${theme} 테마 Asset Pack`,
          theme,
          type: 'asset_pack',
          duration: 120,
          scenario_json: scenarioJson,
          is_active: true,
        });
      if (error) throw error;
      setAssets(nextAssets);
      queryClient.invalidateQueries({ queryKey: ['asset_pack', themeId] });
    },
    [themeId, queryClient]
  );

  const uploadPlayAsset = useCallback(
    async (
      actionKey: ActionKey,
      slot: Slot | 'off' | 'on',
      file: File
    ): Promise<void> => {
      if (!themeId) throw new Error('themeId가 필요합니다.');
      const webpFile = await optimizeToWebP(file);
      const path = actionImagePath(themeId, actionKey, slot);
      await uploadToStorage(path, webpFile, 'image/webp');

      const next: PlayAssetsState = {
        ...assets,
        actions: {
          ...assets.actions,
          [actionKey]: {
            ...(assets.actions[actionKey] || {}),
            [slot]: path,
          },
        },
      };
      setAssets(next);
      await saveAssetPack(next);
      queryClient.invalidateQueries({ queryKey: ['asset_pack', themeId] });
    },
    [themeId, assets, saveAssetPack, queryClient]
  );

  const deletePlayAsset = useCallback(
    async (actionKey: ActionKey, slot: Slot | 'off' | 'on'): Promise<void> => {
      if (!themeId) return;
      const path = assets.actions[actionKey]?.[slot];
      if (!path) return;

      await deleteFromStorage(path);

      const next: PlayAssetsState = {
        ...assets,
        actions: {
          ...assets.actions,
          [actionKey]: {
            ...(assets.actions[actionKey] || {}),
            [slot]: '',
          },
        },
      };
      setAssets(next);
      await saveAssetPack(next);
      queryClient.invalidateQueries({ queryKey: ['asset_pack', themeId] });
    },
    [themeId, assets, saveAssetPack, queryClient]
  );

  const getImageUrl = useCallback((path: string) => {
    if (!path) return '';
    return getPublicUrl(path);
  }, []);

  return {
    assets,
    loading,
    loadAssetPack,
    uploadPlayAsset,
    deletePlayAsset,
    saveAssetPack,
    getImageUrl,
  };
}
