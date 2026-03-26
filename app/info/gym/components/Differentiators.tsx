'use client';

import { WHY_US_ITEMS } from '../data/config';

export default function Differentiators() {
  return (
    <section id="differentiators" className="gym-section" aria-labelledby="diffHeading">
      <div className="gym-container">
        <div className="gym-section-head">
          <div className="gym-kicker">Why SPOKEDU LAB</div>
          <h2 id="diffHeading" className="gym-section-title">
            왜 스포키듀 수업이 다른가
          </h2>
        </div>
        <div className="gym-grid-4">
          {WHY_US_ITEMS.map((item) => (
            <div className="gym-card" key={item.title}>
              <h3>{item.title}</h3>
              <p>{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
