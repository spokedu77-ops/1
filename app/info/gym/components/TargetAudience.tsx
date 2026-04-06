'use client';

import { AGE_BANDS } from '../data/config';

export default function TargetAudience() {
  const classByAge: Record<string, string> = {
    '미취학 (6-7세)': 'Adaptive Move Class',
    '초등 저학년 (1-3학년)': 'MOVE CORE CLUB',
    '초등 고학년 (4-6학년)': 'CUSTOMIZING LAB',
  };

  return (
    <section id="target" className="gym-section" aria-labelledby="targetHeading">
      <div className="gym-container">
        <div className="gym-section-head">
          <div className="gym-kicker">연령별 추천</div>
          <h2 id="targetHeading" className="gym-section-title">
            우리 아이, 어디에 맞나요?
          </h2>
          <p className="gym-section-desc">
            같은 나이여도 참여 리듬과 목표는 다릅니다.
            연령대별 핵심 과제와 추천 클래스를 함께 안내합니다.
          </p>
        </div>
        <div className="gym-grid-3">
          {AGE_BANDS.map((band) => (
            <div className="gym-card" key={band.title}>
              <h3>{band.title}</h3>
              <p>{band.focus}</p>
              <p style={{ marginTop: 10, color: 'var(--gym-text)', fontWeight: 600 }}>
                추천 클래스: {classByAge[band.title]}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
