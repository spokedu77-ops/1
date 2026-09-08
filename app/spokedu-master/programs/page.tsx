'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { getPublicUrl, withPublicUrlCacheBust } from '@/app/lib/admin/assets/storageClient';
import { getSupabaseBrowserClient } from '@/app/lib/supabase/browser';
import { resolveSpomovePackCacheBust } from '@/app/lib/spomove/spomoveAssetCacheVersion';
import { MasterPageHeader, MasterPageShell } from '../components/ui/MasterPrimitives';
import {
  normalizeProgramGatewayMedia,
  PROGRAM_GATEWAY_PACK_ID,
  resolveProgramGatewayHero,
} from '../lib/programGatewayAssets';

type ProgramGatewayQueryResult = {
  data: { assets_json?: unknown; updated_at?: string | null } | null;
  error: { code?: string } | null;
};

export default function ProgramsPage() {
  const [lessonHero, setLessonHero] = useState<string | null>(null);
  const [spomoveHero, setSpomoveHero] = useState<string | null>(null);
  const [heroCacheBust, setHeroCacheBust] = useState<number | undefined>();
  const [gatewayMediaLoaded, setGatewayMediaLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    const supabase = getSupabaseBrowserClient();

    void supabase
      .from('think_asset_packs')
      .select('assets_json, updated_at')
      .eq('id', PROGRAM_GATEWAY_PACK_ID)
      .maybeSingle()
      .then((result: ProgramGatewayQueryResult) => {
        if (!alive) return;
        const gateway = result;
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
        setGatewayMediaLoaded(true);
      })
      .catch(() => {
        if (alive) setGatewayMediaLoaded(true);
      });

    return () => {
      alive = false;
    };
  }, []);

  const lessonHeroSrc = !gatewayMediaLoaded
    ? null
    : lessonHero
    ? withPublicUrlCacheBust(getPublicUrl(lessonHero), heroCacheBust)
    : resolveProgramGatewayHero({ lessonHero: null, spomoveHero: null }, 'lessonHero');
  const spomoveHeroSrc = !gatewayMediaLoaded
    ? null
    : spomoveHero
    ? withPublicUrlCacheBust(getPublicUrl(spomoveHero), heroCacheBust)
    : resolveProgramGatewayHero({ lessonHero: null, spomoveHero: null }, 'spomoveHero');

  return (
    <main className="h-full overflow-y-auto bg-[var(--spm-bg)] pb-24 lg:pb-0">
      <MasterPageShell
        variant="editorial"
        className="flex min-h-full max-w-[1120px] flex-col pb-10 sm:pb-12 lg:pb-14"
      >
        <MasterPageHeader title="프로그램" description="수업에 맞는 프로그램을 선택하세요." />

        <div className="flex flex-1 items-start py-10 sm:py-12 lg:items-center lg:pb-28 lg:pt-10">
          <div className="grid w-full gap-6 md:grid-cols-2 lg:gap-8">
            <ProgramGatewayCard
              title="놀이체육"
              description="다양한 교구와 움직임으로 구성하는 현장 체육활동"
              action="놀이체육 둘러보기"
              href="/spokedu-master/library"
              image={lessonHeroSrc}
            />
            <ProgramGatewayCard
              title="SPOMOVE"
              description="화면 자극과 움직임을 연결하는 시지각 움직임 프로그램"
              action="SPOMOVE 둘러보기"
              href="/spokedu-master/spomove"
              image={spomoveHeroSrc}
            />
          </div>
        </div>
      </MasterPageShell>
    </main>
  );
}

function ProgramGatewayCard({
  title,
  description,
  action,
  href,
  image,
  imagePosition = 'center 25%',
}: {
  title: string;
  description: string;
  action: string;
  href: string;
  image: string | null;
  imagePosition?: string;
}) {
  return (
    <Link
      href={href}
      className="group flex min-w-0 flex-col overflow-hidden rounded-[18px] border border-slate-200 bg-white transition-colors hover:border-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--spm-acc)] focus-visible:ring-offset-2"
    >
      <div className="relative aspect-[16/9] overflow-hidden bg-slate-200">
        {image ? (
          <Image
            src={image}
            alt=""
            fill
            sizes="(min-width: 1024px) 40vw, 100vw"
            loading="eager"
            className="object-cover"
            style={{ objectPosition: imagePosition }}
          />
        ) : (
          <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-slate-100 via-slate-200 to-slate-100" aria-hidden="true" />
        )}
      </div>
      <div className="flex flex-1 flex-col px-5 pb-5 pt-[18px] sm:px-6 sm:pb-6 sm:pt-5">
        <h2 className="text-[24px] font-semibold tracking-[-0.02em] text-slate-950">{title}</h2>
        <p className="mt-2 text-[15px] font-normal leading-6 text-slate-600">{description}</p>
        <span className="mt-4 inline-flex min-h-11 items-center gap-1.5 self-start text-[14px] font-semibold text-slate-700 transition-colors group-hover:text-slate-950 sm:mt-5">
          {action}
          <span aria-hidden="true">→</span>
        </span>
      </div>
    </Link>
  );
}
