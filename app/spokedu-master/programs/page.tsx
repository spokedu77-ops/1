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
      });

    return () => {
      alive = false;
    };
  }, []);

  const lessonHeroSrc = lessonHero
    ? withPublicUrlCacheBust(getPublicUrl(lessonHero), heroCacheBust)
    : resolveProgramGatewayHero({ lessonHero: null, spomoveHero: null }, 'lessonHero');
  const spomoveHeroSrc = spomoveHero
    ? withPublicUrlCacheBust(getPublicUrl(spomoveHero), heroCacheBust)
    : resolveProgramGatewayHero({ lessonHero: null, spomoveHero: null }, 'spomoveHero');

  return (
    <main className="h-full overflow-y-auto bg-[var(--spm-bg)] pb-28 lg:pb-8">
      <MasterPageShell variant="editorial">
        <MasterPageHeader title="프로그램" description="수업 방식에 맞는 콘텐츠를 선택하세요." />

        <div className="mt-9 grid gap-6 lg:grid-cols-2 lg:gap-7">
          <ProgramGatewayCard
            title="놀이체육"
            description="현장에서 바로 활용하는 놀이·뉴스포츠 수업"
            meta="놀이체육 · 뉴스포츠 · 협동/경쟁 활동"
            action="놀이체육 둘러보기"
            href="/spokedu-master/library"
            image={lessonHeroSrc}
          />
          <ProgramGatewayCard
            title="SPOMOVE"
            description="화면 자극과 움직임을 연결하는 디지털 활동"
            meta="시지각 · 반응 · 인지 자극"
            action="SPOMOVE 둘러보기"
            href="/spokedu-master/spomove"
            image={spomoveHeroSrc}
          />
        </div>

        <section aria-labelledby="program-decision-guide" className="mt-14 border-t border-slate-200 pb-14 pt-6 lg:mt-16 lg:pb-16">
          <h2
            id="program-decision-guide"
            className="text-[21px] font-semibold tracking-[-0.015em] text-slate-950"
          >
            어떤 프로그램이 맞을까요?
          </h2>
          <div className="mt-5 grid gap-6 sm:grid-cols-2 sm:gap-0">
            <DecisionGuideColumn
              title="놀이체육"
              items={['교구와 신체활동 중심', '다양한 종목 · 협동 · 경쟁 활동', '폭넓은 현장 수업 구성']}
            />
            <DecisionGuideColumn
              title="SPOMOVE"
              items={['화면 자극과 움직임 중심', '시지각 · 반응 · 인지 자극', '디지털 활동으로 수업 확장']}
              className="border-t border-slate-200 pt-6 sm:border-l sm:border-t-0 sm:pl-8 sm:pt-0"
            />
          </div>
        </section>
      </MasterPageShell>
    </main>
  );
}

function ProgramGatewayCard({
  title,
  description,
  meta,
  action,
  href,
  image,
}: {
  title: string;
  description: string;
  meta: string;
  action: string;
  href: string;
  image: string;
}) {
  return (
    <Link
      href={href}
      className="group overflow-hidden rounded-[18px] border border-slate-200 bg-white transition-colors hover:border-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"
    >
      <div className="relative aspect-[16/9] overflow-hidden bg-slate-200">
        <Image
          src={image}
          alt=""
          fill
          sizes="(min-width: 1024px) 40vw, 100vw"
          className="object-cover transition-transform duration-300 group-hover:scale-[1.012]"
        />
      </div>
      <div className="px-[18px] pb-5 pt-4">
        <h2 className="text-[24px] font-semibold tracking-[-0.02em] text-slate-950">{title}</h2>
        <p className="mt-1.5 text-[15px] font-medium leading-[1.5] text-slate-600">{description}</p>
        <p className="mt-2 text-[13px] font-medium text-slate-400">{meta}</p>
        <span className="mt-4 inline-flex items-center gap-1 text-[14px] font-semibold text-slate-700 transition-colors group-hover:text-slate-950">
          {action}
          <span aria-hidden="true">→</span>
        </span>
      </div>
    </Link>
  );
}

function DecisionGuideColumn({
  title,
  items,
  className = '',
}: {
  title: string;
  items: readonly string[];
  className?: string;
}) {
  return (
    <div className={`sm:pr-8 ${className}`}>
      <h3 className="text-[16px] font-semibold text-slate-900">{title}</h3>
      <ul className="mt-3 space-y-1.5 text-[14px] leading-[1.65] text-slate-600">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
