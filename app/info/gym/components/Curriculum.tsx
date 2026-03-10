'use client';

import { CURRICULUM_WEEKS } from '../data/config';

export default function Curriculum() {
  return (
    <section id="curriculum" className="gym-section" aria-labelledby="curriculumHeading">
      <div className="gym-container">
        <div className="gym-section-head">
          <div className="gym-kicker">12-week Curriculum</div>
          <h2 id="curriculumHeading" className="gym-section-title">
            1분기(12주)를 최소 단위로 운영
          </h2>
          <p className="gym-section-desc">
            &apos;한 번 해보기&apos;가 아니라 &apos;변화를 정리할 수 있는 단위&apos;가 필요합니다. 12주 동안{' '}
            <b>적응→누적→점검→리포트</b>로 학습 흐름을 완성합니다.
          </p>
        </div>
        <div
          style={{
            borderRadius: 'var(--gym-r-lg)',
            border: '1px solid var(--gym-line)',
            background: 'linear-gradient(180deg, rgba(18,26,46,.55), rgba(10,14,25,.6))',
            padding: 18,
          }}
        >
          <div style={{ marginBottom: 14, fontSize: 12, color: 'var(--gym-muted)' }}>
            수업: <b style={{ color: 'var(--gym-accent)' }}>50분</b> · 운영: <b style={{ color: 'var(--gym-accent)' }}>12주</b> · 추천 빈도: <b style={{ color: 'var(--gym-accent)' }}>주 1~2회</b>
          </div>
          <div
            role="list"
            aria-label="12주 커리큘럼"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
              gap: 8,
            }}
          >
            {CURRICULUM_WEEKS.map(({ week, title, subtitle }) => (
              <div
                key={week}
                role="listitem"
                style={{
                  borderRadius: 12,
                  border: '1px solid rgba(255,255,255,.12)',
                  background: 'rgba(255,255,255,.03)',
                  padding: '10px 8px',
                  minHeight: 86,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                <small style={{ color: 'var(--gym-muted2)', fontSize: 11 }}>W{week}</small>
                <b style={{ fontSize: 12, lineHeight: 1.25 }}>{title}</b>
                <i style={{ fontStyle: 'normal', fontSize: 11, color: 'rgba(234,240,255,.86)', opacity: 0.92 }}>{subtitle}</i>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
