'use client';

/**
 * SPOMOVE 훈련 전역 BGM 풀 — Asset Hub 「BGM」 탭에서만 관리.
 * 훈련 시작 시 이 목록 중 하나를 무작위로 재생합니다 (think_asset_packs · spomove_training_bgm_settings).
 */

import { useCallback, useEffect, useState } from 'react';
import { getSupabaseBrowserClient } from '@/app/lib/supabase/browser';
import { uploadToStorage, deleteFromStorage } from '@/app/lib/admin/assets/storageClient';
import { spomoveTrainingBgmPath } from '@/app/lib/admin/assets/storagePaths';

export const SPOMOVE_TRAINING_BGM_PACK_ID = 'spomove_training_bgm_settings';

export type SpomoveTrainingBgmAssetsJson = {
  bgmList?: string[];
};

export function useSpomoveTrainingBGM() {
  const [list, setList] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = getSupabaseBrowserClient();
      const { data, error: e } = await supabase
        .from('think_asset_packs')
        .select('assets_json')
        .eq('id', SPOMOVE_TRAINING_BGM_PACK_ID)
        .single();

      if (e && e.code !== 'PGRST116') {
        setError(e.message);
        return;
      }

      const raw = data?.assets_json as SpomoveTrainingBgmAssetsJson | null;
      setList(Array.isArray(raw?.bgmList) ? raw.bgmList : []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = useCallback(async (nextList: string[]) => {
    setError(null);
    try {
      const supabase = getSupabaseBrowserClient();
      await supabase.from('think_asset_packs').upsert(
        {
          id: SPOMOVE_TRAINING_BGM_PACK_ID,
          name: 'SPOMOVE 훈련 BGM 풀',
          theme: 'iiwarmup',
          assets_json: { bgmList: nextList } satisfies SpomoveTrainingBgmAssetsJson,
        },
        { onConflict: 'id' }
      );
      setList(nextList);
    } catch (err) {
      setError((err as Error).message);
      throw err;
    }
  }, []);

  const upload = useCallback(
    async (file: File): Promise<void> => {
      const slug = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = spomoveTrainingBgmPath(slug);
      await uploadToStorage(path, file, file.type || 'audio/mpeg');
      const nextList = list.includes(path) ? list : [...list, path];
      await save(nextList);
    },
    [list, save]
  );

  const remove = useCallback(
    async (path: string): Promise<void> => {
      try {
        await deleteFromStorage(path);
      } catch {
        /* ignore */
      }
      const nextList = list.filter((p) => p !== path);
      await save(nextList);
    },
    [list, save]
  );

  return { list, loading, error, load, upload, remove };
}
