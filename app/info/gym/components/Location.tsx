'use client';

import { GYM_CONFIG } from '../data/config';

const TEL_DISPLAY = '010-4437-9294';

/** 카카오맵에서 주소로 검색한 결과 링크 (지도 보려면 이 링크 사용) */
function getKakaoMapSearchUrl(address: string) {
  return `https://map.kakao.com/?q=${encodeURIComponent(address)}`;
}

export default function Location() {
  const { address, hours } = GYM_CONFIG.center;
  const tel = GYM_CONFIG.phoneParts.join('');
  const mapUrl = getKakaoMapSearchUrl(address);

  return (
    <section id="location" className="gym-section" aria-labelledby="locationHeading">
      <div className="gym-container">
        <div className="gym-section-head">
          <div className="gym-kicker">오시는 길</div>
          <h2 id="locationHeading" className="gym-section-title">
            찾아오시는 길
          </h2>
          <p className="gym-section-desc">
            {address}. 운영시간: {hours}
          </p>
        </div>
        <div className="gym-card" style={{ padding: 20 }}>
          <p style={{ margin: 0, fontSize: 'var(--gym-fs-base)', lineHeight: 1.7, fontFamily: 'var(--gym-font)' }}>
            <strong>주소</strong> {address}
            <br />
            <strong>운영시간</strong> {hours}
            <br />
            <a href={`tel:${tel}`} style={{ color: 'var(--gym-accent)' }}>
              전화 문의: {TEL_DISPLAY}
            </a>
          </p>
          <div
            style={{
              marginTop: 16,
              height: 280,
              borderRadius: 12,
              border: '1px solid var(--gym-line)',
              background: 'rgba(255,255,255,.05)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 16,
              padding: 20,
              textAlign: 'center',
              color: 'var(--gym-muted2)',
              fontSize: 'var(--gym-fs-sm)',
            }}
          >
            <p style={{ margin: 0 }}>
              지도를 보려면 아래 버튼을 누르면 <strong style={{ color: 'var(--gym-muted)' }}>카카오맵</strong>에서 해당 주소로 이동합니다.
            </p>
            <a
              href={mapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="gym-btn primary"
              style={{ display: 'inline-flex' }}
            >
              카카오맵에서 위치 보기
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
