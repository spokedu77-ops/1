'use client';

/**
 * [LAB] flow-lab 전용 테스트 페이지
 *
 * URL: /admin/spomove/training/flow-lab
 * - flow-lab 복제본만 사용 (운영 flow/ 미사용)
 * - EngineRouter·officialSpomovePresets·운영 메뉴에 연결 안 됨
 * - Supabase 데이터 수정 없음, 훈련 기록 생성 없음
 * - 개발 테스트 전용 숨겨진 경로
 */

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useState } from 'react';
import FlowGameClient from '../_player/flow-lab/FlowGameClient';
import { buildStages } from '../_player/flow-lab/engine/modules/stageBuilder';
import type { FlowModuleKey } from '../_player/flow-lab/engine/modules/flowModules';
import type { FlowStats } from '../_player/flow-lab/engine/FlowEngine';

// ── 화이트리스트 검증 ────────────────────────────────────────────────────────

const VALID_FEATURES: FlowModuleKey[] = ['punch', 'duck', 'reach'];
const VALID_THEMES = ['default', 'space', 'neon', 'ocean'] as const;
const VALID_MOTION_SCALES = [0.5, 1] as const;

type ValidTheme = typeof VALID_THEMES[number];

function parseFeatures(raw: string | null): FlowModuleKey[] {
  if (!raw) return ['punch'];
  const parts = raw.split(',').map((s) => s.trim()) as FlowModuleKey[];
  const valid = parts.filter((k) => VALID_FEATURES.includes(k));
  return valid.length > 0 ? valid : ['punch'];
}

function parseDuration(raw: string | null): number {
  const n = Number(raw);
  if (!raw || isNaN(n) || n < 5 || n > 180) return 25;
  return Math.floor(n);
}

function parseTheme(raw: string | null): ValidTheme {
  if (VALID_THEMES.includes(raw as ValidTheme)) return raw as ValidTheme;
  return 'space';
}

function parseMotionScale(raw: string | null): number {
  const n = Number(raw);
  if (VALID_MOTION_SCALES.includes(n as typeof VALID_MOTION_SCALES[number])) return n;
  return 1;
}

// ── 완료 화면 ────────────────────────────────────────────────────────────────

function LabCompleteScreen({
  stats,
  onRestart,
  onExit,
}: {
  stats: FlowStats;
  onRestart: () => void;
  onExit: () => void;
}) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: '#000',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1.5rem',
        color: '#fff',
        fontFamily: 'sans-serif',
      }}
    >
      <div
        style={{
          padding: '0.4rem 1rem',
          borderRadius: '0.5rem',
          background: 'rgba(251,191,36,0.15)',
          border: '1px solid rgba(251,191,36,0.6)',
          color: '#fbbf24',
          fontSize: '0.75rem',
          fontWeight: 700,
          letterSpacing: '0.1em',
        }}
      >
        [LAB] 개발 테스트 전용
      </div>

      <h1 style={{ fontSize: '2rem', fontWeight: 800 }}>완료</h1>

      <div style={{ color: '#9ca3af', fontSize: '0.9rem', textAlign: 'center' }}>
        <div>완료 스테이지: {stats.stagesCompleted}</div>
        <div>총 시간: {Math.round(stats.totalSec)}초</div>
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
        <button
          type="button"
          onClick={onRestart}
          style={{
            padding: '0.6rem 1.5rem',
            borderRadius: '0.5rem',
            background: '#3b82f6',
            color: '#fff',
            border: 'none',
            cursor: 'pointer',
            fontWeight: 700,
          }}
        >
          다시 시작
        </button>
        <button
          type="button"
          onClick={onExit}
          style={{
            padding: '0.6rem 1.5rem',
            borderRadius: '0.5rem',
            background: '#374151',
            color: '#d1d5db',
            border: 'none',
            cursor: 'pointer',
            fontWeight: 700,
          }}
        >
          관리자 화면으로
        </button>
      </div>
    </div>
  );
}

// ── 메인 ─────────────────────────────────────────────────────────────────────

function FlowLabContent() {
  const router = useRouter();
  const params = useSearchParams();

  const features   = parseFeatures(params.get('features'));
  const duration   = parseDuration(params.get('duration'));
  const theme      = parseTheme(params.get('theme'));
  const motionScale = parseMotionScale(params.get('motionScale'));

  const stages = buildStages(features, duration);

  const [completedStats, setCompletedStats] = useState<FlowStats | null>(null);
  const [runKey, setRunKey] = useState(0);

  const handleExit = useCallback(() => {
    router.push('/admin/spomove/training');
  }, [router]);

  const handleComplete = useCallback((s: FlowStats) => {
    setCompletedStats(s);
  }, []);

  const handleRestart = useCallback(() => {
    setCompletedStats(null);
    setRunKey((k) => k + 1);
  }, []);

  if (completedStats) {
    return (
      <LabCompleteScreen
        stats={completedStats}
        onRestart={handleRestart}
        onExit={handleExit}
      />
    );
  }

  return (
    <>
      {/* LAB 배지 — 게임 시작 전 잠깐 보임 */}
      <div
        style={{
          position: 'fixed',
          top: '0.75rem',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 9999,
          padding: '0.3rem 0.8rem',
          borderRadius: '0.5rem',
          background: 'rgba(251,191,36,0.15)',
          border: '1px solid rgba(251,191,36,0.5)',
          color: '#fbbf24',
          fontSize: '0.7rem',
          fontWeight: 700,
          letterSpacing: '0.1em',
          pointerEvents: 'none',
        }}
      >
        [LAB] 개발 테스트 전용 — 운영 DIVE 아님
      </div>

      <FlowGameClient
        key={runKey}
        stages={stages}
        colorTheme={theme}
        motionScale={motionScale}
        onComplete={handleComplete}
        onExit={handleExit}
      />
    </>
  );
}

export default function FlowLabPage() {
  return (
    <Suspense>
      <FlowLabContent />
    </Suspense>
  );
}
