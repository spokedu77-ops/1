'use client';

import React, { useMemo } from 'react';
import { MODES } from '../constants';
import { CSS, S } from '../styles';
import { useViewportScrollLock } from '../lib/lockViewportScroll';
import {
  buildDiveActionMoveReport,
  type DiveActionMoveSession,
} from '../lib/diveActionMoveReport';
import { resolveTrainingResultRichContent } from '../lib/trainingResultRichContent';
import {
  RESULT_COLOR_ORDER,
  colorMeta,
  totalColorStimulusCount,
  type ColorStimulusCounts,
  type TrainingResultConfig,
} from '../lib/trainingResultSummary';

type StudentBadge = { name: string; color: string };

/** MASTER 세션 등 — 측정 점수가 아닌 실제 사용 설정 요약 */
export type TrainingResultSessionSettings = {
  title?: string;
  primary: string;
  secondary?: string;
};

type Props = {
  cfg: TrainingResultConfig;
  elapsedMs: number;
  colorCounts: ColorStimulusCounts | null;
  levelLabel: string;
  title?: string;
  statusBadge?: string | null;
  programTitle?: string;
  student?: StudentBadge | null;
  /** 훈련 정리 카드 안(코칭 팁 아래)에 표시. footer에 끼워 넣지 않음 */
  sessionSettings?: TrainingResultSessionSettings | null;
  footer?: React.ReactNode;
  /** DIVE 액션무브 결과만. 없으면 기존 훈련 리포트를 유지한다. */
  diveActionMove?: DiveActionMoveSession | null;
  onBack: () => void;
  onRetry: () => void;
  retryLabel?: string;
};

const RESULT_CSS = `
  .tr-result-root {
    --tr-label: clamp(0.7rem, 1.55vmin, 0.86rem);
    --tr-body: clamp(0.82rem, 1.75vmin, 0.98rem);
    --tr-title: clamp(1.02rem, 2.3vmin, 1.28rem);
    --tr-hero: clamp(1.22rem, 2.9vmin, 1.7rem);
    --tr-stat: clamp(1rem, 2.5vmin, 1.35rem);
    --tr-color: clamp(1.05rem, 2.6vmin, 1.4rem);
    --tr-gap: clamp(0.55rem, 1.4vmin, 0.85rem);
    --tr-pad: clamp(0.75rem, 1.8vmin, 1.05rem);
  }
  .tr-result-root, .tr-result-root * { box-sizing: border-box; }
  .tr-result-header {
    padding-top: max(clamp(0.4rem, 1.2vmin, 0.55rem), env(safe-area-inset-top));
  }
  .tr-result-board {
    grid-template-columns: minmax(200px, 0.92fr) minmax(230px, 1fr) minmax(250px, 1.12fr);
    /* 보드 높이는 가장 긴 카드 기준, 3카드 절대 높이는 동일하게 stretch */
    align-items: stretch;
  }
  .tr-result-card {
    height: 100%;
    min-height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    gap: 0.55rem;
  }
  /* 남는 높이는 블록이 나눠 먹되, 내용 최소 높이 아래로는 안 줄어듦 */
  .tr-fill-stack {
    flex: 1 1 auto;
    min-height: min-content;
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
  }
  .tr-fill-row {
    flex: 1 1 auto;
    min-height: 2.75rem;
    display: flex;
    align-items: center;
  }
  .tr-panel-block {
    flex: 1 1 0;
    min-height: min-content;
    display: flex;
    flex-direction: column;
  }
  .tr-result-footer-wrap {
    padding-bottom: max(0.2rem, env(safe-area-inset-bottom));
  }
  @media (max-width: 920px), (max-height: 700px) {
    .tr-result-board {
      grid-template-columns: 1fr !important;
      max-width: 28rem !important;
    }
  }
  .tr-dive-report {
    word-break: keep-all;
    overflow-wrap: normal;
    --tr-pad: clamp(0.65rem, 1.55vmin, 0.95rem);
    --tr-gap: clamp(0.45rem, 1.2vmin, 0.75rem);
  }
  .tr-dive-report .tr-dive-nowrap {
    white-space: nowrap;
  }
  .tr-dive-report .tr-dive-copy {
    word-break: keep-all;
    overflow-wrap: normal;
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
  sessionSettings = null,
  footer,
  diveActionMove = null,
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

  const dive = useMemo(
    () => (diveActionMove ? buildDiveActionMoveReport(diveActionMove, elapsedMs) : null),
    [diveActionMove, elapsedMs],
  );
  const colorTotal = colorCounts ? totalColorStimulusCount(colorCounts) : 0;
  const showColorBreakdown = !dive && colorCounts != null && colorTotal > 0;

  useViewportScrollLock(true);

  const card: React.CSSProperties = {
    border: '1px solid color-mix(in srgb, var(--border) 88%, transparent)',
    borderRadius: 'clamp(0.95rem, 2.2vmin, 1.25rem)',
    background: 'color-mix(in srgb, var(--card) 94%, transparent)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    padding: 'var(--tr-pad)',
    boxShadow: '0 10px 28px rgba(15, 23, 42, 0.08), 0 1px 0 rgba(255,255,255,0.65) inset',
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
      className={dive ? 'tr-result-root tr-dive-report' : 'tr-result-root'}
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
        background: `
          radial-gradient(ellipse 70% 55% at 50% 0%, ${accent}22 0%, transparent 58%),
          radial-gradient(ellipse 50% 40% at 100% 100%, ${accent}12 0%, transparent 55%),
          var(--bg)
        `,
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
          padding: 'clamp(0.4rem, 1.2vmin, 0.55rem) clamp(0.7rem, 2vmin, 1.1rem)',
          borderBottom: '1px solid color-mix(in srgb, var(--border) 70%, transparent)',
          background: 'color-mix(in srgb, var(--card) 72%, transparent)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
        }}
      >
        <button
          type="button"
          className="tr-btn-back"
          style={{
            ...S.btn,
            ...S.bSecondary,
            justifySelf: 'start',
            padding: '0.45rem 0.75rem',
            fontSize: 'var(--tr-label)',
            borderRadius: '0.65rem',
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
            padding: '0.45rem 0.8rem',
            fontSize: 'var(--tr-label)',
            borderRadius: '0.65rem',
          }}
          onClick={onRetry}
        >
          {retryLabel}
        </button>
      </header>

      <main
        style={{
          flex: 1,
          minHeight: 0,
          overflow: 'auto',
          WebkitOverflowScrolling: 'touch',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 'clamp(0.75rem, 2.2vmin, 1.4rem) clamp(0.7rem, 2vmin, 1.2rem) clamp(1rem, 2.8vmin, 1.6rem)',
        }}
      >
        <div
          className="tr-result-board"
          style={{
            width: '100%',
            maxWidth: '68rem',
            display: 'grid',
            gap: 'var(--tr-gap)',
          }}
        >
          {/* ── 왼쪽: 완료 요약 ── */}
          <section className="tr-result-card" style={card}>
            <div
              className="tr-panel-block"
              style={{
                borderRadius: '0.85rem',
                padding: 'clamp(0.75rem, 1.8vmin, 1rem)',
                textAlign: 'center',
                background: `${accent}12`,
                border: `1px solid ${accent}30`,
                justifyContent: 'center',
                alignItems: 'center',
                gap: '0.35rem',
              }}
            >
              {student ? (
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    padding: '0.15rem 0.55rem',
                    borderRadius: '999px',
                    background: 'var(--card)',
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
                      fontSize: '0.68rem',
                      fontWeight: 900,
                      color: '#fff',
                    }}
                  >
                    {student.name[0]}
                  </div>
                  <span style={{ fontSize: 'var(--tr-label)', fontWeight: 700, color: student.color }}>{student.name}</span>
                </div>
              ) : null}
              <div style={{ fontSize: 'var(--tr-hero)', fontWeight: 900, lineHeight: 1.15 }}>{dive ? dive.title : title}</div>
              <p className={dive ? 'tr-dive-copy' : undefined} style={{ margin: 0, fontSize: 'var(--tr-body)', color: 'var(--text-muted)', fontWeight: 650, lineHeight: 1.4 }}>
                {dive ? dive.subtitle : rich.praiseSub}
              </p>
              {dive?.actionLine ? (
                <p className="tr-dive-copy" style={{ margin: 0, fontSize: 'var(--tr-body)', fontWeight: 850, lineHeight: 1.35 }}>
                  {dive.actionLine}
                </p>
              ) : null}
              <p
                className={dive ? 'tr-dive-copy' : undefined}
                style={{
                  margin: 0,
                  fontSize: 'var(--tr-label)',
                  fontWeight: 800,
                  color: accent,
                  lineHeight: 1.35,
                  wordBreak: 'keep-all',
                }}
              >
                {dive ? (
                  <>
                    DIVE 액션무브
                    {dive.stageLine ? <> · <span className="tr-dive-nowrap">{dive.stageLine}</span></> : null}
                  </>
                ) : rich.sessionHighlight}
              </p>
              {(dive ? dive.statusBadge : statusBadge) ? (
                <span
                  style={{
                    display: 'inline-flex',
                    fontSize: 'var(--tr-label)',
                    fontWeight: 800,
                    padding: '0.12rem 0.5rem',
                    borderRadius: '999px',
                    background: 'var(--card)',
                    color: accent,
                    border: `1px solid ${accent}44`,
                  }}
                >
                  {dive ? dive.statusBadge : statusBadge}
                </span>
              ) : null}
            </div>

            <div
              className="tr-panel-block"
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gridTemplateRows: 'minmax(2.75rem, 1fr) minmax(2.75rem, 1fr)',
                gap: '0.45rem',
              }}
            >
              {[
                dive
                  ? { label: '활동 시간', value: dive.activityTimeValue, nowrap: true }
                  : { label: '진행 시간', value: rich.elapsedLabel, nowrap: false },
                dive
                  ? { label: '스테이지 시간', value: dive.stageTimeValue, nowrap: true }
                  : { label: '설정 분량', value: rich.volumeLabel, nowrap: false },
              ].map((stat) => (
                <div
                  key={stat.label}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    gap: '0.2rem',
                    borderRadius: '0.7rem',
                    background: 'var(--subtle-bg)',
                    border: '1px solid var(--border)',
                    padding: '0.55rem 0.65rem',
                    minHeight: 0,
                  }}
                >
                  <span style={{ fontSize: 'var(--tr-label)', color: 'var(--text-muted)', fontWeight: 800 }}>{stat.label}</span>
                  <span className={stat.nowrap ? 'tr-dive-nowrap' : undefined} style={{ fontSize: 'var(--tr-stat)', fontWeight: 900, lineHeight: 1.15 }}>{stat.value}</span>
                </div>
              ))}
              <div
                style={{
                  gridColumn: '1 / -1',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.6rem',
                  borderRadius: '0.7rem',
                  background: 'var(--subtle-bg)',
                  border: '1px solid var(--border)',
                  padding: '0.55rem 0.65rem',
                  minHeight: 0,
                }}
              >
                <span style={{ fontSize: 'var(--tr-label)', color: 'var(--text-muted)', fontWeight: 800 }}>{dive ? '세션 상태' : '오늘 느낌'}</span>
                <span className={dive ? 'tr-dive-nowrap' : undefined} style={{ fontSize: 'var(--tr-body)', fontWeight: 900, lineHeight: 1.2, textAlign: 'right', wordBreak: 'keep-all' }}>
                  {dive ? dive.sessionStatusValue : rich.activityFeel}
                </span>
              </div>
            </div>

            <div
              className="tr-panel-block"
              style={{
                borderRadius: '0.85rem',
                background: 'var(--subtle-bg)',
                border: '1px solid var(--border)',
                padding: '0.7rem 0.75rem',
                gap: '0.55rem',
                justifyContent: 'center',
              }}
            >
              <div>
                <h2 style={sectionTitle}>{dive ? '오늘의 움직임' : '오늘의 포인트'}</h2>
                <p
                  className={dive ? 'tr-dive-copy' : undefined}
                  style={{
                    margin: '0.4rem 0 0',
                    fontSize: 'var(--tr-body)',
                    lineHeight: 1.45,
                    fontWeight: 750,
                    color: 'var(--text)',
                    wordBreak: 'keep-all',
                    borderLeft: `3px solid ${accent}55`,
                    paddingLeft: '0.55rem',
                  }}
                >
                  {dive ? dive.movementBody : rich.benefitLine}
                </p>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                {(dive ? dive.tags : rich.benefitTags).map((tag) => (
                  <span
                    key={`left-${tag}`}
                    style={{
                      fontSize: 'var(--tr-label)',
                      fontWeight: 850,
                      padding: '0.2rem 0.5rem',
                      borderRadius: '999px',
                      background: `${accent}12`,
                      color: accent,
                      border: `1px solid ${accent}33`,
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </section>

          {/* ── 가운데: 색 집계 또는 세션 스냅샷 ── */}
          <section className="tr-result-card" style={{ ...card, gap: '0.75rem' }}>
            {showColorBreakdown ? (
              <>
                <div style={{ flexShrink: 0 }}>
                  <h2 style={sectionTitle}>색상 제시 횟수</h2>
                  <p style={{ margin: '0.2rem 0 0', fontSize: 'var(--tr-body)', color: 'var(--text-muted)', fontWeight: 650 }}>
                    총 {colorTotal}회 관문 색상이 제시되었습니다.
                  </p>
                </div>

                <div className="tr-fill-stack" style={{ gap: '0.45rem' }}>
                  {RESULT_COLOR_ORDER.map((id) => {
                    const meta = colorMeta(id);
                    const count = colorCounts![id];
                    const percent = colorTotal > 0 ? Math.round((count / colorTotal) * 100) : 0;
                    return (
                      <div
                        key={id}
                        className="tr-fill-row"
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'auto 1fr auto',
                          gap: '0.55rem',
                          padding: '0.55rem 0.65rem',
                          borderRadius: '0.7rem',
                          background: 'var(--subtle-bg)',
                          border: '1px solid var(--border)',
                        }}
                      >
                        <span
                          aria-hidden
                          style={{
                            width: 'clamp(16px, 3.5vmin, 22px)',
                            height: 'clamp(16px, 3.5vmin, 22px)',
                            borderRadius: '50%',
                            background: meta.bg,
                            boxShadow: `0 0 0 3px ${meta.bg}33`,
                          }}
                        />
                        <div style={{ minWidth: 0, width: '100%' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                            <span style={{ fontSize: 'var(--tr-body)', fontWeight: 900 }}>{meta.name}</span>
                            <span style={{ fontSize: 'var(--tr-label)', color: 'var(--text-muted)', fontWeight: 800 }}>{percent}%</span>
                          </div>
                          <div style={{ marginTop: '0.32rem', height: 7, borderRadius: 999, background: 'var(--card)', overflow: 'hidden' }}>
                            <div style={{ width: `${percent}%`, height: '100%', background: meta.bg, borderRadius: 999 }} />
                          </div>
                        </div>
                        <span style={{ fontSize: 'var(--tr-color)', fontWeight: 900, color: accent }}>{count}회</span>
                      </div>
                    );
                  })}
                </div>

                {rich.colorDominantLine ? (
                  <p
                    style={{
                      margin: 0,
                      flexShrink: 0,
                      fontSize: 'var(--tr-label)',
                      fontWeight: 800,
                      color: accent,
                      lineHeight: 1.4,
                      wordBreak: 'keep-all',
                      borderRadius: '0.7rem',
                      background: `${accent}12`,
                      border: `1px solid ${accent}30`,
                      padding: '0.55rem 0.7rem',
                    }}
                  >
                    {rich.colorDominantLine}
                  </p>
                ) : null}
              </>
            ) : (
              <>
                <div style={{ flexShrink: 0 }}>
                  <h2 style={sectionTitle}>{dive ? '오늘의 DIVE' : '세션 스냅샷'}</h2>
                  <p className={dive ? 'tr-dive-copy' : undefined} style={{ margin: '0.2rem 0 0', fontSize: 'var(--tr-body)', color: 'var(--text-muted)', fontWeight: 650, wordBreak: 'keep-all' }}>
                    {dive
                      ? '이번 세션에서 진행한 액션과 활동 구성을 정리합니다.'
                      : '이번 과제는 색상 빈도 대신 활동 요약으로 정리합니다.'}
                  </p>
                </div>

                <div className="tr-fill-stack" style={{ gap: '0.45rem' }}>
                  {(dive
                    ? dive.snapshot
                    : rich.sessionSnapshot.map((item) => ({ ...item, nowrap: false }))
                  ).map((item) => (
                    <div
                      key={item.id}
                      className="tr-fill-row"
                      style={{
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '0.7rem',
                        padding: '0.6rem 0.7rem',
                        borderRadius: '0.7rem',
                        background: 'var(--subtle-bg)',
                        border: '1px solid var(--border)',
                      }}
                    >
                      <span className={dive ? 'tr-dive-copy' : undefined} style={{ fontSize: 'var(--tr-label)', color: 'var(--text-muted)', fontWeight: 800, flexShrink: dive ? 0 : undefined }}>{item.label}</span>
                      <span className={item.nowrap ? 'tr-dive-nowrap' : dive ? 'tr-dive-copy' : undefined} style={{ fontSize: 'var(--tr-body)', fontWeight: 900, textAlign: 'right', wordBreak: 'keep-all', minWidth: 0 }}>{item.value}</span>
                    </div>
                  ))}
                </div>

                <p
                  className={dive ? 'tr-dive-copy' : undefined}
                  style={{
                    margin: 0,
                    flexShrink: 0,
                    fontSize: 'var(--tr-label)',
                    lineHeight: 1.45,
                    color: 'var(--text-muted)',
                    fontWeight: 650,
                    wordBreak: 'keep-all',
                    borderRadius: '0.7rem',
                    background: 'var(--subtle-bg)',
                    border: '1px solid var(--border)',
                    padding: '0.6rem 0.7rem',
                  }}
                >
                  {dive
                    ? '화면의 신호에 맞춰 방향을 바꾸고 점프하고 숙이며 연속적인 움직임을 경험하는 활동입니다.'
                    : '방향·기억·말하기처럼 색 빈도를 따로 기록하지 않는 활동입니다.'}
                </p>
              </>
            )}
          </section>

          {/* ── 오른쪽: 훈련 정리 + 코칭 팁 ── */}
          <section className="tr-result-card" style={{ ...card, gap: '0.7rem' }}>
            <div style={{ flexShrink: 0 }}>
              <h2 style={sectionTitle}>{dive ? '움직임 리포트' : '훈련 정리'}</h2>
              <h3 className={dive ? 'tr-dive-copy' : undefined} style={{ margin: '0.25rem 0 0', fontSize: 'var(--tr-title)', fontWeight: 900, lineHeight: 1.25 }}>
                {dive ? 'DIVE 액션무브' : rich.programTitle}
              </h3>
            </div>

            <div
              style={{
                flexShrink: 0,
                borderRadius: '0.75rem',
                border: `1px solid ${accent}30`,
                background: `${accent}12`,
                padding: '0.7rem',
              }}
            >
              <div className={dive ? 'tr-dive-copy' : undefined} style={{ fontSize: 'var(--tr-label)', fontWeight: 900, color: accent }}>{dive ? '시각 신호 · 방향 전환 · 전신 반응' : (mo?.tag ?? 'SPOMOVE 훈련')}</div>
              <p className={dive ? 'tr-dive-copy' : undefined} style={{ margin: '0.35rem 0 0', fontSize: 'var(--tr-body)', lineHeight: 1.5, color: 'var(--text)', fontWeight: 650, wordBreak: 'keep-all' }}>
                {dive
                  ? '화면의 신호를 보며 좌우 이동과 점프, 숙이기 동작을 연속해서 수행하는 활동입니다.'
                  : rich.programSummary}
              </p>
            </div>

            <div
              style={{
                flexShrink: 0,
                borderRadius: '0.75rem',
                background: 'var(--subtle-bg)',
                border: '1px solid var(--border)',
                padding: '0.65rem 0.7rem',
              }}
            >
              <div style={{ fontSize: 'var(--tr-label)', fontWeight: 900, color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                {dive ? '다음 활동 포인트' : '다음 시도 팁'}
              </div>
              <p className={dive ? 'tr-dive-copy' : undefined} style={{ margin: 0, fontSize: 'var(--tr-body)', lineHeight: 1.5, fontWeight: 700, color: 'var(--text)', wordBreak: 'keep-all' }}>
                {dive
                  ? '다음 신호를 미리 확인하며 동작 사이의 흐름이 끊기지 않도록 움직여 보세요.'
                  : rich.coachTip}
              </p>
            </div>

            {false && sessionSettings?.primary ? (
              <div
                style={{
                  flexShrink: 0,
                  borderRadius: '0.75rem',
                  border: `1px solid ${accent}30`,
                  background: `${accent}12`,
                  padding: '0.7rem',
                }}
              >
                <div style={{ fontSize: 'var(--tr-label)', fontWeight: 900, color: accent }}>
                  {sessionSettings?.title ?? '사용한 동작'}
                </div>
                <p
                  style={{
                    margin: '0.35rem 0 0',
                    fontSize: 'var(--tr-title)',
                    fontWeight: 900,
                    lineHeight: 1.3,
                    color: 'var(--text)',
                    wordBreak: 'keep-all',
                  }}
                >
                  {sessionSettings?.primary}
                </p>
                {sessionSettings?.secondary ? (
                  <p
                    style={{
                      margin: '0.3rem 0 0',
                      fontSize: 'var(--tr-body)',
                      lineHeight: 1.45,
                      fontWeight: 650,
                      color: 'var(--text-muted)',
                      wordBreak: 'keep-all',
                    }}
                  >
                    {sessionSettings?.secondary}
                  </p>
                ) : null}
              </div>
            ) : null}

            <div style={{ flex: '1 1 auto', minHeight: 'min-content', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <h2 style={{ ...sectionTitle, flexShrink: 0 }}>스스로 점검</h2>
              <div className="tr-fill-stack" style={{ gap: '0.4rem' }}>
                {(dive ? dive.selfChecks : rich.selfCheckItems).map((item, index) => (
                  <div
                    key={item.id}
                    className="tr-fill-row"
                    style={{
                      gap: '0.5rem',
                      padding: '0.55rem 0.65rem',
                      borderRadius: '0.65rem',
                      background: 'var(--subtle-bg)',
                      border: '1px solid var(--border)',
                      flexShrink: 0,
                    }}
                  >
                    <span
                      style={{
                        width: '1.5rem',
                        height: '1.5rem',
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
                    <span className={dive ? 'tr-dive-copy' : undefined} style={{ fontSize: 'var(--tr-body)', fontWeight: 750, lineHeight: 1.3, color: 'var(--text)', wordBreak: 'keep-all' }}>
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
        </div>
      </main>
    </div>
  );
}
