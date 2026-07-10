'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { getSupabaseBrowserClient } from '@/app/lib/supabase/browser';
import {
  uploadToStorage,
  deleteFromStorage,
  getPublicUrl,
  withPublicUrlCacheBust,
} from '@/app/lib/admin/assets/storageClient';
import { spomoveDivePanoPath, spomoveDivePanoLowPath } from '@/app/lib/admin/assets/storagePaths';
import {
  type DiveThemeId,
  type DiveThemeEntry,
  DIVE_THEME_IDS,
  isDiveThemeId,
} from '@/app/lib/spomove/diveThemes';

export type { DiveThemeId, DiveThemeEntry };

const PACK_ID   = 'spomove_dive_environment_settings';
const PACK_NAME = 'SPOMOVE DIVE 환경 설정';

const RATIO_TOLERANCE = 0.02; // ±2% from 2.0
const MIN_WIDTH  = 2048;
const MIN_HEIGHT = 1024;
const HIGH_W = 4096;
const HIGH_H = 2048;
const LOW_W  = 2048;
const LOW_H  = 1024;

type DiveAssetsJson = {
  themes: Partial<Record<DiveThemeId, DiveThemeEntry>>;
};

function normalizeDiveJson(raw: unknown): DiveAssetsJson {
  const d = raw as { themes?: Record<string, DiveThemeEntry> } | null;
  const themes: Partial<Record<DiveThemeId, DiveThemeEntry>> = {};
  if (d?.themes) {
    for (const id of DIVE_THEME_IDS) {
      const entry = d.themes[id];
      if (entry && typeof entry.panoramaLowPath === 'string') {
        themes[id] = entry;
      }
    }
  }
  return { themes };
}

function loadImageEl(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload  = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('이미지 로드 실패')); };
    img.src = url;
  });
}

async function renderPanoToWebP(img: HTMLImageElement, w: number, h: number): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width  = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context 생성 실패');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, w, h);
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('WebP 변환 실패'))),
      'image/webp',
      0.92
    )
  );
}

export function useSpomoveDiveEnvironments() {
  const [data, setData] = useState<DiveAssetsJson>({ themes: {} });
  const dataRef = useRef(data);
  dataRef.current = data;

  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [cacheBust, setCacheBust] = useState<number | undefined>(undefined);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: row, error: e } = await supabase
        .from('think_asset_packs')
        .select('assets_json, updated_at')
        .eq('id', PACK_ID)
        .maybeSingle();
      if (e && e.code !== 'PGRST116') { setError(e.message); return; }
      setData(normalizeDiveJson(row?.assets_json));
      setCacheBust(row?.updated_at ? new Date(row.updated_at as string).getTime() : undefined);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const persist = useCallback(async (next: DiveAssetsJson) => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/think-asset-pack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          id: PACK_ID,
          name: PACK_NAME,
          theme: 'spomove',
          assets_json: next,
        }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string; updated_at?: string };
      if (!res.ok) throw new Error(body.error ?? res.statusText);
      setData(next);
      dataRef.current = next;
      setCacheBust(body.updated_at ? new Date(body.updated_at).getTime() : Date.now());
    } catch (err) {
      setError((err as Error).message);
      throw err;
    } finally {
      setSaving(false);
    }
  }, []);

  const upload = useCallback(async (themeId: DiveThemeId, file: File) => {
    if (!isDiveThemeId(themeId)) {
      throw new Error(`알 수 없는 DIVE 테마: ${String(themeId)}`);
    }
    const allowed = ['image/png', 'image/jpeg', 'image/webp'];
    if (!allowed.includes(file.type)) {
      throw new Error(`PNG, JPG, WebP만 업로드 가능합니다. (현재: ${file.type || '알 수 없음'})`);
    }

    const img = await loadImageEl(file);
    const srcW = img.naturalWidth;
    const srcH = img.naturalHeight;
    const ratio = srcW / srcH;

    if (Math.abs(ratio - 2) > RATIO_TOLERANCE) {
      throw new Error(
        `2:1 비율이 아닙니다. (현재: ${srcW}×${srcH}, 비율: ${ratio.toFixed(3)})`
      );
    }
    if (srcW < MIN_WIDTH || srcH < MIN_HEIGHT) {
      throw new Error(
        `최소 ${MIN_WIDTH}×${MIN_HEIGHT} 이상이어야 합니다. (현재: ${srcW}×${srcH})`
      );
    }

    let highBlob: Blob;
    let lowBlob: Blob;
    let storedW: number;
    let storedH: number;
    let hasHighRes: boolean;

    if (srcW >= HIGH_W && srcH >= HIGH_H) {
      // 원본이 실제로 4096×2048 이상 — 고해상도/저해상도 별도 생성
      highBlob   = await renderPanoToWebP(img, HIGH_W, HIGH_H);
      lowBlob    = await renderPanoToWebP(img, LOW_W, LOW_H);
      storedW    = HIGH_W;
      storedH    = HIGH_H;
      hasHighRes = true;
    } else {
      // 4096×2048 미만 원본 — 확대 금지, 2048×1024로만 저장
      lowBlob    = await renderPanoToWebP(img, LOW_W, LOW_H);
      highBlob   = lowBlob; // high 경로에도 동일 파일 업로드
      storedW    = LOW_W;
      storedH    = LOW_H;
      hasHighRes = false;
    }

    const highPath = spomoveDivePanoPath(themeId);
    const lowPath  = spomoveDivePanoLowPath(themeId);

    await uploadToStorage(highPath, highBlob, 'image/webp');
    await uploadToStorage(lowPath, lowBlob, 'image/webp');

    const next: DiveAssetsJson = {
      themes: {
        ...dataRef.current.themes,
        [themeId]: {
          panoramaPath:    highPath,
          panoramaLowPath: lowPath,
          width:           storedW,
          height:          storedH,
          fileSize:        highBlob.size,
          updatedAt:       Date.now(),
          hasHighRes,
        } satisfies DiveThemeEntry,
      },
    };
    await persist(next);
  }, [persist]);

  const remove = useCallback(async (themeId: DiveThemeId) => {
    const entry = dataRef.current.themes[themeId];
    if (!entry) return;
    try { await deleteFromStorage(entry.panoramaPath); } catch { /* ignore */ }
    try { await deleteFromStorage(entry.panoramaLowPath); } catch { /* ignore */ }

    const cleanThemes: Partial<Record<DiveThemeId, DiveThemeEntry>> = { ...dataRef.current.themes };
    delete cleanThemes[themeId];
    await persist({ themes: cleanThemes });
  }, [persist]);

  const saveYaw = useCallback(async (themeId: DiveThemeId, yawDeg: number) => {
    const current = dataRef.current.themes[themeId];
    if (!current) return;
    const next: DiveAssetsJson = {
      themes: {
        ...dataRef.current.themes,
        [themeId]: { ...current, yawDeg },
      },
    };
    await persist(next);
  }, [persist]);

  const getPreviewUrl = useCallback((path: string | null | undefined): string | null => {
    if (!path) return null;
    try {
      return withPublicUrlCacheBust(getPublicUrl(path), cacheBust);
    } catch {
      return null;
    }
  }, [cacheBust]);

  return {
    data,
    loading,
    saving,
    error,
    reload: load,
    upload,
    remove,
    saveYaw,
    getPreviewUrl,
    setError,
  };
}
