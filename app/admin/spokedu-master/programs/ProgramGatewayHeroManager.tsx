'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Image as ImageIcon, Loader2, Save, Trash2 } from 'lucide-react';
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
  normalizeProgramGatewayMedia,
  PROGRAM_GATEWAY_FALLBACK,
  PROGRAM_GATEWAY_PACK_ID,
  PROGRAM_GATEWAY_PACK_NAME,
  programGatewayStoragePath,
  type ProgramGatewayHeroKey,
  type ProgramGatewayMedia,
} from '@/app/spokedu-master/lib/programGatewayAssets';

const OPTIMIZE = { maxW: 1600, maxH: 900, quality: 0.82 } as const;

export function ProgramGatewayHeroManager({ domain }: { domain: 'lesson' | 'spomove' }) {
  const key: ProgramGatewayHeroKey = domain === 'lesson' ? 'lessonHero' : 'spomoveHero';
  const label = domain === 'lesson' ? 'Programs Gateway 대표 이미지' : 'SPOMOVE Gateway 대표 이미지';
  const fileRef = useRef<HTMLInputElement>(null);
  const mediaRef = useRef<ProgramGatewayMedia>({ lessonHero: null, spomoveHero: null });
  const [media, setMedia] = useState<ProgramGatewayMedia>({ lessonHero: null, spomoveHero: null });
  const [cacheBust, setCacheBust] = useState<number | undefined>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const persist = useCallback(async (next: ProgramGatewayMedia) => {
    const res = await fetch('/api/admin/think-asset-pack', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({
        id: PROGRAM_GATEWAY_PACK_ID,
        name: PROGRAM_GATEWAY_PACK_NAME,
        theme: 'master-gateway',
        assets_json: next,
      }),
    });
    const body = (await res.json().catch(() => ({}))) as { error?: string; updated_at?: string };
    if (!res.ok) throw new Error(body.error ?? 'Gateway 이미지를 저장하지 못했습니다.');
    mediaRef.current = next;
    setMedia(next);
    setCacheBust(resolveSpomovePackCacheBust(body.updated_at, [next.lessonHero, next.spomoveHero].filter(Boolean) as string[]) ?? Date.now());
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from('think_asset_packs')
        .select('assets_json, updated_at')
        .eq('id', PROGRAM_GATEWAY_PACK_ID)
        .maybeSingle();
      if (error && error.code !== 'PGRST116') throw error;
      const next = normalizeProgramGatewayMedia(data?.assets_json);
      mediaRef.current = next;
      setMedia(next);
      setCacheBust(
        resolveSpomovePackCacheBust(
          data?.updated_at as string | undefined,
          [next.lessonHero, next.spomoveHero].filter(Boolean) as string[],
        ),
      );
    } catch (loadError) {
      toast.error(loadError instanceof Error ? loadError.message : 'Gateway 이미지를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const previewSrc = media[key]
    ? withPublicUrlCacheBust(getPublicUrl(media[key]!), cacheBust)
    : PROGRAM_GATEWAY_FALLBACK[key];

  const onUpload = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('이미지 파일만 업로드할 수 있습니다.');
      return;
    }
    setSaving(true);
    try {
      const optimized = await optimizeToWebP(file, OPTIMIZE);
      const path = programGatewayStoragePath(key);
      await uploadToStorage(path, optimized, 'image/webp');
      const previous = mediaRef.current[key];
      const next = { ...mediaRef.current, [key]: path };
      if (previous && previous !== path) {
        try {
          await deleteFromStorage(previous);
        } catch {
          /* previous cleanup is best-effort */
        }
      }
      await persist(next);
      toast.success(`${label}을 저장했습니다.`);
    } catch (uploadError) {
      toast.error(uploadError instanceof Error ? uploadError.message : '이미지 저장에 실패했습니다.');
    } finally {
      setSaving(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const onClear = async () => {
    if (!media[key]) return;
    setSaving(true);
    try {
      const previous = mediaRef.current[key];
      const next = { ...mediaRef.current, [key]: null };
      await persist(next);
      if (previous) {
        try {
          await deleteFromStorage(previous);
        } catch {
          /* ignore */
        }
      }
      toast.success('기본 이미지로 되돌렸습니다.');
    } catch (clearError) {
      toast.error(clearError instanceof Error ? clearError.message : '이미지를 비우지 못했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="border-b border-slate-200 bg-white px-4 py-4 sm:px-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold text-slate-500">Programs Gateway</p>
          <h2 className="mt-0.5 text-[15px] font-semibold text-slate-950">{label}</h2>
          <p className="mt-1 text-[12px] text-slate-500">Public Programs 페이지의 해당 영역 히어로만 바뀝니다. 없으면 기본 정적 이미지를 씁니다.</p>
        </div>
        <div className="flex items-center gap-2">
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
            업로드
          </button>
          <button
            type="button"
            disabled={saving || loading || !media[key]}
            onClick={() => void onClear()}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-[12px] font-semibold text-slate-600 disabled:opacity-40"
          >
            <Trash2 className="h-3.5 w-3.5" />
            기본값
          </button>
        </div>
      </div>
      <div className="mt-3 overflow-hidden rounded-xl bg-slate-100">
        {loading ? (
          <div className="grid aspect-[16/7] place-items-center text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewSrc} alt="" className="aspect-[16/7] w-full object-cover" />
        )}
        {!media[key] ? (
          <p className="flex items-center gap-1.5 px-3 py-2 text-[11px] font-medium text-slate-500">
            <ImageIcon className="h-3.5 w-3.5" /> 현재는 코드 기본 이미지를 사용 중입니다.
          </p>
        ) : null}
      </div>
    </section>
  );
}
