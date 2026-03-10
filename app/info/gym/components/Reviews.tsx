'use client';

import { REVIEWS } from '../data/config';

export default function Reviews() {
  return (
    <section id="reviews" className="gym-section" aria-labelledby="reviewsHeading">
      <div className="gym-container">
        <div className="gym-section-head">
          <div className="gym-kicker">수업 후기</div>
          <h2 id="reviewsHeading" className="gym-section-title">
            학부모 후기
          </h2>
          <p className="gym-section-desc">
            스포키듀 체육관 수업을 경험하신 학부모님들의 솔직한 피드백입니다.
          </p>
        </div>
        <div className="gym-grid-3">
          {REVIEWS.map((r) => (
            <div key={r.id} className="gym-card" style={{ padding: 20 }}>
              <div style={{ marginBottom: 10, color: 'var(--gym-warn)', fontSize: 14 }}>★★★★★</div>
              <p style={{ margin: '0 0 14px', fontSize: 14, lineHeight: 1.6, color: 'var(--gym-text)' }}>{r.text}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                  {r.avatar}
                </div>
                <div>
                  <strong style={{ fontSize: 13 }}>{r.who}</strong>
                  <span style={{ display: 'block', fontSize: 12, color: 'var(--gym-muted2)' }}>{r.course}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
