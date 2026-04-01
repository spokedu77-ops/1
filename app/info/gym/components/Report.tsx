'use client';

import { useEffect, useMemo, useState } from 'react';
import { REPORT_OBSERVATIONS } from '../data/config';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
} from 'recharts';

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
}

export default function Report() {
  const tagOptions = REPORT_OBSERVATIONS;
  type ObservationTag = (typeof REPORT_OBSERVATIONS)[number];
  const [selectedTags, setSelectedTags] = useState<ObservationTag[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);
  const [chartReady, setChartReady] = useState(false);

  useEffect(() => {
    setChartReady(true);
  }, []);

  const radarData = useMemo(() => {
    // 선택 태그 개수에 따라 샘플 레이더 값이 변하는 “시연”용 로직입니다.
    const base = { 반응: 70, 집중: 68, 협응: 72, 공간: 66, 지속: 69 };

    const weight = (tag: ObservationTag) => {
      const idx = tagOptions.indexOf(tag);
      return idx >= 0 ? (idx % 3 === 0 ? 9 : idx % 3 === 1 ? 7 : 5) : 0;
    };

    let r = { ...base };
    for (const t of selectedTags) {
      const w = weight(t);
      r = {
        반응: Math.min(100, r.반응 + w),
        집중: Math.min(100, r.집중 + (w - 2)),
        협응: Math.min(100, r.협응 + (w - 1)),
        공간: Math.min(100, r.공간 + (w - 3)),
        지속: Math.min(100, r.지속 + (w - 2)),
      };
    }

    return [
      { subject: '반응', score: r.반응 },
      { subject: '집중', score: r.집중 },
      { subject: '협응', score: r.협응 },
      { subject: '공간', score: r.공간 },
      { subject: '지속', score: r.지속 },
    ];
  }, [selectedTags, tagOptions]);

  const autoComment = useMemo(() => {
    if (selectedTags.length === 0) {
      return '선생님의 현장 관찰 태그를 선택해 주세요.\n태그를 선택하시면 우리 아이의 오늘 하루 코멘트가 자동으로 완성됩니다.';
    }

    const highlights = selectedTags.slice(0, 3).map((t) => t.trim());
    return `선택하신 관찰 포인트를 바탕으로,\n오늘의 수업에서 “관찰→과제→목표” 흐름이 자연스럽게 이어졌습니다.\n\n${highlights.join(' / ')}\n\n다음 시간에는 이 흐름을 더 안정적으로 만들 수 있도록 코치 코멘트와 함께 목표를 잡아드립니다.`;
  }, [selectedTags]);

  const toggleTag = (tag: ObservationTag) => {
    setIsSimulating(true);
    window.setTimeout(() => {
      setSelectedTags((prev) => {
        const exists = prev.includes(tag);
        if (exists) return prev.filter((t) => t !== tag);
        if (prev.length >= 3) return prev;
        return [...prev, tag];
      });
      window.setTimeout(() => setIsSimulating(false), 160);
    }, 180);
  };

  return (
    <section id="report" className="gym-section" aria-labelledby="reportHeading">
      <div className="gym-container">
        <div className="gym-section-head" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16 }}>
          <div>
            <div className="gym-kicker">수업/활동 리포트</div>
            <h2 id="reportHeading" className="gym-section-title">
              수업/활동 리포트
            </h2>
            <p className="gym-section-desc">리포트는 점수표가 아니라, 무엇이 어떻게 달라졌는지 확인하는 수업 기록입니다.</p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" className="gym-btn" onClick={() => scrollToId('contact')}>
              리포트 샘플 요청
            </button>
          </div>
        </div>
        <div
          style={{
            borderRadius: 'var(--gym-r-lg)',
            border: '1px solid var(--gym-line)',
            background: 'linear-gradient(180deg, rgba(18,26,46,.55), rgba(10,14,25,.6))',
            overflow: 'hidden',
          }}
        >
          <div style={{ padding: 16, borderBottom: '1px solid rgba(255,255,255,.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <span style={{ fontSize: 12, color: 'var(--gym-muted2)' }}>리포트 시연(샘플)</span>
            <span style={{ fontSize: 12, padding: '8px 10px', borderRadius: 999, border: '1px solid rgba(255,255,255,.14)', background: 'rgba(255,255,255,.03)' }}>
              선택 {selectedTags.length} / 3
            </span>
          </div>
          <div style={{ padding: 16 }}>
            <div className="gym-report-grid" style={{ gap: 16, alignItems: 'stretch' }}>
              <div className="gym-card" style={{ padding: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 10 }}>
                  <h3 style={{ margin: 0, fontSize: 14 }}>현장 관찰 태그</h3>
                  <span style={{ fontSize: 11, color: 'var(--gym-muted2)', border: '1px solid var(--gym-line)', borderRadius: 999, padding: '6px 10px', background: 'rgba(255,255,255,.03)' }}>
                    최대 3개
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10 }}>
                  {tagOptions.map((t) => {
                    const isSelected = selectedTags.includes(t);
                    const disabled = !isSelected && selectedTags.length >= 3;
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => toggleTag(t)}
                        disabled={disabled || isSimulating}
                        style={{
                          textAlign: 'left',
                          borderRadius: 14,
                          padding: '12px 12px',
                          border: '1px solid var(--gym-line)',
                          background: isSelected ? 'rgba(200,243,74,.10)' : 'rgba(255,255,255,.03)',
                          color: 'var(--gym-text)',
                          cursor: disabled ? 'not-allowed' : 'pointer',
                          opacity: disabled ? 0.6 : 1,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                          <div style={{ fontSize: 13, fontWeight: 850, lineHeight: 1.35 }}>{t}</div>
                          {isSelected ? <span style={{ fontSize: 11, fontWeight: 900, color: 'var(--gym-accent)' }}>선택됨</span> : null}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="gym-card" style={{ padding: 18, background: 'rgba(255,255,255,.02)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
                  <h3 style={{ margin: 0, fontSize: 14 }}>리포트 카드 미리보기</h3>
                  <span style={{ fontSize: 11, color: 'var(--gym-muted2)', border: '1px solid var(--gym-line)', borderRadius: 999, padding: '6px 10px', background: 'rgba(255,255,255,.03)' }}>
                    {isSimulating ? '분석 중…' : '자동 생성'}
                  </span>
                </div>

                <div style={{ height: 220, marginBottom: 12 }}>
                  {isSimulating ? (
                    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gym-muted2)' }}>
                      분석 중…
                    </div>
                  ) : (
                    chartReady ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart cx="50%" cy="50%" outerRadius="72%" data={radarData}>
                          <PolarGrid stroke="rgba(255,255,255,.10)" strokeWidth={1} />
                          <PolarAngleAxis dataKey="subject" tick={{ fill: '#9AA6C8', fontSize: 11, fontWeight: 700 }} />
                          <Radar name="우리 아이" dataKey="score" stroke="#8BE9FF" strokeWidth={3} fill="#8BE9FF" fillOpacity={0.18} />
                        </RadarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div style={{ height: '100%', borderRadius: 14, border: '1px solid rgba(255,255,255,.10)', background: 'rgba(255,255,255,.02)' }} />
                    )
                  )}
                </div>

                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 12, color: 'var(--gym-muted2)', marginBottom: 8, fontWeight: 900 }}>
                    코치 코멘트(샘플)
                  </div>
                  <textarea
                    value={autoComment}
                    readOnly
                    className="gym-report-textarea"
                    style={{
                      width: '100%',
                      background: 'rgba(255,255,255,.02)',
                      border: '1px solid rgba(255,255,255,.10)',
                      borderRadius: 14,
                      padding: 14,
                      color: 'var(--gym-text)',
                      resize: 'none',
                      lineHeight: 1.65,
                      fontSize: 13,
                      fontWeight: 600,
                      outline: 'none',
                      whiteSpace: 'pre-line',
                    }}
                  />
                </div>

                {selectedTags.length > 0 ? (
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--gym-muted2)', lineHeight: 1.6 }}>
                    다음 목표는 선택하신 포인트가 실제 게임/스포츠 상황에서 이어지도록 설계합니다.
                  </p>
                ) : (
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--gym-muted2)', lineHeight: 1.6 }}>
                    태그를 1~3개 선택해 보면 리포트가 어떤 구조로 완성되는지 확인할 수 있어요.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
