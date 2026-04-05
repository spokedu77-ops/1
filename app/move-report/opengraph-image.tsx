import { ImageResponse } from 'next/og';

export const alt = '스포키듀 무브 리포트';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          background: 'linear-gradient(135deg, #0A0A0A 0%, #141414 52%, #1B1B1B 100%)',
          color: '#FFFFFF',
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            border: '1px solid rgba(255,255,255,0.18)',
            borderRadius: 999,
            background: 'rgba(255,255,255,0.06)',
            padding: '10px 20px',
          }}
        >
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#FEE500' }} />
          <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: '0.04em', color: '#FEE500' }}>SPOKEDU MOVE REPORT</div>
        </div>
        <div style={{ marginTop: 28, fontSize: 62, fontWeight: 800, letterSpacing: '-0.03em' }}>우리 아이 움직임 유형 분석</div>
        <div style={{ marginTop: 20, fontSize: 30, color: '#D1D5DB' }}>질문 12개로 성향을 확인하고 맞춤 활동 힌트까지</div>
      </div>
    ),
    { ...size }
  );
}
