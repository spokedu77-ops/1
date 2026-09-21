import { ImageResponse } from 'next/og';

export const runtime = 'nodejs';

const WOFF2_MAGIC = [0x77, 0x4f, 0x46, 0x32];

export async function GET() {
  try {
    const fontData = await fetchNotoSansKR();
    return new ImageResponse(renderOgMarkup(Boolean(fontData)), {
      width: 1200,
      height: 630,
      ...(fontData
        ? { fonts: [{ name: 'Noto Sans KR', data: fontData, weight: 900 as const, style: 'normal' as const }] }
        : {}),
    });
  } catch {
    return new Response(FALLBACK_OG_SVG, {
      status: 200,
      headers: {
        'Content-Type': 'image/svg+xml; charset=utf-8',
        'Cache-Control': 'public, max-age=300',
      },
    });
  }
}

function renderOgMarkup(hasKoreanFont: boolean) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '72px 80px',
        background: 'linear-gradient(135deg, #07070c 0%, #101426 55%, #07070c 100%)',
        fontFamily: hasKoreanFont ? '"Noto Sans KR"' : 'system-ui, sans-serif',
      }}
    >
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
        <div style={{ color: '#4b5563', fontSize: 15, fontWeight: 600 }}>spokedu.kr</div>
      </div>
    </div>
  );
}

const FALLBACK_OG_SVG = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#07070c"/>
      <stop offset="55%" stop-color="#101426"/>
      <stop offset="100%" stop-color="#07070c"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <text x="80" y="120" fill="#6b7280" font-size="22" font-family="system-ui, sans-serif" font-weight="800" letter-spacing="4">SPOKEDU</text>
  <text x="230" y="120" fill="#f9fafb" font-size="28" font-family="system-ui, sans-serif" font-weight="800">MASTER</text>
  <text x="80" y="280" fill="#f9fafb" font-size="52" font-family="system-ui, sans-serif" font-weight="800">수업 준비는 쉽게,</text>
  <text x="80" y="350" fill="#f9fafb" font-size="52" font-family="system-ui, sans-serif" font-weight="800">수업은 더 몰입감 있게</text>
  <text x="80" y="560" fill="#9ca3af" font-size="22" font-family="system-ui, sans-serif">spokedu.kr</text>
</svg>`;

async function fetchNotoSansKR(): Promise<ArrayBuffer | null> {
  try {
    const css = await fetch(
      'https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@900&display=swap',
      { headers: { 'User-Agent': 'Mozilla/5.0' } },
    ).then((r) => r.text());

    const match = /src: url\(([^)]+)\) format\('woff2'\)/.exec(css);
    if (!match?.[1]) return null;

    const fontResponse = await fetch(match[1]);
    if (!fontResponse.ok) return null;
    const fontData = await fontResponse.arrayBuffer();
    const bytes = new Uint8Array(fontData.slice(0, 4));
    if (bytes.length < 4 || bytes[0] !== WOFF2_MAGIC[0] || bytes[1] !== WOFF2_MAGIC[1] || bytes[2] !== WOFF2_MAGIC[2] || bytes[3] !== WOFF2_MAGIC[3]) {
      return null;
    }
    return fontData;
  } catch {
    return null;
  }
}
