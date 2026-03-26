'use client';

import { CLASS_TRACKS } from '../data/config';

export default function ClassTracks() {
  function scrollToId(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  }

  return (
    <section id="class-tracks" className="gym-section" aria-labelledby="classTracksHeading">
      <div className="gym-container">
        <div className="gym-section-head">
          <div className="gym-kicker">클래스 안내</div>
          <h2 id="classTracksHeading" className="gym-section-title">
            스포키듀 LAB 클래스 3종
          </h2>
          <p className="gym-section-desc">
            정규 성장, 맞춤 보완, 적응형 클래스가 분리되지 않고 하나의 학습 흐름으로 연결됩니다.
          </p>
        </div>
        <div className="gym-class-grid">
          {CLASS_TRACKS.map((track, idx) => (
            <article className={`gym-card gym-class-track gym-class-track--${track.key}`} key={track.key}>
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
        <div style={{ marginTop: 16, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button type="button" className="gym-btn primary" onClick={() => scrollToId('media')}>
            수업 사진/영상 보기
          </button>
        </div>
      </div>
    </section>
  );
}
