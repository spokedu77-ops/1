'use client';

import { Bookmark } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { getSupabaseBrowserClient } from '@/app/lib/supabase/browser';
import { getPublicUrl, withPublicUrlCacheBust } from '@/app/lib/admin/assets/storageClient';
import { resolveSpomovePackCacheBust } from '@/app/lib/spomove/spomoveAssetCacheVersion';
import {
  normalizeSpomoveContentMap,
  normalizeSpomoveThumbnailMap,
  SPOMOVE_CONTENT_PACK_ID,
  SPOMOVE_THUMBNAIL_PACK_ID,
  type SpomovePresetContentOverride,
} from '@/app/lib/spomove/spomoveOfficialAssets';
import { InstructionalThumb } from '../components/media/InstructionalThumb';
import { MasterPageHeader, MasterPageShell } from '../components/ui/MasterPrimitives';
import { CategoryIcon } from '../components/ui/ProgramThumb';
import { getFavoritesOwnerId, type FavoriteContentRef } from '../lib/favoriteLib';
import { buildLessonDisplayModel } from '../lib/lessonDisplayModel';
import { MV_EDITORIAL_WIDTH, spmChipClass } from '../lib/masterUiClasses';
import { programHasPlayableVideo } from '../lib/program-media';
import { useIsPremium, useMasterStore } from '../store';
import { isHubListedPreset } from '../spomove/movements/isHubVisiblePreset';
import { OFFICIAL_SPOMOVE_LIBRARY, type OfficialSpomovePreset } from '../spomove/officialSpomovePresets';
import { SpomoveGuidelineSheet } from '../spomove/SpomoveGuidelineSheet';
import { SpomoveLayeredThumb } from '../spomove/SpomoveLayeredThumb';
import { SPOMOVE_PAD_GRID_HEX } from '../spomove/spomovePadDisplay';
import {
  composeSpomovePublicCardMetaParts,
  getSpomoveCardDisplayModel,
  getSpomovePresetDisplayModel,
} from '../spomove/spomovePresetDisplayModel';
import { useSpomoveGuideVideo } from '../spomove/useSpomoveGuideVideo';
import { FavoriteRetrievalCard } from './FavoriteRetrievalCard';

type Filter = 'all' | 'program' | 'spomove';

type FavoriteDisplayItem = {
  ref: FavoriteContentRef;
  key: string;
  title: string;
  accessTitle: string;
  supportMeta: string;
} & (
  | {
      type: 'program';
      href: string;
      heroImageUrl: string;
      theme: string;
      hasVideo: boolean;
    }
  | {
      type: 'spomove';
      preset: OfficialSpomovePreset;
    }
);

const EMPTY_FAVORITE_REFS: FavoriteContentRef[] = [];

const FILTERS: ReadonlyArray<readonly [Filter, string]> = [
  ['all', '전체'],
  ['program', '놀이체육'],
  ['spomove', 'SPOMOVE'],
];

function joinMetaParts(parts: Array<string | null | undefined>) {
  return [...new Set(parts.map((part) => part?.trim()).filter((part): part is string => Boolean(part)))].slice(0, 2).join(' · ');
}

function stripEnglishSubtitle(title: string) {
  return title.replace(/\s*\([A-Za-z0-9][A-Za-z0-9 '&+./-]*\)\s*$/, '').trim();
}

function resolveThumbnailUrl(path: string | undefined, cacheBust?: number) {
  if (!path) return '';
  try {
    return withPublicUrlCacheBust(getPublicUrl(path), cacheBust);
  } catch {
    return '';
  }
}

export default function FavoritesView() {
  const profile = useMasterStore((state) => state.profile);
  const programs = useMasterStore((state) => state.programs);
  const ownerId = getFavoritesOwnerId(profile);
  const refs = useMasterStore((state) => (ownerId ? state.favoriteContentRefsByOwner[ownerId] : undefined)) ?? EMPTY_FAVORITE_REFS;
  const remove = useMasterStore((state) => state.toggleFavoriteContent);
  const isPremium = useIsPremium();
  const [filter, setFilter] = useState<Filter>('all');
  const [previewPreset, setPreviewPreset] = useState<OfficialSpomovePreset | null>(null);
  const guideVideo = useSpomoveGuideVideo(previewPreset?.id ?? null, isPremium);
  const [thumbnailPaths, setThumbnailPaths] = useState<Record<string, string>>({});
  const [thumbnailCacheBust, setThumbnailCacheBust] = useState<number | undefined>();
  const [thumbnailPackLoaded, setThumbnailPackLoaded] = useState(false);
  const [contentOverrides, setContentOverrides] = useState<Record<string, SpomovePresetContentOverride>>({});
  const [contentLoadState, setContentLoadState] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    let alive = true;
    const supabase = getSupabaseBrowserClient();
    void supabase
      .from('think_asset_packs')
      .select('assets_json, updated_at')
      .eq('id', SPOMOVE_THUMBNAIL_PACK_ID)
      .maybeSingle()
      .then((result: { data: { assets_json?: unknown; updated_at?: string | null } | null; error: { code?: string } | null }) => {
        if (!alive) return;
        const { data, error } = result;
        if (error && error.code !== 'PGRST116') {
          setThumbnailPaths({});
          setThumbnailCacheBust(undefined);
        } else {
          const next = normalizeSpomoveThumbnailMap(data?.assets_json);
          setThumbnailPaths(next);
          setThumbnailCacheBust(resolveSpomovePackCacheBust(data?.updated_at as string | undefined, Object.values(next)));
        }
        setThumbnailPackLoaded(true);
      })
      .catch(() => {
        if (!alive) return;
        setThumbnailPaths({});
        setThumbnailCacheBust(undefined);
        setThumbnailPackLoaded(true);
      });
    void supabase
      .from('think_asset_packs')
      .select('assets_json')
      .eq('id', SPOMOVE_CONTENT_PACK_ID)
      .maybeSingle()
      .then((result: { data: { assets_json?: unknown } | null; error: { code?: string } | null }) => {
        if (!alive) return;
        const { data, error } = result;
        if (error && error.code !== 'PGRST116') {
          setContentLoadState('error');
          return;
        }
        setContentOverrides(normalizeSpomoveContentMap(data?.assets_json));
        setContentLoadState('ready');
      })
      .catch(() => {
        if (alive) setContentLoadState('error');
      });
    return () => {
      alive = false;
    };
  }, []);

  const programById = useMemo(() => new Map(programs.map((program) => [program.id, program])), [programs]);
  const spomoveById = useMemo(() => new Map(OFFICIAL_SPOMOVE_LIBRARY.filter(isHubListedPreset).map((preset) => [preset.id, preset])), []);
  const resolvedFavoriteItems = useMemo((): FavoriteDisplayItem[] => {
    const items: FavoriteDisplayItem[] = [];
    for (const ref of refs) {
      if (ref.type === 'program') {
        const program = programById.get(ref.id);
        if (!program) continue;
        const model = buildLessonDisplayModel(program);
        const title = stripEnglishSubtitle(model.title);
        items.push({
          type: 'program',
          ref,
          key: `program:${ref.id}`,
          title,
          accessTitle: title,
          supportMeta: joinMetaParts([model.theme, model.equipment[0]]),
          href: `/spokedu-master/library/${encodeURIComponent(program.id)}`,
          heroImageUrl: model.heroImageUrl ?? '',
          theme: model.theme,
          hasVideo: programHasPlayableVideo(program),
        });
        continue;
      }

      const preset = spomoveById.get(ref.id);
      if (!preset) continue;
      const model = getSpomovePresetDisplayModel(preset, contentOverrides[preset.id]);
      const card = getSpomoveCardDisplayModel(preset, contentOverrides[preset.id]);
      items.push({
        type: 'spomove',
        ref,
        key: `spomove:${ref.id}`,
        title: model.rootTitle,
        accessTitle: model.displayTitle,
        supportMeta: composeSpomovePublicCardMetaParts(card.publicMeta).join(' · '),
        preset,
      });
    }
    return items;
  }, [contentOverrides, programById, refs, spomoveById]);

  const counts = useMemo(() => ({
    all: resolvedFavoriteItems.length,
    program: resolvedFavoriteItems.filter((item) => item.type === 'program').length,
    spomove: resolvedFavoriteItems.filter((item) => item.type === 'spomove').length,
  }), [resolvedFavoriteItems]);
  const visibleItems = resolvedFavoriteItems.filter((item) => filter === 'all' || item.ref.type === filter);

  const openSpomove = (preset: OfficialSpomovePreset) => setPreviewPreset(preset);
  const emptyTitle = resolvedFavoriteItems.length === 0
    ? '저장한 콘텐츠가 없습니다.'
    : filter === 'program'
      ? '저장한 놀이체육 활동이 없습니다.'
      : '저장한 SPOMOVE 활동이 없습니다.';

  return <main className="h-full overflow-y-auto bg-[var(--spm-bg)] pb-28 lg:pb-8">
    <MasterPageShell variant="editorial" className="!max-w-none">
      <div className={MV_EDITORIAL_WIDTH}>
        <MasterPageHeader title="즐겨찾기" />
        <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="즐겨찾기 필터">
          {FILTERS.map(([id, label]) => (
            <button key={id} type="button" onClick={() => setFilter(id)} aria-pressed={filter === id} className={spmChipClass(filter === id, 'gap-1.5')}>
              <span>{label}</span>
              <span className={filter === id ? 'text-white/70' : 'text-slate-400'}>{counts[id]}</span>
            </button>
          ))}
        </div>

        {visibleItems.length ? (
          <section className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" aria-label="저장한 콘텐츠">
            {visibleItems.map((item) => {
              if (item.type === 'program') {
                return (
                  <FavoriteRetrievalCard
                    key={item.key}
                    contentType="놀이체육"
                    title={item.title}
                    supportMeta={item.supportMeta}
                    hasVideo={item.hasVideo}
                    href={item.href}
                    openAriaLabel={`${item.accessTitle} 상세 수업 준비 열기`}
                    removeAriaLabel={`${item.accessTitle} 즐겨찾기에서 제거`}
                    onRemove={() => remove(ownerId, item.ref)}
                    media={(
                      <InstructionalThumb
                        src={item.heroImageUrl}
                        alt=""
                        sizes="(min-width: 1280px) 260px, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 92vw"
                        presentation="full-visible-4-3"
                        className="rounded-none"
                        fallback={(
                          <div className="grid h-full w-full place-items-center bg-slate-200" aria-hidden>
                            <CategoryIcon category={item.theme} size={36} color="rgba(15,23,42,0.45)" />
                          </div>
                        )}
                      />
                    )}
                  />
                );
              }

              const thumbnailUrl = resolveThumbnailUrl(thumbnailPaths[item.preset.id], thumbnailCacheBust);
              return (
                <FavoriteRetrievalCard
                  key={item.key}
                  contentType="SPOMOVE"
                  title={item.title}
                  supportMeta={item.supportMeta}
                  onOpen={() => openSpomove(item.preset)}
                  openAriaLabel={`${item.accessTitle} 활동 준비 열기`}
                  removeAriaLabel={`${item.accessTitle} 즐겨찾기에서 제거`}
                  onRemove={() => remove(ownerId, item.ref)}
                  media={thumbnailPackLoaded ? (
                    <SpomoveLayeredThumb
                      src={thumbnailUrl}
                      alt=""
                      sizes="(min-width: 1280px) 260px, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 92vw"
                      presentation="full-visible-4-3"
                      className="rounded-none"
                      fallback={(
                        <div className="grid h-full w-full grid-cols-2 gap-1 bg-slate-950 p-4" aria-hidden>
                          {SPOMOVE_PAD_GRID_HEX.map((color) => <span key={color} className="rounded-[8px]" style={{ background: color }} />)}
                        </div>
                      )}
                    />
                  ) : (
                    <div className="h-full w-full animate-pulse bg-slate-100 motion-reduce:animate-none" data-spm-spomove-thumbnail-loading="true" aria-hidden />
                  )}
                />
              );
            })}
          </section>
        ) : (
          <section className="mt-12 text-center">
            <Bookmark className="mx-auto h-7 w-7 text-slate-300" />
            <h2 className="mt-3 text-[20px] font-semibold text-slate-900">{emptyTitle}</h2>
            {resolvedFavoriteItems.length === 0 ? <p className="mt-2 text-[14px] text-slate-500">프로그램에서 자주 쓸 활동을 저장해 보세요.</p> : null}
          </section>
        )}
      </div>
    </MasterPageShell>
    <SpomoveGuidelineSheet preset={previewPreset} guideVideoUrl={guideVideo.url} guideVideoState={guideVideo.state} contentOverride={previewPreset ? contentOverrides[previewPreset.id] : undefined} contentLoadState={contentLoadState} hubReturnHref="/spokedu-master/favorites" onClose={() => setPreviewPreset(null)} />
  </main>;
}
