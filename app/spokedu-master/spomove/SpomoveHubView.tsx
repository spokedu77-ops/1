'use client';

import { Lock, MonitorPlay } from 'lucide-react';
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
import { getSpomovePresetDisplayModel } from './spomovePresetDisplayModel';

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

// 축별 accent bar 색상
const AXIS_ACCENT: Record<OfficialSpomovePreset['axis'], string> = {
  response: 'bg-orange-400',
  attention: 'bg-blue-400',
  executive: 'bg-violet-500',
};

// 축별 태그 색상 — accent bar가 색상 신호를 담당하므로 badge는 중립
const AXIS_BADGE: Record<OfficialSpomovePreset['axis'], string> = {
  response: 'bg-slate-100 text-slate-600',
  attention: 'bg-slate-100 text-slate-600',
  executive: 'bg-slate-100 text-slate-600',
};

// SPOMOVE 4색 시그니처
const PAD_COLORS = ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6'] as const;

function PadSignature({ dim = false }: { dim?: boolean }) {
  return (
    <div className="grid grid-cols-2 gap-[3px]">
      {PAD_COLORS.map((color, i) => (
        <div
          key={i}
          className="h-2 w-2 rounded-[2px]"
          style={{ background: color, opacity: dim ? 0.55 : 0.75 }}
        />
      ))}
    </div>
  );
}

// ── 프로그램별 시각 컴포넌트 ─────────────────────────────────────────────────

const THEME_LABELS: Record<string, string> = {
  fruit: '과일',
  vehicle: '탈것',
  emotion: '감정',
  animal: '동물',
  nature: '자연',
  target: '타겟',
};

function ThemeIcon({ theme, className = 'h-10 w-10 text-white/80' }: { theme?: string; className?: string }) {
  if (!theme || theme === 'color') return null;
  if (theme === 'fruit') return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="12" cy="14" r="7" />
      <path d="M12 7 Q13.5 3 17 4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
  if (theme === 'vehicle') return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M3 14 L5.5 8 A2 2 0 0 1 7.4 6.5 H16.6 A2 2 0 0 1 18.5 8 L21 14 V17.5 A1 1 0 0 1 20 18.5 H4 A1 1 0 0 1 3 17.5 Z" />
      <circle cx="7.5" cy="19.5" r="2.5" />
      <circle cx="16.5" cy="19.5" r="2.5" />
      <rect x="7.5" y="8" width="9" height="4.5" rx="1" fill="rgba(0,0,0,0.18)" />
    </svg>
  );
  if (theme === 'emotion') return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <circle cx="12" cy="12" r="9" fill="currentColor" fillOpacity="0.12" />
      <circle cx="12" cy="12" r="9" />
      <circle cx="9" cy="10.5" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="15" cy="10.5" r="1.5" fill="currentColor" stroke="none" />
      <path d="M8.5 15.5 Q12 18.5 15.5 15.5" strokeLinecap="round" />
    </svg>
  );
  if (theme === 'animal') return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <ellipse cx="7" cy="8.5" rx="2.5" ry="3.5" />
      <ellipse cx="17" cy="8.5" rx="2.5" ry="3.5" />
      <ellipse cx="12" cy="15" rx="5.5" ry="5" />
      <circle cx="10" cy="15" r="1" fill="rgba(0,0,0,0.22)" />
      <circle cx="14" cy="15" r="1" fill="rgba(0,0,0,0.22)" />
      <circle cx="12" cy="16.8" r="1.5" fill="rgba(0,0,0,0.18)" />
    </svg>
  );
  if (theme === 'nature') return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 3 C16 7 18 11.5 16 16.5 C14 13 12 22 12 22 C12 22 10 13 8 16.5 C6 11.5 8 7 12 3Z" />
      <line x1="12" y1="17" x2="12" y2="22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
  if (theme === 'target') return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
      <circle cx="12" cy="12" r="9.5" strokeOpacity="0.35" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="6" strokeOpacity="0.6" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="2.5" strokeOpacity="0.85" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
  return null;
}

function ThemeLabelBadge({ theme }: { theme?: string }) {
  const label = theme ? THEME_LABELS[theme] : undefined;
  if (!label) return null;
  return (
    <div className="absolute bottom-3 left-3">
      <span className="rounded-full bg-black/30 px-2.5 py-1 text-[10px] font-black tracking-wide text-white/90 backdrop-blur-[2px]">
        {label} 테마
      </span>
    </div>
  );
}

// level 2: 사분할 2×2
function QuadVisual({ theme }: { theme?: string }) {
  const isColorTheme = !theme || theme === 'color';
  if (isColorTheme) {
    return (
      <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 gap-[2px] bg-slate-950">
        {PAD_COLORS.map((color, i) => (
          <div key={i} style={{ background: color, opacity: 0.85 }} />
        ))}
      </div>
    );
  }
  return (
    <div className="relative flex h-full w-full items-center justify-center bg-slate-800">
      <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 gap-[2px]">
        {PAD_COLORS.map((color, i) => (
          <div key={i} style={{ background: color, opacity: 0.18 }} />
        ))}
      </div>
      <ThemeIcon theme={theme} className="relative z-10 h-12 w-12 text-white/80" />
      <ThemeLabelBadge theme={theme} />
    </div>
  );
}

// level 3: 전면 (단일 화면 신호)
function FullVisual({ theme }: { theme?: string }) {
  const isColorTheme = !theme || theme === 'color';
  if (isColorTheme) {
    return (
      <div className="relative flex h-full w-full items-center justify-center bg-slate-900">
        <div className="h-[62%] w-[68%] rounded-2xl" style={{ background: PAD_COLORS[0], opacity: 0.88 }} />
        <div className="absolute bottom-3 right-3">
          <PadSignature />
        </div>
      </div>
    );
  }
  return (
    <div className="relative flex h-full w-full items-center justify-center bg-slate-800">
      <div className="absolute inset-0" style={{ background: PAD_COLORS[0], opacity: 0.08 }} />
      <ThemeIcon theme={theme} className="relative z-10 h-14 w-14 text-white/85" />
      <ThemeLabelBadge theme={theme} />
      <div className="absolute bottom-3 right-3">
        <PadSignature dim />
      </div>
    </div>
  );
}

// level 4: 좌우 2분할
function TwoPanelVisual({ theme }: { theme?: string }) {
  const isColorTheme = !theme || theme === 'color';
  if (isColorTheme) {
    return (
      <div className="relative flex h-full w-full gap-[3px] bg-slate-950">
        <div className="flex-1" style={{ background: PAD_COLORS[0], opacity: 0.85 }} />
        <div className="flex-1" style={{ background: PAD_COLORS[1], opacity: 0.85 }} />
      </div>
    );
  }
  return (
    <div className="relative flex h-full w-full gap-[3px] bg-slate-800">
      <div className="flex-1" style={{ background: PAD_COLORS[0], opacity: 0.18 }} />
      <div className="flex-1" style={{ background: PAD_COLORS[1], opacity: 0.18 }} />
      <div className="absolute inset-0 flex items-center justify-center">
        <ThemeIcon theme={theme} className="h-12 w-12 text-white/80" />
      </div>
      <ThemeLabelBadge theme={theme} />
      <div className="absolute bottom-3 right-3">
        <PadSignature dim />
      </div>
    </div>
  );
}

// level 5: 3패널
function ThreePanelVisual({ theme }: { theme?: string }) {
  const isColorTheme = !theme || theme === 'color';
  if (isColorTheme) {
    return (
      <div className="relative flex h-full w-full gap-[3px] bg-slate-950">
        <div className="flex-1" style={{ background: PAD_COLORS[0], opacity: 0.85 }} />
        <div className="flex-1" style={{ background: PAD_COLORS[1], opacity: 0.85 }} />
        <div className="flex-1" style={{ background: PAD_COLORS[2], opacity: 0.85 }} />
      </div>
    );
  }
  return (
    <div className="relative flex h-full w-full gap-[3px] bg-slate-800">
      <div className="flex-1" style={{ background: PAD_COLORS[0], opacity: 0.18 }} />
      <div className="flex-1" style={{ background: PAD_COLORS[1], opacity: 0.18 }} />
      <div className="flex-1" style={{ background: PAD_COLORS[2], opacity: 0.18 }} />
      <div className="absolute inset-0 flex items-center justify-center">
        <ThemeIcon theme={theme} className="h-12 w-12 text-white/80" />
      </div>
      <ThemeLabelBadge theme={theme} />
      <div className="absolute bottom-3 right-3">
        <PadSignature dim />
      </div>
    </div>
  );
}

function DirectionArrowVisual() {
  return (
    <div className="relative flex h-full w-full items-center justify-center bg-gradient-to-br from-indigo-900 to-slate-900">
      <svg viewBox="0 0 80 80" className="h-[52px] w-[52px] text-white">
        <polygon points="40,9 33,23 47,23" fill="currentColor" opacity="0.9" />
        <polygon points="40,71 33,57 47,57" fill="currentColor" opacity="0.9" />
        <polygon points="9,40 23,33 23,47" fill="currentColor" opacity="0.9" />
        <polygon points="71,40 57,33 57,47" fill="currentColor" opacity="0.9" />
        <circle cx="40" cy="40" r="5" fill="currentColor" opacity="0.4" />
      </svg>
      <div className="absolute bottom-3 right-3">
        <PadSignature />
      </div>
    </div>
  );
}

function VisualReactionVisual() {
  return (
    <div className="relative flex h-full w-full items-center justify-center bg-gradient-to-br from-cyan-950 to-indigo-950 overflow-hidden">
      {[40, 30, 20, 12].map((r, i) => (
        <div
          key={i}
          className="absolute rounded-full border border-indigo-500/30"
          style={{ width: r * 2, height: r * 2 }}
        />
      ))}
      <div className="absolute h-3 w-3 rounded-full bg-indigo-400/90" />
      {/* Speed lines */}
      {[22, 38, 55, 70].map((y) => (
        <div
          key={y}
          className="absolute h-px bg-cyan-500/15"
          style={{ top: `${y}%`, left: '8%', width: '84%' }}
        />
      ))}
      <div className="absolute bottom-3 right-3">
        <PadSignature dim />
      </div>
    </div>
  );
}

function SimonVisual() {
  return (
    <div className="relative flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
      {/* Simon 4-pad compass layout */}
      <div className="relative h-[60px] w-[60px]">
        <div className="absolute left-[18px] top-0 h-[22px] w-[22px] rounded-lg bg-red-500 opacity-90" />
        <div className="absolute right-0 top-[18px] h-[22px] w-[22px] rounded-lg bg-blue-500 opacity-90" />
        <div className="absolute bottom-0 left-[18px] h-[22px] w-[22px] rounded-lg bg-emerald-500 opacity-90" />
        <div className="absolute left-0 top-[18px] h-[22px] w-[22px] rounded-lg bg-amber-400 opacity-90" />
        <div className="absolute left-[14px] top-[14px] h-[30px] w-[30px] rounded-xl border border-white/10 bg-slate-700" />
      </div>
      <div className="absolute bottom-3 left-3">
        <span className="rounded-full bg-white/10 px-2 py-0.5 text-[9px] font-black tracking-widest text-white/60">
          SIMON
        </span>
      </div>
      <div className="absolute bottom-3 right-3">
        <PadSignature dim />
      </div>
    </div>
  );
}

function FlankerVisual() {
  const rows = [
    ['←', '←', '→', '←', '←'],
    ['→', '→', '→', '→', '→'],
  ];
  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center gap-3 bg-gradient-to-br from-amber-50 to-slate-50">
      {rows.map((row, ri) => (
        <div key={ri} className="flex items-center gap-2">
          {row.map((arrow, ai) => (
            <span
              key={ai}
              className={`text-xl font-black leading-none ${
                ai === 2 ? 'text-indigo-600' : 'text-slate-300'
              }`}
            >
              {arrow}
            </span>
          ))}
        </div>
      ))}
      <div className="h-px w-14 bg-slate-200" />
      <span className="text-[9px] font-black tracking-widest text-slate-300">FLANKER</span>
      <div className="absolute bottom-3 right-3">
        <PadSignature dim />
      </div>
    </div>
  );
}

function StroopVisual() {
  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center gap-2.5 bg-gradient-to-br from-violet-50 to-slate-50">
      <span className="text-[26px] font-black leading-none text-blue-600">빨강</span>
      <div className="h-px w-10 bg-slate-200" />
      <span className="text-[26px] font-black leading-none text-red-500">파랑</span>
      <div className="absolute bottom-3 left-3">
        <span className="text-[9px] font-black tracking-widest text-slate-300">STROOP</span>
      </div>
      <div className="absolute bottom-3 right-3">
        <PadSignature dim />
      </div>
    </div>
  );
}

function SequentialMemoryVisual() {
  const lit: Record<number, string> = {
    0: '#22c55e',
    4: '#22c55e',
    2: '#22c55e',
  };
  const opacities: Record<number, number> = { 0: 1, 4: 0.65, 2: 0.35 };
  return (
    <div className="relative flex h-full w-full items-center justify-center bg-gradient-to-br from-teal-950 to-slate-950">
      <div className="grid grid-cols-3 gap-[6px]">
        {Array.from({ length: 9 }).map((_, i) => (
          <div
            key={i}
            className={`h-[18px] w-[18px] rounded-md ${i in lit ? '' : 'bg-white/10'}`}
            style={i in lit ? { background: lit[i], opacity: opacities[i] } : undefined}
          />
        ))}
      </div>
      <div className="absolute bottom-3 right-3">
        <PadSignature dim />
      </div>
    </div>
  );
}

function DiveVisual({ isBonus }: { isBonus?: boolean }) {
  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-gradient-to-br from-slate-950 to-indigo-950">
      {[18, 33, 50, 66, 80].map((y, i) => (
        <div
          key={i}
          className="absolute h-px bg-indigo-500/20"
          style={{ top: `${y}%`, left: `${8 + (i % 3) * 4}%`, width: `${64 + (i % 4) * 8}%` }}
        />
      ))}
      <svg viewBox="0 0 80 36" className="absolute bottom-8 h-9 w-20">
        <path
          d="M 4 32 Q 40 4 76 32"
          fill="none"
          stroke="rgba(99,102,241,0.55)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>
      <span className="z-10 text-[11px] font-black tracking-[0.35em] text-indigo-300/70">
        {isBonus ? 'BONUS' : 'DIVE'}
      </span>
      <div className="absolute bottom-3 right-3">
        <PadSignature dim />
      </div>
    </div>
  );
}

function SpomoveProgramVisual({ preset }: { preset: OfficialSpomovePreset }) {
  const { programGroup, engine } = preset;
  if (programGroup === 'bonus') return <DiveVisual isBonus />;
  if (programGroup === 'dive') return <DiveVisual />;
  if (programGroup === 'sequential-memory') return <SequentialMemoryVisual />;
  if (programGroup === 'visual-reaction') return <VisualReactionVisual />;
  if (programGroup === 'simon') return <SimonVisual />;
  if (programGroup === 'flanker') return <FlankerVisual />;
  if (programGroup === 'stroop') return <StroopVisual />;
  // reaction-cognition: level × theme 조합으로 시각 결정
  const theme = engine.variantColorTheme;
  if (engine.level === 1) return <DirectionArrowVisual />;
  if (engine.level === 3) return <FullVisual theme={theme} />;
  if (engine.level === 4) return <TwoPanelVisual theme={theme} />;
  if (engine.level === 5) return <ThreePanelVisual theme={theme} />;
  return <QuadVisual theme={theme} />;
}

// ── 대상 정규화 ──────────────────────────────────────────────────────────────

// ── 데이터 helpers ───────────────────────────────────────────────────────────

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

// ── 프리셋 카드 ───────────────────────────────────────────────────────────────

function CardVisual({
  preset,
  thumbnailUrl,
  imageFailed,
  onImageError,
}: {
  preset: OfficialSpomovePreset;
  thumbnailUrl: string;
  imageFailed: boolean;
  onImageError: () => void;
}) {
  const showThumbnail = Boolean(thumbnailUrl) && !imageFailed;
  return (
    <div className="relative aspect-video overflow-hidden">
      {showThumbnail ? (
        <Image
          src={thumbnailUrl}
          alt=""
          fill
          unoptimized
          sizes="(min-width: 1280px) 33vw, (min-width: 640px) 50vw, 100vw"
          className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          onError={onImageError}
        />
      ) : (
        <SpomoveProgramVisual preset={preset} />
      )}
      {!preset.isReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/60 backdrop-blur-[1px]">
          <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[11px] font-black text-white">
            {preset.readyLabel ?? '준비 중'}
          </span>
        </div>
      )}
    </div>
  );
}

function CardInfo({
  preset,
  metaLine,
  displayTitle,
  isReady,
}: {
  preset: OfficialSpomovePreset;
  metaLine: string;
  displayTitle: string;
  isReady: boolean;
}) {
  return (
    <div className="flex flex-1 flex-col p-4">
      {/* 분류 태그 (최대 2개) */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-black tracking-wide ${AXIS_BADGE[preset.axis]}`}>
          {preset.axisTitle}
        </span>
        <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-600">
          {preset.programTitle}
        </span>
      </div>
      {/* 제목 */}
      <h2 className="mt-2 line-clamp-2 text-[15px] font-black leading-snug text-slate-950">
        {displayTitle}
      </h2>
      {/* 설명 */}
      <p className="mt-1.5 line-clamp-2 text-[13px] font-medium leading-snug text-slate-500">
        {preset.description}
      </p>
      {/* 푸터: 메타 + 행동 affordance */}
      <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-3">
        <p className="text-[11px] font-semibold text-slate-400">{metaLine}</p>
        {isReady ? (
          <span className="shrink-0 pl-2 text-[12px] font-black text-indigo-600">보기 →</span>
        ) : (
          <span className="inline-flex shrink-0 items-center gap-1 pl-2 text-[11px] font-bold text-slate-400">
            <Lock className="h-3 w-3" />
            준비 중
          </span>
        )}
      </div>
    </div>
  );
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
  const displayModel = getSpomovePresetDisplayModel(preset);
  const metaLine = [displayModel.targetLabel, displayModel.difficultyLabel, displayModel.durationLabel]
    .filter(Boolean)
    .join(' · ');

  const inner = (
    <>
      <div className={`h-[3px] shrink-0 ${AXIS_ACCENT[preset.axis]}`} />
      <CardVisual
        preset={preset}
        thumbnailUrl={thumbnailUrl}
        imageFailed={imageFailed}
        onImageError={() => setImageFailed(true)}
      />
      <CardInfo
        preset={preset}
        metaLine={metaLine}
        displayTitle={displayModel.displayTitle}
        isReady={preset.isReady}
      />
    </>
  );

  if (!preset.isReady) {
    return (
      <article className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white opacity-75 shadow-sm">
        {inner}
      </article>
    );
  }

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md focus-within:ring-2 focus-within:ring-indigo-500 focus-within:ring-offset-2">
      <Link
        href={href}
        className="flex flex-1 flex-col outline-none"
        aria-label={`${displayModel.displayTitle} 프로그램 보기`}
      >
        {inner}
      </Link>
    </article>
  );
}

// ── 메인 뷰 ──────────────────────────────────────────────────────────────────

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
        setThumbnailCacheBust(
          resolveSpomovePackCacheBust(data?.updated_at as string | undefined, Object.values(next)),
        );
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
        {/* 헤더 */}
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

        {/* 반응 단계 필터 */}
        <div className="mt-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
            <span className="shrink-0 pt-[7px] text-[11px] font-black tracking-[0.08em] text-slate-400 sm:w-[4.5rem]">
              반응 단계
            </span>
            <div className="flex gap-2 overflow-x-auto pb-0.5 sm:flex-wrap sm:overflow-visible sm:pb-0">
              {TABS.map((tab) => {
                const active = activeTab === tab;
                const count = tabCount(tab);
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12px] font-bold transition-all ${
                      active
                        ? 'bg-slate-950 text-white shadow-sm'
                        : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900'
                    }`}
                  >
                    {TAB_LABELS[tab]}
                    <span
                      className={`text-[10px] font-semibold opacity-60`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* 프로그램 필터 */}
        <div className="mt-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
            <span className="shrink-0 pt-[7px] text-[11px] font-black tracking-[0.08em] text-slate-400 sm:w-[4.5rem]">
              프로그램
            </span>
            <div className="flex gap-2 overflow-x-auto pb-0.5 sm:flex-wrap sm:overflow-visible sm:pb-0">
              {PROGRAM_GROUP_TABS.map((tab) => {
                const active = activeProgramGroup === tab;
                const count = programGroupCount(tab);
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveProgramGroup(tab)}
                    className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12px] font-bold transition-all ${
                      active
                        ? 'bg-slate-950 text-white shadow-sm'
                        : 'border border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-900'
                    }`}
                  >
                    {PROGRAM_GROUP_LABELS[tab]}
                    <span
                      className={`text-[10px] font-semibold opacity-60`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* 카드 그리드 — 1열(모바일) / 2열(태블릿) / 3열(데스크톱) */}
        {filteredPresets.length > 0 ? (
          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {filteredPresets.map((preset) => (
              <PresetCard
                key={preset.id}
                preset={preset}
                href={officialPresetSessionHref(preset)}
                thumbnailUrl={resolveThumbnailUrl(thumbnailPaths[preset.id], thumbnailCacheBust)}
              />
            ))}
          </div>
        ) : (
          <div className="mt-12 flex flex-col items-center gap-4 text-center">
            <p className="text-[14px] font-semibold text-slate-500">
              선택한 조건에 해당하는 프로그램이 없습니다.
            </p>
            <button
              type="button"
              onClick={() => {
                setActiveTab('all');
                setActiveProgramGroup('all');
              }}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-[13px] font-bold text-slate-600 hover:border-indigo-200 hover:text-indigo-700"
            >
              전체 보기
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
