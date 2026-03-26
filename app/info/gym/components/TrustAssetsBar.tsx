'use client';

import { TRUST_ASSET_LINES } from '../data/config';

export default function TrustAssetsBar() {
  return (
    <section className="gym-trust-bar" aria-label="신뢰 자산">
      <div className="gym-container">
        <div className="gym-trust-list">
          {TRUST_ASSET_LINES.map((line, index) => (
            <div className="gym-trust-item" key={line}>
              <span className="gym-trust-number">{String(index + 1).padStart(2, '0')}</span>
              {line}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
