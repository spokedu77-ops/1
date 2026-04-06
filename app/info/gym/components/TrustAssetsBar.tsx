'use client';

import { TRUST_ASSET_LINES } from '../data/config';

export default function TrustAssetsBar() {
  return (
    <section id="why-spokedu" className="gym-section" aria-labelledby="whySpokeduHeading">
      <div className="gym-container">
        <div className="gym-section-head">
          <div className="gym-kicker">차별점</div>
          <h2 id="whySpokeduHeading" className="gym-section-title">
            수업이 다른 이유 3가지
          </h2>
          <p className="gym-section-desc">
            수업이 끝난 뒤에도 보호자가 변화를 확인할 수 있도록
            설계, 운영, 기록의 기준을 명확하게 유지합니다.
          </p>
        </div>
        <div className="gym-grid-3">
          {TRUST_ASSET_LINES.map((line, index) => (
            <div className="gym-card" key={line}>
              <div className="gym-kicker" style={{ marginBottom: 10 }}>0{index + 1}</div>
              <p style={{ color: 'var(--gym-text)', fontSize: 14, lineHeight: 1.55 }}>{line}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
