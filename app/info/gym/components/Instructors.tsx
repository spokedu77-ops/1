'use client';

import { INSTRUCTORS } from '../data/config';

export default function Instructors() {
  return (
    <section id="instructors" className="gym-section" aria-labelledby="instructorsHeading">
      <div className="gym-container">
        <div className="gym-section-head">
          <div className="gym-kicker">선생님 소개</div>
          <h2 id="instructorsHeading" className="gym-section-title">
            강사진 소개
          </h2>
          <p className="gym-section-desc">
            강사 사진과 프로필을 분리하지 않고, 수업 철학과 운영 경험을 한 섹션에서 확인할 수 있게 구성했습니다.
          </p>
        </div>
        <div className="gym-grid-3">
          {INSTRUCTORS.map((inst) => (
            <article key={inst.id} className="gym-card" style={{ padding: 0, overflow: 'hidden' }}>
              <div
                style={{
                  aspectRatio: '4 / 3',
                  background: 'linear-gradient(135deg, rgba(200,243,74,.18), rgba(139,233,255,.18))',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 16,
                  fontWeight: 700,
                  color: 'rgba(234,240,255,.75)',
                }}
              >
                <span style={{ fontSize: 30, color: 'rgba(234,240,255,.45)' }}>{inst.name.charAt(0)}</span>
                <span>수업 리더</span>
              </div>
              <div style={{ padding: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: 16 }}>{inst.name}</h4>
                    <span style={{ fontSize: 12, color: 'var(--gym-muted2)' }}>{inst.tag} · {inst.yearsExp}</span>
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
                <p style={{ margin: '0 0 8px', fontSize: 14, color: 'var(--gym-text)', lineHeight: 1.5 }}>
                  {inst.philosophy}
                </p>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--gym-muted)', lineHeight: 1.5 }}>{inst.desc}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
