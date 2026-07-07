'use client';

import React from 'react';
import { MODES } from '../constants';
import { CSS, S } from '../styles';
import {
  RESULT_COLOR_ORDER,
  colorMeta,
  describeSessionVolume,
  formatElapsedSeconds,
  getTrainingEffectCopy,
  totalColorStimulusCount,
  type ColorStimulusCounts,
  type TrainingResultConfig,
} from '../lib/trainingResultSummary';

type StudentBadge = { name: string; color: string };

type Props = {
  cfg: TrainingResultConfig;
  elapsedMs: number;
  colorCounts: ColorStimulusCounts | null;
  levelLabel: string;
  title?: string;
  statusBadge?: string | null;
  student?: StudentBadge | null;
  footer?: React.ReactNode;
  onBack: () => void;
  onRetry: () => void;
  retryLabel?: string;
};

export function TrainingResultScreen({
  cfg,
  elapsedMs,
  colorCounts,
  levelLabel,
  title = '훈련 완료',
  statusBadge = null,
  student,
  footer,
  onBack,
  onRetry,
  retryLabel = '다시 ▶',
}: Props) {
  const mo = MODES[cfg.mode];
  const accent = mo?.accent ?? '#F97316';
  const volume = describeSessionVolume(cfg);
  const elapsed = formatElapsedSeconds(elapsedMs);
  const effect = getTrainingEffectCopy(cfg.mode, cfg.level);
  const colorTotal = colorCounts ? totalColorStimulusCount(colorCounts) : 0;
  const showColorBreakdown = colorCounts != null && colorTotal > 0;

  const statBox: React.CSSProperties = {
    border: '1px solid var(--border)',
    borderRadius: '0.65rem',
    padding: '0.55rem 0.7rem',
    background: 'var(--subtle-bg)',
  };

  return (
    <div style={{ ...S.page, height: '100vh', minHeight: '100vh' }}>
      <style>{CSS}</style>
      <header
        style={{
          flexShrink: 0,
          display: 'grid',
          gridTemplateColumns: '1fr auto 1fr',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.65rem clamp(0.75rem, 3vw, 1.25rem)',
          borderBottom: '1px solid var(--border)',
          background: 'var(--card)',
        }}
      >
        <button
          type="button"
          style={{
            ...S.btn,
            ...S.bSecondary,
            justifySelf: 'start',
            padding: '0.55rem 0.9rem',
            fontSize: '0.88rem',
            borderRadius: '0.75rem',
          }}
          onClick={onBack}
        >
          ← 목록으로
        </button>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.35rem',
            fontSize: 'clamp(0.82rem, 2.4vw, 0.96rem)',
            fontWeight: 800,
            color: 'var(--text)',
            whiteSpace: 'nowrap',
          }}
        >
          <span>{mo?.icon}</span>
          <span>{mo?.title} · {levelLabel}</span>
        </div>
        <button
          type="button"
          style={{
            ...S.btn,
            ...S.bPrimary,
            justifySelf: 'end',
            padding: '0.55rem 1rem',
            fontSize: '0.88rem',
            borderRadius: '0.75rem',
          }}
            onClick={onRetry}
          >
            {retryLabel}
          </button>
      </header>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          display: 'flex',
          justifyContent: 'center',
          padding: 'clamp(0.75rem, 3vw, 1.5rem)',
        }}
      >
        <div style={{ width: '100%', maxWidth: 'clamp(20rem, 92vw, 32rem)' }}>
          {student ? (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                marginBottom: '0.65rem',
                padding: '0.25rem 0.65rem',
                borderRadius: '999px',
                background: 'var(--subtle-bg)',
                border: '1px solid var(--border)',
              }}
            >
              <div
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  background: student.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.72rem',
                  fontWeight: 900,
                  color: '#fff',
                }}
              >
                {student.name[0]}
              </div>
              <span style={{ fontSize: '0.86rem', fontWeight: 700, color: student.color }}>{student.name}</span>
            </div>
          ) : null}

          <div style={{ textAlign: 'center', marginBottom: '1.1rem' }}>
            {statusBadge ? (
              <p style={{ margin: '0 0 0.35rem', fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                {statusBadge}
              </p>
            ) : null}
            <div style={{ fontSize: '2rem', lineHeight: 1, marginBottom: '0.35rem' }}>✓</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 900, color: 'var(--text)' }}>{title}</div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.45rem', marginBottom: '1rem' }}>
            <div style={statBox}>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 800 }}>진행 시간</div>
              <div style={{ fontSize: '0.98rem', color: 'var(--text)', fontWeight: 900, marginTop: '0.15rem' }}>{elapsed}</div>
            </div>
            <div style={statBox}>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 800 }}>설정 분량</div>
              <div style={{ fontSize: '0.98rem', color: 'var(--text)', fontWeight: 900, marginTop: '0.15rem' }}>{volume}</div>
            </div>
          </div>

          <div
            style={{
              border: '1px solid var(--border)',
              borderRadius: '0.85rem',
              padding: '0.85rem 0.9rem',
              background: 'var(--card)',
              marginBottom: '0.85rem',
            }}
          >
            <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '0.55rem' }}>
              색 자극 분포
            </div>
            {showColorBreakdown ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.45rem' }}>
                {RESULT_COLOR_ORDER.map((id) => {
                  const meta = colorMeta(id);
                  const count = colorCounts![id];
                  return (
                    <div
                      key={id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.55rem',
                        padding: '0.5rem 0.6rem',
                        borderRadius: '0.6rem',
                        background: 'var(--subtle-bg)',
                        border: '1px solid var(--border)',
                      }}
                    >
                      <span
                        aria-hidden
                        style={{
                          width: 14,
                          height: 14,
                          borderRadius: '50%',
                          background: meta.bg,
                          flexShrink: 0,
                          boxShadow: `0 0 0 2px ${meta.bg}33`,
                        }}
                      />
                      <span style={{ flex: 1, fontSize: '0.86rem', fontWeight: 700, color: 'var(--text)' }}>{meta.name}</span>
                      <span style={{ fontSize: '1.05rem', fontWeight: 900, color: accent }}>{count}회</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p style={{ margin: 0, fontSize: '0.82rem', lineHeight: 1.55, color: 'var(--text-muted)', fontWeight: 500 }}>
                이번 프로그램은 색 자극 횟수를 따로 집계하지 않거나, 방향·기억·말하기 위주 과제입니다.
              </p>
            )}
            {showColorBreakdown ? (
              <div style={{ marginTop: '0.55rem', fontSize: '0.76rem', color: 'var(--text-muted)', fontWeight: 600, textAlign: 'right' }}>
                합계 {colorTotal}회
              </div>
            ) : null}
          </div>

          <div
            style={{
              border: `1px solid ${accent}44`,
              borderRadius: '0.85rem',
              padding: '0.85rem 0.9rem',
              background: `${accent}0d`,
            }}
          >
            <div style={{ fontSize: '0.72rem', fontWeight: 800, color: accent, marginBottom: '0.35rem' }}>이번 운동 효과</div>
            <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text)', marginBottom: '0.35rem' }}>{effect.tag}</div>
            <p style={{ margin: 0, fontSize: '0.82rem', lineHeight: 1.6, color: 'var(--text-muted)', fontWeight: 500 }}>{effect.summary}</p>
          </div>

          {footer ? <div style={{ marginTop: '1rem' }}>{footer}</div> : null}
        </div>
      </div>
    </div>
  );
}
