'use client';

import dynamic from 'next/dynamic';
import { useState, useMemo, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import catalog, {
  type Core5Series,
  type Core5Program,
  type Core5Stage,
  type SeriesCode,
} from '@/app/lib/spomove/core5Catalog';
import { youtubeWatchOrShareToEmbedSrc } from '@/app/lib/spomove/youtubeEmbed';
import { TRAINING_ENGINE_GUIDE_VIDEOS } from '@/app/lib/spomove/trainingEngineGuideVideos';
import { MODES } from '@/app/admin/memory-game/constants';
import { GUIDE_BLOCKS } from '@/app/admin/memory-game/trainingGuideContent';
import type { MemoryGameAutoLaunch } from './_player/MemoryGameApp';

/* ─── MemoryGameApp (Training 전용 복제본): SSR 비활성, 클라이언트 전용 ─── */
const MemoryGameApp = dynamic(
  () => import('./_player/MemoryGameApp').then((m) => m.default),
  {
    ssr: false,
    loading: () => (
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#020617', color: 'rgba(255,255,255,0.35)',
        fontFamily: 'sans-serif', fontSize: 12, letterSpacing: '0.14em', fontWeight: 600,
      }}>
        LOADING…
      </div>
    ),
  },
);

/* ─── design tokens ─── */
const T = {
  bg:          '#0a0a0a',
  surface:     '#111111',
  card:        '#161616',
  border:      'rgba(255,255,255,0.07)',
  borderHover: 'rgba(255,255,255,0.15)',
  muted:       'rgba(255,255,255,0.32)',
  text:        'rgba(255,255,255,0.88)',
  textDim:     'rgba(255,255,255,0.48)',
};

/** Training 설정: 메인 앱 「홈→모드 선택」 흐름과 겹치는 prep 문장 제외 */
function filterGuidePrepItemsForTraining(items: string[]): string[] {
  return items.filter((line) => {
    if (/홈\s*에서|홈\s*그리드|트레이닝\s*설정\s*카드|흐름:\s*홈/.test(line)) return false;
    return true;
  });
}

function guidePhaseNumForEngine(mode: string, level: number): string {
  if (mode === 'dual' && level === 2) return '2-1번';
  return `${level}번`;
}

/** Training 설정 상단 한 줄 (TRAINING_GUIDE_PAGE_INTRO 대체) */
const TRAINING_SETTINGS_LEAD =
  '이 화면에서 자극 속도·횟수(또는 시간)를 맞춘 뒤 시작하면 됩니다. 아래 가이드를 펼치면 상세 가이드와 수업 포인트를 볼 수 있습니다.';

/** RC: 카탈로그 스테이지명 ≠ 임베드 템플릿 자동 매핑 — UI에서 Memory Game 가이드 블록을 붙이지 않기 위한 구분 */
const RHYTHM_COORDINATION_SERIES_CODE = 'RC' as const;

const STAGE_VIDEO_LS_PREFIX = 'spomove-training-stage-video:';

function stageVideoStorageKey(seriesCode: string, programId: string, stageNum: number) {
  return `${STAGE_VIDEO_LS_PREFIX}${seriesCode}:${programId}:${stageNum}`;
}

/** YouTube watch / youtu.be / shorts / embed URL이면 iframe으로 재생, 아니면 렌더 생략 */
function SettingsGuideVideoIframe({
  videoUrl,
  accent,
}: {
  videoUrl?: string | null;
  accent: string;
}) {
  const src = videoUrl?.trim() ? youtubeWatchOrShareToEmbedSrc(videoUrl) : null;
  if (!src) return null;
  return (
    <div
      style={{
        marginTop: 10,
        marginBottom: 4,
        width: '100%',
        aspectRatio: '16 / 9',
        maxHeight: 220,
        borderRadius: 10,
        overflow: 'hidden',
        border: `1px solid ${accent}55`,
        background: '#000',
      }}
    >
      <iframe
        title="YouTube 가이드 영상"
        src={src}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        loading="lazy"
        style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
      />
    </div>
  );
}

/** 스테이지 제목 아래: 링크 입력 + (유효 시) 임베드 / (없을 때) 빈 영상 칸 안내 */
function StageYouTubeGuideBlock({
  accent,
  inputValue,
  effectiveUrl,
  invalid,
  onChange,
  onBlur,
}: {
  accent: string;
  inputValue: string;
  effectiveUrl: string;
  invalid: boolean;
  onChange: (v: string) => void;
  onBlur: () => void;
}) {
  const src = effectiveUrl.trim() ? youtubeWatchOrShareToEmbedSrc(effectiveUrl) : null;
  return (
    <div
      style={{
        marginTop: 16,
        padding: 14,
        borderRadius: 12,
        border: `1px solid ${T.border}`,
        background: T.surface,
        boxSizing: 'border-box',
      }}
    >
      <p
        style={{
          margin: '0 0 10px',
          fontSize: 12,
          fontWeight: 800,
          color: T.text,
          letterSpacing: '0.04em',
        }}
      >
        가이드 영상 (YouTube)
      </p>
      <label
        htmlFor="spomove-stage-youtube-url"
        style={{
          display: 'block',
          fontSize: 10,
          fontWeight: 800,
          color: T.muted,
          letterSpacing: '0.12em',
          marginBottom: 6,
        }}
      >
        영상 링크
      </label>
      <input
        id="spomove-stage-youtube-url"
        type="text"
        inputMode="url"
        autoComplete="off"
        spellCheck={false}
        placeholder="https://www.youtube.com/watch?v=… 또는 youtu.be/…"
        value={inputValue}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        style={{
          width: '100%',
          boxSizing: 'border-box',
          padding: '10px 12px',
          borderRadius: 8,
          border: `1px solid ${T.border}`,
          background: T.card,
          color: T.text,
          fontFamily: 'inherit',
          fontSize: 13,
          outline: 'none',
          WebkitAppearance: 'none' as const,
          appearance: 'none' as const,
        }}
      />
      {invalid ? (
        <p style={{ margin: '8px 0 0', fontSize: 11, color: 'rgba(248,113,113,0.92)', lineHeight: 1.45 }}>
          인식할 수 없는 링크입니다. watch, youtu.be, shorts, embed 주소를 넣어 주세요.
        </p>
      ) : null}
      <div
        style={{
          marginTop: 12,
          width: '100%',
          aspectRatio: '16 / 9',
          maxHeight: 220,
          borderRadius: 10,
          overflow: 'hidden',
          border: src ? `1px solid ${accent}55` : `1px dashed ${accent}44`,
          background: src ? '#000' : 'rgba(255,255,255,0.03)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {src ? (
          <iframe
            title="YouTube 가이드 영상"
            src={src}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            loading="lazy"
            style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
          />
        ) : (
          <span
            style={{
              padding: '0 16px',
              textAlign: 'center',
              fontSize: 11,
              fontWeight: 600,
              color: 'rgba(255,255,255,0.28)',
              letterSpacing: '0.06em',
              lineHeight: 1.5,
            }}
          >
            위에 YouTube 링크를 붙여넣으면
            <br />
            여기에서 재생됩니다
          </span>
        )}
      </div>
    </div>
  );
}

/* ─── 훈련 설정 타입 ─── */
type LaunchSettings = {
  speed: number;
  timeMode: 'time' | 'reps';
  duration: number;
  targetReps: number;
};

/* ─── 페이지 단계 ─── */
type PagePhase =
  | { tag: 'catalog' }
  | { tag: 'settings'; stage: Core5Stage; program: Core5Program; series: Core5Series }
  | { tag: 'training'; engine: { mode: string; level: number }; launch: LaunchSettings };

/* ══ TrainingPortal ── autoLaunch로 바로 훈련 시작 ══ */
function TrainingPortal({
  engine,
  launch,
  onClose,
}: {
  engine: { mode: string; level: number };
  launch: LaunchSettings;
  onClose: () => void;
}) {
  // dynamic({ ssr: false }) 뒤에는 항상 브라우저이므로 mounted 게이트 없이 바로 포털을 연다.
  if (typeof document === 'undefined') return null;

  const autoLaunch: MemoryGameAutoLaunch = {
    speed:      launch.speed,
    timeMode:   launch.timeMode,
    duration:   launch.duration,
    targetReps: launch.targetReps,
    warmup:     3,
  };

  return createPortal(
    <div style={{
      position: 'fixed', inset: 0, zIndex: 99999,
      display: 'flex', flexDirection: 'column',
      background: '#020617',
    }}>
      <MemoryGameApp
        key={`${engine.mode}-${engine.level}-${launch.speed}-${launch.duration}-${launch.targetReps}`}
        initialMode={engine.mode}
        initialLevel={engine.level}
        autoLaunch={autoLaunch}
        onExit={onClose}
        onUnavailable={onClose}
      />
      {/* 종료 버튼: 훈련 중 항상 접근 가능하도록 좌상단 고정 */}
      <button
        type="button"
        onClick={onClose}
        aria-label="훈련 종료"
        style={{
          position: 'fixed', top: 10, left: 10, zIndex: 100000,
          display: 'flex', alignItems: 'center', gap: 5,
          padding: '6px 12px', borderRadius: 8,
          border: '1px solid rgba(255,255,255,0.14)',
          background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(12px)',
          color: 'rgba(255,255,255,0.55)',
          fontFamily: 'inherit', fontSize: 12, fontWeight: 700,
          cursor: 'pointer', letterSpacing: '0.06em',
          transition: 'background 0.15s, color 0.15s',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,0,0,0.85)';
          (e.currentTarget as HTMLButtonElement).style.color = '#fff';
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,0,0,0.55)';
          (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.55)';
        }}
      >
        ✕ 종료
      </button>
    </div>,
    document.body,
  );
}

/* ══ SettingsPanel ── 새 UI로 훈련 설정 ══ */
function SettingsPanel({
  stage, program, series,
  onStart, onBack,
}: {
  stage: Core5Stage;
  program: Core5Program;
  series: Core5Series;
  onStart: (s: LaunchSettings) => void;
  onBack: () => void;
}) {
  const engine = stage.engine;
  const isReactTrain = engine?.mode === 'reactTrain';

  const [speed,      setSpeed]      = useState(2.0);
  const [timeMode,   setTimeMode]   = useState<'time' | 'reps'>(isReactTrain ? 'time' : 'reps');
  const [duration,   setDuration]   = useState(60);
  const [targetReps, setTargetReps] = useState(20);
  const [seriesGuideOpen, setSeriesGuideOpen] = useState(false);
  const [engineGuideOpen, setEngineGuideOpen] = useState(false);
  const [stageVideoInput, setStageVideoInput] = useState('');

  const stageVideoLsKey = useMemo(
    () => stageVideoStorageKey(series.code, program.programId, stage.stage),
    [series.code, program.programId, stage.stage],
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    let stored = '';
    try {
      stored = localStorage.getItem(stageVideoLsKey) ?? '';
    } catch {
      /* ignore */
    }
    const catalogDefault = stage.settingsVideoUrl?.trim() ?? '';
    setStageVideoInput(stored.trim() ? stored.trim() : catalogDefault);
  }, [stageVideoLsKey, stage.settingsVideoUrl]);

  const persistStageVideoLink = useCallback(() => {
    if (typeof window === 'undefined' || !engine) return;
    try {
      const v = stageVideoInput.trim();
      if (v) localStorage.setItem(stageVideoLsKey, v);
      else localStorage.removeItem(stageVideoLsKey);
    } catch {
      /* ignore */
    }
  }, [engine, stageVideoInput, stageVideoLsKey]);

  const stageVideoEffective =
    stageVideoInput.trim() || stage.settingsVideoUrl?.trim() || '';
  const stageVideoInvalid =
    Boolean(stageVideoInput.trim()) && !youtubeWatchOrShareToEmbedSrc(stageVideoInput);

  const guideBlock = useMemo(() => {
    if (!engine) return null;
    return GUIDE_BLOCKS.find((b) => b.id === engine.mode) ?? null;
  }, [engine]);

  const guidePhase = useMemo(() => {
    if (!engine || !guideBlock) return null;
    const num = guidePhaseNumForEngine(engine.mode, engine.level);
    return guideBlock.phases.find((p) => p.num === num) ?? null;
  }, [engine, guideBlock]);

  const prepFiltered = useMemo(() => {
    if (!guideBlock) return [];
    return filterGuidePrepItemsForTraining(guideBlock.prep.items);
  }, [guideBlock]);

  const modeDef = useMemo(() => {
    if (!engine) return null;
    return MODES[engine.mode] ?? null;
  }, [engine]);

  const engineGuideVideoUrl = engine
    ? (TRAINING_ENGINE_GUIDE_VIDEOS[engine.mode] ?? null)
    : null;

  const speedLabel = useMemo(() => {
    if (speed <= 2)     return '빠름';
    if (speed <= 4)     return '보통';
    if (speed <= 6)     return '약간 느림';
    return '느림';
  }, [speed]);

  const timePills  = [30, 60, 90, 120, 180];
  const repsPills  = [10, 20, 30, 50];

  const handleStart = useCallback(() => {
    onStart({ speed, timeMode, duration, targetReps });
  }, [speed, timeMode, duration, targetReps, onStart]);

  if (!engine) {
    return (
      <div style={{ background: T.bg, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <header style={{
          height: 52, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12,
          padding: '0 24px', borderBottom: `1px solid ${T.border}`, background: T.bg,
        }}>
          <button
            type="button"
            onClick={onBack}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 8,
              border: `1px solid ${T.border}`, background: 'transparent', color: T.muted,
              fontFamily: 'inherit', fontSize: 12, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.06em',
            }}
          >
            ← 목록
          </button>
        </header>
        <div style={{ padding: 48, color: T.textDim, fontSize: 14, maxWidth: 480, margin: '0 auto' }}>
          이 스테이지는 아직 연결된 훈련 엔진이 없습니다.
        </div>
      </div>
    );
  }

  return (
    <div style={{
      background: T.bg, minHeight: '100vh',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* 상단 바 */}
      <header style={{
        height: 52, flexShrink: 0,
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '0 24px',
        borderBottom: `1px solid ${T.border}`,
        background: T.bg,
      }}>
        <button
          type="button"
          onClick={onBack}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '5px 12px', borderRadius: 8,
            border: `1px solid ${T.border}`,
            background: 'transparent', color: T.muted,
            fontFamily: 'inherit', fontSize: 12, fontWeight: 700,
            cursor: 'pointer', letterSpacing: '0.06em',
            transition: 'border-color 0.15s, color 0.15s',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = T.borderHover;
            (e.currentTarget as HTMLButtonElement).style.color = T.text;
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = T.border;
            (e.currentTarget as HTMLButtonElement).style.color = T.muted;
          }}
        >
          ← 목록
        </button>
        <span style={{ fontSize: 11, color: T.muted, letterSpacing: '0.12em', fontWeight: 600 }}>
          {series.code} · {program.programId} · STAGE {stage.stage}
        </span>
      </header>

      {/* 설정 카드 */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        padding: '48px 24px 80px',
        overflowY: 'auto',
      }}>
        <div style={{
          width: '100%', maxWidth: 480,
          display: 'flex', flexDirection: 'column', gap: 0,
        }}>

          {/* 스테이지 헤더 */}
          <div style={{ marginBottom: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <span style={{
                padding: '3px 9px', borderRadius: 6,
                background: `${series.accent}18`, border: `1px solid ${series.accent}35`,
                fontSize: 10, fontWeight: 800, color: series.accent, letterSpacing: '0.1em',
              }}>
                {series.code}
              </span>
              <span style={{ fontSize: 11, color: T.muted, fontWeight: 600, letterSpacing: '0.06em' }}>
                {program.title}
              </span>
            </div>
            <h1 style={{
              fontSize: 22, fontWeight: 900, color: T.text,
              margin: 0, letterSpacing: '-0.02em', lineHeight: 1.2,
            }}>
              {stage.label}
            </h1>
            <p style={{ fontSize: 12, color: T.textDim, margin: '8px 0 0', letterSpacing: '0.03em' }}>
              STAGE {stage.stage} · {program.programId}
            </p>
            <StageYouTubeGuideBlock
              accent={series.accent}
              inputValue={stageVideoInput}
              effectiveUrl={stageVideoEffective}
              invalid={stageVideoInvalid}
              onChange={setStageVideoInput}
              onBlur={persistStageVideoLink}
            />
          </div>

          {/* 구분선 */}
          <div style={{ height: 1, background: T.border, marginBottom: 28 }} />

          {/* ── Training 상단 가이드 (시리즈 + 상세 가이드 발췌) ── */}
          <p style={{ fontSize: 12, color: T.textDim, lineHeight: 1.65, margin: '0 0 20px', letterSpacing: '0.02em' }}>
            {TRAINING_SETTINGS_LEAD}
          </p>

          {series.settingsIntro ? (
            <div style={{ marginBottom: 14, border: `1px solid ${T.border}`, borderRadius: 12, overflow: 'hidden' }}>
              <button
                type="button"
                onClick={() => setSeriesGuideOpen((v) => !v)}
                style={{
                  width: '100%', textAlign: 'left', padding: '12px 14px',
                  background: T.card, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                  display: 'flex', alignItems: 'center', gap: 10, color: T.text,
                }}
              >
                <span style={{ color: series.accent, fontSize: 11, fontWeight: 800, width: 18 }}>{seriesGuideOpen ? '▼' : '▶'}</span>
                <span style={{ fontSize: 13, fontWeight: 700 }}>시리즈 안내 · {series.title}</span>
              </button>
              {seriesGuideOpen ? (
                <div style={{ padding: '12px 14px 16px', borderTop: `1px solid ${T.border}`, background: 'rgba(255,255,255,0.02)' }}>
                  <SettingsGuideVideoIframe accent={series.accent} videoUrl={series.settingsVideoUrl} />
                  <p style={{ margin: '10px 0 0', fontSize: 12, color: T.textDim, lineHeight: 1.7, letterSpacing: '0.02em' }}>
                    {series.settingsIntro}
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}

          <div style={{ marginBottom: 22, border: `1px solid ${T.border}`, borderRadius: 12, overflow: 'hidden' }}>
            <button
              type="button"
              onClick={() => setEngineGuideOpen((v) => !v)}
              style={{
                width: '100%', textAlign: 'left', padding: '12px 14px',
                background: T.card, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', gap: 10, color: T.text,
              }}
            >
              <span style={{ color: guideBlock?.accent ?? series.accent, fontSize: 11, fontWeight: 800, width: 18 }}>
                {engineGuideOpen ? '▼' : '▶'}
              </span>
              <span style={{ fontSize: 13, fontWeight: 700 }}>
                {series.code === RHYTHM_COORDINATION_SERIES_CODE ? (
                  <>
                    리듬 임베드 안내
                    <span style={{ fontWeight: 600, color: T.muted }}> · 공용 챌린지/플로우 (스테이지 자동 매핑 없음)</span>
                  </>
                ) : (
                  <>
                    엔진 · 난이도 안내
                    {guideBlock ? ` · ${guideBlock.title}` : modeDef ? ` · ${modeDef.title}` : ` · ${engine.mode}`}
                    {' '}
                    <span style={{ fontWeight: 600, color: T.muted }}>({engine.mode} · {engine.level}번)</span>
                  </>
                )}
              </span>
            </button>
            {engineGuideOpen ? (
              <div style={{ padding: '12px 14px 16px', borderTop: `1px solid ${T.border}`, background: 'rgba(255,255,255,0.02)' }}>
                {series.code === RHYTHM_COORDINATION_SERIES_CODE ? (
                  <>
                    <SettingsGuideVideoIframe accent={series.accent} videoUrl={engineGuideVideoUrl} />
                    <p style={{ margin: '10px 0 10px', fontSize: 11, color: T.muted, fontWeight: 700, letterSpacing: '0.12em' }}>
                      Rhythm Coordination · 임베드만 사용
                    </p>
                    <p style={{ margin: '0 0 10px', fontSize: 12, color: T.textDim, lineHeight: 1.7 }}>
                      카탈로그의 스테이지 이름(예: Slow Beat, Key Rhythm)은 <strong style={{ color: T.text }}>수업·로드맵용 라벨</strong>이며,
                      Memory Game 안의 난이도 번호나 단계별 가이드 문단과 <strong style={{ color: T.text }}>1:1로 연결되어 있지 않습니다</strong>.
                    </p>
                    <p style={{ margin: '0 0 10px', fontSize: 12, color: T.textDim, lineHeight: 1.7 }}>
                      훈련 시작 시에는 <strong style={{ color: T.text }}>챌린지·플로우 iframe</strong>이 열리고,
                      그 안의 BGM·템플릿·그리드는 <strong style={{ color: T.text }}>Challenge/Flow 쪽에 저장된 설정 한 벌</strong>을 공유합니다.
                      스테이지마다 다른 템플릿으로 자동 전환하는 매핑은 <strong style={{ color: T.text }}>아직 없습니다</strong>.
                    </p>
                    <p style={{ margin: 0, fontSize: 12, color: T.textDim, lineHeight: 1.7 }}>
                      이 화면의 자극 속도·횟수(또는 시간)는 SPOMOVE 반응 인지 계열과 동일한 UI이지만,
                      리듬 임베드 내부 페이스와 <strong style={{ color: T.text }}>항상 같이 움직이지 않을 수 있습니다</strong>.
                    </p>
                  </>
                ) : guideBlock ? (
                  <>
                    <SettingsGuideVideoIframe accent={guideBlock.accent ?? series.accent} videoUrl={engineGuideVideoUrl} />
                    <p style={{ margin: '10px 0 10px', fontSize: 11, color: T.muted, fontWeight: 700, letterSpacing: '0.12em' }}>{guideBlock.tag}</p>
                    <p style={{ margin: '0 0 14px', fontSize: 12, color: T.text, lineHeight: 1.65 }}>{guideBlock.intro}</p>
                    {guidePhase ? (
                      <div style={{ marginBottom: 14 }}>
                        <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 800, color: series.accent, letterSpacing: '0.08em' }}>
                          {guidePhase.num} {guidePhase.name}
                        </p>
                        <p style={{ margin: '0 0 6px', fontSize: 12, color: T.textDim, lineHeight: 1.6 }}><strong style={{ color: T.text }}>목표</strong> {guidePhase.goal}</p>
                        <p style={{ margin: '0 0 6px', fontSize: 12, color: T.textDim, lineHeight: 1.6 }}><strong style={{ color: T.text }}>화면</strong> {guidePhase.screen}</p>
                        <p style={{ margin: '0 0 6px', fontSize: 12, color: T.textDim, lineHeight: 1.6 }}><strong style={{ color: T.text }}>실행</strong> {guidePhase.action}</p>
                        <p style={{ margin: 0, fontSize: 12, color: T.textDim, lineHeight: 1.6 }}><strong style={{ color: T.text }}>코치</strong> {guidePhase.coach}</p>
                      </div>
                    ) : (
                      <p style={{ margin: '0 0 12px', fontSize: 12, color: T.muted }}>이 모드·번에 해당하는 단계별 상세 문단은 가이드에 없습니다. MODES 설명을 참고하세요.</p>
                    )}
                    {prepFiltered.length > 0 ? (
                      <div style={{ marginBottom: 0 }}>
                        <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 800, color: T.muted, letterSpacing: '0.1em' }}>{guideBlock.prep.title}</p>
                        <ul style={{ margin: 0, paddingLeft: 18, color: T.textDim, fontSize: 11, lineHeight: 1.65 }}>
                          {prepFiltered.map((item, idx) => (
                            <li key={idx} style={{ marginBottom: 6 }}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </>
                ) : (
                  <>
                    <SettingsGuideVideoIframe accent={series.accent} videoUrl={engineGuideVideoUrl} />
                    <p style={{ margin: '10px 0 0', fontSize: 12, color: T.textDim, lineHeight: 1.65 }}>
                      {modeDef?.desc ?? '가이드 블록이 없는 모드입니다.'}
                    </p>
                  </>
                )}
              </div>
            ) : null}
          </div>

          <div style={{ height: 1, background: T.border, marginBottom: 28 }} />

          {/* ── 자극 속도 ── */}
          <section style={{ marginBottom: 30 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
              <label style={{
                fontSize: 11, fontWeight: 800, color: T.muted,
                letterSpacing: '0.14em', textTransform: 'uppercase',
              }}>
                자극 속도
              </label>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <span style={{ fontSize: 22, fontWeight: 800, color: series.accent, fontVariantNumeric: 'tabular-nums' }}>
                  {speed.toFixed(1)}
                </span>
                <span style={{ fontSize: 11, color: T.muted, fontWeight: 600 }}>초 / 자극</span>
                <span style={{
                  marginLeft: 6,
                  padding: '2px 8px', borderRadius: 5,
                  background: `${series.accent}18`, border: `1px solid ${series.accent}30`,
                  fontSize: 10, fontWeight: 700, color: series.accent, letterSpacing: '0.06em',
                }}>
                  {speedLabel}
                </span>
              </div>
            </div>

            {/* 슬라이더 */}
            <div style={{ position: 'relative' }}>
              <style>{`
                .spmt-slider {
                  -webkit-appearance: none;
                  width: 100%;
                  height: 4px;
                  border-radius: 2px;
                  outline: none;
                  cursor: pointer;
                  background: linear-gradient(
                    to right,
                    ${series.accent} 0%,
                    ${series.accent} ${((speed - 1) / 7) * 100}%,
                    rgba(255,255,255,0.1) ${((speed - 1) / 7) * 100}%,
                    rgba(255,255,255,0.1) 100%
                  );
                }
                .spmt-slider::-webkit-slider-thumb {
                  -webkit-appearance: none;
                  width: 20px; height: 20px;
                  border-radius: 50%;
                  background: #fff;
                  box-shadow: 0 0 0 3px ${series.accent}60, 0 2px 8px rgba(0,0,0,0.5);
                  cursor: pointer;
                  transition: box-shadow 0.15s;
                }
                .spmt-slider::-webkit-slider-thumb:hover {
                  box-shadow: 0 0 0 5px ${series.accent}50, 0 2px 12px rgba(0,0,0,0.6);
                }
              `}</style>
              <input
                type="range"
                className="spmt-slider"
                min={1} max={8} step={0.5}
                value={speed}
                onChange={e => setSpeed(parseFloat(e.target.value))}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                <span style={{ fontSize: 10, color: T.muted, fontWeight: 600 }}>빠름</span>
                <span style={{ fontSize: 10, color: T.muted, fontWeight: 600 }}>느림</span>
              </div>
            </div>
          </section>

          {/* ── 횟수 (시지각 반응은 시간 모드일 때 초 선택) ── */}
          <section style={{ marginBottom: 36 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <label style={{
                fontSize: 11, fontWeight: 800, color: T.muted,
                letterSpacing: '0.14em', textTransform: 'uppercase',
              }}>
                횟수
              </label>

              {/* 시간 / 횟수 토글 — reactTrain만 표시 */}
              {isReactTrain && (
                <div style={{
                  display: 'flex', gap: 2,
                  background: 'rgba(255,255,255,0.05)', borderRadius: 8, padding: 3,
                }}>
                  {(['time', 'reps'] as const).map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setTimeMode(m)}
                      style={{
                        padding: '4px 12px', borderRadius: 6,
                        background: timeMode === m ? 'rgba(255,255,255,0.12)' : 'transparent',
                        border: 'none', color: timeMode === m ? T.text : T.muted,
                        fontFamily: 'inherit', fontSize: 11, fontWeight: 700,
                        cursor: 'pointer', letterSpacing: '0.06em',
                        transition: 'background 0.15s, color 0.15s',
                      }}
                    >
                      {m === 'time' ? '시간' : '횟수'}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {isReactTrain && timeMode === 'time' ? (
              <p style={{ fontSize: 10, color: T.muted, margin: '0 0 10px', letterSpacing: '0.02em' }}>
                아래는 진행 시간(초)입니다. 토글에서 「횟수」를 고르면 반복 회수를 고릅니다.
              </p>
            ) : null}

            {/* 횟수·시간 선택 pills */}
            {(isReactTrain ? timeMode === 'time' : false) ? (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {timePills.map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setDuration(s)}
                    style={{
                      flex: '1 1 auto', minWidth: 70,
                      padding: '11px 8px', borderRadius: 10,
                      border: `1.5px solid ${duration === s ? series.accent : T.border}`,
                      background: duration === s ? `${series.accent}16` : T.card,
                      color: duration === s ? series.accent : T.muted,
                      fontFamily: 'inherit', fontSize: 13, fontWeight: duration === s ? 800 : 500,
                      cursor: 'pointer', letterSpacing: '0.02em',
                      transition: 'border-color 0.15s, background 0.15s, color 0.15s',
                    }}
                  >
                    {s}초
                  </button>
                ))}
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {repsPills.map(r => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setTargetReps(r)}
                    style={{
                      flex: '1 1 auto', minWidth: 70,
                      padding: '11px 8px', borderRadius: 10,
                      border: `1.5px solid ${targetReps === r ? series.accent : T.border}`,
                      background: targetReps === r ? `${series.accent}16` : T.card,
                      color: targetReps === r ? series.accent : T.muted,
                      fontFamily: 'inherit', fontSize: 13, fontWeight: targetReps === r ? 800 : 500,
                      cursor: 'pointer', letterSpacing: '0.02em',
                      transition: 'border-color 0.15s, background 0.15s, color 0.15s',
                    }}
                  >
                    {r}회
                  </button>
                ))}
              </div>
            )}
          </section>

          {/* ── 시작 버튼 ── */}
          <button
            type="button"
            onClick={handleStart}
            style={{
              width: '100%', padding: '17px 24px',
              borderRadius: 14, border: 'none',
              background: series.accent,
              color: '#000',
              fontFamily: 'inherit', fontSize: 15, fontWeight: 900,
              cursor: 'pointer', letterSpacing: '0.08em',
              boxShadow: `0 4px 24px ${series.accent}50`,
              transition: 'opacity 0.15s, transform 0.12s, box-shadow 0.15s',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.opacity = '0.88';
              (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.opacity = '1';
              (e.currentTarget as HTMLButtonElement).style.transform = 'none';
            }}
            onMouseDown={e => {
              (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0px) scale(0.98)';
            }}
            onMouseUp={e => {
              (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)';
            }}
          >
            훈련 시작 ▶
          </button>

        </div>
      </div>
    </div>
  );
}

/* ─── SeriesBadge ─── */
function SeriesBadge({ code, accent }: { code: string; accent: string }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: 40, height: 40, borderRadius: 10,
      background: `${accent}18`, border: `1px solid ${accent}40`,
      color: accent, fontWeight: 800, fontSize: 11, letterSpacing: '0.08em',
      flexShrink: 0,
    }}>
      {code}
    </span>
  );
}

/* ─── StageChip ─── */
function StageChip({
  stage, label, engine, settingsVideoUrl, accent,
  onSelect,
}: Core5Stage & { accent: string; onSelect: (s: Core5Stage) => void }) {
  const ready = engine !== null;
  return (
    <button
      type="button"
      disabled={!ready}
      onClick={() => {
        if (!ready) return;
        onSelect({ stage, label, engine, settingsVideoUrl });
      }}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 14px', borderRadius: 10,
        background: T.card, border: `1px solid ${T.border}`,
        cursor: ready ? 'pointer' : 'default',
        opacity: ready ? 1 : 0.4,
        transition: 'border-color 0.15s, background 0.15s',
        fontFamily: 'inherit',
      }}
      onMouseEnter={e => {
        if (!ready) return;
        (e.currentTarget as HTMLButtonElement).style.borderColor = `${accent}60`;
        (e.currentTarget as HTMLButtonElement).style.background  = `${accent}0a`;
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLButtonElement).style.borderColor = T.border;
        (e.currentTarget as HTMLButtonElement).style.background  = T.card;
      }}
    >
      <span style={{
        width: 22, height: 22, borderRadius: 6, flexShrink: 0,
        background: ready ? `${accent}22` : 'rgba(255,255,255,0.06)',
        border: `1px solid ${ready ? `${accent}40` : T.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'var(--font-mono, monospace)', fontSize: 10, fontWeight: 700,
        color: ready ? accent : T.muted,
      }}>
        {stage}
      </span>
      <span style={{
        fontSize: 13, color: T.text, fontWeight: 500,
        flex: 1, lineHeight: 1.35, textAlign: 'left',
      }}>
        {label}
      </span>
      {ready ? (
        <span style={{ fontSize: 11, color: accent, opacity: 0.7, letterSpacing: '0.06em', fontWeight: 600 }}>▶</span>
      ) : (
        <span style={{ fontSize: 10, color: T.muted, letterSpacing: '0.08em' }}>준비 중</span>
      )}
    </button>
  );
}

/* ─── ProgramCard ─── */
function ProgramCard({
  program, accent, series,
  onSelect,
}: {
  program: Core5Program;
  accent: string;
  series: Core5Series;
  onSelect: (stage: Core5Stage, program: Core5Program, series: Core5Series) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{
      border: `1px solid ${T.border}`, borderRadius: 14, overflow: 'hidden',
      background: T.surface, transition: 'border-color 0.15s',
    }}
      onMouseEnter={e => ((e.currentTarget as HTMLElement).style.borderColor = T.borderHover)}
      onMouseLeave={e => ((e.currentTarget as HTMLElement).style.borderColor = T.border)}
    >
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 14,
          padding: '16px 18px', background: 'transparent', border: 0,
          cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
        }}
      >
        <span style={{
          width: 34, height: 34, borderRadius: 9, flexShrink: 0,
          background: `${accent}14`, border: `1px solid ${accent}30`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 10, fontWeight: 800, color: accent, letterSpacing: '0.05em',
        }}>
          {program.programId.split('-')[1]}
        </span>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 12, color: T.muted, letterSpacing: '0.1em', marginBottom: 2, fontWeight: 600 }}>
            {program.programId}
          </p>
          <p style={{ fontSize: 14, fontWeight: 700, color: T.text, margin: 0, lineHeight: 1.3 }}>
            {program.title}
          </p>
        </div>
        <span style={{
          width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: T.muted, fontSize: 12, transition: 'transform 0.2s',
          transform: open ? 'rotate(180deg)' : 'none',
        }}>▾</span>
      </button>

      {open && (
        <div style={{ padding: '0 14px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {program.stages.map(s => (
            <StageChip
              key={s.stage}
              {...s}
              accent={accent}
              onSelect={stage => onSelect(stage, program, series)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── SeriesPanel ─── */
function SeriesPanel({
  series,
  onSelect,
}: {
  series: Core5Series;
  onSelect: (stage: Core5Stage, program: Core5Program, series: Core5Series) => void;
}) {
  return (
    <section>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <SeriesBadge code={series.code} accent={series.accent} />
        <div>
          <p style={{ fontSize: 11, letterSpacing: '0.14em', color: T.muted, fontWeight: 700, marginBottom: 1 }}>
            {series.code}
          </p>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: T.text, margin: 0, letterSpacing: '-0.01em' }}>
            {series.title}
          </h2>
          <p style={{ fontSize: 12, color: T.textDim, margin: 0 }}>{series.subtitle}</p>
        </div>
        <span style={{
          marginLeft: 'auto', padding: '3px 10px', borderRadius: 100,
          background: `${series.accent}14`, border: `1px solid ${series.accent}30`,
          fontSize: 11, fontWeight: 700, color: series.accent, letterSpacing: '0.06em',
        }}>
          {series.programs.length} PROGRAMS
        </span>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: 10,
      }}>
        {series.programs.map(p => (
          <ProgramCard
            key={p.programId}
            program={p}
            accent={series.accent}
            series={series}
            onSelect={onSelect}
          />
        ))}
      </div>
    </section>
  );
}

/* ─── Series tab bar ─── */
const TABS: { code: SeriesCode | 'ALL'; label: string }[] = [
  { code: 'ALL', label: 'All'          },
  { code: 'SR',  label: 'Spatial'      },
  { code: 'IC',  label: 'Interference' },
  { code: 'RS',  label: 'Rule'         },
  { code: 'SM',  label: 'Memory'       },
  { code: 'RC',  label: 'Rhythm'       },
];

/* ══ Page ══ */
export default function SpomoveTrainingPage() {
  const [activeTab, setActiveTab] = useState<SeriesCode | 'ALL'>('ALL');
  const [phase, setPhase] = useState<PagePhase>({ tag: 'catalog' });

  const visibleSeries = useMemo(
    () => (activeTab === 'ALL' ? catalog : catalog.filter(s => s.code === activeTab)),
    [activeTab],
  );

  const totalPrograms = catalog.reduce((s, c) => s + c.programs.length, 0);
  const totalStages   = catalog.reduce(
    (s, c) => s + c.programs.reduce((a, p) => a + p.stages.length, 0), 0,
  );

  const handleSelect = useCallback(
    (stage: Core5Stage, program: Core5Program, series: Core5Series) => {
      setPhase({ tag: 'settings', stage, program, series });
    },
    [],
  );

  const handleStart = useCallback((launch: LaunchSettings) => {
    setPhase(prev => {
      if (prev.tag !== 'settings' || !prev.stage.engine) return prev;
      return { tag: 'training', engine: prev.stage.engine, launch };
    });
  }, []);

  /* ── 설정 패널 ── */
  if (phase.tag === 'settings') {
    return (
      <SettingsPanel
        stage={phase.stage}
        program={phase.program}
        series={phase.series}
        onStart={handleStart}
        onBack={() => setPhase({ tag: 'catalog' })}
      />
    );
  }

  /* ── 훈련 포털 (카탈로그 위에 오버레이) ── */
  return (
    <>
      {phase.tag === 'training' && (
        <TrainingPortal
          engine={phase.engine}
          launch={phase.launch}
          onClose={() => setPhase({ tag: 'catalog' })}
        />
      )}

      {/* ── 카탈로그 뷰 ── */}
      <div style={{ background: T.bg, minHeight: '100vh', paddingBottom: 80 }}>
        <style>{`
          @media (prefers-reduced-motion: reduce) {
            *, *::before, *::after { transition: none !important; }
          }
          .spmt-tab:hover { background: rgba(255,255,255,0.06) !important; }
        `}</style>

        {/* header */}
        <header style={{
          borderBottom: `1px solid ${T.border}`, padding: '24px 32px 20px',
          position: 'sticky', top: 0, background: T.bg, zIndex: 20,
          backdropFilter: 'blur(20px)',
        }}>
          <div style={{ maxWidth: 960, margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 24, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <p style={{ fontSize: 10, letterSpacing: '0.2em', color: T.muted, fontWeight: 700, marginBottom: 4 }}>
                  SPOMOVE
                </p>
                <h1 style={{
                  fontSize: 'clamp(22px, 3vw, 30px)', fontWeight: 900, color: T.text,
                  margin: 0, letterSpacing: '-0.025em', lineHeight: 1,
                }}>
                  Training
                </h1>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                {([
                  { n: '5',                   label: 'SERIES'   },
                  { n: String(totalPrograms), label: 'PROGRAMS' },
                  { n: String(totalStages),   label: 'STAGES'   },
                ] as const).map(({ n, label }) => (
                  <div key={label} style={{
                    padding: '5px 12px', borderRadius: 100,
                    background: 'rgba(255,255,255,0.05)', border: `1px solid ${T.border}`,
                    display: 'flex', alignItems: 'baseline', gap: 6,
                  }}>
                    <span style={{ fontSize: 16, fontWeight: 800, color: T.text }}>{n}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: T.muted, letterSpacing: '0.12em' }}>{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* tabs */}
            <nav style={{ display: 'flex', gap: 4, marginTop: 18, overflowX: 'auto' }}>
              {TABS.map(tab => {
                const series   = tab.code !== 'ALL' ? catalog.find(s => s.code === tab.code) : null;
                const accent   = series?.accent ?? 'rgba(255,255,255,0.6)';
                const isActive = activeTab === tab.code;
                return (
                  <button
                    key={tab.code}
                    type="button"
                    className="spmt-tab"
                    onClick={() => setActiveTab(tab.code)}
                    style={{
                      padding: '7px 16px', borderRadius: 9, border: 'none',
                      background: isActive
                        ? (series ? `${accent}20` : 'rgba(255,255,255,0.1)')
                        : 'transparent',
                      color: isActive ? (series ? accent : T.text) : T.muted,
                      fontWeight: isActive ? 700 : 500, fontSize: 13,
                      cursor: 'pointer', whiteSpace: 'nowrap', letterSpacing: '0.01em',
                      outline: isActive
                        ? `1.5px solid ${series ? `${accent}50` : 'rgba(255,255,255,0.2)'}`
                        : 'none',
                      outlineOffset: 0,
                      transition: 'background 0.15s, color 0.15s',
                      fontFamily: 'inherit',
                    }}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>
        </header>

        {/* catalog */}
        <main style={{ maxWidth: 960, margin: '0 auto', padding: '36px 32px 0' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 48 }}>
            {visibleSeries.map(series => (
              <SeriesPanel key={series.code} series={series} onSelect={handleSelect} />
            ))}
          </div>
        </main>
      </div>
    </>
  );
}
