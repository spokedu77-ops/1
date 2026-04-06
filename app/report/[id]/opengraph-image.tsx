import { ImageResponse } from 'next/og';

export const alt = '스포키듀 성장 리포트';
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
          background: 'linear-gradient(140deg, #0A0A0A 0%, #151A24 55%, #1F2937 100%)',
          color: '#FFFFFF',
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: 999,
            background: 'rgba(255,255,255,0.08)',
            padding: '10px 20px',
            color: '#FEE500',
            fontSize: 28,
            fontWeight: 800,
            letterSpacing: '0.04em',
          }}
        >
          SPOKEDU REPORT
        </div>
        <div style={{ marginTop: 28, fontSize: 60, fontWeight: 900, letterSpacing: '-0.03em' }}>
          우리 아이 성장 리포트
        </div>
        <div style={{ marginTop: 20, fontSize: 30, color: '#D1D5DB' }}>
          수업 요약과 피드백을 한 번에 확인하세요
        </div>
      </div>
    ),
    { ...size }
  );
}
