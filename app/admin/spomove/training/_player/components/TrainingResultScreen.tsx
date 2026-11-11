'use client';
import React, { useState } from 'react';
import type { GlassBridgeResult } from '../lib/glassBridgeMemory';
import type { DiveActionMoveSession } from '../lib/diveActionMoveReport';
import type { ColorStimulusCounts, TrainingResultConfig } from '../lib/trainingResultSummary';
import type { SpomoveCompletionReason } from '@/app/spokedu-master/spomove/session/sessionResultModel';
import { useViewportScrollLock } from '../lib/lockViewportScroll';
import { ColorResultV2, isColorResultV2 } from './result-v2/ColorResultV2';
import { DirectionResultV2, isDirectionResultV2 } from './result-v2/DirectionResultV2';
import { ZoneResultV2, isZoneResultV2 } from './result-v2/ZoneResultV2';
import { UnifiedResultV2 } from './result-v2/UnifiedResultV2';

type StudentBadge = { name: string; color: string };

/** MASTER 세션 등 — 측정 점수가 아닌 실제 사용 설정 요약 */
export type TrainingResultSessionSettings = {
  title?: string;
  primary: string;
  secondary?: string;
};

type Props = {
  officialPresetId?: string;
  goalkeeperRecord?: import('../lib/goalkeeperResultRecord').GoalkeeperResultRecord;
  cfg: TrainingResultConfig;
  /** Canonical terminal state shared by Admin, Teacher and MASTER/LAB. */
  completionReason?: SpomoveCompletionReason;
  elapsedMs: number;
  colorCounts: ColorStimulusCounts | null;
  stims?: number;
  directionRecord?: import('../lib/directionPresentation').DirectionPresentationRecord;
  /** Compatibility input; all shared result rendering now uses V2. */
  enhancedFeedback?: boolean;
  glassBridge?: GlassBridgeResult;
  levelLabel: string;
  title?: string;
  statusBadge?: string | null;
  programTitle?: string;
  education?: { description: string; tags: string[] };
  student?: StudentBadge | null;
  /** 유효한 실제 사용 설정 요약입니다. */
  sessionSettings?: TrainingResultSessionSettings | null;
  footer?: React.ReactNode;
  resultActions?: React.ReactNode;
  resultNotice?: React.ReactNode;
  /** DIVE 액션무브 결과만. 없으면 기존 훈련 리포트를 유지한다. */
  diveActionMove?: DiveActionMoveSession | null;
  /** MASTER execution-volume SSOT. Admin results keep describeSessionVolume. */
  volumeLabel?: string;
  onBack: () => void;
  onRetry: () => void;
  retryLabel?: string;
};

/** Single V2 entry point for Admin, Teacher presets and LAB; no legacy fallback.
 * Common markup lives in ResultV2Frame; record panels keep activity-specific semantics.
 */
export function TrainingResultScreen(props: Props) {
  const [educationSeed] = useState(() => Math.floor(Math.random() * 1024));
  const [theme] = useState(() => typeof window !== 'undefined' && localStorage.getItem('spokedu_theme') === 'dark' ? 'dark' : 'light');
  useViewportScrollLock(true);
  if (isColorResultV2(props.cfg)) return <ColorResultV2 {...props} seed={educationSeed} theme={theme} />;
  if (isDirectionResultV2(props.cfg, props.officialPresetId)) return <DirectionResultV2 {...props} seed={educationSeed} theme={theme} />;
  if (isZoneResultV2(props.cfg, props.officialPresetId)) return <ZoneResultV2 {...props} seed={educationSeed} theme={theme} />;
  return <UnifiedResultV2 {...props} seed={educationSeed} theme={theme} />;
}
