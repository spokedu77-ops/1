'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { CURRICULUM_IMAGES } from '../data/images';

export default function Curriculum() {
  const [zoomedImage, setZoomedImage] = useState<{ src: string; alt: string } | null>(null);

  useEffect(() => {
    if (!zoomedImage) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setZoomedImage(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [zoomedImage]);

  return (
    <section id="curriculum" style={{ background: 'var(--pl-bg-alt)' }}>
      <div className="pl-container">
        <h2 className="pl-section-title">전문 커리큘럼</h2>
        <p className="pl-lead">아이의 연령과 기초 체력을 분석하여 가장 적합한 프로그램을 개별 설계합니다.</p>
        <div className="pl-curr-grid">
          {CURRICULUM_IMAGES.map(({ img, alt, title, desc }) => (
            <div key={title} className="pl-curr-item">
              <button
                type="button"
                className="pl-curr-image-btn"
                onClick={() => setZoomedImage({ src: img, alt })}
                aria-label={`${title} 이미지 확대`}
              >
                <Image
                  src={img}
                  alt={alt}
                  className="pl-curr-image"
                  width={1200}
                  height={900}
                  sizes="(max-width: 900px) 50vw, 25vw"
                  loading="lazy"
                  fetchPriority="low"
                />
              </button>
              <div className="pl-curr-content">
                <h4>{title}</h4>
                <p>{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      {zoomedImage && (
        <div
          className="pl-image-modal"
          role="dialog"
          aria-modal="true"
          aria-label="커리큘럼 이미지 확대 보기"
          onClick={() => setZoomedImage(null)}
        >
          <div className="pl-image-modal-inner" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="pl-image-modal-close"
              onClick={() => setZoomedImage(null)}
              aria-label="확대 이미지 닫기"
            >
              닫기
            </button>
            <img
              src={zoomedImage.src}
              alt={zoomedImage.alt}
              className="pl-image-modal-img"
              decoding="async"
            />
          </div>
        </div>
      )}
    </section>
  );
}
