'use client';

import { Image as ImageIcon, Lock, MonitorPlay } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { getSupabaseBrowserClient } from '@/app/lib/supabase/browser';
import {
  getPublicUrl,
  withPublicUrlCacheBust,
} from '@/app/lib/admin/assets/storageClient';
import { resolveSpomovePackCacheBust } from '@/app/lib/spomove/spomoveAssetCacheVersion';
import { SPOMOVE_AXIS_META } from '@/app/lib/spomove/spomoveAxisMeta';

import {
  OFFICIAL_SPOMOVE_LIBRARY,
  officialPresetSessionHref,
  type OfficialSpomovePreset,
  type OfficialSpomoveProgramGroup,
} from './officialSpomovePresets';
import {
  SPOMOVE_RESPONSE_TYPE_LABELS,
  SPOMOVE_TARGET_GROUP_LABELS,
  SPOMOVE_THINKING_LEVEL_LABELS,
  getOfficialSpomovePresetGuide,
} from './officialSpomovePresetGuides';

type OfficialLibraryTab = 'all' | 'response' | 'attention' | 'executive';
type ProgramGroupTab = 'all' | Exclude<OfficialSpomoveProgramGroup, 'bonus'>;
type AccessState = 'checking' | 'allowed' | 'unauthorized' | 'forbidden' | 'error';
type SpomoveThumbnailAssetsJson = {
  thumbnails?: Record<string, string | null | undefined>;
};
type SpomoveThumbnailPackQueryResult = {
  data: { assets_json?: unknown; updated_at?: string | null } | null;
  error: { code?: string } | null;
};

const SPOMOVE_THUMBNAIL_PACK_ID = 'spokedu_master_official_spomove_thumbnails';

const TABS: OfficialLibraryTab[] = ['all', 'response', 'attention', 'executive'];

const TAB_LABELS: Record<OfficialLibraryTab, string> = {
  all: '전체',
  response: SPOMOVE_AXIS_META.response.title,
  attention: SPOMOVE_AXIS_META.attention.title,
  executive: SPOMOVE_AXIS_META.executive.title,
};

const PROGRAM_GROUP_TABS: ProgramGroupTab[] = [
  'all',
  'reaction-cognition',
  'visual-reaction',
  'simon',
  'flanker',
  'stroop',
  'sequential-memory',
  'dive',
];

const PROGRAM_GROUP_LABELS: Record<ProgramGroupTab, string> = {
  all: '전체',
  'reaction-cognition': '반응 인지',
  'visual-reaction': '시지각 반응',
  simon: '사이먼 효과',
  flanker: '플랭커',
  stroop: '스트룹 과제',
  'sequential-memory': '순차 기억',
  dive: '다이브',
};

const AXIS_BADGE: Record<OfficialSpomovePreset['axis'], string> = {
  response: 'bg-orange-50 text-orange-700',
  attention: 'bg-blue-50 text-blue-700',
  executive: 'bg-violet-50 text-violet-700',
};

function tabCount(tab: OfficialLibraryTab) {
  if (tab === 'all') return OFFICIAL_SPOMOVE_LIBRARY.length;
  return OFFICIAL_SPOMOVE_LIBRARY.filter((p) => p.axis === tab).length;
}

function programGroupCount(tab: ProgramGroupTab) {
  if (tab === 'all') return OFFICIAL_SPOMOVE_LIBRARY.length;
  if (tab === 'dive') {
    return OFFICIAL_SPOMOVE_LIBRARY.filter((p) => p.programGroup === 'dive' || p.programGroup === 'bonus').length;
  }
  return OFFICIAL_SPOMOVE_LIBRARY.filter((p) => p.programGroup === tab).length;
}

function normalizeSpomoveThumbnailMap(raw: unknown) {
  const source = (raw as SpomoveThumbnailAssetsJson | null)?.thumbnails;
  if (!source || typeof source !== 'object') return {};
  const validPresetIds = new Set(OFFICIAL_SPOMOVE_LIBRARY.map((preset) => preset.id));
  const next: Record<string, string> = {};
  for (const [presetId, path] of Object.entries(source)) {
    if (!validPresetIds.has(presetId)) continue;
    if (typeof path === 'string' && path.trim()) next[presetId] = path.trim();
  }
  return next;
}

function resolveThumbnailUrl(path: string | null | undefined, cacheBust?: number) {
  if (!path) return '';
  try {
    return withPublicUrlCacheBust(getPublicUrl(path), cacheBust);
  } catch {
    return '';
  }
}

function PresetCard({
  preset,
  href,
  thumbnailUrl,
}: {
  preset: OfficialSpomovePreset;
  href: string;
  thumbnailUrl: string;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const guide = getOfficialSpomovePresetGuide(preset);
  const showThumbnail = Boolean(thumbnailUrl) && !imageFailed;
  const targetLine = guide.targetGroups.map((t) => SPOMOVE_TARGET_GROUP_LABELS[t]).join(' · ');
  const thinkingLabel = SPOMOVE_THINKING_LEVEL_LABELS[guide.thinkingLevel];
  const responseLabel = SPOMOVE_RESPONSE_TYPE_LABELS[guide.responseType];

  return (
    <article className="overflow-hidden rounded-[16px] border border-slate-100 bg-white shadow-sm transition-shadow hover:shadow-md">
      <div className="flex flex-col sm:flex-row">
        {/* 썸네일: 모바일 16:9 상단, sm+ 좌측 고정폭·행높이 맞춤 */}
        <div className="relative aspect-[16/9] shrink-0 overflow-hidden bg-slate-100 sm:aspect-auto sm:w-[34%] sm:self-stretch">
          {showThumbnail ? (
            <Image
              src={thumbnailUrl}
              alt=""
              fill
              unoptimized
              sizes="(min-width: 1280px) 14vw, (min-width: 640px) 17vw, 100vw"
              className="object-cover"
              onError={() => setImageFailed(true)}
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-slate-300">
              <ImageIcon className="h-5 w-5" />
              <span className="text-[10px] font-black tracking-wide">SPOMOVE</span>
            </div>
          )}
        </div>

        {/* 정보 영역 */}
        <div className="flex flex-1 flex-col p-4">
          {/* 프로그램군 배지 */}
          <div className="flex flex-wrap items-center gap-1">
            <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-black tracking-wide ${AXIS_BADGE[preset.axis]}`}>
              {preset.axisTitle}
            </span>
            <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
              {preset.programTitle}
            </span>
          </div>

          {/* 제목 */}
          <h2 className="mt-1.5 line-clamp-1 text-[16px] font-black leading-snug text-slate-950">
            {preset.title}
          </h2>

          {/* 한 줄 설명 */}
          <p className="mt-1 line-clamp-2 text-[13px] font-medium leading-snug text-slate-600 sm:line-clamp-1">
            {preset.description}
          </p>

          {/* 추천 대상 */}
          <p className="mt-1.5 truncate text-[12px] font-semibold text-slate-500">
            {targetLine}
          </p>

          {/* 생각 난이도 · 반응 유형 */}
          <p className="mt-0.5 text-[12px] font-semibold text-slate-500">
            <span className="font-black text-slate-700">난이도 {thinkingLabel}</span>
            <span className="mx-1 text-slate-300">·</span>
            {responseLabel}
          </p>

          {/* 실행 설정 요약 + 실행 버튼 */}
          <div className="mt-auto flex flex-col gap-2 pt-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
            <p className="line-clamp-2 text-[11px] font-semibold leading-snug text-slate-400 sm:line-clamp-1 sm:flex-1">
              {preset.settingSummary}
            </p>
            <Link
              href={href}
              className="inline-flex h-11 w-full shrink-0 items-center justify-center gap-1.5 rounded-[12px] bg-slate-950 text-[13px] font-black text-white transition-colors hover:bg-indigo-600 sm:h-9 sm:w-auto sm:rounded-[10px] sm:px-3.5 sm:text-[12px]"
            >
              <MonitorPlay className="h-[14px] w-[14px] sm:h-[13px] sm:w-[13px]" />
              큰 화면으로 실행
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}

export default function SpomoveHubView() {
  const [activeTab, setActiveTab] = useState<OfficialLibraryTab>('all');
  const [activeProgramGroup, setActiveProgramGroup] = useState<ProgramGroupTab>('all');
  const [accessState, setAccessState] = useState<AccessState>('checking');
  const [thumbnailPaths, setThumbnailPaths] = useState<Record<string, string>>({});
  const [thumbnailCacheBust, setThumbnailCacheBust] = useState<number | undefined>();

  useEffect(() => {
    let alive = true;
    fetch('/api/spokedu-master/access', { cache: 'no-store' })
      .then((response) => {
        if (!alive) return;
        if (response.ok) setAccessState('allowed');
        else if (response.status === 401) setAccessState('unauthorized');
        else if (response.status === 403) setAccessState('forbidden');
        else setAccessState('error');
      })
      .catch(() => {
        if (alive) setAccessState('error');
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;
    const supabase = getSupabaseBrowserClient();
    supabase
      .from('think_asset_packs')
      .select('assets_json, updated_at')
      .eq('id', SPOMOVE_THUMBNAIL_PACK_ID)
      .maybeSingle()
      .then((result: SpomoveThumbnailPackQueryResult) => {
        if (!alive) return;
        const { data, error } = result;
        if (error && error.code !== 'PGRST116') {
          setThumbnailPaths({});
          setThumbnailCacheBust(undefined);
          return;
        }
        const next = normalizeSpomoveThumbnailMap(data?.assets_json);
        setThumbnailPaths(next);
        setThumbnailCacheBust(resolveSpomovePackCacheBust(data?.updated_at as string | undefined, Object.values(next)));
      })
      .catch(() => {
        if (!alive) return;
        setThumbnailPaths({});
        setThumbnailCacheBust(undefined);
      });
    return () => {
      alive = false;
    };
  }, []);

  if (accessState === 'checking') {
    return (
      <main className="flex h-full items-center justify-center bg-[#f5f7fb]" aria-busy="true">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
      </main>
    );
  }

  if (accessState !== 'allowed') {
    const message =
      accessState === 'unauthorized'
        ? '로그인 후 SPOMOVE를 이용할 수 있습니다.'
        : accessState === 'forbidden'
          ? '이용 기간이 종료되어 SPOMOVE를 실행할 수 없습니다.'
          : 'SPOMOVE 이용 권한을 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.';
    return (
      <main className="flex h-full items-center justify-center overflow-y-auto bg-[#f5f7fb] px-4 py-16">
        <section className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-7 text-center shadow-sm">
          <Lock className="mx-auto h-6 w-6 text-slate-400" />
          <h1 className="mt-4 text-xl font-black text-slate-950">SPOMOVE를 실행할 수 없습니다.</h1>
          <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">{message}</p>
          <Link
            href="/spokedu-master/subscription"
            className="mt-5 inline-flex h-11 items-center justify-center rounded-xl bg-indigo-600 px-5 text-sm font-black text-white"
          >
            이용권 확인
          </Link>
        </section>
      </main>
    );
  }

  const filteredPresets = OFFICIAL_SPOMOVE_LIBRARY.filter((p) => {
    const axisMatch = activeTab === 'all' || p.axis === activeTab;
    const groupMatch =
      activeProgramGroup === 'all' ||
      p.programGroup === activeProgramGroup ||
      (activeProgramGroup === 'dive' && p.programGroup === 'bonus');
    return axisMatch && groupMatch;
  });

  return (
    <main className="h-full overflow-y-auto bg-[#f5f7fb]">
      <div className="mx-auto w-full max-w-7xl px-4 pb-24 pt-6 sm:px-6 lg:px-8 lg:pb-16">
        <header className="overflow-hidden rounded-[28px] bg-slate-950 px-6 py-10 text-white shadow-xl sm:px-10 sm:py-12">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 text-[12px] font-black text-white/80">
            <MonitorPlay className="h-3.5 w-3.5" />
            구독자 공식 라이브러리
          </span>
          <h1 className="mt-5 text-[34px] font-black leading-tight sm:text-[46px]">
            SPOMOVE 공식 프로그램
          </h1>
          <p className="mt-4 max-w-2xl text-[14px] font-medium leading-7 text-white/58">
            바로 실행할 수 있는 구독자용 SPOMOVE 공식 세팅 라이브러리입니다. 단순·선택·복합 반응 축을 기준으로
            아이들이 보고, 고르고, 기억하고, 움직이는 경험을 제공합니다.
          </p>
          <p className="mt-3 text-[12px] font-semibold text-white/30">
            각 프로그램은 사전 설정된 공식 조건으로 실행됩니다.
          </p>
        </header>

        <div className="mt-6 flex flex-wrap gap-2">
          {TABS.map((tab) => {
            const active = activeTab === tab;
            const count = tabCount(tab);
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-black transition-all ${
                  active
                    ? 'bg-slate-950 text-white shadow-sm'
                    : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900'
                }`}
              >
                {TAB_LABELS[tab]}
                <span
                  className={`inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-black ${
                    active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {PROGRAM_GROUP_TABS.map((tab) => {
            const active = activeProgramGroup === tab;
            const count = programGroupCount(tab);
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveProgramGroup(tab)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12px] font-bold transition-all ${
                  active
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'border border-slate-200 bg-white text-slate-500 hover:border-indigo-200 hover:text-indigo-700'
                }`}
              >
                {PROGRAM_GROUP_LABELS[tab]}
                <span
                  className={`inline-flex h-[16px] min-w-[16px] items-center justify-center rounded-full px-1 text-[10px] font-black ${
                    active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredPresets.map((preset) => (
            <PresetCard
              key={preset.id}
              preset={preset}
              href={officialPresetSessionHref(preset)}
              thumbnailUrl={resolveThumbnailUrl(thumbnailPaths[preset.id], thumbnailCacheBust)}
            />
          ))}
        </div>
      </div>
    </main>
  );
}
