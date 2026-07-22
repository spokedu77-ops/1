'use client';

import { ClipboardList, Maximize, Minimize, X } from 'lucide-react';
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
  publicOfficialPresetSessionHref,
  standardSpomoveDurationSec,
} from '../officialSpomovePresets';
import { getSpomovePresetDisplayModel } from '../spomovePresetDisplayModel';
import {
  applySpomoveDifficulty,
  getSpomoveDifficultyKind,
  getSpomoveDifficultyOptions,
  readSpomoveDifficultyValue,
} from '../spomoveDifficulty';
import {
  clampCueSpeedSec,
  parseCueSecondsQuery,
  resolveSessionCueSeconds,
  supportsCueSpeedOverride,
  writeLastCueSeconds,
  type SpomoveCueSpeedSec,
} from '../spomoveCueSpeed';
import { buildSpomoveRecordDraft, buildSpomoveRecordHref } from './spomoveRecordDraft';
import { getActivityFamily } from '../movements/activityFamilies';
import { isSpomoveMovementLayerEnabled } from '../movements/movementFlag';
import { getMovementProfile } from '../movements/movementProfiles';
import {
  parseMovementQuery,
  resolveEffectiveMovement,
  resolveMovementConfiguration,
  resolveSessionConfiguration,
} from '../movements/movementResolve';
import {
  hasSeenMovementIntro,
  markMovementIntroSeen,
  writeFamilyMovement,
} from '../movements/movementStorage';
import {
  appendMovementUsageEvent,
  createMovementSessionId,
} from '../movements/movementUsage';
import type {
  MovementPick,
  MovementResolutionStatus,
  ResolvedMovementConfiguration,
} from '../movements/movementTypes';
import { SessionSetupShell } from './SessionSetupShell';
import { StartBriefing } from './StartBriefing';
import { SettingsBriefing } from './SettingsBriefing';
import {
  isInteractiveKeyTarget,
  parseSessionEntryMode,
  resolveLegacyAutostart,
} from './sessionEntryMode';
import { resolveStartMovementSummary } from './startMovementSummary';
import {
  buildSpomoveSessionSnapshotV2,
  operationConfigToPatch,
  operationSummaryLine,
  parseOperationQuery,
  readPresetConfigPreference,
  resolveOperationEngineCapabilities,
  resolveOperationLayer,
  resolveRequiredMatGuidance,
  writePresetConfigPreference,
  type ActivityOperationConfig,
} from '../operations';
type SessionState = 'idle' | 'movementIntro' | 'running' | 'done' | 'ended';
type LaunchMode = 'projector' | 'mobile';

const MOVEMENT_INTRO_MS = 1800;

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
  const urlDifficulty = searchParams.get('difficulty');
  const [difficultyValue, setDifficultyValue] = useState(() => {
    if (!baseOfficialPreset || !difficultyKind) return '1';
    const options = getSpomoveDifficultyOptions(difficultyKind);
    if (urlDifficulty && options.some((opt) => opt.value === urlDifficulty)) {
      return urlDifficulty;
    }
    if (typeof window !== 'undefined') {
      const pref = readPresetConfigPreference(baseOfficialPreset.id);
      if (pref?.difficultyValue && options.some((opt) => opt.value === pref.difficultyValue)) {
        return pref.difficultyValue;
      }
    }
    return readSpomoveDifficultyValue(baseOfficialPreset, difficultyKind);
  });
  useEffect(() => {
    if (!baseOfficialPreset || !difficultyKind) return;
    const options = getSpomoveDifficultyOptions(difficultyKind);
    if (urlDifficulty && options.some((opt) => opt.value === urlDifficulty)) {
      setDifficultyValue(urlDifficulty);
      return;
    }
    const pref = readPresetConfigPreference(baseOfficialPreset.id);
    if (pref?.difficultyValue && options.some((opt) => opt.value === pref.difficultyValue)) {
      setDifficultyValue(pref.difficultyValue);
      return;
    }
    setDifficultyValue(readSpomoveDifficultyValue(baseOfficialPreset, difficultyKind));
  }, [baseOfficialPreset, difficultyKind, urlDifficulty]);
  const difficultyReady = !difficultyKind || Boolean(difficultyValue);
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
  const entryMode = parseSessionEntryMode(searchParams.get('entry'));
  const legacyAutostart = resolveLegacyAutostart({
    entryParam: searchParams.get('entry'),
    autostartParam: searchParams.get('autostart'),
  });
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

  const movementFamily = useMemo(() => {
    if (!movementLayerEnabled || !officialPreset?.activityFamilyId) return null;
    return getActivityFamily(officialPreset.activityFamilyId);
  }, [movementLayerEnabled, officialPreset?.activityFamilyId]);

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
  const [movementResolutionStatus, setMovementResolutionStatus] =
    useState<MovementResolutionStatus>('pending');
  const movementSessionIdRef = useRef(createMovementSessionId());
  const introTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!movementLayerEnabled) {
      setMovementPick(null);
      setMovementResolutionStatus('disabled');
      return;
    }
    if (!officialPreset) {
      setMovementPick(null);
      setMovementResolutionStatus('pending');
      return;
    }
    if (!movementFamily || !movementProfile) {
      setMovementPick(null);
      setMovementResolutionStatus('legacyFallback');
      if (typeof console !== 'undefined') {
        console.warn(
          `[spomove-movement] legacyFallback session: preset=${officialPreset.id} missing family/profile`,
        );
      }
      return;
    }
    if (movementProfile.selectionMode === 'disabled') {
      setMovementPick(null);
      setMovementResolutionStatus('disabled');
      return;
    }
    const resolved = resolveEffectiveMovement({
      profile: movementProfile,
      family: movementFamily,
      urlMovement,
      // 일반 실행: Preset 대표 움직임 고정 (Preference/Family 저장 미사용)
      savedMovement: null,
      presetRecommendedMovement: officialPreset.recommendedMovement,
    });
    setMovementPick(resolved);
    setMovementResolutionStatus('ready');
    if (
      urlMovement &&
      resolved &&
      urlMovement.baseMovement === resolved.baseMovement &&
      urlMovement.limbRule === resolved.limbRule
    ) {
      setMovementSource('url');
    } else {
      setMovementSource('recommended');
    }
  }, [movementFamily, movementLayerEnabled, movementProfile, officialPreset, urlMovement]);

  const resolvedMovement: ResolvedMovementConfiguration | null = useMemo(() => {
    if (movementResolutionStatus !== 'ready' || !movementProfile || !movementPick) return null;
    return resolveMovementConfiguration(movementPick, movementProfile);
  }, [movementPick, movementProfile, movementResolutionStatus]);

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
    if (!movementLayerEnabled || !officialPreset || !movementFamily) {
      setOperationCandidate(null);
      setOperationLayerStatus('legacyDisabled');
      return;
    }
    const resolved = resolveOperationLayer({
      familyOperationProfileId: movementFamily.operationProfileId,
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
    movementFamily,
    movementLayerEnabled,
    officialPreset,
    operationCapabilities,
    urlOperation,
  ]);

  const resolvedOperationLayer = useMemo(() => {
    if (!movementFamily || !officialPreset || !operationCandidate) return null;
    return resolveOperationLayer({
      familyOperationProfileId: movementFamily.operationProfileId,
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
  }, [movementFamily, officialPreset, operationCandidate, operationCapabilities]);

  const effectiveOperation = resolvedOperationLayer?.effective ?? null;

  const matGuidance = useMemo(() => {
    if (!movementFamily || !operationCandidate || operationLayerStatus === 'legacyDisabled') return null;
    return resolveRequiredMatGuidance({
      minMats: movementFamily.matRequirement.minMats,
      participantScale: operationCandidate.participantScale,
    });
  }, [movementFamily, operationCandidate, operationLayerStatus]);

  const persistPresetPreference = useCallback(
    (next: { cue?: number; difficulty?: string }) => {
      if (!officialPreset) return;
      const prev = readPresetConfigPreference(officialPreset.id);
      // 일반 Hub: cue·difficulty만 Preference. movement/operation은 Class Set·Variant 영역.
      writePresetConfigPreference(officialPreset.id, {
        schemaVersion: 1,
        presetId: officialPreset.id,
        cueSeconds: next.cue ?? prev?.cueSeconds,
        difficultyValue: next.difficulty ?? (difficultyKind ? difficultyValue : prev?.difficultyValue),
      });
    },
    [difficultyKind, difficultyValue, officialPreset],
  );

  const canStartSession =
    (movementResolutionStatus === 'ready' ||
      movementResolutionStatus === 'disabled' ||
      movementResolutionStatus === 'legacyFallback') &&
    difficultyReady &&
    operationLayerStatus !== 'pending';

  const urlCueSeconds = useMemo(
    () => parseCueSecondsQuery(searchParams.get('cueSeconds')),
    [searchParams],
  );

  const [state, setState] = useState<SessionState>('idle');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activationBlocked, setActivationBlocked] = useState<
    null | 'fullscreenBlocked' | 'audioBlocked' | 'bothBlocked'
  >(null);
  const [cueSeconds, setCueSeconds] = useState<SpomoveCueSpeedSec>(() => {
    if (!officialPreset) return 3;
    if (urlCueSeconds != null) return resolveSessionCueSeconds(officialPreset, urlCueSeconds);
    if (typeof window !== 'undefined') {
      const pref = readPresetConfigPreference(officialPreset.id);
      if (pref?.cueSeconds != null && Number.isFinite(pref.cueSeconds)) {
        return resolveSessionCueSeconds(officialPreset, clampCueSpeedSec(pref.cueSeconds));
      }
    }
    return resolveSessionCueSeconds(officialPreset, null);
  });
  const bgmPlayerRef = useRef<BgmPlayer | null>(null);
  const startLockedRef = useRef(false);
  const sessionStartedAtRef = useRef<number | null>(null);
  const [sessionResult, setSessionResult] = useState<EngineCompletePayload | null>(null);

  useEffect(() => {
    if (!officialPreset) return;
    if (urlCueSeconds != null) {
      setCueSeconds(resolveSessionCueSeconds(officialPreset, urlCueSeconds));
      return;
    }
    const pref = readPresetConfigPreference(officialPreset.id);
    const prefCue =
      pref?.cueSeconds != null && Number.isFinite(pref.cueSeconds)
        ? clampCueSpeedSec(pref.cueSeconds)
        : null;
    setCueSeconds(resolveSessionCueSeconds(officialPreset, prefCue));
  }, [officialPreset, urlCueSeconds]);

  const handleCueSecondsChange = useCallback(
    (value: SpomoveCueSpeedSec) => {
      let next = value;
      if (movementPick && movementProfile) {
        const session = resolveSessionConfiguration({
          movement: resolveMovementConfiguration(movementPick, movementProfile),
          cueSeconds: value,
        });
        if (session.cueAdjusted) {
          next = clampCueSpeedSec(session.cueSeconds) as SpomoveCueSpeedSec;
        }
      }
      setCueSeconds(writeLastCueSeconds(next));
      persistPresetPreference({ cue: next });
    },
    [movementPick, movementProfile, persistPresetPreference],
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

  const enterRunning = useCallback(() => {
    if (!officialPreset) return;
    stopBgm();
    if (soundEnabled) getAudioCtx();
    // flow 모드: MemoryGameApp 내부 BGM이 처리하므로 session-level BgmPlayer 생략
    const wantsSessionBgm = Boolean(selectedBgmPath && officialPreset.engine.mode !== 'flow');
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

    if (movementResolutionStatus === 'ready' && movementPick && officialPreset.activityFamilyId) {
      writeFamilyMovement(officialPreset.activityFamilyId, movementPick);
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
    }

    sessionStartedAtRef.current = Date.now();
    setState('running');
    const display = getSpomovePresetDisplayModel(officialPreset);
    const snapshot =
      operationLayerStatus === 'legacyDisabled' || !operationCandidate
        ? buildSpomoveSessionSnapshotV2({
            presetId: officialPreset.id,
            movement: movementPick,
            operationLayerStatus: 'legacyDisabled',
            cueSeconds: effectiveCueSeconds,
            difficultyKind: difficultyKind ?? undefined,
            difficultyValue: difficultyKind ? difficultyValue : undefined,
          })
        : buildSpomoveSessionSnapshotV2({
            presetId: officialPreset.id,
            movement: movementPick,
            operationLayerStatus:
              operationLayerStatus === 'pending' ? 'ready' : operationLayerStatus,
            operation: operationCandidate,
            cueSeconds: effectiveCueSeconds,
            difficultyKind: difficultyKind ?? undefined,
            difficultyValue: difficultyKind ? difficultyValue : undefined,
          });
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
      difficultyKind: difficultyKind ?? undefined,
      difficultyValue: difficultyKind ? difficultyValue : undefined,
      spomoveSnapshot: snapshot,
    });
  }, [
    difficultyKind,
    difficultyValue,
    effectiveCueSeconds,
    launchMode,
    movementPick,
    movementResolutionStatus,
    movementSource,
    officialPreset,
    operationCandidate,
    operationLayerStatus,
    recordRecentProgramActivity,
    resolvedMovement,
    selectedBgmPath,
    soundEnabled,
    stopBgm,
  ]);

  const unlockActivation = useCallback(() => {
    if (launchMode === 'projector' && !document.fullscreenElement) {
      void document.documentElement.requestFullscreen?.().catch(() => undefined);
    }
    try {
      const ctx = getAudioCtx();
      void ctx?.resume?.();
    } catch {
      // ignore
    }
    void bgmPlayerRef.current?.play();
    setActivationBlocked(null);
  }, [launchMode]);

  const startOfficialSession = useCallback(() => {
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
    setSessionResult(null);
    movementSessionIdRef.current = createMovementSessionId();
    sessionStartedAtRef.current = null;

    if (launchMode === 'projector' && !document.fullscreenElement) {
      void document.documentElement.requestFullscreen?.().catch(() => undefined);
    }

    const needsIntro =
      movementResolutionStatus === 'ready' &&
      Boolean(resolvedMovement && movementPick && officialPreset.activityFamilyId) &&
      !hasSeenMovementIntro(officialPreset.activityFamilyId!, movementPick!);

    if (needsIntro && resolvedMovement && movementPick && officialPreset.activityFamilyId) {
      markMovementIntroSeen(officialPreset.activityFamilyId, movementPick);
      setState('movementIntro');
      if (introTimerRef.current) window.clearTimeout(introTimerRef.current);
      introTimerRef.current = window.setTimeout(() => {
        introTimerRef.current = null;
        enterRunning();
      }, MOVEMENT_INTRO_MS);
    } else {
      enterRunning();
    }

    window.setTimeout(() => {
      startLockedRef.current = false;
    }, 400);
  }, [
    bgmLoading,
    canStartSession,
    enterRunning,
    launchMode,
    movementPick,
    movementResolutionStatus,
    officialPreset,
    resolvedMovement,
  ]);

  useEffect(() => {
    return () => {
      if (introTimerRef.current) window.clearTimeout(introTimerRef.current);
    };
  }, []);

  const finishSession = useCallback((nextState: Extract<SessionState, 'done' | 'ended'>, payload?: EngineCompletePayload) => {
    if (!officialPreset) return;
    if (introTimerRef.current) {
      window.clearTimeout(introTimerRef.current);
      introTimerRef.current = null;
    }
    stopBgm();
    exitFullscreenAfterSession();
    const startedAt = sessionStartedAtRef.current;
    const fallbackElapsedMs = startedAt ? Math.max(1, Date.now() - startedAt) : 0;
    // Intro 중 이탈: session_started가 없으므로 completed/exited도 남기지 않음
    if (startedAt && movementPick && officialPreset.activityFamilyId) {
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

  const beginConfiguredSession = startOfficialSession;

  useEffect(() => {
    if (
      !legacyAutostart ||
      state !== 'idle' ||
      !officialPreset ||
      bgmLoading ||
      !officialPreset.isReady ||
      !canStartSession
    ) {
      return;
    }
    beginConfiguredSession();
  }, [legacyAutostart, bgmLoading, canStartSession, officialPreset, beginConfiguredSession, state]);

  const showBriefing = state === 'idle' && !legacyAutostart;

  const leaveSession = useCallback(() => {
    stopBgm();
    exitFullscreenAfterSession();
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
      return;
    }
    router.push('/spokedu-master/spomove');
  }, [exitFullscreenAfterSession, router, stopBgm]);

  /** Result 재실행 → Start 확인 화면 (즉시 Engine 금지) */
  const reopenStartConfirmation = useCallback(() => {
    if (!officialPreset) return;
    stopBgm();
    exitFullscreenAfterSession();
    startLockedRef.current = false;
    setSessionResult(null);
    setState('idle');
    const href = publicOfficialPresetSessionHref(officialPreset, {
      entry: 'start',
      mode: launchMode,
      movement: movementPick?.baseMovement,
      limb: movementPick?.limbRule,
      cueSeconds: effectiveCueSeconds,
      difficulty: difficultyKind ? difficultyValue : undefined,
      operation:
        operationLayerStatus !== 'legacyDisabled' && operationCandidate
          ? operationCandidate
          : null,
    });
    router.replace(href);
  }, [
    difficultyKind,
    difficultyValue,
    effectiveCueSeconds,
    exitFullscreenAfterSession,
    launchMode,
    movementPick,
    officialPreset,
    operationCandidate,
    operationLayerStatus,
    router,
    stopBgm,
  ]);

  const movementSummaryLine = useMemo(
    () => resolveStartMovementSummary(movementProfile, movementPick),
    [movementPick, movementProfile],
  );

  const operationSummary =
    operationLayerStatus !== 'legacyDisabled' && effectiveOperation
      ? operationSummaryLine(effectiveOperation)
      : null;

  const difficultySummaryLine = useMemo(() => {
    if (!difficultyKind) return null;
    const opt = getSpomoveDifficultyOptions(difficultyKind).find((item) => item.value === difficultyValue);
    return opt ? `${opt.label} 난이도` : null;
  }, [difficultyKind, difficultyValue]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'Space' && state === 'idle' && showBriefing) {
        if (isInteractiveKeyTarget(event.target)) return;
        event.preventDefault();
        beginConfiguredSession();
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

  if (!officialPreset) return <UnsupportedPreset />;

  if (state === 'movementIntro' && resolvedMovement) {
    return (
      <div className="relative flex h-dvh items-center justify-center overflow-hidden bg-black px-6 text-white">
        <button
          type="button"
          onClick={() => {
            if (introTimerRef.current) {
              window.clearTimeout(introTimerRef.current);
              introTimerRef.current = null;
            }
            startLockedRef.current = false;
            leaveSession();
          }}
          className="absolute right-4 top-4 z-10 grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white"
          aria-label="나가기"
          style={{ top: 'max(1rem, env(safe-area-inset-top))' }}
        >
          <X size={16} />
        </button>
        <div className="max-w-lg text-center">
          <p className="text-[13px] font-black uppercase tracking-[0.16em] text-white/45">오늘의 동작</p>
          <p className="mt-4 text-[40px] font-black leading-tight sm:text-[48px]">{resolvedMovement.displayLabel}</p>
          <p className="mt-4 text-[18px] font-semibold leading-relaxed text-white/75 sm:text-[20px]">
            {resolvedMovement.hudLabel}
          </p>
        </div>
      </div>
    );
  }

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
          goalkeeperTier={officialPreset.engine.goalkeeperTier}
          colorTrackerDualPanel={officialPreset.engine.colorTrackerDualPanel}
          camouflagePlacement={officialPreset.engine.camouflagePlacement}
          flowFeatures={officialPreset.engine.flowFeatures}
          flowDuration={officialPreset.engine.flowDuration}
          flowLayout={officialPreset.engine.flowLayout}
          flowIncludeBonus={officialPreset.engine.flowIncludeBonus}
          flankerStimulusType={officialPreset.engine.flankerStimulusType}
          flankerNestedCircleCount={officialPreset.engine.flankerNestedCircleCount}
          intervalLaunch={
            effectiveOperation?.timing.pattern === 'interval'
              ? {
                  workSeconds: effectiveOperation.timing.workSeconds,
                  restSeconds: effectiveOperation.timing.restSeconds,
                  sets: effectiveOperation.timing.sets,
                }
              : null
          }
          onExit={() => {
            finishSession('ended');
          }}
          onComplete={(payload) => {
            finishSession('done', payload);
          }}
        />
        {activationBlocked ? (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 px-6">
            <button
              type="button"
              onClick={unlockActivation}
              className="inline-flex min-h-14 items-center justify-center rounded-2xl bg-white px-6 text-[16px] font-black text-black shadow-xl"
            >
              {activationBlocked === 'audioBlocked'
                ? '소리 켜기'
                : activationBlocked === 'fullscreenBlocked'
                  ? '전체화면 켜기'
                  : '전체화면과 소리 켜기'}
            </button>
          </div>
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
          onExit={leaveSession}
        />
      ) : null}

      {showBriefing ? (
        <SessionSetupShell
          programLabel={displayModel?.programLabel ?? officialPreset.title}
          displayTitle={displayModel?.displayTitle ?? officialPreset.title}
          launchModeLabel={launchMode === 'mobile' ? '이 기기' : '큰 화면'}
        >
          {entryMode === 'settings' ? (
            <SettingsBriefing
              preset={officialPreset}
              startDisabled={bgmLoading || !canStartSession}
              cueSeconds={effectiveCueSeconds}
              onCueSecondsChange={handleCueSecondsChange}
              difficultyKind={difficultyKind}
              difficultyValue={difficultyValue}
              onDifficultyChange={(value) => {
                setDifficultyValue(value);
                persistPresetPreference({ difficulty: value });
              }}
              onStart={beginConfiguredSession}
              movement={resolvedMovement}
              movementPick={movementPick}
              movementProfile={movementProfile}
              movementFamily={movementFamily}
              cueFloorNotice={cueFloorNotice}
              operationConfig={operationCandidate}
            />
          ) : (
            <StartBriefing
              preset={officialPreset}
              movementSummaryLine={movementSummaryLine}
              difficultySummaryLine={difficultySummaryLine}
              operationSummaryLine={
                operationSummary
                  ? matGuidance && matGuidance.recommended > matGuidance.minimum
                    ? `${operationSummary} · 매트 권장 ${matGuidance.recommended}장`
                    : operationSummary
                  : null
              }
              cueSeconds={effectiveCueSeconds}
              onCueSecondsChange={handleCueSecondsChange}
              resolvedMovement={resolvedMovement}
              cueFloorNotice={cueFloorNotice}
              startDisabled={bgmLoading || !canStartSession}
              onStart={beginConfiguredSession}
            />
          )}
        </SessionSetupShell>
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
            retryLabel="같은 설정으로 시작"
            onBack={leaveSession}
            onRetry={reopenStartConfirmation}
            sessionSettings={
              resolvedMovement
                ? {
                    title: '사용한 동작',
                    primary: resolvedMovement.displayLabel,
                    secondary: [
                      matGuidance ? `매트 ${matGuidance.recommended}장` : '매트 1장',
                      `자극 ${effectiveCueSeconds}초`,
                      operationSummary,
                    ]
                      .filter(Boolean)
                      .join(' · '),
                  }
                : null
            }
            footer={(
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
