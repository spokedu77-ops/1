'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { getSupabaseBrowserClient } from '@/app/lib/supabase/browser';
import { uploadToStorage, deleteFromStorage } from '@/app/lib/admin/assets/storageClient';
import { spomoveVariantFruitPath } from '@/app/lib/admin/assets/storagePaths';
import {
  mergeSpomoveVariantPaths,
  normalizeSpomoveVariantFruitPaths,
  SPOMOVE_VARIANT_PACK_ID,
  VARIANT_FRUIT_SLOT_LABELS,
  type SpomoveVariantAssetsJson,
} from '@/app/admin/iiwarmup/spomove/training/_player/lib/variantFruitAssets';
import type { FruitSlide } from '@/app/admin/iiwarmup/spomove/training/_player/lib/signals';

const PACK_NAME = 'SPOMOVE 변형 색지각 과일';

export function useSpomoveVariantFruitPack() {
  const [paths, setPaths] = useState<(string | null)[]>(() =>
    Array.from({ length: 8 }, () => null)
  );
  const pathsRef = useRef(paths);
  pathsRef.current = paths;

  const [previewSlides, setPreviewSlides] = useState<FruitSlide[]>(() => mergeSpomoveVariantPaths(null));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  /** Storage 업로드~삭제 구간(저장 중 문구와 구분) */
  const [uploadingSlot, setUploadingSlot] = useState<number | null>(null);

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
      const next = normalizeSpomoveVariantFruitPaths(data?.assets_json);
      setPaths(next);
      setPreviewSlides(mergeSpomoveVariantPaths(next, Date.now()));
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
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 45_000);
    try {
      const res = await fetch('/api/admin/think-asset-pack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        signal: ctrl.signal,
        body: JSON.stringify({
          id: SPOMOVE_VARIANT_PACK_ID,
          name: PACK_NAME,
          theme: 'iiwarmup',
          assets_json: { paths: next } satisfies SpomoveVariantAssetsJson,
        }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(body.error ?? res.statusText);
      setPaths(next);
      setPreviewSlides(mergeSpomoveVariantPaths(next, Date.now()));
    } catch (err) {
      const e = err as Error;
      const msg = e?.name === 'AbortError' ? '저장 시간이 초과되었습니다. 네트워크·서버(.env SUPABASE_SERVICE_ROLE_KEY)를 확인하세요.' : e.message;
      setError(msg);
      throw err;
    } finally {
      clearTimeout(timer);
      setSaving(false);
    }
  }, []);

  const uploadAt = useCallback(
    async (index: number, file: File) => {
      if (index < 0 || index > 7) return;
      setError(null);
      setUploadingSlot(index);
      try {
        const ext = (file.name.split('.').pop() || 'webp').toLowerCase();
        const path = spomoveVariantFruitPath(index, ext);
        await uploadToStorage(path, file, file.type || 'image/webp');

        const prevArr = pathsRef.current;
        const next = [...prevArr];
        while (next.length < 8) next.push(null);
        const prevPath = next[index];
        next[index] = path;

        if (prevPath && prevPath !== path) {
          try {
            await deleteFromStorage(prevPath);
          } catch {
            /* 이전 파일 삭제 실패는 무시 */
          }
        }

        setUploadingSlot(null);
        await persistPaths(next);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setUploadingSlot(null);
      }
    },
    [persistPaths]
  );

  const clearAt = useCallback(
    async (index: number) => {
      if (index < 0 || index > 7) return;
      setError(null);
      try {
        const prevArr = pathsRef.current;
        const next = [...prevArr];
        while (next.length < 8) next.push(null);
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
      } catch (err) {
        setError((err as Error).message);
      }
    },
    [persistPaths]
  );

  return {
    paths,
    previewSlides,
    slotLabels: VARIANT_FRUIT_SLOT_LABELS,
    loading,
    saving,
    uploadingSlot,
    error,
    reload: load,
    uploadAt,
    clearAt,
  };
}
