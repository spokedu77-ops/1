/**
 * Think 에셋: 오브젝트 업로드/삭제, think_asset_pack upsert
 * ID 규칙: thinkPackId = generateThinkPackId(themeId). 경로 유니크 + 중복 스킵(해시 기반).
 */

'use client';

import { useCallback, useState } from 'react';
import { getSupabaseBrowserClient } from '@/app/lib/supabase/browser';
import { useQueryClient } from '@tanstack/react-query';
import { calculateFileHash } from '@/app/lib/admin/assets/imageOptimizer';
import { optimizeToWebP } from '@/app/lib/admin/assets/imageOptimizer';
import { generateThinkPackId, thinkObjectPath } from '@/app/lib/admin/assets/storagePaths';
import { uploadToStorage, getPublicUrl, deleteFromStorage } from '@/app/lib/admin/assets/storageClient';

const supabase = getSupabaseBrowserClient();

export type ThinkColor = 'red' | 'blue' | 'yellow' | 'green';

export type ThinkObjectsState = {
  red: string[];
  blue: string[];
  yellow: string[];
  green: string[];
};

const COLORS: ThinkColor[] = ['red', 'blue', 'yellow', 'green'];

function sanitizeSlug(name: string): string {
  return name
    .replace(/\.[^/.]+$/, '')
    .replace(/[^a-zA-Z0-9-_]/g, '_')
    .slice(0, 64) || 'image';
}

export function useThinkAssets(playThemeId: string | null) {
  const queryClient = useQueryClient();
  const [objects, setObjects] = useState<ThinkObjectsState>({
    red: [],
    blue: [],
    yellow: [],
    green: [],
  });
  const [loading, setLoading] = useState(false);

  const loadThinkPack = useCallback(async () => {
    if (!playThemeId) {
      setObjects({ red: [], blue: [], yellow: [], green: [] });
      return;
    }
    setLoading(true);
    try {
      const thinkPackId = generateThinkPackId(playThemeId);
      const { data, error } = await supabase
        .from('play_scenarios')
        .select('scenario_json')
        .eq('id', thinkPackId)
        .eq('type', 'think_asset_pack')
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Think Pack 로드 실패:', error);
        setObjects({ red: [], blue: [], yellow: [], green: [] });
        return;
      }

      const raw = data?.scenario_json?.assets?.think?.objects;
      if (raw && typeof raw === 'object') {
        setObjects({
          red: Array.isArray(raw.red) ? raw.red : [],
          blue: Array.isArray(raw.blue) ? raw.blue : [],
          yellow: Array.isArray(raw.yellow) ? raw.yellow : [],
          green: Array.isArray(raw.green) ? raw.green : [],
        });
      } else {
        setObjects({ red: [], blue: [], yellow: [], green: [] });
      }
    } finally {
      setLoading(false);
    }
  }, [playThemeId]);

  const saveThinkPack = useCallback(
    async (nextObjects: ThinkObjectsState) => {
      if (!playThemeId) return;
      const thinkPackId = generateThinkPackId(playThemeId);
      const scenarioJson = {
        name: `${playThemeId} Think Pack`,
        theme_ref: playThemeId,
        assets: {
          think: { objects: nextObjects },
        },
      };
      const { error } = await supabase.from('play_scenarios').upsert({
        id: thinkPackId,
        name: scenarioJson.name,
        type: 'think_asset_pack',
        scenario_json: scenarioJson,
        is_active: true,
      });
      if (error) throw error;
      setObjects(nextObjects);
      queryClient.invalidateQueries({ queryKey: ['think_pack', thinkPackId] });
    },
    [playThemeId, queryClient]
  );

  const uploadThinkObjects = useCallback(
    async (color: ThinkColor, files: File[]): Promise<void> => {
      if (!playThemeId) throw new Error('playThemeId가 필요합니다.');
      const thinkPackId = generateThinkPackId(playThemeId);
      const currentPaths = objects[color] || [];
      const pathSet = new Set(currentPaths);
      const added: string[] = [];

      for (const file of files) {
        const hash = await calculateFileHash(file);
        const slug = sanitizeSlug(file.name);
        const path = thinkObjectPath(thinkPackId, color, `${slug}_${hash}`);
        if (pathSet.has(path)) continue;

        const webpFile = await optimizeToWebP(file);
        await uploadToStorage(path, webpFile, 'image/webp');
        pathSet.add(path);
        added.push(path);
      }

      if (added.length === 0) return;

      const nextPaths = [...currentPaths, ...added];
      const next: ThinkObjectsState = {
        ...objects,
        [color]: nextPaths,
      };
      setObjects(next);
      await saveThinkPack(next);
    },
    [playThemeId, objects, saveThinkPack]
  );

  const deleteThinkObject = useCallback(
    async (color: ThinkColor, path: string): Promise<void> => {
      if (!playThemeId) return;
      await deleteFromStorage(path);
      const nextPaths = (objects[color] || []).filter((p) => p !== path);
      const next: ThinkObjectsState = {
        ...objects,
        [color]: nextPaths,
      };
      setObjects(next);
      await saveThinkPack(next);
    },
    [playThemeId, objects, saveThinkPack]
  );

  const getImageUrl = useCallback((path: string) => {
    if (!path) return '';
    return getPublicUrl(path);
  }, []);

  return {
    objects,
    loading,
    loadThinkPack,
    uploadThinkObjects,
    deleteThinkObject,
    getImageUrl,
  };
}
