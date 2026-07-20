'use client';

import { ChevronDown, ClipboardList, Maximize, Minimize, Play, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { TrainingResultScreen } from '@/app/admin/spomove/training/_player/components/TrainingResultScreen';
import { resultLevelLabel } from '@/app/admin/spomove/training/_player/lib/trainingResultSummary';
import { BgmPlayer } from '@/app/lib/admin/audio/bgmPlayer';
import { getPublicUrl } from '@/app/lib/admin/assets/storageClient';
import { useSpomoveTrainingBGM } from '@/app/lib/admin/hooks/useSpomoveTrainingBGM';
import { getAudioCtx } from '@/app/admin/spomove/training/_player/lib/audio';

import { useMasterStore, useProfile } from '../../store';
import { ErrorBoundary } from '../../components/ui/ErrorBoundary';
import { EngineRouter, type EngineCompletePayload } from './EngineRouter';
import { lockViewportScroll } from '@/app/admin/spomove/training/_player/lib/lockViewportScroll';
import { officialPresetToTrainingResultConfig } from './sessionResultModel';
import {
  findOfficialSpomovePreset,
  standardSpomoveDurationSec,
  type OfficialSpomovePreset,
} from '../officialSpomovePresets';
import {
  SPOMOVE_KEY_ACTION_LABELS,
  SPOMOVE_TARGET_GROUP_LABELS,
  SPOMOVE_THINKING_LEVEL_LABELS,
  getOfficialSpomovePresetGuide,
} from '../officialSpomovePresetGuides';
import { getSpomovePresetDisplayModel } from '../spomovePresetDisplayModel';
import {
  applySpomoveDifficulty,
  getSpomoveDifficultyKind,
  getSpomoveDifficultyOptions,
  readSpomoveDifficultyValue,
  type SpomoveDifficultyKind,
} from '../spomoveDifficulty';
import {
  SPOMOVE_CUE_SPEED_OPTIONS,
  clampCueSpeedSec,
  formatCueSpeedTargetLabel,
  getCueSpeedGuide,
  recommendedCueSecondsForPreset,
  resolveInitialCueSeconds,
  supportsCueSpeedOverride,
  writeLastCueSeconds,
  type SpomoveCueSpeedSec,
} from '../spomoveCueSpeed';
import { SpomovePadLayoutView } from '../SpomovePadLayoutView';
import { getSpomovePadLayoutVariant } from '../spomovePadLayout';
import { buildSpomoveRecordDraft, buildSpomoveRecordHref } from './spomoveRecordDraft';
import { MovementHud } from '../movements/MovementHud';
import { isSpomoveMovementLayerEnabled } from '../movements/movementFlag';
import { getMovementProfile } from '../movements/movementProfiles';
import {
  parseMovementQuery,
  resolveMovementConfiguration,
  resolveMovementPick,
  resolveSessionConfiguration,
} from '../movements/movementResolve';
import {
  hasSeenMovementIntro,
  markMovementIntroSeen,
  readFamilyMovement,
  writeFamilyMovement,
} from '../movements/movementStorage';
import {
  appendMovementUsageEvent,
  createMovementSessionId,
} from '../movements/movementUsage';
import type { MovementPick, ResolvedMovementConfiguration } from '../movements/movementTypes';
type SessionState = 'idle' | 'running' | 'done' | 'ended';
type LaunchMode = 'projector' | 'mobile';

function normalizeMode(mode: string | null): LaunchMode {
  if (mode === 'projector' || mode === 'mobile') return mode;
  if (mode === 'class') return 'mobile';
  return 'projector';
}

function getModeLabel(mode: LaunchMode) {
  if (mode === 'projector') return '큰 화면 모드';
  return '모바일 모드';
}

function TopBar({
  drillName,
  mode,
  isFullscreen,
  onToggleFullscreen,
  onExit,
}: {
  drillName: string;
  mode: LaunchMode;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onExit: () => void;
}) {
  const isMobile = mode === 'mobile';
  return (
    <div
      className={`absolute inset-x-0 top-0 z-20 flex items-center justify-between gap-3 bg-gradient-to-b from-black/72 to-transparent py-3 ${
        isMobile ? 'min-h-[60px] px-4' : 'min-h-[72px] px-5 sm:px-7'
      }`}
      style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
    >
      <div className="min-w-0">
        <p className="text-[11px] font-black uppercase tracking-[0.12em] text-white/42">{getModeLabel(mode)}</p>
        <p className="mt-1 line-clamp-1 text-sm font-semibold text-white/70">{drillName}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {!isMobile ? (
          <button type="button" onClick={onToggleFullscreen} className="grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white" aria-label={isFullscreen ? '전체화면 해제' : '전체화면'}>
            {isFullscreen ? <Minimize size={15} /> : <Maximize size={15} />}
          </button>
        ) : null}
        <button type="button" onClick={onExit} className="grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white" aria-label="나가기">
          <X size={16} />
        </button>
      </div>
    </div>
  );
}

function OfficialEngineBriefing({
  preset,
  startDisabled,
  launchMode,
  cueSeconds,
  onCueSecondsChange,
  difficultyKind,
  difficultyValue,
  onDifficultyChange,
  onStart,
  movement,
  cueFloorNotice,
}: {
  preset: OfficialSpomovePreset;
  startDisabled: boolean;
  launchMode: LaunchMode;
  cueSeconds: SpomoveCueSpeedSec;
  onCueSecondsChange: (value: SpomoveCueSpeedSec) => void;
  difficultyKind: SpomoveDifficultyKind | null;
  difficultyValue: string;
  onDifficultyChange: (value: string) => void;
  onStart: () => void;
  movement?: ResolvedMovementConfiguration | null;
  cueFloorNotice?: string | null;
}) {
  const isMobile = launchMode === 'mobile';
  const guide = getOfficialSpomovePresetGuide(preset);
  const display = getSpomovePresetDisplayModel(preset);
  const showCueSpeed = supportsCueSpeedOverride(preset);
  const difficultyOptions = difficultyKind ? getSpomoveDifficultyOptions(difficultyKind) : [];
  const [detailsOpen, setDetailsOpen] = useState(false);
  const selectedGuide = getCueSpeedGuide(cueSeconds);
  const recommendedSec = recommendedCueSecondsForPreset(preset);
  const recommendedGuide = getCueSpeedGuide(recommendedSec);
  const isRecommendedSelected = cueSeconds === recommendedSec;

  const startLabel = startDisabled
    ? '불러오는 중…'
    : showCueSpeed
      ? `${cueSeconds}초로 시작`
      : isMobile
        ? '지금 시작'
        : '큰 화면으로 시작';

  return (
    <div className="flex min-h-min w-full justify-center px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[calc(4.75rem+env(safe-area-inset-top))] sm:px-8">
      <section className="w-full max-w-[560px] rounded-[28px] border border-white/10 bg-white/[0.06] shadow-[0_28px_90px_rgba(0,0,0,0.38)] backdrop-blur-xl">
        <div className="px-5 pt-6 sm:px-7 sm:pt-8">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-black text-white/70">
              {display.programLabel}
            </span>
            <span className="rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-[11px] font-black text-white/55">
              {isMobile ? '이 기기' : '큰 화면'}
            </span>
          </div>
          <h1 className={`mt-3 font-black leading-tight text-white ${isMobile ? 'text-[26px]' : 'text-[32px]'}`}>
            {display.displayTitle}
          </h1>
          <p className="mt-2 text-[15px] font-black leading-snug text-[color-mix(in_srgb,var(--spm-acc)_80%,white)]">
            {difficultyKind
              ? '난이도를 고르고 시작하세요'
              : showCueSpeed
                ? '속도만 고르고 시작하세요'
                : '준비가 되면 바로 시작하세요'}
          </p>
          {movement ? (
            <div className="mt-4 rounded-2xl border border-white/10 bg-black/25 px-3.5 py-3">
              <p className="text-[11px] font-black uppercase tracking-[0.12em] text-white/45">오늘의 동작</p>
              <p className="mt-1 text-[18px] font-black text-white">{movement.displayLabel}</p>
              <p className="mt-1 text-[12px] font-semibold leading-5 text-white/65">{movement.hudLabel}</p>
            </div>
          ) : null}
        </div>

        <div className="px-5 pt-5 sm:px-7">
          {difficultyKind ? (
            <div className="mb-4 rounded-[22px] border border-white/10 bg-black/25 p-4 sm:p-5">
              <p className="text-[12px] font-black tracking-[0.08em] text-white/55">난이도</p>
              <div className="mt-3 flex gap-2">
                {difficultyOptions.map((opt) => {
                  const active = difficultyValue === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => onDifficultyChange(opt.value)}
                      className={`flex-1 rounded-xl px-2 py-3 text-center transition ${
                        active
                          ? 'bg-[var(--spm-acc)] text-white shadow-[0_10px_28px_rgba(0,0,0,0.28)]'
                          : 'border border-white/15 bg-black/30 text-white/80 hover:border-white/35 hover:text-white'
                      }`}
                    >
                      <span className="block text-[18px] font-black">{opt.label}</span>
                      <span className={`mt-1 block text-[10px] font-bold ${active ? 'text-white/80' : 'text-white/45'}`}>
                        {opt.sub}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
          {showCueSpeed ? (
            <div className="rounded-[22px] border border-[color-mix(in_srgb,var(--spm-acc)_35%,transparent)] bg-[color-mix(in_srgb,var(--spm-acc)_12%,transparent)] p-4 sm:p-5">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-[12px] font-black tracking-[0.08em] text-white/55">자극 속도</p>
                  <p className="mt-1 text-[13px] font-semibold text-white/50">신호가 바뀌는 간격 · 마지막 선택 기억</p>
                </div>
                <p className="text-[34px] font-black leading-none tracking-tight text-white tabular-nums">
                  {cueSeconds}
                  <span className="ml-1 text-[16px] font-black text-white/55">초</span>
                </p>
              </div>
              <div className="mt-4 grid grid-cols-5 gap-2">
                {SPOMOVE_CUE_SPEED_OPTIONS.map((sec) => {
                  const active = cueSeconds === sec;
                  const recommended = sec === recommendedSec;
                  const minCue = movement
                    ? resolveSessionConfiguration({ movement, cueSeconds: 1 }).minimumCueSeconds
                    : 1;
                  const disabled = sec < minCue;
                  return (
                    <button
                      key={sec}
                      type="button"
                      disabled={disabled}
                      onClick={() => onCueSecondsChange(sec)}
                      title={
                        disabled
                          ? `${movement?.displayLabel ?? '이 동작'}은 ${minCue}초 이상`
                          : `${sec}초 · ${getCueSpeedGuide(sec).tempoLabel}`
                      }
                      className={`relative inline-flex h-12 items-center justify-center rounded-xl text-[15px] font-black transition ${
                        disabled
                          ? 'cursor-not-allowed border border-white/5 bg-black/20 text-white/25'
                          : active
                            ? 'bg-[var(--spm-acc)] text-white shadow-[0_10px_28px_rgba(0,0,0,0.28)]'
                            : 'border border-white/15 bg-black/30 text-white/80 hover:border-white/35 hover:text-white'
                      }`}
                    >
                      {sec}
                      {recommended && !disabled ? (
                        <span
                          className={`absolute -bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full ${
                            active ? 'bg-white' : 'bg-[var(--spm-acc)]'
                          }`}
                          aria-hidden
                        />
                      ) : null}
                    </button>
                  );
                })}
              </div>
              {cueFloorNotice ? (
                <p className="mt-3 text-[12px] font-bold leading-5 text-amber-200/90">{cueFloorNotice}</p>
              ) : null}

              <div className="mt-4 rounded-2xl border border-white/10 bg-black/25 px-3.5 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-white/12 px-2.5 py-0.5 text-[11px] font-black text-white">
                    {selectedGuide.tempoLabel}
                  </span>
                  <span className="text-[11px] font-black text-white/55">
                    추천 {formatCueSpeedTargetLabel(selectedGuide.recommendTargets)}
                  </span>
                  {isRecommendedSelected ? (
                    <span className="rounded-full border border-[color-mix(in_srgb,var(--spm-acc)_45%,transparent)] bg-[color-mix(in_srgb,var(--spm-acc)_18%,transparent)] px-2 py-0.5 text-[10px] font-black text-[color-mix(in_srgb,var(--spm-acc)_85%,white)]">
                      이 활동 추천
                    </span>
                  ) : null}
                </div>
                <p className="mt-2 text-[12px] font-black leading-5 text-white/78">{selectedGuide.reason}</p>
                <p className="mt-1 text-[12px] font-semibold leading-5 text-white/50">{selectedGuide.summary}</p>
                {!isRecommendedSelected ? (
                  <button
                    type="button"
                    onClick={() => onCueSecondsChange(recommendedSec)}
                    className="mt-2.5 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.06] px-3 py-1.5 text-[11px] font-black text-white/80 transition hover:border-white/30 hover:text-white"
                  >
                    이 활동 추천 {recommendedSec}초
                    <span className="font-semibold text-white/45">
                      ({formatCueSpeedTargetLabel(recommendedGuide.recommendTargets)} · {recommendedGuide.tempoLabel})
                    </span>
                  </button>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="rounded-[22px] border border-white/10 bg-black/25 px-4 py-4">
              <p className="text-[12px] font-black tracking-[0.08em] text-white/45">이 활동</p>
              <p className="mt-1 text-sm font-bold text-white/75">
                {display.durationLabel}
                <span className="mx-2 text-white/25">·</span>
                {preset.rounds}회
              </p>
              <p className="mt-2 text-[12px] font-semibold text-white/45">속도 조절이 없는 활동입니다.</p>
            </div>
          )}

          <button
            type="button"
            onClick={onStart}
            disabled={startDisabled}
            className="mt-4 inline-flex h-14 w-full items-center justify-center gap-2.5 rounded-2xl bg-white text-[16px] font-black text-black shadow-[0_18px_55px_rgba(255,255,255,0.18)] transition hover:scale-[1.01] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Play className="h-5 w-5 fill-black" />
            {startLabel}
          </button>
          <p className="mt-2 text-center text-[11px] font-semibold text-white/38">
            {showCueSpeed ? '선택한 속도로 바로 실행됩니다' : '화면이 준비되면 바로 실행됩니다'}
          </p>
        </div>

        <div className="mt-5 border-t border-white/10 px-5 py-4 sm:px-7">
          <button
            type="button"
            onClick={() => setDetailsOpen((open) => !open)}
            aria-expanded={detailsOpen}
            className="flex w-full items-center justify-between gap-3 rounded-xl px-1 py-1 text-left"
          >
            <span className="text-[13px] font-black text-white/70">자세히 보기</span>
            <ChevronDown
              className={`h-4 w-4 text-white/45 transition-transform ${detailsOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {detailsOpen ? (
            <div className="mt-3 space-y-3">
              <p className="text-sm font-semibold leading-6 text-white/55">{preset.description}</p>
              <div className="flex flex-wrap gap-1.5">
                <span className="rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-[11px] font-black text-white/70">
                  {display.durationLabel}
                </span>
                <span className="rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-[11px] font-black text-white/70">
                  {preset.rounds}회
                </span>
                <span className="rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-[11px] font-black text-white/70">
                  {SPOMOVE_THINKING_LEVEL_LABELS[guide.thinkingLevel]}
                </span>
                {!showCueSpeed ? (
                  <span className="rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-[11px] font-black text-white/70">
                    자극 속도 {preset.cueSeconds}초
                  </span>
                ) : null}
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.12em] text-white/35">추천 대상</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {guide.targetGroups.map((target) => (
                    <span
                      key={target}
                      className="rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-[11px] font-black text-white/70"
                    >
                      {SPOMOVE_TARGET_GROUP_LABELS[target]}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.12em] text-white/35">주요 동작</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {guide.keyActions.map((action) => (
                    <span
                      key={action}
                      className="rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-[11px] font-black text-white/70"
                    >
                      {SPOMOVE_KEY_ACTION_LABELS[action]}
                    </span>
                  ))}
                </div>
              </div>
              <div className="overflow-hidden rounded-2xl border border-white/10 bg-white p-3 text-slate-950">
                <SpomovePadLayoutView variant={getSpomovePadLayoutVariant(preset)} />
              </div>
              {preset.recommendedUse ? (
                <p className="text-[12px] font-semibold leading-5 text-white/42">{preset.recommendedUse}</p>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function UnsupportedPreset() {
  return (
    <main className="flex h-dvh items-center justify-center bg-slate-950 px-5 text-white">
      <section className="w-full max-w-lg rounded-[28px] border border-white/10 bg-white/[0.06] p-8 text-center">
        <X className="mx-auto h-8 w-8 text-rose-300" />
        <h1 className="mt-5 text-2xl font-black">지원하지 않는 SPOMOVE 활동입니다.</h1>
        <p className="mt-3 text-sm font-semibold text-white/55">공식 SPOMOVE 목록에서 활동을 다시 선택해 주세요.</p>
        <Link href="/spokedu-master/spomove" className="mt-6 inline-flex h-12 items-center justify-center rounded-2xl bg-white px-6 text-sm font-black text-slate-950">
          프로그램 선택으로
        </Link>
      </section>
    </main>
  );
}

function SpomoveSessionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const userProfile = useProfile();
  const movementLayerEnabled = useMemo(
    () =>
      isSpomoveMovementLayerEnabled({
        isAdmin: userProfile?.isAdmin,
        userId: userProfile?.id,
        userRole: userProfile?.isAdmin ? 'admin' : undefined,
      }),
    [userProfile?.id, userProfile?.isAdmin],
  );
  const presetId = searchParams.get('preset') ?? '';
  const baseOfficialPreset = useMemo(() => findOfficialSpomovePreset(presetId), [presetId]);
  const difficultyKind = useMemo(
    () => (baseOfficialPreset ? getSpomoveDifficultyKind(baseOfficialPreset) : null),
    [baseOfficialPreset],
  );
  const [difficultyValue, setDifficultyValue] = useState(() =>
    baseOfficialPreset && difficultyKind
      ? readSpomoveDifficultyValue(baseOfficialPreset, difficultyKind)
      : '1',
  );
  useEffect(() => {
    if (!baseOfficialPreset || !difficultyKind) return;
    setDifficultyValue(readSpomoveDifficultyValue(baseOfficialPreset, difficultyKind));
  }, [baseOfficialPreset, difficultyKind]);
  const officialPreset = useMemo(() => {
    if (!baseOfficialPreset) return null;
    if (!difficultyKind) return baseOfficialPreset;
    return applySpomoveDifficulty(baseOfficialPreset, difficultyKind, difficultyValue);
  }, [baseOfficialPreset, difficultyKind, difficultyValue]);
  const displayModel = useMemo(
    () => (officialPreset ? getSpomovePresetDisplayModel(officialPreset) : null),
    [officialPreset],
  );
  const launchMode = normalizeMode(searchParams.get('mode'));
  const autostart = searchParams.get('autostart') === '1';
  const requestedBgmPath = searchParams.get('bgm') ?? '';
  const soundEnabled = searchParams.get('sound') !== 'off';
  const programId = searchParams.get('program') ?? '';
  const programs = useMasterStore((state) => state.programs);
  const recordRecentProgramActivity = useMasterStore((state) => state.recordRecentProgramActivity);
  const program = useMemo(() => programs.find((item) => item.id === programId) ?? null, [programId, programs]);
  const { list: bgmList, loading: bgmLoading } = useSpomoveTrainingBGM();
  const selectedBgmPath = useMemo(() => {
    if (requestedBgmPath) return bgmList.includes(requestedBgmPath) ? requestedBgmPath : '';
    if (officialPreset && bgmList.length > 0)
      return bgmList[Math.floor(Math.random() * bgmList.length)]!;
    return '';
  }, [bgmList, officialPreset, requestedBgmPath]);

  const movementProfile = useMemo(() => {
    if (!movementLayerEnabled || !officialPreset?.movementProfileId) return null;
    return getMovementProfile(officialPreset.movementProfileId);
  }, [movementLayerEnabled, officialPreset]);

  const urlMovement = useMemo(
    () => parseMovementQuery(searchParams.get('movement'), searchParams.get('limb')),
    [searchParams],
  );

  const [movementPick, setMovementPick] = useState<MovementPick | null>(null);
  const [movementSource, setMovementSource] = useState<'recommended' | 'saved' | 'url' | 'changed'>(
    'recommended',
  );
  const [showMovementIntro, setShowMovementIntro] = useState(false);
  const [hudCollapsed, setHudCollapsed] = useState(false);
  const movementSessionIdRef = useRef(createMovementSessionId());

  useEffect(() => {
    if (!movementProfile || !officialPreset?.activityFamilyId) {
      setMovementPick(null);
      return;
    }
    if (movementProfile.selectionMode === 'disabled') {
      setMovementPick(null);
      return;
    }
    const saved = readFamilyMovement(officialPreset.activityFamilyId);
    const resolved = resolveMovementPick({
      profile: movementProfile,
      urlMovement,
      savedMovement: saved,
    });
    setMovementPick(resolved);
    if (urlMovement && resolved && urlMovement.baseMovement === resolved.baseMovement && urlMovement.limbRule === resolved.limbRule) {
      setMovementSource('url');
    } else if (saved && resolved && saved.baseMovement === resolved.baseMovement && saved.limbRule === resolved.limbRule) {
      setMovementSource('saved');
    } else {
      setMovementSource('recommended');
    }
  }, [movementProfile, officialPreset?.activityFamilyId, urlMovement]);

  const resolvedMovement: ResolvedMovementConfiguration | null = useMemo(() => {
    if (!movementProfile || !movementPick) return null;
    return resolveMovementConfiguration(movementPick, movementProfile);
  }, [movementPick, movementProfile]);

  const [state, setState] = useState<SessionState>('idle');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [cueSeconds, setCueSeconds] = useState<SpomoveCueSpeedSec>(() =>
    officialPreset ? resolveInitialCueSeconds(officialPreset) : 3,
  );
  const bgmPlayerRef = useRef<BgmPlayer | null>(null);
  const startLockedRef = useRef(false);
  const sessionStartedAtRef = useRef<number | null>(null);
  const [sessionResult, setSessionResult] = useState<EngineCompletePayload | null>(null);

  useEffect(() => {
    if (!officialPreset) return;
    setCueSeconds(resolveInitialCueSeconds(officialPreset));
  }, [officialPreset]);

  const handleCueSecondsChange = useCallback(
    (value: SpomoveCueSpeedSec) => {
      if (movementPick && movementProfile) {
        const session = resolveSessionConfiguration({
          movement: resolveMovementConfiguration(movementPick, movementProfile),
          cueSeconds: value,
        });
        if (session.cueAdjusted) {
          setCueSeconds(writeLastCueSeconds(clampCueSpeedSec(session.cueSeconds) as SpomoveCueSpeedSec));
          return;
        }
      }
      setCueSeconds(writeLastCueSeconds(value));
    },
    [movementPick, movementProfile],
  );

  const effectiveCueSeconds = useMemo(() => {
    if (!officialPreset) return cueSeconds;
    let next = !supportsCueSpeedOverride(officialPreset)
      ? clampCueSpeedSec(officialPreset.cueSeconds)
      : cueSeconds;
    if (resolvedMovement) {
      const session = resolveSessionConfiguration({ movement: resolvedMovement, cueSeconds: next });
      next = clampCueSpeedSec(session.cueSeconds);
    }
    return next;
  }, [cueSeconds, officialPreset, resolvedMovement]);

  const cueFloorNotice = useMemo(() => {
    if (!resolvedMovement || !officialPreset || !supportsCueSpeedOverride(officialPreset)) return null;
    const session = resolveSessionConfiguration({
      movement: resolvedMovement,
      cueSeconds: cueSeconds,
    });
    if (!session.cueAdjusted) return null;
    return `${resolvedMovement.displayLabel}는 안전한 수행을 위해 ${session.minimumCueSeconds}초 이상으로 진행합니다.`;
  }, [cueSeconds, officialPreset, resolvedMovement]);

  const recordProgramHref = program && officialPreset && sessionResult
    ? buildSpomoveRecordHref(
        program.id,
        buildSpomoveRecordDraft({
          elapsedMs: sessionResult.elapsedMs,
          preset: officialPreset,
          status: state === 'done' ? 'done' : 'ended',
          movementLabel: resolvedMovement?.displayLabel,
        }),
      )
    : program
      ? `/spokedu-master/class-record?program=${program.id}`
      : null;

  const stopBgm = useCallback(() => {
    try {
      bgmPlayerRef.current?.stop();
    } catch {
      // Audio cleanup must not block session exit.
    }
    bgmPlayerRef.current = null;
  }, []);

  useEffect(() => stopBgm, [stopBgm]);

  useEffect(() => {
    const handler = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  const exitFullscreenAfterSession = useCallback(() => {
    if (typeof document === 'undefined' || !document.fullscreenElement) return;
    void document.exitFullscreen?.().catch(() => undefined);
  }, []);

  const startOfficialSession = useCallback(() => {
    if (!officialPreset || bgmLoading || !officialPreset.isReady || startLockedRef.current) return;
    lockViewportScroll();
    startLockedRef.current = true;
    stopBgm();
    if (launchMode === 'projector' && !document.fullscreenElement) {
      void document.documentElement.requestFullscreen?.().catch(() => undefined);
    }
    if (soundEnabled) getAudioCtx();
    // flow 모드: MemoryGameApp 내부 BGM이 처리하므로 session-level BgmPlayer 생략
    if (selectedBgmPath && officialPreset.engine.mode !== 'flow') {
      const player = new BgmPlayer();
      player.init(getPublicUrl(selectedBgmPath), 0.35);
      bgmPlayerRef.current = player;
      void player.play();
      player.fadeIn(180);
    }
    setSessionResult(null);
    movementSessionIdRef.current = createMovementSessionId();

    let introMs = 0;
    if (resolvedMovement && movementPick && officialPreset.activityFamilyId) {
      writeFamilyMovement(officialPreset.activityFamilyId, movementPick);
      const needsIntro = !hasSeenMovementIntro(officialPreset.activityFamilyId, movementPick);
      setShowMovementIntro(needsIntro);
      if (needsIntro) {
        markMovementIntroSeen(officialPreset.activityFamilyId, movementPick);
        introMs = 2200;
      }
      appendMovementUsageEvent({
        eventType: 'session_started',
        sessionId: movementSessionIdRef.current,
        presetId: officialPreset.id,
        activityFamilyId: officialPreset.activityFamilyId,
        baseMovement: movementPick.baseMovement,
        limbRule: movementPick.limbRule,
        source: movementSource,
        cueSeconds: effectiveCueSeconds,
      });
    } else {
      setShowMovementIntro(false);
    }

    setState('running');
    sessionStartedAtRef.current = Date.now();
    const display = getSpomovePresetDisplayModel(officialPreset);
    recordRecentProgramActivity({
      programId: officialPreset.id,
      programTitle: display.displayTitle,
      action: 'spomove_started',
      occurredAt: new Date().toISOString(),
      activityFamilyId: officialPreset.activityFamilyId,
      baseMovement: movementPick?.baseMovement,
      limbRule: movementPick?.limbRule,
      movementLabel: resolvedMovement?.displayLabel,
      cueSeconds: effectiveCueSeconds,
    });
    window.setTimeout(() => {
      startLockedRef.current = false;
    }, 400);
    if (introMs > 0) {
      window.setTimeout(() => setShowMovementIntro(false), introMs);
    }
  }, [
    bgmLoading,
    effectiveCueSeconds,
    launchMode,
    movementPick,
    movementSource,
    officialPreset,
    recordRecentProgramActivity,
    resolvedMovement,
    selectedBgmPath,
    soundEnabled,
    stopBgm,
  ]);

  const finishSession = useCallback((nextState: Extract<SessionState, 'done' | 'ended'>, payload?: EngineCompletePayload) => {
    if (!officialPreset) return;
    stopBgm();
    exitFullscreenAfterSession();
    setShowMovementIntro(false);
    const startedAt = sessionStartedAtRef.current;
    const fallbackElapsedMs = startedAt ? Math.max(1, Date.now() - startedAt) : 0;
    if (movementPick && officialPreset.activityFamilyId) {
      appendMovementUsageEvent({
        eventType: nextState === 'done' ? 'session_completed' : 'session_exited',
        sessionId: movementSessionIdRef.current,
        presetId: officialPreset.id,
        activityFamilyId: officialPreset.activityFamilyId,
        baseMovement: movementPick.baseMovement,
        limbRule: movementPick.limbRule,
        source: movementSource,
        cueSeconds: effectiveCueSeconds,
      });
    }
    setSessionResult({
      engineMode: payload?.engineMode ?? officialPreset.engine.mode,
      engineLevel: payload?.engineLevel ?? officialPreset.engine.level,
      elapsedMs: payload?.elapsedMs ?? fallbackElapsedMs,
      colorCounts: payload?.colorCounts ?? null,
      stims: payload?.stims,
      maxCombo: payload?.maxCombo,
    });
    setState(nextState);
  }, [
    effectiveCueSeconds,
    exitFullscreenAfterSession,
    movementPick,
    movementSource,
    officialPreset,
    stopBgm,
  ]);

  useEffect(() => {
    if (state === 'done' || state === 'ended') exitFullscreenAfterSession();
  }, [exitFullscreenAfterSession, state]);

  useEffect(() => {
    if (!autostart || state !== 'idle' || !officialPreset || bgmLoading || !officialPreset.isReady) return;
    startOfficialSession();
  }, [autostart, bgmLoading, officialPreset, startOfficialSession, state]);

  const showBriefing = state === 'idle' && !autostart;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'Space' && (state === 'idle' || state === 'done')) {
        event.preventDefault();
        startOfficialSession();
      }
      if (event.key.toLowerCase() === 'f') {
        if (!document.fullscreenElement) void document.documentElement.requestFullscreen?.().catch(() => undefined);
        else void document.exitFullscreen?.().catch(() => undefined);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [startOfficialSession, state]);

  if (!officialPreset) return <UnsupportedPreset />;

  if (state === 'running') {
    return (
      <div className="relative h-dvh overflow-hidden bg-black">
        <EngineRouter
          durationSec={
            officialPreset.engine.mode === 'reactTrain'
              ? standardSpomoveDurationSec(effectiveCueSeconds, officialPreset.rounds)
              : undefined
          }
          mode={officialPreset.engine.mode}
          level={officialPreset.engine.level}
          speedSec={effectiveCueSeconds}
          rounds={officialPreset.rounds}
          soundEnabled={soundEnabled}
          variantColorTheme={officialPreset.engine.variantColorTheme}
          bodyLabelMode={officialPreset.engine.bodyLabelMode}
          hideBodyLabelModeControls={officialPreset.engine.hideBodyLabelModeControls}
          spatialArrowColorMode={officialPreset.engine.spatialArrowColorMode}
          spatialArrowColorMapping={officialPreset.engine.spatialArrowColorMapping}
          reactTrainConcurrent={officialPreset.engine.reactTrainConcurrent}
          moleLookMode={officialPreset.engine.moleLookMode}
          numberCartTier={officialPreset.engine.numberCartTier}
          colorTrackerTier={officialPreset.engine.colorTrackerTier}
          colorTrackerDualPanel={officialPreset.engine.colorTrackerDualPanel}
          camouflagePlacement={officialPreset.engine.camouflagePlacement}
          flowFeatures={officialPreset.engine.flowFeatures}
          flowDuration={officialPreset.engine.flowDuration}
          flowLayout={officialPreset.engine.flowLayout}
          flowIncludeBonus={officialPreset.engine.flowIncludeBonus}
          flankerStimulusType={officialPreset.engine.flankerStimulusType}
          onExit={() => {
            finishSession('ended');
          }}
          onComplete={(payload) => {
            finishSession('done', payload);
          }}
        />
        {showMovementIntro && resolvedMovement ? (
          <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center bg-black/55 px-6">
            <div className="max-w-md rounded-3xl border border-white/15 bg-black/70 px-6 py-5 text-center text-white shadow-2xl backdrop-blur-md">
              <p className="text-[11px] font-black uppercase tracking-[0.14em] text-white/50">오늘의 동작</p>
              <p className="mt-2 text-[28px] font-black">{resolvedMovement.displayLabel}</p>
              <p className="mt-3 text-[14px] font-semibold leading-relaxed text-white/80">
                {resolvedMovement.instruction}
              </p>
            </div>
          </div>
        ) : null}
        {resolvedMovement ? (
          <MovementHud
            movement={resolvedMovement}
            collapsed={hudCollapsed}
            compact={launchMode === 'mobile'}
            onToggleCollapsed={() => {
              setHudCollapsed((prev) => {
                const next = !prev;
                if (movementPick && officialPreset.activityFamilyId) {
                  appendMovementUsageEvent({
                    eventType: next ? 'hud_collapsed' : 'hud_expanded',
                    sessionId: movementSessionIdRef.current,
                    presetId: officialPreset.id,
                    activityFamilyId: officialPreset.activityFamilyId,
                    baseMovement: movementPick.baseMovement,
                    limbRule: movementPick.limbRule,
                    source: movementSource,
                    cueSeconds: effectiveCueSeconds,
                  });
                }
                return next;
              });
            }}
          />
        ) : null}
      </div>
    );
  }

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) void document.documentElement.requestFullscreen?.().catch(() => undefined);
    else void document.exitFullscreen?.().catch(() => undefined);
  };

  return (
    <div
      className={`relative h-dvh select-none bg-[#050509] text-white ${showBriefing ? 'overflow-y-auto overscroll-y-contain' : 'overflow-hidden'}`}
      style={{ fontFamily: 'var(--spm-font-display)' }}
    >
      {showBriefing ? (
        <TopBar
          drillName={displayModel?.displayTitle ?? officialPreset.title}
          mode={launchMode}
          isFullscreen={isFullscreen}
          onToggleFullscreen={toggleFullscreen}
          onExit={() => {
            stopBgm();
            exitFullscreenAfterSession();
            router.push('/spokedu-master/spomove');
          }}
        />
      ) : null}

      {showBriefing ? (
        <OfficialEngineBriefing
          preset={officialPreset}
          startDisabled={bgmLoading}
          launchMode={launchMode}
          cueSeconds={effectiveCueSeconds}
          onCueSecondsChange={handleCueSecondsChange}
          difficultyKind={difficultyKind}
          difficultyValue={difficultyValue}
          onDifficultyChange={setDifficultyValue}
          onStart={startOfficialSession}
          movement={resolvedMovement}
          cueFloorNotice={cueFloorNotice}
        />
      ) : null}

      {(state === 'done' || state === 'ended') && sessionResult ? (
        <div className="absolute inset-0 flex min-h-0 flex-col overflow-hidden bg-[#F1F5F9]">
          <TrainingResultScreen
            cfg={officialPresetToTrainingResultConfig(officialPreset)}
            elapsedMs={sessionResult.elapsedMs ?? 0}
            colorCounts={sessionResult.colorCounts ?? null}
            levelLabel={resultLevelLabel(sessionResult.engineMode, sessionResult.engineLevel)}
            programTitle={officialPreset.title}
            title={state === 'done' ? '훈련 완료' : '훈련 종료'}
            statusBadge={state === 'done' ? '완료' : '중도 종료'}
            retryLabel={launchMode === 'mobile' ? '다시 실행' : '같은 프로그램 다시 실행'}
            onBack={() => {
              stopBgm();
              exitFullscreenAfterSession();
              router.push('/spokedu-master/spomove');
            }}
            onRetry={startOfficialSession}
            footer={(
              <div className="space-y-2">
                {resolvedMovement ? (
                  <div className="rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 text-left">
                    <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">사용한 동작</p>
                    <p className="mt-0.5 text-[13px] font-black text-slate-800">{resolvedMovement.displayLabel}</p>
                    <p className="text-[11px] font-semibold text-slate-500">
                      매트 1장 · 자극 {effectiveCueSeconds}초
                    </p>
                  </div>
                ) : null}
                <div className="grid grid-cols-1 gap-1.5 min-[420px]:grid-cols-3">
                  {recordProgramHref ? (
                    <Link href={recordProgramHref} className="flex h-9 items-center justify-center rounded-xl bg-[#1E293B] px-2 text-xs font-black text-white">
                      <ClipboardList size={12} className="mr-1" />
                      기록
                    </Link>
                  ) : null}
                  <Link href="/spokedu-master/spomove" className="flex h-9 items-center justify-center rounded-xl border border-[#E2E8F0] bg-white text-xs font-bold text-[#1E293B]">
                    다른 프로그램
                  </Link>
                  <Link href="/spokedu-master/activity" className="flex h-9 items-center justify-center rounded-xl border border-[#E2E8F0] bg-white text-xs font-bold text-[#1E293B]">
                    수업 기록
                  </Link>
                </div>
              </div>
            )}
          />
        </div>
      ) : null}

      <style jsx global>{`
        @keyframes spmCuePop {
          0% { transform: scale(0.7); opacity: 0; }
          60% { transform: scale(1.08); }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

export default function SpomoveSessionPage() {
  return (
    <ErrorBoundary fallbackHref="/spokedu-master/spomove" fallbackLabel="SPOMOVE 목록">
      <Suspense fallback={<div className="relative h-dvh overflow-hidden select-none bg-black text-white" />}>
        <SpomoveSessionContent />
      </Suspense>
    </ErrorBoundary>
  );
}
