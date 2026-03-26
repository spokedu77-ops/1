'use client';

interface IntroProps {
  onStart: () => void;
}

/** 원본 HTML 인트로 (고정 티커 + CTA) */
export default function Intro({ onStart }: IntroProps) {
  const tickerItems = Array(6)
    .fill(['MOVE 리포트', '16가지 유형', '3만+ 아이', '연세대 체육교육학과 출신 개발', '무료 테스트', 'SPOKEDU'])
    .flat();

  return (
    <div className="page mr-intro-page" style={{ background: '#0D0D0D', position: 'relative', overflow: 'hidden', minHeight: '100dvh' }}>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)' opacity='0.05'/%3E%3C/svg%3E")`,
          pointerEvents: 'none',
          zIndex: 0,
          opacity: 0.6,
        }}
      />
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundImage: 'linear-gradient(#1A1A1A 1px,transparent 1px),linear-gradient(90deg,#1A1A1A 1px,transparent 1px)',
          backgroundSize: '40px 40px',
          opacity: 0.6,
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />
      <div
        style={{
          position: 'fixed',
          top: '-120px',
          right: '-80px',
          width: '400px',
          height: '400px',
          background: 'radial-gradient(circle,rgba(255,75,31,.18) 0%,transparent 70%)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      <div style={{ position: 'relative', zIndex: 1, padding: '0 24px', paddingTop: '52px', paddingBottom: '140px' }}>
        <div className="anim-rise" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '44px' }}>
          <div style={{ fontFamily: 'Bebas Neue,sans-serif', fontSize: '18px', letterSpacing: '.12em', color: '#FF4B1F' }}>SPOKEDU</div>
          <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg,#FF4B1F,transparent)' }} />
          <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '.1em', color: '#777' }}>ORIGINAL</div>
        </div>

        <div className="anim-rise d1" style={{ marginBottom: '8px' }}>
          <p style={{ fontSize: '13px', fontWeight: 600, color: '#CCCCCC', letterSpacing: '.06em', marginBottom: '12px' }}>우리 아이 움직임 유형은?</p>
          <h1
            style={{
              fontFamily: 'Black Han Sans,sans-serif',
              fontSize: '68px',
              lineHeight: 0.95,
              color: '#fff',
              letterSpacing: '-.02em',
              marginBottom: '0',
              margin: 0,
            }}
          >
            MOVE
            <br />
            <span
              style={{
                WebkitTextStroke: '2px #FF4B1F',
                WebkitTextFillColor: 'transparent',
                filter: 'drop-shadow(0 0 20px rgba(255,75,31,.5))',
              }}
            >
              리포트
            </span>
          </h1>
        </div>

        <div className="anim-rise d2" style={{ marginBottom: '24px' }}>
          <p
            style={{
              fontSize: '15px',
              fontWeight: 500,
              color: '#DDDDDD',
              lineHeight: 1.65,
              wordBreak: 'keep-all',
              borderLeft: '2px solid #FF4B1F55',
              paddingLeft: '14px',
              marginTop: '16px',
            }}
          >
            아이마다 몸이 빛나는 순간이 <span style={{ color: '#FF4B1F', fontWeight: 700 }}>다릅니다.</span>
            <br />
            우리 아이의 움직임 유형을 찾아보세요.
          </p>
        </div>

        <div className="anim-rise d3" style={{ marginBottom: '20px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0',
              background: '#181818',
              border: '1px solid #2A2A2A',
              borderRadius: '10px',
              overflow: 'hidden',
            }}
          >
            {[
              { abbr: 'M', col: '#FF4B1F' },
              { abbr: 'O', col: '#FFB020' },
              { abbr: 'V', col: '#44CC00' },
              { abbr: 'E', col: '#4A9FFF' },
            ].map((item, i) => (
              <span
                key={i}
                style={{
                  fontFamily: 'Bebas Neue,sans-serif',
                  fontSize: '22px',
                  color: item.col,
                  textShadow: `0 0 10px ${item.col}`,
                  padding: '8px 9px',
                  lineHeight: 1,
                }}
              >
                {item.abbr}
              </span>
            ))}
            <div style={{ width: '1px', height: '24px', background: '#2A2A2A', margin: '0 2px' }} />
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#CCCCCC', letterSpacing: '.04em', padding: '0 14px 0 8px', lineHeight: 1 }}>
              Movement · 16가지 움직임 유형
            </span>
          </div>
        </div>

        <div
          className="anim-rise d4"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3,1fr)',
            gap: '1px',
            background: '#222',
            borderRadius: '16px',
            overflow: 'hidden',
            marginBottom: '48px',
          }}
        >
          {[
            { n: '3만+', l: '참여 아이' },
            { n: '1만+', l: '수업 시간' },
            { n: '16종', l: '성향 프로파일' },
          ].map((s, i) => (
            <div key={i} style={{ background: '#161616', padding: '18px 12px', textAlign: 'center' }}>
              <div style={{ fontFamily: 'Bebas Neue,sans-serif', fontSize: '30px', color: '#fff', lineHeight: 1 }}>{s.n}</div>
              <div style={{ fontSize: '10px', fontWeight: 600, color: '#A8A8A8', marginTop: '4px', letterSpacing: '.04em' }}>{s.l}</div>
            </div>
          ))}
        </div>

        <div className="anim-rise d4" style={{ textAlign: 'center', marginBottom: '8px' }}>
          <span style={{ fontSize: '11px', color: '#777', fontWeight: 500, letterSpacing: '.04em' }}>
            스포키듀 현장 수업 경험을 담은 관찰형 테스트
          </span>
        </div>
      </div>

      <div className="ticker-wrap" style={{ position: 'fixed', bottom: '116px', left: 0, right: 0, zIndex: 10 }}>
        <div className="ticker-inner">
          {tickerItems.map((t, i) => (
            <span key={i} className="ticker-item">
              {t}
            </span>
          ))}
        </div>
      </div>

      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '20px 24px 36px',
          background: 'linear-gradient(to top,#0D0D0D 80%,transparent)',
          zIndex: 10,
        }}
      >
        <div style={{ maxWidth: 430, margin: '0 auto' }}>
          <button type="button" onClick={onStart} className="btn-fire mr-btn-fire-html">
            <span>분석 시작하기</span>
            <span
              style={{
                width: '26px',
                height: '26px',
                borderRadius: '50%',
                background: 'rgba(255,255,255,.15)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <i className="fa-solid fa-chevron-right" style={{ fontSize: '10px' }} />
            </span>
          </button>
          <p style={{ textAlign: 'center', fontSize: '11px', color: '#AAAAAA', marginTop: '8px', fontWeight: 500 }}>약 3분 · 12문항</p>
        </div>
      </div>
    </div>
  );
}
