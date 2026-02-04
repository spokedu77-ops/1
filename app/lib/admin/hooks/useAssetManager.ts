/**
 * 테마(asset_pack) 레벨 CRUD
 * 생성, 복제, Soft/Hard 삭제. 삭제 시 checkAssetDeletion 호출.
 */

'use client';

import { useCallback } from 'react';
import { getSupabaseClient } from '@/app/lib/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { ACTION_KEYS, type ActionKey } from '@/app/lib/admin/constants/physics';
import { generateThemeId, generateThinkPackId } from '@/app/lib/admin/assets/storagePaths';
import { checkAssetDeletion, AssetDeletionBlockedError } from '@/app/lib/admin/assets/checkAssetDeletion';
import { deleteFromStorageBatch, copyInStorage } from '@/app/lib/admin/assets/storageClient';

const supabase = getSupabaseClient();

export type Slot = 'off1' | 'off2' | 'on1' | 'on2';

export interface AssetPackScenarioJson {
  theme: string;
  assets: {
    actions: Record<string, Partial<Record<Slot | 'off' | 'on', string>>>;
    backgrounds?: Record<string, string>;
    bgm?: string;
  };
}

function collectPathsFromScenarioJson(scenarioJson: AssetPackScenarioJson): string[] {
  const paths: string[] = [];
  const { actions, backgrounds } = scenarioJson?.assets || {};
  if (actions) {
    for (const key of Object.keys(actions)) {
      const slots = actions[key];
      if (slots && typeof slots === 'object') {
        for (const v of Object.values(slots)) {
          if (typeof v === 'string' && v.trim()) paths.push(v);
        }
      }
    }
  }
  if (backgrounds && typeof backgrounds === 'object') {
    for (const v of Object.values(backgrounds)) {
      if (typeof v === 'string' && v.trim()) paths.push(v);
    }
  }
  return paths;
}

function replaceThemeIdInPath(path: string, oldThemeId: string, newThemeId: string): string {
  if (!path.startsWith('themes/')) return path;
  const rest = path.slice('themes/'.length);
  if (rest.startsWith(oldThemeId + '/')) {
    return `themes/${newThemeId}/${rest.slice(oldThemeId.length + 1)}`;
  }
  return path;
}

function replaceThemeIdInScenarioJson(
  scenarioJson: AssetPackScenarioJson,
  sourceThemeId: string,
  newThemeId: string
): AssetPackScenarioJson {
  const newActions: Record<string, Partial<Record<Slot | 'off' | 'on', string>>> = {};
  const actions = scenarioJson?.assets?.actions || {};
  for (const [key, slots] of Object.entries(actions)) {
    if (!slots || typeof slots !== 'object') continue;
    const newSlots: Partial<Record<Slot | 'off' | 'on', string>> = {};
    for (const [slot, path] of Object.entries(slots)) {
      if (typeof path === 'string' && path) {
        newSlots[slot as Slot] = replaceThemeIdInPath(path, sourceThemeId, newThemeId);
      }
    }
    newActions[key] = newSlots;
  }
  let newBackgrounds: Record<string, string> | undefined;
  if (scenarioJson?.assets?.backgrounds) {
    newBackgrounds = {};
    for (const [k, v] of Object.entries(scenarioJson.assets.backgrounds)) {
      if (typeof v === 'string' && v) {
        newBackgrounds[k] = replaceThemeIdInPath(v, sourceThemeId, newThemeId);
      }
    }
  }
  return {
    theme: scenarioJson.theme,
    assets: {
      ...scenarioJson.assets,
      actions: newActions,
      backgrounds: newBackgrounds,
    },
  };
}

const emptyActions = (): Record<string, Partial<Record<Slot | 'off' | 'on', string>>> => {
  const actions: Record<string, Partial<Record<Slot | 'off' | 'on', string>>> = {};
  for (const key of ACTION_KEYS as readonly ActionKey[]) {
    actions[key] = { off: '', on: '', off1: '', off2: '', on1: '', on2: '' };
  }
  return actions;
};

export function useAssetManager() {
  const queryClient = useQueryClient();

  const createTheme = useCallback(
    async (themeName: string, version: number): Promise<string> => {
      const themeId = generateThemeId(themeName, version);
      const scenarioJson: AssetPackScenarioJson = {
        theme: themeName,
        assets: { actions: emptyActions() },
      };
      const { error } = await supabase.from('play_scenarios').upsert({
        id: themeId,
        name: `${themeName} 테마 Asset Pack`,
        theme: themeName,
        type: 'asset_pack',
        duration: 120,
        scenario_json: scenarioJson,
        is_active: true,
      });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['asset_pack_list'] });
      queryClient.invalidateQueries({ queryKey: ['asset_pack', themeId] });
      return themeId;
    },
    [queryClient]
  );

  const cloneTheme = useCallback(
    async (
      sourceThemeId: string,
      newThemeName: string,
      newVersion: number
    ): Promise<string> => {
      const newThemeId = generateThemeId(newThemeName, newVersion);
      const { data: sourceRow, error: fetchError } = await supabase
        .from('play_scenarios')
        .select('scenario_json')
        .eq('id', sourceThemeId)
        .eq('type', 'asset_pack')
        .single();

      if (fetchError || !sourceRow?.scenario_json) {
        throw new Error(`원본 테마를 찾을 수 없습니다: ${sourceThemeId}`);
      }

      const scenarioJson = sourceRow.scenario_json as AssetPackScenarioJson;
      const paths = collectPathsFromScenarioJson(scenarioJson);

      for (const sourcePath of paths) {
        const destPath = replaceThemeIdInPath(sourcePath, sourceThemeId, newThemeId);
        try {
          await copyInStorage(sourcePath, destPath);
        } catch (err) {
          console.warn('Storage 복사 실패(무시하고 계속):', sourcePath, err);
        }
      }

      const newScenarioJson = replaceThemeIdInScenarioJson(
        scenarioJson,
        sourceThemeId,
        newThemeId
      );
      const { error: upsertError } = await supabase.from('play_scenarios').upsert({
        id: newThemeId,
        name: `${newThemeName} 테마 Asset Pack`,
        theme: newThemeName,
        type: 'asset_pack',
        duration: 120,
        scenario_json: newScenarioJson,
        is_active: true,
      });
      if (upsertError) throw upsertError;

      queryClient.invalidateQueries({ queryKey: ['asset_pack_list'] });
      queryClient.invalidateQueries({ queryKey: ['asset_pack', newThemeId] });
      return newThemeId;
    },
    [queryClient]
  );

  const softDeleteTheme = useCallback(
    async (themeId: string): Promise<void> => {
      const { error } = await supabase
        .from('play_scenarios')
        .update({ is_active: false })
        .eq('id', themeId)
        .eq('type', 'asset_pack');
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['asset_pack_list'] });
      queryClient.invalidateQueries({ queryKey: ['asset_pack', themeId] });
    },
    [queryClient]
  );

  const hardDeleteTheme = useCallback(
    async (themeId: string): Promise<void> => {
      await checkAssetDeletion(themeId);

      const { data: row, error: fetchError } = await supabase
        .from('play_scenarios')
        .select('scenario_json')
        .eq('id', themeId)
        .eq('type', 'asset_pack')
        .single();

      if (fetchError || !row?.scenario_json) {
        throw new Error(`테마를 찾을 수 없습니다: ${themeId}`);
      }

      const paths = collectPathsFromScenarioJson(row.scenario_json as AssetPackScenarioJson);
      if (paths.length > 0) {
        try {
          await deleteFromStorageBatch(paths);
        } catch (err) {
          console.error('Storage 삭제 실패:', err);
          throw new Error('Storage 삭제 실패. 재시도해 주세요.');
        }
      }

      const { error: deleteError } = await supabase
        .from('play_scenarios')
        .delete()
        .eq('id', themeId)
        .eq('type', 'asset_pack');
      if (deleteError) throw deleteError;

      const thinkPackId = generateThinkPackId(themeId);
      await supabase
        .from('play_scenarios')
        .delete()
        .eq('id', thinkPackId)
        .eq('type', 'think_asset_pack');

      queryClient.invalidateQueries({ queryKey: ['asset_pack_list'] });
      queryClient.invalidateQueries({ queryKey: ['asset_pack', themeId] });
    },
    [queryClient]
  );

  const listThemes = useCallback(async (): Promise<Array<{ id: string; name: string; theme: string }>> => {
    const { data, error } = await supabase
      .from('play_scenarios')
      .select('id, name, theme')
      .eq('type', 'asset_pack')
      .eq('is_active', true)
      .order('theme');
    if (error) throw error;
    return (data || []).map((r) => ({ id: r.id, name: r.name || r.id, theme: r.theme || '' }));
  }, []);

  return {
    createTheme,
    cloneTheme,
    softDeleteTheme,
    hardDeleteTheme,
    listThemes,
    AssetDeletionBlockedError,
  };
}
