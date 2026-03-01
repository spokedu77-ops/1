'use client';

/**
 * Flow Phase Equirect 배경 (2:1 파노라마) - 업로드 목록 및 월별 선택 (1~12월)
 * month 없으면 기존 전역 selectedPano 사용(하위 호환)
 */

import { useCallback, useEffect, useState } from 'react';
import { getSupabaseBrowserClient } from '@/app/lib/supabase/browser';
import { uploadToStorage, deleteFromStorage } from '@/app/lib/admin/assets/storageClient';
import { flowPanoPath } from '@/app/lib/admin/assets/storagePaths';
import { reencodePanoAsPng } from '@/app/lib/admin/assets/imageOptimizer';

const PANO_SETTINGS_ID = 'iiwarmup_flow_pano_settings';

export type FlowPanoAssetsJson = {
  panoList?: string[];
  selectedPano?: string;
  byMonth?: Partial<Record<number, { selectedPano: string }>>;
};

function getSelectedForMonth(raw: FlowPanoAssetsJson | null, month: number): string {
  if (!raw) return '';
  const byMonth = raw.byMonth;
  const fromMonth = (typeof byMonth?.[month]?.selectedPano === 'string' ? byMonth[month].selectedPano : null)
    ?? (typeof (byMonth as Record<string, { selectedPano?: string }>)?.[String(month)]?.selectedPano === 'string'
      ? (byMonth as Record<string, { selectedPano: string }>)[String(month)].selectedPano
      : null);
  if (fromMonth) return fromMonth;
  if (typeof raw.selectedPano === 'string' && raw.selectedPano) return raw.selectedPano;
  if (byMonth && typeof byMonth === 'object') {
    const byMonthStr = byMonth as Record<string, { selectedPano?: string }>;
    for (let m = 1; m <= 12; m++) {
      const v = byMonth[m]?.selectedPano ?? byMonthStr[String(m)]?.selectedPano;
      if (typeof v === 'string' && v) return v;
    }
  }
  return '';
}

export function useFlowPano(month?: number) {
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

      const raw = data?.assets_json as FlowPanoAssetsJson | null;
      setList(Array.isArray(raw?.panoList) ? raw.panoList : []);
      const monthNum = month != null && month >= 1 && month <= 12 ? month : undefined;
      setSelected(monthNum != null ? getSelectedForMonth(raw, monthNum) : (typeof raw?.selectedPano === 'string' ? raw.selectedPano : ''));
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
            .eq('id', PANO_SETTINGS_ID)
            .single();
          const raw = (current?.assets_json as FlowPanoAssetsJson | null) ?? {};
          let byMonth: NonNullable<FlowPanoAssetsJson['byMonth']> = { ...raw.byMonth, [monthNum]: { selectedPano: nextSelected } };
          // 다른 달에서 선택 중인 path는 목록에 유지 (해당 월에서 파노가 보이도록)
          let listSet = new Set(listToSet);
          for (const v of Object.values(byMonth)) {
            const p = (v as { selectedPano?: string })?.selectedPano;
            if (typeof p === 'string' && p && !listSet.has(p)) {
              listToSet = [...listToSet, p];
              listSet.add(p);
            }
          }
          // upsert 직전 한 번 더 읽어서 동시 저장으로 다른 달(예: 2월) 선택이 사라지는 것 방지
          const { data: latest } = await supabase
            .from('think_asset_packs')
            .select('assets_json')
            .eq('id', PANO_SETTINGS_ID)
            .single();
          const latestRaw = (latest?.assets_json as FlowPanoAssetsJson | null) ?? {};
          const latestByMonth = latestRaw.byMonth ?? {};
          byMonth = { ...latestByMonth, [monthNum]: { selectedPano: nextSelected } };
          for (const v of Object.values(byMonth)) {
            const p = (v as { selectedPano?: string })?.selectedPano;
            if (typeof p === 'string' && p && !listSet.has(p)) {
              listToSet = [...listToSet, p];
              listSet.add(p);
            }
          }
          const globalSelected = latestRaw.selectedPano ?? raw.selectedPano ?? nextSelected;
          await supabase.from('think_asset_packs').upsert(
            {
              id: PANO_SETTINGS_ID,
              name: 'IIWARMUP Flow 배경(파노라마) 설정',
              theme: 'iiwarmup',
              assets_json: { panoList: listToSet, selectedPano: globalSelected, byMonth },
            },
            { onConflict: 'id' }
          );
        } else {
          await supabase.from('think_asset_packs').upsert(
            {
              id: PANO_SETTINGS_ID,
              name: 'IIWARMUP Flow 배경(파노라마) 설정',
              theme: 'iiwarmup',
              assets_json: { panoList: nextList, selectedPano: nextSelected },
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
      // PNG 재인코딩으로 JPEG 4:2:0/블록 아티팩트(검은 점) 제거, 동일 max 해상도 적용
      const normalized = await reencodePanoAsPng(file);
      const slug = normalized.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = flowPanoPath(slug);
      await uploadToStorage(path, normalized, 'image/png');
      const nextList = list.includes(path) ? list : [...list, path];
      await save(nextList, selected || path);
    },
    [list, selected, save]
  );

  const remove = useCallback(
    async (path: string): Promise<void> => {
      setError(null);
      const monthNum = month != null && month >= 1 && month <= 12 ? month : undefined;
      let shouldDeleteFromStorage = true;
      if (monthNum != null) {
        try {
          const supabase = getSupabaseBrowserClient();
          const { data } = await supabase
            .from('think_asset_packs')
            .select('assets_json')
            .eq('id', PANO_SETTINGS_ID)
            .single();
          const raw = (data?.assets_json as FlowPanoAssetsJson | null) ?? {};
          const byMonth = raw.byMonth ?? {};
          const otherMonthsStillUse = Object.entries(byMonth).some(
            ([m, v]) => Number(m) !== monthNum && (v as { selectedPano?: string })?.selectedPano === path
          );
          if (otherMonthsStillUse) shouldDeleteFromStorage = false;
        } catch {
          /* proceed with delete */
        }
      }
      if (shouldDeleteFromStorage) {
        try {
          await deleteFromStorage(path);
        } catch (err) {
          setError((err as Error).message);
          return;
        }
      }
      const nextList = list.filter((p) => p !== path);
      const nextSelected = selected === path ? (nextList[0] ?? '') : selected;
      await save(nextList, nextSelected);
    },
    [list, selected, save, month]
  );

  const select = useCallback(
    (path: string) => {
      save(list, path);
    },
    [list, save]
  );

  return { list, selected, loading, error, load, upload, remove, select };
}
