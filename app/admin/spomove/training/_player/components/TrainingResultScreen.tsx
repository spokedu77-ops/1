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
    --tr-label: clamp(0.72rem, 2.1vmin, 0.92rem);
    --tr-body: clamp(0.86rem, 2.5vmin, 1.05rem);
    --tr-title: clamp(1.05rem, 3.2vmin, 1.4rem);
    --tr-hero: clamp(1.35rem, 4.2vmin, 1.9rem);
    --tr-stat: clamp(1.05rem, 3.4vmin, 1.45rem);
    --tr-color: clamp(1.15rem, 3.8vmin, 1.65rem);
    --tr-quote: clamp(0.88rem, 2.45vmin, 1.08rem);
    --tr-gap: clamp(0.45rem, 1.4vmin, 0.75rem);
    --tr-pad: clamp(0.55rem, 1.6vmin, 0.9rem);
    --tr-effect-gap: clamp(0.42rem, 1.25vmin, 0.62rem);
  }
  .tr-result-root, .tr-result-root * {
    box-sizing: border-box;
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
    .tr-result-check-grid {
      grid-template-columns: 1fr !important;
    }
    .tr-result-stats {
      grid-template-columns: 1fr !important;
    }
  }
  @media (max-height: 820px) {
    .tr-result-root {
      --tr-hero: clamp(1.1rem, 3.4vmin, 1.5rem);
      --tr-stat: clamp(0.95rem, 2.8vmin, 1.2rem);
      --tr-gap: clamp(0.35rem, 1.1vmin, 0.55rem);
      --tr-pad: clamp(0.45rem, 1.3vmin, 0.7rem);
    }
    .tr-result-main {
      overflow-y: auto !important;
      -webkit-overflow-scrolling: touch;
      grid-template-rows: auto !important;
    }
  }
  .tr-result-header {
    padding-top: max(clamp(0.45rem, 1.4vmin, 0.65rem), env(safe-area-inset-top));
  }
  .tr-result-footer-wrap {
    padding-bottom: max(0.35rem, env(safe-area-inset-bottom));
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
  retryLabel = '다시 ▶',
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
          ← 목록
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
          gridTemplateRows: footer
            ? 'minmax(0, 1fr) minmax(0, 0.8fr) minmax(0, 1.45fr) minmax(0, 1.35fr) minmax(0, 1fr) auto'
            : 'minmax(0, 1.05fr) minmax(0, 0.85fr) minmax(0, 1.5fr) minmax(0, 1.4fr) minmax(0, 1.05fr)',
          gap: 'var(--tr-gap)',
          padding: 'var(--tr-gap) clamp(0.65rem, 2vmin, 1rem)',
        }}
      >
        <section
          style={{
            ...card,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            background: `${accent}0c`,
            borderColor: `${accent}35`,
          }}
        >
          {student ? (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                marginBottom: '0.35rem',
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
          <div style={{ fontSize: 'clamp(1.8rem, 6vmin, 2.6rem)', lineHeight: 1, marginBottom: '0.25rem' }}>✓</div>
          <div style={{ fontSize: 'var(--tr-hero)', fontWeight: 900, lineHeight: 1.2 }}>{title}</div>
          <p style={{ margin: '0.3rem 0 0', fontSize: 'var(--tr-body)', color: 'var(--text-muted)', fontWeight: 600, lineHeight: 1.4 }}>
            {rich.praiseSub}
          </p>
          {statusBadge ? (
            <span
              style={{
                marginTop: '0.35rem',
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
        </section>

        <section
          className="tr-result-stats"
          style={{
            minHeight: 0,
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: 'var(--tr-gap)',
          }}
        >
          {[
            { label: '진행 시간', value: rich.elapsedLabel },
            { label: '설정 분량', value: rich.volumeLabel },
            { label: '오늘 느낌', value: rich.activityFeel },
          ].map((stat) => (
            <div
              key={stat.label}
              style={{
                ...card,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                background: 'var(--subtle-bg)',
              }}
            >
              <div style={{ fontSize: 'var(--tr-label)', color: 'var(--text-muted)', fontWeight: 800 }}>{stat.label}</div>
              <div style={{ fontSize: 'var(--tr-stat)', fontWeight: 900, marginTop: '0.15rem', lineHeight: 1.2 }}>{stat.value}</div>
            </div>
          ))}
        </section>

        <section style={{ ...card, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div style={{ fontSize: 'var(--tr-label)', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
            색 자극 분포
          </div>
          {showColorBreakdown ? (
            <>
              <div
                style={{
                  flex: 1,
                  minHeight: 0,
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 'var(--tr-gap)',
                }}
              >
                {RESULT_COLOR_ORDER.map((id) => {
                  const meta = colorMeta(id);
                  const count = colorCounts![id];
                  return (
                    <div
                      key={id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'clamp(0.45rem, 1.5vmin, 0.7rem)',
                        padding: 'clamp(0.45rem, 1.4vmin, 0.7rem)',
                        borderRadius: '0.65rem',
                        background: 'var(--subtle-bg)',
                        border: '1px solid var(--border)',
                        minHeight: 0,
                      }}
                    >
                      <span
                        aria-hidden
                        style={{
                          width: 'clamp(16px, 4vmin, 22px)',
                          height: 'clamp(16px, 4vmin, 22px)',
                          borderRadius: '50%',
                          background: meta.bg,
                          flexShrink: 0,
                          boxShadow: `0 0 0 3px ${meta.bg}33`,
                        }}
                      />
                      <span style={{ flex: 1, fontSize: 'var(--tr-body)', fontWeight: 800 }}>{meta.name}</span>
                      <span style={{ fontSize: 'var(--tr-color)', fontWeight: 900, color: accent }}>{count}회</span>
                    </div>
                  );
                })}
              </div>
              <div
                style={{
                  marginTop: '0.35rem',
                  fontSize: 'var(--tr-label)',
                  color: 'var(--text-muted)',
                  fontWeight: 700,
                  textAlign: 'right',
                }}
              >
                합계 {colorTotal}회
              </div>
            </>
          ) : (
            <div
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0.5rem',
                borderRadius: '0.65rem',
                background: 'var(--subtle-bg)',
                border: '1px solid var(--border)',
              }}
            >
              <p style={{ margin: 0, fontSize: 'var(--tr-body)', lineHeight: 1.5, color: 'var(--text-muted)', fontWeight: 600, textAlign: 'center' }}>
                이번 과제는 방향·기억·말하기 위주라 색 횟수는 따로 세지 않아요.
              </p>
            </div>
          )}
        </section>

        <section
          style={{
            ...card,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            gap: 'var(--tr-effect-gap)',
            borderColor: `${accent}44`,
            background: `${accent}0a`,
            minHeight: 0,
            overflow: 'hidden',
          }}
        >
          <div style={{ fontSize: 'var(--tr-title)', fontWeight: 900, color: 'var(--text)', lineHeight: 1.25 }}>
            {rich.programTitle}
          </div>
          <div style={{ fontSize: 'var(--tr-label)', fontWeight: 800, color: accent, letterSpacing: '0.02em' }}>
            {mo?.tag ?? '이번 운동 효과'}
          </div>
          <p
            style={{
              margin: 0,
              width: 'min(42ch, 100%)',
              fontSize: 'var(--tr-body)',
              lineHeight: 1.55,
              color: 'var(--text)',
              fontWeight: 600,
            }}
          >
            {rich.programSummary}
          </p>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
              gap: '0.35rem',
              width: '100%',
            }}
          >
            {rich.benefitTags.map((tag) => (
              <span
                key={tag}
                style={{
                  fontSize: 'var(--tr-label)',
                  fontWeight: 800,
                  padding: '0.2rem 0.55rem',
                  borderRadius: '999px',
                  background: 'var(--card)',
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
              width: 'min(36ch, 100%)',
              fontSize: 'var(--tr-quote)',
              lineHeight: 1.5,
              color: accent,
              fontWeight: 700,
              borderLeft: `3px solid ${accent}55`,
              paddingLeft: '0.55rem',
            }}
          >
            {rich.benefitLine}
          </p>
        </section>

        <section style={{ ...card, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
          <div
            style={{
              fontSize: 'var(--tr-label)',
              fontWeight: 800,
              color: 'var(--text)',
              marginBottom: '0.35rem',
              textAlign: 'center',
            }}
          >
            스스로 점검해 볼까요?
          </div>
          <div
            className="tr-result-check-grid"
            style={{
              flex: 1,
              minHeight: 0,
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gridTemplateRows: 'repeat(2, minmax(0, auto))',
              gap: 'var(--tr-gap)',
              alignContent: 'start',
            }}
          >
            {rich.selfCheckItems.map((item, index) => (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  padding: 'clamp(0.4rem, 1.2vmin, 0.65rem)',
                  borderRadius: '0.65rem',
                  background: 'var(--subtle-bg)',
                  border: '1px solid var(--border)',
                  minHeight: 0,
                }}
              >
                <span
                  style={{
                    width: 'clamp(1.4rem, 4vmin, 1.8rem)',
                    height: 'clamp(1.4rem, 4vmin, 1.8rem)',
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
                <span style={{ fontSize: 'var(--tr-body)', fontWeight: 700, lineHeight: 1.35, color: 'var(--text)', textAlign: 'left' }}>
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </section>

        {footer ? (
          <div className="tr-result-footer-wrap" style={{ flexShrink: 0, overflow: 'hidden' }}>
            {footer}
          </div>
        ) : null}
      </main>
    </div>
  );
}
