'use client';

import { INSTRUCTORS } from '../data/config';

export default function Instructors() {
  return (
    <section id="instructors" className="gym-section" aria-labelledby="instructorsHeading">
      <div className="gym-container">
        <div className="gym-section-head">
          <div className="gym-kicker">선생님 소개</div>
          <h2 id="instructorsHeading" className="gym-section-title">
            검증된 체육교육 전문가 그룹
          </h2>
          <p className="gym-section-desc">
            연세대학교 체육교육 전공진의 엄격한 기준을 통과한 전문 강사진이 함께합니다.
          </p>
        </div>
        <div className="gym-grid-3">
          {INSTRUCTORS.map((inst) => (
            <div key={inst.id} className="gym-card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--gym-accent), var(--gym-accent2))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 18,
                    fontWeight: 700,
                    color: 'var(--gym-bg)',
                  }}
                >
                  {inst.name.charAt(0)}
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: 16 }}>{inst.name}</h4>
                  <span style={{ fontSize: 12, color: 'var(--gym-muted2)' }}>{inst.tag}</span>
                </div>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                {inst.badges.map((b) => (
                  <span
                    key={b}
                    style={{
                      fontSize: 11,
                      padding: '4px 8px',
                      borderRadius: 999,
                      border: '1px solid var(--gym-line)',
                      background: 'rgba(255,255,255,.03)',
                      color: 'var(--gym-muted2)',
                    }}
                  >
                    {b}
                  </span>
                ))}
              </div>
              <p style={{ margin: 0, fontSize: 14, color: 'var(--gym-muted)', lineHeight: 1.5 }}>{inst.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
