'use client';

import { useEffect, useState } from 'react';
import type { ComputeResult } from '../types';
import { isValidMoveReportPhone } from '../lib/phone';
import Radar from './Radar';
import AxisRow from './AxisRow';
import ShareAndCollect from './ShareAndCollect';

export type ResultTab = 'report' | 'solution';

interface ResultProps {
  result: ComputeResult;
  tab: ResultTab;
  onTab: (t: ResultTab) => void;
  onReset: () => void;
  onShare: () => void | Promise<void>;
  onLeadSubmit: (phone: string) => Promise<boolean>;
  savedPhone: string;
  flash: (msg: string) => void;
  onRequestLead: () => void;
}

function DescAccordion({ desc, col, revealed }: { desc: string; col: string; revealed: boolean }) {
  return (
    <div className={revealed ? 'anim-rise d3' : ''} style={{ marginBottom: '20px' }}>
      <div
        style={{
          background: 'rgba(0,0,0,.5)',
          backdropFilter: 'blur(12px)',
          border: '1px solid #2A2A2A',
          borderLeft: `3px solid ${col}`,
          borderRadius: '12px',
          padding: '16px',
        }}
      >
        <p
          style={{
            fontSize: '14px',
            fontWeight: 500,
            color: '#CCCCCC',
            lineHeight: 1.65,
            wordBreak: 'keep-all',
            margin: 0,
          }}
        >
          {desc}
        </p>
      </div>
    </div>
  );
}

export default function Result({
  result,
  tab,
  onTab,
  onReset,
  onShare,
  onLeadSubmit,
  savedPhone,
  flash,
  onRequestLead,
}: ResultProps) {
  const { profile: p, bd, displayName, key } = result;
  const [revealed, setRevealed] = useState(false);
  const [reportExpanded, setReportExpanded] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => setRevealed(true), 100);
    return () => window.clearTimeout(t);
  }, []);

  const hasSavedPhone = isValidMoveReportPhone(savedPhone);

  const codeLabels = [
    { code: key[0], label: key[0] === 'C' ? '협동형' : '독립형' },
    { code: key[1], label: key[1] === 'R' ? '규칙 친화' : '탐구 지향' },
    { code: key[2], label: key[2] === 'P' ? '과정 중시' : '목표 지향' },
    { code: key[3], label: key[3] === 'D' ? '동적 에너지' : '정적 에너지' },
  ];

  return (
    <div style={{ background: '#0D0D0D', minHeight: '100vh' }}>
      <div
        style={{
          maxWidth: 430,
          margin: '0 auto',
          minHeight: '100vh',
          borderLeft: '1px solid #1A1A1A',
          borderRight: '1px solid #1A1A1A',
        }}
      >
        {/* 히어로 */}
        <div
          style={{
            position: 'relative',
            overflow: 'hidden',
            minHeight: 'auto',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            background: '#0A0A0A',
          }}
        >
          <div style={{ position: 'absolute', inset: 0 }}>
            <div
              style={{
                position: 'absolute',
                top: '-10%',
                right: '-10%',
                width: '70%',
                height: '70%',
                background: `radial-gradient(circle,${p.col}35 0%,transparent 65%)`,
              }}
            />
            <div
              style={{
                position: 'absolute',
                bottom: '5%',
                left: '-10%',
                width: '50%',
                height: '50%',
                background: 'radial-gradient(circle,rgba(255,176,32,.1) 0%,transparent 65%)',
              }}
            />
            <div
              style={{
                position: 'absolute',
                inset: 0,
                opacity: 0.05,
                backgroundImage:
                  'linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)',
                backgroundSize: '28px 28px',
              }}
            />
            <div
              style={{
                position: 'absolute',
                top: '8%',
                right: '5%',
                width: '180px',
                height: '180px',
                backgroundImage: `radial-gradient(circle,${p.col} 1.5px,transparent 1.5px)`,
                backgroundSize: '16px 16px',
                opacity: 0.12,
                borderRadius: '50%',
              }}
            />
          </div>
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              height: '60px',
              background: 'linear-gradient(transparent,rgba(255,255,255,.02),transparent)',
              animation: 'scanline 5s linear infinite',
              pointerEvents: 'none',
            }}
          />

          <div style={{ position: 'relative', zIndex: 2, padding: '56px 24px 24px' }}>
            <div className={revealed ? 'anim-stamp' : ''} style={{ marginBottom: '14px' }}>
              <div style={{ display: 'inline-flex', gap: '5px', alignItems: 'center' }}>
                {key.split('').map((c, i) => (
                  <div
                    key={i}
                    style={{
                      fontFamily: 'Bebas Neue,sans-serif',
                      fontSize: '22px',
                      width: '38px',
                      height: '38px',
                      borderRadius: '9px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: `${p.col}22`,
                      border: `1.5px solid ${p.col}60`,
                      color: p.col,
                      boxShadow: `0 0 10px ${p.col}30`,
                    }}
                  >
                    {c}
                  </div>
                ))}
              </div>
            </div>

            <div className={revealed ? 'anim-rise' : ''} style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {codeLabels.map((item, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '5px 10px',
                      borderRadius: '8px',
                      background: `${p.col}18`,
                      border: `1px solid ${p.col}35`,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: 'Bebas Neue,sans-serif',
                        fontSize: '15px',
                        color: p.col,
                        lineHeight: 1,
                      }}
                    >
                      {item.code}
                    </span>
                    <span
                      style={{
                        fontSize: '11px',
                        color: 'rgba(255,255,255,.7)',
                        fontWeight: 600,
                        letterSpacing: '.01em',
                      }}
                    >
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className={revealed ? 'anim-rise d1' : ''}>
              <div
                style={{
                  marginBottom: '14px',
                  padding: '10px 14px',
                  background: `${p.col}18`,
                  border: `1px solid ${p.col}40`,
                  borderRadius: '10px',
                }}
              >
                <p
                  style={{
                    fontSize: '14px',
                    fontWeight: 800,
                    color: '#fff',
                    margin: 0,
                    lineHeight: 1.4,
                    wordBreak: 'keep-all',
                    letterSpacing: '-.01em',
                  }}
                >
                  &quot;{p.catchcopy}&quot;
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '16px' }}>
                <div
                  style={{
                    fontSize: '72px',
                    lineHeight: 1,
                    filter: `drop-shadow(0 0 24px ${p.col}80)`,
                    animation: 'floatY 3s ease-in-out infinite',
                  }}
                >
                  {p.em}
                </div>
                <div style={{ paddingTop: '8px' }}>
                  <div
                    style={{
                      fontSize: '12px',
                      fontWeight: 700,
                      letterSpacing: '.08em',
                      color: p.col,
                      marginBottom: '6px',
                    }}
                  >
                    {displayName}의 MOVE 유형
                  </div>
                  <h1
                    style={{
                      fontFamily: 'Black Han Sans,sans-serif',
                      fontSize: '34px',
                      color: '#fff',
                      lineHeight: 1.1,
                      letterSpacing: '-.01em',
                      textShadow: `0 0 30px ${p.col}50`,
                      margin: 0,
                    }}
                  >
                    {p.char}
                  </h1>
                </div>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <span
                  style={{
                    fontFamily: 'Bebas Neue,sans-serif',
                    fontSize: '16px',
                    letterSpacing: '.06em',
                    background: p.grad,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  {p.title}
                </span>
              </div>
            </div>

            <div className={revealed ? 'anim-rise d2' : ''} style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '20px' }}>
              {p.kw.map((k, i) => (
                <span
                  key={i}
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '5px 11px',
                    borderRadius: '6px',
                    letterSpacing: '.04em',
                    background: 'rgba(255,255,255,.07)',
                    color: 'rgba(255,255,255,.75)',
                    border: '1px solid rgba(255,255,255,.12)',
                  }}
                >
                  {k}
                </span>
              ))}
            </div>

            <DescAccordion desc={p.desc} col={p.col} revealed={revealed} />

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: 0.4, marginTop: '8px' }}>
              <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg,transparent,#444)' }} />
              <i className="fa-solid fa-chevron-down" style={{ fontSize: '12px', color: '#999', animation: 'floatY 2s ease-in-out infinite' }} />
              <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '.08em', color: '#A8A8A8' }}>SCROLL</span>
              <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg,#444,transparent)' }} />
            </div>
          </div>

          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              padding: '20px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              zIndex: 3,
              background: 'linear-gradient(to bottom,rgba(0,0,0,.6),transparent)',
            }}
          >
            <button
              type="button"
              onClick={onReset}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(0,0,0,.5)',
                border: '1px solid #333',
                padding: '7px 12px',
                borderRadius: '8px',
                color: '#A8A8A8',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                outline: 'none',
                backdropFilter: 'blur(8px)',
              }}
            >
              <i className="fa-solid fa-arrow-left" style={{ fontSize: '11px' }} />
              다시하기
            </button>
            <div
              style={{
                fontFamily: 'Bebas Neue,sans-serif',
                fontSize: '16px',
                letterSpacing: '.1em',
                color: '#FF4B1F',
                textShadow: '0 0 10px rgba(255,75,31,.5)',
              }}
            >
              SPOKEDU
            </div>
          </div>
        </div>

        {/* 탭 */}
        <div
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 20,
            background: '#0D0D0D',
            padding: '12px 20px',
            borderBottom: '1px solid #1A1A1A',
          }}
        >
          <div className="tabs mr-tabs-html">
            {(
              [
                { id: 'report' as const, l: '무브 리포트' },
                { id: 'solution' as const, l: '맞춤 솔루션' },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => onTab(t.id)}
                className={`tab ${tab === t.id ? 'on' : 'off'}`}
                style={tab === t.id ? { color: p.col } : undefined}
              >
                {t.l}
              </button>
            ))}
          </div>
        </div>

        <div style={{ padding: '16px 20px 60px' }}>
          {tab === 'report' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }} className="anim-fade">
              <div className="card mr-card-html">
                <div className="card-head">
                  <div
                    className="card-head-icon"
                    style={{ ['--p-dim' as string]: `${p.col}20`, background: `var(--p-dim, ${p.col}20)` }}
                  >
                    <i className="fa-solid fa-chart-line" style={{ fontSize: '13px', color: p.col }} />
                  </div>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 800, color: '#fff' }}>8대 행동 지표 밸런스</div>
                    <div style={{ fontSize: '11px', color: '#A8A8A8', marginTop: '1px' }}>신체활동 성향 분포도</div>
                  </div>
                </div>
                <div className="card-section">
                  <Radar bd={bd} col={p.col} />
                </div>
              </div>

              <div
                className="card mr-card-html"
                style={{
                  background: '#141414',
                  border: '1px solid #262626',
                  padding: '12px 14px',
                }}
              >
                <button
                  type="button"
                  onClick={() => setReportExpanded((v) => !v)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'transparent',
                    border: 'none',
                    color: '#E8E8E8',
                    fontSize: '13px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  <span>{reportExpanded ? '상세 분석 접기' : '상세 분석 펼쳐보기'}</span>
                  <i className={`fa-solid ${reportExpanded ? 'fa-chevron-up' : 'fa-chevron-down'}`} style={{ color: '#9A9A9A' }} />
                </button>
              </div>

              {reportExpanded ? (
                <>
                  <div className="card mr-card-html">
                    <div className="card-head">
                      <div
                        className="card-head-icon"
                        style={{ ['--p-dim' as string]: `${p.col}20`, background: `var(--p-dim, ${p.col}20)` }}
                      >
                        <i className="fa-solid fa-sliders" style={{ fontSize: '13px', color: p.col }} />
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: 800, color: '#fff' }}>성향 강도 분석</div>
                    </div>
                    <div className="card-section" style={{ paddingTop: '4px' }}>
                      <AxisRow
                        label="사회성"
                        ll={bd.social.ll}
                        rl={bd.social.rl}
                        lv={bd.social.l}
                        rv={bd.social.r}
                        col="#1E90FF"
                        delay={0}
                      />
                      <AxisRow
                        label="탐구"
                        ll={bd.structure.ll}
                        rl={bd.structure.rl}
                        lv={bd.structure.l}
                        rv={bd.structure.r}
                        col="#FF2D88"
                        delay={120}
                      />
                      <AxisRow
                        label="동기"
                        ll={bd.motivation.ll}
                        rl={bd.motivation.rl}
                        lv={bd.motivation.l}
                        rv={bd.motivation.r}
                        col="#FFB020"
                        delay={240}
                      />
                      <AxisRow
                        label="에너지"
                        ll={bd.energy.ll}
                        rl={bd.energy.rl}
                        lv={bd.energy.l}
                        rv={bd.energy.r}
                        col="#44CC00"
                        delay={360}
                      />
                    </div>
                  </div>

                  <div className="card mr-card-html">
                    <div className="card-head">
                      <div
                        className="card-head-icon"
                        style={{ ['--p-dim' as string]: `${p.col}20`, background: `var(--p-dim, ${p.col}20)` }}
                      >
                        <i className="fa-solid fa-bolt" style={{ fontSize: '13px', color: p.col }} />
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: 800, color: '#fff' }}>사고 &amp; 강점 (THINK)</div>
                    </div>
                    <div className="card-section" style={{ paddingTop: '4px' }}>
                      {p.str.map((s, i) => (
                        <div
                          key={i}
                          style={{
                            display: 'flex',
                            gap: '10px',
                            padding: '10px 0',
                            borderBottom: i < p.str.length - 1 ? '1px solid #1E1E1E' : 'none',
                          }}
                        >
                          <div
                            style={{
                              width: '22px',
                              height: '22px',
                              borderRadius: '7px',
                              flexShrink: 0,
                              background: `${p.col}18`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              marginTop: '1px',
                            }}
                          >
                            <i className="fa-solid fa-check" style={{ fontSize: '9px', color: p.col }} />
                          </div>
                          <p
                            style={{
                              fontSize: '13px',
                              fontWeight: 500,
                              color: '#C0C0C0',
                              lineHeight: 1.6,
                              wordBreak: 'keep-all',
                              margin: 0,
                            }}
                          >
                            {s}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : null}

              {reportExpanded ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  {(
                    [
                      { label: '✨ 찰떡궁합', sub: p.best.n, desc: p.best.d, top: '#FFB020' },
                      { label: '🤝 배려 필요', sub: p.care.n, desc: p.care.d, top: '#555' },
                    ] as const
                  ).map((c, i) => (
                    <div key={i} className="card mr-card-html" style={{ borderTop: `2px solid ${c.top}`, overflow: 'hidden' }}>
                      <div style={{ padding: '14px' }}>
                        <div
                          style={{
                            fontSize: '10px',
                            fontWeight: 700,
                            letterSpacing: '.06em',
                            color: c.top,
                            marginBottom: '6px',
                          }}
                        >
                          {c.label}
                        </div>
                        <div style={{ fontSize: '14px', fontWeight: 800, color: '#fff', marginBottom: '6px' }}>{c.sub}</div>
                        <p style={{ fontSize: '11px', color: '#999', lineHeight: 1.5, wordBreak: 'keep-all', margin: 0 }}>{c.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}

              {hasSavedPhone ? (
                <ShareAndCollect
                  p={p}
                  displayName={displayName}
                  profileKey={key}
                  graphCode={`${bd.social.l}${bd.social.r}${bd.structure.l}${bd.structure.r}${bd.motivation.l}${bd.motivation.r}${bd.energy.l}${bd.energy.r}`}
                  flash={flash}
                  onLeadSubmit={onLeadSubmit}
                  savedPhone={savedPhone}
                />
              ) : (
                <div
                  className="card mr-card-html"
                  style={{
                    background: '#161616',
                    border: '1px solid #2A2A2A',
                    borderRadius: '16px',
                    padding: '16px 18px',
                    overflow: 'hidden',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                    <div
                      style={{
                        width: '30px',
                        height: '30px',
                        borderRadius: '8px',
                        background: `${p.col}18`,
                        border: `1px solid ${p.col}35`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <i className="fa-solid fa-phone" style={{ fontSize: '13px', color: p.col }} />
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: 900, color: '#fff' }}>저장 후 기능을 이어갈 수 있어요</div>
                  </div>
                  <p style={{ fontSize: '11px', color: '#999', lineHeight: 1.5, wordBreak: 'keep-all', margin: '0 0 14px' }}>
                    전화번호를 아직 저장하지 않으셨다면, 아래에서 저장 후 공유/이미지 저장 기능을 이용할 수 있어요.
                  </p>
                  <p style={{ fontSize: '10px', color: '#727272', lineHeight: 1.5, wordBreak: 'keep-all', margin: '0 0 14px' }}>
                    저장은 선택이며, 동의 후에만 저장됩니다.
                  </p>
                  <div style={{ display: 'grid', gap: '8px' }}>
                    <button
                      type="button"
                      className="btn-fire"
                      onClick={onRequestLead}
                      style={{
                        background: '#FEE500',
                        color: '#3C1E1E',
                        boxShadow: '0 4px 24px rgba(254,229,0,.35)',
                      }}
                    >
                      전화번호로 저장하기
                    </button>
                    <button
                      type="button"
                      onClick={() => void onShare()}
                      style={{
                        minHeight: '44px',
                        borderRadius: '12px',
                        border: '1px solid #333',
                        background: '#1A1A1A',
                        color: '#D4D4D4',
                        fontSize: '13px',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      결과 링크 공유하기
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === 'solution' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }} className="anim-fade">
              <div style={{ background: `${p.col}12`, border: `1px solid ${p.col}35`, borderRadius: '16px', padding: '18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                  <span style={{ fontSize: '18px' }}>💬</span>
                  <span style={{ fontSize: '12px', fontWeight: 800, color: p.col, letterSpacing: '.04em' }}>이 한 마디가 통해요</span>
                </div>
                <p style={{ fontSize: '16px', fontWeight: 700, color: '#fff', lineHeight: 1.5, wordBreak: 'keep-all', margin: 0 }}>
                  {p.shortTip}
                </p>
              </div>

              <div className="card mr-card-html">
                <div className="card-head">
                  <div
                    style={{
                      width: '30px',
                      height: '30px',
                      borderRadius: '8px',
                      flexShrink: 0,
                      background: `${p.col}18`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <i className="fa-solid fa-bolt" style={{ fontSize: '13px', color: p.col }} />
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: '#fff' }}>이런 환경에서 잘 반응해요</div>
                </div>
                <div className="card-section" style={{ paddingTop: '4px' }}>
                  {p.env.map((e, i) => (
                    <div
                      key={i}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '10px',
                        padding: '10px 0',
                        borderBottom: i < p.env.length - 1 ? '1px solid #1E1E1E' : 'none',
                      }}
                    >
                      <span style={{ fontSize: '15px', flexShrink: 0, lineHeight: '22px' }}>✅</span>
                      <p style={{ fontSize: '13px', fontWeight: 500, color: '#CCCCCC', lineHeight: 1.55, wordBreak: 'keep-all', margin: 0 }}>
                        {e}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {p.weak ? (
                <div className="card mr-card-html" style={{ borderLeft: '3px solid #555' }}>
                  <div className="card-head" style={{ borderBottom: '1px solid #1E1E1E' }}>
                    <div
                      style={{
                        width: '30px',
                        height: '30px',
                        borderRadius: '8px',
                        flexShrink: 0,
                        background: 'rgba(255,255,255,.05)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <span style={{ fontSize: '14px' }}>🌱</span>
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 800, color: '#BBBBBB' }}>함께 키워가면 좋은 부분</div>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#DDDDDD', marginTop: '2px' }}>{p.weak.title}</div>
                    </div>
                  </div>
                  <div className="card-section">
                    <p style={{ fontSize: '13px', fontWeight: 500, color: '#BBBBBB', lineHeight: 1.65, wordBreak: 'keep-all', margin: 0 }}>
                      {p.weak.desc}
                    </p>
                  </div>
                </div>
              ) : null}

              <div
                style={{
                  background: '#161616',
                  border: '1px solid #2A2A2A',
                  borderRadius: '14px',
                  padding: '16px 18px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <div
                  style={{
                    fontFamily: 'Bebas Neue,sans-serif',
                    fontSize: '20px',
                    color: '#FF4B1F',
                    flexShrink: 0,
                    textShadow: '0 0 10px rgba(255,75,31,.4)',
                  }}
                >
                  S
                </div>
                <p style={{ fontSize: '12px', fontWeight: 500, color: '#BBBBBB', lineHeight: 1.5, wordBreak: 'keep-all', margin: 0 }}>
                  스포키듀는 아이 성향에 맞는 움직임을 설계합니다. 같은 체육도 아이마다 접근이 달라야 해요.
                </p>
              </div>

              <a
                href="https://www.instagram.com/spokedu_kids?igsh=M2ZmYWZxMzRxenVt&utm_source=qr"
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: 'block', textDecoration: 'none', background: 'linear-gradient(135deg,#833ab4,#fd1d1d,#fcb045)', borderRadius: '16px', padding: '2px' }}
              >
                <div
                  style={{
                    background: '#111',
                    borderRadius: '14px',
                    padding: '18px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div
                      style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '12px',
                        flexShrink: 0,
                        background: 'linear-gradient(135deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <i className="fa-brands fa-instagram" style={{ fontSize: '22px', color: '#fff' }} />
                    </div>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 800, color: '#fff', marginBottom: '3px' }}>스포키듀 인스타그램</div>
                      <div style={{ fontSize: '12px', color: '#AAAAAA' }}>@spokedu_kids · 수업 현장 영상 보러가기 →</div>
                    </div>
                  </div>
                </div>
              </a>

              <p
                style={{
                  fontSize: '11px',
                  color: '#777',
                  textAlign: 'center',
                  lineHeight: 1.6,
                  fontWeight: 500,
                  padding: '4px 0 20px',
                  wordBreak: 'keep-all',
                }}
              >
                스포키듀 현장 수업 경험을 담은 관찰형 테스트입니다.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
