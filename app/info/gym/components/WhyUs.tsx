'use client';

import { WHY_US_ITEMS } from '../data/config';

export default function WhyUs() {
  return (
    <section id="why-us" className="gym-section" aria-labelledby="whyUsHeading">
      <div className="gym-container">
        <div className="gym-section-head">
          <div className="gym-kicker">랩이 다른 이유</div>
          <h2 id="whyUsHeading" className="gym-section-title">
            스포키듀 LAB이 다른 이유
          </h2>
          <p className="gym-section-desc">
            단순 체험형이 아니라 수업 구조 자체를 다르게 설계합니다.
          </p>
        </div>
        <div className="gym-grid-2">
          {WHY_US_ITEMS.map((item) => (
            <article className="gym-card" key={item.title}>
              <h3>{item.title}</h3>
              <p>{item.desc}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
