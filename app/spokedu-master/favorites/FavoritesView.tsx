'use client';

import { Bookmark, Dumbbell, MonitorPlay } from 'lucide-react';
import Link from 'next/link';
import { useMemo } from 'react';

import { getFavoritesOwnerId, type FavoriteContentRef } from '../lib/favoriteLib';
import { useMasterStore } from '../store';
import { isHubListedPreset } from '../spomove/movements/isHubVisiblePreset';
import { OFFICIAL_SPOMOVE_LIBRARY, publicOfficialPresetSessionHref } from '../spomove/officialSpomovePresets';
import { getSpomovePresetDisplayModel } from '../spomove/spomovePresetDisplayModel';

export default function FavoritesView() {
  const profile = useMasterStore((state) => state.profile);
  const programs = useMasterStore((state) => state.programs);
  const ownerId = getFavoritesOwnerId(profile);
  const refs = useMasterStore((state) => ownerId ? state.favoriteContentRefsByOwner[ownerId] : undefined) ?? [];
  const remove = useMasterStore((state) => state.toggleFavoriteContent);

  const programById = useMemo(() => new Map(programs.map((program) => [program.id, program])), [programs]);
  const spomoveById = useMemo(() => new Map(OFFICIAL_SPOMOVE_LIBRARY.filter(isHubListedPreset).map((preset) => [preset.id, preset])), []);
  const visible = refs.reduce<Array<{ ref: FavoriteContentRef; title: string; href: string; domain: '놀이체육' | 'SPOMOVE' }>>((items, ref) => {
    if (ref.type === 'program') {
      const program = programById.get(ref.id);
      if (program) items.push({ ref, title: program.title, href: `/spokedu-master/library/${encodeURIComponent(program.id)}`, domain: '놀이체육' });
      return items;
    }
    if (ref.type === 'spomove') {
      const preset = spomoveById.get(ref.id);
      if (preset) items.push({ ref, title: getSpomovePresetDisplayModel(preset).displayTitle, href: publicOfficialPresetSessionHref(preset, { entry: 'start' }), domain: 'SPOMOVE' });
    }
    return items;
  }, []);

  return (
    <main className="h-full overflow-y-auto bg-[var(--spm-bg)] pb-28 lg:pb-8">
      <div className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6">
        <header className="border-b border-slate-200 pb-4">
          <p className="text-xs font-medium text-slate-500">SAVE · REUSE</p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-950">즐겨찾기</h1>
          <p className="mt-2 text-sm text-slate-600">저장한 놀이체육과 SPOMOVE 활동을 다시 찾습니다.</p>
        </header>
        {visible.length > 0 ? (
          <section className="mt-5 divide-y divide-slate-200 border-y border-slate-200 bg-white" aria-label="저장한 콘텐츠">
            {visible.map(({ ref, title, href, domain }) => (
              <article key={`${ref.type}:${ref.id}`} className="flex min-h-20 items-center gap-3 px-3 py-3">
                {ref.type === 'program' ? <Dumbbell className="h-5 w-5 shrink-0 text-slate-500" aria-hidden /> : <MonitorPlay className="h-5 w-5 shrink-0 text-slate-500" aria-hidden />}
                <Link href={href} className="min-w-0 flex-1 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--spm-acc)]">
                  <span className="block text-xs text-slate-500">{domain}</span>
                  <strong className="mt-0.5 block truncate text-sm font-semibold text-slate-950">{title}</strong>
                </Link>
                <button type="button" onClick={() => remove(ownerId, ref)} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-amber-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--spm-acc)]" aria-label={`${title} 즐겨찾기에서 제거`}>
                  <Bookmark className="h-5 w-5 fill-current" aria-hidden />
                </button>
              </article>
            ))}
          </section>
        ) : (
          <section className="mt-8 text-center">
            <Bookmark className="mx-auto h-7 w-7 text-slate-300" aria-hidden />
            <h2 className="mt-3 text-lg font-semibold text-slate-900">저장한 콘텐츠가 없습니다.</h2>
            <p className="mt-2 text-sm text-slate-500">프로그램에서 자주 쓸 활동을 저장해 보세요.</p>
            <Link href="/spokedu-master/programs" className="spm-btn-primary mt-5 inline-flex min-h-11 items-center justify-center rounded-xl px-5 text-sm font-semibold">프로그램 보기</Link>
          </section>
        )}
      </div>
    </main>
  );
}
