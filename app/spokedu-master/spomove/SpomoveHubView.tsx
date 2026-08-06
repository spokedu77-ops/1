'use client';

import { Bookmark, Lock, MonitorPlay, Play } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { getSupabaseBrowserClient } from '@/app/lib/supabase/browser';
import {
  getPublicUrl,
  withPublicUrlCacheBust,
} from '@/app/lib/admin/assets/storageClient';
import { resolveSpomovePackCacheBust } from '@/app/lib/spomove/spomoveAssetCacheVersion';
import {
  normalizeSpomoveContentMap,
  normalizeSpomoveGuideVideoMap,
  normalizeSpomoveThumbnailMap,
  SPOMOVE_CONTENT_PACK_ID,
  SPOMOVE_GUIDE_VIDEO_PACK_ID,
  SPOMOVE_THUMBNAIL_PACK_ID,
  type SpomovePresetContentOverride,
} from '@/app/lib/spomove/spomoveOfficialAssets';
import { SPOMOVE_AXIS_META, SPOMOVE_AXIS_ORDER } from '@/app/lib/spomove/spomoveAxisMeta';
import { useMasterStore, useProfile } from '../store';
import { getRecentActivityOwnerId } from '../lib/recentProgramActivity';
import { spmChipClass } from '../lib/masterUiClasses';
import { isSpomoveMovementLayerEnabled } from './movements/movementFlag';
import { isHubListedPreset } from './movements/isHubVisiblePreset';
import { canReproduceSpomoveSameSettings } from './movements/canReproduceSpomoveSameSettings';
import { getPresetMovementSummary } from './movements/presetMovementSummary';
import type { MovementQuickFilter } from './movements/movementTypes';
import { supportsCueSpeedOverride } from './spomoveCueSpeed';
import { getSpomoveDifficultyKind } from './spomoveDifficulty';

import {
  OFFICIAL_SPOMOVE_LIBRARY,
  publicOfficialPresetSessionHref,
  type OfficialSpomovePreset,
  type OfficialSpomoveProgramGroup,
} from './officialSpomovePresets';
import {
  SPOMOVE_THINKING_LEVEL_LABELS,
  getOfficialSpomovePresetGuide,
  type SpomoveThinkingLevel,
} from './officialSpomovePresetGuides';
import {
  buildSpomoveProgramGroupSections,
  buildSpomoveGuideDisplayModel,
  getSpomovePresetDisplayModel,
  sortSpomovePresetsByCatalogOrder,
  sortSpomovePresetsByDisplayTitle,
} from './spomovePresetDisplayModel';
import { SpomoveGuidelineSheet as SharedSpomoveGuidelineSheet } from './SpomoveGuidelineSheet';
import { SPOMOVE_PAD_GRID_HEX } from './spomovePadDisplay';
import {
  getSpomoveHubHref,
  parseSpomoveHubView,
  type SpomoveHubViewMode,
} from './spomoveHubNavigation';

type ThinkingLevelTab = 'all' | SpomoveThinkingLevel;
type ProgramGroupTab = 'all' | Exclude<OfficialSpomoveProgramGroup, 'bonus'>;
type GuideStatusFilter = 'all' | 'published' | 'legacy' | 'preparing';
type SpomoveThumbnailPackQueryResult = {
  data: { assets_json?: unknown; updated_at?: string | null } | null;
  error: { code?: string } | null;
};

type SpomoveGuideVideoPackQueryResult = SpomoveThumbnailPackQueryResult;
type SpomoveContentPackQueryResult = SpomoveThumbnailPackQueryResult;

function getGuideStatusBadge(guideMode: string) {
  if (guideMode === 'published') {
    return {
      label: '공식 가이드',
      helper: '바로 수업 가능',
      className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    };
  }
  if (guideMode === 'legacy') {
    return {
      label: '기본 안내',
      helper: '간단 실행안 제공',
      className: 'border-sky-200 bg-sky-50 text-sky-700',
    };
  }
  return {
    label: '세부 안내 예정',
    helper: '화면 활동 가능',
    className: 'border-slate-200 bg-slate-50 text-slate-500',
  };
}

function resolveGuideStatusFilter(
  preset: OfficialSpomovePreset,
  contentOverride?: SpomovePresetContentOverride,
): Exclude<GuideStatusFilter, 'all'> {
  const guideDisplay = buildSpomoveGuideDisplayModel({
    preset,
    contentOverride,
    audience: 'public',
  });
  if (guideDisplay.guideMode === 'published' || guideDisplay.guideMode === 'legacy') {
    return guideDisplay.guideMode;
  }
  return 'preparing';
}

const GUIDE_STATUS_FILTERS: Array<{ id: GuideStatusFilter; label: string }> = [
  { id: 'all', label: '전체' },
  { id: 'published', label: '공식 가이드' },
  { id: 'legacy', label: '기본 안내' },
  { id: 'preparing', label: '세부 안내 예정' },
];

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
  simon: '사이먼 이펙트',
  flanker: '플랭커 이펙트',
  stroop: '스트룹 이펙트',
  'sequential-memory': '순차 기억',
  dive: 'DIVE',
};

// 축별 accent bar 색상
const AXIS_ACCENT: Record<OfficialSpomovePreset['axis'], string> = {
  response: 'bg-orange-400',
  attention: 'bg-blue-400',
  executive: 'bg-violet-500',
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

/** 반응인지 1번·공간 방향 — 플레이어 arrow와 동일한 중앙 화살표 */
function SpatialDirectionVisual({ colorMode = false }: { colorMode?: boolean }) {
  const [red] = SPOMOVE_PAD_GRID_HEX;
  const arrowFill = colorMode ? red : '#FFFFFF';
  return (
    <div className="relative h-full w-full overflow-hidden bg-[#0F172A]">
      <div
        className="absolute flex items-center justify-center"
        style={{
          left: '50%',
          top: '50%',
          width: 'min(58%, 88%)',
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
          {colorMode ? '색상 화살표' : '화살표'}
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
  if (engine.level === 5 || engine.level === 6) return <ThreePanelVisual theme={theme} />;
  if (engine.level >= 7 && engine.level <= 10) return <QuadVisual theme={theme} />;
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
    (preset) => isHubListedPreset(preset) && matchesProgramGroup(preset, tab) && matchesThinkingLevel(preset, thinkingLevel),
  ).length;
}

function thinkingLevelCount(tab: ThinkingLevelTab, programGroup: ProgramGroupTab = 'all') {
  return OFFICIAL_SPOMOVE_LIBRARY.filter(
    (preset) => isHubListedPreset(preset) && matchesThinkingLevel(preset, tab) && matchesProgramGroup(preset, programGroup),
  ).length;
}

function filterOfficialPresets(programGroup: ProgramGroupTab, thinkingLevel: ThinkingLevelTab) {
  return OFFICIAL_SPOMOVE_LIBRARY.filter(
    (preset) => isHubListedPreset(preset) && matchesProgramGroup(preset, programGroup) && matchesThinkingLevel(preset, thinkingLevel),
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
  title,
  label,
}: {
  preset: OfficialSpomovePreset;
  thumbnailUrl: string;
  imageFailed: boolean;
  onImageError: () => void;
  title: string;
  label: string;
}) {
  const showThumbnail = Boolean(thumbnailUrl) && !imageFailed;
  const [stretch, setStretch] = useState(() => /\.svg(\?|#|$)/i.test(thumbnailUrl));
  const fitClass = stretch
    ? 'object-fill object-center'
    : 'object-cover object-center motion-safe:transition-transform motion-safe:duration-300 motion-safe:group-hover:scale-[1.03]';

  return (
    <div className="relative min-h-0 w-full flex-1 aspect-[6/5] overflow-hidden border-b border-slate-200 bg-white">
      {showThumbnail ? (
        <Image
          src={thumbnailUrl}
          alt=""
          fill
          sizes="(min-width: 1280px) 25vw, (min-width: 640px) 33vw, 50vw"
          quality={75}
          className={fitClass}
          onLoad={(event) => {
            const img = event.currentTarget;
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
        <span className="pointer-events-none absolute left-2.5 top-2.5">
          <span
            aria-hidden="true"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-slate-900 shadow-[0_2px_10px_rgba(15,23,42,0.22)] ring-1 ring-black/5 motion-safe:transition-transform motion-safe:duration-150 group-hover:scale-105"
          >
            <Play className="h-3.5 w-3.5 fill-current" />
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
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/82 via-black/34 to-transparent px-3 pb-3 pt-16">
        <p className="max-w-[76%] truncate text-[11px] font-black text-white/82 drop-shadow">
          {label}
        </p>
        <h3 className="mt-1 line-clamp-2 max-w-[92%] text-[17px] font-black leading-5 text-white drop-shadow">
          {title}
        </h3>
      </div>
    </div>
  );
}

function CardInfo({
  preset,
  isReady,
  hubView,
  contentOverride,
  onGuide,
}: {
  preset: OfficialSpomovePreset;
  isReady: boolean;
  hubView: SpomoveHubViewMode;
  contentOverride?: SpomovePresetContentOverride;
  onGuide: () => void;
}) {
  const router = useRouter();
  const guideDisplay = buildSpomoveGuideDisplayModel({ preset, contentOverride, audience: 'public' });
  const displayModel = getSpomovePresetDisplayModel(preset);
  const guideStatusBadge = getGuideStatusBadge(guideDisplay.guideMode);
  const supportMetaParts = displayModel.supportMetaParts.length
    ? displayModel.supportMetaParts
    : [
        guideDisplay.recommendedMovementLabel,
        ...guideDisplay.focusTags,
      ].filter((part): part is string => Boolean(part)).slice(0, 3);
  const showSettings =
    supportsCueSpeedOverride(preset) || Boolean(getSpomoveDifficultyKind(preset));

  const hrefForSettings = () => {
    const hubViewOption = hubView === 'favorites' ? { hubView: 'favorites' as const } : {};
    return publicOfficialPresetSessionHref(preset, { entry: 'settings', ...hubViewOption });
  };

  return (
    <div className="flex shrink-0 flex-col gap-2 p-3 text-left">
      <div className="flex items-center justify-between gap-2">
        <span className={`inline-flex h-6 max-w-full items-center rounded-full border px-2 text-[11px] font-black ${guideStatusBadge.className}`}>
          {guideStatusBadge.label}
        </span>
        <span className="shrink-0 text-[10px] font-bold text-slate-400">{guideStatusBadge.helper}</span>
      </div>
      <div className="flex min-h-5 min-w-0 items-center overflow-hidden text-[12px] font-semibold leading-5 text-slate-600">
        {supportMetaParts.length > 0 ? supportMetaParts.map((part) => (
          <span
            key={part}
            className="min-w-0 truncate after:mx-1.5 after:text-slate-300 after:content-['·'] last:after:content-none"
          >
            {part}
          </span>
        )) : <span className="text-slate-400">&nbsp;</span>}
      </div>

      {isReady ? (
        <div className="flex gap-2">
          <button
            type="button"
            data-spm-spomove-card-action="start"
            data-spm-spomove-start-mode="guide"
            onClick={onGuide}
            className="spm-btn-primary inline-flex h-9 min-w-0 flex-[1.6] items-center justify-center gap-1.5 rounded-[9px] px-2 text-[13px] font-black focus-visible:outline-none"
          >
            <Play className="h-3.5 w-3.5 shrink-0 fill-current" aria-hidden />
            <span>활동 준비</span>
          </button>
          {showSettings ? (
            <button
              type="button"
              data-spm-spomove-card-action="start"
              data-spm-spomove-start-mode="settings"
              onClick={() => router.push(hrefForSettings())}
              className="inline-flex h-9 min-w-0 flex-1 items-center justify-center overflow-hidden rounded-[9px] border border-slate-200 bg-white px-3 text-[12px] font-black text-slate-700 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
            >
              시작 설정
            </button>
          ) : null}
        </div>
      ) : (
        <div className="border-t border-slate-100 pt-2">
          <span className="inline-flex items-center justify-center gap-1 text-[11px] font-bold text-slate-400">
            <Lock className="h-3 w-3" />
            제공 예정
          </span>
        </div>
      )}
    </div>
  );
}

function PresetCard({
  preset,
  thumbnailUrl,
  favorite,
  favoriteEnabled,
  hubView,
  contentOverride,
  onPreview,
  onFavorite,
}: {
  preset: OfficialSpomovePreset;
  thumbnailUrl: string;
  favorite: boolean;
  favoriteEnabled: boolean;
  hubView: SpomoveHubViewMode;
  contentOverride?: SpomovePresetContentOverride;
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
        aria-label={`${displayModel.displayTitle} 활동 준비 열기`}
        className="relative flex min-h-0 w-full flex-1 cursor-pointer flex-col text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--spm-acc)] focus-visible:ring-offset-2 disabled:cursor-default"
      >
        <CardVisual
          preset={preset}
          thumbnailUrl={thumbnailUrl}
          imageFailed={imageFailed}
          onImageError={() => setImageFailed(true)}
          title={displayModel.displayTitle}
          label={displayModel.programLabel}
        />
      </button>
      <CardInfo
        preset={preset}
        isReady={preset.isReady}
        hubView={hubView}
        contentOverride={contentOverride}
        onGuide={onPreview}
      />
    </>
  );

  if (!preset.isReady) {
    return (
      <article className="relative flex h-full min-h-[324px] flex-col overflow-hidden rounded-[14px] border border-slate-200 bg-white opacity-75 shadow-[0_14px_30px_rgba(15,23,42,0.08)]">
        {inner}
      </article>
    );
  }

  return (
    <article className="group relative flex h-full min-h-[324px] flex-col overflow-hidden rounded-[14px] border border-slate-200 bg-white shadow-[0_14px_30px_rgba(15,23,42,0.10)] transition duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_18px_38px_rgba(15,23,42,0.14)] focus-within:ring-2 focus-within:ring-[var(--spm-acc)] focus-within:ring-offset-2">
      {inner}
    </article>
  );
}

// ── 메인 뷰 ──

export default function SpomoveHubView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeProgramGroup, setActiveProgramGroup] = useState<ProgramGroupTab>('all');
  const [activeThinkingLevel, setActiveThinkingLevel] = useState<ThinkingLevelTab>('all');
  const hubView = parseSpomoveHubView(searchParams.get('view'));
  const showSavedOnly = hubView === 'favorites';
  const [movementFilter, setMovementFilter] = useState<MovementQuickFilter | 'all'>('all');
  const [guideStatusFilter, setGuideStatusFilter] = useState<GuideStatusFilter>('all');
  const [thumbnailPaths, setThumbnailPaths] = useState<Record<string, string>>({});
  const [thumbnailCacheBust, setThumbnailCacheBust] = useState<number | undefined>();
  const [guideVideoUrls, setGuideVideoUrls] = useState<Record<string, string>>({});
  const [contentOverrides, setContentOverrides] = useState<Record<string, SpomovePresetContentOverride>>({});
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
    () => new Set((storedFavoriteIds ?? []).filter((id) => OFFICIAL_SPOMOVE_LIBRARY.some((preset) => preset.id === id && isHubListedPreset(preset)))),
    [storedFavoriteIds],
  );
  const recentSpomoveActivities = useMemo(() => {
    if (!ownerId) return [];
    const validPresetIds = new Set(OFFICIAL_SPOMOVE_LIBRARY.filter(isHubListedPreset).map((preset) => preset.id));
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
      supabase
        .from('think_asset_packs')
        .select('assets_json')
        .eq('id', SPOMOVE_CONTENT_PACK_ID)
        .maybeSingle(),
    ]).then(([thumbnailResult, guideVideoResult, contentResult]) => {
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

      const { data: contentData, error: contentError } = contentResult as SpomoveContentPackQueryResult;
      if (contentError && contentError.code !== 'PGRST116') {
        setContentOverrides({});
      } else {
        setContentOverrides(normalizeSpomoveContentMap(contentData?.assets_json));
      }
    }).catch(() => {
      if (!alive) return;
      setThumbnailPaths({});
      setThumbnailCacheBust(undefined);
      setGuideVideoUrls({});
      setContentOverrides({});
    });
    return () => {
      alive = false;
    };
  }, []);

  const movementLayerEnabled = useMemo(
    () =>
      isSpomoveMovementLayerEnabled({
        isAdmin: profile?.isAdmin,
        userId: profile?.id,
        userRole: profile?.isAdmin ? 'admin' : undefined,
      }),
    [profile?.id, profile?.isAdmin],
  );

  const replaceHubParams = (mutate: (params: URLSearchParams) => void) => {
    const params = new URLSearchParams(searchParams.toString());
    mutate(params);
    const qs = params.toString();
    router.push(qs ? `/spokedu-master/spomove?${qs}` : getSpomoveHubHref('all'), { scroll: false });
  };

  const toggleSavedOnly = () => {
    replaceHubParams((params) => {
      if (parseSpomoveHubView(params.get('view')) === 'favorites') {
        params.delete('view');
      } else {
        params.set('view', 'favorites');
      }
    });
  };

  const clearHubFilters = () => {
    setActiveProgramGroup('all');
    setActiveThinkingLevel('all');
    setGuideStatusFilter('all');
    replaceHubParams((params) => {
      params.delete('view');
    });
  };

  const filteredPresets = useMemo(() => {
    let presets = filterOfficialPresets(activeProgramGroup, activeThinkingLevel);
    if (showSavedOnly) presets = presets.filter((preset) => favoriteSpomoveIds.has(preset.id));
    if (guideStatusFilter !== 'all') {
      presets = presets.filter(
        (preset) => resolveGuideStatusFilter(preset, contentOverrides[preset.id]) === guideStatusFilter,
      );
    }
    if (movementLayerEnabled && movementFilter !== 'all') {
      presets = presets.filter((preset) => {
        const summary = getPresetMovementSummary(preset);
        if (!summary) return false;
        if (movementFilter === 'singleMat') return summary.minMats === 1;
        if (movementFilter === 'feet') return summary.feet;
        if (movementFilter === 'hands') return summary.hands;
        if (movementFilter === 'balance') return summary.balance;
        if (movementFilter === 'lowImpact') return summary.lowImpact;
        return true;
      });
    }
    return showSavedOnly
      ? sortSpomovePresetsByCatalogOrder(presets)
      : sortSpomovePresetsByDisplayTitle(presets);
  }, [
    activeProgramGroup,
    activeThinkingLevel,
    contentOverrides,
    favoriteSpomoveIds,
    guideStatusFilter,
    movementFilter,
    movementLayerEnabled,
    showSavedOnly,
  ]);
  const showFavoritesProgramGroupSections =
    showSavedOnly && activeProgramGroup === 'all' && activeThinkingLevel === 'all';
  const showAxisSections =
    activeProgramGroup === 'all' && activeThinkingLevel === 'all' && !showSavedOnly;
  const guideStatusCounts = useMemo(() => {
    let presets = filterOfficialPresets(activeProgramGroup, activeThinkingLevel);
    if (showSavedOnly) presets = presets.filter((preset) => favoriteSpomoveIds.has(preset.id));
    return GUIDE_STATUS_FILTERS.reduce<Record<GuideStatusFilter, number>>(
      (counts, filter) => {
        counts[filter.id] =
          filter.id === 'all'
            ? presets.length
            : presets.filter(
                (preset) => resolveGuideStatusFilter(preset, contentOverrides[preset.id]) === filter.id,
              ).length;
        return counts;
      },
      {
        all: 0,
        published: 0,
        legacy: 0,
        preparing: 0,
      },
    );
  }, [
    activeProgramGroup,
    activeThinkingLevel,
    contentOverrides,
    favoriteSpomoveIds,
    showSavedOnly,
  ]);
  const guideSummaryText =
    guideStatusCounts.published > 0
      ? `공식 가이드 ${guideStatusCounts.published}개, 기본 안내 ${guideStatusCounts.legacy}개, 세부 안내 예정 ${guideStatusCounts.preparing}개`
      : `공식 가이드는 순차 작성 중입니다. 기본 안내 ${guideStatusCounts.legacy}개와 실행 가능한 활동 ${guideStatusCounts.preparing}개를 먼저 사용할 수 있습니다.`;
  const guideSummaryActionText =
    guideStatusCounts.published > 0
      ? '공식 가이드는 준비·진행·교사 멘트까지 정리된 수업안입니다. 기본 안내는 수업 준비에 필요한 최소 실행안입니다.'
      : '아직 공식 수업안이 없는 활동도 시작할 수 있습니다. 기본 안내에서 준비물과 진행 흐름을 확인하고 활동을 시작하세요.';
  const activeGuideLabel =
    GUIDE_STATUS_FILTERS.find((filter) => filter.id === guideStatusFilter)?.label ?? '전체';
  const programGroupSections = useMemo(() => {
    if (!showFavoritesProgramGroupSections) return [];
    return buildSpomoveProgramGroupSections(filteredPresets);
  }, [filteredPresets, showFavoritesProgramGroupSections]);
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
          thumbnailUrl={resolveThumbnailUrl(thumbnailPaths[preset.id], thumbnailCacheBust)}
          favorite={isFavoriteProgram(ownerId, preset.id)}
          favoriteEnabled={ownerId != null && preset.isReady}
          hubView={hubView}
          contentOverride={contentOverrides[preset.id]}
          onPreview={() => setPreviewPreset(preset)}
          onFavorite={() => toggleFavoriteProgram(ownerId, preset.id)}
        />
      ))}
    </div>
  );

  return (
    <main className="h-full overflow-y-auto" style={{ background: 'var(--spm-bg)' }}>
      <div className="mx-auto w-full max-w-7xl px-4 pb-24 pt-4 sm:px-6 lg:px-8 lg:pb-16">
        {/* 헤더 */}
        <header className="relative overflow-hidden rounded-[24px] border border-slate-200 bg-[linear-gradient(135deg,var(--spm-s1)_0%,var(--spm-s2)_68%,color-mix(in_srgb,var(--spm-s3)_72%,white)_100%)] px-4 py-5 shadow-[0_16px_42px_rgba(15,23,42,0.08)] ring-1 ring-white/70 before:absolute before:inset-x-0 before:top-0 before:h-1 before:bg-[linear-gradient(90deg,#111827_0%,#475569_45%,rgba(71,85,105,0)_100%)] sm:px-5 sm:py-5 lg:px-6">
          <span className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.15em] text-slate-700">
            <MonitorPlay className="h-3.5 w-3.5" />
            화면 활동
          </span>
          <h1 className="mt-2 text-[28px] font-black leading-tight text-slate-950 sm:text-[34px]">
            SPOMOVE
          </h1>
          <p className="mt-2 max-w-2xl text-[14px] font-semibold leading-6 text-slate-600">
            수업 도입·집중 전환·마무리에 큰 화면으로 바로 쓸 수 있는 화면 반응 활동입니다. 활동 종류와
            인지 난이도로 골라보세요.
          </p>
        </header>

        {/* 최근 활동 */}
        <section className="mt-4 rounded-[16px] border border-slate-200 bg-white/86 p-3 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-600">최근 SPOMOVE</p>
              <h2 className="mt-0.5 text-[18px] font-black leading-tight text-slate-950">최근 사용한 활동</h2>
            </div>
            <a href="#spomove-program-list" className="text-sm font-black text-slate-950">활동 선택</a>
          </div>
          {recentSpomoveActivities.length ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {recentSpomoveActivities.map((activity) => {
                const preset = OFFICIAL_SPOMOVE_LIBRARY.find((item) => item.id === activity.programId && isHubListedPreset(item));
                const title = preset ? getSpomovePresetDisplayModel(preset).displayTitle : activity.programTitle;
                const canReproduce = canReproduceSpomoveSameSettings(activity, preset);
                const snapshot = activity.spomoveSnapshot;
                const recentHref = preset
                  ? canReproduce
                    ? publicOfficialPresetSessionHref(preset, {
                        entry: 'start',
                        cueSeconds: snapshot?.cueSeconds ?? activity.cueSeconds,
                        difficulty: snapshot?.difficultyValue ?? activity.difficultyValue,
                        operation:
                          snapshot && snapshot.operationLayerStatus !== 'legacyDisabled'
                            ? snapshot.operation
                            : null,
                      })
                    : publicOfficialPresetSessionHref(preset, { entry: 'start' })
                  : `/spokedu-master/spomove/session?preset=${activity.programId}&mode=projector&sound=on&entry=start`;
                return (
                  <article key={`${activity.ownerId}-${activity.programId}-${activity.occurredAt}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="line-clamp-2 text-sm font-black text-slate-950">{title}</p>
                    {activity.cueSeconds ? (
                      <p className="mt-1 text-[11px] font-semibold text-slate-500">
                        자극 {activity.cueSeconds}초
                      </p>
                    ) : null}
                    <div className="mt-3 grid gap-2">
                      <Link
                        href={recentHref}
                        data-spm-spomove-recent-action="rerun"
                        data-spm-spomove-recent-reproduce={canReproduce ? '1' : '0'}
                        className="spm-btn-primary inline-flex h-9 items-center justify-center rounded-[9px] px-3 text-[12px] font-black focus-visible:outline-none"
                      >
                        {canReproduce ? '같은 설정으로 시작' : '이 활동으로 시작'}
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-[12px] border border-dashed border-slate-200 bg-slate-50 px-3 py-2.5">
              <p className="text-sm font-bold text-slate-600">아직 실행한 SPOMOVE 활동이 없습니다.</p>
              <a href="#spomove-program-list" className="spm-btn-primary inline-flex h-9 items-center justify-center rounded-[9px] px-3 text-[12px] font-black focus-visible:outline-none">활동 선택</a>
            </div>
          )}
        </section>

        <section className="mt-4 rounded-[16px] border border-slate-200 bg-white/80 px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.82)]">
        {/* 저장한 활동 */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] font-black text-slate-950">활동 필터</p>
          <button
            type="button"
            onClick={toggleSavedOnly}
            aria-pressed={showSavedOnly}
            className={`inline-flex h-8 items-center gap-2 rounded-full px-3 text-[12px] font-black transition ${
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
        <div className="mt-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
            <span className="shrink-0 pt-[6px] text-[10px] font-black tracking-[0.08em] text-slate-500 sm:w-[4.5rem]">
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
                    className={spmChipClass(active, 'gap-1.5 font-bold')}
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
        <div className="mt-2">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
            <span className="shrink-0 pt-[6px] text-[10px] font-black tracking-[0.08em] text-slate-500 sm:w-[4.5rem]">
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
                    className={spmChipClass(active, 'gap-1.5 font-bold')}
                  >
                    {THINKING_LEVEL_FILTER_LABELS[tab]}
                    <span className="text-[10px] font-semibold opacity-60">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        <div className="mt-2">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
            <span className="shrink-0 pt-[6px] text-[10px] font-black tracking-[0.08em] text-slate-500 sm:w-[4.5rem]">
              가이드
            </span>
            <div className="flex flex-wrap gap-2">
              {GUIDE_STATUS_FILTERS.map((filter) => {
                const active = guideStatusFilter === filter.id;
                return (
                  <button
                    key={filter.id}
                    type="button"
                    onClick={() => setGuideStatusFilter(filter.id)}
                    className={spmChipClass(active, 'gap-1.5 font-bold')}
                  >
                    {filter.label}
                    <span className="text-[10px] font-semibold opacity-60">{guideStatusCounts[filter.id]}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        {movementLayerEnabled ? (
          <div className="mt-2">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
              <span className="shrink-0 pt-[6px] text-[10px] font-black tracking-[0.08em] text-slate-500 sm:w-[4.5rem]">
                움직임
              </span>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    ['all', '전체'],
                    ['singleMat', '매트 1장'],
                    ['feet', '발 중심'],
                    ['hands', '손 중심'],
                    ['balance', '균형'],
                    ['lowImpact', '낮은 강도'],
                  ] as const
                ).map(([id, label]) => {
                  const active = movementFilter === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setMovementFilter(id)}
                      className={spmChipClass(active, 'font-bold')}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ) : null}
        <p className="mt-3 border-t border-slate-100 pt-2 text-[12px] font-bold text-slate-500">
          현재 조건: <span className="text-slate-800">{activeGuideLabel}</span>{' '}
          <span className="text-slate-300">/</span>{' '}
          <span className="text-slate-800">{filteredPresets.length}개 활동</span>
        </p>
        </section>
        <div className="mt-3 rounded-[12px] border border-slate-200 bg-slate-50 px-3 py-2 text-[12px] font-semibold leading-relaxed text-slate-600">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p>
              <span className="font-black text-slate-800">가이드 현황</span>{' '}
              {guideSummaryText}
            </p>
            {guideStatusCounts.published === 0 && guideStatusCounts.legacy > 0 ? (
              <button
                type="button"
                onClick={() => setGuideStatusFilter('legacy')}
                className="inline-flex h-8 shrink-0 items-center justify-center rounded-full border border-sky-200 bg-white px-3 text-[11px] font-black text-sky-700 hover:bg-sky-50"
              >
                기본 안내 보기
              </button>
            ) : null}
          </div>
          <p className="mt-1 text-slate-500">
            {guideSummaryActionText}
          </p>
        </div>
        {/* 카드 그리드 */}
        {filteredPresets.length > 0 ? (
          showFavoritesProgramGroupSections ? (
            <div id="spomove-program-list" className="mt-4 space-y-8">
              {programGroupSections.map((section) => (
                <section key={section.programGroup}>
                  <header className="flex flex-col gap-1 border-b border-slate-200 pb-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <h2 className="text-xl font-black text-slate-950">
                        {PROGRAM_GROUP_LABELS[section.programGroup]}
                      </h2>
                      <p className="mt-1 text-[13px] font-medium text-slate-500">
                        {section.presets[0]?.programTitle ?? PROGRAM_GROUP_LABELS[section.programGroup]}
                      </p>
                    </div>
                    <p className="text-[12px] font-bold text-slate-400">{section.presets.length}개 활동</p>
                  </header>
                  <div className="mt-5">
                    {renderPresetGrid(section.presets)}
                  </div>
                </section>
              ))}
            </div>
          ) : showAxisSections ? (
            <div id="spomove-program-list" className="mt-4 space-y-8">
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
            <div className="mt-4">{renderPresetGrid(filteredPresets, 'spomove-program-list')}</div>
          )
        ) : (
          <div id="spomove-program-list" className="mt-10 rounded-[18px] border border-dashed border-slate-200 bg-white/72 px-4 py-8 text-center">
            <p className="text-[15px] font-black text-slate-800">
              {guideStatusFilter === 'published'
                ? '아직 이 조건에 맞는 공식 가이드가 없습니다.'
                : showSavedOnly
                  ? '즐겨찾기한 조건에 해당하는 활동이 없습니다.'
                  : `${activeGuideLabel} 조건에 해당하는 활동이 없습니다.`}
            </p>
            <p className="mx-auto mt-2 max-w-xl text-[13px] font-semibold leading-6 text-slate-500">
              {guideStatusFilter === 'published'
                ? '공식 가이드가 작성되기 전에도 기본 안내와 화면 활동은 진행할 수 있습니다. 수업을 곧 해야 한다면 기본 안내 또는 전체 목록으로 전환하세요.'
                : '활동 종류, 인지 난이도, 가이드 상태 조건을 넓히면 더 많은 SPOMOVE 활동을 볼 수 있습니다.'}
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {guideStatusFilter === 'published' && guideStatusCounts.legacy > 0 ? (
                <button
                  type="button"
                  onClick={() => setGuideStatusFilter('legacy')}
                  className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-2 text-[13px] font-black text-sky-700 hover:bg-sky-100"
                >
                  기본 안내 보기
                </button>
              ) : null}
              <button
                type="button"
                onClick={clearHubFilters}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-[13px] font-bold text-slate-600 hover:border-[color-mix(in_srgb,var(--spm-acc)_35%,transparent)] hover:text-[var(--spm-acc)]"
              >
                전체 보기
              </button>
            </div>
          </div>
        )}
        <SharedSpomoveGuidelineSheet
          preset={previewPreset}
          guideVideoUrl={previewPreset ? guideVideoUrls[previewPreset.id] ?? '' : ''}
          contentOverride={previewPreset ? contentOverrides[previewPreset.id] : undefined}
          hubView={hubView}
          onClose={() => setPreviewPreset(null)}
        />
      </div>
    </main>
  );
}
