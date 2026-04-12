'use client';

import React from 'react';
import { CSS, S } from '../styles';
import { GUIDE_BLOCKS, TRAINING_GUIDE_PAGE_INTRO, TRAINING_PREP_CARD } from '../trainingGuideContent';

export function TrainingGuideScreen({ onBack }: { onBack: () => void }) {
  return (
    <div style={S.page}>
      <style>{CSS}</style>
      <div style={S.scroll}>
        <div style={{ ...S.card, maxWidth: '46rem' }}>
          <button type="button" style={S.back} onClick={onBack}>
            ← 처음으로
          </button>
          <p
            style={{
              fontSize: '0.72rem',
              fontWeight: 800,
              letterSpacing: '0.12em',
              color: '#F97316',
              marginBottom: '0.35rem',
            }}
          >
            SPOMOVE 트레이닝
          </p>
          <h2 style={{ ...S.ctitle, marginTop: 0 }}>📖 운영 가이드</h2>
          <p style={S.csub}>{TRAINING_GUIDE_PAGE_INTRO.lead}</p>

          <div
            style={{
              background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
              borderRadius: '1.1rem',
              padding: '1.15rem 1.2rem',
              marginBottom: '1.35rem',
              border: '1px solid rgba(148,163,184,0.28)',
              boxShadow: '0 12px 28px rgba(15,23,42,0.28)',
            }}
          >
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontSize: '0.7rem',
                fontWeight: 900,
                color: '#FDBA74',
                letterSpacing: '0.08em',
                marginBottom: '0.65rem',
                textTransform: 'uppercase',
                padding: '0.32rem 0.6rem',
                borderRadius: '999px',
                border: '1px solid rgba(251,146,60,0.45)',
                background: 'rgba(251,146,60,0.14)',
              }}
            >
              {TRAINING_PREP_CARD.title}
            </div>
            <ul
              style={{
                margin: 0,
                paddingLeft: '1.15rem',
                fontSize: '0.88rem',
                color: 'rgba(255,255,255,0.92)',
                lineHeight: 1.85,
                fontWeight: 600,
              }}
            >
              {TRAINING_PREP_CARD.items.map((item, i) => (
                <li key={i} style={{ marginBottom: '0.35rem' }}>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {GUIDE_BLOCKS.map((block) => (
            <section
              key={block.id}
              style={{
                marginBottom: '1.25rem',
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '1.05rem',
                overflow: 'hidden',
                boxShadow: '0 10px 24px rgba(15,23,42,0.07)',
              }}
            >
              <div
                style={{
                  padding: '1rem 1.15rem',
                  borderBottom: '1px solid #EEF2F7',
                  background: `linear-gradient(105deg, ${block.accent}12 0%, #F8FAFC 62%)`,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    gap: '0.5rem',
                    marginBottom: '0.35rem',
                  }}
                >
                  <span
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 12,
                      background: '#fff',
                      border: `1px solid ${block.accent}44`,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.15rem',
                      boxShadow: '0 2px 8px rgba(15,23,42,0.06)',
                    }}
                  >
                    {block.icon}
                  </span>
                  <span style={{ fontSize: '1.08rem', fontWeight: 900, color: '#0F172A' }}>{block.title}</span>
                  <span
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: 800,
                      color: '#fff',
                      background: block.accent,
                      padding: '0.25rem 0.55rem',
                      borderRadius: 999,
                    }}
                  >
                    종목
                  </span>
                </div>
                <p style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748B', lineHeight: 1.5, margin: 0 }}>{block.tag}</p>
                <p
                  style={{
                    fontSize: '0.9rem',
                    color: '#475569',
                    lineHeight: 1.7,
                    fontWeight: 600,
                    margin: '0.65rem 0 0',
                  }}
                >
                  {block.intro}
                </p>
              </div>
              <div style={{ padding: '1rem 1.15rem 0.85rem', background: '#FAFBFC' }}>
                <div
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 900,
                    letterSpacing: '0.07em',
                    color: '#64748B',
                    marginBottom: '0.5rem',
                  }}
                >
                  {block.prep.title.toUpperCase()}
                </div>
                <ul
                  style={{
                    margin: '0 0 1rem',
                    paddingLeft: '1.1rem',
                    fontSize: '0.86rem',
                    color: '#475569',
                    lineHeight: 1.7,
                    fontWeight: 600,
                  }}
                >
                  {block.prep.items.map((it, i) => (
                    <li key={i} style={{ marginBottom: '0.3rem' }}>
                      {it}
                    </li>
                  ))}
                </ul>

                <div
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 900,
                    letterSpacing: '0.07em',
                    color: '#64748B',
                    marginBottom: '0.55rem',
                  }}
                >
                  번호별 상세
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {block.phases.map((p) => (
                    <div
                      key={`${block.id}-${p.num}-${p.name}`}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'minmax(5rem, 6.5rem) 1fr',
                        gap: 0,
                        borderRadius: '0.85rem',
                        border: '1px solid #E2E8F0',
                        overflow: 'hidden',
                        background: '#fff',
                      }}
                    >
                      <div
                        style={{
                          background: `${block.accent}14`,
                          borderRight: `1px solid ${block.accent}33`,
                          padding: '0.85rem 0.65rem',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'flex-start',
                          textAlign: 'center',
                          gap: '0.25rem',
                        }}
                      >
                        <span style={{ fontSize: '1.15rem', fontWeight: 900, color: block.accent, lineHeight: 1 }}>{p.num}</span>
                        <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#0F172A', lineHeight: 1.35 }}>{p.name}</span>
                      </div>
                      <div style={{ padding: '0.85rem 1rem', fontSize: '0.84rem', lineHeight: 1.62 }}>
                        {(
                          [
                            ['목표', p.goal],
                            ['화면에서', p.screen],
                            ['행동', p.action],
                            ['코칭 문장', p.coach],
                          ] as const
                        ).map(([lab, txt]) => (
                          <div key={lab} style={{ marginBottom: '0.48rem' }}>
                            <div
                              style={{
                                fontSize: '0.65rem',
                                fontWeight: 800,
                                letterSpacing: '0.05em',
                                color: block.accent,
                                textTransform: 'uppercase',
                                marginBottom: '0.12rem',
                              }}
                            >
                              {lab}
                            </div>
                            <div style={{ color: '#334155', fontWeight: 600 }}>{txt}</div>
                          </div>
                        ))}
                        {p.pitfall ? (
                          <div
                            style={{
                              marginTop: '0.2rem',
                              padding: '0.5rem 0.65rem',
                              borderRadius: '0.55rem',
                              background: '#FFFBEB',
                              border: '1px solid #FDE68A',
                            }}
                          >
                            <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#B45309', marginBottom: '0.15rem' }}>
                              흔한 실수
                            </div>
                            <div style={{ fontSize: '0.82rem', color: '#78350F', fontWeight: 600, lineHeight: 1.55 }}>{p.pitfall}</div>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>

                {block.extras?.length ? (
                  <div
                    style={{
                      marginTop: '0.85rem',
                      padding: '0.65rem 0.75rem',
                      borderRadius: '0.65rem',
                      background: '#F1F5F9',
                      border: '1px solid #E2E8F0',
                      fontSize: '0.82rem',
                      color: '#475569',
                      fontWeight: 600,
                      lineHeight: 1.6,
                    }}
                  >
                    {block.extras.map((ex, i) => (
                      <div key={i} style={{ marginTop: i ? '0.35rem' : 0 }}>
                        · {ex}
                      </div>
                    ))}
                  </div>
                ) : null}

                <div
                  style={{
                    marginTop: '0.9rem',
                    border: '1px solid #E2E8F0',
                    background: '#F8FAFC',
                    borderRadius: '0.75rem',
                    padding: '0.75rem 0.9rem',
                    fontSize: '0.85rem',
                    color: '#334155',
                    lineHeight: 1.6,
                    fontWeight: 700,
                  }}
                >
                  <span style={{ color: block.accent, fontWeight: 900 }}>코칭 팁</span>
                  <span style={{ color: '#94A3B8' }}> · </span>
                  {block.tip}
                </div>
              </div>
            </section>
          ))}

          <div
            style={{
              background: 'linear-gradient(180deg, #FFF7ED 0%, #FFFBF5 100%)',
              border: '1px solid #FED7AA',
              borderRadius: '1rem',
              padding: '1rem 1.1rem',
              marginTop: '0.25rem',
              color: '#9A3412',
              boxShadow: '0 8px 20px rgba(251,146,60,0.1)',
            }}
          >
            <div style={{ fontSize: '0.78rem', fontWeight: 900, letterSpacing: '0.08em', marginBottom: '0.45rem' }}>설정 옵션 요약</div>
            <ul style={{ margin: 0, paddingLeft: '1.1rem', fontSize: '0.88rem', lineHeight: 1.7, fontWeight: 700 }}>
              <li>
                인터벌 모드(Tabata)는 <strong>4세트 고정</strong>(Work/Rest는 설정값).
              </li>
              <li>
                점진 가속(accel)은 일반 모드 전용 — 후반으로 갈수록 간격이 짧아지며 최대 약 <strong>60%</strong>까지 단축.
              </li>
              <li>
                반응 인지·스트룹·순차 기억·이중 과제는 시작 시 Asset Hub <strong>BGM</strong> 풀에서 무작위. 플로우·챌린지는 각 프로그램·iframe이 음원을
                담당합니다.
              </li>
            </ul>
          </div>
          <button type="button" style={{ ...S.btn, ...S.bDark, marginTop: '0.65rem' }} onClick={onBack}>
            🏠 처음으로
          </button>
        </div>
      </div>
    </div>
  );
}
