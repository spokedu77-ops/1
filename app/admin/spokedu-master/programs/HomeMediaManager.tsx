'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Image as ImageIcon, Loader2, Save, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { getSupabaseBrowserClient } from '@/app/lib/supabase/browser';
import {
  deleteFromStorage,
  getPublicUrl,
  uploadToStorage,
  withPublicUrlCacheBust,
} from '@/app/lib/admin/assets/storageClient';
import { optimizeToWebP } from '@/app/lib/admin/assets/imageOptimizer';
import { resolveSpomovePackCacheBust } from '@/app/lib/spomove/spomoveAssetCacheVersion';
import {
  HOME_MEDIA_FALLBACK,
  HOME_MEDIA_PACK_ID,
  HOME_MEDIA_PACK_NAME,
  homeMediaStoragePath,
  normalizeMasterHomeMedia,
  type MasterHomeMedia,
} from '@/app/spokedu-master/lib/homeMediaAssets';

const OPTIMIZE = { maxW: 1920, maxH: 1080, quality: 0.84 } as const;

export function HomeMediaManager() {
  const fileRef = useRef<HTMLInputElement>(null);
  const mediaRef = useRef<MasterHomeMedia>({ heroImage: null });
  const [media, setMedia] = useState<MasterHomeMedia>({ heroImage: null });
  const [cacheBust, setCacheBust] = useState<number | undefined>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const persist = useCallback(async (next: MasterHomeMedia) => {
    const response = await fetch('/api/admin/think-asset-pack', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({
        id: HOME_MEDIA_PACK_ID,
        name: HOME_MEDIA_PACK_NAME,
        theme: 'master-home',
        assets_json: next,
      }),
    });
    const body = (await response.json().catch(() => ({}))) as { error?: string; updated_at?: string };
    if (!response.ok) throw new Error(body.error ?? '홈 이미지를 저장하지 못했습니다.');
    mediaRef.current = next;
    setMedia(next);
    setCacheBust(resolveSpomovePackCacheBust(body.updated_at, next.heroImage ? [next.heroImage] : []) ?? Date.now());
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from('think_asset_packs')
        .select('assets_json, updated_at')
        .eq('id', HOME_MEDIA_PACK_ID)
        .maybeSingle();
      if (error && error.code !== 'PGRST116') throw error;
      const next = normalizeMasterHomeMedia(data?.assets_json);
      mediaRef.current = next;
      setMedia(next);
      setCacheBust(
        resolveSpomovePackCacheBust(
          data?.updated_at as string | undefined,
          next.heroImage ? [next.heroImage] : [],
        ),
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '홈 이미지를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const previewSrc = media.heroImage
    ? withPublicUrlCacheBust(getPublicUrl(media.heroImage), cacheBust)
    : HOME_MEDIA_FALLBACK.heroImage;

  const onUpload = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('이미지 파일만 업로드할 수 있습니다.');
      return;
    }
    setSaving(true);
    try {
      const optimized = await optimizeToWebP(file, OPTIMIZE);
      const path = homeMediaStoragePath();
      await uploadToStorage(path, optimized, 'image/webp');
      await persist({ heroImage: path });
      toast.success('홈 대표 이미지를 저장했습니다.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '홈 대표 이미지 저장에 실패했습니다.');
    } finally {
      setSaving(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const onReset = async () => {
    if (!media.heroImage) return;
    setSaving(true);
    try {
      const previous = mediaRef.current.heroImage;
      await persist({ heroImage: null });
      if (previous) await deleteFromStorage(previous).catch(() => undefined);
      toast.success('기본 홈 이미지로 복원했습니다.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '기본 이미지로 복원하지 못했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="border-b border-slate-200 bg-white px-4 py-4 sm:px-5" aria-labelledby="home-media-heading">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold text-slate-500">MASTER 홈</p>
          <h2 id="home-media-heading" className="mt-0.5 text-[15px] font-semibold text-slate-950">홈 대표 이미지</h2>
          <p className="mt-1 text-[12px] text-slate-500">홈 상단의 대표 이미지만 관리합니다. 업로드 이미지는 WebP로 최적화됩니다.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/spokedu-master/dashboard"
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[12px] font-semibold text-slate-700"
          >
            홈에서 확인 <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="sr-only"
            onChange={(event) => void onUpload(event.target.files?.[0])}
          />
          <button
            type="button"
            disabled={saving || loading}
            onClick={() => fileRef.current?.click()}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[12px] font-semibold text-slate-800 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            이미지 업로드
          </button>
          <button
            type="button"
            disabled={saving || loading || !media.heroImage}
            onClick={() => void onReset()}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-[12px] font-semibold text-slate-600 disabled:opacity-40"
          >
            <Trash2 className="h-3.5 w-3.5" /> 기본값으로 복원
          </button>
        </div>
      </div>
      <div className="mt-3 overflow-hidden rounded-xl bg-slate-100">
        {loading ? (
          <div className="grid aspect-[16/6] place-items-center text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : (
          <img src={previewSrc} alt="현재 홈 대표 이미지" className="aspect-[16/6] w-full object-cover object-center" />
        )}
        {!media.heroImage ? (
          <p className="flex items-center gap-1.5 px-3 py-2 text-[11px] font-medium text-slate-500">
            <ImageIcon className="h-3.5 w-3.5" /> 현재는 저장소의 SPOKEDU 현장 기본 이미지를 사용 중입니다.
          </p>
        ) : null}
      </div>
    </section>
  );
}
