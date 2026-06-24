'use client';

import { Check, ClipboardList, Gauge, Lock, Maximize, Minimize, Music2, Play, RotateCcw, Users, Volume2, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { BgmPlayer } from '@/app/lib/admin/audio/bgmPlayer';
import { getPublicUrl } from '@/app/lib/admin/assets/storageClient';
import { useSpomoveTrainingBGM } from '@/app/lib/admin/hooks/useSpomoveTrainingBGM';
import { getAudioCtx } from '@/app/admin/spomove/training/_player/lib/audio';

import { useMasterStore } from '../../store';
import { EngineRouter } from './EngineRouter';
import {
  findOfficialSpomovePreset,
  type OfficialSpomovePreset,
} from '../officialSpomovePresets';
import {
  SPOMOVE_KEY_ACTION_LABELS,
  SPOMOVE_RESPONSE_TYPE_LABELS,
  SPOMOVE_TARGET_GROUP_LABELS,
  SPOMOVE_THINKING_LEVEL_LABELS,
  getOfficialSpomovePresetGuide,
} from '../officialSpomovePresetGuides';
import { getSpomovePresetDisplayModel } from '../spomovePresetDisplayModel';

type SessionState = 'idle' | 'running' | 'done';
type LaunchMode = 'projector' | 'mobile' | 'class';
type OfficialAccessState = 'checking' | 'allowed' | 'denied' | 'error';

function normalizeMode(mode: string | null): LaunchMode {
  if (mode === 'projector' || mode === 'class' || mode === 'mobile') return mode;
  return 'projector';
}

function getModeLabel(mode: LaunchMode) {
  if (mode === 'projector') return '큰 화면 모드';
  if (mode === 'class') return 'Class Mode';
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
  return (
    <div className="absolute left-0 right-0 top-0 z-20 flex min-h-[72px] items-center justify-between gap-4 bg-gradient-to-b from-black/72 to-transparent px-5 py-3 sm:px-7">
      <div className="min-w-0">
        <p className="text-[11px] font-black uppercase tracking-[0.12em] text-white/42">{getModeLabel(mode)}</p>
        <p className="mt-1 line-clamp-1 text-sm font-semibold text-white/70">{drillName}</p>
      </div>
      <div className="flex items-center gap-2">
        <button type="button" onClick={onToggleFullscreen} className="grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white" aria-label={isFullscreen ? '전체화면 해제' : '전체화면'}>
          {isFullscreen ? <Minimize size={15} /> : <Maximize size={15} />}
        </button>
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
  onStart,
}: {
  preset: OfficialSpomovePreset;
  startDisabled: boolean;
  onStart: () => void;
}) {
  const guide = getOfficialSpomovePresetGuide(preset);
  const [ef1, ef2, ef3] = preset.executionFacts ?? [];
  const facts = [
    { icon: Gauge, label: '프로그램', value: `${preset.axisTitle} · ${preset.programTitle}` },
    { icon: Volume2, label: ef1?.label ?? '신호 간격', value: ef1?.value ?? `${preset.cueSeconds}초` },
    { icon: Users, label: ef2?.label ?? '반복', value: ef2?.value ?? `${preset.rounds}회` },
    { icon: Music2, label: ef3?.label ?? 'BGM', value: ef3?.value ?? 'BGM 자동 재생' },
  ];

  return (
    <div className="flex h-full items-center justify-center px-5 pb-8 pt-24 sm:px-8">
      <section className="w-full max-w-[880px] overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.06] shadow-[0_28px_90px_rgba(0,0,0,0.38)] backdrop-blur-xl">
        <div className="border-b border-white/10 bg-white/[0.04] px-5 py-4 sm:px-7">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-indigo-200/70">SPOMOVE official preset</p>
          <h1 className="mt-2 text-[30px] font-black leading-tight text-white sm:text-[44px]">{preset.title}</h1>
          <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-white/58">{preset.description}</p>
        </div>

        <div className="grid gap-4 p-5 sm:grid-cols-4 sm:p-7">
          {facts.map(({ icon: Icon, label, value }) => (
            <div key={label} className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <Icon className="h-4 w-4 text-indigo-200" />
              <p className="mt-3 text-[10px] font-black uppercase tracking-[0.14em] text-white/34">{label}</p>
              <p className="mt-1 line-clamp-2 text-sm font-black text-white">{value}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-3 border-t border-white/10 px-5 pb-5 sm:grid-cols-4 sm:px-7 sm:pb-7">
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4 sm:col-span-2">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/34">추천 대상</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {guide.targetGroups.map((target) => (
                <span key={target} className="rounded-full border border-white/10 bg-white/[0.08] px-2.5 py-1 text-[11px] font-black text-white/78">
                  {SPOMOVE_TARGET_GROUP_LABELS[target]}
                </span>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/34">생각 난이도</p>
            <p className="mt-2 text-sm font-black text-white">{SPOMOVE_THINKING_LEVEL_LABELS[guide.thinkingLevel]}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/34">반응 유형</p>
            <p className="mt-2 text-sm font-black text-white">{SPOMOVE_RESPONSE_TYPE_LABELS[guide.responseType]}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4 sm:col-span-4">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/34">주요 동작</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {guide.keyActions.map((action) => (
                <span key={action} className="rounded-full border border-white/10 bg-white/[0.08] px-2.5 py-1 text-[11px] font-black text-white/78">
                  {SPOMOVE_KEY_ACTION_LABELS[action]}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-4 border-t border-white/10 p-5 sm:grid-cols-[1fr_auto] sm:items-center sm:p-7">
          <div>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-white/10 bg-white/[0.08] px-3 py-1.5 text-[12px] font-black text-white/78">큰 화면</span>
              <span className="rounded-full border border-white/10 bg-white/[0.08] px-3 py-1.5 text-[12px] font-black text-white/78">
                <Volume2 className="mr-1 inline h-3.5 w-3.5" />
                효과음 자동
              </span>
            </div>
            <p className="mt-3 text-xs font-semibold leading-5 text-white/42">{preset.recommendedUse}</p>
          </div>
          <button
            type="button"
            onClick={onStart}
            disabled={startDisabled}
            className="inline-flex h-14 items-center justify-center gap-3 rounded-2xl bg-white px-6 text-sm font-black text-black shadow-[0_18px_55px_rgba(255,255,255,0.18)] transition hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Play className="h-5 w-5 fill-black" />
            {startDisabled ? 'BGM 준비 중' : '큰 화면으로 실행'}
          </button>
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
          SPOMOVE 목록으로
        </Link>
      </section>
    </main>
  );
}

function SpomoveSessionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const presetId = searchParams.get('preset') ?? '';
  const officialPreset = useMemo(() => findOfficialSpomovePreset(presetId), [presetId]);
  const launchMode = normalizeMode(searchParams.get('mode'));
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

  const [officialAccess, setOfficialAccess] = useState<OfficialAccessState>(
    officialPreset ? 'checking' : 'denied',
  );
  const [state, setState] = useState<SessionState>('idle');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const bgmPlayerRef = useRef<BgmPlayer | null>(null);

  useEffect(() => {
    if (!officialPreset) return;
    let alive = true;
    setOfficialAccess('checking');
    fetch('/api/spokedu-master/access', { cache: 'no-store' })
      .then((response) => {
        if (!alive) return;
        if (response.ok) setOfficialAccess('allowed');
        else if (response.status === 401 || response.status === 403) setOfficialAccess('denied');
        else setOfficialAccess('error');
      })
      .catch(() => {
        if (alive) setOfficialAccess('error');
      });
    return () => {
      alive = false;
    };
  }, [officialPreset]);

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

  const startOfficialSession = useCallback(() => {
    if (!officialPreset || officialAccess !== 'allowed' || bgmLoading || !officialPreset.isReady) return;
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
    setState('running');
    const displayModel = getSpomovePresetDisplayModel(officialPreset);
    recordRecentProgramActivity({
      programId: officialPreset.id,
      programTitle: displayModel.displayTitle,
      action: 'spomove_started',
      occurredAt: new Date().toISOString(),
    });
  }, [bgmLoading, launchMode, officialAccess, officialPreset, recordRecentProgramActivity, selectedBgmPath, soundEnabled, stopBgm]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'Space' && (state === 'idle' || state === 'done')) {
        event.preventDefault();
        startOfficialSession();
      }
      if (event.key.toLowerCase() === 'f') {
        if (!document.fullscreenElement) void document.documentElement.requestFullscreen?.();
        else void document.exitFullscreen?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [startOfficialSession, state]);

  if (!officialPreset) return <UnsupportedPreset />;

  if (officialAccess !== 'allowed') {
    if (officialAccess === 'checking') {
      return (
        <main className="grid h-dvh place-items-center bg-black" aria-busy="true">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
        </main>
      );
    }

    return (
      <main className="flex h-dvh items-center justify-center bg-slate-950 px-5 text-white">
        <section className="w-full max-w-lg rounded-[28px] border border-white/10 bg-white/[0.06] p-8 text-center">
          <Lock className="mx-auto h-8 w-8 text-indigo-200" />
          <h1 className="mt-5 text-2xl font-black">SPOMOVE를 실행할 수 없습니다.</h1>
          <p className="mt-3 text-sm font-semibold text-white/55">
            {officialAccess === 'denied'
              ? '로그인 상태와 이용권을 확인해 주세요.'
              : '이용 권한을 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.'}
          </p>
          <Link href="/spokedu-master/spomove" className="mt-6 inline-flex h-12 items-center justify-center rounded-2xl bg-white px-6 text-sm font-black text-slate-950">
            SPOMOVE 목록으로
          </Link>
        </section>
      </main>
    );
  }

  if (state === 'running') {
    return (
      <EngineRouter
        mode={officialPreset.engine.mode}
        level={officialPreset.engine.level}
        speedSec={officialPreset.cueSeconds}
        rounds={officialPreset.rounds}
        soundEnabled={soundEnabled}
        variantColorTheme={officialPreset.engine.variantColorTheme}
        reactTrainConcurrent={officialPreset.engine.reactTrainConcurrent}
        flowFeatures={officialPreset.engine.flowFeatures}
        flowDuration={officialPreset.engine.flowDuration}
        onExit={() => {
          stopBgm();
          router.push('/spokedu-master/spomove');
        }}
        onComplete={() => {
          stopBgm();
          setState('done');
        }}
      />
    );
  }

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) void document.documentElement.requestFullscreen?.();
    else void document.exitFullscreen?.();
  };

  return (
    <div className="relative h-dvh overflow-hidden select-none bg-[#050509] text-white" style={{ fontFamily: 'var(--spm-font-display)' }}>
      <TopBar
        drillName={officialPreset.title}
        mode={launchMode}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
        onExit={() => {
          stopBgm();
          router.push('/spokedu-master/spomove');
        }}
      />

      {state === 'idle' ? (
        <OfficialEngineBriefing
          preset={officialPreset}
          startDisabled={bgmLoading}
          onStart={startOfficialSession}
        />
      ) : null}

      {state === 'done' ? (
        <div className="flex h-full flex-col items-center justify-center px-8 text-center">
          <div className="grid h-24 w-24 animate-[spmCuePop_0.28s_cubic-bezier(.34,1.56,.64,1)_both] place-items-center rounded-full bg-white/10">
            <Check size={42} color="#34d399" />
          </div>
          <h1 className="mt-6 text-[36px] font-black">큰 화면 실행 완료</h1>
          <p className="mt-2 text-xs font-black uppercase tracking-[0.12em] text-indigo-200/70">{program?.title ?? officialPreset.title}</p>
          <div className={`mt-7 grid w-full max-w-[680px] gap-2 ${programId ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-2'}`}>
            <button type="button" onClick={startOfficialSession} className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-indigo-500 text-sm font-bold text-white shadow-[0_16px_44px_rgba(79,70,229,0.26)]">
              <RotateCcw size={16} />
              다시 시작
            </button>
            {programId ? (
              <Link href={`/spokedu-master/report?program=${programId}`} className="flex h-12 items-center justify-center gap-1.5 rounded-2xl bg-white text-sm font-black text-black">
                <ClipboardList size={14} />
                설명 문구
              </Link>
            ) : null}
            <Link href="/spokedu-master/spomove" className="flex h-12 items-center justify-center rounded-2xl bg-white/[0.08] text-sm font-bold text-white">
              목록으로
            </Link>
          </div>
          {programId ? (
            <Link href={`/spokedu-master/class-record?program=${programId}`} className="mt-4 text-xs font-bold text-white/38 underline-offset-4 hover:text-white/70 hover:underline">
              수업 기록으로 오늘 활동 남기기
            </Link>
          ) : null}
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
    <Suspense fallback={<div className="relative h-dvh overflow-hidden select-none bg-black text-white" />}>
      <SpomoveSessionContent />
    </Suspense>
  );
}
