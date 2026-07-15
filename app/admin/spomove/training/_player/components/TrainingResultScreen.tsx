'use client';

import React, { useMemo } from 'react';
import { MODES } from '../constants';
import { CSS, S } from '../styles';
import { useViewportScrollLock } from '../lib/lockViewportScroll';
import { resolveTrainingResultRichContent } from '../lib/trainingResultRichContent';
import {
  RESULT_COLOR_ORDER,
  colorMeta,
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
  programTitle?: string;
  student?: StudentBadge | null;
  footer?: React.ReactNode;
  onBack: () => void;
  onRetry: () => void;
  retryLabel?: string;
};

const RESULT_CSS = `
  .tr-result-root {
    --tr-label: clamp(0.72rem, 1.7vmin, 0.9rem);
    --tr-body: clamp(0.86rem, 1.9vmin, 1.02rem);
    --tr-title: clamp(1.08rem, 2.5vmin, 1.38rem);
    --tr-hero: clamp(1.35rem, 3.2vmin, 1.9rem);
    --tr-stat: clamp(1.08rem, 2.8vmin, 1.5rem);
    --tr-color: clamp(1.12rem, 2.9vmin, 1.55rem);
    --tr-gap: clamp(0.55rem, 1.5vmin, 0.9rem);
    --tr-pad: clamp(0.72rem, 1.8vmin, 1rem);
  }
  .tr-result-root, .tr-result-root * { box-sizing: border-box; }
  .tr-result-header {
    padding-top: max(clamp(0.45rem, 1.4vmin, 0.65rem), env(safe-area-inset-top));
  }
  .tr-result-main {
    grid-template-columns: minmax(230px, 0.9fr) minmax(260px, 1fr) minmax(280px, 1.15fr);
  }
  .tr-result-footer-wrap {
    padding-bottom: max(0.35rem, env(safe-area-inset-bottom));
  }
  @media (max-width: 920px), (max-height: 760px) {
    .tr-result-main {
      grid-template-columns: 1fr !important;
      overflow-y: auto !important;
      -webkit-overflow-scrolling: touch;
    }
  }
  @media (max-width: 420px) {
    .tr-result-header {
      grid-template-columns: auto 1fr auto !important;
      gap: 0.25rem !important;
    }
    .tr-result-header-center {
      font-size: clamp(0.68rem, 2vmin, 0.82rem) !important;
      white-space: normal !important;
      text-align: center;
      line-height: 1.2;
    }
    .tr-result-header .tr-btn-back,
    .tr-result-header .tr-btn-retry {
      padding: 0.4rem 0.55rem !important;
      font-size: clamp(0.65rem, 1.9vmin, 0.78rem) !important;
    }
  }
`;

export function TrainingResultScreen({
  cfg,
  elapsedMs,
  colorCounts,
  levelLabel,
  title = '훈련 완료',
  statusBadge = null,
  programTitle,
  student,
  footer,
  onBack,
  onRetry,
  retryLabel = '다시 실행',
}: Props) {
  const mo = MODES[cfg.mode];
  const accent = mo?.accent ?? '#F97316';
  const rich = useMemo(
    () => resolveTrainingResultRichContent(cfg, elapsedMs, colorCounts, { programTitle }),
    [cfg, elapsedMs, colorCounts, programTitle],
  );

  const colorTotal = colorCounts ? totalColorStimulusCount(colorCounts) : 0;
  const showColorBreakdown = colorCounts != null && colorTotal > 0;

  useViewportScrollLock(true);

  const card: React.CSSProperties = {
    border: '1px solid var(--border)',
    borderRadius: 'clamp(0.65rem, 2vmin, 0.9rem)',
    background: 'var(--card)',
    padding: 'var(--tr-pad)',
    minHeight: 0,
    overflow: 'hidden',
  };

  const sectionTitle: React.CSSProperties = {
    margin: 0,
    fontSize: 'var(--tr-label)',
    fontWeight: 900,
    color: 'var(--text-muted)',
    letterSpacing: '0.02em',
  };

  return (
    <div
      className="tr-result-root"
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100dvh',
        maxHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        overscrollBehavior: 'none',
        background: 'var(--bg)',
        fontFamily: S.page.fontFamily,
        color: 'var(--text)',
        zIndex: 1,
      }}
    >
      <style>{CSS}</style>
      <style>{RESULT_CSS}</style>

      <header
        className="tr-result-header"
        style={{
          flexShrink: 0,
          display: 'grid',
          gridTemplateColumns: '1fr auto 1fr',
          alignItems: 'center',
          gap: '0.4rem',
          padding: 'clamp(0.45rem, 1.4vmin, 0.65rem) clamp(0.65rem, 2vmin, 1rem)',
          borderBottom: '1px solid var(--border)',
          background: 'var(--card)',
        }}
      >
        <button
          type="button"
          className="tr-btn-back"
          style={{
            ...S.btn,
            ...S.bSecondary,
            justifySelf: 'start',
            padding: '0.5rem 0.85rem',
            fontSize: 'var(--tr-label)',
            borderRadius: '0.7rem',
          }}
          onClick={onBack}
        >
          목록
        </button>
        <div
          className="tr-result-header-center"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.35rem',
            fontSize: 'var(--tr-label)',
            fontWeight: 800,
          }}
        >
          <span>{mo?.icon}</span>
          <span>{mo?.title} · {levelLabel}</span>
        </div>
        <button
          type="button"
          className="tr-btn-retry"
          style={{
            ...S.btn,
            ...S.bPrimary,
            justifySelf: 'end',
            padding: '0.5rem 0.9rem',
            fontSize: 'var(--tr-label)',
            borderRadius: '0.7rem',
          }}
          onClick={onRetry}
        >
          {retryLabel}
        </button>
      </header>

      <main
        className="tr-result-main"
        style={{
          flex: 1,
          minHeight: 0,
          overflow: 'hidden',
          display: 'grid',
          gap: 'var(--tr-gap)',
          padding: 'var(--tr-gap) clamp(0.65rem, 2vmin, 1rem)',
        }}
      >
        <section style={{ ...card, display: 'flex', flexDirection: 'column', gap: 'var(--tr-gap)' }}>
          <div
            style={{
              borderRadius: '0.8rem',
              padding: 'clamp(0.85rem, 2.2vmin, 1.15rem)',
              textAlign: 'center',
              background: `${accent}0c`,
              border: `1px solid ${accent}35`,
            }}
          >
            {student ? (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  marginBottom: '0.45rem',
                  padding: '0.2rem 0.6rem',
                  borderRadius: '999px',
                  background: 'var(--card)',
                  border: '1px solid var(--border)',
                }}
              >
                <div
                  style={{
                    width: 22,
                    height: 22,
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
                <span style={{ fontSize: 'var(--tr-label)', fontWeight: 700, color: student.color }}>{student.name}</span>
              </div>
            ) : null}
            <div style={{ fontSize: 'var(--tr-hero)', fontWeight: 900, lineHeight: 1.2 }}>{title}</div>
            <p style={{ margin: '0.35rem 0 0', fontSize: 'var(--tr-body)', color: 'var(--text-muted)', fontWeight: 650, lineHeight: 1.45 }}>
              {rich.praiseSub}
            </p>
            {statusBadge ? (
              <span
                style={{
                  display: 'inline-flex',
                  marginTop: '0.45rem',
                  fontSize: 'var(--tr-label)',
                  fontWeight: 800,
                  padding: '0.15rem 0.55rem',
                  borderRadius: '999px',
                  background: 'var(--card)',
                  color: accent,
                  border: `1px solid ${accent}44`,
                }}
              >
                {statusBadge}
              </span>
            ) : null}
          </div>

          <div style={{ display: 'grid', gap: '0.55rem' }}>
            {[
              { label: '진행 시간', value: rich.elapsedLabel },
              { label: '설정 분량', value: rich.volumeLabel },
              { label: '오늘 느낌', value: rich.activityFeel },
            ].map((stat) => (
              <div
                key={stat.label}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.8rem',
                  borderRadius: '0.7rem',
                  background: 'var(--subtle-bg)',
                  border: '1px solid var(--border)',
                  padding: '0.65rem 0.75rem',
                }}
              >
                <span style={{ fontSize: 'var(--tr-label)', color: 'var(--text-muted)', fontWeight: 800 }}>{stat.label}</span>
                <span style={{ fontSize: 'var(--tr-stat)', fontWeight: 900, lineHeight: 1.1, textAlign: 'right' }}>{stat.value}</span>
              </div>
            ))}
          </div>
        </section>

        <section style={{ ...card, display: 'flex', flexDirection: 'column', gap: 'var(--tr-gap)' }}>
          <div>
            <h2 style={sectionTitle}>색상 제시 횟수</h2>
            <p style={{ margin: '0.25rem 0 0', fontSize: 'var(--tr-body)', color: 'var(--text-muted)', fontWeight: 650 }}>
              {showColorBreakdown ? `총 ${colorTotal}회 관문 색상이 제시되었습니다.` : '이번 과제에는 집계 가능한 색상 제시가 없습니다.'}
            </p>
          </div>

          {showColorBreakdown ? (
            <div style={{ display: 'grid', gap: '0.55rem' }}>
              {RESULT_COLOR_ORDER.map((id) => {
                const meta = colorMeta(id);
                const count = colorCounts![id];
                const percent = colorTotal > 0 ? Math.round((count / colorTotal) * 100) : 0;
                return (
                  <div
                    key={id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'auto 1fr auto',
                      alignItems: 'center',
                      gap: '0.65rem',
                      padding: '0.65rem',
                      borderRadius: '0.75rem',
                      background: 'var(--subtle-bg)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    <span
                      aria-hidden
                      style={{
                        width: 'clamp(18px, 4vmin, 24px)',
                        height: 'clamp(18px, 4vmin, 24px)',
                        borderRadius: '50%',
                        background: meta.bg,
                        boxShadow: `0 0 0 3px ${meta.bg}33`,
                      }}
                    />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                        <span style={{ fontSize: 'var(--tr-body)', fontWeight: 900 }}>{meta.name}</span>
                        <span style={{ fontSize: 'var(--tr-label)', color: 'var(--text-muted)', fontWeight: 800 }}>{percent}%</span>
                      </div>
                      <div style={{ marginTop: '0.35rem', height: 7, borderRadius: 999, background: 'var(--card)', overflow: 'hidden' }}>
                        <div style={{ width: `${percent}%`, height: '100%', background: meta.bg, borderRadius: 999 }} />
                      </div>
                    </div>
                    <span style={{ fontSize: 'var(--tr-color)', fontWeight: 900, color: accent }}>{count}회</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div
              style={{
                flex: 1,
                minHeight: 120,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '1rem',
                borderRadius: '0.75rem',
                background: 'var(--subtle-bg)',
                border: '1px solid var(--border)',
              }}
            >
              <p style={{ margin: 0, fontSize: 'var(--tr-body)', lineHeight: 1.5, color: 'var(--text-muted)', fontWeight: 650, textAlign: 'center' }}>
                방향, 기억, 말하기 중심 과제처럼 색상 빈도를 따로 기록하지 않는 활동입니다.
              </p>
            </div>
          )}
        </section>

        <section style={{ ...card, display: 'flex', flexDirection: 'column', gap: 'var(--tr-gap)' }}>
          <div>
            <h2 style={sectionTitle}>훈련 정리</h2>
            <h3 style={{ margin: '0.35rem 0 0', fontSize: 'var(--tr-title)', fontWeight: 900, lineHeight: 1.25 }}>
              {rich.programTitle}
            </h3>
          </div>

          <div
            style={{
              borderRadius: '0.8rem',
              border: `1px solid ${accent}33`,
              background: `${accent}0a`,
              padding: '0.85rem',
            }}
          >
            <div style={{ fontSize: 'var(--tr-label)', fontWeight: 900, color: accent }}>{mo?.tag ?? 'SPOMOVE 훈련'}</div>
            <p style={{ margin: '0.45rem 0 0', fontSize: 'var(--tr-body)', lineHeight: 1.55, color: 'var(--text)', fontWeight: 650 }}>
              {rich.programSummary}
            </p>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
            {rich.benefitTags.map((tag) => (
              <span
                key={tag}
                style={{
                  fontSize: 'var(--tr-label)',
                  fontWeight: 850,
                  padding: '0.25rem 0.6rem',
                  borderRadius: '999px',
                  background: 'var(--subtle-bg)',
                  color: accent,
                  border: `1px solid ${accent}33`,
                }}
              >
                {tag}
              </span>
            ))}
          </div>

          <p
            style={{
              margin: 0,
              fontSize: 'var(--tr-body)',
              lineHeight: 1.55,
              color: accent,
              fontWeight: 750,
              borderLeft: `3px solid ${accent}55`,
              paddingLeft: '0.65rem',
            }}
          >
            {rich.benefitLine}
          </p>

          <div>
            <h2 style={sectionTitle}>스스로 점검</h2>
            <div style={{ display: 'grid', gap: '0.5rem', marginTop: '0.55rem' }}>
              {rich.selfCheckItems.map((item, index) => (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.55rem',
                    padding: '0.55rem 0.65rem',
                    borderRadius: '0.7rem',
                    background: 'var(--subtle-bg)',
                    border: '1px solid var(--border)',
                  }}
                >
                  <span
                    style={{
                      width: '1.65rem',
                      height: '1.65rem',
                      borderRadius: '50%',
                      background: `${accent}18`,
                      color: accent,
                      fontSize: 'var(--tr-label)',
                      fontWeight: 900,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {index + 1}
                  </span>
                  <span style={{ fontSize: 'var(--tr-body)', fontWeight: 750, lineHeight: 1.35, color: 'var(--text)' }}>
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {footer ? (
            <div className="tr-result-footer-wrap" style={{ flexShrink: 0 }}>
              {footer}
            </div>
          ) : null}
        </section>
      </main>
    </div>
  );
}
