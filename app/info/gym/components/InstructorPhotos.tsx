'use client';

import { INSTRUCTORS } from '../data/config';

export default function InstructorPhotos() {
  return (
    <section id="instructor-photos" className="gym-section" aria-labelledby="instructorPhotosHeading">
      <div className="gym-container">
        <div className="gym-section-head">
          <div className="gym-kicker">선생님 사진</div>
          <h2 id="instructorPhotosHeading" className="gym-section-title">
            함께하는 강사진
          </h2>
          <p className="gym-section-desc">
            현장에서 아이들과 함께하는 스포키듀 강사진입니다. (실제 사진으로 교체 가능)
          </p>
        </div>
        <div className="gym-grid-3">
          {INSTRUCTORS.map((inst) => (
            <div
              key={inst.id}
              className="gym-card"
              style={{
                padding: 0,
                overflow: 'hidden',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  aspectRatio: '1',
                  background: 'linear-gradient(135deg, rgba(200,243,74,.2), rgba(139,233,255,.2))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 48,
                  fontWeight: 700,
                  color: 'rgba(234,240,255,.4)',
                }}
              >
                {inst.name.charAt(0)}
              </div>
              <div style={{ padding: 14 }}>
                <strong style={{ fontSize: 15 }}>{inst.name}</strong>
                <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--gym-muted2)' }}>{inst.tag}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
