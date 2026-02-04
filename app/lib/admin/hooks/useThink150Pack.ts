'use client';

/**
 * Think 150 Asset Pack - 월별(1-12) × 주차별(week2/3/4) 이미지 관리
 * 1주차: 색상만 / 2·3·4주차: 각 월마다 다른 이미지
 */

import { useCallback, useEffect, useState } from 'react';
import { getSupabaseClient } from '@/app/lib/supabase/client';
import { getPublicUrl, uploadToStorage, deleteFromStorage } from '@/app/lib/admin/assets/storageClient';
import { optimizeToWebP } from '@/app/lib/admin/assets/imageOptimizer';
import { calculateFileHash } from '@/app/lib/admin/assets/imageOptimizer';
import { think150ImagePath } from '@/app/lib/admin/assets/storagePaths';
import type { ThinkPackSets, ThinkPackByWeek, ThinkPackByMonthAndWeek } from '@/app/lib/admin/engines/think150/types';
import type { PADColor } from '@/app/lib/admin/constants/padGrid';

const PACK_ID = 'iiwarmup_think_default';
const COLORS: PADColor[] = ['red', 'green', 'yellow', 'blue'];

export interface Think150PackState {
  setA: Record<PADColor, string>;
  setB: Record<PADColor, string>;
}

export type Think150PathsByWeek = {
  week2: Think150PackState;
  week3: Think150PackState;
  week4: Think150PackState;
};

export type Think150PathsByMonthAndWeek = {
  [month: number]: Think150PathsByWeek;
};

function emptyPack(): Think150PackState {
  return {
    setA: { red: '', green: '', yellow: '', blue: '' },
    setB: { red: '', green: '', yellow: '', blue: '' },
  };
}

function emptyPathsByWeek(): Think150PathsByWeek {
  return { week2: emptyPack(), week3: emptyPack(), week4: emptyPack() };
}

function emptyPathsByMonthAndWeek(): Think150PathsByMonthAndWeek {
  const out: Think150PathsByMonthAndWeek = {};
  for (let m = 1; m <= 12; m++) out[m] = emptyPathsByWeek();
  return out;
}

function pathsToThinkPackSets(paths: Think150PackState): ThinkPackSets {
  return {
    setA: {
      red: paths.setA.red ? getPublicUrl(paths.setA.red) : '',
      green: paths.setA.green ? getPublicUrl(paths.setA.green) : '',
      yellow: paths.setA.yellow ? getPublicUrl(paths.setA.yellow) : '',
      blue: paths.setA.blue ? getPublicUrl(paths.setA.blue) : '',
    },
    setB: {
      red: paths.setB.red ? getPublicUrl(paths.setB.red) : '',
      green: paths.setB.green ? getPublicUrl(paths.setB.green) : '',
      yellow: paths.setB.yellow ? getPublicUrl(paths.setB.yellow) : '',
      blue: paths.setB.blue ? getPublicUrl(paths.setB.blue) : '',
    },
  };
}

export function useThink150Pack() {
  const [pathsByMonthAndWeek, setPathsByMonthAndWeek] = useState<Think150PathsByMonthAndWeek>(
    () => emptyPathsByMonthAndWeek()
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = getSupabaseClient();
      const { data, error: e } = await supabase
        .from('think_asset_packs')
        .select('assets_json')
        .eq('id', PACK_ID)
        .single();

      if (e) {
        if (e.code === 'PGRST116') {
          setPathsByMonthAndWeek(emptyPathsByMonthAndWeek());
          return;
        }
        setError(e.message);
        setPathsByMonthAndWeek(emptyPathsByMonthAndWeek());
        return;
      }

      const raw = data?.assets_json as { byMonth?: Think150PathsByMonthAndWeek } | null;
      const base = emptyPathsByMonthAndWeek();

      if (raw?.byMonth && typeof raw.byMonth === 'object') {
        for (let m = 1; m <= 12; m++) {
          const monthData = raw.byMonth[m];
          if (monthData?.week2 || monthData?.week3 || monthData?.week4) {
            base[m] = {
              week2: monthData.week2 ?? emptyPathsByWeek().week2,
              week3: monthData.week3 ?? emptyPathsByWeek().week3,
              week4: monthData.week4 ?? emptyPathsByWeek().week4,
            };
          }
        }
      }
      setPathsByMonthAndWeek(base);
    } catch (err) {
      setError((err as Error).message);
      setPathsByMonthAndWeek(emptyPathsByMonthAndWeek());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = useCallback(async (next: Think150PathsByMonthAndWeek) => {
    setError(null);
    try {
      const supabase = getSupabaseClient();
      await supabase.from('think_asset_packs').upsert(
        {
          id: PACK_ID,
          name: 'IIWARMUP Think 150 Pack (월별×주차별)',
          theme: 'iiwarmup',
          assets_json: { byMonth: next },
        },
        { onConflict: 'id' }
      );
      setPathsByMonthAndWeek(next);
    } catch (err) {
      setError((err as Error).message);
      throw err;
    }
  }, []);

  const upload = useCallback(
    async (
      month: number,
      week: 2 | 3 | 4,
      set: 'setA' | 'setB',
      color: PADColor,
      file: File
    ): Promise<void> => {
      const hash = await calculateFileHash(file);
      const slug = file.name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9-_]/g, '_') || 'img';
      const path = think150ImagePath(PACK_ID, month, week, set, color, `${slug}_${hash}`);
      const webp = await optimizeToWebP(file);
      await uploadToStorage(path, webp, 'image/webp');
      const paths = pathsByMonthAndWeek[month] ?? emptyPathsByWeek();
      const pack = paths[`week${week}`];
      if (pack[set][color]) {
        try {
          await deleteFromStorage(pack[set][color]);
        } catch {
          /* ignore */
        }
      }
      const next = { ...pathsByMonthAndWeek };
      if (!next[month]) next[month] = emptyPathsByWeek();
      const weekKey = `week${week}` as const;
      next[month] = {
        ...next[month],
        [weekKey]: {
          ...next[month][weekKey],
          [set]: { ...next[month][weekKey][set], [color]: path },
        },
      };
      await save(next);
    },
    [pathsByMonthAndWeek, save]
  );

  const remove = useCallback(
    async (month: number, week: 2 | 3 | 4, set: 'setA' | 'setB', color: PADColor): Promise<void> => {
      const paths = pathsByMonthAndWeek[month];
      if (!paths) return;
      const path = paths[`week${week}`][set][color];
      if (!path) return;
      try {
        await deleteFromStorage(path);
      } catch {
        /* ignore */
      }
      const next = { ...pathsByMonthAndWeek };
      const weekKey = `week${week}` as const;
      next[month] = {
        ...next[month],
        [weekKey]: {
          ...next[month][weekKey],
          [set]: { ...next[month][weekKey][set], [color]: '' },
        },
      };
      await save(next);
    },
    [pathsByMonthAndWeek, save]
  );

  const thinkPackByMonthAndWeek: ThinkPackByMonthAndWeek = {};
  for (let m = 1; m <= 12; m++) {
    const monthPaths = pathsByMonthAndWeek[m];
    if (!monthPaths) continue;
    let hasAny = false;
    const byWeek: ThinkPackByWeek = {};
    for (const w of [2, 3, 4] as const) {
      const p = monthPaths[`week${w}`];
      if (Object.values(p.setA).some(Boolean) || Object.values(p.setB).some(Boolean)) {
        byWeek[`week${w}`] = pathsToThinkPackSets(p);
        hasAny = true;
      }
    }
    if (hasAny) thinkPackByMonthAndWeek[m] = byWeek;
  }

  return {
    pathsByMonthAndWeek,
    thinkPackByMonthAndWeek:
      Object.keys(thinkPackByMonthAndWeek).length > 0 ? thinkPackByMonthAndWeek : undefined,
    loading,
    error,
    load,
    upload,
    remove,
  };
}
