'use client';

import { Bookmark } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { getSupabaseBrowserClient } from '@/app/lib/supabase/browser';
import { getPublicUrl, withPublicUrlCacheBust } from '@/app/lib/admin/assets/storageClient';
import { resolveSpomovePackCacheBust } from '@/app/lib/spomove/spomoveAssetCacheVersion';
import {
  normalizeSpomoveThumbnailMap,
  SPOMOVE_THUMBNAIL_PACK_ID,
} from '@/app/lib/spomove/spomoveOfficialAssets';
import { LessonCatalogCard } from '../components/lesson/LessonCatalogCard';
import { MasterPageHeader, MasterPageShell } from '../components/ui/MasterPrimitives';
import { getFavoritesOwnerId, type FavoriteContentRef } from '../lib/favoriteLib';
import { buildLessonDisplayModel } from '../lib/lessonDisplayModel';
import { programHasPlayableVideo } from '../lib/program-media';
import { useIsPremium, useMasterStore } from '../store';
import { isHubListedPreset } from '../spomove/movements/isHubVisiblePreset';
import { OFFICIAL_SPOMOVE_LIBRARY, type OfficialSpomovePreset } from '../spomove/officialSpomovePresets';
import { SpomoveGuidelineSheet } from '../spomove/SpomoveGuidelineSheet';
import { SpomoveLayeredThumb } from '../spomove/SpomoveLayeredThumb';
import { SPOMOVE_PAD_GRID_HEX } from '../spomove/spomovePadDisplay';
import { getSpomoveCardDisplayModel, getSpomovePresetDisplayModel } from '../spomove/spomovePresetDisplayModel';
import { useSpomoveGuideVideo } from '../spomove/useSpomoveGuideVideo';

type Filter = 'all' | 'program' | 'spomove';

export default function FavoritesView() {
  const profile = useMasterStore((state) => state.profile);
  const programs = useMasterStore((state) => state.programs);
  const ownerId = getFavoritesOwnerId(profile);
  const refs = useMasterStore((state) => ownerId ? state.favoriteContentRefsByOwner[ownerId] : undefined) ?? [];
  const remove = useMasterStore((state) => state.toggleFavoriteContent);
  const isPremium = useIsPremium();
  const [filter, setFilter] = useState<Filter>('all');
  const [previewPreset, setPreviewPreset] = useState<OfficialSpomovePreset | null>(null);
  const guideVideo = useSpomoveGuideVideo(previewPreset?.id ?? null, isPremium);
  const [thumbnailPaths, setThumbnailPaths] = useState<Record<string, string>>({});
  const [thumbnailCacheBust, setThumbnailCacheBust] = useState<number | undefined>();

  useEffect(() => {
    let alive = true;
    const supabase = getSupabaseBrowserClient();
    void supabase
      .from('think_asset_packs')
      .select('assets_json, updated_at')
      .eq('id', SPOMOVE_THUMBNAIL_PACK_ID)
      .maybeSingle()
      .then((result) => {
        if (!alive) return;
        const { data, error } = result as { data: { assets_json?: unknown; updated_at?: string | null } | null; error: { code?: string } | null };
        if (error && error.code !== 'PGRST116') return;
        const next = normalizeSpomoveThumbnailMap(data?.assets_json);
        setThumbnailPaths(next);
        setThumbnailCacheBust(resolveSpomovePackCacheBust(data?.updated_at as string | undefined, Object.values(next)));
      });
    return () => {
      alive = false;
    };
  }, []);

  const programById = useMemo(() => new Map(programs.map((program) => [program.id, program])), [programs]);
  const spomoveById = useMemo(() => new Map(OFFICIAL_SPOMOVE_LIBRARY.filter(isHubListedPreset).map((preset) => [preset.id, preset])), []);
  const visible = refs.filter((ref) => filter === 'all' || ref.type === filter);

  return <main className="h-full overflow-y-auto bg-[var(--spm-bg)] pb-28 lg:pb-8">
    <MasterPageShell variant="editorial">
      <MasterPageHeader title="즐겨찾기" />
      <div className="mt-4 flex gap-2" role="group" aria-label="즐겨찾기 필터">
        {([['all', '전체'], ['program', '놀이체육'], ['spomove', 'SPOMOVE']] as const).map(([id, label]) => <button key={id} type="button" onClick={() => setFilter(id)} aria-pressed={filter === id} className={`min-h-11 rounded-full px-4 text-[14px] font-semibold ${filter === id ? 'bg-slate-950 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200'}`}>{label}</button>)}
      </div>

      {visible.length ? <section className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="저장한 콘텐츠">
        {visible.map((ref: FavoriteContentRef) => {
          if (ref.type === 'program') {
            const program = programById.get(ref.id); if (!program) return null;
            const model = buildLessonDisplayModel(program);
            return <div key={`program:${ref.id}`} className="relative"><LessonCatalogCard variant="library" title={model.title} heroImageUrl={model.heroImageUrl} categoryFallback={model.theme || '놀이체육'} hasVideo={programHasPlayableVideo(program)} onPreview={() => { window.location.href = `/spokedu-master/library/${encodeURIComponent(program.id)}`; }} detailHref={`/spokedu-master/library/${encodeURIComponent(program.id)}`} decisionMeta={model.theme || '놀이체육'} supportMeta={program.equipment[0] || '바로 확인'} sizes="(min-width: 1024px) 30vw, (min-width: 640px) 50vw, 92vw" /><button type="button" onClick={() => remove(ownerId, ref)} className="absolute right-3 top-3 z-10 grid h-11 w-11 place-items-center rounded-full bg-white/95 text-amber-600 shadow-sm" aria-label={`${model.title} 즐겨찾기에서 제거`}><Bookmark className="h-5 w-5 fill-current" /></button></div>;
          }
          const preset = spomoveById.get(ref.id); if (!preset) return null;
          const model = getSpomovePresetDisplayModel(preset);
          const card = getSpomoveCardDisplayModel(preset);
          const decisionMeta = card.meta.difficulty ?? card.meta.responseType ?? 'SPOMOVE';
          const supportMeta = [card.meta.responseType, card.meta.trainingFocus].filter((part) => part && part !== decisionMeta).join(' · ');
          const thumbPath = thumbnailPaths[preset.id];
          let thumbUrl = '';
          if (thumbPath) {
            try { thumbUrl = withPublicUrlCacheBust(getPublicUrl(thumbPath), thumbnailCacheBust); } catch { thumbUrl = ''; }
          }
          return (
            <article key={`spomove:${ref.id}`} className="relative overflow-hidden rounded-[14px] border border-slate-200 bg-white">
              <button type="button" onClick={() => setPreviewPreset(preset)} className="w-full text-left" aria-label={`${model.displayTitle} 미리보기`}>
                <SpomoveLayeredThumb
                  src={thumbUrl}
                  sizes="(min-width: 1024px) 30vw, (min-width: 640px) 50vw, 92vw"
                  fallback={(
                    <div className="grid h-full w-full grid-cols-2 gap-1 bg-slate-950 p-4" aria-hidden>
                      {SPOMOVE_PAD_GRID_HEX.map((color) => <span key={color} className="rounded-[8px]" style={{ background: color }} />)}
                    </div>
                  )}
                />
                <span className="block px-3.5 py-3">
                  <span className="text-[11px] font-medium text-[color:var(--spm-spomove-surface-muted,#64748b)]">SPOMOVE</span>
                  <strong className="mt-1 block line-clamp-2 text-[16px] font-semibold text-slate-950">{model.displayTitle}</strong>
                  <span className="mt-1 block truncate text-[12px] font-medium text-slate-500">{[decisionMeta, supportMeta].filter(Boolean).join(' · ')}</span>
                </span>
              </button>
              <button type="button" onClick={() => remove(ownerId, ref)} className="absolute right-3 top-3 z-10 grid h-11 w-11 place-items-center rounded-full bg-white/95 text-amber-600 shadow-sm" aria-label={`${model.displayTitle} 즐겨찾기에서 제거`}><Bookmark className="h-5 w-5 fill-current" /></button>
            </article>
          );
        })}
      </section> : <section className="mt-12 text-center"><Bookmark className="mx-auto h-7 w-7 text-slate-300" /><h2 className="mt-3 text-[20px] font-semibold text-slate-900">저장한 콘텐츠가 없습니다.</h2><p className="mt-2 text-[14px] text-slate-500">프로그램에서 자주 쓸 활동을 저장해 보세요.</p></section>}
    </MasterPageShell>
    <SpomoveGuidelineSheet preset={previewPreset} guideVideoUrl={guideVideo.url} guideVideoState={guideVideo.state} contentLoadState="ready" hubReturnHref="/spokedu-master/favorites" onClose={() => setPreviewPreset(null)} />
  </main>;
}
