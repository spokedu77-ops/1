'use client';

import { useCallback, useEffect, useState } from 'react';
import { getSupabaseBrowserClient } from '@/app/lib/supabase/browser';
import { uploadToStorage, deleteFromStorage, getPublicUrl } from '@/app/lib/admin/assets/storageClient';

export type SpomoveVariantThemedAssetsJson = {
  paths?: (string | null)[];
};

export type UseSpomoveVariantThemedPackOptions = {
  packId: string;
  packName: string;
  slotCount: number;
  storagePath: (slotIndex: number, ext: string) => string;
};

function normalizePaths(raw: unknown, slotCount: number): (string | null)[] {
  const p = (raw as SpomoveVariantThemedAssetsJson | null)?.paths;
  if (!Array.isArray(p) || p.length !== slotCount) {
    return Array.from({ length: slotCount }, () => null);
  }
  return p.map((x) => (typeof x === 'string' && x.trim() ? x.trim() : null));
}

function pathsToPreviewUrls(paths: (string | null)[], slotCount: number): (string | null)[] {
  const list = paths.length === slotCount ? paths : Array.from({ length: slotCount }, () => null);
  return list.map((p) => {
    if (p == null || typeof p !== 'string' || !p.trim()) return null;
    try {
      return getPublicUrl(p.trim());
    } catch {
      return null;
    }
  });
}

export function useSpomoveVariantThemedPack({
  packId,
  packName,
  slotCount,
  storagePath,
}: UseSpomoveVariantThemedPackOptions) {
  const [paths, setPaths] = useState<(string | null)[]>(() => Array.from({ length: slotCount }, () => null));
  const [previewUrls, setPreviewUrls] = useState<(string | null)[]>(() =>
    Array.from({ length: slotCount }, () => null)
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = getSupabaseBrowserClient();
      const { data, error: e } = await supabase.from('think_asset_packs').select('assets_json').eq('id', packId).maybeSingle();
      if (e && e.code !== 'PGRST116') {
        setError(e.message);
        return;
      }
      const next = normalizePaths(data?.assets_json, slotCount);
      setPaths(next);
      setPreviewUrls(pathsToPreviewUrls(next, slotCount));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [packId, slotCount]);

  useEffect(() => {
    void load();
  }, [load]);

  const persistPaths = useCallback(
    async (next: (string | null)[]) => {
      setSaving(true);
      setError(null);
      try {
        const supabase = getSupabaseBrowserClient();
        const { error: upErr } = await supabase.from('think_asset_packs').upsert(
          {
            id: packId,
            name: packName,
            theme: 'iiwarmup',
            assets_json: { paths: next } satisfies SpomoveVariantThemedAssetsJson,
          },
          { onConflict: 'id' }
        );
        if (upErr) throw new Error(upErr.message);
        setPaths(next);
        setPreviewUrls(pathsToPreviewUrls(next, slotCount));
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setSaving(false);
      }
    },
    [packId, packName, slotCount]
  );

  const uploadAt = useCallback(
    async (index: number, file: File) => {
      if (index < 0 || index >= slotCount) return;
      const ext = (file.name.split('.').pop() || 'webp').toLowerCase();
      const path = storagePath(index, ext);
      await uploadToStorage(path, file, file.type || 'image/webp');
      const next = [...paths];
      const prevPath = next[index];
      if (prevPath && prevPath !== path) {
        try {
          await deleteFromStorage(prevPath);
        } catch {
          /* ignore */
        }
      }
      next[index] = path;
      await persistPaths(next);
    },
    [paths, persistPaths, slotCount, storagePath]
  );

  const clearAt = useCallback(
    async (index: number) => {
      if (index < 0 || index >= slotCount) return;
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
    [paths, persistPaths, slotCount]
  );

  return {
    paths,
    previewUrls,
    loading,
    saving,
    error,
    reload: load,
    uploadAt,
    clearAt,
  };
}
