'use client';

import { PARKING_INFO } from '../data/config';

export default function Parking() {
  return (
    <section id="parking" className="gym-section" aria-labelledby="parkingHeading">
      <div className="gym-container">
        <div className="gym-section-head">
          <div className="gym-kicker">주차</div>
          <h2 id="parkingHeading" className="gym-section-title">
            주차 가능
          </h2>
          <p className="gym-section-desc">
            {PARKING_INFO}
          </p>
        </div>
      </div>
    </section>
  );
}
