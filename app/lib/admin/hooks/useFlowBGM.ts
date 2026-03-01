'use client';

/**
 * Flow Phase BGM - 업로드 목록 및 월별 선택 (1~12월)
 * month 없으면 기존 전역 selectedBgm 사용(하위 호환)
 */

import { useCallback, useEffect, useState } from 'react';
import { getSupabaseBrowserClient } from '@/app/lib/supabase/browser';
import { uploadToStorage, deleteFromStorage } from '@/app/lib/admin/assets/storageClient';
import { flowBgmPath } from '@/app/lib/admin/assets/storagePaths';

const BGM_SETTINGS_ID = 'iiwarmup_flow_bgm_settings';

export type FlowBgmAssetsJson = {
  bgmList?: string[];
  selectedBgm?: string;
  byMonth?: Partial<Record<number, { selectedBgm: string }>>;
};

function getSelectedForMonth(raw: FlowBgmAssetsJson | null, month: number): string {
  if (!raw) return '';
  const fromMonth = raw.byMonth?.[month]?.selectedBgm;
  if (typeof fromMonth === 'string') return fromMonth;
  return typeof raw.selectedBgm === 'string' ? raw.selectedBgm : '';
}

export function useFlowBGM(month?: number) {
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
        .eq('id', BGM_SETTINGS_ID)
        .single();

      if (e && e.code !== 'PGRST116') {
        setError(e.message);
        return;
      }

      const raw = data?.assets_json as FlowBgmAssetsJson | null;
      setList(Array.isArray(raw?.bgmList) ? raw.bgmList : []);
      const monthNum = month != null && month >= 1 && month <= 12 ? month : undefined;
      setSelected(monthNum != null ? getSelectedForMonth(raw, monthNum) : (typeof raw?.selectedBgm === 'string' ? raw.selectedBgm : ''));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    load();
  }, [load]);

  const save = useCallback(
    async (nextList: string[], nextSelected: string) => {
      setError(null);
      try {
        const supabase = getSupabaseBrowserClient();
        const monthNum = month != null && month >= 1 && month <= 12 ? month : undefined;

        let listToSet = nextList;
        if (monthNum != null) {
          const { data: current } = await supabase
            .from('think_asset_packs')
            .select('assets_json')
            .eq('id', BGM_SETTINGS_ID)
            .single();
          const raw = (current?.assets_json as FlowBgmAssetsJson | null) ?? {};
          const byMonth = { ...raw.byMonth, [monthNum]: { selectedBgm: nextSelected } };
          await supabase.from('think_asset_packs').upsert(
            {
              id: BGM_SETTINGS_ID,
              name: 'IIWARMUP Flow BGM 설정',
              theme: 'iiwarmup',
              assets_json: { bgmList: listToSet, selectedBgm: raw.selectedBgm ?? nextSelected, byMonth },
            },
            { onConflict: 'id' }
          );
        } else {
          await supabase.from('think_asset_packs').upsert(
            {
              id: BGM_SETTINGS_ID,
              name: 'IIWARMUP Flow BGM 설정',
              theme: 'iiwarmup',
              assets_json: { bgmList: nextList, selectedBgm: nextSelected },
            },
            { onConflict: 'id' }
          );
        }
        setList(listToSet);
        setSelected(nextSelected);
      } catch (err) {
        setError((err as Error).message);
        throw err;
      }
    },
    [month]
  );

  const upload = useCallback(
    async (file: File): Promise<void> => {
      const slug = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = flowBgmPath(slug);
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

  return { list, selected, loading, error, load, upload, remove, select };
}
