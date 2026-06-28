'use client';

/**
 * [LAB] DIVE Flow Lab — 실험 전용 페이지
 *
 * URL: /admin/spomove/training/flow-lab
 * 운영 DIVE(/admin/spomove/training), EngineRouter, officialSpomovePresets와 무관한 독립 경로.
 * Supabase 데이터 수정 없음. 훈련 기록 생성 없음. 운영 localStorage 미사용.
 */

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Suspense, useCallback, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { buildStages } from '../_player/flow-lab/engine/modules/stageBuilder';
import type { FlowModuleKey } from '../_player/flow-lab/engine/modules/flowModules';
import type { FlowStats, VisualMode } from '../_player/flow-lab/engine/FlowEngine';
import { useSpomoveDiveEnvironments } from '@/app/lib/admin/hooks/useSpomoveDiveEnvironments';

/* ─── flow-lab FlowGameClient: SSR 비활성 ─── */
const FlowGameClientLab = dynamic(
  () => import('../_player/flow-lab/FlowGameClient'),
  {
    ssr: false,
    loading: () => (
      <div style={{
        position: 'fixed', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#020617', color: 'rgba(255,255,255,0.35)',
        fontFamily: 'sans-serif', fontSize: 12, letterSpacing: '0.14em', fontWeight: 600,
      }}>
        로딩 중…
      </div>
    ),
  },
);

/* ─── 디자인 토큰 (운영 training/page.tsx 와 동일) ─── */
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

const LAB_ACCENT    = '#8B5CF6';
const FEAT_ACCENT   = '#22C55E';
const DUR_ACCENT    = '#3B82F6';
const THEME_ACCENT  = '#8B5CF6';

/* ─── 화이트리스트 ─── */
const VALID_FEATURES: FlowModuleKey[] = ['punch', 'duck', 'reach'];
const VALID_THEMES   = ['default', 'space', 'neon', 'ocean'] as const;
type ValidTheme = typeof VALID_THEMES[number];

function parseFeaturesParam(raw: string | null): FlowModuleKey[] {
  if (!raw) return ['punch'];
  const parts = raw.split(',').map((s) => s.trim()) as FlowModuleKey[];
  const valid = parts.filter((k) => VALID_FEATURES.includes(k));
  return valid.length > 0 ? valid : ['punch'];
}
function parseDurationParam(raw: string | null): number {
  const n = Number(raw);
  if (!raw || isNaN(n) || n < 5 || n > 180) return 25;
  return Math.floor(n);
}
function parseThemeParam(raw: string | null): ValidTheme {
  return VALID_THEMES.includes(raw as ValidTheme) ? (raw as ValidTheme) : 'space';
}
function parseMotionScaleParam(raw: string | null): number {
  const n = Number(raw);
  return n === 0.5 || n === 1 ? n : 1;
}
function parseVisualParam(raw: string | null): VisualMode {
  return raw === 'legacy' ? 'legacy' : 'enhanced';
}

/* ─── 설정 타입 ─── */
interface LabSettings {
  features:    FlowModuleKey[];
  duration:    number;
  theme:       ValidTheme;
  motionScale: number;
  visual:      VisualMode;
}

/* ─── 완료 화면 ─── */
function LabCompleteScreen({
  stats,
  settings,
  onRestart,
}: {
  stats:     FlowStats;
  settings:  LabSettings;
  onRestart: () => void;
}) {
  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: T.bg,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: 20, fontFamily: 'inherit',
    }}>
      <span style={{
        padding: '3px 10px', borderRadius: 8,
        background: `${LAB_ACCENT}18`, border: `1px solid ${LAB_ACCENT}40`,
        color: LAB_ACCENT, fontSize: 10, fontWeight: 800, letterSpacing: '0.14em',
      }}>
        LAB · 개발 전용
      </span>

      <div style={{ textAlign: 'center' }}>
        <p style={{ margin: '0 0 4px', fontSize: 10, fontWeight: 800, color: T.muted, letterSpacing: '0.22em' }}>
          DIVE FLOW LAB
        </p>
        <h1 style={{ margin: 0, fontSize: 32, fontWeight: 950, color: T.text, letterSpacing: '-0.04em' }}>
          세션 완료
        </h1>
      </div>

      <div style={{
        padding: '16px 24px', borderRadius: 14,
        border: `1px solid ${T.border}`, background: T.card,
        display: 'flex', gap: 32, textAlign: 'center',
      }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 900, color: LAB_ACCENT }}>{stats.stagesCompleted}</div>
          <div style={{ fontSize: 10, color: T.muted, fontWeight: 700, marginTop: 2 }}>완료 스테이지</div>
        </div>
        <div>
          <div style={{ fontSize: 22, fontWeight: 900, color: DUR_ACCENT }}>{Math.round(stats.totalSec)}초</div>
          <div style={{ fontSize: 10, color: T.muted, fontWeight: 700, marginTop: 2 }}>총 시간</div>
        </div>
        <div>
          <div style={{ fontSize: 22, fontWeight: 900, color: T.text }}>{settings.features.join(', ') || '—'}</div>
          <div style={{ fontSize: 10, color: T.muted, fontWeight: 700, marginTop: 2 }}>사용 모듈</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
        <button
          type="button"
          onClick={onRestart}
          style={{
            padding: '13px 28px', borderRadius: 12,
            border: 'none', background: LAB_ACCENT, color: '#fff',
            fontFamily: 'inherit', fontSize: 14, fontWeight: 900, cursor: 'pointer',
            letterSpacing: '0.04em',
          }}
        >
          다시 시작
        </button>
        <Link
          href="/admin/spomove/training"
          style={{
            padding: '13px 28px', borderRadius: 12,
            border: `1px solid ${T.border}`, background: T.card, color: T.muted,
            fontFamily: 'inherit', fontSize: 14, fontWeight: 700, cursor: 'pointer',
            textDecoration: 'none', display: 'inline-flex', alignItems: 'center',
          }}
        >
          ← 관리자
        </Link>
      </div>
    </div>
  );
}

/* ─── 설정 화면 ─── */
function LabSettingsScreen({
  initial,
  onStart,
}: {
  initial:  LabSettings;
  onStart:  (s: LabSettings) => void;
}) {
  const [s, setS] = useState<LabSettings>(initial);

  const toggleFeature = (k: FlowModuleKey) =>
    setS((prev) => ({
      ...prev,
      features: prev.features.includes(k)
        ? prev.features.filter((f) => f !== k)
        : [...prev.features, k],
    }));

  const FEATURES: { key: FlowModuleKey; icon: string; label: string; desc: string }[] = [
    { key: 'punch', icon: '👊', label: '박스 펀치 (PUNCH)',    desc: '다리 위에 박스가 등장합니다. 주먹으로 파괴하세요.' },
    { key: 'duck',  icon: '🛸', label: 'UFO 숙이기 (DUCK)',    desc: '저공 UFO가 나타납니다. 빠르게 몸을 낮춰 피하세요.' },
    { key: 'reach', icon: '🧱', label: '펀치 벽 두드리기',       desc: '브릿지를 막는 벽이 등장합니다. 5번 두드려 부수세요.' },
  ];

  const THEMES: { key: ValidTheme; label: string; desc: string }[] = [
    { key: 'default', label: '기본',     desc: '검정 · 노랑/초록/빨강' },
    { key: 'space',   label: '우주',     desc: '다크 퍼플 · 보라/파랑' },
    { key: 'neon',    label: '네온',     desc: '다크 틸 · 청록/빨강' },
    { key: 'ocean',   label: '🌊 바다', desc: '딥 네이비 · 하늘/청록' },
  ];

  return (
    <div style={{ background: T.bg, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* 헤더 */}
      <header style={{
        height: 52, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12,
        padding: '0 24px', borderBottom: `1px solid ${T.border}`, background: T.bg,
      }}>
        <Link
          href="/admin/spomove/training"
          style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 8,
            border: `1px solid ${T.border}`, background: 'transparent', color: T.muted,
            fontFamily: 'inherit', fontSize: 12, fontWeight: 700, cursor: 'pointer',
            letterSpacing: '0.06em', textDecoration: 'none',
          }}
        >
          ← 목록
        </Link>
        <span style={{ fontSize: 12, color: T.text, fontWeight: 800 }}>
          DIVE Flow Lab
        </span>
        <span style={{
          marginLeft: 'auto', padding: '2px 8px', borderRadius: 6,
          background: `${LAB_ACCENT}18`, border: `1px solid ${LAB_ACCENT}40`,
          color: LAB_ACCENT, fontSize: 10, fontWeight: 800, letterSpacing: '0.12em',
        }}>
          LAB · 개발 전용
        </span>
      </header>

      {/* 본문 */}
      <div style={{ flex: 1, padding: '42px 24px 80px', display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: '100%', maxWidth: 520 }}>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: T.text, letterSpacing: '-0.02em' }}>
            DIVE 설정
          </h1>
          <p style={{ margin: '10px 0 0', fontSize: 12, color: T.textDim, lineHeight: 1.65 }}>
            실험용 DIVE Flow Lab입니다. 운영 세션·기록과 무관하게 독립 실행됩니다.
          </p>

          <div style={{ height: 1, background: T.border, margin: '24px 0' }} />

          {/* 추가 동작 */}
          <section style={{ marginBottom: 26 }}>
            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 11, fontWeight: 800, color: T.muted, letterSpacing: '0.14em' }}>추가 동작 선택</label>
              <p style={{ margin: '4px 0 0', fontSize: 11, color: T.textDim, lineHeight: 1.5 }}>
                선택한 동작이 스테이지별로 순차 추가됩니다. 복수 선택 가능합니다.
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {FEATURES.map(({ key, icon, label, desc }) => {
                const active = s.features.includes(key);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggleFeature(key)}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: 10,
                      padding: '10px 12px', borderRadius: 12,
                      border: `1.5px solid ${active ? FEAT_ACCENT : T.border}`,
                      background: active ? 'rgba(34,197,94,0.10)' : T.card,
                      cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                      transition: 'border-color 0.13s, background 0.13s',
                    }}
                  >
                    <span style={{ fontSize: '1.15rem', lineHeight: 1, marginTop: 2 }}>{icon}</span>
                    <div>
                      <div style={{ fontWeight: 900, fontSize: 13, color: active ? '#16A34A' : T.text, marginBottom: 2 }}>
                        {active ? '✓ ' : ''}{label}
                      </div>
                      <div style={{ fontSize: 11, color: T.muted, lineHeight: 1.45 }}>{desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* 스테이지당 시간 */}
          <section style={{ marginBottom: 26 }}>
            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 11, fontWeight: 800, color: T.muted, letterSpacing: '0.14em' }}>스테이지당 시간</label>
              <p style={{ margin: '3px 0 0', fontSize: 10, color: T.textDim }}>스테이지 한 구간을 달리는 시간입니다.</p>
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {[15, 20, 25, 30, 45, 60].map((sec) => {
                const active = s.duration === sec;
                return (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => setS((p) => ({ ...p, duration: sec }))}
                    style={{
                      flex: '1 1 60px', padding: '9px 6px', borderRadius: 12,
                      border: `1.5px solid ${active ? DUR_ACCENT : T.border}`,
                      background: active ? 'rgba(59,130,246,0.14)' : T.card,
                      color: active ? DUR_ACCENT : T.textDim,
                      fontFamily: 'inherit', fontSize: 13, fontWeight: active ? 900 : 700,
                      cursor: 'pointer', textAlign: 'center',
                      transition: 'border-color 0.13s, background 0.13s',
                    }}
                  >
                    {sec}초
                  </button>
                );
              })}
            </div>
          </section>

          {/* 배경 테마 */}
          <section style={{ marginBottom: 26 }}>
            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 11, fontWeight: 800, color: T.muted, letterSpacing: '0.14em' }}>배경 테마</label>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {THEMES.map(({ key, label, desc }) => {
                const active = s.theme === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setS((p) => ({ ...p, theme: key }))}
                    style={{
                      flex: 1, padding: '10px 6px', borderRadius: 12,
                      border: `1.5px solid ${active ? THEME_ACCENT : T.border}`,
                      background: active ? `${THEME_ACCENT}16` : T.card,
                      cursor: 'pointer', fontFamily: 'inherit', textAlign: 'center',
                      transition: 'border-color 0.13s, background 0.13s',
                    }}
                  >
                    <div style={{ fontWeight: 900, fontSize: 13, color: active ? THEME_ACCENT : T.text }}>
                      {active ? '✓ ' : ''}{label}
                    </div>
                    <div style={{ fontSize: 10, color: T.muted, marginTop: 3, lineHeight: 1.4 }}>{desc}</div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* 환경 표현 (SPACE 테마에서만 차이 있음) */}
          <section style={{ marginBottom: 26 }}>
            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 11, fontWeight: 800, color: T.muted, letterSpacing: '0.14em' }}>환경 표현</label>
              <p style={{ margin: '3px 0 0', fontSize: 10, color: T.textDim }}>
                개선 환경은 SPACE 테마에서 파노라마 배경 구를 사용합니다.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['legacy', 'enhanced'] as const).map((v) => {
                const active = s.visual === v;
                return (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setS((p) => ({ ...p, visual: v }))}
                    style={{
                      flex: 1, padding: '11px 8px', borderRadius: 12,
                      border: `1.5px solid ${active ? LAB_ACCENT : T.border}`,
                      background: active ? `${LAB_ACCENT}16` : T.card,
                      color: active ? LAB_ACCENT : T.textDim,
                      fontFamily: 'inherit', fontSize: 13, fontWeight: active ? 900 : 700,
                      cursor: 'pointer', textAlign: 'center',
                      transition: 'border-color 0.13s, background 0.13s',
                    }}
                  >
                    {v === 'legacy' ? '기존 환경' : '개선 환경'}
                  </button>
                );
              })}
            </div>
          </section>

          {/* 동작 스케일 */}
          <section style={{ marginBottom: 32 }}>
            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 11, fontWeight: 800, color: T.muted, letterSpacing: '0.14em' }}>동작 스케일</label>
              <p style={{ margin: '3px 0 0', fontSize: 11, color: T.textDim }}>
                0.5 = 키즈·입문 (체감 속도 절반), 1.0 = 표준
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {([0.5, 1] as const).map((v) => {
                const active = s.motionScale === v;
                return (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setS((p) => ({ ...p, motionScale: v }))}
                    style={{
                      flex: 1, padding: '11px 8px', borderRadius: 12,
                      border: `1.5px solid ${active ? LAB_ACCENT : T.border}`,
                      background: active ? `${LAB_ACCENT}16` : T.card,
                      color: active ? LAB_ACCENT : T.textDim,
                      fontFamily: 'inherit', fontSize: 14, fontWeight: active ? 900 : 700,
                      cursor: 'pointer', textAlign: 'center',
                      transition: 'border-color 0.13s, background 0.13s',
                    }}
                  >
                    {v === 0.5 ? '0.5× (입문)' : '1.0× (표준)'}
                  </button>
                );
              })}
            </div>
          </section>

          {/* 시작 버튼 */}
          <button
            type="button"
            onClick={() => onStart(s)}
            style={{
              width: '100%', padding: '17px 24px', borderRadius: 14,
              border: 'none', background: LAB_ACCENT, color: '#fff',
              fontFamily: 'inherit', fontSize: 15, fontWeight: 900,
              cursor: 'pointer', letterSpacing: '0.08em',
              boxShadow: `0 4px 24px ${LAB_ACCENT}50`,
              transition: 'opacity 0.15s, transform 0.12s',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.opacity = '0.88';
              (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.opacity = '1';
              (e.currentTarget as HTMLButtonElement).style.transform = 'none';
            }}
          >
            DIVE Lab 시작 ▶
          </button>

          <p style={{ margin: '14px 0 0', fontSize: 10, color: T.muted, textAlign: 'center', lineHeight: 1.6 }}>
            운영 DIVE와 독립된 실험 환경입니다. 세션 기록·공식 프리셋에 저장되지 않습니다.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ─── 실행 화면 ─── */
function LabRunScreen({
  settings,
  runKey,
  panoramaHighUrl,
  panoramaLowUrl,
  panoramaYawDeg,
  onComplete,
  onExit,
}: {
  settings:          LabSettings;
  runKey:            number;
  panoramaHighUrl?:  string;
  panoramaLowUrl?:   string;
  panoramaYawDeg?:   number;
  onComplete:        (stats: FlowStats) => void;
  onExit:            () => void;
}) {
  const stages = buildStages(settings.features, settings.duration);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: '#000' }}>
      <FlowGameClientLab
        key={runKey}
        stages={stages}
        colorTheme={settings.theme}
        motionScale={settings.motionScale}
        visualMode={settings.visual}
        panoramaHighUrl={panoramaHighUrl}
        panoramaLowUrl={panoramaLowUrl}
        panoramaYawDeg={panoramaYawDeg}
        onComplete={onComplete}
        onExit={onExit}
      />
    </div>
  );
}

/* ─── 페이지 상태 ─── */
type LabPhase =
  | { tag: 'settings' }
  | { tag: 'running'; settings: LabSettings; runKey: number }
  | { tag: 'complete'; stats: FlowStats; settings: LabSettings };

function FlowLabContent() {
  const params = useSearchParams();

  const initialSettings: LabSettings = {
    features:    parseFeaturesParam(params.get('features')),
    duration:    parseDurationParam(params.get('duration')),
    theme:       parseThemeParam(params.get('theme')),
    motionScale: parseMotionScaleParam(params.get('motionScale')),
    visual:      parseVisualParam(params.get('visual')),
  };

  // DIVE 파노라마 URL (SPACE 테마 개선 환경용)
  const { data: diveData, getPreviewUrl: getDivePreviewUrl } = useSpomoveDiveEnvironments();
  const spaceEntry      = diveData.themes.space ?? null;
  // Asset Hub에 파노라마가 없을 때 사용할 정적 폴백 (public/spomove/dive/environments/space/panorama.webp)
  const STATIC_PANORAMA = '/spomove/dive/environments/space/panorama.webp';
  // hasHighRes=true일 때만 고해상도 URL 사용 (그 외엔 low URL로 fallback)
  const panoramaHighUrl = (spaceEntry?.hasHighRes === true)
    ? (getDivePreviewUrl(spaceEntry.panoramaPath) ?? undefined)
    : undefined;
  const panoramaLowUrl  = spaceEntry
    ? (getDivePreviewUrl(spaceEntry.panoramaLowPath) ?? STATIC_PANORAMA)
    : STATIC_PANORAMA;
  const panoramaYawDeg  = spaceEntry?.yawDeg ?? 0;

  const runKeyRef = useRef(0);
  const [phase, setPhase] = useState<LabPhase>({ tag: 'settings' });

  const handleStart = useCallback((s: LabSettings) => {
    runKeyRef.current += 1;
    setPhase({ tag: 'running', settings: s, runKey: runKeyRef.current });
  }, []);

  const handleComplete = useCallback((stats: FlowStats) => {
    setPhase((prev) => {
      if (prev.tag !== 'running') return prev;
      return { tag: 'complete', stats, settings: prev.settings };
    });
  }, []);

  const handleExit = useCallback(() => {
    setPhase({ tag: 'settings' });
  }, []);

  const handleRestart = useCallback(() => {
    setPhase((prev) => {
      if (prev.tag !== 'complete') return prev;
      runKeyRef.current += 1;
      return { tag: 'running', settings: prev.settings, runKey: runKeyRef.current };
    });
  }, []);

  if (phase.tag === 'running') {
    return (
      <LabRunScreen
        settings={phase.settings}
        runKey={phase.runKey}
        panoramaHighUrl={panoramaHighUrl}
        panoramaLowUrl={panoramaLowUrl}
        panoramaYawDeg={panoramaYawDeg}
        onComplete={handleComplete}
        onExit={handleExit}
      />
    );
  }

  if (phase.tag === 'complete') {
    return (
      <LabCompleteScreen
        stats={phase.stats}
        settings={phase.settings}
        onRestart={handleRestart}
      />
    );
  }

  return <LabSettingsScreen initial={initialSettings} onStart={handleStart} />;
}

export default function FlowLabPage() {
  return (
    <Suspense
      fallback={
        <div style={{
          minHeight: '100vh', background: '#0a0a0a',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'rgba(255,255,255,0.32)', fontFamily: 'sans-serif',
          fontSize: 12, letterSpacing: '0.14em', fontWeight: 600,
        }}>
          로딩 중…
        </div>
      }
    >
      <FlowLabContent />
    </Suspense>
  );
}
