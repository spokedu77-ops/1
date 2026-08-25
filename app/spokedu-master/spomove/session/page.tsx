'use client';

import { Maximize, Minimize, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { BgmPlayer } from '@/app/lib/admin/audio/bgmPlayer';
import { getPublicUrl } from '@/app/lib/admin/assets/storageClient';
import { useSpomoveTrainingBGM } from '@/app/lib/admin/hooks/useSpomoveTrainingBGM';
import { getAudioCtx } from '@/app/admin/spomove/training/_player/lib/audio';

import { useMasterStore } from '../../store';
import { ErrorBoundary } from '../../components/ui/ErrorBoundary';
import { EngineRouter, type EngineCompletePayload } from './EngineRouter';
import { lockViewportScroll } from '@/app/admin/spomove/training/_player/lib/lockViewportScroll';
import {
  findOfficialSpomovePreset,
  publicOfficialPresetSessionHref,
  standardSpomoveDurationSec,
} from '../officialSpomovePresets';
import { getSpomovePresetDisplayModel } from '../spomovePresetDisplayModel';
import { parseSpomoveHubReturnHref } from '../spomoveHubNavigation';
import {
  buildActivitySessionHref,
  parseMasterWorkReturnHref,
  readSpomoveSessionOrigin,
} from '../../lib/masterNavigationContext';
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
import { SessionSetupShell } from './SessionSetupShell';
import { StartBriefing } from './StartBriefing';
import { SettingsBriefing } from './SettingsBriefing';
import { MasterSessionResult } from './MasterSessionResult';
import {
  isInteractiveKeyTarget,
  parseSessionEntryMode,
  resolveLegacyAutostart,
} from './sessionEntryMode';
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
type SessionState = 'idle' | 'running' | 'done' | 'ended';
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

  const activityFamily = useMemo(() => {
    if (!officialPreset?.activityFamilyId) return null;
    return getActivityFamily(officialPreset.activityFamilyId);
  }, [officialPreset?.activityFamilyId]);

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
  const [markCompleteStatus, setMarkCompleteStatus] = useState<'idle' | 'saving' | 'error'>('idle');
  const [exitConfirmationOpen, setExitConfirmationOpen] = useState(false);

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
      const next = value;
      setCueSeconds(writeLastCueSeconds(next));
      persistPresetPreference({ cue: next });
    },
    [persistPresetPreference],
  );

  const effectiveCueSeconds = useMemo(() => {
    if (!officialPreset) return cueSeconds;
    let next = !supportsCueSpeedOverride(officialPreset)
      ? clampCueSpeedSec(officialPreset.cueSeconds)
      : cueSeconds;
    return next;
  }, [cueSeconds, officialPreset]);

  const cueFloorNotice = useMemo(() => {
    return null;
  }, []);

  const recordProgramHref = program && officialPreset && sessionResult
    ? buildSpomoveRecordHref(
        program.id,
        buildSpomoveRecordDraft({
          elapsedMs: sessionResult.elapsedMs,
          preset: officialPreset,
          status: state === 'done' ? 'done' : 'ended',
        }),
      )
    : program
      ? '/spokedu-master/activity'
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

    sessionStartedAtRef.current = Date.now();
    setState('running');
    const display = getSpomovePresetDisplayModel(officialPreset);
    const snapshot =
      operationLayerStatus === 'legacyDisabled' || !operationCandidate
        ? buildSpomoveSessionSnapshotV2({
            presetId: officialPreset.id,
            operationLayerStatus: 'legacyDisabled',
            cueSeconds: effectiveCueSeconds,
            difficultyKind: difficultyKind ?? undefined,
            difficultyValue: difficultyKind ? difficultyValue : undefined,
          })
        : buildSpomoveSessionSnapshotV2({
            presetId: officialPreset.id,
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
    officialPreset,
    operationCandidate,
    operationLayerStatus,
    recordRecentProgramActivity,
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
    sessionStartedAtRef.current = null;

    if (launchMode === 'projector' && !document.fullscreenElement) {
      void document.documentElement.requestFullscreen?.().catch(() => undefined);
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

  const finishSession = useCallback((nextState: Extract<SessionState, 'done' | 'ended'>, payload?: EngineCompletePayload) => {
    if (!officialPreset) return;
    stopBgm();
    exitFullscreenAfterSession();
    const startedAt = sessionStartedAtRef.current;
    const fallbackElapsedMs = startedAt ? Math.max(1, Date.now() - startedAt) : 0;
    setSessionResult({
      engineMode: payload?.engineMode ?? officialPreset.engine.mode,
      engineLevel: payload?.engineLevel ?? officialPreset.engine.level,
      elapsedMs: payload?.elapsedMs ?? fallbackElapsedMs,
      colorCounts: payload?.colorCounts ?? null,
      stims: payload?.stims,
      maxCombo: payload?.maxCombo,
    });
    setState(nextState);
    // Product truth: SPOMOVE engine done ≠ SessionProgram completed.
    // Lesson activity completion is teacher-explicit only (Result CTA or Session checkbox).
    setMarkCompleteStatus('idle');
  }, [
    exitFullscreenAfterSession,
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
    const workReturnHref = parseMasterWorkReturnHref(
      searchParams.get('returnTo'),
      searchParams.get('hubReturn'),
      searchParams.get('hubView'),
    );
    router.push(workReturnHref);
  }, [exitFullscreenAfterSession, router, searchParams, stopBgm]);

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
    setSessionResult(null);
    setMarkCompleteStatus('idle');
    setState('idle');
    const origin = readSpomoveSessionOrigin(searchParams);
    const href = publicOfficialPresetSessionHref(officialPreset, {
      entry: 'start',
      mode: launchMode,
      cueSeconds: effectiveCueSeconds,
      difficulty: difficultyKind ? difficultyValue : undefined,
      operation:
        operationLayerStatus !== 'legacyDisabled' && operationCandidate
          ? operationCandidate
          : null,
      hubView: searchParams.get('hubView') === 'favorites' ? 'favorites' : undefined,
      hubReturn: parseSpomoveHubReturnHref(searchParams.get('hubReturn'), searchParams.get('hubView')),
      returnTo: origin.returnTo ?? undefined,
      session: origin.sessionId ?? undefined,
      sessionProgram: origin.sessionProgramId ?? undefined,
    });
    router.replace(href);
  }, [
    difficultyKind,
    difficultyValue,
    effectiveCueSeconds,
    exitFullscreenAfterSession,
    launchMode,
    officialPreset,
    operationCandidate,
    operationLayerStatus,
    router,
    searchParams,
    stopBgm,
  ]);

  const operationSummary =
    operationLayerStatus !== 'legacyDisabled' && effectiveOperation
      ? operationSummaryLine(effectiveOperation)
      : null;
  const sessionOrigin = readSpomoveSessionOrigin(searchParams);
  const hubReturnHref = parseSpomoveHubReturnHref(searchParams.get('hubReturn'), searchParams.get('hubView'));
  const sessionReturnHref = sessionOrigin.isSessionOrigin
    ? parseMasterWorkReturnHref(
      sessionOrigin.returnTo,
      null,
      null,
      sessionOrigin.sessionId ? buildActivitySessionHref(sessionOrigin.sessionId) : '/spokedu-master/activity',
    )
    : null;
  const difficultyLabel = difficultyKind
    ? getSpomoveDifficultyOptions(difficultyKind).find((option) => option.value === difficultyValue)?.label ?? null
    : null;
  const openSettings = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('entry', 'settings');
    router.replace(`/spokedu-master/spomove/session?${params.toString()}`);
  }, [router, searchParams]);

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
          simonPoleCount={officialPreset.engine.simonPoleCount}
          colorTrackerDualPanel={officialPreset.engine.colorTrackerDualPanel}
          camouflagePlacement={officialPreset.engine.camouflagePlacement}
          flowFeatures={officialPreset.engine.flowFeatures}
          flowDuration={officialPreset.engine.flowDuration}
          flowLayout={officialPreset.engine.flowLayout}
          flowIncludeBonus={officialPreset.engine.flowIncludeBonus}
          flankerStimulusType={officialPreset.engine.flankerStimulusType}
          flankerNestedCircleCount={officialPreset.engine.flankerNestedCircleCount}
          flankerExtremeMode={officialPreset.engine.flankerExtremeMode}
          flankerArrowMode={officialPreset.engine.flankerArrowMode}
          stroopWordMode={officialPreset.engine.stroopWordMode}
          handFootDifficulty={officialPreset.engine.handFootDifficulty}
          intervalLaunch={
            effectiveOperation?.timing.pattern === 'interval'
              ? {
                  workSeconds: effectiveOperation.timing.workSeconds,
                  restSeconds: effectiveOperation.timing.restSeconds,
                  sets: effectiveOperation.timing.sets,
                }
              : null
          }
          onExit={() => setExitConfirmationOpen(true)}
          onComplete={(payload) => {
            finishSession('done', payload);
          }}
        />
        {activationBlocked ? (
          <div className="absolute inset-x-3 top-[max(0.75rem,env(safe-area-inset-top))] z-50 mx-auto flex max-w-xl items-center gap-3 rounded-2xl border border-white/15 bg-black/80 p-3 text-white shadow-xl backdrop-blur">
            <p className="min-w-0 flex-1 text-[13px] font-bold leading-5">
              {activationBlocked === 'audioBlocked' ? '소리를 사용할 수 없어 화면은 계속 실행됩니다.' : activationBlocked === 'fullscreenBlocked' ? '전체화면을 사용할 수 없어 일반 화면으로 실행합니다.' : '전체화면과 소리를 사용할 수 없어 일반 화면으로 계속 실행합니다.'}
            </p>
            <button type="button" onClick={unlockActivation} className="min-h-11 shrink-0 rounded-xl bg-white px-3 text-xs font-black text-black">다시 시도</button>
            <button type="button" onClick={() => setActivationBlocked(null)} aria-label="안내 닫기" className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-white/70"><X className="h-4 w-4" /></button>
          </div>
        ) : null}
        {exitConfirmationOpen ? (
          <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/70 px-5" role="dialog" aria-modal="true" aria-labelledby="spomove-exit-title">
            <section className="w-full max-w-sm rounded-[22px] border border-white/15 bg-slate-950 p-5 text-white shadow-2xl">
              <h2 id="spomove-exit-title" className="text-xl font-black">수업을 종료할까요?</h2>
              <p className="mt-2 text-sm font-semibold text-white/60">지금까지 진행한 시간은 중도 종료로 남길 수 있습니다.</p>
              <div className="mt-5 grid gap-2">
                <button type="button" autoFocus onClick={() => setExitConfirmationOpen(false)} className="min-h-12 rounded-xl bg-white text-sm font-black text-slate-950">계속하기</button>
                <button type="button" onClick={() => { setExitConfirmationOpen(false); finishSession('ended'); }} className="min-h-11 rounded-xl border border-rose-300/30 text-sm font-bold text-rose-200">수업 종료</button>
              </div>
            </section>
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
          compact={entryMode === 'start'}
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
              activityFamily={activityFamily}
              cueFloorNotice={cueFloorNotice}
              operationConfig={operationCandidate}
            />
          ) : (
            <StartBriefing
              preset={officialPreset}
              cueSeconds={effectiveCueSeconds}
              difficultyLabel={difficultyLabel}
              matCount={matGuidance?.recommended ?? activityFamily?.matRequirement.minMats ?? 1}
              movementSummary={operationSummary}
              mode={launchMode}
              soundEnabled={soundEnabled}
              canChangeSettings={supportsCueSpeedOverride(officialPreset) || Boolean(difficultyKind)}
              startDisabled={bgmLoading || !canStartSession}
              onSettings={openSettings}
              onStart={beginConfiguredSession}
            />
          )}
        </SessionSetupShell>
      ) : null}

      {(state === 'done' || state === 'ended') && sessionResult ? (
        <div className="absolute inset-0 min-h-0 overflow-hidden bg-[#F1F5F9]">
          <MasterSessionResult status={state} activityTitle={displayModel?.displayTitle ?? officialPreset.title} elapsedMs={sessionResult.elapsedMs ?? 0} settings={[
            `SPOMAT ${matGuidance?.recommended ?? activityFamily?.matRequirement.minMats ?? 1}장`,
            `자극 ${effectiveCueSeconds}초`,
            difficultyLabel,
            operationSummary,
          ].filter(Boolean) as string[]} recordHref={recordProgramHref} hubHref={hubReturnHref} sessionReturnHref={sessionReturnHref} canMarkComplete={Boolean(sessionOrigin.sessionId && sessionOrigin.sessionProgramId && state === 'done')} markCompleteStatus={markCompleteStatus} onMarkCompleteAndReturn={markCompleteAndReturn} onRetry={reopenStartConfirmation} />
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
