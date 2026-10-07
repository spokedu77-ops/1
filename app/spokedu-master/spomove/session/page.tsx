'use client';

import { Maximize, Minimize, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { BgmPlayer } from '@/app/lib/admin/audio/bgmPlayer';
import { isDiveActionMoveUnityTheme, normalizeDiveThemeId, type DiveThemeId } from '@/app/lib/spomove/diveThemes';
import { getPublicUrl } from '@/app/lib/admin/assets/storageClient';
import { useSpomoveTrainingBGM } from '@/app/lib/admin/hooks/useSpomoveTrainingBGM';
import { getAudioCtx, resumeExistingAudioCtx } from '@/app/admin/spomove/training/_player/lib/audio';
import {
  resetSpomoveRuntimeClock,
  setSpomoveRuntimePaused,
  spomoveRuntimeNow,
} from '@/app/admin/spomove/training/_player/lib/runtimeClock';

import { useMasterStore, useProfile } from '../../store';
import { useOptionalMasterAccessContext } from '../../access/MasterAccessProvider';
import { ErrorBoundary } from '../../components/ui/ErrorBoundary';
import { EngineRouter, preloadSpomoveEngine, type EngineCompletePayload } from './EngineRouter';
import { SPOMOVE_SESSION_OVERLAY_LAYER } from './sessionOverlayLayer';
import {
  lockViewportScroll,
  unlockViewportScroll,
} from '@/app/admin/spomove/training/_player/lib/lockViewportScroll';
import {
  findOfficialSpomovePreset,
  publicOfficialPresetSessionHref,
  standardSpomoveDurationSec,
} from '../officialSpomovePresets';
import { canLaunchInternalSpomoveCandidate } from '../internalSpomoveCandidateAccess';
import { getSpomovePresetDisplayModel } from '../spomovePresetDisplayModel';
import { resolveSpomovePublicDisplayTitle } from '../spomovePublicNaming';
import { parseSpomoveHubReturnHref } from '../spomoveHubNavigation';
import {
  buildActivitySessionHref,
  parseMasterWorkReturnHref,
  readSpomoveSessionOrigin,
} from '../../lib/masterNavigationContext';
import {
  clampCueSpeedSec,
  parseCueSecondsQuery,
  resolveSessionCueSeconds,
  supportsCueSpeedOverride,
  usesRandomSequenceCue,
  writeLastCueSeconds,
  type SpomoveCueSpeedSec,
} from '../spomoveCueSpeed';
import { buildSpomoveRecordDraft, buildSpomoveRecordHref } from './spomoveRecordDraft';
import {
  completionReasonToSessionState,
  type SpomoveCompletionReason,
} from './sessionResultModel';
import { resolveSpomoveExecutionVolume } from './resolveSpomoveExecutionVolume';
import {
  canResumeSpomoveRuntime,
  type SpomoveRuntimeState as SessionState,
} from './sessionRuntimeLifecycle';
import { getActivityFamily } from '../movements/activityFamilies';
import { MovementChangeSheet } from '../movements/MovementChangeSheet';
import { getMovementProfile } from '../movements/movementProfiles';
import {
  isAllowedByFamily,
  resolveEffectiveMovement,
  parseMovementQuery,
} from '../movements/movementResolve';
import type { MovementPick } from '../movements/movementTypes';
import { SessionSetupShell } from './SessionSetupShell';
import { SettingsBriefing } from './SettingsBriefing';
import {
  legacyPairToSpomoveAudioMode,
  parseSpomoveAudioMode,
  spomoveAudioModeToChannels,
  spomoveAudioModeToLegacyPair,
  userAudioModeWithBgmAvailability,
  type SpomoveUserAudioMode,
} from './spomoveAudioMode';
import { useSpomoveWakeLock } from './useSpomoveWakeLock';
type SportsArenaFeatureKey = 'side' | 'jump' | 'duck';
import { MasterSessionResult } from './MasterSessionResult';
import {
  beginMovementRun,
  changePausedMovement,
  movementRuntimeSupport,
  type SessionMovementState,
} from './sessionMovementLifecycle';
import type { SpomoveMovementResult } from './sessionResultModel';
import {
  buildRecentConfigSnapshot,
  commitTerminalReceipt,
  createSpomoveRunId,
  discardActiveRunSnapshotForPreset,
  readActiveRunSnapshot,
  writeActiveRunSnapshot,
  type SpomoveActiveRunSnapshotV1,
  type SpomoveRuntimeConfig,
} from './runtimeContinuity';
import {
  isInteractiveKeyTarget,
  resolveLegacyAutostart,
} from './sessionEntryMode';
import {
  operationConfigToPatch,
  parseOperationQuery,
  readPresetConfigPreference,
  resolveOperationEngineCapabilities,
  resolveOperationLayer,
  resolveRequiredMatGuidance,
  writePresetConfigPreference,
  type ActivityOperationConfig,
} from '../operations';
type LaunchMode = 'projector' | 'mobile';

function normalizeMode(mode: string | null): LaunchMode {
  if (mode === 'projector' || mode === 'mobile') return mode;
  if (mode === 'class') return 'mobile';
  return 'projector';
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
        <p className="line-clamp-1 text-sm font-semibold text-white/70">{drillName}</p>
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

function UnsupportedPreset() {
  return (
    <main className="flex h-dvh items-center justify-center bg-slate-950 px-5 text-white">
      <section className="w-full max-w-lg rounded-[28px] border border-white/10 bg-white/[0.06] p-8 text-center">
        <X className="mx-auto h-8 w-8 text-rose-300" />
        <h1 className="mt-5 text-2xl font-extrabold">지원하지 않는 SPOMOVE 활동입니다.</h1>
        <p className="mt-3 text-sm font-semibold text-white/55">공식 SPOMOVE 목록에서 활동을 다시 선택해 주세요.</p>
        <Link href="/spokedu-lab/spomove" className="mt-6 inline-flex h-12 items-center justify-center rounded-2xl bg-white px-6 text-sm font-extrabold text-slate-950">
          프로그램 선택으로
        </Link>
      </section>
    </main>
  );
}

function SpomoveSessionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const presetId = searchParams.get('preset') ?? '';
  const baseOfficialPreset = useMemo(() => findOfficialSpomovePreset(presetId), [presetId]);
  const masterAccess = useOptionalMasterAccessContext();
  const canLaunchPreset = canLaunchInternalSpomoveCandidate(
    baseOfficialPreset,
    masterAccess?.snapshot.isAdmin,
  );
  const officialPreset = baseOfficialPreset;
  const displayModel = useMemo(
    () => (officialPreset ? getSpomovePresetDisplayModel(officialPreset) : null),
    [officialPreset],
  );
  const requestedLaunchMode = normalizeMode(searchParams.get('mode'));
  const legacyAutostart = resolveLegacyAutostart({
    entryParam: searchParams.get('entry'),
    autostartParam: searchParams.get('autostart'),
  });
  const requestedBgmPath = searchParams.get('bgm') ?? '';
  const requestedAudioMode = parseSpomoveAudioMode(searchParams.get('audio'));
  const requestedSoundEnabled = searchParams.get('sound') !== 'off';
  const programId = searchParams.get('program') ?? '';
  const programs = useMasterStore((state) => state.programs);
  const profile = useProfile();
  const recordRecentProgramActivity = useMasterStore((state) => state.recordRecentProgramActivity);
  const program = useMemo(() => programs.find((item) => item.id === programId) ?? null, [programId, programs]);
  const { list: bgmList, loading: bgmLoading } = useSpomoveTrainingBGM();
  const defaultSelectedBgmPath = useMemo(() => {
    if (requestedBgmPath) return bgmList.includes(requestedBgmPath) ? requestedBgmPath : '';
    if (officialPreset && bgmList.length > 0)
      return bgmList[Math.floor(Math.random() * bgmList.length)]!;
    return '';
  }, [bgmList, officialPreset, requestedBgmPath]);

  const queryMovement = useMemo(
    () => parseMovementQuery(searchParams.get('movement'), searchParams.get('limb')),
    [searchParams],
  );

  const activityFamily = useMemo(() => {
    if (!officialPreset?.activityFamilyId) return null;
    return getActivityFamily(officialPreset.activityFamilyId);
  }, [officialPreset?.activityFamilyId]);

  const movementProfile = useMemo(() => {
    if (!officialPreset?.movementProfileId) return null;
    return getMovementProfile(officialPreset.movementProfileId);
  }, [officialPreset?.movementProfileId]);
  const recommendedMovement = useMemo(() => {
    if (!officialPreset || !activityFamily || !movementProfile) return null;
    return resolveEffectiveMovement({
      profile: movementProfile,
      family: activityFamily,
      urlMovement: queryMovement,
      presetRecommendedMovement: officialPreset.recommendedMovement,
    });
  }, [activityFamily, movementProfile, officialPreset, queryMovement]);
  const movementSupport = movementRuntimeSupport(movementProfile);

  const operationCapabilities = useMemo(() => {
    if (!officialPreset) return { interval: false, shuttle: false };
    return resolveOperationEngineCapabilities(officialPreset.engine.mode);
  }, [officialPreset]);

  const urlOperation = useMemo(() => parseOperationQuery(searchParams), [searchParams]);

  const [operationCandidate, setOperationCandidate] = useState<ActivityOperationConfig | null>(null);
  const [operationLayerStatus, setOperationLayerStatus] = useState<
    'pending' | 'ready' | 'legacyDisabled' | 'sanitized' | 'fallback'
  >('pending');

  useEffect(() => {
    if (!officialPreset || !activityFamily) {
      setOperationCandidate(null);
      setOperationLayerStatus('legacyDisabled');
      return;
    }
    const resolved = resolveOperationLayer({
      familyOperationProfileId: activityFamily.operationProfileId,
      presetOperationProfileId: officialPreset.operationProfileId,
      recommendedOperation: officialPreset.recommendedOperation,
      // 일반 실행: Preference operationPatch 미적용 (URL/Recent 재현만 incoming)
      preference: null,
      incoming: urlOperation ? { source: 'url', operation: urlOperation } : null,
      capabilities: operationCapabilities,
      activityFamilyId: officialPreset.activityFamilyId,
    });
    setOperationCandidate(resolved.candidate);
    setOperationLayerStatus(resolved.status);
  }, [
    activityFamily,
    officialPreset,
    operationCapabilities,
    urlOperation,
  ]);

  const resolvedOperationLayer = useMemo(() => {
    if (!activityFamily || !officialPreset || !operationCandidate) return null;
    return resolveOperationLayer({
      familyOperationProfileId: activityFamily.operationProfileId,
      presetOperationProfileId: officialPreset.operationProfileId,
      recommendedOperation: officialPreset.recommendedOperation,
      preference: {
        schemaVersion: 1,
        presetId: officialPreset.id,
        operationPatch: operationConfigToPatch(operationCandidate),
      },
      capabilities: operationCapabilities,
      activityFamilyId: officialPreset.activityFamilyId,
    });
  }, [activityFamily, officialPreset, operationCandidate, operationCapabilities]);

  const effectiveOperation = resolvedOperationLayer?.effective ?? null;

  const matGuidance = useMemo(() => {
    if (!activityFamily || !operationCandidate || operationLayerStatus === 'legacyDisabled') return null;
    return resolveRequiredMatGuidance({
      minMats: activityFamily.matRequirement.minMats,
      participantScale: operationCandidate.participantScale,
    });
  }, [activityFamily, operationCandidate, operationLayerStatus]);

  const persistPresetPreference = useCallback(
    (next: { cue?: number }) => {
      if (!officialPreset) return;
      const prev = readPresetConfigPreference(officialPreset.id);
      // 일반 Hub: cue만 Preference. movement/operation은 Class Set·Variant 영역.
      writePresetConfigPreference(officialPreset.id, {
        schemaVersion: 1,
        presetId: officialPreset.id,
        cueSeconds: next.cue ?? prev?.cueSeconds,
      });
    },
    [officialPreset],
  );

  const canStartSession = operationLayerStatus !== 'pending';

  const urlCueSeconds = useMemo(
    () => parseCueSecondsQuery(searchParams.get('cueSeconds')),
    [searchParams],
  );
  const recommendedCueSeconds = useMemo(
    () => parseCueSecondsQuery(searchParams.get('recommendedCueSeconds')),
    [searchParams],
  );

  const [state, setState] = useState<SessionState>('idle');
  const [launchMode, setLaunchMode] = useState<LaunchMode>(requestedLaunchMode);
  const [audioMode, setAudioMode] = useState(() =>
    requestedAudioMode ?? legacyPairToSpomoveAudioMode(requestedSoundEnabled, defaultSelectedBgmPath),
  );
  const [selectedBgmPath, setSelectedBgmPath] = useState(defaultSelectedBgmPath);
  const audioChannels = useMemo(() => spomoveAudioModeToChannels(audioMode), [audioMode]);
  const runtimeAudioPair = useMemo(
    () => spomoveAudioModeToLegacyPair(audioMode, selectedBgmPath),
    [audioMode, selectedBgmPath],
  );

  useEffect(() => {
    if (bgmLoading || selectedBgmPath) return;
    if (audioMode === 'full') setAudioMode('effects');
    else if (audioMode === 'music') setAudioMode('silent');
  }, [audioMode, bgmLoading, selectedBgmPath]);
  const [diveEnvironmentTheme, setDiveEnvironmentTheme] = useState<DiveThemeId>(() =>
    officialPreset?.id === 'dive-standard'
      ? 'space'
      : normalizeDiveThemeId(searchParams.get('diveTheme')),
  );
  const [sportsArenaFeatures, setSportsArenaFeatures] = useState<SportsArenaFeatureKey[]>(() => {
    const values = (searchParams.get('sports') ?? '').split(',');
    return values.filter((value): value is SportsArenaFeatureKey => value === 'side' || value === 'jump' || value === 'duck');
  });
  const [flowDuration, setFlowDuration] = useState(() => {
    const parsed = Number(searchParams.get('flowDuration'));
    return [15, 20, 25, 30, 35].includes(parsed) ? parsed : (officialPreset?.engine.flowDuration ?? 20);
  });
  const [flowIncludeBonus, setFlowIncludeBonus] = useState(() => searchParams.get('flowBonus') == null
    ? (officialPreset?.engine.flowIncludeBonus ?? true)
    : searchParams.get('flowBonus') === '1');
  const handleDiveEnvironmentThemeChange = useCallback((theme: DiveThemeId) => {
    setDiveEnvironmentTheme(theme);
    if (isDiveActionMoveUnityTheme(theme)) setFlowDuration((seconds) => [15, 20, 25, 30, 35].includes(seconds) ? seconds : 20);
  }, []);

  useEffect(() => {
    if (!officialPreset || !canLaunchPreset) return;
    const timer = window.setTimeout(() => {
      void preloadSpomoveEngine(
        officialPreset.engine.mode,
        officialPreset.engine.level,
        isDiveActionMoveUnityTheme(diveEnvironmentTheme),
      );
    }, 150);
    return () => window.clearTimeout(timer);
  }, [canLaunchPreset, diveEnvironmentTheme, officialPreset]);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activationBlocked, setActivationBlocked] = useState<
    null | 'fullscreenBlocked' | 'audioBlocked' | 'bothBlocked'
  >(null);
  const [cueSeconds, setCueSeconds] = useState<SpomoveCueSpeedSec>(() => {
    if (!officialPreset) return 3;
    if (urlCueSeconds != null) return resolveSessionCueSeconds(officialPreset, urlCueSeconds);
    if (recommendedCueSeconds != null) return resolveSessionCueSeconds(officialPreset, recommendedCueSeconds);
    if (typeof window !== 'undefined') {
      const pref = readPresetConfigPreference(officialPreset.id);
      if (pref?.cueSeconds != null && Number.isFinite(pref.cueSeconds)) {
        return resolveSessionCueSeconds(
          officialPreset,
          clampCueSpeedSec(pref.cueSeconds, officialPreset.id === 'dive-color-gate-61' ? 10 : 6),
        );
      }
    }
    return resolveSessionCueSeconds(officialPreset, recommendedCueSeconds);
  });
  const bgmPlayerRef = useRef<BgmPlayer | null>(null);
  useSpomoveWakeLock(state === 'running' || state === 'paused');
  const startLockedRef = useRef(false);
  const finishLockedRef = useRef(false);
  const stopRequestLockedRef = useRef(false);
  const sessionStartedAtRef = useRef<number | null>(null);
  const runStartedAtIsoRef = useRef<string | null>(null);
  const [sessionResult, setSessionResult] = useState<(EngineCompletePayload & SpomoveMovementResult) | null>(null);
  const runtimeStateRef = useRef<SessionState>('idle');
  const [markCompleteStatus, setMarkCompleteStatus] = useState<'idle' | 'saving' | 'error'>('idle');
  const [movementSheetOpen, setMovementSheetOpen] = useState(false);
  const [recoverySnapshot, setRecoverySnapshot] = useState<SpomoveActiveRunSnapshotV1 | null>(null);
  const [recoveryChecked, setRecoveryChecked] = useState(false);
  const runIdRef = useRef<string | null>(null);
  const [movementState, setMovementState] = useState<SessionMovementState>(() => ({
    initialMovement: recommendedMovement,
    currentMovement: recommendedMovement,
    movementChanges: [],
  }));
  const movementStateRef = useRef(movementState);

  useEffect(() => {
    movementStateRef.current = movementState;
  }, [movementState]);

  useEffect(() => {
    if (runtimeStateRef.current === 'idle' && !recoverySnapshot && !selectedBgmPath && defaultSelectedBgmPath) {
      setSelectedBgmPath(defaultSelectedBgmPath);
      if (!requestedAudioMode) {
        setAudioMode(legacyPairToSpomoveAudioMode(requestedSoundEnabled, defaultSelectedBgmPath));
      }
    }
  }, [defaultSelectedBgmPath, recoverySnapshot, requestedAudioMode, requestedSoundEnabled, selectedBgmPath]);

  useEffect(() => {
    if (runtimeStateRef.current !== 'idle') return;
    const next = {
      initialMovement: recommendedMovement,
      currentMovement: recommendedMovement,
      movementChanges: [],
    };
    movementStateRef.current = next;
    setMovementState(next);
  }, [officialPreset?.id, recommendedMovement]);

  useEffect(() => {
    if (!officialPreset) return;
    if (urlCueSeconds != null) {
      setCueSeconds(resolveSessionCueSeconds(officialPreset, urlCueSeconds));
      return;
    }
    if (recommendedCueSeconds != null) {
      setCueSeconds(resolveSessionCueSeconds(officialPreset, recommendedCueSeconds));
      return;
    }
    const pref = readPresetConfigPreference(officialPreset.id);
    const prefCue =
      pref?.cueSeconds != null && Number.isFinite(pref.cueSeconds)
        ? clampCueSpeedSec(pref.cueSeconds, officialPreset.id === 'dive-color-gate-61' ? 10 : 6)
        : null;
    setCueSeconds(resolveSessionCueSeconds(officialPreset, prefCue));
  }, [officialPreset, recommendedCueSeconds, urlCueSeconds]);

  const handleCueSecondsChange = useCallback(
    (value: SpomoveCueSpeedSec) => {
      const next = value;
      setCueSeconds(officialPreset?.id === 'dive-color-gate-61' ? next : writeLastCueSeconds(next));
      persistPresetPreference({ cue: next });
    },
    [officialPreset?.id, persistPresetPreference],
  );

  const effectiveCueSeconds = useMemo(() => {
    if (!officialPreset) return cueSeconds;
    let next = !supportsCueSpeedOverride(officialPreset)
      ? clampCueSpeedSec(officialPreset.cueSeconds)
      : cueSeconds;
    return next;
  }, [cueSeconds, officialPreset]);
  const executionVolume = useMemo(() => {
    if (!officialPreset) return null;
    const timing = effectiveOperation?.timing;
    return resolveSpomoveExecutionVolume({
      preset: officialPreset,
      cueSeconds: effectiveCueSeconds,
      interval: timing?.pattern === 'interval' ? timing : null,
      diveEnvironmentTheme,
      flowDurationSec: isDiveActionMoveUnityTheme(diveEnvironmentTheme)
        ? flowDuration
        : officialPreset.engine.flowDuration,
      flowIncludeBonus: isDiveActionMoveUnityTheme(diveEnvironmentTheme)
        ? flowIncludeBonus
        : officialPreset.engine.flowIncludeBonus,
      sportsArenaFeatures,
    });
  }, [
    diveEnvironmentTheme,
    effectiveCueSeconds,
    effectiveOperation,
    flowDuration,
    flowIncludeBonus,
    officialPreset,
    sportsArenaFeatures,
  ]);
  const effectiveRecommendedCueSeconds = useMemo(
    () => officialPreset ? resolveSessionCueSeconds(officialPreset, recommendedCueSeconds) : 3,
    [officialPreset, recommendedCueSeconds],
  );

  const cueFloorNotice = useMemo(() => {
    return null;
  }, []);

  const buildRuntimeConfig = useCallback((movement = movementStateRef.current.currentMovement): SpomoveRuntimeConfig | null => {
    if (!officialPreset) return null;
    return {
      presetId: officialPreset.id,
      launchMode,
      soundEnabled: runtimeAudioPair.soundEnabled,
      bgmPath: runtimeAudioPair.bgmPath,
      cueSeconds: effectiveCueSeconds,
      movement,
      operationLayerStatus: resolvedOperationLayer?.status ?? (operationLayerStatus === 'pending' ? 'ready' : operationLayerStatus),
      ...(resolvedOperationLayer?.effective ? { operation: resolvedOperationLayer.effective } : {}),
      diveEnvironmentTheme,
      sportsArenaFeatures,
      flowDuration,
      flowIncludeBonus,
    };
  }, [
    diveEnvironmentTheme,
    effectiveCueSeconds,
    flowDuration,
    flowIncludeBonus,
    launchMode,
    officialPreset,
    operationLayerStatus,
    resolvedOperationLayer,
    runtimeAudioPair,
    sportsArenaFeatures,
  ]);

  const persistActiveRun = useCallback((phase: 'running' | 'paused', explicitRunId = runIdRef.current) => {
    if (
      !officialPreset ||
      !explicitRunId ||
      sessionStartedAtRef.current == null ||
      (runtimeStateRef.current !== 'running' && runtimeStateRef.current !== 'paused')
    ) return;
    const runtimeSettings = buildRuntimeConfig();
    if (!runtimeSettings) return;
    writeActiveRunSnapshot({
      version: 1,
      runId: explicitRunId,
      presetId: officialPreset.id,
      phase,
      startedAt: runStartedAtIsoRef.current ?? new Date().toISOString(),
      elapsedActiveMs: Math.max(0, spomoveRuntimeNow() - sessionStartedAtRef.current),
      currentMovement: movementStateRef.current.currentMovement,
      movementChanges: movementStateRef.current.movementChanges,
      runtimeSettings,
      savedAt: Date.now(),
    });
  }, [buildRuntimeConfig, officialPreset]);

  const persistRecentConfig = useCallback((movement = movementStateRef.current.currentMovement) => {
    if (!officialPreset || !runIdRef.current) return;
    const runtimeConfig = buildRuntimeConfig(movement);
    if (!runtimeConfig) return;
    const display = getSpomovePresetDisplayModel(officialPreset);
    recordRecentProgramActivity({
      programId: officialPreset.id,
      programTitle: display.displayTitle,
      action: 'spomove_started',
      occurredAt: new Date().toISOString(),
      activityFamilyId: officialPreset.activityFamilyId,
      cueSeconds: effectiveCueSeconds,
      spomoveSnapshot: buildRecentConfigSnapshot(runtimeConfig),
      runId: runIdRef.current,
    });
  }, [buildRuntimeConfig, effectiveCueSeconds, officialPreset, recordRecentProgramActivity]);

  useEffect(() => {
    if (!officialPreset) {
      if (presetId) discardActiveRunSnapshotForPreset(presetId);
      setRecoveryChecked(true);
      return;
    }
    const recovered = readActiveRunSnapshot(officialPreset.id);
    if (!recovered) {
      setRecoveryChecked(true);
      return;
    }
    const config = recovered.runtimeSettings;
    const recoveredMovement = config.movement && movementProfile && activityFamily && isAllowedByFamily(config.movement, activityFamily, movementProfile)
      ? config.movement
      : recommendedMovement;
    setLaunchMode(config.launchMode);
    setAudioMode(legacyPairToSpomoveAudioMode(config.soundEnabled, config.bgmPath));
    setSelectedBgmPath(config.bgmPath && bgmList.includes(config.bgmPath) ? config.bgmPath : '');
    setCueSeconds(resolveSessionCueSeconds(officialPreset, config.cueSeconds));
    if (config.operationLayerStatus !== 'legacyDisabled' && config.operation) setOperationCandidate(config.operation);
    setDiveEnvironmentTheme(officialPreset.id === 'dive-standard'
      ? 'space'
      : normalizeDiveThemeId(config.diveEnvironmentTheme));
    setSportsArenaFeatures(config.sportsArenaFeatures);
    setFlowDuration([15, 20, 25, 30, 35].includes(config.flowDuration)
      ? config.flowDuration
      : (officialPreset.engine.flowDuration ?? 20));
    setFlowIncludeBonus(config.flowIncludeBonus);
    const recoveredMovementState = {
      initialMovement: recoveredMovement,
      currentMovement: recoveredMovement,
      movementChanges: [],
    };
    movementStateRef.current = recoveredMovementState;
    setMovementState(recoveredMovementState);
    setRecoverySnapshot(recovered);
    setRecoveryChecked(true);
  }, [activityFamily, bgmList, movementProfile, officialPreset, presetId, recommendedMovement]);

  const recordProgramHref = program && officialPreset && sessionResult
    ? buildSpomoveRecordHref(
        program.id,
        buildSpomoveRecordDraft({
          elapsedMs: sessionResult.elapsedMs,
          preset: officialPreset,
          completionReason: sessionResult.completionReason,
          initialMovement: sessionResult.initialMovement,
          finalMovement: sessionResult.finalMovement,
          movementChangeCount: sessionResult.movementChanges.length,
        }),
        undefined,
        sessionResult.runId,
        profile?.id,
      )
    : program
      ? '/spokedu-lab/activity'
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

  const enterRunning = useCallback(() => {
    if (!officialPreset) return;
    stopBgm();
    if (audioChannels.effectsEnabled) getAudioCtx();
    // flow 모드: MemoryGameApp 내부 BGM이 처리하므로 session-level BgmPlayer 생략
    const wantsSessionBgm = Boolean(audioChannels.bgmEnabled && selectedBgmPath && officialPreset.engine.mode !== 'flow');
    if (wantsSessionBgm && selectedBgmPath) {
      const player = new BgmPlayer();
      player.init(getPublicUrl(selectedBgmPath), 0.35);
      bgmPlayerRef.current = player;
      void player.play().then(() => {
        if (player.status === 'playing') player.fadeIn(180);
        const fsBlocked =
          launchMode === 'projector' && typeof document !== 'undefined' && !document.fullscreenElement;
        const audioBlocked = player.status === 'blocked';
        if (fsBlocked && audioBlocked) setActivationBlocked('bothBlocked');
        else if (fsBlocked) setActivationBlocked('fullscreenBlocked');
        else if (audioBlocked) setActivationBlocked('audioBlocked');
        else setActivationBlocked(null);
      });
    } else {
      const fsBlocked =
        launchMode === 'projector' && typeof document !== 'undefined' && !document.fullscreenElement;
      setActivationBlocked(fsBlocked ? 'fullscreenBlocked' : null);
    }

    resetSpomoveRuntimeClock();
    sessionStartedAtRef.current = spomoveRuntimeNow();
    runStartedAtIsoRef.current = new Date().toISOString();
    runtimeStateRef.current = 'running';
    setState('running');
    const runtimeConfig = buildRuntimeConfig();
    const activeRunId = runIdRef.current;
    if (!runtimeConfig || !activeRunId) return;
    persistActiveRun('running', activeRunId);
    persistRecentConfig();
  }, [
    launchMode,
    officialPreset,
    audioChannels,
    selectedBgmPath,
    stopBgm,
    buildRuntimeConfig,
    persistActiveRun,
    persistRecentConfig,
  ]);

  const unlockActivation = useCallback(async () => {
    if (launchMode === 'projector' && !document.fullscreenElement) {
      await document.documentElement.requestFullscreen?.().catch(() => undefined);
    }
    try {
      if (audioChannels.effectsEnabled) {
        const ctx = getAudioCtx();
        void ctx?.resume?.();
      }
    } catch {
      // ignore
    }
    await bgmPlayerRef.current?.play();
    const fullscreenBlocked = launchMode === 'projector' && !document.fullscreenElement;
    const audioBlocked = bgmPlayerRef.current?.status === 'blocked';
    if (fullscreenBlocked && audioBlocked) setActivationBlocked('bothBlocked');
    else if (fullscreenBlocked) setActivationBlocked('fullscreenBlocked');
    else if (audioBlocked) setActivationBlocked('audioBlocked');
    else setActivationBlocked(null);
  }, [audioChannels.effectsEnabled, launchMode]);

  const startOfficialSession = useCallback(async () => {
    if (
      !officialPreset ||
      bgmLoading ||
      !officialPreset.isReady ||
      startLockedRef.current ||
      !canStartSession
    ) {
      return;
    }
    lockViewportScroll();
    startLockedRef.current = true;
    finishLockedRef.current = false;
    stopRequestLockedRef.current = false;
    setMovementSheetOpen(false);
    setSessionResult(null);
    sessionStartedAtRef.current = null;
    const nextMovementState = beginMovementRun(movementStateRef.current);
    movementStateRef.current = nextMovementState;
    setMovementState(nextMovementState);
    const nextRunId = createSpomoveRunId();
    runIdRef.current = nextRunId;

    if (launchMode === 'projector' && !document.fullscreenElement) {
      await document.documentElement.requestFullscreen?.().catch(() => undefined);
    }

    enterRunning();

    window.setTimeout(() => {
      startLockedRef.current = false;
    }, 400);
  }, [
    bgmLoading,
    canStartSession,
    enterRunning,
    launchMode,
    officialPreset,
  ]);

  const finishSession = useCallback((completionReason: SpomoveCompletionReason, payload?: EngineCompletePayload) => {
    const activeRunId = runIdRef.current;
    if (!officialPreset || !activeRunId || finishLockedRef.current) return;
    finishLockedRef.current = true;
    stopRequestLockedRef.current = false;
    stopBgm();
    exitFullscreenAfterSession();
    persistActiveRun(runtimeStateRef.current === 'paused' ? 'paused' : 'running', activeRunId);
    persistRecentConfig();
    if (!commitTerminalReceipt({
      version: 1,
      runId: activeRunId,
      presetId: officialPreset.id,
      completionReason,
      endedAt: Date.now(),
    })) return;
    // The running engine owns one viewport lock. Hand that lock off before the
    // result screen mounts and acquires its own, so leaving Result restores the Hub scroll.
    unlockViewportScroll();
    const startedAt = sessionStartedAtRef.current;
    const fallbackElapsedMs = startedAt ? Math.max(1, spomoveRuntimeNow() - startedAt) : 0;
    setSessionResult({
      runId: activeRunId,
      completionReason,
      engineMode: payload?.engineMode ?? officialPreset.engine.mode,
      engineLevel: payload?.engineLevel ?? officialPreset.engine.level,
      elapsedMs: payload?.elapsedMs ?? fallbackElapsedMs,
      colorCounts: payload?.colorCounts ?? null,
      stims: payload?.stims,
      maxCombo: payload?.maxCombo,
      initialMovement: movementStateRef.current.initialMovement,
      finalMovement: movementStateRef.current.currentMovement,
      movementChanges: movementStateRef.current.movementChanges,
    });
    const terminalState = completionReasonToSessionState(completionReason);
    runtimeStateRef.current = terminalState;
    setState(terminalState);
    // Product truth: SPOMOVE engine done ≠ SessionProgram completed.
    // Lesson activity completion is teacher-explicit only (Result CTA or Session checkbox).
    setMarkCompleteStatus('idle');
  }, [
    exitFullscreenAfterSession,
    officialPreset,
    persistActiveRun,
    persistRecentConfig,
    stopBgm,
  ]);

  const resumeSession = useCallback(() => {
    if (finishLockedRef.current || !canResumeSpomoveRuntime(runtimeStateRef.current)) return;
    if (!setSpomoveRuntimePaused(false)) return;
    runtimeStateRef.current = 'running';
    void resumeExistingAudioCtx();
    void bgmPlayerRef.current?.play();
    setState('running');
    persistActiveRun('running');
  }, [persistActiveRun]);

  const selectMovement = useCallback((nextMovement: MovementPick) => {
    if (
      runtimeStateRef.current !== 'paused' ||
      movementSupport !== 'supported' ||
      !movementProfile ||
      !activityFamily ||
      !isAllowedByFamily(nextMovement, activityFamily, movementProfile)
    ) return;
    const startedAt = sessionStartedAtRef.current;
    const activeElapsedMs = startedAt == null ? 0 : spomoveRuntimeNow() - startedAt;
    setMovementState((current) => {
      const next = changePausedMovement(current, nextMovement, activeElapsedMs);
      movementStateRef.current = next;
      if (next !== current) queueMicrotask(() => {
        persistActiveRun('paused');
        persistRecentConfig(next.currentMovement);
      });
      return next;
    });
  }, [activityFamily, movementProfile, movementSupport, persistActiveRun, persistRecentConfig]);

  useEffect(() => {
    if (state !== 'running' && state !== 'paused') return;
    const checkpoint = window.setInterval(
      () => persistActiveRun(
        runtimeStateRef.current === 'paused' || stopRequestLockedRef.current ? 'paused' : 'running',
      ),
      2_000,
    );
    return () => window.clearInterval(checkpoint);
  }, [persistActiveRun, state]);

  useEffect(() => () => resetSpomoveRuntimeClock(), []);

  useEffect(() => {
    if (state !== 'paused') return;
    const blockPausedInput = (event: Event) => {
      if (event.target instanceof Element && event.target.closest('[data-spomove-pause-overlay], [data-spomove-movement-sheet]')) return;
      event.preventDefault();
      event.stopImmediatePropagation();
    };
    window.addEventListener('keydown', blockPausedInput, true);
    window.addEventListener('keyup', blockPausedInput, true);
    return () => {
      window.removeEventListener('keydown', blockPausedInput, true);
      window.removeEventListener('keyup', blockPausedInput, true);
    };
  }, [state]);

  useEffect(() => {
    if (state === 'done' || state === 'ended') exitFullscreenAfterSession();
  }, [exitFullscreenAfterSession, state]);

  const beginConfiguredSession = startOfficialSession;

  useEffect(() => {
    if (
      !legacyAutostart ||
      !recoveryChecked ||
      recoverySnapshot ||
      state !== 'idle' ||
      !officialPreset ||
      bgmLoading ||
      !officialPreset.isReady ||
      !canStartSession
    ) {
      return;
    }
    void beginConfiguredSession();
  }, [legacyAutostart, recoveryChecked, recoverySnapshot, bgmLoading, canStartSession, officialPreset, beginConfiguredSession, state]);

  const showBriefing = state === 'idle' && !legacyAutostart;

  const leaveSession = useCallback(() => {
    stopBgm();
    exitFullscreenAfterSession();
    const workReturnHref = parseMasterWorkReturnHref(
      searchParams.get('returnTo'),
      searchParams.get('hubReturn'),
      searchParams.get('hubView'),
    );
    router.push(workReturnHref);
  }, [exitFullscreenAfterSession, router, searchParams, stopBgm]);

  const finalizeInterruptedRun = useCallback(() => {
    if (!recoverySnapshot) return;
    commitTerminalReceipt({
      version: 1,
      runId: recoverySnapshot.runId,
      presetId: recoverySnapshot.presetId,
      completionReason: 'cancelled',
      endedAt: Date.now(),
    });
    setRecoverySnapshot(null);
  }, [recoverySnapshot]);

  const restartInterruptedRun = useCallback(() => {
    if (!recoverySnapshot) return;
    finalizeInterruptedRun();
    void startOfficialSession();
  }, [finalizeInterruptedRun, recoverySnapshot, startOfficialSession]);

  const exitInterruptedRun = useCallback(() => {
    finalizeInterruptedRun();
    leaveSession();
  }, [finalizeInterruptedRun, leaveSession]);

  const markCompleteAndReturn = useCallback(() => {
    const origin = readSpomoveSessionOrigin(searchParams);
    if (!origin.sessionId || !origin.sessionProgramId || markCompleteStatus === 'saving') return;
    const returnHref = parseMasterWorkReturnHref(
      origin.returnTo,
      null,
      null,
      buildActivitySessionHref(origin.sessionId),
    );
    setMarkCompleteStatus('saving');
    void fetch(`/api/spokedu-master/sessions/${encodeURIComponent(origin.sessionId)}/programs/${encodeURIComponent(origin.sessionProgramId)}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ isCompleted: true }),
    }).then((response) => {
      if (!response.ok) throw new Error('mark complete failed');
      router.push(returnHref);
    }).catch(() => {
      setMarkCompleteStatus('error');
    });
  }, [markCompleteStatus, router, searchParams]);

  /** Result 재실행 → Start 확인 화면 (즉시 Engine 금지) */
  const reopenStartConfirmation = useCallback(() => {
    if (!officialPreset) return;
    stopBgm();
    exitFullscreenAfterSession();
    startLockedRef.current = false;
    finishLockedRef.current = false;
    stopRequestLockedRef.current = false;
    setMovementSheetOpen(false);
    setSessionResult(null);
    resetSpomoveRuntimeClock();
    runtimeStateRef.current = 'idle';
    setMarkCompleteStatus('idle');
    setState('idle');
    const origin = readSpomoveSessionOrigin(searchParams);
    const href = publicOfficialPresetSessionHref(officialPreset, {
      entry: 'settings',
      mode: launchMode,
      cueSeconds: effectiveCueSeconds,
      movement: movementStateRef.current.currentMovement,
      operation:
        operationLayerStatus !== 'legacyDisabled' && effectiveOperation
          ? effectiveOperation
          : null,
      soundEnabled: runtimeAudioPair.soundEnabled,
      bgmPath: runtimeAudioPair.bgmPath || undefined,
      audioMode,
      diveEnvironmentTheme,
      sportsArenaFeatures,
      flowDuration,
      flowIncludeBonus,
      hubReturn: parseSpomoveHubReturnHref(searchParams.get('hubReturn'), searchParams.get('hubView')),
      returnTo: origin.returnTo ?? undefined,
      session: origin.sessionId ?? undefined,
      sessionProgram: origin.sessionProgramId ?? undefined,
    });
    router.replace(href);
  }, [
    effectiveCueSeconds,
    exitFullscreenAfterSession,
    launchMode,
    officialPreset,
    effectiveOperation,
    operationLayerStatus,
    audioMode,
    runtimeAudioPair,
    diveEnvironmentTheme,
    sportsArenaFeatures,
    flowDuration,
    flowIncludeBonus,
    router,
    searchParams,
    stopBgm,
  ]);

  const sessionOrigin = readSpomoveSessionOrigin(searchParams);
  const hubReturnHref = parseSpomoveHubReturnHref(searchParams.get('hubReturn'), searchParams.get('hubView'));
  const sessionReturnHref = sessionOrigin.isSessionOrigin
    ? parseMasterWorkReturnHref(
      sessionOrigin.returnTo,
      null,
      null,
      sessionOrigin.sessionId ? buildActivitySessionHref(sessionOrigin.sessionId) : '/spokedu-lab/activity',
    )
    : null;
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'Space' && state === 'idle' && showBriefing) {
        if (isInteractiveKeyTarget(event.target)) return;
        event.preventDefault();
        void beginConfiguredSession();
        return;
      }
      if (event.key.toLowerCase() === 'f') {
        if (!document.fullscreenElement) void document.documentElement.requestFullscreen?.().catch(() => undefined);
        else void document.exitFullscreen?.().catch(() => undefined);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [beginConfiguredSession, showBriefing, state]);

  if (!officialPreset || !canLaunchPreset) return <UnsupportedPreset />;
  const sessionDisplayTitle = displayModel?.displayTitle ?? resolveSpomovePublicDisplayTitle(officialPreset.id, officialPreset.title);

  if (state === 'idle' && !recoveryChecked) {
    return <main className="min-h-dvh bg-slate-950" aria-label="이전 훈련 확인 중" />;
  }

  if (state === 'idle' && recoverySnapshot) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-slate-950 px-5 py-8 text-white">
        <section className="w-full max-w-md rounded-[24px] border border-white/15 bg-white/[0.06] p-6 shadow-2xl">
          <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-amber-300">Interrupted run</p>
          <h1 className="mt-2 text-2xl font-extrabold">이전 훈련이 중단되었습니다.</h1>
          <p className="mt-3 text-sm font-semibold leading-6 text-white/65">
            점수와 현재 자극을 정확히 복원할 수 없어 이어하기는 제공하지 않습니다. 마지막 설정으로 새 훈련을 시작할 수 있습니다.
          </p>
          <dl className="mt-5 grid gap-2 rounded-2xl bg-black/25 p-4 text-sm">
            <div className="flex justify-between gap-4"><dt className="text-white/55">활동</dt><dd className="text-right font-bold">{sessionDisplayTitle}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-white/55">중단 시점</dt><dd className="font-bold">약 {Math.max(1, Math.round(recoverySnapshot.elapsedActiveMs / 1000))}초</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-white/55">복구 방식</dt><dd className="font-bold">안전하게 다시 시작</dd></div>
          </dl>
          <div className="mt-6 grid gap-2">
            <button type="button" disabled={bgmLoading} onClick={restartInterruptedRun} className="min-h-12 rounded-xl bg-white px-4 text-sm font-extrabold text-slate-950 disabled:opacity-50">{bgmLoading ? '설정 확인 중…' : '같은 설정으로 다시 시작'}</button>
            <button type="button" onClick={exitInterruptedRun} className="min-h-11 rounded-xl border border-white/20 px-4 text-sm font-bold text-white/75">종료하고 돌아가기</button>
          </div>
        </section>
      </main>
    );
  }

  if (state === 'running' || state === 'paused') {
    return (
      <div className="relative h-dvh overflow-hidden bg-black">
        <EngineRouter
          runtimeState={state}
          durationSec={
            officialPreset.engine.mode === 'reactTrain' ||
            (officialPreset.engine.mode === 'spatial' && officialPreset.engine.level === 7)
              ? standardSpomoveDurationSec(effectiveCueSeconds, officialPreset.rounds)
              : undefined
          }
          mode={officialPreset.engine.mode}
          level={officialPreset.engine.level}
          speedSec={effectiveCueSeconds}
          rounds={officialPreset.rounds}
          effectsEnabled={audioChannels.effectsEnabled}
          bgmEnabled={audioChannels.bgmEnabled}
          selectedBgmPath={selectedBgmPath}
          variantColorTheme={officialPreset.engine.variantColorTheme}
          bodyLabelMode={officialPreset.engine.bodyLabelMode}
          hideBodyLabelModeControls={officialPreset.engine.hideBodyLabelModeControls}
          spatialArrowColorMode={officialPreset.engine.spatialArrowColorMode}
          spatialArrowColorMapping={officialPreset.engine.spatialArrowColorMapping}
          reactTrainConcurrent={officialPreset.engine.reactTrainConcurrent}
          moleLookMode={officialPreset.engine.moleLookMode}
          numberCartTier={officialPreset.engine.numberCartTier}
          colorTrackerTier={officialPreset.engine.colorTrackerTier}
          goalkeeperTier={officialPreset.engine.goalkeeperTier}
          goalkeeperBonusTimeEnabled={officialPreset.engine.goalkeeperBonusTimeEnabled}
          simonPoleCount={officialPreset.engine.simonPoleCount}
          colorTrackerDualPanel={officialPreset.engine.colorTrackerDualPanel}
          camouflagePlacement={officialPreset.engine.camouflagePlacement}
          camouflagePlacementResponse={officialPreset.engine.camouflagePlacementResponse}
          flowFeatures={officialPreset.engine.flowFeatures}
          sportsArenaFeatures={sportsArenaFeatures}
          diveEnvironmentTheme={diveEnvironmentTheme}
          flowDuration={isDiveActionMoveUnityTheme(diveEnvironmentTheme) ? flowDuration : officialPreset.engine.flowDuration}
          flowLayout={officialPreset.engine.flowLayout}
          flowIncludeBonus={isDiveActionMoveUnityTheme(diveEnvironmentTheme) ? flowIncludeBonus : officialPreset.engine.flowIncludeBonus}
          colorGateVariant={officialPreset.engine.colorGateVariant}
          colorGateCategory={officialPreset.engine.colorGateCategory}
          flankerStimulusType={officialPreset.engine.flankerStimulusType}
          flankerNestedCircleCount={officialPreset.engine.flankerNestedCircleCount}
          flankerExtremeMode={officialPreset.engine.flankerExtremeMode}
          flankerArrowMode={officialPreset.engine.flankerArrowMode}
          stroopWordMode={officialPreset.engine.stroopWordMode}
          stroopArrowResponse={officialPreset.engine.stroopArrowResponse}
          stroopWordResponse={officialPreset.engine.stroopWordResponse}
          stroopWordRuleMode={officialPreset.engine.stroopWordRuleMode}
          handFootDifficulty={officialPreset.engine.handFootDifficulty}
          colorMemoryGridSize={officialPreset.engine.colorMemoryGridSize}
          colorMemoryGridMode={officialPreset.engine.colorMemoryGridMode}
          spatialMemoryResponse={officialPreset.engine.spatialMemoryResponse}
          intervalLaunch={
            effectiveOperation?.timing.pattern === 'interval'
              ? {
                  workSeconds: effectiveOperation.timing.workSeconds,
                  restSeconds: effectiveOperation.timing.restSeconds,
                  sets: effectiveOperation.timing.sets,
                }
              : null
          }
          onExit={() => finishSession('stopped_early')}
          onComplete={(payload) => {
            finishSession(payload.completionReason, payload);
          }}
        />
        {activationBlocked ? createPortal(
          <div className="pointer-events-none fixed inset-x-0 top-0 px-3 pt-[max(0.75rem,env(safe-area-inset-top))]" style={{ zIndex: SPOMOVE_SESSION_OVERLAY_LAYER }}>
            <div className="pointer-events-auto mx-auto flex max-w-xl items-center gap-3 rounded-2xl border border-white/15 bg-black/80 p-3 text-white shadow-xl backdrop-blur">
            <p className="min-w-0 flex-1 text-[13px] font-bold leading-5">
              {activationBlocked === 'audioBlocked' ? '소리를 사용할 수 없어 화면은 계속 실행됩니다.' : activationBlocked === 'fullscreenBlocked' ? '전체화면을 사용할 수 없어 일반 화면으로 실행합니다.' : '전체화면과 소리를 사용할 수 없어 일반 화면으로 계속 실행합니다.'}
            </p>
            <button type="button" onClick={unlockActivation} className="min-h-11 shrink-0 rounded-xl bg-white px-3 text-xs font-extrabold text-black">다시 시도</button>
            <button type="button" onClick={() => setActivationBlocked(null)} aria-label="안내 닫기" className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-white/70"><X className="h-4 w-4" /></button>
            </div>
          </div>,
          document.body,
        ) : null}
        {state === 'paused' && !movementSheetOpen ? createPortal(
          <div data-spomove-pause-overlay className="fixed inset-0 flex items-center justify-center bg-black/75 px-5" style={{ zIndex: SPOMOVE_SESSION_OVERLAY_LAYER }} role="dialog" aria-modal="true" aria-labelledby="spomove-pause-title">
            <section className="w-full max-w-sm rounded-2xl border border-white/15 bg-slate-950 p-5 text-white shadow-2xl">
              <h2 id="spomove-pause-title" className="text-xl font-extrabold">일시정지됨</h2>
              <p className="mt-2 text-sm font-semibold text-white/60">준비가 되면 같은 지점에서 계속하세요.</p>
              <div className="mt-5 grid gap-2">
                <button type="button" autoFocus onClick={resumeSession} className="min-h-12 rounded-xl bg-white text-sm font-extrabold text-slate-950">계속하기</button>
                <button type="button" onClick={() => finishSession('stopped_early')} className="min-h-11 rounded-xl border border-rose-300/30 text-sm font-bold text-rose-200">훈련 종료</button>
              </div>
            </section>
          </div>,
          document.body,
        ) : null}
        {movementProfile && activityFamily && movementState.currentMovement ? createPortal(
          <MovementChangeSheet
            open={state === 'paused' && movementSheetOpen && movementSupport === 'supported'}
            profile={movementProfile}
            family={activityFamily}
            selected={movementState.currentMovement}
            onSelect={selectMovement}
            onClose={() => setMovementSheetOpen(false)}
          />,
          document.body,
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
      style={{ fontFamily: 'var(--spm-font-body)' }}
    >
      {showBriefing ? (
        <TopBar
          drillName={sessionDisplayTitle}
          mode={launchMode}
          isFullscreen={isFullscreen}
          onToggleFullscreen={toggleFullscreen}
          onExit={leaveSession}
        />
      ) : null}

      {showBriefing ? (
        <SessionSetupShell
          programLabel={displayModel?.programLabel ?? officialPreset.programTitle}
          displayTitle={sessionDisplayTitle}
        >
          <SettingsBriefing
            matCount={matGuidance?.recommended ?? activityFamily?.matRequirement.minMats ?? 1}
            executionVolume={executionVolume!}
            diveEnvironmentTheme={diveEnvironmentTheme}
            onDiveEnvironmentThemeChange={handleDiveEnvironmentThemeChange}
            sportsArenaFeatures={sportsArenaFeatures}
            onSportsArenaFeaturesChange={setSportsArenaFeatures}
            flowDuration={flowDuration}
            onFlowDurationChange={setFlowDuration}
            flowIncludeBonus={flowIncludeBonus}
            onFlowIncludeBonusChange={setFlowIncludeBonus}
            preset={officialPreset}
            audioMode={(audioMode === 'music' ? 'full' : audioMode) as SpomoveUserAudioMode}
            onAudioModeChange={(mode) => setAudioMode(userAudioModeWithBgmAvailability(mode, bgmList.length > 0))}
            bgmAvailable={bgmList.length > 0}
            startDisabled={bgmLoading || !canStartSession}
            cueSeconds={effectiveCueSeconds}
            recommendedCueSeconds={effectiveRecommendedCueSeconds}
            onCueSecondsChange={handleCueSecondsChange}
            onStart={beginConfiguredSession}
            cueFloorNotice={cueFloorNotice}
          />
        </SessionSetupShell>
      ) : null}

      {(state === 'done' || state === 'ended') && sessionResult ? (
        <div className="absolute inset-0 min-h-0 overflow-hidden bg-[#F1F5F9]">
          <MasterSessionResult
            completionReason={sessionResult.completionReason}
            initialMovement={sessionResult.initialMovement}
            finalMovement={sessionResult.finalMovement}
            movementChangeCount={sessionResult.movementChanges.length}
            activityTitle={sessionDisplayTitle}
            elapsedMs={sessionResult.elapsedMs ?? 0}
            colorCounts={sessionResult.colorCounts ?? null}
            engineMode={sessionResult.engineMode}
            engineLevel={sessionResult.engineLevel}
            rounds={officialPreset.rounds}
            cueSeconds={effectiveCueSeconds}
            executionVolume={executionVolume!}
            diveActionMove={
              sessionResult.engineMode === 'flow' && sessionResult.engineLevel === 1
                ? {
                    completed: sessionResult.completionReason === 'natural_complete',
                    stageDurationSec: isDiveActionMoveUnityTheme(diveEnvironmentTheme)
                      ? flowDuration
                      : (officialPreset.engine.flowDuration ?? null),
                    environmentTheme: diveEnvironmentTheme,
                    sportsArenaFeatures,
                    flowFeatures: officialPreset.engine.flowFeatures,
                    flowIncludeBonus: isDiveActionMoveUnityTheme(diveEnvironmentTheme)
                      ? flowIncludeBonus
                      : officialPreset.engine.flowIncludeBonus,
                    flowLayout: officialPreset.engine.flowLayout,
                  }
                : null
            }
            settings={[
              `SPOMAT ${matGuidance?.recommended ?? activityFamily?.matRequirement.minMats ?? 1}장`,
              officialPreset.id !== 'dive-standard'
                ? `자극 ${usesRandomSequenceCue(officialPreset) ? '1~3초 (랜덤)' : `${effectiveCueSeconds}초`}`
                : null,
            ].filter(Boolean) as string[]}
            recordHref={recordProgramHref}
            hubHref={hubReturnHref}
            sessionReturnHref={sessionReturnHref}
            canMarkComplete={Boolean(sessionOrigin.sessionId && sessionOrigin.sessionProgramId && state === 'done')}
            markCompleteStatus={markCompleteStatus}
            onMarkCompleteAndReturn={markCompleteAndReturn}
            onRetry={reopenStartConfirmation}
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
    <ErrorBoundary fallbackHref="/spokedu-lab/spomove" fallbackLabel="SPOMOVE 목록">
      <Suspense fallback={<div className="relative h-dvh overflow-hidden select-none bg-black text-white" />}>
        <SpomoveSessionContent />
      </Suspense>
    </ErrorBoundary>
  );
}
