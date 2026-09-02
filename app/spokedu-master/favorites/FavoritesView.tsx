'use client';

import { Bookmark, MonitorPlay } from 'lucide-react';
import { useMemo, useState } from 'react';

import { LessonCatalogCard } from '../components/lesson/LessonCatalogCard';
import { getFavoritesOwnerId, type FavoriteContentRef } from '../lib/favoriteLib';
import { buildLessonDisplayModel } from '../lib/lessonDisplayModel';
import { programHasPlayableVideo } from '../lib/program-media';
import { useIsPremium, useMasterStore } from '../store';
import { isHubListedPreset } from '../spomove/movements/isHubVisiblePreset';
import { OFFICIAL_SPOMOVE_LIBRARY, type OfficialSpomovePreset } from '../spomove/officialSpomovePresets';
import { SpomoveGuidelineSheet } from '../spomove/SpomoveGuidelineSheet';
import { getSpomovePresetDisplayModel } from '../spomove/spomovePresetDisplayModel';
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

  const programById = useMemo(() => new Map(programs.map((program) => [program.id, program])), [programs]);
  const spomoveById = useMemo(() => new Map(OFFICIAL_SPOMOVE_LIBRARY.filter(isHubListedPreset).map((preset) => [preset.id, preset])), []);
  const visible = refs.filter((ref) => filter === 'all' || ref.type === filter);

  return <main className="h-full overflow-y-auto bg-[var(--spm-bg)] pb-28 lg:pb-8">
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:py-8">
      <header className="border-b border-slate-200 pb-5"><h1 className="text-[28px] font-bold text-slate-950">즐겨찾기</h1></header>
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
          return <article key={`spomove:${ref.id}`} className="relative overflow-hidden rounded-2xl bg-[#101936] text-white"><button type="button" onClick={() => setPreviewPreset(preset)} className="flex min-h-64 w-full flex-col justify-between p-5 text-left"><span className="grid h-12 w-12 place-items-center rounded-full bg-white/10"><MonitorPlay /></span><span><span className="text-[13px] font-medium text-indigo-200">SPOMOVE</span><strong className="mt-2 block text-[18px] font-semibold">{model.displayTitle}</strong><span className="mt-2 block text-[14px] text-slate-300">Guide를 확인하고 활동을 시작하세요.</span></span></button><button type="button" onClick={() => remove(ownerId, ref)} className="absolute right-3 top-3 grid h-11 w-11 place-items-center rounded-full bg-white/10 text-amber-300" aria-label={`${model.displayTitle} 즐겨찾기에서 제거`}><Bookmark className="h-5 w-5 fill-current" /></button></article>;
        })}
      </section> : <section className="mt-12 text-center"><Bookmark className="mx-auto h-7 w-7 text-slate-300" /><h2 className="mt-3 text-[20px] font-semibold text-slate-900">저장한 콘텐츠가 없습니다.</h2><p className="mt-2 text-[14px] text-slate-500">Programs에서 마음에 드는 활동을 저장해 보세요.</p></section>}
    </div>
    <SpomoveGuidelineSheet preset={previewPreset} guideVideoUrl={guideVideo.url} guideVideoState={guideVideo.state} contentLoadState="ready" hubReturnHref="/spokedu-master/favorites" onClose={() => setPreviewPreset(null)} />
  </main>;
}
