'use client';

import { Bookmark, Lock, MonitorPlay, Play } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { getSupabaseBrowserClient } from '@/app/lib/supabase/browser';
import {
  getPublicUrl,
  withPublicUrlCacheBust,
} from '@/app/lib/admin/assets/storageClient';
import { resolveSpomovePackCacheBust } from '@/app/lib/spomove/spomoveAssetCacheVersion';
import {
  normalizeSpomoveGuideVideoMap,
  normalizeSpomoveThumbnailMap,
  SPOMOVE_GUIDE_VIDEO_PACK_ID,
  SPOMOVE_THUMBNAIL_PACK_ID,
} from '@/app/lib/spomove/spomoveOfficialAssets';
import { SPOMOVE_AXIS_META, SPOMOVE_AXIS_ORDER } from '@/app/lib/spomove/spomoveAxisMeta';
import { useMasterStore, useProfile } from '../store';
import { getRecentActivityOwnerId } from '../lib/recentProgramActivity';


import {
  OFFICIAL_SPOMOVE_LIBRARY,
  officialPresetSessionHref,
  type OfficialSpomovePreset,
  type OfficialSpomoveProgramGroup,
} from './officialSpomovePresets';
import {
  SPOMOVE_THINKING_LEVEL_LABELS,
  getOfficialSpomovePresetGuide,
  type SpomoveThinkingLevel,
} from './officialSpomovePresetGuides';
import { getSpomovePresetDisplayModel, buildSpomoveCardTags, sortSpomovePresetsByDisplayTitle } from './spomovePresetDisplayModel';
import { SpomoveGuidelineSheet as SharedSpomoveGuidelineSheet } from './SpomoveGuidelineSheet';
import { SPOMOVE_PAD_GRID_HEX } from './spomovePadDisplay';

type ThinkingLevelTab = 'all' | SpomoveThinkingLevel;
type ProgramGroupTab = 'all' | Exclude<OfficialSpomoveProgramGroup, 'bonus'>;
type SpomoveThumbnailPackQueryResult = {
  data: { assets_json?: unknown; updated_at?: string | null } | null;
  error: { code?: string } | null;
};

type SpomoveGuideVideoPackQueryResult = SpomoveThumbnailPackQueryResult;

const THINKING_LEVEL_TABS: ThinkingLevelTab[] = ['all', 'easy', 'normal', 'hard'];

const THINKING_LEVEL_FILTER_LABELS: Record<ThinkingLevelTab, string> = {
  all: '전체',
  easy: SPOMOVE_THINKING_LEVEL_LABELS.easy,
  normal: SPOMOVE_THINKING_LEVEL_LABELS.normal,
  hard: SPOMOVE_THINKING_LEVEL_LABELS.hard,
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
  'visual-reaction': '시각 반응',
  simon: '사이먼 효과',
  flanker: '플랭커',
  stroop: '스트룹 과제',
  'sequential-memory': '순차 기억',
  dive: 'DIVE',
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

// SPOMOVE 4색은 padGrid.ts 단일 출처
const PAD_COLORS = SPOMOVE_PAD_GRID_HEX;

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

// ── 프로그램별 시각 컴포넌트 ──

const THEME_LABELS: Record<string, string> = {
  fruit: '과일',
  vehicle: '탈것',
  emotion: '감정',
  animal: '동물',
  nature: '자연',
  target: '타겟',
  food: '음식',
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
  if (theme === 'food') return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M5 12 Q5 20 12 20 Q19 20 19 12 Z" />
      <rect x="4" y="10.5" width="16" height="2.5" rx="1.25" />
      <path d="M9 10 Q10 8 9 6" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M12 9.5 Q13 7.5 12 5.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M15 10 Q16 8 15 6" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
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

// level 2: 사분면 2×2 — PAD_GRID: ↑ 빨·노 / ↓ 초·파
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
    <div className="relative h-full w-full bg-slate-950">
      <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 gap-[2px]">
        {PAD_COLORS.map((color, i) => (
          <div
            key={i}
            className="relative flex items-center justify-center"
            style={{ background: color, opacity: 0.28 }}
          >
            <ThemeIcon theme={theme} className="h-9 w-9 text-white/90" />
          </div>
        ))}
      </div>
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

/** 반응인지 1번·공간 방향 — 플레이어 simon_arrow와 동일한 기둥+화살표 루트 거리 */
function SpatialDirectionVisual({ colorMode = false }: { colorMode?: boolean }) {
  const [red] = SPOMOVE_PAD_GRID_HEX;
  const arrowFill = colorMode ? red : '#FFFFFF';
  return (
    <div className="relative h-full w-full overflow-hidden bg-[#0F172A]">
      <div
        className="absolute flex items-center justify-center"
        style={{
          left: '78%',
          top: '50%',
          width: 'min(52%, 88%)',
          height: 'min(78%, 92%)',
          transform: 'translate(-50%, -50%)',
        }}
      >
        <svg
          viewBox="0 0 100 130"
          preserveAspectRatio="xMidYMid meet"
          className="h-full w-full"
          style={{ filter: 'drop-shadow(0 10px 48px rgba(0,0,0,0.55))' }}
          aria-hidden
        >
          <g transform="rotate(0 50 67)">
            <path
              d="M 50 8 L 88 62 L 62 62 L 62 122 L 38 122 L 38 62 L 12 62 Z"
              fill={arrowFill}
              stroke="rgba(255,255,255,0.22)"
              strokeWidth={6}
              strokeLinejoin="round"
            />
          </g>
        </svg>
      </div>
      <div className="absolute bottom-3 left-3">
        <span className="rounded-full bg-white/10 px-2 py-0.5 text-[9px] font-black tracking-widest text-white/60">
          {colorMode ? '공간 방향 · 색상' : '공간 방향'}
        </span>
      </div>
      <div className="absolute bottom-3 right-3">
        <PadSignature dim />
      </div>
    </div>
  );
}

function VisualReactionVisual() {
  return (
    <div className="relative flex h-full w-full items-center justify-center bg-gradient-to-br from-cyan-950 to-slate-950 overflow-hidden">
      {[40, 30, 20, 12].map((r, i) => (
        <div
          key={i}
          className="absolute rounded-full border border-[color-mix(in_srgb,var(--spm-acc)_30%,transparent)]"
          style={{ width: r * 2, height: r * 2 }}
        />
      ))}
      <div className="absolute h-3 w-3 rounded-full bg-[color-mix(in_srgb,var(--spm-acc)_90%,white)]" />
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
  const [red, yellow, green, blue] = SPOMOVE_PAD_GRID_HEX;
  return (
    <div className="relative flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
      {/* Simon 4-pad compass — ↑빨 / ←초 / →노 / ↓파 */}
      <div className="relative h-[60px] w-[60px]">
        <div className="absolute left-[18px] top-0 h-[22px] w-[22px] rounded-lg opacity-90" style={{ background: red }} />
        <div className="absolute right-0 top-[18px] h-[22px] w-[22px] rounded-lg opacity-90" style={{ background: yellow }} />
        <div className="absolute bottom-0 left-[18px] h-[22px] w-[22px] rounded-lg opacity-90" style={{ background: green }} />
        <div className="absolute left-0 top-[18px] h-[22px] w-[22px] rounded-lg opacity-90" style={{ background: blue }} />
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
    ['<', '<', '>', '<', '<'],
    ['>', '>', '<', '>', '>'],
  ];
  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center gap-3 bg-gradient-to-br from-amber-50 to-slate-50">
      {rows.map((row, ri) => (
        <div key={ri} className="flex items-center gap-2">
          {row.map((arrow, ai) => (
            <span
              key={ai}
              className={`text-xl font-black leading-none ${
                ai === 2 ? 'text-[var(--spm-acc)]' : 'text-slate-300'
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
      <span className="text-[26px] font-black leading-none text-red-500">초록</span>
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
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-gradient-to-br from-slate-950 to-slate-950">
      {[18, 33, 50, 66, 80].map((y, i) => (
        <div
          key={i}
          className="absolute h-px bg-[var(--spm-acc-glow)]0/20"
          style={{ top: `${y}%`, left: `${8 + (i % 3) * 4}%`, width: `${64 + (i % 4) * 8}%` }}
        />
      ))}
      <svg viewBox="0 0 80 36" className="absolute bottom-8 h-9 w-20">
        <path
          d="M 4 32 Q 40 4 76 32"
          fill="none"
          stroke="var(--spm-acc-a55)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>
      <span className="z-10 text-[11px] font-black tracking-[0.35em] text-[color-mix(in_srgb,var(--spm-acc)_55%,white)]/70">
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
  if (engine.mode === 'basic' && engine.level === 1 && engine.spatialArrowColorMode === 'color') {
    return <SpatialDirectionVisual colorMode />;
  }
  if (programGroup === 'stroop') return <StroopVisual />;
  // reaction-cognition: level × theme 조합으로 시각 결정
  const theme = engine.variantColorTheme;
  if (engine.level === 1) {
    return <SpatialDirectionVisual colorMode={engine.spatialArrowColorMode === 'color'} />;
  }
  if (engine.level === 3) return <FullVisual theme={theme} />;
  if (engine.level === 4) return <TwoPanelVisual theme={theme} />;
  if (engine.level === 5) return <ThreePanelVisual theme={theme} />;
  return <QuadVisual theme={theme} />;
}

// ── 타입 정규화 ──

// ── 데이터 helpers ──

function matchesProgramGroup(preset: OfficialSpomovePreset, tab: ProgramGroupTab) {
  if (tab === 'all') return true;
  if (tab === 'dive') return preset.programGroup === 'dive' || preset.programGroup === 'bonus';
  return preset.programGroup === tab;
}

function matchesThinkingLevel(preset: OfficialSpomovePreset, tab: ThinkingLevelTab) {
  if (tab === 'all') return true;
  return getOfficialSpomovePresetGuide(preset).thinkingLevel === tab;
}

function programGroupCount(tab: ProgramGroupTab, thinkingLevel: ThinkingLevelTab = 'all') {
  return OFFICIAL_SPOMOVE_LIBRARY.filter(
    (preset) => matchesProgramGroup(preset, tab) && matchesThinkingLevel(preset, thinkingLevel),
  ).length;
}

function thinkingLevelCount(tab: ThinkingLevelTab, programGroup: ProgramGroupTab = 'all') {
  return OFFICIAL_SPOMOVE_LIBRARY.filter(
    (preset) => matchesThinkingLevel(preset, tab) && matchesProgramGroup(preset, programGroup),
  ).length;
}

function filterOfficialPresets(programGroup: ProgramGroupTab, thinkingLevel: ThinkingLevelTab) {
  return OFFICIAL_SPOMOVE_LIBRARY.filter(
    (preset) => matchesProgramGroup(preset, programGroup) && matchesThinkingLevel(preset, thinkingLevel),
  );
}

function resolveThumbnailUrl(path: string | null | undefined, cacheBust?: number) {
  if (!path) return '';
  try {
    return withPublicUrlCacheBust(getPublicUrl(path), cacheBust);
  } catch {
    return '';
  }
}

function shouldStretchThumbnailToSquare(_width: number, _height: number, src: string) {
  return /\.svg(\?|#|$)/i.test(src);
}

function CardVisual({
  preset,
  thumbnailUrl,
  imageFailed,
  onImageError,
  hasGuideVideo,
}: {
  preset: OfficialSpomovePreset;
  thumbnailUrl: string;
  imageFailed: boolean;
  onImageError: () => void;
  hasGuideVideo: boolean;
}) {
  const showThumbnail = Boolean(thumbnailUrl) && !imageFailed;
  const [stretch, setStretch] = useState(() => /\.svg(\?|#|$)/i.test(thumbnailUrl));
  const fitClass = stretch
    ? 'object-fill object-center'
    : 'object-cover object-center motion-safe:transition-transform motion-safe:duration-300 motion-safe:group-hover:scale-[1.03]';

  return (
    <div className="relative aspect-square overflow-hidden bg-white">
      {showThumbnail ? (
        <Image
          src={thumbnailUrl}
          alt=""
          fill
          sizes="(min-width: 1280px) 25vw, (min-width: 640px) 33vw, 50vw"
          quality={75}
          className={fitClass}
          onLoadingComplete={(img) => {
            if (shouldStretchThumbnailToSquare(img.naturalWidth, img.naturalHeight, thumbnailUrl)) {
              setStretch(true);
            }
          }}
          onError={onImageError}
        />
      ) : (
        <SpomoveProgramVisual preset={preset} />
      )}
      {preset.isReady ? (
        <span className="pointer-events-none absolute bottom-2.5 left-2.5 flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-slate-900 shadow-[0_2px_10px_rgba(15,23,42,0.22)] ring-1 ring-black/5 motion-safe:transition-transform motion-safe:duration-150 group-hover:scale-105"
          >
            <Play className="h-3.5 w-3.5 fill-current" />
          </span>
          <span className="rounded-md bg-black/55 px-2 py-1 text-[11px] font-semibold text-white opacity-0 transition-opacity duration-150 group-hover:opacity-100">
            가이드
          </span>
        </span>
      ) : null}
      {!preset.isReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/60 backdrop-blur-[1px]">
          <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[11px] font-black text-white">
            {preset.readyLabel ?? '제공 예정'}
          </span>
        </div>
      )}
    </div>
  );
}

function CardInfo({
  preset,
  displayTitle,
  isReady,
  startHref,
}: {
  preset: OfficialSpomovePreset;
  displayTitle: string;
  isReady: boolean;
  startHref: string;
}) {
  const display = getSpomovePresetDisplayModel(preset);
  const cardTags = buildSpomoveCardTags(preset);

  return (
    <div className="flex flex-1 flex-col p-4 text-center">
      <div className="flex flex-wrap items-center justify-center gap-1.5">
        <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-black tracking-wide text-slate-600">
          {display.programLabel}
        </span>
        {display.variantLabel &&
        display.variantLabel !== display.programLabel &&
        display.variantLabel !== display.displayTitle &&
        !display.displayTitle.endsWith(display.variantLabel) ? (
          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-black tracking-wide ${AXIS_BADGE[preset.axis]}`}>
            {display.variantLabel}
          </span>
        ) : null}
      </div>

      <h2 className="mt-3 line-clamp-2 text-[18px] font-black leading-snug text-slate-950 sm:text-[20px]">
        {displayTitle}
      </h2>
      <p className="mt-2 line-clamp-3 text-[13px] font-medium leading-snug text-slate-500">
        {preset.description}
      </p>

      {isReady ? (
        <div className="mt-4">
          <Link
            href={startHref}
            data-spm-spomove-card-action="start"
            className="inline-flex h-11 w-full items-center justify-center gap-1.5 whitespace-nowrap rounded-[10px] bg-[var(--spm-acc)] px-3 text-[13px] font-black text-white shadow-sm transition hover:opacity-90 active:scale-[0.98] active:opacity-80"
          >
            <MonitorPlay className="h-3.5 w-3.5" />
            실행
          </Link>
        </div>
      ) : null}

      <div className="mt-2 grid grid-cols-1 gap-1.5 min-[380px]:grid-cols-2">
        {cardTags.map((tag) => (
          <span
            key={tag.key}
            title={`${tag.label}: ${tag.value}`}
            className="flex min-h-[24px] items-center justify-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-center text-[10px] font-extrabold leading-tight text-slate-600"
          >
            {tag.value}
          </span>
        ))}
      </div>

      {!isReady ? (
        <div className="mt-auto border-t border-slate-100 pt-3">
          <span className="inline-flex shrink-0 items-center justify-center gap-1 text-[11px] font-bold text-slate-400">
            <Lock className="h-3 w-3" />
            제공 예정
          </span>
        </div>
      ) : null}
    </div>
  );
}

function PresetCard({
  preset,
  startHref,
  thumbnailUrl,
  hasGuideVideo,
  favorite,
  favoriteEnabled,
  onPreview,
  onFavorite,
}: {
  preset: OfficialSpomovePreset;
  startHref: string;
  thumbnailUrl: string;
  hasGuideVideo: boolean;
  favorite: boolean;
  favoriteEnabled: boolean;
  onPreview: () => void;
  onFavorite: () => void;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const displayModel = getSpomovePresetDisplayModel(preset);

  const inner = (
    <>
      <div className={`h-[3px] shrink-0 ${AXIS_ACCENT[preset.axis]}`} />
      <button
        type="button"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onFavorite();
        }}
        disabled={!favoriteEnabled}
        aria-pressed={favorite}
        aria-label={favorite ? '즐겨찾기에서 제거' : '즐겨찾기에 추가'}
        title={favorite ? '즐겨찾기에서 제거' : '즐겨찾기에 추가'}
        className={`absolute right-3 top-4 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full shadow-md backdrop-blur transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--spm-acc)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 disabled:opacity-70 ${
          favorite
            ? 'bg-amber-50 text-amber-600'
            : 'bg-white/90 text-slate-500 hover:bg-white hover:text-slate-900'
        }`}
      >
        <Bookmark className={`h-4 w-4 ${favorite ? 'fill-current' : ''}`} />
      </button>
      <button
        type="button"
        data-spm-spomove-card-action="preview"
        disabled={!preset.isReady}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          if (!preset.isReady) return;
          onPreview();
        }}
        aria-label={`${displayModel.displayTitle} ${hasGuideVideo ? '참고 영상과 ' : ''}가이드 보기`}
        className="relative block w-full cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--spm-acc)] focus-visible:ring-offset-2 disabled:cursor-default"
      >
        <CardVisual
          preset={preset}
          thumbnailUrl={thumbnailUrl}
          imageFailed={imageFailed}
          onImageError={() => setImageFailed(true)}
          hasGuideVideo={hasGuideVideo}
        />
      </button>
      <CardInfo
        preset={preset}
        displayTitle={displayModel.displayTitle}
        isReady={preset.isReady}
        startHref={startHref}
      />
    </>
  );

  if (!preset.isReady) {
    return (
      <article className="relative flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white opacity-75 shadow-sm">
        {inner}
      </article>
    );
  }

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow duration-200 hover:shadow-md focus-within:ring-2 focus-within:ring-[var(--spm-acc)] focus-within:ring-offset-2">
      {inner}
    </article>
  );
}

// ── 메인 뷰 ──

export default function SpomoveHubView() {
  const [activeProgramGroup, setActiveProgramGroup] = useState<ProgramGroupTab>('all');
  const [activeThinkingLevel, setActiveThinkingLevel] = useState<ThinkingLevelTab>('all');
  const [showSavedOnly, setShowSavedOnly] = useState(false);
  const [thumbnailPaths, setThumbnailPaths] = useState<Record<string, string>>({});
  const [thumbnailCacheBust, setThumbnailCacheBust] = useState<number | undefined>();
  const [guideVideoUrls, setGuideVideoUrls] = useState<Record<string, string>>({});
  const [previewPreset, setPreviewPreset] = useState<OfficialSpomovePreset | null>(null);
  const profile = useProfile();
  const ownerId = getRecentActivityOwnerId(profile);
  const recentProgramActivities = useMasterStore((state) => state.recentProgramActivities);
  const storedFavoriteIds = useMasterStore((state) =>
    ownerId ? state.favoriteProgramIdsByOwner[ownerId] : undefined,
  );
  const isFavoriteProgram = useMasterStore((state) => state.isFavoriteProgram);
  const toggleFavoriteProgram = useMasterStore((state) => state.toggleFavoriteProgram);
  const favoriteSpomoveIds = useMemo(
    () => new Set((storedFavoriteIds ?? []).filter((id) => OFFICIAL_SPOMOVE_LIBRARY.some((preset) => preset.id === id))),
    [storedFavoriteIds],
  );
  const recentSpomoveActivities = useMemo(() => {
    if (!ownerId) return [];
    const validPresetIds = new Set(OFFICIAL_SPOMOVE_LIBRARY.map((preset) => preset.id));
    return recentProgramActivities
      .filter((activity) => activity.ownerId === ownerId && activity.action === 'spomove_started' && validPresetIds.has(activity.programId))
      .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
      .slice(0, 3);
  }, [ownerId, recentProgramActivities]);

  useEffect(() => {
    let alive = true;
    const supabase = getSupabaseBrowserClient();
    void Promise.all([
      supabase
        .from('think_asset_packs')
        .select('assets_json, updated_at')
        .eq('id', SPOMOVE_THUMBNAIL_PACK_ID)
        .maybeSingle(),
      supabase
        .from('think_asset_packs')
        .select('assets_json')
        .eq('id', SPOMOVE_GUIDE_VIDEO_PACK_ID)
        .maybeSingle(),
    ]).then(([thumbnailResult, guideVideoResult]) => {
      if (!alive) return;

      const { data: thumbnailData, error: thumbnailError } = thumbnailResult as SpomoveThumbnailPackQueryResult;
      if (thumbnailError && thumbnailError.code !== 'PGRST116') {
        setThumbnailPaths({});
        setThumbnailCacheBust(undefined);
      } else {
        const next = normalizeSpomoveThumbnailMap(thumbnailData?.assets_json);
        setThumbnailPaths(next);
        setThumbnailCacheBust(
          resolveSpomovePackCacheBust(thumbnailData?.updated_at as string | undefined, Object.values(next)),
        );
      }

      const { data: guideVideoData, error: guideVideoError } = guideVideoResult as SpomoveGuideVideoPackQueryResult;
      if (guideVideoError && guideVideoError.code !== 'PGRST116') {
        setGuideVideoUrls({});
      } else {
        setGuideVideoUrls(normalizeSpomoveGuideVideoMap(guideVideoData?.assets_json));
      }
    }).catch(() => {
      if (!alive) return;
      setThumbnailPaths({});
      setThumbnailCacheBust(undefined);
      setGuideVideoUrls({});
    });
    return () => {
      alive = false;
    };
  }, []);

  const filteredPresets = useMemo(() => {
    let presets = filterOfficialPresets(activeProgramGroup, activeThinkingLevel);
    if (showSavedOnly) presets = presets.filter((preset) => favoriteSpomoveIds.has(preset.id));
    return sortSpomovePresetsByDisplayTitle(presets);
  }, [activeProgramGroup, activeThinkingLevel, favoriteSpomoveIds, showSavedOnly]);
  const showAxisSections = activeProgramGroup === 'all' && activeThinkingLevel === 'all';
  const axisSections = useMemo(() => {
    if (!showAxisSections) return [];
    return SPOMOVE_AXIS_ORDER.map((axis) => ({
      axis,
      meta: SPOMOVE_AXIS_META[axis],
      presets: filteredPresets.filter((preset) => preset.axis === axis),
    })).filter((section) => section.presets.length > 0);
  }, [filteredPresets, showAxisSections]);

  const renderPresetGrid = (presets: OfficialSpomovePreset[], gridId?: string) => (
    <div
      id={gridId}
      className="grid grid-cols-1 gap-4 min-[380px]:grid-cols-2 sm:grid-cols-3 xl:grid-cols-4"
    >
      {presets.map((preset) => (
        <PresetCard
          key={preset.id}
          preset={preset}
          startHref={officialPresetSessionHref(preset)}
          thumbnailUrl={resolveThumbnailUrl(thumbnailPaths[preset.id], thumbnailCacheBust)}
          hasGuideVideo={Boolean(guideVideoUrls[preset.id])}
          favorite={isFavoriteProgram(ownerId, preset.id)}
          favoriteEnabled={ownerId != null && preset.isReady}
          onPreview={() => setPreviewPreset(preset)}
          onFavorite={() => toggleFavoriteProgram(ownerId, preset.id)}
        />
      ))}
    </div>
  );

  return (
    <main className="h-full overflow-y-auto" style={{ background: 'var(--spm-bg)' }}>
      <div className="mx-auto w-full max-w-7xl px-4 pb-24 pt-6 sm:px-6 lg:px-8 lg:pb-16">
        {/* 헤더 */}
        <header className="overflow-hidden rounded-[28px] bg-slate-950 px-6 py-10 text-white shadow-xl sm:px-10 sm:py-12">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 text-[12px] font-black text-white/80">
            <MonitorPlay className="h-3.5 w-3.5" />
            공식 활동
          </span>
          <h1 className="mt-5 text-[34px] font-black leading-tight sm:text-[46px]">
            SPOMOVE 공식 활동
          </h1>
          <p className="mt-4 max-w-2xl text-[14px] font-medium leading-7 text-white/58">
            수업 도입·집중 전환·마무리에 바로 쓸 수 있는 화면 반응 활동입니다. 활동 종류와 인지 난이도로
            골라보세요.
          </p>
          <p className="mt-3 text-[12px] font-semibold text-white/30">
            각 활동은 사전 설정된 공식 조건으로 실행됩니다.
          </p>
        </header>

        {/* 최근 활동 */}
        <section className="mt-6 rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[12px] font-black text-[var(--spm-acc)]">최근 SPOMOVE</p>
              <h2 className="text-xl font-black text-slate-950">최근 사용한 활동</h2>
            </div>
            <a href="#spomove-program-list" className="text-sm font-black text-[var(--spm-acc)]">활동 선택</a>
          </div>
          {recentSpomoveActivities.length ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {recentSpomoveActivities.map((activity) => {
                const preset = OFFICIAL_SPOMOVE_LIBRARY.find((item) => item.id === activity.programId);
                const title = preset ? getSpomovePresetDisplayModel(preset).displayTitle : activity.programTitle;
                return (
                  <article key={`${activity.ownerId}-${activity.programId}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="line-clamp-2 text-sm font-black text-slate-950">{title}</p>
                    <div className="mt-3 grid gap-2">
                      <Link
                        href={
                          preset
                            ? officialPresetSessionHref(preset)
                            : `/spokedu-master/spomove/session?preset=${activity.programId}&mode=projector&sound=on`
                        }
                        data-spm-spomove-recent-action="rerun"
                        className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--spm-acc)] px-3 text-[12px] font-black text-white"
                      >
                        다시 실행
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-bold text-slate-600">아직 실행한 SPOMOVE 활동이 없습니다.</p>
              <p className="mt-1 text-sm font-semibold text-slate-500">활동을 선택해 첫 실행을 시작해 보세요.</p>
              <a href="#spomove-program-list" className="mt-3 inline-flex min-h-11 items-center justify-center rounded-xl bg-slate-950 px-4 text-sm font-black text-white">활동 선택</a>
            </div>
          )}
        </section>

        {/* 저장한 활동 */}
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowSavedOnly((current) => !current)}
            aria-pressed={showSavedOnly}
            className={`inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-[13px] font-black transition ${
              showSavedOnly
                ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'
                : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-950'
            }`}
          >
            <Bookmark className={`h-4 w-4 ${showSavedOnly ? 'fill-current' : ''}`} />
            즐겨찾기한 활동
            <span className="text-[11px] font-black opacity-60">{favoriteSpomoveIds.size}</span>
          </button>
        </div>

        {/* 프로그램 필터 (1차) */}
        <div className="mt-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
            <span className="shrink-0 pt-[7px] text-[11px] font-black tracking-[0.08em] text-slate-400 sm:w-[4.5rem]">
              활동 종류
            </span>
            <div className="flex flex-wrap gap-2">
              {PROGRAM_GROUP_TABS.map((tab) => {
                const active = activeProgramGroup === tab;
                const count = programGroupCount(tab, activeThinkingLevel);
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveProgramGroup(tab)}
                    className={`inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[12px] font-bold transition-all ${
                      active
                        ? 'bg-slate-950 text-white shadow-sm'
                        : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900'
                    }`}
                  >
                    {PROGRAM_GROUP_LABELS[tab]}
                    <span className="text-[10px] font-semibold opacity-60">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* 인지 난이도 필터 (2차) */}
        <div className="mt-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
            <span className="shrink-0 pt-[7px] text-[11px] font-black tracking-[0.08em] text-slate-400 sm:w-[4.5rem]">
              인지 난이도
            </span>
            <div className="flex flex-wrap gap-2">
              {THINKING_LEVEL_TABS.map((tab) => {
                const active = activeThinkingLevel === tab;
                const count = thinkingLevelCount(tab, activeProgramGroup);
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveThinkingLevel(tab)}
                    className={`inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full px-3 text-[11px] font-bold transition-all ${
                      active
                        ? 'border border-[color-mix(in_srgb,var(--spm-acc)_35%,transparent)] bg-[var(--spm-acc-glow)] text-[var(--spm-acc)] shadow-sm'
                        : 'border border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-900'
                    }`}
                  >
                    {THINKING_LEVEL_FILTER_LABELS[tab]}
                    <span className="text-[10px] font-semibold opacity-60">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        <p className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-[12px] font-semibold leading-relaxed text-slate-600">
          <span className="font-black text-slate-800">썸네일</span>
          을 누르면{' '}
          <span className="font-black text-[var(--spm-acc)]">참고 영상</span>
          과 활동 안내를 볼 수 있습니다. 실행은 아래{' '}
          <span className="font-black text-slate-800">실행</span>
          버튼을 사용하세요.
        </p>
        {/* 카드 그리드 — 1:1 썸네일 · 2열 모바일 / 3열 / 4열 */}
        {filteredPresets.length > 0 ? (
          showAxisSections ? (
            <div id="spomove-program-list" className="mt-6 space-y-10">
              {axisSections.map((section) => (
                <section key={section.axis}>
                  <header className="flex flex-col gap-1 border-b border-slate-200 pb-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <p className="text-[11px] font-black tracking-[0.08em] text-slate-400">
                        {section.meta.enTitle}
                      </p>
                      <h2 className="mt-1 text-xl font-black text-slate-950">{section.meta.title}</h2>
                      <p className="mt-1 text-[13px] font-medium text-slate-500">{section.meta.tabSub}</p>
                    </div>
                    <p className="text-[12px] font-bold text-slate-400">{section.presets.length}개 프리셋</p>
                  </header>
                  <div className="mt-5">
                    {renderPresetGrid(section.presets)}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <div className="mt-6">{renderPresetGrid(filteredPresets, 'spomove-program-list')}</div>
          )
        ) : (
          <div className="mt-12 flex flex-col items-center gap-4 text-center">
            <p className="text-[14px] font-semibold text-slate-500">
              {showSavedOnly ? '즐겨찾기한 조건에 해당하는 활동이 없습니다.' : '선택한 조건에 해당하는 활동이 없습니다.'}
            </p>
            <button
              type="button"
              onClick={() => {
                setActiveProgramGroup('all');
                setActiveThinkingLevel('all');
                setShowSavedOnly(false);
              }}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-[13px] font-bold text-slate-600 hover:border-[color-mix(in_srgb,var(--spm-acc)_35%,transparent)] hover:text-[var(--spm-acc)]"
            >
              전체 보기
            </button>
          </div>
        )}
        <SharedSpomoveGuidelineSheet
          preset={previewPreset}
          guideVideoUrl={previewPreset ? guideVideoUrls[previewPreset.id] ?? '' : ''}
          onClose={() => setPreviewPreset(null)}
        />
      </div>
    </main>
  );
}
