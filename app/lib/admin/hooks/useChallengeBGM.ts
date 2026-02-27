'use client';

/**
 * Challenge (스포키듀 챌린지) BGM - 업로드 목록 및 선택 (Think/Flow 방식 동일)
 */

import { useCallback, useEffect, useState } from 'react';
import { getSupabaseBrowserClient } from '@/app/lib/supabase/browser';
import { uploadToStorage, deleteFromStorage } from '@/app/lib/admin/assets/storageClient';
import { challengeBgmPath } from '@/app/lib/admin/assets/storagePaths';

const BGM_SETTINGS_ID = 'iiwarmup_challenge_bgm_settings';

export function useChallengeBGM() {
  const [list, setList] = useState<string[]>([]);
  const [selected, setSelected] = useState<string>('');
  const [bgmStartOffsetMs, setBgmStartOffsetMs] = useState<number>(0);
  /** 선택한 BGM의 원곡 BPM. 화면 BPM과 다르면 playbackRate로 맞춤 (화면 BPM / sourceBpm) */
  const [sourceBpm, setSourceBpm] = useState<number | null>(null);
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
        .eq('id', BGM_SETTINGS_ID)
        .single();

      if (e && e.code !== 'PGRST116') {
        setError(e.message);
        return;
      }

      const raw = data?.assets_json as {
        bgmList?: string[];
        selectedBgm?: string;
        bgmStartOffsetMs?: number;
        sourceBpm?: number;
      } | null;
      setList(Array.isArray(raw?.bgmList) ? raw.bgmList : []);
      setSelected(typeof raw?.selectedBgm === 'string' ? raw.selectedBgm : '');
      setBgmStartOffsetMs(typeof raw?.bgmStartOffsetMs === 'number' ? raw.bgmStartOffsetMs : 0);
      setSourceBpm(typeof raw?.sourceBpm === 'number' && raw.sourceBpm > 0 ? raw.sourceBpm : null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = useCallback(
    async (
      nextList: string[],
      nextSelected: string,
      nextOffsetMs?: number,
      nextSourceBpm?: number | null
    ) => {
      setError(null);
      const offset = nextOffsetMs ?? bgmStartOffsetMs;
      const bpm = nextSourceBpm !== undefined ? nextSourceBpm : sourceBpm;
      try {
        const supabase = getSupabaseBrowserClient();
        await supabase.from('think_asset_packs').upsert(
          {
            id: BGM_SETTINGS_ID,
            name: 'IIWARMUP Challenge BGM 설정',
            theme: 'iiwarmup',
            assets_json: {
              bgmList: nextList,
              selectedBgm: nextSelected,
              bgmStartOffsetMs: offset,
              sourceBpm: typeof bpm === 'number' && bpm > 0 ? bpm : null,
            },
          },
          { onConflict: 'id' }
        );
        setList(nextList);
        setSelected(nextSelected);
        if (nextOffsetMs !== undefined) setBgmStartOffsetMs(nextOffsetMs);
        if (nextSourceBpm !== undefined) setSourceBpm(nextSourceBpm);
      } catch (err) {
        setError((err as Error).message);
        throw err;
      }
    },
    [bgmStartOffsetMs, sourceBpm]
  );

  const upload = useCallback(
    async (file: File): Promise<void> => {
      const slug = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = challengeBgmPath(slug);
      await uploadToStorage(path, file, file.type || 'audio/mpeg');
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

  const setOffsetMs = useCallback(
    (ms: number) => {
      setBgmStartOffsetMs(ms);
      save(list, selected, ms);
    },
    [list, selected, save]
  );

  const setSourceBpmValue = useCallback(
    (bpm: number | null) => {
      setSourceBpm(bpm);
      save(list, selected, undefined, bpm ?? undefined);
    },
    [list, selected, save]
  );

  return {
    list,
    selected,
    bgmStartOffsetMs,
    setOffsetMs,
    sourceBpm,
    setSourceBpm: setSourceBpmValue,
    loading,
    error,
    load,
    upload,
    remove,
    select,
  };
}
