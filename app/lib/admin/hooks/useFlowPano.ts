'use client';

/**
 * Flow Phase Equirect 배경 (2:1 파노라마) - 업로드 목록 및 선택
 */

import { useCallback, useEffect, useState } from 'react';
import { getSupabaseBrowserClient } from '@/app/lib/supabase/browser';
import { uploadToStorage, deleteFromStorage } from '@/app/lib/admin/assets/storageClient';
import { flowPanoPath } from '@/app/lib/admin/assets/storagePaths';

const PANO_SETTINGS_ID = 'iiwarmup_flow_pano_settings';

export function useFlowPano() {
  const [list, setList] = useState<string[]>([]);
  const [selected, setSelected] = useState<string>('');
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
        .eq('id', PANO_SETTINGS_ID)
        .single();

      if (e && e.code !== 'PGRST116') {
        setError(e.message);
        return;
      }

      const raw = data?.assets_json as { panoList?: string[]; selectedPano?: string } | null;
      setList(Array.isArray(raw?.panoList) ? raw.panoList : []);
      setSelected(typeof raw?.selectedPano === 'string' ? raw.selectedPano : '');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = useCallback(async (nextList: string[], nextSelected: string) => {
    setError(null);
    try {
      const supabase = getSupabaseBrowserClient();
      await supabase.from('think_asset_packs').upsert(
        {
          id: PANO_SETTINGS_ID,
          name: 'IIWARMUP Flow 배경(파노라마) 설정',
          theme: 'iiwarmup',
          assets_json: { panoList: nextList, selectedPano: nextSelected },
        },
        { onConflict: 'id' }
      );
      setList(nextList);
      setSelected(nextSelected);
    } catch (err) {
      setError((err as Error).message);
      throw err;
    }
  }, []);

  const upload = useCallback(
    async (file: File): Promise<void> => {
      const slug = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = flowPanoPath(slug);
      await uploadToStorage(path, file, file.type || 'image/jpeg');
      const nextList = list.includes(path) ? list : [...list, path];
      await save(nextList, selected || path);
    },
    [list, selected, save]
  );

  const remove = useCallback(
    async (path: string): Promise<void> => {
      try {
        await deleteFromStorage(path);
      } catch {
        /* ignore */
      }
      const nextList = list.filter((p) => p !== path);
      const nextSelected = selected === path ? (nextList[0] ?? '') : selected;
      await save(nextList, nextSelected);
    },
    [list, selected, save]
  );

  const select = useCallback(
    (path: string) => {
      save(list, path);
    },
    [list, save]
  );

  return { list, selected, loading, error, load, upload, remove, select };
}
