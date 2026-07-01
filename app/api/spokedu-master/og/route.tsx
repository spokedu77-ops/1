import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET() {
  const fontData = await fetchNotoSansKR();

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '72px 80px',
          background: 'linear-gradient(135deg, #07070c 0%, #101426 55%, #07070c 100%)',
          fontFamily: fontData ? '"Noto Sans KR"' : 'system-ui, sans-serif',
        }}
      >
        {/* Top: badge + logo */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                display: 'flex',
                padding: '6px 14px',
                borderRadius: 999,
                background: 'rgba(99,102,241,0.18)',
                border: '1px solid rgba(99,102,241,0.45)',
                color: '#a5b4fc',
                fontSize: 13,
                fontWeight: 800,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
              }}
            >
              월 자동결제
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{ color: '#6b7280', fontSize: 13, fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase' }}>SPOKEDU</span>
            <span style={{ color: '#f9fafb', fontSize: 20, fontWeight: 800 }}>MASTER</span>
          </div>
        </div>

        {/* Center: headline */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ color: '#f9fafb', fontSize: 56, fontWeight: 900, lineHeight: 1.1, letterSpacing: '-0.01em' }}>
            수업 준비는 쉽게,
          </div>
          <div style={{ color: '#f9fafb', fontSize: 56, fontWeight: 900, lineHeight: 1.1, letterSpacing: '-0.01em' }}>
            수업은 더 몰입감 있게
          </div>
          <div style={{ color: '#9ca3af', fontSize: 22, fontWeight: 500, marginTop: 8, lineHeight: 1.6 }}>
            체육 강사와 교사를 위한 수업 준비 플랫폼
          </div>
        </div>

        {/* Bottom: feature chips */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 12 }}>
            {[
              { label: '프로그램 라이브러리', color: '#818cf8', bg: 'rgba(99,102,241,0.16)' },
              { label: 'SPOMOVE 큰 화면', color: '#6ee7b7', bg: 'rgba(16,185,129,0.14)' },
              { label: '수업 설명 도구', color: '#fcd34d', bg: 'rgba(245,158,11,0.14)' },
            ].map(({ label, color, bg }) => (
              <div
                key={label}
                style={{
                  display: 'flex',
                  padding: '10px 20px',
                  borderRadius: 999,
                  background: bg,
                  color,
                  fontSize: 16,
                  fontWeight: 700,
                }}
              >
                {label}
              </div>
            ))}
          </div>
          <div style={{ color: '#4b5563', fontSize: 15, fontWeight: 600 }}>spokedu.com</div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: fontData
        ? [{ name: 'Noto Sans KR', data: fontData, weight: 900, style: 'normal' }]
        : [],
    },
  );
}

async function fetchNotoSansKR(): Promise<ArrayBuffer | null> {
  try {
    const css = await fetch(
      'https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@900&display=swap',
      { headers: { 'User-Agent': 'Mozilla/5.0' } },
    ).then((r) => r.text());

    const match = /src: url\(([^)]+)\) format\('woff2'\)/.exec(css);
    if (!match?.[1]) return null;

    return fetch(match[1]).then((r) => r.arrayBuffer());
  } catch {
    return null;
  }
}
