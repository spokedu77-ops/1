'use client';

/**
 * Challenge (스포키듀 챌린지) BGM - 업로드 목록 및 선택 (Think/Flow 방식 동일)
 */

import { useCallback, useEffect, useState } from 'react';
import { getSupabaseBrowserClient } from '@/app/lib/supabase/browser';
import { uploadToStorage, deleteFromStorage } from '@/app/lib/admin/assets/storageClient';
import { challengeBgmPath } from '@/app/lib/admin/assets/storagePaths';

const BGM_SETTINGS_ID = 'iiwarmup_challenge_bgm_settings';
const CHALLENGE_BGM_CACHE_KEY = 'iiwarmup_challenge_bgm_cache_v1';

type CachedChallengeBgm = {
  bgmList: string[];
  selectedBgm: string;
  bgmStartOffsetMs: number;
  sourceBpm: number | null;
};

function readCache(): CachedChallengeBgm | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(CHALLENGE_BGM_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return null;
    const p = parsed as Partial<CachedChallengeBgm>;
    return {
      bgmList: Array.isArray(p.bgmList) ? (p.bgmList as string[]) : [],
      selectedBgm: typeof p.selectedBgm === 'string' ? p.selectedBgm : '',
      bgmStartOffsetMs: typeof p.bgmStartOffsetMs === 'number' ? p.bgmStartOffsetMs : 0,
      sourceBpm: typeof p.sourceBpm === 'number' && p.sourceBpm > 0 ? p.sourceBpm : null,
    };
  } catch {
    return null;
  }
}

function writeCache(next: CachedChallengeBgm): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CHALLENGE_BGM_CACHE_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

export function useChallengeBGM() {
  const cached = useState(() => readCache())[0];
  const [list, setList] = useState<string[]>(() => cached?.bgmList ?? []);
  const [selected, setSelected] = useState<string>(() => cached?.selectedBgm ?? '');
  const [bgmStartOffsetMs, setBgmStartOffsetMs] = useState<number>(() => cached?.bgmStartOffsetMs ?? 0);
  /** 선택한 BGM의 원곡 BPM. 화면 BPM과 다르면 playbackRate로 맞춤 (화면 BPM / sourceBpm) */
  const [sourceBpm, setSourceBpm] = useState<number | null>(() => cached?.sourceBpm ?? null);
  // 캐시가 있으면 UI는 즉시 표시하고, 백그라운드로 동기화한다.
  const [loading, setLoading] = useState(() => !(cached && (cached.bgmList.length > 0 || cached.selectedBgm || cached.sourceBpm != null)));
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    // loading 상태를 의존성으로 두면 setLoading(false) 후 load 재생성 → 이중 호출 발생.
    // 항상 refreshing으로만 표시하고, loading은 초기 state(캐시 유무)로만 결정.
    setRefreshing(true);
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
      const next: CachedChallengeBgm = {
        bgmList: Array.isArray(raw?.bgmList) ? raw.bgmList : [],
        selectedBgm: typeof raw?.selectedBgm === 'string' ? raw.selectedBgm : '',
        bgmStartOffsetMs: typeof raw?.bgmStartOffsetMs === 'number' ? raw.bgmStartOffsetMs : 0,
        sourceBpm: typeof raw?.sourceBpm === 'number' && raw.sourceBpm > 0 ? raw.sourceBpm : null,
      };
      setList(next.bgmList);
      setSelected(next.selectedBgm);
      setBgmStartOffsetMs(next.bgmStartOffsetMs);
      setSourceBpm(next.sourceBpm);
      writeCache(next);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []); // loading을 의존성에서 제거 — 이중 호출 방지

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
        writeCache({
          bgmList: nextList,
          selectedBgm: nextSelected,
          bgmStartOffsetMs: offset,
          sourceBpm: typeof bpm === 'number' && bpm > 0 ? bpm : null,
        });
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
    refreshing,
    error,
    load,
    upload,
    remove,
    select,
  };
}
