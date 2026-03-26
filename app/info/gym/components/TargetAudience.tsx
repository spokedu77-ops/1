'use client';

import { AGE_BANDS } from '../data/config';
import { SLOTS } from '../data/config';

export default function TargetAudience() {
  function scrollToId(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  }

  return (
    <section id="target" className="gym-section" aria-labelledby="targetHeading">
      <div className="gym-container">
        <div className="gym-section-head">
          <div className="gym-kicker">대상/연령</div>
          <h2 id="targetHeading" className="gym-section-title">
            같은 나이라도 교육 초점은 다릅니다
          </h2>
          <p className="gym-section-desc">
            연령만 나누는 것이 아니라, 각 시기에 필요한 움직임 학습 과제를 다르게 설정합니다.
          </p>
        </div>
        <div className="gym-grid-4">
          {AGE_BANDS.map((band) => (
            <div className="gym-card" key={band.title}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
                <h3>{band.title}</h3>
                <span className={`gym-slot-badge ${SLOTS.find((s) => s.age === band.title)?.status ?? 'open'}`}>
                  {SLOTS.find((s) => s.age === band.title)?.label ?? '모집중'}
                </span>
              </div>
              <p>{band.focus}</p>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 14 }}>
          <button type="button" className="gym-btn primary" onClick={() => scrollToId('contact')}>
            우리 아이 맞는 반 확인하기 {'->'}
          </button>
        </div>
      </div>
    </section>
  );
}
