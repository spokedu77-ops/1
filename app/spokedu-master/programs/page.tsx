'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { getPublicUrl, withPublicUrlCacheBust } from '@/app/lib/admin/assets/storageClient';
import { getSupabaseBrowserClient } from '@/app/lib/supabase/browser';
import { resolveSpomovePackCacheBust } from '@/app/lib/spomove/spomoveAssetCacheVersion';
import { ArrowRight, Lightbulb } from 'lucide-react';
import styles from './Programs.module.css';
import { nextImageUnoptimized } from '../lib/mediaPreferences';
import {
  normalizeProgramGatewayMedia,
  PROGRAM_GATEWAY_PACK_ID,
  resolveProgramGatewayHero,
} from '../lib/programGatewayAssets';
import { readProgramGatewayMediaCache, writeProgramGatewayMediaCache } from '../lib/programGatewayMediaCache';

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
    const cached = readProgramGatewayMediaCache();
    if (cached) {
      setLessonHero(cached.media.lessonHero);
      setSpomoveHero(cached.media.spomoveHero);
      setHeroCacheBust(cached.cacheBust);
      setGatewayMediaLoaded(true);
      return () => {
        alive = false;
      };
    }

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
          const cacheBust = resolveSpomovePackCacheBust(
            gateway.data?.updated_at as string | undefined,
            [media.lessonHero, media.spomoveHero].filter(Boolean) as string[],
          );
          setHeroCacheBust(cacheBust);
          writeProgramGatewayMediaCache({ media, cacheBust });
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
    <main className={styles.page} data-program-gateway>
      <div className={styles.shell}>
        <header className={styles.header}>
          <h1>프로그램 선택</h1>
          <p className={styles.desktopIntro}>수업 환경과 목표에 맞는 프로그램을 선택해 보세요.</p>
          <p className={styles.mobileIntro}>수업에 활용할 프로그램을 선택해 보세요.</p>
        </header>
        <div className={styles.grid}>
          <ProgramGatewayCard title="놀이체육" tier="라이트 · 프리미엄"
            materials="활동별 교구"
            description="다양한 교구와 움직임을 활용하는 체육 활동"
            href="/spokedu-lab/library" image={lessonHeroSrc} />
          <ProgramGatewayCard title="SPOMOVE" tier="프리미엄 전용"
            materials="화면 출력 장치"
            description="시각정보를 인지하고 움직임으로 반응하는 놀이체육"
            href="/spokedu-lab/spomove" image={spomoveHeroSrc} digital />
        </div>
        <aside className={styles.assist}>
          <span className={styles.assistIcon}><Lightbulb size={22} aria-hidden="true" /></span>
          <div><h2>놀이체육과 SPOMOVE의 연계 수업</h2><p>두 프로그램을 수업 목표와 환경에 맞게 함께 활용할 수 있습니다.</p></div>
        </aside>
      </div>
    </main>
  );
}

function ProgramGatewayCard({ title, tier, materials, description, href, image, digital = false }: {
  title: string; tier: string; description: string;
  materials: string;
  href: string; image: string | null; digital?: boolean;
}) {
  return (
    <article className={`${styles.card} ${digital ? styles.digital : ''}`}>
      <div className={styles.cardHeader}><span className={styles.tier}>{tier}</span></div>
      <div className={styles.hero}>
        {image ? <Image src={image} alt="" fill sizes="(min-width: 1024px) 504px, 50vw" loading="eager" unoptimized={nextImageUnoptimized(image)} className={styles.photo} /> : <div className={styles.placeholder} aria-hidden="true" />}
      </div>
      <div className={styles.body}>
        <div><div className={styles.title}><h2>{title}</h2></div><p className={styles.description}>{description}</p></div>
        <dl className={styles.specs}><div><dt>대상</dt><dd>{digital ? '유아 · 초등 · 특수체육' : '유아 · 초등'}</dd></div><div><dt>공간</dt><dd>{digital ? '체육관 · 교실' : '체육관 · 교실 · 운동장'}</dd></div><div><dt>준비물</dt><dd>{materials}</dd></div></dl>
        <Link href={href} className={styles.action}>{title} 시작하기<ArrowRight size={18} aria-hidden="true" /></Link>
      </div>
    </article>
  );
}
