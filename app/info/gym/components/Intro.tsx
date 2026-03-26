'use client';

import { CLASS_TRACKS, WHY_US_ITEMS } from '../data/config';

export default function Intro() {
  return (
    <section id="lab-intro" className="gym-section" aria-labelledby="introHeading">
      <div className="gym-container">
        <div className="gym-section-head">
          <div className="gym-kicker">랩 소개</div>
          <h2 id="introHeading" className="gym-section-title">
            아이의 움직임을 제대로 키우는 LAB
          </h2>
          <p className="gym-section-desc">
            스포키듀 LAB은 단순히 많이 운동하는 공간이 아니라,
            움직임의 성장·보완·적용을 교육 흐름으로 설계하는
            아동청소년 체육교육 공간입니다.
          </p>
        </div>

        {/* 클래스 안내(3종) + 랩의 차이(2개)를 한 섹션으로 합쳐서 보여줍니다. */}
        <div style={{ marginTop: 16 }}>
          <div className="gym-class-grid" aria-label="클래스 안내 3종">
            {CLASS_TRACKS.map((track, idx) => (
              <article
                className={`gym-card gym-class-track gym-class-track--${track.key}`}
                key={track.key}
                aria-label={track.title}
              >
                <div className="gym-class-track-head">
                  <span className="gym-class-track-num">{String(idx + 1).padStart(2, '0')}</span>
                  <h3>{track.title}</h3>
                </div>
                <p className="gym-class-track-subtitle">{track.subtitle}</p>
                <ul className="gym-class-track-list">
                  {track.bullets.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>

          <div style={{ marginTop: 16 }} />

          <div className="gym-grid-2" aria-label="랩이 다른 이유 2개">
            {WHY_US_ITEMS.map((item, idx) => (
              <article className="gym-card" key={item.title} aria-label={item.title}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                  <div className="gym-intro-label gym-intro-label--feature">
                    특징 {idx + 1}
                  </div>
                </div>
                <h3 style={{ marginTop: 10 }}>{item.title}</h3>
                <p style={{ marginTop: 8, color: 'var(--gym-muted)', fontSize: 'var(--gym-fs-sm)', lineHeight: 1.65 }}>
                  {item.desc}
                </p>
              </article>
            ))}
          </div>
        </div>

        <p style={{ marginTop: 14, color: 'var(--gym-muted2)', fontSize: 13 }}>
          어떤 아이에게 맞나요? &quot;움직임이 서툴러도 제대로 배우고 싶은 아이&quot;, &quot;운동을 실제 게임/스포츠로 연결하고 싶은 아이&quot;에게 적합합니다.
        </p>
      </div>
    </section>
  );
}
