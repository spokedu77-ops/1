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
            <div key={r.id} className="gym-card gym-review-card">
              <div className="gym-review-meta">
                <span className="gym-review-badge">{r.ageBadge}</span>
                <span className="gym-review-badge">{r.periodBadge}</span>
              </div>

              <p className="gym-review-lead">{r.text}</p>

              <div className="gym-review-compare" aria-label="수강 전/후 변화">
                <div className="gym-review-before">
                  <div className="gym-review-label">수강 전</div>
                  <div className="gym-review-value">{r.before}</div>
                </div>
                <div className="gym-review-after">
                  <div className="gym-review-label">수강 후</div>
                  <div className="gym-review-value">{r.after}</div>
                </div>
              </div>

              <div className="gym-review-footer">
                <strong className="gym-review-who">{r.who}</strong>
                <span className="gym-review-course">{r.course}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
