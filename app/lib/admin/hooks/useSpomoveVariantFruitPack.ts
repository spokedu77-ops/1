'use client';

import { useCallback, useEffect, useState } from 'react';
import { getSupabaseBrowserClient } from '@/app/lib/supabase/browser';
import { uploadToStorage, deleteFromStorage } from '@/app/lib/admin/assets/storageClient';
import { spomoveVariantFruitPath } from '@/app/lib/admin/assets/storagePaths';
import {
  mergeSpomoveVariantPaths,
  SPOMOVE_VARIANT_PACK_ID,
  VARIANT_FRUIT_SLOT_LABELS,
  type SpomoveVariantAssetsJson,
} from '@/app/admin/memory-game/lib/variantFruitAssets';
import type { FruitSlide } from '@/app/admin/memory-game/lib/signals';

const PACK_NAME = 'SPOMOVE 변형 색지각 과일';

function normalizePaths(raw: unknown): (string | null)[] {
  const p = (raw as SpomoveVariantAssetsJson | null)?.paths;
  if (!Array.isArray(p) || p.length !== 11) return Array.from({ length: 11 }, () => null);
  return p.map((x) => (typeof x === 'string' && x.trim() ? x.trim() : null));
}

export function useSpomoveVariantFruitPack() {
  const [paths, setPaths] = useState<(string | null)[]>(() => Array.from({ length: 11 }, () => null));
  const [previewSlides, setPreviewSlides] = useState<FruitSlide[]>(() => mergeSpomoveVariantPaths(null));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = getSupabaseBrowserClient();
      const { data, error: e } = await supabase.from('think_asset_packs').select('assets_json').eq('id', SPOMOVE_VARIANT_PACK_ID).maybeSingle();
      if (e && e.code !== 'PGRST116') {
        setError(e.message);
        return;
      }
      const next = normalizePaths(data?.assets_json);
      setPaths(next);
      setPreviewSlides(mergeSpomoveVariantPaths(next));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const persistPaths = useCallback(async (next: (string | null)[]) => {
    setSaving(true);
    setError(null);
    try {
      const supabase = getSupabaseBrowserClient();
      const { error: upErr } = await supabase.from('think_asset_packs').upsert(
        {
          id: SPOMOVE_VARIANT_PACK_ID,
          name: PACK_NAME,
          theme: 'iiwarmup',
          assets_json: { paths: next } satisfies SpomoveVariantAssetsJson,
        },
        { onConflict: 'id' }
      );
      if (upErr) throw new Error(upErr.message);
      setPaths(next);
      setPreviewSlides(mergeSpomoveVariantPaths(next));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }, []);

  const uploadAt = useCallback(
    async (index: number, file: File) => {
      if (index < 0 || index > 10) return;
      const ext = (file.name.split('.').pop() || 'webp').toLowerCase();
      const path = spomoveVariantFruitPath(index, ext);
      await uploadToStorage(path, file, file.type || 'image/webp');
      const next = [...paths];
      const prevPath = next[index];
      if (prevPath && prevPath !== path) {
        try {
          await deleteFromStorage(prevPath);
        } catch {
          /* 이전 파일 삭제 실패는 무시 */
        }
      }
      next[index] = path;
      await persistPaths(next);
    },
    [paths, persistPaths]
  );

  const clearAt = useCallback(
    async (index: number) => {
      if (index < 0 || index > 10) return;
      const next = [...paths];
      const prev = next[index];
      next[index] = null;
      if (prev) {
        try {
          await deleteFromStorage(prev);
        } catch {
          /* ignore */
        }
      }
      await persistPaths(next);
    },
    [paths, persistPaths]
  );

  return {
    paths,
    previewSlides,
    slotLabels: VARIANT_FRUIT_SLOT_LABELS,
    loading,
    saving,
    error,
    reload: load,
    uploadAt,
    clearAt,
  };
}
