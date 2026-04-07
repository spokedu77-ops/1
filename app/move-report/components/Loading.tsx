'use client';

/** 보고서 직전: 움직임 없이 SPOKEDU 워드마크만 (다크·트렌디) */
export default function Loading() {
  return (
    <div
      style={{
        minHeight: '100dvh',
        background: '#0A0A0A',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse 80% 50% at 50% 40%, rgba(255,75,31,.12) 0%, transparent 55%)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: '-20%',
          right: '-15%',
          width: '55vw',
          maxWidth: 420,
          height: 420,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,75,31,.08) 0%, transparent 65%)',
          pointerEvents: 'none',
        }}
      />
      <div style={{ position: 'relative', textAlign: 'center', zIndex: 1 }}>
        <div
          style={{
            fontFamily: 'Bebas Neue,sans-serif',
            fontSize: 'clamp(52px, 16vw, 88px)',
            lineHeight: 1,
            letterSpacing: '0.32em',
            color: '#FF4B1F',
            fontWeight: 400,
            textShadow: '0 0 48px rgba(255,75,31,.35), 0 2px 0 rgba(0,0,0,.4)',
          }}
        >
          SPOKEDU
        </div>
        <div
          style={{
            width: 'min(200px, 55vw)',
            height: 3,
            margin: '20px auto 0',
            borderRadius: 2,
            background: 'linear-gradient(90deg, #FF4B1F, rgba(255,75,31,.15), transparent)',
          }}
        />
      </div>
    </div>
  );
}
