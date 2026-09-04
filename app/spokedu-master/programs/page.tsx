'use client';

import { ArrowRight } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { getSupabaseBrowserClient } from '@/app/lib/supabase/browser';
import { getPublicUrl, withPublicUrlCacheBust } from '@/app/lib/admin/assets/storageClient';
import { resolveSpomovePackCacheBust } from '@/app/lib/spomove/spomoveAssetCacheVersion';
import {
  normalizeSpomoveHomeFeaturedSlots,
  SPOMOVE_HOME_FEATURED_PACK_ID,
} from '@/app/lib/spomove/spomoveOfficialAssets';
import { MasterPageHeader, MasterPageShell } from '../components/ui/MasterPrimitives';
import { isProgramHomeRecommendationEligible } from '../lib/program-meta';
import {
  normalizeProgramGatewayMedia,
  PROGRAM_GATEWAY_PACK_ID,
  resolveProgramGatewayHero,
} from '../lib/programGatewayAssets';
import { resolveHomeFeaturedSpomove } from '../lib/spomoveHomeFeatured';
import { selectWeeklyRecommendationSlots } from '../lib/weeklyRecommendations';
import { useMasterStore } from '../store';
import { getSpomovePresetDisplayModel } from '../spomove/spomovePresetDisplayModel';

function normalizeTitle(title: string) {
  return title.toLowerCase().replace(/\s+/g, '').replace(/[^\w가-힣]/g, '');
}

export default function ProgramsPage() {
  const programs = useMasterStore((state) => state.programs);
  const [featuredSlotIds, setFeaturedSlotIds] = useState<Array<string | null>>([null, null, null, null]);
  const [lessonHero, setLessonHero] = useState<string | null>(null);
  const [spomoveHero, setSpomoveHero] = useState<string | null>(null);
  const [heroCacheBust, setHeroCacheBust] = useState<number | undefined>();

  useEffect(() => {
    let alive = true;
    const supabase = getSupabaseBrowserClient();
    void Promise.all([
      supabase.from('think_asset_packs').select('assets_json').eq('id', SPOMOVE_HOME_FEATURED_PACK_ID).maybeSingle(),
      supabase
        .from('think_asset_packs')
        .select('assets_json, updated_at')
        .eq('id', PROGRAM_GATEWAY_PACK_ID)
        .maybeSingle(),
    ]).then(([featuredResult, gatewayResult]) => {
      if (!alive) return;
      const featured = featuredResult as { data: { assets_json?: unknown } | null; error: { code?: string } | null };
      if (!featured.error || featured.error.code === 'PGRST116') {
        setFeaturedSlotIds(normalizeSpomoveHomeFeaturedSlots(featured.data?.assets_json));
      }
      const gateway = gatewayResult as {
        data: { assets_json?: unknown; updated_at?: string | null } | null;
        error: { code?: string } | null;
      };
      if (!gateway.error || gateway.error.code === 'PGRST116') {
        const media = normalizeProgramGatewayMedia(gateway.data?.assets_json);
        setLessonHero(media.lessonHero);
        setSpomoveHero(media.spomoveHero);
        setHeroCacheBust(
          resolveSpomovePackCacheBust(
            gateway.data?.updated_at as string | undefined,
            [media.lessonHero, media.spomoveHero].filter(Boolean) as string[],
          ),
        );
      }
    });
    return () => {
      alive = false;
    };
  }, []);

  const weeklyPrograms = useMemo(
    () =>
      selectWeeklyRecommendationSlots(programs, {
        isRecommendationEligible: (program) => !program.isPro && isProgramHomeRecommendationEligible(program),
        compareFallback: (a, b) => Number(b.isHot) - Number(a.isHot),
        normalizeTitle,
      }).programs.slice(0, 2),
    [programs],
  );
  const featuredSpomove = useMemo(
    () => resolveHomeFeaturedSpomove(featuredSlotIds).slice(0, 2),
    [featuredSlotIds],
  );
  const lessonHeroSrc = lessonHero
    ? withPublicUrlCacheBust(getPublicUrl(lessonHero), heroCacheBust)
    : resolveProgramGatewayHero({ lessonHero: null, spomoveHero: null }, 'lessonHero');
  const spomoveHeroSrc = spomoveHero
    ? withPublicUrlCacheBust(getPublicUrl(spomoveHero), heroCacheBust)
    : resolveProgramGatewayHero({ lessonHero: null, spomoveHero: null }, 'spomoveHero');

  return (
    <main className="h-full overflow-y-auto bg-[var(--spm-bg)] pb-28 lg:pb-8">
      <MasterPageShell variant="editorial">
        <MasterPageHeader title="수업 프로그램" description="오늘 어떤 수업을 준비하시나요?" />

        <GatewaySection
          title="놀이체육"
          description="현장에서 바로 활용하는 놀이·뉴스포츠 활동"
          href="/spokedu-master/library"
          action="전체 놀이체육 보기"
          image={lessonHeroSrc}
          items={weeklyPrograms.map((program) => ({
            id: program.id,
            title: program.title,
            href: `/spokedu-master/library/${program.id}`,
            meta: program.theme || '놀이체육',
          }))}
        />

        <GatewaySection
          title="SPOMOVE"
          description="화면과 움직임을 연결하는 디지털 활동"
          href="/spokedu-master/spomove"
          action="전체 SPOMOVE 보기"
          image={spomoveHeroSrc}
          items={featuredSpomove.map((preset) => {
            const model = getSpomovePresetDisplayModel(preset);
            return {
              id: preset.id,
              title: model.displayTitle,
              href: `/spokedu-master/spomove?q=${encodeURIComponent(model.displayTitle)}`,
              meta: model.programLabel,
            };
          })}
        />
      </MasterPageShell>
    </main>
  );
}

function GatewaySection({
  title,
  description,
  href,
  action,
  image,
  items,
}: {
  title: string;
  description: string;
  href: string;
  action: string;
  image: string;
  items: Array<{ id: string; title: string; href: string; meta: string }>;
}) {
  return (
    <section className="mt-8" aria-labelledby={`${title}-gateway`}>
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h2 id={`${title}-gateway`} className="text-[22px] font-semibold text-slate-950">
            {title}
          </h2>
          <p className="mt-1 text-[14px] font-medium text-slate-500">{description}</p>
        </div>
        <Link
          href={href}
          className="inline-flex min-h-11 shrink-0 items-center gap-1 text-[13px] font-semibold text-slate-600 hover:text-slate-950"
        >
          {action}
          <ArrowRight size={14} />
        </Link>
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)] lg:items-start">
        <Link href={href} className="relative block aspect-[16/9] overflow-hidden rounded-[18px] bg-slate-200">
          <Image src={image} alt="" fill sizes="(min-width: 1024px) 55vw, 100vw" className="object-cover" />
        </Link>
        <div className="flex min-w-0 flex-col justify-center gap-2">
          {items.length > 0 ? (
            items.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className="rounded-[12px] border border-slate-200 bg-white px-4 py-3 hover:border-slate-300"
              >
                <span className="block text-[12px] font-medium text-slate-500">{item.meta}</span>
                <strong className="mt-0.5 block truncate text-[16px] font-semibold text-slate-950">{item.title}</strong>
              </Link>
            ))
          ) : (
            <p className="rounded-[12px] border border-dashed border-slate-200 px-4 py-6 text-[13px] font-medium text-slate-500">
              대표 콘텐츠를 준비하는 중입니다.
            </p>
          )}
          <p className="px-1 text-[13px] font-medium leading-5 text-slate-500">{description}</p>
        </div>
      </div>
    </section>
  );
}
