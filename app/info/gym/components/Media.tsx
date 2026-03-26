'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { SLIDES_DATA } from '../data/config';

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
}

export default function Media() {
  const [index, setIndex] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);

  const go = useCallback((delta: number) => {
    setIndex((i) => {
      const next = i + delta;
      if (next < 0) return SLIDES_DATA.length - 1;
      if (next >= SLIDES_DATA.length) return 0;
      return next;
    });
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const slideEl = el.children[index] as HTMLElement | undefined;
    slideEl?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
  }, [index]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') go(-1);
      if (e.key === 'ArrowRight') go(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go]);

  return (
    <section id="media" className="gym-section" aria-labelledby="mediaHeading">
      <div className="gym-container">
        <div className="gym-section-head">
          <div className="gym-kicker">사진/수업 영상</div>
          <h2 id="mediaHeading" className="gym-section-title">
            클래스 현장 분위기를 먼저 확인해 보세요
          </h2>
          <p className="gym-section-desc">
            MOVE CORE CLUB, CUSTOMIZING LAB, Adaptive Move Class의 실제 수업 장면을 슬라이드로 확인할 수 있습니다.
          </p>
        </div>
        <div
          style={{
            borderRadius: 'var(--gym-r-lg)',
            border: '1px solid var(--gym-line)',
            background: 'linear-gradient(180deg, rgba(18,26,46,.55), rgba(10,14,25,.65))',
            overflow: 'hidden',
          }}
        >
          <div style={{ padding: '16px 16px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap', borderBottom: '1px solid rgba(255,255,255,.08)' }}>
            <span style={{ fontSize: 12, color: 'var(--gym-muted2)' }}>
              {index + 1} / {SLIDES_DATA.length}
            </span>
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" className="gym-btn" onClick={() => go(-1)} aria-label="이전 슬라이드">
                ← 이전
              </button>
              <button type="button" className="gym-btn" onClick={() => go(1)} aria-label="다음 슬라이드">
                다음 →
              </button>
              <button type="button" className="gym-btn primary" onClick={() => scrollToId('contact')}>
                체험/상담
              </button>
            </div>
          </div>
          <div
            ref={trackRef}
            role="region"
            aria-label="미디어 슬라이더"
            style={{
              display: 'flex',
              gap: 12,
              padding: 16,
              overflowX: 'auto',
              scrollSnapType: 'x mandatory',
              scrollBehavior: 'smooth',
            }}
          >
            {SLIDES_DATA.map((s, i) => (
              <div
                key={i}
                style={{
                  flex: '0 0 auto',
                  width: 'min(720px, calc(100% - 28px))',
                  borderRadius: 18,
                  border: '1px solid rgba(255,255,255,.12)',
                  background: 'rgba(255,255,255,.03)',
                  overflow: 'hidden',
                  scrollSnapAlign: 'start',
                }}
              >
                {s.src ? (
                  <img
                    src={s.src}
                    alt={s.heading}
                    loading={i === index ? 'eager' : 'lazy'}
                    decoding="async"
                    fetchPriority={i === index ? 'high' : undefined}
                    sizes="(max-width: 720px) 100vw, 720px"
                    style={{
                      width: '100%',
                      height: 380,
                      objectFit: 'contain',
                      display: 'block',
                      background: 'rgba(255,255,255,.02)',
                    }}
                  />
                ) : (
                  <div
                    style={{
                      height: 380,
                      background: `linear-gradient(135deg, ${s.svgTheme.col1}22, ${s.svgTheme.col2}22)`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 18,
                      color: 'var(--gym-muted)',
                    }}
                  >
                    {s.heading}
                  </div>
                )}
                <div style={{ padding: 14, borderTop: '1px solid rgba(255,255,255,.08)' }}>
                  <strong style={{ color: 'var(--gym-accent)' }}>{s.title}</strong>
                  <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--gym-muted)' }}>{s.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
